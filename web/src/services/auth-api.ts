import type { ApiError, AuthResult, AuthUser } from "@lib/auth/types";
import { buildAdminUsersPath } from "../../scripts/admin-user-query.mjs";

const API_URL = (process.env.NEXT_PUBLIC_AUTH_API_URL ?? "https://auth.mrcute.space").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    throw new Error(message || body.error || `Authentication failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export type ManagedUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  mfaEnabled: boolean;
};

export type UserMutationReasonCode =
  | "ADMIN_REQUEST"
  | "SECURITY_REVIEW"
  | "COMPROMISED_ACCOUNT"
  | "POLICY_VIOLATION"
  | "OTHER";

export type AdminUserRoleMutationResult = {
  result: "updated" | "no_change";
  user: ManagedUser;
};

export type AdminUserStatusMutationResult = {
  result: "updated" | "no_change";
  user: ManagedUser;
  revokedSessions: number;
};

export type AdminUserSessionRevocationResult = {
  result: "revoked";
  user: { id: string; email: string };
  revokedSessions: number;
};

export type ManagedUserPage = {
  items: ManagedUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (email: string, password: string) =>
    request<{ user: AuthUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: (accessToken: string) =>
    request<{ user: AuthUser }>("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  refresh: () => request<AuthResult>("/auth/refresh", { method: "POST" }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  status: () =>
    request<{ configured: boolean; database: string; passkeyConfigured: boolean }>("/auth/status"),
  mfaLogin: (challengeToken: string, code: string) =>
    request<AuthResult>("/auth/mfa/login", {
      method: "POST",
      body: JSON.stringify({ challengeToken, code }),
    }),
  mfaRecovery: (challengeToken: string, code: string) =>
    request<AuthResult>("/auth/mfa/recovery", {
      method: "POST",
      body: JSON.stringify({ challengeToken, code }),
    }),
  adminUsers: (
    accessToken: string,
    params: { query?: string; role?: "USER" | "ADMIN"; page?: number; limit?: number } = {},
  ) =>
    request<ManagedUserPage>(buildAdminUsersPath(params), {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  adminUser: (accessToken: string, id: string) =>
    request<{ user: ManagedUser }>(`/api/admin/users/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  adminUpdateUserRole: (
    accessToken: string,
    id: string,
    role: "USER" | "ADMIN",
    reasonCode: UserMutationReasonCode,
  ) =>
    request<AdminUserRoleMutationResult>(`/api/admin/users/${encodeURIComponent(id)}/role`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ role, reasonCode }),
    }),
  adminUpdateUserStatus: (
    accessToken: string,
    id: string,
    status: "ACTIVE" | "SUSPENDED",
    reasonCode: UserMutationReasonCode,
  ) =>
    request<AdminUserStatusMutationResult>(`/api/admin/users/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status, reasonCode }),
    }),
  adminRevokeUserSessions: (
    accessToken: string,
    id: string,
    reasonCode: UserMutationReasonCode,
  ) =>
    request<AdminUserSessionRevocationResult>(`/api/admin/users/${encodeURIComponent(id)}/revoke-sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reasonCode }),
    }),
};
