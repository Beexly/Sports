import { describe, it, expect } from "vitest";
import { buildMarketMemory, type MarketMemoryInput } from "@/lib/market/market-memory";
import { computeSpreadClv, computeTotalClv } from "@sports/prediction-engine";

function base(overrides: Partial<MarketMemoryInput> = {}): MarketMemoryInput {
  return {
    openLine: -3,
    lockLine: -3,
    currentLine: -3.5,
    closeLine: -4,
    betterForUsIsLower: true, // we want the line to go DOWN
    ...overrides,
  };
}

describe("market memory engine", () => {
  // clvVsCloseFavorable answers "did we beat the close" (clv.ts's convention),
  // which is the OPPOSITE sign from "did the line move toward a number that's
  // good to hold" — beating the close means the market moved AWAY from
  // favorable after we locked (a later bettor gets our side's WORSE number).
  // These three cases were previously asserting the inverted (movement-style)
  // sign under the CLV field's name; corrected to match clv.ts, and pinned
  // against clv.ts's own functions directly below so this can't drift back.
  it("orients movement to the side we took (lower is better here)", () => {
    const m = buildMarketMemory(base());
    // lock -3 → close -4: the line got even lower (better for a new entrant on
    // this "lower is better" side), so OUR lock was the worse number — we lost
    // to the close, not beat it.
    expect(m.clvVsCloseFavorable).toBe(-1);
    expect(m.favorableSinceLock).toBe(true); // -3 → -3.5 is still favorable-so-far, a separate question
  });

  it("reports a beat-the-close when the close moved to a worse number for our side", () => {
    const m = buildMarketMemory(base({ currentLine: -2.5, closeLine: -2 }));
    // lock -3 → close -2: the close is a WORSE (higher) number on a
    // "lower is better" side, so a new entrant gets a worse deal than us —
    // we beat the close.
    expect(m.clvVsCloseFavorable).toBe(1);
    expect(m.favorableSinceLock).toBe(false);
  });

  it("flips orientation when higher is better", () => {
    const m = buildMarketMemory(base({ betterForUsIsLower: false, lockLine: 44, closeLine: 46, currentLine: 45, openLine: 43 }));
    // lock 44 → close 46: the close is a BETTER (higher) number on a
    // "higher is better" side than what we locked, so a new entrant beats us —
    // we lost to the close.
    expect(m.clvVsCloseFavorable).toBe(-2);
  });

  // Anchor directly to clv.ts's own worked docstring examples (the live,
  // production-wired CLV engine — packages/prediction-engine/src/clv.ts) so a
  // future edit here can never silently re-invert against the authoritative
  // computation. Same numbers, same sides, same expected verdicts.
  it("matches clv.ts's computeSpreadClv exactly — HOME beats the close", () => {
    // clv.ts docstring: bet home -3, close moves to home -4 -> BEAT_CLOSE, clvPoints +1.
    const clv = computeSpreadClv(-3, -4, "HOME");
    const m = buildMarketMemory(
      base({ betterForUsIsLower: false, openLine: -3, lockLine: -3, currentLine: -3, closeLine: -4 })
    );
    expect(clv.verdict).toBe("BEAT_CLOSE");
    expect(m.clvVsCloseFavorable).toBe(clv.clvPoints);
  });

  it("matches clv.ts's computeSpreadClv exactly — AWAY loses to the close", () => {
    // clv.ts docstring: bet away -3 (home +3); close moves to away -2 (home +2) -> LOST_TO_CLOSE, clvPoints -1.
    const clv = computeSpreadClv(3, 2, "AWAY");
    const m = buildMarketMemory(
      base({ betterForUsIsLower: true, openLine: 3, lockLine: 3, currentLine: 3, closeLine: 2 })
    );
    expect(clv.verdict).toBe("LOST_TO_CLOSE");
    expect(m.clvVsCloseFavorable).toBe(clv.clvPoints);
  });

  it("matches clv.ts's computeTotalClv exactly — OVER beats the close", () => {
    // OVER locks the cheaper (lower) total; close rising to 50.5 from 48.5 means
    // a later OVER bettor needs more points -> we beat the close, clvPoints +2.
    const clv = computeTotalClv(48.5, 50.5, "OVER");
    const m = buildMarketMemory(
      base({ betterForUsIsLower: true, openLine: 48.5, lockLine: 48.5, currentLine: 48.5, closeLine: 50.5 })
    );
    expect(clv.verdict).toBe("BEAT_CLOSE");
    expect(m.clvVsCloseFavorable).toBe(clv.clvPoints);
  });

  it("matches clv.ts's computeTotalClv exactly — UNDER loses to the close", () => {
    // UNDER wants a HIGH locked total; close rising to 50.5 from 48.5 means a
    // later UNDER bettor gets an even more favorable (higher) number than we
    // got -> we lost to the close.
    const clv = computeTotalClv(48.5, 50.5, "UNDER");
    const m = buildMarketMemory(
      base({ betterForUsIsLower: false, openLine: 48.5, lockLine: 48.5, currentLine: 48.5, closeLine: 50.5 })
    );
    expect(clv.verdict).toBe("LOST_TO_CLOSE");
    expect(m.clvVsCloseFavorable).toBe(clv.clvPoints);
  });

  it("leaves close-dependent metrics null until close", () => {
    const m = buildMarketMemory(base({ closeLine: null }));
    expect(m.clvVsCloseFavorable).toBeNull();
    expect(m.openToCloseFavorable).toBeNull();
  });

  it("computes favorable velocity from timed snapshots", () => {
    const m = buildMarketMemory(
      base({
        snapshots: [
          { atIso: "2026-06-22T12:00:00.000Z", line: -3 },
          { atIso: "2026-06-22T14:00:00.000Z", line: -4 }, // dropped 1 pt over 2h, favorable
        ],
      })
    );
    expect(m.velocityFavorablePerHour).toBeCloseTo(0.5, 4);
  });

  it("never permits sharp-money language unless a sourced split is provided", () => {
    const noSplit = buildMarketMemory(base());
    expect(noSplit.mayUseSharpLanguage).toBe(false);
    expect(noSplit.note).toMatch(/not attributed to sharp\/public money/i);

    const sourced = buildMarketMemory(base({ sharpSplitSourced: true }));
    expect(sourced.mayUseSharpLanguage).toBe(true);
    expect(sourced.note).not.toMatch(/not attributed/i);
  });

  it("never reports negative book disagreement", () => {
    expect(buildMarketMemory(base({ bookDisagreementPoints: -5 })).bookDisagreementPoints).toBe(0);
  });
});
