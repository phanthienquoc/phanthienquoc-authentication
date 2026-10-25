import type { ApiError, AuthResult, AuthUser } from "@lib/auth/types";

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
  mfaEnabled: boolean;
};

export type ManagedUserPage = {
  items: ManagedUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ManagedUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  mfaEnabled: boolean;
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
  refresh: () =>
    request<AuthResult>("/auth/refresh", { method: "POST" }),
  logout: () =>
    request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  status: () =>
    request<{ configured: boolean; database: string; passkeyConfigured: boolean }>("/auth/status"),
  mfaLogin: (userId: string, code: string) =>
    request<AuthResult>("/auth/mfa/login", {
      method: "POST",
      body: JSON.stringify({ userId, code }),
    }),
  mfaRecovery: (userId: string, code: string) =>
    request<AuthResult>("/auth/mfa/recovery", {
      method: "POST",
      body: JSON.stringify({ userId, code }),
    }),
  adminUsers: (accessToken: string, params: { query?: string; role?: "USER" | "ADMIN"; page?: number; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.query) search.set("query", params.query);
    if (params.role) search.set("role", params.role);
    search.set("page", String(params.page ?? 1));
    search.set("limit", String(params.limit ?? 25));
    return request<ManagedUserPage>(`/api/admin/users?${search.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  adminUser: (accessToken: string, id: string) =>
    request<{ user: ManagedUser }>(`/api/admin/users/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
