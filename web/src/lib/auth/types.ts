export type AuthUser = {
  id: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
};

export type AuthResult = {
  accessToken?: string;
  mfaRequired?: boolean;
  challengeToken?: string;
  mfaExpiresInSeconds?: number;
};

export type ApiError = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};
