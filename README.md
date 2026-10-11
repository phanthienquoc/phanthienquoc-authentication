# phanthienquoc-authentication

Central NestJS authentication service for TCE Dashboard and Media Generation.

## Status: scaffold CI-green, not production-ready

Branch: `feat/nestjs-auth-service`

CI run: https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/38132260499

The current branch passes the existing unit test, TypeScript typecheck and NestJS production build. That validates the current scaffold only, not an end-to-end migration or production readiness.

## Architecture

- NestJS owns authentication business rules: DTO validation, password checks, session issuance/rotation, JWT handling, MFA/TOTP, recovery codes and passkey/WebAuthn orchestration.
- PostgreSQL/Supabase is accessed as a persistence plane using the Node `pg` driver. This service does not rely on Supabase Auth, PostgREST or Supabase RPCs for authentication decisions.
- Keep database integrity constraints—primary keys, foreign keys, uniqueness and essential checks—as defense in depth. Code validation complements DB constraints. No constraints have been dropped by this branch.
- TCE and Media are intended to call the shared auth origin rather than own duplicate password/session logic; their clients have not yet been migrated.

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

## Current routes

- `GET /api/health`, `GET /api/ready`
- `GET /api/auth/status`
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/refresh`, `POST /api/auth/logout`
- MFA setup/enable/disable/status/login/recovery
- Passkey registration/login options and verification, list, rename and delete

The Nest app uses an `/api` global prefix, while existing clients call `/auth/*`. Align the route prefix or gateway rewrite explicitly before cutover.

## Known integration gates

- Commit a `package-lock.json` and use deterministic CI installs; the current workflow generates the lockfile during each run before `npm ci`.
- Current test coverage is only 3 PasswordService tests. Add integration tests for signup/login, JWT claims, session refresh/reuse/revocation, MFA/recovery one-time use, WebAuthn challenge expiry/replay, and client cookie forwarding.
- Existing TCE password hashes use the `salt:hex` scrypt representation; the scaffold currently preserves this format. Verify compatibility against representative non-sensitive fixtures before use.
- Exact live DB column types, indexes, constraints, RLS grants and transaction behavior still need systematic review. No migrations or constraint changes were performed.
- Verify SimpleWebAuthn integration with real browser-generated fixtures; build success does not prove passkey behavior.
- Cookie domain/path, CORS, CSRF and `/auth/me` forwarding need TCE/Media end-to-end smoke tests.
- Add rate limiting, structured security audit events, secret validation, and deployment/rollback configuration before production.
- CI audit output reported 50 dependency vulnerabilities on the first lockfile resolution (2 low, 13 moderate, 35 high). Review with `npm audit` and patch compatible dependencies; do not use `npm audit fix --force` without reviewing breaking upgrades.

## Safety boundary

Do not apply destructive schema changes simply to make the code compile. Do not publish database credentials. Do not route production users until auth compatibility, integration tests and rollback are verified.
