import { describe, it, expect, vi, afterEach } from "vitest";
import type { OddsInput } from "@sports/types";

/**
 * Shadow guarantee for the independent estimator wiring.
 *
 * The estimator must NEVER move the published number. With the flag off
 * (production default) the output is byte-identical to today (trueEvScore /
 * fairProbability stay null). With the flag on, the two diagnostic fields
 * populate but confidence / tier / grade are unchanged.
 */
function spreadFixture(): OddsInput {
  return {
    gameId: "g1",
    homeTeam: "Home",
    awayTeam: "Away",
    commenceTime: new Date("2026-01-01T00:00:00Z"),
    sport: "americanfootball_nfl",
    bookmakerOdds: Array.from({ length: 6 }, (_, i) => ({
      bookmaker: `book-${i}`,
      market: "SPREADS" as const,
      spread: -3.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    })),
  };
}

async function scoreWith(flag: boolean) {
  vi.resetModules();
  if (flag) {
    process.env["SHADOW_INDEPENDENT_ESTIMATOR_ENABLED"] = "true";
  } else {
    delete process.env["SHADOW_INDEPENDENT_ESTIMATOR_ENABLED"];
  }
  const mod = await import("../scoring.js");
  return mod.scoreGame(spreadFixture());
}

afterEach(() => {
  delete process.env["SHADOW_INDEPENDENT_ESTIMATOR_ENABLED"];
});

describe("shadow independent estimator wiring", () => {
  it("by default leaves trueEvScore/fairProbability null (byte-identical published output)", async () => {
    const picks = await scoreWith(false);
    expect(picks.length).toBeGreaterThan(0);
    for (const p of picks) {
      expect(p.factorBreakdown.trueEvScore).toBeNull();
      expect(p.factorBreakdown.fairProbability).toBeNull();
    }
  });

  it("when enabled, populates the shadow fields WITHOUT moving the published number", async () => {
    const off = await scoreWith(false);
    const on = await scoreWith(true);
    expect(on.length).toBe(off.length);
    expect(on.length).toBeGreaterThan(0);
    for (let i = 0; i < on.length; i++) {
      expect(typeof on[i]!.factorBreakdown.fairProbability).toBe("number");
      expect(typeof on[i]!.factorBreakdown.trueEvScore).toBe("number");
      // SHADOW: the published outputs are identical with the flag on vs off.
      expect(on[i]!.confidence).toBe(off[i]!.confidence);
      expect(on[i]!.tier).toBe(off[i]!.tier);
      expect(on[i]!.pickGrade).toBe(off[i]!.pickGrade);
      expect(on[i]!.edgeScore).toBe(off[i]!.edgeScore);
    }
  });
});
