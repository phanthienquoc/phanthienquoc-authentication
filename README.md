# phanthienquoc-authentication

Central NestJS authentication service for TCE Dashboard and Media Generation.

## Status: implementation branch, not production-ready

Branch: `feat/nestjs-auth-service`

This branch scaffolds NestJS with DTO validation, parameterized PostgreSQL access, password/JWT/session primitives, MFA/TOTP recovery handling, passkey/WebAuthn handlers and CI workflow. It has not yet passed a verified build/test run, and the TCE/Media clients have not been cut over.

## Architecture

- NestJS owns authentication and business rules: input validation, password checks, session issuance/rotation, JWTs, MFA/TOTP, recovery codes, passkeys and endpoint authorization.
- PostgreSQL/Supabase is a persistence plane accessed by the Node `pg` driver. This service does not use Supabase Auth, PostgREST or Supabase RPCs for authentication decisions.
- Preserve existing database integrity constraints (primary keys, foreign keys, unique constraints and essential checks). Add validation in DTOs/services; review every proposed constraint change separately. No constraints are dropped by this branch.
- TCE and Media should call the shared auth origin rather than independently owning password/session behavior.

## Local development

Requires Node.js 24+ and npm 10+.

```bash
cp .env.example .env
npm install
npm run start:dev
npm test
npm run build
```

## Current routes

- `GET /api/health`, `GET /api/ready`
- `GET /api/auth/status`
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/refresh`, `POST /api/auth/logout`
- MFA setup/enable/disable/status/login/recovery
- Passkey registration/login options and verification, list, rename and delete

The Nest app currently uses an `/api` global prefix, while the existing client convention calls `/auth/*`. Align this via an intentional gateway rewrite or a code/config change before cutover.

## Known integration gates

- Existing TCE password hashes use the `salt:hex` scrypt representation; the scaffold now emits/verifies that format.
- Existing schema includes `users` with MFA columns; `refresh_sessions` with `family_id` and `replaced_by`; recovery-code and passkey tables. These are accessed by SQL using bound parameters.
- Refresh rotation has a transaction/row-lock implementation branch-side, but replay/concurrency/error behavior must pass integration tests against the exact live schema before release.
- Passkey code has not been compile-tested against the pinned SimpleWebAuthn version.
- MFA recovery and challenge consumption must be verified as one-time under concurrency.
- Cookie domain/path, CORS and `/auth/me` forwarding need an end-to-end browser-to-Media smoke test.
- Add rate limiting, full test coverage, immutable image deployment, secret wiring and rollback tests before production.

## Safety boundary

Do not apply destructive schema changes merely to make the code compile. Do not publish database credentials. Do not cut over production users until hash compatibility, MFA and passkey behavior, cookie semantics and CI have all been verified.
