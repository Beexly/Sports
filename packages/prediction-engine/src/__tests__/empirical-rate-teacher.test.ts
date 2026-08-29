import { describe, it, expect } from "vitest";
import {
  fitEmpiricalRateTeacher,
  binIndexFromEdges,
  teacherGapReport,
  type TeacherSample,
  type ForecasterSample,
} from "../empirical-rate-teacher.js";

describe("fitEmpiricalRateTeacher — hierarchical shrinkage math", () => {
  it("hand-computed two-level shrinkage matches the paper's formula exactly", () => {
    // dims: [d0 cardinality 2, d1 cardinality 2]. Bucket (0,0): 8 wins / 10.
    // pseudocount M=25.
    const samples: TeacherSample[] = [
      ...Array.from({ length: 8 }, () => ({ y: 1 as const, bucket: [0, 0] })),
      ...Array.from({ length: 2 }, () => ({ y: 0 as const, bucket: [0, 0] })),
      // bucket (0,1): 3/5, so level-1 (dim0=0) totals: w=11, n=15
      ...Array.from({ length: 3 }, () => ({ y: 1 as const, bucket: [0, 1] })),
      ...Array.from({ length: 2 }, () => ({ y: 0 as const, bucket: [0, 1] })),
      // dim0=1 bucket, unrelated
      ...Array.from({ length: 4 }, () => ({ y: 1 as const, bucket: [1, 0] })),
      ...Array.from({ length: 6 }, () => ({ y: 0 as const, bucket: [1, 0] })),
    ];
    const model = fitEmpiricalRateTeacher(samples, {
      dims: [{ name: "d0", cardinality: 2 }, { name: "d1", cardinality: 2 }],
      pseudocount: 25,
    });

    const n = samples.length; // 25
    const globalRate = samples.reduce((s, x) => s + x.y, 0) / n; // (8+3+4)/25 = 15/25 = 0.6
    expect(model.globalRate).toBeCloseTo(0.6, 4);

    // Level 1 (dim0=0): w=11, n=15 -> shrunk toward globalRate
    const level1 = (11 + 25 * globalRate) / (15 + 25);
    // Level 2 (bucket [0,0]): w=8, n=10 -> shrunk toward level1
    const expected = (8 + 25 * level1) / (10 + 25);
    expect(model.predict([0, 0])).toBeCloseTo(expected, 6);
  });

  it("an unseen bucket falls back to its nearest observed ancestor level (parent formula, not global)", () => {
    const samples: TeacherSample[] = [
      ...Array.from({ length: 9 }, () => ({ y: 1 as const, bucket: [0, 0] })),
      ...Array.from({ length: 1 }, () => ({ y: 0 as const, bucket: [0, 0] })),
      // dim0=1 never appears with dim1=1, only dim1=0
      ...Array.from({ length: 2 }, () => ({ y: 1 as const, bucket: [1, 0] })),
      ...Array.from({ length: 8 }, () => ({ y: 0 as const, bucket: [1, 0] })),
    ];
    const model = fitEmpiricalRateTeacher(samples, {
      dims: [{ name: "d0", cardinality: 2 }, { name: "d1", cardinality: 2 }],
      pseudocount: 25,
    });
    const n = samples.length;
    const globalRate = samples.reduce((s, x) => s + x.y, 0) / n;
    // dim0=1 level: w=2, n=10
    const level1Dim1 = (2 + 25 * globalRate) / (10 + 25);
    // bucket [1,1] unseen at level 2 -> falls back to level1Dim1 exactly (w=0,n=0 in the formula reduces to parent)
    expect(model.predict([1, 1])).toBeCloseTo(level1Dim1, 6);
    // and it must differ from a bucket [1,0] that WAS observed and has real evidence pulling it down
    expect(model.predict([1, 0])).not.toBeCloseTo(level1Dim1, 4);
  });

  it("zero dimensions (no conditioning) always predicts the global rate", () => {
    const samples: TeacherSample[] = [
      { y: 1, bucket: [] },
      { y: 1, bucket: [] },
      { y: 0, bucket: [] },
    ];
    const model = fitEmpiricalRateTeacher(samples, { dims: [] });
    expect(model.predict([])).toBeCloseTo(2 / 3, 4);
    expect(model.globalRate).toBeCloseTo(2 / 3, 4);
  });

  it("zero samples predicts a neutral 0.5 and never throws", () => {
    const model = fitEmpiricalRateTeacher([], {
      dims: [{ name: "d0", cardinality: 3 }],
    });
    expect(model.globalRate).toBe(0.5);
    expect(model.sampleSize).toBe(0);
    expect(model.predict([0])).toBe(0.5);
  });

  it("more evidence at the same raw rate is shrunk less toward a differing parent (monotone shrinkage)", () => {
    // bucket A: raw 100% on n=2; bucket B: raw 100% on n=50; bucket C: raw 0%
    // on n=48 pulls the global rate down to 0.52, well below either A or B's
    // raw rate — so both A and B get pulled DOWN from 1.0, but B (n=50) has
    // far more evidence and must resist that pull much more than A (n=2).
    const samples: TeacherSample[] = [
      { y: 1, bucket: [0] }, { y: 1, bucket: [0] }, // A: n=2, raw 1.0
      ...Array.from({ length: 50 }, () => ({ y: 1 as const, bucket: [1] })), // B: n=50, raw 1.0
      ...Array.from({ length: 48 }, () => ({ y: 0 as const, bucket: [2] })), // C: n=48, raw 0.0
    ];
    const model = fitEmpiricalRateTeacher(samples, {
      dims: [{ name: "d0", cardinality: 3 }],
      pseudocount: 25,
    });
    const globalRate = 52 / 100;
    expect(model.globalRate).toBeCloseTo(globalRate, 6);
    const predictA = model.predict([0]);
    const predictB = model.predict([1]);
    expect(predictA).toBeCloseTo((2 + 25 * globalRate) / (2 + 25), 6);
    expect(predictB).toBeCloseTo((50 + 25 * globalRate) / (50 + 25), 6);
    // both raw rates are identical (1.0), so the gap is shrinkage alone —
    // B, with far more evidence, must land strictly closer to its raw rate.
    expect(predictB).toBeGreaterThan(predictA);
  });

  it("pseudocount 0 disables shrinkage — predict equals the raw observed bucket rate", () => {
    const samples: TeacherSample[] = [
      { y: 1, bucket: [0] }, { y: 1, bucket: [0] }, { y: 1, bucket: [0] }, { y: 0, bucket: [0] },
    ];
    const model = fitEmpiricalRateTeacher(samples, {
      dims: [{ name: "d0", cardinality: 1 }],
      pseudocount: 0,
    });
    expect(model.predict([0])).toBeCloseTo(0.75, 6);
  });

  it("pseudocount 0 with an unseen bucket leaves the prediction unchanged (no evidence, no prior mass)", () => {
    const samples: TeacherSample[] = [{ y: 1, bucket: [0] }, { y: 0, bucket: [0] }];
    const model = fitEmpiricalRateTeacher(samples, {
      dims: [{ name: "d0", cardinality: 2 }],
      pseudocount: 0,
    });
    expect(model.predict([1])).toBe(model.globalRate);
  });

  it("is deterministic — identical fit and predictions across repeated runs", () => {
    const samples: TeacherSample[] = Array.from({ length: 40 }, (_, i) => ({
      y: (i % 3 === 0 ? 1 : 0) as 0 | 1,
      bucket: [i % 2, i % 4],
    }));
    const config = { dims: [{ name: "d0", cardinality: 2 }, { name: "d1", cardinality: 4 }], pseudocount: 10 };
    const a = fitEmpiricalRateTeacher(samples, config);
    const b = fitEmpiricalRateTeacher(samples, config);
    for (const bucket of [[0, 0], [1, 3], [0, 2]]) {
      expect(a.predict(bucket)).toBe(b.predict(bucket));
    }
  });

  it("bucketCount reports the number of distinct observed full buckets", () => {
    const samples: TeacherSample[] = [
      { y: 1, bucket: [0, 0] }, { y: 0, bucket: [0, 0] },
      { y: 1, bucket: [0, 1] },
      { y: 1, bucket: [1, 0] },
    ];
    const model = fitEmpiricalRateTeacher(samples, {
      dims: [{ name: "d0", cardinality: 2 }, { name: "d1", cardinality: 2 }],
    });
    expect(model.bucketCount).toBe(3);
  });
});

describe("fitEmpiricalRateTeacher — validation", () => {
  it("throws on a negative pseudocount", () => {
    expect(() => fitEmpiricalRateTeacher([], { dims: [], pseudocount: -1 })).toThrow(RangeError);
  });

  it("throws on non-integer or non-positive dim cardinality", () => {
    expect(() => fitEmpiricalRateTeacher([], { dims: [{ name: "d0", cardinality: 0 }] })).toThrow(RangeError);
    expect(() => fitEmpiricalRateTeacher([], { dims: [{ name: "d0", cardinality: 1.5 }] })).toThrow(RangeError);
  });

  it("throws when a sample's bucket length doesn't match dims length", () => {
    const dims = [{ name: "d0", cardinality: 2 }, { name: "d1", cardinality: 2 }];
    expect(() => fitEmpiricalRateTeacher([{ y: 1, bucket: [0] }], { dims })).toThrow(RangeError);
  });

  it("throws when a bucket index is out of range for its dimension", () => {
    const dims = [{ name: "d0", cardinality: 2 }];
    expect(() => fitEmpiricalRateTeacher([{ y: 1, bucket: [2] }], { dims })).toThrow(RangeError);
    expect(() => fitEmpiricalRateTeacher([{ y: 1, bucket: [-1] }], { dims })).toThrow(RangeError);
    expect(() => fitEmpiricalRateTeacher([{ y: 1, bucket: [0.5] }], { dims })).toThrow(RangeError);
  });

  it("predict throws when called with the wrong number of dims", () => {
    const model = fitEmpiricalRateTeacher([{ y: 1, bucket: [0] }], { dims: [{ name: "d0", cardinality: 1 }] });
    expect(() => model.predict([0, 0])).toThrow(RangeError);
  });
});

describe("binIndexFromEdges", () => {
  const edges = [0.4, 0.5, 0.55, 0.6, 0.65]; // 5 edges -> 6 bands, matching the paper-spec q-band example

  it("bins below the first edge into band 0", () => {
    expect(binIndexFromEdges(0.1, edges)).toBe(0);
    expect(binIndexFromEdges(0.39, edges)).toBe(0);
  });

  it("bins exactly on an edge into the band it starts (>= semantics)", () => {
    expect(binIndexFromEdges(0.4, edges)).toBe(1);
    expect(binIndexFromEdges(0.5, edges)).toBe(2);
    expect(binIndexFromEdges(0.65, edges)).toBe(5);
  });

  it("bins above the last edge into the final band", () => {
    expect(binIndexFromEdges(0.99, edges)).toBe(5);
  });

  it("produces exactly edges.length + 1 distinct bands over a full sweep", () => {
    const seen = new Set<number>();
    for (let v = 0; v <= 1; v += 0.01) seen.add(binIndexFromEdges(v, edges));
    expect(seen.size).toBe(edges.length + 1);
  });
});

describe("teacherGapReport", () => {
  it("a forecaster identical to the teacher has zero mean gap", () => {
    const samples: TeacherSample[] = [
      { y: 1, bucket: [0] }, { y: 1, bucket: [0] }, { y: 0, bucket: [0] },
      { y: 0, bucket: [1] }, { y: 0, bucket: [1] }, { y: 1, bucket: [1] },
    ];
    const teacher = fitEmpiricalRateTeacher(samples, { dims: [{ name: "d0", cardinality: 2 }], pseudocount: 5 });
    const forecasts: ForecasterSample[] = samples.map((s) => ({
      bucket: s.bucket,
      y: s.y,
      p: teacher.predict(s.bucket),
    }));
    const report = teacherGapReport(forecasts, teacher);
    expect(report.meanAbsGap).toBeCloseTo(0, 6);
    // forecaster IS the teacher here, so their Briers against outcomes must match exactly
    expect(report.forecasterBrier).toBeCloseTo(report.teacherBrier, 6);
  });

  it("a forecaster that ignores state (constant 0.5) shows a real gap in an informative bucket", () => {
    const samples: TeacherSample[] = [
      ...Array.from({ length: 9 }, () => ({ y: 1 as const, bucket: [0] })),
      { y: 0 as const, bucket: [0] },
    ];
    const teacher = fitEmpiricalRateTeacher(samples, { dims: [{ name: "d0", cardinality: 1 }], pseudocount: 1 });
    const forecasts: ForecasterSample[] = samples.map((s) => ({ bucket: s.bucket, y: s.y, p: 0.5 }));
    const report = teacherGapReport(forecasts, teacher);
    expect(report.meanAbsGap).toBeGreaterThan(0.2); // teacher sits near 0.9, forecaster flat at 0.5
    // the teacher, having actually conditioned on the (highly informative, if
    // overfit) bucket, must score no worse than the constant-0.5 forecaster here
    expect(report.teacherBrier).toBeLessThanOrEqual(report.forecasterBrier);
  });

  it("groups per-bucket rows correctly and reports per-bucket forecaster mean", () => {
    const samples: TeacherSample[] = [
      { y: 1, bucket: [0] }, { y: 0, bucket: [0] }, { y: 1, bucket: [1] },
    ];
    const teacher = fitEmpiricalRateTeacher(samples, { dims: [{ name: "d0", cardinality: 2 }] });
    const forecasts: ForecasterSample[] = [
      { bucket: [0], y: 1, p: 0.6 },
      { bucket: [0], y: 0, p: 0.8 },
      { bucket: [1], y: 1, p: 0.3 },
    ];
    const report = teacherGapReport(forecasts, teacher);
    expect(report.buckets).toHaveLength(2);
    const bucket0 = report.buckets.find((b) => b.key === "0")!;
    expect(bucket0.n).toBe(2);
    expect(bucket0.forecasterMeanP).toBeCloseTo(0.7, 4);
  });

  it("returns a zeroed report for an empty forecast set without throwing", () => {
    const teacher = fitEmpiricalRateTeacher([], { dims: [{ name: "d0", cardinality: 1 }] });
    const report = teacherGapReport([], teacher);
    expect(report).toEqual({ sampleSize: 0, meanAbsGap: 0, forecasterBrier: 0, teacherBrier: 0, buckets: [] });
  });
});
