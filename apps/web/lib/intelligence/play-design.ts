/**
 * Play Design engine — the play-call DNA behind every snap (FTN charting, 2022+).
 *
 * Outside of EPA, the most-cited modern read of an offense is HOW it designs its
 * dropbacks: how often it leans on play-action, how much it runs RPOs, how reliant
 * it is on screens, how much pre-snap motion it shows, how often it goes no-huddle,
 * and how often the QB is forced (or chooses) to work outside the pocket. nflverse
 * FTN charting carries every one of these as a real per-play flag — but the FTN
 * asset has NO team or QB identity. This engine supplies that identity by joining
 * each charted play to play-by-play (which carries `posteam` / `defteam` and the
 * `passer_player_id` / `passer_player_name`) on the shared play key
 * (`nflverse_game_id` ↔ pbp `game_id`, `nflverse_play_id` ↔ pbp `play_id`), then
 * aggregates:
 *
 *   • per QB  — playActionRate, rpoRate, screenRate, motionRate, noHuddleRate,
 *               avgBlitzersFaced (mean n_blitzers on that QB's charted plays)
 *   • per team — the same six, over every charted play the team ran on offense
 *
 * Every rate is a real ratio of real charted flags over the QB/team's charted
 * dropbacks; avgBlitzersFaced is the mean of the real `n_blitzers` column over the
 * plays where it is charted. Nothing is invented: a QB/team below the sample floor
 * is dropped rather than shown on a thin denominator, and a season with no FTN file
 * (pre-2022, or a not-yet-published off-season file) returns an honest empty state.
 *
 * SCOPE — regular season only. FTN charting covers the postseason too, but the
 * identity map (`buildPbpIdentity`) indexes only REG plays (`season_type === "REG"`),
 * so a playoff charted play finds no identity and is dropped. Without this, a
 * playoff team's rates would silently blend REG + POST snaps onto one denominator.
 *
 * SERVER engine: builds entirely on the server (loadPbp + loadNflverseFtnCharting)
 * and returns a flat, serializable `PlayDesign` result (string / number rows, plus
 * a status / source-error path) — no functions cross the RSC boundary. The CLIENT
 * (engine-view.tsx) owns all render()/column functions. Pattern mirrors
 * team-environment.ts. canPublishProjections false — this is design context, not a
 * point projection or a pick.
 */

import { nflverseUrl } from "@sports/data-ingestion";
import {
  loadNflverseFtnCharting,
  type FtnChartingRow,
  type NflverseFtnCharting,
} from "@/lib/nflverse/ftn-charting";
import { loadPbp } from "@/lib/nflverse/pbp";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Per-QB play-design profile. Rates are 0..1; null avgBlitzersFaced = uncharted. */
export interface PlayDesignQbRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  /** Charted dropbacks attributed to this QB (the rate denominator). */
  readonly plays: number;
  readonly playActionRate: number; // 0..1
  readonly rpoRate: number; // 0..1
  readonly screenRate: number; // 0..1
  readonly motionRate: number; // 0..1
  readonly noHuddleRate: number; // 0..1
  readonly outOfPocketRate: number; // 0..1
  /** Mean n_blitzers over this QB's charted plays where it was charted; null if none. */
  readonly avgBlitzersFaced: number | null;
}

/** Per-team play-design environment. Same six rates over the team's charted plays. */
export interface PlayDesignTeamRow {
  readonly team: string;
  /** Charted offensive plays for this team (the rate denominator). */
  readonly plays: number;
  readonly playActionRate: number; // 0..1
  readonly rpoRate: number; // 0..1
  readonly screenRate: number; // 0..1
  readonly motionRate: number; // 0..1
  readonly noHuddleRate: number; // 0..1
  readonly outOfPocketRate: number; // 0..1
  readonly avgBlitzersFaced: number | null;
}

export interface PlayDesign {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  /** Charted plays successfully joined to a pbp identity (the working sample). */
  readonly sourceRows: number;
  readonly qbs: readonly PlayDesignQbRow[];
  readonly teams: readonly PlayDesignTeamRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

// Sample floors so a rate is meaningful and not noise on a thin denominator.
const MIN_QB_PLAYS = 100;
const MIN_TEAM_PLAYS = 100;
const TOP_N = 40;

function round(v: number, d = 3): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/**
 * Play identity → offense/QB attribution, harvested from play-by-play. Keyed by
 * `${game_id}:${play_id}` (the same composite the FTN rows join on). Only the four
 * identity fields are kept; this is what `PLAY_DESIGN_PBP_COLUMNS` projects.
 */
export interface PbpPlayIdentity {
  readonly posteam: string;
  readonly passerId: string;
  readonly passerName: string;
}

/**
 * The exact pbp columns the identity map reads, projected via `loadPbp` so the
 * ~372-column asset is reduced to ~6 keys per record (the OOM defense). Keep in
 * lockstep with `buildPbpIdentity`.
 *   join key:    game_id, play_id
 *   attribution: posteam, passer_player_id, passer_player_name
 *   scope guard: season_type (REG/POST) — only REG identities are indexed so
 *                playoff FTN rows fail the join and drop (see buildPbpIdentity).
 */
export const PLAY_DESIGN_PBP_COLUMNS = [
  "game_id",
  "play_id",
  "posteam",
  "passer_player_id",
  "passer_player_name",
  "season_type",
] as const;

/** Composite play key shared by pbp (game_id/play_id) and FTN (gameId/playId). */
function playKey(gameId: string, playId: string): string {
  return `${gameId}:${playId}`;
}

/**
 * Fold pbp rows into a play-identity map in a single pass. Pure. Only rows with
 * both join components are indexed; the passer fields may be empty for non-pass
 * plays and are stored as-is (the FTN flags still attribute to the offense team).
 *
 * SCOPE — regular season only: FTN charting covers the postseason too, and a
 * playoff team's per-QB / per-team rates would otherwise silently blend REG + POST
 * plays. We index only REG identities here, so a POST charted play finds no
 * identity in `buildPlayDesign` and is dropped (never attributed) rather than
 * inflating a denominator with playoff snaps. `season_type` is the real pbp column
 * ("REG" / "POST"); rows lacking it are treated as non-REG and skipped.
 */
export function buildPbpIdentity(records: readonly CsvRecord[]): Map<string, PbpPlayIdentity> {
  const map = new Map<string, PbpPlayIdentity>();
  for (const r of records) {
    if (r["season_type"] !== "REG") continue; // drop POST (and any non-REG) — scope is regular season
    const gameId = r["game_id"] ?? "";
    const playId = r["play_id"] ?? "";
    if (!gameId || !playId) continue;
    map.set(playKey(gameId, playId), {
      posteam: r["posteam"] ?? "",
      passerId: r["passer_player_id"] ?? "",
      passerName: r["passer_player_name"] ?? "",
    });
  }
  return map;
}

/** Running accumulator for one QB or team. Counts are over charted plays. */
interface DesignAgg {
  label: string; // name (QB) or team code (team)
  team: string;
  plays: number;
  pa: number;
  rpo: number;
  screen: number;
  motion: number;
  noHuddle: number;
  oop: number;
  blitzSum: number;
  blitzN: number;
}

function emptyAgg(label: string, team: string): DesignAgg {
  return { label, team, plays: 0, pa: 0, rpo: 0, screen: 0, motion: 0, noHuddle: 0, oop: 0, blitzSum: 0, blitzN: 0 };
}

function accumulate(agg: DesignAgg, ftn: FtnChartingRow): void {
  agg.plays += 1;
  if (ftn.isPlayAction) agg.pa += 1;
  if (ftn.isRpo) agg.rpo += 1;
  if (ftn.isScreenPass) agg.screen += 1;
  if (ftn.isMotion) agg.motion += 1;
  if (ftn.isNoHuddle) agg.noHuddle += 1;
  if (ftn.isQbOutOfPocket) agg.oop += 1;
  if (ftn.nBlitzers !== null) {
    agg.blitzSum += ftn.nBlitzers;
    agg.blitzN += 1;
  }
}

/**
 * Join FTN charting rows to the pbp identity map and aggregate per QB and per team.
 * Pure and single-pass over the FTN rows. A charted play with no pbp identity (or
 * no offense team) is skipped — never guessed. QB attribution requires a non-empty
 * `passer_player_id`; team attribution requires a non-empty `posteam`.
 *
 * `minQbPlays` / `minTeamPlays` default to the module floors; tests pass small
 * values to exercise the logic on a tiny fixture.
 */
export function buildPlayDesign(
  ftnRows: readonly FtnChartingRow[],
  identity: ReadonlyMap<string, PbpPlayIdentity>,
  minQbPlays: number = MIN_QB_PLAYS,
  minTeamPlays: number = MIN_TEAM_PLAYS,
): { qbs: PlayDesignQbRow[]; teams: PlayDesignTeamRow[]; joined: number } {
  const byQb = new Map<string, DesignAgg>();
  const byTeam = new Map<string, DesignAgg>();
  let joined = 0;

  for (const ftn of ftnRows) {
    const id = identity.get(playKey(ftn.gameId, ftn.playId));
    if (!id) continue; // unjoinable charted play — drop, never invent identity
    joined += 1;

    if (id.posteam) {
      let t = byTeam.get(id.posteam);
      if (!t) {
        t = emptyAgg(id.posteam, id.posteam);
        byTeam.set(id.posteam, t);
      }
      accumulate(t, ftn);
    }

    if (id.passerId) {
      let q = byQb.get(id.passerId);
      if (!q) {
        q = emptyAgg(id.passerName || id.passerId, id.posteam);
        byQb.set(id.passerId, q);
      }
      // Keep the most recent non-empty team/name we see for this passer.
      if (id.posteam) q.team = id.posteam;
      if (id.passerName) q.label = id.passerName;
      accumulate(q, ftn);
    }
  }

  const qbs: PlayDesignQbRow[] = [];
  for (const [playerId, a] of byQb) {
    if (a.plays < minQbPlays) continue;
    qbs.push({
      playerId,
      name: a.label,
      team: a.team,
      plays: a.plays,
      playActionRate: round(a.pa / a.plays),
      rpoRate: round(a.rpo / a.plays),
      screenRate: round(a.screen / a.plays),
      motionRate: round(a.motion / a.plays),
      noHuddleRate: round(a.noHuddle / a.plays),
      outOfPocketRate: round(a.oop / a.plays),
      avgBlitzersFaced: a.blitzN > 0 ? round(a.blitzSum / a.blitzN, 2) : null,
    });
  }
  // Most play-action-reliant QB first — the headline of the play-design read.
  qbs.sort((x, y) => y.playActionRate - x.playActionRate || y.plays - x.plays);

  const teams: PlayDesignTeamRow[] = [];
  for (const [, a] of byTeam) {
    if (a.plays < minTeamPlays) continue;
    teams.push({
      team: a.team,
      plays: a.plays,
      playActionRate: round(a.pa / a.plays),
      rpoRate: round(a.rpo / a.plays),
      screenRate: round(a.screen / a.plays),
      motionRate: round(a.motion / a.plays),
      noHuddleRate: round(a.noHuddle / a.plays),
      outOfPocketRate: round(a.oop / a.plays),
      avgBlitzersFaced: a.blitzN > 0 ? round(a.blitzSum / a.blitzN, 2) : null,
    });
  }
  teams.sort((x, y) => y.playActionRate - x.playActionRate || y.plays - x.plays);

  return { qbs: qbs.slice(0, TOP_N), teams, joined };
}

function sourceError(season: number, sourceUrl: string, error: string | null): PlayDesign {
  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season: 0,
    sourceRows: 0,
    qbs: [],
    teams: [],
    canPublishProjections: false,
    note: "This read is unavailable right now (it only covers recent seasons, and an off-season file may not be published yet). We show an empty state instead of fabricated rates.",
    sourceUrl,
    error,
  };
}

/**
 * Load the Play Design engine result: FTN charting joined to pbp identity, then
 * aggregated per QB and per team. Fetches both sources in parallel and falls back
 * to an honest empty state when FTN charting is unavailable for the season.
 */
export async function loadPlayDesign({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 20000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<PlayDesign> {
  let ftn: NflverseFtnCharting;
  let identityResult: Awaited<ReturnType<typeof loadPbp<Map<string, PbpPlayIdentity>>>>;
  try {
    [ftn, identityResult] = await Promise.all([
      loadNflverseFtnCharting({ season, timeoutMs, fetcher }),
      loadPbp<Map<string, PbpPlayIdentity>>({
        season,
        timeoutMs,
        fetcher,
        columns: PLAY_DESIGN_PBP_COLUMNS,
        onRecords: (records) => buildPbpIdentity(records),
      }),
    ]);
  } catch (error) {
    return sourceError(season, nflverseUrl("ftn_charting", season), error instanceof Error ? error.message : "UNKNOWN");
  }

  // FTN is the gating source — without it there are no design flags to attribute.
  if (ftn.status === "source-error" || ftn.rows.length === 0) {
    return sourceError(season, ftn.sourceUrl, ftn.error ?? "no FTN charting rows");
  }
  // Identity is required to attribute a charted play to a QB/team. If pbp failed,
  // we cannot honestly attribute anything — empty state rather than orphan rows.
  if (identityResult.status === "source-error" || identityResult.value === null) {
    return sourceError(ftn.season, ftn.sourceUrl, identityResult.error ?? "no pbp identity");
  }

  const { qbs, teams, joined } = buildPlayDesign(ftn.rows, identityResult.value);
  if (qbs.length === 0 && teams.length === 0) {
    // Sources loaded but nothing cleared the sample floor / nothing joined.
    return {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: ftn.season,
      sourceRows: joined,
      qbs: [],
      teams: [],
      canPublishProjections: false,
      note: "Not enough charted plays yet to read this confidently (likely early in the season). Honest empty rather than thin-sample rates.",
      sourceUrl: ftn.sourceUrl,
      error: null,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "live",
    season: ftn.season,
    sourceRows: joined,
    qbs,
    teams,
    canPublishProjections: false,
    note: "The play-call DNA behind every snap — how each QB and offense is actually designed to attack, across the regular season. Design context, not a projection or a pick.",
    sourceUrl: ftn.sourceUrl,
    error: null,
  };
}
