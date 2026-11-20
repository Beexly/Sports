import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyWhopMembership } from "@/lib/integrations/whop";

describe("Whop paid-membership security boundaries (no free-plan or redirect bypass)", () => {
  const originalFetch = globalThis.fetch;
  const originalWhopKey = process.env.WHOP_API_KEY;
  const originalCompCodes = process.env.WHOP_FOUNDER_COMP_CODES;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalWhopKey === undefined) delete process.env.WHOP_API_KEY;
    else process.env.WHOP_API_KEY = originalWhopKey;
    if (originalCompCodes === undefined) delete process.env.WHOP_FOUNDER_COMP_CODES;
    else process.env.WHOP_FOUNDER_COMP_CODES = originalCompCodes;
    vi.restoreAllMocks();
  });

  it("rejects free proof-room plan (plan_vrJX4trKVp9Qs), redirect forgery, hardcoded comp codes, and raw plan/product/slug tokens", async () => {
    process.env.WHOP_API_KEY = "whop_live_test_key_redacted";
    delete process.env.WHOP_FOUNDER_COMP_CODES;

    const mockFetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/memberships/mem_free_room")) {
        return new Response(
          JSON.stringify({
            id: "mem_free_room",
            status: "active",
            plan_id: "plan_vrJX4trKVp9Qs",
            metadata: { gse_pack_slug: "free-proof-room" },
            plan: { id: "plan_vrJX4trKVp9Qs", initial_price: 0, renewal_price: 0 },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/memberships/mem_paid_vip")) {
        return new Response(
          JSON.stringify({
            id: "mem_paid_vip",
            status: "active",
            plan_id: "plan_paid_pro_monthly",
            product: { title: "GSE Pro Membership" },
            metadata: { gse_pack_slug: "global-multisport-pro" },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "mem_free_member",
              user_id: "user_free_only",
              member_id: "mber_free_only",
              status: "active",
              plan_id: "plan_vrJX4trKVp9Qs",
              product_id: "prod_free_room",
              metadata: { gse_pack_slug: "free-proof-room" },
            },
            {
              id: "mem_paid_real",
              user_id: "user_paid_real",
              member_id: "mber_paid_real",
              status: "active",
              plan_id: "plan_paid_pro_monthly",
              product_id: "prod_paid_pro",
              product: { title: "GSE Pro Monthly" },
              metadata: { gse_pack_slug: "global-multisport-pro" },
            },
          ],
        }),
        { status: 200 },
      );
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    for (const bypass of [
      "whop_redirect_verified",
      "dad100",
      "DAD100",
      "plan_vrJX4trKVp9Qs",
      "free-proof-room",
      "mem_free_room",
      "user_free_only",
      "plan_paid_pro_monthly",
      "prod_paid_pro",
      "global-multisport-pro",
      "week8-all-access",
    ]) {
      expect(await verifyWhopMembership(bypass)).toEqual({ valid: false, tier: "none" });
    }

    expect(await verifyWhopMembership("mem_paid_vip")).toEqual({
      valid: true,
      tier: "GSE Pro Membership",
    });
    expect(await verifyWhopMembership("user_paid_real")).toEqual({
      valid: true,
      tier: "GSE Pro Monthly",
    });
  });

  it("supports WHOP_FOUNDER_COMP_CODES strictly when configured in env", async () => {
    process.env.WHOP_FOUNDER_COMP_CODES = "FOUNDER-ALPHA-2026";
    expect(await verifyWhopMembership("founder-alpha-2026")).toEqual({
      valid: true,
      tier: "founder_comp",
    });
    expect(await verifyWhopMembership("dad100")).toEqual({ valid: false, tier: "none" });
  });

  it("ensures paywall-reveal-card never mints whop_redirect_verified fallback tokens", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "components", "packages", "paywall-reveal-card.tsx"),
      "utf8",
    );
    expect(src).not.toContain("whop_redirect_verified");
  });
});
