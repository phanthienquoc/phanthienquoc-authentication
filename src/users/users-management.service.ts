import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseClientService } from '../db/supabase.client';
import { ListUsersDto } from './dto/list-users.dto';

type ManagedUserRow = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  mfa_enabled: boolean;
};

@Injectable()
export class UsersManagementService {
  constructor(private readonly supabase: SupabaseClientService) {}

  async list(input: ListUsersDto) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 25;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let data: ManagedUserRow[] | null = null;
    let error: unknown = null;
    let count: number | null = null;

    try {
      let query = this.supabase.db
        .from('users')
        .select('id,email,role,mfa_enabled', { count: 'exact' })
        .order('email', { ascending: true })
        .range(from, to);

      if (input.role) query = query.eq('role', input.role);
      if (input.query) query = query.ilike('email', `%${input.query}%`);

      const result = await query.returns<ManagedUserRow[]>();
      data = result.data;
      error = result.error;
      count = result.count;
    } catch {
      throw new ServiceUnavailableException('Unable to load user directory');
    }

    if (error) throw new ServiceUnavailableException('Unable to load user directory');

    return {
      items: (data ?? []).map((row) => this.publicUser(row)),
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  async getById(id: string) {
    let data: ManagedUserRow | null = null;
    let error: unknown = null;

    try {
      const result = await this.supabase.db
        .from('users')
        .select('id,email,role,mfa_enabled')
        .eq('id', id)
        .maybeSingle<ManagedUserRow>();
      data = result.data;
      error = result.error;
    } catch {
      throw new ServiceUnavailableException('Unable to load user details');
    }

    if (error) throw new ServiceUnavailableException('Unable to load user details');
    if (!data) return null;
    return { user: this.publicUser(data) };
  }

  private publicUser(row: ManagedUserRow) {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      mfaEnabled: row.mfa_enabled,
    };
  }
}
