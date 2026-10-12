import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseClientService } from '../db/supabase.client';

export interface PasskeyCredential {
  id: string; user_id: string; credential_id: string; public_key: string;
  counter: number; transports: string[]; friendly_name: string; created_at: string; last_used_at: string | null;
}
export interface PasskeyChallenge {
  id: string; user_id: string | null; challenge: string;
  purpose: 'registration' | 'authentication'; expires_at: string;
}

@Injectable()
export class PasskeyRepository {
  constructor(private readonly supabase: SupabaseClientService) {}

  async createChallenge(userId: string | null, challenge: string, purpose: 'registration' | 'authentication') {
    const { error } = await this.supabase.db.from('auth_passkey_challenges').insert({
      user_id: userId, challenge, purpose, expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (error) throw new UnauthorizedException('Unable to create passkey challenge');
  }

  async consumeChallenge(challenge: string, purpose: 'registration' | 'authentication'): Promise<PasskeyChallenge | null> {
    const { data, error } = await this.supabase.db.rpc('auth_consume_passkey_challenge', {
      p_challenge: challenge, p_purpose: purpose,
    });
    if (error) throw new UnauthorizedException('Unable to verify passkey challenge');
    return (data as PasskeyChallenge | null) ?? null;
  }

  async listForUser(userId: string): Promise<PasskeyCredential[]> {
    const { data, error } = await this.supabase.db.from('auth_passkey_credentials')
      .select('id,user_id,credential_id,public_key,counter,transports,friendly_name,created_at,last_used_at')
      .eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new UnauthorizedException('Unable to load passkeys');
    return (data ?? []) as PasskeyCredential[];
  }

  async findByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    const { data, error } = await this.supabase.db.from('auth_passkey_credentials')
      .select('id,user_id,credential_id,public_key,counter,transports,friendly_name,created_at,last_used_at')
      .eq('credential_id', credentialId).maybeSingle();
    if (error) throw new UnauthorizedException('Unable to load passkey');
    return (data as PasskeyCredential | null) ?? null;
  }

  async createCredential(input: Omit<PasskeyCredential, 'id' | 'created_at' | 'last_used_at'>) {
    const { data, error } = await this.supabase.db.from('auth_passkey_credentials').insert({
      user_id: input.user_id, credential_id: input.credential_id, public_key: input.public_key,
      counter: input.counter, transports: input.transports ?? [], friendly_name: input.friendly_name,
    }).select('id,user_id,credential_id,public_key,counter,transports,friendly_name,created_at,last_used_at').single();
    if (error) throw new UnauthorizedException('Unable to save passkey');
    return data as PasskeyCredential;
  }

  async updateCredential(id: string, expectedCounter: number, counter: number, transports?: string[]) {
    const updates: Record<string, unknown> = { counter, last_used_at: new Date().toISOString() };
    if (transports) updates.transports = transports;
    const { data, error } = await this.supabase.db.from('auth_passkey_credentials').update(updates)
      .eq('id', id).eq('counter', expectedCounter).select('id').maybeSingle();
    if (error) throw new UnauthorizedException('Unable to update passkey');
    if (!data) throw new UnauthorizedException('Passkey counter changed concurrently');
  }

  async rename(userId: string, id: string, friendlyName: string) {
    const { data, error } = await this.supabase.db.from('auth_passkey_credentials')
      .update({ friendly_name: friendlyName.trim().slice(0, 80) }).eq('id', id).eq('user_id', userId)
      .select('id').maybeSingle();
    if (error) throw new UnauthorizedException('Unable to rename passkey');
    if (!data) throw new UnauthorizedException('Passkey not found');
    return { ok: true };
  }

  async remove(userId: string, id: string) {
    const { data, error } = await this.supabase.db.from('auth_passkey_credentials')
      .delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle();
    if (error) throw new UnauthorizedException('Unable to remove passkey');
    if (!data) throw new UnauthorizedException('Passkey not found');
    return { ok: true };
  }
}
