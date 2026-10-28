# Manual Supabase Migration Execution Policy

**Status:** Active operating procedure. Owner screenshot verified the Supabase GitHub Integration's **Deploy to production** toggle is OFF on 2026-10-28.
**Project:** `gtqovpusfyyvxpeezxlo`
**Allowed repositories:** `phanthienquoc/phanthienquoc-authentication`, `phanthienquoc/TCE-dashboard`

## Intent

Do not let a connected Supabase GitHub integration automatically apply migrations as a side effect of an ordinary Git push/merge. Planning/implementation must review migration source and then explicitly apply approved SQL through the connected Supabase migration tool. GitHub CI remains responsible for source validation, not database deployment.

## Verified current state (2026-10-28)

- Owner-provided screenshot shows **Deploy to production = OFF** for `phanthienquoc/phanthienquoc-authentication`; working directory is `.`. This confirms the visible project integration setting, not every possible external deploy mechanism.
- The Auth repository has no GitHub Actions migration workflow; the checked workflows are validation-only `ci.yml`, `web-ci.yml`, and manual-dispatch-only `release.yml`.
- Supabase project metadata reports API `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.084`; the project default branch previously reported `MIGRATIONS_FAILED`.
- The original managed Integration workflow logs showed it applying `20261012000000_auth_persistence_rpcs.sql` and `20261014000000_keycloak_identity_persistence.sql`, but did not include a definitive terminal success message.
- The migration ledger contains historical TCE/Auth versions and duplicate-looking version/name history. Ledger presence alone does not prove source/schema parity. Historical drift remains tracked as `AUTH-UM-000`.
- Migration `20261027104702_secure_tce_stock_event_market_metrics_view` is in the remote ledger. Live catalog was verified to have `security_invoker=true`; `anon` and `authenticated` have no direct grants on the view; `service_role` can query it, returning 11,702 rows in the check.
- The 4 Auth persistence RPCs exist, have fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE is not granted to `anon` or `authenticated`; `service_role` can execute them.
- `public.auth_keycloak_identities` exists, has its primary/unique/email indexes, RLS is enabled, no policy is present, no table grants are present for browser roles, and service_role has SELECT/INSERT/UPDATE. Its current row count is 0.

## Required control-plane action

The owner screenshot now confirms **Deploy to production = OFF** in Supabase Dashboard → Project Settings → Integrations → GitHub Integration for project `gtqovpusfyyvxpeezxlo`. Keep it disabled. The connected Supabase MCP surface does not itself expose this integration toggle.

Official documentation: https://supabase.com/docs/guides/deployment/branching/github-integration

## Planner-controlled migration procedure

1. Confirm project ref is exactly `gtqovpusfyyvxpeezxlo` and read the current migration ledger.
2. Inspect the full SQL source and dependency/call-site contracts in the two allowed repositories. Do not rely on filenames alone.
3. Separate already-applied SQL from unapplied changes; detect duplicate version prefixes and version/name mismatches.
4. For new changes, create a version-controlled migration on a dedicated Git branch, test/review it and run CI.
5. Apply only the specific reviewed migration through the Supabase migration tool after source review; never apply the entire historical set to fix ledger drift.
6. Verify ledger and live catalog/function grants after application. Record the exact source commit, SQL purpose and verification results.
7. Keep the GitHub Integration deploy toggle disabled so ordinary pushes cannot independently replay the migration chain.

## Guardrails

- Do not reset/rebase/delete Supabase branches, manually edit `supabase_migrations.schema_migrations`, fabricate stub migrations, or bulk-replay historic SQL.
- No-op `SELECT 1;` reconciliation stubs are allowed only for version discovery when the matching version is independently confirmed as already applied remotely and the original SQL is unavailable. Such stubs do **not** establish schema parity and must not be replayed as schema repairs.
- Never dispatch production release workflows as a substitute for database migration.
- Security Advisor currently reports 35 RLS-enabled tables without policies, 8 functions without a fixed search_path, and leaked-password protection disabled. These must be reviewed by access model; do not add blanket permissive policies or revoke broad role access without checking application call sites.
- If provenance of a historical migration cannot be established, record it as unresolved and prepare a forward-only repair based on catalog/call-site evidence.
