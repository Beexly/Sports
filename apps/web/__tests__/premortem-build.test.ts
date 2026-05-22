import { describe, expect, it } from "vitest";
import { buildPickPremortemNote, type PickPremortemPickInput, type PickPremortemSnapshotInput } from "@/lib/premortem/build";

const pick: PickPremortemPickInput = {
  id: "pick_1",
  selection: "Boston Celtics -4.5",
  pickType: "SPREAD",
  confidence: 72,
  edgeScore: 6.4,
  consensusPct: 0.63,
  bookmakerCount: 8,
  riskLevel: "MODERATE",
  modelVersion: "v5.1.0",
};

const snapshot: PickPremortemSnapshotInput = {
  id: "snap_1",
  capturedAt: new Date("2026-05-22T12:00:00.000Z"),
  hadLineMovementSignal: true,
  hadRestSignal: true,
  hadScheduleSignal: true,
  hadAtsFormSignal: true,
  hadH2HSignal: false,
  hadVenueSignal: false,
  hadWeatherSignal: false,
  hadInjurySignal: false,
  bookmakerCount: 8,
  dataQualityScore: 88,
  lineMovementDelta: 1.5,
  restAdvantageNet: 2,
  atsFormSampleSize: 12,
  h2hSampleSize: null,
  scheduleDensityHome: 3,
  scheduleDensityAway: 5,
  modelVersion: "v5.1.0",
};

describe("pick pre-mortem builder", () => {
  it("builds a public note from deterministic snapshot fields", () => {
    const note = buildPickPremortemNote(pick, snapshot);

    expect(note.status).toBe("READY");
    expect(note.headline).toContain("Boston Celtics -4.5");
    expect(note.summary).toContain("If this loses:");
    expect(note.summary).toContain("72 confidence");
    expect(note.summary).toContain("63% market consensus");
    expect(note.riskDrivers).toContain("line movement reverses from +1.5 before close");
    expect(note.evidenceRefs).toEqual(["pick:pick_1", "snapshot:snap_1"]);
  });

  it("refuses to generate a public note without a signal snapshot", () => {
    const note = buildPickPremortemNote(pick, null);

    expect(note.status).toBe("NEEDS_SNAPSHOT");
    expect(note.summary).toContain("Signal snapshot is required");
    expect(note.riskDrivers).toEqual([]);
  });

  it("uses fallback drivers when only odds context exists", () => {
    const oddsOnly = {
      ...snapshot,
      hadLineMovementSignal: false,
      hadRestSignal: false,
      hadScheduleSignal: false,
      hadAtsFormSignal: false,
      bookmakerCount: 9,
      dataQualityScore: 92,
    };

    const note = buildPickPremortemNote(pick, oddsOnly);

    expect(note.riskDrivers).toEqual([
      "the market closes against the selection",
      "the strongest factor inputs fail to persist",
    ]);
  });
});
