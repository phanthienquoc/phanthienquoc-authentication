import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface KeycloakPrincipal {
  sub: string;
  email?: string;
  preferredUsername?: string;
  roles: string[];
  claims: JWTPayload;
}

@Injectable()
export class KeycloakTokenService {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private jwksUri: string | null = null;

  private get configuration() {
    const baseUrl = process.env.KEYCLOAK_URL?.trim().replace(/\/+$/, '');
    const realm = process.env.KEYCLOAK_REALM?.trim();
    const audience = process.env.KEYCLOAK_AUDIENCE?.trim();
    if (!baseUrl || !realm || !audience) {
      throw new Error('KEYCLOAK_URL, KEYCLOAK_REALM and KEYCLOAK_AUDIENCE are required to validate Keycloak tokens');
    }
    const issuer = process.env.KEYCLOAK_ISSUER?.trim() || `${baseUrl}/realms/${realm}`;
    return { baseUrl, realm, audience, issuer, jwksUri: `${issuer}/protocol/openid-connect/certs` };
  }

  async verifyAccessToken(token: string): Promise<KeycloakPrincipal> {
    try {
      const config = this.configuration;
      if (!this.jwks || this.jwksUri !== config.jwksUri) {
        this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
        this.jwksUri = config.jwksUri;
      }

      const { payload, protectedHeader } = await jwtVerify(token, this.jwks, {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: ['RS256'],
        clockTolerance: 5,
      });

      if (protectedHeader.alg !== 'RS256' || typeof payload.sub !== 'string' || !payload.sub) {
        throw new Error('Invalid access-token subject or signing algorithm');
      }
      if (payload.typ === 'ID') {
        throw new Error('ID tokens are not accepted as API access tokens');
      }

      const realmRoles = this.stringArray(
        (payload.realm_access as Record<string, unknown> | undefined)?.roles,
      );
      const resourceAccess = payload.resource_access as Record<string, unknown> | undefined;
      const clientRoles = Object.values(resourceAccess ?? {}).flatMap((value) =>
        this.stringArray((value as Record<string, unknown> | undefined)?.roles),
      );

      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        preferredUsername: typeof payload.preferred_username === 'string'
          ? payload.preferred_username
          : undefined,
        roles: [...new Set([...realmRoles, ...clientRoles])],
        claims: payload,
      };
    } catch {
      // Do not leak JWT, key, issuer or discovery details to callers.
      throw new UnauthorizedException('Invalid or expired Keycloak access token');
    }
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
