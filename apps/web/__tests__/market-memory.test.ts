import { describe, it, expect } from "vitest";
import { buildMarketMemory, type MarketMemoryInput } from "@/lib/market/market-memory";

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
  it("orients movement to the side we took (lower is better here)", () => {
    const m = buildMarketMemory(base());
    // lock -3 → close -4: line dropped 1 pt, favorable since lower is better.
    expect(m.clvVsCloseFavorable).toBe(1);
    expect(m.favorableSinceLock).toBe(true); // -3 → -3.5 is favorable
  });

  it("reports an unfavorable move when the line went the wrong way", () => {
    const m = buildMarketMemory(base({ currentLine: -2.5, closeLine: -2 }));
    expect(m.clvVsCloseFavorable).toBe(-1); // -3 → -2 is against us
    expect(m.favorableSinceLock).toBe(false);
  });

  it("flips orientation when higher is better", () => {
    const m = buildMarketMemory(base({ betterForUsIsLower: false, lockLine: 44, closeLine: 46, currentLine: 45, openLine: 43 }));
    expect(m.clvVsCloseFavorable).toBe(2); // 44 → 46 up, favorable when higher is better
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
