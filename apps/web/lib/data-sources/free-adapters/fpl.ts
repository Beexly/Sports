/**
 * Fantasy Premier League adapter — FREE, no key. English Premier League FACTS only.
 *
 * GATED: registered as a candidate in sports-data-candidates.ts (id "fpl"); not cleared
 * for ingestion/public use until FPL/PL terms are read (see OWNER_ACTION_ITEMS.md). This
 * adapter is the verified, fixture-tested implementation that goes live once cleared.
 *
 * FACTS ONLY: we extract teams' table facts, fixtures/results, and players' factual season
 * stats (minutes, goals, assists, clean sheets, cards, starts). We deliberately DO NOT
 * extract FPL's proprietary derived metrics (strength, ICT index, form, expected points) —
 * those are not ours to republish (CLAUDE.md).
 *
 * Schemas verified live 2026-06-15 against bootstrap-static + fixtures.
 */

export const FPL_ATTRIBUTION = "EPL data via the Fantasy Premier League API";
const FPL_BASE = "https://fantasy.premierleague.com/api";

export type FplTeam = {
  readonly id: number;
  readonly name: string;
  readonly short: string;
  readonly position: number | null;
  readonly played: number;
  readonly win: number;
  readonly draw: number;
  readonly loss: number;
  readonly points: number;
};

export type FplPosition = "GKP" | "DEF" | "MID" | "FWD" | "UNK";

export type FplPlayer = {
  readonly name: string;
  readonly teamShort: string;
  readonly position: FplPosition;
  readonly minutes: number;
  readonly goals: number;
  readonly assists: number;
  readonly cleanSheets: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly starts: number;
};

export type FplFixture = {
  readonly gameweek: number | null;
  readonly home: string; // team short code
  readonly away: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly finished: boolean;
  readonly kickoff: string | null; // ISO
};

// ── raw shapes (only the FACT fields we read) ──────────────────────────────────────────
type RawTeam = { id: number; name?: string; short_name?: string; position?: number; played?: number; win?: number; draw?: number; loss?: number; points?: number };
type RawElementType = { id: number; singular_name_short?: string };
type RawElement = {
  web_name?: string; team?: number; element_type?: number;
  minutes?: number; goals_scored?: number; assists?: number; clean_sheets?: number;
  yellow_cards?: number; red_cards?: number; starts?: number;
};
export type FplBootstrap = { teams?: RawTeam[]; elements?: RawElement[]; element_types?: RawElementType[] };
type RawFixture = { event?: number | null; team_h?: number; team_a?: number; team_h_score?: number | null; team_a_score?: number | null; finished?: boolean; kickoff_time?: string | null };

const n = (v: number | undefined): number => (typeof v === "number" ? v : 0);

export function parseFplTeams(b: FplBootstrap): FplTeam[] {
  return (b.teams ?? []).map((t) => ({
    id: t.id,
    name: t.name ?? "",
    short: t.short_name ?? "",
    position: typeof t.position === "number" ? t.position : null,
    played: n(t.played),
    win: n(t.win),
    draw: n(t.draw),
    loss: n(t.loss),
    points: n(t.points),
  }));
}

function positionMap(b: FplBootstrap): Map<number, FplPosition> {
  const m = new Map<number, FplPosition>();
  for (const et of b.element_types ?? []) {
    const s = et.singular_name_short;
    m.set(et.id, s === "GKP" || s === "DEF" || s === "MID" || s === "FWD" ? s : "UNK");
  }
  return m;
}

function teamShortMap(b: FplBootstrap): Map<number, string> {
  return new Map((b.teams ?? []).map((t) => [t.id, t.short_name ?? ""]));
}

export function parseFplPlayers(b: FplBootstrap): FplPlayer[] {
  const pos = positionMap(b);
  const teams = teamShortMap(b);
  return (b.elements ?? []).map((e) => ({
    name: e.web_name ?? "",
    teamShort: (e.team !== undefined ? teams.get(e.team) : "") ?? "",
    position: (e.element_type !== undefined ? pos.get(e.element_type) : "UNK") ?? "UNK",
    minutes: n(e.minutes),
    goals: n(e.goals_scored),
    assists: n(e.assists),
    cleanSheets: n(e.clean_sheets),
    yellowCards: n(e.yellow_cards),
    redCards: n(e.red_cards),
    starts: n(e.starts),
  }));
}

/** Fixtures need the bootstrap team list to map numeric ids → short codes. */
export function parseFplFixtures(fixtures: RawFixture[], b: FplBootstrap): FplFixture[] {
  const teams = teamShortMap(b);
  return (fixtures ?? []).map((f) => ({
    gameweek: typeof f.event === "number" ? f.event : null,
    home: (f.team_h !== undefined ? teams.get(f.team_h) : "") ?? "",
    away: (f.team_a !== undefined ? teams.get(f.team_a) : "") ?? "",
    homeScore: typeof f.team_h_score === "number" ? f.team_h_score : null,
    awayScore: typeof f.team_a_score === "number" ? f.team_a_score : null,
    finished: Boolean(f.finished),
    kickoff: f.kickoff_time ?? null,
  }));
}

// ── fetchers ───────────────────────────────────────────────────────────────────────
export type FetchOptions = { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number };

async function getJson<T>(path: string, opts: FetchOptions): Promise<T> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await doFetch(`${FPL_BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`FPL ${path} HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export type FplSnapshot = {
  readonly teams: readonly FplTeam[];
  readonly players: readonly FplPlayer[];
  readonly fixtures: readonly FplFixture[];
  readonly attribution: string;
};

export async function fetchFplSnapshot(opts: FetchOptions = {}): Promise<FplSnapshot> {
  const bootstrap = await getJson<FplBootstrap>("/bootstrap-static/", opts);
  const fixtures = await getJson<RawFixture[]>("/fixtures/", opts);
  return {
    teams: parseFplTeams(bootstrap),
    players: parseFplPlayers(bootstrap),
    fixtures: parseFplFixtures(fixtures, bootstrap),
    attribution: FPL_ATTRIBUTION,
  };
}
