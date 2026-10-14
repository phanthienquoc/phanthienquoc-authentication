"use client";

import { useEffect, useState } from "react";
import type Keycloak from "keycloak-js";
import { getKeycloakClient, initializeKeycloak } from "@lib/keycloak";

export function KeycloakAuthScreen() {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void initializeKeycloak()
      .then(() => {
        if (!active) return;
        const instance = getKeycloakClient();
        setKeycloak(instance);
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setError("Identity service is unavailable or its public configuration is invalid.");
          setReady(true);
        }
      });
    return () => { active = false; };
  }, []);

  async function signIn() {
    if (!keycloak) return;
    try {
      await keycloak.login({ redirectUri: window.location.origin });
    } catch {
      setError("Could not redirect to the identity service. Please try again.");
    }
  }

  async function signOut() {
    if (!keycloak) return;
    try {
      await keycloak.logout({ redirectUri: window.location.origin });
    } catch {
      setError("Could not sign out. Please try again.");
    }
  }

  const profile = keycloak?.tokenParsed;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.24em] text-[var(--brand)]">MrCute platform</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">MrCute ID</h1>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          One secure identity for TCE Dashboard and the rest of your workspace.
          Sign-in, MFA, account recovery and SSO are managed by the central identity provider.
        </p>

        {profile ? (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-black/20 p-5">
            <p className="text-sm text-[var(--muted)]">Signed in as</p>
            <p className="mt-1 break-all text-lg">{profile.email ?? profile.preferred_username ?? "Authenticated user"}</p>
            <button onClick={() => void signOut()} className="mt-6 rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-black">
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => void signIn()}
            disabled={!ready || Boolean(error)}
            className="mt-8 flex w-full items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-3.5 font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!ready ? "Connecting to identity service…" : "Continue with MrCute ID"}
          </button>
        )}

        {error && <p role="alert" className="mt-5 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}
        <p className="mt-6 text-xs leading-5 text-slate-600">
          Authentication uses OpenID Connect Authorization Code Flow with PKCE. This browser app is a public client and has no client secret.
        </p>
      </section>
    </main>
  );
}
