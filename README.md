# phanthienquoc-authentication

Central NestJS authentication service for TCE Dashboard and Media Generation.

## Status

Bootstrap stage. This branch establishes the NestJS skeleton, DTO validation, central route namespace, JWT/password primitives, and persistence adapter boundary. It is not production-ready yet: MFA/TOTP, WebAuthn passkeys, rate limiting, transactional refresh rotation, CI and consumer migration are still required before production traffic.

## Responsibilities

- Own authentication and session business rules in NestJS.
- Keep Postgres/Supabase as persistence. NestJS owns DTO and business validation.
- Retain integrity constraints (PKs, FKs, uniqueness, essential checks). Review constraints individually; do not remove them wholesale.
- TCE and Media use the central service instead of maintaining duplicate password/session rules.

## Development

Requirements: Node.js 24+, npm 10+.

```bash
cp .env.example .env
npm install
npm run start:dev
npm test
npm run build
```

## Routes in this bootstrap

- `GET /api/health`, `GET /api/ready`
- `GET /api/auth/status`
- `POST /api/auth/signup`, `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`, `POST /api/auth/logout`

The production edge must preserve the existing consumer URLs. This scaffold uses Nest's `api` global prefix by default, so configure gateway rewrites intentionally.

## Before production

- Adopt the current TCE password hashing format or a verified dual-verification migration; never silently replace it.
- Port existing MFA/TOTP, recovery and WebAuthn implementation before cutover.
- Make refresh rotation atomic and detect reuse.
- Add rate limits and account-enumeration controls.
- Align cookie domain/path/CORS/origin for TCE and Media.
- Verify DB schema, constraints, indexes and RLS before migrations.
- Keep production secrets in the platform secret store.
