# Authentication — User Management Task Queue

**Last audited:** 2026-10-26 (latest read-only contract recheck)
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
- **Migration authorization boundary (current instruction, 2026-10-26):** The scoped RPC-contract, Auth-table grant, MFA, status and lifecycle migrations already present in the ledger are historical operations. The current task requires separate authorization for each exact future migration/apply operation; prior broad routine-migration wording is not standing permission. Do not create a Supabase branch without `get_cost` and explicit cost approval. No resets/deletes/branch merges, live account-data mutations, function deployment, production release or unrelated schema changes are authorized. A skipped check is not a passed test.

## Historical environment checkpoints — 2026-10-26 (updated by latest owner/admin confirmation)

- **Historical status, now superseded:** Earlier runs treated environment/runtime mapping as unresolved because TCE notes used private-production wording and logs carried `env=prod`. The owner/admin's latest explicit confirmation is authoritative: project `gtqovpusfyyvxpeezxlo` is non-production and scoped Supabase actions needed by these two repositories are authorized. Preserve telemetry tags as historical/logging evidence, not environment classification. Project API `ACTIVE_HEALTHY` and branch metadata `MIGRATIONS_FAILED` remain distinct technical facts.
- Authentication PR #55 was squash-merged at 7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7; master was verified at that SHA.
- UM-2A migration was applied successfully to the owner-confirmed non-production project. The tool recorded ledger version 20261026080831 auth_user_status_enforcement; post-apply read-only catalog verification confirmed the status column/constraint, required RPC signature, fixed search_path, and service_role/owner-only EXECUTE.
- A clean dedicated UM-2A branch now starts from the merged default tree, so the PR will contain only the status-enforcement slice rather than replaying the already-merged MFA diff. Its migration source path is aligned to the actual live ledger version with SQL bytes unchanged.
- Supabase's GitHub integration repository/deploy toggle is not exposed by the connected project metadata tools. Do not claim independent API verification of that setting. No Supabase branch was created; no account rows, live lifecycle mutations, deployment or trading actions were performed.

## Historical lifecycle migration apply checkpoint — 2026-10-26 15:50 +07:00

- The user directed normal Supabase migration execution and explicitly said not to create a Supabase branch. No Supabase branch was created.
- Applied the exact SQL from the inspected Auth repository lifecycle migration. Supabase returned `success: true`; `list_migrations` now records `20261026084506 auth_admin_user_lifecycle_rpcs`.
- Read-only catalog queries verified `auth_admin_update_user_role`, `auth_admin_update_user_status`, and `auth_admin_revoke_user_sessions`: expected argument signatures and JSONB result, `SECURITY DEFINER`, fixed `search_path=pg_catalog, public, pg_temp`, EXECUTE for `service_role` plus owner `postgres`, none for `anon` or `authenticated`.
- Project metadata reports `ACTIVE_HEALTHY`; its only listed default non-persistent `main` / Git `master` branch still reports `MIGRATIONS_FAILED`. This discrepancy is recorded rather than treated as a failed lifecycle migration.
- A clean GitHub branch `feat/auth-um-2-lifecycle-clean-20261026` was created from current `master`. It ports only lifecycle code/tests, signed recent-MFA assurance, and the exact applied migration source version; it does not replay the already-merged MFA challenge or status migrations. This is a GitHub branch, not a Supabase branch.
- No account rows were read or changed; no app release/deployment, function deployment, or trading action occurred. Remaining tasks are exact-head CI/browser tests, final security diff inspection, mergeability check and pre-merge side-effect review.


## Historical UM-2B merge and Supabase evidence — 2026-10-26 16:15 +07:00

- Lifecycle API/UI PR #64 was squash-merged at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`; a compare against `master` reports identical SHA. Exact-head Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614) and Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540) passed, including browser tests. The application release workflow is manual-dispatch-only and was not dispatched.
- The scoped lifecycle migration was applied at the user's direction through the connected Supabase migration tool, which returned success; ledger version `20261026084506 auth_admin_user_lifecycle_rpcs` and function signatures/ACLs were reverified read-only. No Supabase branch was created, and no user/account rows were read or mutated.
- **Historical environment note (15:50; not standing authorization):** Auth previously recorded owner-confirmed non-production and routine scoped migration permission. The current task requires separate authorization for each exact future migration operation; TCE's queue and live `env=prod` telemetry conflict with that historical classification. Treat target/environment mapping as unresolved for new operations. Project API remains `ACTIVE_HEALTHY`; the only listed non-persistent `main` / Git `master` branch reports `MIGRATIONS_FAILED`. No Supabase branch was created.
- The bounded `env=prod` migration event at `2026-10-26T08:45:06.114Z` recorded in earlier PR #62 is consistent in time/SQL with the authorized lifecycle apply in this run. The prior text claiming this automation did not perform the apply is superseded; logs did not expose an actor identity to attribute any separate external action.
- AUTH-OPS-003 tracks this log/source/ledger reconciliation; AUTH-OPS-004 tracks 36 PostgREST root-path timeout events. PR #63 has a low-risk cache mitigation with prior exact-head CI passing, but it must be ported to current master before merge.
- Historical remote-only migrations `20261014024759`, `20261014130516`, and `20261014131151`, and the Keycloak version mismatch remain open under AUTH-OPS-002/AUTH-UM-000. No new migration source was reconstructed from names or catalog definitions.


## Read-only live contract checkpoint — 2026-10-26 16:40 +07:00

- **Project/environment:** `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, `ap-southeast-1`, PostgreSQL 17.6.1, API `ACTIVE_HEALTHY`; only listed branch is non-persistent `main` / Git `master`, ID `5132b831-8223-4dc4-8f39-707415c96f1b`, status `MIGRATIONS_FAILED`. That same ID appears in migration-executor logs. Authentication docs say owner-confirmed non-production; TCE queue has conflicting private-production wording; log attributes are tagged `env=prod`. Per the owner/admin's latest confirmation, this is the shared non-production project for controlled tests in these two repositories. Historical `env=prod` tags do not override that classification. Keep tests synthetic-only; never use real account rows. Do not create a potentially billable Supabase branch without `get_cost` and explicit cost approval.
- **Schema/grants:** `public.users.status` exists as non-null `text` default `ACTIVE`. Eight Auth tables are RLS-enabled with no policies returned; no direct `anon`/`authenticated` table grants were found. The existing server-side service-role client remains the only application DB path. `public.auth_keycloak_identities` remains a separate mapping; the operational `keycloak` schema is not a user-management mutation target.
- **Lifecycle RPC parity:** All three live lifecycle bodies match `20261026084506_auth_admin_user_lifecycle_rpcs.sql` after whitespace normalization. Signatures: `auth_admin_update_user_role(uuid,uuid,text,text,text) RETURNS jsonb`; `auth_admin_update_user_status(uuid,uuid,text,text,text) RETURNS jsonb`; `auth_admin_revoke_user_sessions(uuid,uuid,text,text) RETURNS jsonb`. All are `SECURITY DEFINER`, owner `postgres`, fixed `search_path=pg_catalog, public, pg_temp`, EXECUTE only for `service_role`/owner.
- **Application contract:** `src/auth/auth.repository.ts`, `src/users/users-management.service.ts`, and `src/users/admin-audit.service.ts` call the current refresh, MFA/passkey, lifecycle and audit RPCs using migration argument names; readiness tests list the same RPC paths. A full scan of all nine tracked Auth migration files compared the latest source definition for every current `auth_%` RPC against live `pg_get_functiondef`: 14/14 bodies match after whitespace normalization, including status/lock-order enforcement from `20261026080831_auth_user_status_enforcement.sql`. Signatures/results and server-only grants also match application call sites. The only two catalog functions without matching current source definitions are legacy `rotate_refresh_token` and `consume_recovery_code`; current application call-site search found no use of either.
- **Catalog-only legacy RPCs:** Live `public.consume_recovery_code(uuid, text) RETURNS boolean` and `public.rotate_refresh_token(text, text, timestamptz, inet, text) RETURNS TABLE(user_id uuid, role text, new_session_id uuid, reuse_detected boolean)` are `SECURITY DEFINER`, owned by `postgres`, have mutable `search_path=public`, and grant EXECUTE only to `service_role` plus owner. They are absent from the nine tracked Auth migration files and have no current application call sites in either authorized repository. Do not drop or alter them until authoritative migration provenance and external consumers are inventoried.
- **Ledger/advisors:** Ledger count 77; exact source files for remote versions `20261014024759`, `20261014130516`, `20261014131151` remain absent from both authorized repositories, and Keycloak persistence timestamp/name mismatch remains unresolved. Security advisor: 34 RLS-enabled/no-policy, 1 SECURITY DEFINER view, 8 mutable search paths, 43 anon and 43 authenticated GraphQL-exposure findings, leaked-password protection disabled. Performance advisor: 15 unindexed FKs, 1 no-primary-key table, 137 unused indexes. Counts are project-wide.
- **Logs after the cache PR merge:** `09:31–09:40Z` yielded 9 `env=prod` PostgREST path `/` timeout events through `09:39:58.262274Z` and 2 migration-executor missing-local-version errors, latest `09:35:29.544322Z`. PR #63 is merged, but release remains manual-dispatch-only; no production image was released by this run. The cache has not been validated against production traffic.
- **Validation/safety:** Current official Supabase GitHub integration, API security and RLS docs were searched. Read-only inspection only; no migration, schema/data write, branch creation/reset/merge, Edge Function deployment, release or live account/trading action occurred.

## Read-only scheduled recheck — 2026-10-26 17:00 +07:00

- **Project and branch:** Repeated `list_projects/get_project` confirms the only visible project is `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, PostgreSQL 17.6.1, API status `ACTIVE_HEALTHY`. `list_branches` still returns only default non-persistent `main` / Git `master`, status `MIGRATIONS_FAILED`; no branch was created.
- **Schema and constraints:** `list_tables(verbose=true)` plus read-only catalog SQL reconfirmed `public.users.status text NOT NULL DEFAULT 'ACTIVE'`, role check `USER | ADMIN`, and status check `ACTIVE | SUSPENDED`.
- **RPC contract/privileges:** The live catalog lists 14 current `public.auth_%` RPCs. Catalog checks reconfirmed `SECURITY DEFINER`, fixed `search_path=pg_catalog, public, pg_temp`, EXECUTE granted to `service_role` and not to `anon`/`authenticated`. Lifecycle signatures and the MFA/refresh/passkey RPC names match the tracked source and application call sites; current function bodies enforce ACTIVE status on refresh creation/rotation, MFA challenge creation/completion/recovery, and passkey challenge consumption.
- **Migration provenance:** The latest ledger entries remain `20261026084506 auth_admin_user_lifecycle_rpcs`, `20261026080831 auth_user_status_enforcement`, `20261026040431 auth_server_issued_mfa_login_challenges`, `20261026035431 auth_admin_audit_rpc_only_access`, and `20261026035340 auth_admin_audit_events`. Remote-only versions `20261014024759`, `20261014130516`, `20261014131151` and the Keycloak timestamp/name mismatch remain unresolved; no SQL was reconstructed or applied.
- **Advisors and logs:** Security advisor reports 34 project-wide `rls_enabled_no_policy` findings; this is not an Auth-only exposure count. No policy or browser grant was added. The bounded log summary still contains migration/runtime events tagged `env=prod`; combined with TCE's conflicting private-production note, runtime/environment mapping remains unresolved.
- **Validation/safety:** Auth Service CI passed on pre-checkpoint head `6f8c4dcd1232537bf964ba311545204f5999e3d1` ([run #40302759578](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40302759578)); later docs heads are tracked in PR #68 CI. Current [Supabase branching docs](https://supabase.com/docs/guides/deployment/branching) say every commit to a connected GitHub branch runs a deployment workflow that includes a Migrate step; [branching usage docs](https://supabase.com/docs/guides/platform/manage-your-usage/branching) say Preview branches incur usage not covered by the Spend Cap. The actual GitHub/project connection is not visible in either authorized repo, so default-branch migration effects remain possible. No account rows were read or changed, no mutating RPC was invoked, and no migration, branch operation, function deployment or release occurred.
- **Decision:** `AUTH-UM-004` remains BLOCKED. Source CI is not end-to-end integration, and the actual runtime URL/GitHub integration target cannot be confirmed from repository placeholders or hidden secrets. Continue read-only until the safe target and external migration-trigger effects are authoritative.

## Active tasks

### AUTH-OPS-001 — Prevent unauthorized release promotion from master pushes

- **Priority/status:** P0 / DONE — ordinary pushes no longer publish or promote images.
- **Evidence:** [PR #22](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/22) squash-merged at `ab8e53782d1929880b9ad4df29365d50d86980a6`; current `master` verified at that SHA. Exact tested PR head: `28ec9dfe5f8088d8b93a5ba16aa632879565c109`.
- **Change:** `.github/workflows/release.yml` now exposes only `workflow_dispatch`. Publishing and the platform-infra promotion request remain available only through an explicit manual dispatch from `master`; ordinary pushes run CI only.
- **Validation:** [Auth-service CI PR run #40211913021](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40211913021) passed tests, typecheck, build and container build on the exact PR head. Post-merge [auth-service CI run #40212123019](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212123019) also passed on the merge SHA. The diff changed only the release workflow trigger; no release/promotion run was observed for the merge SHA.
- **Side-effect gate:** Reviewed the prior image publication and promotion steps. The workflow-only merge no longer matches any push trigger. No production deployment, migration, live account mutation or platform-infra change was performed.
- **Risk/remaining control:** Manual dispatch intentionally retains the ability to publish/promote production images; it must not be dispatched without separate release authorization. The prior [PR #18 release run #40209889836](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40209889836) proves only that a promotion request occurred, not that production rollout/health was verified.
- **Links:** [release workflow](../../.github/workflows/release.yml), [PR #22](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/22).

### AUTH-OPS-003 — Reconcile the production-tagged lifecycle migration event with the authorized apply

- **Priority/status:** P0 / BLOCKED — lifecycle source/catalog parity is reconciled, but migration-executor errors continue on the only listed `main` branch and remote-only migration provenance remains unresolved. Current task scope is read-only.
- **Evidence:** Project ref `gtqovpusfyyvxpeezxlo`; ledger `20261026084506 auth_admin_user_lifecycle_rpcs`; migration source `supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql`; read-only catalog/ACL and bounded logs.
- **Current behavior:** All three live lifecycle function bodies match checked-in source after whitespace normalization; signatures, fixed search path, SECURITY DEFINER, owner and EXECUTE ACLs match. The `env=prod` log event at `2026-10-26T08:45:06.114Z` is consistent with the earlier authorized exact migration apply recorded in the historical checkpoint. Fresh `workflow_run_logs` show `Remote migration versions not found in local migrations directory.` at `09:35:29.544322Z` on the branch ID matching the only listed `main` branch. The missing local versions remain unresolved.
- **Desired behavior:** Keep live source/ledger/call-site contracts aligned and reconcile historical remote-only migrations only from authoritative source history.
- **Acceptance criteria:**
  - [x] Confirm lifecycle ledger version and exact source/live body parity.
  - [x] Confirm lifecycle signatures, fixed search path and service-role/owner-only EXECUTE.
  - [x] Correlate the earlier migration event with the previously authorized apply without attributing it to an unknown actor.
  - [ ] Recover source history for `20261014024759`, `20261014130516`, and `20261014131151`; reconcile Keycloak version mismatch.
  - [ ] Verify the GitHub integration/deploy target through an authoritative configuration surface before any further merge/migration.
- **Validation:** Read-only `list_migrations`, `list_tables(verbose=true)`, catalog/ACL SQL, advisors and bounded logs. No migration or schema/data mutation in this run.
- **Dependencies:** AUTH-UM-000; authoritative migration/integration configuration.
- **Risk:** Critical — do not replay/apply migrations or merge a migration-bearing PR under the current read-only instruction.
- **Links:** [PR #64 merged](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), [lifecycle migration](../../supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql), [roadmap](../user-management-roadmap.md).

### AUTH-OPS-004 — Investigate PostgREST root-path timeout burst

- **Priority/status:** P1 / MITIGATION MERGED — PR #63 merged at `df6d1b9766e0fd97ea69035bc4a0ba08ae7dff2e`; the five-minute successful OpenAPI-cache mitigation is on master, but it has not been deployed or validated against production traffic.
- **Evidence:** `src/db/supabase.client.ts`, `src/auth/auth.repository.ts`, `test/supabase.client.spec.ts`; bounded Supabase logs; [PR #63](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/63).
- **Current behavior:** The cache coalesces concurrent schema discovery, caches only successful path sets for five minutes, and retries failures. Post-merge bounded logs from `09:31–09:40Z` still show 9 `env=prod` PostgREST path `/` timeout events through `09:39:58.262274Z`. The Auth release workflow is `workflow_dispatch`-only, so master CI did not deploy the mitigation. The cache may help once released, but it is not proven to be the root-cause fix.
- **Desired behavior:** Keep the low-risk mitigation covered by tests, then evaluate post-deployment bounded aggregate logs only after a separately authorized release; do not generate production load.
- **Acceptance criteria:**
  - [x] Record timeout evidence and source call sites.
  - [x] Pass TTL expiry, concurrent coalescing and retry-after-failure tests on PR #63.
  - [x] Verify Auth Service CI passed on merge commit and current master.
  - [ ] Obtain exact release authorization and verify deployment separately before post-release observation.
  - [ ] Correlate bounded logs after a confirmed release before claiming reduced timeouts.
- **Validation:** PR #63 exact-head CI runs [#40296248881](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296248881), [#40296256113](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296256113); merge CI [#40300171706](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40300171706); current-master CI [#40300658183](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40300658183).
- **Dependencies:** None for merged code; release authorization for production validation.
- **Risk:** Medium — readiness latency may affect health checks; root cause remains unproven.
- **Links:** [PR #63](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/63), [Auth client](../../src/db/supabase.client.ts).

### AUTH-OPS-005 — Reconcile catalog-only legacy Auth RPCs with mutable search_path

- **Priority/status:** P1 / BLOCKED — two legacy SECURITY DEFINER functions exist in the live catalog but have no matching source definition in the nine tracked Auth migrations and no current application call sites in either authorized repository.
- **Evidence:** Read-only `pg_proc`/ACL query on the only listed `main` branch; repository-wide searches in TCE-dashboard and phanthienquoc-authentication; project-wide security advisor.
- **Current behavior:** `public.consume_recovery_code(uuid, text) RETURNS boolean` and `public.rotate_refresh_token(text, text, timestamptz, inet, text) RETURNS TABLE(user_id uuid, role text, new_session_id uuid, reuse_detected boolean)` are `SECURITY DEFINER`, owner `postgres`, `proconfig={search_path=public}`, and EXECUTE is granted only to `service_role`/owner. They are not granted to browser roles and no current application call site was found. The security advisor reports eight project-wide mutable-search-path functions; these two are confirmed examples. Absence of repository call sites does not prove there are no external consumers.
- **Desired behavior:** Recover authoritative migration provenance and inventory external consumers; then decide whether to harden the search path or retire the legacy RPCs through a separately authorized migration. Preserve service-role access only if still required.
- **Acceptance criteria:**
  - [x] Record exact signatures, result types, owner, SECURITY DEFINER, search_path and EXECUTE roles.
  - [x] Search both authorized repositories; no current application call sites found.
  - [ ] Recover the migration/source history that introduced these functions.
  - [ ] Establish external consumer compatibility and a tested least-privilege remediation plan.
  - [ ] Obtain exact migration authorization before applying any remediation; do not drop functions by default.
- **Validation:** Read-only catalog/ACL SQL, migration-file scan, code search and security advisor. No function was invoked or modified.
- **Dependencies:** AUTH-UM-000 and AUTH-OPS-003.
- **Risk:** High but contained by service-role-only EXECUTE; mutable search_path on SECURITY DEFINER functions remains a hardening concern.
- **Links:** [Roadmap](../user-management-roadmap.md), [Supabase database functions guidance](https://supabase.com/docs/guides/database/functions), [Supabase API security guidance](https://supabase.com/docs/guides/api/securing-your-api).
### AUTH-UM-000 — Reconcile auth RPC and migration provenance (UM-0)

- **Priority/status:** P0 / BLOCKED — **migration provenance only**. Live schema, current RPC signatures/ACLs and lifecycle source parity are verified. Two materially different read-only recovery approaches did not recover authoritative historical SQL for missing ledger versions. This blocker does **not** block independent UM-1–UM-4 source/test slices; do not reconstruct, replay or overwrite the remote ledger to force a green status.
- **Evidence:** Read-only `list_projects/get_project`, `list_tables(verbose=true)`, `list_migrations`, `pg_proc`/ACL SQL, advisors/logs; `src/auth/auth.repository.ts`, `src/auth/passkey.repository.ts`, `src/users/users-management.service.ts`, `src/users/admin-audit.service.ts`, `src/db/supabase.client.ts`; tracked `supabase/migrations/`.
- **Read-only contract recheck (2026-10-26):** `list_projects/get_project` re-identifies Supabase ref `gtqovpusfyyvxpeezxlo` (API `ACTIVE_HEALTHY`, PostgreSQL 17.6.1, `ap-southeast-1`); `list_branches` shows only the non-persistent default `main` / Git `master` branch, status `MIGRATIONS_FAILED`. `list_migrations` returns 78 versions through `20261026122224 revoke_public_cashout_event_access`. Live `public.users` has `status text NOT NULL DEFAULT 'ACTIVE'`, role check `USER | ADMIN`, and status check `ACTIVE | SUSPENDED`. The current 14 public `auth_%` RPCs are `SECURITY DEFINER`, owned by `postgres`, fixed to `search_path=pg_catalog, public, pg_temp`, executable by `service_role`/owner only, and not executable by `PUBLIC`, `anon`, or `authenticated`; the three lifecycle signatures and source bodies match the tracked migration and application argument names. Eight Auth tables are RLS-enabled without policies and have no direct browser-role table grants; audit-event and MFA-challenge tables remain RPC-only for `service_role`. Legacy catalog-only `rotate_refresh_token` and `consume_recovery_code` retain mutable `search_path=public` and have no current application call sites; do not alter without provenance. A prior cross-repository inventory found 9 Auth SQL files and 36 TCE SQL files against the 78-version ledger: 13 exact version-prefix matches, 65 ledger versions without source in either authorized repo, and 32 source-file prefixes absent from the ledger (including duplicate TCE prefixes). The remote-only versions `20261014024759`, `20261014130516`, `20261014131151`, local-only `20261012000000_auth_persistence_rpcs.sql`, and the Keycloak version mismatch (`20261014000000` source vs remote `20261020234922`) remain unresolved. Current read-only log aggregation still reports `Remote migration versions not found in local migrations directory`; operational logs are not authoritative source provenance. Project-wide advisors remain: 35 RLS/no-policy findings, one SECURITY DEFINER view, eight mutable-search-path functions, 42 GraphQL-exposure findings per browser role, leaked-password protection disabled; performance findings include 15 unindexed foreign keys, one table without a primary key and 134 unused indexes. No database/schema/data mutation was performed in this run. Treat provenance as a separate diagnostic: continue independent source/test work without reconstructing or replaying missing SQL.
- **Current behavior:** `public.users.status` exists as non-null text default `ACTIVE`. Live `auth_create_refresh_session`, `auth_rotate_refresh_session`, recovery/passkey/MFA challenge routines, audit RPC and the three lifecycle RPCs have expected source contracts. All inspected Auth RPCs are SECURITY DEFINER with fixed search paths and EXECUTE limited to `service_role` plus owner `postgres`; browser roles have no direct Auth-table grants. The three lifecycle bodies match source. Exact remote versions `20261014024759 restrict_auth_rpc_execution`, `20261014130516 keycloak_runtime_schema`, and `20261014131151 keycloak_runtime_login_role` have no corresponding exact source file in either authorized repository. Local `20261012000000_auth_persistence_rpcs.sql` is absent from the remote ledger, and local `20261014000000_keycloak_identity_persistence.sql` does not match the remote version prefix `20261020234922` despite sharing the migration name. Do not reconstruct or replay historical SQL from names/catalog state.
- **Desired behavior:** Keep database, migration source and application RPC argument/result contracts synchronized. Preserve legacy NestJS accounts separately from Keycloak identities; do not add direct Keycloak-schema access or an Admin API adapter without separate approval.
- **Acceptance criteria:**
  - [x] Confirm live `users.status` and lifecycle RPC signatures/privileges.
  - [x] Match lifecycle function bodies to migration source and application call-site argument names.
  - [x] Verify refresh, audit and MFA/passkey RPC signatures/ACLs read-only.
  - [ ] Recover authoritative source history for remote-only versions and reconcile Keycloak timestamp mismatch.
  - [ ] Resolve environment-classification conflict and verify runtime URL-to-ref/GitHub integration mapping.
  - [ ] Complete UM-4 integration only on an explicitly approved non-production target with exact authorization for any writes.
- **Validation:** Live catalog/migration-ledger inspection; exact function-body comparison; repository code search; security/performance advisors. No account rows or raw secrets were read.
- **Dependencies:** AUTH-OPS-003 and authoritative environment/integration configuration.
- **Risk:** Critical — do not infer missing migration contents, mutate live account data, or run lifecycle RPCs while this task's Supabase scope is read-only.
- **Links:** [Roadmap](../user-management-roadmap.md), [lifecycle migration](../../supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

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

### AUTH-UM-001C — Controller authorization and route-method contract (extended by UM-2B)

- **Priority/status:** P1 / MERGED — [PR #42](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/42) squash-merged at `998b73b2fc01795291c00ea3ee0d80d396c5b61d` from exact tested head `d0ddafc5373fb62897c5220f75091f116a3a6324`.
- **Current behavior:** `UsersManagementController` declares `@UseGuards(AdminGuard)` at controller level. The original list/detail handlers are GET-only; merged PR #64 added protected PATCH role/status and POST session-revocation handlers. Current controller tests allow only GET/PATCH/POST, and require recent MFA for each privileged lifecycle route but not the read-only directory routes.
- **Desired behavior:** Every route remains protected by `AdminGuard`; only the explicitly supported GET/PATCH/POST routes are allowed, lifecycle mutations require recent MFA and audit, and DELETE/public bootstrap/Keycloak mutation remain absent.
- **Acceptance criteria:**
  - Assert controller-level guard metadata includes `AdminGuard`.
  - Assert the existing `list` and `getById` handlers are registered routes.
  - Assert registered route methods stay within the explicit GET/PATCH/POST allowlist; lifecycle mutation handlers must require recent MFA and audit. DELETE, PUT, public bootstrap and unapproved Keycloak mutations remain disallowed.
  - Keep legacy NestJS user routes separate from Keycloak identity rows.
- **Validation:** Auth-service CI [run #40227589102](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40227589102) passed dependency installation, tests, typecheck, build and container build on exact head `d0ddafc5373fb62897c5220f75091f116a3a6324`. Lint is not part of this workflow; no `web/**` files or migrations changed. Default branch verified at merge SHA `998b73b2fc01795291c00ea3ee0d80d396c5b61d`.
- **Dependencies:** Complements AUTH-UM-001A. UM-1B audit persistence and UM-2 lifecycle mutations are merged; remaining acceptance is live integration under AUTH-UM-004.
- **Risk:** Low — test-only metadata assertions.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-001B — Privileged audit persistence (UM-1 foundation)

- **Priority/status:** P1 / MERGED — PR #54 merged at `533fd4f6809c187759231d109fe7ac05239271c9` from exact head `e74500d2609364fcf30fb3c2ad598b3ab4613d55`.
- **Evidence:** Live ledger versions `20261026035340 auth_admin_audit_events` and `20261026035431 auth_admin_audit_rpc_only_access`; post-apply `list_migrations`, `to_regclass`, `to_regprocedure`, `pg_proc` ACL and `has_table_privilege` checks. `auth_record_admin_audit_event` is `SECURITY DEFINER` with fixed `search_path=pg_catalog, public, pg_temp`; EXECUTE is limited to `service_role` and owner `postgres`.
- **Current behavior:** The server-side append path and typed writer are merged. The table is RLS-enabled with no policies and no direct privileges for `anon`, `authenticated`, or `service_role`; the validated RPC is the application write path. Routes were GET-only at this PR #54 checkpoint; PR #64 later added protected lifecycle methods that write audit events atomically through the same SQL transaction.
- **Desired behavior:** Append-only audit events for current successful/denied/failed legacy-admin lifecycle operations, with safe allowlisted metadata and no secrets. Keep Keycloak identities separate.
- **Acceptance criteria:**
  - [x] Create a constrained audit table with safe role/status fields and chronology indexes.
  - [x] Expose validated writes through a SECURITY DEFINER RPC with fixed search_path and service_role-only EXECUTE.
  - [x] Revoke direct table privileges from PUBLIC/anon/authenticated/service_role; preserve postgres owner access.
  - [x] Add a typed writer that forwards only allowlisted metadata and normalizes DB errors.
  - [x] Unit tests verify secret-like extra fields are not forwarded and RPC/transport errors are normalized.
  - [x] Exact-head service CI and post-merge service CI passed.
  - [ ] Add non-production end-to-end integration coverage for audit success/failure and consistency with eventual mutations.
  - [x] Lifecycle migration calls the audit RPC inside the same SQL transaction as each role/status/session mutation.
  - [ ] Verify audit/mutation atomicity with synthetic fixtures on an explicitly authorized safe non-production target.
- **Validation:** Exact-head CI [#40266935252](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40266935252) and post-merge CI [#40267173209](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40267173209) passed. Supabase Preview was skipped because no branch was associated and preview-branch creation is disabled; this is not non-production integration evidence. No account rows were read or changed by this run.
- **Dependencies:** AUTH-OPS-002 migration-history reconciliation; AUTH-UM-002 is merged. End-to-end audit/mutation consistency and gateway behavior remain part of AUTH-UM-004.
- **Risk:** High — audit records must not be forgeable or contain secrets. The application role cannot write/read the table directly and has only EXECUTE on the validated RPC.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [audit schema/RPC migration](../../supabase/migrations/20261026035340_auth_admin_audit_events.sql), [RPC-only grants migration](../../supabase/migrations/20261026035431_auth_admin_audit_rpc_only_access.sql), [PR #54](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/54).

### AUTH-UM-002 — Legacy account lifecycle API (UM-2)

- **Priority/status:** P1 / MERGED — [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64) squash-merged at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`; default branch verified identical to that SHA.
- **Evidence:** `src/users/users-management.controller.ts`, `src/users/users-management.service.ts`, `src/users/admin.guard.ts`, `src/users/recent-mfa.guard.ts`, `supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql`, associated lifecycle/MFA/browser tests, and [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64).
- **Current behavior:** Protected role/status/session-revocation endpoints and confirmation-based UI are merged. Mutations use current database-backed active-admin authorization inside the RPCs, global advisory locking and atomic audit, with recent signed MFA assurance at the route. Responses are allowlisted; signup remains USER; self-role/self-suspension and last-active-admin lockout are denied. The browser calls only NestJS API. No hard-delete endpoint or Keycloak mutation exists.
- **Desired behavior:** Maintain audited role change, reversible suspension/reactivation and revoke-all-refresh-sessions for legacy NestJS accounts only.
- **Acceptance criteria:**
  - [x] Apply the lifecycle migration by direct owner instruction and verify ledger version `20261026084506`.
  - [x] Require active database ADMIN authorization in RPCs and AdminGuard, plus recent signed MFA for lifecycle routes.
  - [x] Prevent self-change and last-active-admin lockout; serialize changes and write audit in the same transaction.
  - [x] Keep response fields allowlisted and browser data access through NestJS only.
  - [x] Exact-head Auth Service CI passed: [run #40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614).
  - [x] Exact-head Auth Web CI passed including browser tests: [run #40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540).
  - [x] Review pre-merge workflows: release workflow is `workflow_dispatch`-only; no release was dispatched.
- **Validation:** Merge SHA `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec` verified as current `master`. Migration source matches the already-applied ledger version; catalog confirms fixed search path and EXECUTE limited to `service_role`/owner `postgres`. No user/account rows were read or modified; no app release/deployment was dispatched.
- **Dependencies:** AUTH-UM-000 remains open for historical migration provenance; AUTH-UM-004 continues end-to-end assurance separately.
- **Risk:** High — privileged mutation code affects role authority and sessions; the merged code is covered by CI but live lifecycle behavior has not been exercised with real user records.
- **Links:** [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64), [merge commit](https://github.com/phanthienquoc/phanthienquoc-authentication/commit/2a233d1b45ed1d52adc2b91b8608dc686d24f9ec), [applied lifecycle migration](../../supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql).


### AUTH-UM-003 — Protected admin users UI (UM-3)

- **Priority/status:** P2 / IMPLEMENTED; INTEGRATION ACCEPTANCE OPEN — the read-only directory, API contract tests and browser-level dialog/focus/responsive checks are merged (PR #47); confirmation-based role/status/session-revocation UI was added by merged PR #64. Live integration acceptance remains under AUTH-UM-004.
- **Evidence:** `web/src/app/admin/users/page.tsx`, `web/src/services/auth-api.ts`, `web/src/features/auth/auth-store.ts`, `web/scripts/admin-user-query.mjs`, `web/scripts/admin-user-query.test.mjs`, `web/scripts/admin-user-contract.test.mjs`.
- **Current behavior:** PR #19 provided the `/admin/users` directory with search, role filter, pagination and detail panel. PR #24 added dependency-free query/security contracts; PR #47 added browser accessibility checks; PR #64 added confirmation-based lifecycle controls backed by protected NestJS endpoints. All browser data access remains through NestJS; no direct browser-to-Supabase query is used.
- **Desired behavior:** Maintain a responsive, accessible admin workflow for supported lifecycle actions; server-side authorization is authoritative and Keycloak mutation remains disabled.
- **Acceptance criteria:**
  - No direct browser-to-Supabase access or sensitive fields in the UI.
  - Loading/empty/error states, keyboard-accessible confirmation dialogs and clear provider labels.
  - Mutation controls are not shown until matching protected API routes and tests exist.
  - UI role checks remain supplementary; server-side authorization is authoritative.
- **Validation:** PR #24 merged at `52864661b10bdd35feedb3266040700033d05238` from exact tested head `19e4d3b04b75cff5d38e70b6d01aa920a3eb1e02`. [Auth-web CI #40212531075](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531075) passed `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and the frontend container build. [Auth-service CI #40212531176](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531176) passed backend tests, typecheck, build and container build. Post-merge runs #40212871633 and #40212871603 passed. The Supabase Preview app check on the subsequent PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` failed with `Remote migration versions not found in local migrations directory`; the PR #24 merge check itself was skipped because no Supabase branch was associated. This is tracked under AUTH-UM-000 and no migration was applied.
- **Remaining:** Browser-level dialog verification and responsive regression coverage are complete in AUTH-UM-003D below. Lifecycle UI is implemented; live lifecycle integration and environment/runtime mapping remain blocked under AUTH-UM-004. **Dependencies:** AUTH-UM-002 for lifecycle APIs; AUTH-UM-000/AUTH-OPS-003 for migration provenance and safe integration readiness.
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

- **Priority/status:** P1 / PARTIALLY VERIFIED; LIVE RUNTIME ACCEPTANCE BLOCKED — UM-2B code is merged; current catalog and RPC ACLs are verified read-only. Prior synthetic DB-RPC checks covered session creation, suspension/denial, reactivation, revocation, role promotion, non-admin/self-change denial and audit-failure rollback; a separate response/audit allowlist run passed and cleanup counts returned zero synthetic users/sessions/audit events. Those checks do not prove the live application HTTP path. Migration-provenance drift is a separate blocked diagnostic and does not block source-level UM tests. Current-run Supabase access is read-only; no new database writes, migrations, branch operations or function deployments are authorized.
- **Evidence:** `.github/workflows/ci.yml`, `.github/workflows/web-ci.yml`, `README.md`, `docs/production-runtime-secrets.md`, `supabase/migrations/`, live catalog and ledger evidence in the roadmap.
- **Current behavior:** Unit/source tests and the prior synthetic DB-RPC checks do not prove the deployed runtime URL maps to this project or verify the live HTTP/session/MFA/passkey path, cookie/gateway forwarding, CORS/CSRF/rate limits or lifecycle behavior against a safe database. The source-level HTTP contract test is independent of the unresolved historical migration provenance; only live integration depends on authoritative runtime/project mapping and exact authorization for any required write. The only listed branch is `main` / Git `master` with `MIGRATIONS_FAILED`; project API status is separately `ACTIVE_HEALTHY`. The actual GitHub/Supabase integration target and deployment toggle are not exposed by the authorized tools, and Supabase Preview checks are skipped rather than passing an integration test.
- **Desired behavior:** Run synthetic-fixture lifecycle integration only against an explicitly classified and approved non-production target with exact authorization for required writes. Keep production release and live-trading actions separate.
- **Acceptance criteria:**
  - [x] Backend/web source tests and typecheck/build passed for merged lifecycle code.
  - [x] Verify live RPC signatures, function bodies, ACLs and Auth-table grants read-only.
  - [x] Add source-level HTTP-pipeline coverage with a mocked Supabase client in AUTH-UM-004B; this does not substitute for live integration.
  - [ ] Run scoped integration against the owner-confirmed non-production project with synthetic fixtures only; keep `MIGRATIONS_FAILED` and historical migration provenance as independent diagnostic items.
  - [ ] Obtain exact authorization for isolated synthetic lifecycle writes, then test login, refresh, MFA, passkey, suspension and session revocation.
  - [ ] Verify audit redaction, cookies/CORS/CSRF/rate limits and gateway behavior without exposing secrets.
- **Source-level coverage:** [AUTH-UM-004A / PR #70](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/70) adds suspended-refresh and migration-contract regression tests; this is not live integration.
- **Validation:** Exact-head GitHub Actions; approved non-production target; synthetic fixtures only after explicit write authorization; response/audit redaction review.
- **Dependencies:** AUTH-UM-000 through AUTH-UM-003 and AUTH-OPS-001.
- **Risk:** Critical if source-only CI is mistaken for end-to-end rollout readiness.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64).

### AUTH-UM-004A — Regression coverage for suspension across auth entrypoints

- **Priority/status:** P1 / TEST VERIFIED; UM-4 integration remains BLOCKED — [draft PR #70](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/70). Exact-head Auth Service CI passed at `d769ceb23b14e1b160638320f56d088cdcd1f28e` ([run #40305791232](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40305791232)). This source-level slice is independent of live Supabase writes and does not close UM-4.
- **Evidence:** `test/auth-flow-security.spec.ts` already rejects suspended accounts before login MFA challenge/session creation; the live/source migration `20261026080831_auth_user_status_enforcement.sql` enforces ACTIVE status across refresh, MFA challenge/recovery, and passkey challenge RPCs. Before this slice there was no unit regression for a suspended refresh result and no dedicated migration contract test covering all those RPCs/grants.
- **Current behavior:** Runtime/source checks deny suspended users, but test coverage did not explicitly assert that a suspended refresh result clears the refresh cookie and never issues an access token; the migration's active-only RPC contract was only indirectly covered.
- **Desired behavior:** Lock in ACTIVE-only behavior across refresh, MFA, recovery and passkey paths, fixed search paths, and service-role-only EXECUTE grants without contacting the live database.
- **Acceptance criteria:**
  - [x] Add a refresh regression asserting suspended result rejection, cookie clearing and no access-token issuance.
  - [x] Add a source-level migration contract test for ACTIVE-status checks, fixed search paths and browser-role EXECUTE denial.
  - [x] Pass exact-head Auth Service CI on PR #70 at `d769ceb23b14e1b160638320f56d088cdcd1f28e` ([run #40305791232](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40305791232)).
  - [ ] Keep live synthetic lifecycle integration blocked until the runtime/project target is authoritative and exact write authorization exists.
- **Validation:** Exact-head Auth Service CI passed on PR #70 at `d769ceb23b14e1b160638320f56d088cdcd1f28e` ([run #40305791232](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40305791232)). PR #70 contains only tests; no migration, schema, application runtime code, credential or account data is changed. Live integration remains blocked.
- **Dependencies:** AUTH-UM-000 and AUTH-UM-004 for end-to-end verification; the source-level test slice does not depend on live Supabase access.
- **Risk:** Low for code behavior (test-only); do not mistake source-level contract tests for live integration evidence.
- **Links:** [PR #70](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/70), [status-enforcement migration](../../supabase/migrations/20261026080831_auth_user_status_enforcement.sql), [auth-flow security tests](../../test/auth-flow-security.spec.ts).

### AUTH-UM-004B — HTTP-level lifecycle route contract

- **Priority/status:** P1 / SOURCE-LEVEL TEST VERIFIED IN PR #74 — mocked HTTP pipeline only; live UM-4 acceptance remains blocked. Re-run Auth Service CI on the final PR head after the documentation refresh; Supabase Preview is skipped and is not an integration pass. Migration-provenance drift does not block this source/test slice.
- **Evidence:** `test/users-management.http.spec.ts`, `src/users/users-management.controller.ts`, `src/users/admin.guard.ts`, `src/users/recent-mfa.guard.ts`, `src/users/users-management.service.ts`, and the live read-only RPC catalog/ACL evidence recorded under AUTH-UM-000.
- **Current behavior:** Existing guard, controller-metadata and service tests cover individual layers, but did not start the Nest HTTP application and exercise the lifecycle route, global validation pipe, guard ordering and serialized response together.
- **Desired behavior:** Verify the real Nest HTTP boundary using a mocked service-role Supabase client, without contacting or mutating the live database.
- **Acceptance criteria:**
  - [x] Start the Nest users-management module on an ephemeral loopback port with the production-style `/api` prefix and strict `ValidationPipe`.
  - [x] Missing bearer credentials return 401 before user lookup or RPC.
  - [x] An active admin with recent MFA reaches `auth_admin_update_user_status` with the migration-named arguments and receives only allowlisted response fields.
  - [x] Non-admin and stale-MFA requests are denied, audit only allowlisted metadata, and never invoke the lifecycle mutation RPC.
  - [x] Caller-supplied actor identity is rejected before any database RPC.
  - [x] Auth Service CI passed on test/code head `cfd1c29010076c045ee8d2436362a1d97f844064` ([run #40342859867](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40342859867)): tests, typecheck, build and container build succeeded; Supabase Preview was skipped.
  - [ ] Keep live HTTP/session/MFA/passkey integration blocked until runtime-to-project mapping is authoritative and every required write operation is separately authorized.
- **Validation:** Exact-head Auth Service CI is required on the final PR #74 head after the documentation refresh. The HTTP test mocks the existing service-role Supabase client and uses only an ephemeral loopback Nest server; it performs no external database call, schema/data write, migration or release. Supabase Preview was skipped and does not count as integration evidence.
- **Dependencies:** AUTH-UM-000 contract discovery, AUTH-UM-001 through AUTH-UM-003 and AUTH-OPS-001. The unresolved migration-provenance subtask is not a dependency for this mocked HTTP test; live UM-4 acceptance separately depends on authoritative runtime/project mapping and exact authorization for any required write.
- **Risk:** Medium — this test closes an application-boundary coverage gap but must not be mistaken for live runtime or gateway verification.
- **Links:** [HTTP contract test](../../test/users-management.http.spec.ts), [controller](../../src/users/users-management.controller.ts), [AdminGuard](../../src/users/admin.guard.ts), [RecentMfaGuard](../../src/users/recent-mfa.guard.ts).

### AUTH-SEC-001 — Bind MFA completion to a server-side first-factor challenge

- **Priority/status:** P1 / MERGED — [PR #55](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/55) squash-merged at `7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7`; source migration `20261026040431_auth_server_issued_mfa_login_challenges` is present in the remote ledger and current master. Source/service/web CI is merged; gateway-level rate limiting and live challenge/expiry/recovery integration remain open under AUTH-UM-004. Current prompt requires separate authorization for each future write/migration operation.
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
  - [x] Required service/web/push CI passed on current PR head `a355ed7691ffa08c11ac41cd35a2f98cb022477c`; rerun if the PR head changes and immediately before any merge.
  - [ ] Verify gateway-level request-rate limiting separately before rollout.
  - [ ] Verify five-attempt lockout, challenge expiry and recovery transaction against the owner-confirmed non-production target; do not use real account rows when synthetic test fixtures suffice.
- **Validation:** Exact-head auth-service CI [#40268775626](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40268775626), auth-web CI [#40268775717](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40268775717), and push service CI [#40268772104](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40268772104) passed on `a355ed7691ffa08c11ac41cd35a2f98cb022477c`. Recheck if the PR head changes. Supabase Preview is skipped, not passed; no preview branch was created. Supabase Preview is skipped because no Supabase branch is associated and preview-branch creation is disabled. This run performed no migration apply, branch operation, schema/data mutation or live challenge/recovery RPC call.
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
- **Dependencies:** Existing read-only UM-3 UI and API contract; no schema, audit, migration or mutation dependency. Production/non-production classification remains a merge gate for migration-bearing changes only.
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

## Read-only scheduled recheck — 2026-10-26 17:29 +07:00

- **Project and branch:** Fresh read-only list_projects/get_project/list_branches confirms project ref `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, PostgreSQL `17.6.1.084`, project API `ACTIVE_HEALTHY`; the only listed branch remains non-persistent `main` / Git `master`, branch UUID `5132b831-8223-4dc4-8f39-707415c96f1b`, status `MIGRATIONS_FAILED`. Ledger remains 77 versions. This automation followed the latest request's read-only restriction; no migration, branch, schema, data, function or deployment operation was performed.
- **AUTH-OPS-004 — recurring PostgREST timeouts:** A bounded aggregate log query for `2026-10-26T09:30:00Z–10:28:59Z` returned 70 `postgrest_logs` timeout-manager events on path `/`, latest `2026-10-26T10:27:29.043518Z`. Log attributes tag `env=prod`, but they do not identify a direct caller. The previously implemented readiness OpenAPI cache is a plausible mitigation, not a proven root cause; it has not been deployed or validated against production traffic.
- **AUTH-UM-000 / migration provenance:** The same bounded window contains three `workflow_run_logs` errors, at `09:31:43.678930Z`, `09:35:29.544322Z`, and `09:56:25.735931Z`, each `Remote migration versions not found in local migrations directory`, on the same listed branch UUID. Remote-only versions `20261014024759`, `20261014130516`, and `20261014131151` and the Keycloak timestamp/name mismatch remain unresolved. Do not reconstruct source migrations from catalog state.
- **Advisors:** Latest security/performance advisor snapshots observed at `2026-10-26T10:32:05Z` report 34 project-wide RLS-enabled/no-policy findings and 15 project-wide unindexed foreign keys. No broad policy or index changes were made.
- **Validation/safety:** Current Supabase documentation for GitHub integration/branching and database migrations was searched. Runtime project mapping and the GitHub integration deployment target remain unverified; retain read-only behavior and keep UM-4 blocked pending authoritative migration provenance and safe integration evidence.

## Latest read-only scheduled recheck — 2026-10-26 17:55 +07:00

- **Project/branch:** `list_projects/get_project` identifies `gtqovpusfyyvxpeezxlo` in organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, PostgreSQL `17.6.1.084`, project API `ACTIVE_HEALTHY`. `list_branches` returns only non-persistent default `main` / Git `master`, status `MIGRATIONS_FAILED`; no preview branch was listed.
- **Current Auth schema/RPCs:** `public.users.status` is non-null `ACTIVE` by default; role is non-null `USER` by default. All 14 current public `auth_%` RPCs are `SECURITY DEFINER`, have fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE is limited to `service_role` plus owner `postgres`. No direct `anon`/`authenticated` privileges were found on the inspected Auth tables; no policies were returned for those Auth tables. No account rows, hashes, MFA material, recovery data or passkey records were read.
- **Migration provenance:** Ledger remains 77 entries through `20261026084506`. Remote-only `20261014024759`, `20261014130516`, `20261014131151` lack exact source files in the two authorized repos; local `20261012000000_auth_persistence_rpcs.sql` is absent from the remote ledger; local `20261014000000_keycloak_identity_persistence.sql` does not match remote version prefix `20261020234922`. No historical SQL was reconstructed.
- **Auth PRs:** PR #68 (this documentation reconciliation) and PR #70 (suspension regression tests) remain open/draft. Check the exact current head's Actions status before any merge. Neither is merged because the Supabase integration target/side effects remain unverified and the current instruction requires exact authorization for each future write operation.
- **Environment and authorization:** Auth's historical owner-confirmed non-production note conflicts with TCE's private-production wording and live aggregate `env=prod` logs. The actual GitHub-to-Supabase connection/deploy toggle is not exposed by the authorized repo config. No migration, Supabase branch, schema/data write, function deployment, application release or live account mutation occurred.

## Latest scheduled evidence — 2026-10-26 19:05 +07:00

- **UM status:** UM-1/UM-2/UM-3 implementation slices remain merged per the roadmap. UM-4 remains open: source-level suspension tests pass, but a safe end-to-end lifecycle run has not been demonstrated.
- **Schema/contract evidence:** Rechecked the sole listed Supabase project and branch read-only. The 14 current `public.auth_%` RPCs have fixed search paths and server-role-only EXECUTE. Auth tables remain RLS-enabled with no policies and no browser-role table grants. `SignupDto` has no role field and signup explicitly assigns `USER`; login, refresh, MFA, passkey, and admin lifecycle code were reviewed against status and least-privilege contracts.
- **Migration drift:** Remote ledger has 77 versions; the three historical remote-only versions and Keycloak version mismatch remain unresolved. Do not synthesize missing SQL. The current task's per-operation authorization rule supersedes historical blanket wording for future applies.
- **Validation:** PR #68 exact head `dcf1a4d822758943e093cf6cd95b865cdf81bb1a` passed [Auth Service CI #40313090236](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40313090236). PR #70 exact head `d769ceb23b14e1b160638320f56d088cdcd1f28e` passed [Auth Service CI #40305791232](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40305791232).
- **Open PRs:** #68 (roadmap/queue evidence) and #70 (suspension regression tests) are open/draft and mergeable. Do not merge solely on green CI: the connected GitHub/Supabase repository/deploy target remains unverified, and a connected integration can run migration steps. No exact future migration operation is authorized by this run.
- **Risk/dependencies:** Medium — source contract is covered, but live integration/environment provenance is unresolved. No Supabase branch was created; no account rows or sensitive auth material were read; no migration/schema/data write, function deployment, or release occurred.
