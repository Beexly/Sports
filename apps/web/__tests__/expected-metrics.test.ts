import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadNflverseExpectedMetrics,
  resetExpectedMetricsCacheForTests,
} from "@/lib/nflverse/expected-metrics";

const SEASON = 2024;

/**
 * The exact play-by-play columns the loader projects (must line up with
 * PBP_COLUMNS in the loader). We emit a header of precisely these columns and
 * build each row in the same order, so parseCsv's column projection is a no-op
 * pass-through and every field the mapper reads is present.
 */
const PBP_COLUMNS = [
  "season_type",
  "pass",
  "rush",
  "complete_pass",
  "incomplete_pass",
  "passer_player_id",
  "passer_player_name",
  "receiver_player_id",
  "receiver_player_name",
  "rusher_player_id",
  "rusher_player_name",
  "air_yards",
  "yards_after_catch",
  "pass_location",
  "qb_hit",
  "rushing_yards",
  "run_location",
  "run_gap",
  "down",
  "ydstogo",
  "yardline_100",
  "shotgun",
  "no_huddle",
  "score_differential",
  "two_point_attempt",
  "qb_spike",
  "qb_kneel",
] as const;

type Row = Partial<Record<(typeof PBP_COLUMNS)[number], string | number>>;

function emit(row: Row): string {
  return PBP_COLUMNS.map((c) => {
    const v = row[c];
    return v === undefined ? "" : String(v);
  }).join(",");
}

const PASS_LOC = ["left", "middle", "right"] as const;
const RUN_GAP = ["end", "tackle", "guard"] as const;

/**
 * Deterministically synthesize a season of play-by-play with enough qualifying
 * plays to clear every fit minimum:
 *   - 300 dropbacks across 13 passers (QB1/QB2 each ≥100 → they qualify for the
 *     per-passer CPOE rollup and the NGS join),
 *   - 225 completed receptions (WR1/WR2 each ≥30 → qualify for xYAC),
 *   - 300 designed rushes across 6 rushers (RB1/RB2 each ≥50 → qualify for RYOE).
 * Features are index-derived (no Math.random) so the fixture is reproducible, and
 * completion labels are a non-degenerate ~75/25 mix so the logistic model fits.
 */
function buildPbpCsv(): string {
  const lines: string[] = [PBP_COLUMNS.join(",")];

  // --- Pass plays (dropbacks; completed ones double as receptions) ---
  let catchIndex = 0;
  for (let i = 0; i < 300; i++) {
    // Passer: QB1 gets [0,105), QB2 gets [105,210), remaining 90 spread over
    // QB3..QB13 (11 more distinct passers → 13 total).
    let passerN: number;
    if (i < 105) passerN = 1;
    else if (i < 210) passerN = 2;
    else passerN = 3 + ((i - 210) % 11);

    const complete = i % 4 !== 0; // 225 complete / 75 incomplete
    const row: Row = {
      season_type: "REG",
      pass: 1,
      rush: 0,
      complete_pass: complete ? 1 : 0,
      incomplete_pass: complete ? 0 : 1,
      passer_player_id: `00-qb${passerN}`,
      passer_player_name: `QB ${passerN}`,
      air_yards: (i % 25) - 3, // -3..21, includes throws behind the line
      pass_location: PASS_LOC[i % 3],
      qb_hit: i % 5 === 0 ? 1 : 0,
      down: (i % 4) + 1,
      ydstogo: (i % 10) + 1,
      yardline_100: (i % 80) + 10,
      shotgun: i % 2,
      no_huddle: i % 3 === 0 ? 1 : 0,
      two_point_attempt: 0,
      qb_spike: 0,
      qb_kneel: 0,
    };

    if (complete) {
      // Receiver: WR1 first 40 catches, WR2 next 40 (both clear the 30-catch
      // qualifier), the rest spread over WR3..WR8.
      let receiverN: number;
      if (catchIndex < 40) receiverN = 1;
      else if (catchIndex < 80) receiverN = 2;
      else receiverN = 3 + ((catchIndex - 80) % 6);
      row.receiver_player_id = `00-wr${receiverN}`;
      row.receiver_player_name = `WR ${receiverN}`;
      row.yards_after_catch = catchIndex % 12; // 0..11
      catchIndex++;
    }

    lines.push(emit(row));
  }

  // --- Designed rushes ---
  for (let j = 0; j < 300; j++) {
    // RB1 [0,60), RB2 [60,120), remaining 180 over RB3..RB6.
    let rusherN: number;
    if (j < 60) rusherN = 1;
    else if (j < 120) rusherN = 2;
    else rusherN = 3 + ((j - 120) % 4);

    lines.push(
      emit({
        season_type: "REG",
        pass: 0,
        rush: 1,
        complete_pass: 0,
        incomplete_pass: 0,
        rusher_player_id: `00-rb${rusherN}`,
        rusher_player_name: `RB ${rusherN}`,
        rushing_yards: (j % 17) - 2, // -2..14
        run_location: PASS_LOC[j % 3],
        run_gap: RUN_GAP[j % 3],
        down: (j % 4) + 1,
        ydstogo: (j % 12) + 1,
        yardline_100: (j % 70) + 15,
        shotgun: j % 2,
        no_huddle: 0,
        score_differential: (j % 21) - 10, // -10..10
        two_point_attempt: 0,
        qb_spike: 0,
        qb_kneel: 0,
      }),
    );
  }

  return lines.join("\n");
}

// NGS ground truth — only week==0, season_type==REG, season==SEASON rows are read,
// keyed by player_gsis_id, and only the single value column matters. Ids overlap
// the qualifying PBP players so each inner join has n>=2.
const NGS_PASSING = [
  "season,season_type,week,player_display_name,player_gsis_id,attempts,completion_percentage_above_expectation",
  `${SEASON},REG,0,QB 1,00-qb1,105,4.5`,
  `${SEASON},REG,0,QB 2,00-qb2,105,-1.2`,
  `${SEASON},REG,0,QB 3,00-qb3,40,2.0`,
  // Excluded: weekly (week != 0) row must not enter the join.
  `${SEASON},REG,1,QB 1,00-qb1,8,9.9`,
].join("\n");

const NGS_RUSHING = [
  "season,season_type,week,player_display_name,player_gsis_id,rush_attempts,rush_yards_over_expected_per_att",
  `${SEASON},REG,0,RB 1,00-rb1,60,0.8`,
  `${SEASON},REG,0,RB 2,00-rb2,60,-0.3`,
  `${SEASON},REG,0,RB 3,00-rb3,45,1.5`,
].join("\n");

const NGS_RECEIVING = [
  "season,season_type,week,player_display_name,player_gsis_id,receptions,avg_yac_above_expectation",
  `${SEASON},REG,0,WR 1,00-wr1,40,1.1`,
  `${SEASON},REG,0,WR 2,00-wr2,40,-0.4`,
  `${SEASON},REG,0,WR 3,00-wr3,24,0.6`,
].join("\n");

function gz(csv: string): Response {
  const body = gzipSync(Buffer.from(csv));
  return new Response(body, { status: 200, headers: { "content-length": String(body.length) } });
}

function csv(text: string): Response {
  return new Response(text, { status: 200 });
}

/** Route by URL substring: plain CSV for pbp, gzipped CSV for each NGS asset. */
function mockFetch(): ReturnType<typeof vi.fn> {
  const pbp = buildPbpCsv();
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("play_by_play")) return csv(pbp);
    if (url.includes("ngs_passing.csv.gz")) return gz(NGS_PASSING);
    if (url.includes("ngs_rushing.csv.gz")) return gz(NGS_RUSHING);
    if (url.includes("ngs_receiving.csv.gz")) return gz(NGS_RECEIVING);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse GSE expected metrics loader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetExpectedMetricsCacheForTests();
  });

  it("fits our own CPOE/RYOE/xYAC from play-by-play and validates against NGS", async () => {
    const metrics = await loadNflverseExpectedMetrics({ season: SEASON, fetcher: mockFetch(), cacheTtlMs: 0 });

    // Live status, no fabricated projections.
    expect(metrics.status).toBe("live");
    expect(metrics.season).toBe(SEASON);
    expect(metrics.seasonType).toBe("REG");
    expect(metrics.canPublishProjections).toBe(false);
    expect(metrics.error).toBeNull();

    // Real plays flowed into all three models.
    expect(metrics.sourcePlays.dropbacks).toBeGreaterThan(0);
    expect(metrics.sourcePlays.rushes).toBeGreaterThan(0);
    expect(metrics.sourcePlays.catches).toBeGreaterThan(0);

    // Each model fit → provenance present, with the expected versions.
    expect(metrics.cpoe.provenance).not.toBeNull();
    expect(metrics.cpoe.provenance?.modelVersion).toBe("gse-xcomp-v1");
    expect(metrics.ryoe.provenance).not.toBeNull();
    expect(metrics.ryoe.provenance?.modelVersion).toBe("gse-xrush-v1");
    expect(metrics.xyac.provenance).not.toBeNull();
    expect(metrics.xyac.provenance?.modelVersion).toBe("gse-xyac-v1");

    // Every block carries a leaders array and a calibration report with a finite
    // Pearson.
    for (const block of [metrics.cpoe, metrics.ryoe, metrics.xyac]) {
      expect(Array.isArray(block.leaders)).toBe(true);
      expect(Number.isFinite(block.validation.report.pearson)).toBe(true);
      expect(block.validation.groundTruthSource).toContain("NGS");
    }

    // At least one metric joined ≥2 players against NGS ground truth. Our fixture
    // makes all three join exactly the two qualifying players per family.
    const joinSizes = [
      metrics.cpoe.validation.report.n,
      metrics.ryoe.validation.report.n,
      metrics.xyac.validation.report.n,
    ];
    expect(Math.max(...joinSizes)).toBeGreaterThanOrEqual(2);
    expect(metrics.cpoe.validation.report.n).toBeGreaterThanOrEqual(2);

    // Qualifying passers surface as leaders (QB1/QB2 each cleared 100 attempts).
    const cpoeLeaderIds = metrics.cpoe.leaders.map((l) => l.playerId);
    expect(cpoeLeaderIds).toContain("00-qb1");
    expect(cpoeLeaderIds).toContain("00-qb2");
  });

  it("returns a source-error boundary when play-by-play cannot be fetched", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const metrics = await loadNflverseExpectedMetrics({ season: SEASON, fetcher, cacheTtlMs: 0 });

    expect(metrics.status).toBe("source-error");
    expect(metrics.error).not.toBeNull();
    expect(metrics.canPublishProjections).toBe(false);
    expect(metrics.sourcePlays.dropbacks).toBe(0);
    expect(metrics.cpoe.provenance).toBeNull();
  });
});
