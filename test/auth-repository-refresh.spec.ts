import { AuthRepository } from '../src/auth/auth.repository';
import { SupabaseClientService } from '../src/db/supabase.client';

describe('AuthRepository refresh RPC contract', () => {
  it('maps the minimal refresh user projection without inventing or exposing credential fields', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        status: 'rotated',
        family_id: 'family-1',
        user: {
          id: 'user-1',
          email: 'person@example.com',
          role: 'USER',
          status: 'ACTIVE',
          mfa_enabled: true,
          mfa_secret_encrypted: null,
        },
      },
      error: null,
    });
    const supabase = { db: { rpc } } as unknown as SupabaseClientService;
    const repository = new AuthRepository(supabase);

    const result = await repository.rotateRefreshSession({
      tokenHash: 'token-hash',
      nextSessionId: 'session-2',
      nextTokenHash: 'next-token-hash',
      expiresAt: new Date('2026-10-27T00:00:00.000Z'),
      ip: '203.0.113.4',
      userAgent: 'unit-test',
    });

    expect(rpc).toHaveBeenCalledWith('auth_rotate_refresh_session', {
      p_token_hash: 'token-hash',
      p_next_session_id: 'session-2',
      p_next_token_hash: 'next-token-hash',
      p_next_expires_at: '2026-10-27T00:00:00.000Z',
      p_ip: '203.0.113.4',
      p_user_agent: 'unit-test',
    });
    expect(result).toEqual({
      status: 'rotated',
      familyId: 'family-1',
      user: {
        id: 'user-1',
        email: 'person@example.com',
        role: 'USER',
        status: 'ACTIVE',
        mfaEnabled: true,
      },
    });
    expect(result).not.toHaveProperty('user.passwordHash');
    expect(result).not.toHaveProperty('user.mfaSecretEncrypted');
  });

  it('fails closed if a refresh RPC returns a suspended user projection', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        status: 'rotated',
        family_id: 'family-1',
        user: {
          id: 'user-1',
          email: 'person@example.com',
          role: 'USER',
          status: 'SUSPENDED',
          mfa_enabled: false,
          mfa_secret_encrypted: null,
        },
      },
      error: null,
    });
    const repository = new AuthRepository({ db: { rpc } } as unknown as SupabaseClientService);

    await expect(repository.rotateRefreshSession({
      tokenHash: 'token-hash',
      nextSessionId: 'session-2',
      nextTokenHash: 'next-token-hash',
      expiresAt: new Date('2026-10-27T00:00:00.000Z'),
    })).rejects.toThrow('Refresh session invalid or expired');
  });

  it('fails closed for invalid or missing refresh RPC results', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { status: 'invalid' }, error: null });
    const repository = new AuthRepository({
      db: { rpc },
    } as unknown as SupabaseClientService);

    await expect(repository.rotateRefreshSession({
      tokenHash: 'token-hash',
      nextSessionId: 'session-2',
      nextTokenHash: 'next-token-hash',
      expiresAt: new Date('2026-10-27T00:00:00.000Z'),
    })).rejects.toThrow('Refresh session invalid or expired');
  });
});
