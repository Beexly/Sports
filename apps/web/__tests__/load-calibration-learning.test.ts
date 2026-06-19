import { describe, it, expect } from "vitest";

import {
  buildCalibrationLearningReport,
  CALIBRATION_LEARNING_MIN_SAMPLE,
  type LearningSnapshotRecord,
  type SignalFlagKey,
} from "@/lib/cockpit/load-calibration-learning";

/**
 * Unit tests for the PURE calibration-learning aggregator (array → report).
 *
 * No DB is touched — `buildCalibrationLearningReport` is a pure function. We feed
 * it fixture record arrays and assert the signal-vs-outcome contingency (per-arm
 * win rate + Wilson CI, the difference), the exploratory signal-count correlation,
 * the omit-unobserved-signal rule, and the honest below-floor INSUFFICIENT state.
 *
 * Honesty is the point: the floor (100) is far above any realistic learning sample,
 * so the OK status is only reachable with a large fixture; small fixtures stay
 * INSUFFICIENT, which is the intended self-suppression.
 */

type ResultLit = LearningSnapshotRecord["result"];

const ALL_FLAG_KEYS: readonly SignalFlagKey[] = [
  "hadLineMovementSignal",
  "hadRestSignal",
  "hadScheduleSignal",
  "hadAtsFormSignal",
  "hadH2HSignal",
  "hadVenueSignal",
  "hadWeatherSignal",
  "hadInjurySignal",
  "hadRatingsSignal",
  "hadPlayerSignal",
  "hadOfficialsSignal",
  "hadVenueEnvironmentSignal",
  "hadPaceSignal",
  "hadMilestoneSignal",
];

/** All-false flag map, optionally overriding specific flags to true. */
function flags(active: Partial<Record<SignalFlagKey, boolean>> = {}): Record<SignalFlagKey, boolean> {
  const out = {} as Record<SignalFlagKey, boolean>;
  for (const k of ALL_FLAG_KEYS) out[k] = active[k] ?? false;
  return out;
}

function rec(result: ResultLit, active: Partial<Record<SignalFlagKey, boolean>> = {}): LearningSnapshotRecord {
  return { result, flags: flags(active) };
}

function many(n: number, result: ResultLit, active: Partial<Record<SignalFlagKey, boolean>> = {}): LearningSnapshotRecord[] {
  return Array.from({ length: n }, () => rec(result, active));
}

describe("buildCalibrationLearningReport — honest empty / below floor", () => {
  it("empty input is INSUFFICIENT with honest zeros and no contingencies", () => {
    const r = buildCalibrationLearningReport([]);
    expect(r.status).toBe("INSUFFICIENT");
    expect(r.totalRecords).toBe(0);
    expect(r.decidedRecords).toBe(0);
    expect(r.floor).toBe(CALIBRATION_LEARNING_MIN_SAMPLE);
    expect(r.insufficientNote).toBeTypeOf("string");
    expect(r.contingencies).toHaveLength(0);
    expect(r.signalCountCorrelation.decided).toBe(0);
    expect(r.signalCountCorrelation.r).toBeNull();
  });

  it("a small co-occurring sample stays INSUFFICIENT (the exploratory floor)", () => {
    // 8 wins with the line-movement signal active, 8 losses without it. This is a
    // textbook "co-occurs with wins" pattern — but the sample is far below the
    // floor, so the surface must NOT promote it to OK.
    const records = [
      ...many(8, "WIN", { hadLineMovementSignal: true }),
      ...many(8, "LOSS", {}),
    ];
    const r = buildCalibrationLearningReport(records);
    expect(r.status).toBe("INSUFFICIENT");
    expect(r.decidedRecords).toBe(16);
    expect(r.insufficientNote).toContain("exploratory");
  });
});

describe("buildCalibrationLearningReport — contingency math", () => {
  it("computes per-arm win rates, the difference, and Wilson intervals for a signal that co-occurs with wins", () => {
    // With signal: 8 WIN / 2 LOSS (80%). Without signal: 2 WIN / 8 LOSS (20%).
    const records = [
      ...many(8, "WIN", { hadRestSignal: true }),
      ...many(2, "LOSS", { hadRestSignal: true }),
      ...many(2, "WIN", {}),
      ...many(8, "LOSS", {}),
    ];
    const r = buildCalibrationLearningReport(records);

    const rest = r.contingencies.find((c) => c.key === "hadRestSignal");
    expect(rest).toBeDefined();
    if (!rest) throw new Error("rest contingency missing");

    expect(rest.withSignal.decided).toBe(10);
    expect(rest.withSignal.wins).toBe(8);
    expect(rest.withSignal.losses).toBe(2);
    expect(rest.withSignal.winRate).toBeCloseTo(0.8, 10);

    expect(rest.withoutSignal.decided).toBe(10);
    expect(rest.withoutSignal.wins).toBe(2);
    expect(rest.withoutSignal.winRate).toBeCloseTo(0.2, 10);

    // Difference is the raw co-occurrence delta (with − without).
    expect(rest.winRateDifference).toBeCloseTo(0.6, 10);

    // Wilson interval present, inside [0,1], and (on this small sample) wide —
    // the lower bound on the with-signal arm sits well below the 80% point.
    expect(rest.withSignal.ci95).not.toBeNull();
    if (rest.withSignal.ci95) {
      const [lo, hi] = rest.withSignal.ci95;
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(1);
      expect(lo).toBeLessThan(0.8);
      expect(hi).toBeGreaterThan(0.8);
    }
  });

  it("PUSH/VOID/PENDING are excluded from the decided arms", () => {
    const records = [
      rec("WIN", { hadAtsFormSignal: true }),
      rec("LOSS", { hadAtsFormSignal: true }),
      rec("PUSH", { hadAtsFormSignal: true }),
      rec("VOID", { hadAtsFormSignal: true }),
      rec("PENDING", { hadAtsFormSignal: true }),
    ];
    const r = buildCalibrationLearningReport(records);
    expect(r.totalRecords).toBe(5);
    expect(r.decidedRecords).toBe(2);

    const ats = r.contingencies.find((c) => c.key === "hadAtsFormSignal");
    expect(ats).toBeDefined();
    if (!ats) throw new Error("ats contingency missing");
    // Only the WIN + LOSS decide the with-signal arm.
    expect(ats.withSignal.decided).toBe(2);
    expect(ats.withSignal.wins).toBe(1);
    expect(ats.withSignal.losses).toBe(1);
  });
});

describe("buildCalibrationLearningReport — omit-unobserved-signal rule", () => {
  it("omits a signal that is present in zero loaded picks", () => {
    // Only the H2H signal is ever active across the sample.
    const records = [
      ...many(3, "WIN", { hadH2HSignal: true }),
      ...many(3, "LOSS", { hadH2HSignal: true }),
    ];
    const r = buildCalibrationLearningReport(records);

    // H2H is observed → present.
    expect(r.contingencies.some((c) => c.key === "hadH2HSignal")).toBe(true);
    // Every other signal was never active → omitted entirely (no 0% row).
    expect(r.contingencies.some((c) => c.key === "hadWeatherSignal")).toBe(false);
    expect(r.contingencies.some((c) => c.key === "hadRestSignal")).toBe(false);
    // Exactly one signal observed.
    expect(r.contingencies).toHaveLength(1);
  });

  it("an arm with no decided picks reports null rate, null CI, null difference", () => {
    // Venue signal is active on every pick → the without-signal arm is empty.
    const records = [
      ...many(4, "WIN", { hadVenueSignal: true }),
      ...many(2, "LOSS", { hadVenueSignal: true }),
    ];
    const r = buildCalibrationLearningReport(records);
    const venue = r.contingencies.find((c) => c.key === "hadVenueSignal");
    expect(venue).toBeDefined();
    if (!venue) throw new Error("venue contingency missing");

    expect(venue.withSignal.decided).toBe(6);
    expect(venue.withoutSignal.decided).toBe(0);
    expect(venue.withoutSignal.winRate).toBeNull();
    expect(venue.withoutSignal.ci95).toBeNull();
    // No difference when one arm has no decided picks — not fabricated as 0.
    expect(venue.winRateDifference).toBeNull();
  });
});

describe("buildCalibrationLearningReport — signal-count correlation", () => {
  it("reports a Pearson r when signal-count varies with outcome", () => {
    // More active signals on wins than on losses → positive correlation.
    const records = [
      ...many(5, "WIN", { hadRestSignal: true, hadAtsFormSignal: true, hadH2HSignal: true }),
      ...many(5, "LOSS", { hadRestSignal: true }),
    ];
    const r = buildCalibrationLearningReport(records);
    expect(r.signalCountCorrelation.decided).toBe(10);
    expect(r.signalCountCorrelation.r).not.toBeNull();
    if (r.signalCountCorrelation.r !== null) {
      expect(r.signalCountCorrelation.r).toBeGreaterThan(0);
      expect(r.signalCountCorrelation.r).toBeLessThanOrEqual(1);
    }
  });

  it("reports null r when signal-count has zero variance", () => {
    // Every decided pick has exactly the same single active signal → no variance
    // in x → Pearson r is undefined → null (never fabricated as 0).
    const records = [
      ...many(3, "WIN", { hadRestSignal: true }),
      ...many(3, "LOSS", { hadRestSignal: true }),
    ];
    const r = buildCalibrationLearningReport(records);
    expect(r.signalCountCorrelation.r).toBeNull();
  });
});
