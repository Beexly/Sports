import { describe, expect, it } from "vitest";
import type { CalibrationSample } from "@sports/prediction-engine";
import {
  buildDurableMetricsFromSamples,
  picksToCalibrationSamples,
  type PickRowForCal,
} from "@/lib/ops/compute-live-calibration-metrics";

function moneylinePick(
  overrides: Partial<PickRowForCal> &
    Pick<PickRowForCal, "confidence" | "result">,
): PickRowForCal {
  return {
    pickType: "MONEYLINE",
    modelVersion: null,
    settledAt: null,
    ...overrides,
  };
}

describe("picksToCalibrationSamples", () => {
  it("returns empty samples, empty versions, and null dates for no picks", () => {
    const built = picksToCalibrationSamples([]);
    expect(built.samples).toEqual([]);
    expect(built.modelVersions).toEqual([]);
    expect(built.settledFrom).toBeNull();
    expect(built.settledTo).toBeNull();
  });

  it("keeps a single modelVersion and ISO-settled range from honest MONEYLINE rows", () => {
    const built = picksToCalibrationSamples([
      moneylinePick({
        confidence: 62,
        result: "WIN",
        modelVersion: "v5.2.6",
        settledAt: new Date("2026-04-02T11:00:00.000Z"),
      }),
      moneylinePick({
        confidence: 58,
        result: "LOSS",
        modelVersion: "v5.2.6",
        settledAt: new Date("2026-04-09T19:30:00.000Z"),
      }),
    ]);
    expect(built.samples).toHaveLength(2);
    expect(built.modelVersions).toEqual(["v5.2.6"]);
    expect(built.settledFrom).toBe("2026-04-02T11:00:00.000Z");
    expect(built.settledTo).toBe("2026-04-09T19:30:00.000Z");
  });

  it("collapses mixed modelVersions in first-seen order", () => {
    const versions = ["v1", "v2", "v3", "v4", "v5"];
    const built = picksToCalibrationSamples(
      versions.map((modelVersion, i) =>
        moneylinePick({
          confidence: 55 + i,
          result: i % 2 === 0 ? "WIN" : "LOSS",
          modelVersion,
        }),
      ),
    );
    expect(built.modelVersions).toEqual(versions);
  });
});

describe("buildDurableMetricsFromSamples", () => {
  it("empty samples → status collecting, n=0, overall null (never invented)", () => {
    const payload = buildDurableMetricsFromSamples({
      samples: [],
      modelVersions: [],
      settledFrom: null,
      settledTo: null,
    });
    expect(payload.status).toBe("collecting");
    expect(payload.n).toBe(0);
    expect(payload.overall).toBeNull();
    expect(payload.modelVersion).toBeNull();
    expect(payload.dateRange).toBeNull();
  });

  it("empty samples from picksToCalibrationSamples stay collecting with no overall", () => {
    const mapped = picksToCalibrationSamples([]);
    const payload = buildDurableMetricsFromSamples(mapped);
    expect(payload.status).toBe("collecting");
    expect(payload.n).toBe(0);
    expect(payload.overall).toBeNull();
  });

  it("mixed modelVersions collapse to mixed:v1,v2,... and cap the joined string at 4", () => {
    const payload = buildDurableMetricsFromSamples({
      samples: [{ p: 0.6, y: 1 }],
      modelVersions: ["v1", "v2", "v3", "v4", "v5"],
      settledFrom: "2026-01-01T00:00:00.000Z",
      settledTo: "2026-01-02T00:00:00.000Z",
    });
    expect(payload.modelVersion).toBe("mixed:v1,v2,v3,v4");
    expect(payload.modelVersion?.startsWith("mixed:")).toBe(true);
    const joined = (payload.modelVersion ?? "").slice("mixed:".length);
    expect(joined.split(",")).toHaveLength(4);
    expect(joined).not.toContain("v5");
  });

  it("a single modelVersion passes through unchanged", () => {
    const payload = buildDurableMetricsFromSamples({
      samples: [{ p: 0.55, y: 0 }],
      modelVersions: ["v5.2.6"],
      settledFrom: "2026-02-01T00:00:00.000Z",
      settledTo: "2026-02-10T00:00:00.000Z",
    });
    expect(payload.modelVersion).toBe("v5.2.6");
    expect(payload.modelVersion?.startsWith("mixed:")).toBe(false);
  });

  it("dateRange formats YYYY-MM-DD…YYYY-MM-DD via slice(0,10); both-null is null", () => {
    const ranged = buildDurableMetricsFromSamples({
      samples: [{ p: 0.5, y: 1 }],
      modelVersions: ["v1"],
      settledFrom: "2026-03-01T08:15:00.000Z",
      settledTo: "2026-03-18T22:00:00.000Z",
    });
    expect(ranged.dateRange).toBe("2026-03-01…2026-03-18");

    const bothNull = buildDurableMetricsFromSamples({
      samples: [{ p: 0.5, y: 1 }],
      modelVersions: ["v1"],
      settledFrom: null,
      settledTo: null,
    });
    expect(bothNull.dateRange).toBeNull();

    const oneSided = buildDurableMetricsFromSamples({
      samples: [{ p: 0.5, y: 1 }],
      modelVersions: ["v1"],
      settledFrom: "2026-03-01T08:15:00.000Z",
      settledTo: null,
    });
    expect(oneSided.dateRange).toBeNull();
  });

  it("overall.mce equals hand-computed max |meanForecast − observedRate| on two tight clusters", () => {
    // Default reliabilityCurve bins = 10, width 0.1.
    // Cluster A lands in bin [0.2, 0.3): p = 0.21, 0.22, 0.23; y = 1, 1, 0
    //   meanForecast = (0.21+0.22+0.23)/3 = 0.22  (round 4dp = 0.22)
    //   observedRate = 2/3 ≈ 0.666666…            (round 4dp = 0.6667)
    //   |dev| = |0.22 − 0.6667| = 0.4467
    // Cluster B lands in bin [0.8, 0.9): p = 0.81, 0.82; y = 0, 0
    //   meanForecast = (0.81+0.82)/2 = 0.815       (round 4dp = 0.815)
    //   observedRate = 0
    //   |dev| = 0.815
    // MCE = max(0.4467, 0.815) = 0.815
    const samples: readonly CalibrationSample[] = [
      { p: 0.21, y: 1 },
      { p: 0.22, y: 1 },
      { p: 0.23, y: 0 },
      { p: 0.81, y: 0 },
      { p: 0.82, y: 0 },
    ];
    const meanA = (0.21 + 0.22 + 0.23) / 3;
    const observedA = 2 / 3;
    const meanB = (0.81 + 0.82) / 2;
    const observedB = 0;
    const round4 = (x: number) => Math.round(x * 10_000) / 10_000;
    const handMce = Math.max(
      Math.abs(round4(meanA) - round4(observedA)),
      Math.abs(round4(meanB) - round4(observedB)),
    );
    expect(handMce).toBe(0.815);

    const payload = buildDurableMetricsFromSamples({
      samples,
      modelVersions: ["synth-two-cluster"],
      settledFrom: "2026-05-01T00:00:00.000Z",
      settledTo: "2026-05-02T00:00:00.000Z",
    });
    expect(payload.status).toBe("ok");
    expect(payload.n).toBe(5);
    expect(payload.overall).not.toBeNull();
    expect(payload.overall?.mce).toBe(handMce);
  });
});
