# Feedback

**Personal → Send feedback** opens the same form on desktop and mobile. It saves
the submission before attempting email, shows a reference such as `FB-000001`,
and keeps the message available if the save fails. **Email support instead**
opens a draft containing the current message.

The `contract-feedback` Edge Function verifies the signed-in user, obtains their
email from Auth, and accepts submissions from registered contract-app accounts.
Recipients are fixed to `support@icue.vn`; replies use the submitter's email.
Demo mode offers email without pretending to save a submission.

## Backend configuration

Apply `supabase/migrations/20261020061711_add_contract_feedback.sql` and deploy
`supabase/functions/contract-feedback`. Dependencies are pinned in its Deno lockfile.

Configure these Edge Function secrets using the existing ICUE SMTP account:

- `FEEDBACK_SMTP_HOST`
- `FEEDBACK_SMTP_PORT=465`
- `FEEDBACK_SMTP_USER`
- `FEEDBACK_SMTP_PASSWORD`
- `FEEDBACK_SMTP_FROM`

Port 465 uses TLS immediately. Supabase Edge Functions block outgoing ports 25
and 587. Credentials belong in backend secrets, never browser configuration.

The `contract-feedback-email` cron job retries pending emails every five minutes,
using the existing maintenance token in Vault. Failed attempts back off to a
maximum of one hour, keeping the submission until delivery succeeds. Delivery
leases prevent simultaneous workers from sending the same record. SMTP is an
at-least-once transport: a worker crash after sending but before recording success
can cause a retry; each submission keeps a stable Message-ID.

## Verification

- `npm test`: feedback validation, sender identity, save failures, email failures,
  double clicks, retained drafts, idempotent client retries, and existing app checks.
- `npm run test:db`: isolated database checks, including the feedback SQL checks
  in `supabase/tests/contract_feedback.sql`; requires Docker.
- SMTP `verify()` checks TLS and authentication without sending a message.

Saved submissions are in `public.contract_feedback`. Users can read only their
own details; delivery state and queue operations are restricted to the backend.
