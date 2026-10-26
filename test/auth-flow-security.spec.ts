import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthRepository, type AuthUser } from '../src/auth/auth.repository';
import { AuthService } from '../src/auth/auth.service';
import { LoginDto } from '../src/auth/dto/login.dto';
import { JwtService } from '../src/auth/jwt.service';
import { PasskeyRepository, type PasskeyCredential } from '../src/auth/passkey.repository';
import { PasskeyService } from '../src/auth/passkey.service';
import { PasswordService } from '../src/auth/password.service';

const legacyUser: AuthUser = {
  id: 'user-1',
  email: 'person@example.com',
  passwordHash: 'password-hash',
  role: 'USER',
  status: 'ACTIVE',
  mfaEnabled: false,
  mfaSecretEncrypted: null,
};

function makeResponse() {
  const cookie = jest.fn();
  return { response: { cookie } as unknown as Response, cookie };
}

function makeAuthService(user: AuthUser | null = legacyUser) {
  const repository = {
    findByEmail: jest.fn().mockResolvedValue(user),
    createMfaLoginChallenge: jest.fn().mockResolvedValue(undefined),
    createRefreshSession: jest.fn().mockResolvedValue(undefined),
    rotateRefreshSession: jest.fn(),
    revokeRefreshToken: jest.fn().mockResolvedValue(true),
  };
  const passwords = {
    verify: jest.fn().mockResolvedValue(true),
    hashToken: jest.fn((token: string) => `hashed:${token}`),
  };
  const jwt = { issue: jest.fn().mockReturnValue('access-token') };
  const service = new AuthService(
    repository as unknown as AuthRepository,
    passwords as unknown as PasswordService,
    jwt as unknown as JwtService,
  );
  return { service, repository, passwords, jwt };
}

describe('Authentication flow security contracts', () => {
  const previousEnv = {
    nodeEnv: process.env.NODE_ENV,
    rpId: process.env.PASSKEY_RP_ID,
    origin: process.env.PASSKEY_ORIGIN,
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PASSKEY_RP_ID = 'auth.example.test';
    process.env.PASSKEY_ORIGIN = 'https://auth.example.test';
  });

  afterEach(() => {
    if (previousEnv.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv.nodeEnv;
    if (previousEnv.rpId === undefined) delete process.env.PASSKEY_RP_ID;
    else process.env.PASSKEY_RP_ID = previousEnv.rpId;
    if (previousEnv.origin === undefined) delete process.env.PASSKEY_ORIGIN;
    else process.env.PASSKEY_ORIGIN = previousEnv.origin;
  });

  it('normalizes login email and returns the access token without exposing the refresh token', async () => {
    const { service, repository, passwords, jwt } = makeAuthService();
    const { response, cookie } = makeResponse();

    const result = await service.login(
      { email: '  PERSON@example.com ', password: 'correct-password' } as LoginDto,
      { response, ip: '203.0.113.7', userAgent: 'unit-test-agent' },
    );

    expect(repository.findByEmail).toHaveBeenCalledWith('person@example.com');
    expect(passwords.verify).toHaveBeenCalledWith('correct-password', legacyUser.passwordHash);
    expect(repository.createRefreshSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: legacyUser.id,
      tokenHash: expect.stringMatching(/^hashed:/),
      ip: '203.0.113.7',
      userAgent: 'unit-test-agent',
    }));
    expect(cookie).toHaveBeenCalledWith(
      'tce_refresh_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/auth' }),
    );
    expect(result).toEqual({ accessToken: 'access-token' });
    expect(JSON.stringify(result)).not.toContain('hashed:');
    expect(jwt.issue).toHaveBeenCalledWith(legacyUser.id, legacyUser.role);
  });

  it('fails invalid credentials without creating a refresh session or issuing a token', async () => {
    const { service, repository, passwords, jwt } = makeAuthService();
    passwords.verify.mockResolvedValue(false);
    const { response, cookie } = makeResponse();

    await expect(service.login(
      { email: 'person@example.com', password: 'wrong-password' } as LoginDto,
      { response },
    )).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repository.createRefreshSession).not.toHaveBeenCalled();
    expect(jwt.issue).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });

  it('rejects suspended accounts before MFA challenge or session creation', async () => {
    const suspendedUser = {
      ...legacyUser,
      status: 'SUSPENDED' as const,
      mfaEnabled: true,
      mfaSecretEncrypted: 'encrypted-secret',
    };
    const { service, repository, passwords, jwt } = makeAuthService(suspendedUser);
    const { response, cookie } = makeResponse();

    await expect(service.login(
      { email: suspendedUser.email, password: 'correct-password' } as LoginDto,
      { response },
    )).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.beginMfaLogin(suspendedUser)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.issueLoginForUser(suspendedUser, { response })).rejects.toBeInstanceOf(UnauthorizedException);

    expect(passwords.verify).toHaveBeenCalled();
    expect(repository.createMfaLoginChallenge).not.toHaveBeenCalled();
    expect(repository.createRefreshSession).not.toHaveBeenCalled();
    expect(jwt.issue).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });

  it('does not issue a session before MFA completion', async () => {
    const mfaUser = { ...legacyUser, mfaEnabled: true, mfaSecretEncrypted: 'encrypted-secret' };
    const { service, repository, jwt } = makeAuthService(mfaUser);
    const { response, cookie } = makeResponse();

    const result = await service.login(
      { email: mfaUser.email, password: 'correct-password' } as LoginDto,
      { response },
    );

    expect(result).toEqual({
      mfaRequired: true,
      challengeToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      mfaExpiresInSeconds: 300,
    });
    expect(result).not.toHaveProperty('userId');
    expect(repository.createMfaLoginChallenge).toHaveBeenCalledWith({
      userId: mfaUser.id,
      tokenHash: expect.stringMatching(/^hashed:/),
      expiresAt: expect.any(Date),
    });
    expect(repository.createRefreshSession).not.toHaveBeenCalled();
    expect(jwt.issue).not.toHaveBeenCalled();
    expect(cookie).not.toHaveBeenCalled();
  });

  it('rotates a refresh session and delivers the replacement only in an HttpOnly cookie', async () => {
    const { service, repository } = makeAuthService();
    repository.rotateRefreshSession.mockResolvedValue({
      status: 'rotated',
      user: legacyUser,
      familyId: 'family-1',
    });
    const { response, cookie } = makeResponse();

    const result = await service.refresh('presented-refresh-token', {
      response,
      ip: '203.0.113.8',
      userAgent: 'unit-test-agent',
    });

    expect(repository.rotateRefreshSession).toHaveBeenCalledWith(expect.objectContaining({
      tokenHash: 'hashed:presented-refresh-token',
      nextSessionId: expect.any(String),
      nextTokenHash: expect.stringMatching(/^hashed:/),
      ip: '203.0.113.8',
      userAgent: 'unit-test-agent',
    }));
    expect(cookie).toHaveBeenCalledWith(
      'tce_refresh_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/auth' }),
    );
    expect(result).toEqual({ accessToken: 'access-token' });
    expect(JSON.stringify(result)).not.toContain('presented-refresh-token');
  });

  it('rejects refresh for a suspended account and clears the refresh cookie', async () => {
    const suspendedUser = { ...legacyUser, status: 'SUSPENDED' as const };
    const { service, repository, jwt } = makeAuthService();
    repository.rotateRefreshSession.mockResolvedValue({
      status: 'rotated',
      user: suspendedUser,
      familyId: 'family-1',
    });
    const { response, cookie } = makeResponse();

    await expect(service.refresh('presented-refresh-token', { response }))
      .rejects.toThrow('Refresh session invalid or expired');

    expect(cookie).toHaveBeenCalledWith(
      'tce_refresh_token',
      '',
      expect.objectContaining({ httpOnly: true, maxAge: 0, path: '/auth' }),
    );
    expect(jwt.issue).not.toHaveBeenCalled();
  });

  it('clears the refresh cookie when token reuse is detected', async () => {
    const { service, repository } = makeAuthService();
    repository.rotateRefreshSession.mockResolvedValue({
      status: 'reuse-detected',
      familyId: 'family-1',
    });
    const { response, cookie } = makeResponse();

    await expect(service.refresh('reused-token', { response }))
      .rejects.toThrow('Refresh token reuse detected');

    expect(cookie.mock.calls.some((call) =>
      call[0] === 'tce_refresh_token' &&
      call[1] === '' &&
      (call[2] as { maxAge?: number }).maxAge === 0,
    )).toBe(true);
  });

  it('normalizes refresh persistence failures and clears the cookie', async () => {
    const { service, repository } = makeAuthService();
    repository.rotateRefreshSession.mockRejectedValue(
      new ServiceUnavailableException('private database detail'),
    );
    const { response, cookie } = makeResponse();

    await expect(service.refresh('presented-token', { response }))
      .rejects.toThrow('Invalid or expired refresh token');

    expect(cookie.mock.calls.some((call) =>
      call[0] === 'tce_refresh_token' &&
      call[1] === '' &&
      (call[2] as { maxAge?: number }).maxAge === 0,
    )).toBe(true);
  });

  it('revokes a presented refresh token on logout and always clears the cookie', async () => {
    const { service, repository } = makeAuthService();
    const { response, cookie } = makeResponse();

    await expect(service.logout('presented-token', response)).resolves.toEqual({ ok: true });

    expect(repository.revokeRefreshToken).toHaveBeenCalledWith('hashed:presented-token');
    expect(cookie).toHaveBeenCalledWith(
      'tce_refresh_token',
      '',
      expect.objectContaining({ httpOnly: true, maxAge: 0, path: '/auth' }),
    );
  });

  it('rejects an unknown passkey before consuming a challenge or issuing a session', async () => {
    const passkeys = {
      findByCredentialId: jest.fn().mockResolvedValue(null),
      consumeChallenge: jest.fn(),
      updateCredential: jest.fn(),
    };
    const users = { findById: jest.fn() };
    const auth = { issueLoginForUser: jest.fn() };
    const service = new PasskeyService(
      passkeys as unknown as PasskeyRepository,
      users as unknown as AuthRepository,
      auth as unknown as AuthService,
    );

    await expect(service.authenticationVerify({ id: 'unknown-credential' }))
      .rejects.toThrow('Passkey not registered');

    expect(passkeys.consumeChallenge).not.toHaveBeenCalled();
    expect(users.findById).not.toHaveBeenCalled();
    expect(auth.issueLoginForUser).not.toHaveBeenCalled();
  });

  it('rejects a missing passkey challenge before verification or session issuance', async () => {
    const credential: PasskeyCredential = {
      id: 'credential-row-1',
      user_id: legacyUser.id,
      credential_id: 'credential-1',
      public_key: Buffer.from('unused-public-key').toString('base64url'),
      counter: 0,
      transports: [],
      friendly_name: 'Test passkey',
      created_at: '2026-01-01T00:00:00.000Z',
      last_used_at: null,
    };
    const passkeys = {
      findByCredentialId: jest.fn().mockResolvedValue(credential),
      consumeChallenge: jest.fn().mockResolvedValue(null),
      updateCredential: jest.fn(),
    };
    const users = { findById: jest.fn() };
    const auth = { issueLoginForUser: jest.fn() };
    const service = new PasskeyService(
      passkeys as unknown as PasskeyRepository,
      users as unknown as AuthRepository,
      auth as unknown as AuthService,
    );
    const clientDataJSON = Buffer.from(JSON.stringify({ challenge: 'challenge-1' })).toString('base64url');

    await expect(service.authenticationVerify({
      id: credential.credential_id,
      response: { clientDataJSON },
    })).rejects.toThrow('Invalid or expired passkey challenge');

    expect(passkeys.consumeChallenge).toHaveBeenCalledWith('challenge-1', 'authentication');
    expect(passkeys.updateCredential).not.toHaveBeenCalled();
    expect(users.findById).not.toHaveBeenCalled();
    expect(auth.issueLoginForUser).not.toHaveBeenCalled();
  });
});
