import { ServiceUnavailableException } from '@nestjs/common';
import { AuthRepository } from '../src/auth/auth.repository';
import { SupabaseClientService } from '../src/db/supabase.client';

function makeRepository(data: unknown, error: unknown = null) {
  const rpc = jest.fn().mockResolvedValue({ data, error });
  const repository = new AuthRepository({
    db: { rpc },
  } as unknown as SupabaseClientService);
  return { repository, rpc };
}

describe('AuthRepository MFA challenge RPC adapter', () => {
  const expiresAt = new Date('2026-10-26T00:05:00.000Z');

  it('creates a challenge through the server-only RPC with a hash and expiry', async () => {
    const { repository, rpc } = makeRepository(true);

    await expect(repository.createMfaLoginChallenge({
      userId: 'user-1',
      tokenHash: 'a'.repeat(64),
      expiresAt,
    })).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith('auth_create_mfa_login_challenge', {
      p_user_id: 'user-1',
      p_token_hash: 'a'.repeat(64),
      p_expires_at: expiresAt.toISOString(),
    });
  });

  it('fails closed when the create RPC rejects the challenge', async () => {
    const { repository } = makeRepository(false);

    await expect(repository.createMfaLoginChallenge({
      userId: 'user-1',
      tokenHash: 'a'.repeat(64),
      expiresAt,
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns only the user id from an active challenge lookup', async () => {
    const { repository, rpc } = makeRepository([{ user_id: 'user-1' }]);

    await expect(repository.findMfaLoginChallengeUserId('a'.repeat(64)))
      .resolves.toBe('user-1');
    expect(rpc).toHaveBeenCalledWith('auth_get_mfa_login_challenge', {
      p_token_hash: 'a'.repeat(64),
    });
  });

  it('records failed attempts through the bounded-attempt RPC', async () => {
    const { repository, rpc } = makeRepository(true);

    await expect(repository.recordMfaLoginFailure('a'.repeat(64))).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('auth_record_mfa_login_failure', {
      p_token_hash: 'a'.repeat(64),
    });
  });

  it('consumes a TOTP challenge through the atomic consume RPC', async () => {
    const { repository, rpc } = makeRepository('user-1');

    await expect(repository.consumeMfaLoginChallenge('a'.repeat(64))).resolves.toBe('user-1');
    expect(rpc).toHaveBeenCalledWith('auth_consume_mfa_login_challenge', {
      p_token_hash: 'a'.repeat(64),
    });
  });

  it('consumes recovery code and challenge through one atomic RPC', async () => {
    const { repository, rpc } = makeRepository('user-1');

    await expect(repository.consumeMfaLoginRecovery('a'.repeat(64), 'b'.repeat(64)))
      .resolves.toBe('user-1');
    expect(rpc).toHaveBeenCalledWith('auth_consume_mfa_login_recovery', {
      p_token_hash: 'a'.repeat(64),
      p_code_hash: 'b'.repeat(64),
    });
  });

  it('normalizes RPC transport errors instead of leaking database details', async () => {
    const { repository } = makeRepository(null, { message: 'internal database detail' });

    await expect(repository.consumeMfaLoginChallenge('a'.repeat(64)))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
