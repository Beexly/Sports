/**
 * ESPN box-score adapter — FREE, cleared (approved_public_logged_off), FACTS ONLY.
 *
 * Deepens free coverage from a source already cleared: team statistics, PLAYER-LEVEL box
 * scores (passing/rushing/receiving/defensive/…), and injuries from the public
 * `summary?event={id}` endpoint. No key, no new rights risk (same ESPN clearance as scores).
 *
 * Why this and not another API: a gated third-party API (e.g. FPL) can be blocked on terms
 * — mining more depth from an ALREADY-cleared source is the safe way to add stats. Facts
 * only; attribution attached. Pure parsers verified against the live schema.
 */

import type { Sport } from "../source-router";
import { ESPN_ATTRIBUTION } from "./espn-scores";

// Local copy of the verified sport→path map (kept here to stay decoupled from espn-scores).
const ESPN_PATHS: Record<Sport, string> = {
  nfl: "football/nfl",
  ncaaf: "football/college-football",
  nba: "basketball/nba",
  ncaab: "basketball/mens-college-basketball",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
  mls: "soccer/usa.1",
};

export type TeamStat = { readonly label: string; readonly value: string };
export type TeamBox = { readonly team: string; readonly abbreviation: string; readonly stats: readonly TeamStat[] };

/** One player's line in a category — stat labels mapped to their values. */
export type PlayerLine = { readonly name: string; readonly stats: Readonly<Record<string, string>> };
export type PlayerCategory = { readonly category: string; readonly players: readonly PlayerLine[] };
export type TeamPlayers = { readonly team: string; readonly abbreviation: string; readonly categories: readonly PlayerCategory[] };

export type InjuryItem = { readonly player: string; readonly status: string };
export type TeamInjuries = { readonly team: string; readonly injuries: readonly InjuryItem[] };

export type EspnBoxscore = {
  readonly sport: Sport;
  readonly teams: readonly TeamBox[];
  readonly players: readonly TeamPlayers[];
  readonly injuries: readonly TeamInjuries[];
  readonly attribution: string;
};

// ── raw shapes (only the FACT fields we read) ──────────────────────────────────────────
type RawTeamMeta = { displayName?: string; abbreviation?: string };
type RawTeamStat = { label?: string; name?: string; displayValue?: string };
type RawTeamBox = { team?: RawTeamMeta; statistics?: RawTeamStat[] };
type RawAthleteLine = { athlete?: { displayName?: string }; stats?: string[] };
type RawPlayerCategory = { name?: string; labels?: string[]; athletes?: RawAthleteLine[] };
type RawTeamPlayers = { team?: RawTeamMeta; statistics?: RawPlayerCategory[] };
type RawInjury = { athlete?: { displayName?: string }; status?: string };
type RawTeamInjuries = { team?: RawTeamMeta; injuries?: RawInjury[] };
export type EspnSummary = {
  boxscore?: { teams?: RawTeamBox[]; players?: RawTeamPlayers[] };
  injuries?: RawTeamInjuries[];
};

function parseTeamBoxes(boxscore: EspnSummary["boxscore"]): TeamBox[] {
  return (boxscore?.teams ?? []).map((t) => ({
    team: t.team?.displayName ?? "",
    abbreviation: t.team?.abbreviation ?? "",
    stats: (t.statistics ?? []).map((s) => ({ label: s.label ?? s.name ?? "", value: s.displayValue ?? "" })),
  }));
}

function parsePlayerBoxes(boxscore: EspnSummary["boxscore"]): TeamPlayers[] {
  return (boxscore?.players ?? []).map((tp) => ({
    team: tp.team?.displayName ?? "",
    abbreviation: tp.team?.abbreviation ?? "",
    categories: (tp.statistics ?? []).map((cat) => {
      const labels = cat.labels ?? [];
      return {
        category: cat.name ?? "",
        players: (cat.athletes ?? []).map((a) => {
          const stats: Record<string, string> = {};
          const values = a.stats ?? [];
          labels.forEach((label, i) => { stats[label] = values[i] ?? ""; });
          return { name: a.athlete?.displayName ?? "", stats };
        }),
      };
    }),
  }));
}

function parseInjuries(injuries: EspnSummary["injuries"]): TeamInjuries[] {
  return (injuries ?? []).map((ti) => ({
    team: ti.team?.displayName ?? "",
    injuries: (ti.injuries ?? []).map((i) => ({ player: i.athlete?.displayName ?? "", status: i.status ?? "" })),
  }));
}

/** Pure parser — verified against the live ESPN summary schema. */
export function parseEspnBoxscore(summary: EspnSummary, sport: Sport): EspnBoxscore {
  return {
    sport,
    teams: parseTeamBoxes(summary.boxscore),
    players: parsePlayerBoxes(summary.boxscore),
    injuries: parseInjuries(summary.injuries),
    attribution: ESPN_ATTRIBUTION,
  };
}

export function espnSummaryUrl(sport: Sport, eventId: string): string {
  return `https://site.api.espn.com/apis/site/v2/sports/${ESPN_PATHS[sport]}/summary?event=${encodeURIComponent(eventId)}`;
}

export type FetchOptions = { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number };

/** Fetch + normalize a single game's box score + player stats + injuries. Throws on non-200. */
export async function fetchEspnBoxscore(sport: Sport, eventId: string, opts: FetchOptions = {}): Promise<EspnBoxscore> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await doFetch(espnSummaryUrl(sport, eventId), { signal: controller.signal });
    if (!res.ok) throw new Error(`ESPN summary ${sport} HTTP ${res.status}`);
    return parseEspnBoxscore((await res.json()) as EspnSummary, sport);
  } finally {
    clearTimeout(timer);
  }
}
