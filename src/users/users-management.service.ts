import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseClientService } from '../db/supabase.client';
import type { AdminAuditReasonCode } from './dto/admin-action.dto';
import { ListUsersDto } from './dto/list-users.dto';

type ManagedUserRow = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  mfa_enabled: boolean;
};

type LifecycleRole = 'USER' | 'ADMIN';
type LifecycleStatus = 'ACTIVE' | 'SUSPENDED';
type LifecycleUserRow = {
  id?: unknown;
  email?: unknown;
  role?: unknown;
  status?: unknown;
  mfa_enabled?: unknown;
};
type LifecycleRpcResponse = {
  status: string;
  user?: unknown;
  revoked_sessions?: unknown;
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

  async updateRole(input: {
    actorUserId: string;
    targetUserId: string;
    role: LifecycleRole;
    reasonCode: AdminAuditReasonCode;
    requestId?: string;
  }) {
    const result = await this.lifecycleRpc('auth_admin_update_user_role', {
      p_actor_user_id: input.actorUserId,
      p_target_user_id: input.targetUserId,
      p_new_role: input.role,
      p_reason_code: input.reasonCode,
      p_request_id: this.safeRequestId(input.requestId),
    });
    this.assertMutationOutcome(result.status);
    return { result: result.status, user: this.lifecycleUser(result.user) };
  }

  async updateStatus(input: {
    actorUserId: string;
    targetUserId: string;
    status: LifecycleStatus;
    reasonCode: AdminAuditReasonCode;
    requestId?: string;
  }) {
    const result = await this.lifecycleRpc('auth_admin_update_user_status', {
      p_actor_user_id: input.actorUserId,
      p_target_user_id: input.targetUserId,
      p_new_status: input.status,
      p_reason_code: input.reasonCode,
      p_request_id: this.safeRequestId(input.requestId),
    });
    this.assertMutationOutcome(result.status);
    return {
      result: result.status,
      user: this.lifecycleUser(result.user),
      revokedSessions: this.revokedCount(result.revoked_sessions),
    };
  }

  async revokeSessions(input: {
    actorUserId: string;
    targetUserId: string;
    reasonCode: AdminAuditReasonCode;
    requestId?: string;
  }) {
    const result = await this.lifecycleRpc('auth_admin_revoke_user_sessions', {
      p_actor_user_id: input.actorUserId,
      p_target_user_id: input.targetUserId,
      p_reason_code: input.reasonCode,
      p_request_id: this.safeRequestId(input.requestId),
    });
    if (result.status !== 'revoked') this.throwMutationError(result.status);
    return {
      result: 'revoked' as const,
      user: this.lifecycleIdentity(result.user),
      revokedSessions: this.revokedCount(result.revoked_sessions),
    };
  }

  private async lifecycleRpc(name: string, args: Record<string, unknown>): Promise<LifecycleRpcResponse> {
    let data: unknown;
    let error: unknown;
    try {
      const result = await this.supabase.db.rpc(name, args);
      data = result.data;
      error = result.error;
    } catch {
      throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }

    if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
      throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }
    const response = data as Record<string, unknown>;
    if (typeof response.status !== 'string') {
      throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }
    return response as LifecycleRpcResponse;
  }

  private assertMutationOutcome(status: string): void {
    if (status === 'updated' || status === 'no_change') return;
    this.throwMutationError(status);
  }

  private throwMutationError(status: string): never {
    switch (status) {
      case 'denied':
        throw new ForbiddenException('Administrator action denied');
      case 'self_change':
        throw new ForbiddenException('Self role/status changes are not allowed');
      case 'last_admin':
        throw new ConflictException('Cannot remove or suspend the last active administrator');
      case 'not_found':
        throw new NotFoundException('User not found');
      case 'invalid_role':
        throw new BadRequestException('Invalid role');
      case 'invalid_status':
        throw new BadRequestException('Invalid status');
      default:
        throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }
  }

  private lifecycleUser(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }
    const row = value as LifecycleUserRow;
    if (
      typeof row.id !== 'string' ||
      typeof row.email !== 'string' ||
      (row.role !== 'USER' && row.role !== 'ADMIN') ||
      (row.status !== 'ACTIVE' && row.status !== 'SUSPENDED') ||
      typeof row.mfa_enabled !== 'boolean'
    ) {
      throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status,
      mfaEnabled: row.mfa_enabled,
    };
  }

  private lifecycleIdentity(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }
    const row = value as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.email !== 'string') {
      throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }
    return { id: row.id, email: row.email };
  }

  private revokedCount(value: unknown): number {
    const count = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(count) || count < 0) {
      throw new ServiceUnavailableException('Unable to process user lifecycle action');
    }
    return count;
  }

  private safeRequestId(value?: string): string | null {
    if (!value || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) return null;
    return value;
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
