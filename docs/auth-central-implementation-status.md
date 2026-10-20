# Auth Central implementation status

**Updated:** 2026-10-14  
**Scope:** Repository work and non-production validation only. No production cutover is implied.

## Current architecture facts

- `phanthienquoc-authentication` owns the NestJS authentication service and uses the backend-only Supabase client for persistence.
- `platform-infra` owns deployment manifests, image promotion and reconciliation.
- The service bootstrap excludes `auth/{*path}` from global `/api` prefix, so auth endpoints are intended to be `/auth/*`, with health/readiness under `/api/*`.
- `GET /auth/me` currently authenticates via `Authorization: Bearer <access-token>`; it does not authenticate a caller using the refresh-session cookie.
- Refresh cookie name is `tce_refresh_token`, `HttpOnly`, `SameSite=Lax`, secure outside development, and its current path is `/api/auth`.
- Media backend calls `/auth/me` while forwarding `Cookie` only. TCE's platform middleware does likewise before issuing its internal service JWT. This source contract must be decided and tested before migration/cutover.
- Current NestJS HMAC JWT contract uses HS256 and configured issuer/audience. TCE's legacy token issuer has a different claim contract; do not rotate issuers or keys without consumer inventory and migration gates.

## Phase 0 / 1 priorities

1. Complete branch/PR reconciliation before considering cleanup. Existing release PRs already merged must not be repeated.
2. Add non-production contract tests for bearer-only `/auth/me`, refresh-cookie path and client forwarding. Tests must describe current intended contract and fail if it silently drifts.
3. Decide ADR: NestJS as sole IdP/auth service, Keycloak alongside NestJS as OIDC provider/broker, or partial replacement. Do not introduce Keycloak resources until this decision is reviewed.
4. Confirm exact Supabase target, connection budget, network/TLS mode, and exact candidate Keycloak compatibility with official requirements.
5. Select pilot only after API contract matrix and rollback are reviewed.

## Non-negotiable safety gates

- No production traffic/DNS/ingress/secret/environment changes.
- No production cluster access or deploy.
- No database DDL/DML/schema/role/credential mutations as part of this task.
- No changes to authentication semantics based only on a source-level guess.
- Open PRs for repository modifications; squash commits; do not merge autonomously.
- Every coding task is isolated to a dedicated branch.

## Validation required in CI

- Jest tests, TypeScript typecheck, Nest build, container build.
- Contract tests for refresh cookie options and path.
- Non-production consumer integration test for cookie forwarding and bearer behavior.
- A future separate ADR-approved migration plan must add OIDC discovery/PKCE/state/nonce, issuer/audience/signature/expiry/JWKS rotation, logout/session and rollback tests if Keycloak is selected.
