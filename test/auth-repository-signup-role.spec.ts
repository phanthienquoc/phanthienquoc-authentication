import { AuthRepository } from '../src/auth/auth.repository';
import { SupabaseClientService } from '../src/db/supabase.client';

describe('AuthRepository signup role invariant', () => {
  it('always persists USER even when an untyped caller supplies ADMIN', async () => {
    const row = {
      id: 'synthetic-user-id',
      email: 'person@example.test',
      password_hash: 'synthetic-password-hash',
      role: 'USER',
      status: 'ACTIVE',
      mfa_enabled: false,
      mfa_secret_encrypted: null,
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const from = jest.fn().mockReturnValue({ insert });
    const repository = new AuthRepository({
      db: { from },
    } as unknown as SupabaseClientService);

    const input = {
      email: '  Person@Example.test ',
      passwordHash: 'synthetic-password-hash',
      role: 'ADMIN',
    } as unknown as Parameters<AuthRepository['createUser']>[0];

    const user = await repository.createUser(input);

    expect(from).toHaveBeenCalledWith('users');
    expect(insert).toHaveBeenCalledWith({
      email: 'person@example.test',
      password_hash: 'synthetic-password-hash',
      role: 'USER',
      mfa_enabled: false,
    });
    expect(user).toMatchObject({
      email: 'person@example.test',
      role: 'USER',
      status: 'ACTIVE',
    });
  });
});
