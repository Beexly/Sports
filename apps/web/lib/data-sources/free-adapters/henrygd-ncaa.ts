/**
 * henrygd NCAA API adapter — FREE, no key (NCAA.com-derived facts).
 *
 * Approved free-first for NCAA facts. The base URL is configurable so we can point at a
 * SELF-HOSTED instance (HENRYGD_NCAA_BASE_URL) and drop the public-demo rate cap
 * (5 req/sec/IP). Schemas verified live against the public demo:
 *   /scoreboard/{sportPath}   /rankings/{sportPath}/{poll}   /standings/{sportPath}
 * Pure parsers tested against captured fixtures. Facts only; attribution required.
 */

export const HENRYGD_ATTRIBUTION = "NCAA data via NCAA.com (henrygd/ncaa-api)";

const PUBLIC_DEMO = "https://ncaa-api.henrygd.me";

/** Verified henrygd sport paths (pass to the fetchers as `sportPath`). */
export const HENRYGD_PATHS = {
  cfb: "football/fbs",
  mbb: "basketball-men/d1",
  wbb: "basketball-women/d1",
} as const;

/**
 * Date-pathed scoreboard for a specific day, e.g.
 *   henrygdDatedPath("basketball-men/d1", "2025-03-20") → "basketball-men/d1/2025/03/20/all-conf"
 * Verified for basketball; the base path alone returns the latest slate.
 */
export function henrygdDatedPath(base: string, date: string, group = "all-conf"): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${base}/${m[1]}/${m[2]}/${m[3]}/${group}` : base;
}

/** Base URL — self-hosted instance wins (no rate cap); falls back to the public demo. */
export function henrygdBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const base = env["HENRYGD_NCAA_BASE_URL"]?.trim();
  return (base && base.replace(/\/$/, "")) || PUBLIC_DEMO;
}

export type NcaaGameState = "pre" | "in" | "post" | "unknown";

export type NcaaGame = {
  readonly sourceId: "henrygd-ncaa";
  readonly gameId: string;
  readonly date: string; // YYYY-MM-DD (from MM/DD/YYYY)
  readonly state: NcaaGameState;
  readonly completed: boolean;
  readonly home: { team: string; abbr: string; score: number | null };
  readonly away: { team: string; abbr: string; score: number | null };
  readonly attribution: string;
};

type HgTeam = { names?: { short?: string; char6?: string }; score?: string };
type HgGameInner = { gameID?: string; gameState?: string; startDate?: string; home?: HgTeam; away?: HgTeam };
export type HenrygdScoreboard = { games?: { game?: HgGameInner }[] };

function num(s: string | undefined): number | null {
  if (s === undefined || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toState(raw: string | undefined): NcaaGameState {
  switch ((raw ?? "").toLowerCase()) {
    case "final":
      return "post";
    case "live":
    case "in":
      return "in";
    case "pre":
    case "scheduled":
      return "pre";
    default:
      return "unknown";
  }
}

/** "MM/DD/YYYY" → "YYYY-MM-DD" (empty string if unparseable). */
export function toIsoDate(mdy: string | undefined): string {
  const m = (mdy ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")}`;
}

function team(t: HgTeam | undefined): { team: string; abbr: string; score: number | null } {
  return { team: t?.names?.short ?? "", abbr: (t?.names?.char6 ?? "").toUpperCase(), score: num(t?.score) };
}

export function parseHenrygdScoreboard(json: HenrygdScoreboard): NcaaGame[] {
  const games = Array.isArray(json.games) ? json.games : [];
  const out: NcaaGame[] = [];
  for (const wrap of games) {
    const g = wrap.game;
    if (!g) continue;
    const state = toState(g.gameState);
    out.push({
      sourceId: "henrygd-ncaa",
      gameId: g.gameID ?? "",
      date: toIsoDate(g.startDate),
      state,
      completed: state === "post",
      home: team(g.home),
      away: team(g.away),
      attribution: HENRYGD_ATTRIBUTION,
    });
  }
  return out;
}

export type NcaaRanking = {
  readonly rank: number | null;
  readonly school: string;
  readonly firstPlaceVotes: number | null;
  readonly points: number | null;
  readonly record: string | null;
  readonly previous: number | null;
};
type HgRankRow = { RANK?: string; SCHOOL?: string; POINTS?: string; RECORD?: string; PREVIOUS?: string };
export type HenrygdRankings = { data?: HgRankRow[] };

/** "Indiana (66)" → { school: "Indiana", firstPlaceVotes: 66 }. */
export function splitSchoolVotes(raw: string | undefined): { school: string; votes: number | null } {
  const s = (raw ?? "").trim();
  const m = s.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (m) return { school: m[1]!.trim(), votes: Number(m[2]) };
  return { school: s, votes: null };
}

export function parseHenrygdRankings(json: HenrygdRankings): NcaaRanking[] {
  const rows = Array.isArray(json.data) ? json.data : [];
  return rows.map((r) => {
    const { school, votes } = splitSchoolVotes(r.SCHOOL);
    return {
      rank: num(r.RANK),
      school,
      firstPlaceVotes: votes,
      points: num(r.POINTS),
      record: r.RECORD ?? null,
      previous: num(r.PREVIOUS),
    };
  });
}

export type NcaaConferenceStanding = {
  readonly conference: string;
  readonly teams: ReadonlyArray<{
    readonly school: string;
    readonly conferenceWins: number | null;
    readonly conferenceLosses: number | null;
    readonly overallWins: number | null;
    readonly overallLosses: number | null;
    readonly pointsFor: number | null;
    readonly pointsAgainst: number | null;
    readonly streak: string | null;
  }>;
};
type HgStandRow = Record<string, string>;
type HgStandGroup = { conference?: string; standings?: HgStandRow[] };
export type HenrygdStandings = { data?: HgStandGroup[] };

export function parseHenrygdStandings(json: HenrygdStandings): NcaaConferenceStanding[] {
  const groups = Array.isArray(json.data) ? json.data : [];
  return groups.map((g) => ({
    conference: g.conference ?? "",
    teams: (Array.isArray(g.standings) ? g.standings : []).map((row) => ({
      school: row["School"] ?? "",
      conferenceWins: num(row["Conference W"]),
      conferenceLosses: num(row["Conference L"]),
      overallWins: num(row["Overall W"]),
      overallLosses: num(row["Overall L"]),
      pointsFor: num(row["Overall PF"]),
      pointsAgainst: num(row["Overall PA"]),
      streak: row["Overall STREAK"] ?? null,
    })),
  }));
}

// ── Fetchers ─────────────────────────────────────────────────────────────────────

export type FetchOptions = { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number; readonly baseUrl?: string };

async function getJson<T>(path: string, opts: FetchOptions): Promise<T> {
  const base = opts.baseUrl ?? henrygdBaseUrl();
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await doFetch(`${base}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`henrygd ${path} HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHenrygdScoreboard(sportPath = "football/fbs", opts: FetchOptions = {}): Promise<NcaaGame[]> {
  return parseHenrygdScoreboard(await getJson<HenrygdScoreboard>(`/scoreboard/${sportPath}`, opts));
}

export async function fetchHenrygdRankings(sportPath = "football/fbs", poll = "associated-press", opts: FetchOptions = {}): Promise<NcaaRanking[]> {
  return parseHenrygdRankings(await getJson<HenrygdRankings>(`/rankings/${sportPath}/${poll}`, opts));
}

export async function fetchHenrygdStandings(sportPath = "football/fbs", opts: FetchOptions = {}): Promise<NcaaConferenceStanding[]> {
  return parseHenrygdStandings(await getJson<HenrygdStandings>(`/standings/${sportPath}`, opts));
}
