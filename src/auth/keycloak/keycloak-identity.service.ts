import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseClientService } from '../../db/supabase.client';
import type { KeycloakPrincipal } from './keycloak-token.service';

export interface PersistedKeycloakIdentity {
  id: string;
  issuer: string;
  subject: string;
  email: string | null;
  preferred_username: string | null;
  email_verified: boolean | null;
  last_authenticated_at: string;
}

/**
 * Persists minimal identity metadata after a Keycloak access token has been
 * verified. Credentials, access/refresh tokens and authorization decisions
 * remain owned by Keycloak / the verified access token and are never stored.
 */
@Injectable()
export class KeycloakIdentityService {
  constructor(private readonly supabase: SupabaseClientService) {}

  async syncAuthenticatedIdentity(user: KeycloakPrincipal): Promise<PersistedKeycloakIdentity> {
    const issuer = process.env.KEYCLOAK_ISSUER?.trim()
      || `${process.env.KEYCLOAK_URL?.trim().replace(/\/+$/, '')}/realms/${process.env.KEYCLOAK_REALM?.trim()}`;

    if (!issuer || issuer.includes('undefined') || !user.sub) {
      throw new ServiceUnavailableException('Keycloak identity persistence is not configured');
    }

    const now = new Date().toISOString();
    const { data, error } = await this.supabase.db
      .from('auth_keycloak_identities')
      .upsert({
        issuer,
        subject: user.sub,
        email: user.email ?? null,
        preferred_username: user.preferredUsername ?? null,
        email_verified: user.emailVerified ?? null,
        last_authenticated_at: now,
        updated_at: now,
      }, { onConflict: 'issuer,subject' })
      .select('id,issuer,subject,email,preferred_username,email_verified,last_authenticated_at')
      .single<PersistedKeycloakIdentity>();

    if (error || !data) {
      // Do not expose database errors, connection details or identity tokens.
      throw new ServiceUnavailableException('Unable to persist authenticated identity');
    }

    return data;
  }
}
