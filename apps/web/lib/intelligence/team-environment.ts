/**
 * Team scoring-environment — the per-team PBP signal sharps actually trust.
 *
 * Raw points and yards are noisy and score-state dependent. The stable, leading
 * read of a team's true offensive and defensive quality is EARLY-DOWN,
 * NEUTRAL-SCRIPT EPA per play: first and second down, win probability between
 * 0.2 and 0.8 (game still competitive), before the fourth quarter (before clock
 * and score distort play-calling). Stripping garbage time and obvious pass/run
 * situations leaves the closest thing to a team's repeatable baseline.
 *
 * Built straight from nflverse play-by-play (the first PBP consumer in the app).
 * Per team we compute, over the neutral-script filter:
 *   • offensive EPA/play (team as posteam) and success rate (success == 1)
 *   • defensive EPA/play (team as defteam) — lower is better defense
 *   • PROE = mean(pass_oe), pass rate over expected — proactive/pass-happy bias
 *   • pace proxy = no_huddle rate — tempo the box score never shows
 * Then off/def EPA are turned into within-league percentiles so each team reads
 * against its peers. Defensive percentile inverts EPA (suppressing EPA is good).
 *
 * CRITICAL: the pbp file is large. `buildTeamEnvironment` folds the records into
 * compact per-team accumulators in a SINGLE pass and never retains the records;
 * the loader hands records to it exactly once via `loadPbp`'s reducer contract.
 *
 * Read-only, real nflverse data (CC-BY-4.0), honest source-error.
 * canPublishProjections false — this is context, not a point projection or pick.
 */

import { loadPbp } from "@/lib/nflverse/pbp";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface TeamEnvironmentRow {
  readonly team: string;
  /** Neutral-script early-down offensive plays counted. */
  readonly offPlays: number;
  /** Neutral-script early-down defensive plays counted. */
  readonly defPlays: number;
  readonly offEpaPerPlay: number;
  readonly defEpaPerPlay: number; // lower (more negative) = better defense
  readonly offSuccessRate: number; // 0..1
  readonly defSuccessRate: number; // 0..1, lower = better defense
  readonly proe: number; // mean(pass_oe), pass rate over expected
  readonly noHuddleRate: number; // pace proxy, 0..1
  readonly offEpaPct: number; // within-league percentile, high = better offense
  readonly defEpaPct: number; // within-league percentile, high = better defense (EPA inverted)

  // ── A1 widened situational metrics (offense, all scrimmage plays) ──────────
  // Computed over ALL of the team's offensive scrimmage plays (pass+rush),
  // NOT just the neutral-script early-down slice above. Each is null when the
  // play sample backing it is empty (honest dash, never fabricated).
  /** Offensive scrimmage plays (pass or rush) backing the situational metrics. */
  readonly offScrimmagePlays: number;
  /** Mean success over all offensive scrimmage plays, 0..1, or null. */
  readonly successRate: number | null;
  /** Share of offensive scrimmage plays that were explosive, 0..1, or null.
   *  Explosive = epa > 0.75, OR a pass gain >= 15 air+YAC, OR a rush gain >= 10. */
  readonly explosiveRate: number | null;
  /** Pass rate on early downs (1st & 2nd) in a neutral score band, 0..1, or null. */
  readonly earlyDownPassRate: number | null;
  /** PROE (mean pass_oe) over the same neutral early-down band, or null. */
  readonly neutralProe: number | null;
  /** Mean EPA over the same neutral early-down band, or null. */
  readonly neutralEpaPerPlay: number | null;
  /** Shotgun snap rate over offensive scrimmage plays, 0..1, or null. */
  readonly shotgunRate: number | null;
  /** Mean CPOE over dropbacks that carry a cpoe value, or null. */
  readonly cpoe: number | null;
  /** 3rd-down conversions / 3rd-down plays (series_success on 3rd down), 0..1, or null. */
  readonly thirdDownConvRate: number | null;
  /** Mean EPA on offensive plays snapped inside the 20 (red zone), or null. */
  readonly redZoneEpaPerPlay: number | null;
  /** Offensive scrimmage plays snapped inside the 20 backing redZoneEpaPerPlay. */
  readonly redZonePlays: number;
  /** Drives that ended in a TD or FG / total drives the team finished, 0..1, or null. */
  readonly driveScoreRate: number | null;
}

export interface TeamEnvironment {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly sourceRows: number;
  readonly rows: readonly TeamEnvironmentRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

// Neutral-script early-down filter thresholds.
const WP_LOW = 0.2;
const WP_HIGH = 0.8;
const MIN_PLAYS = 30; // each team needs a meaningful neutral-script sample

// A1 situational thresholds (all from real per-row fields).
const EPA_EXPLOSIVE = 0.75; // a play with EPA above this is "explosive"
const EXPLOSIVE_PASS_YDS = 15; // OR a completed pass gaining >= 15 yards
const EXPLOSIVE_RUSH_YDS = 10; // OR a rush gaining >= 10 yards
const NEUTRAL_SCORE_BAND = 14; // |score_differential| within two scores = neutral

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function finite(v: string | undefined): number | null {
  const n = Number(v ?? "");
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : null;
}
function round(v: number, d = 3): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
/** Truthy for nflverse "1"/"0"/"TRUE"/"FALSE" boolean-ish columns; missing → false. */
function flag(v: string | undefined): boolean {
  if (v === undefined || v === "") return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "t";
}
/** Mean of a sum/count pair, or null when the count is zero (honest dash). */
function meanOrNull(sum: number, n: number): number | null {
  return n > 0 ? round(sum / n) : null;
}

/**
 * Is this play an early-down, neutral-script, pre-Q4 play? Down in {1,2},
 * 0.2 <= wp <= 0.8, qtr < 4. Rows missing any of these fields drop out.
 */
function isNeutralEarlyDown(r: CsvRecord): boolean {
  const down = finite(r["down"]);
  if (down !== 1 && down !== 2) return false;
  const wp = finite(r["wp"]);
  if (wp === null || wp < WP_LOW || wp > WP_HIGH) return false;
  const qtr = finite(r["qtr"]);
  if (qtr === null || qtr >= 4) return false;
  return true;
}

interface Agg {
  team: string;
  // offense (team is posteam), neutral-script early-down slice
  offEpaSum: number;
  offEpaN: number;
  offSuccessSum: number;
  offSuccessN: number;
  proeSum: number;
  proeN: number;
  noHuddleSum: number;
  noHuddleN: number;
  // defense (team is defteam), neutral-script early-down slice
  defEpaSum: number;
  defEpaN: number;
  defSuccessSum: number;
  defSuccessN: number;

  // ── A1 situational accumulators (team is posteam, ALL scrimmage plays) ──────
  scrimmageN: number; // pass-or-rush offensive plays
  sitSuccessSum: number;
  sitSuccessN: number;
  explosiveSum: number; // count of explosive plays
  explosiveN: number; // plays we could classify as explosive-or-not
  shotgunSum: number;
  shotgunN: number;
  cpoeSum: number;
  cpoeN: number;
  // early-down neutral-band pass tendency + PROE/EPA (own band, score-based)
  edPassSum: number; // pass==1 on qualifying early-down neutral plays
  edPlayN: number; // qualifying early-down neutral plays
  edProeSum: number;
  edProeN: number;
  edEpaSum: number;
  edEpaN: number;
  // 3rd-down conversion
  thirdDownConv: number;
  thirdDownN: number;
  // red zone (yardline_100 <= 20)
  rzEpaSum: number;
  rzEpaN: number;
  // drive scoring — count unique drives by result bucket
  driveScored: number;
  driveTotal: number;
  seenDrives: Set<string>;
}

/**
 * The exact pbp columns the reducer / filters read. This is the projection
 * allowlist passed to `loadPbp` so the real ~372-column asset is reduced to a
 * compact per-record keyset (the OOM fix). Keep this in lockstep with the
 * reducer: every `r["..."]` access below must appear here, or that column reads
 * as missing and the data goes silently wrong.
 *   neutral filter (isNeutralEarlyDown): down, wp, qtr
 *   neutral reducer:                     posteam, defteam, pass, rush, epa,
 *                                        success, pass_oe, no_huddle
 * Widened (A1, real nflfastR columns) for situational team metrics computed over
 * ALL scrimmage plays, not just the neutral-script slice:
 *   situational attribution:  ydstogo, yardline_100, score_differential,
 *                             qb_dropback, shotgun, xpass, yards_gained
 *   accuracy / air-yards:     air_yards, yards_after_catch, cpoe
 *   3rd-down conversion:      third_down_converted, third_down_failed
 *   drive scoring:            game_id, fixed_drive, fixed_drive_result
 *   play classification:      play_type
 */
export const TEAM_ENVIRONMENT_PBP_COLUMNS = [
  // neutral-script early-down core (unchanged)
  "down",
  "wp",
  "qtr",
  "posteam",
  "defteam",
  "pass",
  "rush",
  "epa",
  "success",
  "pass_oe",
  "no_huddle",
  // widened situational / advanced fields (A1)
  "ydstogo",
  "yardline_100",
  "yards_gained",
  "air_yards",
  "yards_after_catch",
  "cpoe",
  "xpass",
  "qb_dropback",
  "shotgun",
  "score_differential",
  "third_down_converted",
  "third_down_failed",
  "series_success",
  "game_id",
  "fixed_drive",
  "fixed_drive_result",
  "play_type",
] as const;

function emptyAgg(team: string): Agg {
  return {
    team,
    offEpaSum: 0,
    offEpaN: 0,
    offSuccessSum: 0,
    offSuccessN: 0,
    proeSum: 0,
    proeN: 0,
    noHuddleSum: 0,
    noHuddleN: 0,
    defEpaSum: 0,
    defEpaN: 0,
    defSuccessSum: 0,
    defSuccessN: 0,
    // A1 situational accumulators
    scrimmageN: 0,
    sitSuccessSum: 0,
    sitSuccessN: 0,
    explosiveSum: 0,
    explosiveN: 0,
    shotgunSum: 0,
    shotgunN: 0,
    cpoeSum: 0,
    cpoeN: 0,
    edPassSum: 0,
    edPlayN: 0,
    edProeSum: 0,
    edProeN: 0,
    edEpaSum: 0,
    edEpaN: 0,
    thirdDownConv: 0,
    thirdDownN: 0,
    rzEpaSum: 0,
    rzEpaN: 0,
    driveScored: 0,
    driveTotal: 0,
    seenDrives: new Set<string>(),
  };
}

/**
 * Fold play-by-play rows into per-team scoring-environment rows. PURE and
 * single-pass: it never builds a second copy of the records.
 *
 * Two metric families accrue in the same pass:
 *   • Headline (unchanged): neutral-script early-down offensive/defensive EPA,
 *     success, PROE and pace, gated by `isNeutralEarlyDown` (WP-based neutral).
 *   • Situational (A1): success rate, explosive rate, early-down pass rate,
 *     neutral-band PROE/EPA, shotgun rate, CPOE, 3rd-down conversion, red-zone
 *     EPA and drive-score rate — computed over the team's FULL offensive
 *     scrimmage sample (posteam), each from real per-row fields only. A metric is
 *     null when its backing sample is empty so absent columns surface as an
 *     honest dash, never a fabricated value.
 *
 * `minPlays` (default 30) is the neutral-script sample a team needs on each side
 * to qualify; tests pass a small value to exercise the logic on a tiny fixture.
 */
export function buildTeamEnvironment(
  records: readonly CsvRecord[],
  minPlays: number = MIN_PLAYS,
): TeamEnvironmentRow[] {
  const byTeam = new Map<string, Agg>();
  const getAgg = (team: string): Agg => {
    let a = byTeam.get(team);
    if (!a) {
      a = emptyAgg(team);
      byTeam.set(team, a);
    }
    return a;
  };

  for (const r of records) {
    const posteam = r["posteam"] ?? "";
    const defteam = r["defteam"] ?? "";
    // Only count real scrimmage plays where the play is a pass or a rush.
    const isPass = num(r["pass"]) === 1;
    const isRush = num(r["rush"]) === 1;
    if (!isPass && !isRush) continue;

    const epa = finite(r["epa"]);
    const success = finite(r["success"]);
    const passOe = finite(r["pass_oe"]);
    const noHuddle = finite(r["no_huddle"]);

    // ── A1 situational accumulation (offense / posteam, ALL scrimmage plays) ──
    // Computed over the team's full offensive sample, independent of the
    // neutral-script early-down filter below. Every input is a real per-row
    // field; counts only advance when the field is present, so an absent column
    // surfaces as null downstream (honest dash) rather than a fabricated 0.
    if (posteam) {
      const off = getAgg(posteam);
      off.scrimmageN += 1;

      if (success !== null) {
        off.sitSuccessSum += success;
        off.sitSuccessN += 1;
      }

      // Explosive: EPA over threshold, OR a long pass/rush gain. yards_gained is
      // the realized scrimmage gain on the play.
      const yds = finite(r["yards_gained"]);
      const isExplosive =
        (epa !== null && epa > EPA_EXPLOSIVE) ||
        (isPass && yds !== null && yds >= EXPLOSIVE_PASS_YDS) ||
        (isRush && yds !== null && yds >= EXPLOSIVE_RUSH_YDS);
      // Only classify when we have at least one usable signal for this play.
      if (epa !== null || yds !== null) {
        off.explosiveN += 1;
        if (isExplosive) off.explosiveSum += 1;
      }

      // shotgun is a real 0/1 per-play flag.
      const shotgun = finite(r["shotgun"]);
      if (shotgun !== null) {
        off.shotgunSum += shotgun;
        off.shotgunN += 1;
      }

      // CPOE is only defined on actual pass attempts; nflfastR leaves it blank
      // otherwise, so finite() naturally restricts the mean to real values.
      const cpoe = finite(r["cpoe"]);
      if (cpoe !== null) {
        off.cpoeSum += cpoe;
        off.cpoeN += 1;
      }

      // Early-down (1st/2nd) pass tendency + PROE/EPA in a neutral score band
      // (|score_differential| within two scores). Score-based neutral, distinct
      // from the WP-based neutral filter used for the headline EPA above.
      const down = finite(r["down"]);
      const scoreDiff = finite(r["score_differential"]);
      const neutralScore = scoreDiff === null || Math.abs(scoreDiff) <= NEUTRAL_SCORE_BAND;
      if ((down === 1 || down === 2) && neutralScore) {
        off.edPlayN += 1;
        if (isPass) off.edPassSum += 1;
        if (passOe !== null) {
          off.edProeSum += passOe;
          off.edProeN += 1;
        }
        if (epa !== null) {
          off.edEpaSum += epa;
          off.edEpaN += 1;
        }
      }

      // 3rd-down conversion from the explicit converted/failed flags.
      const conv = flag(r["third_down_converted"]);
      const failed = flag(r["third_down_failed"]);
      if (conv || failed) {
        off.thirdDownN += 1;
        if (conv) off.thirdDownConv += 1;
      }

      // Red-zone EPA: offensive plays snapped inside the 20.
      const y100 = finite(r["yardline_100"]);
      if (y100 !== null && y100 <= 20 && epa !== null) {
        off.rzEpaSum += epa;
        off.rzEpaN += 1;
      }

      // Drive scoring: dedupe drives by (game_id, fixed_drive) and bucket the
      // drive's terminal result. fixed_drive_result is the same on every play of
      // a drive, so we record each drive exactly once.
      const gameId = r["game_id"] ?? "";
      const driveNo = r["fixed_drive"] ?? "";
      const driveResult = r["fixed_drive_result"] ?? "";
      if (gameId && driveNo && driveResult) {
        const key = `${gameId}#${driveNo}`;
        if (!off.seenDrives.has(key)) {
          off.seenDrives.add(key);
          off.driveTotal += 1;
          const res = driveResult.toLowerCase();
          if (res.includes("touchdown") || res.includes("field goal")) off.driveScored += 1;
        }
      }
    }

    if (!isNeutralEarlyDown(r)) continue;

    // ── Neutral-script early-down headline metrics (unchanged) ───────────────
    if (posteam) {
      const off = getAgg(posteam);
      if (epa !== null) {
        off.offEpaSum += epa;
        off.offEpaN += 1;
      }
      if (success !== null) {
        off.offSuccessSum += success;
        off.offSuccessN += 1;
      }
      if (passOe !== null) {
        off.proeSum += passOe;
        off.proeN += 1;
      }
      if (noHuddle !== null) {
        off.noHuddleSum += noHuddle;
        off.noHuddleN += 1;
      }
    }

    if (defteam) {
      const def = getAgg(defteam);
      if (epa !== null) {
        def.defEpaSum += epa;
        def.defEpaN += 1;
      }
      if (success !== null) {
        def.defSuccessSum += success;
        def.defSuccessN += 1;
      }
    }
  }

  const qualified = [...byTeam.values()].filter(
    (a) => a.offEpaN >= minPlays && a.defEpaN >= minPlays,
  );
  if (qualified.length === 0) return [];

  const offEpa = qualified.map((a) => a.offEpaSum / a.offEpaN);
  // Defensive EPA is "good" when low, so invert before ranking into a percentile.
  const defEpaInverted = qualified.map((a) => -(a.defEpaSum / a.defEpaN));
  const offEpaPcts = percentileRanks(offEpa);
  const defEpaPcts = percentileRanks(defEpaInverted);

  const rows: TeamEnvironmentRow[] = qualified.map((a, i) => ({
    team: a.team,
    offPlays: a.offEpaN,
    defPlays: a.defEpaN,
    offEpaPerPlay: round(a.offEpaSum / a.offEpaN),
    defEpaPerPlay: round(a.defEpaSum / a.defEpaN),
    offSuccessRate: round(a.offSuccessN ? a.offSuccessSum / a.offSuccessN : 0),
    defSuccessRate: round(a.defSuccessN ? a.defSuccessSum / a.defSuccessN : 0),
    proe: round(a.proeN ? a.proeSum / a.proeN : 0),
    noHuddleRate: round(a.noHuddleN ? a.noHuddleSum / a.noHuddleN : 0),
    offEpaPct: offEpaPcts[i] ?? 0,
    defEpaPct: defEpaPcts[i] ?? 0,

    // ── A1 situational metrics (null when the backing sample is empty) ────────
    offScrimmagePlays: a.scrimmageN,
    successRate: meanOrNull(a.sitSuccessSum, a.sitSuccessN),
    explosiveRate: meanOrNull(a.explosiveSum, a.explosiveN),
    earlyDownPassRate: meanOrNull(a.edPassSum, a.edPlayN),
    neutralProe: meanOrNull(a.edProeSum, a.edProeN),
    neutralEpaPerPlay: meanOrNull(a.edEpaSum, a.edEpaN),
    shotgunRate: meanOrNull(a.shotgunSum, a.shotgunN),
    cpoe: meanOrNull(a.cpoeSum, a.cpoeN),
    thirdDownConvRate: meanOrNull(a.thirdDownConv, a.thirdDownN),
    redZoneEpaPerPlay: meanOrNull(a.rzEpaSum, a.rzEpaN),
    redZonePlays: a.rzEpaN,
    driveScoreRate: meanOrNull(a.driveScored, a.driveTotal),
  }));

  // Best offensive environment first.
  rows.sort((x, y) => y.offEpaPerPlay - x.offEpaPerPlay);
  return rows;
}

export async function loadTeamEnvironment({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 20000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<TeamEnvironment> {
  const result = await loadPbp({
    season,
    timeoutMs,
    fetcher,
    // Project to the handful of columns the reducer reads so the real ~372-column
    // pbp asset doesn't blow the serverless heap (OOM -> 500).
    columns: TEAM_ENVIRONMENT_PBP_COLUMNS,
    // Reduce the large records array to compact rows in one pass; never retained.
    onRecords: (records) => buildTeamEnvironment(records),
  });

  if (result.status === "source-error" || result.value === null) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note: "This read is unavailable right now. We show an empty state instead of fabricated numbers.",
      sourceUrl: result.sourceUrl,
      error: result.error,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "live",
    season: result.season,
    sourceRows: result.sourceRows,
    rows: result.value,
    canPublishProjections: false,
    note: "Each team's true offensive and defensive quality, with garbage time stripped out — the repeatable baseline, not the noisy scoreboard. Context, not a projection.",
    sourceUrl: result.sourceUrl,
    error: null,
  };
}
