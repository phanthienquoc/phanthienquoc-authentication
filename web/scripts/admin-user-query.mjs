export function buildAdminUsersPath(params = {}) {
  const search = new URLSearchParams();
  const query = params.query?.trim();

  if (query) search.set("query", query);
  if (params.role) search.set("role", params.role);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 25));

  return `/api/admin/users?${search.toString()}`;
}
