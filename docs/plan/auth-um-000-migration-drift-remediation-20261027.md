# AUTH-UM-000 — Migration drift investigation and remediation plan

**Status:** Investigation plan created; drift intentionally deferred per owner instruction.  
**Date:** 2026-10-27  
**Scope:** `phanthienquoc/phanthienquoc-authentication` and Supabase project `gtqovpusfyyvxpeezxlo` only.  
**Priority:** P1 for deployment reliability; not an immediate runtime incident based on evidence currently available.

## Owner decision

- Do not block current work solely on historical migration drift. Treat resulting migration/deploy failures as a follow-up bug to fix when needed.
- Investigate the cause now and document a safe, evidence-led remediation path.
- Do not reset/rebase/delete Supabase branches, edit the migration ledger manually, replay historical SQL, or run production deployment workflows as part of this task.

## Confirmed evidence (2026-10-27)

1. Supabase project API reports `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.084`.
2. The default Supabase branch is non-persistent and reports `MIGRATIONS_FAILED`; GitHub integration UI previously showed deployment-to-production enabled on Git branch `master`. Therefore, a push/merge to the linked branch may trigger deployment/migration activity and must not be treated as documentation-only side-effect-free without checking the binding.
3. The remote migration ledger contains migration versions with no corresponding source file in the authorized repository/repositories, and repository source contains versions absent from the remote ledger. The earlier inventory reported 65 ledger versions without source, 32 source version prefixes absent from the ledger, 13 exact matches, and duplicate local prefixes `202609070001`, `202609140001`, `202609160002`, `202609160003`. Recompute these counts against current default branch and current ledger before making remediation decisions.
4. Specific examples of remote-only ledger versions include:
   - `20261014024759` — `restrict_auth_rpc_execution`
   - `20261014130516` — `keycloak_runtime_schema`
   - `20261014131151` — `keycloak_runtime_login_role`
   A local-only source example is `20261012000000_auth_persistence_rpcs.sql`. Keycloak persistence source/remote versions also differ (`20261020234922` is present remotely).
5. A reconciliation migration `20261027040648_auth_persistence_rpc_status_reconciliation` was applied directly to the remote project on 2026-10-27 and appears in the ledger. It updates four Auth RPC definitions/privileges. The source migration file has not yet been independently confirmed present on the GitHub default branch. This creates a source-of-truth gap that must be reconciled before relying on GitHub-driven deployments.
6. The branch state `MIGRATIONS_FAILED` alone does not prove that every listed historical migration failed or identify which exact statement failed. Available evidence does not yet isolate a single root cause for the status.

## Likely causes (hypotheses; verify before changing anything)

- **Primary:** historical schema changes were applied to the remote database outside the current version-controlled migration chain, or their original migration files were renamed, removed, or never committed.
- **Contributing:** timestamp/version drift and duplicate source prefixes make a one-to-one mapping ambiguous; a simple version-name reconciliation cannot establish SQL equivalence.
- **Contributing:** the remote GitHub integration is configured to deploy from `master`, while repository/default-branch and Supabase branch metadata have reported differing names (`main` vs `master`). Verify actual binding rather than assuming the mismatch itself is the cause.
- **Possible:** one or more pending migrations fail on the shared branch due to schema preconditions or ordering. The current status does not identify which migration/statement failed; inspect deployment history and exact error output before concluding this is the cause.
- **Not established:** the 24-hour PostgREST timeout-manager events at root path `/` (telemetry label `env=prod`) do not establish a migration failure or a failed Auth endpoint.

## Remediation plan

### Phase 0 — Keep the system stable (no DB writes)
- Keep the issue non-blocking for unrelated implementation work, as requested.
- Do not merge migration-bearing PRs into the connected branch until the deployment binding and side effects are known.
- Do not dispatch release/deploy workflows or mutate Supabase branch state to force green.
- Capture the exact branch status, migration ledger, current repository refs and GitHub/Supabase deployment history with timestamps.

### Phase 1 — Build a provenance matrix
For every remote ledger version and every source migration file, record:
- version/prefix and name;
- source repository, path, branch and commit;
- whether exact source exists in Git;
- whether the remote version exists in the ledger;
- checksum of source SQL when available;
- dependent objects and relevant runtime call sites;
- evidence of original execution/deployment, if available.

Classify each row as: exact match, remote-only with recoverable source, local-only/unapplied, duplicate/ambiguous version, renamed-equivalent candidate, or unknown. Never infer equivalence from filename alone.

### Phase 2 — Find the actual failing deployment
- Inspect Supabase GitHub integration binding (repository, branch, production toggle) and deployment history using the dashboard/authoritative integration surface.
- Retrieve the exact failed migration/deployment error, failed version, and SQL statement from deployment logs if available.
- Compare the failure against schema preconditions and dependency order using read-only catalog queries.
- If logs are unavailable, mark the specific failing migration as unknown rather than guessing.

### Phase 3 — Reconcile source provenance
- Recover historical SQL from Git history or authoritative deployment artifacts where possible; preserve original version IDs and checksums.
- For remote-only migrations whose original SQL cannot be recovered, document the exact objects/effects from catalog evidence and label them unrecoverable; do not fabricate historical SQL.
- For local-only migrations, inspect current object definitions and all application call sites to determine whether the migration is unapplied, superseded, or already applied under another version.
- Resolve duplicate prefixes by choosing unique new versions only for future migrations; do not rename already-deployed migration versions casually.

### Phase 4 — Prepare a forward-only repair
- Prefer a small, new, idempotent forward migration for a verified missing/incorrect current-state change, not a replay of the entire historical chain.
- Keep source SQL and migration ledger provenance consistent; do not manually edit migration history to suppress failures.
- Review function signatures, SECURITY DEFINER settings, search_path, grants, constraints, RLS and runtime caller contracts before changing Auth RPCs.
- Specifically verify that `20261027040648_auth_persistence_rpc_status_reconciliation` is committed as the exact SQL that was applied and that all four RPC definitions match application call sites and intended transaction semantics.

### Phase 5 — Validate before enabling deployment
- Run static migration/source consistency checks and lint/typecheck/tests.
- Validate migrations against an isolated disposable database or supported preview environment when available; do not create a paid branch without cost approval.
- Confirm the precise deployment target and effects; then run the approved migration path and verify the branch no longer reports `MIGRATIONS_FAILED`.
- Re-run read-only catalog checks for affected objects and smoke-test the relevant Auth flows (refresh rotation/reuse, recovery-code consume/replace, passkey challenge consume, suspended-user rejection).
- Record before/after evidence, migration version, CI run, and rollback/forward-fix strategy.

## Acceptance criteria

- [ ] Every ledger/source mismatch is represented in a provenance matrix with an explicit evidence-based classification.
- [ ] The exact failed deployment/migration and error are identified, or the inability to identify them is explicitly documented.
- [ ] The repository/branch/production deployment binding is verified from the authoritative integration surface.
- [ ] The SQL applied as `20261027040648_auth_persistence_rpc_status_reconciliation` is represented in version control and verified against service call sites.
- [ ] No historical SQL was fabricated or blindly replayed; no ledger was manually edited to hide drift.
- [ ] A forward-only repair is reviewed and validated before any deployment-side mutation.
- [ ] Supabase branch health and affected Auth flow checks are captured after remediation.

## Current disposition

**Deferred bug, investigation documented.** No further Supabase schema/branch changes are authorized by this plan. Resume at Phase 1 when remediation is scheduled; use fresh evidence rather than assuming the earlier mismatch counts remain current.
