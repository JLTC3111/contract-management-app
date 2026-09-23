# Audit fixes — 23 September 2026

All 13 main findings have fixes. **The approved database migration is live; the matching frontend still needs deployment.** Skipping mandatory password changes remains intentional.

| Finding | What changed |
| --- | --- |
| 1. Public access to privileged database functions | Only the service role can run the expiry job. Phase analytics now respect the caller's permissions. |
| 2. Read-only users could change contracts | Database policies and UI controls restrict contract editing to admins and editors. Users cannot promote their own stored role. |
| 3. Broad phase and notification access | Phase writes follow contract permissions; comments and resources enforce ownership. Notifications are private to their recipient. |
| 4. Editors could activate approval controls | Buttons and handlers enforce approver permissions, backed by database checks. Assigned requests require the assigned approver or an admin. |
| 5. Decided requests could advance contracts again | Stored decisions are final. Duplicate and simultaneous decisions cannot advance the same request twice. |
| 6. Forgotten-password links lacked a completion form | Recovery links open a new-password form, support reload, and reject invalid sessions. The normal Change Password dialog still works as before. |
| 7. Negotiation and Executed contracts missed expiry | The expiry job covers all stage statuses and only creates notifications when a status changes. |
| 8. Language changes relabeled currency | Contract values remain USD, matching the existing input convention. Language only changes number formatting. |
| 9. Approval and contract updates could split | One database transaction commits both changes or neither. Failed requests remain retryable. |
| 10. Failed phase completion still started the next phase | Completion and next-phase activation are atomic. Errors keep the dialog open. |
| 11. Schema fallback silently discarded fields | Only explicitly optional compatibility fields can be omitted. Missing substantive fields fail with an actionable schema error. |
| 12. Dashboard data could stop at the server row limit | All contract pages load before search, totals, analytics, and exports use the dataset. Later-page errors reject the load. |
| 13. Created folders were hidden | Record, drawer, and edit views show folders and breadcrumbs. Nested uploads, downloads, and staged file deletions use their full paths. |

Live schema inspection confirmed that RLS was enabled on the phase/notification tables but permissive policies allowed broad access. The applied migration replaces those policies; it also closes the self-editable role bypass found during implementation. Production contract records were not edited.

## Maintenance fixes

- Updated existing dependencies and the lockfile. `npm audit` reports **0 known vulnerabilities**, including development dependencies, on 23 September 2026. No new direct dependency was added.
- Tiptap moved to 3.31.3 for the [attribute-merging security fix](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh). The editor preserves silent content synchronization using the [v3 command signature](https://tiptap.dev/docs/guides/upgrade-tiptap-v2#command-changes). React Router, Axios, Vite, and affected transitive packages were also updated.
- Lint now excludes generated/vendor code, recognizes Node scripts, and checks the new tests. Unused code and the source errors were corrected. **0 errors and 10 existing warnings** remain; warnings concern hook dependencies and Fast Refresh exports.
- Added regression tests and `npm test` / `npm run test:db` commands.
- Corrected the `admin:reset-password` script path.
- Added `node_modules/` and `dist/` to `.gitignore`. The removal of **35,976 dependency files from Git tracking is staged**; installed files remain on disk. App changes are uncommitted.

## Verification

- 34 JavaScript tests pass: recovery using the installed Supabase SDK with simulated HTTP responses, permissions, approval retries, phase failures, pagination, currency, folders, and editor security/document compatibility.
- 45 SQL checks plus a simultaneous-approval test pass in a disposable PostgreSQL 17 database. These exercise both allowed and denied operations, role escalation, duplicate decisions, transaction rollback, phase progression, and expiry notifications.
- Supabase's security advisor found no issues in the local test database after migration.
- Live verification confirmed all seven tables have RLS, anonymous access is denied, approval-status updates and notification reassignment are blocked, and both guard triggers are installed. Five additional function permission checks passed in a read-only production transaction.
- The live security advisor reports no findings for the contract objects changed by this migration. Shared-project advisories listed below remain.
- Dependency installation and resolution succeed; whitespace checks are clean.
- Browser access was unavailable. Visual checks, real reset-email delivery, and checks against the deployed frontend remain pending. The automated UI tests exercise handlers with controlled React/API substitutes; they are not browser tests.

Repeat the checks with `npm test`, `npm run test:db` (requires Docker), `npm run lint`, and `npm audit`.

## Deployment status

1. **Done:** applied [the tested migration](supabase/migrations/20260923123505_audit_contract_permissions_and_transitions.sql) to project `idkfmgdfzcsydrqnjcla`, recorded as version `20260923123505`. It changes contract permissions, protects `public.users` role assignments, and installs the transactional approval/phase behavior. It does not modify HR/newsroom tables or rewrite contract records.
2. **Pending:** deploy the matching frontend. The old frontend's direct approval-status writes are now rejected by the database; the updated frontend uses the transactional approval function.
3. Verify sign-in/recovery, admin/editor contract editing, approver decisions, viewer restrictions, phase completion, and nested document navigation using designated test accounts and records.

Keep the migration and the updated legacy SQL scripts together. The contract-only SQL repair script now requires the migration's role helper instead of restoring broad authenticated access.

## Shared-project follow-ups

These Supabase settings and objects are outside the contract migration and were not changed:

- Email OTP expiry exceeds one hour: [Supabase guidance](https://supabase.com/docs/guides/platform/going-into-prod#security).
- Leaked-password protection is disabled: [password protection settings](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- The hosted PostgreSQL version has security patches available: [database upgrade guidance](https://supabase.com/docs/guides/platform/upgrading).
- Other shared functions retain [mutable search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) or privileged execution grants to [anonymous](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) clients. Four unrelated tables also have [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
