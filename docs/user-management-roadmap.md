# User Management — Architecture and Delivery Roadmap

## Status and scope

- Status: PROPOSED architecture baseline; implementation follows as separate, testable PRs.
- Owner: central NestJS authentication service and its Next.js `web/` app.
- No changes to TCE Dashboard or Media consumers in this phase.
- No production migrations, production cutover, or real account mutations as part of planning.

## Verified current state

- `src/auth/auth.repository.ts` uses the existing shared Supabase project and `@supabase/supabase-js`; its `public.users` model has `id`, `email`, `password_hash`, `role` (`USER | ADMIN`), `mfa_enabled`, and `mfa_secret_encrypted`.
- Signup assigns `USER`. The NestJS API has signup/login/`me`/refresh/logout and MFA/passkey flows, but no dedicated `src/users` module or admin user-management controller.
- `web/` is currently an authentication screen; no admin area or user directory exists.
- An optional Keycloak OIDC path exists. `auth_keycloak_identities` stores minimal metadata for verified Keycloak identities; Keycloak remains the source of truth for credentials, sessions, MFA and roles in that mode.
- README and `docs/web-ui-integration.md` require the backend to own auth logic and keep Keycloak mode opt-in/non-production until its integration gates pass.

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

These routes are proposals, not available endpoints until implemented and tested:

- `GET /admin/users?query=&role=&status=&limit=&cursor=` — paginated directory, normalized email search, bounded page size and allowlisted sorting.
- `GET /admin/users/:id` — allowlisted profile and security summary.
- `PATCH /admin/users/:id/role` — role change with privileged caller and audit record.
- `PATCH /admin/users/:id/status` — suspend/reactivate.
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

## References

- Current code: `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/auth/auth.repository.ts`, `src/auth/keycloak/`, `web/src/services/auth-api.ts`.
- Current architecture: `README.md`, `docs/web-ui-integration.md`, `docs/keycloak-oidc-foundation.md`.
- Authorization baseline: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — deny by default, least privilege, per-request server-side checks and authorization tests.
