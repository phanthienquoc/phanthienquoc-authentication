"use client";

import { create } from "zustand";
import { authApi } from "@services/auth-api";
import type { AuthUser } from "@lib/auth/types";

type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
  pendingMfaUserId: string | null;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  signIn: (email: string, password: string) => Promise<"authenticated" | "mfa">;
  signUp: (email: string, password: string) => Promise<void>;
  completeMfa: (userId: string, code: string, recovery?: boolean) => Promise<void>;
  restoreSession: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  pendingMfaUserId: null,
  loading: false,
  error: null,
  setError: (error) => set({ error }),
  signIn: async (email, password) => {
    set({ loading: true, error: null, pendingMfaUserId: null });
    try {
      const result = await authApi.login(email, password);
      if (result.mfaRequired && result.userId) {
        set({ pendingMfaUserId: result.userId, loading: false });
        return "mfa";
      }
      if (!result.accessToken) throw new Error("The auth service did not return an access token.");
      const { user } = await authApi.me(result.accessToken);
      set({ accessToken: result.accessToken, user, pendingMfaUserId: null, loading: false });
      return "authenticated";
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Could not sign in." });
      throw error;
    }
  },
  signUp: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await authApi.signup(email, password);
      set({ loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Could not create account." });
      throw error;
    }
  },
  completeMfa: async (userId, code, recovery = false) => {
    set({ loading: true, error: null });
    try {
      const result = recovery
        ? await authApi.mfaRecovery(userId, code)
        : await authApi.mfaLogin(userId, code);
      if (!result.accessToken) throw new Error("The auth service did not return an access token.");
      const { user } = await authApi.me(result.accessToken);
      set({ accessToken: result.accessToken, user, pendingMfaUserId: null, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Could not verify the code." });
      throw error;
    }
  },
  restoreSession: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const result = await authApi.refresh();
      if (!result.accessToken) {
        set({ accessToken: null, user: null, loading: false });
        return;
      }
      const { user } = await authApi.me(result.accessToken);
      set({ accessToken: result.accessToken, user, loading: false });
    } catch {
      set({ accessToken: null, user: null, loading: false });
    }
  },
  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await authApi.logout();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not sign out." });
      throw error;
    } finally {
      set({ accessToken: null, user: null, pendingMfaUserId: null, loading: false });
    }
  },
}));
