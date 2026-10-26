# Authentication — User Management Task Queue

**Last audited:** 2026-10-26 12:53 +07:00  
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
- Owner-authorized migration scope (2026-10-26): the narrow Auth RPC-contract and Auth-table browser-grant migrations documented below were applied via the connected Supabase tools and verified read-only. Continue scoped schema/migration work as required by this User Management queue; do not infer approval for resets/deletes, Supabase branch merges, live account-data mutations, function deployment, production app release, or unrelated shared-project schema changes. A skipped check is not a passed test.

## Active tasks

### AUTH-OPS-001 — Prevent unauthorized release promotion from master pushes

- **Priority/status:** P0 / DONE — ordinary pushes no longer publish or promote images.
- **Evidence:** [PR #22](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/22) squash-merged at `ab8e53782d1929880b9ad4df29365d50d86980a6`; current `master` verified at that SHA. Exact tested PR head: `28ec9dfe5f8088d8b93a5ba16aa632879565c109`.
- **Change:** `.github/workflows/release.yml` now exposes only `workflow_dispatch`. Publishing and the platform-infra promotion request remain available only through an explicit manual dispatch from `master`; ordinary pushes run CI only.
- **Validation:** [Auth-service CI PR run #40211913021](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40211913021) passed tests, typecheck, build and container build on the exact PR head. Post-merge [auth-service CI run #40212123019](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212123019) also passed on the merge SHA. The diff changed only the release workflow trigger; no release/promotion run was observed for the merge SHA.
- **Side-effect gate:** Reviewed the prior image publication and promotion steps. The workflow-only merge no longer matches any push trigger. No production deployment, migration, live account mutation or platform-infra change was performed.
- **Risk/remaining control:** Manual dispatch intentionally retains the ability to publish/promote production images; it must not be dispatched without separate release authorization. The prior [PR #18 release run #40209889836](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40209889836) proves only that a promotion request occurred, not that production rollout/health was verified.
- **Links:** [release workflow](../../.github/workflows/release.yml), [PR #22](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/22).

### AUTH-OPS-002 — Reconcile remaining Supabase migration history and integration status

- **Priority/status:** P1 / IN PROGRESS — read-only reconciliation is current; the only listed branch is default/base (`is_default=true`, `persistent=false`) with status `MIGRATIONS_FAILED`. Treat it as production-equivalent until a separate safe non-production target is confirmed. No migration or Supabase branch operation was performed.
- **Evidence:** `list_projects/get_project` returned the project whose ref `gtqovpusfyyvxpeezxlo` is explicitly documented in this roadmap. The project reports `ACTIVE_HEALTHY`, but its only branch is default/base `main` (Git branch `master`), `is_default=true`, `persistent=false`, with status `MIGRATIONS_FAILED`; treat it as production-equivalent because no separate development/preview branch is listed. Auth `.env.example` has a placeholder; TCE stores `SUPABASE_URL` only in GitHub secrets, and secret values are not visible, so the exact runtime URL-to-ref mapping is not independently confirmed. PR #55's Supabase Preview check is `skipped` because the Git branch is not associated with a Supabase branch and preview-branch creation is disabled; this is not a passing migration check.
- **Advisors (2026-10-26):** Supabase Security Advisor reports 34 project-wide `rls_enabled_no_policy` findings; Performance Advisor reports 15 unindexed foreign keys across the shared project. These span tables outside Authentication scope; no blanket RLS/index changes were made.
- **Current behavior:** The live ledger includes `20261026030920 auth_persistence_rpc_contract_reconcile`, `20261026032152 revoke_browser_auth_table_privileges`, `20261026035340 auth_admin_audit_events`, `20261026035431 auth_admin_audit_rpc_only_access`, and `20261026040431 auth_server_issued_mfa_login_challenges`. The source for `20261026040431` is on PR #55 and is not on `master`. `public.users` has no status/suspension column. The four core source RPCs, audit RPC and five MFA challenge RPCs are present with fixed `search_path` and EXECUTE limited to `service_role` plus owner `postgres`; browser-role direct grants are absent for the scoped Auth tables. Three remote-only versions (`20261014024759`, `20261014130516`, `20261014131151`) have no source artifact; remote `20261020234922 keycloak_identity_persistence` differs from local `20261014000000_keycloak_identity_persistence.sql`; local `20261012000000_auth_persistence_rpcs.sql` is absent from the remote ledger even though its current RPC contracts exist under later migration history.
- **Desired behavior:** Keep every migration version represented by authoritative SQL, reconcile remote-only/version-mismatched history without reconstructing files from names or catalog state, and identify an explicitly safe non-production target before any migration-bearing merge/apply.
- **Acceptance criteria:**
  - [x] Recheck current project, branch metadata, migration ledger, relevant table/RPC catalogs and ACLs without reading account rows.
  - [x] Verify browser-role direct grants are absent from the five legacy Auth tables and no direct grants exist on the audit/challenge tables.
  - [x] Record the live MFA challenge table/RPC contract and its source location on PR #55.
  - [ ] Find authoritative artifacts/revisions for the three remote-only migration versions.
  - [ ] Reconcile the remote/local Keycloak migration version mismatch and the local auth-RPC migration version absent from the ledger.
  - [ ] Confirm production versus non-production and safe preview/merge behavior before any migration-bearing PR is merged.
  - [ ] Recheck the historical `42P01` log match after an approved non-production integration test.
  - [x] No migration apply, Supabase branch creation/reset/merge, production data/schema mutation, or application release was performed by this run.
- **Validation:** The current read-only catalog confirms `public.users` columns are `id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted,created_at,updated_at`; no status/suspension field exists. `auth_record_admin_audit_event` is `SECURITY DEFINER`, fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE is `postgres,service_role`. The five challenge RPCs are `SECURITY DEFINER`, fixed search path and `postgres/service_role` execute only. Security advisor reports 34 project-wide `rls_enabled_no_policy` findings; no public policy was added. Aggregate logs showed one `auth_rotate_refresh_session` SQLSTATE `42P01` at `2026-10-26T00:32:48Z`, before migration `20261026030920`; no matching later error was returned by the same 24-hour aggregate query.
- **Additional provenance search (2026-10-26 12:32 +07):** A second, content-based GitHub search across both authorized repositories for `20261014024759`, `20261014130516`, and `20261014131151` returned only roadmap/task-queue mentions, not source migration files. Searches for `20261020234922 keycloak_identity_persistence` and `20261012000000_auth_persistence_rpcs.sql` returned documentation references but no authoritative artifacts for the remote/local version mismatch. This is independent of the earlier path-history search; migration provenance remains BLOCKED. Do not reconstruct SQL from ledger names or live catalog state. Supabase's [branching guide](https://supabase.com/docs/guides/deployment/branching) and [GitHub integration guide](https://supabase.com/docs/guides/deployment/branching/github-integration) state that commits to a connected Git branch can run deployment steps and pending migrations, so the project-to-repository mapping and deployment configuration must be established before any migration-bearing merge.
- **Dependencies:** Authoritative source for three remote-only versions, version reconciliation, and explicit environment classification.
- **Risk:** High — `MIGRATIONS_FAILED` and unknown environment make migration-bearing merge unsafe even though current signatures/privileges are present.
- **Links:** [UM roadmap](../user-management-roadmap.md), [PR #55](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/55), [RPC-contract migration](../../supabase/migrations/20261026030920_auth_persistence_rpc_contract_reconcile.sql), [grant-revocation migration](../../supabase/migrations/20261026032152_revoke_browser_auth_table_privileges.sql), [MFA challenge migration on PR branch](https://github.com/phanthienquoc/phanthienquoc-authentication/blob/fix/auth-sec-001-server-issued-mfa-challenge/supabase/migrations/20261026040431_auth_server_issued_mfa_login_challenges.sql).

### AUTH-UM-000 — Reconcile auth RPC and migration provenance (UM-0)

- **Priority/status:** P0 / PARTIALLY RECONCILED — the four source-required RPCs were applied to the connected Supabase project and verified on 2026-10-26; the migration source artifact and caller type fix are in this PR. Three other remote-only migration versions remain unaccounted for. UM-1B audit persistence, UM-2 lifecycle mutations, status enforcement, and UM-4 integration validation remain separate work.
- **Evidence:** Read-only live catalog findings in `docs/user-management-roadmap.md`; `src/auth/auth.repository.ts`; `src/auth/passkey.repository.ts`; `src/db/supabase.client.ts`; `supabase/migrations/20261012000000_auth_persistence_rpcs.sql`.
- **Current behavior (updated after migration):** Supabase `apply_migration` succeeded for `auth_persistence_rpc_contract_reconcile`; the ledger now includes version `20261026030920`. A read-only catalog query confirmed `auth_replace_mfa_recovery_codes(uuid,text[]) RETURNS void`, `auth_consume_mfa_recovery_code(uuid,text) RETURNS boolean`, `auth_consume_passkey_challenge(text,text) RETURNS jsonb`, and `auth_rotate_refresh_session(text,uuid,text,timestamptz,text,text) RETURNS jsonb`. All four are `SECURITY DEFINER`, have a fixed search_path, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution to `service_role` (the owner `postgres` retains execute). Refresh rotation returns only a minimal user projection and does not return a password hash or encrypted MFA secret. The immediate source/live RPC absence is resolved; the TypeScript return projection is fixed in this PR. Three remote-only migration versions remain without source artifacts.
- **Post-migration verification (2026-10-26T03:09Z):** `list_migrations` returned `20261026030920 auth_persistence_rpc_contract_reconcile`; a separate `pg_proc`/ACL query returned all four signatures and `SECURITY DEFINER=true`, with EXECUTE for `postgres`/`service_role` only. Branch metadata still says `MIGRATIONS_FAILED` despite the new ledger row and present functions, so that status is inconsistent with the observed apply/catalog result; do not treat it as proof the apply failed. No account rows were read and no user/account data was changed.
- **Read-only log signal (2026-10-26, last 24 hours):** A unified-log aggregate returned a count of 1 in `postgres_logs` for each of the four source-required RPC names when paired with an error-pattern match (`does not exist`, SQLSTATE `42883`, or `permission denied`); corresponding `postgrest_logs` counts were 0. The query returned aggregate counts only and did not inspect raw payloads or caller identity. This corroborates contract risk but does not establish which deployed caller emitted the records.
- **Historical pre-migration catalog snapshot (2026-10-26T02:06Z):** The sole connected Supabase project is ref `gtqovpusfyyvxpeezxlo` (`ACTIVE_HEALTHY`), but its only listed non-persistent branch `main`/Git `master` is `MIGRATIONS_FAILED`; it is not an approved non-production target. The runtime URL remains unverified because `.env.example` is a placeholder and secret values are not exposed. Remote ledger contains `20261014024759 restrict_auth_rpc_execution`, `20261014130516 keycloak_runtime_schema`, `20261014131151 keycloak_runtime_login_role`, `20261020234922 keycloak_identity_persistence`, but not `20261012000000_auth_persistence_rpcs`. Required `auth_rotate_refresh_session`, `auth_replace_mfa_recovery_codes`, `auth_consume_mfa_recovery_code`, and `auth_consume_passkey_challenge` remain absent. Only legacy `rotate_refresh_token(p_token_hash text, p_new_token_hash text, p_new_expires_at timestamptz, p_ip inet, p_user_agent text)` and `consume_recovery_code(p_user_id uuid, p_code_hash text)` exist; both are `SECURITY DEFINER`, EXECUTE only by `postgres`/`service_role`, and have incompatible signatures/results. Catalog confirmed RLS + zero policies on all six auth tables; direct browser-role SELECT/INSERT/UPDATE/DELETE/TRUNCATE grants remain on the five legacy auth tables but not `auth_keycloak_identities`. No account rows were read and no write was performed.
- **Desired behavior:** Keep the applied RPC signatures, service-role-only grants and minimal refresh projection synchronized between the database, tracked migration source, and TypeScript call sites. Reconcile remaining remote-only migration provenance separately; do not infer their contents.
- **Historical pre-migration provenance evidence (2026-10-26, before the authorized RPC apply):** Supabase migration metadata lists the remote versions above, but GitHub code search and path-specific commit history across both authorized repositories contain no matching files for `20261014024759_restrict_auth_rpc_execution.sql`, `20261014130516_keycloak_runtime_schema.sql`, or `20261014131151_keycloak_runtime_login_role.sql`. The live ledger is therefore drifted in both directions: it records those remote migrations plus Keycloak identity persistence at a different version, while it does not record the checked-in auth-persistence RPC migration. Do not synthesize migration contents from names, current grants or function definitions. The connected Supabase branch metadata reports one non-persistent `main` branch with `MIGRATIONS_FAILED` (preview status `ACTIVE_HEALTHY`); this is not proof of an approved test target. Only catalog metadata/function definitions were read; no table rows, writes, resets, rebases or migrations were performed. Project-ref matching remains unverified from repository config: `.env.example` contains only `SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co`, and the runtime URL value is not visible in checked-in files. `list_projects` returned the sole connected project `phanthienquoc's Project` (ref `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, project status `ACTIVE_HEALTHY`); this is the previously documented shared/live project, not an approved non-production target. No Supabase branch was created and no migration, schema/data write, reset, rebase, merge or function deployment was attempted. Official Supabase [Branching documentation](https://supabase.com/docs/guides/deployment/branching) warns that a connected GitHub integration can deploy on commits pushed to its branch and that merging into the main project runs deployment steps including pending migration application. The current `Supabase Preview` check is `skipped` because this Git branch is not associated with a Supabase Branch. Since the connected project's repo mapping and main-push integration target remain unverified, keep this PR open even though it changes only documentation; do not merge until the deployment target/behavior is verified safe.
- **Acceptance criteria:**
  - [ ] Identify the authoritative source/revision for every live auth RPC and reconcile it with repository migrations.
  - [x] Apply and verify the four existing source-required RPC contracts on the connected Supabase project; read-only catalog confirms signatures and service-role-only grants.
  - [x] Add a non-mutating readiness/contract check that fails clearly when required RPCs are absent — [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27), merged at `94341f8535a409dd2215d8f5891969f66b3a496d`.
  - [x] Record read-only live migration-ledger, function signature/ACL, table/RLS and grant evidence without reading account rows or mutating the shared project.
  - [x] Record recovery options; do not reset, merge, rebase or migrate the shared live project.
- **Historical pre-migration validation record:** PR #27 exact tested head `6c5d6ee9d524ee365a07111a7ee04aa4056548ed`; [auth-service CI #40213420324](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40213420324) passed tests, typecheck, build and container build. Read-only catalog queries on 2026-10-26 confirmed the live table columns, RLS/policy state, direct table grants and legacy function signatures/ACLs without reading account rows. At that pre-migration checkpoint, the source/live RPC mismatch was confirmed. The Supabase App check on PR #40 merge failed with `Remote migration versions not found in local migrations directory`; the non-persistent branch reported `MIGRATIONS_FAILED`. No migration had been applied at that earlier checkpoint.
- **Dependencies:** Matching source migration and TypeScript contract test are part of this PR. Remote-only migration provenance, account-status schema, audit persistence, and the server-issued MFA challenge are separate tasks.
- **Risk:** Critical — refresh rotation, MFA recovery-code operations and passkey challenge consumption may fail if source and live schema diverge. Readiness now fails closed instead of falsely reporting table-only readiness.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27), [historical auth RPC migration](../../supabase/migrations/20261012000000_auth_persistence_rpcs.sql), [applied contract reconciliation migration](../../supabase/migrations/20261026030920_auth_persistence_rpc_contract_reconcile.sql).

### AUTH-SEC-002 — Restrict direct browser-role grants on auth persistence tables

- **Priority/status:** P0 / IN PR — direct browser-role table grants were revoked on the connected Supabase project via migration version `20261026032152`; exact source artifact is in this PR.
- **Evidence:** Read-only Supabase catalog inspection on 2026-10-26; `public.users`, `public.refresh_sessions`, `public.mfa_recovery_codes`, `public.auth_passkey_credentials`, `public.auth_passkey_challenges`, `public.auth_keycloak_identities`; [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).
- **Current behavior (post-migration):** The migration ledger lists `20261026032152 revoke_browser_auth_table_privileges`. A read-only `has_table_privilege` query confirms `anon` and `authenticated` now have no SELECT/INSERT/UPDATE/DELETE/TRUNCATE rights on `users`, `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_challenges`, or `auth_passkey_credentials`. `service_role` and `postgres` retain those rights on the same tables. `auth_keycloak_identities` already had no browser-role privileges. RLS remains enabled on the six Auth tables with zero policies; this migration changes grants only, not policies or rows.
- **Historical security-advisor cross-check (2026-10-26T01:05Z):** Supabase's security advisor reports 29 `rls_enabled_no_policy` findings across the connected project. Treat that as a project-wide signal, not 29 Auth tables. The six Auth tables scoped here were individually confirmed to have zero policies. Keep remediation scoped to Auth until authoritative migration provenance and an approved non-production target exist; do not modify unrelated tables.
- **Historical pre-migration ACL/advisor recheck (2026-10-26T02:06Z):** `anon` and `authenticated` also have direct `TRUNCATE` privileges on `users`, `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_challenges`, and `auth_passkey_credentials`. No browser table privileges were found for `auth_keycloak_identities`. Security advisor still reports 29 project-wide `rls_enabled_no_policy` findings. Performance advisor reports 15 unindexed foreign keys project-wide, including the passkey challenge `user_id` FK and refresh-session `replaced_by` FK; these remain observation-only and are not modified here.
- **Desired behavior:** Keep password hashes, MFA state, refresh-session hashes, recovery-code hashes, passkey public-key/counter material and Keycloak identity metadata behind the server-side service-role client or narrowly scoped RPCs; browser roles should have no direct table privileges unless a separately justified, tested policy requires them.
- **Acceptance criteria:**
  - [x] Inspect the web app and shared clients; code search found server-owned Supabase/Postgres clients and no browser-side direct calls to the legacy Auth tables.
  - [x] Verify actual grants and keep revocation scoped to the five legacy Auth tables; remote-only migration provenance for unrelated versions remains tracked in AUTH-UM-000.
  - [x] Post-apply catalog query verifies `anon`/`authenticated` lack SELECT/INSERT/UPDATE/DELETE/TRUNCATE and `service_role` retains them on the five tables. Backend login/refresh/MFA/passkey end-to-end smoke remains a separate validation step.
  - [x] Apply and track the grant-revocation migration; verify table privileges read-only after apply. RLS policy state was rechecked and intentionally not changed; the RPC EXECUTE ACLs remain service_role-only from migration `20261026030920`.
- **Validation (post-apply, 2026-10-26T03:21:59Z):** `list_migrations` returned `20261026032152 revoke_browser_auth_table_privileges`; `has_table_privilege` is false for anon/authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE on all five legacy Auth tables and remains true for service_role/postgres. No account rows were read or modified. Security advisor still reports 29 project-wide `rls_enabled_no_policy` findings, including the six Auth tables; the migration intentionally did not create broad RLS policies.
- **Dependencies:** AUTH-UM-000's RPC contract migration is applied and tracked; backend consumers continue using server-side roles. Full login/refresh/MFA/passkey integration smoke remains outstanding.
- **Risk:** Medium — direct browser-role privileges are removed while server-role privileges remain; validate all supported backend consumers before enabling lifecycle mutations.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [grant-revocation migration](../../supabase/migrations/20261026032152_revoke_browser_auth_table_privileges.sql), [RPC contract migration](../../supabase/migrations/20261026030920_auth_persistence_rpc_contract_reconcile.sql).

- **Privilege semantics:** Supabase's [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) distinguishes object grants from row policies; PostgreSQL's [row-security documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) notes row security does not apply to operations such as TRUNCATE. The scoped browser-role revocation has now been applied and verified. Keep future privilege/policy changes scoped to the specific Auth tables and validate them from catalog metadata; do not mass-change unrelated shared-project tables.

### AUTH-SEC-003 — Login, refresh and passkey failure-contract regression tests

- **Priority/status:** P1 / MERGED — PR #52 merged at `aae24d8adb793ee9ec3201fd5c98c77fb3cf1cbd` from exact head `92b19d78bc3da04b9e1747f30f4df7c897d75b2c`.
- **Evidence:** `test/auth-flow-security.spec.ts`; exact-head [auth-service CI #40264453765](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40264453765) passed. The Supabase Preview check was skipped because no Supabase branch was associated; it was not a database integration pass.
- **Current behavior:** Regression coverage for normalized login, withholding sessions/tokens/cookies before MFA, refresh rotation and error-cookie clearing, logout revocation, and passkey failure paths is merged on current `master`.
- **Desired behavior:** Keep these failure/credential-delivery contracts regression-tested without real Supabase calls or account-row access.
- **Acceptance criteria:**
  - [x] Cover normalized login and keep refresh token out of JSON.
  - [x] Assert invalid credentials and MFA-pending login do not create a refresh session, issue a JWT or set a cookie.
  - [x] Assert refresh rotation returns access token only, and token reuse/persistence errors clear the HttpOnly refresh cookie.
  - [x] Assert logout revokes the hashed token and clears the cookie.
  - [x] Assert unknown passkey and missing challenge fail before credential update or session issuance.
  - [x] Run the suite with all service CI steps on the exact PR head.
- **Validation:** Exact-head service CI run #40264453765 passed. PR #10 remains open and unchanged (last updated 2026-10-14; separate JWT/cookie contract coverage); it was not merged or modified because it is not part of the agent-authorized work.
- **Dependencies:** Existing RPC contract reconciliation is merged. This task does not resolve the separate server-issued MFA first-factor challenge tracked by AUTH-SEC-001, nor does it claim live DB integration coverage.
- **Risk:** Low — test-only runtime scope, in-memory mocks, no database mutation.
- **Links:** [roadmap](../user-management-roadmap.md), [PR #52](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/52), [legacy PR #10](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/10).

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

- **Priority/status:** P1 / MERGED — PR #54 merged at `533fd4f6809c187759231d109fe7ac05239271c9` from exact head `e74500d2609364fcf30fb3c2ad598b3ab4613d55`.
- **Evidence:** Live ledger versions `20261026035340 auth_admin_audit_events` and `20261026035431 auth_admin_audit_rpc_only_access`; post-apply `list_migrations`, `to_regclass`, `to_regprocedure`, `pg_proc` ACL and `has_table_privilege` checks. `auth_record_admin_audit_event` is `SECURITY DEFINER` with fixed `search_path=pg_catalog, public, pg_temp`; EXECUTE is limited to `service_role` and owner `postgres`.
- **Current behavior:** The server-side append path and typed writer are merged. The table is RLS-enabled with no policies and no direct privileges for `anon`, `authenticated`, or `service_role`; the validated RPC is the application write path. User Management routes remain GET-only.
- **Desired behavior:** Append-only audit events for eventual successful/denied/failed legacy-admin operations, with safe allowlisted metadata and no secrets. Keep Keycloak identities separate.
- **Acceptance criteria:**
  - [x] Create a constrained audit table with safe role/status fields and chronology indexes.
  - [x] Expose validated writes through a SECURITY DEFINER RPC with fixed search_path and service_role-only EXECUTE.
  - [x] Revoke direct table privileges from PUBLIC/anon/authenticated/service_role; preserve postgres owner access.
  - [x] Add a typed writer that forwards only allowlisted metadata and normalizes DB errors.
  - [x] Unit tests verify secret-like extra fields are not forwarded and RPC/transport errors are normalized.
  - [x] Exact-head service CI and post-merge service CI passed.
  - [ ] Add non-production end-to-end integration coverage for audit success/failure and consistency with eventual mutations.
  - [ ] Prove audit writes are atomic with each eventual mutation before creating mutation routes.
- **Validation:** Exact-head CI [#40266935252](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40266935252) and post-merge CI [#40267173209](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40267173209) passed. Supabase Preview was skipped because no branch was associated and preview-branch creation is disabled; this is not non-production integration evidence. No account rows were read or changed by this run.
- **Dependencies:** AUTH-OPS-002 migration-history reconciliation; AUTH-UM-002 remains blocked until status schema, suspension enforcement, authorization/concurrency checks and atomic audit behavior are implemented and tested.
- **Risk:** High — audit records must not be forgeable or contain secrets. The application role cannot write/read the table directly and has only EXECUTE on the validated RPC.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [audit schema/RPC migration](../../supabase/migrations/20261026035340_auth_admin_audit_events.sql), [RPC-only grants migration](../../supabase/migrations/20261026035431_auth_admin_audit_rpc_only_access.sql), [PR #54](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/54).

### AUTH-UM-002 — Legacy account lifecycle API (UM-2)

- **Priority/status:** P1 / IN PROGRESS — UM-2A suspension enforcement remains source-only on PR #59; UM-2B audit-atomic role/status/session RPCs and guarded API routes are isolated on branch [feat/auth-um-2-lifecycle-api-20261026](https://github.com/phanthienquoc/phanthienquoc-authentication/tree/feat/auth-um-2-lifecycle-api-20261026). Neither migration has been applied. The only Supabase branch is default/base and must be treated as production-equivalent until a safe non-production target is confirmed.
- **Evidence:** `src/users/users-management.controller.ts`, `src/users/users-management.service.ts`, `src/auth/auth.repository.ts`, `src/auth/auth.service.ts`, `src/auth/mfa.service.ts`, `src/auth/passkey.service.ts`, live `public.users` catalog and PR #54 audit persistence.
- **Current live behavior:** On master, `public.users` has `id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted,created_at,updated_at`; no status/suspension column exists. Login, refresh, MFA and passkey paths therefore have no live status gate. PR #59 adds the status migration and code gates but does not apply them. The UM-2B branch adds role/status/session mutation endpoints only on an isolated, unmerged branch; no mutation is deployed.
- **UM-2A/UM-2B atomicity:** Session creation, refresh rotation, MFA challenge creation and recovery-code operations lock the user before session/challenge rows. UM-2B lifecycle RPCs acquire the shared advisory lock, then lock actor and target users before refresh-session rows; suspension, repeated suspension and reactivation revoke stale sessions and persist audit in the same transaction. This is source-reviewed; live SQL concurrency validation remains blocked.
- **Desired behavior:** Audited role change within policy, reversible suspension/reactivation, and revoke-all-sessions for legacy NestJS accounts only.
- **Acceptance criteria:**
  - Every mutation is protected by current database-backed admin authorization and an audit record.
  - Prevent self-role-change, self-escalation and last-active-admin lockout, including concurrent requests.
  - Suspension and revocation semantics are atomic/idempotent and documented.
  - Never hard-delete by default; Keycloak identities remain separate and read-only.
  - Do not add mutation routes until schema, audit persistence and authorization/concurrency tests pass.
  - [x] Keep mutation routes off master; the UM-2B routes exist only on the isolated, unmerged lifecycle branch.
- **Validation:** UM-2A code head `45e964a65e36cba304836237779632ada3ac8fa8` passed Auth service CI [#40274597989](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40274597989). UM-2B lifecycle code head `aeed2451c5f56fbfa8010139bc4583383cc8daee` is included in [PR #60](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/60); run [#40276030472](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40276030472) passed on that code head and docs-only head `58872d7a3d1b8a2f3b53fbe7e0c99d3b4ef4a5e1` passed [#40276222884](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40276222884). Supabase Preview is skipped, not live database validation. No migration was applied. Do not merge until a safe non-production target is confirmed and migration-history drift is reconciled.
- **UM-2A live-contract review (2026-10-26 12:31 +07):** Read-only catalog confirms `public.users.status` is absent and `refresh_sessions.ip` is `inet`; `pg_cast` has no `text`→`inet` cast. The branch migration now uses balanced `$$` function delimiters and `nullif(p_ip, '')::inet`, with a focused static contract test. `AuthRepository.updateMfa` now predicates on `status = 'ACTIVE'`; the branch AdminGuard denies suspended admins. Live schema remains unchanged, and migration `20261026053000` is not in the remote ledger. Keep PR #59 stacked on PR #55 and open until the exact Supabase target is confirmed safe non-production and migration history is reconciled.
- **Dependencies:** AUTH-UM-000, AUTH-UM-001A, AUTH-UM-001B, AUTH-SEC-001, and safe release workflow handling under AUTH-OPS-001; explicit non-production target confirmation.
- **Risk:** Critical — unsafe mutations can lock out administrators or leave compromised sessions active.
- **Links:** [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18), [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-002B — Audit-atomic legacy account lifecycle mutations

- **Priority/status:** P1 / IN PR #60 — audit-atomic role/status/session RPCs and guarded API routes on [feat/auth-um-2-lifecycle-api-20261026](https://github.com/phanthienquoc/phanthienquoc-authentication/tree/feat/auth-um-2-lifecycle-api-20261026). PR #60 is stacked on PR #59; neither migration has been applied. The only Supabase branch is default/base and must be treated as production-equivalent until a safe non-production target is confirmed.
- **Evidence:** src/users/users-management.controller.ts, src/users/users-management.service.ts, src/users/admin.guard.ts, src/users/admin-audit.service.ts, migration 20261026035340_auth_admin_audit_events.sql, live read-only catalog/ACL checks, and web/src/app/admin/users/page.tsx plus web/src/services/auth-api.ts. The existing UI calls the backend API and does not query Supabase directly.
- **Current behavior:** master still has guarded GET-only user list/detail and no mutation controls. PR #60 adds PATCH role/status and POST revoke-sessions routes behind AdminGuard and service-only RPCs, plus status projection/filtering and confirmation-based role/status/session controls in the admin UI. The browser calls only the NestJS API; no Supabase client is added to the UI. These changes are source-only and remain unmerged; the browser test mocks Auth/admin API responses and is not database integration evidence.
- **Desired behavior:** Active database-backed administrators can change legacy account roles, suspend/reactivate accounts, and revoke all refresh sessions. Every mutation is one transaction with an allowlisted audit event; suspension and session revocation are atomic.
- **Acceptance criteria:**
  - [x] Require an active ADMIN actor in AdminGuard and independently inside each RPC.
  - [x] Prevent self-role changes and self-suspension; serialize lifecycle mutations with a shared advisory lock and protect the last active administrator.
  - [x] Revoke all active refresh sessions in the same transaction as suspension; repeated suspension and reactivation also clear stale sessions, and reactivation does not restore sessions.
  - [x] Make audit persistence atomic; an audit failure rolls back the mutation.
  - [x] Restrict RPC EXECUTE to service_role; use fixed search_path and allowlisted response fields.
  - [x] Keep signup fixed to USER, hard-delete absent, and Keycloak identities separate; mutation controls call only the protected NestJS API and remain off master until this stack is safe to merge.
  - [x] Add controller/service and static migration-contract tests for routes, authorization, last-admin protection, audit, grants and secret redaction.
  - [x] Add browser regression coverage that Escape cannot dismiss the lifecycle confirmation while the mocked privileged mutation is in flight; exact-head CI remains pending.
  - [x] Audit authenticated non-admin/suspended access denials with allowlisted metadata only; do not log bearer tokens or unverified identities.
  - [x] Recheck exact-head Auth service CI after the additional deny-by-default assertions; code head aeed2451c5f56fbfa8010139bc4583383cc8daee passed run #40276030472 and docs-only head 58872d7a3d1b8a2f3b53fbe7e0c99d3b4ef4a5e1 passed run #40276222884.
  - [ ] Validate SQL/RPC behavior on an explicitly approved non-production Supabase target.
  - [ ] Merge only after all required checks pass and the pre-merge side-effect gate is cleared.
- **Validation:** Earlier Auth service CI [#40276030472](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40276030472) passed on code head `aeed2451c5f56fbfa8010139bc4583383cc8daee`; docs-only head `58872d7a3d1b8a2f3b53fbe7e0c99d3b4ef4a5e1` passed [#40276222884](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40276222884). Latest source/test head `4485e8448d6bb5579881b5a8e93d389136f47f2d` adds a ref-backed guard that prevents Escape from dismissing the dialog while a privileged mutation is in flight, plus a delayed mocked-response browser assertion. Connected GitHub run/status queries show no workflow run or combined status for that latest code head; exact-head web/service CI is not yet verified and earlier passes do not cover this change. Supabase Preview is skipped and live SQL/RPC validation remains blocked; no migration or database mutation was performed.
- **Dependencies:** AUTH-UM-000, AUTH-UM-001A, AUTH-UM-001B, AUTH-SEC-001, AUTH-UM-002A, AUTH-OPS-002.
- **Risk:** Critical — role escalation, administrator lockout, active sessions after suspension, or unaudited privilege changes.
- **Links:** [PR #60](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/60), [Roadmap](../user-management-roadmap.md), [UM-2A branch](https://github.com/phanthienquoc/phanthienquoc-authentication/tree/feat/auth-um-2-suspension-enforcement-20261026).

### AUTH-UM-003 — Protected admin users UI (UM-3)

- **Priority/status:** P2 / PARTIALLY DONE — the read-only directory, contract tests, and keyboard/focus/responsive browser verification are merged (PR #47 / AUTH-UM-003D). PR #60 adds confirmation-based mutation controls and mocked-API browser coverage only on its unmerged stack, including a regression for Escape during an in-flight mutation. Latest code head `4485e8448d6bb5579881b5a8e93d389136f47f2d` has no visible workflow run/status yet; UM-4 live integration remains blocked.
- **Evidence:** `web/src/app/admin/users/page.tsx`, `web/src/services/auth-api.ts`, `web/src/features/auth/auth-store.ts`, `web/scripts/admin-user-query.mjs`, `web/scripts/admin-user-query.test.mjs`, `web/scripts/admin-user-contract.test.mjs`.
- **Current behavior:** PR #19 provides the read-only `/admin/users` directory with search, role filter, pagination and detail panel. PR #24 extracts the query builder and adds dependency-free contract tests for query encoding, NestJS-only API access, Bearer auth, role gate, response allowlist, read-only controls, loading/empty/error states, dialog labels and explicit aliases. Master remains read-only. The stacked PR #60 branch adds confirmation-based role/status/session controls behind the corresponding protected NestJS routes; browser calls remain API-only, and the test harness uses mocked responses.
- **Desired behavior:** A responsive, accessible admin workflow for supported account lifecycle actions, with the NestJS API authoritative and schema/audit/concurrency gates satisfied before the feature reaches master.
- **Acceptance criteria:**
  - No direct browser-to-Supabase access or sensitive fields in the UI.
  - Loading/empty/error states, keyboard-accessible confirmation dialogs and clear provider labels.
  - On master, mutation controls remain absent until matching protected API routes, authorization/audit/concurrency tests, and the required schema are safely integrated; PR #60 controls must use the protected NestJS API only.
  - The confirmation dialog remains open while a privileged mutation is pending; Escape is ignored until the request settles.
  - UI role checks remain supplementary; server-side authorization is authoritative.
- **Validation:** PR #24 merged at `52864661b10bdd35feedb3266040700033d05238` from exact tested head `19e4d3b04b75cff5d38e70b6d01aa920a3eb1e02`. [Auth-web CI #40212531075](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531075) passed `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and the frontend container build. [Auth-service CI #40212531176](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531176) passed backend tests, typecheck, build and container build. Post-merge runs #40212871633 and #40212871603 passed. The Supabase Preview app check on the subsequent PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` failed with `Remote migration versions not found in local migrations directory`; the PR #24 merge check itself was skipped because no Supabase branch was associated. This is tracked under AUTH-UM-000 and no migration was applied.
- **Remaining:** Browser-level verification for the merged read-only dialog is complete in AUTH-UM-003D. PR #60 adds separate mutation-confirmation coverage using mocked APIs only; live non-production integration remains blocked. The earlier cross-origin `/_next/hmr` harness issue and development-origin fix are recorded in AUTH-UM-003D.
- **Dependencies:** AUTH-UM-002B for mutation controls; AUTH-UM-000/AUTH-UM-001B for safe backend lifecycle operations.
- **Risk:** Medium — UI/API contract mismatch can break workflows, but must not weaken server authorization.
- **Links:** [PR #19](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/19), [PR #24](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/24), [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18).


### AUTH-UM-003A — Keyboard-accessible read-only user detail dialog

- **Priority/status:** P2 / DONE — merged PR #29 at `c3745d755af470dbfb4e3c27afac6d564264b90b`; later browser-level verification is complete in PR #47 / AUTH-UM-003D.
- **Evidence:** web/src/app/admin/users/page.tsx, web/scripts/admin-user-contract.test.mjs.
- **Current behavior:** The merged read-only detail dialog uses accessible semantics, initial focus, Tab/Shift+Tab containment, Escape dismissal, focus restoration, and viewport-bounded scrolling; browser-level behavior is verified by AUTH-UM-003D.
- **Desired behavior:** Opening the panel focuses its close control; Tab/Shift+Tab remain inside the modal dialog; Escape closes it; closing restores focus to the originating account row.
- **Acceptance criteria:**
  - Keep this subtask scoped to the read-only detail dialog; mutation controls are tracked separately under AUTH-UM-002B and must call the protected NestJS API.
  - Use accessible dialog semantics and keyboard dismissal.
  - Keep focus inside the open dialog and restore focus to the trigger after close.
  - Add regression coverage for the keyboard/focus contract without adding an unapproved test dependency.
- **Validation:** Exact tested head `b37238b21cc6ba9bc03113854b28554b5c15a24d`: [auth-web CI #40214171528](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40214171528) passed `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and frontend container build; [auth-service CI #40214171499](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40214171499) passed `npm test`, `npm run typecheck`, `npm run build` and container build. The PR diff was reviewed; no server/auth/data-access changes. PR #29 itself supplied source-level contract tests; later PR #47 supplies the browser-level interaction proof recorded under AUTH-UM-003D.
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

- **Priority/status:** P1 / IN PR #55 — server-issued challenge code/tests are on the dedicated branch. Code/test head `1c15f82eabe639d177f2c6a135414b484593b099` passed auth-service and auth-web CI; this docs commit changes the head, so final exact-head checks must pass again. Merge is blocked until the connected Supabase target is explicitly confirmed non-production and safe.
- **Evidence:** `src/auth/auth.controller.ts`, `src/auth/dto/mfa-login.dto.ts`, `src/auth/auth.service.ts`, `src/auth/passkey.service.ts`, `src/auth/auth.repository.ts`, web auth store/API, migration `20261026040431`, and focused tests in `test/auth-mfa-challenge.spec.ts`, `test/auth-mfa-challenge.repository.spec.ts`, `test/passkey-mfa-challenge.spec.ts`, `test/auth-flow-security.spec.ts` and `test/auth.repository.ready.spec.ts`.
- **Current behavior (master before this PR):** Registered MFA completion accepts `userId + code`; password/passkey return `mfaRequired + userId`. Browser-supplied identity could select the MFA target account without a server-issued challenge.
- **Current behavior (PR #55):** Password and passkey first-factor success share `AuthService.beginMfaLogin()`, issuing a cryptographically random 32-byte base64url challenge token and storing only its SHA-256 hash with a 300-second TTL. TOTP completion validates then atomically consumes the challenge; recovery uses one RPC transaction to consume both challenge and recovery code. Five failed attempts lock the challenge. Web state holds the raw token only in memory and sends `challengeToken`, never `userId`. The unregistered duplicate MFA controller was removed.
- **Desired behavior:** One-time, short-lived server challenge bound to the correct legacy account and successful password/passkey first factor; bounded attempts and replay protection shared across TOTP and recovery.
- **Acceptance criteria:**
  - [x] Completion DTOs do not accept `userId`; a prior server-validated first factor is required.
  - [x] Challenge token is cryptographically random, expires in 5 minutes, only its SHA-256 hash is stored, and raw token is held in memory only.
  - [x] Password and passkey MFA share the same challenge issuance contract.
  - [x] TOTP challenge consumption is atomic and one-time; recovery code + challenge are consumed in one database transaction.
  - [x] SQL RPC enforces five failed attempts; missing/expired/replayed and cross-account consume mismatches fail closed.
  - [x] New table has RLS enabled, no direct table grants (including service_role), and five SECURITY DEFINER RPCs have fixed search_path and EXECUTE only for service_role/owner postgres.
  - [x] Remove the unregistered duplicate `MfaController`.
  - [x] Add controller, RPC-adapter, passkey-parity, concurrent-replay, recovery-atomicity and cross-account mismatch tests.
  - [ ] Final exact-head service/web CI must pass after this docs update.
  - [ ] Verify gateway-level request-rate limiting separately before rollout.
  - [ ] Verify five-attempt lockout, challenge expiry and recovery transaction against an explicitly approved non-production target; no live mutating RPC was executed by this run.
- **Validation:** The code/test head passed auth-service CI [#40268423566](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40268423566) and auth-web CI [#40268423514](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40268423514), plus push service CI [#40268418023](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40268418023). This docs-only commit triggers a fresh exact-head run. Supabase Preview is skipped because no Supabase branch is associated and preview-branch creation is disabled. This run performed no migration apply, branch operation, schema/data mutation or live challenge/recovery RPC call.
- **Dependencies:** AUTH-UM-000 RPC contract migration is merged. UM-2 must still enforce status across login, refresh, MFA and passkey once an approved status schema exists. Do not add mutation endpoints until authorization/audit/concurrency tests pass.
- **Risk:** High — MFA is a security boundary. The challenge token is opaque, one-time and short-lived; integration/rate-limit validation remains gated.
- **Links:** [Issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), [PR #55](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/55), [Roadmap](../user-management-roadmap.md), [MFA challenge migration](../../supabase/migrations/20261026040431_auth_server_issued_mfa_login_challenges.sql).

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

- **Priority/status:** P2 / DONE — [PR #47](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/47) squash-merged at `3af07f3749d970fe4ee084a953168c7f1ddd5975` from exact tested head `03ee8265bbcdbe7bca1f50b101c07530b672fab1`; stale [PR #45](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/45) is closed.
- **Evidence:** `web/next.config.ts`, `web/scripts/admin-user-dialog.browser.test.mjs`, `web/src/app/admin/users/page.tsx`.
- **Current behavior:** The browser harness allows only `127.0.0.1` as a Next.js development origin. The read-only user dialog is height-bounded with internal scrolling; the real Chromium test mocks Auth API calls and removes Supabase/database environment variables from the spawned server.
- **Desired behavior:** Preserve responsive/accessibility behavior without introducing browser-to-Supabase access or mutation endpoints.
- **Acceptance criteria:**
  - [x] Browser test runs under `npm test` with Chromium and no Supabase/service-role credentials.
  - [x] Verify 390×844 portrait, 844×390 landscape and 1280×800 desktop; landscape content stays internally scrollable.
  - [x] Verify focus management, Escape dismissal/restoration and that a non-admin never requests the admin directory API.
  - [x] Mock only local `/auth/*` and `/api/admin/users*` calls; diagnostics record method/path only, without query strings or credentials.
  - [x] Rendered UI does not expose password hashes, MFA secrets, refresh tokens, recovery codes or private passkey material.
- **Validation:** Exact tested head `03ee8265bbcdbe7bca1f50b101c07530b672fab1`; auth-web CI [run #40260229780](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40260229780) passed (10/10 browser tests), auth-service CI [run #40260229779](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40260229779) passed, and post-merge auth-web [run #40260404454](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40260404454) and auth-service [run #40260404468](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40260404468) passed on merge SHA `3af07f3749d970fe4ee084a953168c7f1ddd5975`. The Supabase Preview migration-history issue is tracked separately in AUTH-OPS-002.
- **Dependencies:** Existing read-only UM-3 UI; no schema, audit or mutation endpoint dependency.
- **Risk:** Low/medium for the UI slice; no production host is allowlisted and no real Auth/Supabase browser request is made.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #47](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/47).

## Release evidence and guardrails

- PR #18's merge triggered [auth-service-release run #40209889836](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40209889836), which completed image publication and a promotion request. This is not independent proof of production rollout/health; no platform-infra inspection or rollback was performed.
- The user has not authorized production deployment/migration/live account mutation. Treat any workflow that can publish/promote/deploy as a separate side effect, not as implied by PR auto-merge authorization.
