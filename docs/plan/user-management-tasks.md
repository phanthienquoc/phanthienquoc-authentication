# Authentication — User Management Task Queue

**Last audited:** 2026-10-26 16:35 +07:00  
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



## Latest read-only audit — 2026-10-26 16:35 +07:00

- This checkpoint supersedes the 16:13 snapshot for current environment classification and log state; earlier checkpoints remain historical. The owner explicitly reclassified the shared Supabase project as **non-production** at `2026-10-26T09:22:30Z`, superseding the earlier private-production label.
- Read-only `get_project/list_branches/list_migrations/list_tables(verbose=true)` still identifies project `gtqovpusfyyvxpeezxlo` in organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, API status `ACTIVE_HEALTHY`; only branch is default non-persistent `main` / Git `master`, branch status `MIGRATIONS_FAILED`. Runtime logs nevertheless continue to tag PostgREST errors `env=prod`; treat this as an unresolved environment-label/integration-boundary mismatch before any operation that could trigger migration or deployment.
- The 77-entry ledger includes status enforcement `20261026080831` and lifecycle RPCs `20261026084506`. Live `public.users.status` remains text NOT NULL DEFAULT `ACTIVE`; the three lifecycle RPCs return JSONB, are `SECURITY DEFINER`, use fixed `search_path=pg_catalog, public, pg_temp`, and allow EXECUTE only to `service_role`/owner `postgres`. Lifecycle source is tracked on master via PR #64, but exact applied-SQL parity and original apply actor remain unverified.
- Bounded logs from `2026-10-26T09:13:00Z` to `09:33:00Z`: 20 PostgREST timeout-manager events tagged `env=prod`, path `/`, first `09:13:58.088234Z`, latest `09:30:57.908872Z`; three `workflow_run_logs` errors state `Remote migration versions not found in local migrations directory.` at `09:25:23.600887Z`, `09:29:38.981545Z`, and `09:31:43.678930Z`. The events show ongoing symptoms but do not identify the actor or conclusively prove the exact trigger.
- Security Advisor observed `2026-10-26T09:32:52.781Z`: 34 RLS-enabled/no-policy findings, one SECURITY DEFINER view, eight mutable-search-path functions, 43 anon and 43 authenticated GraphQL-exposure findings, and leaked-password protection disabled. Performance Advisor: 15 unindexed foreign keys, one no-primary-key finding, 137 unused indexes. These are project-wide; do not remediate unrelated TCE/Keycloak objects in Auth tasks.
- No Supabase branch was created, no migration/DDL/function/config change was made, no lifecycle RPC was invoked, no account rows/raw secrets were read, and no application release or trading action occurred. Current instructions require separate authorization for any migration operation; no migration was applied during this audit. Keep live integration blocked until the env-label discrepancy, migration provenance and GitHub integration/deploy behavior are reconciled.
## Latest read-only audit — 2026-10-26 16:13 +07:00

- This checkpoint supersedes the 15:48 snapshot below for current state; older checkpoints remain historical evidence. Only the two authorized repositories were inspected.
- Authentication UM-2B is now merged through [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), merge SHA `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`. The lifecycle source is now on `master` at `supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql`. Exact tested PR head `38a9fe36be7c52a2892c53714027ff1a223035f3` passed Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614) and Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540). PR #60 is closed/superseded; do not continue describing UM-2B source/API/UI as unmerged.
- Supabase read-only discovery: sole listed project ref `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, project API status `ACTIVE_HEALTHY`. Its only branch is default `main` / Git `master`, non-persistent, with branch status `MIGRATIONS_FAILED`. The owner explicitly reclassified this shared project as non-production at 2026-10-26T09:22:30Z, superseding the earlier private-production label; runtime logs still tag errors env=prod and the branch remains MIGRATIONS_FAILED. Runtime URL-to-ref and GitHub integration/deploy-toggle mapping are not exposed by repository config/secret metadata.
- The remote ledger has 77 entries; the latest Auth entries include `20261026080831 auth_user_status_enforcement` and `20261026084506 auth_admin_user_lifecycle_rpcs`. Live `public.users.status` is text NOT NULL DEFAULT `ACTIVE`; lifecycle RPCs return JSONB, are `SECURITY DEFINER`, use fixed `search_path=pg_catalog, public, pg_temp`, and allow EXECUTE to `service_role` plus owner `postgres` only. `anon` and `authenticated` cannot execute them. Browser roles cannot SELECT the scoped Auth tables; the audit table also denies direct `service_role` SELECT by design. RLS/no-policy advisor findings are project-wide and are not a reason to add broad policies.
- New bounded log evidence for `2026-10-26T08:40:00Z`–`09:13:00Z`: `workflow_run_logs` reports `Remote migration versions not found in local migrations directory.` at `09:10:00.781Z`; PostgREST root-path timeout-manager events tagged `env=prod` continue through `09:12:56.922Z`. These establish ongoing migration-history and timeout symptoms, not their actor or a proven causal link.
- Security Advisor (observed `2026-10-26T09:13:54Z`): 34 project-wide RLS-enabled/no-policy findings, one SECURITY DEFINER view, eight mutable-search-path functions, 43 anon and 43 authenticated GraphQL-exposure findings, and leaked-password protection disabled. Performance Advisor: 15 unindexed foreign keys and 137 unused-index findings. Do not remediate unrelated shared-project objects in this Auth task.
- Historical source provenance is still unresolved: remote-only versions `20261014024759`, `20261014130516`, and `20261014131151` lack authoritative source in the two authorized repositories; Keycloak source/ledger version mismatch remains. The live lifecycle apply event tagged `env=prod` at `08:45:06Z` still has unknown actor/origin/authorization; PR #64 merging the source does not prove who applied it or establish exact applied-SQL parity.
- No Supabase branch was created, no migration/DDL/function/config change was made, no lifecycle RPC was invoked, no account rows or raw secrets were read, and no app release or trading action occurred. UM-4 and migration-bearing integration work remain blocked until an explicitly approved non-production target and integration/deploy mapping are established.
## Latest read-only checkpoint — 2026-10-26 15:48 +07:00

- The owner explicitly classified the shared project used by TCE-dashboard and phanthienquoc-authentication as private production in prior instructions on 2026-10-26. This supersedes earlier non-production labels in this queue and roadmap. Do not apply production migrations, deploy production, mutate live accounts, or use this project for lifecycle integration tests.
- Read-only Supabase discovery identifies the sole listed project as ref gtqovpusfyyvxpeezxlo, organization jopjvkofwvbnxaajkhlo, region ap-southeast-1, API status ACTIVE_HEALTHY. Its only branch is default main / Git master, non-persistent, with branch status MIGRATIONS_FAILED. No Supabase branch was created.
- Live public.users.status exists as text NOT NULL DEFAULT 'ACTIVE', with users_status_check allowing ACTIVE | SUSPENDED. Live auth_create_refresh_session(uuid,uuid,uuid,text,timestamptz,text,text) and auth_record_admin_audit_event(...) are SECURITY DEFINER with fixed search_path=pg_catalog, public, pg_temp; EXECUTE is limited to service_role and owner postgres. Browser roles cannot execute these RPCs or directly read the scoped Auth tables.
- PR #55 is merged at 7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7; the MFA challenge table/RPCs are on master and present in the live catalog. PR #60 remains open at head `78e22e7f8ee2d9430a01451e3f7995bcbef2ec25`, based on the closed PR #59 branch rather than master. Fresh `list_migrations` now includes `20261026084506 auth_admin_user_lifecycle_rpcs`; catalog confirms `auth_admin_update_user_role(uuid,uuid,text,text,text)`, `auth_admin_update_user_status(uuid,uuid,text,text,text)`, and `auth_admin_revoke_user_sessions(uuid,uuid,text,text)` all return `jsonb`, are `SECURITY DEFINER`, use fixed `search_path=pg_catalog, public, pg_temp`, and grant EXECUTE to `service_role`/owner `postgres` only. This supersedes the earlier 15:22 observation that they were absent. The separate timeout mitigation is in [PR #63](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/63), exact head `98c2a9cefbaddf6700a4bc3f02a18bcf72130b0f`, with Auth Service CI passing; merge remains gated.
- PR #60 exact head `78e22e7f8ee2d9430a01451e3f7995bcbef2ec25` passed Auth Service CI [#40295682382](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40295682382); Supabase Preview is skipped, not migration/integration evidence. GitHub/Supabase tools do not expose the connected repository or deploy-to-production toggle; Auth .env.example is a placeholder and the runtime secret value is hidden.
- Security Advisor: 34 project-wide rls_enabled_no_policy findings, including the seven scoped Auth tables with no policies; do not add broad policies because browser-role grants are absent. It also flags Supabase Auth leaked-password protection as disabled (HaveIBeenPwned compromised-password check off); no setting was changed. The sole security_definer_view finding is public.tce_stock_event_market_metrics in TCE-dashboard, and all eight mutable-search-path function findings are TCE/Keycloak functions; no unrelated schema was changed. Performance Advisor: 15 project-wide unindexed foreign keys, including auth_passkey_challenges.user_id and refresh_sessions.replaced_by; 137 unused indexes include recently added Auth indexes, which must not be dropped without usage evidence.
- No account rows/raw secrets were read and this automation did not apply a migration, create/reset/merge a Supabase branch, execute a lifecycle RPC, deploy an app/function, or place a trading order. However, logs in the bounded window contain a management-API SQL application event tagged `env=prod` at `2026-10-26T08:45:06Z`, matching migration `20261026084506`; the actor/origin and authorization are not established. Treat as an unexpected production mutation and reconcile before any merge.

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

- **Priority/status:** P0 / BLOCKED — the owner-designated non-production project still has a default branch marked `MIGRATIONS_FAILED`, runtime logs tagged `env=prod`, repeated migration-executor errors, and an unverified GitHub integration/deploy target. The current task instruction requires separate authorization for any migration operation.
- **Evidence:** Read-only `list_projects/get_project/list_branches` identifies project `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`; API status is `ACTIVE_HEALTHY`, while its only default non-persistent `main` / Git `master` branch reports `MIGRATIONS_FAILED`. The owner explicitly reclassified the project as non-production at `2026-10-26T09:22:30Z`, superseding the prior private-production label. Runtime log attributes still say `env=prod`; resolve the operational boundary rather than choosing one signal silently.
- **Current behavior (read-only 2026-10-26 16:35 +07):** The 77-entry remote ledger includes status enforcement `20261026080831 auth_user_status_enforcement` and lifecycle `20261026084506 auth_admin_user_lifecycle_rpcs`. Live `public.users.status` is text NOT NULL DEFAULT `ACTIVE`; the three lifecycle RPCs return JSONB, are `SECURITY DEFINER`, use fixed `search_path=pg_catalog, public, pg_temp`, and grant EXECUTE only to `service_role`/owner `postgres`. Lifecycle source is on master via PR #64, but exact applied-SQL parity and original apply actor remain unknown. Bounded logs show 20 `env=prod` PostgREST root-path timeout events between `09:13:58Z` and `09:30:57Z`, plus three `Remote migration versions not found in local migrations directory.` errors at `09:25:23.600887Z`, `09:29:38.981545Z`, and `09:31:43.678930Z`.
- **Desired behavior:** Keep live schema, exact source migration versions, RPC signatures/ACLs and TypeScript call sites synchronized without guessing; confirm effective runtime environment and integration target before any operation that can trigger a migration.
- **Acceptance criteria:**
  - [x] Identify the sole listed project/branch and record the owner's latest non-production classification.
  - [x] Inspect verbose public table schema, migration ledger, RPC signatures/ACLs, scoped grants/RLS, advisors and bounded logs without reading account rows.
  - [x] Confirm lifecycle source is on master at the exact ledger version through PR #64.
  - [ ] Reconcile the `env=prod` runtime label with the owner-designated non-production environment.
  - [ ] Establish authoritative provenance/authorization for the lifecycle apply and compare exact applied SQL with source.
  - [ ] Recover authoritative source for remote-only versions `20261014024759`, `20261014130516`, and `20261014131151`; do not reconstruct from names/catalog state.
  - [ ] Reconcile the Keycloak source/ledger version mismatch without rewriting applied history.
  - [ ] Verify the actual Supabase GitHub repository and deploy-to-production setting through an authorized configuration surface.
  - [ ] Obtain separate authorization for any specific migration operation; do not create a billable Supabase branch without cost quote and explicit approval.
- **Validation:** PR #64 exact tested head `38a9fe36be7c52a2892c53714027ff1a223035f3` passed Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614) and Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540). Supabase Preview remains skipped and is not schema/migration/integration validation. Security Advisor reports 34 RLS-enabled/no-policy findings, one SECURITY DEFINER view, eight mutable-search-path functions, 43 anon and 43 authenticated GraphQL-exposure findings, and leaked-password protection disabled; Performance Advisor reports 15 unindexed foreign keys, one no-primary-key finding and 137 unused indexes. No migration, branch operation, account mutation, function deployment, release or trading action occurred.
- **Dependencies:** AUTH-UM-000 provenance, verified environment/integration configuration, explicit migration authorization and safe non-production integration tests.
- **Risk:** Critical — the owner-designated environment and runtime `env=prod` logs disagree, migration history is failing, and default-branch changes may invoke an unknown integration.
- **Links:** [Roadmap](../user-management-roadmap.md), [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), [Supabase branching docs](https://supabase.com/docs/guides/deployment/branching), [Supabase GitHub integration docs](https://supabase.com/docs/guides/deployment/branching/github-integration).

### AUTH-OPS-003 — Reconcile unexpected env=prod lifecycle migration application

- **Priority/status:** P0 / BLOCKED — the owner-designated non-production project has an unexplained lifecycle SQL application event tagged `env=prod`.
- **Evidence:** Project ref `gtqovpusfyyvxpeezxlo`; ledger version `20261026084506 auth_admin_user_lifecycle_rpcs`; live catalog confirms three lifecycle RPC signatures, fixed search path and EXECUTE only for `service_role`/owner `postgres`. The bounded log records the application event at `2026-10-26T08:45:06.114Z`; actor, origin and authorization are unknown. PR #64 later merged the source migration into master at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`.
- **Current behavior:** Source is now tracked at `supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql` on master, but merging source does not establish who applied the SQL or prove exact parity with the original payload. The project is owner-designated non-production, yet the runtime log tag says `env=prod`; the default branch still reports `MIGRATIONS_FAILED`, with repeated remote-version errors through `2026-10-26T09:31:43.678930Z`. Do not invoke lifecycle RPCs, replay the migration, or make additional schema changes without separate authorization for that exact operation.
- **Desired behavior:** Establish authoritative change provenance/authorization, compare live routine definitions with tracked source, reconcile environment labels and migration history, and verify the integration target without further mutation.
- **Acceptance criteria:**
  - [x] Record ledger version, live signatures/ACLs and bounded log evidence without reading account rows or secrets.
  - [x] Ensure migration source is present on master at the exact ledger version via PR #64.
  - [ ] Reconcile owner environment classification with runtime `env=prod` tagging.
  - [ ] Establish who/what initiated the original apply and whether it was authorized.
  - [ ] Complete exact SQL/source parity review without replaying DDL.
  - [ ] Confirm connected GitHub integration/deploy behavior from an authorized configuration surface.
- **Validation:** Read-only project/branch/migration/table discovery, catalog/ACL SQL, advisors and bounded logs. No migration, RPC invocation, account mutation or deployment was performed by this run.
- **Dependencies:** AUTH-OPS-002, authoritative integration configuration and migration provenance.
- **Risk:** Critical — an unexplained environment-tagged schema change and repeated remote migration errors may conceal source/live drift.
- **Links:** [Roadmap](../user-management-roadmap.md), [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), [Supabase deployment/branching docs](https://supabase.com/docs/guides/deployment).

### AUTH-OPS-004 — Investigate PostgREST root-path timeout burst

- **Priority/status:** P1 / MITIGATION IMPLEMENTED IN PR #63; merge remains blocked until the environment-label and migration-integration gate is reconciled.
- **Evidence:** Source inspection confirms `GET /auth/status` and `GET /ready` both call `AuthRepository.ready()`; readiness probes Auth tables and fetches the PostgREST `/rest/v1/` OpenAPI document. In the bounded window `2026-10-26T09:13:00Z`–`09:32:00Z`, read-only logs contain 20 timeout-manager events tagged `env=prod`, path `/`, first at `09:13:58.088234Z`, latest at `09:30:57.908872Z`. These events do not establish one-to-one request correlation or prove root cause.
- **Current behavior:** PR #63 caches successful OpenAPI path discovery for five minutes, coalesces concurrent requests and does not cache failures; per-request table probes remain. Its exact head `98c2a9cefbaddf6700a4bc3f02a18bcf72130b0f` passed both Auth Service CI runs [#40296248881](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296248881) and [#40296256113](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296256113). The owner-designated non-production project still emits `env=prod` timeout logs, so the effective runtime boundary and post-release impact are unresolved.
- **Desired behavior:** Reproduce safely on a confirmed non-production runtime, correlate request volume/call sites with logs, and reduce unnecessary root OpenAPI requests only if targeted tests demonstrate the cause.
- **Acceptance criteria:**
  - [x] Record bounded log evidence and inspect readiness implementation.
  - [x] Confirm source call sites; actual traffic frequency and causal relationship remain unknown.
  - [x] Add a low-risk cache mitigation with expiry, concurrent coalescing and retry-after-failure tests in PR #63.
  - [ ] Reconcile `env=prod` runtime tagging with owner environment classification.
  - [ ] Reproduce on a confirmed non-production runtime and recheck log rate after a safely authorized release.
- **Validation:** Exact-head Auth Service tests/typecheck/build/container build passed on PR #63. Supabase Preview is skipped; no live integration test or production traffic generation was run.
- **Dependencies:** AUTH-OPS-002 and verified runtime environment.
- **Risk:** Medium/high — recurring metadata endpoint timeouts may affect readiness; root cause is not proven.
- **Links:** [PR #63](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/63), [Supabase deployment docs](https://supabase.com/docs/guides/deployment), [Auth repository](https://github.com/phanthienquoc/phanthienquoc-authentication).

### AUTH-UM-000 — Reconcile auth RPC and migration provenance (UM-0)

- **Priority/status:** P0 / PARTIALLY RECONCILED — live core/MFA/audit/status/lifecycle RPCs and their scoped server-only grants are confirmed; three remote-only migration versions and the Keycloak version mismatch remain unresolved. The shared target is private production.
- **Evidence:** Read-only Supabase catalog, migration ledger and privilege checks; `src/auth/auth.repository.ts`, `src/auth/passkey.repository.ts`, `src/db/supabase.client.ts`, and tracked migrations under `supabase/migrations/`.
- **Current live contract (2026-10-26 16:13 +07):** The 77-entry ledger includes `20261026030920 auth_persistence_rpc_contract_reconcile`, `20261026032152 revoke_browser_auth_table_privileges`, `20261026035340 auth_admin_audit_events`, `20261026035431 auth_admin_audit_rpc_only_access`, `20261026040431 auth_server_issued_mfa_login_challenges`, `20261026080831 auth_user_status_enforcement`, and `20261026084506 auth_admin_user_lifecycle_rpcs`. Live catalog confirms `auth_replace_mfa_recovery_codes(uuid,text[])`, `auth_consume_mfa_recovery_code(uuid,text)`, `auth_consume_passkey_challenge(text,text)`, `auth_rotate_refresh_session(text,uuid,text,timestamptz,text,text)`, the five MFA login challenge RPCs, `auth_record_admin_audit_event`, `auth_create_refresh_session`, and the three lifecycle RPCs. The inspected newer routines are `SECURITY DEFINER`, use fixed `search_path=pg_catalog, public, pg_temp`, and grant EXECUTE to `service_role`/owner `postgres` only; browser roles cannot execute them. Live `public.users.status` is text NOT NULL DEFAULT `ACTIVE` with ACTIVE/SUSPENDED constraint. Lifecycle source is now on master via PR #64; exact original applied-SQL parity and original apply actor are not established.
- **Historical provenance still unresolved:** Remote versions `20261014024759 restrict_auth_rpc_execution`, `20261014130516 keycloak_runtime_schema`, and `20261014131151 keycloak_runtime_login_role` have no authoritative source files in the two authorized repositories. Keycloak identity persistence is recorded remotely as `20261020234922`, while the checked-in source uses a different version. Do not reconstruct migration contents from names/catalog state or rewrite applied history.
- **Desired behavior:** Keep applied RPC signatures, server-only grants, minimal response projections and source migrations synchronized with TypeScript call sites; preserve Keycloak identities as separate/read-only until a least-privilege Admin API adapter is approved.
- **Acceptance criteria:**
  - [x] Record live table schema, RPC signatures/ACLs, RLS/grants and migration ledger without reading account rows.
  - [x] Add non-mutating readiness/contract checks for required RPC paths.
  - [x] Track the lifecycle source at the ledger version through PR #64.
  - [ ] Recover authoritative source/revision for the three remote-only migration versions.
  - [ ] Reconcile the Keycloak migration-version mismatch without synthesizing SQL.
  - [ ] Verify exact applied SQL for the lifecycle routines and determine original apply provenance.
- **Validation:** Read-only schema/catalog/ACL queries, migration ledger, Security/Performance Advisors and bounded logs. The log stream also shows `Remote migration versions not found in local migrations directory.` at `2026-10-26T09:10:00.781Z`. No migration, reset, rebase, branch operation, account-row read/write or function deployment was performed.
- **Dependencies:** Authoritative migration provenance, AUTH-OPS-002 integration mapping and approved non-production integration environment.
- **Risk:** Critical — source/live drift can break refresh, MFA/passkey and lifecycle behavior; guessed migration history could cause destructive or unintended production changes.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), [applied contract reconciliation migration](../../supabase/migrations/20261026030920_auth_persistence_rpc_contract_reconcile.sql).

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

- **Priority/status:** P1 / BLOCKED — Supabase Auth leaked-password protection remains disabled; no production setting change was authorized or performed.
- **Evidence:** The Security Advisor at `2026-10-26T09:13:54Z` still reports `auth_leaked_password_protection` disabled and recommends the HaveIBeenPwned.org compromised-password check. The owner classifies the shared target as private production; the only listed branch is non-persistent `main` / Git `master` with `MIGRATIONS_FAILED`, and no separate non-production project is available through the connected project list.
- **Current behavior:** Supabase Auth may accept compromised passwords because the leaked-password protection feature is off. This is a dashboard/Auth configuration finding, not a database migration. Other project-wide advisor findings (TCE security-definer view and TCE/Keycloak mutable-search-path functions) remain outside this task.
- **Desired behavior:** Validate signup/password-change/reset compatibility in a separate safe non-production environment, then enable leaked-password protection only after explicit authorization for that exact production configuration change.
- **Acceptance criteria:**
  - [x] Capture the advisor finding without changing settings or reading account data.
  - [ ] Confirm a separate non-production Auth environment and expected password-policy behavior.
  - [ ] Obtain explicit authorization for the exact production setting change; this task does not grant that authorization.
  - [ ] After an approved change, verify the setting and run signup/password-change/reset regression tests.
- **Validation:** Read-only Security Advisor result; no Supabase setting, schema, data, branch, function or deployment was changed.
- **Dependencies:** AUTH-OPS-002 environment/integration mapping, separate non-production target, and explicit owner authorization for any production setting change.
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

- **Priority/status:** P0 / MERGED — UM-2A status/suspension enforcement and UM-2B audit-atomic role/status/session-revocation API/UI are merged; live non-production integration remains blocked under AUTH-UM-004/AUTH-OPS-002.
- **Evidence:** UM-2A PR #61 merged at `c88c4ad8f5e248a6a1da30ddc381da32a3c0097a`. UM-2B [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64) merged at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec` from exact tested head `38a9fe36be7c52a2892c53714027ff1a223035f3`. Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614) and Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540) passed. The lifecycle migration source is on master at the remote ledger version `20261026084506`.
- **Current behavior:** `public.users.status` is text NOT NULL DEFAULT `ACTIVE` with ACTIVE/SUSPENDED constraint. Password login, session creation, refresh, MFA completion/recovery, passkey registration/authentication/management, `/auth/me`, and the database-backed AdminGuard enforce active status. Lifecycle routes use the existing NestJS service-role client, database-backed current-ADMIN authorization and signed recent-MFA assurance; SQL RPCs use shared advisory locking, protect against self-change and last-active-admin lockout, revoke persisted refresh sessions when required, write audit events atomically, and return allowlisted user fields. No hard-delete route, public admin bootstrap, browser-to-Supabase access, or Keycloak mutation was added.
- **Session-revocation boundary:** `auth_admin_revoke_user_sessions` updates only `public.refresh_sessions`. Auth access JWTs are stateless, default to a 900-second TTL, and have no `jti` denylist in this repository. A consumer that validates only signature/expiry may continue accepting an already-issued access token until it expires; `/auth/me` and the database-backed AdminGuard do re-check current user/status, but downstream consumer behavior depends on its integration contract. Do not describe refresh-session revocation as immediate global access-token invalidation.
- **Desired behavior:** Preserve reversible suspension/reactivation and session revocation through server-authorized, audited operations; never allow self-escalation or last-admin lockout; keep legacy NestJS accounts separate from Keycloak identities.
- **Acceptance criteria:**
  - [x] Signup remains fixed to USER; no public admin bootstrap exists.
  - [x] Enforce suspension across password login, refresh/session creation, MFA/recovery, passkey and `/auth/me` paths.
  - [x] Merge protected role/status/session-revocation routes, recent-MFA guard, confirmation-based UI and atomic audit RPCs.
  - [x] Document that the RPC revokes persisted refresh sessions while already-issued access JWTs remain stateless until expiry for consumers that do not introspect.
  - [ ] Confirm whether the default 900-second access-token window after refresh-session revocation is acceptable; if immediate invalidation is required, design a separate token-version/denylist contract and test it only on an approved non-production target.
  - [x] Include allowlist, self-change, last-admin, audit-atomicity, controller, MFA-assurance and browser contract tests.
  - [ ] Verify exact applied SQL/source parity and original apply provenance under AUTH-OPS-003.
  - [ ] Run live authorization, recent-MFA, last-admin concurrency, session-revocation and audit-atomicity integration tests against a separately approved non-production target.
- **Validation:** Exact-head Auth Service and Auth Web CI passed on PR #64; the migration source is tracked on master at `supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql`. Read-only catalog confirms the three lifecycle RPC signatures and service-role/owner-only EXECUTE. Supabase Preview is skipped and no live lifecycle RPC was invoked by this run. Production-tagged migration provenance remains unresolved.
- **Dependencies:** AUTH-UM-000 provenance, AUTH-OPS-001 manual-only release gate, AUTH-OPS-002 safe integration mapping, and AUTH-OPS-003 source/apply provenance.
- **Risk:** High — privileged account changes affect authorization and sessions; source CI does not substitute for live integration validation.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), [status migration](../../supabase/migrations/20261026080831_auth_user_status_enforcement.sql), [lifecycle migration](../../supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql).

### AUTH-UM-003 — Protected admin users UI (UM-3)

- **Priority/status:** P2 / MERGED — the read-only directory, accessible browser dialog and confirmation-based lifecycle controls are merged. Live non-production integration remains blocked separately under AUTH-UM-004.
- **Evidence:** `web/src/app/admin/users/page.tsx`, `web/src/services/auth-api.ts`, `web/src/features/auth/auth-store.ts`, `web/scripts/admin-user-contract.test.mjs`, `web/scripts/admin-user-dialog.browser.test.mjs`; lifecycle API/UI is included in [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64).
- **Current behavior:** The admin directory supports search, role filter, pagination and details. PR #64 adds confirmation-based role/status/session-revocation controls through the NestJS API only; it does not create a direct browser-to-Supabase client. API routes remain protected by server-side AdminGuard and recent signed MFA assurance; UI role checks are supplementary.
- **Desired behavior:** Preserve responsive, accessible admin workflows while server authorization, recent-MFA and audit behavior remain authoritative.
- **Acceptance criteria:**
  - [x] No direct browser-to-Supabase access or sensitive fields in the UI.
  - [x] Loading/empty/error states, keyboard-accessible confirmation dialogs and clear provider labels.
  - [x] Lifecycle controls call only matching protected NestJS API routes and require confirmation.
  - [x] UI role checks remain supplementary; server-side authorization is authoritative.
  - [x] Browser tests cover focus, Escape dismissal/restoration, responsive scrolling and non-admin denial with mocked APIs.
  - [ ] Complete end-to-end lifecycle integration against a separately approved non-production target.
- **Validation:** PR #47 browser verification merged at `3af07f3749d970fe4ee084a953168c7f1ddd5975`; exact-head Auth Web CI passed 10/10 browser tests. PR #64 exact tested head `38a9fe36be7c52a2892c53714027ff1a223035f3` passed Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540) and Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614). Supabase Preview is skipped; no live integration test is implied.
- **Dependencies:** Merged AUTH-UM-001A/001B/002 server routes and audit contract; non-production lifecycle integration remains AUTH-UM-004.
- **Risk:** High — UI visibility is not authorization; server-side guards and atomic audit are required.
- **Links:** [PR #47](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/47), [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

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

- **Priority/status:** P1 / BLOCKED — only the owner's private-production Supabase project is connected; a separate approved non-production target and verified integration/deploy mapping are unavailable.
- **Evidence:** `.github/workflows/ci.yml`, `.github/workflows/web-ci.yml`, `README.md`, `docs/production-runtime-secrets.md`, `supabase/migrations/`, read-only Supabase project/branch/catalog/log/advisor evidence from 2026-10-26.
- **Current behavior:** UM-2B source/API/UI is merged through PR #64; Auth Service and Auth Web CI passed on exact tested head `38a9fe36be7c52a2892c53714027ff1a223035f3`. Live catalog shows lifecycle RPCs with server-only grants, but exact original apply provenance/source parity remains unresolved. Supabase Preview is skipped, the only branch reports `MIGRATIONS_FAILED`, and logs include `Remote migration versions not found in local migrations directory.` at `2026-10-26T09:10:00.781Z`. Source CI does not prove live audit atomicity, cookie/gateway forwarding or lifecycle behavior.
- **Desired behavior:** Evidence-backed non-production integration proof and an explicit rollout decision separate from code merges.
- **Acceptance criteria:**
  - [x] Backend and web tests/typecheck/lint/build pass on the merged lifecycle PR's exact tested head.
  - [x] Inspect live schema/RPC signatures and server-only grants without reading account rows.
  - [ ] Verify migration provenance and the connected GitHub integration/deploy setting.
  - [ ] Use a separately approved non-production target for lifecycle authorization, audit, session, MFA/passkey and cookie/gateway integration tests.
  - [ ] Verify audit redaction, CORS/cookies/CSRF/rate limits and gateway routing without exposing secrets.
  - [ ] Confirm the downstream access-token revocation contract: refresh-session revocation alone does not invalidate stateless JWTs before their 900-second default expiry for consumers that do not introspect.
  - [x] Keep this task read-only for production; no migration, account mutation, function deployment or release is performed.
- **Validation:** Exact-head Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614) and Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540) passed on PR #64. Supabase Preview is skipped and is not integration evidence.
- **Dependencies:** AUTH-UM-000 through AUTH-UM-003, AUTH-OPS-001 through AUTH-OPS-003, a verified integration target and explicit authorization for any production change.
- **Risk:** Critical if source-only CI is mistaken for rollout readiness.
- **Links:** [Roadmap](../user-management-roadmap.md), [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

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
