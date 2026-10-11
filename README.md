# phanthienquoc-authentication

Central NestJS authentication service for TCE Dashboard and Media Generation.

## Status: scaffold only — not production-ready

This branch establishes the NestJS skeleton, DTO validation, shared API routes, password/JWT primitives, PostgreSQL repository boundary, CI workflow and design notes. It has **not** yet completed the migration of TCE's full auth business logic or consumer cutover.

## Contract and architecture

- NestJS owns auth/business rules: validation, password verification, sessions, JWTs, refresh rotation/reuse handling, MFA, recovery, passkeys, authorization and rate limits.
- PostgreSQL/Supabase is persistence only. Retain PK/FK/unique constraints and essential checks as defense in depth; review any proposed constraint change individually, never drop them wholesale.
- TCE and Media should consume the one shared auth service, not duplicate login/session logic.
- Consumer compatibility requires preserving the existing `/auth/*` contract, cookie path/domain, MFA/passkey behavior and existing stored password format.

## Development

Node.js 24+, npm 10+.

```bash
cp .env.example .env
npm install
npm run start:dev
npm test
npm run build
```

## Current scaffold routes

- `GET /api/health`, `GET /api/ready`
- `GET /api/auth/status`
- `POST /api/auth/signup`, `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`, `POST /api/auth/logout`

Nest currently applies an `/api` global prefix. Production consumer compatibility needs an explicit gateway rewrite or a follow-up code change before deployment.

## Critical remaining work

- Port the current TCE implementation for MFA/TOTP, recovery-code consumption, passkey registration/login and passkey CRUD.
- Replace Supabase JS/RPC with parameterized direct PostgreSQL access and atomic, tested transactions for refresh rotation and one-time code/challenge consumption.
- Confirm schema columns against `public.users`, `public.refresh_sessions`, `public.mfa_recovery_codes`, `public.auth_passkey_challenges` and `public.auth_passkey_credentials`.
- Verify existing TCE password hash compatibility. New writes must keep the existing `salt:hex` format; never mass-reset or silently migrate hashes.
- Add rate limits, audit events, CSRF policy, live readiness checks and end-to-end auth contract tests.
- Verify cookie/CORS/path settings for TCE and Media.
- Run CI; no successful build/test result is claimed yet.
- Keep production credentials in the secret store; never log tokens or secrets.
