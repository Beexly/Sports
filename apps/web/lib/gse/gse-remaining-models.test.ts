import { describe, it, expect } from "vitest";
import {
  // shrinkage
  empiricalBayesShrink,
  jamesSteinEstimate,
  shrinkCovariance,
  type NoisyEstimate,
  // injury
  assessInjury,
  // survivor
  planSurvivor,
  type SurvivorWeek,
  // query engine
  runQuery,
  matchesPredicate,
  serializeQuery,
  deserializeQuery,
  type Query,
} from "./index";

describe("shrinkage estimators", () => {
  it("empirical-Bayes shrinks small samples harder toward the prior", () => {
    const est: NoisyEstimate[] = [
      { id: "small", value: 0.5, sampleSize: 2 },
      { id: "big", value: 0.5, sampleSize: 200 },
    ];
    const out = empiricalBayesShrink(est, 100, 0.3);
    const small = out.find((o) => o.id === "small")!;
    const big = out.find((o) => o.id === "big")!;
    expect(small.shrinkageWeight).toBeGreaterThan(big.shrinkageWeight);
    expect(Math.abs(small.shrunk - 0.3)).toBeLessThan(Math.abs(big.shrunk - 0.3));
  });

  it("James-Stein collapses to the mean when noise dominates and barely moves when signal dominates", () => {
    const vals = [10, 20, 30, 40, 50];
    const noisy = jamesSteinEstimate(vals, 1000); // huge sigma2 → full shrink
    for (const v of noisy) expect(v).toBeCloseTo(30, 5);
    const sharp = jamesSteinEstimate(vals, 0.01); // tiny sigma2 → ~no shrink
    expect(sharp[0]!).toBeCloseTo(10, 1);
    expect(jamesSteinEstimate([1, 2], 1)).toEqual([1, 2]); // k<3 unchanged
  });

  it("covariance shrinkage blends sample with target", () => {
    const cov = [[4, 1], [1, 9]];
    expect(shrinkCovariance(cov, 0, "diagonal")).toEqual(cov);
    const full = shrinkCovariance(cov, 1, "diagonal");
    expect(full[0]![1]).toBe(0); // correlation shrunk away
    expect(full[0]![0]).toBe(4); // variance kept
    const half = shrinkCovariance(cov, 0.5, "diagonal");
    expect(half[0]![1]).toBeCloseTo(0.5, 6);
  });
});

describe("injury miss-time model", () => {
  it("designation dominates and inputs are transparent", () => {
    const out = assessInjury({ designation: "out", type: "knee", priorGamesMissedThisSeason: 0, workload: 0.5 });
    expect(out.missProbability).toBeGreaterThan(0.95);
    const healthy = assessInjury({ designation: "healthy", type: "ankle", priorGamesMissedThisSeason: 0, workload: 0.5 });
    expect(healthy.missProbability).toBeLessThan(0.1);
    expect(out.illustrative).toBe(true);
    expect(out.rationale.length).toBeGreaterThan(0);
  });

  it("ACL questionable is riskier than a generic questionable, and history raises risk", () => {
    const acl = assessInjury({ designation: "questionable", type: "acl", priorGamesMissedThisSeason: 0, workload: 0.5 });
    const other = assessInjury({ designation: "questionable", type: "other", priorGamesMissedThisSeason: 0, workload: 0.5 });
    expect(acl.missProbability).toBeGreaterThan(other.missProbability);
    const withHistory = assessInjury({ designation: "questionable", type: "other", priorGamesMissedThisSeason: 4, workload: 0.5 });
    expect(withHistory.missProbability).toBeGreaterThan(other.missProbability);
    expect(withHistory.durabilityScore).toBeLessThan(other.durabilityScore);
  });
});

describe("survivor optimizer", () => {
  const weeks: SurvivorWeek[] = [
    { week: 1, options: [{ team: "X", winProb: 0.7 }, { team: "Y", winProb: 0.68 }] },
    { week: 2, options: [{ team: "X", winProb: 0.95 }, { team: "Z", winProb: 0.6 }] },
  ];

  it("saves a strong future team when future equity is valued", () => {
    const plan = planSurvivor(weeks, { futureEquity: 0.5, lookahead: 2 });
    expect(plan.picks[0]!.team).toBe("Y"); // save X for week 2
    expect(plan.picks[1]!.team).toBe("X");
    expect(plan.survivalProbability).toBeCloseTo(0.68 * 0.95, 6);
  });

  it("pure greedy (no future equity) takes the best team now", () => {
    const plan = planSurvivor(weeks, { futureEquity: 0, lookahead: 2 });
    expect(plan.picks[0]!.team).toBe("X");
  });

  it("never reuses a team", () => {
    const plan = planSurvivor(weeks, { futureEquity: 0.5, lookahead: 2 });
    const teams = plan.picks.map((p) => p.team);
    expect(new Set(teams).size).toBe(teams.length);
  });
});

describe("query engine (Finder)", () => {
  const rows = [
    { name: "A", yds: 1, team: "x" },
    { name: "B", yds: 5, team: "y" },
    { name: "C", yds: 10, team: "x" },
  ];

  it("filters, sorts, and limits", () => {
    const out = runQuery(rows, { filters: [{ field: "yds", op: "gte", value: 5 }], sortBy: "yds", sortDir: "desc", limit: 1 });
    expect(out.length).toBe(1);
    expect(out[0]!.name).toBe("C");
  });

  it("supports in / between / contains predicates", () => {
    expect(runQuery(rows, { filters: [{ field: "team", op: "in", value: ["x"] }] }).length).toBe(2);
    expect(runQuery(rows, { filters: [{ field: "yds", op: "between", value: [3, 8] }] }).length).toBe(1);
    expect(matchesPredicate({ name: "Alpha" }, { field: "name", op: "contains", value: "lph" })).toBe(true);
  });

  it("round-trips a serialized query and rejects malformed input", () => {
    const q: Query = { filters: [{ field: "yds", op: "gt", value: 3 }], limit: 2 };
    const back = deserializeQuery(serializeQuery(q));
    expect(back).not.toBeNull();
    expect(runQuery(rows, back!).length).toBe(2);
    expect(deserializeQuery("{not json")).toBeNull();
    expect(deserializeQuery('{"nope":1}')).toBeNull();
  });
});
