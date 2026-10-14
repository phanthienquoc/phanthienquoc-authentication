import { UnauthorizedException } from '@nestjs/common';
import { KeycloakTokenService } from '../src/auth/keycloak/keycloak-token.service';

describe('KeycloakTokenService configuration', () => {
  const original = {
    url: process.env.KEYCLOAK_URL,
    realm: process.env.KEYCLOAK_REALM,
    audience: process.env.KEYCLOAK_AUDIENCE,
    issuer: process.env.KEYCLOAK_ISSUER,
  };

  afterEach(() => {
    if (original.url === undefined) delete process.env.KEYCLOAK_URL;
    else process.env.KEYCLOAK_URL = original.url;
    if (original.realm === undefined) delete process.env.KEYCLOAK_REALM;
    else process.env.KEYCLOAK_REALM = original.realm;
    if (original.audience === undefined) delete process.env.KEYCLOAK_AUDIENCE;
    else process.env.KEYCLOAK_AUDIENCE = original.audience;
    if (original.issuer === undefined) delete process.env.KEYCLOAK_ISSUER;
    else process.env.KEYCLOAK_ISSUER = original.issuer;
  });

  it('fails closed when required Keycloak configuration is missing', async () => {
    delete process.env.KEYCLOAK_URL;
    delete process.env.KEYCLOAK_REALM;
    delete process.env.KEYCLOAK_AUDIENCE;
    await expect(new KeycloakTokenService().verifyAccessToken('not-a-jwt'))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects malformed tokens rather than accepting decoded claims', async () => {
    process.env.KEYCLOAK_URL = 'http://localhost:8080';
    process.env.KEYCLOAK_REALM = 'mrcute';
    process.env.KEYCLOAK_AUDIENCE = 'nest-api';
    await expect(new KeycloakTokenService().verifyAccessToken('eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyIn0.'))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
