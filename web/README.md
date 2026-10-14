# MrCute ID Web

A Next.js App Router UI for the existing NestJS authentication service.

## Requirements

- Node.js 24+
- npm 10+

## Local development

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. The default API origin is `https://auth.mrcute.space`; change `NEXT_PUBLIC_AUTH_API_URL` to `http://localhost:4010` when running the NestJS service locally.

## Integration contract

- The UI calls the existing NestJS endpoints at `/auth/*`, not Supabase directly.
- Passwords are submitted only to `POST /auth/login` and `POST /auth/signup` over HTTPS.
- The access token stays in Zustand memory, not localStorage/sessionStorage.
- The refresh token is expected to be an HttpOnly cookie and is never read by JavaScript.
- For refresh cookies to work cross-origin, verify CORS credentials and browser cookie policy; a same-site custom-domain deployment is preferred.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, or `MFA_ENCRYPTION_KEY` with a `NEXT_PUBLIC_*` variable.

## Known API boundary

The current NestJS `POST /auth/login` MFA response returns `mfaRequired` and `userId`, but the UI store must retain that `userId` to complete `/auth/mfa/login` or `/auth/mfa/recovery`. The API client/store are designed to be the shared adapter for TCE Dashboard; finish this pending-MFA state handling before enabling MFA login in production.

No changes to TCE Dashboard are made in this initial UI scaffold.
