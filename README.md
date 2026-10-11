# phanthienquoc-authentication

Central NestJS authentication service for TCE Dashboard and Media Generation.

## Status: integration work in progress; not production-ready

Branch: `feat/nestjs-auth-service`

The current scaffold's CI has passed unit tests, TypeScript typecheck and the NestJS production build. That validates the scaffold only, not an end-to-end migration or production readiness.

## Architecture

- NestJS owns authentication business rules: DTO validation, password checks, session issuance/rotation, JWT handling, MFA/TOTP, recovery codes and passkey/WebAuthn orchestration.
- PostgreSQL is the persistence plane through the Node `pg` driver. Authentication decisions must not depend on Supabase Auth, PostgREST or Supabase RPCs.
- Keep database integrity constraints—primary keys, foreign keys, uniqueness and essential checks—as defense in depth. No constraints should be dropped to make the service compile.
- TCE and Media are intended to call the shared auth origin rather than own duplicate password/session logic. Consumer migrations and production cutover are not yet complete.

## API and routing compatibility

The current Nest app has the global `/api` prefix. Health routes are `GET /api/health` and `GET /api/ready`; auth routes are under `/api/auth/*`. Existing MicroFE clients may call `/auth/*`, so explicitly align the gateway rewrite or route prefix and verify cookie forwarding before cutover.

The service currently listens on port `4010`.

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
- The release workflow publishes to `ghcr.io/phanthienquoc/microfe-auth:<commit-sha>`. Production deployment is deliberately not triggered from this repository until platform-infra supports a verified single-service promotion and auth compatibility gates pass. The existing platform MicroFE promotion currently expects auth, shell and WebSocket image digests together.

## Required integration gates before production

- Commit and use a reviewed `package-lock.json` for deterministic installs; current CI generates the lockfile during the run.
- Expand tests beyond the current three PasswordService tests: signup/login, JWT claims, refresh rotation/reuse/revocation, MFA/recovery one-time use, WebAuthn challenge expiry/replay, and cookie forwarding.
- Verify the exact live DB column types, indexes, constraints, grants and transaction behavior. Preserve existing tables and constraints.
- Verify SimpleWebAuthn with browser-generated fixtures and confirm scrypt password hash compatibility against non-sensitive fixtures.
- Test cookie domain/path, CORS, CSRF, rate limits and security audit events.
- Provision and validate `DATABASE_URL`, `JWT_SECRET` and `MFA_ENCRYPTION_KEY` without printing values.
- Apply the narrowly scoped MFA challenge migration before enabling MFA challenge persistence. Drop legacy auth RPCs only after both TCE and MicroFE have rolled out and their flows have been verified.
- Deploy immutable image digests through platform-infra, verify readiness and rollout, and prove rollback before switching traffic.

The first dependency resolution reported 50 npm audit findings (2 low, 13 moderate, 35 high). Review and patch compatible dependencies; do not run `npm audit fix --force` without reviewing breaking changes.

## Safety boundary

Do not publish database credentials, perform destructive schema changes, remove DB integrity constraints, or route production users until auth compatibility, integration tests, secret availability and rollback are verified.
