import { ExecutionContext, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from '../src/users/admin.guard';
import { AdminAuditService } from '../src/users/admin-audit.service';
import { JwtService } from '../src/auth/jwt.service';
import { SupabaseClientService } from '../src/db/supabase.client';

function contextFor(authorization?: string, requestId?: string): ExecutionContext {
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  if (requestId) headers['x-request-id'] = requestId;
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function createGuard(
  role: string | null,
  error: unknown = null,
  status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE',
) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: role ? { id: 'admin-user-id', role, status } : null,
    error,
  });
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle,
  };
  const supabase = {
    db: { from: jest.fn().mockReturnValue(query) },
  } as unknown as SupabaseClientService;
  const jwt = { verify: jest.fn().mockReturnValue({ sub: 'admin-user-id', role: 'ADMIN' }) } as unknown as JwtService;
  const audit = { record: jest.fn().mockResolvedValue({ id: 'audit-event-id' }) } as unknown as AdminAuditService;
  return { guard: new AdminGuard(jwt, supabase, audit), jwt, maybeSingle, audit };
}

describe('AdminGuard', () => {
  it('rejects requests without a bearer token and does not audit an unverified identity', async () => {
    const { guard, jwt, audit } = createGuard('ADMIN');
    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('uses the current database role instead of trusting the token role and audits the denial', async () => {
    const { guard, audit } = createGuard('USER');
    await expect(guard.canActivate(contextFor('Bearer signed-token', 'request-123'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith({
      actorUserId: 'admin-user-id',
      targetUserId: null,
      action: 'ADMIN_ACCESS_DENIED',
      outcome: 'DENIED',
      reasonCode: 'POLICY_VIOLATION',
      requestId: 'request-123',
    });
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain('signed-token');
  });

  it('allows a caller whose current database role is ADMIN', async () => {
    const { guard, audit } = createGuard('ADMIN');
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).resolves.toBe(true);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects and audits a suspended database administrator even when the token role is ADMIN', async () => {
    const { guard, audit } = createGuard('ADMIN', null, 'SUSPENDED');
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'admin-user-id',
      action: 'ADMIN_ACCESS_DENIED',
      outcome: 'DENIED',
    }));
  });

  it('rejects a token whose subject no longer exists and audits with a null actor id', async () => {
    const { guard, audit } = createGuard(null);
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: null,
      targetUserId: null,
      action: 'ADMIN_ACCESS_DENIED',
      outcome: 'DENIED',
    }));
  });

  it('fails closed when audit persistence fails for a denied authenticated actor', async () => {
    const { guard, audit } = createGuard('USER');
    (audit.record as jest.Mock).mockRejectedValue(new ServiceUnavailableException('audit unavailable'));
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed when the current-role lookup returns a persistence error', async () => {
    const { guard, audit } = createGuard('ADMIN', new Error('database unavailable'));
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('normalizes thrown role-lookup failures without leaking dependency details', async () => {
    const { guard, maybeSingle, audit } = createGuard('ADMIN');
    maybeSingle.mockRejectedValue(new Error('internal connection detail'));
    try {
      await guard.canActivate(contextFor('Bearer signed-token'));
      fail('expected authorization lookup to fail closed');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as Error).message).toContain('Unable to verify administrator access');
      expect((error as Error).message).not.toContain('internal connection detail');
    }
    expect(audit.record).not.toHaveBeenCalled();
  });
});
