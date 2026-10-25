import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminUsersPath } from "./admin-user-query.mjs";

test("defaults to the first bounded directory page", () => {
  assert.equal(buildAdminUsersPath(), "/api/admin/users?page=1&limit=25");
});

test("encodes email search and includes role and pagination", () => {
  assert.equal(
    buildAdminUsersPath({
      query: "  alice+ops@example.com  ",
      role: "ADMIN",
      page: 3,
      limit: 50,
    }),
    "/api/admin/users?query=alice%2Bops%40example.com&role=ADMIN&page=3&limit=50",
  );
});

test("omits an empty search and defaults page and limit independently", () => {
  assert.equal(
    buildAdminUsersPath({ query: "   ", page: 2 }),
    "/api/admin/users?page=2&limit=25",
  );
});
