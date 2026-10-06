import { describe, expect, it } from "vitest";
import {
  NGS_SIGNAL_CATEGORY,
  NGS_SIGNAL_KEYS,
  projectNgsSignalRows,
} from "@/lib/nflverse/ngs-signal-project";
import type {
  NgsPassingRow,
  NgsReceivingRow,
  NgsRushingRow,
} from "@sports/data-ingestion";

const NOW = new Date("2026-09-30T12:00:00Z");

function receiving(over: Partial<NgsReceivingRow> = {}): NgsReceivingRow {
  return {
    season: 2026, seasonType: "REG", week: 4, gsisId: "00-0039999",
    player: "Test Receiver", position: "WR", team: "HOU",
    avgCushion: 5, avgSeparation: 3.2, avgIntendedAirYards: 9,
    receptions: 5, targets: 8,
    ...over,
  } as NgsReceivingRow;
}

function rushing(over: Partial<NgsRushingRow> = {}): NgsRushingRow {
  return {
    season: 2026, seasonType: "REG", week: 4, gsisId: "00-0038888",
    player: "Test Rusher", position: "RB", team: "HOU",
    efficiency: 4.1, ryoePerAtt: 0.8, rushAttempts: 15, rushYards: 70,
    ...over,
  } as NgsRushingRow;
}

function passing(over: Partial<NgsPassingRow> = {}): NgsPassingRow {
  return {
    season: 2026, seasonType: "REG", week: 4, gsisId: "00-0037777",
    player: "Test Passer", position: "QB", team: "HOU",
    cpoe: 2.1, attempts: 35, passYards: 280,
    ...over,
  } as NgsPassingRow;
}

describe("projectNgsSignalRows", () => {
  it("projects one headline signal per facet with weight 0 (uncalibrated)", () => {
    const rows = projectNgsSignalRows({
      receiving: [receiving()],
      rushing: [rushing()],
      passing: [passing()],
      season: 2026,
      week: 4,
      now: NOW,
    });
    expect(rows).toHaveLength(3);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey[NGS_SIGNAL_KEYS.receiving].valueRaw).toBe(3.2);
    expect(byKey[NGS_SIGNAL_KEYS.rushing].valueRaw).toBe(0.8);
    expect(byKey[NGS_SIGNAL_KEYS.passing].valueRaw).toBe(2.1);
    for (const row of rows) {
      expect(row.entityType).toBe("player");
      expect(row.category).toBe(NGS_SIGNAL_CATEGORY);
      expect(row.weight).toBe(0); // founder-gated tuning; shadow only
      expect(row.confidence).toBe(1); // settled tracking measurement
      expect(row.sourceId).toBe("nflverse");
      expect(row.season).toBe(2026);
      expect(row.week).toBe(4);
      expect(row.capturedAt).toEqual(NOW);
      expect(row.rightsSnapshot.license).toBe("CC-BY-4.0");
      expect(row.rightsSnapshot.attribution).toContain("Next Gen Stats");
    }
    // gsisId join key + sample size carried for calibration filtering
    expect(byKey[NGS_SIGNAL_KEYS.receiving].entityId).toBe("00-0039999");
    expect(byKey[NGS_SIGNAL_KEYS.receiving].rightsSnapshot.sample).toBe(8);
  });

  it("skips season aggregates (week 0), wrong weeks, null metrics, and missing gsisId", () => {
    const rows = projectNgsSignalRows({
      receiving: [
        receiving({ week: 0, avgSeparation: 3.9 }), // season aggregate
        receiving({ week: 3 }), // wrong week
        receiving({ gsisId: "00-0039998", avgSeparation: null }), // null metric
        receiving({ gsisId: "", avgSeparation: 3.0 }), // no join key
      ],
      rushing: [],
      passing: [],
      season: 2026,
      week: 4,
      now: NOW,
    });
    expect(rows).toHaveLength(0);
  });

  it("dedupes on (entityId, key, season, week) — first row wins", () => {
    const rows = projectNgsSignalRows({
      receiving: [receiving({ avgSeparation: 3.2 }), receiving({ avgSeparation: 9.9 })],
      rushing: [],
      passing: [],
      season: 2026,
      week: 4,
      now: NOW,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].valueRaw).toBe(3.2);
  });
});
