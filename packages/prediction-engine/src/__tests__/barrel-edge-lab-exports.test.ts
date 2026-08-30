/**
 * The barrel IS the package's public surface. falsify / cross-market / the
 * backtest runners / modelProb were all reachable only by deep import, and
 * every existing test imports them by deep path — so the barrel could be
 * (and was) missing them without a single test going red.
 *
 * This asserts they resolve THROUGH the entry point, and that the exports are
 * live values rather than types erased at runtime.
 */
import { describe, expect, it } from "vitest";
import * as engine from "../index.js";

describe("edge-lab public surface via the barrel", () => {
  it("exports the falsifier and it runs end to end", () => {
    expect(typeof engine.falsifyBind).toBe("function");
    const rows = Array.from({ length: 120 }, (_, i) => ({
      knownAtWeek: (i % 17) + 1,
      outcomeWeek: (i % 17) + 2,
      season: 2024,
      outcome: i % 2 === 0 ? 1 : 0,
      modelProb: i % 2 === 0 ? 0.62 : 0.41,
    }));
    const out = engine.falsifyBind(rows, { minN: 50, seed: 7 });
    expect(["SURVIVOR", "KILLED", "STARVED", "PARKED"]).toContain(out.overall.verdict);
  });

  it("exports cross-market helpers and named constants", () => {
    expect(typeof engine.impliedTeamVolume).toBe("function");
    expect(typeof engine.consistencyFlag).toBe("function");
    expect(engine.LEAGUE_AVG_PLAYS).toBe(64.0);
    expect(engine.CONSISTENCY_Z_THRESHOLD).toBe(2.5);
  });

  it("exports the PURE backtest computations", () => {
    expect(typeof engine.computeYacoeSignal).toBe("function");
    expect(typeof engine.computeSeparationBacktest).toBe("function");
    expect(typeof engine.computeTprBacktest).toBe("function");
  });

  it("stays CLIENT-SAFE: no file-I/O module reaches the barrel", () => {
    // This barrel is reachable from a client component
    // (apps/web/lib/fantasy/props.ts -> components/fantasy/props-edge.tsx), so
    // anything importing node:fs / node:path here fails the production build
    // with "Can't resolve 'fs'". That is exactly what exporting
    // run-real-backtest.ts did. Deep-import it in tests instead.
    expect(engine).not.toHaveProperty("runRealBacktest");
    expect(engine).not.toHaveProperty("DEFAULT_NGS_ROWS_PATH");
  });

  it("exports the pure NGS receiving signal layer", () => {
    expect(typeof engine.aggregateSeasonSignals).toBe("function");
    expect(engine.NGS_SEASON_SUMMARY_WEEK).toBe(0);
    expect(engine.NGS_FIRST_SEASON).toBe(2016);
  });

  it("exports the independent modelProb aggregator", () => {
    expect(typeof engine.aggregateModelProb).toBe("function");
    expect(engine.MODELPROB_AGGREGATION_METHOD_TAG).toBe("independent_modelprob_aggregation_v1");
    const baseline = engine.computeLeagueBaseline([
      { playerId: "a", signal: 1, n: 10, weight: 1 },
      { playerId: "b", signal: 3, n: 10, weight: 1 },
    ]);
    expect(baseline).not.toBeNull();
    const agg = engine.aggregateModelProb(
      [
        { playerId: "a", signal: 2.0, n: 40, weight: 0.6 },
        { playerId: "b", signal: 1.0, n: 30, weight: 0.4 },
      ],
      baseline!,
      { pLeague: 0.5, tau: 50, minTotalN: 60 },
    );
    expect(agg.ok).toBe(true);
    expect(agg.priced).toBe(false);
    expect(agg.modelProb).toBeGreaterThan(0);
    expect(agg.modelProb).toBeLessThan(1);
  });
});
