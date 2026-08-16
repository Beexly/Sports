import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveStatsBillingTier } from "../session-tier.js";

/**
 * Unit tests for the GSE billing-tier resolver.
 *
 * Pins the GSE-SEC-018 fix: an anonymous request must NEVER be elevated by the
 * `?tier=` query param, even when the GSE_ALLOW_QUERY_TIER=1 escape hatch (or
 * the allowQueryOnly opt-in) is set — and especially not in production, where
 * the env flag is the dangerous surface (an attacker simply sends ?tier=ELITE).
 *
 * Session authority (auth + Stripe entitlements) is mocked so we isolate the
 * anonymous / query-only tier resolution logic.
 */

// Anonymous by default: auth() rejects → no user
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// getUserEntitlements is only reached inside the session branch, so a no-op mock
// is sufficient and keeps this test hermetic.
vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: vi.fn(),
}));

vi.mock("@sports/types", () => ({
  getEntitlements: vi.fn(() => ({ tier: "FREE" })),
}));

vi.mock("@sports/stats-api", () => ({
  parseBillingTier: vi.fn(
    (raw: string | null | undefined): string => {
      const t = (raw ?? "FREE").toUpperCase();
      if (t === "PRO" || t === "ELITE" || t === "FANTASY" || t === "FREE") return t;
      return "FREE";
    },
  ),
}));

function makeReq(tierParam: string | null) {
  const searchParams = {
    get: (name: string) => (name === "tier" ? tierParam : null),
  };
  return { nextUrl: { searchParams } } as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GSE_ALLOW_QUERY_TIER", "0");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveStatsBillingTier — anonymous query spoof (GSE-SEC-018)", () => {
  it("spoofs to FREE and blocks when ?tier=PRO sent anonymously (no flag)", async () => {
    const out = await resolveStatsBillingTier(makeReq("PRO"));
    expect(out.tier).toBe("FREE");
    expect(out.source).toBe("query_ignored");
    expect(out.spoofBlocked).toBe(true);
  });

  it("spoofs to FREE even when GSE_ALLOW_QUERY_TIER=1 — unless NODE_ENV=production", async () => {
    vi.stubEnv("GSE_ALLOW_QUERY_TIER", "1");
    vi.stubEnv("NODE_ENV", "test");

    // Non-production: flag honored (dev escape hatch)
    const dev = await resolveStatsBillingTier(makeReq("ELITE"));
    expect(dev.tier).toBe("ELITE");
    expect(dev.source).toBe("query_dev");
    expect(dev.spoofBlocked).toBe(false);

    // Production: flag MUST be ignored → spoof blocked
    vi.stubEnv("NODE_ENV", "production");
    const prod = await resolveStatsBillingTier(makeReq("ELITE"));
    expect(prod.tier).toBe("FREE");
    expect(prod.source).toBe("query_ignored");
    expect(prod.spoofBlocked).toBe(true);
  });

  it("honors allowQueryOnly opt-in in non-production but ignores it in production", async () => {
    // allowQueryOnly is an internal-tooling bypass — must also be production-gated
    vi.stubEnv("NODE_ENV", "test");
    const devBypass = await resolveStatsBillingTier(makeReq("PRO"), {
      allowQueryOnly: true,
    });
    expect(devBypass.tier).toBe("PRO");
    expect(devBypass.source).toBe("query_dev");

    // Production: the bypass is NOT a backdoor
    vi.stubEnv("NODE_ENV", "production");
    const prodBypass = await resolveStatsBillingTier(makeReq("PRO"), {
      allowQueryOnly: true,
    });
    expect(prodBypass.tier).toBe("FREE");
    expect(prodBypass.source).toBe("query_ignored");
    expect(prodBypass.spoofBlocked).toBe(true);
  });

  it("returns FREE/default when no ?tier= is present", async () => {
    const out = await resolveStatsBillingTier(makeReq(null));
    expect(out.tier).toBe("FREE");
    expect(out.source).toBe("default");
    expect(out.spoofBlocked).toBe(false);
  });
});
