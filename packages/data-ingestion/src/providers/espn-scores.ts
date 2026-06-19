/**
 * ESPN free SETTLEMENT score provider (keyless).
 *
 * Source: ESPN public scoreboard API (site.api.espn.com). Rights-registry
 * source_id "espn-public-api" — status `approved_public_logged_off`.
 *
 * RIGHTS (exact flags from the registry, honored here):
 *   - commercial_display_allowed=false → these scores are STORAGE/INTERNAL only.
 *     They may settle picks and feed derived analytics; they must NOT be shown as
 *     a public, ESPN-attributed display claim.
 *   - storage_allowed=false → we DO NOT request the `storage` intent (it would be
 *     denied). We request `derived_analytics` only — settlement reads a score as a
 *     derived-analytics input. This matches the existing nhl-schedule adapter and
 *     keeps the clearance fail-closed and rights-correct.
 *   - attribution_required=true → "Scores data via ESPN" rides on the snapshot.
 *
 * SAFETY: GET only, no key, no auth, no writes. Never throws — returns
 * `{ healthy: false }` on clearance denial, network error, non-2xx, bad JSON, or
 * an unparseable payload, so the pool degrades to the next provider.
 */

import {
  type ScoreProvider,
  type ScoreProviderOptions,
  type NormalizedScore,
  type NormalizedScoreResult,
  type ScoreClearanceRequest,
  coerceScore,
  resolveClearance,
  unhealthyScoreResult,
} from "../score-provider.js";

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";
const ESPN_TIMEOUT_MS = 15 * 1000;

export const ESPN_SCORES_SOURCE_ID = "espn-public-api";

/**
 * Clearance request for ESPN scores.
 * Mode: public_logged_off_fact_extract — compatible with approved_public_logged_off.
 * Tool: fetch-native — approved for this mode.
 * Intents: derived_analytics ONLY — storage_allowed=false for espn-public-api.
 */
const ESPN_CLEARANCE_REQUEST: ScoreClearanceRequest = {
  source_id: ESPN_SCORES_SOURCE_ID,
  mode: "public_logged_off_fact_extract",
  tool_id: "fetch-native",
  intents: ["derived_analytics"],
};

/**
 * Map our internal Odds-API sport keys to ESPN's {sport}/{league} path segments.
 * Sports with no ESPN scoreboard equivalent return undefined (provider reports
 * healthy:false for them, so the pool moves on).
 */
const SPORT_PATH: Record<string, { readonly sport: string; readonly league: string } | undefined> = {
  americanfootball_nfl: { sport: "football", league: "nfl" },
  americanfootball_ncaaf: { sport: "football", league: "college-football" },
  basketball_nba: { sport: "basketball", league: "nba" },
  basketball_ncaab: { sport: "basketball", league: "mens-college-basketball" },
  baseball_mlb: { sport: "baseball", league: "mlb" },
  icehockey_nhl: { sport: "hockey", league: "nhl" },
  soccer_usa_mls: { sport: "soccer", league: "usa.1" },
};

// ─── Defensive raw shapes (every field optional — ESPN varies by sport/state) ───

interface EspnTeamRaw {
  readonly abbreviation?: string;
  readonly displayName?: string;
  readonly name?: string;
}
interface EspnCompetitorRaw {
  readonly homeAway?: string;
  readonly score?: string | number;
  readonly team?: EspnTeamRaw;
}
interface EspnStatusRaw {
  readonly type?: { readonly completed?: boolean };
}
interface EspnCompetitionRaw {
  readonly competitors?: readonly EspnCompetitorRaw[];
  readonly status?: EspnStatusRaw;
}
interface EspnEventRaw {
  readonly id?: string;
  readonly date?: string;
  readonly status?: EspnStatusRaw;
  readonly competitions?: readonly EspnCompetitionRaw[];
}
interface EspnScoreboardResponse {
  readonly events?: readonly EspnEventRaw[];
}

function teamName(team: EspnTeamRaw | undefined): string {
  return team?.displayName ?? team?.name ?? team?.abbreviation ?? "";
}

/**
 * Pure parser: ESPN scoreboard payload → normalized scores. Exported for unit
 * tests against a fixture (no network). Returns [] for an empty/garbage payload
 * (never throws) and skips events missing both teams.
 */
export function parseEspnScores(payload: EspnScoreboardResponse): NormalizedScore[] {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const out: NormalizedScore[] = [];
  for (const event of events) {
    const competition = event.competitions?.[0];
    const status = competition?.status ?? event.status;
    const completed = Boolean(status?.type?.completed);
    const competitors: readonly EspnCompetitorRaw[] = Array.isArray(competition?.competitors)
      ? competition.competitors
      : [];
    const home = competitors.find((c) => c?.homeAway === "home");
    const away = competitors.find((c) => c?.homeAway === "away");

    const homeTeam = teamName(home?.team);
    const awayTeam = teamName(away?.team);
    // Skip records we can't identify both sides of — a half-record can't settle.
    if (homeTeam === "" || awayTeam === "") continue;

    out.push({
      gameKey: event.id ?? "",
      homeTeam,
      awayTeam,
      homeScore: coerceScore(home?.score),
      awayScore: coerceScore(away?.score),
      completed,
      commenceTime: event.date ?? null,
    });
  }
  return out;
}

/** Build YYYYMMDD date strings for [today-daysBack, today], oldest first. */
function dateWindow(daysBack: number, now: Date): string[] {
  const days = Number.isFinite(daysBack) ? Math.max(0, Math.floor(daysBack)) : 0;
  const dates: string[] = [];
  for (let i = days; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    dates.push(`${y}${m}${day}`);
  }
  return dates;
}

export const espnScoreProvider: ScoreProvider = {
  name: "ESPN public scoreboard",
  sourceId: ESPN_SCORES_SOURCE_ID,

  async fetchScores(
    sportKey: string,
    daysBack: number,
    options: ScoreProviderOptions = {},
  ): Promise<NormalizedScoreResult> {
    const provider = ESPN_SCORES_SOURCE_ID;

    // ── 1. Clearance (fail-closed) ───────────────────────────────────────────
    const clearance = resolveClearance(ESPN_CLEARANCE_REQUEST, options.checkClearance);
    if (!clearance.allowed) {
      return unhealthyScoreResult(provider, clearance.reason);
    }
    const rightsSnapshot = clearance.rightsSnapshot;

    // ── 2. Sport mapping ─────────────────────────────────────────────────────
    const path = SPORT_PATH[sportKey];
    if (!path) {
      return unhealthyScoreResult(provider, `unsupported-sport:${sportKey}`, rightsSnapshot);
    }

    const fetchFn = options.fetchFn ?? globalThis.fetch;
    const dates = dateWindow(daysBack, new Date());

    // ── 3. Fetch each date in the window; merge by gameKey ───────────────────
    const byKey = new Map<string, NormalizedScore>();
    let anyOk = false;
    for (const date of dates) {
      const url =
        `${ESPN_BASE_URL}/${path.sport}/${path.league}/scoreboard?dates=${encodeURIComponent(date)}`;
      let payload: EspnScoreboardResponse;
      try {
        const res = await fetchFn(url, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(ESPN_TIMEOUT_MS),
        });
        if (!res.ok) continue;
        payload = (await res.json()) as EspnScoreboardResponse;
      } catch {
        // Network error, timeout, or bad JSON for this date — skip it, try the rest.
        continue;
      }
      anyOk = true;
      for (const score of parseEspnScores(payload)) {
        if (score.gameKey === "") continue;
        // Prefer the latest observation (completed games overwrite earlier ones).
        byKey.set(score.gameKey, score);
      }
    }

    if (!anyOk) {
      return unhealthyScoreResult(provider, "all-date-fetches-failed", rightsSnapshot);
    }

    return {
      provider,
      scores: [...byKey.values()],
      healthy: true,
      rightsSnapshot,
    };
  },
};
