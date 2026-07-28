import { describe, it, expect } from "vitest";
import {
  filterCalibrationAsOf,
  selectQuoteAsOf,
  LeakageError,
  assertQuoteAsOf,
} from "../asof";
import {
  decideHistCandidate,
  testOnlyPointInterval,
  DEFAULT_HIST_THRESHOLDS,
} from "../multiprob-decision";
import { monthlySlices } from "../walk-forward";
import { brierScore, riskCoverage } from "../metrics";
import type { HistCalibrationRow, HistCandidate } from "../types";

describe("as-of guards", () => {
  const t = new Date("2024-06-01T18:00:00Z");
  it("filters calibration before t", () => {
    const rows: HistCalibrationRow[] = [
      {
        decisionTime: new Date("2024-05-01T00:00:00Z"),
        score: 0.6,
        label: 1,
        stratum: { sport: "MLB", market: "SPREAD", modelVersion: "v1" },
      },
      {
        decisionTime: new Date("2024-06-02T00:00:00Z"),
        score: 0.6,
        label: 1,
        stratum: { sport: "MLB", market: "SPREAD", modelVersion: "v1" },
      },
    ];
    expect(filterCalibrationAsOf(rows, t)).toHaveLength(1);
  });

  it("rejects future quote", () => {
    expect(() =>
      assertQuoteAsOf(
        { fetchedAt: new Date("2024-06-01T19:00:00Z"), q: 0.5 },
        t,
      ),
    ).toThrow(LeakageError);
  });

  it("selects latest quote ≤ t", () => {
    const q = selectQuoteAsOf(
      [
        { fetchedAt: new Date("2024-06-01T10:00:00Z"), q: 0.48 },
        { fetchedAt: new Date("2024-06-01T17:00:00Z"), q: 0.51 },
        { fetchedAt: new Date("2024-06-01T20:00:00Z"), q: 0.9 },
      ],
      t,
    );
    expect(q?.q).toBe(0.51);
  });
});

describe("decideHistCandidate", () => {
  const stratum = { sport: "MLB", market: "SPREAD", modelVersion: "v1" };
  const cal: HistCalibrationRow[] = Array.from({ length: 100 }, (_, i) => ({
    decisionTime: new Date("2024-01-15T00:00:00Z"),
    score: 0.55,
    label: (i % 2) as 0 | 1,
    stratum,
  }));

  it("INSUFFICIENT_SAMPLE when n < 100", () => {
    const c: HistCandidate = {
      id: "c1",
      decisionTime: new Date("2024-06-01T18:00:00Z"),
      score: 0.7,
      stratum,
      quote: { fetchedAt: new Date("2024-06-01T17:00:00Z"), q: 0.5 },
      placeable: true,
      handicapOk: true,
    };
    const d = decideHistCandidate(c, cal.slice(0, 50), {
      intervalFn: testOnlyPointInterval,
      thresholds: DEFAULT_HIST_THRESHOLDS,
    });
    expect(d.kind).toBe("NO_BET");
    expect(d.reasons).toContain("INSUFFICIENT_SAMPLE");
  });
});

describe("walk-forward + metrics", () => {
  it("monthlySlices", () => {
    expect(monthlySlices(2023, 2023)).toHaveLength(12);
  });
  it("brier", () => {
    expect(brierScore(0.7, 1)).toBeCloseTo(0.09);
    expect(riskCoverage([]).nTotal).toBe(0);
  });
});
