import { describe, expect, it } from "vitest";
import {
  EVIDENCE_FACTOR_DEFINITIONS,
  type EvidenceFactorKey,
} from "../evidence-readiness-matrix.js";
import {
  EVIDENCE_FACTOR_KEYS,
  evaluateFactorReadiness,
  gameSignalRowsToEvidenceRecords,
  loadEvidenceReadiness,
  reportAllFactorReadiness,
  signalRowsToEvidenceRecords,
  type EvidenceReadinessDb,
  type GameSignalEvidenceRow,
  type SignalEvidenceRow,
} from "../evidence-readiness-loader.js";

const NOW = new Date("2026-09-24T18:00:00.000Z");

function gameSignal(overrides: Partial<GameSignalEvidenceRow> = {}): GameSignalEvidenceRow {
  return {
    sourceCategory: "SCHEDULE",
    sourceName: "schedule-internal",
    signalKey: "schedule_density_7d_home",
    signalValue: 4,
    fetchedAt: new Date(NOW.getTime() - 5 * 60_000),
    expiresAt: new Date(NOW.getTime() + 60 * 60_000),
    trustLevel: 1,
    isBootstrap: false,
    ...overrides,
  };
}

function signal(overrides: Partial<SignalEvidenceRow> = {}): SignalEvidenceRow {
  return {
    entityType: "team",
    entityId: "LAR",
    key: "ngs.team_score",
    category: "RATINGS",
    valueRaw: 0.8,
    value: 0.8,
    weight: 2.5,
    confidence: 0.7,
    capturedAt: new Date(NOW.getTime() - 10 * 60_000),
    season: 2026,
    week: 4,
    sourceId: "nflverse",
    fetchedAt: new Date(NOW.getTime() - 15 * 60_000),
    ...overrides,
  };
}

describe("evidence readiness loader", () => {
  it("enumerates the matrix definitions instead of maintaining a second factor list", () => {
    expect(EVIDENCE_FACTOR_KEYS).toEqual(
      EVIDENCE_FACTOR_DEFINITIONS.map((definition) => definition.key),
    );
    expect(new Set(EVIDENCE_FACTOR_KEYS).size).toBe(EVIDENCE_FACTOR_KEYS.length);
  });

  it("returns an honest ABSENT row for every factor when no evidence exists", () => {
    const matrix = reportAllFactorReadiness({ evidence: [], now: NOW });

    expect(matrix.rows).toHaveLength(EVIDENCE_FACTOR_DEFINITIONS.length);
    expect(matrix.rows.every((row) => row.status === "ABSENT")).toBe(true);
    expect(matrix.rows.every((row) => row.evidenceCount === 0)).toBe(true);
  });

  it("maps real schedule-density fields into the schedule.density verdict", () => {
    const records = gameSignalRowsToEvidenceRecords(
      [
        gameSignal({ signalKey: "schedule_density_7d_home", signalValue: 4 }),
        gameSignal({ signalKey: "schedule_density_7d_away", signalValue: 3 }),
      ],
      NOW,
    );
    const matrix = reportAllFactorReadiness({ evidence: records, now: NOW });
    const schedule = matrix.rows.find((row) => row.key === "schedule.density");

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      sourceName: "schedule-internal",
      signalKey: "schedule_density_7d_home",
      sourceCategory: "SCHEDULE",
      trustLevel: 1,
      isBootstrap: false,
      activationStatus: "ACTIVE",
      freshnessStatus: "FRESH",
      sampleSize: 4,
    });
    expect(schedule).toMatchObject({
      status: "ACTIVE",
      evidenceCount: 2,
      bestSourceName: "schedule-internal",
      bestSampleSize: 4,
      canContributeToScore: true,
    });
    expect(schedule?.ageMinutes).toBe(5);
  });

  it("keeps unknown GameSignal metrics in shadow instead of treating their value as a sample", () => {
    const records = gameSignalRowsToEvidenceRecords(
      [gameSignal({ signalKey: "wind_mph", sourceCategory: "VENUE_ENVIRONMENT", signalValue: 42 })],
      NOW,
    );
    const venue = evaluateFactorReadiness("venue.environment", {
      evidence: records,
      now: NOW,
    });

    expect(records[0]).toMatchObject({
      activationStatus: "SHADOW_ONLY",
      sampleSize: null,
    });
    expect(venue.status).toBe("BLOCKED");
    expect(venue.canContributeToScore).toBe(false);
    expect(venue.blockers).toContain("Sample size 0 is below required 1.");
  });

  it("treats an explicitly expired GameSignal row as stale", () => {
    const records = gameSignalRowsToEvidenceRecords(
      [gameSignal({ signalValue: 4, expiresAt: new Date(NOW.getTime() - 1_000) })],
      NOW,
    );
    const row = evaluateFactorReadiness("schedule.density", {
      evidence: records,
      now: NOW,
    });

    expect(records[0]?.freshnessStatus).toBe("STALE");
    expect(row.status).toBe("BLOCKED");
    expect(row.blockers).toContain(
      "Evidence is stale for this factor's decision window.",
    );
  });

  it("maps universal Signal rows as storage-only shadow evidence", () => {
    const records = signalRowsToEvidenceRecords([signal()], NOW);
    const row = evaluateFactorReadiness("model.independentFairProbability", {
      evidence: records,
      now: NOW,
    });

    expect(records[0]).toMatchObject({
      sourceName: "signal:nflverse",
      signalKey: "ngs.team_score",
      sourceCategory: "RATINGS",
      trustLevel: 0.7,
      activationStatus: "SHADOW_ONLY",
      isBootstrap: false,
      sampleSize: null,
    });
    expect(row.status).toBe("BLOCKED");
    expect(row.canContributeToScore).toBe(false);
  });

  it("loads GameSignal and Signal rows through the injected database seam", async () => {
    const gameSignalFindMany = async () => [gameSignal()];
    const signalFindMany = async () => [signal()];
    const db: EvidenceReadinessDb = {
      gameSignal: { findMany: gameSignalFindMany },
      signal: { findMany: signalFindMany },
    };

    const records = await loadEvidenceReadiness(db, { now: NOW, limit: 25 });

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.signalKey).sort()).toEqual([
      "ngs.team_score",
      "schedule_density_7d_home",
    ]);
  });

  it("rejects a factor key outside the matrix instead of silently selecting one", () => {
    expect(() =>
      evaluateFactorReadiness("not.a.factor" as EvidenceFactorKey, {
        evidence: [],
        now: NOW,
      }),
    ).toThrow(/Unknown evidence factor/);
  });
});
