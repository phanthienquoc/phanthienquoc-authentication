# Production runtime secrets

This repository owns the Auth service's runtime configuration contract. Secret **values** must not be committed to Git or copied into `platform-infra` GitHub Actions secrets.

## Source of truth

Use the approved secret manager for production credential values and provision them into Kubernetes namespace `microfe-platform` as Secret `microfe-auth-secrets`. The deployment consumes the Secret by name; `platform-infra` only verifies the Secret exists and contains the required keys before applying workloads.

Required keys:

- `SUPABASE_URL` — URL for the shared Supabase project. Treat as configuration, not as a credential.
- `SUPABASE_SERVICE_ROLE_KEY` — backend-only service-role credential.
- `JWT_SECRET` — signing key, at least 32 bytes. Preserve compatibility with existing sessions and consumers.
- `MFA_ENCRYPTION_KEY` — Base64-encoded 32-byte key. Do not rotate while existing MFA ciphertext needs to remain readable.

## Provisioning requirements

- Provision or update the Kubernetes Secret using the organization's approved secret manager/operator or an authorized operator session.
- Do not print decoded values, add them to workflow outputs, or store generated Secret YAML in the repository.
- Verify key presence without printing values.
- Do not rotate `JWT_SECRET` or `MFA_ENCRYPTION_KEY` as part of routine deployment. Plan any rotation and validate session/MFA compatibility first.
- Apply the required Supabase RPC migration and verify schema/grants before enabling production traffic; secret presence alone does not prove application readiness.

## GitHub Actions ownership

- This repository's Actions secrets should contain only credentials needed by Auth-owned automation, such as the token used to request image promotion.
- Cluster access credentials belong to the infrastructure/security boundary, not to the application build workflow.
- `platform-infra` retains its own deploy access and GHCR read credential, but does not need Supabase service-role, JWT-signing, or MFA-encryption values.
