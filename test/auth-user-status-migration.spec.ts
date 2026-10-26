import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthRepository } from '../src/auth/auth.repository';
import { SupabaseClientService } from '../src/db/supabase.client';

const migration = readFileSync(
  join(__dirname, '..', 'supabase', 'migrations', '20261026080831_auth_user_status_enforcement.sql'),
  'utf8',
);

describe('UM-2A account-status migration contract', () => {
  it('uses balanced dollar-quoted function bodies rather than a lone dollar delimiter', () => {
    expect(migration).not.toMatch(/^\s*as\s+\$(?!\$)\s*$/m);
    expect(migration).not.toMatch(/^\s*\$\s*;\s*$/m);
    expect((migration.match(/\$\$/g) ?? []).length % 2).toBe(0);
  });

  it('casts optional client IP text to the live refresh_sessions.ip inet type', () => {
    const start = migration.indexOf('create or replace function public.auth_create_refresh_session(');
    const end = migration.indexOf('\n$$;', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(migration.slice(start, end)).toContain("nullif(p_ip, '')::inet");
  });

  it('keeps the status-aware session-creation RPC server-only', () => {
    expect(migration).toMatch(
      /revoke all on function public\.auth_create_refresh_session\([^;]+from public, anon, authenticated;/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.auth_create_refresh_session\([^;]+to service_role;/i,
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.auth_create_refresh_session\([^;]+to\s+(public|anon|authenticated)\s*;/i,
    );
  });

  it('limits MFA setting updates to active accounts at the query boundary', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null });
    const query = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle,
    };
    const supabase = {
      db: { from: jest.fn().mockReturnValue(query) },
    } as unknown as SupabaseClientService;
    const repository = new AuthRepository(supabase);

    await repository.updateMfa('user-1', true, 'encrypted-secret');

    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', 'user-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'status', 'ACTIVE');
  });
});
