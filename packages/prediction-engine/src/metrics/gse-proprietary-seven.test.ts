import { describe, expect, it } from "vitest";

import {
  computeGseSii,
  computeGseSpese,
  computeGseTor,
  computeGseRls,
  TOR_LEAGUE_RECOVERY_RATE,
  SII_MOTION_MARGINAL_EPA,
  type SiiCell,
} from "./gse-proprietary-seven.js";

const CELLS: SiiCell[] = [
  { flag: "motion", boxBucket: "7", epa: -0.0248, n: 1302 },
  { flag: "motion", boxBucket: "9+", epa: 0.1231, n: 61 },
  { flag: "play_action", boxBucket: "7", epa: 0.05, n: 3 },
];

describe("SII", () => {
  it("weights cells by n and subtracts the marginal", () => {
    const r = computeGseSii({ cells: CELLS, flag: "motion", marginalEpa: SII_MOTION_MARGINAL_EPA });
    expect(r.status).toBe("measured");
    const expected = (-0.0248 * 1302 + 0.1231 * 61) / 1363 - SII_MOTION_MARGINAL_EPA;
    expect(r.value).toBeCloseTo(expected, 4);
  });

  it("drops cells under the n floor", () => {
    const r = computeGseSii({ cells: CELLS, flag: "play_action", marginalEpa: 0 });
    expect(r.status).toBe("gap");
    expect(r.value).toBeNull();
  });

  it("gaps when no cell for the flag clears the floor", () => {
    const r = computeGseSii({ cells: CELLS, flag: "rpo", marginalEpa: 0 });
    expect(r.status).toBe("gap");
  });
});

describe("TOR", () => {
  it("measures against the league rate, not the coin", () => {
    const r = computeGseTor({ fumbles: 8, lost: 6 });
    expect(r.status).toBe("measured");
    expect(r.value).toBeCloseTo(0.75 - TOR_LEAGUE_RECOVERY_RATE, 4);
  });

  it("is negative when a team recovers below league", () => {
    const r = computeGseTor({ fumbles: 10, lost: 2 });
    expect(r.value).toBeLessThan(0);
  });

  it("gaps under the fumble floor", () => {
    expect(computeGseTor({ fumbles: 3, lost: 2 }).status).toBe("gap");
  });
});

describe("SPESE", () => {
  it("measures mean ST epa", () => {
    const r = computeGseSpese({ stEpa: -0.0317, stPlays: 601 });
    expect(r.status).toBe("measured");
    expect(r.value).toBeCloseTo(-0.0317, 4);
  });

  it("gaps under the play floor", () => {
    expect(computeGseSpese({ stEpa: 0.1, stPlays: 4 }).status).toBe("gap");
  });
});

describe("RLS", () => {
  it("is still an honest gap", () => {
    const r = computeGseRls({ routeSeparation: [] });
    expect(r.status).toBe("gap");
    expect(r.source).toContain("NGS");
  });
});
