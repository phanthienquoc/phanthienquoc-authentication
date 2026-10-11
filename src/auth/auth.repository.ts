import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
}

export interface RefreshSession {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly pool: Pool) {}

  async ready(): Promise<void> {
    await this.query('SELECT 1');
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.query<{
      id: string; email: string; password_hash: string; role: 'USER' | 'ADMIN';
      mfa_enabled: boolean; mfa_secret_encrypted: string | null;
    }>(
      'SELECT id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted FROM public.users WHERE lower(email) = $1 LIMIT 1',
      [email.trim().toLowerCase()],
    );
    return this.mapUser(result.rows[0]);
  }

  async findById(id: string): Promise<AuthUser | null> {
    const result = await this.query<{
      id: string; email: string; password_hash: string; role: 'USER' | 'ADMIN';
      mfa_enabled: boolean; mfa_secret_encrypted: string | null;
    }>(
      'SELECT id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted FROM public.users WHERE id = $1 LIMIT 1',
      [id],
    );
    return this.mapUser(result.rows[0]);
  }

  async createUser(input: { email: string; passwordHash: string; role: 'USER' | 'ADMIN' }) {
    const result = await this.query<{
      id: string; email: string; password_hash: string; role: 'USER' | 'ADMIN';
      mfa_enabled: boolean; mfa_secret_encrypted: string | null;
    }>(
      'INSERT INTO public.users (email,password_hash,role,mfa_enabled) VALUES ($1,$2,$3,false) RETURNING id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted',
      [input.email.trim().toLowerCase(), input.passwordHash, input.role],
    );
    return this.mapUser(result.rows[0])!;
  }

  async updateMfa(userId: string, enabled: boolean, encryptedSecret: string | null) {
    const result = await this.query(
      'UPDATE public.users SET mfa_enabled = $2, mfa_secret_encrypted = $3, updated_at = now() WHERE id = $1 RETURNING id',
      [userId, enabled, encryptedSecret],
    );
    if (result.rowCount !== 1) throw new ServiceUnavailableException('Unable to update MFA configuration');
  }

  async createRecoveryCodes(userId: string, hashes: string[]) {
    await this.withTransaction(async (client) => {
      await client.query('DELETE FROM public.mfa_recovery_codes WHERE user_id = $1 AND used_at IS NULL', [userId]);
      for (const hash of hashes) {
        await client.query('INSERT INTO public.mfa_recovery_codes (user_id,code_hash) VALUES ($1,$2)', [userId, hash]);
      }
    });
  }

  async consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE public.mfa_recovery_codes SET used_at = now() WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL RETURNING id',
      [userId, codeHash],
    );
    return result.rowCount === 1;
  }

  async createRefreshSession(input: {
    sessionId: string; userId: string; familyId: string; tokenHash: string;
    expiresAt: Date; ip?: string; userAgent?: string;
  }) {
    await this.query(
      'INSERT INTO public.refresh_sessions (id,user_id,token_hash,family_id,expires_at,ip,user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [input.sessionId, input.userId, input.tokenHash, input.familyId, input.expiresAt, input.ip ?? null, input.userAgent ?? null],
    );
  }

  async findRefreshSessionByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const result = await this.query<{
      id: string; user_id: string; family_id: string; expires_at: Date; revoked_at: Date | null; replaced_by: string | null;
    }>(
      'SELECT id,user_id,family_id,expires_at,revoked_at,replaced_by FROM public.refresh_sessions WHERE token_hash = $1 LIMIT 1',
      [tokenHash],
    );
    const row = result.rows[0];
    return row ? {
      id: row.id, userId: row.user_id, familyId: row.family_id,
      expiresAt: row.expires_at, revokedAt: row.revoked_at, replacedBy: row.replaced_by,
    } : null;
  }

  async rotateRefreshSession(input: {
    tokenHash: string; nextSessionId: string; nextTokenHash: string;
    expiresAt: Date; ip?: string; userAgent?: string;
  }): Promise<{ user: AuthUser; familyId: string }> {
    return this.withTransaction(async (client) => {
      const locked = await client.query<{
        id: string; user_id: string; family_id: string; expires_at: Date;
        revoked_at: Date | null; replaced_by: string | null;
      }>(
        'SELECT id,user_id,family_id,expires_at,revoked_at,replaced_by FROM public.refresh_sessions WHERE token_hash = $1 FOR UPDATE',
        [input.tokenHash],
      );
      const session = locked.rows[0];
      if (!session || session.expires_at <= new Date()) throw new UnauthorizedException('Refresh session invalid or expired');

      if (session.revoked_at || session.replaced_by) {
        await client.query('UPDATE public.refresh_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE family_id = $1', [session.family_id]);
        return { reuseDetected: true } as never;
      }

      const userResult = await client.query<{
        id: string; email: string; password_hash: string; role: 'USER' | 'ADMIN';
        mfa_enabled: boolean; mfa_secret_encrypted: string | null;
      }>(
        'SELECT id,email,password_hash,role,mfa_enabled,mfa_secret_encrypted FROM public.users WHERE id = $1 FOR UPDATE',
        [session.user_id],
      );
      const user = this.mapUser(userResult.rows[0]);
      if (!user) throw new UnauthorizedException('Refresh session user unavailable');

      const inserted = await client.query(
        'INSERT INTO public.refresh_sessions (id,user_id,token_hash,family_id,expires_at,ip,user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [input.nextSessionId, user.id, input.nextTokenHash, session.family_id, input.expiresAt, input.ip ?? null, input.userAgent ?? null],
      );
      if (inserted.rowCount !== 1) throw new UnauthorizedException('Unable to rotate session');
      const updated = await client.query(
        'UPDATE public.refresh_sessions SET revoked_at = now(), replaced_by = $2, last_used_at = now() WHERE id = $1 AND revoked_at IS NULL AND replaced_by IS NULL',
        [session.id, input.nextSessionId],
      );
      if (updated.rowCount !== 1) throw new UnauthorizedException('Refresh session changed concurrently');
      return { user, familyId: session.family_id };
    });
  }

  async revokeRefreshSession(id: string): Promise<boolean> {
    const result = await this.query('UPDATE public.refresh_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id', [id]);
    return result.rowCount === 1;
  }

  async query<T = unknown>(sql: string, values: unknown[] = []) {
    if (!process.env.DATABASE_URL) throw new ServiceUnavailableException('Database is not configured');
    try {
      return await this.pool.query<T>(sql, values);
    } catch {
      throw new ServiceUnavailableException('Authentication persistence unavailable');
    }
  }

  private async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!process.env.DATABASE_URL) throw new ServiceUnavailableException('Database is not configured');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapUser(row?: {
    id: string; email: string; password_hash: string; role: 'USER' | 'ADMIN';
    mfa_enabled: boolean; mfa_secret_encrypted: string | null;
  }): AuthUser | null {
    return row ? {
      id: row.id, email: row.email, passwordHash: row.password_hash,
      role: row.role, mfaEnabled: row.mfa_enabled, mfaSecretEncrypted: row.mfa_secret_encrypted,
    } : null;
  }
}
