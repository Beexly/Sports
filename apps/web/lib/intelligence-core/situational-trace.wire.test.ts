
import { describe, it, expect } from "vitest";
import { runIntelligence, type GameBundle } from "./engine";

describe("situational trace wiring (L2 engine invoked in production spine)", () => {
  it("surfaces a situationTrace on runIntelligence output", () => {
    const bundle: GameBundle = {
      gameId: "test-1",
      sport: "nfl",
      league: "NFL",
      selection: "HOME",
      pickType: "MONEYLINE",
      homeTeam: "PHI",
      awayTeam: "DAL",
      commenceTime: new Date(Date.now() + 86400000).toISOString(),
      market: {
        market: "h2h",
        fairProb: 0.6,
        line: -150,
        bookmakerCount: 6,
        consensusPct: 60,
      },
      homeInjuries: [],
      awayInjuries: [],
      homeNgs: [],
      awayNgs: [],
      homePlayerStats: [],
      awayPlayerStats: [],
      homeRatings: [],
      awayRatings: [],
      weather: [],
      gameSignals: [],
      homeSnaps: [],
      awaySnaps: [],
      modelVersion: "test-v1",
      statedConfidence: 0.6,
    } as unknown as GameBundle;
    const res = runIntelligence(bundle);
    expect(res).toHaveProperty("situationTrace");
    // fail-open contract: trace either ran (ok) or named its reason
    if (res.situationTrace) {
      console.log("TRACE:", JSON.stringify({
        ok: res.situationTrace.ok,
        divergence: res.situationTrace.divergence,
        consistencyPassed: res.situationTrace.consistencyPassed,
        active: res.situationTrace.activeSignals.length,
        dormant: res.situationTrace.dormantSignals.length,
        failReason: res.situationTrace.failReason,
      }));
      expect(typeof res.situationTrace.ok).toBe("boolean");
      if (!res.situationTrace.ok) {
        expect(res.situationTrace.failReason).toBeTruthy();
      } else {
        expect(res.situationTrace.consistencyPassed).not.toBeNull();
      }
    }
  });
});
