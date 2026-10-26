import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { AuthController } from '../src/auth/auth.controller';
import { AuthRepository, type AuthUser } from '../src/auth/auth.repository';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '../src/auth/jwt.service';
import { MfaCryptoService } from '../src/auth/mfa-crypto.service';
import { MfaService } from '../src/auth/mfa.service';
import { PasskeyService } from '../src/auth/passkey.service';

const user: AuthUser = {
  id: 'user-1',
  email: 'person@example.com',
  passwordHash: 'password-hash',
  role: 'USER',
  mfaEnabled: true,
  mfaSecretEncrypted: 'encrypted-secret',
};

function makeController(overrides: {
  challengeUserId?: string | null;
  consumedUserId?: string | null;
  recoveryUserId?: string | null;
  validTotp?: boolean;
} = {}) {
  const auth = {
    hashMfaChallengeToken: jest.fn((token: string) => `hash:${token}`),
    completeMfaLogin: jest.fn().mockResolvedValue({ accessToken: 'access-token' }),
    completeMfaRecoveryLogin: jest.fn().mockResolvedValue({ accessToken: 'access-token' }),
  };
  const repository = {
    findMfaLoginChallengeUserId: jest.fn().mockResolvedValue(
      overrides.challengeUserId === undefined ? user.id : overrides.challengeUserId,
    ),
    findById: jest.fn().mockResolvedValue(user),
    recordMfaLoginFailure: jest.fn().mockResolvedValue(true),
    consumeMfaLoginChallenge: jest.fn().mockResolvedValue(
      overrides.consumedUserId === undefined ? user.id : overrides.consumedUserId,
    ),
    consumeMfaLoginRecovery: jest.fn().mockResolvedValue(
      overrides.recoveryUserId === undefined ? user.id : overrides.recoveryUserId,
    ),
  };
  const mfa = { verifyTotp: jest.fn().mockReturnValue(overrides.validTotp ?? true) };
  const mfaCrypto = { decrypt: jest.fn().mockReturnValue('totp-secret') };
  const controller = new AuthController(
    auth as unknown as AuthService,
    {} as JwtService,
    repository as unknown as AuthRepository,
    mfa as unknown as MfaService,
    mfaCrypto as unknown as MfaCryptoService,
    {} as PasskeyService,
  );
  const response = { cookie: jest.fn() } as unknown as Response;
  return { controller, auth, repository, mfa, mfaCrypto, response };
}

describe('server-issued MFA challenge completion', () => {
  const challengeToken = 'A'.repeat(43);

  it('fails closed when the opaque challenge is absent or expired', async () => {
    const { controller, repository, response, auth } = makeController({ challengeUserId: null });

    await expect(controller.mfaLogin(
      { challengeToken, code: '123456' },
      undefined,
      undefined,
      response,
    )).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.consumeMfaLoginChallenge).not.toHaveBeenCalled();
    expect(auth.completeMfaLogin).not.toHaveBeenCalled();
  });

  it('records a failed TOTP attempt and does not consume a challenge or issue a session', async () => {
    const { controller, repository, response, auth } = makeController({ validTotp: false });

    await expect(controller.mfaLogin(
      { challengeToken, code: '000000' },
      undefined,
      undefined,
      response,
    )).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.recordMfaLoginFailure).toHaveBeenCalledWith('hash:'.concat(challengeToken));
    expect(repository.consumeMfaLoginChallenge).not.toHaveBeenCalled();
    expect(auth.completeMfaLogin).not.toHaveBeenCalled();
  });

  it('consumes the challenge exactly once after TOTP verification and before issuing the session', async () => {
    const { controller, repository, response, auth, mfa } = makeController();

    await expect(controller.mfaLogin(
      { challengeToken, code: '123456' },
      'test-agent',
      '203.0.113.5',
      response,
    )).resolves.toEqual({ accessToken: 'access-token' });

    expect(repository.consumeMfaLoginChallenge).toHaveBeenCalledWith('hash:'.concat(challengeToken));
    expect(repository.consumeMfaLoginChallenge.mock.invocationCallOrder[0])
      .toBeLessThan(auth.completeMfaLogin.mock.invocationCallOrder[0]);
    expect(mfa.verifyTotp).toHaveBeenCalledWith('totp-secret', '123456');
  });

  it('uses the atomic recovery RPC instead of looking up a userId or consuming a code separately', async () => {
    const { controller, repository, response, auth } = makeController();

    await expect(controller.mfaRecovery(
      { challengeToken, code: 'RECOVERY-CODE' },
      'test-agent',
      '203.0.113.5',
      response,
    )).resolves.toEqual({ accessToken: 'access-token' });

    const expectedCodeHash = createHash('sha256').update('RECOVERY-CODE').digest('hex');
    expect(repository.consumeMfaLoginRecovery).toHaveBeenCalledWith(
      'hash:'.concat(challengeToken),
      expectedCodeHash,
    );
    expect(repository.consumeRecoveryCode).toBeUndefined();
    expect(auth.completeMfaRecoveryLogin).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ response, userAgent: 'test-agent', ip: '203.0.113.5' }),
    );
  });

  it('does not issue a session when a concurrent request already consumed the challenge', async () => {
    const { controller, repository, response, auth } = makeController({ consumedUserId: null });

    await expect(controller.mfaLogin(
      { challengeToken, code: '123456' },
      undefined,
      undefined,
      response,
    )).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.consumeMfaLoginChallenge).toHaveBeenCalledTimes(1);
    expect(auth.completeMfaLogin).not.toHaveBeenCalled();
  });
});
