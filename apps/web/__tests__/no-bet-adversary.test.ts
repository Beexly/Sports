import { describe, it, expect } from "vitest";
import { buildNoBetAdversary, type AdversaryInput } from "@/lib/picks/no-bet-adversary";

function clean(overrides: Partial<AdversaryInput> = {}): AdversaryInput {
  return {
    bookmakerCount: 8,
    lineMovementPoints: 0.5,
    injuryUncertain: false,
    dataAgeMinutes: 10,
    confidence: 78,
    missingKeySource: false,
    modelsDisagree: false,
    highPublicNarrative: false,
    scheduleAmbiguous: false,
    ...overrides,
  };
}

describe("no-bet adversary engine", () => {
  it("PLAY when no serious opposition surfaces", () => {
    const v = buildNoBetAdversary(clean());
    expect(v.recommendation).toBe("PLAY");
    expect(v.cases).toEqual([]);
    expect(v.strongestFactor).toBeNull();
  });

  it("downgrades to NO_BET on any HIGH-severity factor (injury)", () => {
    const v = buildNoBetAdversary(clean({ injuryUncertain: true }));
    expect(v.recommendation).toBe("NO_BET");
    expect(v.strongestFactor).toBe("INJURY_UNCERTAINTY");
    expect(v.summary).toMatch(/no-bet/i);
  });

  it("downgrades to NO_BET on stale data and thin single-book coverage", () => {
    expect(buildNoBetAdversary(clean({ dataAgeMinutes: 600 })).recommendation).toBe("NO_BET");
    expect(buildNoBetAdversary(clean({ bookmakerCount: 1 })).recommendation).toBe("NO_BET");
  });

  it("downgrades to WATCHLIST on a MEDIUM factor (thin-ish coverage)", () => {
    const v = buildNoBetAdversary(clean({ bookmakerCount: 2 }));
    expect(v.recommendation).toBe("WATCHLIST");
    expect(v.cases.map((c) => c.factor)).toContain("THIN_BOOK_COVERAGE");
  });

  it("flags a volatile line and escalates with magnitude", () => {
    expect(buildNoBetAdversary(clean({ lineMovementPoints: 4 })).recommendation).toBe("WATCHLIST");
    expect(buildNoBetAdversary(clean({ lineMovementPoints: 9 })).recommendation).toBe("NO_BET");
  });

  it("only ever subtracts — LOW-only factors stay PLAY but record the case", () => {
    const v = buildNoBetAdversary(clean({ highPublicNarrative: true, scheduleAmbiguous: true }));
    expect(v.recommendation).toBe("PLAY");
    expect(v.cases.length).toBe(2);
    expect(v.cases.every((c) => c.severity === "LOW")).toBe(true);
  });

  it("picks the strongest factor across the case set", () => {
    const v = buildNoBetAdversary(clean({ scheduleAmbiguous: true, injuryUncertain: true }));
    expect(v.strongestFactor).toBe("INJURY_UNCERTAINTY"); // HIGH beats LOW
  });
});
