import { ServiceUnavailableException } from '@nestjs/common';
import { AdminAuditService } from '../src/users/admin-audit.service';
import { SupabaseClientService } from '../src/db/supabase.client';

describe('AdminAuditService', () => {
  it('writes only allowlisted audit metadata through the server-side RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'audit-event-id', error: null });
    const supabase = { db: { rpc } } as unknown as SupabaseClientService;
    const service = new AdminAuditService(supabase);

    const event = {
      actorUserId: 'actor-id',
      targetUserId: 'target-id',
      action: 'USER_ROLE_CHANGED' as const,
      outcome: 'SUCCESS' as const,
      beforeRole: 'USER' as const,
      afterRole: 'ADMIN' as const,
      reasonCode: 'SECURITY_REVIEW' as const,
      requestId: 'req-123',
      passwordHash: 'must-not-be-persisted',
      accessToken: 'must-not-be-persisted',
      mfaSecret: 'must-not-be-persisted',
      recoveryCode: 'must-not-be-persisted',
      passkeyPublicKey: 'must-not-be-persisted',
    } as any;

    await expect(service.record(event)).resolves.toEqual({ id: 'audit-event-id' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('auth_record_admin_audit_event', {
      p_actor_user_id: 'actor-id',
      p_target_user_id: 'target-id',
      p_action: 'USER_ROLE_CHANGED',
      p_outcome: 'SUCCESS',
      p_before_role: 'USER',
      p_after_role: 'ADMIN',
      p_before_status: null,
      p_after_status: null,
      p_reason_code: 'SECURITY_REVIEW',
      p_request_id: 'req-123',
    });
    const serialized = JSON.stringify(rpc.mock.calls[0]);
    expect(serialized).not.toContain('must-not-be-persisted');
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('accessToken');
    expect(serialized).not.toContain('mfaSecret');
    expect(serialized).not.toContain('recoveryCode');
    expect(serialized).not.toContain('passkeyPublicKey');
  });

  it('normalizes RPC errors without leaking database details', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'sensitive database implementation detail' },
    });
    const service = new AdminAuditService({
      db: { rpc },
    } as unknown as SupabaseClientService);

    await expect(service.record({
      actorUserId: 'actor-id',
      targetUserId: 'target-id',
      action: 'ADMIN_MUTATION_FAILED',
      outcome: 'FAILED',
      requestId: 'req-456',
    })).rejects.toThrow('Unable to persist administrative audit event');
  });

  it('normalizes thrown transport failures', async () => {
    const rpc = jest.fn().mockRejectedValue(new Error('private transport detail'));
    const service = new AdminAuditService({
      db: { rpc },
    } as unknown as SupabaseClientService);

    await expect(service.record({
      actorUserId: null,
      targetUserId: null,
      action: 'ADMIN_ACCESS_DENIED',
      outcome: 'DENIED',
      requestId: 'req-789',
    })).rejects.toThrow('Unable to persist administrative audit event');
  });
});
