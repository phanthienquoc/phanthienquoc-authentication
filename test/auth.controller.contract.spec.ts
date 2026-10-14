import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

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

  it('keeps refresh endpoint dependent on the refresh cookie', () => {
    const response = { cookie: jest.fn() } as any;

    expect(() => (controller as any).refresh(undefined, undefined, undefined, response)).toThrow(
      new UnauthorizedException('Refresh token required'),
    );
  });
});

describe('AuthService refresh cookie contract', () => {
  const originalEnv = process.env;
  const service = Object.create(AuthService.prototype) as AuthService;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_REFRESH_TTL_SECONDS: '2592000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sets the current HttpOnly, secure, same-site refresh cookie contract', () => {
    const response = { cookie: jest.fn() } as any;

    (service as any).setRefreshCookie(response, 'test-only-refresh-token');

    expect(response.cookie).toHaveBeenCalledWith('tce_refresh_token', 'test-only-refresh-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 2592000 * 1000,
    });
  });

  it('clears the refresh cookie with the same path/options', () => {
    const response = { cookie: jest.fn() } as any;

    service.clearRefreshCookie(response);

    expect(response.cookie).toHaveBeenCalledWith('tce_refresh_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 0,
    });
  });

  it('does not mark the refresh cookie secure in development', () => {
    process.env.NODE_ENV = 'development';
    const response = { cookie: jest.fn() } as any;

    (service as any).setRefreshCookie(response, 'test-only-refresh-token');

    expect(response.cookie).toHaveBeenCalledWith('tce_refresh_token', 'test-only-refresh-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 2592000 * 1000,
    });
  });
});
