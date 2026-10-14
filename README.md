# phanthienquoc-authentication

Central NestJS authentication service for TCE Dashboard and Media Generation.

## Architecture

- NestJS owns authentication business logic: password checks, session issuance/rotation, JWT handling, MFA/TOTP, recovery codes and passkey/WebAuthn orchestration.
- Persistence uses the same `@supabase/supabase-js` service-role client pattern as TCE Dashboard (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).
- PostgreSQL atomicity-sensitive persistence operations use narrowly scoped SQL RPCs for refresh-token rotation, one-time MFA recovery-code consumption/replacement and passkey challenge consumption. These functions do not decide authentication policy; that remains in NestJS.
- Do not expose the service-role key to browsers or commit secrets. Keep RLS enabled; the key is only loaded by the backend.
- TCE and Media are intended to call the shared auth origin rather than own duplicate password/session logic. Consumer migrations and production cutover must be verified before traffic is switched.

## Runtime configuration

Required runtime secrets:
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only service-role key for the existing Supabase project.
- `JWT_SECRET`: JWT signing key (at least 32 bytes); keep compatible with any consumers that verify these JWTs.
- `MFA_ENCRYPTION_KEY`: Base64-encoded 32-byte key for MFA secret encryption.

Required runtime variable:
- `SUPABASE_URL`: URL of the same Supabase project used by TCE Dashboard.

The `.env.example` documents the remaining CORS, issuer/audience, cookie, passkey and TTL settings. Do not set `DATABASE_URL`; the service no longer uses the Node `pg` driver.

Production secret ownership and the Kubernetes runtime Secret contract are documented in [`docs/production-runtime-secrets.md`](docs/production-runtime-secrets.md).

## Supabase database setup

Before deploying this version, apply the migration in `supabase/migrations/20261012000000_auth_persistence_rpcs.sql` to the existing Supabase project. It creates restricted, service-role-only RPCs for operations that must remain atomic. It does not create a new database or drop tables/constraints.

The target project must already contain the shared auth tables:
- `users`
- `refresh_sessions`
- `mfa_recovery_codes`
- `auth_passkey_challenges`
- `auth_passkey_credentials`

Check the actual table columns and service-role grants before rollout. The migration must be applied before the new image is deployed; readiness verifies access to these tables but does not apply migrations automatically.

## API and routing compatibility

Operational endpoints are `GET /api/health` and `GET /api/ready`. Auth endpoints preserve the existing `/auth/*` route contract by excluding the auth controller from the global `/api` prefix. Verify routing and HttpOnly cookie forwarding through the real gateway before cutover.

The service listens on port `4010`.

## Local development

Requires Node.js 24+ and npm 10+.

```bash
cp .env.example .env
npm install
npm run start:dev
npm test
npm run typecheck
npm run build
```

## CI and image release

- `.github/workflows/ci.yml` runs tests, typecheck and build on feature branches and pull requests.
- `.github/workflows/release.yml` verifies the service and builds an ARM64 container on `master`, tagged with the exact Git commit SHA. The image includes BuildKit provenance and an SBOM.
- After publishing, Auth sends `repository_dispatch` event `image-published` to `phanthienquoc/platform-infra` with `client_payload.app=auth-service`, `client_payload.component=auth`, and `client_payload.tag=<full-git-sha>`.
- Configure the Auth repository secret `PLATFORM_INFRA_DISPATCH_TOKEN` with permission to dispatch repository events to `platform-infra`. It is a GitHub integration token, not a Supabase credential. The release job fails closed if this token is missing, so a published image cannot silently skip its deployment handoff.
- `platform-infra` validates the image and creates a single-file Kustomize promotion PR for Auth. Promotion and production rollout remain gated by infra CI, GHCR pull authorization, runtime secrets, Supabase RPC migration, and health checks.

## Required integration gates before production

- Generate and commit a reviewed `package-lock.json`, then switch CI to deterministic `npm ci`.
- Test signup/login, JWT claims, refresh rotation/reuse/revocation, MFA/recovery one-time use, WebAuthn challenge expiry/replay, and cookie forwarding against a non-production Supabase project.
- Verify live table column types, indexes, constraints, RLS and service-role permissions. Preserve existing tables and integrity constraints.
- Validate SimpleWebAuthn with browser-generated fixtures and confirm scrypt password-hash compatibility using non-sensitive fixtures.
- Test cookie domain/path, CORS, CSRF, rate limits and security audit events.
- Verify secret presence/connectivity without printing values.
- Deploy immutable image digests through platform-infra, verify readiness and rollout, and prove rollback before switching traffic.

Do not publish database credentials, perform destructive schema changes, or route production users until auth compatibility, integration tests, migration readiness, secret availability and rollback are verified.


## Keycloak + NestJS resource-server integration

The NestJS app now exposes a Keycloak-protected identity endpoint at `GET /api/oidc/me`. It validates the bearer access token signature against Keycloak's remote JWKS and checks the exact issuer, required audience, expiry and RS256 algorithm. It rejects malformed/expired tokens and does not accept decode-only JWT parsing. Role claims are extracted from `realm_access.roles` and `resource_access.*.roles`.

Configure server-only variables in the runtime secret/config contract:
- `KEYCLOAK_URL`: Keycloak base URL reachable from NestJS.
- `KEYCLOAK_REALM`: realm name.
- `KEYCLOAK_ISSUER`: exact issuer claim, normally `KEYCLOAK_URL/realms/KEYCLOAK_REALM`.
- `KEYCLOAK_AUDIENCE`: API audience that must be present in access tokens.

**Keycloak configuration requirement:** configure a client scope / protocol mapper that adds the API audience (for example `nest-api`) to access-token `aud`. Do not weaken or remove audience validation to make a token pass. Keep client secrets out of `NEXT_PUBLIC_*` variables.

This integration is additive and non-breaking: the existing NestJS custom login/session endpoints remain unchanged and continue to be the legacy path until a separately tested migration. Only `/api/oidc/me` currently uses Keycloak validation. Do not route production clients to this endpoint until the Keycloak issuer, audience mapper, roles and end-to-end tests are configured.


## Keycloak identity metadata in Supabase

The NestJS service uses the existing `@supabase/supabase-js` server-side client (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`) to upsert a minimal record in `public.auth_keycloak_identities` when an authenticated caller requests `GET /api/oidc/me`. Records are keyed by the exact Keycloak issuer and subject, so users from different realms/issuers cannot collide.

Apply `supabase/migrations/20261014000000_keycloak_identity_persistence.sql` to the existing Supabase project before using this endpoint. The migration adds a separate table and does not alter or migrate existing legacy `users`, refresh-session, MFA or passkey records. RLS is enabled and direct `anon`/`authenticated` access is revoked; only the backend service-role client is intended to access this table.

Only identity metadata is persisted: issuer, subject, email, preferred username, email verification status and last authenticated time. **Do not store Keycloak passwords, access tokens, ID tokens, refresh tokens, client secrets or treat stored role snapshots as authorization truth.** Keycloak remains the source of truth for credentials, MFA, sessions and roles; NestJS authorizes requests using the verified access token.

The identity sync is deliberately limited to `/api/oidc/me`, not every guarded API request. Supabase persistence failure returns a service-unavailable response from that endpoint. Existing legacy auth routes are unchanged. This work does not integrate or change TCE Dashboard or Media Generation and does not apply the migration to production automatically.
