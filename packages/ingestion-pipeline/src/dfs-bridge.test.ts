import { describe, expect, it } from "vitest";
import {
  evalPlayerClusters,
  evalUndervaluedFlags,
  evalTeammateDifferential,
  evalParetoFilter,
  evalDominancePrune,
  evalPrunePool,
  evalBruteForceLineup,
  evalVerifyPruning,
  evalStackBonus,
  evalShrinkVariance,
  evalBuildLineup,
  evalBuildPortfolio,
  evalPowerLawAlpha,
  evalPowerLawShares,
  evalBucketPayouts,
  evalNiceNumber,
  evalCalibrateLambda,
  evalVarianceBudgetPass,
  evalBystanderEquity,
  evalRequiredDeltaEV,
  evalQuantizeTiers,
  evalTierErrorCost,
  evalTop3TierAccuracy,
  evalMispricedFlags,
} from "./dfs-bridge.js";
import type {
  SlatePlayer,
  DominationDfsPlayer,
  PortfolioDfsPlayer,
  PortfolioConfig,
} from "./dfs-bridge.js";

function slatePlayer(id: string, salary: number, features: number[]): SlatePlayer {
  return { id, position: "RB", salary, features };
}

function domPlayer(
  id: string,
  position: string,
  salary: number,
  projection: number,
): DominationDfsPlayer {
  return { id, position, salary, projection };
}

function portPlayer(
  id: string,
  position: PortfolioDfsPlayer["position"],
  team: string,
  salary: number,
  proj: number,
  ownership = 0.2,
): PortfolioDfsPlayer {
  return { id, position, team, salary, proj, sd: 5, ownership };
}

describe("dfs-bridge cluster-salary-screen", () => {
  it("clusters players and flags the bottom salary tail", () => {
    const players = [
      slatePlayer("a", 4000, [1, 0]),
      slatePlayer("b", 4200, [1.1, 0.1]),
      slatePlayer("c", 9000, [5, 5]),
      slatePlayer("d", 9500, [5.2, 5.1]),
    ];
    const clustered = evalPlayerClusters({ players, k: 2 });
    expect(clustered.ok).toBe(true);
    if (!clustered.ok) return;
    expect(clustered.data.length).toBe(4);

    const flagged = evalUndervaluedFlags({
      players,
      clusters: clustered.data as number[],
    });
    expect(flagged.ok).toBe(true);
  });

  it("fail-closes on empty pool and bad k", () => {
    expect(evalPlayerClusters({ players: [], k: 2 }).ok).toBe(false);
    expect(evalPlayerClusters({ players: [slatePlayer("a", 1, [0])], k: 0 }).ok).toBe(
      false,
    );
    // kMeansClusters clamps k to the pool size rather than failing.
    const clamped = evalPlayerClusters({
      players: [slatePlayer("a", 1, [0])],
      k: 2,
    });
    expect(clamped.ok).toBe(true);
    if (clamped.ok) expect(clamped.data.length).toBe(1);
  });

  it("fail-closes on players/clusters length mismatch", () => {
    const r = evalUndervaluedFlags({
      players: [slatePlayer("a", 4000, [1, 0]), slatePlayer("b", 4200, [1, 0])],
      clusters: [0],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("equal-length");
  });

  it("teammate differential is the plain rate gap", () => {
    const r = evalTeammateDifferential({ toRoleRate: 7.2, offRoleRate: 5.1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(2.1, 6);
    expect(evalTeammateDifferential({ toRoleRate: Number.NaN, offRoleRate: 1 }).ok).toBe(
      false,
    );
  });
});

describe("dfs-bridge dominance-pruning", () => {
  const pool: DominationDfsPlayer[] = [
    domPlayer("qb1", "QB", 7000, 24),
    domPlayer("qb2", "QB", 8000, 20),
    domPlayer("rb1", "RB", 6000, 18),
    domPlayer("rb2", "RB", 5000, 14),
    domPlayer("wr1", "WR", 5000, 16),
    domPlayer("wr2", "WR", 4500, 11),
  ];

  it("pareto filter keeps the frontier", () => {
    const r = evalParetoFilter({ players: pool });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.length).toBeGreaterThan(0);
  });

  it("dominance prune drops the strictly dominated player", () => {
    const r = evalDominancePrune({ players: pool });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ids = r.data.map((p) => p.id);
      expect(ids).not.toContain("qb2");
    }
  });

  it("prune pool composes both steps", () => {
    const r = evalPrunePool({ players: pool });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.length).toBeLessThanOrEqual(pool.length);
  });

  it("brute force returns a legal lineup under the cap", () => {
    const r = evalBruteForceLineup({
      players: pool,
      positions: ["QB", "RB", "WR"],
      cap: 20000,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.players.length).toBe(3);
      expect(r.data.salary).toBeLessThanOrEqual(20000);
    }
  });

  it("refuses rather than returning a partial lineup", () => {
    const r = evalBruteForceLineup({
      players: [domPlayer("qb1", "QB", 7000, 24)],
      positions: ["QB", "RB", "WR"],
      cap: 20000,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no legal lineup");
  });

  it("fail-closes on empty positions and bad cap", () => {
    expect(
      evalBruteForceLineup({ players: pool, positions: [], cap: 100 }).ok,
    ).toBe(false);
    expect(
      evalBruteForceLineup({ players: pool, positions: ["QB"], cap: 0 }).ok,
    ).toBe(false);
  });

  it("pruning verification proves the optimum survives", () => {
    const r = evalVerifyPruning({
      players: pool,
      positions: ["QB", "RB", "WR"],
      cap: 20000,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.optimaMatch).toBe(true);
  });
});

describe("dfs-bridge ip-portfolio", () => {
  const config: PortfolioConfig = {
    salaryCap: 20000,
    roster: { QB: 1, RB: 1, WR: 2, TE: 1, DST: 1 },
    varianceFloor: 0,
    overlapCap: 3,
    overlapPenalty: 5,
  };
  const pool: PortfolioDfsPlayer[] = [
    portPlayer("qb1", "QB", "BUF", 7000, 24),
    portPlayer("rb1", "RB", "BUF", 6000, 18),
    portPlayer("wr1", "WR", "BUF", 5000, 16),
    portPlayer("wr2", "WR", "NYJ", 4500, 13),
    portPlayer("te1", "TE", "BUF", 3500, 9),
    portPlayer("dst1", "DST", "BUF", 3000, 6),
  ];

  it("stack bonus rises when receivers share the passer", () => {
    const stacked = evalStackBonus({
      players: [pool[0]!, pool[1]!, pool[2]!, pool[3]!, pool[4]!, pool[5]!],
    });
    const unstacked = evalStackBonus({
      players: [
        pool[0]!,
        portPlayer("rb9", "RB", "NE", 6000, 18),
        portPlayer("wr9", "WR", "NE", 5000, 16),
        portPlayer("te9", "TE", "NE", 3500, 9),
        portPlayer("dst9", "DST", "NE", 3000, 6),
      ],
    });
    expect(stacked.ok).toBe(true);
    expect(unstacked.ok).toBe(true);
    if (stacked.ok && unstacked.ok) {
      expect(stacked.data).toBeGreaterThan(unstacked.data);
    }
  });

  it("shrink variance moves toward the prior when n is small", () => {
    const few = evalShrinkVariance({ rawVar: 100, priorVar: 10, nObs: 1 });
    const many = evalShrinkVariance({ rawVar: 100, priorVar: 10, nObs: 1000 });
    expect(few.ok).toBe(true);
    expect(many.ok).toBe(true);
    if (few.ok && many.ok) {
      expect(Math.abs(few.data - 10)).toBeLessThan(Math.abs(many.data - 10));
    }
  });

  it("fail-closes on negative variance and fractional n", () => {
    expect(evalShrinkVariance({ rawVar: -1, priorVar: 10, nObs: 5 }).ok).toBe(false);
    expect(evalShrinkVariance({ rawVar: 1, priorVar: 10, nObs: 1.5 }).ok).toBe(false);
  });

  it("builds a lineup honouring the roster slot counts", () => {
    const r = evalBuildLineup({ pool, config });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const byPos = new Map<string, number>();
      for (const p of r.data) byPos.set(p.position, (byPos.get(p.position) ?? 0) + 1);
      for (const [pos, need] of Object.entries(config.roster)) {
        if (need === 0) continue;
        expect(byPos.get(pos) ?? 0).toBe(need);
      }
    }
  });

  it("builds a multi-lineup portfolio", () => {
    const r = evalBuildPortfolio({ pool, config, n: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.length).toBeGreaterThan(0);
  });

  it("fail-closes on empty pool and bad n", () => {
    expect(evalBuildLineup({ pool: [], config }).ok).toBe(false);
    expect(evalBuildPortfolio({ pool, config, n: 0 }).ok).toBe(false);
  });
});

describe("dfs-bridge payout-framework", () => {
  it("fits an alpha reproducing a target winner share", () => {
    const r = evalPowerLawAlpha({ nPaid: 10, targetWinnerShare: 0.5 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeGreaterThan(0);
  });

  it("power law shares partition the pool exactly", () => {
    const r = evalPowerLawShares({ nPaid: 5, alpha: 1.2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const total = r.data.reduce((s, x) => s + x, 0);
      expect(total).toBeCloseTo(1, 6);
      expect(r.data[0]!).toBeGreaterThan(r.data[4]!);
    }
  });

  it("fail-closes on bad payout inputs", () => {
    expect(evalPowerLawAlpha({ nPaid: 0, targetWinnerShare: 0.5 }).ok).toBe(false);
    expect(evalPowerLawAlpha({ nPaid: 5, targetWinnerShare: 1.5 }).ok).toBe(false);
    expect(evalPowerLawShares({ nPaid: 0, alpha: 1 }).ok).toBe(false);
    expect(
      evalBucketPayouts({ totalPrize: 0, nPaid: 5, alpha: 1 }).ok,
    ).toBe(false);
  });

  it("buckets payouts on round numbers", () => {
    const r = evalBucketPayouts({ totalPrize: 10000, nPaid: 5, alpha: 1.1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.length).toBeGreaterThan(0);
  });

  it("nice number rounds to a contest-friendly value", () => {
    const r = evalNiceNumber({ x: 4730 });
    expect(r.ok).toBe(true);
    if (r.ok) expect([1000, 2000, 5000]).toContain(r.data);
  });
});

describe("dfs-bridge tournament-variance", () => {
  it("calibrates lambda from a real payout ladder", () => {
    const r = evalCalibrateLambda({
      payoutAtScore: (s) => -(s * s), // concave: -f''/2 > 0
      centerScore: 0,
      delta: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeGreaterThan(0);
  });

  it("fail-closes on a non-function ladder", () => {
    const r = evalCalibrateLambda({
      payoutAtScore: undefined as unknown as (s: number) => number,
      centerScore: 0,
    });
    expect(r.ok).toBe(false);
  });

  it("variance budget requires EV to pay for the variance", () => {
    expect(
      evalVarianceBudgetPass({ deltaEV: 5, deltaVar: 10, lambda: 1 }).ok,
    ).toBe(true);
    const fails = evalVarianceBudgetPass({ deltaEV: 5, deltaVar: 10, lambda: 1 });
    expect(fails.ok).toBe(true);
    if (fails.ok) expect(fails.data).toBe(false);
    const passes = evalVarianceBudgetPass({ deltaEV: 50, deltaVar: 10, lambda: 1 });
    if (passes.ok) expect(passes.data).toBe(true);
  });

  it("required delta EV is the lambda-weighted variance", () => {
    const r = evalRequiredDeltaEV({ deltaVar: 4, lambda: 1.5 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(6, 6);
  });

  it("bystander equity is the donation to the pot", () => {
    const r = evalBystanderEquity({ expectedPrize: 100, expectedPrizeAtMeanVariance: 130 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(30, 6);
  });

  it("fail-closes on negative lambda and variance", () => {
    expect(
      evalVarianceBudgetPass({ deltaEV: 1, deltaVar: 1, lambda: -1 }).ok,
    ).toBe(false);
    expect(evalRequiredDeltaEV({ deltaVar: -1, lambda: 1 }).ok).toBe(false);
  });
});

describe("dfs-bridge value-tier", () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("quantizes to a bounded tier range", () => {
    const r = evalQuantizeTiers({ values, nTiers: 5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const t of r.data) {
        expect(t).toBeGreaterThanOrEqual(1);
        expect(t).toBeLessThanOrEqual(5);
      }
    }
  });

  it("fail-closes on bad nTiers", () => {
    expect(evalQuantizeTiers({ values, nTiers: 1 }).ok).toBe(false);
    expect(evalQuantizeTiers({ values: [], nTiers: 5 }).ok).toBe(false);
  });

  it("scores tier error and top-3 accuracy", () => {
    const predicted = [1, 2, 3, 4, 5];
    const actual = [1, 2, 3, 4, 5];
    const cost = evalTierErrorCost({ predicted, actual });
    const acc = evalTop3TierAccuracy({ predicted, actual });
    expect(cost.ok).toBe(true);
    expect(acc.ok).toBe(true);
    if (cost.ok) expect(cost.data).toBeCloseTo(0, 6);
    if (acc.ok) expect(acc.data).toBe(1);
  });

  it("fail-closes on tier length mismatch", () => {
    expect(
      evalTierErrorCost({ predicted: [1, 2], actual: [1] }).ok,
    ).toBe(false);
    expect(evalTop3TierAccuracy({ predicted: [], actual: [] }).ok).toBe(false);
  });

  it("flags mispriced players by tier gap", () => {
    const r = evalMispricedFlags({
      ids: ["a", "b"],
      salaryTiers: [2, 3],
      modelTiers: [8, 3],
      minGap: 3,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.length).toBe(2);
      const a = r.data.find((f) => f.id === "a")!;
      const b = r.data.find((f) => f.id === "b")!;
      expect(a.value).toBe(true);
      expect(a.tierGap).toBe(6);
      expect(b.value).toBe(false);
      expect(b.tierGap).toBe(0);
    }
  });

  it("fail-closes on mispriced length mismatch", () => {
    const r = evalMispricedFlags({
      ids: ["a", "b"],
      salaryTiers: [2],
      modelTiers: [8, 3],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("equal-length");
  });
});
