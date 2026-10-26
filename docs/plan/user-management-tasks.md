# Authentication — User Management Task Queue

**Last audited:** 2026-10-26  
**Default branch:** `master`  
**Architecture baseline:** [`docs/user-management-roadmap.md`](../user-management-roadmap.md)  
**Canonical user-management tracker:** [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16)  
**Scope:** Central NestJS auth service and its Next.js `web/` app. Legacy NestJS accounts remain separate from Keycloak identities.

## Queue rules

- Keep existing task IDs stable; update status/evidence in place rather than creating overlapping IDs or duplicate task lists.
- This file is the canonical task queue. The roadmap contains architecture and phase definitions only.
- Every task records evidence, current/desired behavior, acceptance criteria, validation, dependencies, risk and source links.
- Use one descriptive branch and PR per dependency-safe slice; never commit directly to `master`.
- Before every merge, inspect push-triggered workflows and the exact side effects. Do not merge a PR that would publish/promote/deploy to production unless the user separately authorizes that exact side effect. Documentation-only changes are not exempt.
- Squash-merge only after exact-head required checks pass, mergeability and acceptance criteria are verified, and the diff has been inspected for security/regressions.
- Never run production migrations, mutate live accounts, or claim production health without evidence. A skipped check is not a passed test.

## Active tasks

### AUTH-OPS-001 — Prevent unauthorized release promotion from master pushes

- **Priority/status:** P0 / DONE — ordinary pushes no longer publish or promote images.
- **Evidence:** [PR #22](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/22) squash-merged at `ab8e53782d1929880b9ad4df29365d50d86980a6`; current `master` verified at that SHA. Exact tested PR head: `28ec9dfe5f8088d8b93a5ba16aa632879565c109`.
- **Change:** `.github/workflows/release.yml` now exposes only `workflow_dispatch`. Publishing and the platform-infra promotion request remain available only through an explicit manual dispatch from `master`; ordinary pushes run CI only.
- **Validation:** [Auth-service CI PR run #40211913021](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40211913021) passed tests, typecheck, build and container build on the exact PR head. Post-merge [auth-service CI run #40212123019](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212123019) also passed on the merge SHA. The diff changed only the release workflow trigger; no release/promotion run was observed for the merge SHA.
- **Side-effect gate:** Reviewed the prior image publication and promotion steps. The workflow-only merge no longer matches any push trigger. No production deployment, migration, live account mutation or platform-infra change was performed.
- **Risk/remaining control:** Manual dispatch intentionally retains the ability to publish/promote production images; it must not be dispatched without separate release authorization. The prior [PR #18 release run #40209889836](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40209889836) proves only that a promotion request occurred, not that production rollout/health was verified.
- **Links:** [release workflow](../../.github/workflows/release.yml), [PR #22](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/22).

### AUTH-UM-000 — Reconcile auth RPC and migration provenance (UM-0)

- **Priority/status:** P0 / BLOCKED — source/readiness contract work is merged; migration provenance and approved non-production validation remain a release gate.
- **Evidence:** Read-only live catalog findings in `docs/user-management-roadmap.md`; `src/auth/auth.repository.ts`; `src/auth/passkey.repository.ts`; `src/db/supabase.client.ts`; `supabase/migrations/20261012000000_auth_persistence_rpcs.sql`.
- **Current behavior:** The checked-in migration ledger does not include `20261012000000_auth_persistence_rpcs`; source calls `auth_rotate_refresh_session`, `auth_replace_mfa_recovery_codes`, `auth_consume_mfa_recovery_code`, and `auth_consume_passkey_challenge`, which were absent from the inspected live function catalog. The provenance of `restrict_auth_rpc_execution` remains unresolved. PR #27 now makes `AuthRepository.ready()` check table existence plus the four required RPC paths in the read-only PostgREST OpenAPI schema.
- **Desired behavior:** A reproducible, non-mutating schema/RPC contract check and verified migration provenance in an approved non-production Supabase environment before any runtime rollout.
- **Additional provenance search (2026-10-26):** GitHub code search across both authorized repositories found no checked-in `restrict_auth_rpc_execution` migration artifact; the Authentication repository's commit history for `supabase/migrations/20261014024759_restrict_auth_rpc_execution.sql` is empty. The only code-search hit is this roadmap's reference to the missing artifact. This confirms repository evidence is insufficient to reconstruct the migration safely; it does not establish the live function definitions or grants. Do not invent a replacement migration. The remaining unblock is an authoritative migration artifact/revision plus an approved non-production Supabase project whose migration ledger and RPC signatures can be inspected.
- **Acceptance criteria:**
  - [ ] Identify the authoritative source/revision for every live auth RPC and reconcile it with repository migrations.
  - [ ] Validate function signatures, grants, RLS/policies, relevant columns and constraints against an approved non-production environment.
  - [x] Add a non-mutating readiness/contract check that fails clearly when required RPCs are absent — [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27), merged at `94341f8535a409dd2215d8f5891969f66b3a496d`.
  - [x] Record evidence and recovery options; do not reset, merge, rebase or migrate the shared live project.
- **Validation:** PR #27 exact tested head `6c5d6ee9d524ee365a07111a7ee04aa4056548ed`; [auth-service CI #40213420324](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40213420324) passed tests, typecheck, build and container build. Tests verify GET-only OpenAPI access, required RPC paths, missing-RPC failure and sanitized metadata errors. No migration was created/applied. The Supabase Preview app check on PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` failed with `Remote migration versions not found in local migrations directory`, consistent with the live/local ledger mismatch. The PR #22 merge check was skipped because no Supabase branch was associated.
- **Dependencies:** Approved non-production environment and migration provenance evidence.
- **Risk:** Critical — refresh rotation, MFA recovery-code operations and passkey challenge consumption may fail if source and live schema diverge. Readiness now fails closed instead of falsely reporting table-only readiness.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27), [auth RPC migration](../../supabase/migrations/20261012000000_auth_persistence_rpcs.sql).

### AUTH-UM-001A — Admin principal, guard and safe response projection (UM-1 foundation)

- **Priority/status:** P1 / DONE for the read-only API foundation — merged on 2026-10-25 at squash SHA `14795baaef7a4b40fbf2d4236f572658cee56c95`.
- **Evidence:** `src/users/admin.guard.ts`, `src/users/users-management.controller.ts`, `src/users/users-management.service.ts`, `src/users/dto/list-users.dto.ts`, `test/admin.guard.spec.ts`, `test/user-management-security.spec.ts`.
- **Current behavior:** PR #18 adds protected `GET /api/admin/users` and `GET /api/admin/users/:id`. The guard verifies the signed access token and checks the current `public.users.role` through the server-side service-role client. The service explicitly selects and maps `id,email,role,mfa_enabled`. No mutation endpoints or schema changes are included.
- **Desired behavior:** Fail-closed server authorization and allowlisted responses, with tests proving demoted/non-admin callers are denied and signup cannot set ADMIN.
- **Acceptance criteria:**
  - Only callers whose current legacy account role is `ADMIN` can list or inspect accounts.
  - Missing/invalid tokens, missing accounts and persistence failures fail closed.
  - Responses never expose password hashes, MFA secrets, recovery codes, passkey material, refresh-token hashes or internal security fields.
  - Signup remains hard-coded to `USER`; no public admin bootstrap exists.
- **Validation:** Exact-head backend validation jobs passed on PR #18 head `dc3e7626dd37c4ce714cdea018b2128c63fe3eac`. PR #26 adds a regression proving a Supabase current-role lookup error throws `ServiceUnavailableException` and never authorizes the request; merged at `97b8d7498190884715bd1e9c657d2e432de31feb` from exact tested head `9b18a315938e54cc6933f131ea5b27f69a262193`; [auth-service CI #40213209898](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40213209898) passed. Verified the controller is under the global `/api` prefix and security regression tests exist on `master`.
- **Dependencies:** Existing `JwtService`, `SupabaseClientService` and the verified legacy user schema.
- **Risk:** High — authorization or response-shaping defects could expose account/security data.
- **Links:** [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-001B — Privileged audit persistence (UM-1 foundation)

- **Priority/status:** P1 / BLOCKED on non-production schema validation.
- **Evidence:** `supabase/migrations/`, `src/db/supabase.client.ts`, `src/auth/auth.repository.ts`; roadmap records no admin/audit table in the inspected live schema.
- **Current behavior:** No admin audit table or atomic/reliable audit-write contract exists.
- **Desired behavior:** Append-only audit events for successful and failed privileged operations with actor/provider, action, target/provider, timestamp, outcome and correlation/request ID; safe before/after metadata only.
- **Acceptance criteria:**
  - Additive, reviewed schema design validated only in an approved non-production environment.
  - Server-only/service-role access; RLS and grants are explicitly checked.
  - Audit failure behavior is explicit and tested before enabling mutation endpoints.
  - No tokens, passwords, MFA secrets/recovery codes, passkey material or credential hashes are stored.
- **Validation:** Non-production migration/schema test; audit insert/read authorization tests; failure injection; redaction tests.
- **Dependencies:** AUTH-UM-000 and approved non-production Supabase environment.
- **Risk:** High — missing or overexposed audit data weakens incident response and can leak security metadata.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-002 — Legacy account lifecycle API (UM-2)

- **Priority/status:** P1 / PARTIALLY DONE — read-only list/detail exists; mutations remain BLOCKED by AUTH-UM-000 and AUTH-UM-001B.
- **Evidence:** `src/users/users-management.controller.ts`, `src/users/users-management.service.ts`, `src/auth/auth.repository.ts`, `src/auth/auth.service.ts`, `src/auth/mfa.service.ts`, `src/auth/passkey.service.ts`, `supabase/migrations/`.
- **Current behavior:** Read-only list/detail endpoints are merged. The live schema recorded in the roadmap has no account-status column or audit table; current session revocation methods target an individual refresh token/session, not all active sessions by user. Role/status/session mutation endpoints are not implemented.
- **Desired behavior:** Audited role change within policy, reversible suspension/reactivation, and revoke-all-sessions for legacy NestJS accounts only.
- **Acceptance criteria:**
  - Every mutation is protected by current database-backed admin authorization and an audit record.
  - Prevent self-role-change, self-escalation and last-active-admin lockout, including concurrent requests.
  - Suspension and revocation semantics are atomic/idempotent and documented.
  - Never hard-delete by default; Keycloak identities remain separate and read-only.
  - Do not add mutation routes until schema, audit persistence and authorization/concurrency tests pass.
- **Validation:** Unit and non-production integration tests for allowed/denied transitions, concurrent last-admin protection, session-family revocation, audit failures and secret redaction.
- **Dependencies:** AUTH-UM-000, AUTH-UM-001A, AUTH-UM-001B, and safe release workflow handling under AUTH-OPS-001.
- **Risk:** Critical — unsafe mutations can lock out administrators or leave compromised sessions active.
- **Links:** [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18), [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-003 — Protected admin users UI (UM-3)

- **Priority/status:** P2 / PARTIALLY DONE — read-only directory and contract regression tests are merged; browser-level keyboard/responsive coverage and all privileged mutation flows remain open.
- **Evidence:** `web/src/app/admin/users/page.tsx`, `web/src/services/auth-api.ts`, `web/src/features/auth/auth-store.ts`, `web/scripts/admin-user-query.mjs`, `web/scripts/admin-user-query.test.mjs`, `web/scripts/admin-user-contract.test.mjs`.
- **Current behavior:** PR #19 provides the read-only `/admin/users` directory with search, role filter, pagination and detail panel. PR #24 extracts the query builder and adds dependency-free contract tests for query encoding, NestJS-only API access, Bearer auth, role gate, response allowlist, read-only controls, loading/empty/error states, dialog labels and explicit aliases. No mutation controls are exposed.
- **Desired behavior:** A responsive, accessible admin workflow for supported account lifecycle actions after the API and audit gates exist.
- **Acceptance criteria:**
  - No direct browser-to-Supabase access or sensitive fields in the UI.
  - Loading/empty/error states, keyboard-accessible confirmation dialogs and clear provider labels.
  - Mutation controls are not shown until matching protected API routes and tests exist.
  - UI role checks remain supplementary; server-side authorization is authoritative.
- **Validation:** PR #24 merged at `52864661b10bdd35feedb3266040700033d05238` from exact tested head `19e4d3b04b75cff5d38e70b6d01aa920a3eb1e02`. [Auth-web CI #40212531075](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531075) passed `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and the frontend container build. [Auth-service CI #40212531176](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531176) passed backend tests, typecheck, build and container build. Post-merge runs #40212871633 and #40212871603 passed. The Supabase Preview app check on the subsequent PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` failed with `Remote migration versions not found in local migrations directory`; the PR #24 merge check itself was skipped because no Supabase branch was associated. This is tracked under AUTH-UM-000 and no migration was applied.
- **Remaining:** PR #29 implements initial focus, Tab/Shift+Tab containment, Escape dismissal and trigger focus restoration. PR #43 attempted a dependency-free Chrome DevTools Protocol browser test but is BLOCKED after two approaches: the initial run stalled beyond the test timeout; the direct-Next/process-group follow-up failed to observe the admin row and logged a Next dev cross-origin HMR block. Options are to align the test origin with the dev host and instrument intercepted API URLs, or use an approved browser harness; no further retries in this task. Browser-level focus/responsive verification is not complete. Mutation controls remain gated on AUTH-UM-001B/AUTH-UM-002.
- **Dependencies:** AUTH-UM-002 for mutation controls; AUTH-UM-000/AUTH-UM-001B for safe backend lifecycle operations.
- **Risk:** Medium — UI/API contract mismatch can break workflows, but must not weaken server authorization.
- **Links:** [PR #19](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/19), [PR #24](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/24), [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18).


### AUTH-UM-003A — Keyboard-accessible read-only user detail dialog

- **Priority/status:** P2 / IMPLEMENTED — merged PR #29 at `c3745d755af470dbfb4e3c27afac6d564264b90b` from exact tested head `b37238b21cc6ba9bc03113854b28554b5c15a24d`; browser-level verification remains open.
- **Evidence:** web/src/app/admin/users/page.tsx, web/scripts/admin-user-contract.test.mjs.
- **Current behavior:** The read-only detail panel has dialog semantics and a close button but does not yet manage initial focus, contain keyboard tabbing, dismiss with Escape, or restore focus to the row that opened it.
- **Desired behavior:** Opening the panel focuses its close control; Tab/Shift+Tab remain inside the modal dialog; Escape closes it; closing restores focus to the originating account row.
- **Acceptance criteria:**
  - Preserve the read-only directory and current API contract; no mutation UI.
  - Use accessible dialog semantics and keyboard dismissal.
  - Keep focus inside the open dialog and restore focus to the trigger after close.
  - Add regression coverage for the keyboard/focus contract without adding an unapproved test dependency.
- **Validation:** Exact tested head `b37238b21cc6ba9bc03113854b28554b5c15a24d`: [auth-web CI #40214171528](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40214171528) passed `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and frontend container build; [auth-service CI #40214171499](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40214171499) passed `npm test`, `npm run typecheck`, `npm run build` and container build. The PR diff was reviewed; no server/auth/data-access changes. These are source-level contract tests, not browser-level interaction proof.
- **Dependencies:** Existing read-only UM-3 UI; no schema or audit dependencies.
- **Risk:** Low to medium — incorrect focus cleanup could leave keyboard users outside the modal; no server authorization or data-access behavior changes.
- **Safety:** No Supabase access added to the browser, no schema changes, no production release or account mutations.

### AUTH-UM-004 — Non-production security/integration gate (UM-4)

- **Priority/status:** P1 / BLOCKED until AUTH-UM-000 through AUTH-UM-003 gates are resolved and a non-production Supabase environment is available.
- **Evidence:** `.github/workflows/ci.yml`, `.github/workflows/web-ci.yml`, `README.md`, `docs/production-runtime-secrets.md`, `supabase/migrations/`.
- **Current behavior:** Source-level backend/web CI passes for the merged read-only slices but does not prove the live RPC contract, audit semantics, cookie/gateway forwarding or lifecycle behavior end-to-end.
- **Desired behavior:** Evidence-backed non-production integration proof and an explicit rollout decision, separate from code merges.
- **Acceptance criteria:**
  - Backend and web tests/typecheck/lint/build pass on exact PR heads.
  - Schema/RPC provenance, RLS/grants, audit redaction, cookies/CORS/CSRF/rate limits and gateway behavior are verified.
  - Tests cover login, refresh, MFA, passkey, suspension and session revocation paths.
  - No production migration, deployment, live account mutation or secret output is performed by this task.
- **Validation:** Exact-head GitHub Actions; approved non-production Supabase integration; auth consumer contract tests; redaction review.
- **Dependencies:** AUTH-UM-000 through AUTH-UM-003 and AUTH-OPS-001.
- **Risk:** Critical if source-only CI is mistaken for rollout readiness.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-SEC-001 — Bind MFA completion to a server-side first-factor challenge

- **Priority/status:** P1 / OPEN — cross-cutting auth security follow-up tracked under [Issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), not a duplicate user-management issue.
- **Evidence:** `src/auth/auth.controller.ts` (`mfa/login`, `mfa/recovery`), `src/auth/dto/mfa-login.dto.ts`, `web/src/features/auth/auth-store.ts`.
- **Current behavior:** MFA completion accepts `userId + code`; pending MFA state is held in the browser store and is not a server-issued, expiring challenge bound to successful password verification. No explicit NestJS rate-limit guard is visible in this repository.
- **Desired behavior:** Short-lived, one-time server challenge bound to the user/session, bounded attempts and safe invalidation.
- **Acceptance criteria:**
  - MFA cannot complete for a user without a prior server-validated first factor.
  - Challenge is one-time, short-lived and bound to the correct user/session; attempts are rate-limited.
  - Recovery codes remain one-time; errors are generic and audit records contain no codes/secrets.
- **Validation:** Controller/service tests for missing, expired, replayed and cross-user challenges; rate-limit tests; verify gateway rate limiting separately before rollout.
- **Dependencies:** Coordinate with AUTH-UM-000 RPC/schema reconciliation; preserve existing active-account login contracts with compatibility tests.
- **Risk:** High — second-factor completion should not be represented solely by client-side state.
- **Links:** [Issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), [auth controller](../../src/auth/auth.controller.ts), [MFA DTO](../../src/auth/dto/mfa-login.dto.ts).

### AUTH-UM-001A2 — Normalize thrown admin role-lookup failures

- **Priority/status:** P1 / MERGED — [PR #31](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/31) squash-merged at `98e15cd120c68f9920b4e055e770ed1ec3db0aea`; exact tested head `08f4a36c7835d08e6e41e79ef9b7d1e02a17209d`.
- **Evidence:** `src/users/admin.guard.ts`, `test/admin.guard.spec.ts`.
- **Current behavior:** Returned Supabase errors were normalized, but thrown query/client exceptions could escape with dependency-specific details.
- **Change:** The database lookup boundary now converts thrown lookup failures to a sanitized `503 Unable to verify administrator access`. JWT verification remains outside the catch boundary, and the current database role remains authoritative.
- **Acceptance criteria:**
  - [x] Returned and thrown current-role lookup failures deny access.
  - [x] A regression test verifies safe error text without leaking dependency details.
  - [x] Auth-service CI passed on the exact tested head: [run #40216810341](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40216810341) — tests, typecheck, build and container build.
  - [ ] Lint was not verified: it is not included in the auth-service CI workflow and local execution was unavailable in the connector-only environment.
- **Dependencies:** Existing AUTH-UM-001A guard; no schema, audit table, migration or provider change.
- **Risk:** Low/medium — fail-closed authorization is preserved; infrastructure failures now return a consistent sanitized response.
- **Safety:** No admin mutation endpoints, no browser data access, no production migration/deployment or live account mutation.
- **Merge verification:** At merge, `master` matched `98e15cd120c68f9920b4e055e770ed1ec3db0aea` (compare status identical). Release workflow remains `workflow_dispatch`-only.

### AUTH-UM-001A3 — Regression coverage for admin user list projection and pagination

- **Priority/status:** P1 / MERGED — [PR #33](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/33) squash-merged at `f3bea9257a0b743dcfcdba725e75abf0d597c2b3`; exact tested head `6d78f46b71ee4f4eb3d0fe3c56188abd1fde88a1`.
- **Evidence:** `test/user-management-security.spec.ts`, `src/users/users-management.service.ts`, `src/users/dto/list-users.dto.ts`.
- **Change:** Regression tests prove the paginated list returns only allowlisted fields even when mocked rows include password/MFA secret fields, asserts safe selected columns, ordering, role/email filters and page range, and rejects a page size above 100.
- **Acceptance criteria:**
  - [x] List output excludes mocked password hash and encrypted MFA secret values.
  - [x] Query projection, filters, ordering and pagination range are asserted.
  - [x] Page size 101 is rejected by DTO validation.
  - [x] Auth-service CI passed on the exact tested head: [run #40217150087](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40217150087) — tests, typecheck, build and container build.
  - [ ] Lint was not verified: it is not included in the auth-service CI workflow and local execution was unavailable in the connector-only environment.
- **Dependencies:** Existing read-only UM-1A API; no schema or audit dependency.
- **Risk:** Low — test-only; no runtime behavior or access boundary changes.
- **Safety:** No mutation endpoint, migration, production deployment or live account mutation.
- **Merge verification:** `master` matched merge SHA `f3bea9257a0b743dcfcdba725e75abf0d597c2b3` (compare status identical).

### AUTH-UM-001A4 — Normalize thrown admin directory query failures

- **Priority/status:** P1 / MERGED — [PR #36](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/36) squash-merged at `edde5b77f63100cd2f38c84ea24271485a12a9be`; exact tested head `41e4114e0986f2c08b41ec1fb7d2b1595880f5fe`.
- **Evidence:** `src/users/users-management.service.ts`, `test/user-management-security.spec.ts`.
- **Change:** Thrown failures from the read-only user list/detail queries now return the same sanitized service-unavailable messages as returned Supabase errors. Tests prove the underlying dependency details do not escape.
- **Acceptance criteria:**
  - [x] Normalize thrown list-query failures to `Unable to load user directory`.
  - [x] Normalize thrown detail-query failures to `Unable to load user details`.
  - [x] Add regression tests for both rejected query promises and safe error messages.
  - [x] Auth-service CI passed on exact head: [run #40217547587](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40217547587) — tests, typecheck, build and container build.
  - [ ] Lint was not verified: it is not included in the service CI workflow and local execution was unavailable in the connector-only environment.
- **Dependencies:** Existing read-only UM-1A API; no schema, audit or migration dependency.
- **Risk:** Low/medium — read-only response contract is unchanged; only failure normalization changes.
- **Safety:** No mutation endpoints, schema changes, production migrations/deployments or live account mutations.
- **Merge verification:** Current `master` matched `edde5b77f63100cd2f38c84ea24271485a12a9be` (compare status identical); auth release remains `workflow_dispatch`-only.

### AUTH-UM-003C — Browser-level dialog focus and responsive contract

- **Priority/status:** P2 / BLOCKED after two materially different technical approaches. Keep PR #43 open for evidence, but do not merge: exact-head web CI fails at `npm test` and browser row rendering is unverified.
- **Evidence:** `web/src/app/admin/users/page.tsx`, `web/scripts/admin-user-contract.test.mjs`, `web/scripts/admin-user-dialog.browser.test.mjs`, `.github/workflows/web-ci.yml`.
- **Current behavior:** Existing tests assert focus-management source patterns, but do not execute real browser keyboard events or measure the rendered dialog at phone/landscape/desktop viewports.
- **Desired behavior:** Verify the implemented read-only detail dialog in a real headless browser without adding an npm browser dependency or calling a real auth service.
- **Acceptance criteria:**
  - Exercise Tab and Shift+Tab wrap, Escape dismissal and focus restoration using browser input events.
  - Check the dialog stays inside 390×844 portrait, 844×390 short-landscape and 1280×800 desktop viewports without page-level horizontal overflow.
  - Confirm the dialog renders only allowlisted account fields and the non-admin UI never calls the admin directory API.
  - Mock all auth/admin API responses; add no Supabase/browser data access, schema change or mutation control.
- **Validation/evidence:** Initial web CI [#40228602430](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40228602430) on head `d9f4843d479f8e65e7a8a80d9803aa0a5891e943` remained in `npm test` beyond the intended 180-second test timeout; logs were unavailable while it was active and it was not cancelled. The materially different follow-up at head `0b7aea23f5308f11c9defdae9a38092e572ce641` launched Next directly and killed process groups; service CI [#40228921670](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40228921670) passed tests/typecheck/build/container, but web CI [#40228921732](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40228921732) failed `npm test` after 33.2 seconds waiting for the admin row. Next logs show `GET /admin/users` returned 200 and then a blocked cross-origin request to `/_next/hmr` from `127.0.0.1`; the browser never observed `alice@example.com`. A subsequent documentation/newline-only head `1164676f427ca2b42e112ae313c1ff6a26eae556` reproduced the same web test failure in [#40229036077](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40229036077). Typecheck/lint/build/container were skipped after `npm test` failed. No further technical retries in this task: document options and resume only as a separate task.
- **Dependencies:** Existing read-only UM-3 UI; no schema/audit dependency. Requires the GitHub-hosted runner's preinstalled Chrome/Chromium.
- **Risk:** Low to medium — browser harness may expose an existing keyboard/layout defect; no runtime auth or database behavior changes.
- **Safety:** No new npm dependency, no real account calls, no Supabase browser access, no schema/migration, no production release, no Keycloak mutation.

### AUTH-UM-003B — Reset directory loading/error state for each request

- **Priority/status:** P2 / MERGED — [PR #40](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/40) squash-merged at `61adb64a71128b8eac2f5ba2ea28181025af6ac1` from exact tested HEAD `fc29ba65bf1c8c9486fa8b1d4122bb1a7231ba38`. Auth-web CI [#40222012490](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40222012490) and auth-service CI [#40222012483](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40222012483) passed; post-merge master runs [#40222175812](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40222175812) and [#40222175883](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40222175883) passed.
- **Current behavior:** Changing role or page starts a new admin-directory request but does not set the loading state or clear a prior error. A successful subsequent request can leave a stale error visible, and users receive no loading indication for filter/page changes.
- **Desired behavior:** Loading and error are derived from the current request key. Query/filter/page changes immediately show loading and hide stale errors; cancelled requests must not overwrite newer state.
- **Acceptance criteria:**
  - Derive loading/error from the current request key without synchronous state updates inside effects.
  - Preserve request cancellation and the read-only NestJS-only API contract.
  - Add regression coverage for keyed success/error state and stale-state suppression.
  - Keep the directory response allowlist, explicit TypeScript aliases, and no-mutation UI unchanged.
- **Validation:** Auth-web CI must pass tests, typecheck, lint, build and container build on the exact PR head; auth-service CI must also pass tests, typecheck, build and container build.
- **Dependencies:** Existing read-only UM-3 UI; no schema, audit, migration, or account-mutation dependency.
- **Risk:** Low — UI state transition only. No auth/data-access contract changes.
- **Safety:** No direct browser-to-Supabase access, mutation endpoints, schema changes, production release, or live account mutation.

### AUTH-UM-003D — Align Next.js dev origin for browser verification

- **Priority/status:** P2 / IN PROGRESS — separate diagnostic slice following blocked AUTH-UM-003C; no browser-level success is claimed yet.
- **Evidence:** PR #43 exact head `632be6c667e419bb6d3443ea642dc777c9171fd8`; web CI [run #40229190921](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40229190921) failed in `npm test`, while service CI [run #40229190867](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40229190867) passed. The web job log records `GET /admin/users?browserCase=390x844 200`, then Next.js blocked the cross-origin `/_next/hmr` request from `127.0.0.1` and explicitly recommended `allowedDevOrigins: ['127.0.0.1']`. The browser test timed out waiting for the mocked directory row.
- **Current behavior:** `web/next.config.ts` configures standalone output only. The browser test starts Next.js in dev mode and navigates to `http://127.0.0.1:<port>`; dev-resource origin validation blocks HMR, and the row assertion times out.
- **Desired behavior:** Explicitly allow only the loopback origin used by the local dev test; keep production behavior and browser mocks unchanged. On timeout, report only intercepted API method/path pairs, never query strings or credentials.
- **Acceptance criteria:**
  - [ ] Add `127.0.0.1` to Next.js `allowedDevOrigins` for development resources only.
  - [ ] Keep all auth/admin requests mocked and preserve removal of Supabase/database credentials from the child process environment.
  - [ ] Keep keyboard, allowlisted-rendering, non-admin API-denial and viewport assertions enabled.
  - [ ] Exact-head web CI passes; confirm the resulting PR #43 head reruns successfully before marking browser verification complete.
  - [ ] Keep PR #43 unmerged until its checks pass and the separate Supabase GitHub integration merge target is verified safe.
- **Validation:** GitHub Actions is the test runner; no local execution or real-account test is claimed. No database/schema/migration, production deployment, or account mutation.
- **Exact-head status note (2026-10-26):** PR #45 is open at head `2840a5e07093152c6cafc0047776cca4faba28a1` and targets the browser-test branch used by PR #43. The available workflow-run lookup shows no pull-request-triggered run for this exact head; the workflows' PR trigger targets `master`, while this stacked PR targets a feature branch. Do not treat this as a pass. Verify the resulting PR #43 head with web CI before marking browser verification complete or merging to `master`.
- **Dependencies:** AUTH-UM-003C browser contract harness; no database/audit dependency.
- **Risk:** Low — Next.js development-origin allowlist plus failure diagnostics only; no production auth or API contract changes.
- **Links:** [PR #43](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/43), [web CI failure](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40229190921).

## Release evidence and guardrails

- PR #18's merge triggered [auth-service-release run #40209889836](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40209889836), which completed image publication and a promotion request. This is not independent proof of production rollout/health; no platform-infra inspection or rollback was performed.
- The user has not authorized production deployment/migration/live account mutation. Treat any workflow that can publish/promote/deploy as a separate side effect, not as implied by PR auto-merge authorization.
