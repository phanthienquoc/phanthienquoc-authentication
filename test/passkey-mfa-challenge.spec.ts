jest.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: jest.fn(),
  generateRegistrationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
}));

import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { PasskeyService } from '../src/auth/passkey.service';
import type { AuthRepository, AuthUser } from '../src/auth/auth.repository';
import type { AuthService } from '../src/auth/auth.service';
import type { PasskeyRepository } from '../src/auth/passkey.repository';

const mfaUser: AuthUser = {
  id: 'user-1',
  email: 'person@example.com',
  passwordHash: 'password-hash',
  role: 'USER',
  mfaEnabled: true,
  mfaSecretEncrypted: 'encrypted-secret',
};

const credential = {
  id: 'credential-row-1',
  user_id: mfaUser.id,
  credential_id: 'credential-1',
  public_key: Buffer.from('test-public-key').toString('base64url'),
  counter: 0,
  transports: [],
  friendly_name: 'Test passkey',
  created_at: '2026-01-01T00:00:00.000Z',
  last_used_at: null,
};

describe('Passkey MFA challenge parity', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      PASSKEY_RP_ID: 'localhost',
      PASSKEY_ORIGIN: 'http://localhost:3000',
    };
    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('issues the same server challenge after a verified passkey first factor without creating a session', async () => {
    const passkeys = {
      findByCredentialId: jest.fn().mockResolvedValue(credential),
      consumeChallenge: jest.fn().mockResolvedValue({ id: 'challenge-row-1', user_id: null }),
      updateCredential: jest.fn().mockResolvedValue(undefined),
    };
    const users = { findById: jest.fn().mockResolvedValue(mfaUser) };
    const auth = {
      beginMfaLogin: jest.fn().mockResolvedValue({
        mfaRequired: true,
        challengeToken: 'opaque-challenge-token',
        mfaExpiresInSeconds: 300,
      }),
      issueLoginForUser: jest.fn(),
    };
    const service = new PasskeyService(
      passkeys as unknown as PasskeyRepository,
      users as unknown as AuthRepository,
      auth as unknown as AuthService,
    );
    const clientDataJSON = Buffer.from(JSON.stringify({ challenge: 'challenge-1' })).toString('base64url');

    await expect(service.authenticationVerify({
      id: credential.credential_id,
      response: { clientDataJSON, transports: [] },
    }, '203.0.113.5', 'test-agent')).resolves.toEqual({
      mfaRequired: true,
      challengeToken: 'opaque-challenge-token',
      mfaExpiresInSeconds: 300,
    });

    expect(auth.beginMfaLogin).toHaveBeenCalledWith(mfaUser);
    expect(auth.issueLoginForUser).not.toHaveBeenCalled();
    expect(passkeys.updateCredential).toHaveBeenCalledWith(
      credential.id,
      credential.counter,
      1,
      [],
    );
  });
});
