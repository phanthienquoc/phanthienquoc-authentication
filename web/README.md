# MrCute ID Web

A Next.js App Router UI for MrCute ID. The existing NestJS auth screen remains the default; an opt-in Keycloak OIDC screen is available for non-production validation.

## Requirements

- Node.js 24+
- npm 10+

## Local development

```bash
cd ..
export KC_BOOTSTRAP_ADMIN_USERNAME=local-admin
export KC_BOOTSTRAP_ADMIN_PASSWORD='use-a-local-strong-password'
docker compose -f docker-compose.keycloak-dev.yml up -d

cd web
cp .env.example .env.local
npm install
npm run dev
``

Open http://localhost:3000.

## Keycloak OIDC mode (non-production only)

Set these values in `.env.local`:

```dotenv
NEXT_PUBLIC_AUTH_MODE=keycloak
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=mrcute
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=mr-cute-web
```

The browser integration uses `keycloak-js` with OIDC Authorization Code Flow + PKCE S256. The browser client is public and must never have a client secret. Keycloak performs credential entry, account registration policy, MFA and recovery. The current screen handles redirect-based sign-in/sign-out and displays the identity; it does not yet provide a backend-for-frontend session or resource-server token exchange.

To switch back to the existing UI, set `NEXT_PUBLIC_AUTH_MODE=legacy` or remove the variable.

## Existing NestJS UI mode

- The UI calls existing NestJS endpoints at `/auth/*`, not Supabase directly.
- The access token stays in Zustand memory, not localStorage/sessionStorage.
- The refresh token is expected to be an HttpOnly cookie and is never read by JavaScript.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, or `MFA_ENCRYPTION_KEY` with a `NEXT_PUBLIC_*` variable.

## Production safety

Do not enable Keycloak mode on production hosts until realm/client settings, token validation at resource servers, account/session migration, MFA/passkey parity, non-production end-to-end tests and rollback are approved. See [Keycloak OIDC foundation](../docs/keycloak-oidc-foundation.md). This PR does not change TCE Dashboard or Media Generation.
