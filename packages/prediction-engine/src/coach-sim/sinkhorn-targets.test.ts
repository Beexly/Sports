import { describe, it, expect } from "vitest";
import {
  sinkhorn,
  sinkhornWithInfo,
  roleCostMatrix,
  applyEpaDropoff,
  validateEpaTable,
  canonicalHash,
  EPA_DROPOFF,
  EPA_DROPOFF_SHA256,
  EPA_FACTOR_MIN,
  EPA_FACTOR_MAX,
  allocateTargets,
  type EligibleTarget,
} from "./sinkhorn-targets.js";
import {
  lockTuesdayCoachBaseline,
  applyInjuryOverlay,
  verifyCoachMindsetUnchanged,
} from "./locked-projection.js";
import { assertTauSealed } from "../2309-00756-inverse-mdp-fourth-down.js";

/**
 * The Seal-Sinkhorn invariant the goal set specifies, plus the transport math
 * underneath it.
 *
 * Honest scoping note: `applyInjuryOverlay` currently reallocates with
 * `allocateTargets` (single-step softmax), NOT with `sinkhorn`. The Sinkhorn and
 * EPA functions below are real and tested, but they are not yet wired into the
 * overlay. So this file proves two separate things and refuses to blur them:
 *
 *   A. The seal invariant DOES hold on the live overlay: tau and the mindset
 *      hash survive an injury advance bit-identically. (It holds partly because
 *      the overlay never reads the decision samples recoverTau would need, so it
 *      structurally cannot re-estimate tau.)
 *
 *   B. The Sinkhorn + EPA math satisfies its own contract — marginals recovered,
 *      entropy keeps every cell positive, EPA factors applied per role, sealed
 *      table hash catches a mid-week edit — when called directly.
 *
 * What this file does NOT claim: that the overlay's execution weights are
 * produced by Sinkhorn. They are not, yet. That wiring is a separate change.
 */

const close = (a: number, b: number, tol = 1e-4): boolean => Math.abs(a - b) <= tol;

describe("Sinkhorn recovers both marginals (the core transport contract)", () => {
  // The goal set's worked example: r=[0.6,0.4], c=[0.3,0.7], C=[[0,1],[1,0]], eps=0.1
  const r = [0.6, 0.4];
  const c = [0.3, 0.7];
  const C = [
    [0, 1],
    [1, 0],
  ];

  it("row sums equal the source marginal r", () => {
    const P = sinkhorn(r, c, C, 0.1);
    expect(P.length).toBe(2);
    for (let i = 0; i < 2; i++) {
      const rowSum = P[i]!.reduce((s, x) => s + x, 0);
      expect(close(rowSum, r[i]!), `row ${i} sum ${rowSum} != ${r[i]}`).toBe(true);
    }
  });

  it("column sums equal the target marginal c", () => {
    const P = sinkhorn(r, c, C, 0.1);
    for (let j = 0; j < 2; j++) {
      const colSum = P[0]![j]! + P[1]![j]!;
      expect(close(colSum, c[j]!), `col ${j} sum ${colSum} != ${c[j]}`).toBe(true);
    }
  });

  it("keeps every cell strictly positive (the entropy term's whole point)", () => {
    const P = sinkhorn(r, c, C, 0.1);
    for (const row of P) for (const x of row) expect(x).toBeGreaterThan(0);
  });

  it("reports convergence with residuals below the sealed tolerance", () => {
    const { info } = sinkhornWithInfo(r, c, C, 0.1);
    expect(info.converged).toBe(true);
    expect(info.rowResidual).toBeLessThan(1e-4);
    expect(info.colResidual).toBeLessThan(1e-4);
  });

  it("rejects mismatched marginal/matrix dimensions instead of guessing", () => {
    expect(() => sinkhorn([0.6, 0.4], [0.3], C, 0.1)).toThrow(/dimension mismatch/);
  });

  it("rejects negative marginals", () => {
    expect(() => sinkhorn([-0.1, 0.4], [0.3, 0.7], C, 0.1)).toThrow(/non-negative/);
  });
});

describe("role cost matrix encodes interchangeability tiers", () => {
  const roles = ["WR1_A", "WR2_B", "TE1_C"];
  const roleOf: Record<string, string> = { WR1_A: "WR1", WR2_B: "WR2", TE1_C: "TE1" };
  const C = roleCostMatrix(roles, roleOf);

  it("costs nothing to keep a player's own share", () => {
    expect(C[0]![0]).toBe(0);
    expect(C[1]![1]).toBe(0);
    expect(C[2]![2]).toBe(0);
  });

  it("charges the intermediate tier across the same position group (WR1<->WR2)", () => {
    expect(C[0]![1]).toBeCloseTo(0.35, 6);
    expect(C[1]![0]).toBeCloseTo(0.35, 6);
  });

  it("charges the full tier across position groups (WR<->TE)", () => {
    expect(C[0]![2]).toBeCloseTo(1.0, 6);
    expect(C[2]![0]).toBeCloseTo(1.0, 6);
  });

  it("refuses role maps that do not describe the same player set", () => {
    expect(() => roleCostMatrix(["WR1_A", "WR2_B"], { WR1_A: "WR1" })).toThrow(
      /same players/,
    );
  });
});

describe("EPA dropoff applies the sealed factor per inherited role", () => {
  it("multiplies each share by its role's sealed factor", () => {
    const out = applyEpaDropoff(
      { A: 0.5, B: 0.3 },
      { A: "WR1", B: "QB1" },
      EPA_DROPOFF,
    );
    expect(out.A).toBeCloseTo(0.5 * 0.82, 10);
    expect(out.B).toBeCloseTo(0.3 * 0.78, 10);
  });

  it("leaves a player unchanged when its role is unknown (factor 1.0)", () => {
    const out = applyEpaDropoff({ X: 0.4 }, {}, EPA_DROPOFF);
    expect(out.X).toBeCloseTo(0.4, 10);
  });

  it("refuses a table factor outside the sealed bounds", () => {
    expect(() =>
      applyEpaDropoff({ A: 0.5 }, { A: "WR1" }, { WR1: 0.4 }, EPA_FACTOR_MIN, EPA_FACTOR_MAX),
    ).toThrow(/outside the sealed bounds/);
  });

  it("sealed table hash is 64 hex chars and stable", () => {
    expect(EPA_DROPOFF_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(canonicalHash({ ...EPA_DROPOFF })).toBe(EPA_DROPOFF_SHA256);
  });

  it("detects a mid-week edit to the sealed EPA table by hash", () => {
    const tampered = { ...EPA_DROPOFF, WR1: 0.83 };
    expect(() => validateEpaTable(tampered, EPA_DROPOFF_SHA256)).toThrow(
      /hash mismatch/,
    );
  });
});

describe("seal invariant: an injury advance must not move tau or the mindset hash", () => {
  const baseCoachInput = {
    homeTeam: "ATL",
    awayTeam: "SF",
    week: 7,
    coachSupport: 0.78,
    neutralPassRate: 0.57,
    staffAggression: 0.64,
    staffAggressionAway: 0.69,
    shadows: [{ wr: "Drake London", shadowRate: 0.62 }],
  };

  const awayTargets = [
    { playerId: "Mike Evans", role: "WR1" as const, baseShare: 0.26 },
    { playerId: "George Kittle", role: "TE" as const, baseShare: 0.25 },
    { playerId: "Brandin Cooks", role: "WR2" as const, baseShare: 0.16 },
    { playerId: "Jordan Watkins", role: "SLOT" as const, baseShare: 0.14 },
  ];

  const v1 = lockTuesdayCoachBaseline(
    baseCoachInput,
    { homeTargets: [], awayTargets },
    "2026-10-20T09:00:00.000Z",
  );

  const after = applyInjuryOverlay(v1, {
    version: "v3.0",
    recordedAtIso: "2026-10-23T21:30:00.000Z",
    inactivePlayerIds: ["Mike Evans"],
    homeInjuryPointsDelta: 0,
    awayInjuryPointsDelta: -1.5,
  });

  it("assertTauSealed returns true across the overlay", () => {
    expect(assertTauSealed(v1.coachTau, after.coachTau)).toBe(true);
  });

  it("tau is bit-identical, not merely close", () => {
    expect(after.coachTau).toBe(v1.coachTau);
  });

  it("the mindset hash is bit-identical", () => {
    expect(after.coachMindsetHash).toBe(v1.coachMindsetHash);
  });

  it("the seal verification helper agrees", () => {
    expect(verifyCoachMindsetUnchanged(v1, after)).toBe(true);
  });

  it("execution weights ARE allowed to move (that is the point of an overlay)", () => {
    const moved =
      after.marginMean !== v1.marginMean ||
      after.winProbHome !== v1.winProbHome ||
      JSON.stringify(after.homeTargetAllocations) !== JSON.stringify(v1.homeTargetAllocations) ||
      JSON.stringify(after.awayTargetAllocations) !== JSON.stringify(v1.awayTargetAllocations);
    expect(moved).toBe(true);
  });
});

describe("allocateTargets is still the single-step softmax (not Sinkhorn)", () => {
  const targets: EligibleTarget[] = [
    { playerId: "A", role: "WR1", baseShare: 0.4 },
    { playerId: "B", role: "WR2", baseShare: 0.35 },
    { playerId: "C", role: "TE", baseShare: 0.25 },
  ];

  it("still normalizes to 1 and never returns an empty row for non-empty input", () => {
    const alloc = allocateTargets(targets);
    expect(alloc).toHaveLength(3);
    const total = alloc.reduce((s, a) => s + a.share, 0);
    expect(close(total, 1, 1e-9)).toBe(true);
  });

  it("returns [] for empty input rather than throwing", () => {
    expect(allocateTargets([])).toEqual([]);
  });
});
