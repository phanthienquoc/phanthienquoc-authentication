# User Management — Architecture and Delivery Roadmap

## Status and scope

- Status: Architecture baseline established; implementation is in progress. As of 2026-10-25, the read-only admin API (UM-1) and read-only directory UI (UM-2) are merged. UM-0 RPC/migration reconciliation remains blocked; account lifecycle mutations, suspension enforcement, audit APIs and UM-4 verification are not complete. See [the stable task queue](plan/user-management-tasks.md) for current evidence and dependencies.
- Owner: central NestJS authentication service and its Next.js `web/` app.
- No changes to TCE Dashboard or Media consumers in this phase.
- No production migrations, production cutover, or real account mutations as part of planning.

## Verified current state

- `src/auth/auth.repository.ts` uses the existing shared Supabase project and `@supabase/supabase-js`; its `public.users` model has `id`, `email`, `password_hash`, `role` (`USER | ADMIN`), `mfa_enabled`, and `mfa_secret_encrypted`.
- Signup assigns `USER`. The NestJS API has signup/login/`me`/refresh/logout and MFA/passkey flows. PR #18 added `src/users` and protected read-only `/api/admin/users` list/detail endpoints; no role/status/session mutation endpoints or audit API exist yet.
- `web/` includes the authentication screen plus a read-only `/admin/users` directory with search, role filter, pagination and a detail panel (PR #19); no mutation controls are exposed.
- An optional Keycloak OIDC path exists. `auth_keycloak_identities` stores minimal metadata for verified Keycloak identities; Keycloak remains the source of truth for credentials, sessions, MFA and roles in that mode.
- README and `docs/web-ui-integration.md` require the backend to own auth logic and keep Keycloak mode opt-in/non-production until its integration gates pass.

The checked-in baseline in [TCE Dashboard infra/db/001_auth.sql](https://github.com/phanthienquoc/TCE-dashboard/blob/master/infra/db/001_auth.sql) is not proof of the live schema. A **read-only catalog inspection of the connected shared Supabase project on 2026-10-25** confirmed the following metadata (no row data was read and no writes or migrations were performed):

- `public.users` has `id`, `email`, `password_hash`, `role`, `mfa_enabled`, `mfa_secret_encrypted`, `created_at`, and `updated_at`. Live constraints include a unique `email` and a `USER | ADMIN` role check. There is **no account-status/suspension column**.
- `public.refresh_sessions` has `id`, `user_id`, `token_hash`, `family_id`, `replaced_by`, `expires_at`, `revoked_at`, `created_at`, `last_used_at`, `ip`, and `user_agent`; `token_hash` is unique and user/family indexes exist.
- `public.mfa_recovery_codes`, `public.auth_passkey_challenges`, `public.auth_passkey_credentials`, and `public.auth_keycloak_identities` exist. Passkey credential IDs and Keycloak issuer/subject pairs are unique. No admin/audit table exists.
- RLS is enabled on these six tables, but the catalog query found no RLS policies for them. `anon` and `authenticated` still have table-level grants in the live catalog; without policies RLS denies row access, but least-privilege hardening should revoke direct browser-role grants and verify the service-role path.
- The live migration ledger contains `20261014024759 restrict_auth_rpc_execution` and `20261020234922 keycloak_identity_persistence`, but does not contain this repository's `20261012000000_auth_persistence_rpcs` migration. The `restrict_auth_rpc_execution` migration artifact was not found in either allowed repository during this audit, so its provenance must be reconciled rather than guessed.

**Verified source/live RPC contract mismatch — P0:** current `src/auth/auth.repository.ts` calls `auth_rotate_refresh_session`, `auth_replace_mfa_recovery_codes`, and `auth_consume_mfa_recovery_code`; `src/auth/passkey.repository.ts` calls `auth_consume_passkey_challenge`. Those functions are defined in the checked-in auth migration but were **not present in the live function catalog**. The live catalog instead has legacy `rotate_refresh_token` and `consume_recovery_code`, executable by `service_role` only. The live migration ledger does not show the new auth RPC migration. Auth release workflow [run #39517135781](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/39517135781) succeeded on 2026-10-20 through test/typecheck/build, ARM64 image publication and promotion dispatch; actual platform rollout was not inspected within the two-repository scope. If the current repository image is running against the inspected live schema, refresh rotation, MFA recovery-code replacement/consumption, and passkey challenge consumption can fail with missing-function errors. `AuthRepository.ready()` currently probes table existence only, so readiness can pass without these RPCs.

UM-0 is therefore **source/schema inspection complete, contract reconciliation still blocked**. Do not run migrations against this shared live project. Before a runtime rollout, validate the checked-in migration and exact RPC contract in an approved non-production Supabase environment, record migration provenance, and add a non-mutating contract/readiness check. Supabase branch metadata also lists only one non-persistent development branch named `main`, with status `MIGRATIONS_FAILED` (preview status `ACTIVE_HEALTHY`). The branch-specific migration/catalog state was not available through the project-ref-only schema tools, and no reset, rebase, merge or migration was attempted. Diagnose that branch safely or obtain an approved non-production environment before integration validation. The connected project was inspected read-only only.

These are two distinct identity-provider paths, not interchangeable rows in one user table. Never treat a Keycloak identity row as a legacy password account.

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

### UM-1 — Secure admin API foundation
Implement principal resolution and a centralized admin guard, allowlisted response DTOs and authorization tests. Add audit persistence. Do not expose mutation endpoints before authorization/audit tests pass.

### UM-2 — Account lifecycle
Implement list/detail, role change, suspension/reactivation and session revocation. Additive migration(s) only after schema evidence and non-production validation. Ensure suspended users cannot log in, refresh, complete MFA or authenticate through supported legacy flows. Prevent self-role-change and last-admin lockout.

### UM-3 — Admin UI
Implement the protected users directory and confirmation flows. Add API/component tests, responsive layout, keyboard accessibility and error handling. UI checks are supplementary; API remains authoritative.

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


## Stable task queue — 2026-10-25

The IDs below are stable across runs. Update status in place; do not create a duplicate task when the ID already exists. Current code/DB observations are evidence, not permission to change the live database.

### AUTH-UM-000 — Reconcile live schema/RPC contract (UM-0)

- **Priority/status:** P0 / BLOCKED on approved non-production integration environment and migration-provenance confirmation.
- **Evidence paths:** `src/auth/auth.repository.ts`, `src/auth/passkey.repository.ts`, `src/auth/mfa.service.ts`, `src/health.controller.ts`, `supabase/migrations/20261012000000_auth_persistence_rpcs.sql`, `README.md`.
- **Current vs desired:** read-only live catalog inspection found no `auth_rotate_refresh_session`, `auth_replace_mfa_recovery_codes`, `auth_consume_mfa_recovery_code`, or `auth_consume_passkey_challenge`; only legacy `rotate_refresh_token` and `consume_recovery_code` are present. The live ledger omits the checked-in auth RPC migration and includes an unlocated `restrict_auth_rpc_execution` artifact. Table-only readiness does not detect this mismatch. Desired: one reviewed, versioned RPC contract whose migration history, code callers, grants and readiness check agree.
- **Acceptance criteria:** verify exact function signatures/return JSON and service-role-only execution in non-production; prove refresh rotation/reuse, recovery-code replace/consume and passkey challenge consume work against the migrated schema; readiness fails closed on a missing contract version without invoking mutating RPCs; document the unknown live migration provenance; do not drop legacy RPCs until consumers and rollout are verified.
- **Tests/validation:** migration dry-run/schema diff in non-production; repository contract tests; integration tests for each RPC; readiness regression test; inspect grants and security-definer search paths. No production migration or writes.
- **Dependencies:** non-production Supabase project/branch and review of PR #15 architecture baseline. The only visible development branch is marked `MIGRATIONS_FAILED`; diagnose it before use and do not reset/rebase/merge it automatically. Do not create a billable Supabase branch without approval.
- **Risk:** critical auth availability/session risk if the current image is deployed against the inspected schema.
- **Sources:** [issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), [issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [roadmap PR #15](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/15), [auth RPC migration](https://github.com/phanthienquoc/phanthienquoc-authentication/blob/master/supabase/migrations/20261012000000_auth_persistence_rpcs.sql).

### AUTH-UM-001A — Admin principal, guard and safe DTO foundation (UM-1A)

- **Priority/status:** P1 / READY as an isolated code-and-test slice; no DB writes or mutation routes.
- **Evidence paths:** `src/auth/jwt.service.ts`, `src/auth/auth.controller.ts`, `src/auth/auth.repository.ts`, `src/auth/auth.module.ts`, `test/`.
- **Current vs desired:** JWT verification exists and carries `sub`/role, but there is no centralized admin-user-management controller/guard. Desired: resolve the caller server-side, deny by default, re-check the current legacy role for privileged operations, and expose only allowlisted DTOs.
- **Acceptance criteria:** unauthenticated and USER callers receive 401/403; ADMIN-only policy is tested on every protected route; request body/query cannot supply actor ID or role; responses omit hashes, MFA/recovery secrets, tokens and private passkey fields; no public admin bootstrap; no mutation routes in this slice.
- **Tests/validation:** unit tests for invalid/expired JWT, missing principal, USER denial, ADMIN allow, IDOR and DTO redaction; `npm test`, `npm run typecheck`, `npm run build`.
- **Dependencies:** architecture contract in PR #15; can proceed independently while AUTH-UM-000 waits for non-production DB validation.
- **Risk:** high if authorization is implemented only in UI; mitigate with deny-by-default server tests.
- **Sources:** [PR #15](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/15), [issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-001B — Privileged audit persistence (UM-1B)

- **Priority/status:** P1 / BLOCKED on non-production schema validation.
- **Evidence paths:** `supabase/migrations/`, `src/db/supabase.client.ts`, `src/auth/auth.repository.ts`.
- **Current vs desired:** live schema has no admin/audit table. Desired: append-only privileged-operation audit with actor/provider, action, target/provider, outcome, timestamp and correlation ID; only safe before/after metadata.
- **Acceptance criteria:** additive reviewed migration; service-role-only access; RLS/grants verified; failed and successful admin attempts audited; no secrets/tokens/hashes in payload; no migration applied to the shared live project.
- **Tests/validation:** migration/schema test in non-production; redaction tests; insert/read authorization tests; audit failure behavior documented.
- **Dependencies:** AUTH-UM-000, AUTH-UM-001A, approved non-production Supabase environment.
- **Risk:** high; missing or overexposed audit data can undermine incident response or leak security metadata.
- **Sources:** [issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [roadmap PR #15](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/15).

### AUTH-UM-002 — Legacy account lifecycle API (UM-2)

- **Priority/status:** P1 / BLOCKED until AUTH-UM-001A/B and schema migration validation pass.
- **Evidence paths:** `src/auth/auth.repository.ts`, `src/auth/auth.service.ts`, `src/auth/auth.controller.ts`, `src/auth/mfa.service.ts`, `src/auth/passkey.service.ts`, `supabase/migrations/`.
- **Current vs desired:** no status field or admin user endpoints; refresh revocation currently targets a token/session, not all active sessions by user. Desired: bounded list/detail, role change, suspend/reactivate and revoke-all-sessions, for legacy NestJS accounts only.
- **Acceptance criteria:** suspension blocks password login, refresh rotation, MFA login/recovery and passkey login; role changes take effect promptly; prevent self-role-change, self-escalation and last-active-admin lockout; session revocation is atomic/idempotent; never hard-delete by default; Keycloak rows remain separate/read-only.
- **Tests/validation:** unit and non-production integration tests for each entry point, concurrent refresh vs suspension, last-admin races, pagination limits, response allowlists and audit events.
- **Dependencies:** AUTH-UM-000, AUTH-UM-001A, AUTH-UM-001B.
- **Risk:** critical account lockout/authorization risk; require schema and concurrency proof before enabling mutation routes.
- **Sources:** [issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [roadmap PR #15](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/15).

### AUTH-UM-003 — Protected admin users UI (UM-3)

- **Priority/status:** P2 / BLOCKED on AUTH-UM-002 API contract and tests.
- **Evidence paths:** `web/src/app/`, `web/src/features/auth/`, `web/src/services/auth-api.ts`, `web/tsconfig.json`.
- **Current vs desired:** the web app is an auth screen with no admin directory. Desired: protected `/admin/users` list/detail, search/filter/pagination, provider labels and confirmation dialogs; NestJS API remains the only data boundary.
- **Acceptance criteria:** no direct Supabase/browser service-role access; loading/empty/error states; keyboard-accessible confirmations; privileged controls hidden for USER but still server-enforced; no secret fields rendered.
- **Tests/validation:** component/API contract tests, responsive and accessibility checks, frontend lint/typecheck/build.
- **Dependencies:** AUTH-UM-002; do not design against speculative response fields.
- **Risk:** medium/high if UI implies access control or exposes sensitive fields.
- **Sources:** [issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [web README](https://github.com/phanthienquoc/phanthienquoc-authentication/blob/master/web/README.md).

### AUTH-UM-004 — Non-production security/integration gate (UM-4)

- **Priority/status:** P1 / BLOCKED until UM-1 through UM-3 are implemented and a non-production Supabase environment is available.
- **Evidence paths:** `.github/workflows/ci.yml`, `.github/workflows/web-ci.yml`, `README.md`, `docs/production-runtime-secrets.md`, `supabase/migrations/`.
- **Current vs desired:** CI currently passes source-level tests/build but does not prove the live RPC contract, cookie/gateway forwarding or user lifecycle end-to-end. Desired: non-production integration proof plus an explicit rollout checklist.
- **Acceptance criteria:** backend and web tests/typecheck/lint/build pass on exact PR heads; schema/RLS/grants/functions/audit redaction verified; cookie/CORS/CSRF/rate-limit and gateway behavior verified; no production migration, deployment, account mutation or secret output.
- **Tests/validation:** exact-head GitHub Actions, non-production Supabase integration, auth consumer contract tests and safe redaction review.
- **Dependencies:** AUTH-UM-000 through AUTH-UM-003.
- **Risk:** critical if source-only CI is mistaken for rollout readiness.
- **Sources:** [issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), [issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-SEC-001 — Bind MFA completion to a server-side first-factor challenge

- **Priority/status:** P1 / OPEN; cross-cutting auth security follow-up tracked under existing [issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), not a duplicate user-management issue.
- **Evidence paths:** `src/auth/auth.controller.ts` (`mfa/login`, `mfa/recovery`), `src/auth/dto/mfa-login.dto.ts`, `web/src/features/auth/auth-store.ts`.
- **Current vs desired:** MFA completion currently accepts `userId + code`; the pending MFA state is held in the browser store and is not a server-issued, expiring challenge bound to successful password verification. No explicit NestJS rate-limit guard is visible in the allowed repo. Desired: short-lived one-time server challenge, attempt throttling and safe invalidation.
- **Acceptance criteria:** cannot complete MFA for a user without a prior server-validated first factor; challenge is one-time, short-lived and bound to the user/session; bounded attempts; recovery code remains one-time; generic errors and audit events contain no code/secret.
- **Tests/validation:** controller/service tests for missing, expired, replayed and cross-user challenges; rate-limit tests; verify gateway rate limiting separately before rollout.
- **Dependencies:** coordinate with AUTH-UM-000 RPC/schema reconciliation; do not break existing active-account login contract without compatibility tests.
- **Risk:** high; second-factor completion should not be represented solely by client-side state.
- **Sources:** [issue #1](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/1), [auth controller](https://github.com/phanthienquoc/phanthienquoc-authentication/blob/master/src/auth/auth.controller.ts), [MFA DTO](https://github.com/phanthienquoc/phanthienquoc-authentication/blob/master/src/auth/dto/mfa-login.dto.ts).

## References

- Current code: `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/auth/auth.repository.ts`, `src/auth/keycloak/`, `web/src/services/auth-api.ts`.
- Current architecture: `README.md`, `docs/web-ui-integration.md`, `docs/keycloak-oidc-foundation.md`.
- Authorization baseline: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — deny by default, least privilege, per-request server-side checks and authorization tests.


## Implementation progress — 2026-10-25

### AUTH-UM-001A — admin guard and allowlisted response projection

- **Status:** OPEN in [implementation PR #17](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/17); no admin routes or mutation endpoints have been added.
- **Branch/head:** `feat/auth-um1-admin-guard-dto-allowlist` at `4cc720cf1867d6bc86d276463c40bc7fb2d88544`.
- **Scope:** reusable server-side `AdminGuard` verifies the signed ADMIN claim and re-reads the current legacy NestJS user role through `AuthRepository`; allowlisted response projection emits only `id,email,role,mfaEnabled`; tests cover denial, stale role, redaction and signup role escalation.
- **Validation:** auth-service CI run [#202](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40207422205) completed successfully on exact HEAD `4cc720cf1867d6bc86d276463c40bc7fb2d88544`; `npm test`, typecheck, Nest build and container image build passed. Lint/format were not run (not in this workflow; local clone was unavailable).
- **Boundary:** no audit persistence, status column, lifecycle mutation API, production migration, or Keycloak mutation is included. Audit persistence and lifecycle endpoints remain gated by UM-0 and the authorization/audit test gate.

### UM-0 status recheck — live schema remains a blocker

A second read-only catalog inspection on 2026-10-25 reconfirmed the existing findings above: the shared live schema has no user status/suspension field or audit table; RLS is enabled but no policies exist on the legacy user/session/MFA/passkey tables; `anon` and `authenticated` still have broad table-level grants; and the current repository's `auth_*` RPCs are absent while legacy `rotate_refresh_token` and `consume_recovery_code` remain. The checked-in `20261012000000_auth_persistence_rpcs.sql` is absent from the live migration ledger, and the source artifact for `20261014024759 restrict_auth_rpc_execution` is not present in either allowed repository.

- [x] Reconcile source calls with the live function catalog and record the mismatch.
- [ ] Establish provenance for `restrict_auth_rpc_execution`.
- [ ] Validate the checked-in auth RPC migration and RLS/grants in an approved non-production Supabase environment.
- [ ] Add a non-mutating readiness/contract check for the required RPCs.
- **Status:** source/live inventory is documented; contract reconciliation remains **BLOCKED**. The Supabase development branch `main` reports `MIGRATIONS_FAILED`; it was not reset, rebased, merged or migrated.
- **Evidence:** [issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [implementation PR #17](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/17).
