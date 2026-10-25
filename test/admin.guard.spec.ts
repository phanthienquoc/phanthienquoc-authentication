import { ExecutionContext, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from '../src/users/admin.guard';
import { JwtService } from '../src/auth/jwt.service';
import { SupabaseClientService } from '../src/db/supabase.client';

function contextFor(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization ? { authorization } : {} }),
    }),
  } as unknown as ExecutionContext;
}

function createGuard(role: string | null, error: unknown = null) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: role ? { id: 'admin-user-id', role } : null,
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
  return { guard: new AdminGuard(jwt, supabase), jwt, maybeSingle };
}

describe('AdminGuard', () => {
  it('rejects requests without a bearer token', async () => {
    const { guard, jwt } = createGuard('ADMIN');
    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('uses the current database role instead of trusting the token role', async () => {
    const { guard } = createGuard('USER');
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a caller whose current database role is ADMIN', async () => {
    const { guard } = createGuard('ADMIN');
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).resolves.toBe(true);
  });

  it('rejects a token whose subject no longer exists', async () => {
    const { guard } = createGuard(null);
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed when the current-role lookup returns a persistence error', async () => {
    const { guard } = createGuard('ADMIN', new Error('database unavailable'));
    await expect(guard.canActivate(contextFor('Bearer signed-token'))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('normalizes thrown role-lookup failures without leaking dependency details', async () => {
    const { guard, maybeSingle } = createGuard('ADMIN');
    maybeSingle.mockRejectedValue(new Error('internal connection detail'));

    try {
      await guard.canActivate(contextFor('Bearer signed-token'));
      fail('expected authorization lookup to fail closed');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as Error).message).toContain('Unable to verify administrator access');
      expect((error as Error).message).not.toContain('internal connection detail');
    }
  });
});
