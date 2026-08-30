import { describe, expect, it } from "vitest";
import { jsonNoStore } from "@/lib/api/no-store";

/**
 * A kill switch you cannot reliably close is not a kill switch.
 *
 * The public picks gate responses carried no cache headers, so a cached 503
 * could keep the surface dark after PUBLIC_PICKS is flipped ON, and — the
 * dangerous direction — a cached 200 slate could keep serving after
 * FORCE_NO_BET_IF_STALE fires. The 200 body is also per-viewer (meta.tier,
 * canSeeConfidence, tier-filtered data), so a shared cache entry is a paywall
 * bypass at the edge (CLAUDE.md #3) on top of a staleness leak (#5).
 */
describe("jsonNoStore", () => {
  it("marks every response uncacheable, whatever the status", () => {
    for (const status of [200, 429, 503]) {
      const res = jsonNoStore({ ok: true }, { status });
      expect(res.status).toBe(status);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    }
  });

  it("defaults to 200 when no status is given", () => {
    const res = jsonNoStore({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("keeps caller headers but never lets them re-enable caching", () => {
    const res = jsonNoStore(
      { error: "slow down" },
      { status: 429, headers: { "Retry-After": "30", "Cache-Control": "public, max-age=600" } },
    );
    // The caller's Retry-After survives...
    expect(res.headers.get("Retry-After")).toBe("30");
    // ...but a cacheable Cache-Control cannot win. no-store is applied last.
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("Cache-Control")).not.toContain("max-age=600");
  });

  it("still serializes the body it was handed", async () => {
    const res = jsonNoStore({ reason: "feature_gate", bootstrapMode: false }, { status: 503 });
    await expect(res.json()).resolves.toEqual({
      reason: "feature_gate",
      bootstrapMode: false,
    });
  });
});
