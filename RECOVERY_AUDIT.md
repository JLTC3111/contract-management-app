**Desktop and mobile recovery audit — 27 October 2026**

Recovery is partial. Password reset, a healthy session refresh, and the child-component crash screen work. Interrupted editing, ambiguous saves, and session failures can lose work or leave the interface inconsistent with the actual session.

**Fix status — 27 October 2026:** R1–R8 are implemented and verified. The findings below record the original behavior; the implementation and rollout details are recorded at the end of this file.

The audit covered the current local web app in isolated Chromium sessions at 1440 × 1000 and an emulated Android mobile browser at 390 × 844. Every backend request used controlled fixtures; production accounts, contracts, passwords, and email delivery were untouched. Findings below reproduced at both sizes. P1 means high priority; P2 means medium priority.

| ID | Priority | Finding |
| --- | --- | --- |
| R1 | P1 | Temporary profile failures replace the current page with login and discard its state. |
| R2 | P1 | Logout can retain a usable session or be undone in the interface by a delayed response. |
| R3 | P1 | Retrying a committed save with a lost response can duplicate contracts or block further editing. |
| R4 | P1 | Unsaved work has no recovery after refresh or browser tab discard. |
| R5 | P2 | Unavailable or full browser storage can produce a blank page without a recovery control. |
| R6 | P2 | Stalled requests have no app-controlled deadline or cancellation. |
| R7 | P2 | Reconnection does not reload data; some outages appear as missing or empty records. |
| R8 | P2 | Partial attachment failures discard the pending file selection when the form closes. |

1. **R1 — A transient profile error clears a valid user.** [useUser.jsx](src/hooks/useUser.jsx:63) sets `user` to `null` on every profile-query error, including a temporary 503 or fetch failure. [App.jsx](src/App.jsx:59) then replaces the routed page with Login. In the browser, an open `/new` form survived a successful token-refresh event; returning 503 from the next profile refresh showed login immediately. Restoring the profile service and triggering a healthy auth event reopened `/new` with an empty title. The SDK session was still valid during the outage.

   Preserve the last validated profile on retryable network/server failures, expose a recoverable connection state, and distinguish these failures from a confirmed invalid session or revoked access. Keep permission-sensitive actions unavailable until any required revalidation succeeds.

2. **R2 — Logout does not reliably establish or preserve a signed-out state.** There are two independently reproduced paths in [useUser.jsx](src/hooks/useUser.jsx:37):

   - Hold a background profile request, sign out successfully, then release the response. The delayed `setUser(customUser)` remounts the authenticated form even though `supabase.auth.getSession()` returns no session. There is no request generation or session-identity check before applying the response.
   - Return 503 from the logout endpoint. [The logout handler](src/hooks/useUser.jsx:118) removes two obsolete token names, calls SDK sign-out, and clears only React state when sign-out fails. The actual `sb-<project>-auth-token` remains. The interface shows `/login`, but reopening `/` restores authenticated access without another sign-in.

   Invalidate pending profile requests on session/account changes. Ensure local logout removes the actual persisted SDK session even when remote revocation is unavailable, and distinguish local logout from successful revocation on other devices. The delayed-response check demonstrates an interface/session mismatch, not a server authorization bypass.

3. **R3 — A lost write response makes retries unsafe or unusable.** [Contract creation](src/api/contracts.js:445) performs a new insert per attempt without a stable operation key. In the fixture, the first insert committed but its response was dropped. The form reported failure; clicking Create again produced a second contract with the same title. For edits, [revision checks](src/api/contracts.js:484) correctly prevented overwriting a changed row, but after a committed PATCH lost its response, retrying Save used the old revision and returned “Reload it before saving.” The modal remained open without a way to reconcile the committed result and preserve subsequent edits.

   Reuse a server-enforced operation key for creation retries. Reconcile uncertain mutation outcomes before repeating them. For edits, provide a reload/reconcile action that retains the user's entered values instead of requiring a destructive page refresh.

4. **R4 — Unsaved forms exist only in component memory.** The active [create form](src/pages/CreateContractPage.jsx:26), [edit form](src/components/dashboard/EditContractModal.jsx:43), [comments](src/pages/ContractRecord.jsx:57), and [approval response editor](src/pages/ApprovalsBoard.jsx:37) use local React state without draft persistence or navigation protection. A frozen/resumed browser page retained the create title; reloading the same page erased it. This also leaves no application restore path when a mobile browser discards the page and later reloads it. Actual operating-system eviction was not exercised.

   Save recoverable text drafts per account, route, and contract; restore them with an explicit choice and clear them after confirmed saves. Selected files need a separate recovery strategy because a normal input selection cannot be reconstructed from a text draft. Protect deliberate navigation away from dirty forms.

5. **R5 — Browser storage failures bypass the crash screen.** [Language initialization](src/i18n/index.js:14) reads local storage during module evaluation. [ThemeProvider](src/hooks/useTheme.jsx:7), DemoProvider, and other preferences also access storage without guards. [The error boundary](src/main.jsx:18) sits inside the providers and cannot catch their own failures or a failed module import. Throwing `SecurityError` from storage reads or `QuotaExceededError` from writes produced an empty root at both sizes, with no crash message or Reload button.

   Guard preference reads/writes and fall back to in-memory defaults. Extend the boundary to cover providers. Keep bootstrap initialization from depending on successful preference storage. The SDK's own storage fallback does not protect these direct application calls.

6. **R6 — An unresolved request can strand recovery controls.** [User initialization](src/hooks/useUser.jsx:45) waits for session/profile work before clearing the loading state; [App](src/App.jsx:58) offers only “Loading...” during that time. Supabase requests have no app-supplied timeout/abort policy in [client configuration](src/utils/supaBaseClient.js:8). Holding profile responses pending left startup on “Loading...” with no retry control; online/focus/resume events did not resolve it. Releasing the original responses allowed startup to finish. Similar waits surround saves, login, password changes, and uploads.

   Add bounded request deadlines, cancellation of obsolete work, and a retryable loading/error state. Treat a timed-out write as an uncertain outcome and reconcile it as described in R3. Browser/network timeouts may eventually intervene; the app currently controls neither the deadline nor the recovery experience.

7. **R7 — Data recovery depends on navigation or a full reload.** [Dashboard loading](src/pages/Dashboard.jsx:76) runs on mount and explicit actions; online, focus, visibility, and restored-page events do not revalidate contracts. Its manual Retry button works, which is a useful existing recovery path. Other views handle outages less reliably:

   - [ContractRecord](src/pages/ContractRecord.jsx:62) turns a failed request into `contract = null` and displays “Contract Not Found,” with no Retry. That screen stayed unchanged after connectivity was restored; a full reload recovered the contract.
   - [ApprovalsBoard](src/pages/ApprovalsBoard.jsx:74) shows an error toast, clears the list, and then claims no approvals are waiting. No retry or reconnect fetch followed.
   - [Comment loading](src/pages/ContractRecord.jsx:75) converts failures to an empty list. File panels show a technical error through DocumentBreadcrumbs alongside “No documents yet,” without a retry action.

   Keep unavailable data distinct from confirmed empty/not-found results. Preserve last successful data with a stale indication, expose resource-level Retry, and revalidate on reconnect and foreground return without replacing dirty forms.

8. **R8 — Failed attachments cannot be retried from the original selection.** [uploadAttachments](src/utils/uploads.js:42) returns the failed files, but [CreateContractPage](src/pages/CreateContractPage.jsx:55) alerts and navigates away anyway. [Dashboard editing](src/pages/Dashboard.jsx:178) and [record editing](src/pages/ContractRecord.jsx:151) similarly close after partial file-operation failures. A simulated upload outage saved the contract and displayed the failed filename, then returned to the dashboard and discarded the selected file. The failure is reported, but recovery requires finding the saved contract and selecting files again.

   Keep the saved contract ID and unsuccessful attachment operations in the form. Offer retry of only the remaining operations and make partial completion explicit before closing. Do not create the contract again when retrying its documents.

**Verified working behavior:** Healthy session-refresh events retain the open form. Password recovery resumes after reload, submits a single password update, clears its recovery marker, and continues to the dashboard. Expired recovery links show an actionable message and cannot submit a password update. An isolated child render error shows a readable crash screen with an onscreen Reload button on desktop and mobile; reloading restores the app. Dashboard Retry recovers a failed contract-list load. Revision checks reject stale edits. Existing tests also cover atomic approval operations, deferred document cleanup, and feedback retry/deduplication.

**Validation and evidence:** `npm test` completed with 86 tests passing. The browser audit completed 17 recovery scenarios per viewport, plus a mobile navigation placement check; no test-driver errors remain. [Raw browser results](/private/tmp/contract-recovery-audit/results.json), [audit driver](/private/tmp/contract-recovery-audit.mjs), [mobile crash screen](/private/tmp/contract-recovery-audit/mobile-crash-fallback.png), [mobile failed-record screen](/private/tmp/contract-recovery-audit/mobile-record-failure.png), and [mobile password recovery](/private/tmp/contract-recovery-audit/mobile-password-recovery.png) are available locally for this session. The installed Supabase client and its source were inspected; browser foreground token refresh is SDK-managed as described in the [official reference](https://supabase.com/docs/reference/javascript/auth-startautorefresh), while application data revalidation remains the app's responsibility.

**Initial audit limits:** Mobile coverage uses Chromium emulation, not physical iOS Safari or Android lifecycle testing. Backend fixtures establish client behavior under injected failures; live SMTP delivery, production token revocation, database backup restoration/PITR, and deployment rollback were not exercised. At that stage, only this report had been added; application code was unchanged.

**Implemented fixes:**

| Finding | Result | Main implementation |
| --- | --- | --- |
| R1 | Transient profile failures retain the current page and draft. Writes pause until access is verified; reconnect and Retry revalidate access. | [Session handling](src/hooks/useUser.jsx), [write guard](src/utils/network.js) |
| R2 | Local logout removes the real SDK session and blocks late token writes. Delayed profile responses and other tabs cannot restore the signed-in interface. Failed remote revocation is reported separately. | [Session storage and logout](src/utils/authSession.js) |
| R3 | A persisted creation request UUID and database uniqueness prevent duplicate inserts. Lost edit responses are reconciled; competing edits show a review step that retains user changes and newer untouched fields. | [Contracts API](src/api/contracts.js), [conflict merging](src/utils/contractRecovery.js), [migration](supabase/migrations/20261027063138_contract_recovery_requests.sql) |
| R4 | Create/edit forms, comments and approval responses save account-scoped drafts, offer Restore/Discard, and protect refresh/closing. Route changes remount page state so drafts cannot carry into another record. | [Draft recovery](src/hooks/useDraftRecovery.js), [draft notice](src/components/common/DraftNotice.jsx) |
| R5 | Preference storage has a guarded memory fallback. Providers are inside the error boundary. A separate bootstrap screen handles failed imports and blocked SDK initialization; initial HTML also offers Reload if JavaScript cannot load. | [Storage](src/utils/browserStorage.js), [bootstrap](src/main.jsx), [app root](src/appRoot.jsx), [initial HTML](index.html) |
| R6 | HTTP deadlines cover headers and response bodies: 15 seconds for normal requests and 120 seconds for larger file transfers. Startup session/profile checks also have a deadline and a retryable error state. | [Request deadlines](src/utils/network.js), [session recovery](src/hooks/useUser.jsx) |
| R7 | Dashboard, records, approval lists, drawer activity and file listings revalidate after reconnect/foreground return. Failures have Retry controls and are distinct from empty/not-found data; previously loaded data is retained. | [Revalidation](src/hooks/useRevalidate.js), [retry notice](src/components/common/RetryNotice.jsx), [file listing](src/hooks/useStorageFolder.js) |
| R8 | Create/edit forms retain the saved contract ID and only unsuccessful file operations. An uncertain upload is accepted only when downloaded bytes match the selected file. Mobile content reserves space for fixed navigation so retry actions remain reachable. | [Create form](src/pages/CreateContractPage.jsx), [edit form](src/components/dashboard/EditContractModal.jsx), [uploads](src/utils/uploads.js), [mobile layout](src/App.css) |

Recovery messages and controls are available in all eight existing UI languages. No dependencies were added or upgraded.

**Final verification:**

- `npm test`: 97 tests pass, including the original password recovery, approval, permission and maintenance tests and 11 new recovery regressions.
- Isolated desktop/mobile browser checks: 48 scenarios pass. They cover startup timeout, explicit draft restore, ambiguous saves across reloads, conflict review, partial create/edit uploads, file re-selection, reconnects, storage failures, password recovery, and logout with another tab holding a delayed profile response. One navigation timed out in the full run; focused reruns at both sizes passed, including a later visual review after animations settled.
- Disposable Postgres checks pass: existing permission/rollback/regression checks, creation key uniqueness and immutability, viewer restrictions, and concurrent creation retries committing one contract.
- The additive migration was applied to the app's connected Supabase project `idkfmgdfzcsydrqnjcla` as `20261027063138_contract_recovery_requests`. A read-only follow-up confirmed the UUID column, valid unique index, enabled immutability trigger, active RLS, and unchanged editor/customer insert policies. The security advisor reported no new findings. Existing contract rows were not edited.
- Changed JavaScript files have no lint errors; five pre-existing warnings remain in existing hooks/components. Generated build artifacts were restored to their original tracked state to keep this change focused on source and migration files.

**Rollout and limits:** The database change is live and compatible with the currently deployed frontend. The updated frontend is ready locally and has not been deployed. A full browser reload cannot retain native File objects: the restored draft identifies pending filenames and requires re-selection or an explicit choice to continue without them. Physical iOS/Android lifecycle behavior, live password/email changes, backup restoration and deployment rollback were not exercised.

Updated local evidence: [browser results](/private/tmp/contract-recovery-regression/results.json), [browser driver](/private/tmp/contract-recovery-regression.mjs), [restored mobile edit form](/private/tmp/contract-recovery-regression/mobile-restored-edit.png), and [mobile startup recovery](/private/tmp/contract-recovery-regression/mobile-startup-recovery.png).
