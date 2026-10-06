import { describe, expect, it } from "vitest";
import {
  computeExpectedTurnoverDiff,
  type ExpectedTurnoverDiffTeam,
} from "../expected-turnover-diff.js";
import type { TurnoverLuckInput } from "../turnover-luck.js";

/**
 * expected_turnover_diff — signal-gap wiring, disabled by default.
 *
 * The underlying decomposition (`computeTurnoverLuck`) is already tested
 * in `turnover-luck.test.ts` for occurrence/recovery sign and shrinkage.
 * This suite pins the ADAPTER contract: flag off = identity/silence,
 * flag on = signed home-minus-away differential, no invented numbers.
 */

function teamInput(over: Partial<TurnoverLuckInput> = {}): TurnoverLuckInput {
  return {
    team: "T",
    defensivePlays: 500,
    opponentDropbacks: 320,
    fumblesForced: 12,
    fumblesRecoveredByTeam: 6,
    interceptions: 8,
    ...over,
  };
}

function team(teamId: string, over: Partial<TurnoverLuckInput> = {}): ExpectedTurnoverDiffTeam {
  return { teamId, input: teamInput({ team: teamId, ...over }) };
}

describe("computeExpectedTurnoverDiff — disabled by default", () => {
  it("returns silence when the flag is omitted or false", () => {
    for (const opts of [{}, { enabled: false }]) {
      const r = computeExpectedTurnoverDiff(team("HOME"), team("AWAY"), opts);
      expect(r.enabled).toBe(false);
      expect(r.expectedTurnoverDiff).toBeNull();
      expect(r.home).toBeNull();
      expect(r.away).toBeNull();
      expect(r.gaps[0]).toMatch(/off/);
    }
  });
});

describe("computeExpectedTurnoverDiff — enabled", () => {
  it("derives a signed home-minus-away differential on healthy samples", () => {
    // Home is unlucky on recoveries (should regress UP); away is lucky
    // (should regress DOWN). Unlucky home → positive expected regression
    // points → positive differential.
    const home = team("HOME", { fumblesForced: 18, fumblesRecoveredByTeam: 3 });
    const away = team("AWAY", { fumblesForced: 6, fumblesRecoveredByTeam: 6 });
    const r = computeExpectedTurnoverDiff(home, away, { enabled: true });

    expect(r.enabled).toBe(true);
    expect(r.expectedTurnoverDiff).not.toBeNull();
    expect(r.home).not.toBeNull();
    expect(r.away).not.toBeNull();
    expect(r.gaps).toEqual([]);
    expect(r.expectedTurnoverDiff!).toBeGreaterThan(0);
  });

  it("is antisymmetric under a home/away swap", () => {
    const home = team("HOME", { fumblesForced: 18, fumblesRecoveredByTeam: 3 });
    const away = team("AWAY", { fumblesForced: 6, fumblesRecoveredByTeam: 6 });
    const forward = computeExpectedTurnoverDiff(home, away, { enabled: true });
    const reverse = computeExpectedTurnoverDiff(away, home, { enabled: true });
    expect(forward.expectedTurnoverDiff!).toBeCloseTo(
      -(reverse.expectedTurnoverDiff!),
      10,
    );
  });

  it("reports null with a named gap when a side has insufficient sample", () => {
    const thin = team("HOME", { defensivePlays: 50, opponentDropbacks: 10 });
    const r = computeExpectedTurnoverDiff(thin, team("AWAY"), { enabled: true });
    expect(r.expectedTurnoverDiff).toBeNull();
    expect(r.gaps.join(" ")).toMatch(/insufficient sample/);
  });

  it("reports null with a named gap when recovery is nulled on thin forced-fumble counts", () => {
    // fumblesForced 3 < minFumblesForced 5 → recovery is null even though
    // the occurrence half is populated.
    const thinRecovery = team("HOME", { fumblesForced: 3, fumblesRecoveredByTeam: 1 });
    const r = computeExpectedTurnoverDiff(thinRecovery, team("AWAY"), { enabled: true });
    expect(r.expectedTurnoverDiff).toBeNull();
    expect(r.gaps.join(" ")).toMatch(/recovery null/);
    // Occurrence is still visible so a caller can see WHY.
    expect(r.home).not.toBeNull();
    expect(r.home!.recovery).toBeNull();
    expect(r.home!.occurrence).toBeTruthy();
  });

  it("never invents a diff from silence (null in, null out)", () => {
    const empty = team("HOME", {
      defensivePlays: 0,
      opponentDropbacks: 0,
      fumblesForced: 0,
      fumblesRecoveredByTeam: 0,
      interceptions: 0,
    });
    const r = computeExpectedTurnoverDiff(empty, team("AWAY"), { enabled: true });
    expect(r.expectedTurnoverDiff).toBeNull();
    expect(r.gaps.length).toBeGreaterThan(0);
  });
});
