# User Management — Architecture and Delivery Roadmap

## Status and scope

- **Status (updated 2026-10-26 20:38 +07):** UM-1/UM-2/UM-3 implementation is merged; UM-4 is PARTIAL after synthetic database-RPC integration against generated fixtures, with application-level HTTP integration still open. The owner previously classified shared project `gtqovpusfyyvxpeezxlo` as non-production, but Auth `.env.example` remains a project-ref placeholder and TCE `apps/service/.env.auth.example` leaves `SUPABASE_URL` blank. The actual GitHub/Supabase integration target is not exposed by the connected tools, so repository-to-project runtime binding is not independently verified. Migration-history drift and branch `MIGRATIONS_FAILED` remain separate diagnostics. No production app release or live trading/order action is authorized; future writes/migrations/deploys require exact authorization, and potentially billable Supabase branches require `get_cost` plus explicit cost approval.
- **Owner:** Central NestJS authentication service and its Next.js `web/` app.
- **Scope:** This roadmap governs User Management and authentication work only; it does not change TCE or Media consumers.
- **Change record (2026-10-26):** Earlier scoped RPC, audit, MFA-challenge, status and lifecycle migrations are present in the connected ledger. A later task instruction requires separate authorization for each exact migration operation; historical broad routine-migration authorization is not standing permission for further applies. Do not create a Supabase branch without a cost quote and explicit cost approval. Runtime URL-to-ref and GitHub integration settings remain unverified.

## Read-only schema, RPC and operational verification — 2026-10-26 16:40 +07:00

- **Project/branch identity:** `list_projects/get_project` identifies ref `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, PostgreSQL 17.6.1, API status `ACTIVE_HEALTHY`. `list_branches` returns only non-persistent default `main` / Git `master`, branch ID `5132b831-8223-4dc4-8f39-707415c96f1b`, status `MIGRATIONS_FAILED`. The same branch ID appears in recent migration-executor logs; those events are on the listed `main` branch, not evidence of a separate preview branch. The Authentication roadmap records owner-confirmed non-production, while the TCE queue retains conflicting private-production wording. The owner/admin has confirmed this connected project is non-production and authorized scoped Supabase actions for these repositories; historic `env=prod` telemetry and stale TCE wording are not blockers. Migration provenance remains a separate diagnostic.
- **Live Auth schema:** `public.users` columns are `id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted,created_at,updated_at,status`; `status` is non-null with default `ACTIVE`. RLS is enabled on `users`, `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_credentials`, `auth_passkey_challenges`, `auth_keycloak_identities`, `auth_admin_audit_events`, and `auth_mfa_login_challenges`. The read-only policy query returned no policies for those Auth tables, and table-grant inspection found no direct `anon`/`authenticated` privileges on them. Application access remains server-side via the existing `@supabase/supabase-js` service-role client. The separate `public.auth_keycloak_identities` mapping remains distinct from the operational `keycloak` schema; no Keycloak Admin API adapter or direct Keycloak mutation was introduced. No account rows or credential values were read.
- **Lifecycle source/catalog parity:** Live `pg_get_functiondef` bodies for all three lifecycle RPCs match `supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql` exactly after whitespace normalization:
  - `auth_admin_update_user_role(uuid, uuid, text, text, text) RETURNS jsonb`
  - `auth_admin_update_user_status(uuid, uuid, text, text, text) RETURNS jsonb`
  - `auth_admin_revoke_user_sessions(uuid, uuid, text, text) RETURNS jsonb`
  All three are owned by `postgres`, `SECURITY DEFINER`, fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE is limited to `service_role` plus owner `postgres`; no EXECUTE for `PUBLIC`, `anon`, or `authenticated`.
- **Other RPC contracts/call sites:** Live catalog confirms `auth_create_refresh_session(uuid,uuid,uuid,text,timestamptz,text,text) RETURNS boolean`, `auth_rotate_refresh_session(text,uuid,text,timestamptz,text,text) RETURNS jsonb`, recovery-code/passkey/MFA-challenge RPCs, and `auth_record_admin_audit_event(uuid,uuid,text,text,text,text,text,text,text,text) RETURNS uuid`. They use fixed search paths and EXECUTE limited to `service_role`/owner. `src/auth/auth.repository.ts` passes migration-named arguments for refresh, recovery, passkey and MFA flows; `src/users/users-management.service.ts` passes actor/target IDs, role/status, reason and request ID to lifecycle RPCs; `src/users/admin-audit.service.ts` uses the audit RPC. Readiness tests require these same REST paths. The latest tracked source definitions for all 14 current `auth_%` RPCs match live `pg_get_functiondef` bodies after whitespace normalization. The only two catalog functions without matching current source definitions are legacy `rotate_refresh_token` and `consume_recovery_code`; current application call-site search found no use of either. Legacy `rotate_refresh_token` and `consume_recovery_code` remain separate compatibility routines and are not substituted for the current contracts.
- **Catalog-only legacy RPCs:** Live `public.consume_recovery_code(uuid, text) RETURNS boolean` and `public.rotate_refresh_token(text, text, timestamptz, inet, text) RETURNS TABLE(user_id uuid, role text, new_session_id uuid, reuse_detected boolean)` are `SECURITY DEFINER`, owned by `postgres`, have mutable `search_path=public`, and grant EXECUTE only to `service_role` plus owner. They are absent from the nine tracked Auth migration files and have no current application call sites in either authorized repository. Do not drop or alter them until authoritative migration provenance and external consumers are inventoried.
- **Migration history:** `list_migrations` reports 77 entries. Relevant versions include `20261026030920 auth_persistence_rpc_contract_reconcile`, `20261026032152 revoke_browser_auth_table_privileges`, `20261026035340 auth_admin_audit_events`, `20261026035431 auth_admin_audit_rpc_only_access`, `20261026040431 auth_server_issued_mfa_login_challenges`, `20261026080831 auth_user_status_enforcement`, and `20261026084506 auth_admin_user_lifecycle_rpcs`. Exact source files for remote versions `20261014024759`, `20261014130516`, and `20261014131151` were not found in either authorized repository; `20261020234922 keycloak_identity_persistence` has a timestamp/name mismatch with the checked-in older Keycloak persistence source. Do not reconstruct missing migration SQL from names or catalog state.
- **Advisors (project-wide, not Auth-only):** Security reports 34 RLS-enabled/no-policy findings, one SECURITY DEFINER view, eight mutable-search-path functions, 43 anon and 43 authenticated GraphQL-exposure findings, and leaked-password protection disabled. Performance reports 15 unindexed foreign keys, one table without a primary key, and 137 unused indexes. No unrelated objects were changed.
- **Fresh bounded logs:** From `2026-10-26T09:31:00Z` to `09:40:00Z`, PostgREST `env=prod`, path `/`, had 9 timeout-manager events through `09:39:58.262274Z`; workflow-run logs had 2 `Remote migration versions not found in local migrations directory.` errors, latest `09:35:29.544322Z`, with the branch ID matching the listed `main` branch. The cache mitigation PR #63 is merged on GitHub but the Auth release workflow is manual-dispatch-only, so no production image deployment occurred and these logs do not validate the mitigation in production.
- **Validation/safety:** Searched current official Supabase branching, API-security and RLS documentation: [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration), [API security](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). This checkpoint used read-only project/branch/table/migration/catalog/ACL/advisor/log inspection only. No migration, schema/data mutation, Supabase branch operation, Edge Function deployment, application release or live trading action occurred.

## Read-only scheduled recheck — 2026-10-26 17:00 +07:00

- Repeated project discovery confirms `gtqovpusfyyvxpeezxlo` in organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, PostgreSQL 17.6.1, with API status `ACTIVE_HEALTHY`. The only listed branch remains non-persistent default `main` / Git `master`, status `MIGRATIONS_FAILED`.
- The live `public.users` schema has non-null `status` defaulting to `ACTIVE`, constrained to `ACTIVE | SUSPENDED`; `role` remains constrained to `USER | ADMIN`. The 14 current public `auth_%` RPCs remain server-role-only with fixed search paths and no EXECUTE for browser roles. The three lifecycle RPC signatures remain aligned with the tracked source.
- Source and catalog checks confirm ACTIVE-status enforcement at login/refresh, MFA challenge/recovery, and passkey challenge paths. Lifecycle mutations remain server-side, audit-backed, and guarded against self-escalation/last-admin lockout; no mutating RPC was invoked.
- The ledger still contains the latest lifecycle/status/MFA/audit versions documented in the task queue. Three remote-only historical versions and the Keycloak timestamp mismatch remain unresolved. Security advisor reports 34 project-wide RLS-enabled/no-policy findings; no schema or policy changes were made.
- Environment classification remains unresolved for execution safety: Authentication's owner-confirmed non-production note conflicts with TCE's prior private-production note and live `env=prod` log tags. Current [Supabase branching docs](https://supabase.com/docs/guides/deployment/branching) state that every commit to a connected GitHub branch runs a deployment workflow including a Migrate step; [branching usage docs](https://supabase.com/docs/guides/platform/manage-your-usage/branching) note that Preview branches incur usage not covered by the Spend Cap. The actual repository/project integration is not exposed in authorized repo config, so default-branch side effects remain possible. No Supabase branch was created, no migration was applied, no account data was changed, and no release or function deployment occurred. UM-4 remains blocked pending authoritative runtime/integration mapping and exact authorization for synthetic writes.

## Historical lifecycle RPC migration checkpoint — 2026-10-26 15:50 +07:00

- The owner directed that ordinary Supabase migrations should proceed and explicitly said not to create a Supabase branch. No Supabase branch was created.
- Connected project identified by read-only `list_projects/get_project`: ref `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`. Project API status is `ACTIVE_HEALTHY`; the only listed branch remains default, non-persistent `main` / Git `master`, with status `MIGRATIONS_FAILED`. Keep both observations visible; do not mistake the branch status for a failed migration apply.
- The exact SQL from the Auth repository's lifecycle migration was applied with the connected Supabase migration tool, which returned `success: true`. The live migration ledger now records `20261026084506 auth_admin_user_lifecycle_rpcs`.
- Read-only catalog verification confirms:
  - `auth_admin_update_user_role(p_actor_user_id uuid, p_target_user_id uuid, p_new_role text, p_reason_code text, p_request_id text) RETURNS jsonb`
  - `auth_admin_update_user_status(p_actor_user_id uuid, p_target_user_id uuid, p_new_status text, p_reason_code text, p_request_id text) RETURNS jsonb`
  - `auth_admin_revoke_user_sessions(p_actor_user_id uuid, p_target_user_id uuid, p_reason_code text, p_request_id text) RETURNS jsonb`
  - All three are `SECURITY DEFINER`, have fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE is limited to `service_role` and owner `postgres`; `anon` and `authenticated` cannot execute them.
- This migration defines privileged routines and grants only; no user/account rows were read or changed. No application release, production application deployment, Edge Function deployment, or trading action occurred.
- The original lifecycle branch was ahead of current `master` but diverged because the MFA-challenge and status-enforcement slices had already landed separately. A clean branch `feat/auth-um-2-lifecycle-clean-20261026` was created from current `master` and only the dependent lifecycle code/tests/migration were ported, keeping the merged MFA/status migrations out of the new change. The lifecycle migration source is aligned to the applied version `20261026084506`.
- Remaining: run exact-head service/web/browser checks, inspect the full authorization/audit/concurrency diff, and complete the merge-side-effect gate before merging. The successful migration apply alone is not an end-to-end lifecycle integration test.

## Historical UM-2B lifecycle completion and incident reconciliation — 2026-10-26 16:15 +07:00

- [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64) was squash-merged at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`; the default branch was verified at the same SHA. Exact-head Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614) and Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540) passed, including browser checks. The Auth application release workflow remains manual-dispatch-only; no release dispatch or app deployment occurred.
- The lifecycle SQL was applied via the connected Supabase migration tool at the user's direction; it returned success and `list_migrations` records `20261026084506 auth_admin_user_lifecycle_rpcs`. The source file on master matches that ledger version. Post-apply catalog checks confirmed all three lifecycle RPCs, fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE limited to `service_role` / owner `postgres`. No Supabase branch was created. No user/account rows were read or changed.
- Environment classification follows the owner's latest explicit instruction: non-production. Earlier production-tagged telemetry and documentation are retained as historical evidence, not as the current environment classification. Supabase project API status is `ACTIVE_HEALTHY`, while its only listed non-persistent default `main` / Git `master` branch reports `MIGRATIONS_FAILED`. These are separate status facts; neither alone establishes the GitHub integration target or deployment toggle. The user explicitly authorized routine scoped migrations, but not live account mutations, production app release or live trading.
- Earlier [PR #62](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/62) records a bounded management API event tagged `env=prod` at `2026-10-26T08:45:06.114Z` that matches the lifecycle SQL and timing of the authorized apply in this task. The older statement that the current automation did not perform the apply is stale. The log result did not expose actor identity; it does not establish a separate unknown actor.
- Stable tasks AUTH-OPS-003 and AUTH-OPS-004 have been added to the canonical queue: reconcile the production-tagged apply evidence with source/ledger and investigate 36 PostgREST timeout-manager events on the root path. AUTH-OPS-002 / AUTH-UM-000 continue to track three remote-only migration versions (`20261014024759`, `20261014130516`, `20261014131151`) and the Keycloak migration version mismatch.
- PR #60 is closed as superseded by PR #64. PR #62 is retained as the source of the incident evidence until the updated task-queue/roadmap PR replaces it. PR #63 remains a draft cache mitigation; its code and tests passed on the old head but it still needs porting to the current master branch and exact-head validation.

## Verified current state

## Historical UM-2A suspension-enforcement migration checkpoint — 2026-10-26 (superseded by later rechecks)

- **Owner-confirmed environment:** The owner confirms the two authorized repositories share one Supabase project and classifies it as non-production. Read-only discovery identifies project ref gtqovpusfyyvxpeezxlo, region ap-southeast-1; the only listed branch is default main / Git master, non-persistent, and its metadata reports MIGRATIONS_FAILED. This platform status is retained as evidence rather than interpreted as the owner's environment classification. No Supabase branch was created.
- **Applied migration:** The exact SQL source from the UM-2A branch was applied using the connected Supabase migration tool. The remote ledger records 20261026080831 auth_user_status_enforcement; the source is tracked at supabase/migrations/20261026080831_auth_user_status_enforcement.sql on the clean dedicated branch, with SQL bytes unchanged from the applied payload.
- **Post-apply verification:** Read-only catalog inspection confirms public.users.status text NOT NULL DEFAULT 'ACTIVE', a check constraint allowing only ACTIVE | SUSPENDED, and auth_create_refresh_session(uuid,uuid,uuid,text,timestamptz,text,text) RETURNS boolean as SECURITY DEFINER with fixed search_path=pg_catalog, public, pg_temp. anon and authenticated have no EXECUTE on this RPC; service_role and owner postgres do. Related refresh/MFA/passkey RPCs remain server-role-only with fixed search paths. No user/account rows were selected or individually mutated.
- **Historical boundaries at apply time:** At this checkpoint, lifecycle mutation code had not yet merged. Subsequent PRs #61 and #64 merged suspension enforcement and lifecycle API/UI. No live user was suspended or session revoked by this checkpoint; no app release or trading operation occurred. GitHub/Supabase project metadata does not expose the configured repository/deploy toggle for its Git integration, so no independent claim is made about that toggle.
- **Follow-up (current):** UM-2A/UM-2B implementation is merged. Keep UM-4 integration blocked until target/environment mapping is authoritative and any proposed write has separate exact-operation authorization. Never create a Supabase branch without `get_cost` and explicit cost approval.

- `src/auth/auth.repository.ts` uses the existing shared Supabase project and `@supabase/supabase-js`; live `public.users` columns are `id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted,created_at,updated_at,status`; `status` is non-null with default `ACTIVE` and a check allowing `ACTIVE | SUSPENDED`.
- Signup assigns `USER`. The NestJS API has signup/login/`me`/refresh/logout and MFA/passkey flows. The read-only `/api/admin/users` list/detail endpoints and typed server-side audit writer are merged; lifecycle role/status/session-revocation endpoints and confirmation UI were subsequently merged in PR #64. A public audit-read API remains unimplemented.
- Live `public.auth_admin_audit_events` is RLS-enabled with no policies/direct table privileges; `auth_record_admin_audit_event` has a fixed search path and EXECUTE only for `service_role` plus owner `postgres`.
- Live `public.auth_mfa_login_challenges` and five RPCs are present in the connected project; their source migration, application changes and tests were merged in PR #55 at `7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7`. Current password/passkey MFA completion uses a server-issued challenge, not caller-supplied `userId`.
- The connected project has only a non-persistent `main` branch (Git branch `master`) with `MIGRATIONS_FAILED`, while project API status is `ACTIVE_HEALTHY`. Auth's historical owner-confirmed non-production note conflicts with TCE's private-production wording and live `env=prod` logs; for new operations treat target/environment mapping as unresolved. The Supabase Preview check on PR #55 was skipped, not a migration pass.
- No account rows or raw secrets were read in this run; all database checks were catalog, privilege, migration-ledger, advisor and aggregate-log queries.

## Authentication and suspension enforcement path map — source inspection 2026-10-26

- **Password login:** Current `AuthService.login` verifies credentials and rejects non-`ACTIVE` accounts. MFA-enabled accounts receive an opaque server-issued challenge token; no JWT or refresh cookie is issued until challenge completion. PR #55 is merged.
- **Refresh:** `AuthService.refresh` uses `auth_rotate_refresh_session`; the replacement refresh token remains in an HttpOnly cookie and only the access token is returned in JSON. The live `public.users.status` field and source migration enforce `ACTIVE`-only refresh/session rotation; suspended/invalid refreshes clear the cookie and do not issue an access token.
- **MFA:** Current completion is bound to a hashed, server-issued, short-lived challenge; TOTP consumption and recovery-code/challenge consumption are atomic through the tracked RPCs. The duplicate unregistered `src/auth/mfa.controller.ts` was removed in merged PR #55.
- **Passkey:** `PasskeyService.authenticationVerify` validates and consumes the WebAuthn challenge, checks the account is `ACTIVE`, updates the credential counter, and routes MFA-enabled users through the same server-issued challenge as password login. Non-MFA active accounts proceed to session issuance.
- **Suspension enforcement:** Current source checks account status on password/Keycloak login, session issuance, MFA completion, passkey authentication/registration, and refresh/session RPCs. Lifecycle API/UI is merged in PR #64; live end-to-end lifecycle integration remains blocked.
- **Live contract:** The four source-required auth RPCs, audit RPC and five MFA challenge RPCs exist in the connected catalog with fixed search paths and `service_role`/owner EXECUTE. Migration-history drift and environment classification remain separate blockers.

## Applied auth RPC migration — 2026-10-26T10:09+07:00

The source migration `20261026030920_auth_persistence_rpc_contract_reconcile.sql` and browser-grant revocation migration `20261026032152_revoke_browser_auth_table_privileges.sql` are tracked on master. Read-only catalog checks confirm the four source-required RPC signatures and service-role/owner EXECUTE privileges. The live ledger also contains audit versions `20261026035340`/`20261026035431` and MFA challenge version `20261026040431`; both audit and MFA challenge source are on master (MFA challenge merged in PR #55).

Historical checkpoint; later task instructions require separate authorization for each exact migration operation: the branch reported `MIGRATIONS_FAILED` and Supabase Preview was skipped because no branch was associated and preview-branch creation was disabled. That skipped check is not integration evidence; no Supabase branch was created.

A single aggregate log query found `auth_rotate_refresh_session` with SQLSTATE `42P01` at `2026-10-26T00:32:48Z`, before `20261026030920`; the same query returned no matching later error. Recheck only after an approved non-production integration test; do not execute mutating RPCs against the current target.

## Auth persistence browser-grant remediation — 2026-10-26T03:21:59Z

The live catalog confirms browser-role direct privileges were removed from the five legacy Auth tables. The audit and MFA challenge tables are also RLS-enabled with no direct table grants, including for `service_role`; their server-only SECURITY DEFINER RPCs are the application access path.

The latest read-only security advisor reports 34 project-wide `rls_enabled_no_policy` findings. This is a shared-project count across schemas, not an Auth-only exposure count; no public policy was added to silence it. The performance advisor still notes unindexed foreign keys on `auth_passkey_challenges.user_id` and `refresh_sessions.replaced_by`; no DDL was performed. Project-wide GraphQL exposure findings span unrelated tables and were not changed as part of this Auth task.

## Login/refresh/passkey regression coverage — 2026-10-26

[PR #52](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/52) is merged at `aae24d8adb793ee9ec3201fd5c98c77fb3cf1cbd`. Exact-head service CI [#40264453765](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40264453765) passed the consolidated login/refresh/passkey failure-contract suite. These tests use in-memory mocks and do not claim live database integration. The later server-issued MFA challenge was merged in PR #55; legacy PR #10 remains open and unchanged. Legacy PR #10 remains open and unchanged; it was not merged or modified by this automation.

## Historical UM-1B audit persistence checkpoint — 2026-10-26 (superseded by UM-2B)

[PR #54](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/54) is merged at `533fd4f6809c187759231d109fe7ac05239271c9`. The audit table/RPC and typed allowlisted writer are on master. Exact-head CI [#40266935252](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40266935252) and post-merge service CI [#40267173209](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40267173209) passed. Supabase Preview was skipped because no branch was associated and preview-branch creation is disabled; no non-production integration pass is implied.

The audit table remains server-only and append-oriented. At this checkpoint, no role/status/session mutation endpoint had been added; PR #64 later merged lifecycle mutations with audit writes in the same RPC transaction. End-to-end atomicity and gateway behavior still need approved integration coverage under UM-4.

## Server-issued MFA challenge — merged in PR #55 on 2026-10-26

The live ledger contains `20261026040431 auth_server_issued_mfa_login_challenges`; matching source, application changes and focused tests were squash-merged in [PR #55](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/55) at `7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7`. The table stores only a unique SHA-256 token hash, user binding, 5-minute expiry, one-time consumption, failed-attempt count and lock timestamp. RLS is enabled with no direct table grants; five SECURITY DEFINER RPCs use fixed `search_path` and EXECUTE is limited to `service_role`/owner `postgres`.

Password and passkey first-factor success share `AuthService.beginMfaLogin()`. TOTP validates then atomically consumes the challenge; recovery uses one RPC transaction to consume both challenge and one-time recovery code. Web state holds the raw token only in memory. PR #55 adds controller, RPC-adapter, passkey-parity, replay, recovery-atomicity and cross-account mismatch tests. Current PR head `a355ed7691ffa08c11ac41cd35a2f98cb022477c` passed service/web/push CI; recheck if the branch changes before merge.

**Historical merge gate:** PR #55 is already merged. Its Supabase Preview check was skipped, and gateway-level rate limiting plus live five-attempt/expiry/recovery integration remain unverified. The current prompt requires separate authorization for each future migration/write operation; UM-4 remains blocked by unresolved target/environment mapping and migration provenance.

## Product decision

Build an **admin-only User Management area** with the NestJS API as the enforcement boundary and the Next.js app as a client.

1. **Phase 1 manages legacy NestJS accounts** in the existing `public.users` table. Preserve password-hash format, JWT claims, MFA/passkey state and refresh-session contract. Never return password hashes, MFA secrets, recovery codes, passkey material, refresh-token hashes or internal security fields.
2. **Keycloak identities remain a separate provider.** If needed, show them as clearly labelled read-only rows initially. Do not claim a local `ADMIN` role can manage Keycloak users. Mutating Keycloak users/roles requires a separate server-side Admin API adapter, least-privilege service account, audited operations, dedicated tests and rollout approval.
3. **Authorization is server-side.** Hiding UI controls is not access control; every admin request must authenticate and authorize the caller.
4. **No public admin bootstrap endpoint.** Signup must never accept `ADMIN`. Initial admin provisioning must be a deliberate, audited operator action, not a public API.
5. **Prefer reversible actions.** Suspend/reactivate and revoke sessions; do not implement permanent delete without a separate retention/privacy decision.

## Initial roles

- `USER`: self-service only; cannot enumerate or mutate other users.
- `ADMIN`: can list/inspect accounts, suspend/reactivate accounts, change application role within policy, and revoke a target user's refresh sessions.
- No role can elevate itself. A caller cannot change their own role, disable the last active administrator, or bypass required step-up/MFA controls.
- For Keycloak tokens, use verified roles from the configured issuer/audience; local database roles must not override Keycloak claims.
- Keep the initial model to `USER | ADMIN`; do not invent tenant roles, custom RBAC, invitations or billing before requirements exist.

## Proposed API contract

Implemented read-only routes:

- `GET /admin/users?query=&role=&page=&limit=` — paginated directory with email search, role filter, bounded page size and allowlisted output.
- `GET /admin/users/:id` — allowlisted account details.

Implemented lifecycle routes (PR #64):

- `PATCH /admin/users/:id/role` — role change with server-side authorization, recent-MFA assurance and atomic audit.
- `PATCH /admin/users/:id/status` — suspend/reactivate with session revocation and authentication-path enforcement.
- `POST /admin/users/:id/revoke-sessions` — revoke active refresh sessions for that user.

Still proposed/not implemented:

- `GET /admin/audit-events` — paginated admin/security events with redaction.

For any future route/schema changes, inspect actual schema and session-revocation semantics. The current `public.users.status` column and lifecycle RPCs are already tracked and present in the connected catalog. Do not guess schema history, and do not apply any further migration without separate authorization for that exact operation.

## Data and audit rules

- Keep the existing shared Supabase project and server-only `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` client. Do not introduce Supabase Auth, a separate `DATABASE_URL`, or Node `pg`.
- Keep RLS enabled and credentials out of browser code.
- Use a dedicated audit table for privileged operations. Record actor/provider, action, target/provider, timestamp, outcome and correlation/request ID; only safe before/after metadata.
- Never log tokens, passwords, MFA secrets, recovery codes, private passkey data or service-role credentials.
- Account status must be enforced in login, refresh, MFA completion and passkey flows, not only in the admin controller.
- Define and test concurrency behavior between suspension, session revocation and refresh rotation.

## Security requirements

- Add a centralized NestJS admin guard/decorator or equivalent policy layer; deny by default and authorize every request.
- Verify tokens server-side (signature, issuer, audience and expiry); never trust caller IDs/roles from request bodies or query strings.
- For legacy JWTs, resolve current account role/status when needed so role changes take effect promptly; do not rely only on stale role claims for high-impact operations.
- Require MFA/step-up for privileged changes if supported safely; otherwise document it as a release gate before enabling mutations.
- Prevent self-escalation, last-admin lockout, IDOR, mass assignment, enumeration abuse and unbounded pagination.
- Use safe error responses and rate limiting on sensitive endpoints. Record successful and failed admin operations without secrets.
- A normal user must remain blocked even when calling endpoints directly.

## UI scope

Add a protected `/admin/users` area only after API authorization exists:

- Searchable, filterable, paginated user table with loading/empty/error states.
- User detail view with only approved profile/security summary fields.
- Explicit confirmation for role change, suspension/reactivation and session revocation.
- Clear provider label (Legacy NestJS vs Keycloak); unsupported Keycloak mutations stay disabled.
- No secrets or tokens shown; UI calls NestJS and never queries Supabase directly.
- Preserve the current login screen and auth-mode behavior. Do not enable Keycloak mode on production hosts as part of this work.

## Delivery phases

### UM-0 — Contract/schema discovery

Inspect actual tables, migrations, role claims, login/refresh/MFA/passkey paths, web auth store, route prefix and tests. Document exact schema and compatibility constraints. Default to legacy-only management until a Keycloak Admin API contract is separately approved.

- **Status (updated 2026-10-26 20:38 +07): BLOCKED for historical migration provenance after two materially different read-only recovery approaches.** Live catalog confirms the current Auth RPC contracts/grants and `public.users.status`; MFA challenge PR #55, suspension enforcement PR #61, and lifecycle API/UI PR #64 are merged. Synthetic database-RPC integration with generated fixtures passed at 20:33 and cleanup was verified, but the application HTTP path remains untested. The owner previously classified the project as non-production; runtime URL-to-ref and GitHub/Supabase integration binding remain unverified from repository config. Do not reconstruct/replay missing migration SQL or perform new writes/migrations without exact authorization.
- **Migration-history drift:** Three remote-only versions (`20261014024759`, `20261014130516`, `20261014131151`) lack source artifacts. Remote `20261020234922 keycloak_identity_persistence` has a local source file versioned `20261014000000`; local `20261012000000_auth_persistence_rpcs.sql` is absent from the remote ledger. Do not reconstruct missing migration contents from names or catalog state.
- **Implemented safe sub-slice:** [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27) adds a GET-only PostgREST OpenAPI readiness contract check using the existing shared service-role credentials. It verifies the four RPC paths used by the current source and fails readiness if they are absent or schema metadata cannot be inspected. Exact tested head `6c5d6ee9d524ee365a07111a7ee04aa4056548ed`; [auth-service CI #40213420324](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40213420324) passed.
- **Historical pre-migration blocker:** Earlier Supabase Preview checks failed with `Remote migration versions not found in local migrations directory`; the current PR #55 Preview check is skipped because preview-branch creation is disabled. Neither result confirms a safe non-production target.
- **Safety:** This automation run performed read-only schema/ledger/advisor/log inspection only. No migration apply, Supabase branch creation/reset/merge, production data/schema mutation, or application release was performed.

### UM-1 — Secure admin API foundation (implemented)
**Status:** UM-1A/UM-1B merged. The centralized deny-by-default AdminGuard, allowlisted read responses, typed server-side audit writer and RPC-only audit access are implemented and covered by service tests. Lifecycle mutations were held until the UM-2 authorization/recent-MFA/concurrency/audit gates passed.

### UM-2 — Account lifecycle

**Status (updated 2026-10-26): IMPLEMENTATION MERGED; UM-4 PARTIAL.** UM-2A status enforcement is in ledger version `20261026080831 auth_user_status_enforcement`; suspension enforcement PR #61 and lifecycle API/UI PR #64 are merged. Source includes active-admin authorization, recent-MFA assurance, self-change and last-active-admin protections, advisory locking and atomic audit. A controlled synthetic database-RPC integration passed at 20:33 with fixture cleanup verified; application HTTP/cookie/MFA/passkey/gateway acceptance remains open. Runtime URL-to-project binding is not independently confirmed by repository config. Never use real account rows or treat this DB-RPC test as production rollout evidence.

The list/detail, role-change, suspension/reactivation and session-revocation routes are implemented in the merged UM-2 slices. Preserve the existing guards: active-admin authorization in the RPC, recent signed MFA on privileged routes, self-change and last-active-admin protections, session revocation, and atomic audit. Any future additive migration requires separate authorization for that exact operation and an authoritative safe target; UM-4 integration remains blocked.

### UM-3 — Admin UI
The protected users directory and confirmation-based lifecycle flows are implemented. Preserve API/component tests, responsive layout, keyboard accessibility and error handling. UI checks are supplementary; server-side authorization remains authoritative.

- **Status (2026-10-26): IMPLEMENTED; INTEGRATION ACCEPTANCE OPEN.** The read-only directory, query/security-contract tests and keyboard-accessible dialog are merged. PR #64 later added confirmation-based role/status/session lifecycle controls, backed by protected NestJS endpoints. Exact-head service/web CI passed on PR #64; UM-4 still needs controlled integration against an authoritative safe target.
- **Status after browser verification:** PR #43 was superseded and PR #45 was replaced by [PR #47](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/47), which is merged at `3af07f3749d970fe4ee084a953168c7f1ddd5975`. The Node 24 + Chrome DevTools Protocol test mocks Auth/admin APIs and verifies focus management, non-admin denial, and accessible scrolling; all 10 browser tests passed on the exact head and post-merge auth-web/auth-service CI passed. The previous Supabase Preview migration-history failure is tracked separately in AUTH-OPS-002 and is not evidence that the browser change or later applied Auth migrations failed. Lifecycle UI is implemented by PR #64; do not treat source/CI coverage as live integration evidence.
- **Historical schema blocker (pre-migration):** The Supabase Preview app check failed on the subsequent PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` with `Remote migration versions not found in local migrations directory`; PR #24's own check was skipped because no Supabase branch was associated. The four-RPC source/live mismatch has since been reconciled; remaining remote-only migration provenance is tracked under AUTH-UM-000.

### UM-4 — Verification and controlled rollout
Run backend tests, typecheck, lint/build and frontend typecheck/lint/build. Add integration tests against non-production Supabase for authorization, lifecycle, session revocation, MFA/passkeys and login compatibility. Verify schema, RLS, grants, audit redaction, CORS/cookies and gateway routes. Use dedicated branch and PR; never merge/deploy or run production migrations automatically. Production rollout requires review and existing GitOps gates.

## Acceptance criteria

- Existing login/signup/JWT/MFA/passkey/refresh-cookie behavior remains compatible for active accounts.
- A normal user cannot enumerate accounts, inspect another account, change roles/status or revoke another user's sessions.
- Every privileged operation is auditable; only allowed operations are available to admins.
- Suspension is enforced across authentication entry points and refresh sessions follow a documented revocation contract.
- Self-escalation and last-admin lockout are prevented by server checks and tests.
- No credential, token, MFA secret, recovery code or private passkey data appears in responses/logs.
- Keycloak identities are never silently treated as legacy users; Keycloak mutation remains disabled until a separate least-privilege Admin API adapter is approved.
- CI results are reported honestly; this work makes no production changes.


## Task tracking

Stable task IDs, implementation evidence and current blockers are maintained in [docs/plan/user-management-tasks.md](plan/user-management-tasks.md). This file remains the architecture and API-contract baseline; keep detailed task status in the canonical queue rather than duplicating it here.

## References

- Current code: `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/auth/auth.repository.ts`, `src/auth/keycloak/`, `web/src/services/auth-api.ts`.
- Current architecture: `README.md`, `docs/web-ui-integration.md`, `docs/keycloak-oidc-foundation.md`.
- Authorization baseline: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — deny by default, least privilege, per-request server-side checks and authorization tests.
- **Source-level regression sub-slice:** [AUTH-UM-004A / draft PR #70](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/70) adds suspended-refresh and status-enforcement migration-contract tests. These tests do not replace controlled end-to-end integration against an explicitly approved non-production target.

## Latest read-only scheduled recheck — 2026-10-26 17:55 +07:00

- **Supabase identity and branch:** `list_projects/get_project` identifies only project `gtqovpusfyyvxpeezxlo` in organization `jopjvkofwvbnxaajkhlo`, `ap-southeast-1`, PostgreSQL `17.6.1.084`, API `ACTIVE_HEALTHY`. `list_branches` returns only non-persistent default `main` / Git `master`, status `MIGRATIONS_FAILED`; no preview branch was listed. Auth records historical owner-confirmed non-production, TCE records conflicting private-production wording, and current aggregate logs contain `env=prod` tags. Treat target/environment classification as unresolved for new operations.
- **Live Auth contract:** `public.users.status` is non-null `ACTIVE` by default; role is non-null `USER` by default. All 14 current public `auth_%` RPCs have fixed `search_path=pg_catalog, public, pg_temp`, `SECURITY DEFINER`, and EXECUTE only for `service_role` plus owner `postgres`. No direct `anon`/`authenticated` privileges were found on the inspected Auth tables; no policies were returned for those Auth tables. No account rows, hashes, MFA material, recovery data or passkey records were read.
- **Migration provenance:** Ledger remains 77 entries through `20261026084506`. Remote-only `20261014024759`, `20261014130516`, `20261014131151` have no exact source files in the two authorized repositories. Local `20261012000000_auth_persistence_rpcs.sql` is absent from the remote ledger; local `20261014000000_keycloak_identity_persistence.sql` does not match remote version prefix `20261020234922` despite the same migration name. Do not reconstruct or replay historical SQL.
- **Current safety gate:** This task's instruction supersedes historical broad migration authorization. No migration, schema/data write, Supabase branch creation, function deployment, app release or trading action occurred. Any future migration requires separate authorization for that exact operation; any Supabase branch with possible cost requires `get_cost` and explicit cost approval.

## Latest scheduled read-only verification — 2026-10-26 19:05 +07:00

- **Project discovery and mapping:** Read-only organization/project discovery returns organization `jopjvkofwvbnxaajkhlo` and the sole project `gtqovpusfyyvxpeezxlo` (`phanthienquoc's Project`, `ap-southeast-1`, PostgreSQL 17.6.1, API status `ACTIVE_HEALTHY`). `list_branches` returns only non-persistent default `main` / Git `master`, status `MIGRATIONS_FAILED`; no preview branch is listed. Repository docs identify this as the shared project, but runtime binding is not independently confirmed by config/CI: Auth `.env.example` still uses `YOUR_PROJECT_REF`, TCE `apps/service/.env.auth.example` leaves `SUPABASE_URL` blank, and TCE `docs/config-key.md` points to hidden GitHub Actions/runtime configuration. GitHub/Supabase repository connection and deploy toggle are not exposed by the authorized tools. Keep that mapping gate explicit.
- **Live Auth schema and privileges:** Read-only catalog inspection confirms `public.users.status` is `NOT NULL DEFAULT 'ACTIVE'`, and `role` is `NOT NULL DEFAULT 'USER'`. Inspected Auth tables have RLS enabled and no policies; `anon` and `authenticated` have no direct table privileges on `users`, `refresh_sessions`, MFA recovery, passkey, MFA challenge, audit, or Keycloak identity tables. Server-role table access is present only where needed; audit/challenge tables remain RPC-only. All 14 current public `auth_%` routines are `SECURITY DEFINER`, fixed to `search_path=pg_catalog, public, pg_temp`, with EXECUTE for `service_role` and owner `postgres`, not browser roles.
- **Code-path review:** `SignupDto` contains only email/password; `AuthService.signup` hardcodes `role: 'USER'`. Login rejects non-`ACTIVE` accounts before MFA challenge/session creation; refresh clears the refresh cookie on failure; passkey registration/authentication checks active status before issuing a session. Public-user projection is allowlisted. Admin routes use controller-level `AdminGuard`; lifecycle RPC source prevents self role changes and last-active-admin demotion/suspension under a shared transaction lock and writes privileged audit events transactionally. No code change was needed from this review.
- **Migration provenance:** The remote ledger still contains 77 entries through `20261026084506 auth_admin_user_lifecycle_rpcs`. Remote versions `20261014024759`, `20261014130516`, and `20261014131151` still have no exact source files in the two authorized repositories; local `20261012000000_auth_persistence_rpcs.sql` is absent from the remote ledger, and the local Keycloak identity migration version does not match remote `20261020234922`. No historical SQL was reconstructed.
- **Advisors:** Security advisor reports 34 project-wide RLS-enabled/no-policy findings; performance advisor reports 15 unindexed foreign keys, including already-tracked `auth_passkey_challenges.user_id` and `refresh_sessions.replaced_by`. These are scoped/project-wide observations, not a reason to mass-change unrelated schemas.
- **Exact-head validation:** Auth PR #68 head `dcf1a4d822758943e093cf6cd95b865cdf81bb1a` passed Auth Service CI [#40313090236](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40313090236), including tests, typecheck, build, and container build. PR #70 head `d769ceb23b14e1b160638320f56d088cdcd1f28e` passed [#40305791232](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40305791232). Both remain open/draft.
- **Safety gate:** The historical owner-confirmed non-production classification is retained as history, but the current instruction requires separate authorization for each exact migration/write/deploy operation. No migration, Supabase branch creation, schema/data write, function deployment, app release, or live account mutation occurred. Keep merge gated until repository/project integration and all default-branch side effects are authoritative.


## Controlled UM-4 database-RPC integration — 2026-10-26 20:33 +07:00

- **Target:** Owner-confirmed shared non-production project `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, PostgreSQL 17.6.1. `list_branches` still returns only non-persistent default `main` / Git `master` with status `MIGRATIONS_FAILED`. No Supabase branch was created.
- **Contract preflight:** `public.users.status` is `text NOT NULL DEFAULT 'ACTIVE'`, constrained to `ACTIVE`/`SUSPENDED`; role is constrained to `USER`/`ADMIN`. Live role/status/session-revocation RPC signatures and return types match tracked source; they are `SECURITY DEFINER`, use fixed `search_path=pg_catalog, public, pg_temp`, and grant EXECUTE only to `service_role` and owner `postgres`. The audit writer validates action/outcome/reason/request-id and stores no token, hash, MFA, recovery or passkey material.
- **Synthetic integration:** One atomic PostgreSQL `DO` statement created three generated synthetic users and temporary refresh sessions, then asserted:
  - active-user refresh-session creation succeeds;
  - suspending a synthetic user changes status to `SUSPENDED` and revokes its existing session;
  - a suspended user cannot create a new refresh session;
  - reactivation succeeds and allows a new session;
  - explicit session revocation marks the active synthetic session revoked;
  - a non-admin actor is denied role mutation;
  - self-role change and self-suspension are denied, leaving the synthetic admin active;
  - invalid audit request-id validation raises an error and the attempted role mutation rolls back;
  - a valid role promotion succeeds and audit events are written.
- **Cleanup verification:** A separate read-only query returned `synthetic_users_remaining=0`, `synthetic_sessions_remaining=0`, and `synthetic_audit_events_remaining=0`. The integration used only generated synthetic IDs and filtered verification/cleanup to the fixture prefix; no real account rows or credential material were read. No migration or schema change was applied.
- **Remaining UM-4 scope:** This validates database RPC behavior, not the complete deployed HTTP path. Login, application refresh-cookie flow, MFA/recovery, passkey, CORS/CSRF, rate limiting, gateway forwarding and audit/response redaction still need application-level integration against an authoritative runtime binding.
- **Migration/operations diagnostics:** In the 2026-10-26 12:30–13:30 UTC log window, 44 PostgREST timeout-manager events were returned (latest `13:28:36.768Z`) and two workflow migration errors reported remote versions absent from the local migrations directory (latest `12:35:12.429Z`). Historical remote-only migration versions `20261014024759`, `20261014130516`, and `20261014131151`, plus the Keycloak timestamp mismatch, remain unresolved. No migration was applied during this integration run; each future migration operation still requires exact authorization.
- **Current status:** UM-1/UM-2/UM-3 implementation remains merged. UM-4 is **PARTIAL**: synthetic DB-RPC integration passed; application-level end-to-end acceptance remains open.



## Cross-repository migration inventory — 2026-10-26 20:33 +07:00

A read-only comparison of the live 78-entry Supabase ledger against current `master` migration directories in the two authorized repositories found 9 Auth SQL files and 36 TCE SQL files, with only 13 exact version-prefix matches. Sixty-five ledger versions have no matching source file in either directory; 32 source-file entries have version prefixes absent from the ledger, including duplicate TCE prefixes. Earlier references to three Auth-specific remote-only versions were a subset, not a complete inventory. A second recovery approach—exact-path GitHub commit history plus code search in both authorized repositories—returned no authoritative source for eight representative missing paths; provenance is BLOCKED after two materially different read-only attempts. The only listed Supabase branch remains non-persistent `main` / Git `master` with `MIGRATIONS_FAILED`. Do not infer or reconstruct missing SQL, apply/replay migrations, create a Supabase branch, or merge migration-bearing PRs until source provenance, integration target and exact authorization are resolved. This comparison did not inspect any repository outside the authorized pair.


## Latest scheduled read-only verification — 2026-10-26 20:38 +07:00

- **Project/branch identity:** Read-only discovery returned organization `jopjvkofwvbnxaajkhlo` and the sole project `gtqovpusfyyvxpeezxlo` (`ap-southeast-1`, PostgreSQL 17.6.1, API `ACTIVE_HEALTHY`). The only listed branch is non-persistent default `main` / Git `master`, status `MIGRATIONS_FAILED`; no separate preview branch is listed.
- **Runtime binding:** Owner history classifies the project as non-production, but Auth `.env.example` uses a placeholder and TCE `apps/service/.env.auth.example` leaves `SUPABASE_URL` blank. The GitHub/Supabase repository connection and deploy target are not exposed by the authorized tools. Environment classification and runtime URL-to-ref binding are separate facts; do not infer that a repository push targets this project.
- **Current Auth contracts:** `public.users.role` is non-null/default `USER`; `status` is non-null/default `ACTIVE`. Eight inspected Auth tables have RLS enabled, no policies returned and no direct browser-role table grants. Fourteen current public `auth_%` RPCs are `SECURITY DEFINER`, fixed to `search_path=pg_catalog, public, pg_temp`, and none is executable by `anon` or `authenticated`; EXECUTE remains restricted to `service_role`/owner `postgres`. Existing NestJS login/refresh/MFA/passkey and admin-lifecycle paths enforce active status, server-side admin authorization, allowlisted projections and audit-backed mutations. Keycloak identities remain separate/read-only without an approved Admin API adapter.
- **Migration provenance:** Remote ledger has 78 versions through `20261026122224`. Cross-repository inventory across the two authorized repos found 13 exact version-prefix matches between 78 ledger entries and 45 current SQL files; 65 ledger versions lack matching source files and 32 source-file entries have version prefixes absent from the ledger, including duplicate TCE prefixes. Two read-only recovery approaches did not recover authoritative historical sources; AUTH-UM-000 remains BLOCKED. Do not reconstruct or replay missing SQL.
- **UM-4:** The 20:33 synthetic DB-RPC integration used generated synthetic users/sessions, tested lifecycle authorization and rollback, and verified zero remaining fixture users/sessions/audit events. No application HTTP, cookie, CORS/CSRF, rate-limit, gateway, MFA/recovery or passkey end-to-end test has been demonstrated. The current run performed no write or migration.
- **Logs/advisors:** Bounded log inspection found 10 workflow migration-history errors. A text match against the PostgREST `event_message` field did not reproduce the previously reported timeout-manager burst, so it is not evidence that those events resolved. Project-wide security/performance advisor counts are 35 RLS-enabled/no-policy findings, one security-definer view, eight mutable search paths, 42 anon and 42 authenticated GraphQL exposure findings each, leaked-password protection disabled, 15 unindexed foreign keys, one no-primary-key table and 134 unused indexes. No unrelated schema changes were made.
- **Signup least privilege:** PR #71 hardens the persistence boundary to accept only email/password hash and hardcode `USER`; prior exact code/test head passed Auth Service CI. The current code-only branch must be revalidated after docs are separated into PR #72.
- **Merge gate:** Auth `release.yml` is manual-dispatch-only. Supabase official branching/GitHub integration docs state a connected integration can execute Migrate/Deploy on commits; the actual connection target is not exposed. Keep default-branch merges gated until that target and effects are authoritative. No migration, schema/data write, Supabase branch operation, function deployment, application release or live account mutation occurred in this run.
- **Docs consulted:** [Supabase branching](https://supabase.com/docs/guides/deployment/branching) and [GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration).

## PostgREST bounded follow-up — 2026-10-26 20:50 +07:00

The read-only log window `2026-10-26 13:30:00Z–13:50:00Z` returned 17 PostgREST timeout-manager events on path `/`, latest `13:49:07.102820Z`, and no matching migration-error events. The earlier 12:30–13:30 UTC window had 44 timeout events and two migration errors. The five-minute successful OpenAPI metadata cache remains on master but undeployed; root-cause resolution is not established.


## UM-4 response/audit allowlist follow-up — 2026-10-26 20:55 +07:00

A second atomic synthetic-fixture database-RPC run verified that role/status responses and audit-event JSON do not expose password hashes, encrypted MFA secrets, token hashes, recovery-code, passkey or credential fields. The run required audit events, cleaned its synthetic fixtures, and a subsequent read-only query returned zero matching users, sessions and audit events. Application HTTP response, cookie, MFA/recovery and passkey integration remain open.


## Latest read-only continuation audit — 2026-10-26 21:23 +07:00

- Project and branch: read-only list_projects/get_project confirms project gtqovpusfyyvxpeezxlo in ap-southeast-1, PostgreSQL 17.6.1, API ACTIVE_HEALTHY. Only non-persistent default main / Git master is listed; its status remains MIGRATIONS_FAILED. The live ledger now contains 78 versions through 20261026122224 revoke_public_cashout_event_access. These are separate project/branch diagnostics; no migration was applied in this audit.
- Auth RPC contracts/ACLs: a fresh read-only pg_proc/ACL query returned 14 public auth_% functions. Each is owned by postgres, SECURITY DEFINER, uses fixed search_path=pg_catalog, public, pg_temp, has no EXECUTE for anon/authenticated, and grants EXECUTE to service_role. The lifecycle signatures remain auth_admin_update_user_role(uuid,uuid,text,text,text) RETURNS jsonb, auth_admin_update_user_status(uuid,uuid,text,text,text) RETURNS jsonb, and auth_admin_revoke_user_sessions(uuid,uuid,text,text) RETURNS jsonb; they match the tracked lifecycle migration and service call arguments. The existing server-only Supabase client pattern remains unchanged.
- User Management status: PR #71 is verified merged at 4d5306d18f2ffc5287bee1b16a636fa06c415258; signup persistence hardcodes USER. AdminGuard verifies the JWT and rechecks current database role/status on each admin request; existing tests cover demoted/suspended admins and fail-closed DB/audit errors. UM-4 remains partial because full HTTP/cookie/CORS/CSRF/gateway tests and runtime URL-to-project binding are not yet proven.
- Operational evidence: a bounded PostgREST log query for 2026-10-26 13:23–14:23 UTC showed repeated 'Warp server error: Thread killed by timeout manager' events, latest 2026-10-26T14:22:07.326802Z; a separate workflow-run log recorded one missing-migration-version error in the same window. These observations do not establish a root cause. The project-wide security advisor includes 35 RLS-enabled/no-policy findings, one security-definer-view finding, and eight mutable-search-path warnings; do not label these as Auth-only counts.
- Safety: no real account rows or credential values were read. No migration, schema/data mutation, branch operation, Edge Function deployment, app release, or trading action was performed.
