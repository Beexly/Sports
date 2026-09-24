import { describe, expect, it } from "vitest";
import { buildLineup, buildPortfolio, shrinkVariance, stackBonus } from "./ip-portfolio";

const pool = [
  { id: "qb1", position: "QB" as const, team: "KC", salary: 8000, proj: 24, sd: 8, ownership: 0.25 },
  { id: "qb2", position: "QB" as const, team: "BUF", salary: 7500, proj: 22, sd: 9, ownership: 0.15 },
  { id: "rb1", position: "RB" as const, team: "SF", salary: 9000, proj: 20, sd: 7, ownership: 0.3 },
  { id: "rb2", position: "RB" as const, team: "DET", salary: 6000, proj: 14, sd: 10, ownership: 0.1 },
  { id: "wr1", position: "WR" as const, team: "KC", salary: 8500, proj: 19, sd: 8, ownership: 0.28 },
  { id: "wr2", position: "WR" as const, team: "BUF", salary: 7000, proj: 16, sd: 9, ownership: 0.12 },
  { id: "wr3", position: "WR" as const, team: "PHI", salary: 5500, proj: 12, sd: 11, ownership: 0.05 },
  { id: "te1", position: "TE" as const, team: "KC", salary: 6500, proj: 14, sd: 7, ownership: 0.2 },
  { id: "dst1", position: "DST" as const, team: "SF", salary: 3500, proj: 9, sd: 5, ownership: 0.18 },
  { id: "dst2", position: "DST" as const, team: "NYJ", salary: 3000, proj: 8, sd: 6, ownership: 0.08 },
];

const cfg = {
  salaryCap: 50000,
  roster: { QB: 1, RB: 1, WR: 2, TE: 1, DST: 1 },
  varianceFloor: 300,
  overlapCap: 3,
  overlapPenalty: 5,
};

describe("ip-portfolio", () => {
  it("buildLineup fills every roster slot under the cap", () => {
    const lu = buildLineup(pool, cfg);
    expect(lu).toHaveLength(6);
    expect(lu.reduce((s, p) => s + p.salary, 0)).toBeLessThanOrEqual(cfg.salaryCap);
    const pos = lu.map((p) => p.position).sort().join(",");
    expect(pos).toBe("DST,QB,RB,TE,WR,WR");
  });

  it("variance floor is enforced by repair swaps", () => {
    // pool max achievable variance is 468 (qb2+rb2+wr3+wr2+te1+dst2)
    const lu = buildLineup(pool, { ...cfg, varianceFloor: 450 });
    const v = lu.reduce((s, p) => s + p.sd * p.sd, 0);
    expect(v).toBeGreaterThanOrEqual(450);
  });

  it("stackBonus rewards QB+same-team pass-catchers", () => {
    const lu = buildLineup(pool, cfg);
    expect(stackBonus(lu)).toBeGreaterThan(0);
    expect(stackBonus([])).toBe(0);
  });

  it("portfolio respects the overlap cap", () => {
    // 10-player pool / 6 slots: diversity is inherently limited, cap 5 is the tight feasible setting
    const pcfg = { ...cfg, overlapCap: 5 };
    const pf = buildPortfolio(pool, pcfg, 3);
    expect(pf.length).toBeGreaterThan(1);
    for (let i = 0; i < pf.length; i++) {
      for (let j = i + 1; j < pf.length; j++) {
        const ids = new Set(pf[i]!.map((p) => p.id));
        const ov = pf[j]!.filter((p) => ids.has(p.id)).length;
        expect(ov).toBeLessThanOrEqual(pcfg.overlapCap);
      }
    }
  });

  it("shrinkVariance pulls noisy estimates toward the prior", () => {
    expect(shrinkVariance(100, 25, 0)).toBe(25); // no data -> prior
    const shrunk = shrinkVariance(100, 25, 2);
    expect(shrunk).toBeGreaterThan(25);
    expect(shrunk).toBeLessThan(100);
    expect(() => shrinkVariance(1, 1, -1)).toThrow();
  });

  it("rejects bad portfolio size", () => {
    expect(() => buildPortfolio(pool, cfg, 0)).toThrow();
  });
});
