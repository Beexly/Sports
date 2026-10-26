import { describe, expect, it } from "vitest";
import {
  computeGseDwp,
  computeGseQptsr,
  computeGseQptsrFromTimes,
  computeGseRls,
  computeGseSii,
  computeGseSpese,
  computeGseTor,
} from "../gse-proprietary-seven";

describe("QPTSR moves when the sub-2s share moves", () => {
  it("rises with quick pressure share", () => {
    const quickHeavy = computeGseQptsr({ pressuresByBucket: { immediate: 60, fast: 20, mid: 15, late: 5 } });
    const slowHeavy = computeGseQptsr({ pressuresByBucket: { immediate: 10, fast: 20, mid: 40, late: 30 } });
    expect(quickHeavy.status).toBe("measured");
    expect((quickHeavy.value as number)).toBeGreaterThan(slowHeavy.value as number);
  });

  it("works from raw arrival times", () => {
    const r = computeGseQptsrFromTimes([1.2, 1.8, 2.7, 3.1]);
    expect(r.status).toBe("measured");
  });

  it("is a gap when there are no pressures", () => {
    expect(computeGseQptsr({ pressuresByBucket: { immediate: 0, fast: 0, mid: 0, late: 0 } }).status).toBe("gap");
  });
});

describe("DWP uses the pinned decision deltas", () => {
  it("go beats field goal", () => {
    expect(computeGseDwp("go").value as number).toBeGreaterThan(computeGseDwp("field_goal").value as number);
    expect(computeGseDwp("go").value).toBeCloseTo(0.1113, 4);
  });
});

describe("the five honest gaps", () => {
  it("returns gap with the named missing input", () => {
    expect(computeGseSii({ shellTable: [] }).source).toContain("shell table");
    expect(computeGseRls({ routeSeparation: [] }).source).toContain("participation");
    expect(computeGseSpese({ stPlays: [] }).source).toContain("special-teams");
    expect(computeGseTor({ fumbles: [] }).source).toContain("fumble-recovery");
    for (const r of [computeGseSii({ shellTable: [] }), computeGseRls({ routeSeparation: [] }), computeGseSpese({ stPlays: [] }), computeGseTor({ fumbles: [] })]) {
      expect(r.status).toBe("gap");
      expect(r.value).toBeNull();
    }
  });
});
