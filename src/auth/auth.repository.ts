import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { SupabaseClientService } from '../db/supabase.client';

export interface AuthUser {
  id: string; email: string; passwordHash: string; role: 'USER' | 'ADMIN';
  mfaEnabled: boolean; mfaSecretEncrypted: string | null;
}
export interface RefreshSession {
  id: string; userId: string; familyId: string; expiresAt: Date;
  revokedAt: Date | null; replacedBy: string | null;
}
type UserRow = {
  id: string; email: string; password_hash: string; role: 'USER' | 'ADMIN';
  mfa_enabled: boolean; mfa_secret_encrypted: string | null;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly supabase: SupabaseClientService) {}

  async ready(): Promise<void> {
    for (const table of ['users','refresh_sessions','mfa_recovery_codes','auth_passkey_challenges','auth_passkey_credentials']) {
      const { error } = await this.supabase.db.from(table).select('id').limit(1);
      if (error) this.persistenceError();
    }
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const { data, error } = await this.supabase.db.from('users')
      .select('id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted')
      .eq('email', email.trim().toLowerCase()).limit(1).maybeSingle<UserRow>();
    if (error) this.persistenceError();
    return this.mapUser(data ?? undefined);
  }

  async findById(id: string): Promise<AuthUser | null> {
    const { data, error } = await this.supabase.db.from('users')
      .select('id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted')
      .eq('id', id).maybeSingle<UserRow>();
    if (error) this.persistenceError();
    return this.mapUser(data ?? undefined);
  }

  async createUser(input: { email: string; passwordHash: string; role: 'USER' | 'ADMIN' }) {
    const { data, error } = await this.supabase.db.from('users').insert({
      email: input.email.trim().toLowerCase(), password_hash: input.passwordHash,
      role: input.role, mfa_enabled: false,
    }).select('id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted').single<UserRow>();
    if (error) {
      if (error.code === '23505') {
        const duplicate = new Error('Duplicate email') as Error & { code: string };
        duplicate.code = '23505';
        throw duplicate;
      }
      this.persistenceError();
    }
    return this.mapUser(data!)!;
  }

  async updateMfa(userId: string, enabled: boolean, encryptedSecret: string | null) {
    const { data, error } = await this.supabase.db.from('users').update({
      mfa_enabled: enabled, mfa_secret_encrypted: encryptedSecret, updated_at: new Date().toISOString(),
    }).eq('id', userId).select('id').maybeSingle();
    if (error) this.persistenceError();
    if (!data) throw new ServiceUnavailableException('Unable to update MFA configuration');
  }

  async createRecoveryCodes(userId: string, hashes: string[]) {
    const { error } = await this.supabase.db.rpc('auth_replace_mfa_recovery_codes', {
      p_user_id: userId, p_code_hashes: hashes,
    });
    if (error) this.persistenceError();
  }

  async consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    const { data, error } = await this.supabase.db.rpc('auth_consume_mfa_recovery_code', {
      p_user_id: userId, p_code_hash: codeHash,
    });
    if (error) this.persistenceError();
    return data === true;
  }

  async createRefreshSession(input: {
    sessionId: string; userId: string; familyId: string; tokenHash: string;
    expiresAt: Date; ip?: string; userAgent?: string;
  }) {
    const { error } = await this.supabase.db.from('refresh_sessions').insert({
      id: input.sessionId, user_id: input.userId, token_hash: input.tokenHash,
      family_id: input.familyId, expires_at: input.expiresAt.toISOString(),
      ip: input.ip ?? null, user_agent: input.userAgent ?? null,
    });
    if (error) this.persistenceError();
  }

  async findRefreshSessionByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const { data, error } = await this.supabase.db.from('refresh_sessions')
      .select('id,user_id,family_id,expires_at,revoked_at,replaced_by')
      .eq('token_hash', tokenHash).maybeSingle();
    if (error) this.persistenceError();
    return data ? {
      id: data.id, userId: data.user_id, familyId: data.family_id,
      expiresAt: new Date(data.expires_at), revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
      replacedBy: data.replaced_by,
    } : null;
  }

  async rotateRefreshSession(input: {
    tokenHash: string; nextSessionId: string; nextTokenHash: string;
    expiresAt: Date; ip?: string; userAgent?: string;
  }): Promise<{ status: 'rotated'; user: AuthUser; familyId: string } | { status: 'reuse-detected'; familyId: string }> {
    const { data, error } = await this.supabase.db.rpc('auth_rotate_refresh_session', {
      p_token_hash: input.tokenHash, p_next_session_id: input.nextSessionId,
      p_next_token_hash: input.nextTokenHash, p_next_expires_at: input.expiresAt.toISOString(),
      p_ip: input.ip ?? null, p_user_agent: input.userAgent ?? null,
    });
    if (error) this.persistenceError();
    const result = data as
      | { status: 'rotated'; family_id: string; user: UserRow }
      | { status: 'reuse-detected'; family_id: string }
      | { status: 'invalid' } | null;
    if (!result || result.status === 'invalid') throw new UnauthorizedException('Refresh session invalid or expired');
    if (result.status === 'reuse-detected') return { status: 'reuse-detected', familyId: result.family_id };
    return { status: 'rotated', familyId: result.family_id, user: this.mapUser(result.user)! };
  }

  async revokeRefreshToken(tokenHash: string): Promise<boolean> {
    const { data, error } = await this.supabase.db.from('refresh_sessions')
      .update({ revoked_at: new Date().toISOString() }).eq('token_hash', tokenHash)
      .is('revoked_at', null).select('id');
    if (error) this.persistenceError();
    return (data?.length ?? 0) === 1;
  }

  async revokeRefreshSession(id: string): Promise<boolean> {
    const { data, error } = await this.supabase.db.from('refresh_sessions')
      .update({ revoked_at: new Date().toISOString() }).eq('id', id)
      .is('revoked_at', null).select('id');
    if (error) this.persistenceError();
    return (data?.length ?? 0) === 1;
  }

  private persistenceError(): never {
    throw new ServiceUnavailableException('Authentication persistence unavailable');
  }

  private mapUser(row?: UserRow): AuthUser | null {
    return row ? {
      id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role,
      mfaEnabled: row.mfa_enabled, mfaSecretEncrypted: row.mfa_secret_encrypted,
    } : null;
  }
}
