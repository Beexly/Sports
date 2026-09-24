
import { describe, expect, it } from "vitest";
import { buildLagMatrix, lagCovariateRow, sportsCovariateRow, SPORTS_LAGS } from "./lag-covariates";

describe("lag-covariates", () => {
  it("builds the lag matrix with NaN for unavailable lags", () => {
    const m = buildLagMatrix([10, 20, 30], [1, 2]);
    expect(m[0]).toEqual([NaN, NaN]);
    expect(m[2]).toEqual([20, 10]);
  });
  it("uses the sports lag set by default", () => {
    const m = buildLagMatrix(new Array(20).fill(1));
    expect(m[19]?.length).toBe(SPORTS_LAGS.length);
  });
  it("sports covariates encode dome/travel sensibly", () => {
    const row = sportsCovariateRow({ restDiffDays: 2, travelMiles: 0, dome: true, opponentRollingEpa: 0.1, lineMove: -1 });
    expect(row).toEqual([2, 0, 1, 0.1, -1]);
  });
  it("lagCovariateRow concatenates lags and covariates", () => {
    const row = lagCovariateRow([1, 2, 3, 4], 3, { restDiffDays: 0, travelMiles: 100, dome: false, opponentRollingEpa: 0, lineMove: 0 }, [1, 2]);
    expect(row.slice(0, 2)).toEqual([3, 2]);
    expect(row.length).toBe(7);
  });
  it("empty series yields empty matrix", () => {
    expect(buildLagMatrix([], [1])).toEqual([]);
  });
});
