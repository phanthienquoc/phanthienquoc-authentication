import { ServiceUnavailableException } from '@nestjs/common';
import { AuthRepository } from '../src/auth/auth.repository';
import { SupabaseClientService } from '../src/db/supabase.client';

const requiredRpcPaths = [
  '/rpc/auth_rotate_refresh_session',
  '/rpc/auth_replace_mfa_recovery_codes',
  '/rpc/auth_consume_mfa_recovery_code',
  '/rpc/auth_consume_passkey_challenge',
  '/rpc/auth_create_mfa_login_challenge',
  '/rpc/auth_get_mfa_login_challenge',
  '/rpc/auth_record_mfa_login_failure',
  '/rpc/auth_consume_mfa_login_challenge',
  '/rpc/auth_consume_mfa_login_recovery',
  '/rpc/auth_create_refresh_session',
  '/rpc/auth_admin_update_user_role',
  '/rpc/auth_admin_update_user_status',
  '/rpc/auth_admin_revoke_user_sessions',
] as const;

function createSupabase(paths: readonly string[]) {
  const query = {
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ error: null }),
  };
  const supabase = {
    db: { from: jest.fn().mockReturnValue(query) },
    getRestSchemaPaths: jest.fn().mockResolvedValue(new Set(paths)),
  };
  return { supabase, query };
}

describe('AuthRepository.ready RPC contract', () => {
  it('requires every authentication RPC in the read-only PostgREST schema', async () => {
    const { supabase, query } = createSupabase(requiredRpcPaths);
    const repository = new AuthRepository(supabase as unknown as SupabaseClientService);

    await expect(repository.ready()).resolves.toBeUndefined();
    expect(supabase.db.from).toHaveBeenCalledTimes(5);
    expect(query.select).toHaveBeenNthCalledWith(1, 'id,status');
    expect(query.select).toHaveBeenNthCalledWith(2, 'id');
    expect(supabase.getRestSchemaPaths).toHaveBeenCalledTimes(1);
  });

  it('fails readiness when a required RPC is absent', async () => {
    const { supabase } = createSupabase(requiredRpcPaths.slice(0, -1));
    const repository = new AuthRepository(supabase as unknown as SupabaseClientService);

    await expect(repository.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails readiness when PostgREST metadata cannot be inspected', async () => {
    const { supabase } = createSupabase(requiredRpcPaths);
    supabase.getRestSchemaPaths.mockRejectedValue(new Error('network unavailable'));
    const repository = new AuthRepository(supabase as unknown as SupabaseClientService);

    await expect(repository.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
