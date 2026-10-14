import { ServiceUnavailableException } from '@nestjs/common';
import { KeycloakIdentityService } from '../src/auth/keycloak/keycloak-identity.service';

describe('KeycloakIdentityService', () => {
  const originalIssuer = process.env.KEYCLOAK_ISSUER;
  const originalUrl = process.env.KEYCLOAK_URL;
  const originalRealm = process.env.KEYCLOAK_REALM;

  afterEach(() => {
    if (originalIssuer === undefined) delete process.env.KEYCLOAK_ISSUER;
    else process.env.KEYCLOAK_ISSUER = originalIssuer;
    if (originalUrl === undefined) delete process.env.KEYCLOAK_URL;
    else process.env.KEYCLOAK_URL = originalUrl;
    if (originalRealm === undefined) delete process.env.KEYCLOAK_REALM;
    else process.env.KEYCLOAK_REALM = originalRealm;
    jest.clearAllMocks();
  });

  it('upserts only verified identity metadata by issuer and subject', async () => {
    process.env.KEYCLOAK_ISSUER = 'https://auth.example.test/realms/mrcute';
    const row = {
      id: 'db-id',
      issuer: process.env.KEYCLOAK_ISSUER,
      subject: 'kc-subject',
      email: 'user@example.test',
      preferred_username: 'user',
      email_verified: true,
      last_authenticated_at: '2026-10-14T00:00:00.000Z',
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const upsert = jest.fn().mockReturnValue({ select });
    const service = new KeycloakIdentityService({
      db: { from: jest.fn().mockReturnValue({ upsert }) },
    } as never);

    await expect(service.syncAuthenticatedIdentity({
      sub: 'kc-subject',
      email: 'user@example.test',
      preferredUsername: 'user',
      emailVerified: true,
      roles: ['user'],
      claims: { sub: 'kc-subject' },
    })).resolves.toEqual(row);

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      issuer: 'https://auth.example.test/realms/mrcute',
      subject: 'kc-subject',
      email: 'user@example.test',
      preferred_username: 'user',
      email_verified: true,
    }), { onConflict: 'issuer,subject' });
    const payload = upsert.mock.calls[0][0];
    expect(payload).not.toHaveProperty('access_token');
    expect(payload).not.toHaveProperty('refresh_token');
    expect(payload).not.toHaveProperty('password');
  });

  it('fails safely when Supabase persistence fails', async () => {
    process.env.KEYCLOAK_ISSUER = 'https://auth.example.test/realms/mrcute';
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'private database detail' } });
    const select = jest.fn().mockReturnValue({ single });
    const upsert = jest.fn().mockReturnValue({ select });
    const service = new KeycloakIdentityService({
      db: { from: jest.fn().mockReturnValue({ upsert }) },
    } as never);

    await expect(service.syncAuthenticatedIdentity({
      sub: 'kc-subject',
      roles: [],
      claims: { sub: 'kc-subject' },
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
