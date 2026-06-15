import { describe, it, expect } from "vitest";
import {
  costForModelId,
  tierCosts,
  blendedCost,
  surfaceEconomics,
  internalTierSavings,
  fetchModelCosts,
} from "@/lib/claude-api/model-economics";
import snapshot from "@/__tests__/fixtures/models-dev-snapshot.json";

describe("model economics (models.dev pricing)", () => {
  it("finds a model's cost anywhere in the catalog", () => {
    expect(costForModelId(snapshot, "claude-haiku-4-5-20251001")).toMatchObject({ input: 1, output: 5 });
    expect(costForModelId(snapshot, "claude-sonnet-4-6")).toMatchObject({ input: 3, output: 15 });
    expect(costForModelId(snapshot, "nonexistent-model")).toBeNull();
  });

  it("prices all three Claude tiers", () => {
    const c = tierCosts(snapshot);
    expect(c.haiku.input).toBe(1);
    expect(c.sonnet.input).toBe(3);
    expect(c.opus.input).toBe(6);
  });

  it("computes per-surface savings of the validated flips", () => {
    const econ = surfaceEconomics(snapshot);
    const calib = econ.find((e) => e.surface === "calibration-insight")!;
    // active Sonnet → recommended Haiku: blended 0.75*3+0.25*15=6 → 0.75*1+0.25*5=2 ⇒ 66.7% saved
    expect(calib.activeTier).toBe("sonnet");
    expect(calib.recommendedTier).toBe("haiku");
    expect(calib.savingsFraction).toBeCloseTo((6 - 2) / 6, 5);

    const court = econ.find((e) => e.surface === "model-court")!;
    expect(court.recommendedTier).toBe("opus"); // an upgrade → negative savings
    expect(court.savingsFraction).toBeLessThan(0);

    const studio = econ.find((e) => e.surface === "studio")!;
    expect(studio.savingsFraction).toBe(0); // same tier
  });

  it("prices the internal tier against Sonnet (Groq Llama is far cheaper)", () => {
    const s = internalTierSavings("llama-3.3-70b-versatile", snapshot);
    expect(s).not.toBeNull();
    expect(s!).toBeGreaterThan(0.8); // >80% cheaper than Sonnet (before Groq's free tier)
    expect(internalTierSavings("llama-3.1-8b-instant", snapshot)!).toBeGreaterThan(0.95);
    expect(internalTierSavings("not-a-model", snapshot)).toBeNull();
  });

  it("falls back to the vendored snapshot when models.dev is unreachable", async () => {
    const failing = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    const catalog = await fetchModelCosts({ fetchImpl: failing });
    expect(costForModelId(catalog, "claude-sonnet-4-6")).toMatchObject({ input: 3 });
  });

  it("blendedCost weights input vs output", () => {
    expect(blendedCost({ input: 3, output: 15 }, 0.75)).toBe(6);
  });
});
