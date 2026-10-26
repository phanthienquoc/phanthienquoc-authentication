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

- **Priority/status:** P0 / PARTIALLY RECONCILED — the four source-required RPCs were applied to the connected Supabase project and verified on 2026-10-26; the migration source artifact and caller type fix are in this PR. Three other remote-only migration versions remain unaccounted for. UM-1B audit persistence, UM-2 lifecycle mutations, status enforcement, and UM-4 integration validation remain separate work.
- **Evidence:** Read-only live catalog findings in `docs/user-management-roadmap.md`; `src/auth/auth.repository.ts`; `src/auth/passkey.repository.ts`; `src/db/supabase.client.ts`; `supabase/migrations/20261012000000_auth_persistence_rpcs.sql`.
- **Current behavior (updated after migration):** Supabase `apply_migration` succeeded for `auth_persistence_rpc_contract_reconcile`; the ledger now includes version `20261026030920`. A read-only catalog query confirmed `auth_replace_mfa_recovery_codes(uuid,text[]) RETURNS void`, `auth_consume_mfa_recovery_code(uuid,text) RETURNS boolean`, `auth_consume_passkey_challenge(text,text) RETURNS jsonb`, and `auth_rotate_refresh_session(text,uuid,text,timestamptz,text,text) RETURNS jsonb`. All four are `SECURITY DEFINER`, have a fixed search_path, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution to `service_role` (the owner `postgres` retains execute). Refresh rotation returns only a minimal user projection and does not return a password hash or encrypted MFA secret. The immediate source/live RPC absence is resolved; the TypeScript return projection is fixed in this PR. Three remote-only migration versions remain without source artifacts.
- **Post-migration verification (2026-10-26T03:09Z):** `list_migrations` returned `20261026030920 auth_persistence_rpc_contract_reconcile`; a separate `pg_proc`/ACL query returned all four signatures and `SECURITY DEFINER=true`, with EXECUTE for `postgres`/`service_role` only. Branch metadata still says `MIGRATIONS_FAILED` despite the new ledger row and present functions, so that status is inconsistent with the observed apply/catalog result; do not treat it as proof the apply failed. No account rows were read and no user/account data was changed.
- **Read-only log signal (2026-10-26, last 24 hours):** A unified-log aggregate returned a count of 1 in `postgres_logs` for each of the four source-required RPC names when paired with an error-pattern match (`does not exist`, SQLSTATE `42883`, or `permission denied`); corresponding `postgrest_logs` counts were 0. The query returned aggregate counts only and did not inspect raw payloads or caller identity. This corroborates contract risk but does not establish which deployed caller emitted the records.
- **Historical pre-migration catalog snapshot (2026-10-26T02:06Z):**
- **Desired behavior:** Keep the applied RPC signatures, service-role-only grants and minimal refresh projection synchronized between the database, tracked migration source, and TypeScript call sites. Reconcile remaining remote-only migration provenance separately; do not infer their contents.
- **Historical pre-migration provenance evidence (2026-10-26, before the authorized RPC apply):**
- **Acceptance criteria:**
  - [ ] Identify the authoritative source/revision for every live auth RPC and reconcile it with repository migrations.
  - [x] Apply and verify the four existing source-required RPC contracts on the connected Supabase project; read-only catalog confirms signatures and service-role-only grants.
  - [x] Add a non-mutating readiness/contract check that fails clearly when required RPCs are absent — [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27), merged at `94341f8535a409dd2215d8f5891969f66b3a496d`.
  - [x] Record read-only live migration-ledger, function signature/ACL, table/RLS and grant evidence without reading account rows or mutating the shared project.
  - [x] Record recovery options; do not reset, merge, rebase or migrate the shared live project.
- **Historical pre-migration validation record:** PR #27 exact tested head
- **Dependencies:** Matching source migration and TypeScript contract test are part of this PR. Remote-only migration provenance, account-status schema, audit persistence, and the server-issued MFA challenge are separate tasks.
- **Risk:** Critical — refresh rotation, MFA recovery-code operations and passkey challenge consumption may fail if source and live schema diverge. Readiness now fails closed instead of falsely reporting table-only readiness.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27), [auth RPC migration](../../supabase/migrations/20261012000000_auth_persistence_rpcs.sql).

### AUTH-SEC-002 — Restrict direct browser-role grants on auth persistence tables

- **Priority/status:** P0 / BLOCKED on AUTH-UM-000 migration provenance and an approved non-production validation target.
- **Evidence:** Read-only Supabase catalog inspection on 2026-10-26; `public.users`, `public.refresh_sessions`, `public.mfa_recovery_codes`, `public.auth_passkey_credentials`, `public.auth_passkey_challenges`, `public.auth_keycloak_identities`; [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).
- **Current behavior:** RLS is enabled on all six tables and the catalog query found no policies. The ACL catalog explicitly lists `anon` and `authenticated` with SELECT/INSERT/UPDATE/DELETE/TRUNCATE plus REFERENCES, TRIGGER, and PostgreSQL 17 MAINTAIN privileges on `users`, `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_challenges`, and `auth_passkey_credentials`. Row-level access is default-denied by RLS when no policy matches, but RLS does not apply to TRUNCATE, so the excess destructive privilege is not mitigated by RLS. `auth_keycloak_identities` has no browser-role ACL entries and is restricted to server roles. The legacy refresh/recovery RPCs are executable only by `service_role`/owner.
- **Fresh security-advisor cross-check (2026-10-26T01:05Z):** Supabase's security advisor reports 29 `rls_enabled_no_policy` findings across the connected project. Treat that as a project-wide signal, not 29 Auth tables. The six Auth tables scoped here were individually confirmed to have zero policies. Keep remediation scoped to Auth until authoritative migration provenance and an approved non-production target exist; do not modify unrelated tables.
- **Fresh ACL/advisor recheck (2026-10-26T02:06Z):** `anon` and `authenticated` also have direct `TRUNCATE` privileges on `users`, `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_challenges`, and `auth_passkey_credentials`. No browser table privileges were found for `auth_keycloak_identities`. Security advisor still reports 29 project-wide `rls_enabled_no_policy` findings. Performance advisor reports 15 unindexed foreign keys project-wide, including the passkey challenge `user_id` FK and refresh-session `replaced_by` FK; these remain observation-only and are not modified here.
- **Desired behavior:** Keep password hashes, MFA state, refresh-session hashes, recovery-code hashes, passkey public-key/counter material and Keycloak identity metadata behind the server-side service-role client or narrowly scoped RPCs; browser roles should have no direct table privileges unless a separately justified, tested policy requires them.
- **Acceptance criteria:**
  - [ ] Inspect the web app and shared clients to confirm no browser code depends on direct Supabase table access.
  - [ ] Reconcile authoritative migration provenance before designing a grant-revocation migration.
  - [ ] Validate in an approved non-production environment that `anon`/`authenticated` cannot read or mutate auth tables and that the service-role login/refresh/MFA/passkey flows still work.
  - [ ] Add regression checks for table privileges, RLS/policies and restricted RPC execution; do not apply a migration to the shared live project as part of this task.
- **Validation:** Read-only `pg_policies`, `has_table_privilege` and `has_function_privilege` queries on 2026-10-26; no account rows were read and no database writes or migrations were performed.
- **Dependencies:** AUTH-UM-000 and an approved non-production Supabase target.
- **Risk:** High — revoking grants without confirming the runtime call paths could break authentication, while broad grants are fragile if RLS policy state changes.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

- **Privilege semantics:** Supabase's [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) distinguishes object grants from row policies; PostgreSQL's [row-security documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) notes row security does not apply to operations such as TRUNCATE. Revoke the excess browser-role privileges only through an approved, reviewed migration in a verified non-production environment; do not mass-change the shared project.

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

### AUTH-UM-001C — Controller authorization and read-only route contract

- **Priority/status:** P1 / MERGED — [PR #42](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/42) squash-merged at `998b73b2fc01795291c00ea3ee0d80d396c5b61d` from exact tested head `d0ddafc5373fb62897c5220f75091f116a3a6324`.
- **Current behavior:** `UsersManagementController` declares `@UseGuards(AdminGuard)` at controller level and exposes read-only list/detail handlers.
- **Desired behavior:** Every current admin-directory route stays protected by `AdminGuard`; every route remains GET-only until the authorization and privileged-audit prerequisites for mutations are complete.
- **Acceptance criteria:**
  - Assert controller-level guard metadata includes `AdminGuard`.
  - Assert the existing `list` and `getById` handlers are registered routes.
  - Assert every registered route handler uses `RequestMethod.GET`; any future POST/PUT/PATCH/DELETE route fails this contract test until deliberately updated with the required security/audit coverage.
  - Keep legacy NestJS user routes separate from Keycloak identity rows.
- **Validation:** Auth-service CI [run #40227589102](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40227589102) passed dependency installation, tests, typecheck, build and container build on exact head `d0ddafc5373fb62897c5220f75091f116a3a6324`. Lint is not part of this workflow; no `web/**` files or migrations changed. Default branch verified at merge SHA `998b73b2fc01795291c00ea3ee0d80d396c5b61d`.
- **Dependencies:** Complements AUTH-UM-001A; does not unblock AUTH-UM-001B audit persistence or UM-2 lifecycle mutations.
- **Risk:** Low — test-only metadata assertions.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

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
- **Remaining:** Browser-level dialog verification and responsive layout regression coverage are tracked by AUTH-UM-003D below. The earlier browser harness failure was reproduced as a blocked cross-origin `/_next/hmr` request from `127.0.0.1`; the narrow development-origin fix and exact-head test evidence are recorded separately so this merged dialog task does not duplicate the follow-up status.- **Dependencies:** AUTH-UM-002 for mutation controls; AUTH-UM-000/AUTH-UM-001B for safe backend lifecycle operations.
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

- **Priority/status:** P1 / BLOCKED — source audit is complete, but implementation depends on the AUTH-UM-000 RPC/schema contract and an approved non-production target for durable challenge storage; tracked under [Issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), not a duplicate user-management issue.
- **Evidence:** `src/auth/auth.module.ts`, `src/auth/auth.controller.ts` (`POST mfa/login`, `POST mfa/recovery`), `src/auth/dto/mfa-login.dto.ts`, `src/auth/passkey.service.ts`, `web/src/features/auth/auth-store.ts`.
- **Current behavior:** The registered `AuthModule` exposes only `AuthController`. Its active MFA login/recovery routes accept `userId + code`; password and passkey login return `mfaRequired + userId`, and the pending state is held in the browser store rather than a server-issued, expiring challenge bound to successful first-factor verification. `src/auth/mfa.controller.ts` contains duplicate MFA routes but is not registered in `AuthModule`; do not register it as a workaround. No explicit NestJS rate-limit guard is visible in this repository; gateway rate limiting has not been verified.
- **Test inventory:** `test/user-management-security.spec.ts`, `test/admin.guard.spec.ts` and `test/users-management.controller.spec.ts` cover admin response/guard/route contracts. No unit spec for `AuthService.login/refresh`, MFA completion or `PasskeyService.authenticationVerify` was found under `test/`; this is a repository test-tree finding, not a claim that no external/e2e coverage exists.
- **Desired behavior:** Short-lived, one-time server challenge bound to the successful first factor, user and session; bounded attempts, safe invalidation and consistent behavior across password/passkey MFA and recovery.
- **Acceptance criteria:**
  - [ ] MFA cannot complete for a user without a prior server-validated first factor.
  - [ ] Challenge is one-time, short-lived and bound to the correct user/session; attempts are rate-limited.
  - [ ] Password and passkey MFA paths share the same server challenge contract; recovery codes remain one-time.
  - [ ] Missing, expired, replayed and cross-user challenges fail closed with generic errors; audit records contain no codes/secrets.
  - [ ] The unregistered duplicate `MfaController` remains unregistered until its behavior is reconciled or the duplicate is removed with tests.
- **Validation:** Controller/service tests for missing, expired, replayed and cross-user challenges; password/passkey MFA parity tests; rate-limit tests; verify gateway rate limiting separately before rollout.
- **Dependencies:** Coordinate with AUTH-UM-000 RPC/schema reconciliation; choose durable server-side challenge storage only after authoritative migration provenance and an explicitly approved non-production Supabase target. Preserve existing active-account login contracts with compatibility tests.
- **Risk:** High — second-factor completion is currently represented by client-held user ID and code, not a server-issued first-factor challenge.
- **Links:** [Issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), [AuthModule](../../src/auth/auth.module.ts), [auth controller](../../src/auth/auth.controller.ts), [MFA DTO](../../src/auth/dto/mfa-login.dto.ts).

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

### AUTH-UM-003B — Reset directory loading/error state for each request

- **Priority/status:** P2 / MERGED — [PR #40](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/40) squash-merged at `61adb64a71128b8eac2f5ba2ea28181025af6ac1` from exact tested head `fc29ba65bf1c8c9486fa8b1d4122bb1a7231ba38`; PR #39 was closed as superseded.
- **Evidence:** `web/src/app/admin/users/page.tsx`, web request-state regression tests, [PR #40](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/40).
- **Current behavior:** Request loading/error state is keyed to auth token, role, search, filter and page. A new key suppresses stale errors and shows loading; obsolete cancelled requests cannot overwrite the active result.
- **Desired behavior:** Preserve request-key-derived loading/error state, cancellation, read-only API behavior and the NestJS-only data-access boundary.
- **Acceptance criteria:**
  - [x] New request keys immediately derive loading state and suppress stale errors.
  - [x] Only success/error results for the active request key are visible.
  - [x] Cancelled requests do not update state.
  - [x] Keep the API read-only and NestJS-only; no browser Supabase access or mutation controls.
  - [x] Add dependency-free regression coverage.
- **Validation:** Exact-head auth-web CI [#40222012490](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40222012490) passed tests, typecheck, lint, build and frontend container build. Exact-head auth-service CI [#40222012483](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40222012483) passed tests, typecheck, build and service container build. Supabase Preview was skipped because the branch was not associated with a Supabase Branch; no migration/schema file changed.
- **Dependencies:** Existing read-only UM-3 UI; no schema, audit, migration or account-mutation dependency.
- **Risk:** Low — UI request-state behavior only; no JWT, session, authorization or API contract changes.
- **Safety:** No direct browser-to-Supabase access, mutation endpoints, schema changes, production release, or live account mutation.

### AUTH-UM-003C — Browser-level admin dialog focus and responsive contract

- **Priority/status:** P2 / IMPLEMENTED IN PR #45 — exact-head auth-web and auth-service CI pass; merge remains blocked by the unverified Supabase GitHub integration target.
- **Evidence:** `web/scripts/admin-user-dialog.browser.test.mjs`, `web/src/app/admin/users/page.tsx`, `web/scripts/admin-user-contract.test.mjs`; exact head `420b97b79991b376062189e7ae27ae8589556499`; auth-web CI [#40258016309](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40258016309), auth-service CI [#40258016304](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40258016304).
- **Current behavior:** The first passing browser harness exposed a real 844×390 defect: the dialog extended from y=-23 to y=413. PR #45 now bounds the dialog height to the viewport and enables internal vertical scrolling; the browser test verifies the content is scrollable and the bottom is reachable. All API responses remain mocked; keyboard/focus, allowlisted detail rendering, non-admin denial and 390×844 / 844×390 / 1280×800 checks remain enabled. PR #43 is closed as superseded.
- **Desired behavior:** Keep the read-only detail dialog fully within each viewport while preserving access to content through internal scrolling; maintain stable browser assertions without real account data or a browser-to-Supabase path.
- **Acceptance criteria:**
  - [x] Align the isolated local browser origin with Next's dev-resource allowlist.
  - [x] Keep the dialog within 390×844, 844×390 and 1280×800 viewports without horizontal overflow.
  - [x] At 844×390, assert internal vertical scrolling and verify the dialog content can be scrolled to its bottom.
  - [x] Preserve focus, keyboard, response-allowlist and non-admin API-denial assertions; no skips or weakened assertions.
  - [x] Keep all API responses mocked; no real Supabase, account rows, secrets or mutations.
  - [x] Exact-head auth-web and auth-service CI pass on `420b97b79991b376062189e7ae27ae8589556499`.
- **Validation:** Auth-web and auth-service CI passed on exact head `420b97b79991b376062189e7ae27ae8589556499`. The Supabase Preview check remains skipped because no Supabase Branch is associated; do not merge until the external integration target and merge-time migration behavior are verified safe.
- **Dependencies:** Existing read-only UM-3 UI and API contract; no schema, audit, migration or mutation dependency. Supabase integration safety remains a repository-level merge gate.
- **Risk:** Low-to-medium — test harness and dev-only allowlist plus a page-scoped scroll constraint; runtime authentication and account-management behavior remain unchanged.
- **Links:** [superseded PR #43](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/43), [current PR #45](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/45), [auth-web CI](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40258016309), [auth-service CI](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40258016304).

### AUTH-UM-003D — Browser-level admin user dialog verification

- **Priority/status:** P2 / IN PR — [PR #47](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/47), replacing stale-base [PR #45](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/45); this branch carries the reviewed UI/test slice onto current master after the roadmap evidence PR merged.
- **Evidence:** `web/next.config.ts`, `web/scripts/admin-user-dialog.browser.test.mjs`, `web/src/app/admin/users/page.tsx`; original PR #45 exact head `420b97b79991b376062189e7ae27ae8589556499`.
- **Current behavior:** The prior Chrome DevTools Protocol browser test was blocked when Next.js rejected the loopback origin for HMR, so the mocked admin directory row never rendered. The dialog also needed a bounded height and internal scrolling for short landscape viewports.
- **Desired behavior:** Allow only `127.0.0.1` as a Next.js development origin for the test harness; exercise the real UI in Chrome/Chromium against a local mocked Auth API; constrain the read-only dialog to the viewport with scrollable content.
- **Acceptance criteria:**
  - Browser test runs under the existing `npm test` script with Chrome/Chromium and no Supabase/service-role credentials.
  - Verify 390×844 portrait, 844×390 landscape, and 1280×800 desktop; dialog remains within the viewport and landscape content is reachable by internal scrolling.
  - Verify initial focus, Tab/Shift+Tab containment, Escape dismissal, focus restoration, and that a non-admin never requests the admin directory API.
  - Mock only local `/auth/*` and `/api/admin/users*` requests; diagnostics record method/path only, without query strings or credentials.
  - Rendered UI never exposes password hashes, MFA secrets, refresh tokens, recovery codes, or private passkey material.
  - Exact-head auth-web and auth-service CI pass; release workflow remains manual-dispatch-only.
- **Validation:** Original PR #45 exact head passed auth-web CI [run #40258016304](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40258016304), including browser test result 10 tests / 10 passed / 0 failed, and auth-service CI [run #40258016309](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40258016309). Replacement branch must rerun both checks after rebasing the task queue onto current master.
- **Dependencies:** Existing read-only UM-3 UI; no schema, audit, migration, or mutation endpoint dependency.
- **Risk:** Low/medium — dev-only origin configuration and browser verification; no production host is allowlisted and no real Auth/Supabase request is made.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), current [PR #47](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/47), superseded [PR #45](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/45).

## Release evidence and guardrails

- PR #18's merge triggered [auth-service-release run #40209889836](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40209889836), which completed image publication and a promotion request. This is not independent proof of production rollout/health; no platform-infra inspection or rollback was performed.
- The user has not authorized production deployment/migration/live account mutation. Treat any workflow that can publish/promote/deploy as a separate side effect, not as implied by PR auto-merge authorization.
