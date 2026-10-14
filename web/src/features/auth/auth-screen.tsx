"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuthStore } from "@features/auth/auth-store";

type Mode = "login" | "signup";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingMfa, setPendingMfa] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const { accessToken, user, loading, error, signIn, signUp, completeMfa, pendingMfaUserId, restoreSession, signOut, setError } = useAuthStore();

  useEffect(() => { void restoreSession(); }, [restoreSession]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        await signUp(email, password);
        setMode("login");
        setPassword("");
        return;
      }
      const result = await signIn(email, password);
      if (result === "mfa") {
        // API's MFA-required response contains the pending user id; login action below
        // handles the backend's explicit MFA challenge flow.
        setPendingMfa(true);
      }
    } catch {
      // Error state is surfaced by Zustand.
    }
  }

  async function onMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      if (!pendingMfaUserId) throw new Error("MFA challenge context is missing. Please sign in again.");
      await completeMfa(pendingMfaUserId, mfaCode, useRecovery);
      setPendingMfa(false);
    } catch {
      // Error state is surfaced by Zustand.
    }
  }

  if (accessToken && user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10">
        <section className="w-full rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[.24em] text-[var(--brand)]">MrCute ID</p>
          <h1 className="mt-5 text-3xl font-semibold">You’re signed in.</h1>
          <p className="mt-3 text-[var(--muted)]">One identity, ready to connect across your apps.</p>
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-black/20 p-5">
            <p className="text-sm text-[var(--muted)]">Signed in as</p>
            <p className="mt-1 break-all text-lg">{user.email}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Role: {user.role} · MFA {user.mfaEnabled ? "enabled" : "not enabled"}</p>
          </div>
          <button onClick={() => void signOut()} className="mt-7 rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-black disabled:opacity-60" disabled={loading}>Sign out</button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-12 px-5 py-8 lg:grid-cols-[1.1fr_.9fr] lg:px-10">
      <section className="hidden lg:block">
        <div className="inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-white/[.03] px-4 py-2 text-sm text-slate-300">
          <span className="h-2 w-2 rounded-full bg-[var(--brand)]" />
          One identity · Multiple apps
        </div>
        <div className="mt-12 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[.32em] text-[var(--brand)]">MrCute platform</p>
          <h1 className="mt-5 text-6xl font-semibold leading-[1.05] tracking-[-.05em]">Your work.<br />One secure ID.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[var(--muted)]">Sign in once and connect to the tools you use, starting with TCE Dashboard.</p>
        </div>
        <div className="mt-14 grid max-w-xl grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--line)] bg-white/[.025] p-5">
            <p className="text-sm text-[var(--muted)]">IDENTITY</p><p className="mt-2 text-lg">Centralized auth</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white/[.025] p-5">
            <p className="text-sm text-[var(--muted)]">SECURITY</p><p className="mt-2 text-lg">Session protection</p>
          </div>
        </div>
        <p className="mt-14 text-xs text-slate-600">MR CUTE · IDENTITY PLATFORM</p>
      </section>

      <section className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <span className="text-sm font-semibold tracking-wide">MrCute ID</span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">Secure access</span>
        </div>
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl shadow-black/20 sm:p-9">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand)] text-lg font-black text-black">M</div>
            <div><p className="font-semibold">MrCute ID</p><p className="mt-1 text-xs text-[var(--muted)]">Secure account access</p></div>
          </div>

          {!pendingMfa ? (
            <>
              <h2 className="mt-9 text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{mode === "login" ? "Enter your details to access your workspace." : "Use a valid email and a password of at least 12 characters."}</p>
              <div className="mt-7 grid grid-cols-2 rounded-xl border border-[var(--line)] p-1">
                <button type="button" onClick={() => { setMode("login"); setError(null); }} className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${mode === "login" ? "bg-white/10 text-white" : "text-[var(--muted)]"}`}>Sign in</button>
                <button type="button" onClick={() => { setMode("signup"); setError(null); }} className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${mode === "signup" ? "bg-white/10 text-white" : "text-[var(--muted)]"}`}>Create account</button>
              </div>
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <label className="block text-sm font-medium">Email address
                  <input type="email" autoComplete="email" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#090d15] px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-[var(--brand)]" />
                </label>
                <label className="block text-sm font-medium">Password
                  <div className="relative mt-2">
                    <input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 12 : 1} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 12 characters" : "Enter your password"} className="w-full rounded-xl border border-[var(--line)] bg-[#090d15] px-4 py-3.5 pr-20 text-sm outline-none transition placeholder:text-slate-600 focus:border-[var(--brand)]" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">{showPassword ? "Hide" : "Show"}</button>
                  </div>
                </label>
                {error && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3.5 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <span aria-hidden="true">↗</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="mt-9 text-2xl font-semibold">Verify it’s you</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Enter the code from your authenticator app or use a recovery code.</p>
              <form className="mt-6 space-y-4" onSubmit={onMfaSubmit}>
                <label className="block text-sm font-medium">{useRecovery ? "Recovery code" : "Authenticator code"}
                  <input required value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#090d15] px-4 py-3.5 text-sm outline-none focus:border-[var(--brand)]" />
                </label>
                {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--brand)] px-4 py-3.5 text-sm font-bold text-black disabled:opacity-60">{loading ? "Verifying…" : "Verify and sign in"}</button>
                <button type="button" onClick={() => { setUseRecovery((v) => !v); setMfaCode(""); }} className="w-full py-2 text-sm text-[var(--muted)]">{useRecovery ? "Use authenticator code" : "Use recovery code instead"}</button>
                <button type="button" onClick={() => { setPendingMfa(false); setMfaCode(""); setError(null); }} className="w-full py-2 text-sm text-[var(--muted)]">Back to sign in</button>
              </form>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-slate-600">Protected by MrCute Authentication · Your credentials are sent securely to the auth service.</p>
      </section>
    </main>
  );
}
