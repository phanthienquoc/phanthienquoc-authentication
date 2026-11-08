# AUTH-OPS-007 — Supabase GitHub integration verification

**Updated:** 2026-11-08  
**Status:** READ-ONLY DEPLOYMENT INPUTS ALIGNED — docs/tests-only PR may merge after exact-head checks; observe the external integration run

## Evidence confirmed in Supabase Dashboard by repository owner

Screenshots of Project Settings → Integrations → GitHub show:

- Connected repository: `phanthienquoc/phanthienquoc-authentication`
- Working directory: `.` (repository root)
- **Deploy to production: ON**
- Production branch name: `master`
- GitHub preview branching is unavailable on the current plan and is not enabled.

This is owner-provided UI evidence, not an independent read of the integration configuration through the Supabase API.

## Implications

A merge that updates `master` triggers the owner-confirmed Supabase GitHub integration for this connected project. The earlier 2026-10-27 `MIGRATIONS_FAILED` observation is not reproduced by the 2026-11-08 read-only API recheck: project status is `ACTIVE_HEALTHY`, and the branch-list API reports `FUNCTIONS_DEPLOYED`. The current remote migration ledger and Authentication `master:supabase/migrations` now match exactly (84/84 version/name entries, no pending or remote-only versions). This establishes migration version-set alignment, not full SQL/schema equivalence or a complete deployment-history audit.

PR #75 currently changes task/roadmap Markdown and HTTP tests only; it adds no migration file, application runtime code, or workflow. However, the integration is configured to deploy on the production branch, and the existing failed migration state means we cannot safely infer that merging this PR has no database side effects.

## Decision and next steps

- The current docs/tests-only PR #75 is eligible for squash merge after exact-head CI passes: its diff contains no migration, Supabase configuration, seed, Edge Function, application-runtime or workflow file.
- The connected repository's `supabase/` directory currently contains only `migrations/`; no `functions/`, `config.toml` or `seed.sql` is present. The PR adds no migration, so the current 84/84 version-set match leaves no pending SQL migration for the integration to apply.
- Auth `ci.yml` runs validation and a native ARM64 **non-publishing** image build on master push. Auth `release.yml` remains `workflow_dispatch`-only, so a docs/tests merge does not publish an image or send a GitOps promotion event.
- Supabase's documented production workflow runs pending migrations, configured seeds and changed Edge Functions; it runs on each commit to the connected branch. With no pending migration, config, seed or functions in this repository snapshot, no database/function change is expected from this PR. The exact external integration execution log is not exposed by the connected read-only API, so observe the integration run after merge and stop if any unexpected migration/deploy step appears.
- Do not toggle the integration, apply/reset migrations, edit the ledger, create/delete branches or dispatch Auth release workflows as part of this PR.
- This synthetic HTTP test PR is not live Auth endpoint/session/MFA/passkey validation; service/runtime mapping remains a separate check.
- No schema/data mutation, migration apply, branch operation, Edge Function deployment, release, or production workflow dispatch was performed for this checkpoint.

## Acceptance criteria

1. Integration target and deploy behavior are recorded with evidence.
2. All migrations that would be considered by the integration are identified and their provenance is authoritative.
3. No failed or untracked migration can be accidentally applied as a side effect of the PR merge.
4. Exact-head CI and security/regression checks pass.
5. The PR is squash-merged only after the side-effect gate is satisfied.


## Read-only deployment revalidation — 2026-11-08 18:55 ICT / 11:55 UTC

### Supabase API evidence

- Project `gtqovpusfyyvxpeezxlo`: `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.084`, region `ap-southeast-1`.
- Branch-list API: default branch `main`, Git branch `master`, status `FUNCTIONS_DEPLOYED`, preview project status `ACTIVE_HEALTHY`. This current status supersedes the historical 2026-10-27 `MIGRATIONS_FAILED` observation for this read-only snapshot; it does not expose the full external integration run history.
- Authentication `master:supabase/migrations`: 84 SQL files. Supabase migration-list API: 84 applied entries. Exact version/name set comparison: 84 matches, 0 pending local files, 0 applied versions without a repository source file.
- Authentication `supabase/` contains only `migrations/`; no `functions/`, `config.toml` or `seed.sql` is present.
- PR #75 current diff: `docs/plan/auth-ops-007-github-integration-verification.md`, task/roadmap Markdown and two test files only. No migration, runtime, workflow, config, seed or Edge Function changes.
- Exact-head CI recorded for PR #75: validation #40446492086 PASS; Supabase Preview skipped. The current master CI #42215394539 also passed validation and ARM64 non-publishing image build; Supabase Preview skipped.
- Owner-provided Supabase Dashboard evidence still shows GitHub integration connected to this repository root, production branch `master`, Deploy to production ON. The integration setting itself is not independently readable through the Supabase API.

### Expected merge effect

Supabase's current [Branching deployment documentation](https://supabase.com/docs/guides/deployment/branching) describes the deployment workflow as clone, pull, health, configure (when `config.toml` exists), migrate pending migrations, seed (when configured), and deploy changed Edge Functions. It runs on commits pushed to the connected branch.

For this PR, the repository snapshot has no pending migration version, no config/seed/function directory, and the PR changes none of those inputs. Therefore the expected external integration run has no SQL migration, seed or Edge Function change to apply. The app-owned master push workflow validates/builds but does not publish; production Auth publication remains manual-only through `release.yml`.

**Disposition:** PR #75 is safe to squash-merge after the current exact-head CI succeeds. After merge, verify the Supabase integration run completes without an unexpected migration or function action. Keep PR #76 draft; migration version-set parity does not prove full schema equivalence or resolve every AUTH-UM-000 investigation item. No Supabase write, branch operation, schema/data change or release dispatch was performed during this revalidation.
