import type { Response } from 'express';
import { AuthRepository, type AuthUser } from '../src/auth/auth.repository';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '../src/auth/jwt.service';
import { PasswordService } from '../src/auth/password.service';

const mfaAdmin: AuthUser = {
  id: 'admin-user-id', email: 'admin@example.test', passwordHash: 'unused',
  role: 'ADMIN', status: 'ACTIVE', mfaEnabled: true, mfaSecretEncrypted: 'ciphertext',
};

function makeService() {
  const repository = {
    createRefreshSession: jest.fn().mockResolvedValue(undefined),
    rotateRefreshSession: jest.fn().mockResolvedValue({
      status: 'rotated',
      user: { id: mfaAdmin.id, email: mfaAdmin.email, role: mfaAdmin.role, status: 'ACTIVE', mfa_enabled: true },
    }),
  };
  const passwords = { hashToken: jest.fn((value: string) => `hash:${value}`) };
  const jwt = { issue: jest.fn().mockReturnValue('access-token') };
  const service = new AuthService(
    repository as unknown as AuthRepository,
    passwords as unknown as PasswordService,
    jwt as unknown as JwtService,
  );
  const response = { cookie: jest.fn() } as unknown as Response;
  return { service, repository, passwords, jwt, response };
}

describe('MFA assurance in access tokens', () => {
  it('adds a signed mfa_verified_at claim only after successful MFA completion', async () => {
    const { service, jwt, response } = makeService();
    const before = Math.floor(Date.now() / 1000);
    await service.completeMfaLogin(mfaAdmin, { response });
    const issuedAt = (jwt.issue as jest.Mock).mock.calls[0][2] as number;
    expect(jwt.issue).toHaveBeenCalledWith(mfaAdmin.id, mfaAdmin.role, expect.any(Number));
    expect(issuedAt).toBeGreaterThanOrEqual(before);
    expect(issuedAt).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });

  it('treats a consumed recovery code as MFA assurance', async () => {
    const { service, jwt, response } = makeService();
    await service.completeMfaRecoveryLogin(mfaAdmin, { response });
    expect(jwt.issue).toHaveBeenCalledWith(mfaAdmin.id, mfaAdmin.role, expect.any(Number));
  });

  it('does not add MFA assurance to password-only issuance', async () => {
    const { service, jwt, response } = makeService();
    await service.issueLoginForUser({ ...mfaAdmin, mfaEnabled: false }, { response });
    expect(jwt.issue).toHaveBeenCalledWith(mfaAdmin.id, mfaAdmin.role);
  });


  it('does not preserve MFA assurance when a refresh token mints a new access token', async () => {
    const { service, jwt, response } = makeService();
    await service.refresh('refresh-token', { response });
    expect(jwt.issue).toHaveBeenCalledWith(mfaAdmin.id, mfaAdmin.role);
  });

  it('verifies the signed claim and omits it when the caller does not supply MFA assurance', () => {
    const previous = {
      secret: process.env.JWT_SECRET,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    };
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-bytes-long';
    delete process.env.JWT_ISSUER;
    delete process.env.JWT_AUDIENCE;
    try {
      const jwt = new JwtService();
      const now = Math.floor(Date.now() / 1000);
      expect(jwt.verify(jwt.issue(mfaAdmin.id, mfaAdmin.role, now)).mfa_verified_at).toBe(now);
      expect(jwt.verify(jwt.issue(mfaAdmin.id, mfaAdmin.role)).mfa_verified_at).toBeUndefined();
    } finally {
      if (previous.secret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previous.secret;
      if (previous.issuer === undefined) delete process.env.JWT_ISSUER;
      else process.env.JWT_ISSUER = previous.issuer;
      if (previous.audience === undefined) delete process.env.JWT_AUDIENCE;
      else process.env.JWT_AUDIENCE = previous.audience;
    }
  });
});
