"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { authApi, type ManagedUser } from "@services/auth-api";
import { useAuthStore } from "@features/auth/auth-store";

export default function AdminUsersPage() {
  const { accessToken, user, loading: authLoading, restoreSession } = useAuthStore();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [role, setRole] = useState<"" | "USER" | "ADMIN">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!accessToken || user?.role !== "ADMIN") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void authApi.adminUsers(accessToken, {
      query: appliedQuery.trim() || undefined,
      role: role || undefined,
      page,
      limit: 25,
    }).then((result) => {
      if (cancelled) return;
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setSelected((current) =>
        current && !result.items.some((item) => item.id === current.id) ? null : current,
      );
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load users.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [accessToken, user?.role, appliedQuery, role, page]);

  useEffect(() => {
    if (!selected) return;

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    closeButtonRef.current?.focus();

    function onDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelected(null);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialog?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusable || focusable.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", onDialogKeyDown);
      const returnTarget = returnFocusRef.current ?? previouslyFocused;
      if (returnTarget?.isConnected) returnTarget.focus();
      returnFocusRef.current = null;
    };
  }, [selected]);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (nextQuery !== appliedQuery || page !== 1) {
      setLoading(true);
      setError(null);
      setAppliedQuery(nextQuery);
      setPage(1);
    }
  }

  if (authLoading && !accessToken) {
    return <main className="mx-auto flex min-h-screen max-w-6xl items-center px-5"><p className="text-[var(--muted)]">Restoring session…</p></main>;
  }

  if (!accessToken || !user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10">
        <section className="w-full rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8">
          <p className="text-xs font-semibold uppercase tracking-[.24em] text-[var(--brand)]">MrCute ID · Admin</p>
          <h1 className="mt-4 text-3xl font-semibold">Sign in required</h1>
          <p className="mt-3 text-[var(--muted)]">Sign in with an administrator account to access user management.</p>
          <Link className="mt-6 inline-flex rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-black" href="/">Go to sign in</Link>
        </section>
      </main>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center px-5 py-10">
        <section className="w-full rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-8">
          <p className="text-xs font-semibold uppercase tracking-[.24em] text-[var(--brand)]">MrCute ID · Admin</p>
          <h1 className="mt-4 text-3xl font-semibold">Access restricted</h1>
          <p className="mt-3 text-[var(--muted)]">Your account does not have administrator access.</p>
          <Link className="mt-6 inline-flex rounded-xl border border-[var(--line)] px-5 py-3 font-semibold" href="/">Back to account</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.24em] text-[var(--brand)]">MrCute ID · Administration</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">User management</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Legacy NestJS accounts · Read-only directory</p>
        </div>
        <Link href="/" className="text-sm text-[var(--muted)] underline underline-offset-4 hover:text-white">Back to account</Link>
      </header>

      <section className="mt-7 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
        <form onSubmit={onSearch} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
          <label className="sr-only" htmlFor="user-search">Search by email</label>
          <input id="user-search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email…" autoComplete="off"
            className="min-w-0 rounded-xl border border-[var(--line)] bg-black/20 px-4 py-3 outline-none focus:border-[var(--brand)]" />
          <label className="sr-only" htmlFor="role-filter">Filter by role</label>
          <select id="role-filter" value={role} onChange={(event) => {
              const nextRole = event.target.value as "" | "USER" | "ADMIN";
              if (nextRole !== role || page !== 1) {
                setLoading(true);
                setError(null);
                setRole(nextRole);
                setPage(1);
              }
            }}
            className="rounded-xl border border-[var(--line)] bg-[#111722] px-4 py-3 outline-none focus:border-[var(--brand)]">
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" className="rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-black">Search</button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
          <span>{total.toLocaleString()} account{total === 1 ? "" : "s"}</span>
          <span>Page {page} of {Math.max(totalPages, 1)}</span>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-200">{error}</p>}

        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="bg-white/[.035] text-[var(--muted)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Role</th>
                <th scope="col" className="px-4 py-3 font-medium">MFA</th>
                <th scope="col" className="px-4 py-3 font-medium">Account ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">Loading accounts…</td></tr>
                : items.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">No accounts found.</td></tr>
                : items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--line)] hover:bg-white/[.025]">
                    <td className="px-4 py-3"><button type="button" onClick={(event) => { returnFocusRef.current = event.currentTarget; setSelected(item); }} className="break-all text-left font-medium underline decoration-[var(--line)] underline-offset-4 hover:decoration-[var(--brand)]">{item.email}</button></td>
                    <td className="px-4 py-3"><span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs">{item.role}</span></td>
                    <td className="px-4 py-3">{item.mfaEnabled ? "Enabled" : "Not enabled"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">{item.id}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => { if (page > 1) { setLoading(true); setError(null); setPage(page - 1); } }} disabled={page <= 1 || loading}
            className="rounded-xl border border-[var(--line)] px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          <button type="button" onClick={() => { if (page < totalPages) { setLoading(true); setError(null); setPage(page + 1); } }} disabled={page >= totalPages || loading}
            className="rounded-xl border border-[var(--line)] px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="user-detail-title" tabIndex={-1} className="w-full max-w-lg rounded-t-3xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--brand)]">Account details</p><h2 id="user-detail-title" className="mt-2 text-xl font-semibold">User profile</h2></div>
              <button ref={closeButtonRef} type="button" onClick={() => setSelected(null)} aria-label="Close user details" className="rounded-lg border border-[var(--line)] px-3 py-1.5">Close</button>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-[var(--muted)]">Email</dt><dd className="mt-1 break-all">{selected.email}</dd></div>
              <div><dt className="text-[var(--muted)]">Application role</dt><dd className="mt-1">{selected.role}</dd></div>
              <div><dt className="text-[var(--muted)]">Multi-factor authentication</dt><dd className="mt-1">{selected.mfaEnabled ? "Enabled" : "Not enabled"}</dd></div>
              <div><dt className="text-[var(--muted)]">Account ID</dt><dd className="mt-1 break-all font-mono text-xs">{selected.id}</dd></div>
            </dl>
            <p className="mt-6 rounded-xl border border-[var(--line)] p-3 text-xs leading-5 text-[var(--muted)]">This initial release is read-only. Account role and lifecycle actions will be enabled only after audit logging and authentication-session safeguards are implemented.</p>
          </section>
        </div>
      )}
    </main>
  );
}
