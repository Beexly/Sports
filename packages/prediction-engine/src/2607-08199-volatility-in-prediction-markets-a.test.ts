/**
 * Vitest suite for arXiv:2607.08199 (Volatility in Prediction Markets: A Structural Approach).
 * Gate: ADOPT the structural forecaster if, on the 2025 NFL holdout, DR-AS improves on the GARCH(1,1) baseline by >=15% in volume-weighted interval score with the paired-bootstrap difference significant at 5%. REJECT (keep GARCH or constant vol) if the gain is <10% or insignificant — then cross-book spread is not a sufficient adverse-selection proxy in bookmaker (non-CLOB) markets.
 */
import { describe, it, expect } from "vitest";
import { drasVolatility, garchBaseline, intervalScoreWin } from "./2607-08199-volatility-in-prediction-markets-a";

describe("2607-08199 DR-AS structural volatility", () => {
  const pr = { base: 0.01, wTau: 0.005, wSpread: 0.4, wVol: 0.002 };
  it("volatility rises with time-to-kickoff, spread, and volume", () => {
    const calm = drasVolatility({ p: 0.5, tau: 1, s: 0.01, V: 5 }, pr);
    const wild = drasVolatility({ p: 0.5, tau: 48, s: 0.06, V: 500 }, pr);
    expect(wild).toBeGreaterThan(calm);
    expect(() => drasVolatility({ p: 0.5, tau: -1, s: 0, V: 0 }, pr)).toThrow();
  });
  it("GARCH baseline is stationary and sane", () => {
    const v = garchBaseline(0.01, 0.02, 0.001, 0.1, 0.85);
    expect(v).toBeGreaterThan(0);
    expect(() => garchBaseline(0.01, 0.02, 0.001, 0.5, 0.6)).toThrow();
  });
  it("interval-score win is positive when DR-AS intervals are tighter and cover", () => {
    const win = intervalScoreWin(0.5, 0.3, 0.7, 0.1, 0.9, 0.1);
    expect(win).toBeGreaterThan(0);
  });
});
