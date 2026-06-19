import { describe, it, expect } from "vitest";
import { relativeTime, timeAgo, isStale, compactDate } from "@/lib/utils/relative-time";
import {
  compactNumber,
  formatPct,
  formatPct100,
  formatAmericanOdds,
  formatSigned,
  formatDecimalOdds,
  sigFigs,
  clamp,
  lerp,
  remap,
} from "@/lib/utils/number-format";
import {
  analyzeStreak,
  rollingWinRate,
  multiWindowWinRates,
  boolToOutcomes,
} from "@/lib/analytics/streak";
import {
  computeParlay,
  fairParlayOdds,
  parlayFromOdds,
  parlayNetProfit,
} from "@/lib/analytics/parlay";

// ─── relative-time ────────────────────────────────────────────────────────────

describe("relativeTime", () => {
  const now = new Date("2026-06-19T12:00:00Z").getTime();

  it("returns 'just now' for <5s", () => {
    const result = relativeTime(now - 2000, now);
    expect(result.label).toMatch(/now|second/i);
  });

  it("returns hours ago for hour-old dates", () => {
    const result = relativeTime(now - 2 * 60 * 60 * 1000, now);
    expect(result.unit).toBe("hour");
    expect(result.value).toBe(-2);
  });

  it("returns future for future dates", () => {
    const result = relativeTime(now + 3 * 24 * 60 * 60 * 1000, now);
    expect(result.value).toBeGreaterThan(0);
    expect(result.unit).toBe("day");
  });

  it("timeAgo returns a string", () => {
    expect(typeof timeAgo(now - 60000, now)).toBe("string");
  });

  it("isStale returns true when old enough", () => {
    expect(isStale(now - 5 * 60 * 60 * 1000, 4 * 60 * 60 * 1000, now)).toBe(true);
  });

  it("isStale returns false when fresh", () => {
    expect(isStale(now - 1000, 4 * 60 * 60 * 1000, now)).toBe(false);
  });

  it("compactDate shows year when different", () => {
    const oldDate = new Date("2024-01-15T00:00:00Z");
    const result = compactDate(oldDate, now);
    expect(result).toMatch(/2024/);
  });

  it("compactDate hides year for same year", () => {
    const sameYear = new Date("2026-03-15T00:00:00Z");
    const result = compactDate(sameYear, now);
    expect(result).not.toMatch(/2026/);
  });
});

// ─── number-format ────────────────────────────────────────────────────────────

describe("compactNumber", () => {
  it("1200 → 1.2K", () => expect(compactNumber(1200)).toBe("1.2K"));
  it("1000000 → 1M", () => expect(compactNumber(1_000_000)).toBe("1M"));
  it("2500000000 → 2.5B", () => expect(compactNumber(2_500_000_000)).toBe("2.5B"));
  it("999 stays numeric", () => expect(compactNumber(999)).toBe("999"));
  it("negative handled", () => expect(compactNumber(-2000)).toBe("-2K"));
});

describe("formatPct", () => {
  it("0.7423 → 74.2%", () => expect(formatPct(0.7423)).toBe("74.2%"));
  it("0.5 → 50%", () => expect(formatPct(0.5)).toBe("50%"));
  it("non-finite → —", () => expect(formatPct(NaN)).toBe("—"));
});

describe("formatPct100", () => {
  it("74.2 → 74.2%", () => expect(formatPct100(74.2)).toBe("74.2%"));
  it("50 → 50%", () => expect(formatPct100(50)).toBe("50%"));
});

describe("formatAmericanOdds", () => {
  it("positive gets + prefix", () => expect(formatAmericanOdds(150)).toBe("+150"));
  it("negative stays negative", () => expect(formatAmericanOdds(-110)).toBe("-110"));
  it("0 → EV", () => expect(formatAmericanOdds(0)).toBe("EV"));
});

describe("formatSigned", () => {
  it("positive → +", () => expect(formatSigned(2.3)).toBe("+2.3"));
  it("negative → -", () => expect(formatSigned(-1.5)).toBe("-1.5"));
  it("zero → 0.0", () => expect(formatSigned(0)).toBe("0.0"));
});

describe("sigFigs", () => {
  it("0.00734 to 2 sig figs → 0.0073", () => expect(sigFigs(0.00734, 2)).toBeCloseTo(0.0073, 6));
  it("12345 to 3 sig figs → 12300", () => expect(sigFigs(12345, 3)).toBe(12300));
});

describe("clamp", () => {
  it("clamps above max", () => expect(clamp(150, 0, 100)).toBe(100));
  it("clamps below min", () => expect(clamp(-10, 0, 100)).toBe(0));
  it("passthrough in range", () => expect(clamp(50, 0, 100)).toBe(50));
});

describe("lerp", () => {
  it("t=0 returns a", () => expect(lerp(0, 100, 0)).toBe(0));
  it("t=1 returns b", () => expect(lerp(0, 100, 1)).toBe(100));
  it("t=0.5 returns midpoint", () => expect(lerp(0, 100, 0.5)).toBe(50));
});

describe("remap", () => {
  it("maps 0→100 range to 0→1", () => expect(remap(50, 0, 100, 0, 1)).toBe(0.5));
  it("inverts when outMin > outMax", () => expect(remap(0, 0, 100, 1, 0)).toBe(1));
});

// ─── streak ───────────────────────────────────────────────────────────────────

describe("analyzeStreak", () => {
  it("empty sequence", () => {
    const r = analyzeStreak([]);
    expect(r.wins).toBe(0);
    expect(r.winRate).toBeNull();
    expect(r.currentStreak.type).toBe("none");
  });

  it("all wins", () => {
    const r = analyzeStreak(["win", "win", "win"]);
    expect(r.wins).toBe(3);
    expect(r.longestWinStreak).toBe(3);
    expect(r.currentStreak.type).toBe("win");
    expect(r.currentStreak.length).toBe(3);
  });

  it("mixed sequence", () => {
    const r = analyzeStreak(["win", "loss", "win", "win", "loss"]);
    expect(r.wins).toBe(3);
    expect(r.losses).toBe(2);
    expect(r.winRate).toBeCloseTo(0.6, 5);
    expect(r.longestWinStreak).toBe(2);
    expect(r.currentStreak.type).toBe("loss");
    expect(r.currentStreak.length).toBe(1);
  });

  it("push breaks streak", () => {
    const r = analyzeStreak(["win", "win", "push", "win"]);
    expect(r.longestWinStreak).toBe(2);
    expect(r.currentStreak.type).toBe("win");
  });
});

describe("rollingWinRate", () => {
  const outcomes = boolToOutcomes([true, false, true, true, false]);
  it("window=3 uses last 3 settled", () => {
    const r = rollingWinRate(outcomes, 3);
    expect(r.n).toBe(3);
    expect(r.wins).toBe(2);
  });

  it("window larger than sample uses all", () => {
    const r = rollingWinRate(outcomes, 100);
    expect(r.n).toBe(5);
  });
});

describe("multiWindowWinRates", () => {
  it("returns one entry per window", () => {
    const outcomes = boolToOutcomes([true, false, true]);
    const results = multiWindowWinRates(outcomes, [5, 10]);
    expect(results).toHaveLength(2);
    expect(results[0]!.label).toBe("Last 5");
  });
});

// ─── parlay ───────────────────────────────────────────────────────────────────

describe("computeParlay", () => {
  it("empty legs", () => {
    const r = computeParlay([]);
    expect(r.combinedDecimalOdds).toBe(1);
    expect(r.impliedWinProb).toBe(1);
  });

  it("single leg -110", () => {
    const r = computeParlay([{ americanOdds: -110 }]);
    // -110 American: decimal = 100/110 + 1 = 210/110; implied = 110/210
    expect(r.impliedWinProb).toBeCloseTo(110 / 210, 4);
  });

  it("two legs multiply decimal odds", () => {
    const r = computeParlay([{ americanOdds: -110 }, { americanOdds: -110 }]);
    const singleDecimal = 100 / 110 + 1;
    expect(r.combinedDecimalOdds).toBeCloseTo(singleDecimal * singleDecimal, 4);
  });

  it("estimatedTrueProb is product of trueProbabilities", () => {
    const r = computeParlay([
      { americanOdds: -110, trueProbability: 0.55 },
      { americanOdds: -110, trueProbability: 0.55 },
    ]);
    expect(r.estimatedTrueProb).toBeCloseTo(0.55 * 0.55, 4);
  });

  it("estimatedTrueProb is null when not all provided", () => {
    const r = computeParlay([
      { americanOdds: -110, trueProbability: 0.55 },
      { americanOdds: -110 },
    ]);
    expect(r.estimatedTrueProb).toBeNull();
  });
});

describe("fairParlayOdds", () => {
  it("two 50-50 legs → fair odds of 4.0 decimal", () => {
    const r = fairParlayOdds([0.5, 0.5]);
    expect(r.fairDecimalOdds).toBeCloseTo(4.0, 4);
    expect(r.fairWinProb).toBeCloseTo(0.25, 4);
  });
});

describe("parlayNetProfit", () => {
  it("returns decimal - 1 times stake", () => {
    const profit = parlayNetProfit([-110, -110], 100);
    const expectedDecimal = (100 / 110 + 1) ** 2;
    expect(profit).toBeCloseTo((expectedDecimal - 1) * 100, 2);
  });
});
