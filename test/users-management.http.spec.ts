import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '../src/auth/jwt.service';
import { SupabaseClientService } from '../src/db/supabase.client';
import { UsersManagementModule } from '../src/users/users-management.module';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = 'um4-http-test-123';

type HarnessOptions = {
  role?: 'USER' | 'ADMIN';
  status?: 'ACTIVE' | 'SUSPENDED';
  mfaEnabled?: boolean;
  mfaVerifiedAt?: number;
};

async function createHarness(options: HarnessOptions = {}) {
  const adminRow = {
    id: ADMIN_ID,
    role: options.role ?? 'ADMIN',
    status: options.status ?? 'ACTIVE',
    mfa_enabled: options.mfaEnabled ?? true,
  };
  const directoryRow = {
    id: TARGET_ID,
    email: 'target@example.com',
    role: 'USER',
    status: 'ACTIVE',
    mfa_enabled: false,
    password_hash: 'must-not-escape-password-hash',
    mfa_secret_encrypted: 'must-not-escape-mfa-secret',
    token_hash: 'must-not-escape-token-hash',
    recovery_code: 'must-not-escape-recovery-code',
    passkey_public_key: 'must-not-escape-passkey-material',
  };
  let selectedColumns = '';
  const userQuery: Record<string, any> = {};
  userQuery.select = jest.fn((columns: string) => {
    selectedColumns = columns;
    return userQuery;
  });
  userQuery.eq = jest.fn().mockReturnValue(userQuery);
  userQuery.order = jest.fn().mockReturnValue(userQuery);
  userQuery.range = jest.fn().mockReturnValue(userQuery);
  userQuery.ilike = jest.fn().mockReturnValue(userQuery);
  userQuery.maybeSingle = jest.fn().mockImplementation(async () => ({
    data: selectedColumns.includes('email') ? directoryRow : adminRow,
    error: null,
  }));
  userQuery.returns = jest.fn().mockResolvedValue({
    data: [directoryRow],
    error: null,
    count: 1,
  });
  const from = jest.fn().mockReturnValue(userQuery);
  const rpc = jest.fn(async (name: string) => {
    if (name === 'auth_admin_update_user_role') {
      return {
        data: {
          status: 'updated',
          user: {
            id: TARGET_ID,
            email: 'target@example.com',
            role: 'ADMIN',
            status: 'ACTIVE',
            mfa_enabled: false,
            password_hash: 'must-not-escape-password-hash',
          },
        },
        error: null,
      };
    }
    if (name === 'auth_admin_revoke_user_sessions') {
      return {
        data: {
          status: 'revoked',
          user: {
            id: TARGET_ID,
            email: 'target@example.com',
            password_hash: 'must-not-escape-password-hash',
            token_hash: 'must-not-escape-token-hash',
          },
          revoked_sessions: 2,
        },
        error: null,
      };
    }
    if (name === 'auth_admin_update_user_status') {
      return {
        data: {
          status: 'updated',
          user: {
            id: TARGET_ID,
            email: 'target@example.com',
            role: 'USER',
            status: 'SUSPENDED',
            mfa_enabled: false,
            password_hash: 'must-not-escape-password-hash',
            mfa_secret_encrypted: 'must-not-escape-mfa-secret',
            token_hash: 'must-not-escape-token-hash',
            recovery_code: 'must-not-escape-recovery-code',
            passkey_public_key: 'must-not-escape-passkey-material',
          },
          revoked_sessions: 2,
        },
        error: null,
      };
    }
    if (name === 'auth_record_admin_audit_event') {
      return { data: 'audit-event-id', error: null };
    }
    return { data: null, error: { message: 'Unexpected RPC in HTTP contract test' } };
  });

  const supabase = {
    db: { from, rpc },
  } as unknown as SupabaseClientService;
  const now = Math.floor(Date.now() / 1000);
  const jwt = {
    verify: jest.fn().mockReturnValue({
      sub: ADMIN_ID,
      mfa_verified_at: options.mfaVerifiedAt ?? now,
    }),
  } as unknown as JwtService;

  const testingModule = await Test.createTestingModule({
    imports: [UsersManagementModule],
  })
    .overrideProvider(SupabaseClientService)
    .useValue(supabase)
    .overrideProvider(JwtService)
    .useValue(jwt)
    .compile();

  const app = testingModule.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }));
  await app.listen(0, '127.0.0.1');

  const address = app.getHttpServer().address() as { port?: number } | null;
  if (!address || typeof address.port !== 'number') {
    await app.close();
    throw new Error('HTTP test server did not bind an ephemeral port');
  }

  return {
    app,
    url: `http://127.0.0.1:${address.port}`,
    from,
    rpc,
  };
}

async function patchStatus(
  url: string,
  headers: Record<string, string> = {},
  body: Record<string, unknown> = {
    status: 'SUSPENDED',
    reasonCode: 'COMPROMISED_ACCOUNT',
  },
) {
  return fetch(`${url}/api/admin/users/${TARGET_ID}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('Admin user lifecycle HTTP contract', () => {
  it('rejects missing bearer credentials before querying the user store or invoking an RPC', async () => {
    const harness = await createHarness();
    try {
      const response = await patchStatus(harness.url);
      expect(response.status).toBe(401);
      expect(harness.from).not.toHaveBeenCalled();
      expect(harness.rpc).not.toHaveBeenCalled();
    } finally {
      await harness.app.close();
    }
  });

  it('returns the guarded paginated user directory with an allowlisted response', async () => {
    const harness = await createHarness();
    try {
      const response = await fetch(`${harness.url}/api/admin/users`, {
        headers: { Authorization: 'Bearer synthetic-test-token' },
      });
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toEqual({
        items: [{
          id: TARGET_ID,
          email: 'target@example.com',
          role: 'USER',
          status: 'ACTIVE',
          mfaEnabled: false,
        }],
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      });
      expect(harness.from).toHaveBeenCalledTimes(2);
      expect(harness.rpc).not.toHaveBeenCalled();
      const serialized = JSON.stringify(payload);
      for (const secret of [
        'must-not-escape-password-hash',
        'must-not-escape-mfa-secret',
        'must-not-escape-token-hash',
        'must-not-escape-recovery-code',
        'must-not-escape-passkey-material',
      ]) {
        expect(serialized).not.toContain(secret);
      }
    } finally {
      await harness.app.close();
    }
  });

  it('returns protected user details with an allowlisted response', async () => {
    const harness = await createHarness();
    try {
      const response = await fetch(`${harness.url}/api/admin/users/${TARGET_ID}`, {
        headers: { Authorization: 'Bearer synthetic-test-token' },
      });
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toEqual({
        user: {
          id: TARGET_ID,
          email: 'target@example.com',
          role: 'USER',
          status: 'ACTIVE',
          mfaEnabled: false,
        },
      });
      expect(harness.from).toHaveBeenCalledTimes(2);
      expect(harness.rpc).not.toHaveBeenCalled();
      const serialized = JSON.stringify(payload);
      for (const secret of [
        'must-not-escape-password-hash',
        'must-not-escape-mfa-secret',
        'must-not-escape-token-hash',
        'must-not-escape-recovery-code',
        'must-not-escape-passkey-material',
      ]) {
        expect(serialized).not.toContain(secret);
      }
    } finally {
      await harness.app.close();
    }
  });

  it('runs the protected status route through current-admin and recent-MFA guards and returns an allowlist', async () => {
    const harness = await createHarness();
    try {
      const response = await patchStatus(harness.url, {
        Authorization: 'Bearer synthetic-test-token',
        'X-Request-Id': REQUEST_ID,
      });
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toEqual({
        result: 'updated',
        user: {
          id: TARGET_ID,
          email: 'target@example.com',
          role: 'USER',
          status: 'SUSPENDED',
          mfaEnabled: false,
        },
        revokedSessions: 2,
      });
      expect(harness.rpc).toHaveBeenCalledTimes(1);
      expect(harness.rpc).toHaveBeenCalledWith('auth_admin_update_user_status', {
        p_actor_user_id: ADMIN_ID,
        p_target_user_id: TARGET_ID,
        p_new_status: 'SUSPENDED',
        p_reason_code: 'COMPROMISED_ACCOUNT',
        p_request_id: REQUEST_ID,
      });
      const serialized = JSON.stringify(payload);
      for (const secret of [
        'must-not-escape-password-hash',
        'must-not-escape-mfa-secret',
        'must-not-escape-token-hash',
        'must-not-escape-recovery-code',
        'must-not-escape-passkey-material',
      ]) {
        expect(serialized).not.toContain(secret);
      }
    } finally {
      await harness.app.close();
    }
  });

  it('denies a non-admin at the HTTP boundary, audits only allowlisted metadata, and never calls the lifecycle RPC', async () => {
    const harness = await createHarness({ role: 'USER' });
    try {
      const response = await patchStatus(harness.url, {
        Authorization: 'Bearer synthetic-test-token',
        'X-Request-Id': REQUEST_ID,
      });
      expect(response.status).toBe(403);
      expect(harness.rpc).toHaveBeenCalledTimes(1);
      expect(harness.rpc).toHaveBeenCalledWith('auth_record_admin_audit_event', {
        p_actor_user_id: ADMIN_ID,
        p_target_user_id: null,
        p_action: 'ADMIN_ACCESS_DENIED',
        p_outcome: 'DENIED',
        p_before_role: null,
        p_after_role: null,
        p_before_status: null,
        p_after_status: null,
        p_reason_code: 'POLICY_VIOLATION',
        p_request_id: REQUEST_ID,
      });
      expect(harness.rpc.mock.calls.some(([name]) => name === 'auth_admin_update_user_status')).toBe(false);
    } finally {
      await harness.app.close();
    }
  });

  it('denies a suspended administrator before lifecycle mutation and audits the denial', async () => {
    const harness = await createHarness({ status: 'SUSPENDED' });
    try {
      const response = await patchStatus(harness.url, {
        Authorization: 'Bearer synthetic-test-token',
        'X-Request-Id': REQUEST_ID,
      });
      expect(response.status).toBe(403);
      expect(harness.rpc).toHaveBeenCalledWith('auth_record_admin_audit_event', expect.objectContaining({
        p_actor_user_id: ADMIN_ID,
        p_action: 'ADMIN_ACCESS_DENIED',
        p_outcome: 'DENIED',
        p_reason_code: 'POLICY_VIOLATION',
        p_request_id: REQUEST_ID,
      }));
      expect(harness.rpc.mock.calls.some(([name]) => name === 'auth_admin_update_user_status')).toBe(false);
    } finally {
      await harness.app.close();
    }
  });

  it('requires MFA to be enabled as well as recent before a lifecycle mutation', async () => {
    const harness = await createHarness({ mfaEnabled: false });
    try {
      const response = await patchStatus(harness.url, {
        Authorization: 'Bearer synthetic-test-token',
        'X-Request-Id': REQUEST_ID,
      });
      expect(response.status).toBe(403);
      expect(harness.rpc).toHaveBeenCalledWith('auth_record_admin_audit_event', expect.objectContaining({
        p_actor_user_id: ADMIN_ID,
        p_action: 'ADMIN_ACCESS_DENIED',
        p_outcome: 'DENIED',
        p_reason_code: 'POLICY_VIOLATION',
        p_request_id: REQUEST_ID,
      }));
      expect(harness.rpc.mock.calls.some(([name]) => name === 'auth_admin_update_user_status')).toBe(false);
    } finally {
      await harness.app.close();
    }
  });

  it('requires recent MFA for lifecycle mutations and audits the denial without calling the mutation RPC', async () => {
    const harness = await createHarness({
      mfaVerifiedAt: Math.floor(Date.now() / 1000) - 301,
    });
    try {
      const response = await patchStatus(harness.url, {
        Authorization: 'Bearer synthetic-test-token',
        'X-Request-Id': REQUEST_ID,
      });
      expect(response.status).toBe(403);
      expect(harness.rpc).toHaveBeenCalledWith('auth_record_admin_audit_event', expect.objectContaining({
        p_actor_user_id: ADMIN_ID,
        p_action: 'ADMIN_ACCESS_DENIED',
        p_outcome: 'DENIED',
        p_request_id: REQUEST_ID,
      }));
      expect(harness.rpc.mock.calls.some(([name]) => name === 'auth_admin_update_user_status')).toBe(false);
    } finally {
      await harness.app.close();
    }
  });

  it('routes role changes through the protected HTTP boundary with server-derived actor identity', async () => {
    const harness = await createHarness();
    try {
      const response = await fetch(`${harness.url}/api/admin/users/${TARGET_ID}/role`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer synthetic-test-token',
          'Content-Type': 'application/json',
          'X-Request-Id': REQUEST_ID,
        },
        body: JSON.stringify({ role: 'ADMIN', reasonCode: 'SECURITY_REVIEW' }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        result: 'updated',
        user: {
          id: TARGET_ID,
          email: 'target@example.com',
          role: 'ADMIN',
          status: 'ACTIVE',
          mfaEnabled: false,
        },
      });
      expect(harness.rpc).toHaveBeenCalledTimes(1);
      expect(harness.rpc).toHaveBeenCalledWith('auth_admin_update_user_role', {
        p_actor_user_id: ADMIN_ID,
        p_target_user_id: TARGET_ID,
        p_new_role: 'ADMIN',
        p_reason_code: 'SECURITY_REVIEW',
        p_request_id: REQUEST_ID,
      });
    } finally {
      await harness.app.close();
    }
  });

  it('routes session revocation through the protected HTTP boundary and redacts token material', async () => {
    const harness = await createHarness();
    try {
      const response = await fetch(`${harness.url}/api/admin/users/${TARGET_ID}/revoke-sessions`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer synthetic-test-token',
          'Content-Type': 'application/json',
          'X-Request-Id': REQUEST_ID,
        },
        body: JSON.stringify({ reasonCode: 'ADMIN_REQUEST' }),
      });
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toEqual({
        result: 'revoked',
        user: { id: TARGET_ID, email: 'target@example.com' },
        revokedSessions: 2,
      });
      expect(harness.rpc).toHaveBeenCalledTimes(1);
      expect(harness.rpc).toHaveBeenCalledWith('auth_admin_revoke_user_sessions', {
        p_actor_user_id: ADMIN_ID,
        p_target_user_id: TARGET_ID,
        p_reason_code: 'ADMIN_REQUEST',
        p_request_id: REQUEST_ID,
      });
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toContain('must-not-escape-password-hash');
      expect(serialized).not.toContain('must-not-escape-token-hash');
    } finally {
      await harness.app.close();
    }
  });

  it('rejects caller-supplied actor identity fields before any database RPC', async () => {
    const harness = await createHarness();
    try {
      const response = await patchStatus(
        harness.url,
        { Authorization: 'Bearer synthetic-test-token' },
        {
          status: 'SUSPENDED',
          reasonCode: 'COMPROMISED_ACCOUNT',
          actorUserId: TARGET_ID,
        },
      );
      expect(response.status).toBe(400);
      expect(harness.rpc).not.toHaveBeenCalled();
    } finally {
      await harness.app.close();
    }
  });
});
