Codebase audit — 9 October 2026

This is the original audit baseline. Subsequent fixes, live deployment status, and verification are recorded in [CODEBASE_AUDIT_FIXES.md](CODEBASE_AUDIT_FIXES.md).

Reviewed commit `05f676c2`, the active React routes and their API/auth/storage helpers, database SQL and migration, deployed expiry-function source, maintenance scripts, dependency lockfile, and existing tests. Production inspection used read-only schema, permissions, and bucket configuration; no business records were fetched and no production writes were executed. Application source is unchanged.

The review found **4 high-priority issues (P1), 11 medium-priority issues (P2), and 1 lower-priority dependency issue (P3)**. Findings based on live configuration are identified explicitly; workflow reproductions used synthetic records in a disposable PostgreSQL 17 container or controlled component-handler probes.

1. **P1 — Contract documents are publicly accessible.**

   Live inspection confirmed `storage.buckets.public = true` for `contracts`. The SELECT policy `Enable read access for all users` also grants access to that bucket to PUBLIC without a membership condition. Anyone with a document URL can download it, and anonymous API clients can enumerate objects. The application's signed URLs do not make a public bucket private. This exposes the documents independently of the protected contract table. [Supabase documents this behavior](https://supabase.com/docs/guides/storage/buckets/fundamentals#public-buckets).

   Relevant code: [contracts.js:823](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/api/contracts.js:823). Fix the bucket's access model and replace public read policies with contract-member policies; retain signed URLs for authorized downloads.

2. **P1 — Viewers and other authenticated accounts can upload and delete contract files.**

   Live policies include `Allow signed uploads` with only `auth.uid() IS NOT NULL`, and `allow authenticated uploads 1shn069_3` permits DELETE for every authenticated account whenever `bucket_id = 'contracts'`. These permissive policies override more restrictive policies. A viewer, approver, or account from another app in the shared project can bypass disabled UI controls and use the Storage API directly to add or remove documents from any contract folder. The bucket also has no configured MIME or size restrictions.

   Relevant code: [contracts.js:783](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/api/contracts.js:783), [migration:47](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/supabase/migrations/20260923123505_audit_contract_permissions_and_transitions.sql:47). Replace permissive contract-storage policies with policies requiring an allowed contract role and a valid contract path. Preserve policies belonging to the shared project's other buckets. [Storage authorization guidance](https://supabase.com/docs/guides/storage/security/access-control).

3. **P1 — Contract comments bypass contract membership.**

   The live `contract_comments` SELECT policies use `true` or `auth.uid() IS NOT NULL`; INSERT checks only that the claimed comment author is the caller. Neither operation checks permission to read the parent contract. Authenticated accounts without a contract role can read contract discussions or add comments by referencing an existing contract ID. The September migration protects `phase_comments` but omits `contract_comments`.

   Relevant code: [fix-comments-rls.sql:14](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/SQL/fix-comments-rls.sql:14), [contracts.js:712](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/api/contracts.js:712). Require access to the parent contract in the comment policies and remove the older permissive policies.

4. **P1 — Duplicate pending requests can advance one contract twice.**

   Request creation uses a read-then-insert duplicate check. The dashboard handler does not set `busy`, and no database constraint limits pending requests per contract. Controlled simultaneous submissions created two requests. In the disposable database, approving both requests moved the same original In Review contract first to Negotiation and then to Awaiting Signature. The decision function locks rows and prevents re-deciding one request, but each distinct request evaluates the contract's current stage; requests have no stage/version snapshot. Live constraints confirm the missing uniqueness protection.

   Relevant code: [Dashboard.jsx:241](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/pages/Dashboard.jsx:241), [migration:182](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/supabase/migrations/20260923123505_audit_contract_permissions_and_transitions.sql:182). Enforce one pending request per contract in the database, make submission atomic, and validate the stage/revision being approved before applying a decision.

5. **P2 — The browser exposes the expiry job's authorization token.**

   The sidebar sends `VITE_CRON_SECRET`, which Vite includes in public JavaScript. A redacted scan confirmed the configured value is also present in a tracked `dist` bundle. The deployed function matches the repository source, has `verify_jwt = false`, and checks only this shared token before executing the expiry RPC with its service-role client. Reading the bundle therefore grants permission to invoke the job without signing in.

   Relevant code: [Sidebar.jsx:100](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/components/layout/Sidebar.jsx:100), [index.ts:21](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/supabase/functions/contract-status-cron/index.ts:21). Rotate the exposed token, keep scheduled-job credentials on the server, and authenticate manual invocations using the caller's session and an explicit role check. No live job was invoked during this audit.

6. **P2 — Phase updates leave lifecycle state inconsistent and can clear an expiry warning.**

   The phase-status trigger updates only `contracts.status`, while the UI prefers `contracts.stage`. Local reproduction produced `in_progress/in_review` after partial completion and `completed/in_review` after full completion. The interface therefore continues to display In Review for completed work, and subsequent saves/approvals act on that stale stage. Completing the last phase of an `expiring/awaiting_signature` contract also changed it to `completed/awaiting_signature`, clearing its expiry state until the next cron run. The live trigger contains the same logic.

   Relevant code: [contract_phases_schema.sql:145](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/SQL/contract_phases_schema.sql:145), [stages.js:86](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/utils/stages.js:86). Define how phase completion maps to contract lifecycle, update both fields together where appropriate, and preserve expiry precedence.

7. **P2 — Editing ordinary fields overwrites a rejection.**

   Both save handlers unconditionally derive `status` from the selected stage, even when the user leaves the stage unchanged. A controlled handler probe renamed a `rejected/in_review` contract and observed an update payload with `status: 'pending'`. This loses the rejection without a resubmission or new approval decision; stale forms can similarly overwrite a decision made while editing.

   Relevant code: [Dashboard.jsx:177](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/pages/Dashboard.jsx:177), [ContractRecord.jsx:156](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/pages/ContractRecord.jsx:156). Preserve status when the stage is unchanged, and protect lifecycle updates against stale record revisions.

8. **P2 — Extending an expired contract's date does not restore its lifecycle.**

   An edit form preserves the displayed Expired/Expiring stage and writes that status back on Save. The expiry RPC only progresses toward expiration and excludes already-expired records from reevaluation. A local record whose expiry date was extended by 365 days remained `expired/executed` after the job ran. Approval decisions continue to reject it unless someone also manually chooses another stage.

   Relevant code: [EditContractModal.jsx:42](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/components/dashboard/EditContractModal.jsx:42), [migration:245](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/supabase/migrations/20260923123505_audit_contract_permissions_and_transitions.sql:245). Reevaluate the expiry override when the date changes while preserving the underlying lifecycle stage.

9. **P2 — Sending for approval can commit only half of the operation.**

   The app first inserts the request, then separately moves a Draft to In Review. A controlled failure in the second call left a pending request attached to a Draft while the UI reported failure. Retrying is blocked by the existing pending request. An approver can also observe and decide the request between these calls, after which the submitter's later update can move the contract backwards.

   Relevant code: [Dashboard.jsx:254](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/pages/Dashboard.jsx:254), [ContractRecord.jsx:249](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/pages/ContractRecord.jsx:249). Commit request creation and its initial contract transition in one database transaction.

10. **P2 — Deleting a contract leaves its documents in storage.**

    `contractsApi.delete()` deletes only the table row. Neither caller removes the contract's `uploads/<id>/` objects, and the inspected database has no contract-deletion cleanup trigger. Those documents remain stored and, with the current bucket configuration, publicly accessible after the record disappears. This also leaves storage usage with no record through which an editor can manage it.

    Relevant code: [contracts.js:504](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/api/contracts.js:504). Implement recoverable server-side cleanup for the complete contract folder, including nested files, and expose cleanup failures instead of silently abandoning documents.

11. **P2 — The approval queue stops at the server's row limit.**

    Contract lists use `fetchAllRows()`, but `approvalsApi.getPending()` and `getAll()` issue single uncapped SELECT requests. Once the approval backlog exceeds the server response cap, older requests disappear from the board. The duplicate check can also miss an existing request outside the returned page. Existing pagination tests cover contracts rather than approvals.

    Relevant code: [contracts.js:895](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/api/contracts.js:895). Paginate approval queries using a stable order with a unique tie-breaker, and use database uniqueness for duplicate prevention.

12. **P2 — Dashboard load failures display an apparently empty ledger.**

    `load()` catches and logs fetch errors without setting an error state or rejecting. The initial effect then clears `loading`, causing zero totals and an empty contract list to render. On refresh, the same behavior leaves stale data without warning. A network or permission failure is therefore presented as a valid business result.

    Relevant code: [Dashboard.jsx:73](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/pages/Dashboard.jsx:73). Track load errors explicitly, provide a retry action, and distinguish failed data from a successfully loaded empty list.

13. **P2 — Legacy expiration dates display correctly but are ignored by the expiry job.**

    The API normalizer falls back from `expiry_date` to `expiration_date`, and live schema inspection confirms both columns exist. The SQL expiry job reads only `expiry_date`; there is no checked-in backfill from the legacy column. A synthetic record with a past `expiration_date` and NULL `expiry_date` remained Draft after the job ran. This affects legacy records with that shape; their prevalence in production was not measured.

    Relevant code: [contracts.js:35](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/api/contracts.js:35), [migration:243](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/supabase/migrations/20260923123505_audit_contract_permissions_and_transitions.sql:243). Choose a canonical date column, backfill existing records, and make reads/writes/expiry processing use the same date.

14. **P2 — CSV exports preserve spreadsheet formulas in user-controlled fields.**

    The exporter escapes quotes and surrounds cells with quotes, but it does not neutralize formula prefixes in titles, categories, or owners. Invoking the actual export handler with a harmless title of `=1+1` produced a CSV row beginning with `"=1+1",`. Spreadsheet applications can interpret this as a formula when another user opens the export. [OWASP explains the formula-injection behavior and application-specific mitigations](https://community.owasp.org/attacks/CSV_Injection).

    Relevant code: [ContractAnalytics.jsx:129](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/components/ContractAnalytics.jsx:129). Export user-controlled strings as text using a mitigation appropriate to the supported spreadsheet applications.

15. **P2 — Date-only expiry values display one day early in western time zones.**

    `formatDate()` parses a `YYYY-MM-DD` string as a UTC instant and then renders it in the user's local time zone. Running the real helper under `TZ=America/Los_Angeles` converted `2026-10-09` to `Oct 8, 2026`. The calendar picker uses local date parsing, so the picker and contract details can disagree about the same legal expiry date. Analytics export has the same UTC parsing pattern.

    Relevant code: [formatters.js:17](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/utils/formatters.js:17), [ContractAnalytics.jsx:37](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/src/components/ContractAnalytics.jsx:37). Format calendar dates separately from timestamps, preserving the stored year/month/day.

16. **P3 — The locked development toolchain includes a known vulnerable package.**

    `npm audit` currently reports one high-severity advisory for `source-map-js@1.2.1`, used by PostCSS and Tailwind's development tooling. The published issue concerns event-loop denial of service when processing crafted indexed source maps; the patched version is 1.2.2. Runtime exposure through this application was not established. [Advisory GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

    Relevant lock entry: [package-lock.json:7030](/Users/skycastle3/Desktop/ICUE_company_software/contract-management-app-v2.1/package-lock.json:7030). Update the existing transitive package and lockfile, then recheck the advisory and relevant tooling.

Verification completed: all **34 existing JavaScript tests** and **45 existing database permission/rollback checks** passed, including the existing simultaneous-decision check. Lint reports **0 errors and 10 warnings**. Additional controlled probes reproduced duplicate submissions, double advancement by distinct requests, phase/status drift, loss of expiry precedence, unchanged rejection edits, partial approval submission, failed expiry renewal, ignored legacy expiration dates, formula-capable CSV cells, and time-zone date drift. Passing existing tests does not cover these scenarios.

The component probes use controlled React/API substitutes, rather than a browser. Production metadata confirmed the storage/comment-policy gaps, missing approval uniqueness, matching phase trigger and approval function, and the deployed expiry function's token-only authorization. No production exploit, document download, status job, account mutation, or real email delivery was attempted.

The shared project's security advisor also reports long [email OTP expiry](https://supabase.com/docs/guides/platform/going-into-prod#security), disabled [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), and available [PostgreSQL security updates](https://supabase.com/docs/guides/platform/upgrading). Those settings require coordination with the other apps using this project. Advisor notices on unrelated HR/newsroom objects were excluded from the numbered codebase findings.
