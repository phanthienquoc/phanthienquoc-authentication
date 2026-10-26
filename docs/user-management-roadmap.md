# User Management — Architecture and Delivery Roadmap

## Status and scope

- Status: Architecture baseline established; implementation is in progress. As of 2026-10-25, the protected admin guard and read-only list/detail API foundation (UM-1A) plus the read-only directory UI (UM-3) are merged. UM-0 RPC/migration reconciliation remains blocked; audit persistence (UM-1B), lifecycle mutations (UM-2), suspension enforcement and UM-4 verification are not complete. See [the canonical task queue](plan/user-management-tasks.md) for stable IDs, evidence and dependencies.
- Owner: central NestJS authentication service and its Next.js `web/` app.
- No changes to TCE Dashboard or Media consumers in this phase.
- No production migrations, production cutover, or real account mutations as part of planning.

## Verified current state

- `src/auth/auth.repository.ts` uses the existing shared Supabase project and `@supabase/supabase-js`; its `public.users` model has `id`, `email`, `password_hash`, `role` (`USER | ADMIN`), `mfa_enabled`, and `mfa_secret_encrypted`.
- Signup assigns `USER`. The NestJS API has signup/login/`me`/refresh/logout and MFA/passkey flows. PR #18 added `src/users` and protected read-only `/api/admin/users` list/detail endpoints; no role/status/session mutation endpoints or audit API exist yet.
- `web/` includes the authentication screen plus a read-only `/admin/users` directory with search, role filter, pagination and a detail panel (PR #19); no mutation controls are exposed.
- An optional Keycloak OIDC path exists. `auth_keycloak_identities` stores minimal metadata for verified Keycloak identities; Keycloak remains the source of truth for credentials, sessions, MFA and roles in that mode.
- README and `docs/web-ui-integration.md` require the backend to own auth logic and keep Keycloak mode opt-in/non-production until its integration gates pass.

The checked-in baseline in [TCE Dashboard infra/db/001_auth.sql](https://github.com/phanthienquoc/TCE-dashboard/blob/master/infra/db/001_auth.sql) is not proof of the live schema. A **read-only catalog inspection of the connected shared Supabase project on 2026-10-26** confirmed the following metadata (no row data was read and no writes or migrations were performed):

- `public.users` has `id`, `email`, `password_hash`, `role`, `mfa_enabled`, `mfa_secret_encrypted`, `created_at`, and `updated_at`. Live constraints include a unique `email` and a `USER | ADMIN` role check. There is **no account-status/suspension column**.
- `public.refresh_sessions` has `id`, `user_id`, `token_hash`, `family_id`, `replaced_by`, `expires_at`, `revoked_at`, `created_at`, `last_used_at`, `ip`, and `user_agent`; `token_hash` is unique and user/family indexes exist.
- `public.mfa_recovery_codes`, `public.auth_passkey_challenges`, `public.auth_passkey_credentials`, and `public.auth_keycloak_identities` exist. Passkey credential IDs and Keycloak issuer/subject pairs are unique. No admin/audit table exists.
- RLS is enabled on all six auth tables, but the catalog found no policies. The live ACL catalog explicitly grants `anon` and `authenticated` SELECT/INSERT/UPDATE/DELETE/TRUNCATE plus REFERENCES, TRIGGER, and PostgreSQL 17 MAINTAIN privileges on `public.users`, `public.refresh_sessions`, `public.mfa_recovery_codes`, `public.auth_passkey_challenges`, and `public.auth_passkey_credentials`. RLS without policies denies row-level access, but **RLS does not apply to TRUNCATE**; the excess destructive privilege is not mitigated by RLS. `public.auth_keycloak_identities` has no browser-role ACL entries and is restricted to server roles. No account rows were read. See [Supabase Securing your API](https://supabase.com/docs/guides/api/securing-your-api) for the grants/RLS split and [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) for RLS scope.

**Fresh security-advisor cross-check (2026-10-26T01:05Z):** Supabase's security advisor returned 29 `rls_enabled_no_policy` findings across the connected project. This is a project-wide count, not an Auth-only count; it includes tables outside this task's scope. The scoped catalog independently confirms zero policies on each of the six Auth tables above. This is recorded as evidence only: no unrelated table was modified or included in this task.
- The live migration ledger contains remote versions `20261014024759 restrict_auth_rpc_execution`, `20261014130516 keycloak_runtime_schema`, `20261014131151 keycloak_runtime_login_role`, and `20261020234922 keycloak_identity_persistence`. The first three have no matching migration artifact in either allowed repository. The local Keycloak migration is versioned `20261014000000`, while the live ledger records the same logical name at `20261020234922`. Conversely, the checked-in `20261012000000_auth_persistence_rpcs.sql` is absent from the live ledger. GitHub code search and path-specific commit history across both allowed repositories found no matching files for the three remote-only versions. This is bidirectional migration drift; do not reconstruct migration contents from version/name metadata.

**Verified source/live RPC contract mismatch — P0:** current `src/auth/auth.repository.ts` calls `auth_rotate_refresh_session`, `auth_replace_mfa_recovery_codes`, and `auth_consume_mfa_recovery_code`; `src/auth/passkey.repository.ts` calls `auth_consume_passkey_challenge`. All four functions are defined in the checked-in auth-persistence migration but absent from the live function catalog. The live catalog instead has `rotate_refresh_token(p_token_hash text, p_new_token_hash text, p_new_expires_at timestamptz, p_ip inet, p_user_agent text)` and `consume_recovery_code(p_user_id uuid, p_code_hash text)`; both are `SECURITY DEFINER`, with EXECUTE granted to `postgres` and `service_role` only (not `anon` or `authenticated`). The checked-in auth RPC migration is absent from the live ledger. A read-only comparison of the live function bodies also confirms the two legacy functions are not drop-in aliases: `rotate_refresh_token` returns a table (`user_id`, `role`, `new_session_id`, `reuse_detected`), generates the next session ID inside the function, and accepts `p_ip inet`; the checked-in `auth_rotate_refresh_session` returns a JSONB status/user object and expects a caller-supplied next session ID/token hash. `consume_recovery_code` atomically marks one unused code as used and returns a boolean, but its name/contract differs from the source RPC path. Do not switch call sites based only on similar names; first reconcile the authoritative migration and test the exact contract in approved non-production. PR #27 added a non-mutating readiness check for the required RPC paths so the service fails closed rather than claiming readiness when they are missing. Auth release workflow [run #39517135781](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/39517135781) shows image publication/promotion dispatch occurred on 2026-10-20; it is not proof of actual rollout or health.

**Read-only log signal (2026-10-26, last 24 hours):** An aggregate-only unified-log query returned one `postgres_logs` match for each of the four source-required RPC names when paired with a missing-function/`42883`/permission-denied pattern, and zero matching `postgrest_logs` records. No raw log payloads, tokens, or caller identities were inspected. This corroborates the source/live contract risk but does not prove which runtime instance emitted the records.

UM-0 is therefore **source/schema inspection complete, contract reconciliation still blocked**. Do not run migrations against this shared live project. Before a runtime rollout, obtain the authoritative SQL/revision for the remote-only migration versions and validate the exact RPC/schema contract in an explicitly approved non-production Supabase environment. Supabase branch metadata lists one non-persistent development branch named `main`, status `MIGRATIONS_FAILED` (preview status `ACTIVE_HEALTHY`); that status does not establish that it is an approved test target, and project-ref-only schema tools did not expose branch-specific catalog state. No reset, rebase, merge, write, or migration was attempted. The connected project was inspected read-only only.


**Project/environment identity caveat (2026-10-26):** The connected Supabase tools returned one project, `phanthienquoc's Project` (ref `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`, project status `ACTIVE_HEALTHY`). The Authentication repository's `.env.example` contains only `SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co`; the checked-in config does not expose the actual runtime ref, so the repo-to-project match cannot be independently confirmed from source. The inspected project is the previously documented shared/live project and must not be treated as an approved non-production target. No branch was created and no schema/data mutation, migration, reset, rebase, merge or function deployment was performed. Official [Supabase Branching documentation](https://supabase.com/docs/guides/deployment/branching) states that a connected GitHub integration can deploy on commits pushed to its connected branch and that merging into the main project runs deployment steps that apply pending migrations. The current `Supabase Preview` check is skipped because this branch is not associated with a Supabase Branch, so it does not establish a safe preview target. Hold this documentation-only PR until the main-push integration target/behavior is explicitly verified; do not assume a docs-only merge is free of migration side effects.
These are two distinct identity-provider paths, not interchangeable rows in one user table. Never treat a Keycloak identity row as a legacy password account.

## Authentication and suspension enforcement path map — source inspection 2026-10-26

This map identifies where future legacy-account suspension and session revocation must be enforced; it does **not** authorize schema changes or imply the shared live database currently supports the checked-in RPC contract.

- **Password login:** `src/auth/auth.service.ts` — `login()` verifies email/password and returns `mfaRequired + userId` for MFA-enabled users; otherwise it calls `issueLoginForUser()`, which creates a refresh session and access JWT. A future suspension check must occur after credential verification and before either the MFA-pending response or session issuance.
- **MFA TOTP/recovery:** `src/auth/auth.controller.ts` — `mfaLogin()` and `mfaRecovery()` accept a user ID in the request DTO, load that account and then call `completeMfaLogin()` / `completeMfaRecoveryLogin()`. These paths also depend on the separate `AUTH-SEC-001` server-side first-factor challenge contract; do not use browser-only pending state as proof of the first factor.
- **Refresh:** `AuthService.refresh()` delegates rotation to `AuthRepository.rotateRefreshSession()` and issues a new access JWT from the returned user. Suspension enforcement and revoke-all semantics need an atomic database contract around rotation/session-family state; a post-rotation check alone can race or leave inconsistent session state.
- **Passkey login:** `PasskeyService.authenticationVerify()` consumes `auth_consume_passkey_challenge`, verifies the credential, updates the counter, loads the account and then returns MFA-pending state or calls `issueLoginForUser()`. Suspension must prevent session issuance after successful credential verification; challenge consumption currently relies on an RPC absent from the inspected live function catalog.
- **Authenticated passkey management:** `AuthController` uses `authenticatedUserId()` for registration, list, rename and delete routes. Once a status contract exists, suspension must be checked server-side for these routes too, not only hidden in the UI.
- **Admin access:** `AdminGuard` verifies the access JWT and re-reads the current legacy account role, but the live `public.users` schema has no status/suspension column. Role authorization therefore cannot currently enforce suspension.
- **Blocking dependencies:** No status column or audit table was found in the read-only live catalog; the source-required refresh/MFA/passkey RPCs are absent from that catalog and migration provenance remains unresolved. Do not implement lifecycle mutation endpoints, invent migration contents, or run a migration against the shared project until authoritative artifacts and an explicitly approved non-production Supabase target are available.

**Fresh read-only revalidation (2026-10-26T02:06Z):** Supabase `list_projects/get_project/get_project_url` still returns only the connected project ref `gtqovpusfyyvxpeezxlo` (project status `ACTIVE_HEALTHY`). `list_branches` still reports only non-persistent `main` / Git branch `master`, with status `MIGRATIONS_FAILED` (preview status `ACTIVE_HEALTHY`); this is not an approved non-production target. The checked-in `.env.example` remains a placeholder and GitHub tools do not expose the runtime secret value, so the exact runtime project binding cannot be independently proven. Remote migration history includes `20261014024759 restrict_auth_rpc_execution`, `20261014130516 keycloak_runtime_schema`, `20261014131151 keycloak_runtime_login_role`, and `20261020234922 keycloak_identity_persistence`, but not `20261012000000_auth_persistence_rpcs`. Read-only catalog queries again found the four source-required `auth_*` RPCs absent; only legacy `rotate_refresh_token(p_token_hash text, p_new_token_hash text, p_new_expires_at timestamptz, p_ip inet, p_user_agent text) RETURNS TABLE(user_id uuid, role text, new_session_id uuid, reuse_detected boolean)` and `consume_recovery_code(p_user_id uuid, p_code_hash text) RETURNS boolean` exist for these operations. Both are `SECURITY DEFINER` with EXECUTE for `postgres`/`service_role` only, not `anon`/`authenticated`, and are not contract-compatible aliases. All six inspected auth tables have RLS enabled and zero policies. The five legacy auth tables (`users`, `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_challenges`, `auth_passkey_credentials`) still grant `anon` and `authenticated` SELECT/INSERT/UPDATE/DELETE/TRUNCATE; `auth_keycloak_identities` has no browser-role table grants. `users` still has no suspension/status column and `auth_admin_audit_events` remains absent. Security advisor reported 29 project-wide RLS-enabled/no-policy findings; performance advisor reported 15 unindexed foreign keys, including `auth_passkey_challenges.user_id` and `refresh_sessions.replaced_by`. No user/account rows were read, and no schema/data mutation, migration, branch operation, or deployment was performed.

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

- **Status (2026-10-25): BLOCKED on migration provenance and approved non-production validation.** Read-only live catalog discovery is complete; source-required auth RPCs are missing from the inspected live function catalog and the checked-in migration is absent from the remote migration ledger.
- **Implemented safe sub-slice:** [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27) adds a GET-only PostgREST OpenAPI readiness contract check using the existing shared service-role credentials. It verifies the four RPC paths used by the current source and fails readiness if they are absent or the schema metadata cannot be inspected. Exact tested head `6c5d6ee9d524ee365a07111a7ee04aa4056548ed`; [auth-service CI #40213420324](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40213420324) passed.
- **Still blocked:** Resolve `restrict_auth_rpc_execution` migration provenance and validate signatures/grants/RLS in an approved non-production Supabase environment. The Supabase Preview app check on PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` failed with `Remote migration versions not found in local migrations directory`; PR #22/#24/#25/#27 merge checks were skipped because no Supabase branch was associated. Do not reset, merge, rebase or migrate the shared live project.
- **Safety:** No schema mutation or production migration was performed. Keep AUTH-UM-001B audit persistence and AUTH-UM-002 mutation endpoints gated.

### UM-1 — Secure admin API foundation
Implement principal resolution and a centralized admin guard, allowlisted response DTOs and authorization tests. Add audit persistence. Do not expose mutation endpoints before authorization/audit tests pass.

### UM-2 — Account lifecycle
Implement list/detail, role change, suspension/reactivation and session revocation. Additive migration(s) only after schema evidence and non-production validation. Ensure suspended users cannot log in, refresh, complete MFA or authenticate through supported legacy flows. Prevent self-role-change and last-admin lockout.

### UM-3 — Admin UI
Implement the protected users directory and confirmation flows. Add API/component tests, responsive layout, keyboard accessibility and error handling. UI checks are supplementary; API remains authoritative.

- **Status (2026-10-25): PARTIALLY DONE.** The read-only directory from PR #19 and dependency-free query/security-contract tests from PR #24 are merged. PR #24's exact tested head was `19e4d3b04b75cff5d38e70b6d01aa920a3eb1e02`; [auth-web CI #40212531075](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531075) passed tests, typecheck, lint, build and frontend container build. [auth-service CI #40212531176](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40212531176) passed.
- **Still open:** PR #29 adds initial focus, Tab/Shift+Tab containment, Escape dismissal and focus restoration with source-level contract assertions. PR #43 adds browser-level focus/dialog and responsive coverage through Node 24 + Chrome DevTools Protocol, but remains BLOCKED: exact head `632be6c667e419bb6d3443ea642dc777c9171fd8` fails web CI [#40229190921](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40229190921) while waiting for the mocked admin row; service CI [#40229190867](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40229190867) passes. A direct-Next/process-group cleanup attempt reproduced the failure after the initial npm-wrapper attempt, so no further blind retries are planned. Diagnose the browser origin/HMR/API-interception contract separately. Mutation UI stays hidden until AUTH-UM-001B audit persistence and AUTH-UM-002 mutation authorization/concurrency tests pass.
- **Schema blocker:** The Supabase Preview app check failed on the subsequent PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` with `Remote migration versions not found in local migrations directory`; PR #24's own check was skipped because no Supabase branch was associated. This remains AUTH-UM-000 migration-provenance/non-production validation work; no migration was applied by the implementation run.

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
