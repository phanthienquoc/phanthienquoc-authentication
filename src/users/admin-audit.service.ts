import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseClientService } from '../db/supabase.client';

export type AdminAuditAction =
  | 'USER_ROLE_CHANGED'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  | 'USER_SESSIONS_REVOKED'
  | 'ADMIN_ACCESS_DENIED'
  | 'ADMIN_MUTATION_FAILED';

export type AdminAuditOutcome = 'SUCCESS' | 'DENIED' | 'FAILED';
export type AdminAuditRole = 'USER' | 'ADMIN';
export type AdminAuditStatus = 'ACTIVE' | 'SUSPENDED';
export type AdminAuditReasonCode =
  | 'ADMIN_REQUEST'
  | 'SECURITY_REVIEW'
  | 'COMPROMISED_ACCOUNT'
  | 'POLICY_VIOLATION'
  | 'OTHER';

export interface AdminAuditEventInput {
  actorUserId: string | null;
  targetUserId: string | null;
  action: AdminAuditAction;
  outcome: AdminAuditOutcome;
  beforeRole?: AdminAuditRole | null;
  afterRole?: AdminAuditRole | null;
  beforeStatus?: AdminAuditStatus | null;
  afterStatus?: AdminAuditStatus | null;
  reasonCode?: AdminAuditReasonCode | null;
  requestId?: string | null;
}

/**
 * Writes allowlisted metadata only. Do not add free-form payloads, credentials,
 * token/hash values, MFA/recovery data, passkey material, or Keycloak identities.
 * Callers must authorize the actor before recording a successful admin action.
 */
@Injectable()
export class AdminAuditService {
  constructor(private readonly supabase: SupabaseClientService) {}

  async record(event: AdminAuditEventInput): Promise<{ id: string }> {
    let data: unknown;
    let error: unknown;

    try {
      const result = await this.supabase.db.rpc('auth_record_admin_audit_event', {
        p_actor_user_id: event.actorUserId,
        p_target_user_id: event.targetUserId,
        p_action: event.action,
        p_outcome: event.outcome,
        p_before_role: event.beforeRole ?? null,
        p_after_role: event.afterRole ?? null,
        p_before_status: event.beforeStatus ?? null,
        p_after_status: event.afterStatus ?? null,
        p_reason_code: event.reasonCode ?? null,
        p_request_id: event.requestId ?? null,
      });
      data = result.data;
      error = result.error;
    } catch {
      throw new ServiceUnavailableException('Unable to persist administrative audit event');
    }

    if (error || typeof data !== 'string' || data.length === 0) {
      throw new ServiceUnavailableException('Unable to persist administrative audit event');
    }

    return { id: data };
  }
}
