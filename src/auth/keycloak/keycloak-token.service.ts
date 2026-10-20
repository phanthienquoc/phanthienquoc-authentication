import { Injectable, UnauthorizedException } from '@nestjs/common';
import jwt, { type JwtHeader, type JwtPayload, type SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface KeycloakPrincipal {
  sub: string;
  email?: string;
  preferredUsername?: string;
  emailVerified?: boolean;
  roles: string[];
  claims: JwtPayload;
}

@Injectable()
export class KeycloakTokenService {
  private jwks: ReturnType<typeof jwksClient> | null = null;
  private jwksUri: string | null = null;

  private get configuration() {
    const baseUrl = process.env.KEYCLOAK_URL?.trim().replace(/\/+$/, '');
    const realm = process.env.KEYCLOAK_REALM?.trim();
    const audience = process.env.KEYCLOAK_AUDIENCE?.trim();
    if (!baseUrl || !realm || !audience) {
      throw new Error('KEYCLOAK_URL, KEYCLOAK_REALM and KEYCLOAK_AUDIENCE are required to validate Keycloak tokens');
    }
    const issuer = process.env.KEYCLOAK_ISSUER?.trim() || `${baseUrl}/realms/${realm}`;
    return { audience, issuer, jwksUri: `${issuer}/protocol/openid-connect/certs` };
  }

  async verifyAccessToken(token: string): Promise<KeycloakPrincipal> {
    try {
      const config = this.configuration;
      if (!this.jwks || this.jwksUri !== config.jwksUri) {
        this.jwks = jwksClient({
          jwksUri: config.jwksUri,
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 10,
          timeout: 5000,
        });
        this.jwksUri = config.jwksUri;
      }

      const getKey = (header: JwtHeader, callback: SigningKeyCallback) => {
        if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
          callback(new Error('Unsupported signing algorithm or missing key id'));
          return;
        }
        this.jwks!.getSigningKey(header.kid, (error, key) => {
          if (error || !key) {
            callback(error ?? new Error('Signing key not found'));
            return;
          }
          callback(null, key.getPublicKey());
        });
      };

      const payload = await new Promise<JwtPayload>((resolve, reject) => {
        jwt.verify(
          token,
          getKey,
          {
            algorithms: ['RS256'],
            issuer: config.issuer,
            audience: config.audience,
            clockTolerance: 5,
          },
          (error, decoded) => {
            if (error) {
              reject(error);
              return;
            }
            if (!decoded || typeof decoded === 'string') {
              reject(new Error('Invalid JWT payload'));
              return;
            }
            resolve(decoded);
          },
        );
      });

      if (typeof payload.sub !== 'string' || !payload.sub || payload.typ === 'ID') {
        throw new Error('Invalid access-token subject or token type');
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
        emailVerified: typeof payload.email_verified === 'boolean' ? payload.email_verified : undefined,
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
