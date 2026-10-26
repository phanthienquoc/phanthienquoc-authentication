# Authentication — User Management Task Queue

**Last audited:** 2026-10-26  
**Default branch:** `master`  
**Architecture baseline:** [`docs/user-management-roadmap.md`](../user-management-roadmap.md)  
**Canonical tracker:** [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16)  
**Scope:** Central NestJS auth service and its Next.js `web/` app. Legacy NestJS accounts remain distinct from Keycloak identities.

## Queue rules

- Preserve stable task IDs; update evidence in place.
- Never commit directly to `master`; use a dedicated branch and PR for each dependency-safe slice.
- Before every merge, inspect exact diff and push-triggered workflow side effects; never merge into a production release/migration path without separate authorization.
- Squash-merge only after exact-head required checks pass, mergeability and acceptance criteria are verified, and security/regression review is complete.
- No production migrations, live account mutations, Keycloak writes, or credentials in source/logs.
- Supabase runtime configuration values belong in GitHub Actions secrets/environment secrets; never fetch, print, copy, or persist secret values through repository files, outputs, logs, or artifacts.
- No Supabase development branch unless estimated cost is retrieved and user explicitly approves that amount; no apply/reset/delete/merge/rebase branch or Edge Function deployment without separate authorization.

## Supabase project and secret boundary (2026-10-26)

- Read-only `list_projects` and `get_project` return connected project `gtqovpusfyyvxpeezxlo`, named `phanthienquoc's Project`, region `ap-southeast-1`, PostgreSQL 17.6; `list_branches` reports only non-persistent `main` (`git_branch=master`) with `MIGRATIONS_FAILED`. This does **not** prove it is safe non-production.
- Repo config does not disclose a Supabase project ref: `.env.example` uses `https://YOUR_PROJECT_REF.supabase.co`; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied at runtime. Connected GitHub tools do not expose repository/environment secret values; those values must not be retrieved via logs or workflows.
- Source documents say Auth production runtime values are managed by the protected GitHub Actions Environment `production` in `platform-infra`, then provisioned as Kubernetes Secret `microfe-auth-secrets`. This repo uses `PLATFORM_INFRA_DISPATCH_TOKEN` for release handoff, not Supabase credentials. The owner has restricted changes to this repo and TCE Dashboard, so `platform-infra` is out of scope; do not edit its secrets or files.
- TCE Dashboard's `docs/config-key.md` independently says its service `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` originate from GitHub Actions secret/environment and map to `tce-app-secrets`. This supports shared-project intent but does not reveal the URL/ref or prove it equals the connected Supabase project.
- Never log secret values. Validate secret presence/connectivity only within existing CI/runtime contexts, emitting boolean status or a sanitized project ref only if already explicitly safe. Do not create a workflow that prints secrets or ask the owner to paste them into chat.
- Official docs: [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) explains grants and RLS are separate; [Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments) recommends distinct development/staging/production projects and migration-based promotion.

## AUTH-UM-000 — Reconcile auth RPC and migration provenance (UM-0)

- **Priority/status:** P0 / BLOCKED — source/readiness work exists; authoritative migration provenance and an approved non-production target are still missing.
- **Current behavior:** Read-only catalog and migration history show checked-in `20261012000000_auth_persistence_rpcs.sql` absent from the remote migration ledger; required RPCs `auth_rotate_refresh_session`, `auth_replace_mfa_recovery_codes`, `auth_consume_mfa_recovery_code`, `auth_consume_passkey_challenge` are absent from the inspected live function catalog. Legacy functions `rotate_refresh_token` and `consume_recovery_code` exist with service-role-only execution. The repo does not contain the provenance artifact for `restrict_auth_rpc_execution`.
- **Additional safe inspection (2026-10-26):** `list_tables(verbose=true)`, `list_migrations`, read-only `information_schema.columns` query and `get_advisors(type=security)` were run against the connected project. `public.users` has no suspension/status column; `public.auth_admin_audit_events` is absent. `public.refresh_sessions`, `mfa_recovery_codes`, passkey tables and user metadata exist. Security advisor reports 29 exposed-schema tables with RLS enabled but no policies (includes auth and unrelated app tables). No user/account rows were queried.
- **Identity and target evidence:** Auth `README.md` says it shares the same project as TCE; TCE `docs/config-key.md` says its project URL/key come from GitHub Actions secret/environment. Neither repository reveals the actual secret URL/ref. The connected project is a plausible candidate, not a verified match to runtime secrets or a safe non-production target.
- **Desired behavior:** Reconcile exact live contract and migration provenance against an approved non-production database before any DDL or runtime rollout.
- **Acceptance criteria:** (1) authoritative migration artifact/revision located; (2) project ref corroborated without reading/printing secrets; (3) explicit non-production target verified; (4) signatures, ACLs, RLS/grants and relevant columns validated; (5) non-mutating readiness fails closed on mismatch.
- **Validation:** Project discovery, verbose table listing, migration listing, read-only catalog queries, security advisor and current official Supabase docs. No schema/data changes.
- **Dependencies/risk:** Critical; authentication session rotation, MFA recovery and passkey consumption may fail under source/live contract mismatch.
- **Links:** [roadmap](../user-management-roadmap.md), [migration source](../../supabase/migrations/20261012000000_auth_persistence_rpcs.sql), [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## AUTH-SEC-002 — Revoke browser-role access to internal auth tables

- **Priority/status:** P0 / BLOCKED — security review and migration proposal must not be applied to the connected project.
- **Evidence/current behavior:** Catalog audit found table-level grants for `anon` and `authenticated` on `public.users`, `refresh_sessions`, `mfa_recovery_codes`, `auth_passkey_challenges`, and `auth_passkey_credentials`; RLS is enabled but no policies were found for these objects. No account rows were read.
- **Desired behavior:** Server-only tables must be unreachable to browser roles; preserve the existing backend service-role client. RLS and grants must be jointly reviewed.
- **Acceptance criteria:** least-privilege migration artifact reviewed against authoritative provenance; explicit grants verified in non-production; security advisor and negative access tests confirm browser roles cannot read/write or execute internal auth operations.
- **Validation:** read-only catalog/grant inspection and official [Supabase API security docs](https://supabase.com/docs/guides/api/securing-your-api).
- **Dependencies/risk:** Critical; external direct table grants increase attack surface. No migration created/applied in this task because an attempted source write was blocked by tool safety controls and the target remains unverified. Do not bypass that control or reconstruct via another write path.

## AUTH-UM-001A — Admin principal, guard and safe response projection

- **Priority/status:** P1 / DONE — read-only API foundation merged.
- **Current/desired behavior:** Protected GET list/detail only; server-side deny-by-default admin guard; safe field allowlist.
- **Acceptance:** non-admins denied, signup cannot set ADMIN, no public bootstrap/self-escalation, no hashes/tokens/MFA/recovery/passkey secrets exposed.
- **Validation/evidence:** existing test suite and merged PR history documented in GitHub. Keycloak remains a separate identity provider/source of truth.

## AUTH-UM-001B — Privileged audit persistence

- **Priority/status:** P0 / BLOCKED — audit table absent from inspected live catalog; do not expose mutation routes.
- **Desired behavior:** controlled audit records for privileged operations with actor/provider, action, target/provider, timestamp, outcome, request/correlation ID and safe before/after metadata only.
- **Acceptance:** write authorization tests, redaction tests, audit failure behavior and non-production schema verification before any mutation endpoint.
- **Risk/dependencies:** High; depends on AUTH-UM-000 and approved non-production environment.

## AUTH-UM-002 — Account lifecycle and session revocation

- **Priority/status:** P0 / BLOCKED — no status/suspension column; audit persistence and schema contract unresolved.
- **Desired behavior:** protected list/detail, role change, suspend/reactivate, revoke sessions; prevent self-role-change and last-admin lockout using server-side checks and concurrency-safe transactions.
- **Acceptance:** suspended users denied at password login, refresh, MFA and passkey entry paths; session revocation behavior tested; signup always assigns USER; mutation audit is present; no destructive delete by default.
- **Risk/dependencies:** Critical; depends on AUTH-UM-000 and AUTH-UM-001B. No live account mutation.

## AUTH-UM-003 — Read-only admin UI and browser verification

- **Priority/status:** P2 / PARTIALLY IMPLEMENTED — read-only directory merged; browser dialog tests remain open.
- **Desired behavior:** accessible directory/detail; no direct Supabase queries; UI mutations remain hidden until APIs/audit tests exist.
- **Acceptance:** exact-head browser CI passes focus containment/restoration, Escape, safe detail projection and responsive viewport checks; do not weaken assertions to bypass timeout.
- **Evidence:** [PR #43](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/43) remains open pending exact-head CI; [PR #45](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/45) is a separate dev-origin/test-diagnostics fix and needs exact-head CI verification.
- **Risk/dependencies:** Medium; independent of schema migration, but not a substitute for backend authorization.

## AUTH-UM-004 — Non-production security/integration gate

- **Priority/status:** P1 / BLOCKED until UM-0 through UM-3 gates and a verified non-production Supabase target exist.
- **Acceptance:** backend tests/typecheck/lint/build/container build; frontend tests/typecheck/lint/build/container build; non-production integration for auth RPCs, authorization, lifecycle, session revocation, MFA/passkeys, audit redaction, RLS/grants, CORS/cookies and gateway routing.
- **Risk:** Critical for rollout; CI alone cannot prove live schema compatibility.

## Secret handling and workflow side-effect gates

- Auth `.github/workflows/ci.yml` runs tests/typecheck/build/container build on pushes and pull requests; `.github/workflows/release.yml` is `workflow_dispatch`-only but explicitly publishes an ARM64 image and requests GitOps promotion to `platform-infra`. Never dispatch it without separate release authorization.
- TCE `.github/workflows/wf-03-tce-production-deploy.yml` is also `workflow_dispatch`-only but performs production image build/release and GitOps handoff. Verify before any merge; do not dispatch for this task.
- Current exact PR checks and diffs must be re-read before merge; a skipped Supabase Preview check is not a pass. Do not merge if Supabase integration may apply migrations to the shared/live database until the target is explicitly verified safe.
- Preserve the current `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` client pattern. Do not add Supabase Auth, `DATABASE_URL`, `pg`, browser DB access, secret output, or production DB operations.
