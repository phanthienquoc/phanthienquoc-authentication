import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from '../auth/jwt.service';
import { SupabaseClientService } from '../db/supabase.client';
import { AdminAuditService } from './admin-audit.service';

export interface AdminRequest extends Request {
  adminPrincipal?: { id: string; role: 'ADMIN' };
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly supabase: SupabaseClientService,
    private readonly audit: AdminAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const match = request.headers.authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) throw new UnauthorizedException('Bearer access token required');

    const claims = this.jwt.verify(match[1]);
    let data: { id: string; role: string; status: string } | null = null;
    let error: unknown = null;
    try {
      const result = await this.supabase.db
        .from('users')
        .select('id,role,status')
        .eq('id', claims.sub)
        .maybeSingle<{ id: string; role: string; status: string }>();
      data = result.data;
      error = result.error;
    } catch {
      throw new ServiceUnavailableException('Unable to verify administrator access');
    }

    if (error) throw new ServiceUnavailableException('Unable to verify administrator access');
    if (!data || data.role !== 'ADMIN' || data.status !== 'ACTIVE') {
      // Record only allowlisted metadata. Never persist the bearer token or user claims.
      const requestIdHeader = request.headers['x-request-id'];
      const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
      await this.audit.record({
        actorUserId: data?.id ?? null,
        targetUserId: null,
        action: 'ADMIN_ACCESS_DENIED',
        outcome: 'DENIED',
        reasonCode: 'POLICY_VIOLATION',
        requestId: requestId && /^[A-Za-z0-9._:-]{1,128}$/.test(requestId) ? requestId : null,
      });
      throw new ForbiddenException('Administrator access required');
    }

    request.adminPrincipal = { id: data.id, role: 'ADMIN' };
    return true;
  }
}
