-- Restrict direct access to audit data; application writes only through the
-- validated SECURITY DEFINER RPC. Applied as ledger version 20261026035431.
revoke all privileges on table public.auth_admin_audit_events
  from public, anon, authenticated, service_role;
revoke all on function public.auth_record_admin_audit_event(
  uuid, uuid, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.auth_record_admin_audit_event(
  uuid, uuid, text, text, text, text, text, text, text, text
) to service_role;
