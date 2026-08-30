/**
 * GSE Expected Metrics — our OWN CPOE / RYOE / xYAC from public play-by-play,
 * proven against Next Gen Stats as ground truth.
 *
 * This is the "own the IP" play. Instead of re-serving NGS's tracking-derived
 * numbers, we:
 *   1. Fetch a real season of nflverse play-by-play (CC-BY-4.0) with loadPbp,
 *      projecting to just the columns our models read (the OOM defense).
 *   2. Map each qualifying play to a feature row and FIT our own expected-value
 *      models on that season (fit-on-load; the served metric is always our
 *      computation on current public data, never hardcoded, never NGS's figure).
 *   3. Roll the play-level residuals up per player into GSE-CPOE / GSE-RYOE /
 *      GSE-xYAC.
 *   4. PROVE the metrics by correlating our per-player values against NGS's, at
 *      MATCHED grain (same season, REG, per-player, same-ish qualifier, joined on
 *      the gsis id). NGS values enter ONLY as the y-axis of that correlation —
 *      they are never copied into a served metric.
 *
 * Read-only, governed by assertIngestible (via loadPbp). Historical measurement,
 * not a projection or pick — canPublishProjections stays false.
 */

import { gunzipSync } from "node:zlib";
import { fetchWithFailover, NFLVERSE_BASE, parseCsv, withMirrors } from "@sports/data-ingestion";
import {
  buildCalibrationReport,
  computeCpoe,
  computeRyoe,
  computeYacOverExpected,
  DEFAULT_GRADUATION_THRESHOLDS,
  fitExpectedCompletionModel,
  fitExpectedRushModel,
  fitExpectedYacModel,
  graduationVerdict,
  type CalibrationReport,
  type CatchPlay,
  type DropbackPlay,
  type ExpectedMetricProvenance,
  type GraduationVerdict,
  type GroundTruthPoint,
  type PlayerExpectedMetric,
  type RushPlay,
} from "@sports/prediction-engine";
import { loadPbp } from "@/lib/nflverse/pbp";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type CsvRecord = Readonly<Record<string, string>>;

/** The only play-by-play columns our three models read (column projection). */
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

/** One player's served metric line (our number, plus display context). */
export interface ExpectedMetricLeader {
  readonly playerId: string;
  readonly playerName: string;
  readonly plays: number;
  /** Headline over-expected value (CPOE points, or RYOE/xYAC yards). */
  readonly overExpected: number;
  readonly actualMean: number;
  readonly expectedMean: number;
}

/** The proof: how our metric agrees with NGS ground truth at matched grain. */
export interface ExpectedMetricValidation {
  readonly metric: "cpoe" | "ryoe" | "xyac";
  readonly verdict: GraduationVerdict;
  readonly reason: string;
  readonly report: CalibrationReport;
  /** What ground truth we correlated against, and its license. */
  readonly groundTruthSource: string;
}

export interface ExpectedMetricBlock {
  readonly provenance: ExpectedMetricProvenance | null;
  readonly qualifiedPlayers: number;
  readonly leaders: readonly ExpectedMetricLeader[];
  readonly validation: ExpectedMetricValidation;
}

export interface NflverseExpectedMetrics {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  readonly sourcePlays: { readonly dropbacks: number; readonly rushes: number; readonly catches: number };
  readonly cpoe: ExpectedMetricBlock;
  readonly ryoe: ExpectedMetricBlock;
  readonly xyac: ExpectedMetricBlock;
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrls: {
    readonly pbp: string;
    readonly ngsPassing: string;
    readonly ngsRushing: string;
    readonly ngsReceiving: string;
  };
  readonly attribution: string;
  readonly error: string | null;
}

const NGS_ATTRIBUTION = "Data from nflverse (nflverse-data), CC-BY-4.0. NGS values used as ground truth only.";
const TOP_N = 25;

let cache: { readonly expiresAt: number; readonly value: NflverseExpectedMetrics } | null = null;

function num(value: string | undefined): number {
  if (value === undefined || value === "") return NaN;
  return Number(value);
}

function bin(value: string | undefined): 0 | 1 {
  return value === "1" ? 1 : 0;
}

function passLoc(value: string | undefined): "left" | "middle" | "right" | null {
  return value === "left" || value === "middle" || value === "right" ? value : null;
}

function runGap(value: string | undefined): "end" | "tackle" | "guard" | null {
  return value === "end" || value === "tackle" || value === "guard" ? value : null;
}

interface MappedPlays {
  readonly dropbacks: DropbackPlay[];
  readonly rushes: RushPlay[];
  readonly catches: CatchPlay[];
  readonly names: Map<string, string>;
}

/** Single-pass map of projected REG play-by-play rows into our three play arrays. */
function mapPlays(records: readonly CsvRecord[]): MappedPlays {
  const dropbacks: DropbackPlay[] = [];
  const rushes: RushPlay[] = [];
  const catches: CatchPlay[] = [];
  const names = new Map<string, string>();

  for (const r of records) {
    if (r["season_type"] !== "REG") continue;
    if (r["two_point_attempt"] === "1") continue;

    const isComplete = r["complete_pass"] === "1";
    const isIncomplete = r["incomplete_pass"] === "1";
    const down = num(r["down"]);
    const ydstogo = num(r["ydstogo"]);
    const yardline100 = num(r["yardline_100"]);

    // --- Pass attempt → expected-completion model ---
    if ((isComplete || isIncomplete) && r["qb_spike"] !== "1") {
      const passerId = r["passer_player_id"] ?? "";
      const airYards = num(r["air_yards"]);
      if (passerId && Number.isFinite(airYards)) {
        dropbacks.push({
          passerId,
          complete: isComplete ? 1 : 0,
          airYards,
          yardline100,
          down,
          ydstogo,
          shotgun: bin(r["shotgun"]),
          noHuddle: bin(r["no_huddle"]),
          qbHit: bin(r["qb_hit"]),
          passLocation: passLoc(r["pass_location"]),
        });
        const nm = r["passer_player_name"];
        if (nm) names.set(passerId, nm);
      }
    }

    // --- Completed reception → expected-YAC model ---
    if (isComplete) {
      const receiverId = r["receiver_player_id"] ?? "";
      const airYards = num(r["air_yards"]);
      const yac = num(r["yards_after_catch"]);
      if (receiverId && Number.isFinite(airYards) && Number.isFinite(yac)) {
        catches.push({
          receiverId,
          yardsAfterCatch: yac,
          airYards,
          yardline100,
          down,
          ydstogo,
          passLocation: passLoc(r["pass_location"]),
        });
        const nm = r["receiver_player_name"];
        if (nm) names.set(receiverId, nm);
      }
    }

    // --- Designed rush → expected-rush-yards model ---
    if (r["rush"] === "1" && r["qb_kneel"] !== "1") {
      const rusherId = r["rusher_player_id"] ?? "";
      const rushingYards = num(r["rushing_yards"]);
      const scoreDifferential = num(r["score_differential"]);
      if (rusherId && Number.isFinite(rushingYards) && Number.isFinite(scoreDifferential)) {
        rushes.push({
          rusherId,
          rushingYards,
          yardline100,
          down,
          ydstogo,
          shotgun: bin(r["shotgun"]),
          scoreDifferential,
          runLocation: passLoc(r["run_location"]),
          runGap: runGap(r["run_gap"]),
        });
        const nm = r["rusher_player_name"];
        if (nm) names.set(rusherId, nm);
      }
    }
  }

  return { dropbacks, rushes, catches, names };
}

function ngsUrl(variant: "passing" | "rushing" | "receiving"): string {
  return `${NFLVERSE_BASE}/nextgen_stats/ngs_${variant}.csv.gz`;
}

/**
 * Fetch the FULL per-player NGS ground truth for one variant/season (every
 * qualifying season-aggregate row, not a top-N slice), so the correlation runs
 * on the whole pool. Only the single ground-truth column is read; NGS numbers
 * never leave this function except as the y-axis of a correlation.
 */
async function fetchNgsGroundTruth(
  variant: "passing" | "rushing" | "receiving",
  valueColumn: string,
  season: number,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<GroundTruthPoint[]> {
  const url = ngsUrl(variant);
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
  const text = gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8");
  const { records } = parseCsv(text);
  const points: GroundTruthPoint[] = [];
  for (const r of records) {
    if (r["season_type"] !== "REG") continue;
    if (num(r["week"]) !== 0) continue;
    if (num(r["season"]) !== season) continue;
    const id = r["player_gsis_id"] ?? "";
    if (!id) continue;
    const value = num(r[valueColumn]);
    if (!Number.isFinite(value)) continue;
    points.push({ playerId: id, value });
  }
  return points;
}

function toLeaders(
  metrics: readonly PlayerExpectedMetric[],
  names: Map<string, string>,
): ExpectedMetricLeader[] {
  return metrics.slice(0, TOP_N).map((m) => ({
    playerId: m.playerId,
    playerName: names.get(m.playerId) ?? m.playerId,
    plays: m.plays,
    overExpected: m.overExpected,
    actualMean: m.actualMean,
    expectedMean: m.expectedMean,
  }));
}

function block(
  metric: "cpoe" | "ryoe" | "xyac",
  provenance: ExpectedMetricProvenance | null,
  ours: readonly PlayerExpectedMetric[],
  leaders: readonly ExpectedMetricLeader[],
  truth: readonly GroundTruthPoint[],
  thresholds: (typeof DEFAULT_GRADUATION_THRESHOLDS)[keyof typeof DEFAULT_GRADUATION_THRESHOLDS],
  groundTruthSource: string,
): ExpectedMetricBlock {
  const report = buildCalibrationReport(ours, truth);
  const graded = graduationVerdict(report, thresholds);
  return {
    provenance,
    qualifiedPlayers: ours.length,
    leaders,
    validation: { metric, verdict: graded.verdict, reason: graded.reason, report, groundTruthSource },
  };
}

function emptyBlock(metric: "cpoe" | "ryoe" | "xyac", source: string): ExpectedMetricBlock {
  return {
    provenance: null,
    qualifiedPlayers: 0,
    leaders: [],
    validation: {
      metric,
      verdict: "insufficient-sample",
      reason: "No fitted model or ground truth available.",
      report: { n: 0, pearson: 0, spearman: 0, rmse: 0, mae: 0, bias: 0, ourMean: 0, truthMean: 0 },
      groundTruthSource: source,
    },
  };
}

export function resetExpectedMetricsCacheForTests(): void {
  cache = null;
}

export async function loadNflverseExpectedMetrics({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 20000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseExpectedMetrics> {
  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && cache && cache.expiresAt > now) {
    return cache.value;
  }

  const sourceUrls = {
    pbp: "",
    ngsPassing: ngsUrl("passing"),
    ngsRushing: ngsUrl("rushing"),
    ngsReceiving: ngsUrl("receiving"),
  };

  try {
    // 1. Fetch + map play-by-play (assertIngestible runs inside loadPbp).
    const pbp = await loadPbp({
      season,
      columns: PBP_COLUMNS,
      timeoutMs,
      fetcher,
      onRecords: (records) => mapPlays(records),
    });
    sourceUrls.pbp = pbp.sourceUrl;

    if (pbp.status === "source-error" || pbp.value === null) {
      throw new Error(pbp.error ?? "play-by-play unavailable");
    }
    const activeSeason = pbp.season;
    const { dropbacks, rushes, catches, names } = pbp.value;

    // 2. Fit our models on the real season (fit-on-load).
    const cpoeModel = fitExpectedCompletionModel(dropbacks);
    const ryoeModel = fitExpectedRushModel(rushes);
    const yacModel = fitExpectedYacModel(catches);

    // 3. Our per-player metrics.
    const cpoe = cpoeModel ? computeCpoe(dropbacks, cpoeModel) : [];
    const ryoe = ryoeModel ? computeRyoe(rushes, ryoeModel) : [];
    const xyac = yacModel ? computeYacOverExpected(catches, yacModel) : [];

    // 4. NGS ground truth (full pool) + validation, at matched grain.
    const [cpoeTruth, ryoeTruth, yacTruth] = await Promise.all([
      fetchNgsGroundTruth("passing", "completion_percentage_above_expectation", activeSeason, fetcher, timeoutMs),
      fetchNgsGroundTruth("rushing", "rush_yards_over_expected_per_att", activeSeason, fetcher, timeoutMs),
      fetchNgsGroundTruth("receiving", "avg_yac_above_expectation", activeSeason, fetcher, timeoutMs),
    ]);

    const value: NflverseExpectedMetrics = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      seasonType: "REG",
      sourcePlays: { dropbacks: dropbacks.length, rushes: rushes.length, catches: catches.length },
      cpoe: cpoeModel
        ? block("cpoe", cpoeModel.provenance, cpoe, toLeaders(cpoe, names), cpoeTruth, DEFAULT_GRADUATION_THRESHOLDS.cpoe, "NGS completion_percentage_above_expectation (nflverse, CC-BY-4.0)")
        : emptyBlock("cpoe", "NGS completion_percentage_above_expectation (nflverse, CC-BY-4.0)"),
      ryoe: ryoeModel
        ? block("ryoe", ryoeModel.provenance, ryoe, toLeaders(ryoe, names), ryoeTruth, DEFAULT_GRADUATION_THRESHOLDS.ryoe, "NGS rush_yards_over_expected_per_att (nflverse, CC-BY-4.0)")
        : emptyBlock("ryoe", "NGS rush_yards_over_expected_per_att (nflverse, CC-BY-4.0)"),
      xyac: yacModel
        ? block("xyac", yacModel.provenance, xyac, toLeaders(xyac, names), yacTruth, DEFAULT_GRADUATION_THRESHOLDS.xyac, "NGS avg_yac_above_expectation (nflverse, CC-BY-4.0)")
        : emptyBlock("xyac", "NGS avg_yac_above_expectation (nflverse, CC-BY-4.0)"),
      canPublishProjections: false,
      blockReason:
        "GSE Expected Metrics are our own CPOE/RYOE/xYAC computed from public play-by-play and validated against Next Gen Stats. They measure what happened; nothing here is a projection, pick, or significant trend.",
      sourceUrls,
      attribution: NGS_ATTRIBUTION,
      error: null,
    };

    if (cacheTtlMs > 0 && fetcher === fetch) cache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season,
      seasonType: "REG",
      sourcePlays: { dropbacks: 0, rushes: 0, catches: 0 },
      cpoe: emptyBlock("cpoe", "NGS completion_percentage_above_expectation (nflverse, CC-BY-4.0)"),
      ryoe: emptyBlock("ryoe", "NGS rush_yards_over_expected_per_att (nflverse, CC-BY-4.0)"),
      xyac: emptyBlock("xyac", "NGS avg_yac_above_expectation (nflverse, CC-BY-4.0)"),
      canPublishProjections: false,
      blockReason:
        "GSE Expected Metrics could not load from nflverse. The product shows an empty state instead of fabricated metrics.",
      sourceUrls,
      attribution: NGS_ATTRIBUTION,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
