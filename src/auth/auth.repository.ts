import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';

export interface AuthUser {
  id: string; email: string; passwordHash: string; role: string; disabledAt: Date | null;
}
export interface RefreshSession {
  id: string; userId: string; expiresAt: Date; revokedAt: Date | null;
}

@Injectable()
export class AuthRepository {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: true },
  });

  async findByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.query<{
      id: string; email: string; password_hash: string; role: string; disabled_at: Date | null;
    }>('SELECT id,email,password_hash,role,disabled_at FROM public.users WHERE lower(email) = $1 LIMIT 1', [email]);
    return this.mapUser(result.rows[0]);
  }

  async findById(id: string): Promise<AuthUser | null> {
    const result = await this.query<{
      id: string; email: string; password_hash: string; role: string; disabled_at: Date | null;
    }>('SELECT id,email,password_hash,role,disabled_at FROM public.users WHERE id = $1 LIMIT 1', [id]);
    return this.mapUser(result.rows[0]);
  }

  async createUser(input: { email: string; passwordHash: string; role: string }): Promise<AuthUser> {
    const result = await this.query<{
      id: string; email: string; password_hash: string; role: string; disabled_at: Date | null;
    }>(
      'INSERT INTO public.users (email,password_hash,role) VALUES ($1,$2,$3) RETURNING id,email,password_hash,role,disabled_at',
      [input.email, input.passwordHash, input.role],
    );
    return this.mapUser(result.rows[0])!;
  }

  async createRefreshSession(input: {
    sessionId: string; userId: string; tokenHash: string; expiresAt: Date; userAgent?: string;
  }) {
    await this.query(
      'INSERT INTO public.refresh_sessions (id,user_id,token_hash,expires_at,user_agent) VALUES ($1,$2,$3,$4,$5)',
      [input.sessionId, input.userId, input.tokenHash, input.expiresAt, input.userAgent ?? null],
    );
  }

  async findRefreshSessionByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const result = await this.query<{
      id: string; user_id: string; expires_at: Date; revoked_at: Date | null;
    }>(
      'SELECT id,user_id,expires_at,revoked_at FROM public.refresh_sessions WHERE token_hash = $1 LIMIT 1',
      [tokenHash],
    );
    const row = result.rows[0];
    return row ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at, revokedAt: row.revoked_at } : null;
  }

  async revokeRefreshSession(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE public.refresh_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id',
      [id],
    );
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

  private mapUser(row?: {
    id: string; email: string; password_hash: string; role: string; disabled_at: Date | null;
  }): AuthUser | null {
    return row ? {
      id: row.id, email: row.email, passwordHash: row.password_hash,
      role: row.role, disabledAt: row.disabled_at,
    } : null;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
