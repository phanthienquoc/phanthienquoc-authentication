# User Management — Architecture and Delivery Roadmap

## Status and scope

- **Status (authoritative checkpoint 2026-10-26 16:35 +07):** UM-1A/UM-1B, UM-2A, UM-2B and UM-3 are merged. UM-2B [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64) merged at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`; its exact tested head `38a9fe36be7c52a2892c53714027ff1a223035f3` passed Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614) and Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540). The lifecycle source is now on master at the remote ledger version `20261026084506`. UM-4 remains blocked: the owner designates the connected project as non-production, but its sole non-persistent `main` / Git `master` branch reports `MIGRATIONS_FAILED`, runtime logs still tag PostgREST errors `env=prod`, and the Supabase Preview check is skipped. The production-tagged lifecycle application event at `08:45:06Z` remains unexplained; new logs show `Remote migration versions not found in local migrations directory.` at `09:10:00.781Z` and continuing PostgREST root-path timeout events through `09:12:56.922Z`. Actor/origin and exact applied-SQL parity are unknown; remote-only migration provenance and Keycloak version drift remain unresolved. See the canonical task queue.
- **Owner:** Central NestJS authentication service and its Next.js `web/` app.
- **Scope:** This roadmap governs User Management and authentication work only; it does not change TCE or Media consumers.
- **Change record (2026-10-26):** Earlier versions of this document incorrectly described the shared target as non-production and contained stale pre-MFA/pre-status snapshots. The owner explicitly classified this shared project as private production in prior instructions on 2026-10-26; that classification supersedes those labels. The status migration is already present in the remote ledger, but this run did not apply a migration, create/reset/merge a Supabase branch, read account rows or raw secrets, deploy an app/function, or perform a trading action. Runtime URL-to-ref and GitHub integration/deploy-toggle mapping remain unverified from repository config/secret metadata.



## Latest read-only checkpoint — 2026-10-26 16:35 +07:00

- **Environment classification:** The owner explicitly reclassified project `gtqovpusfyyvxpeezxlo` as non-production at `2026-10-26T09:22:30Z`, superseding the earlier private-production label. Project API status is `ACTIVE_HEALTHY`; only branch is default non-persistent `main` / Git `master`, branch status `MIGRATIONS_FAILED`. Runtime PostgREST logs still tag timeout events `env=prod`, so the effective runtime/deployment boundary is inconsistent and must be reconciled before any operation that could trigger migration or deployment.
- **UM-2B:** PR #64 is merged at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`; exact tested head `38a9fe36be7c52a2892c53714027ff1a223035f3` passed Auth Service and Auth Web CI. Lifecycle source is tracked at ledger version `20261026084506`, but the original apply actor and exact applied-SQL parity remain unknown.
- **Latest read-only logs (2026-10-26T09:13:00Z–09:33:00Z):** 20 PostgREST timeout-manager events tagged `env=prod`, path `/`, first at `09:13:58.088234Z`, latest at `09:30:57.908872Z`; three migration executor errors state `Remote migration versions not found in local migrations directory.` at `09:25:23.600887Z`, `09:29:38.981545Z`, and `09:31:43.678930Z`. These confirm continuing symptoms but do not establish actor or causal linkage.
- **Advisors:** Security Advisor at `2026-10-26T09:32:52.781Z` reports 34 RLS-enabled/no-policy findings, one SECURITY DEFINER view, eight mutable-search-path functions, 43 anon and 43 authenticated GraphQL-exposure findings, and leaked-password protection disabled. Performance Advisor reports 15 unindexed foreign keys, one no-primary-key finding and 137 unused indexes. These are project-wide signals; do not alter unrelated TCE/Keycloak objects in this Auth roadmap.
- **Safety:** This run performed read-only catalog/schema/ledger/advisor/log inspection only. No Supabase branch was created, no migration/DDL/config/function change was made, no lifecycle RPC was invoked, no account row was read or mutated, and no release/trading action occurred. The current task requires separate authorization for any migration operation; UM-4 remains blocked until environment labels, migration provenance and integration/deploy behavior are reconciled.


## Latest read-only checkpoint — 2026-10-26 16:13 +07:00

- **Project/environment:** Read-only `list_projects/get_project/list_branches` identifies sole project `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, API status `ACTIVE_HEALTHY`. The only branch is default `main` / Git `master`, non-persistent, with `MIGRATIONS_FAILED`. The owner explicitly reclassified this shared project as non-production at `2026-10-26T09:22:30Z`, superseding the earlier private-production label; runtime logs still tag PostgREST errors `env=prod` and the only branch remains `MIGRATIONS_FAILED`. The runtime URL-to-ref and GitHub integration/deploy setting cannot be independently verified from checked-in configuration or hidden secrets.
- **UM-2B source state:** PR #64 is merged at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`; exact tested head `38a9fe36be7c52a2892c53714027ff1a223035f3` passed Auth Service and Auth Web CI. Lifecycle source is tracked on master at `supabase/migrations/20261026084506_auth_admin_user_lifecycle_rpcs.sql`. Code merge and passing CI are not live integration proof.
- **Live schema/contract:** The remote ledger has 77 entries, including status-enforcement `20261026080831` and lifecycle `20261026084506`. `public.users.status` is text NOT NULL DEFAULT `ACTIVE` with ACTIVE/SUSPENDED constraint. Three lifecycle RPCs return JSONB, are `SECURITY DEFINER`, have fixed `search_path=pg_catalog, public, pg_temp`, and grant EXECUTE only to `service_role`/owner `postgres`; browser roles cannot execute them or SELECT the scoped Auth tables. The audit table intentionally denies direct `service_role` SELECT. No account rows were read.
- **New bounded logs:** From `08:40Z` to `09:13Z`, migration executor logs report `Remote migration versions not found in local migrations directory.` at `2026-10-26T09:10:00.781Z`; PostgREST path `/` timeout-manager events tagged `env=prod` continue through `09:12:56.922Z`. The management-API lifecycle SQL application event at `08:45:06.114Z` still has unknown actor/origin/authorization; source merge does not prove original apply provenance or exact SQL parity.
- **Advisors:** Security Advisor observed at `2026-10-26T09:13:54Z` reports 34 project-wide RLS-enabled/no-policy findings, one SECURITY DEFINER view, eight mutable-search-path functions, 43 anon and 43 authenticated GraphQL-exposure findings, and leaked-password protection disabled. Performance Advisor reports 15 unindexed foreign keys and 137 unused indexes. These are project-wide signals; do not alter unrelated TCE/Keycloak objects in this Auth roadmap.
- **Safety:** This run performed read-only catalog/schema/ledger/advisor/log inspection only. No Supabase branch was created, no migration/DDL/config/function change was made, no lifecycle RPC was invoked, no production account row was read or mutated, and no release/trading action occurred. UM-4 and migration-bearing integration remain blocked until a separately approved non-production target and integration/deploy mapping are established.


## Verified current state

## UM-2A suspension-enforcement migration — 2026-10-26

- **Environment and branch:** The owner classified this shared project as private production. Read-only discovery identifies project ref gtqovpusfyyvxpeezxlo, region ap-southeast-1; the only listed branch is default main / Git master, non-persistent, with status MIGRATIONS_FAILED. No Supabase branch was created in this run.
- **Existing applied migration (historical state; read-only verification this run):** The remote ledger already records 20261026080831 auth_user_status_enforcement, and the source file supabase/migrations/20261026080831_auth_user_status_enforcement.sql is present on master. This run did not apply or replay it. Its presence is not authorization to apply further production migrations.
- **Post-apply verification:** Read-only catalog inspection confirms public.users.status text NOT NULL DEFAULT 'ACTIVE', a check constraint allowing only ACTIVE | SUSPENDED, and auth_create_refresh_session(uuid,uuid,uuid,text,timestamptz,text,text) RETURNS boolean as SECURITY DEFINER with fixed search_path=pg_catalog, public, pg_temp. anon and authenticated have no EXECUTE on this RPC; service_role and owner postgres do. Related refresh/MFA/passkey RPCs remain server-role-only with fixed search paths. No user/account rows were selected or individually mutated.
- **Boundaries:** This run performed catalog, privilege, migration-ledger, advisor and aggregate-log reads only. No live user was suspended, no session was revoked through lifecycle RPCs, no Edge Function/app release occurred, and no trading operation was performed. Earlier non-production labels were inaccurate; the target must be treated as private production. GitHub/Supabase project metadata does not expose the connected repository/deploy toggle.
- **Follow-up:** PR #64 has now merged the lifecycle API/UI and source migration to master. Keep live integration and any further migration-bearing change blocked until the unexpected `env=prod` apply is reconciled, exact applied-SQL parity is established, and the Supabase integration/deploy target is verified. Do not execute lifecycle RPCs or replay migrations against this private-production project; the Preview check is skipped and is not integration evidence. No Supabase branches should be created.

- src/auth/auth.repository.ts uses the existing shared Supabase project and @supabase/supabase-js; live public.users columns are id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted,created_at,updated_at,status. status is text NOT NULL DEFAULT 'ACTIVE', constrained by users_status_check to ACTIVE | SUSPENDED.
- Signup assigns `USER`. The NestJS API has signup/login/`me`/refresh/logout and MFA/passkey flows. PR #64 adds protected role/status/session-revocation endpoints and confirmation-based admin-directory controls through the NestJS API only. The current-role AdminGuard and recent signed MFA assurance remain server-side; the UI is not an authorization boundary. Do not call lifecycle RPCs against the connected private-production project.
- Live `public.auth_admin_audit_events` is RLS-enabled with no policies/direct table privileges; `auth_record_admin_audit_event` has a fixed search path and EXECUTE only for `service_role` plus owner `postgres`.
- Live public.auth_mfa_login_challenges and its five RPCs are present in the connected catalog and the default-branch source since PR #55 merged at 7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7.
- The connected project has only a non-persistent main branch (Git branch master) with MIGRATIONS_FAILED. The owner explicitly classified it as private production. The Supabase Preview check on PR #60 is skipped, not a migration pass; the GitHub integration target and deploy-to-production toggle remain unverified.
- No account rows or raw secrets were read in this run; all database checks were catalog, privilege, migration-ledger, advisor and aggregate-log queries.

## Authentication and suspension enforcement path map — source inspection 2026-10-26

- **Password login:** `AuthService.login` verifies credentials. On master, an MFA-enabled account still returns `mfaRequired + userId`; PR #55 changes this to an opaque server-issued challenge and withholds JWT/refresh cookie until challenge completion.
- **Refresh:** `AuthService.refresh` uses `auth_rotate_refresh_session` and returns an access token while keeping the refresh token in the HttpOnly cookie. The live RPC signature/privileges match the current repository contract; the live `public.users` schema has no status field, so suspension cannot currently be enforced here.
- **MFA:** On master, registered completion still accepts `userId + code`. PR #55 replaces that with a hashed server-issued challenge, atomic TOTP consumption, and one RPC transaction for recovery-code/challenge consumption. The duplicate `src/auth/mfa.controller.ts` was unregistered and is removed in PR #55.
- **Passkey:** `PasskeyService.authenticationVerify` validates the WebAuthn challenge and updates the credential counter. PR #55 routes MFA-enabled passkey success through the same challenge issuance method as password login; non-MFA accounts still proceed to normal session issuance.
- **Suspension gap:** None of the login, refresh, MFA or passkey paths can enforce a status/suspension flag until an approved status schema exists. No mutation route is added by this roadmap update.
- **Live contract:** The four source-required auth RPCs, audit RPC and five MFA challenge RPCs exist in the connected catalog with fixed search paths and `service_role`/owner EXECUTE. Migration-history drift and environment classification remain separate blockers.

## Applied auth RPC migration — 2026-10-26T10:09+07:00

The source migration `20261026030920_auth_persistence_rpc_contract_reconcile.sql` and browser-grant revocation migration `20261026032152_revoke_browser_auth_table_privileges.sql` are tracked on master. Read-only catalog checks confirm the four source-required RPC signatures and service-role/owner EXECUTE privileges. The live ledger also contains the later audit versions `20261026035340`/`20261026035431` and MFA challenge version `20261026040431`; audit source is on master, while MFA challenge source remains on PR #55.

The current project branch status remains MIGRATIONS_FAILED. The owner explicitly classified the shared project as private production; the Supabase Preview check is skipped because no branch is associated and preview-branch creation is disabled. This run did not apply a migration or create a Supabase branch. Do not use the current target for lifecycle integration tests.

A single aggregate log query found `auth_rotate_refresh_session` with SQLSTATE `42P01` at `2026-10-26T00:32:48Z`, before `20261026030920`; the same query returned no matching later error. Recheck only after an approved non-production integration test; do not execute mutating RPCs against the current target.

## Auth persistence browser-grant remediation — 2026-10-26T03:21:59Z

The live catalog confirms browser-role direct privileges were removed from the five legacy Auth tables. The audit and MFA challenge tables are also RLS-enabled with no direct table grants, including for `service_role`; their server-only SECURITY DEFINER RPCs are the application access path.

The latest read-only security advisor reports 34 project-wide `rls_enabled_no_policy` findings. This is a shared-project count across schemas, not an Auth-only exposure count; no public policy was added to silence it. The performance advisor still notes unindexed foreign keys on `auth_passkey_challenges.user_id` and `refresh_sessions.replaced_by`; no DDL was performed. Project-wide GraphQL exposure findings span unrelated tables and were not changed as part of this Auth task.

## Login/refresh/passkey regression coverage — 2026-10-26

[PR #52](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/52) is merged at `aae24d8adb793ee9ec3201fd5c98c77fb3cf1cbd`. Exact-head service CI [#40264453765](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40264453765) passed the consolidated login/refresh/passkey failure-contract suite. The tests use in-memory mocks; they do not claim live database integration or resolve the separate server-issued MFA challenge requirement tracked by PR #55. Legacy PR #10 remains open and unchanged; it was not merged or modified by this automation.

## UM-1B audit persistence — applied 2026-10-26

[PR #54](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/54) is merged at `533fd4f6809c187759231d109fe7ac05239271c9`. The audit table/RPC and typed allowlisted writer are on master. Exact-head CI [#40266935252](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40266935252) and post-merge service CI [#40267173209](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40267173209) passed. Supabase Preview was skipped because no branch was associated and preview-branch creation is disabled; no non-production integration pass is implied.

The audit table remains server-only and append-oriented. PR #64 adds lifecycle mutations that write audit events atomically through server-role-only RPCs; approved non-production integration coverage for audit rollback/consistency is still required before rollout.

## Server-issued MFA challenge — applied 2026-10-26

The live ledger contains 20261026040431 auth_server_issued_mfa_login_challenges; its matching source, application changes and focused tests are on master because PR #55 merged at 7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7. The table stores only a unique SHA-256 token hash, user binding, five-minute expiry, one-time consumption, failed-attempt count and lock timestamp. RLS is enabled with no direct table grants; five SECURITY DEFINER RPCs use fixed search_path and EXECUTE is limited to service_role/owner postgres.

Password and passkey first-factor success share `AuthService.beginMfaLogin()`. TOTP validates then atomically consumes the challenge; recovery uses one RPC transaction to consume both challenge and one-time recovery code. Web state holds the raw token only in memory. PR #55 adds controller, RPC-adapter, passkey-parity, replay, recovery-atomicity and cross-account mismatch tests. Current PR head `a355ed7691ffa08c11ac41cd35a2f98cb022477c` passed service/web/push CI; recheck if the branch changes before merge.

**Current merge/integration gate:** PR #64 has merged the UM-2B source/API/UI and lifecycle migration source. The owner now designates the project non-production, but the runtime `env=prod` log tag and `MIGRATIONS_FAILED` branch status conflict with that classification. Do not replay the migration or invoke lifecycle RPCs until that boundary, original apply provenance, exact applied-SQL parity, remote-only migration versions and Supabase integration/deploy target are reconciled; any migration operation still requires separate authorization. Preview is skipped and does not validate integration.

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

Remaining proposed routes (not implemented):

- `PATCH /admin/users/:id/role` — role change with privileged caller and audit record.
- `PATCH /admin/users/:id/status` — suspend/reactivate; requires an approved status schema and enforcement across all authentication paths.
- `POST /admin/users/:id/revoke-sessions` — revoke active refresh sessions for that user.
- `GET /admin/audit-events` — paginated admin/security events with redaction.

Before implementing these routes, inspect actual schema and session-revocation semantics. If `public.users` lacks a status column, propose an additive migration only after verifying actual columns, constraints, indexes, grants, RLS policies and consumer assumptions. Never guess the production schema or apply migrations automatically.

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

- **Status (authoritative 2026-10-26 16:13 +07): PARTIALLY RECONCILED.** Live catalog confirms the core auth RPCs, audit RPC/table, MFA challenge RPCs, `public.users.status`, session-creation RPC and all three lifecycle mutation RPCs with server-only grants. The lifecycle source is now on master via PR #64 at ledger version `20261026084506`, but the original `env=prod` application event remains unexplained and exact applied-SQL parity is not established. Three remote-only migration versions and a Keycloak version mismatch remain unresolved. Treat the shared project as private production; this run performed read-only inspection only.
- **Migration-history drift:** Three remote-only versions (`20261014024759`, `20261014130516`, `20261014131151`) lack source artifacts. Remote `20261020234922 keycloak_identity_persistence` has a local source file versioned `20261014000000`; local `20261012000000_auth_persistence_rpcs.sql` is absent from the remote ledger. Do not reconstruct missing migration contents from names or catalog state.
- **Implemented safe sub-slice:** [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27) adds a GET-only PostgREST OpenAPI readiness contract check using the existing shared service-role credentials. It verifies the four RPC paths used by the current source and fails readiness if they are absent or schema metadata cannot be inspected. Exact tested head `6c5d6ee9d524ee365a07111a7ee04aa4056548ed`; [auth-service CI #40213420324](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40213420324) passed.
- **Historical pre-migration blocker:** Earlier Supabase Preview checks failed with Remote migration versions not found in local migrations directory. At the historical PR #55 checkpoint the Preview check was skipped because preview-branch creation was disabled; PR #55 is now merged, and a skipped check is not non-production integration evidence.
- **Safety:** This automation run performed read-only schema/ledger/advisor/log inspection only. No migration apply, Supabase branch creation/reset/merge, production data/schema mutation, or application release was performed.

### UM-1 — Secure admin API foundation
Implement principal resolution and a centralized admin guard, allowlisted response DTOs and authorization tests. Add audit persistence. Do not expose mutation endpoints before authorization/audit tests pass.

### UM-2 — Account lifecycle

**Status (authoritative 2026-10-26 16:13 +07): IMPLEMENTED / INTEGRATION BLOCKED.** UM-2A status enforcement and UM-2B lifecycle source/API/UI are merged (PR #64 at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`). The remote ledger includes `20261026084506 auth_admin_user_lifecycle_rpcs`; live catalog confirms all three lifecycle RPCs. The `env=prod` management-API application event at `2026-10-26T08:45:06.114Z` remains unexplained; source merge does not prove who initiated the original apply or exact SQL parity. Do not replay or call lifecycle RPCs against the connected private-production project.

**Session-revocation boundary:** `auth_admin_revoke_user_sessions` revokes persisted `refresh_sessions`; it does not revoke already-issued stateless access JWTs. `JwtService` defaults to a 900-second TTL and this repository has no `jti` denylist. Consumers that validate only signature/expiry may accept an already-issued token until expiry; `/auth/me` and the database-backed AdminGuard re-check current user/status, while downstream behavior depends on the integration contract. Confirm whether this bounded window is acceptable before claiming immediate global session invalidation.

Implement list/detail, role change, suspension/reactivation and session revocation only after the schema and environment gates clear. Additive migrations require an explicitly approved safe non-production target. Ensure suspended users cannot log in, refresh, complete MFA or authenticate through supported legacy flows. Prevent self-role-change and last-admin lockout.

### UM-3 — Admin UI
Implement the protected users directory and confirmation flows. Add API/component tests, responsive layout, keyboard accessibility and error handling. UI checks are supplementary; API remains authoritative.

- **Status (authoritative 2026-10-26 16:13 +07): MERGED / INTEGRATION BLOCKED.** The read-only directory, accessible dialog/browser checks and confirmation-based lifecycle controls are merged via PR #64. Server-side AdminGuard, recent signed MFA assurance, allowlisted responses and atomic audit RPCs protect mutations; approved non-production integration is still required before rollout.
- **Status after browser verification:** PR #43 was superseded and PR #45 was replaced by [PR #47](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/47), which is merged at `3af07f3749d970fe4ee084a953168c7f1ddd5975`. The Node 24 + Chrome DevTools Protocol test mocks Auth/admin APIs and verifies focus management, non-admin denial, and accessible scrolling; all 10 browser tests passed on the exact head and post-merge auth-web/auth-service CI passed. The previous Supabase Preview migration-history failure is tracked separately in AUTH-OPS-002 and is not evidence that the browser change or the later directly applied Auth migrations failed. Mutation UI stays hidden until AUTH-UM-001B audit persistence and AUTH-UM-002 authorization/concurrency tests pass.
- **Historical schema blocker (pre-migration):** The Supabase Preview app check failed on the subsequent PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` with `Remote migration versions not found in local migrations directory`; PR #24's own check was skipped because no Supabase branch was associated. The four-RPC source/live mismatch has since been reconciled; remaining remote-only migration provenance is tracked under AUTH-UM-000.

### UM-4 — Verification and controlled rollout
- **Priority/status:** P1 / BLOCKED — the connected shared project is private production, not an integration-test target; Supabase Preview is skipped and no separate non-production target is available in the connected project list.
- **Security Advisor follow-up:** Supabase Auth leaked-password protection is disabled (HaveIBeenPwned compromised-password check off). Track AUTH-SEC-004; no setting was changed because the target is private production and separate non-production validation plus explicit production-change authorization are required.
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
