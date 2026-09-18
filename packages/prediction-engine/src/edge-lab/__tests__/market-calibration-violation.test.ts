import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MARKET_CALIBRATION_ESTIMAND,
  MARKET_CALIBRATION_MATTERS_WHEN,
  MARKET_CALIBRATION_MIN_BIN_N,
  MARKET_CALIBRATION_PRODUCTION_NEEDS,
  MARKET_CALIBRATION_PRODUCTION_NUMBER,
  MARKET_CALIBRATION_SQL,
  MARKET_CALIBRATION_VIOLATION_PP,
  measureMarketCalibrationViolation,
} from "../market-calibration-violation.js";

const pkgRoot = join(__dirname, "../../.."); // CommonJS: import.meta is not allowed under this package's tsconfig.
const tsxBin = join(pkgRoot, "../../node_modules/.bin/tsx");
const runner = "src/edge-lab/run-market-calibration-violation.ts";

function fillBin(sport: string, p: number, y: 0 | 1, n: number) {
  return Array.from({ length: n }, () => ({ sport, marketP: p, y }));
}

describe("measureMarketCalibrationViolation", () => {
  it("states the estimand before any number and does not invent a production 5%", () => {
    expect(MARKET_CALIBRATION_ESTIMAND).toMatch(/marketFairProb/);
    expect(MARKET_CALIBRATION_ESTIMAND).toMatch(/n≥30/);
    expect(MARKET_CALIBRATION_ESTIMAND).toMatch(/> 0\.05/);
    expect(MARKET_CALIBRATION_PRODUCTION_NUMBER).toBe("NOT_RUN");
    expect(MARKET_CALIBRATION_MATTERS_WHEN).toMatch(/FIXED offset/);
    expect(MARKET_CALIBRATION_PRODUCTION_NEEDS.missingInput).toMatch(/does not hold those rows/);
    expect(MARKET_CALIBRATION_PRODUCTION_NEEDS.notTheSameAs).toMatch(/nflverse closing moneylines/);
  });

  it("names the replica SQL it needs", () => {
    expect(MARKET_CALIBRATION_SQL).toContain("pick_proof_receipts");
    expect(MARKET_CALIBRATION_SQL).toContain('"marketFairProb"');
    expect(MARKET_CALIBRATION_SQL).toContain("p.result IN ('WIN', 'LOSS')");
    expect(MARKET_CALIBRATION_SQL).toContain("CASE p.result WHEN 'WIN' THEN 1 ELSE 0 END AS y");
    expect(MARKET_CALIBRATION_SQL).toContain('g."mergedIntoGameId" IS NULL');
  });

  it("throws on empty rather than inventing a 5% number", () => {
    expect(() => measureMarketCalibrationViolation([])).toThrow(/empty sample/);
  });

  it("underpowered bins are not violations and not a pass", () => {
    const rows = fillBin("NFL", 0.6, 1, 10);
    const report = measureMarketCalibrationViolation(rows);
    expect(report.overall.verdict).toBe("underpowered");
    expect(report.overall.violationRate).toBeNull();
    expect(report.overall.binsViolating).toBe(0);
    expect(report.dbQueried).toBe(false);
    expect(report.violationPp).toBe(MARKET_CALIBRATION_VIOLATION_PP);
    expect(report.productionNumber).toBe("NOT_RUN");
    expect(report.estimand).toBe(MARKET_CALIBRATION_ESTIMAND);
  });

  it("flags a 5pp miss on a licensed bin and stays quiet on a calibrated one", () => {
    const n = MARKET_CALIBRATION_MIN_BIN_N;
    const bad = fillBin("NFL", 0.7, 0, n); // meanP 0.7, meanY 0
    const good = fillBin("NBA", 0.55, 1, n).map((r, i) => ({
      ...r,
      y: (i < Math.round(0.55 * n) ? 1 : 0) as 0 | 1,
    }));
    const report = measureMarketCalibrationViolation([...bad, ...good]);
    const nfl = report.bySport.find((s) => s.sport === "NFL")!;
    const nba = report.bySport.find((s) => s.sport === "NBA")!;
    expect(nfl.verdict).toBe("measured");
    expect(nfl.binsViolating).toBeGreaterThan(0);
    expect(nba.verdict).toBe("measured");
    expect(nba.binsViolating).toBe(0);
    expect(report.priced).toBe(false);
    expect(report.productionNumber).toBe("NOT_RUN");
  });
});

describe("market-calibration-violation runner", () => {
  it("--print-sql exits 0 and prints the named query", () => {
    const r = spawnSync(tsxBin, [runner, "--print-sql"], { cwd: pkgRoot, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("FROM picks p");
    expect(r.stdout).toContain("pick_proof_receipts");
  });

  it("--needs pins NOT_RUN and the missing replica extract", () => {
    const r = spawnSync(tsxBin, [runner, "--needs"], { cwd: pkgRoot, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const needs = JSON.parse(r.stdout);
    expect(needs.productionNumber).toBe("NOT_RUN");
    expect(needs.missingInput).toMatch(/does not hold those rows/);
  });

  it("missing --rows file exits 2 and names NOT_RUN", () => {
    const r = spawnSync(tsxBin, [runner, "--rows", "/no/such/file.json"], {
      cwd: pkgRoot,
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/NOT_RUN/);
  });
});
