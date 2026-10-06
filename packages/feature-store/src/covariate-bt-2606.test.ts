import { describe, expect, it } from "vitest";
import {
  covariateLogLoss,
  fitCovariateBT,
  impliedRanking,
  top3Overlap,
  transitiveTripletRatio,
  type CovariateGame,
} from "./covariate-bt-2606.js";

function games(n: number): CovariateGame[] {
  const teams = ["A", "B", "C", "D"];
  const out: CovariateGame[] = [];
  for (let i = 0; i < n; i++) {
    const home = teams[i % 4] ?? "A";
    const away = teams[(i + 1) % 4] ?? "B";
    const homeStronger = home < away;
    out.push({
      home,
      away,
      homeWon: i % 7 === 0 ? !homeStronger : homeStronger,
      restDiff: (i % 5) - 2,
      dome: i % 2,
      wind: i % 3,
      qbMissing: i % 11 === 0 ? 1 : 0,
    });
  }
  return out;
}

describe("covariate bt", () => {
  const teams = ["A", "B", "C", "D"];

  it("recovers team ordering in intercepts", () => {
    const fit = fitCovariateBT(games(200), teams, 0.5);
    const ranking = impliedRanking(fit, teams);
    expect(ranking[0]).toBe("A");
    expect(ranking[ranking.length - 1]).toBe("D");
    expect(Number.isFinite(fit.logLikelihood)).toBe(true);
  });

  it("fusion regularization shrinks coefficient spread", () => {
    const gs = games(120);
    const loose = fitCovariateBT(gs, teams, 0.01);
    const tight = fitCovariateBT(gs, teams, 50);
    const spread = (beta: Map<string, number[]>): number => {
      const coefs = teams.flatMap((t) => (beta.get(t) ?? []).slice(1));
      const m = coefs.reduce((s, v) => s + v, 0) / coefs.length;
      return Math.sqrt(coefs.reduce((s, v) => s + (v - m) ** 2, 0) / coefs.length);
    };
    expect(spread(tight.beta)).toBeLessThan(spread(loose.beta));
  });

  it("log-loss is finite and sane", () => {
    const fit = fitCovariateBT(games(80), teams, 1);
    const ll = covariateLogLoss(fit, games(40));
    expect(ll).toBeGreaterThan(0);
    expect(ll).toBeLessThan(2);
  });

  it("transitive triplet ratio rewards consistent rankings", () => {
    const ranking = ["A", "B", "C", "D"];
    const good: CovariateGame[] = [
      { home: "A", away: "B", homeWon: true, restDiff: 0, dome: 0, wind: 0, qbMissing: 0 },
      { home: "B", away: "C", homeWon: true, restDiff: 0, dome: 0, wind: 0, qbMissing: 0 },
      { home: "A", away: "C", homeWon: true, restDiff: 0, dome: 0, wind: 0, qbMissing: 0 },
    ];
    const bad: CovariateGame[] = [
      { home: "A", away: "B", homeWon: false, restDiff: 0, dome: 0, wind: 0, qbMissing: 0 },
      { home: "B", away: "C", homeWon: false, restDiff: 0, dome: 0, wind: 0, qbMissing: 0 },
      { home: "C", away: "A", homeWon: true, restDiff: 0, dome: 0, wind: 0, qbMissing: 0 },
    ];
    expect(transitiveTripletRatio([{ ranking, games: good }])).toBe(1);
    expect(transitiveTripletRatio([{ ranking, games: bad }])).toBe(0);
  });

  it("top3Overlap measures ranking agreement", () => {
    expect(top3Overlap(["A", "B", "C", "D"], ["A", "B", "C", "D"])).toBe(1);
    expect(top3Overlap(["A", "B", "C", "D"], ["D", "C", "B", "A"])).toBeCloseTo(2 / 3, 9);
  });

  it("handles empty input", () => {
    const fit = fitCovariateBT([], teams, 1);
    expect(impliedRanking(fit, teams)).toHaveLength(4);
    expect(Number.isNaN(covariateLogLoss(fit, []))).toBe(true);
    expect(Number.isNaN(transitiveTripletRatio([]))).toBe(true);
    expect(Number.isNaN(transitiveTripletRatio([{ ranking: teams, games: [] }]))).toBe(true);
  });
});
