# User Management — Architecture and Delivery Roadmap

## Status and scope

- **Status:** UM-1A, UM-1B, UM-3, UM-2A and UM-2B are merged. Server-issued MFA challenge PR #55 is merged at `7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7`; suspension enforcement PR #61 at `c88c4ad8f5e248a6a1da30ddc381da32a3c0097a`; lifecycle API/UI PR #64 at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`. Auth Service CI and Auth Web CI passed on the exact PR #64 head, including browser tests. Its source migration matches applied ledger version `20261026084506 auth_admin_user_lifecycle_rpcs`; no Supabase branch was created. End-to-end user-lifecycle integration and historical migration provenance remain open under the canonical task queue. The connected project is treated as the owner's private production target; the user explicitly authorized routine scoped migration execution, but not live account-row mutations or application deployment.
- **Owner:** Central NestJS authentication service and its Next.js `web/` app.
- **Scope:** This roadmap governs User Management and authentication work only; it does not change TCE or Media consumers.
- **Change record (2026-10-26; prior checkpoint superseded):** Earlier scoped RPC, audit and MFA-challenge migrations are present in the connected project's ledger. The initial read-only checkpoint predated the owner's later instruction to treat this as a private production target and the UM-2A status migration application recorded below. The user later explicitly authorized routine scoped migration execution while prohibiting Supabase branch creation. No Supabase branch was created, and no production release or trading action occurred. The runtime URL-to-ref mapping still cannot be independently read from placeholder `.env.example` values or hidden GitHub secret values.

## Latest lifecycle RPC migration checkpoint — 2026-10-26 15:50 +07:00

- The owner directed that ordinary Supabase migrations should proceed and explicitly said not to create a Supabase branch. No Supabase branch was created.
- Connected project identified by read-only `list_projects/get_project`: ref `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`. Project API status is `ACTIVE_HEALTHY`; the only listed branch remains default, non-persistent `main` / Git `master`, with status `MIGRATIONS_FAILED`. Keep both observations visible; do not mistake the branch status for a failed migration apply.
- The exact SQL from the Auth repository's lifecycle migration was applied with the connected Supabase migration tool, which returned `success: true`. The live migration ledger now records `20261026084506 auth_admin_user_lifecycle_rpcs`.
- Read-only catalog verification confirms:
  - `auth_admin_update_user_role(p_actor_user_id uuid, p_target_user_id uuid, p_new_role text, p_reason_code text, p_request_id text) RETURNS jsonb`
  - `auth_admin_update_user_status(p_actor_user_id uuid, p_target_user_id uuid, p_new_status text, p_reason_code text, p_request_id text) RETURNS jsonb`
  - `auth_admin_revoke_user_sessions(p_actor_user_id uuid, p_target_user_id uuid, p_reason_code text, p_request_id text) RETURNS jsonb`
  - All three are `SECURITY DEFINER`, have fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE is limited to `service_role` and owner `postgres`; `anon` and `authenticated` cannot execute them.
- This migration defines privileged routines and grants only; no user/account rows were read or changed. No application release, production application deployment, Edge Function deployment, or trading action occurred.
- The original lifecycle branch was ahead of current `master` but diverged because the MFA-challenge and status-enforcement slices had already landed separately. A clean branch `feat/auth-um-2-lifecycle-clean-20261026` was created from current `master` and only the dependent lifecycle code/tests/migration were ported, keeping the merged MFA/status migrations out of the new change. The lifecycle migration source is aligned to the applied version `20261026084506`.
- Remaining: run exact-head service/web/browser checks, inspect the full authorization/audit/concurrency diff, and complete the merge-side-effect gate before merging. The successful migration apply alone is not an end-to-end lifecycle integration test.

## UM-2B lifecycle completion and incident reconciliation — 2026-10-26 16:15 +07:00

- [PR #64](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/64) was squash-merged at `2a233d1b45ed1d52adc2b91b8608dc686d24f9ec`; the default branch was verified at the same SHA. Exact-head Auth Service CI [#40296896614](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896614) and Auth Web CI [#40296896540](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40296896540) passed, including browser checks. The Auth application release workflow remains manual-dispatch-only; no release dispatch or app deployment occurred.
- The lifecycle SQL was applied via the connected Supabase migration tool at the user's direction; it returned success and `list_migrations` records `20261026084506 auth_admin_user_lifecycle_rpcs`. The source file on master matches that ledger version. Post-apply catalog checks confirmed all three lifecycle RPCs, fixed `search_path=pg_catalog, public, pg_temp`, and EXECUTE limited to `service_role` / owner `postgres`. No Supabase branch was created. No user/account rows were read or changed.
- Environment classification is private production based on the owner's explicit instruction and production-tagged telemetry. Supabase project API status is `ACTIVE_HEALTHY`, while its only listed non-persistent default `main` / Git `master` branch reports `MIGRATIONS_FAILED`. These are separate status facts; neither alone establishes the GitHub integration target or deployment toggle. The user explicitly authorized routine scoped migrations, but not live account mutations, production app release or live trading.
- Earlier [PR #62](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/62) records a bounded management API event tagged `env=prod` at `2026-10-26T08:45:06.114Z` that matches the lifecycle SQL and timing of the authorized apply in this task. The older statement that the current automation did not perform the apply is stale. The log result did not expose actor identity; it does not establish a separate unknown actor.
- Stable tasks AUTH-OPS-003 and AUTH-OPS-004 have been added to the canonical queue: reconcile the production-tagged apply evidence with source/ledger and investigate 36 PostgREST timeout-manager events on the root path. AUTH-OPS-002 / AUTH-UM-000 continue to track three remote-only migration versions (`20261014024759`, `20261014130516`, `20261014131151`) and the Keycloak migration version mismatch.
- PR #60 is closed as superseded by PR #64. PR #62 is retained as the source of the incident evidence until the updated task-queue/roadmap PR replaces it. PR #63 remains a draft cache mitigation; its code and tests passed on the old head but it still needs porting to the current master branch and exact-head validation.

## Verified current state

## UM-2A suspension-enforcement migration — 2026-10-26

- **Owner-confirmed environment:** The owner confirms the two authorized repositories share one Supabase project and classifies it as non-production. Read-only discovery identifies project ref gtqovpusfyyvxpeezxlo, region ap-southeast-1; the only listed branch is default main / Git master, non-persistent, and its metadata reports MIGRATIONS_FAILED. This platform status is retained as evidence rather than interpreted as the owner's environment classification. No Supabase branch was created.
- **Applied migration:** The exact SQL source from the UM-2A branch was applied using the connected Supabase migration tool. The remote ledger records 20261026080831 auth_user_status_enforcement; the source is tracked at supabase/migrations/20261026080831_auth_user_status_enforcement.sql on the clean dedicated branch, with SQL bytes unchanged from the applied payload.
- **Post-apply verification:** Read-only catalog inspection confirms public.users.status text NOT NULL DEFAULT 'ACTIVE', a check constraint allowing only ACTIVE | SUSPENDED, and auth_create_refresh_session(uuid,uuid,uuid,text,timestamptz,text,text) RETURNS boolean as SECURITY DEFINER with fixed search_path=pg_catalog, public, pg_temp. anon and authenticated have no EXECUTE on this RPC; service_role and owner postgres do. Related refresh/MFA/passkey RPCs remain server-role-only with fixed search paths. No user/account rows were selected or individually mutated.
- **Boundaries:** This is schema/RPC preparation only. Suspension enforcement code has not been merged or deployed; no live user was suspended, no session was revoked via lifecycle RPC, no Edge Function/app release occurred, and no trading operation was performed. The separate lifecycle mutation migration remains source-only. GitHub/Supabase project metadata does not expose the configured repository/deploy toggle for its Git integration, so no independent claim is made about that toggle.
- **Follow-up:** Complete exact-head CI/security review for the dedicated UM-2A PR, then carry the dependency-safe UM-2B lifecycle work forward with recent-MFA and atomic-audit enforcement. Do not create Supabase branches.

- `src/auth/auth.repository.ts` uses the existing shared Supabase project and `@supabase/supabase-js`; live `public.users` columns are `id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted,created_at,updated_at`. There is no status/suspension column.
- Signup assigns `USER`. The NestJS API has signup/login/`me`/refresh/logout and MFA/passkey flows. The read-only `/api/admin/users` list/detail endpoints remain merged. The typed server-side audit writer is also merged, but no role/status/session mutation endpoint or public audit-read API exists.
- Live `public.auth_admin_audit_events` is RLS-enabled with no policies/direct table privileges; `auth_record_admin_audit_event` has a fixed search path and EXECUTE only for `service_role` plus owner `postgres`.
- Live `public.auth_mfa_login_challenges` and five RPCs are present in the connected project, but their source migration/code are still on PR #55 and not on `master`. Current master still has the legacy userId-based MFA completion path until that PR is merged.
- The connected project has only a non-persistent `main` branch (Git branch `master`) with `MIGRATIONS_FAILED`; production versus non-production is unverified. The Supabase Preview check on PR #55 is skipped, not a migration pass.
- No account rows or raw secrets were read in this run; all database checks were catalog, privilege, migration-ledger, advisor and aggregate-log queries.

## Authentication and suspension enforcement path map — source inspection 2026-10-26

- **Password login:** `AuthService.login` verifies credentials. On master, an MFA-enabled account still returns `mfaRequired + userId`; PR #55 changes this to an opaque server-issued challenge and withholds JWT/refresh cookie until challenge completion.
- **Refresh:** `AuthService.refresh` uses `auth_rotate_refresh_session` and returns an access token while keeping the refresh token in the HttpOnly cookie. The live RPC signature/privileges match the current repository contract; the live `public.users` schema has no status field, so suspension cannot currently be enforced here.
- **MFA:** On master, registered completion still accepts `userId + code`. PR #55 replaces that with a hashed server-issued challenge, atomic TOTP consumption, and one RPC transaction for recovery-code/challenge consumption. The duplicate `src/auth/mfa.controller.ts` was unregistered and is removed in PR #55.
- **Passkey:** `PasskeyService.authenticationVerify` validates the WebAuthn challenge and updates the credential counter. PR #55 routes MFA-enabled passkey success through the same challenge issuance method as password login; non-MFA accounts still proceed to normal session issuance.
- **Suspension gap:** None of the login, refresh, MFA or passkey paths can enforce a status/suspension flag until an approved status schema exists. No mutation route is added by this roadmap update.
- **Live contract:** The four source-required auth RPCs, audit RPC and five MFA challenge RPCs exist in the connected catalog with fixed search paths and `service_role`/owner EXECUTE. Migration-history drift and environment classification remain separate blockers.

## Applied auth RPC migration — 2026-10-26T10:09+07:00

The source migration `20261026030920_auth_persistence_rpc_contract_reconcile.sql` and browser-grant revocation migration `20261026032152_revoke_browser_auth_table_privileges.sql` are tracked on master. Read-only catalog checks confirm the four source-required RPC signatures and service-role/owner EXECUTE privileges. The live ledger also contains the later audit versions `20261026035340`/`20261026035431` and MFA challenge version `20261026040431`; audit source is on master, while MFA challenge source remains on PR #55.

The current project branch status remains `MIGRATIONS_FAILED`, and production/non-production classification is unknown. The Supabase Preview check is skipped because no branch is associated and preview-branch creation is disabled. This run did not apply a migration or create a Supabase branch.

A single aggregate log query found `auth_rotate_refresh_session` with SQLSTATE `42P01` at `2026-10-26T00:32:48Z`, before `20261026030920`; the same query returned no matching later error. Recheck only after an approved non-production integration test; do not execute mutating RPCs against the current target.

## Auth persistence browser-grant remediation — 2026-10-26T03:21:59Z

The live catalog confirms browser-role direct privileges were removed from the five legacy Auth tables. The audit and MFA challenge tables are also RLS-enabled with no direct table grants, including for `service_role`; their server-only SECURITY DEFINER RPCs are the application access path.

The latest read-only security advisor reports 34 project-wide `rls_enabled_no_policy` findings. This is a shared-project count across schemas, not an Auth-only exposure count; no public policy was added to silence it. The performance advisor still notes unindexed foreign keys on `auth_passkey_challenges.user_id` and `refresh_sessions.replaced_by`; no DDL was performed. Project-wide GraphQL exposure findings span unrelated tables and were not changed as part of this Auth task.

## Login/refresh/passkey regression coverage — 2026-10-26

[PR #52](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/52) is merged at `aae24d8adb793ee9ec3201fd5c98c77fb3cf1cbd`. Exact-head service CI [#40264453765](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40264453765) passed the consolidated login/refresh/passkey failure-contract suite. The tests use in-memory mocks; they do not claim live database integration or resolve the separate server-issued MFA challenge requirement tracked by PR #55. Legacy PR #10 remains open and unchanged; it was not merged or modified by this automation.

## UM-1B audit persistence — applied 2026-10-26

[PR #54](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/54) is merged at `533fd4f6809c187759231d109fe7ac05239271c9`. The audit table/RPC and typed allowlisted writer are on master. Exact-head CI [#40266935252](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40266935252) and post-merge service CI [#40267173209](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40267173209) passed. Supabase Preview was skipped because no branch was associated and preview-branch creation is disabled; no non-production integration pass is implied.

The audit table remains server-only and append-oriented. No role/status/session mutation endpoint was added, and atomicity between audit writes and future mutations still needs approved non-production integration coverage before UM-2 can proceed.

## Server-issued MFA challenge — applied 2026-10-26

The live ledger contains `20261026040431 auth_server_issued_mfa_login_challenges`; the matching source, application changes and focused tests are on [PR #55](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/55), not on master. The table stores only a unique SHA-256 token hash, user binding, 5-minute expiry, one-time consumption, failed-attempt count and lock timestamp. RLS is enabled with no direct table grants; five SECURITY DEFINER RPCs use fixed `search_path` and EXECUTE is limited to `service_role`/owner `postgres`.

Password and passkey first-factor success share `AuthService.beginMfaLogin()`. TOTP validates then atomically consumes the challenge; recovery uses one RPC transaction to consume both challenge and one-time recovery code. Web state holds the raw token only in memory. PR #55 adds controller, RPC-adapter, passkey-parity, replay, recovery-atomicity and cross-account mismatch tests. Current PR head `a355ed7691ffa08c11ac41cd35a2f98cb022477c` passed service/web/push CI; recheck if the branch changes before merge.

**Merge gate:** do not merge PR #55 until the connected project is explicitly confirmed non-production and safe. It currently has only non-persistent `main`, branch status `MIGRATIONS_FAILED`, and unknown production/non-production classification. Supabase Preview is skipped because no branch is associated and preview-branch creation is disabled. This run did not apply the migration or execute mutating challenge/recovery RPCs. Gateway-level rate limiting and live five-attempt/expiry/recovery integration tests remain unverified; UM-2 suspension enforcement remains blocked by the missing `public.users.status` field.

## Product decision

Build an **admin-only User Management area** with the NestJS API as the enforcement boundary and the Next.js app as a client.

1. **Phase 1 manages legacy NestJS accounts** in the existing `public.users` table. Preserve password-hash format, JWT claims, MFA/passkey state and refresh-session contract. Never return password hashes, MFA secrets, recovery codes, passkey material, refresh-token hashes or internal security fields.
2. **Keycloak identities remain a separate provider.** If needed, show them as clearly labelled read-only rows initially. Do not claim a local `ADMIN` role can manage Keycloak users. Mutating Keycloak users/roles requires a separate server-side Admin API adapter, least-privilege service account, audited operations, dedicated tests and rollout approval.
3. **Authorization is server-side.** Hiding UI controls is not access control; every admin request must authenticate and authorize the caller.
4. **No public admin bootstrap endpoint.** Signup must never accept `ADMIN`. Initial admin provisioning must be a deliberate, audited operator action, not a public API.
5. **Prefer reversible actions.** Suspend/reactivate and revoke sessions; do not implement permanent delete without a separate retention/privacy decision.

## Initial roles

- `USER`: self-service only; cannot enumerate or mutate other users.
- `ADMIN`: can list/inspect accounts, suspend/reactivate accounts, change application role within policy, and revoke a target user's refresh sessions.
- No role can elevate itself. A caller cannot change their own role, disable the last active administrator, or bypass required step-up/MFA controls.
- For Keycloak tokens, use verified roles from the configured issuer/audience; local database roles must not override Keycloak claims.
- Keep the initial model to `USER | ADMIN`; do not invent tenant roles, custom RBAC, invitations or billing before requirements exist.

## Proposed API contract

Implemented read-only routes:

- `GET /admin/users?query=&role=&page=&limit=` — paginated directory with email search, role filter, bounded page size and allowlisted output.
- `GET /admin/users/:id` — allowlisted account details.

Remaining proposed routes (not implemented):

- `PATCH /admin/users/:id/role` — role change with privileged caller and audit record.
- `PATCH /admin/users/:id/status` — suspend/reactivate; requires an approved status schema and enforcement across all authentication paths.
- `POST /admin/users/:id/revoke-sessions` — revoke active refresh sessions for that user.
- `GET /admin/audit-events` — paginated admin/security events with redaction.

Before implementing these routes, inspect actual schema and session-revocation semantics. If `public.users` lacks a status column, propose an additive migration only after verifying actual columns, constraints, indexes, grants, RLS policies and consumer assumptions. Never guess the production schema or apply migrations automatically.

## Data and audit rules

- Keep the existing shared Supabase project and server-only `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` client. Do not introduce Supabase Auth, a separate `DATABASE_URL`, or Node `pg`.
- Keep RLS enabled and credentials out of browser code.
- Use a dedicated audit table for privileged operations. Record actor/provider, action, target/provider, timestamp, outcome and correlation/request ID; only safe before/after metadata.
- Never log tokens, passwords, MFA secrets, recovery codes, private passkey data or service-role credentials.
- Account status must be enforced in login, refresh, MFA completion and passkey flows, not only in the admin controller.
- Define and test concurrency behavior between suspension, session revocation and refresh rotation.

## Security requirements

- Add a centralized NestJS admin guard/decorator or equivalent policy layer; deny by default and authorize every request.
- Verify tokens server-side (signature, issuer, audience and expiry); never trust caller IDs/roles from request bodies or query strings.
- For legacy JWTs, resolve current account role/status when needed so role changes take effect promptly; do not rely only on stale role claims for high-impact operations.
- Require MFA/step-up for privileged changes if supported safely; otherwise document it as a release gate before enabling mutations.
- Prevent self-escalation, last-admin lockout, IDOR, mass assignment, enumeration abuse and unbounded pagination.
- Use safe error responses and rate limiting on sensitive endpoints. Record successful and failed admin operations without secrets.
- A normal user must remain blocked even when calling endpoints directly.

## UI scope

Add a protected `/admin/users` area only after API authorization exists:

- Searchable, filterable, paginated user table with loading/empty/error states.
- User detail view with only approved profile/security summary fields.
- Explicit confirmation for role change, suspension/reactivation and session revocation.
- Clear provider label (Legacy NestJS vs Keycloak); unsupported Keycloak mutations stay disabled.
- No secrets or tokens shown; UI calls NestJS and never queries Supabase directly.
- Preserve the current login screen and auth-mode behavior. Do not enable Keycloak mode on production hosts as part of this work.

## Delivery phases

### UM-0 — Contract/schema discovery

Inspect actual tables, migrations, role claims, login/refresh/MFA/passkey paths, web auth store, route prefix and tests. Document exact schema and compatibility constraints. Default to legacy-only management until a Keycloak Admin API contract is separately approved.

- **Status (updated 2026-10-26): PARTIALLY RECONCILED.** Live catalog now confirms the four core auth RPCs, audit RPC/table and five MFA challenge RPCs with server-only grants. The MFA challenge source is on PR #55 and is not on master; the connected project's only branch is non-persistent `main` with `MIGRATIONS_FAILED`, and its production/non-production classification is unknown.
- **Migration-history drift:** Three remote-only versions (`20261014024759`, `20261014130516`, `20261014131151`) lack source artifacts. Remote `20261020234922 keycloak_identity_persistence` has a local source file versioned `20261014000000`; local `20261012000000_auth_persistence_rpcs.sql` is absent from the remote ledger. Do not reconstruct missing migration contents from names or catalog state.
- **Implemented safe sub-slice:** [PR #27](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/27) adds a GET-only PostgREST OpenAPI readiness contract check using the existing shared service-role credentials. It verifies the four RPC paths used by the current source and fails readiness if they are absent or schema metadata cannot be inspected. Exact tested head `6c5d6ee9d524ee365a07111a7ee04aa4056548ed`; [auth-service CI #40213420324](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40213420324) passed.
- **Historical pre-migration blocker:** Earlier Supabase Preview checks failed with `Remote migration versions not found in local migrations directory`; the current PR #55 Preview check is skipped because preview-branch creation is disabled. Neither result confirms a safe non-production target.
- **Safety:** This automation run performed read-only schema/ledger/advisor/log inspection only. No migration apply, Supabase branch creation/reset/merge, production data/schema mutation, or application release was performed.

### UM-1 — Secure admin API foundation
Implement principal resolution and a centralized admin guard, allowlisted response DTOs and authorization tests. Add audit persistence. Do not expose mutation endpoints before authorization/audit tests pass.

### UM-2 — Account lifecycle

**Status (2026-10-26): IN PROGRESS.** The owner classifies the shared Supabase project as non-production; UM-2A status enforcement migration was applied and verified on project `gtqovpusfyyvxpeezxlo`, recorded as ledger version `20261026080831 auth_user_status_enforcement`. The source migration is tracked at the matching version prefix on the dedicated UM-2A branch. PR #55 is merged at `7d98c9b953acdd5e180b9ac2fc49ad4dba7b6bb7`. Suspension enforcement code is not merged yet, and lifecycle mutation APIs remain a separate gated slice. No Supabase branch was created. Keep all privileged mutations gated until authorization, recent-MFA, last-admin concurrency and atomic-audit tests pass.

Implement list/detail, role change, suspension/reactivation and session revocation only after the schema and environment gates clear. Additive migrations require an explicitly approved safe non-production target. Ensure suspended users cannot log in, refresh, complete MFA or authenticate through supported legacy flows. Prevent self-role-change and last-admin lockout.

### UM-3 — Admin UI
Implement the protected users directory and confirmation flows. Add API/component tests, responsive layout, keyboard accessibility and error handling. UI checks are supplementary; API remains authoritative.

- **Status (2026-10-26): PARTIALLY DONE.** The read-only directory and query/security-contract tests remain merged. PR #45's browser test and short-landscape dialog scroll fix pass exact-head auth-web and auth-service CI on `420b97b79991b376062189e7ae27ae8589556499`; see [auth-web CI #40258016309](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40258016309) and [auth-service CI #40258016304](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40258016304). Mutation controls remain hidden until AUTH-UM-001B audit persistence and AUTH-UM-002 authorization/concurrency gates pass.
- **Status after browser verification:** PR #43 was superseded and PR #45 was replaced by [PR #47](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/47), which is merged at `3af07f3749d970fe4ee084a953168c7f1ddd5975`. The Node 24 + Chrome DevTools Protocol test mocks Auth/admin APIs and verifies focus management, non-admin denial, and accessible scrolling; all 10 browser tests passed on the exact head and post-merge auth-web/auth-service CI passed. The previous Supabase Preview migration-history failure is tracked separately in AUTH-OPS-002 and is not evidence that the browser change or the later directly applied Auth migrations failed. Mutation UI stays hidden until AUTH-UM-001B audit persistence and AUTH-UM-002 authorization/concurrency tests pass.
- **Historical schema blocker (pre-migration):** The Supabase Preview app check failed on the subsequent PR #26 merge SHA `97b8d7498190884715bd1e9c657d2e432de31feb` with `Remote migration versions not found in local migrations directory`; PR #24's own check was skipped because no Supabase branch was associated. The four-RPC source/live mismatch has since been reconciled; remaining remote-only migration provenance is tracked under AUTH-UM-000.

### UM-4 — Verification and controlled rollout
Run backend tests, typecheck, lint/build and frontend typecheck/lint/build. Add integration tests against non-production Supabase for authorization, lifecycle, session revocation, MFA/passkeys and login compatibility. Verify schema, RLS, grants, audit redaction, CORS/cookies and gateway routes. Use dedicated branch and PR; never merge/deploy or run production migrations automatically. Production rollout requires review and existing GitOps gates.

## Acceptance criteria

- Existing login/signup/JWT/MFA/passkey/refresh-cookie behavior remains compatible for active accounts.
- A normal user cannot enumerate accounts, inspect another account, change roles/status or revoke another user's sessions.
- Every privileged operation is auditable; only allowed operations are available to admins.
- Suspension is enforced across authentication entry points and refresh sessions follow a documented revocation contract.
- Self-escalation and last-admin lockout are prevented by server checks and tests.
- No credential, token, MFA secret, recovery code or private passkey data appears in responses/logs.
- Keycloak identities are never silently treated as legacy users; Keycloak mutation remains disabled until a separate least-privilege Admin API adapter is approved.
- CI results are reported honestly; this work makes no production changes.


## Task tracking

Stable task IDs, implementation evidence and current blockers are maintained in [docs/plan/user-management-tasks.md](plan/user-management-tasks.md). This file remains the architecture and API-contract baseline; keep detailed task status in the canonical queue rather than duplicating it here.

## References

- Current code: `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/auth/auth.repository.ts`, `src/auth/keycloak/`, `web/src/services/auth-api.ts`.
- Current architecture: `README.md`, `docs/web-ui-integration.md`, `docs/keycloak-oidc-foundation.md`.
- Authorization baseline: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — deny by default, least privilege, per-request server-side checks and authorization tests.
