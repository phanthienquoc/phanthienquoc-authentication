-- Remove direct browser-role access to legacy authentication persistence.
-- Auth UI and consumers must call the NestJS API; database access stays server-side.
-- Preserve service_role and owner privileges. This migration changes grants only.
revoke all privileges on table
  public.users,
  public.refresh_sessions,
  public.mfa_recovery_codes,
  public.auth_passkey_challenges,
  public.auth_passkey_credentials
from anon, authenticated;
