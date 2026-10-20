-- Feedback is saved before SMTP is attempted. Only the backend may write or
-- claim delivery work; signed-in users can read their own submission details.
create table public.contract_feedback (
  id uuid primary key,
  reference bigint generated always as identity unique,
  user_id uuid references auth.users(id) on delete set null,
  sender_email text not null check (length(sender_email) between 3 and 320),
  sender_name text not null default '',
  category text not null check (category in ('bug', 'suggestion', 'other')),
  message text not null check (length(btrim(message)) between 1 and 5000),
  page text not null check (length(page) between 1 and 256),
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  locked_until timestamptz,
  last_error text
);
alter table public.contract_feedback enable row level security;
revoke all on public.contract_feedback from anon, authenticated;
grant select (id, reference, category, message, page, created_at, emailed_at)
  on public.contract_feedback to authenticated;
grant all on public.contract_feedback to service_role;
grant usage, select on sequence public.contract_feedback_reference_seq to service_role;
create policy contract_feedback_read_own on public.contract_feedback
  for select to authenticated using (user_id = (select auth.uid()));
create index contract_feedback_user_created_idx on public.contract_feedback (user_id, created_at);
create index contract_feedback_pending_idx on public.contract_feedback (next_attempt_at)
  where emailed_at is null;

create function public.save_contract_feedback(
  p_id uuid, p_user_id uuid, p_email text, p_name text,
  p_category text, p_message text, p_page text
) returns setof public.contract_feedback
language plpgsql security invoker set search_path = '' as $$
declare
  existing public.contract_feedback;
begin
  -- Serialize a user's submissions so parallel requests cannot evade the limit.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into existing from public.contract_feedback where id = p_id;
  if found then
    if existing.user_id is distinct from p_user_id
      or existing.category <> p_category or existing.message <> btrim(p_message)
      or existing.page <> p_page then
      raise exception 'FEEDBACK_CONFLICT' using errcode = 'P0001';
    end if;
    return next existing;
    return;
  end if;
  if (select count(*) from public.contract_feedback
      where user_id = p_user_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'FEEDBACK_RATE_LIMIT' using errcode = 'P0001';
  end if;
  return query insert into public.contract_feedback
    (id, user_id, sender_email, sender_name, category, message, page)
    values (p_id, p_user_id, p_email, p_name, p_category, btrim(p_message), p_page)
    returning *;
end;
$$;

create function public.claim_contract_feedback(p_id uuid default null)
returns setof public.contract_feedback
language sql security invoker set search_path = '' as $$
  with due as (
    select id from public.contract_feedback
    where emailed_at is null and next_attempt_at <= now()
      and (locked_until is null or locked_until < now())
      and (p_id is null or id = p_id)
    order by next_attempt_at
    limit 3 for update skip locked
  )
  update public.contract_feedback f set
    claim_token = gen_random_uuid(), locked_until = now() + interval '2 minutes',
    attempts = attempts + 1
  from due where f.id = due.id returning f.*;
$$;

create function public.finish_contract_feedback_email(p_id uuid, p_claim_token uuid, p_error text default null)
returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  update public.contract_feedback set
    emailed_at = case when p_error is null then now() else null end,
    next_attempt_at = now() + make_interval(secs => least(3600, 60 * power(2, least(attempts, 6)))::integer),
    last_error = left(p_error, 80), claim_token = null, locked_until = null
  where id = p_id and claim_token = p_claim_token and emailed_at is null;
  return found;
end;
$$;

revoke all on function public.save_contract_feedback(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_contract_feedback(uuid) from public, anon, authenticated;
revoke all on function public.finish_contract_feedback_email(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.save_contract_feedback(uuid, uuid, text, text, text, text, text) to service_role;
grant execute on function public.claim_contract_feedback(uuid) to service_role;
grant execute on function public.finish_contract_feedback_email(uuid, uuid, text) to service_role;

-- Use the existing server-only maintenance credential for scheduled retries.
-- Disposable test databases omit Supabase's scheduling extensions.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
    and exists (select 1 from pg_extension where extname = 'pg_net')
    and exists (select 1 from pg_extension where extname = 'supabase_vault') then
    perform cron.schedule('contract-feedback-email', '*/5 * * * *', $job$
      select net.http_post(
        url := regexp_replace((select decrypted_secret from vault.decrypted_secrets
          where name = 'contract_maintenance_url'), '/contract-status-cron$', '/contract-feedback'),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
          'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'contract_maintenance_token')),
        body := '{"action":"retry"}'::jsonb,
        timeout_milliseconds := 60000
      );
    $job$);
  end if;
end;
$$;
