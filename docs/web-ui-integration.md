# Auth Web UI and TCE Dashboard integration

## Scope

The `web/` folder is a separate Next.js application alongside the NestJS API. It does not change the API's `/auth/*` routes or the current container entrypoint. Keep the first integration step isolated from TCE Dashboard.

## Browser configuration

Set only the public auth origin:

```dotenv
NEXT_PUBLIC_AUTH_API_URL=https://auth.mrcute.space
```

Do not expose Supabase service credentials or JWT/MFA signing keys in browser variables.

## TCE integration contract

TCE Dashboard should later consume a small typed client/store contract rather than implement its own password/session behavior:

- `authApi.login(email, password)` -> access token or MFA challenge response.
- `authApi.me(accessToken)` -> normalized user identity.
- `authApi.refresh()` -> new access token via the HttpOnly refresh cookie.
- `authApi.logout()` -> revoke refresh session and clear the cookie.
- Store access token in memory (Zustand); do not persist it in localStorage.
- Keep the NestJS service authoritative for password checks, JWT issuance, refresh-token rotation, MFA, passkeys and session revocation.

For the final TCE integration, extract `web/src/lib/auth/types.ts`, `web/src/services/auth-api.ts` and `web/src/features/auth/auth-store.ts` into a versioned shared package (or copy them into an explicitly owned TCE auth module) only after the API contract is stabilized and covered by integration tests.

## Required verification before cutover

1. Verify the API's exact login/MFA response shapes against integration tests.
2. Test credentialed CORS and refresh-cookie path/domain/SameSite rules from the deployed UI origin.
3. Test login, logout, refresh rotation, expired token behavior and concurrent refresh requests.
4. Test MFA, recovery codes and passkeys through browsers.
5. Verify logout revokes the session and that no access or refresh token is persisted in browser storage.
6. Keep TCE's current authentication behavior until the new client passes these gates.

## Current limitations

This is an initial UI scaffold. The NestJS Dockerfile still builds and runs the backend only, so this UI needs its own build/deployment lane or a separate frontend service to be served at `auth.mrcute.space`. Do not change the backend container command to Next.js.
