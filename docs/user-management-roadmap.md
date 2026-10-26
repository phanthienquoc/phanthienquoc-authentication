# User Management — Architecture and Delivery Roadmap

## Status and scope

- Status: Architecture baseline established; implementation is in progress. Read-only admin API and directory UI are merged. UM-0 RPC/migration reconciliation remains blocked; audit persistence (UM-1B), lifecycle mutations (UM-2), suspension enforcement and UM-4 verification are not complete. See [canonical task queue](plan/user-management-tasks.md) for stable IDs, evidence and dependencies.
- Owner: central NestJS authentication service and its Next.js `web/` app.
- Legacy NestJS accounts remain separate from Keycloak identities.
- No production migrations, production cutover, or real account mutations as part of planning.

## Verified source/runtime contract

- `src/auth/auth.repository.ts` uses the existing shared Supabase project and `@supabase/supabase-js`; `public.users` has `id`, `email`, `password_hash`, `role`, `mfa_enabled`, and `mfa_secret_encrypted`. Signup assigns `USER`.
- `src/db/supabase.client.ts` requires only server runtime values `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; no Supabase Auth, `DATABASE_URL`, or Node `pg`.
- TCE Dashboard `docs/config-key.md` says its service URL and service-role key originate from GitHub Actions secret/environment and map to `tce-app-secrets`. Auth `README.md` says it uses the same shared project; Auth production runtime secret documentation says protected production values are owned in `platform-infra` and provisioned as Kubernetes `microfe-auth-secrets`. The actual GitHub secret values are not visible through connected repository tools and must not be printed, copied, or routed through logs/artifacts.
- The connected Supabase project found via read-only `list_projects/get_project` is `gtqovpusfyyvxpeezxlo` (`phanthienquoc's Project`, `ap-southeast-1`, PostgreSQL 17.6). Repository source does not reveal a project ref; `.env.example` is a placeholder. Do not claim the connected project is the runtime target until a safe, non-secret comparison confirms it.
- `list_branches` returned only non-persistent `main`, `git_branch=master`, status `MIGRATIONS_FAILED`. This is not an approved non-production target.

## Read-only Supabase findings (2026-10-26)

The connected project was inspected using verbose table listing, migration history, read-only catalog SQL, and security advisors. No account/user row data was read and no database write was performed.

- `public.users` has no suspension/status column; `public.auth_admin_audit_events` is absent.
- `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_challenges`, `auth_passkey_credentials`, and `auth_keycloak_identities` exist.
- RLS is enabled on inspected auth tables but no policies were found. Catalog ACLs confirmed `anon` and `authenticated` table grants on `users`, `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_challenges`, and `auth_passkey_credentials`. Keycloak identity table is restricted to `postgres`/`service_role`.
- Remote migration ledger does not contain checked-in `20261012000000_auth_persistence_rpcs`; required `auth_rotate_refresh_session`, `auth_replace_mfa_recovery_codes`, `auth_consume_mfa_recovery_code`, `auth_consume_passkey_challenge` were absent from the inspected live function catalog. Legacy `rotate_refresh_token` and `consume_recovery_code` exist with service-role-only execution. Provenance for `restrict_auth_rpc_execution` is unresolved; do not invent its source or replacement.
- Security advisor reported 29 exposed-schema tables with RLS enabled but no policies, including auth tables and unrelated application tables. Do not mass-create policies or change grants without per-table owner/access-model review.
- Official Supabase docs: [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) states grants determine which roles can access objects, while RLS governs rows; [Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments) recommends separate development/staging/production databases and migration-based promotion.

## Phase definitions

### UM-0 — Schema and RPC contract discovery

- **Priority/status:** P0 / BLOCKED pending authoritative migration provenance and an approved non-production target.
- **Desired behavior:** exact application call sites, SQL signatures, grants, RLS/policies, relevant columns/constraints, and migration ledger are reconciled before rollout.
- **Acceptance:** authoritative artifact/revision located; target project safely corroborated without reading or disclosing secrets; target proven non-production; non-mutating readiness checks fail closed on missing RPCs/tables.
- **Validation:** Supabase discovery, catalog and docs completed read-only. No migrations applied.

### UM-1 — Authorization and audit

- **UM-1A status:** read-only protected admin list/detail foundation merged. Server-side guard checks the caller's current legacy account role; response fields are allowlisted.
- **UM-1B status:** BLOCKED until an audit table/schema target can be verified safely. Add audit records for actor/provider, action, target/provider, timestamp, outcome, request/correlation ID and safe before/after metadata only. Never log credentials or authentication factors.
- **Security acceptance:** deny by default; no public admin bootstrap; signup cannot set ADMIN; prevent self-escalation and last-admin lockout; no password hashes, tokens, MFA secrets, recovery codes, passkey material or refresh token hashes in responses/logs. No mutation routes until authorization and audit tests pass.

### UM-2 — Account lifecycle

- **Priority/status:** P0 / BLOCKED — status column and audit/schema contract unresolved.
- **Desired behavior:** protected role change, suspend/reactivate and session revocation.
- **Acceptance:** suspension denies password login, refresh, MFA and supported passkey flows; concurrency-safe self-escalation and last-admin protections; session revocation contract tests; all privileged actions auditable; no destructive delete by default.
- **Dependencies:** verified UM-0, UM-1B, non-production integration tests.
- No live account mutations.

### UM-3 — Admin UI

- **Priority/status:** PARTIALLY IMPLEMENTED — read-only directory merged; browser dialog focus/responsive verification still open.
- **Acceptance:** UI never queries Supabase directly; accessible list/detail and keyboard behavior; no mutation controls until corresponding secure backend routes and audit tests pass.
- Current browser PRs: [#43](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/43) and [#45](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/45); exact-head CI must be verified before merge.

### UM-4 — Non-production security/integration gate

- **Priority/status:** P1 / BLOCKED until UM-0 to UM-3 gates and an approved non-production database exist.
- **Acceptance:** service and web tests, typecheck, lint/build/container checks, and non-production integration for authorization, lifecycle, session revocation, MFA/passkeys, RPCs, audit redaction, RLS/grants, cookies/CORS and gateway routing.

## Secrets, environment and release boundaries

- Keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in their existing protected GitHub Actions/runtime secret source. Secret values are not part of this repository's content and must never be exposed in workflow output, artifacts, logs or chat.
- Do not edit `platform-infra` or retrieve its secret values; it is outside the authorized repo scope.
- Auth `.github/workflows/release.yml` is `workflow_dispatch`-only but publishes an ARM64 image and requests GitOps promotion; never dispatch it without separate release authorization.
- TCE `.github/workflows/wf-03-tce-production-deploy.yml` is `workflow_dispatch`-only but builds/releases production images and requests GitOps handoff. Any merge still requires exact push-trigger side-effect checks.
- Never create a Supabase development branch until `get_cost` is checked and the owner explicitly approves the quoted amount. Never apply migrations, alter production schema/data, reset/delete/merge/rebase branches, or deploy Edge Functions without separate authorization for that exact operation.
- No production deployment, live trading/orders, or real account mutations as part of this roadmap.

## Canonical task tracking

Detailed status, acceptance criteria, validation, dependencies, risk, exact evidence and links live in [`docs/plan/user-management-tasks.md`](plan/user-management-tasks.md). Update that queue in place; do not create duplicate task trackers.
