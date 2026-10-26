import { ExecutionContext, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { RecentMfaGuard } from '../src/users/recent-mfa.guard';
import { AdminAuditService } from '../src/users/admin-audit.service';
import type { AdminRequest } from '../src/users/admin.guard';

function contextFor(
  principal?: AdminRequest['adminPrincipal'],
  requestId?: string,
): ExecutionContext {
  const headers: Record<string, string> = {};
  if (requestId) headers['x-request-id'] = requestId;
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, adminPrincipal: principal }),
    }),
  } as unknown as ExecutionContext;
}

function createGuard() {
  const audit = { record: jest.fn().mockResolvedValue({ id: 'audit-event-id' }) } as unknown as AdminAuditService;
  return { guard: new RecentMfaGuard(audit), audit };
}

describe('RecentMfaGuard', () => {
  it('allows an active admin with database-enabled MFA verified within five minutes', async () => {
    const { guard, audit } = createGuard();
    const principal = {
      id: 'admin-user-id', role: 'ADMIN' as const, mfaEnabled: true,
      mfaVerifiedAt: Math.floor(Date.now() / 1000),
    };
    await expect(guard.canActivate(contextFor(principal))).resolves.toBe(true);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('denies and audits a missing or stale MFA assurance claim', async () => {
    const { guard, audit } = createGuard();
    const principal = {
      id: 'admin-user-id', role: 'ADMIN' as const, mfaEnabled: true,
      mfaVerifiedAt: Math.floor(Date.now() / 1000) - 301,
    };
    await expect(guard.canActivate(contextFor(principal, 'request-123')))
      .rejects.toThrow(new ForbiddenException('Recent MFA verification required'));
    expect(audit.record).toHaveBeenCalledWith({
      actorUserId: 'admin-user-id', targetUserId: null,
      action: 'ADMIN_ACCESS_DENIED', outcome: 'DENIED',
      reasonCode: 'POLICY_VIOLATION', requestId: 'request-123',
    });
    expect(JSON.stringify((audit.record as jest.Mock).mock.calls)).not.toContain('token');
  });

  it('denies disabled MFA, missing assurance, and future-dated assurance', async () => {
    const now = Math.floor(Date.now() / 1000);
    const cases = [
      { id: 'admin-user-id', role: 'ADMIN' as const, mfaEnabled: false, mfaVerifiedAt: now },
      { id: 'admin-user-id', role: 'ADMIN' as const, mfaEnabled: true, mfaVerifiedAt: undefined },
      { id: 'admin-user-id', role: 'ADMIN' as const, mfaEnabled: true, mfaVerifiedAt: now + 1 },
    ];
    for (const principal of cases) {
      const { guard, audit } = createGuard();
      await expect(guard.canActivate(contextFor(principal))).rejects.toBeInstanceOf(ForbiddenException);
      expect(audit.record).toHaveBeenCalledTimes(1);
    }
  });

  it('fails closed if the denial audit cannot be persisted', async () => {
    const { guard, audit } = createGuard();
    (audit.record as jest.Mock).mockRejectedValue(new Error('database detail must not escape'));
    await expect(guard.canActivate(contextFor({
      id: 'admin-user-id', role: 'ADMIN', mfaEnabled: true,
    }))).rejects.toThrow(new ServiceUnavailableException('Unable to persist administrative audit event'));
  });
});
