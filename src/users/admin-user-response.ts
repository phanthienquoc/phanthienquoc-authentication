import type { AuthUser } from '../auth/auth.repository';

export type AdminUserResponse = Pick<AuthUser, 'id' | 'email' | 'role' | 'mfaEnabled'>;

export function toAdminUserResponse(user: AuthUser): AdminUserResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
  };
}
