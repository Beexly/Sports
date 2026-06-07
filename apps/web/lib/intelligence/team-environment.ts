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
  // offense (team is posteam)
  offEpaSum: number;
  offEpaN: number;
  offSuccessSum: number;
  offSuccessN: number;
  proeSum: number;
  proeN: number;
  noHuddleSum: number;
  noHuddleN: number;
  // defense (team is defteam)
  defEpaSum: number;
  defEpaN: number;
  defSuccessSum: number;
  defSuccessN: number;
}

/**
 * The exact pbp columns `buildTeamEnvironment` / `isNeutralEarlyDown` read. This
 * is the projection allowlist passed to `loadPbp` so the real ~372-column asset
 * is reduced to ~12 keys per record (the OOM fix). Keep this in lockstep with the
 * reducer: every `r["..."]` access below must appear here, or that column reads
 * as missing and the data goes silently wrong.
 *   filter (isNeutralEarlyDown): down, wp, qtr
 *   reducer:                     posteam, defteam, pass, rush, epa, success,
 *                                pass_oe, no_huddle
 */
export const TEAM_ENVIRONMENT_PBP_COLUMNS = [
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
  };
}

/**
 * Fold play-by-play rows into per-team scoring-environment rows. PURE and
 * single-pass: it never builds a second copy of the records. Each play is
 * attributed to its posteam (offense) and defteam (defense) only when it passes
 * the neutral-script early-down filter. PROE/pace come from the offensive side.
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
    if (!isNeutralEarlyDown(r)) continue;

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
      note: "Team scoring-environment could not load from nflverse play-by-play. The product shows an empty state instead of fabricated EPA.",
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
    note: "Early-down, neutral-script EPA/play (offense and defense), success rate, PROE (pass rate over expected), and a no-huddle pace proxy from real nflverse play-by-play. Garbage time and obvious pass/run spots are stripped so each team reads as a stable baseline. Context, not a point projection.",
    sourceUrl: result.sourceUrl,
    error: null,
  };
}
