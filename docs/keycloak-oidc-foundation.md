# Keycloak OIDC foundation

## Decision and rollout boundary

Keycloak is the central Identity Provider for MrCute ID. NestJS remains the business/API service; it must not continue issuing a parallel production identity after consumer migration is complete. TCE Dashboard and Media Generation are separate OIDC clients and are migrated one app at a time.

This change is deliberately opt-in. The web UI stays in legacy NestJS mode unless `NEXT_PUBLIC_AUTH_MODE=keycloak` is explicitly configured. It does not change TCE Dashboard, Media, production routing, existing user records, or the existing auth database.

## Local Keycloak

Requirements: Docker Compose and a locally supplied bootstrap admin username/password. Do not commit credentials.

```bash
export KC_BOOTSTRAP_ADMIN_USERNAME=local-admin
export KC_BOOTSTRAP_ADMIN_PASSWORD='use-a-local-strong-password'
docker compose -f docker-compose.keycloak-dev.yml up -d
```

Admin console: http://localhost:8080. The dev realm import creates realm `mrcute` and public OIDC clients:
- `mr-cute-web` — local UI at `http://localhost:3000`
- `tce-dashboard` — future consumer at `https://tce.mrcute.space`
- `media-generation` — future consumer at `https://media.mrcute.space`

The imported realm is a development template, not a production-ready realm export. Before production, tighten redirect URIs to exact callback/logout paths, confirm web origins, configure email/SMTP, brute-force controls, required actions, MFA policies, client scopes/roles, and TLS/proxy settings. Do not enable implicit flow or direct access grants.

## Frontend OIDC mode

The browser client uses `keycloak-js`, OpenID Connect Authorization Code Flow with PKCE S256, and a public client (no browser secret). Configure the public environment variables in `web/.env.local`:

```dotenv
NEXT_PUBLIC_AUTH_MODE=keycloak
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=mrcute
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=mr-cute-web
```

Then run the web app from `web/`. The current screen supports redirect-based sign-in/sign-out and displays the authenticated identity. It does not yet provide a backend session/BFF or API token exchange.

## Backend/API token validation is a separate required phase

Before any app sends Keycloak access tokens to NestJS or another business API, implement and test JWT verification against the realm's OIDC discovery/JWKS metadata. Verify signature, issuer, audience/authorized party, expiry, and role mapping. Do not accept unsigned tokens or decode-only validation. Define distinct API audiences and least-privilege roles for each resource server. Do not treat an ID token as an API access token.

Current NestJS custom JWT/session endpoints, refresh rotation, MFA/recovery, and passkey/WebAuthn flows remain in place until replacements are explicitly implemented and tested. Do not silently translate Keycloak claims into legacy claims without a contract and tests.

## Database decision

The existing Supabase project remains the application data store. Keycloak requires its own isolated database/schema and JDBC configuration; do not point Keycloak at the existing application tables. Supabase Postgres compatibility, schema isolation, connection limits, TLS, backups/PITR, migration and supportability must be validated with a non-production project before choosing it as the Keycloak database. Never put a database password in this repository, client-side env vars, a realm export, or dispatch payloads.

## Ordered implementation phases

1. **Foundation (this PR):** local realm template, local Keycloak compose, opt-in browser OIDC client, architecture and security gates.
2. **Identity runtime:** provision Keycloak in non-production with managed secret references, TLS/proxy/health/readiness, durable DB, backups, admin bootstrap and upgrade/rollback policy. Do not expose the admin console publicly.
3. **Resource-server validation:** add issuer/JWKS validation and audience/role tests to NestJS without changing existing production token acceptance. Add negative tests for invalid signature, wrong issuer/audience, expired token and missing role.
4. **First consumer:** integrate one non-production app (TCE Dashboard) as an OIDC client; validate login/logout, callback state/nonce/PKCE, token renewal, API authorization, MFA and error paths.
5. **Second consumer:** migrate Media only after phase 4 passes.
6. **Cutover:** explicit human approval, session/account mapping, monitoring and tested rollback. Do not delete custom auth paths or switch production traffic as part of this foundation PR.

## Acceptance gates

- CI passes web lint, typecheck, production build and backend tests.
- Non-production end-to-end checks cover login/logout, SSO between clients, MFA, expired/invalid tokens, issuer/audience/role enforcement, CORS/cookie behavior if a BFF is introduced, and service outage handling.
- No client secret or server credential in browser bundles or repository.
- Production deployment is managed through `platform-infra`, immutable images and reviewed GitOps promotion.
- Existing TCE/Media authentication continues unchanged until explicit cutover approval and a verified rollback.
