export type AuthUser = {
  id: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
};

export type AuthResult = {
  accessToken?: string;
  mfaRequired?: boolean;
  userId?: string;
};

export type ApiError = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};
