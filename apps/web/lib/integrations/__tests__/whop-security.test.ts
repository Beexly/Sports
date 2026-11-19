import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  verifyWhopMembership,
  verifyWhopWebhookSignature,
} from "@/lib/integrations/whop";

describe("Whop integration security boundaries", () => {
  const originalVitest = process.env.VITEST;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalWhopKey = process.env.WHOP_API_KEY;

  afterEach(() => {
    if (originalVitest === undefined) delete process.env.VITEST;
    else process.env.VITEST = originalVitest;

    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;

    if (originalWhopKey === undefined) delete process.env.WHOP_API_KEY;
    else process.env.WHOP_API_KEY = originalWhopKey;
  });

  it("fails closed in production when WHOP_API_KEY is unset and rejects prefix bypasses", async () => {
    delete process.env.VITEST;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.WHOP_API_KEY;

    for (const forged of [
      "whop_vip_attacker",
      "mem_123456789",
      "token_bypass_admin",
      "whop_test_valid_in_prod",
    ]) {
      const verdict = await verifyWhopMembership(forged);
      expect(verdict).toEqual({ valid: false, tier: "none" });
    }
  });

  it("accepts deterministic test tokens only in explicit test runtime", async () => {
    process.env.VITEST = "true";
    const ok = await verifyWhopMembership("whop_test_valid_case");
    expect(ok).toEqual({ valid: true, tier: "standard" });

    const denied = await verifyWhopMembership("whop_test_invalid_case");
    expect(denied).toEqual({ valid: false, tier: "none" });
  });

  it("verifies HMAC-SHA256 webhook signatures cleanly and rejects forgeries", () => {
    const secret = "test_whop_webhook_secret_key";
    const body = JSON.stringify({ action: "payment.succeeded", data: { id: "pay_1" } });
    const hexSig = createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyWhopWebhookSignature(body, hexSig, secret)).toBe(true);
    expect(verifyWhopWebhookSignature(body, `t=1700000000,v1=${hexSig}`, secret)).toBe(true);
    expect(verifyWhopWebhookSignature(body, "v1=00000000000000000000000000000000", secret)).toBe(
      false,
    );
    expect(verifyWhopWebhookSignature(body, hexSig, "")).toBe(false);
  });
});
