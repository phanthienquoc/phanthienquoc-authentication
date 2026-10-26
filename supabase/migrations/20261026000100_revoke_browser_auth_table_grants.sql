-- AUTH-SEC-003: enforce the server-only access boundary for legacy auth persistence.
-- Live catalog verification (2026-10-26) found direct anon/authenticated table ACLs
-- on these five tables. RLS is enabled but no policies exist; RLS does not govern
-- table-level privileges such as TRUNCATE, REFERENCES or TRIGGER.
-- The application uses the existing NestJS service-role client; preserve service_role.
-- This migration is additive/idempotent. It does not alter rows, columns, policies,
-- service_role grants, Keycloak identity data, or any non-auth table.

REVOKE ALL PRIVILEGES ON TABLE
  public.users,
  public.refresh_sessions,
  public.mfa_recovery_codes,
  public.auth_passkey_challenges,
  public.auth_passkey_credentials
FROM anon, authenticated;
