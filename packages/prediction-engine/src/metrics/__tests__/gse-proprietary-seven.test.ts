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

describe("the honest gap", () => {
  it("RLS returns gap with the named missing input", () => {
    const r = computeGseRls({ routeSeparation: [] });
    expect(r.source).toContain("separation tendency");
    expect(r.status).toBe("gap");
    expect(r.value).toBeNull();
  });

  it("SII gaps when no cell clears the floor", () => {
    const r = computeGseSii({ cells: [], flag: "motion", marginalEpa: 0 });
    expect(r.status).toBe("gap");
    expect(r.value).toBeNull();
  });

  it("SPESE gaps under the play floor", () => {
    const r = computeGseSpese({ stEpa: 0.1, stPlays: 4 });
    expect(r.status).toBe("gap");
    expect(r.value).toBeNull();
  });

  it("TOR gaps under the fumble floor", () => {
    const r = computeGseTor({ fumbles: 3, lost: 2 });
    expect(r.status).toBe("gap");
    expect(r.value).toBeNull();
  });
});
