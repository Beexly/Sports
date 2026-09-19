import { describe, expect, it } from "vitest";
import {
  TURNOVER_LUCK_METHOD_TAG,
  TURNOVER_LUCK_K_FF,
  TURNOVER_LUCK_K_INT,
  RECOVERY_BASELINE,
  RECOVERY_LOST_BASELINE,
  MIN_FUMBLES_FOR_VERDICT,
  evaluateTurnoverLuck,
  evaluateTurnoverLuckOne,
  type TeamTurnoverObservation,
} from "../signals/luck/turnover-luck.js";

const obs = (team: string, fumbles: number, fumblesLost: number): TeamTurnoverObservation => ({
  team,
  fumbles,
  fumblesLost,
});

describe("turnover-luck method tag and constants", () => {
  it("exports the frozen method tag and pre-registered constants", () => {
    expect(TURNOVER_LUCK_METHOD_TAG).toBe("turnover_luck_v1");
    expect(TURNOVER_LUCK_K_FF).toBe(200);
    expect(TURNOVER_LUCK_K_INT).toBe(150);
    // kept-share league baseline, pooled 2019-2025 REG (3,817/6,958); the locked
    // 46.3% is the defense-side complement and is exported as RECOVERY_LOST_BASELINE.
    expect(RECOVERY_BASELINE).toBeCloseTo(0.5488, 4);
    expect(RECOVERY_LOST_BASELINE).toBeCloseTo(0.4512, 4);
    expect(MIN_FUMBLES_FOR_VERDICT).toBe(2);
  });
});

describe("turnover-luck shrinkage math", () => {
  it("shrinks a 0% recovery share on 4 fumbles toward the kept baseline", () => {
    const r = evaluateTurnoverLuckOne(obs("TB", 4, 4));
    expect(r.recoveredShare).toBe(0);
    expect(r.shrunkRecoveryShare).toBeCloseTo((200 * RECOVERY_BASELINE) / 204, 4);
    expect(r.expectedLostShare).toBeCloseTo(1 - (200 * RECOVERY_BASELINE) / 204, 4);
    expect(r.verdict).toBe("UNLUCKY");
    expect(r.lowSample).toBe(false);
  });

  it("shrinks a 100% recovery share on 2 fumbles toward the kept baseline", () => {
    const r = evaluateTurnoverLuckOne(obs("KC", 2, 0));
    expect(r.recoveredShare).toBe(1);
    expect(r.shrunkRecoveryShare).toBeCloseTo((2 + 200 * RECOVERY_BASELINE) / 202, 4);
    expect(r.verdict).toBe("LUCKY");
  });

  it("regresses harder when the raw share is extreme, monotonically in sample size", () => {
    // same raw share 0%, more fumbles -> shrunk estimate pulled further toward raw
    const two = evaluateTurnoverLuckOne(obs("A", 2, 2)).shrunkRecoveryShare;
    const four = evaluateTurnoverLuckOne(obs("B", 4, 4)).shrunkRecoveryShare;
    expect(four).toBeLessThan(two);
    expect(two).toBeLessThan(RECOVERY_BASELINE);
  });

  it("keeps the shrunk share on the correct side of the baseline for both extremes", () => {
    const lucky = evaluateTurnoverLuckOne(obs("BUF", 3, 0)).shrunkRecoveryShare;
    const unlucky = evaluateTurnoverLuckOne(obs("TB", 4, 4)).shrunkRecoveryShare;
    expect(lucky).toBeGreaterThan(RECOVERY_BASELINE);
    expect(unlucky).toBeLessThan(RECOVERY_BASELINE);
  });
});

describe("turnover-luck verdicts and the low-sample floor", () => {
  it("flags n=1 extremes as NEUTRAL + lowSample (one fumble is noise, not signal)", () => {
    const bal = evaluateTurnoverLuckOne(obs("BAL", 1, 1));
    const nyj = evaluateTurnoverLuckOne(obs("NYJ", 1, 0));
    expect(bal.recoveredShare).toBe(0);
    expect(bal.verdict).toBe("NEUTRAL");
    expect(bal.lowSample).toBe(true);
    expect(nyj.recoveredShare).toBe(1);
    expect(nyj.verdict).toBe("NEUTRAL");
    expect(nyj.lowSample).toBe(true);
  });

  it("marks verdict boundaries at 0.75 / 0.25 raw share with n >= 2", () => {
    expect(evaluateTurnoverLuckOne(obs("H", 4, 1)).verdict).toBe("LUCKY"); // 3/4 = 0.75
    expect(evaluateTurnoverLuckOne(obs("L", 4, 3)).verdict).toBe("UNLUCKY"); // 1/4 = 0.25
    expect(evaluateTurnoverLuckOne(obs("M", 2, 1)).verdict).toBe("NEUTRAL"); // 0.50
  });

  it("treats zero fumbles as no information (null share, baseline expectation)", () => {
    const r = evaluateTurnoverLuckOne(obs("Z", 0, 0));
    expect(r.recoveredShare).toBeNull();
    expect(r.shrunkRecoveryShare).toBeCloseTo(RECOVERY_BASELINE, 4);
    expect(r.expectedLostShare).toBeCloseTo(RECOVERY_LOST_BASELINE, 4);
    expect(r.verdict).toBe("NEUTRAL");
    expect(r.lowSample).toBe(true);
  });
});

describe("turnover-luck fail-closed behavior", () => {
  it("throws when fumblesLost exceeds fumbles (impossible)", () => {
    expect(() => evaluateTurnoverLuckOne(obs("X", 1, 2))).toThrow(/cannot exceed/);
  });

  it("throws on negative, non-integer, or non-finite counts", () => {
    expect(() => evaluateTurnoverLuckOne(obs("X", -1, 0))).toThrow(/fumbles/);
    expect(() => evaluateTurnoverLuckOne(obs("X", 1.5, 0))).toThrow(/fumbles/);
    expect(() => evaluateTurnoverLuckOne(obs("X", Number.NaN, 0))).toThrow(/fumbles/);
    expect(() => evaluateTurnoverLuckOne(obs("X", Infinity, 0))).toThrow(/fumbles/);
    expect(() => evaluateTurnoverLuckOne(obs("X", 2, Number.NaN))).toThrow(/fumblesLost/);
  });

  it("throws on an empty team identifier", () => {
    expect(() => evaluateTurnoverLuckOne(obs("  ", 2, 1))).toThrow(/team/);
  });
});

describe("turnover-luck batch: 2026 weeks 1-2 measured extremes", () => {
  // Counts transcribed from the measured production extract
  // (docs/research/2026-09-19-opp-adj-epa-path/data/turnover_luck_2026.csv).
  const fixtures: readonly TeamTurnoverObservation[] = [
    obs("TB", 4, 4),
    obs("CHI", 2, 2),
    obs("HOU", 2, 2),
    obs("BAL", 1, 1),
    obs("CAR", 1, 1),
    obs("KC", 2, 0),
    obs("BUF", 3, 0),
    obs("ATL", 2, 0),
    obs("NYJ", 1, 0),
  ];

  it("classifies the 2+ fumble extremes and floors the n=1 rows", () => {
    const batch = evaluateTurnoverLuck(fixtures);
    expect(batch.methodTag).toBe("turnover_luck_v1");
    expect(batch.readings).toHaveLength(fixtures.length);
    expect(batch.lucky).toEqual(["KC", "BUF", "ATL"]);
    expect(batch.unlucky).toEqual(["TB", "CHI", "HOU"]);
    expect(batch.lowSampleTeams).toEqual(["BAL", "CAR", "NYJ"]);
  });

  it("compresses every extreme toward the 50% baseline", () => {
    const batch = evaluateTurnoverLuck(fixtures);
    for (const r of batch.readings) {
      expect(Math.abs(r.shrunkRecoveryShare - RECOVERY_BASELINE)).toBeLessThan(0.02);
    }
  });
});
