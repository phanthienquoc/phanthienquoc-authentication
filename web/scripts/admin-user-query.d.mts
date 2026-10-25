export type AdminUsersQuery = {
  query?: string;
  role?: "USER" | "ADMIN";
  page?: number;
  limit?: number;
};

export declare function buildAdminUsersPath(params?: AdminUsersQuery): string;
