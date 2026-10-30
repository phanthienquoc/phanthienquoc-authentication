import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService Keycloak session exchange', () => {
  const repository = { findByEmail: jest.fn() };
  const service = new AuthService(repository as any, {} as any, {} as any);
  const context = { response: {} as any, userAgent: 'test-agent' };

  beforeEach(() => jest.clearAllMocks());

  it('requires an existing active account with the exact verified email', async () => {
    repository.findByEmail.mockResolvedValue(null);
    await expect(service.loginWithKeycloak('trader@example.com', context))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not bypass legacy account MFA during SSO migration', async () => {
    repository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'trader@example.com',
      role: 'USER',
      status: 'ACTIVE',
      mfaEnabled: true,
    });
    await expect(service.loginWithKeycloak('trader@example.com', context))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a suspended account before exchanging a verified Keycloak identity', async () => {
    repository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'trader@example.com',
      role: 'USER',
      status: 'SUSPENDED',
      mfaEnabled: false,
    });
    const issue = jest.spyOn(service, 'issueLoginForUser').mockResolvedValue({
      accessToken: 'must-not-be-issued',
    });

    await expect(service.loginWithKeycloak('TRADER@example.com', context))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(issue).not.toHaveBeenCalled();
  });

  it('issues the existing app session for an active account without legacy MFA', async () => {
    repository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'trader@example.com',
      role: 'USER',
      status: 'ACTIVE',
      mfaEnabled: false,
    });
    const issue = jest.spyOn(service, 'issueLoginForUser').mockResolvedValue({
      accessToken: 'test-only-access-token',
    });
    await expect(service.loginWithKeycloak('TRADER@example.com', context))
      .resolves.toEqual({ accessToken: 'test-only-access-token' });
    expect(issue).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', email: 'trader@example.com' }),
      context,
    );
  });
});
