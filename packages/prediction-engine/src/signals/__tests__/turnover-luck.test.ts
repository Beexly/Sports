import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeTurnoverLuck,
  DEFAULT_LEAGUE_BASELINE,
  shrinkToLeagueMean,
  DEFAULT_LEAGUE_RECOVERY_SHARE,
  DEFAULT_POINTS_PER_TURNOVER,
  type TurnoverLuckInput,
} from "../turnover-luck.js";

/** Synthetic fixture -- NOT live data. A plausible full-sample team-season input. */
function input(overrides: Partial<TurnoverLuckInput> = {}): TurnoverLuckInput {
  return {
    team: "SYN",
    defensivePlays: 900,
    opponentDropbacks: 500,
    fumblesForced: 12,
    fumblesRecoveredByTeam: 6,
    interceptions: 12,
    ...overrides,
  };
}

describe("shrinkToLeagueMean", () => {
  it("returns the observed value unchanged at strength 0", () => {
    expect(shrinkToLeagueMean(0.9, 0.463, 0)).toBeCloseTo(0.9, 10);
  });

  it("returns the league mean unchanged at strength 1", () => {
    expect(shrinkToLeagueMean(0.9, 0.463, 1)).toBeCloseTo(0.463, 10);
  });

  it("blends linearly at an intermediate strength", () => {
    // 0.9 * 0.1 + 0.463 * 0.9
    expect(shrinkToLeagueMean(0.9, 0.463, 0.9)).toBeCloseTo(0.9 * 0.1 + 0.463 * 0.9, 10);
  });

  it("throws on an out-of-range strength", () => {
    expect(() => shrinkToLeagueMean(0.9, 0.463, 1.1)).toThrow(RangeError);
    expect(() => shrinkToLeagueMean(0.9, 0.463, -0.01)).toThrow(RangeError);
  });

  it("throws on a non-finite strength", () => {
    expect(() => shrinkToLeagueMean(0.9, 0.463, Number.NaN)).toThrow(RangeError);
  });
});

describe("computeTurnoverLuck -- null-not-neutral invariant", () => {
  it("returns null (not a neutral/zero result) when defensivePlays is below the minimum", () => {
    const result = computeTurnoverLuck(input({ defensivePlays: 50 }));
    expect(result).toBeNull();
  });

  it("returns null when opponentDropbacks is below the minimum", () => {
    const result = computeTurnoverLuck(input({ opponentDropbacks: 5 }));
    expect(result).toBeNull();
  });

  it("returns null on non-finite counting inputs rather than coercing them", () => {
    expect(computeTurnoverLuck(input({ fumblesForced: Number.NaN }))).toBeNull();
    expect(computeTurnoverLuck(input({ interceptions: Number.POSITIVE_INFINITY }))).toBeNull();
  });

  it("returns null on negative counting inputs (malformed, never clamped)", () => {
    expect(computeTurnoverLuck(input({ fumblesForced: -1 }))).toBeNull();
  });

  it("returns null when recovered-by-team exceeds forced (impossible input)", () => {
    expect(computeTurnoverLuck(input({ fumblesForced: 5, fumblesRecoveredByTeam: 6 }))).toBeNull();
  });

  it("nulls ONLY the recovery half, not the whole result, when fumblesForced is below its own minimum", () => {
    const result = computeTurnoverLuck(input({ fumblesForced: 3, fumblesRecoveredByTeam: 1 }));
    expect(result).not.toBeNull();
    expect(result?.recovery).toBeNull();
    // Occurrence must still be populated -- a thin recovery sample does not
    // disqualify the (independently gated) occurrence read.
    expect(result?.occurrence.forcedFumbleRatePerPlay).toBeCloseTo(3 / 900, 10);
  });

  it("a null result must never be mistaken for a populated zero-deviation result: shape check", () => {
    const thin = computeTurnoverLuck(input({ defensivePlays: 10 }));
    const full = computeTurnoverLuck(input({ fumblesForced: 0, fumblesRecoveredByTeam: 0, interceptions: 0 }));
    expect(thin).toBeNull();
    // A team that forced/recovered/intercepted literally nothing over a
    // full sample is a REAL, populated (non-null) result with negative
    // occurrence deviations -- categorically different from "no data".
    expect(full).not.toBeNull();
    expect(full?.occurrence.forcedFumbleOverExpected).toBeLessThan(0);
  });
});

describe("computeTurnoverLuck -- occurrence component", () => {
  it("computes rates per the correct opportunity denominator", () => {
    const result = computeTurnoverLuck(input({ fumblesForced: 18, defensivePlays: 900 }));
    expect(result?.occurrence.forcedFumbleRatePerPlay).toBeCloseTo(18 / 900, 10);
    const result2 = computeTurnoverLuck(input({ interceptions: 15, opponentDropbacks: 500 }));
    expect(result2?.occurrence.interceptionRatePerDropback).toBeCloseTo(15 / 500, 10);
  });

  it("reports occurrence deviation at face value (unshrunk)", () => {
    const baseline = { forcedFumbleRatePerPlay: 0.01, interceptionRatePerDropback: 0.02, recoveryShare: 0.463 };
    const result = computeTurnoverLuck(input({ fumblesForced: 18, defensivePlays: 900 }), {
      leagueBaseline: baseline,
    });
    // 18/900 = 0.02, baseline 0.01 -> deviation exactly 0.01, no shrinkage applied.
    expect(result?.occurrence.forcedFumbleOverExpected).toBeCloseTo(0.01, 10);
  });
});

describe("computeTurnoverLuck -- recovery component and the worked case", () => {
  it("reproduces this repo's own lab worked case in sign and rough magnitude", () => {
    // 19 forced fumbles, +6.5 over expectation on defensivePlays consistent
    // with a full-season sample; recovered only 26.3% against the module's
    // own 46.3% default league baseline (~20 points below).
    const defensivePlays = 1000;
    const forcedRateOverExpected = 6.5 / defensivePlays; // matches "+6.5 over expectation" framing
    const leagueForcedRate = 19 / defensivePlays - forcedRateOverExpected;
    const fumblesForced = 19;
    const fumblesRecoveredByTeam = Math.round(19 * 0.263); // 26.3% recovery share
    const result = computeTurnoverLuck(
      input({ defensivePlays, fumblesForced, fumblesRecoveredByTeam }),
      { leagueBaseline: { forcedFumbleRatePerPlay: leagueForcedRate, interceptionRatePerDropback: 0.024, recoveryShare: DEFAULT_LEAGUE_RECOVERY_SHARE } },
    );
    expect(result).not.toBeNull();
    // Process good: forcing more than expected.
    expect(result?.occurrence.forcedFumbleOverExpected).toBeGreaterThan(0);
    // Results unlucky: recovering well below the league baseline.
    expect(result?.recovery).not.toBeNull();
    expect(result?.recovery?.recoveryShareOverExpected).toBeLessThan(-0.15);
    // Positive regression expected: the shrunk estimate sits between the
    // observed share and the league mean, strictly above the observed share.
    expect(result?.recovery?.regressedRecoveryShare).toBeGreaterThan(result!.recovery!.recoveryShare);
    expect(result?.recovery?.regressedRecoveryShare).toBeLessThan(DEFAULT_LEAGUE_RECOVERY_SHARE);
    // Under-recovering -> positive expected-regression points (good news ahead).
    expect(result?.recovery?.expectedRegressionPoints).toBeGreaterThan(0);
  });

  it("gives a lucky over-recovering team a NEGATIVE expected-regression estimate", () => {
    const result = computeTurnoverLuck(input({ fumblesForced: 12, fumblesRecoveredByTeam: 11 }));
    expect(result?.recovery?.recoveryShareOverExpected).toBeGreaterThan(0);
    expect(result?.recovery?.expectedRegressionPoints).toBeLessThan(0);
  });

  it("shrinks the observed recovery share toward the league baseline using shrinkToLeagueMean directly", () => {
    const result = computeTurnoverLuck(input({ fumblesForced: 12, fumblesRecoveredByTeam: 6 }), {
      recoveryShrinkage: 0.9,
    });
    const expected = shrinkToLeagueMean(6 / 12, DEFAULT_LEAGUE_RECOVERY_SHARE, 0.9);
    expect(result?.recovery?.regressedRecoveryShare).toBeCloseTo(expected, 10);
  });

  it("at shrinkage 0, regressedRecoveryShare equals the raw observed share exactly", () => {
    const result = computeTurnoverLuck(input({ fumblesForced: 12, fumblesRecoveredByTeam: 6 }), {
      recoveryShrinkage: 0,
    });
    expect(result?.recovery?.regressedRecoveryShare).toBeCloseTo(6 / 12, 10);
    expect(result?.recovery?.expectedRegressionPoints).toBeCloseTo(0, 10);
  });

  it("respects a custom pointsPerTurnover override", () => {
    const a = computeTurnoverLuck(input({ fumblesForced: 12, fumblesRecoveredByTeam: 6 }), {
      pointsPerTurnover: DEFAULT_POINTS_PER_TURNOVER,
    });
    const b = computeTurnoverLuck(input({ fumblesForced: 12, fumblesRecoveredByTeam: 6 }), {
      pointsPerTurnover: DEFAULT_POINTS_PER_TURNOVER * 2,
    });
    expect(b?.recovery?.expectedRegressionPoints).toBeCloseTo((a?.recovery?.expectedRegressionPoints ?? 0) * 2, 8);
  });
});

describe("computeTurnoverLuck -- determinism and purity", () => {
  it("is a pure function: identical input yields byte-identical output across calls", () => {
    const i = input({ fumblesForced: 15, fumblesRecoveredByTeam: 5, interceptions: 9 });
    const a = computeTurnoverLuck(i);
    const b = computeTurnoverLuck(i);
    expect(a).toEqual(b);
  });

  it("never mutates the input object", () => {
    const i = input();
    const snapshot = { ...i };
    computeTurnoverLuck(i);
    expect(i).toEqual(snapshot);
  });
});

/**
 * PROVENANCE. The league baseline is subtracted to produce every "over
 * expected" number this module reports, so a wrong baseline does not add
 * noise, it shifts every team the same way. Two of these three constants
 * shipped as invented placeholders (0.0096 and 0.024) and the whole suite
 * stayed green, because nothing checked where they came from. This recomputes
 * them from the measured export committed in this repo, so an invented number
 * cannot pass again.
 */
describe("league baseline provenance", () => {
  const labCsv = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../../docs/research/2026-09-17/gse-lab/defense_detail_2025.csv",
  );

  function pooled(): { ff: number; int: number; teams: number } {
    const lines = fs.readFileSync(labCsv, "utf8").trim().split("\n");
    const header = lines[0]!.split(",");
    const col = (name: string): number => {
      const i = header.indexOf(name);
      if (i < 0) throw new Error(`column "${name}" missing from ${labCsv}`);
      return i;
    };
    const [plays, drops, fumbles, ints] = [
      col("n_plays_def"),
      col("n_dropbacks_def"),
      col("forced_fumbles"),
      col("int_forced"),
    ];
    let tp = 0, td = 0, tf = 0, ti = 0;
    for (const line of lines.slice(1)) {
      const cells = line.split(",");
      tp += Number(cells[plays]);
      td += Number(cells[drops]);
      tf += Number(cells[fumbles]);
      ti += Number(cells[ints]);
    }
    return { ff: tf / tp, int: ti / td, teams: lines.length - 1 };
  }

  it("reads a full 32-team measured season, not a stub", () => {
    expect(pooled().teams).toBe(32);
  });

  it("pins forcedFumbleRatePerPlay to the pooled league total", () => {
    expect(DEFAULT_LEAGUE_BASELINE.forcedFumbleRatePerPlay).toBeCloseTo(pooled().ff, 6);
  });

  it("pins interceptionRatePerDropback to the pooled league total", () => {
    expect(DEFAULT_LEAGUE_BASELINE.interceptionRatePerDropback).toBeCloseTo(pooled().int, 6);
  });

  it("rejects the placeholders it replaced, in case they are ever restored", () => {
    expect(DEFAULT_LEAGUE_BASELINE.forcedFumbleRatePerPlay).not.toBe(0.0096);
    expect(DEFAULT_LEAGUE_BASELINE.interceptionRatePerDropback).not.toBe(0.024);
  });
});
