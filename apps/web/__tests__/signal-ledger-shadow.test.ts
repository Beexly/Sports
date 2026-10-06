import { describe, it, expect } from "vitest";
import { composeLedgerShadow } from "@/lib/ops/signal-ledger-shadow";
import type { LedgerCandidate } from "@sports/prediction-engine";

const NOW = "2026-10-01T12:00:00.000Z";

function candidate(
  entityId: string,
  key: string,
  value: number,
  weight: number,
  confidence: number,
  capturedAt: string = NOW,
): LedgerCandidate {
  return {
    entityType: "player",
    entityId,
    key,
    category: "PRODUCTION",
    value,
    weight,
    confidence,
    capturedAt,
    season: 2026,
    week: 4,
  };
}

describe("composeLedgerShadow", () => {
  it("blends each entity's candidates into the exact production score", () => {
    // p1: (0.5*1.0 + -0.2*0.25) / 1.25 = 0.36 ; p2: single signal -> its value.
    const report = composeLedgerShadow(
      [
        candidate("p1", "k1", 0.5, 1.0, 1.0),
        candidate("p1", "k2", -0.2, 0.5, 0.5),
        candidate("p2", "k3", 0.8, 1.0, 1.0),
      ],
      NOW,
    );

    expect(report.now).toBe(NOW);
    expect(report.halfLifeDays).toBe(14);
    // Sorted by |score| desc: p2 first.
    expect(report.entities.map((e) => e.entityId)).toEqual(["p2", "p1"]);
    expect(report.entities[0]!.score).toBeCloseTo(0.8, 4);
    expect(report.entities[1]!.score).toBeCloseTo(0.36, 4);
    expect(report.entities[1]!.topSignals).toEqual(["k1", "k2"]);
    expect(report.entities[1]!.candidateCount).toBe(2);

    expect(report.summary).toEqual({
      entitiesScored: 2,
      playersScored: 2,
      teamsScored: 0,
      meanAbsScore: 0.58,
      maxAbsScore: 0.8,
    });
  });

  it("applies freshness decay — a stale signal votes lighter, not equal", () => {
    // Fresh: ew 1.0 -> +1.0. Stale (28d old, 14d half-life): ew 0.25 -> -0.25.
    // Score = 0.75/1.25 = 0.6. Without decay it would be 0.
    const stale = candidate("p1", "stale", -1.0, 1.0, 1.0, "2026-09-03T12:00:00.000Z");
    const report = composeLedgerShadow([candidate("p1", "fresh", 1.0, 1.0, 1.0), stale], NOW, 14);
    expect(report.entities).toHaveLength(1);
    expect(report.entities[0]!.score).toBeCloseTo(0.6, 4);
  });

  it("an empty candidate list is a reportable answer, not an error", () => {
    const report = composeLedgerShadow([], NOW);
    expect(report.entities).toEqual([]);
    expect(report.summary).toEqual({
      entitiesScored: 0,
      playersScored: 0,
      teamsScored: 0,
      meanAbsScore: 0,
      maxAbsScore: 0,
    });
  });

  it("rejects a non-ISO `now` instead of composing against a garbage clock", () => {
    expect(() => composeLedgerShadow([], "not-a-date")).toThrow(/`now`/);
  });

  it("is deterministic: same candidates + same now -> identical report", () => {
    const rows = [candidate("p1", "k1", 0.5, 1.0, 1.0), candidate("p1", "k2", -0.2, 0.5, 0.5)];
    const a = composeLedgerShadow(rows, NOW);
    const b = composeLedgerShadow(rows, NOW);
    expect(a).toEqual(b);
  });
});
