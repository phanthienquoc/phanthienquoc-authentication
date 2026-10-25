import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthRepository, AuthUser } from '../src/auth/auth.repository';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '../src/auth/jwt.service';
import { PasswordService } from '../src/auth/password.service';
import { SignupDto } from '../src/auth/dto/signup.dto';
import { toAdminUserResponse } from '../src/users/admin-user-response';

describe('User-management security contracts', () => {
  const legacyUser: AuthUser = {
    id: 'user-1',
    email: 'person@example.com',
    passwordHash: 'password-hash-must-not-escape',
    role: 'ADMIN',
    mfaEnabled: true,
    mfaSecretEncrypted: 'encrypted-mfa-secret-must-not-escape',
  };

  it('projects only explicitly allowlisted user response fields', () => {
    const response = toAdminUserResponse(legacyUser);

    expect(response).toEqual({
      id: 'user-1',
      email: 'person@example.com',
      role: 'ADMIN',
      mfaEnabled: true,
    });
    expect(Object.keys(response).sort()).toEqual(['email', 'id', 'mfaEnabled', 'role']);
    expect(response).not.toHaveProperty('passwordHash');
    expect(response).not.toHaveProperty('mfaSecretEncrypted');
  });

  it('rejects caller-supplied role fields during signup DTO validation', async () => {
    const input = plainToInstance(SignupDto, {
      email: 'person@example.com',
      password: 'long-enough-password',
      role: 'ADMIN',
    });
    const errors = await validate(input, { whitelist: true, forbidNonWhitelisted: true });

    expect(errors.map((error) => error.property)).toContain('role');
  });

  it('always creates a USER account even if an untyped caller supplies ADMIN', async () => {
    const createUser = jest.fn().mockResolvedValue({ ...legacyUser, role: 'USER' });
    const hash = jest.fn().mockResolvedValue('test-password-hash');
    const service = new AuthService(
      { createUser } as unknown as AuthRepository,
      { hash } as unknown as PasswordService,
      {} as JwtService,
    );

    await service.signup({
      email: '  PERSON@example.com ',
      password: 'long-enough-password',
      role: 'ADMIN',
    } as SignupDto);

    expect(createUser).toHaveBeenCalledWith({
      email: 'person@example.com',
      passwordHash: 'test-password-hash',
      role: 'USER',
    });
  });
});
