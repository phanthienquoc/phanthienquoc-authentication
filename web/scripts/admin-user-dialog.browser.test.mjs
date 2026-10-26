import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const webRoot = fileURLToPath(new URL("..", import.meta.url));

async function getFreePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(baseUrl, child, logs) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("Next.js exited before becoming ready.\n" + logs());
    }
    try {
      const response = await fetch(baseUrl + "/admin/users");
      if (response.status === 200) return;
    } catch {}
    await delay(400);
  }
  throw new Error("Next.js did not become ready within 90 seconds.\n" + logs());
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const signalProcessGroup = (signal) => {
    if (process.platform !== "win32" && child.pid) {
      try {
        process.kill(-child.pid, signal);
        return;
      } catch {}
    }
    child.kill(signal);
  };
  signalProcessGroup("SIGTERM");
  await Promise.race([once(child, "exit").catch(() => {}), delay(3000)]);
  if (child.exitCode === null && child.signalCode === null) signalProcessGroup("SIGKILL");
}

test("admin detail dialog supports real keyboard focus behavior and responsive viewports", { timeout: 180000 }, async () => {
  const port = await getFreePort();
  const baseUrl = "http://127.0.0.1:" + port;
  const logs = { server: "", chrome: "" };
  const appendLog = (key, chunk) => {
    logs[key] = (logs[key] + chunk.toString()).slice(-12000);
  };
  let currentRole = "ADMIN";
  let managedUser = { id: "11111111-1111-4111-8111-111111111111", email: "alice@example.com", role: "USER", status: "ACTIVE", mfaEnabled: false };
  let failNextMutation = false;
  let holdNextMutation = false;
  let adminUsersCalls = 0;
  const mutationRequests = [];
  const protocolErrors = [];
  const interceptedApiRequests = [];
  let server;
  let chrome;
  let ws;
  let profileDir;
  let sessionId;
  let nextCommandId = 0;
  const pending = new Map();

  const chromeName = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]
    .find((name) => spawnSync("which", [name], { encoding: "utf8" }).status === 0);
  assert.ok(chromeName, "GitHub runner must provide Chrome/Chromium; no npm browser dependency is added.");

  try {
    const serverEnv = {
      ...process.env,
      NEXT_PUBLIC_AUTH_API_URL: baseUrl,
      NEXT_PUBLIC_AUTH_MODE: "legacy",
      NEXT_TELEMETRY_DISABLED: "1",
    };
    delete serverEnv.SUPABASE_SERVICE_ROLE_KEY;
    delete serverEnv.SUPABASE_URL;
    delete serverEnv.DATABASE_URL;
    server = spawn(process.execPath, [
      join(webRoot, "node_modules", "next", "dist", "bin", "next"),
      "dev",
      "-H",
      "0.0.0.0",
      "--port",
      String(port),
    ], {
      cwd: webRoot,
      env: serverEnv,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => appendLog("server", chunk));
    server.stderr.on("data", (chunk) => appendLog("server", chunk));
    await waitForServer(baseUrl, server, () => logs.server);

    profileDir = await mkdtemp(join(tmpdir(), "auth-um-browser-"));
    chrome = spawn(chromeName, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      "--remote-allow-origins=*",
      "--user-data-dir=" + profileDir,
      "about:blank",
    ], { detached: process.platform !== "win32", stdio: ["ignore", "ignore", "pipe"] });
    chrome.stderr.on("data", (chunk) => appendLog("chrome", chunk));

    let activePort;
    const portFile = join(profileDir, "DevToolsActivePort");
    const portDeadline = Date.now() + 20000;
    while (Date.now() < portDeadline) {
      if (chrome.exitCode !== null) throw new Error("Chrome exited during startup.\n" + logs.chrome);
      try {
        activePort = (await readFile(portFile, "utf8")).trim().split(/\r?\n/);
        if (activePort.length >= 2) break;
      } catch {}
      await delay(100);
    }
    assert.ok(activePort && activePort.length >= 2, "Chrome DevTools endpoint did not start.\n" + logs.chrome);

    ws = new WebSocket("ws://127.0.0.1:" + activePort[0] + activePort[1]);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out connecting to Chrome DevTools.")), 10000);
      ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); }, { once: true });
      ws.addEventListener("error", (error) => { clearTimeout(timeout); reject(error); }, { once: true });
    });

    function send(method, params = {}, attachedSessionId) {
      const id = ++nextCommandId;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("Chrome DevTools command timed out: " + method));
        }, 12000);
        pending.set(id, { resolve, reject, timer, method });
        const message = { id, method, params };
        if (attachedSessionId) message.sessionId = attachedSessionId;
        ws.send(JSON.stringify(message));
      });
    }

    async function fulfillPaused(message) {
      const request = message.params.request;
      const path = new URL(request.url).pathname;
      const method = request.method || "GET";
      if (path.startsWith("/auth/") || path.startsWith("/api/admin/users")) {
        interceptedApiRequests.push(`${method} ${path}`);
      }
      const body = request.postData ? JSON.parse(request.postData) : {};
      let status = 200;
      let payload;
      if (path === "/auth/refresh" && method === "POST") {
        payload = { accessToken: "browser-test-access-token" };
      } else if (path === "/auth/me" && method === "GET") {
        payload = {
          user: {
            id: "admin-test-id",
            email: currentRole === "ADMIN" ? "admin@example.com" : "user@example.com",
            role: currentRole,
            mfaEnabled: true,
          },
        };
      } else if (path === "/api/admin/users" && method === "GET") {
        adminUsersCalls += 1;
        payload = { items: [managedUser], page: 1, limit: 25, total: 1, totalPages: 1 };
      } else if (path === "/api/admin/users/11111111-1111-4111-8111-111111111111/role" && method === "PATCH") {
        mutationRequests.push({ method, path, body });
        managedUser = { ...managedUser, role: body.role };
        payload = { result: "updated", user: managedUser };
      } else if (path === "/api/admin/users/11111111-1111-4111-8111-111111111111/status" && method === "PATCH") {
        mutationRequests.push({ method, path, body });
        if (failNextMutation) {
          failNextMutation = false;
          status = 409;
          payload = { message: "Cannot remove or suspend the last active administrator" };
        } else {
          managedUser = { ...managedUser, status: body.status };
          payload = { result: "updated", user: managedUser, revokedSessions: 2 };
        }
      } else if (path === "/api/admin/users/11111111-1111-4111-8111-111111111111/revoke-sessions" && method === "POST") {
        mutationRequests.push({ method, path, body });
        payload = { result: "revoked", user: { id: managedUser.id, email: managedUser.email }, revokedSessions: 2 };
      } else if (path === "/api/admin/users/11111111-1111-4111-8111-111111111111" && method === "GET") {
        payload = { user: managedUser };
      } else {
        status = 404;
        payload = { message: "Unexpected mocked API path." };
      }
      if (holdNextMutation) {
        holdNextMutation = false;
        await delay(1200);
      }
      await send("Fetch.fulfillRequest", {
        requestId: message.params.requestId,
        responseCode: status,
        responseHeaders: [
          { name: "content-type", value: "application/json; charset=utf-8" },
          { name: "cache-control", value: "no-store" },
        ],
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      }, message.sessionId);
    }
    ws.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8"));
      } catch (error) {
        protocolErrors.push("Invalid DevTools message: " + String(error));
        return;
      }
      if (message.id) {
        const item = pending.get(message.id);
        if (!item) return;
        clearTimeout(item.timer);
        pending.delete(message.id);
        if (message.error) item.reject(new Error(item.method + ": " + message.error.message));
        else item.resolve(message.result ?? {});
        return;
      }
      if (message.method === "Fetch.requestPaused") {
        void fulfillPaused(message).catch((error) => protocolErrors.push(String(error)));
      }
    });

    const target = await send("Target.createTarget", { url: "about:blank" });
    const attached = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    sessionId = attached.sessionId;
    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    await send("Fetch.enable", {
      patterns: [
        { urlPattern: baseUrl + "/auth/*", requestStage: "Request" },
        { urlPattern: baseUrl + "/api/admin/users*", requestStage: "Request" },
      ],
    }, sessionId);

    async function evaluate(expression) {
      const response = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
      }, sessionId);
      if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.text || "Browser expression failed.");
      }
      return response.result?.value;
    }

    async function waitFor(expression, label) {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        try {
          const value = await evaluate(expression);
          if (value) return value;
        } catch {}
        await delay(100);
      }
      throw new Error(
        "Timed out waiting for browser state: " + label +
          "\nIntercepted mocked API requests: " + (interceptedApiRequests.join(", ") || "(none)"),
      );
    }

    async function navigate(path) {
      const result = await send("Page.navigate", { url: baseUrl + path }, sessionId);
      assert.equal(result.errorText, undefined, "Navigation should not fail.");
      await waitFor("document.readyState === 'complete'", "document ready");
    }

    async function chooseReason(value) {
      const selectedValue = await evaluate(
        "(() => { const select = document.querySelector('#mutation-reason'); if (!select) return null; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; setter.call(select, " +
          JSON.stringify(value) +
          "); select.dispatchEvent(new Event('input', { bubbles: true })); select.dispatchEvent(new Event('change', { bubbles: true })); return select.value; })()",
      );
      assert.equal(selectedValue, value, "Audit reason selection should update.");
    }

    async function pressKey(key, code, keyCode, shift = false) {
      const modifiers = shift ? 8 : 0;
      await send("Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key,
        code,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
        modifiers,
      }, sessionId);
      await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key,
        code,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
        modifiers,
      }, sessionId);
    }

    const viewports = [
      { width: 390, height: 844, mobile: true, name: "portrait phone" },
      { width: 844, height: 390, mobile: true, name: "short landscape phone" },
      { width: 1280, height: 800, mobile: false, name: "desktop" },
    ];

    for (const viewport of viewports) {
      currentRole = "ADMIN";
      await send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
        screenWidth: viewport.width,
        screenHeight: viewport.height,
      }, sessionId);
      await navigate("/admin/users?browserCase=" + viewport.width + "x" + viewport.height);
      await waitFor(
        "document.querySelector('tbody button')?.textContent?.trim() === 'alice@example.com'",
        viewport.name + " admin directory row",
      );
      await evaluate("(() => { const trigger = document.querySelector('tbody button'); trigger.focus(); trigger.click(); return true; })()");
      await waitFor(
        "Boolean(document.querySelector('[role=\"dialog\"]')) && document.activeElement?.getAttribute('aria-label') === 'Close user details'",
        viewport.name + " dialog initial focus",
      );

      const metrics = await evaluate("(() => { const dialog = document.querySelector('[role=\"dialog\"]'); const rect = dialog.getBoundingClientRect(); return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, clientHeight: dialog.clientHeight, scrollHeight: dialog.scrollHeight, overflowY: getComputedStyle(dialog).overflowY, text: dialog.innerText }; })()");
      assert.equal(metrics.width, viewport.width, viewport.name + " viewport width");
      assert.ok(metrics.scrollWidth <= viewport.width + 1, viewport.name + " page must not overflow horizontally");
      assert.ok(
        metrics.left >= -1 && metrics.top >= -1 && metrics.right <= viewport.width + 1 && metrics.bottom <= viewport.height + 1,
        viewport.name + " dialog must stay within the viewport: " + JSON.stringify(metrics),
      );
      if (viewport.name === "short landscape phone") {
        assert.equal(metrics.overflowY, "auto", "short landscape dialog content must be scrollable");
        assert.ok(metrics.scrollHeight > metrics.clientHeight, "short landscape dialog must constrain content height and expose internal scrolling");
        const reachedBottom = await evaluate("(() => { const dialog = document.querySelector('[role=\"dialog\"]'); dialog.scrollTop = dialog.scrollHeight; return dialog.scrollTop > 0 && dialog.scrollTop + dialog.clientHeight >= dialog.scrollHeight - 1; })()");
        assert.equal(reachedBottom, true, "short landscape dialog content must be reachable by scrolling");
      }
      assert.match(metrics.text, /alice@example\.com/);
      assert.match(metrics.text, /Application role/);
      assert.doesNotMatch(metrics.text, /password_hash|mfa_secret_encrypted|refresh token|recovery code|private passkey/i);

      if (viewport.width === 390) {
        const focusSetup = await evaluate("(() => { const dialog = document.querySelector('[role=\"dialog\"]'); const last = document.createElement('button'); last.type = 'button'; last.textContent = 'Test focus boundary'; last.setAttribute('data-test-focus-end', ''); dialog.appendChild(last); last.focus(); return document.activeElement === last; })()");
        assert.equal(focusSetup, true, "test boundary button should receive focus");
        await pressKey("Tab", "Tab", 9);
        await waitFor("document.activeElement?.getAttribute('aria-label') === 'Close user details'", "Tab wraps to first dialog control");
        await pressKey("Tab", "Tab", 9, true);
        await waitFor("document.activeElement?.hasAttribute('data-test-focus-end')", "Shift+Tab wraps to last dialog control");
        await pressKey("Escape", "Escape", 27);
        await waitFor("!document.querySelector('[role=\"dialog\"]')", "Escape dismisses the dialog");
        await waitFor("document.activeElement?.textContent?.trim() === 'alice@example.com'", "focus returns to the originating account row");
      } else {
        await evaluate("document.querySelector('[aria-label=\"Close user details\"]')?.click()");
        await waitFor("!document.querySelector('[role=\"dialog\"]')", viewport.name + " close button");
      }
    }

    currentRole = "ADMIN";
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844,
    }, sessionId);
    await navigate("/admin/users?browserCase=mutations");
    await waitFor("document.querySelector('tbody button')?.textContent?.trim() === 'alice@example.com'", "mutation test directory row");
    await evaluate("document.querySelector('tbody button')?.click()");
    await waitFor("Boolean(document.querySelector('[role=\"dialog\"]')) && Boolean(document.querySelector('[data-testid=\"change-role\"]'))", "mutation controls");
    const callsBeforeMutations = adminUsersCalls;

    const mutationCountBeforeRoleConfirm = mutationRequests.length;
    await evaluate("document.querySelector('[data-testid=\"change-role\"]')?.click()");
    await waitFor("document.querySelector('[data-testid=\"confirm-mutation\"]')?.textContent?.includes('Confirm role change')", "role confirmation");
    assert.equal(mutationRequests.length, mutationCountBeforeRoleConfirm, "Role mutation must not be sent before explicit confirmation.");
    await chooseReason("SECURITY_REVIEW");
    holdNextMutation = true;
    await evaluate("document.querySelector('[data-testid=confirm-mutation]')?.click()");
    await waitFor("document.querySelector('[data-testid=confirm-mutation]')?.textContent?.includes('Working…')", "role mutation enters pending state");
    await pressKey("Escape", "Escape", 27);
    await waitFor("Boolean(document.querySelector('[role=dialog]'))", "dialog stays open while a privileged mutation is pending");
    await waitFor("document.body.innerText.includes('Role changed to ADMIN.')", "role mutation success");
    assert.equal(mutationRequests.at(-1).method, "PATCH");
    assert.equal(mutationRequests.at(-1).body.role, "ADMIN");
    assert.equal(mutationRequests.at(-1).body.reasonCode, "SECURITY_REVIEW");
    assert.equal(Object.hasOwn(mutationRequests.at(-1).body, "actorUserId"), false, "Actor identity must never come from the browser body.");
    await waitFor("!document.querySelector('[data-testid=\"change-status\"]')?.disabled", "actions ready after role refresh");

    await evaluate("document.querySelector('[data-testid=\"change-status\"]')?.click()");
    await waitFor("document.querySelector('[data-testid=\"confirm-mutation\"]')?.textContent?.includes('Confirm account suspension')", "suspension confirmation");
    await chooseReason("COMPROMISED_ACCOUNT");
    await evaluate("document.querySelector('[data-testid=\"confirm-mutation\"]')?.click()");
    await waitFor("document.body.innerText.includes('Account suspended. Revoked 2 active session(s).')", "suspension success");
    assert.equal(managedUser.status, "SUSPENDED");
    await waitFor("!document.querySelector('[data-testid=\"change-status\"]')?.disabled", "actions ready after suspension refresh");

    await evaluate("document.querySelector('[data-testid=\"change-status\"]')?.click()");
    await waitFor("document.querySelector('[data-testid=\"confirm-mutation\"]')?.textContent?.includes('Confirm account reactivation')", "reactivation confirmation");
    await chooseReason("ADMIN_REQUEST");
    await evaluate("document.querySelector('[data-testid=\"confirm-mutation\"]')?.click()");
    await waitFor("document.body.innerText.includes('Account reactivated. Revoked 2 active session(s).')", "reactivation success");
    assert.equal(managedUser.status, "ACTIVE");
    await waitFor("!document.querySelector('[data-testid=\"change-status\"]')?.disabled", "actions ready after reactivation refresh");

    failNextMutation = true;
    await evaluate("document.querySelector('[data-testid=\"change-status\"]')?.click()");
    await waitFor("document.querySelector('[data-testid=\"confirm-mutation\"]')?.textContent?.includes('Confirm account suspension')", "failed suspension confirmation");
    await chooseReason("POLICY_VIOLATION");
    await evaluate("document.querySelector('[data-testid=\"confirm-mutation\"]')?.click()");
    await waitFor("document.querySelector('[role=\"alert\"]')?.textContent?.includes('last active administrator')", "mutation error handling");
    assert.equal(managedUser.status, "ACTIVE", "Failed mutation must not change the mocked account state.");
    await evaluate("document.querySelector('[data-testid=\"cancel-mutation\"]')?.click()");

    await evaluate("document.querySelector('[data-testid=\"revoke-sessions\"]')?.click()");
    await waitFor("document.querySelector('[data-testid=\"confirm-mutation\"]')?.textContent?.includes('Confirm session revocation')", "session revocation confirmation");
    await chooseReason("SECURITY_REVIEW");
    await evaluate("document.querySelector('[data-testid=\"confirm-mutation\"]')?.click()");
    await waitFor("document.body.innerText.includes('Revoked 2 active session(s).')", "session revocation success");
    assert.equal(mutationRequests.at(-1).method, "POST");
    assert.ok(mutationRequests.at(-1).path.endsWith("/revoke-sessions"));
    assert.equal(mutationRequests.length, 5, "Expected four successful mutations and one handled denial.");

    const expectedRefreshCalls = callsBeforeMutations + 4;
    const refreshDeadline = Date.now() + 10000;
    while (adminUsersCalls < expectedRefreshCalls && Date.now() < refreshDeadline) await delay(50);
    assert.ok(adminUsersCalls >= expectedRefreshCalls, "Successful mutations must refresh the directory.");

    const callsBeforeNonAdmin = adminUsersCalls;
    currentRole = "USER";
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    }, sessionId);
    await navigate("/admin/users?browserCase=non-admin");
    await waitFor("document.querySelector('h1')?.textContent?.includes('Access restricted')", "non-admin access restriction");
    await delay(300);
    assert.equal(adminUsersCalls, callsBeforeNonAdmin, "non-admin UI must not request the admin directory API");
    assert.deepEqual(protocolErrors, [], "mocked API requests must be fulfilled without DevTools errors");
  } catch (error) {
    throw new Error(
      String(error) + "\n--- Next.js logs ---\n" + logs.server + "\n--- Chrome logs ---\n" + logs.chrome,
      { cause: error },
    );
  } finally {
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error("Browser test cleanup."));
    }
    pending.clear();
    try { ws?.close(); } catch {}
    await stopProcess(chrome);
    await stopProcess(server);
    if (profileDir) await rm(profileDir, { recursive: true, force: true });
  }
});
