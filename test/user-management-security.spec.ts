import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthRepository, AuthUser } from '../src/auth/auth.repository';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '../src/auth/jwt.service';
import { PasswordService } from '../src/auth/password.service';
import { SignupDto } from '../src/auth/dto/signup.dto';
import { SupabaseClientService } from '../src/db/supabase.client';
import { UsersManagementService } from '../src/users/users-management.service';
import { ListUsersDto } from '../src/users/dto/list-users.dto';

describe('User-management security contracts', () => {
  const legacyUser: AuthUser = {
    id: 'user-1',
    email: 'person@example.com',
    passwordHash: 'password-hash-must-not-escape',
    role: 'ADMIN',
    mfaEnabled: true,
    mfaSecretEncrypted: 'encrypted-mfa-secret-must-not-escape',
  };

  it('returns only allowlisted account fields from the admin detail endpoint', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: legacyUser.id,
        email: legacyUser.email,
        role: legacyUser.role,
        mfa_enabled: legacyUser.mfaEnabled,
        password_hash: legacyUser.passwordHash,
        mfa_secret_encrypted: legacyUser.mfaSecretEncrypted,
      },
      error: null,
    });
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
    };
    const supabase = {
      db: { from: jest.fn().mockReturnValue(query) },
    } as unknown as SupabaseClientService;
    const service = new UsersManagementService(supabase);

    await expect(service.getById(legacyUser.id)).resolves.toEqual({
      user: {
        id: legacyUser.id,
        email: legacyUser.email,
        role: legacyUser.role,
        mfaEnabled: true,
      },
    });
    expect(query.select).toHaveBeenCalledWith('id,email,role,mfa_enabled');
  });

  it('returns only allowlisted fields from the paginated admin list', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      returns: jest.fn().mockResolvedValue({
        data: [{
          id: 'user-2',
          email: 'person@example.com',
          role: 'USER',
          mfa_enabled: true,
          password_hash: 'must-not-escape',
          mfa_secret_encrypted: 'must-not-escape',
        }],
        error: null,
        count: 1,
      }),
    };
    const supabase = {
      db: { from: jest.fn().mockReturnValue(query) },
    } as unknown as SupabaseClientService;
    const service = new UsersManagementService(supabase);

    await expect(service.list({
      query: 'person',
      role: 'USER',
      page: 2,
      limit: 50,
    } as ListUsersDto)).resolves.toEqual({
      items: [{
        id: 'user-2',
        email: 'person@example.com',
        role: 'USER',
        mfaEnabled: true,
      }],
      page: 2,
      limit: 50,
      total: 1,
      totalPages: 1,
    });

    expect(supabase.db.from).toHaveBeenCalledWith('users');
    expect(query.select).toHaveBeenCalledWith('id,email,role,mfa_enabled', { count: 'exact' });
    expect(query.order).toHaveBeenCalledWith('email', { ascending: true });
    expect(query.range).toHaveBeenCalledWith(50, 99);
    expect(query.eq).toHaveBeenCalledWith('role', 'USER');
    expect(query.ilike).toHaveBeenCalledWith('email', '%person%');
  });

  it('rejects admin directory page sizes above the configured maximum', async () => {
    const input = plainToInstance(ListUsersDto, { page: 1, limit: 101 });
    const errors = await validate(input);
    expect(errors.map((error) => error.property)).toContain('limit');
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
