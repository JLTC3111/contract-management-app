# Audit fixes — 9 October 2026

Fixes for all 16 numbered findings in [the audit](CODEBASE_AUDIT.md) are implemented. **Database changes, document permissions, maintenance scheduling, and both Edge Functions are live. The matching frontend still needs redeployment.** No new dependency was added.

| Finding | Fix |
| --- | --- |
| 1. Public contract documents | Made the bucket private and blocked anonymous access. Authorized downloads require access to the parent contract. |
| 2. Unrestricted authenticated file writes | Added restrictive policies that enforce contract roles and valid parent paths despite older permissive policies. Uploads have size, MIME, and extension limits. Other shared buckets retain their policies. |
| 3. Comments bypass membership | Replaced comment policies with parent-contract permission checks and restricted deletion to the comment author. |
| 4. Duplicate approvals advance twice | Enforced one pending request per contract, serialized submissions, and bound decisions to the requested stage and revision. Edits supersede stale requests. |
| 5. Exposed maintenance credential | Replaced the exposed token with a server-only credential in Edge secrets and Vault. Manual requests verify the user's session and stored admin/editor role. The old token is rejected. |
| 6. Phase/status drift | Phase transitions update stage and lifecycle together while preserving expiry precedence. |
| 7. Edits overwrite rejection | Ordinary edits omit unchanged lifecycle fields. Revision checks reject stale saves. |
| 8. Renewal leaves expired status | Retained the underlying lifecycle and reevaluate expiry when dates change, including clearing a date. Renewals restore the prior lifecycle. |
| 9. Partial approval submission | Request creation and the initial transition commit in one database transaction. All three submission forms use that operation. |
| 10. Deletion leaves stored files | Successful deletion queues durable cleanup. The server removes every page of nested documents and retries failures; the UI reports pending cleanup. |
| 11. Truncated approval lists | Paginated both approval queries with stable ordering. Duplicate prevention is enforced in the database. |
| 12. Failed load looks empty | Added an explicit dashboard error state and retry button; failed loads do not display zero totals. |
| 13. Legacy expiry dates ignored | Backfilled the canonical date and synchronize both date columns on writes. Maintenance reconciles expiry from the retained lifecycle. |
| 14. CSV formula injection | Quote every cell and protect formula prefixes and leading control characters using the [OWASP spreadsheet guidance](https://community.owasp.org/attacks/CSV_Injection). Protective prefixes remain part of raw CSV data. |
| 15. Date-only values shift by time zone | Parse legal dates as local calendar dates and count calendar days without DST drift or mutating supplied dates. Timestamps keep their normal time-zone behavior. |
| 16. Vulnerable development package | Updated the existing `source-map-js` lock entry from 1.2.1 to 1.2.2. Dependency audit reports zero known vulnerabilities. |

The **174 historical files without surviving contract records remain private for recovery**, as requested. They were not deleted or added to the cleanup queue. Recovery requires project storage administration because ordinary access requires a parent contract. Future contract deletions use automatic cleanup.

## Live backend

Applied these migrations to project `idkfmgdfzcsydrqnjcla`; local filenames match the recorded migration versions:

- [20261009045435_close_contract_audit_findings.sql](supabase/migrations/20261009045435_close_contract_audit_findings.sql)
- [20261009045827_schedule_contract_maintenance.sql](supabase/migrations/20261009045827_schedule_contract_maintenance.sql)
- [20261009053224_harden_contract_cleanup_worker.sql](supabase/migrations/20261009053224_harden_contract_cleanup_worker.sql)

Deployed `contract-status-cron` version 28 and `contract-delete` version 1. The `contract-maintenance` job runs every 15 minutes using [Supabase Cron, pg_net, and Vault](https://supabase.com/docs/guides/functions/schedule-functions). Cleanup jobs have a service-only policy and a ten-minute lease to prevent overlapping retries.

Live checks confirmed that anonymous maintenance/deletion calls, document enumeration, and comment reads are blocked; the old credential is rejected. Read-only role probes confirmed viewer document access without write permission and no contract/comment/document access for an account without a contract role. Two authorized maintenance runs returned zero changes and zero notifications. No production test accounts, contracts, or documents were created or deleted.

## Verification

- **62 JavaScript tests** pass, including API pagination, revision conflicts, atomic submission handlers, load errors, CSV protection, calendar dates, and maintenance authentication/cleanup failures.
- **99 database checks** pass in disposable PostgreSQL 17, plus legacy-data migration checks and two concurrency checks. These cover permissions, rollback, uniqueness, stale decisions, phase/expiry behavior, and durable cleanup.
- Lint reports **0 errors and 10 existing warnings**. Both Edge Function entrypoints pass Deno type checks. Whitespace checks are clean.
- Dependency audit reports **0 known vulnerabilities**. Regenerated browser artifacts contain neither the former maintenance token nor its replacement.

Repeat local checks with `npm test`, `npm run test:db` (Docker required), `npm run lint`, and `npm audit`. The controlled component tests exercise handlers; they are not browser tests. The read-only live probe is `node scripts/check-contract-audit-live.mjs`; its optional `--maintenance` flag runs the actual maintenance job.

## Frontend deployment remaining

Source and the repository's distributed browser assets are updated. Redeploy the frontend and remove `VITE_CRON_SECRET` from hosting configuration if present; configuration now rejects that exposed variable. The old deployed frontend cannot invoke maintenance with its former token. The new frontend uses session authentication, transactional submission, conflict checks, and deletion cleanup feedback.

Shared-project advisories remain outside these contract fixes: long [email OTP expiry](https://supabase.com/docs/guides/platform/going-into-prod#security), disabled [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), available [PostgreSQL security updates](https://supabase.com/docs/guides/platform/upgrading), and unrelated HR/newsroom objects. Those changes require coordination with the other apps using the project.
