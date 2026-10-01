/**
 * Tests for the tuning-sample builder (`apps/web/lib/ops/tuning-sample.ts`) —
 * the production caller `tuneSignalWeights` never had.
 *
 * The contract: only eligible, decisively-settled snapshots enter the sample;
 * PUSH/unsettled rows are excluded; directional readings use the documented
 * normalizations; flag-only categories are reported, never invented.
 */
import { describe, it, expect } from "vitest";
import {
  buildTuningSample,
  tuneFromSnapshots,
  type TuningSnapshot,
} from "@/lib/ops/tuning-sample";

function snap(overrides: Partial<TuningSnapshot> = {}): TuningSnapshot {
  return {
    pickId: "pick-1",
    settlementResult: "WIN",
    hadLineMovementSignal: false,
    lineMovementDelta: null,
    hadRestSignal: false,
    restAdvantageNet: null,
    hadOddsSignal: false,
    hadScheduleSignal: false,
    hadAtsFormSignal: false,
    hadH2HSignal: false,
    hadVenueSignal: false,
    hadWeatherSignal: false,
    hadInjurySignal: false,
    hadRatingsSignal: false,
    hadPlayerSignal: false,
    hadOfficialsSignal: false,
    hadVenueEnvironmentSignal: false,
    hadPaceSignal: false,
    hadMilestoneSignal: false,
    ...overrides,
  };
}

describe("buildTuningSample", () => {
  it("emits directional outcomes with the documented normalizations", () => {
    const s = buildTuningSample([
      snap({ hadLineMovementSignal: true, lineMovementDelta: 3.5 }),
      snap({ pickId: "pick-2", settlementResult: "LOSS", hadRestSignal: true, restAdvantageNet: -7 }),
    ]);

    expect(s.snapshotsUsed).toBe(2);
    expect(s.snapshotsSkippedUnsettled).toBe(0);
    expect(s.outcomes).toHaveLength(2);
    expect(s.outcomes[0]).toEqual({ key: "line_movement", value: 0.5, outcome: 1 });
    expect(s.outcomes[1]).toEqual({ key: "rest_advantage", value: -1, outcome: 0 });
  });

  it("clamps extreme readings to [-1, 1] rather than exploding", () => {
    const s = buildTuningSample([
      snap({ hadLineMovementSignal: true, lineMovementDelta: 21 }),
    ]);
    expect(s.outcomes[0]!.value).toBe(1);
  });

  it("excludes PUSH and unsettled snapshots", () => {
    const s = buildTuningSample([
      snap({ pickId: "a", settlementResult: "PUSH", hadLineMovementSignal: true, lineMovementDelta: 3 }),
      snap({ pickId: "b", settlementResult: null, hadRestSignal: true, restAdvantageNet: 2 }),
      snap({ pickId: "c", settlementResult: "WIN", hadLineMovementSignal: true, lineMovementDelta: 3 }),
    ]);

    expect(s.snapshotsUsed).toBe(1);
    expect(s.snapshotsSkippedUnsettled).toBe(2);
    expect(s.outcomes).toHaveLength(1);
  });

  it("reports flag-only categories instead of inventing readings", () => {
    const s = buildTuningSample([
      snap({ hadWeatherSignal: true, hadInjurySignal: true, hadLineMovementSignal: true }),
    ]);

    expect(s.outcomes).toHaveLength(0);
    expect(s.keysWithoutReading).toContain("weather");
    expect(s.keysWithoutReading).toContain("injury");
    expect(s.keysWithoutReading).toContain("line_movement");
  });
});

describe("tuneFromSnapshots", () => {
  it("runs the real tuner and marks tiny samples insufficient", () => {
    const report = tuneFromSnapshots([
      snap({ hadLineMovementSignal: true, lineMovementDelta: 3.5 }),
      snap({ pickId: "pick-2", settlementResult: "LOSS", hadLineMovementSignal: true, lineMovementDelta: -2 }),
    ]);

    expect(report.snapshotsUsed).toBe(2);
    expect(report.keyOutcomes).toBe(2);
    const w = report.weights.find((x) => x.key === "line_movement");
    expect(w).toBeDefined();
    // 2 samples < MIN_SAMPLES (100): the tuner must refuse weight, not guess.
    expect(w!.verdict).toBe("insufficient-sample");
    expect(w!.multiplier).toBe(0);
  });
});
