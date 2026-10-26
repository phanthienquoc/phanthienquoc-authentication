# User Management — Architecture and Delivery Roadmap

## Status and scope

- **Status:** UM-1A and UM-3 remain merged. Regression coverage PR #52 is merged at `aae24d8adb793ee9ec3201fd5c98c77fb3cf1cbd`; audit persistence PR #54 is merged at `533fd4f6809c187759231d109fe7ac05239271c9`. Server-issued MFA challenge PR #55 is open; its current code head `a355ed7691ffa08c11ac41cd35a2f98cb022477c` passed service/web/push CI, while Supabase Preview was skipped. UM-2A status/suspension enforcement remains source-only on PR #59; its code head `45e964a65e36cba304836237779632ada3ac8fa8` passed Auth service CI. UM-2B audit-atomic lifecycle RPCs and guarded role/status/session routes are implemented on [feat/auth-um-2-lifecycle-api-20261026](https://github.com/phanthienquoc/phanthienquoc-authentication/tree/feat/auth-um-2-lifecycle-api-20261026); code head `fe7b773a9629d0a44c18f47f2e3561fda8e3eea0` passed Auth service CI [#40275380993](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40275380993), and follow-up authorization assertions require a fresh exact-head check. Neither migration is applied. The only Supabase branch is default/base `main` / Git `master` (`is_default=true`, `persistent=false`) with `MIGRATIONS_FAILED`; treat it as production-equivalent because no separate safe non-production target is confirmed. Migration-history drift remains: three remote-only versions have no source, one Keycloak version mismatch, and the local auth-RPC migration version is absent from the remote ledger. See the [canonical task queue](plan/user-management-tasks.md).
- **Owner:** Central NestJS authentication service and its Next.js `web/` app.
- **Scope:** This roadmap governs User Management and authentication work only; it does not change TCE or Media consumers.
- **Change record (2026-10-26):** Read-only introspection confirms project ref `gtqovpusfyyvxpeezxlo`, organization `jopjvkofwvbnxaajkhlo`, region `ap-southeast-1`. `list_branches` reports only `main` / Git `master`, `is_default=true`, `persistent=false`, with project and parent refs identical and status `MIGRATIONS_FAILED`; no distinct preview/development branch is listed. Treat the base/default branch as production-equivalent until proven otherwise. `pg_cast` has no text-to-inet cast, so the status migration uses `nullif(p_ip, '')::inet`. `.env.example` and checked-in config do not expose runtime `SUPABASE_URL`; GitHub secret values and the native Supabase GitHub integration mapping are not visible, so repo-to-project matching remains unverified. No migration apply, branch creation/reset/merge, production schema/data mutation, deployment or release occurred.

## Verified current state

- `src/auth/auth.repository.ts` uses the existing shared Supabase project and `@supabase/supabase-js`; live `public.users` columns are `id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted,created_at,updated_at`. There is no status/suspension column.
- Signup assigns `USER`. The NestJS API has signup/login/`me`/refresh/logout and MFA/passkey flows. The read-only `/api/admin/users` list/detail endpoints remain merged. The typed server-side audit writer is also merged, but no role/status/session mutation endpoint or public audit-read API exists.
- Live `public.auth_admin_audit_events` is RLS-enabled with no policies/direct table privileges; `auth_record_admin_audit_event` has a fixed search path and EXECUTE only for `service_role` plus owner `postgres`.
- Live `public.auth_mfa_login_challenges` and five RPCs are present in the connected project, but their source migration/code are still on PR #55 and not on `master`. Current master still has the legacy userId-based MFA completion path until that PR is merged.
- The connected project has only a non-persistent `main` branch (Git branch `master`) with `MIGRATIONS_FAILED`; production versus non-production is unverified. The Supabase Preview check on PR #55 is skipped, not a migration pass.
- No account rows or raw secrets were read in this run; all database checks were catalog, privilege, migration-ledger, advisor and aggregate-log queries.

## UM-2B lifecycle API — source-only branch review (2026-10-26)

- The dedicated branch feat/auth-um-2-lifecycle-api-20261026 adds role/status/session mutation routes only behind the existing controller-level AdminGuard; each RPC independently verifies an active database ADMIN actor.
- The migration uses a shared transaction advisory lock before actor/target/session row locks to serialize lifecycle changes and protect the last active administrator. Suspension updates users.status, revokes all active refresh sessions, and writes its audit event in one transaction. Reactivation does not restore sessions.
- RPCs are SECURITY DEFINER with fixed search_path=pg_catalog, public, pg_temp and EXECUTE granted only to service_role. Audit writes use the existing allowlisted auth_record_admin_audit_event RPC; an audit error aborts the transaction. No hard-delete, public bootstrap, browser-side Supabase access, or Keycloak mutation is introduced.
- Source-level and service/controller tests pass on code head fe7b773a9629d0a44c18f47f2e3561fda8e3eea0; follow-up authorization assertions are being revalidated. The SQL is not applied. Live SQL/RPC validation remains blocked because the only listed Supabase branch is the default/base branch with MIGRATIONS_FAILED and the native GitHub integration target is not exposed.
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

Password and passkey first-factor success share `AuthService.beginMfaLogin()`. TOTP validates then atomically consumes the challenge; recovery uses one RPC transaction to consume both challenge and one-time recovery code. Web state holds the raw token only in memory. PR #55 adds controller, RPC-adapter, passkey-parity, replay, recovery-atomicity and cross-account mismatch tests. Exact code/test head `1c15f82eabe639d177f2c6a135414b484593b099` passed service/web CI; this documentation update triggers a fresh exact-head run.

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

**Status (2026-10-26): BLOCKED.** Read-only list/detail and audit persistence are merged, but `public.users` has no status/suspension column and the connected Supabase environment is not confirmed non-production. Do not add mutation endpoints until status schema, current-admin authorization, self-escalation/last-admin concurrency protection, atomic audit behavior, and session-family revocation tests pass.

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


## UM-2A status enforcement branch review — 2026-10-26

- **Branch/PR:** [PR #59](https://github.com/phanthienquoc/phanthienquoc-authentication/pull/59), stacked on PR #55. Current code head before this evidence-only update: `45e964a65e36cba304836237779632ada3ac8fa8`.
- **Live schema contract:** Read-only catalog inspection confirms `public.users` still has no `status` column. `public.refresh_sessions.ip` is `inet`. A read-only `pg_cast` query found no `text → inet` cast, so the session-creation RPC must explicitly cast an optional text IP with `nullif(p_ip, '')::inet`.
- **Migration review/fix:** The initial UM-2A migration branch contained a lone `$` function-body delimiter, which is not valid PostgreSQL dollar quoting. It was corrected to `$$` delimiters; the explicit `inet` cast is now present. The migration remains source-only; version `20261026053000` has not been applied. A focused static contract test guards the delimiters, cast and server-only RPC grants.
- **Server-side enforcement:** The branch checks current status in login, refresh/session creation, MFA and passkey paths, `/auth/me`, and the database-backed AdminGuard. MFA-setting updates now include `status = 'ACTIVE'` in the database query to fail closed if suspension races the controller check. No role/status/session mutation route was added.
- **Validation:** Auth service CI [run #40274597989](https://github.com/phanthienquoc/phanthienquoc-authentication/actions/runs/40274597989) passed on code head `45e964a65e36cba304836237779632ada3ac8fa8`: 15 test suites / 67 tests, typecheck, build and container build. Supabase Preview was skipped because no branch is associated and preview-branch creation is disabled; this is not live database integration.
- **Merge gate:** Keep PR #59 and its base PR #55 open. The connected project's only branch is non-persistent `main` / Git `master`, status `MIGRATIONS_FAILED`; production versus non-production and the exact runtime URL-to-project mapping remain unverified. Migration-history provenance also remains unresolved. No migration apply, Supabase branch operation, account-row read/mutation, or deployment was performed.
