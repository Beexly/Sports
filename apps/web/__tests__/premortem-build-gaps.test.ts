/**
 * Targeted coverage for buildPickPremortemNote signal driver branches
 * not reached by premortem-build.test.ts.
 *
 * The primary test covers the multi-signal "happy path" (line, rest, schedule,
 * ATS all active) and the fallback-drivers scenario. This file tests individual
 * signal drivers that were not enabled in the primary test, plus the data-quality
 * and book-depth threshold conditions.
 */

import { describe, it, expect } from "vitest";
import { buildPickPremortemNote } from "@/lib/premortem/build";
import type { PickPremortemPickInput, PickPremortemSnapshotInput } from "@/lib/premortem/build";

const pick: PickPremortemPickInput = {
  id: "pick_x",
  selection: "GSW +3.5",
  pickType: "SPREAD",
  confidence: 68,
  edgeScore: 4.1,
  consensusPct: 0.55,
  bookmakerCount: 7,
  riskLevel: "MODERATE",
  modelVersion: "v5.1.0",
};

function baseSnapshot(overrides: Partial<PickPremortemSnapshotInput> = {}): PickPremortemSnapshotInput {
  return {
    id: "snap_x",
    capturedAt: new Date("2026-05-22T12:00:00.000Z"),
    hadLineMovementSignal: false,
    hadRestSignal: false,
    hadScheduleSignal: false,
    hadAtsFormSignal: false,
    hadH2HSignal: false,
    hadVenueSignal: false,
    hadWeatherSignal: false,
    hadInjurySignal: false,
    bookmakerCount: 7,
    dataQualityScore: 82,
    lineMovementDelta: null,
    restAdvantageNet: null,
    atsFormSampleSize: null,
    h2hSampleSize: null,
    scheduleDensityHome: null,
    scheduleDensityAway: null,
    modelVersion: "v5.1.0",
    ...overrides,
  };
}

// ============================================================
// Individual signal drivers
// ============================================================

describe("buildPickPremortemNote — H2H signal driver", () => {
  it("includes H2H driver when hadH2HSignal=true and h2hSampleSize is set", () => {
    const note = buildPickPremortemNote(
      pick,
      baseSnapshot({ hadH2HSignal: true, h2hSampleSize: 8 })
    );
    expect(note.riskDrivers).toContain("head-to-head sample (8 games) proves noisy");
  });

  it("omits H2H driver when h2hSampleSize is null (even if hadH2HSignal=true)", () => {
    const note = buildPickPremortemNote(
      pick,
      baseSnapshot({ hadH2HSignal: true, h2hSampleSize: null })
    );
    const hasH2h = note.riskDrivers.some((d) => d.includes("head-to-head"));
    expect(hasH2h).toBe(false);
  });
});

describe("buildPickPremortemNote — venue signal driver", () => {
  it("includes venue driver when hadVenueSignal=true", () => {
    const note = buildPickPremortemNote(pick, baseSnapshot({ hadVenueSignal: true }));
    expect(note.riskDrivers).toContain("venue context does not translate to this matchup");
  });
});

describe("buildPickPremortemNote — weather signal driver", () => {
  it("includes weather driver when hadWeatherSignal=true", () => {
    const note = buildPickPremortemNote(pick, baseSnapshot({ hadWeatherSignal: true }));
    expect(note.riskDrivers).toContain("weather context moves after the snapshot");
  });
});

describe("buildPickPremortemNote — injury signal driver", () => {
  it("includes injury driver when hadInjurySignal=true", () => {
    const note = buildPickPremortemNote(pick, baseSnapshot({ hadInjurySignal: true }));
    expect(note.riskDrivers).toContain("availability context changes after the snapshot");
  });
});

// ============================================================
// Threshold-based drivers
// ============================================================

describe("buildPickPremortemNote — data quality threshold", () => {
  it("includes thin evidence driver when dataQualityScore < 75", () => {
    const note = buildPickPremortemNote(pick, baseSnapshot({ dataQualityScore: 60 }));
    expect(note.riskDrivers.some((d) => d.includes("evidence health is thin"))).toBe(true);
    expect(note.riskDrivers.some((d) => d.includes("60/100"))).toBe(true);
  });

  it("does NOT include thin evidence driver when dataQualityScore >= 75", () => {
    const note = buildPickPremortemNote(pick, baseSnapshot({ dataQualityScore: 75 }));
    expect(note.riskDrivers.some((d) => d.includes("evidence health"))).toBe(false);
  });

  it("rounds dataQualityScore in the driver text", () => {
    const note = buildPickPremortemNote(pick, baseSnapshot({ dataQualityScore: 59.6 }));
    expect(note.riskDrivers.some((d) => d.includes("60/100"))).toBe(true);
  });
});

describe("buildPickPremortemNote — book depth threshold", () => {
  it("includes thin book depth driver when bookmakerCount < 4", () => {
    const note = buildPickPremortemNote(pick, baseSnapshot({ bookmakerCount: 3 }));
    expect(note.riskDrivers.some((d) => d.includes("book depth stays thin"))).toBe(true);
    expect(note.riskDrivers.some((d) => d.includes("3 books"))).toBe(true);
  });

  it("does NOT include thin book depth driver when bookmakerCount >= 4", () => {
    const note = buildPickPremortemNote(pick, baseSnapshot({ bookmakerCount: 4 }));
    expect(note.riskDrivers.some((d) => d.includes("book depth"))).toBe(false);
  });
});

// ============================================================
// Driver capping (compactDrivers limits to 4)
// ============================================================

describe("buildPickPremortemNote — driver cap", () => {
  it("caps riskDrivers at 4 entries even when more signals are active", () => {
    const note = buildPickPremortemNote(
      pick,
      baseSnapshot({
        hadLineMovementSignal: true,
        lineMovementDelta: 1.5,
        hadRestSignal: true,
        restAdvantageNet: 2,
        hadVenueSignal: true,
        hadWeatherSignal: true,
        hadInjurySignal: true, // would be the 5th if not capped
      })
    );
    expect(note.riskDrivers.length).toBeLessThanOrEqual(4);
  });
});

// ============================================================
// modelVersion fallback
// ============================================================

describe("buildPickPremortemNote — modelVersion resolution", () => {
  it("uses snapshot.modelVersion when provided", () => {
    const note = buildPickPremortemNote(
      { ...pick, modelVersion: "v5.0.0" },
      baseSnapshot({ modelVersion: "v5.1.0" })
    );
    expect(note.modelVersion).toBe("v5.1.0");
  });

  it("falls back to pick.modelVersion when snapshot.modelVersion is empty", () => {
    const note = buildPickPremortemNote(
      { ...pick, modelVersion: "v5.0.0" },
      baseSnapshot({ modelVersion: "" })
    );
    expect(note.modelVersion).toBe("v5.0.0");
  });
});

// ============================================================
// signed() helper (via lineMovementDelta)
// ============================================================

describe("buildPickPremortemNote — signed formatting", () => {
  it("formats positive delta with + sign in driver text", () => {
    const note = buildPickPremortemNote(
      pick,
      baseSnapshot({ hadLineMovementSignal: true, lineMovementDelta: 1.5 })
    );
    expect(note.riskDrivers.some((d) => d.includes("+1.5"))).toBe(true);
  });

  it("formats negative delta without extra sign in driver text", () => {
    const note = buildPickPremortemNote(
      pick,
      baseSnapshot({ hadLineMovementSignal: true, lineMovementDelta: -2.0 })
    );
    expect(note.riskDrivers.some((d) => d.includes("-2"))).toBe(true);
  });
});
