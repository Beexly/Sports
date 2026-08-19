/**
 * ESPN PowerIndex (FPI) client — READ-ONLY public Core/Site API.
 *
 * Fetches team power-index values for NFL / CFB / NBA / CBB.
 * Returns FPI (or equivalent predictive value) keyed by team name/abbr.
 * Fail → empty map (honest no opinion). Never fabricates ratings.
 *
 * Endpoints (public, undocumented):
 *   sports.core.api.espn.com/v2/.../powerindex
 *   site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams
 *
 * Use only as independent engine INPUT (model-fair), never as book lines.
 *
 * Lookup law: exact name/abbr only — no substring fuzzy match
 * (collisions invert FPI polarity and poison ranking).
 */

import { noStoreFetch } from "./no-store-fetch.js";

const ESPN_CORE = "https://sports.core.api.espn.com/v2";
const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports";
const TIMEOUT_MS = 15_000;

export type EspnPowerIndexLeague = "nfl" | "ncaaf" | "nba" | "ncaab";

const LEAGUE_PATH: Record<
  EspnPowerIndexLeague,
  { readonly sport: string; readonly league: string }
> = {
  nfl: { sport: "football", league: "nfl" },
  ncaaf: { sport: "football", league: "college-football" },
  nba: { sport: "basketball", league: "nba" },
  ncaab: { sport: "basketball", league: "mens-college-basketball" },
};

/** Map Odds-API style sport keys → ESPN PowerIndex league. */
export function sportKeyToPowerIndexLeague(
  sportKey: string,
): EspnPowerIndexLeague | null {
  const k = sportKey.trim().toLowerCase();
  if (k === "americanfootball_nfl" || k === "nfl") return "nfl";
  if (
    k === "americanfootball_ncaaf" ||
    k === "ncaaf" ||
    k.includes("college_football") ||
    k.includes("ncaaf")
  ) {
    return "ncaaf";
  }
  if (k === "basketball_nba" || k === "nba") return "nba";
  if (
    k === "basketball_ncaab" ||
    k === "ncaab" ||
    k.includes("ncaab") ||
    k.includes("college_basketball")
  ) {
    return "ncaab";
  }
  return null;
}

type PredictiveRaw = {
  readonly name?: string;
  readonly abbreviation?: string;
  readonly value?: number;
  readonly displayValue?: string;
};

type PowerIndexItemRaw = {
  readonly team?: { readonly $ref?: string };
  readonly predictives?: readonly PredictiveRaw[];
};

type PowerIndexListRaw = {
  readonly items?: readonly PowerIndexItemRaw[];
};

function parseFpi(predictives: readonly PredictiveRaw[] | undefined): number | null {
  if (!predictives?.length) return null;
  // Prefer named FPI/BPI only — refuse unknown predictive[0] (wrong metric risk).
  const preferred = predictives.find((p) => {
    const n = (p.name ?? p.abbreviation ?? "").toLowerCase();
    return n === "fpi" || n === "bpi" || n === "powerindex" || n === "pwr";
  });
  if (!preferred) return null;
  if (preferred.value != null && Number.isFinite(preferred.value)) {
    return preferred.value;
  }
  if (preferred.displayValue) {
    const n = Number(preferred.displayValue);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function teamIdFromRef(ref: string | undefined): string | null {
  if (!ref) return null;
  const m = ref.match(/teams\/(\d+)/);
  return m?.[1] ?? null;
}

export class EspnPowerIndexError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "EspnPowerIndexError";
  }
}

async function espnGetJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await noStoreFetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new EspnPowerIndexError(
      `ESPN request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!response.ok) {
    throw new EspnPowerIndexError(`ESPN HTTP ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export async function fetchEspnPowerIndexPage(
  league: EspnPowerIndexLeague,
  seasonYear: number,
  page = 1,
): Promise<readonly PowerIndexItemRaw[]> {
  const path = LEAGUE_PATH[league];
  const url =
    `${ESPN_CORE}/sports/${path.sport}/leagues/${path.league}` +
    `/seasons/${seasonYear}/powerindex?page=${page}&limit=50`;
  const body = await espnGetJson<PowerIndexListRaw>(url);
  return body.items ?? [];
}

type TeamMeta = { displayName: string; abbreviation: string };

/**
 * Load team id → name/abbr map from site API (one request).
 */
export async function fetchEspnTeamMetaMap(
  league: EspnPowerIndexLeague,
): Promise<Map<string, TeamMeta>> {
  const path = LEAGUE_PATH[league];
  const url = `${ESPN_SITE}/${path.sport}/${path.league}/teams?limit=400`;
  const body = await espnGetJson<{
    sports?: readonly {
      leagues?: readonly {
        teams?: readonly {
          team?: {
            id?: string;
            displayName?: string;
            name?: string;
            abbreviation?: string;
          };
        }[];
      }[];
    }[];
  }>(url);

  const map = new Map<string, TeamMeta>();
  const teams = body.sports?.[0]?.leagues?.[0]?.teams ?? [];
  for (const row of teams) {
    const t = row.team;
    if (!t?.id) continue;
    const displayName = t.displayName ?? t.name ?? "";
    const abbreviation = t.abbreviation ?? "";
    if (!displayName && !abbreviation) continue;
    map.set(String(t.id), { displayName, abbreviation });
  }
  return map;
}

/**
 * Load all team FPI values for a league/season into a lookup map.
 * Keys: lowercased displayName and abbreviation (exact only).
 * Empty map = honest no opinion.
 */
export async function loadEspnPowerIndexMap(
  league: EspnPowerIndexLeague,
  seasonYear: number,
  options?: { readonly maxPages?: number },
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const maxPages = options?.maxPages ?? 8;

  let teamMeta = new Map<string, TeamMeta>();
  try {
    teamMeta = await fetchEspnTeamMetaMap(league);
  } catch {
    // Proceed with id-only keys if team list fails.
  }

  for (let page = 1; page <= maxPages; page++) {
    let items: readonly PowerIndexItemRaw[];
    try {
      items = await fetchEspnPowerIndexPage(league, seasonYear, page);
    } catch {
      break;
    }
    if (items.length === 0) break;

    for (const item of items) {
      const fpi = parseFpi(item.predictives);
      if (fpi == null) continue;
      const teamId = teamIdFromRef(item.team?.$ref);
      if (teamId) map.set(`id:${teamId}`, fpi);
      const meta = teamId ? teamMeta.get(teamId) : undefined;
      if (meta?.displayName) {
        map.set(meta.displayName.toLowerCase().trim(), fpi);
      }
      if (meta?.abbreviation) {
        map.set(meta.abbreviation.toLowerCase().trim(), fpi);
      }
    }
    if (items.length < 50) break;
  }
  return map;
}

/**
 * Look up FPI for a team name/abbr — exact keys only.
 * No substring fuzzy match (polarity-safe).
 */
export function lookupTeamFpi(
  map: ReadonlyMap<string, number>,
  teamName: string,
): number | null {
  const t = teamName.trim().toLowerCase();
  if (!t) return null;
  if (map.has(t)) return map.get(t)!;
  // Strip common suffixes for exact re-try
  const stripped = t.replace(/\s+(fc|sc|cf|afc)$/i, "").trim();
  if (stripped !== t && map.has(stripped)) return map.get(stripped)!;
  return null;
}

const fpiCache = new Map<string, { at: number; map: Map<string, number> }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function getCachedEspnPowerIndexMap(
  league: EspnPowerIndexLeague,
  seasonYear: number,
): Promise<Map<string, number>> {
  const key = `${league}|${seasonYear}`;
  const hit = fpiCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.map;
  try {
    const map = await loadEspnPowerIndexMap(league, seasonYear);
    fpiCache.set(key, { at: Date.now(), map });
    return map;
  } catch {
    return hit?.map ?? new Map();
  }
}

export function defaultPowerIndexSeason(now = new Date()): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0=Jan
  // Football: new season ~Aug; NBA/NCAAB: new season ~Oct.
  // Use prior year for Jan–Jul to keep completed season FPI.
  if (m < 7) return y - 1;
  return y;
}
