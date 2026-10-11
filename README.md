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
- The release workflow publishes to `ghcr.io/phanthienquoc/microfe-auth:<commit-sha>`. Production deployment is not triggered from this repository; platform-infra must support a verified single-service promotion or an explicitly approved shared rollout.

## Required integration gates before production

- Generate and commit a reviewed `package-lock.json`, then switch CI to deterministic `npm ci`.
- Test signup/login, JWT claims, refresh rotation/reuse/revocation, MFA/recovery one-time use, WebAuthn challenge expiry/replay, and cookie forwarding against a non-production Supabase project.
- Verify live table column types, indexes, constraints, RLS and service-role permissions. Preserve existing tables and integrity constraints.
- Validate SimpleWebAuthn with browser-generated fixtures and confirm scrypt password-hash compatibility using non-sensitive fixtures.
- Test cookie domain/path, CORS, CSRF, rate limits and security audit events.
- Verify secret presence/connectivity without printing values.
- Deploy immutable image digests through platform-infra, verify readiness and rollout, and prove rollback before switching traffic.

Do not publish database credentials, perform destructive schema changes, or route production users until auth compatibility, integration tests, migration readiness, secret availability and rollback are verified.
