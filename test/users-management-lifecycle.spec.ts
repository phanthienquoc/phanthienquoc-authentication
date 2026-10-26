import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SupabaseClientService } from '../src/db/supabase.client';
import { RevokeUserSessionsDto } from '../src/users/dto/revoke-user-sessions.dto';
import { UpdateUserRoleDto } from '../src/users/dto/update-user-role.dto';
import { UpdateUserStatusDto } from '../src/users/dto/update-user-status.dto';
import { UsersManagementService } from '../src/users/users-management.service';

const safeUser = {
  id: 'target-id',
  email: 'target@example.com',
  role: 'ADMIN',
  status: 'ACTIVE',
  mfa_enabled: true,
  password_hash: 'password-hash-must-not-escape',
  mfa_secret_encrypted: 'mfa-secret-must-not-escape',
  access_token: 'token-must-not-escape',
  recovery_code: 'recovery-code-must-not-escape',
  passkey_public_key: 'passkey-material-must-not-escape',
};

function makeService(data: unknown, error: unknown = null) {
  const rpc = jest.fn().mockResolvedValue({ data, error });
  const from = jest.fn();
  const service = new UsersManagementService({
    db: { rpc, from },
  } as unknown as SupabaseClientService);
  return { service, rpc, from };
}

describe('UsersManagementService lifecycle mutations', () => {
  it('uses the server-only role RPC and returns only allowlisted fields', async () => {
    const { service, rpc, from } = makeService({ status: 'updated', user: safeUser });
    const result = await service.updateRole({
      actorUserId: 'actor-id',
      targetUserId: 'target-id',
      role: 'ADMIN',
      reasonCode: 'SECURITY_REVIEW',
      requestId: 'request-123',
    });

    expect(result).toEqual({
      result: 'updated',
      user: {
        id: 'target-id',
        email: 'target@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        mfaEnabled: true,
      },
    });
    expect(rpc).toHaveBeenCalledWith('auth_admin_update_user_role', {
      p_actor_user_id: 'actor-id',
      p_target_user_id: 'target-id',
      p_new_role: 'ADMIN',
      p_reason_code: 'SECURITY_REVIEW',
      p_request_id: 'request-123',
    });
    expect(from).not.toHaveBeenCalled();
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('password-hash-must-not-escape');
    expect(serialized).not.toContain('mfa-secret-must-not-escape');
    expect(serialized).not.toContain('token-must-not-escape');
    expect(serialized).not.toContain('recovery-code-must-not-escape');
    expect(serialized).not.toContain('passkey-material-must-not-escape');
  });

  it('suspends accounts and revokes sessions through one RPC', async () => {
    const { service, rpc, from } = makeService({
      status: 'updated',
      user: { ...safeUser, status: 'SUSPENDED' },
      revoked_sessions: 3,
    });
    await expect(service.updateStatus({
      actorUserId: 'actor-id',
      targetUserId: 'target-id',
      status: 'SUSPENDED',
      reasonCode: 'COMPROMISED_ACCOUNT',
    })).resolves.toEqual({
      result: 'updated',
      user: {
        id: 'target-id',
        email: 'target@example.com',
        role: 'ADMIN',
        status: 'SUSPENDED',
        mfaEnabled: true,
      },
      revokedSessions: 3,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('auth_admin_update_user_status');
    expect(from).not.toHaveBeenCalled();
  });

  it('maps last-active-admin protection to a conflict', async () => {
    const { service } = makeService({ status: 'last_admin' });
    await expect(service.updateStatus({
      actorUserId: 'actor-id',
      targetUserId: 'target-id',
      status: 'SUSPENDED',
      reasonCode: 'POLICY_VIOLATION',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('denies self-role changes', async () => {
    const { service } = makeService({ status: 'self_change' });
    await expect(service.updateRole({
      actorUserId: 'actor-id',
      targetUserId: 'actor-id',
      role: 'ADMIN',
      reasonCode: 'POLICY_VIOLATION',
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes sessions through the atomic RPC and returns only identity/count', async () => {
    const { service, rpc, from } = makeService({
      status: 'revoked',
      user: { id: 'target-id', email: 'target@example.com', password_hash: 'must-not-escape' },
      revoked_sessions: 2,
    });
    await expect(service.revokeSessions({
      actorUserId: 'actor-id',
      targetUserId: 'target-id',
      reasonCode: 'ADMIN_REQUEST',
    })).resolves.toEqual({
      result: 'revoked',
      user: { id: 'target-id', email: 'target@example.com' },
      revokedSessions: 2,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('auth_admin_revoke_user_sessions');
    expect(from).not.toHaveBeenCalled();
  });

  it('normalizes RPC errors without leaking dependency details', async () => {
    const { service } = makeService(null, { message: 'sensitive SQL details' });
    await expect(service.revokeSessions({
      actorUserId: 'actor-id',
      targetUserId: 'target-id',
      reasonCode: 'OTHER',
    })).rejects.toThrow('Unable to process user lifecycle action');
  });
});

describe('User lifecycle DTO validation', () => {
  it('rejects invalid role/status values and missing or invalid audit reason codes', async () => {
    const invalidRole = plainToInstance(UpdateUserRoleDto, { role: 'OWNER', reasonCode: 'OTHER' });
    const invalidStatus = plainToInstance(UpdateUserStatusDto, { status: 'DELETED', reasonCode: 'OTHER' });
    const missingReason = plainToInstance(RevokeUserSessionsDto, {});
    const invalidReason = plainToInstance(UpdateUserStatusDto, { status: 'SUSPENDED', reasonCode: 'SECRET' });

    expect((await validate(invalidRole)).map(error => error.property)).toContain('role');
    expect((await validate(invalidStatus)).map(error => error.property)).toContain('status');
    expect((await validate(missingReason)).map(error => error.property)).toContain('reasonCode');
    expect((await validate(invalidReason)).map(error => error.property)).toContain('reasonCode');
  });
});
