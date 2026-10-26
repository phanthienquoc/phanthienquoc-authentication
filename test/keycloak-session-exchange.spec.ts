import { UnauthorizedException } from '@nestjs/common';
import { KeycloakController } from '../src/auth/keycloak/keycloak.controller';

describe('KeycloakController TCE session exchange', () => {
  const originalClientId = process.env.KEYCLOAK_TCE_CLIENT_ID;
  const identities = { syncAuthenticatedIdentity: jest.fn() };
  const auth = { loginWithKeycloak: jest.fn() };
  const controller = new KeycloakController(identities as any, auth as any);
  const response = {} as any;

  const request = (overrides: Record<string, unknown> = {}) => ({
    keycloakUser: {
      sub: 'kc-subject-1',
      email: 'trader@example.com',
      emailVerified: true,
      preferredUsername: 'trader',
      roles: [],
      claims: { azp: 'tce-dashboard' },
      ...overrides,
    },
  });

  beforeEach(() => {
    process.env.KEYCLOAK_TCE_CLIENT_ID = 'tce-dashboard';
    jest.clearAllMocks();
    identities.syncAuthenticatedIdentity.mockResolvedValue({ id: 'identity-1' });
    auth.loginWithKeycloak.mockResolvedValue({ accessToken: 'test-access-token' });
  });

  afterAll(() => {
    if (originalClientId === undefined) delete process.env.KEYCLOAK_TCE_CLIENT_ID;
    else process.env.KEYCLOAK_TCE_CLIENT_ID = originalClientId;
  });

  it('only exchanges a verified identity from the configured TCE client', async () => {
    const result = await controller.createSession(
      request() as any,
      'test-agent',
      response,
    );

    expect(identities.syncAuthenticatedIdentity).toHaveBeenCalledTimes(1);
    expect(auth.loginWithKeycloak).toHaveBeenCalledWith('trader@example.com', {
      userAgent: 'test-agent',
      response,
    });
    expect(result).toEqual({ accessToken: 'test-access-token', authMethod: 'keycloak' });
  });

  it('rejects unverified email before creating an application session', async () => {
    await expect(controller.createSession(
      request({ emailVerified: false }) as any,
      undefined,
      response,
    )).rejects.toBeInstanceOf(UnauthorizedException);

    expect(auth.loginWithKeycloak).not.toHaveBeenCalled();
  });

  it('rejects tokens issued to a different OIDC client', async () => {
    await expect(controller.createSession(
      request({ claims: { azp: 'other-client' } }) as any,
      undefined,
      response,
    )).rejects.toBeInstanceOf(UnauthorizedException);

    expect(auth.loginWithKeycloak).not.toHaveBeenCalled();
  });
});
