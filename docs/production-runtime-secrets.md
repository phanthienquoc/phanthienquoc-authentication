# Production runtime secrets

This repository owns the Auth service application and its runtime configuration contract. Production secret values are centrally held by `platform-infra` in the protected GitHub Actions Environment named `production`; this repository must not store or transfer those values.

## Runtime Kubernetes Secret

The Auth deployment reads Kubernetes Secret `microfe-auth-secrets` in namespace `microfe-platform`. The required keys are:

- `SUPABASE_URL` — URL for the shared Supabase project. Treat as configuration, not a credential.
- `SUPABASE_SERVICE_ROLE_KEY` — backend-only Supabase credential.
- `JWT_SECRET` — signing key, at least 32 characters; preserve compatibility with existing sessions and consumers.
- `MFA_ENCRYPTION_KEY` — Base64-encoded 32-byte key; preserve existing MFA ciphertext compatibility.

## Ownership and deployment flow

- Store the four runtime values only in `platform-infra` → Settings → Environments → `production` → Environment secrets.
- `platform-infra` provisions `microfe-auth-secrets` immediately before applying production workloads when the target is `auth-service` or `all`, and verifies key presence without printing values.
- Auth release CI only builds and publishes the image and sends an image tag to the GitOps promotion workflow. It never sends secret values through `repository_dispatch`, outputs, artifacts, or command arguments.
- Do not place runtime credentials in this repository's Actions secrets, Git, Docker images, logs, or workflow artifacts. The Auth repository only needs its promotion token (for example, `PLATFORM_INFRA_DISPATCH_TOKEN`).
- Do not routinely rotate `JWT_SECRET` or `MFA_ENCRYPTION_KEY`; coordinate and test any rotation for session and MFA compatibility.
- Secret presence alone does not prove application readiness. Apply the required Supabase RPC migration and verify schema/grants before enabling production traffic.

## Security boundary

The production Environment should require appropriate reviewer access and limit who can edit deployment workflows. Never print secret values or create a checked-in/generated Secret manifest. Kubernetes Secret data is managed only by the infrastructure deployment path.
