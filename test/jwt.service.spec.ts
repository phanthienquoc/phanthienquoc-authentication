import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '../src/auth/jwt.service';

describe('JwtService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-only-secret-that-is-at-least-32-bytes',
      JWT_ISSUER: 'https://auth.example.test',
      JWT_AUDIENCE: 'tce-dashboard,media-generation',
      JWT_ACCESS_TTL_SECONDS: '900',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('issues claims compatible with configured issuer and audience', () => {
    const service = new JwtService();
    const token = service.issue('user-123', 'USER');
    const claims = service.verify(token);

    expect(claims.sub).toBe('user-123');
    expect(claims.role).toBe('USER');
    expect(claims.typ).toBe('access');
    expect(claims.iss).toBe('https://auth.example.test');
    expect(claims.aud).toEqual(['tce-dashboard', 'media-generation']);
    expect(claims.exp).toBeGreaterThan(claims.iat);
    expect(claims.jti).toBeTruthy();
  });

  it('rejects a token signed with another secret', () => {
    const service = new JwtService();
    const token = service.issue('user-123', 'USER');
    process.env.JWT_SECRET = 'different-test-secret-that-is-also-32-bytes';

    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects a token for another issuer', () => {
    const service = new JwtService();
    const token = service.issue('user-123', 'USER');
    process.env.JWT_ISSUER = 'https://other.example.test';

    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects a token without a matching audience', () => {
    const service = new JwtService();
    const token = service.issue('user-123', 'USER');
    process.env.JWT_AUDIENCE = 'another-app';

    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    process.env.JWT_ACCESS_TTL_SECONDS = '-1';
    const service = new JwtService();
    const token = service.issue('user-123', 'USER');

    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects malformed and non-JWT input', () => {
    const service = new JwtService();

    expect(() => service.verify('not-a-jwt')).toThrow(UnauthorizedException);
    expect(() => service.verify('a.b.c.d')).toThrow(UnauthorizedException);
  });
});
