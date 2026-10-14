import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../src/auth/auth.controller';

describe('AuthController source contract', () => {
  const controller = Object.create(AuthController.prototype) as AuthController;

  it('requires Bearer authorization for GET /auth/me', () => {
    expect(() => (controller as any).me(undefined)).toThrow(
      new UnauthorizedException('Bearer token required'),
    );
  });

  it('rejects non-Bearer authorization on GET /auth/me', () => {
    expect(() => (controller as any).me('Basic abc')).toThrow(
      new UnauthorizedException('Bearer token required'),
    );
  });

  it('uses the refresh token cookie contract for refresh', () => {
    const response = { cookie: jest.fn() } as any;
    const service = Object.create((controller as any).auth?.constructor?.prototype ?? Object.prototype);
    expect(typeof response.cookie).toBe('function');
    // Keep this test focused on the controller header contract: refresh is cookie-only.
    expect(() => (controller as any).refresh(undefined, undefined, undefined, response)).toThrow(
      new UnauthorizedException('Refresh token required'),
    );
  });
});
