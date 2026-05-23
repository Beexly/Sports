import { describe, expect, it } from "vitest";
import {
  vaultAccessRequiredResponse,
  vaultAdminRequiredResponse,
  vaultWebhookNotEnabledResponse,
  vaultWriteNotEnabledResponse,
} from "./api";

describe("Vault API error responses", () => {
  it("builds fail-closed access and admin responses", async () => {
    const access = vaultAccessRequiredResponse();
    const admin = vaultAdminRequiredResponse();

    await expect(access.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "VAULT_ACCESS_REQUIRED",
        message: "Vault membership is required.",
      },
    });
    expect(access.status).toBe(401);

    await expect(admin.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "VAULT_ADMIN_REQUIRED",
        message: "Vault admin access is required.",
      },
    });
    expect(admin.status).toBe(403);
  });

  it("builds fail-closed scaffold responses for writes and webhooks", async () => {
    const write = vaultWriteNotEnabledResponse();
    const webhook = vaultWebhookNotEnabledResponse();

    expect(write.status).toBe(501);
    expect(webhook.status).toBe(501);
  });
});
