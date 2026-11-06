# AUTH-OPS-007 — Supabase GitHub integration verification

**Updated:** 2026-10-27  
**Status:** PARTIALLY VERIFIED — merge remains blocked

## Evidence confirmed in Supabase Dashboard by repository owner

Screenshots of Project Settings → Integrations → GitHub show:

- Connected repository: `phanthienquoc/phanthienquoc-authentication`
- Working directory: `.` (repository root)
- **Deploy to production: ON**
- Production branch name: `master`
- GitHub preview branching is unavailable on the current plan and is not enabled.

This is owner-provided UI evidence, not an independent read of the integration configuration through the Supabase API.

## Implications

A merge that updates `master` is configured to apply changes to the connected project's production database. The shared Supabase project metadata reports the default `main` / Git `master` branch as `MIGRATIONS_FAILED`. The migration ledger/source drift tracked under `AUTH-UM-000` remains unresolved.

PR #75 currently changes task/roadmap Markdown and HTTP tests only; it adds no migration file, application runtime code, or workflow. However, the integration is configured to deploy on the production branch, and the existing failed migration state means we cannot safely infer that merging this PR has no database side effects.

## Decision and next steps

- Keep PR #75 open; do not merge or dispatch release workflows yet.
- Do not toggle the integration or apply/reset migrations as part of this verification.
- Before merge, inspect the connected repository's `supabase/` working directory and determine exactly what the integration will attempt to apply on a push to `master`; reconcile migration history from authoritative source, not reconstructed SQL.
- Separately verify the project/runtime mapping for the Auth service before treating synthetic HTTP tests as end-to-end validation.
- No schema/data mutation, migration apply, branch operation, Edge Function deployment, release, or production workflow dispatch was performed for this checkpoint.

## Acceptance criteria

1. Integration target and deploy behavior are recorded with evidence.
2. All migrations that would be considered by the integration are identified and their provenance is authoritative.
3. No failed or untracked migration can be accidentally applied as a side effect of the PR merge.
4. Exact-head CI and security/regression checks pass.
5. The PR is squash-merged only after the side-effect gate is satisfied.
