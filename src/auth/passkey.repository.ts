import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Pool } from 'pg';

export interface PasskeyCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[];
  friendly_name: string;
  created_at: Date;
  last_used_at: Date | null;
}

@Injectable()
export class PasskeyRepository {
  constructor(private readonly pool: Pool) {}

  async createChallenge(userId: string | null, challenge: string, purpose: 'registration' | 'authentication') {
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.pool.query(
      'INSERT INTO public.auth_passkey_challenges (user_id,challenge,purpose,expires_at) VALUES ($1,$2,$3,$4)',
      [userId, challenge, purpose, expiresAt],
    );
  }

  async consumeChallenge(challenge: string, purpose: 'registration' | 'authentication') {
    const result = await this.pool.query<{
      id: string; user_id: string | null; challenge: string; purpose: string; expires_at: Date;
    }>(
      `DELETE FROM public.auth_passkey_challenges
       WHERE id = (
         SELECT id FROM public.auth_passkey_challenges
         WHERE challenge = $1 AND purpose = $2 AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE SKIP LOCKED
       )
       RETURNING id,user_id,challenge,purpose,expires_at`,
      [challenge, purpose],
    );
    return result.rows[0] ?? null;
  }

  async listForUser(userId: string): Promise<PasskeyCredential[]> {
    const result = await this.pool.query<PasskeyCredential>(
      'SELECT * FROM public.auth_passkey_credentials WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    return result.rows;
  }

  async findByCredentialId(credentialId: string) {
    const result = await this.pool.query<PasskeyCredential>(
      'SELECT * FROM public.auth_passkey_credentials WHERE credential_id = $1 LIMIT 1',
      [credentialId],
    );
    return result.rows[0] ?? null;
  }

  async createCredential(input: Omit<PasskeyCredential, 'id' | 'created_at' | 'last_used_at'>) {
    const result = await this.pool.query<PasskeyCredential>(
      `INSERT INTO public.auth_passkey_credentials
       (user_id,credential_id,public_key,counter,transports,friendly_name)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,
      [input.user_id, input.credential_id, input.public_key, input.counter, JSON.stringify(input.transports), input.friendly_name],
    );
    return result.rows[0];
  }

  async updateCredential(id: string, counter: number, transports?: string[]) {
    const result = await this.pool.query(
      `UPDATE public.auth_passkey_credentials
       SET counter = $2, last_used_at = now(), transports = COALESCE($3::jsonb, transports)
       WHERE id = $1 RETURNING id`,
      [id, counter, transports ? JSON.stringify(transports) : null],
    );
    if (result.rowCount !== 1) throw new UnauthorizedException('Passkey credential no longer exists');
  }

  async rename(userId: string, id: string, friendlyName: string) {
    const result = await this.pool.query(
      'UPDATE public.auth_passkey_credentials SET friendly_name = $3 WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId, friendlyName.trim().slice(0, 80)],
    );
    if (result.rowCount !== 1) throw new UnauthorizedException('Passkey not found');
    return { ok: true };
  }

  async remove(userId: string, id: string) {
    const result = await this.pool.query(
      'DELETE FROM public.auth_passkey_credentials WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId],
    );
    if (result.rowCount !== 1) throw new UnauthorizedException('Passkey not found');
    return { ok: true };
  }
}
