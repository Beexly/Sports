export type ApiAuthErrorCode =
  | "missing_api_key"
  | "malformed_api_key"
  | "api_key_not_registered"
  | "api_key_inactive"
  | "insufficient_scope"
  | "quota_exhausted"
  | "payload_rights_blocked";

export interface ApiAuthError {
  readonly code: ApiAuthErrorCode;
  readonly message: string;
}

export function apiAuthError(code: ApiAuthErrorCode, message: string): ApiAuthError {
  return { code, message };
}
