import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(__dirname, '..', 'supabase', 'migrations', '20261026080831_auth_user_status_enforcement.sql'),
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

const activeOnlyContracts: Array<{ name: string; check: RegExp }> = [
  { name: 'auth_create_refresh_session', check: /v_status\s*<>\s*'ACTIVE'/i },
  { name: 'auth_rotate_refresh_session', check: /v_user\.status\s*<>\s*'ACTIVE'/i },
  { name: 'auth_replace_mfa_recovery_codes', check: /u\.status\s*=\s*'ACTIVE'/i },
  { name: 'auth_consume_mfa_recovery_code', check: /u\.status\s*=\s*'ACTIVE'/i },
  { name: 'auth_consume_passkey_challenge', check: /u\.status\s*=\s*'ACTIVE'/i },
  { name: 'auth_create_mfa_login_challenge', check: /status\s*=\s*'ACTIVE'/i },
  { name: 'auth_get_mfa_login_challenge', check: /u\.status\s*=\s*'ACTIVE'/i },
  { name: 'auth_record_mfa_login_failure', check: /u\.status\s*=\s*'ACTIVE'/i },
  { name: 'auth_consume_mfa_login_challenge', check: /u\.status\s*=\s*'ACTIVE'/i },
  { name: 'auth_consume_mfa_login_recovery', check: /u\.status\s*=\s*'ACTIVE'/i },
];

describe('AUTH-UM-004A suspension-enforcement migration contract', () => {
  it('adds a constrained, active-by-default legacy account status', () => {
    expect(migration).toMatch(/add column if not exists status text not null default 'ACTIVE'/i);
    expect(migration).toMatch(/check\s*\(status in \('ACTIVE',\s*'SUSPENDED'\)\)/i);
  });

  it('enforces ACTIVE status across refresh, MFA, recovery and passkey RPCs', () => {
    for (const contract of activeOnlyContracts) {
      const body = functionBody(contract.name);
      expect(body).toMatch(/security definer/i);
      expect(body).toMatch(/set search_path = pg_catalog, public, pg_temp/i);
      expect(body).toMatch(contract.check);
    }
  });

  it('keeps each status-sensitive RPC server-role-only', () => {
    for (const { name } of activeOnlyContracts) {
      expect(migration).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([^;]+\\) from public, anon, authenticated;`,
          'i',
        ),
      );
      expect(migration).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^;]+\\) to service_role;`,
          'i',
        ),
      );
      expect(migration).not.toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([^;]+\\) to\\s+(public|anon|authenticated)\\s*;`,
          'i',
        ),
      );
    }
  });
});
