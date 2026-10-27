# Manual Supabase Migration Execution Policy

**Status:** Adopted for planning; GitHub/Supabase integration toggle still requires dashboard action.
**Project:** `gtqovpusfyyvxpeezxlo`
**Allowed repositories:** `phanthienquoc/phanthienquoc-authentication`, `phanthienquoc/TCE-dashboard`

## Intent

Do not let a connected Supabase GitHub integration automatically apply migrations as a side effect of an ordinary Git push/merge. Planning/implementation must review migration source and then explicitly apply approved SQL through the connected Supabase migration tool. GitHub CI remains responsible for source validation, not database deployment.

## Verified current state (2026-10-27)

- The Auth repository has no GitHub Actions migration workflow; the only workflows are `ci.yml`, `web-ci.yml`, and a manual-dispatch-only release workflow.
- The TCE repository's current `.github/workflows/` directory also has no migration workflow. `WF-03` is production image publishing/GitOps promotion and must not be used as a migration workflow.
- Supabase project metadata reports API `ACTIVE_HEALTHY`; its only listed default non-persistent branch is `main` / Git `master`, with status `MIGRATIONS_FAILED`.
- Supabase workflow logs report `Remote migration versions not found in local migrations directory.` after cloning Git ref `master` and connecting to project `gtqovpusfyyvxpeezxlo`.
- Current default-branch source contains 36 TCE migration files; remote ledger has 79 entries. Many historical version mismatches and duplicate TCE prefixes exist. Do not replay or synthesize history to make the automated workflow green.
- Auth migration `20261027040648_auth_persistence_rpc_status_reconciliation` is already in the remote ledger and source control after PR #77. It did not fix the integration's unrelated missing-local-version error.

## Required control-plane action

The repeating migration step is Supabase's managed GitHub Integration deployment, not a GitHub Actions workflow in either repository. The connected MCP surface exposes database/migration operations but does not expose the project's GitHub Integration configuration, so it cannot switch off this setting directly.

In Supabase Dashboard, open **Project Settings → Integrations → GitHub Integration** for project `gtqovpusfyyvxpeezxlo` and turn **Deploy to production** off (or disable the integration if appropriate). Do not revoke GitHub access or disconnect a different project. Verify the toggle is off before merging migration-bearing PRs. Official documentation: https://supabase.com/docs/guides/deployment/branching/github-integration

## Planner-controlled migration procedure

1. Confirm project ref is exactly `gtqovpusfyyvxpeezxlo` and read current migration ledger.
2. Inspect the full SQL source and dependency/call-site contracts in the two allowed repositories. Do not rely on filenames alone.
3. Separate already-applied SQL from unapplied changes; detect duplicate version prefixes and version/name mismatches.
4. For new changes, create a version-controlled migration on a dedicated branch, test/review it and run CI.
5. Apply only the specific reviewed migration through the Supabase migration tool after source review; never apply the entire historical set to fix ledger drift.
6. Verify ledger and live catalog/function grants after application. Record the exact source commit, SQL purpose and verification results.
7. Keep the GitHub Integration deploy toggle disabled so ordinary pushes cannot independently replay the migration chain.

## Guardrails

- Never reset/rebase/delete Supabase branches, manually edit `supabase_migrations.schema_migrations`, fabricate stub migrations, or bulk-replay historic SQL.
- Never dispatch production release workflows as a substitute for database migration.
- If provenance of a historical migration cannot be established, record it as unresolved and prepare a forward-only repair based on catalog/call-site evidence.
