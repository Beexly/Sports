import { NextResponse } from "next/server";

export type VaultErrorCode =
  | "VAULT_ACCESS_REQUIRED"
  | "VAULT_ADMIN_REQUIRED"
  | "VAULT_WEBHOOK_NOT_ENABLED"
  | "VAULT_WRITE_NOT_ENABLED";

export function vaultErrorResponse(
  code: VaultErrorCode,
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
    },
    { status },
  );
}

export function vaultAccessRequiredResponse() {
  return vaultErrorResponse(
    "VAULT_ACCESS_REQUIRED",
    "Vault membership is required.",
    401,
  );
}

export function vaultWebhookNotEnabledResponse() {
  return vaultErrorResponse(
    "VAULT_WEBHOOK_NOT_ENABLED",
    "Vault webhook handling is not enabled yet.",
    501,
  );
}

export function vaultWriteNotEnabledResponse() {
  return vaultErrorResponse(
    "VAULT_WRITE_NOT_ENABLED",
    "Vault write actions are not enabled yet.",
    501,
  );
}
