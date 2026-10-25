import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/app/admin/users/page.tsx");
const api = read("../src/services/auth-api.ts");
const tsconfig = read("../tsconfig.json");

test("admin directory delegates requests to the NestJS API and gates the UI by role", () => {
  assert.match(page, /authApi\.adminUsers\(accessToken/);
  assert.match(page, /user\?\.role !== "ADMIN"/);
  assert.match(api, /\/api\/admin\/users/);
  assert.match(api, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.doesNotMatch(page, /@supabase\/supabase-js|SUPABASE_SERVICE_ROLE_KEY|createClient\s*\(/);
  assert.doesNotMatch(api, /@supabase\/supabase-js|SUPABASE_SERVICE_ROLE_KEY|createClient\s*\(/);
});

test("admin user response type stays allowlisted and read-only", () => {
  const fields = api.match(/export type ManagedUser = \{([\s\S]*?)\};/);
  assert.ok(fields, "ManagedUser response type should be defined");
  assert.deepEqual(
    [...fields[1].matchAll(/^\s*(\w+)\s*:/gm)].map((match) => match[1]),
    ["id", "email", "role", "mfaEnabled"],
  );
  assert.match(page, /Legacy NestJS accounts · Read-only directory/);
  assert.doesNotMatch(page + api, /adminUpdateRole|adminSuspendUser|adminRevokeSessions|deleteUser/);
});

test("directory retains loading, empty, error and keyboard-labelled detail states", () => {
  assert.match(page, /Loading accounts…/);
  assert.match(page, /No accounts found\./);
  assert.match(page, /role="alert"/);
  assert.match(page, /role="dialog" aria-modal="true" aria-labelledby="user-detail-title"/);
  assert.match(page, /aria-label="Close user details"/);
});

test("directory derives loading and error state from the current request key", () => {
  assert.ok(page.includes("const requestKey = JSON.stringify([accessToken, user?.role, appliedQuery.trim(), role, page]);"));
  assert.ok(page.includes("requestState?.key !== requestKey"));
  assert.ok(page.includes('requestState.status === "error"'));
  assert.ok(page.includes('setRequestState({ key: requestKey, status: "success" })'));
  assert.match(page, /key: requestKey,\s+status: "error"/);
  assert.doesNotMatch(page, /setLoading|setError/);
});
test("frontend keeps explicit import aliases", () => {
  for (const alias of ["@/*", "@components/*", "@lib/*", "@hooks/*", "@services/*", "@features/*"]) {
    assert.ok(tsconfig.includes(`"${alias}"`), `missing explicit alias ${alias}`);
  }
});

test("detail dialog supports Escape, focus containment and focus restoration", () => {
  assert.ok(page.includes("const dialogRef = useRef<HTMLElement | null>(null)"));
  assert.ok(page.includes("closeButtonRef.current?.focus()"));
  assert.ok(page.includes('event.key === "Escape"'));
  assert.ok(page.includes('event.key !== "Tab"'));
  assert.ok(page.includes("dialog?.querySelectorAll<HTMLElement>(focusableSelector)"));
  assert.ok(page.includes("last.focus()"));
  assert.ok(page.includes("first.focus()"));
  assert.ok(page.includes("returnTarget.focus()"));
  assert.ok(page.includes("returnFocusRef.current = event.currentTarget"));
  assert.ok(page.includes('ref={dialogRef} role="dialog" aria-modal="true"'));
  assert.ok(page.includes("ref={closeButtonRef}"));
});
