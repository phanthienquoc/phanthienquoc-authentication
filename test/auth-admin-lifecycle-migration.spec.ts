import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(__dirname, '..', 'supabase', 'migrations', '20261026054000_auth_admin_user_lifecycle_rpcs.sql'),
  'utf8',
);

function functionBody(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}(`);
  if (start < 0) throw new Error(`Missing migration function: ${name}`);
  const nextFunction = migration.indexOf('create or replace function public.', start + 1);
  const revoke = migration.indexOf('revoke all on function public.', start);
  const candidates = [nextFunction, revoke].filter(index => index >= 0);
  const end = candidates.length ? Math.min(...candidates) : migration.length;
  if (end <= start) throw new Error(`Invalid migration function boundary: ${name}`);
  return migration.slice(start, end);
}

describe('AUTH-UM-002B lifecycle migration contract', () => {
  const names = [
    'auth_admin_update_user_role',
    'auth_admin_update_user_status',
    'auth_admin_revoke_user_sessions',
  ];

  it('uses SECURITY DEFINER, fixed search_path, and one shared advisory lock before row locks', () => {
    for (const name of names) {
      const body = functionBody(name);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = pg_catalog, public, pg_temp/i);
      expect(body).toContain("v_actor.role <> 'ADMIN'");
      expect(body).toContain("v_actor.status <> 'ACTIVE'");
      expect(body).toContain("'ADMIN_ACCESS_DENIED'");
      const globalLock = body.indexOf('pg_advisory_xact_lock(782345123, 1400923)');
      const userLookup = body.indexOf('from public.users');
      expect(globalLock).toBeGreaterThanOrEqual(0);
      expect(userLookup).toBeGreaterThan(globalLock);
    }
  });

  it('prevents self-role changes and concurrent last-active-admin lockout', () => {
    const role = functionBody('auth_admin_update_user_role');
    expect(role).toContain('p_actor_user_id = p_target_user_id');
    expect(role).toContain("v_target.status = 'ACTIVE' and p_new_role = 'USER'");
    expect(role).toContain('v_active_admin_count <= 1');
    expect(role).toContain('public.auth_record_admin_audit_event');
  });

  it('makes suspension and refresh-session revocation one audited transaction', () => {
    const status = functionBody('auth_admin_update_user_status');
    const userUpdate = status.indexOf('update public.users');
    const sessionUpdate = status.indexOf('update public.refresh_sessions', userUpdate);
    const successAudit = status.lastIndexOf('perform public.auth_record_admin_audit_event');
    expect(userUpdate).toBeGreaterThanOrEqual(0);
    expect(sessionUpdate).toBeGreaterThan(userUpdate);
    expect(successAudit).toBeGreaterThan(sessionUpdate);
    expect(status).toContain("v_action := 'USER_SUSPENDED'");
    expect(status).toContain("'USER_REACTIVATED'");
  });

  it('uses only allowlisted response fields and never deletes accounts', () => {
    expect(migration).toContain("'mfa_enabled'");
    expect(migration).not.toMatch(/password_hash|mfa_secret_encrypted|token_hash|recovery_code|passkey_public_key/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.users/i);
  });

  it('revokes stale sessions on repeated suspension and reactivation', () => {
    const status = functionBody('auth_admin_update_user_status');
    const noChange = status.indexOf('if v_target.status = p_new_status then');
    const noChangeSessionRevoke = status.indexOf('update public.refresh_sessions', noChange);
    const reactivationMarker = status.indexOf('Do not restore sessions that may predate an out-of-band suspension.');
    const reactivationSessionRevoke = status.indexOf('update public.refresh_sessions', reactivationMarker);
    expect(noChangeSessionRevoke).toBeGreaterThan(noChange);
    expect(reactivationMarker).toBeGreaterThanOrEqual(0);
    expect(reactivationSessionRevoke).toBeGreaterThan(reactivationMarker);
  });

  it('grants only service_role execution to the three lifecycle RPCs', () => {
    for (const name of names) {
      expect(migration).toMatch(new RegExp(`revoke all on function public\\.${name}\\([^;]+from public, anon, authenticated, service_role;`, 'i'));
      expect(migration).toMatch(new RegExp(`grant execute on function public\\.${name}\\([^;]+to service_role;`, 'i'));
      expect(migration).not.toMatch(new RegExp(`grant execute on function public\\.${name}\\([^;]+to\\s+(public|anon|authenticated)\\s*;`, 'i'));
    }
  });
});
