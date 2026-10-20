-- Execute in a transaction, then roll back. No SMTP calls or real feedback.
do $$
begin
  perform set_config('feedback.test.user_a', (select id::text from public.users order by id limit 1), true);
  perform set_config('feedback.test.user_b', (select id::text from public.users where id::text <> current_setting('feedback.test.user_a') order by id limit 1), true);
  perform set_config('feedback.test.id', gen_random_uuid()::text, true);
  perform set_config('feedback.test.other_id', gen_random_uuid()::text, true);
end;
$$;

set local role service_role;
do $$
declare
  saved public.contract_feedback;
  repeated public.contract_feedback;
  job public.contract_feedback;
  previous_token uuid;
  rejected boolean;
  count_jobs integer;
  i integer;
begin
  select * into saved from public.save_contract_feedback(
    current_setting('feedback.test.id')::uuid, current_setting('feedback.test.user_a')::uuid,
    'feedback-qa@example.test', 'Feedback QA', 'bug', 'Synthetic feedback, transaction rolled back.', '/');
  select * into repeated from public.save_contract_feedback(
    saved.id, saved.user_id, saved.sender_email, saved.sender_name, saved.category, saved.message, saved.page);
  if repeated.reference <> saved.reference or (select count(*) from public.contract_feedback where id = saved.id) <> 1 then
    raise exception 'Idempotent submission failed';
  end if;
  rejected := false;
  begin
    perform public.save_contract_feedback(saved.id, saved.user_id, saved.sender_email, '', 'other', 'Changed content', '/');
  exception when raise_exception then rejected := sqlerrm = 'FEEDBACK_CONFLICT';
  end;
  if not rejected then raise exception 'Reused submission identity was not rejected'; end if;
  raise notice 'PASS: submissions are idempotent and reject conflicting content';

  select * into job from public.claim_contract_feedback(saved.id);
  if job.id is null or job.attempts <> 1 then raise exception 'Missing first delivery claim'; end if;
  select count(*) into count_jobs from public.claim_contract_feedback(saved.id);
  if count_jobs <> 0 then raise exception 'Concurrent delivery claim was allowed'; end if;
  if public.finish_contract_feedback_email(job.id, gen_random_uuid(), null) then raise exception 'Wrong claim token accepted'; end if;
  previous_token := job.claim_token;
  if not public.finish_contract_feedback_email(job.id, job.claim_token, 'smtp_delivery_failed') then raise exception 'Failed delivery was not recorded'; end if;
  if not exists (select 1 from public.contract_feedback where id = job.id and emailed_at is null and next_attempt_at > now()) then
    raise exception 'Failed email was not kept for retry';
  end if;
  update public.contract_feedback set next_attempt_at = now() - interval '1 second' where id = job.id;
  select * into job from public.claim_contract_feedback(saved.id);
  if job.attempts <> 2 or job.claim_token = previous_token then raise exception 'Retry lease did not rotate'; end if;
  if public.finish_contract_feedback_email(job.id, previous_token, null) then raise exception 'Stale claim token accepted'; end if;
  if not public.finish_contract_feedback_email(job.id, job.claim_token, null) then raise exception 'Successful delivery was not recorded'; end if;
  select count(*) into count_jobs from public.claim_contract_feedback(saved.id);
  if count_jobs <> 0 then raise exception 'Completed email was claimed again'; end if;
  raise notice 'PASS: delivery claims prevent duplicates, retain failures and stop after success';

  for i in 1..4 loop
    perform public.save_contract_feedback(gen_random_uuid(), saved.user_id, saved.sender_email, '', 'other', 'Rate limit QA', '/');
  end loop;
  rejected := false;
  begin
    perform public.save_contract_feedback(gen_random_uuid(), saved.user_id, saved.sender_email, '', 'other', 'Rate limit QA', '/');
  exception when raise_exception then rejected := sqlerrm = 'FEEDBACK_RATE_LIMIT';
  end;
  if not rejected then raise exception 'Rate limit was not enforced'; end if;
  raise notice 'PASS: per-user submission rate limit is enforced';
  perform public.save_contract_feedback(current_setting('feedback.test.other_id')::uuid,
    current_setting('feedback.test.user_b')::uuid, 'feedback-other-qa@example.test', '', 'other', 'Other user QA', '/');
end;
$$;

reset role;
do $$ begin perform set_config('request.jwt.claim.sub', current_setting('feedback.test.user_a'), true); end; $$;
set local role authenticated;
do $$
declare rejected boolean;
begin
  if not exists (select id from public.contract_feedback where id = current_setting('feedback.test.id')::uuid) then
    raise exception 'Own feedback is not readable';
  end if;
  if exists (select id from public.contract_feedback where id = current_setting('feedback.test.other_id')::uuid) then
    raise exception 'Another user feedback is exposed';
  end if;
  rejected := false;
  begin perform public.claim_contract_feedback(null); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'User can claim email queue'; end if;
  rejected := false;
  begin update public.contract_feedback set emailed_at = now(); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'User can change email delivery state'; end if;
  raise notice 'PASS: users read only their own feedback and cannot modify email state';
end;
$$;

reset role;
set local role anon;
do $$
declare rejected boolean;
begin
  rejected := false;
  begin perform id from public.contract_feedback; exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Anonymous feedback read allowed'; end if;
  rejected := false;
  begin perform public.claim_contract_feedback(null); exception when insufficient_privilege then rejected := true; end;
  if not rejected then raise exception 'Anonymous delivery claim allowed'; end if;
  raise notice 'PASS: anonymous feedback access is denied';
end;
$$;
reset role;
