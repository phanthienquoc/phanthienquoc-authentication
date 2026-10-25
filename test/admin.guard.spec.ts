import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser } from '../src/auth/auth.repository';
import { AuthRepository } from '../src/auth/auth.repository';
import { JwtService } from '../src/auth/jwt.service';
import { AdminGuard } from '../src/users/admin.guard';

describe('AdminGuard', () => {
  let verify: jest.Mock;
  let findById: jest.Mock;
  let guard: AdminGuard;

  const admin: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    passwordHash: 'never-return-this',
    role: 'ADMIN',
    mfaEnabled: true,
    mfaSecretEncrypted: 'never-return-this-either',
  };

  const context = (authorization?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authorization ? { authorization } : {},
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    verify = jest.fn();
    findById = jest.fn();
    guard = new AdminGuard(
      { verify } as unknown as JwtService,
      { findById } as unknown as AuthRepository,
    );
  });

  it('denies requests without a bearer token', async () => {
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it('denies non-bearer authorization schemes', async () => {
    await expect(guard.canActivate(context('Basic abc'))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('denies USER claims before looking up the account', async () => {
    verify.mockReturnValue({ sub: 'user-1', role: 'USER' });

    await expect(guard.canActivate(context('Bearer signed-token'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(findById).not.toHaveBeenCalled();
  });

  it('denies an ADMIN token if the current account no longer has ADMIN role', async () => {
    verify.mockReturnValue({ sub: 'admin-1', role: 'ADMIN' });
    findById.mockResolvedValue({ ...admin, role: 'USER' });

    await expect(guard.canActivate(context('Bearer signed-token'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies tokens whose account no longer exists', async () => {
    verify.mockReturnValue({ sub: 'deleted-user', role: 'ADMIN' });
    findById.mockResolvedValue(null);

    await expect(guard.canActivate(context('Bearer signed-token'))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows only a signed ADMIN claim backed by a current ADMIN account', async () => {
    verify.mockReturnValue({ sub: admin.id, role: 'ADMIN' });
    findById.mockResolvedValue(admin);

    await expect(guard.canActivate(context('Bearer signed-token'))).resolves.toBe(true);
    expect(findById).toHaveBeenCalledWith(admin.id);
  });

  it('fails closed when the account lookup is unavailable', async () => {
    verify.mockReturnValue({ sub: admin.id, role: 'ADMIN' });
    findById.mockRejectedValue(new ServiceUnavailableException('Authentication persistence unavailable'));

    await expect(guard.canActivate(context('Bearer signed-token'))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
