# Authentication — User Management Task Queue

**Last audited:** 2026-10-26 15:22 +07:00  
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

## Latest owner-confirmed checkpoint — 2026-10-26 15:22 +07:00

- The owner explicitly classified the shared project used by TCE-dashboard and phanthienquoc-authentication as private production in prior instructions on 2026-10-26. This supersedes earlier non-production labels in this queue and roadmap. Do not apply production migrations, deploy production, mutate live accounts, or use this project for lifecycle integration tests.
- Read-only Supabase discovery identifies the sole listed project as ref gtqovpusfyyvxpeezxlo, organization jopjvkofwvbnxaajkhlo, region ap-southeast-1, API status ACTIVE_HEALTHY. Its only branch is default main / Git master, non-persistent, with branch status MIGRATIONS_FAILED. No Supabase branch was created.
- Live public.users.status exists as text NOT NULL DEFAULT 'ACTIVE', with users_status_check allowing ACTIVE | SUSPENDED. Live auth_create_refresh_session(uuid,uuid,uuid,text,timestamptz,text,text) and auth_record_admin_audit_event(...) are SECURITY DEFINER with fixed search_path=pg_catalog, public, pg_temp; EXECUTE is limited to service_role and owner postgres. Browser roles cannot execute these RPCs or directly read the scoped Auth tables.
- PR #55 is merged at 7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7; the MFA challenge table/RPCs are on master and present in the live catalog. PR #60 remains open at 657caeea7c901291252219cdc09b8bd9048d40f7; its lifecycle migration 20261026054000_auth_admin_user_lifecycle_rpcs.sql is absent from the live ledger, and its base is the closed/unmerged PR #59 branch rather than master.
- PR #60 validate passed, but Supabase Preview is skipped, not a migration/integration pass. GitHub/Supabase tools do not expose the connected repository or deploy-to-production toggle; Auth .env.example is a placeholder and the runtime secret value is hidden.
- Security Advisor: 34 project-wide rls_enabled_no_policy findings, including the seven scoped Auth tables with no policies; do not add broad policies because browser-role grants are absent. It also flags Supabase Auth leaked-password protection as disabled (HaveIBeenPwned compromised-password check off); no setting was changed. The sole security_definer_view finding is public.tce_stock_event_market_metrics in TCE-dashboard, and all eight mutable-search-path function findings are TCE/Keycloak functions; no unrelated schema was changed. Performance Advisor: 15 project-wide unindexed foreign keys, including auth_passkey_challenges.user_id and refresh_sessions.replaced_by; 137 unused indexes include recently added Auth indexes, which must not be dropped without usage evidence.
- No account rows/raw secrets were read, no migration was applied, no Supabase branch was created/reset/merged, no lifecycle RPC was executed, and no production release/trading action occurred.

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

- **Priority/status:** P0 / BLOCKED for migration-bearing merges and live integration tests — the shared target is private production; migration provenance and the GitHub integration/deploy-to-production setting remain unresolved.
- **Evidence:** Supabase list_projects/get_project/list_branches identifies project gtqovpusfyyvxpeezxlo in ap-southeast-1; project API status is ACTIVE_HEALTHY, but the only branch is default non-persistent main / Git master with MIGRATIONS_FAILED. The owner explicitly classified this shared project as private production. Auth .env.example uses a placeholder URL; TCE stores the URL in hidden GitHub secrets, so runtime URL-to-ref and connected GitHub repository/deploy-toggle mapping are not independently visible.
- **Current behavior:** The remote ledger includes 20261026030920 auth_persistence_rpc_contract_reconcile, 20261026032152 revoke_browser_auth_table_privileges, 20261026035340 auth_admin_audit_events, 20261026035431 auth_admin_audit_rpc_only_access, 20261026040431 auth_server_issued_mfa_login_challenges, and 20261026080831 auth_user_status_enforcement. Live public.users.status is text NOT NULL DEFAULT 'ACTIVE' with users_status_check; auth_create_refresh_session and auth_record_admin_audit_event are fixed-search-path SECURITY DEFINER RPCs with server-role-only EXECUTE. The proposed lifecycle RPCs auth_admin_update_user_role, auth_admin_update_user_status, and auth_admin_revoke_user_sessions are absent from the live catalog and the PR #60 migration version 20261026054000 is absent from the ledger.
- **Desired behavior:** Keep live schema, source migration versions, RPC signatures/ACLs and application call sites synchronized without guessing. Production remains read-only for this task; any future migration must target a separately approved non-production project/branch and must not rely on a skipped Preview check.
- **Acceptance criteria:**
  - [x] Identify the sole listed project and branch metadata; classify the target using the owner's explicit private-production statement.
  - [x] Inspect verbose Auth table schema, migration ledger, RPC signatures/privileges, RLS/grants, security/performance advisors and a bounded SQLSTATE log aggregate without reading account rows.
  - [x] Confirm the live status column and server-only session/audit RPCs; confirm lifecycle RPCs are not yet live.
  - [ ] Recover authoritative source for remote-only migration versions 20261014024759, 20261014130516, and 20261014131151; do not reconstruct from names/catalog state.
  - [ ] Reconcile the Keycloak source/ledger version mismatch (20261014000000 source vs 20261020234922 remote ledger) without rewriting applied history.
  - [ ] Verify the actual Supabase GitHub repository and deploy-to-production setting through an authorized configuration surface.
  - [ ] Use a separate explicitly approved non-production integration target; do not create a billable Supabase branch without cost quote and explicit approval.
- **Validation:** Current exact-head PR #60 checks show validate=success, Supabase Preview=skipped. Security Advisor reports 34 project-wide RLS-enabled/no-policy findings; Performance Advisor reports 15 project-wide unindexed foreign keys. The selected 24-hour SQLSTATE query returned no rows; historical 42P01 evidence predates the RPC reconciliation. No migration, branch operation, account mutation, function deployment, production release or trading action occurred in this run.
- **Dependencies:** AUTH-UM-000 source provenance, safe non-production target, verified integration/deploy settings, exact-head tests and security review.
- **Risk:** Critical — default-branch pushes may invoke a connected Supabase integration; migration history is drifted and the target is private production.
- **Links:** [Roadmap](../user-management-roadmap.md), [PR #60](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/60), [Supabase branching docs](https://supabase.com/docs/guides/deployment/branching), [Supabase GitHub integration docs](https://supabase.com/docs/guides/deployment/branching/github-integration).

### AUTH-UM-000 — Reconcile auth RPC and migration provenance (UM-0)

- **Priority/status:** P0 / PARTIALLY RECONCILED — live core RPCs, audit/MFA challenge RPCs, public.users.status, and auth_create_refresh_session are present and server-role-only; three remote-only migration versions and a Keycloak version mismatch remain unresolved. The shared target is private production.
- **Evidence:** Read-only live catalog findings in `docs/user-management-roadmap.md`; `src/auth/auth.repository.ts`; `src/auth/passkey.repository.ts`; `src/db/supabase.client.ts`; `supabase/migrations/20261012000000_auth_persistence_rpcs.sql`.
- **Current behavior (current live contract):** Supabase catalog confirms auth_replace_mfa_recovery_codes(uuid,text[]) RETURNS void, auth_consume_mfa_recovery_code(uuid,text) RETURNS boolean, auth_consume_passkey_challenge(text,text) RETURNS jsonb, auth_rotate_refresh_session(text,uuid,text,timestamptz,text,text) RETURNS jsonb, five MFA challenge RPCs, auth_record_admin_audit_event, and auth_create_refresh_session. Inspected newer Auth RPCs are SECURITY DEFINER with fixed search_path=pg_catalog, public, pg_temp; EXECUTE is limited to service_role/owner postgres. Live public.users.status exists with ACTIVE/SUSPENDED constraint. Lifecycle mutation RPCs proposed in PR #60 are absent. The historical source migration 20261012000000_auth_persistence_rpcs.sql is not a ledger entry; do not infer or replay history from its filename.
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
- **Dependencies:** Matching source migration and TypeScript contract test for the reconciled core RPCs are on master;
- **Risk:** Critical — refresh rotation, MFA recovery-code operations and passkey challenge consumption may fail if source and live schema diverge. Readiness now fails closed instead of falsely reporting table-only readiness.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27), [historical auth RPC migration](../../supabase/migrations/20261012000000_auth_persistence_rpcs.sql), [applied contract reconciliation migration](../../supabase/migrations/20261026030920_auth_persistence_rpc_contract_reconcile.sql).

### AUTH-SEC-002 — Restrict direct browser-role grants on auth persistence tables

- **Priority/status:** P0 / MERGED — PR #51 squash-merged at `07c2d93f680970c85810cba1682f7121f08405cf`; migration `20261026032152_revoke_browser_auth_table_privileges.sql` is tracked on `master` and post-apply browser-role privileges were verified read-only.
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
- **Validation (post-apply, 2026-10-26; latest advisor at 04:30Z):** `list_migrations` returned `20261026032152 revoke_browser_auth_table_privileges`; `has_table_privilege` is false for anon/authenticated SELECT/INSERT/UPDATE/DELETE/TRUNCATE on all five legacy Auth tables and remains true for service_role/postgres. No account rows were read or modified. The latest security advisor reports 34 project-wide `rls_enabled_no_policy` findings across schemas; this is not an Auth-only count. The migration intentionally did not create broad RLS policies.
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

### AUTH-SEC-004 — Review leaked-password protection setting

- **Priority/status:** P1 / OPEN — Supabase Auth leaked-password protection is currently disabled; no production setting change was authorized or performed.
- **Evidence:** The connected project's Security Advisor reports auth_leaked_password_protection disabled and recommends the HaveIBeenPwned.org compromised-password check. The owner classified the shared target as private production; the only listed branch is non-persistent main / Git master with MIGRATIONS_FAILED, and no separate non-production project is available through the connected project list.
- **Current behavior:** Supabase Auth does not currently block compromised passwords using the leaked-password protection feature. This is a dashboard/auth configuration finding, not a database migration. The project-wide advisor's other findings include a security-definer view in TCE-dashboard and mutable-search-path functions in TCE/Keycloak; those remain outside this Auth setting task.
- **Desired behavior:** Decide the setting deliberately, validate signup/password-change/reset compatibility in a separate safe non-production environment, and enable leaked-password protection only after the owner explicitly authorizes the exact production configuration change.
- **Acceptance criteria:**
  - [x] Capture the advisor finding without changing settings or reading account data.
  - [ ] Confirm a separate non-production Auth environment and the expected password-policy behavior.
  - [ ] Obtain explicit authorization for the exact production setting change; this task does not grant that authorization.
  - [ ] After approved change, verify the setting and run signup/password-change/reset regression tests.
- **Validation:** Read-only Security Advisor result; no Supabase setting, schema, data, branch, function or deployment was changed.
- **Dependencies:** AUTH-OPS-002 environment/integration mapping; separate non-production target; explicit owner authorization for any production setting change.
- **Risk:** Compromised passwords may be accepted; enabling protection may affect signup/password-change/reset flows and must be tested.
- **Links:** [Supabase password security documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [Roadmap](../user-management-roadmap.md).

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
- **Dependencies:** AUTH-OPS-002 migration-history reconciliation; AUTH-UM-002 remains blocked until lifecycle authorization/concurrency/atomic-audit checks and a separate non-production integration target are available.
- **Risk:** High — audit records must not be forgeable or contain secrets. The application role cannot write/read the table directly and has only EXECUTE on the validated RPC.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [audit schema/RPC migration](../../supabase/migrations/20261026035340_auth_admin_audit_events.sql), [RPC-only grants migration](../../supabase/migrations/20261026035431_auth_admin_audit_rpc_only_access.sql), [PR #54](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/54).

### AUTH-UM-002 — Legacy account lifecycle API (UM-2)

- **Priority/status:** P1 / IN PROGRESS; UM-2A schema/enforcement source is present on master, while UM-2B lifecycle mutations remain BLOCKED in PR #60.
- **Evidence:** Live ledger records 20261026080831 auth_user_status_enforcement; current master contains the matching source migration and status-aware auth call sites. PR #60 head is 657caeea7c901291252219cdc09b8bd9048d40f7; its validate check passed and Supabase Preview was skipped. PR #60 targets feat/auth-um-2-suspension-enforcement-20261026, the closed/unmerged PR #59 branch, not master.
- **Current behavior:** Live public.users.status is text NOT NULL DEFAULT 'ACTIVE' with a check constraint allowing only ACTIVE | SUSPENDED. Current auth source checks status during password login, session creation, refresh, MFA completion/recovery, passkey registration/authentication/management, /auth/me, and the server-side AdminGuard. Live auth_create_refresh_session locks/checks the user status; anonymous/authenticated roles cannot execute it. The live catalog does not contain auth_admin_update_user_role, auth_admin_update_user_status, or auth_admin_revoke_user_sessions; PR #60's migration 20261026054000_auth_admin_user_lifecycle_rpcs.sql is source-only and absent from the live ledger.
- **Desired behavior:** Add role change, reversible suspension/reactivation, and revoke-all-sessions through audit-atomic server-only RPCs, requiring a currently active database ADMIN and MFA verified within 300 seconds. Prevent self-escalation/self-suspension and last-active-admin lockout; audit privileged success/failure without secrets; keep Keycloak identities separate/read-only; no hard delete.
- **Acceptance criteria:**
  - [x] Signup remains fixed to USER; no public admin bootstrap exists.
  - [x] Status is checked across supported authentication paths and session creation is guarded by a database status check.
  - [x] Current master keeps the admin directory read-only and does not expose mutation controls.
  - [ ] Rebase the lifecycle slice onto current master after its dependency chain is clean; do not merge the current PR #60 stack as-is.
  - [ ] Confirm a separate non-production Supabase target and its integration/deploy settings; do not use the private production project for integration tests.
  - [ ] Run live authorization, recent-MFA, last-admin concurrency, session-revocation and audit-atomicity tests against that non-production target.
  - [ ] Only after those gates pass, merge a migration-bearing PR with all required checks green; do not apply the lifecycle migration to production.
- **Validation:** PR #60 unit/type/build validation passes on its current head, but this is source/mock/static-contract evidence only. The lifecycle RPCs are absent from live catalog; Preview is skipped. Read-only SQL confirmed server-only grants for existing RPCs, no browser table privileges on scoped Auth tables, and no direct service-role table SELECT on the audit/MFA-challenge tables. No live mutation RPC, account row, migration apply, production deploy or trading action was performed.
- **Dependencies:** AUTH-UM-000, AUTH-UM-001A, AUTH-UM-001B, merged AUTH-SEC-001 MFA challenge, AUTH-OPS-001 manual-only release gate, and a separate safe non-production target.
- **Risk:** Critical — lifecycle migration is unapplied, target is private production, PR base is a closed/unmerged branch, and a default-branch push may invoke an unverified Supabase GitHub integration.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #60](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/60), [UM-2A source migration](../../supabase/migrations/20261026080831_auth_user_status_enforcement.sql), [lifecycle migration source](../../supabase/migrations/20261026054000_auth_admin_user_lifecycle_rpcs.sql).

### AUTH-UM-003 — Protected admin users UI (UM-3)

- **Priority/status:** P2 / PARTIALLY DONE — the read-only directory, API contract tests and browser-level dialog/focus/responsive checks are merged (PR #47); privileged mutation flows remain blocked until UM-2 protected API, authorization, concurrency and audit gates pass.
- **Evidence:** `web/src/app/admin/users/page.tsx`, `web/src/services/auth-api.ts`, `web/src/features/auth/auth-store.ts`, `web/scripts/admin-user-query.mjs`, `web/scripts/admin-user-query.test.mjs`, `web/scripts/admin-user-contract.test.mjs`.
- **Current behavior:** PR #19 provides the read-only `/admin/users` directory with search, role filter, pagination and detail panel. PR #24 extracts the query builder and adds dependency-free contract tests for query encoding, NestJS-only API access, Bearer auth, role gate, response allowlist, read-only controls, loading/empty/error states, dialog labels and explicit aliases. No mutation controls are exposed.
- **Desired behavior:** A responsive, accessible admin workflow for supported account lifecycle actions after the API and audit gates exist.
- **Acceptance criteria:**
  - No direct browser-to-Supabase access or sensitive fields in the UI.
  - Loading/empty/error states, keyboard-accessible confirmation dialogs and clear provider labels.
  - Mutation controls are not shown until matching protected API routes and tests exist.
  - UI role checks remain supplementary; server-side authorization is authoritative.
- **Validation:** PR #24 merged at `52864661b10bdd35feedb3266040700033d05238` from exact tested head `19e4d3b04b75cff5d38e70b6d01aa920a3eb1e02`. [Auth-web CI #40212531075](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531075) passed `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and the frontend container build. [Auth-service CI #40212531176](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531176) passed backend tests, typecheck, build and container build. Post-merge runs #40212871633 and #40212871603 passed. The Supabase Preview app check on the subsequent PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` failed with `Remote migration versions not found in local migrations directory`; the PR #24 merge check itself was skipped because no Supabase branch was associated. This is tracked under AUTH-UM-000 and no migration was applied.
- **Remaining:** Browser-level dialog verification and responsive regression coverage are complete in AUTH-UM-003D below. Mutation UI remains intentionally absent until AUTH-UM-002 protected API and authorization/concurrency/audit gates pass.- **Dependencies:** AUTH-UM-002 for mutation controls; AUTH-UM-000/AUTH-UM-001B for safe backend lifecycle operations.
- **Risk:** Medium — UI/API contract mismatch can break workflows, but must not weaken server authorization.
- **Links:** [PR #19](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/19), [PR #24](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/24), [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18).


### AUTH-UM-003A — Keyboard-accessible read-only user detail dialog

- **Priority/status:** P2 / DONE — source behavior and browser verification are covered by merged PR #29 and follow-up PR #47 (`3af07f3749d970fe4ee084a953168c7f1ddd5975`); focus, Escape dismissal/restoration, viewport scrolling and non-admin denial were verified with mocked API responses.
- **Evidence:** web/src/app/admin/users/page.tsx, web/scripts/admin-user-contract.test.mjs.
- **Current behavior:** PR #47 browser coverage verifies initial focus, focus restoration, Escape dismissal, accessible scrolling and non-admin API denial; all Auth API responses are mocked and the route remains read-only.
- **Desired behavior:** Opening the panel focuses its close control; Tab/Shift+Tab remain inside the modal dialog; Escape closes it; closing restores focus to the originating account row.
- **Acceptance criteria:**
  - [x] Preserve the read-only directory and current API contract; no mutation UI.
  - [x] Use accessible dialog semantics and keyboard dismissal.
  - [x] Keep focus inside the open dialog and restore focus to the trigger after close.
  - [x] Add regression coverage for the keyboard/focus contract without adding an unapproved test dependency.
- **Validation:** Browser-level verification is merged in PR #47 at `3af07f3749d970fe4ee084a953168c7f1ddd5975`. Exact tested head `03ee8265bbcdbe7bca1f50b101c07530b672fab1`: [auth-web CI #40260229780](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40260229780) passed 10/10 browser tests; [auth-service CI #40260229779](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40260229779) passed. Post-merge auth-web [#40260404454](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40260404454) and auth-service [#40260404468](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40260404468) passed on the merge SHA. No server/auth/data-access changes or real account data were used.
- **Dependencies:** Existing read-only UM-3 UI; no schema or audit dependencies.
- **Risk:** Low to medium — incorrect focus cleanup could leave keyboard users outside the modal; no server authorization or data-access behavior changes.
- **Safety:** No Supabase access added to the browser, no schema changes, no production release or account mutations.

### AUTH-UM-004 — Non-production security/integration gate (UM-4)

- **Priority/status:** P1 / BLOCKED — the only connected Supabase target is the owner's private production; AUTH-UM-004 requires a separate approved non-production environment and resolved AUTH-UM-000 through AUTH-UM-003 gates.
- **Evidence:** `.github/workflows/ci.yml`, `.github/workflows/web-ci.yml`, `README.md`, `docs/production-runtime-secrets.md`, `supabase/migrations/`.
- **Current behavior:** Source-level backend/web CI passes for the merged read-only slices and PR #60 unit/type/build checks, but the live lifecycle RPCs are absent, Supabase Preview is skipped, the only listed branch reports MIGRATIONS_FAILED, and the shared target is private production. CI does not prove live RPC, audit, cookie/gateway or lifecycle behavior.
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

- **Priority/status:** P1 / MERGED — PR #55 squash-merged at 7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7; source and migration are on master.
- **Evidence:** Live ledger contains 20261026040431 auth_server_issued_mfa_login_challenges; catalog confirms the challenge table and five RPCs. Current source routes password and passkey first-factor success through AuthService.beginMfaLogin(), stores only a SHA-256 challenge-token hash with a 300-second TTL, limits failed attempts, and consumes TOTP/recovery challenges atomically.
- **Current behavior:** MFA completion accepts a server-issued opaque challenge token, not a caller-selected userId. The raw token stays in web memory; challenge/recovery persistence is RPC-only and server-role-only. PR #55 merge and CI are verified; no live challenge/recovery mutation or integration test was performed in this run.
- **Desired behavior:** Preserve one-time, short-lived challenges, replay protection, cross-account binding, bounded attempts, recovery-code atomicity and fail-closed behavior.
- **Acceptance criteria:**
  - [x] Password/passkey first-factor success issues the same server-bound challenge.
  - [x] TOTP and recovery completion consume the challenge atomically and do not expose raw tokens in logs/storage.
  - [x] Challenge RPCs use fixed search paths and server-role-only EXECUTE.
  - [ ] Verify five-attempt lockout, expiry and recovery transaction against a separate explicitly approved non-production target.
  - [ ] Verify gateway rate limiting and cookie/header forwarding without using production accounts.
- **Validation:** Exact-head Auth service/web/push CI passed before merge; the current PR #60 check is validate=success, Supabase Preview=skipped. The current target is private production; no live mutating RPC was executed.
- **Dependencies:** AUTH-UM-000 RPC contract; AUTH-UM-004 for live integration proof.
- **Risk:** High — MFA is a security boundary; source CI does not substitute for non-production integration validation.
- **Links:** [Issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), [merged PR #55](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/55), [Roadmap](../user-management-roadmap.md), [MFA challenge migration](../../supabase/migrations/20261026040431_auth_server_issued_mfa_login_challenges.sql).

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

- **Priority/status:** P2 / SUPERSEDED BY MERGED PR #47 — PR #45 is closed; the viewport-bounded scroll fix and browser assertions are present on `master` through PR #47 at `3af07f3749d970fe4ee084a953168c7f1ddd5975`. The skipped Supabase Preview check remains a separate integration limitation, not a blocker for this already-merged UI-only slice.
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
- **Validation:** PR #45 was closed as superseded; its viewport-bounded dialog fix and browser assertions are included in merged PR #47 (`3af07f3749d970fe4ee084a953168c7f1ddd5975`). The skipped Supabase Preview check is recorded under AUTH-OPS-002 and remains relevant to migration-bearing changes, not this merged UI-only slice.
- **Dependencies:** Existing read-only UM-3 UI and API contract; this merged UI-only slice has no schema/mutation dependency. The shared project is private production, so any future migration-bearing work remains blocked until a separate safe non-production target and integration settings are verified.
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
