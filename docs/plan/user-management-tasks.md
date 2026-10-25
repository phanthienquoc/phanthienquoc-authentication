# Authentication — User Management Task Queue

**Last audited:** 2026-10-25  
**Default branch:** `master`  
**Canonical architecture:** [`docs/user-management-roadmap.md`](../user-management-roadmap.md)  
**Canonical tracker:** [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16)  
**Scope:** This repository only. Legacy NestJS accounts are managed separately from Keycloak identities.

## Queue rules

- Keep task IDs stable; update status/evidence in place rather than creating duplicate tasks.
- Every task records current and desired behavior, acceptance criteria, validation, dependencies, risk and source links.
- Use one descriptive branch and PR per dependency-safe slice; never commit directly to `master`.
- Squash-merge only after exact-head required checks pass, mergeability is confirmed, and security/regression inspection is complete.
- Before merging, inspect push-triggered workflows and block merges that would publish/promote/deploy to production unless the user separately authorizes that exact side effect; documentation-only changes are not exempt.
- Never apply production migrations, deploy production, or mutate live accounts from this queue.
- A CI run marked skipped is not a successful test. Re-check pending runs on a later pass.

## Active tasks

### AUTH-UM-000 — Reconcile auth RPC and migration provenance

- **Priority/status:** P0 / BLOCKED — contract reconciliation is a release gate.
- **Evidence:** `docs/user-management-roadmap.md` section “Verified source/live RPC contract mismatch”; `src/auth/auth.repository.ts`; `src/auth/passkey.repository.ts`; `supabase/migrations/20261012000000_auth_persistence_rpcs.sql`.
- **Current behavior:** The roadmap records a read-only live catalog inspection showing the checked-in migration ledger does not include `20261012000000_auth_persistence_rpcs`, and the current source calls `auth_rotate_refresh_session`, `auth_replace_mfa_recovery_codes`, `auth_consume_mfa_recovery_code`, and `auth_consume_passkey_challenge` that were absent from the inspected live function catalog. The provenance of `restrict_auth_rpc_execution` is unresolved. Repository readiness probes table existence but does not verify RPC presence.
- **Desired behavior:** A reproducible, non-mutating schema/RPC contract check and verified migration provenance in an approved non-production Supabase environment before any runtime rollout.
- **Acceptance criteria:**
  - Identify the authoritative source/revision for every live auth RPC and reconcile it with repository migrations.
  - Validate function signatures, grants, RLS/policies, relevant columns and constraints against an approved non-production environment.
  - Add a non-mutating readiness/contract test that fails clearly when required RPCs are absent.
  - Record evidence and recovery options; do not reset, merge, rebase or migrate the shared project as part of this task.
- **Validation:** Read-only catalog diff; targeted repository contract tests; CI test/typecheck/build; verify no database writes occurred.
- **Dependencies:** Approved non-production environment and migration provenance evidence.
- **Risk:** Critical — refresh rotation, MFA recovery-code operations and passkey challenge consumption may fail if source and live schema diverge.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16), [auth RPC migration](../../supabase/migrations/20261012000000_auth_persistence_rpcs.sql).

### AUTH-UM-001 — Protected read-only admin user directory API

- **Priority/status:** P1 / DONE for the read-only API slice — merged on 2026-10-25 at squash SHA `14795baaef7a4b40fbf2d4236f572658cee56c95`. Lifecycle mutations remain out of scope.
- **Evidence:** `src/users/admin.guard.ts`, `src/users/users-management.controller.ts`, `src/users/users-management.service.ts`, `src/users/dto/list-users.dto.ts`, `test/admin.guard.spec.ts`, `test/user-management-security.spec.ts`.
- **Current behavior:** PR #18 is merged to `master` at `14795baaef7a4b40fbf2d4236f572658cee56c95`. It adds protected list/detail endpoints under `/api/admin/users`. The guard verifies a signed access token and reads the current `public.users.role` from the server-side service-role client; the service explicitly selects/maps `id,email,role,mfa_enabled`. Regression tests cover current-role denial, response redaction and signup non-escalation. No mutations or schema changes are included.
- **Desired behavior:** A minimal, fail-closed read-only directory with bounded input, allowlisted output, and regression coverage for admin authorization and signup non-escalation.
- **Acceptance criteria:**
  - Only callers whose current legacy account role is `ADMIN` can list or inspect accounts.
  - Missing/invalid tokens, missing accounts and persistence failures fail closed.
  - List/detail output never exposes password hashes, MFA secrets, recovery codes, passkey material, or session/token fields.
  - Search and pagination inputs are validated and bounded; role/status values are allowlisted.
  - Signup remains hard-coded to `USER`; no admin bootstrap endpoint is added.
  - Exact-head backend tests, typecheck, build and container build pass.
- **Validation:** Exact-head backend `validate` jobs passed on PR #18 head `dc3e7626dd37c4ce714cdea018b2128c63fe3eac` before squash merge; `Supabase Preview` was skipped because the branch was not associated with a preview branch. Verified the controller is mounted under the global `/api` prefix and the security regression test file is present on `master`.
- **Post-merge workflow evidence:** The master push triggered [auth-service-release run #40209889836](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40209889836), which completed successfully after publishing an ARM64 image and completing the “Request Auth image promotion in platform-infra” step. This is evidence of a promotion request, **not** proof of production rollout/health. No platform-infra inspection or rollback was performed. Future merges must preflight this release trigger.
- **Dependencies:** Existing `JwtService`, `SupabaseClientService` and verified legacy user schema.
- **Risk:** High — an authorization or response-shaping defect could expose the account directory or security data.
- **Links:** [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18), [overlapping guard PR #17](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/17), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-002 — Read-only admin user directory UI

- **Priority/status:** P1 / DONE for the read-only UI slice — merged on 2026-10-25 at squash SHA `90bf8fae15676107dfc94fd7452e813593a31e4b`. Mutation controls remain intentionally absent.
- **Evidence:** `web/src/app/admin/users/page.tsx`, `web/src/services/auth-api.ts`.
- **Current behavior:** PR #19 is merged. The read-only directory provides search, role filtering, pagination and a detail dialog. CI failures were corrected: duplicate API types removed, effect loading state adjusted, and internal navigation uses `next/link`. The page calls only the NestJS API and exposes no mutation controls.
- **Desired behavior:** A responsive, read-only admin page that consumes only the NestJS API and degrades safely on auth/API errors.
- **Acceptance criteria:**
  - Exact-head web typecheck, lint, build and container build pass.
  - API request/response types match PR #18 and all requests include the access token.
  - No direct browser-to-Supabase access or sensitive fields in the UI.
  - UI role checks remain a UX layer; server-side guard is the authority.
  - PR targets `master` without duplicating backend commits; merge only after API PR #18 is present on `master`.
- **Validation:** All applicable exact-head `validate` jobs passed on PR #19 head `7ae7ccfe9fa22578aeeb66d3d2795f8af46d4348` before squash merge; `Supabase Preview` was skipped because no preview branch was associated. Confirmed the PR changed only `web/src/app/admin/users/page.tsx` and `web/src/services/auth-api.ts`; API PR #18 was already merged.
- **Dependencies:** AUTH-UM-001 merged to `master`.
- **Risk:** Medium — type/contract mismatch or incorrect client-side assumptions can break the admin workflow, but the UI must not replace server authorization.
- **Links:** [PR #19](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/19), [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18), [Roadmap](../user-management-roadmap.md).

### AUTH-UM-003 — Audited account lifecycle API

- **Priority/status:** P1 / BLOCKED — schema and policy gates must be resolved first.
- **Evidence:** `docs/user-management-roadmap.md` “Proposed API contract” and “Data and audit rules”; `src/auth/auth.repository.ts`; `src/auth/auth.service.ts`.
- **Current behavior:** Legacy accounts have `USER | ADMIN` roles and refresh-session revocation fields. The roadmap records no account-status/suspension column and no audit table in the inspected live schema. No mutation endpoints are currently in PR #18.
- **Desired behavior:** Audited, reversible suspension/reactivation, policy-constrained role changes, and target-user refresh-session revocation.
- **Acceptance criteria:**
  - Every mutation is protected by current database-backed admin authorization.
  - Actor, target, provider, action, timestamp, outcome and correlation/request ID are audited with safe before/after metadata only.
  - Self-role changes, self-escalation and last-active-admin lockout are prevented, including concurrent requests.
  - Session revocation uses existing refresh-session semantics and does not revoke unrelated users' sessions.
  - Mutation routes remain absent until schema, audit persistence and authorization/concurrency tests pass.
- **Validation:** Unit/integration tests for allowed and denied transitions, concurrent last-admin protection, session-family revocation, audit failures and secret redaction.
- **Dependencies:** AUTH-UM-000; approved additive schema design and non-production validation.
- **Risk:** Critical — unsafe mutations can lock out administrators, leave compromised sessions active, or destroy auditability.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-004 — Enforce suspension across every authentication path

- **Priority/status:** P1 / BLOCKED — depends on the approved status model from AUTH-UM-003.
- **Evidence:** `src/auth/auth.service.ts`, `src/auth/auth.repository.ts`, `src/auth/mfa.service.ts`, `src/auth/passkey.service.ts`, `src/auth/passkey.repository.ts`, `src/auth/mfa.controller.ts`.
- **Current behavior:** The inspected roadmap records no status field. Login, refresh rotation, MFA completion and passkey authentication have separate code paths that must not be bypassed by a controller-only suspension check.
- **Desired behavior:** A suspended account cannot establish or refresh an authenticated session through password, refresh-token, MFA or passkey flows; reactivation restores access according to the explicit session policy.
- **Acceptance criteria:**
  - Status is checked atomically at the appropriate persistence boundary for login/refresh and before issuing tokens after MFA/passkey verification.
  - Suspension races with refresh/session rotation have documented and tested outcomes.
  - Existing password-hash format, JWT contract, MFA/passkey verification and Keycloak separation remain intact.
  - No token, recovery code, passkey private material or service credential is logged.
- **Validation:** Table-driven tests for every auth path, concurrent suspension/refresh cases, existing auth contract suite and CI.
- **Dependencies:** AUTH-UM-000 and AUTH-UM-003.
- **Risk:** Critical — incomplete enforcement leaves alternate authentication paths open for suspended accounts.
- **Links:** [Roadmap](../user-management-roadmap.md), [auth service](../../src/auth/auth.service.ts), [passkey service](../../src/auth/passkey.service.ts).

### AUTH-UM-005 — Admin audit event query API

- **Priority/status:** P1 / BLOCKED — audit schema and write semantics not yet approved.
- **Evidence:** `docs/user-management-roadmap.md` “Data and audit rules”; no audit table exists in the inspected schema recorded there.
- **Current behavior:** No admin audit table or `GET /admin/audit-events` endpoint is implemented.
- **Desired behavior:** Paginated, redacted admin/security event history suitable for investigating account changes without exposing secrets.
- **Acceptance criteria:**
  - Event schema has stable IDs, actor/provider, action, target/provider, timestamp, outcome and correlation/request ID.
  - Read API is admin-only, paginated, filterable by safe fields, and exposes only allowlisted metadata.
  - Audit writes are atomic with or reliably coupled to privileged changes; failure policy is explicit.
  - Tokens, passwords, MFA secrets/recovery codes, passkey material and credential hashes are never recorded.
- **Validation:** Schema contract tests, audit write/read tests, redaction tests, pagination tests and failure-injection tests.
- **Dependencies:** AUTH-UM-000 and AUTH-UM-003.
- **Risk:** High — incomplete or sensitive audit records weaken incident response and may leak credentials.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-006 — UM-4 end-to-end security and controlled rollout readiness

- **Priority/status:** P1 / BLOCKED — all prior security and contract gates must pass.
- **Evidence:** `docs/user-management-roadmap.md` UM-0 through UM-4; `.github/workflows/ci.yml`; `.github/workflows/web-ci.yml`.
- **Current behavior:** Read-only API/UI slices are in PRs; mutation lifecycle, audit integration, suspension enforcement and non-production contract validation remain incomplete.
- **Desired behavior:** An evidence-backed acceptance matrix for the complete admin workflow, with a controlled rollout decision separated from implementation merges.
- **Acceptance criteria:**
  - API and UI tests pass on exact merged SHAs.
  - Negative tests cover unauthenticated/non-admin access, stale role, self-escalation, last-admin protection, suspended-account auth paths and response/audit redaction.
  - Migration provenance and non-production contract validation are documented.
  - No production migration, deployment or live account mutation is performed by this task.
- **Validation:** Full backend and web CI; integration tests against approved non-production Supabase; review migration/rollout evidence and rollback plan.
- **Dependencies:** AUTH-UM-000 through AUTH-UM-005 as applicable.
- **Risk:** Critical — a false “complete” signal could allow an unsafe rollout.
- **Links:** [Roadmap](../user-management-roadmap.md), [Issue #16](https://github.com/phanthienquoc/phanthienquoc-authentication/issues/16).

### AUTH-UM-007 — Consolidate overlapping admin-guard implementation PRs

- **Priority/status:** P2 / DONE — PR #17 was closed as superseded after PR #18 merged and equivalent response-redaction/signup non-escalation coverage landed on `master`.
- **Evidence:** PR #17 and PR #18 both add admin guard/module code; PR #17 additionally covers signup non-escalation and response allowlisting, while PR #18 has the list/detail controller and database-role guard.
- **Current behavior:** PR #17 and PR #18 overlapped on `src/app.module.ts` and admin guard/module concepts. PR #18 was selected as the canonical implementation and merged; PR #17 was closed with a superseded-by comment.
- **Desired behavior:** One canonical implementation with the useful security regressions preserved, no duplicate module registration and no abandoned active implementation PR.
- **Acceptance criteria:**
  - Review both exact diffs and retain equivalent current-role authorization, allowlisted response, and signup non-escalation tests.
  - Merge the canonical API PR only after required checks pass.
  - Close the redundant guard-only PR with a superseded-by link once equivalent coverage is present on `master`.
- **Validation:** Compared changed-file lists and security-test intent; verified PR #18 merged and `test/user-management-security.spec.ts` exists on `master`; closed PR #17 as superseded.
- **Dependencies:** AUTH-UM-001.
- **Risk:** Medium — duplicate security primitives can diverge and make route authorization ambiguous.
- **Links:** [PR #17](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/17), [PR #18](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/18).
