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

export interface AdminRequest extends Request {
  adminPrincipal?: { id: string; role: 'ADMIN' };
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly supabase: SupabaseClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const match = request.headers.authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) throw new UnauthorizedException('Bearer access token required');

    const claims = this.jwt.verify(match[1]);
    let data: { id: string; role: string } | null = null;
    let error: unknown = null;
    try {
      const result = await this.supabase.db
        .from('users')
        .select('id,role')
        .eq('id', claims.sub)
        .maybeSingle<{ id: string; role: string }>();
      data = result.data;
      error = result.error;
    } catch {
      // Do not leak transport/client details from an authorization dependency.
      throw new ServiceUnavailableException('Unable to verify administrator access');
    }

    if (error) throw new ServiceUnavailableException('Unable to verify administrator access');
    if (!data || data.role !== 'ADMIN') throw new ForbiddenException('Administrator access required');

    request.adminPrincipal = { id: data.id, role: 'ADMIN' };
    return true;
  }
}
