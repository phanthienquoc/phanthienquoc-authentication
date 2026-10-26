import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AdminRequest } from './admin.guard';
import { AdminAuditService } from './admin-audit.service';

const MAX_RECENT_MFA_AGE_SECONDS = 300;

@Injectable()
export class RecentMfaGuard implements CanActivate {
  constructor(private readonly audit: AdminAuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest & Request>();
    const principal = request.adminPrincipal;
    const now = Math.floor(Date.now() / 1000);
    const verifiedAt = principal?.mfaVerifiedAt;
    const hasRecentMfa = principal?.mfaEnabled === true &&
      typeof verifiedAt === 'number' && Number.isSafeInteger(verifiedAt) &&
      verifiedAt >= 0 && verifiedAt <= now && now - verifiedAt <= MAX_RECENT_MFA_AGE_SECONDS;

    if (hasRecentMfa) return true;

    const requestIdHeader = request.headers['x-request-id'];
    const rawRequestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
    const requestId = rawRequestId && /^[A-Za-z0-9._:-]{1,128}$/.test(rawRequestId)
      ? rawRequestId
      : null;

    try {
      await this.audit.record({
        actorUserId: principal?.id ?? null,
        targetUserId: null,
        action: 'ADMIN_ACCESS_DENIED',
        outcome: 'DENIED',
        reasonCode: 'POLICY_VIOLATION',
        requestId,
      });
    } catch {
      throw new ServiceUnavailableException('Unable to persist administrative audit event');
    }

    throw new ForbiddenException('Recent MFA verification required');
  }
}
