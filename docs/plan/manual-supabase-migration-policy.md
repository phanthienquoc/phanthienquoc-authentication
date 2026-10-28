# Manual Supabase Migration Execution Policy

**Status:** Active operating procedure. Owner screenshot verified on 2026-10-28 that the connected GitHub Integration has **Deploy to production = OFF**.
**Project:** `gtqovpusfyyvxpeezxlo`
**Allowed repositories:** `phanthienquoc/phanthienquoc-authentication`, `phanthienquoc/TCE-dashboard`

## Intent

Do not let a connected Supabase GitHub integration automatically apply migrations as a side effect of an ordinary Git push/merge. Planning/implementation must review migration source and then explicitly apply approved SQL through the connected Supabase migration tool. GitHub CI remains responsible for source validation, not database deployment.

## Verified current state (2026-10-28)

- Owner-provided screenshot shows **Deploy to production = OFF** for `phanthienquoc/phanthienquoc-authentication`; working directory is `.`. Keep it off. The Supabase MCP surface cannot itself change this dashboard setting.
- The Auth repository has no GitHub Actions migration workflow; `ci.yml` and `web-ci.yml` are validation workflows, and `release.yml` is manual-dispatch-only.
- Supabase project metadata reports PostgreSQL `17.6.1.084`, API `ACTIVE_HEALTHY`. The only listed branch is non-persistent default `main` / Git `master`; current branch status is `FUNCTIONS_DEPLOYED` (observed 2026-10-28). This status does not independently prove schema/source parity.
- The Auth repo's migration source inventory now contains **83 SQL files for 83 remote ledger versions**, with no duplicate version prefixes, missing source versions, extra source versions, or version/name mismatches. PR #80 restored the two missing source files for migration versions already applied to the database.
- Migration `20261027104702_secure_tce_stock_event_market_metrics_view` was applied directly via the Supabase connector and source is now recorded in Auth repo. Live catalog confirms `security_invoker=true`; `anon` and `authenticated` have no direct grants on the view; a service-role read returned 11,702 rows during verification.
- Migration `20261028014657_secure_tce_trigger_function_search_paths` was applied directly via the Supabase connector and source is now recorded in Auth repo. Seven TCE-owned trigger functions have fixed `search_path=pg_catalog, public, pg_temp`. The remaining mutable-search-path advisor finding is `public.set_video_generation_updated_at()`, which belongs to the out-of-scope Media Generation repository and was not altered.
- The four Auth persistence RPCs exist, have fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE is not granted to `anon` or `authenticated`; `service_role` can execute them.
- `public.auth_keycloak_identities` exists with expected indexes, RLS enabled, no policies and no browser-role table grants. `service_role` has SELECT/INSERT/UPDATE. Row count was 0 at the check time.
- Historical stub migrations in the Auth directory are still no-op `SELECT 1;` reconciliation files. Although version coverage now matches the remote ledger, those stubs do **not** restore original historical SQL or establish full schema/source parity. Track original-source reconstruction as `AUTH-UM-000`; do not bulk replay history.
- Latest Supabase Security Advisor findings: 35 RLS-enabled tables without policies (INFO), 41 GraphQL-visible objects for each of `anon` and `authenticated`, and leaked-password protection disabled. The view's `security_definer_view` finding is cleared. The Auth RPC grants and internal-table access model must remain least-privilege; do not create blanket RLS policies merely to suppress INFO findings.

## Planner-controlled migration procedure

1. Confirm project ref is exactly `gtqovpusfyyvxpeezxlo` and read the current migration ledger.
2. Inspect full SQL source and dependency/call-site contracts in the two allowed repositories. Do not rely on filenames alone.
3. Separate already-applied SQL from unapplied changes; detect duplicate version prefixes and version/name mismatches.
4. For new changes, create a version-controlled migration on a dedicated Git branch, test/review it and run CI.
5. Apply only the specific reviewed migration through the Supabase migration tool after source review; never apply the entire historical set to fix ledger drift.
6. Verify ledger and live catalog/function grants after application. Record exact source commit, SQL purpose and verification results.
7. Keep the GitHub Integration deploy toggle disabled so ordinary pushes cannot independently replay the migration chain.

Official documentation: https://supabase.com/docs/guides/deployment/branching/github-integration

## Guardrails

- Do not reset/rebase/delete Supabase branches, manually edit `supabase_migrations.schema_migrations`, fabricate stubs for unknown/unapplied versions, or bulk-replay historical SQL.
- No-op `SELECT 1;` reconciliation stubs are allowed only for version discovery when the matching version is independently confirmed as already applied remotely and original SQL is unavailable. Such stubs do not establish schema parity and must not be replayed as schema repairs.
- Never dispatch production release workflows as a substitute for database migration.
- Review RLS / GraphQL exposure by access model. The frontend currently routes through TCE service and the central Auth Service; do not revoke shared-project role access until both repositories and any direct consumer contract have been checked.
- If provenance of a historical migration cannot be established, record it as unresolved and prepare a forward-only repair based on catalog/call-site evidence.
