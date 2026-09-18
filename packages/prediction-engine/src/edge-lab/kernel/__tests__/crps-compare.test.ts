import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareNflKeyNumberVsGaussian,
  distFromPmf,
  pairedDiscreteVsGaussianSyntheticNfl,
  pairedDiscreteVsWidenedGaussian,
  DISCRETE_VS_GAUSSIAN_ESTIMAND,
  DISCRETE_VS_GAUSSIAN_KILL_DELTA,
  DISCRETE_VS_GAUSSIAN_KILL_N,
  DISCRETE_VS_GAUSSIAN_MISSING_INPUT,
  FLASH_NFLVERSE_CRPS_PAIRED,
  TEAM_GAME_LOG_MARGINS_SQL,
  integerMarginsFromScores,
} from "../crps-compare.js";
import { crpsDiscrete, crpsGaussian, CRPS_KILL_MIN_IMPROVEMENT, CRPS_KILL_MIN_N } from "../slots/crps.js";

const pkgRoot = join(__dirname, "../../../.."); // CommonJS: import.meta is not allowed under this package's tsconfig.
const tsxBin = join(pkgRoot, "../../node_modules/.bin/tsx");
const runner = "src/edge-lab/run-paired-crps.ts";

describe("distFromPmf", () => {
  it("point mass CRPS is 0 at the atom", () => {
    const d = distFromPmf(new Map([[4, 1]]));
    expect(crpsDiscrete(d, 4)).toBeCloseTo(0, 12);
  });
});

describe("compareNflKeyNumberVsGaussian", () => {
  it("Gaussian closed form is blind to the key-number bump; discrete is not", () => {
    const report = compareNflKeyNumberVsGaussian({ n: 400, sd: 14, seed: 17 });
    expect(report.n).toBe(400);
    expect(report.meanDiscreteA).toBeLessThan(report.meanDiscreteB);
    expect(report.discreteRanking).toBe("A");
    expect(report.gaussianRanking).toBe("tie");
    expect(report.rankingsAgree).toBe(false);
    expect(report.gaussianLicensedAsKill).toBe(false);
    expect(report.gaussianGate.verdict).toBe("kill");
    expect(report.gaussianGate.improvement).toBeCloseTo(0, 12);
    expect(report.priced).toBe(false);
    expect(report.status).toBe("shadow");
  });

  it("does not treat a Gaussian ranking as a licensed kill even if n is large", () => {
    const report = compareNflKeyNumberVsGaussian({ n: 400, seed: 3 });
    expect(report.n).toBeGreaterThanOrEqual(272);
    expect(report.gaussianLicensedAsKill).toBe(false);
  });
});

describe("pairedDiscreteVsWidenedGaussian", () => {
  it("pre-registers the kill on the same line as the estimand, before looking", () => {
    expect(DISCRETE_VS_GAUSSIAN_KILL_DELTA).toBe(CRPS_KILL_MIN_IMPROVEMENT);
    expect(DISCRETE_VS_GAUSSIAN_KILL_N).toBe(CRPS_KILL_MIN_N);
    expect(DISCRETE_VS_GAUSSIAN_KILL_DELTA).toBe(0.5);
    expect(DISCRETE_VS_GAUSSIAN_KILL_N).toBe(272);
    expect(DISCRETE_VS_GAUSSIAN_ESTIMAND).toMatch(/mean\(d\)≥0\.5/);
    expect(DISCRETE_VS_GAUSSIAN_ESTIMAND).toMatch(/nLicensed≥272/);
    expect(DISCRETE_VS_GAUSSIAN_MISSING_INPUT).toMatch(/TeamGameLog/);
  });

  it("n=50 is underpowered — that is the finding, not a pass", () => {
    const report = pairedDiscreteVsGaussianSyntheticNfl({ n: 50, seed: 17 });
    expect(report.n).toBe(50);
    expect(report.nLicensed).toBeLessThan(272);
    expect(report.killFired).toBe(false);
    expect(report.verdict).toBe("underpowered");
    expect(report.sampleKind).toBe("synthetic-nfl-shaped");
    expect(report.gaussianLicensedAsKill).toBe(false);
    expect(report.dbQueried).toBe(false);
    expect(Number.isFinite(report.seD)).toBe(true);
  });

  it("reports the paired mean and its SE, not two unpaired means, and killFired matches the pre-registered rule", () => {
    const report = pairedDiscreteVsGaussianSyntheticNfl({ n: 400, sd: 14, seed: 17 });
    expect(report.n).toBe(400);
    expect(report.nLicensed).toBe(400);
    expect(Number.isFinite(report.meanD)).toBe(true);
    expect(Number.isFinite(report.seD)).toBe(true);
    expect(report.seD).toBeCloseTo(report.sdD / Math.sqrt(report.nLicensed), 12);
    expect(report.killFired).toBe(
      report.nLicensed >= 272 && report.meanD >= 0.5,
    );
    expect(report.verdict).toBe("gaussian_not_killed");
    expect(report.meanD).toBeLessThan(0.1);
    expect(report.meanD).toBeGreaterThan(-0.1);
    expect(report.seD).toBeGreaterThan(0);
    expect(report.sampleKind).toBe("synthetic-nfl-shaped");
    expect(report.missingInput).toMatch(/TeamGameLog/);
  });

  it("hand-checks LOO pairing on three integer margins", () => {
    const y = [-7, 0, 7] as const;
    const report = pairedDiscreteVsWidenedGaussian({ y, sampleKind: "caller-supplied" });
    expect(report.n).toBe(3);
    expect(report.nLicensed).toBe(3);
    expect(report.verdict).toBe("underpowered");
    const mean = 0;
    const m2 = 98;
    const d: number[] = [];
    for (const yi of y) {
      const loo = y.filter((v) => v !== yi); // all unique, so this is the LOO
      const mu = (3 * mean - yi) / 2;
      const sampleVar = m2 / 2;
      const leftOutVar = (2 * sampleVar - (3 / 2) * (yi - mean) ** 2) / 1;
      const sd = Math.sqrt(leftOutVar);
      const counts = new Map<number, number>();
      for (const v of loo) counts.set(v, 1);
      const disc = crpsDiscrete(distFromPmf(counts), yi);
      const gauss = crpsGaussian(mu, sd, yi);
      d.push(gauss - disc);
    }
    const meanD = d.reduce((a, b) => a + b, 0) / 3;
    expect(report.meanD).toBeCloseTo(meanD, 10);
    expect(report.sampleKind).toBe("caller-supplied");
  });

  it("throws on empty rather than inventing a delta", () => {
    expect(() =>
      pairedDiscreteVsWidenedGaussian({ y: [], sampleKind: "caller-supplied" }),
    ).toThrow(/requires observations/);
  });

  it("three real nflverse fixture games are underpowered — n too small is the finding", () => {
    const y = integerMarginsFromScores([
      { homeScore: 52, awayScore: 7 },
      { homeScore: 34, awayScore: 27 },
      { homeScore: 27, awayScore: 20 },
    ]);
    expect(y).toEqual([45, 7, 7]);
    const report = pairedDiscreteVsWidenedGaussian({ y, sampleKind: "nflverse-schedules" });
    expect(report.n).toBe(3);
    expect(report.verdict).toBe("underpowered");
    expect(report.killFired).toBe(false);
  });

  it("FLASH nflverse REG measurement: Gaussian detectably worse, not killed at 0.5", () => {
    expect(FLASH_NFLVERSE_CRPS_PAIRED.n).toBeGreaterThanOrEqual(272);
    expect(FLASH_NFLVERSE_CRPS_PAIRED.meanD).toBeLessThan(FLASH_NFLVERSE_CRPS_PAIRED.killDelta);
    expect(FLASH_NFLVERSE_CRPS_PAIRED.z).toBeGreaterThan(5);
    expect(FLASH_NFLVERSE_CRPS_PAIRED.verdict).toBe("gaussian_not_killed");
    expect(FLASH_NFLVERSE_CRPS_PAIRED.attribution).toMatch(/CC BY 4\.0/);
    expect(TEAM_GAME_LOG_MARGINS_SQL).toContain("team_game_logs");
    expect(TEAM_GAME_LOG_MARGINS_SQL).toContain('"isHome" = true');
  });
});

describe("paired-crps runner", () => {
  it("--needs names the nflverse flash measurement and TeamGameLog SQL", () => {
    const r = spawnSync(tsxBin, [runner, "--needs"], { cwd: pkgRoot, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const body = JSON.parse(r.stdout);
    expect(body.flash.n).toBe(6984);
    expect(body.flash.verdict).toBe("gaussian_not_killed");
    expect(body.missingInput).toMatch(/TeamGameLog/);
  });

  it("--print-sql prints the TeamGameLog extract", () => {
    const r = spawnSync(tsxBin, [runner, "--print-sql"], { cwd: pkgRoot, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("team_game_logs");
  });
});
