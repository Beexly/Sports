import { describe, expect, it } from "vitest";

import {
  PLAYER_SIGNAL_METRICS,
  PLAYER_SIGNAL_SOURCE_ID,
  projectPlayerWeekSignals,
  type PbpExtractionManifest,
  type PlayerWeekPbpRow,
} from "./player-signals-pbp-loader";

const MANIFEST: PbpExtractionManifest = {
  extractedAt: "2026-10-15T12:00:00.000Z",
  files: [{ file: "play_by_play_2026.parquet", sha256: "abc123" }],
};
const NOW = new Date("2026-10-15T12:05:00.000Z");

const qbWeek: PlayerWeekPbpRow = {
  gsis_id: "00-0000001", player_name: "Q.B", team: "SEA", season: 2026, week: 4,
  as_of: "2026-10-04",
  targets: 0, receptions: 0, receiving_yards: 0, air_yards: 0, yards_after_catch: 0,
  rush_attempts: 3, rushing_yards: 21,
  pass_attempts: 31, completions: 22, passing_yards: 260,
  team_pass_attempts: 31,
};
const wrWeek: PlayerWeekPbpRow = {
  gsis_id: "00-0000002", player_name: "W.R", team: "SEA", season: 2026, week: 4,
  as_of: "2026-10-04",
  targets: 8, receptions: 6, receiving_yards: 84, air_yards: 61, yards_after_catch: 33,
  rush_attempts: 0, rushing_yards: 0,
  pass_attempts: 0, completions: 0, passing_yards: 0,
  team_pass_attempts: 31,
};

describe("player-signals PBP loader — stamps and provenance", () => {
  it("stamps every candidate with source, as-of, and write time", () => {
    const { candidates } = projectPlayerWeekSignals([qbWeek, wrWeek], { now: NOW, manifest: MANIFEST });
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.entityType).toBe("player");
      expect(c.sourceId).toBe(PLAYER_SIGNAL_SOURCE_ID);
      // capturedAt is the row's as-of (the week's last game date), never "now".
      expect(c.capturedAt.toISOString()).toBe("2026-10-04T00:00:00.000Z");
      // fetchedAt is the injected write stamp.
      expect(c.fetchedAt).toBe(NOW);
      const rights = c.rightsSnapshot as Record<string, unknown>;
      expect(rights.dataset).toMatch(/nflverse/);
      expect(rights.extractedAt).toBe(MANIFEST.extractedAt);
      expect(rights.sourceFiles).toEqual([{ file: "play_by_play_2026.parquet", sha256: "abc123" }]);
    }
  });

  it("keys the upsert tuple (entity, key, season, week) uniquely", () => {
    const { candidates } = projectPlayerWeekSignals([qbWeek, wrWeek], { now: NOW, manifest: MANIFEST });
    const tuples = new Set(candidates.map((c) => `${c.entityId}|${c.key}|${c.season}|${c.week}`));
    expect(tuples.size).toBe(candidates.length);
  });
});

describe("player-signals PBP loader — honesty rules", () => {
  it("emits only roles that occurred: the QB gets no receiving rows, the WR no passing rows", () => {
    const { candidates, report } = projectPlayerWeekSignals([qbWeek, wrWeek], { now: NOW, manifest: MANIFEST });
    const qbKeys = candidates.filter((c) => c.entityId === qbWeek.gsis_id).map((c) => c.key);
    const wrKeys = candidates.filter((c) => c.entityId === wrWeek.gsis_id).map((c) => c.key);
    expect(qbKeys).not.toContain("pbp.targets");
    expect(wrKeys).not.toContain("pbp.pass_attempts");
    expect(qbKeys).toContain("pbp.passing_yards");
    expect(wrKeys).toContain("pbp.target_share");
    expect(report.candidates).toBe(candidates.length);
    expect(report.dropped).toHaveLength(0);
  });

  it("valueRaw is the measured aggregate verbatim; target_share is derived from emitted inputs", () => {
    const { candidates } = projectPlayerWeekSignals([wrWeek], { now: NOW, manifest: MANIFEST });
    const byKey = new Map(candidates.map((c) => [c.key, c]));
    expect(byKey.get("pbp.receiving_yards")?.valueRaw).toBe(84);
    expect(byKey.get("pbp.target_share")?.valueRaw).toBeCloseTo(8 / 31, 12);
    for (const c of candidates) expect(c.value).toBe(c.valueRaw);
  });

  it("weight is 0 and the snapshot says why: pbp.* keys have no fitted scale yet", () => {
    const { candidates } = projectPlayerWeekSignals([wrWeek], { now: NOW, manifest: MANIFEST });
    for (const c of candidates) {
      expect(c.weight).toBe(0);
      expect(c.confidence).toBe(1);
      expect((c.rightsSnapshot as Record<string, unknown>).normalization).toBe("raw-unfitted");
    }
  });

  it("drops a row with no gsis id and names the reason; emits nothing for an all-zero week", () => {
    const noId: PlayerWeekPbpRow = { ...wrWeek, gsis_id: "" };
    const idle: PlayerWeekPbpRow = {
      ...wrWeek, gsis_id: "00-0000003",
      targets: 0, receptions: 0, receiving_yards: 0, air_yards: 0, yards_after_catch: 0,
    };
    const { candidates, report } = projectPlayerWeekSignals([noId, idle], { now: NOW, manifest: MANIFEST });
    expect(candidates).toHaveLength(0);
    expect(report.dropped).toHaveLength(1);
    expect(report.dropped[0]?.reason).toMatch(/gsis/);
  });

  it("every metric key is in the declared key set", () => {
    const declared = new Set(PLAYER_SIGNAL_METRICS.map((m) => m.key));
    const { candidates } = projectPlayerWeekSignals([qbWeek, wrWeek], { now: NOW, manifest: MANIFEST });
    for (const c of candidates) expect(declared.has(c.key)).toBe(true);
    expect(declared.size).toBe(11);
  });
});
