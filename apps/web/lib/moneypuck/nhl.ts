import { assertIngestible, getSource, parseCsv } from "@sports/data-ingestion";

/**
 * NHL advanced stats via MoneyPuck (free CSV, credit required) — the first
 * non-NFL sport wired through the legal source registry, proving the framework
 * is multi-sport. Expected goals (xG) is hockey's best public skill/luck split.
 * Read-only, cached, attributed; `canPublishPicks` stays false.
 */

export interface NhlSkaterRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly games: number;
  readonly xGoals: number;
  readonly goals: number;
  readonly points: number;
  readonly shots: number;
  /** Goals above/below expected (finishing). */
  readonly goalsOverExpected: number;
  readonly onIceXgPct: number | null;
}

export interface NhlTeamRow {
  readonly team: string;
  readonly games: number;
  readonly xGoalsPct: number | null; // share of on-ice expected goals (all situations)
}

export interface MoneyPuckNhl {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonLabel: string;
  readonly sourceRows: number;
  readonly skaters: readonly NhlSkaterRow[];
  readonly teams: readonly NhlTeamRow[];
  readonly canPublishPicks: false;
  readonly note: string;
  readonly attribution: string | null;
  readonly sourceUrls: Record<"skaters" | "teams", string>;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const BASE = "https://moneypuck.com/moneypuck/playerData/seasonSummary";
const MIN_GAMES = 20;
const TOP_N = 30;

let cache: { readonly expiresAt: number; readonly value: MoneyPuckNhl } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}
function finite(value: string | undefined): number | null {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}
function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** NHL season start year: Sep+ uses the current year, else the prior year. */
function defaultSeason(now: Date): number {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() >= 8 ? y : y - 1;
}

function skatersUrl(season: number): string {
  return `${BASE}/${season}/regular/skaters.csv`;
}
function teamsUrl(season: number): string {
  return `${BASE}/${season}/regular/teams.csv`;
}

async function fetchCsv(
  url: string,
  fetcher: FetchLike,
  timeoutMs: number,
  expectCol: string,
): Promise<readonly CsvRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`MoneyPuck ${response.status} for ${url}`);
    const text = await response.text();
    // MoneyPuck serves an HTML error page (200) for a missing season — guard it.
    if (text.trimStart().startsWith("<")) throw new Error("MoneyPuck returned non-CSV (season missing)");
    const { records } = parseCsv(text);
    if (records.length === 0 || !(expectCol in (records[0] ?? {}))) throw new Error("MoneyPuck CSV shape unexpected");
    return records;
  } finally {
    clearTimeout(timer);
  }
}

function buildSkaters(records: readonly CsvRecord[]): NhlSkaterRow[] {
  return records
    .filter((r) => r["situation"] === "all" && toNumber(r["games_played"]) >= MIN_GAMES)
    .map((r): NhlSkaterRow => {
      const xg = round(toNumber(r["I_F_xGoals"]));
      const g = toNumber(r["I_F_goals"]);
      return {
        playerId: r["playerId"] ?? "",
        name: r["name"] ?? "UNKNOWN",
        team: r["team"] ?? "",
        position: r["position"] ?? "",
        games: toNumber(r["games_played"]),
        xGoals: xg,
        goals: g,
        points: toNumber(r["I_F_points"]),
        shots: toNumber(r["I_F_shotsOnGoal"]),
        goalsOverExpected: round(g - toNumber(r["I_F_xGoals"])),
        onIceXgPct: finite(r["onIce_xGoalsPercentage"]),
      };
    })
    .sort((a, b) => b.xGoals - a.xGoals)
    .slice(0, TOP_N);
}

function buildTeams(records: readonly CsvRecord[]): NhlTeamRow[] {
  return records
    .filter((r) => r["situation"] === "all")
    .map((r): NhlTeamRow => ({
      team: r["team"] ?? "",
      games: toNumber(r["games_played"]),
      xGoalsPct: finite(r["xGoalsPercentage"] ?? r["onIce_xGoalsPercentage"]),
    }))
    .filter((t) => t.team)
    .sort((a, b) => (b.xGoalsPct ?? -1) - (a.xGoalsPct ?? -1));
}

export function resetMoneyPuckNhlCacheForTests(): void {
  cache = null;
}

export async function loadMoneyPuckNhl({
  season,
  timeoutMs = 15000,
  cacheTtlMs = 6 * 60 * 60 * 1000,
  fetcher = fetch,
  now = new Date(),
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
  now?: Date;
} = {}): Promise<MoneyPuckNhl> {
  assertIngestible("moneypuck");
  const attribution = getSource("moneypuck")?.attributionText ?? null;

  const resolved = season ?? defaultSeason(now);
  const live = fetcher === fetch;
  const nowMs = now.getTime();
  if (cacheTtlMs > 0 && live && cache && cache.expiresAt > nowMs) return cache.value;

  const sUrl = skatersUrl(resolved);
  const tUrl = teamsUrl(resolved);
  try {
    const [skaterRecords, teamRecords] = await Promise.all([
      fetchCsv(sUrl, fetcher, timeoutMs, "name"),
      fetchCsv(tUrl, fetcher, timeoutMs, "team").catch(() => [] as readonly CsvRecord[]),
    ]);
    const value: MoneyPuckNhl = {
      generatedAt: now.toISOString(),
      status: "live",
      season: resolved,
      seasonLabel: `${resolved}-${String((resolved + 1) % 100).padStart(2, "0")}`,
      sourceRows: skaterRecords.length + teamRecords.length,
      skaters: buildSkaters(skaterRecords),
      teams: buildTeams(teamRecords),
      canPublishPicks: false,
      note: "NHL expected-goals leaders from MoneyPuck (all situations, regular season). Real advanced stats — context, not a betting pick.",
      attribution,
      sourceUrls: { skaters: sUrl, teams: tUrl },
      error: null,
    };
    if (cacheTtlMs > 0 && live) cache = { expiresAt: nowMs + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: now.toISOString(),
      status: "source-error",
      season: resolved,
      seasonLabel: `${resolved}-${String((resolved + 1) % 100).padStart(2, "0")}`,
      sourceRows: 0,
      skaters: [],
      teams: [],
      canPublishPicks: false,
      note: "MoneyPuck NHL data could not load. The product shows an empty state instead of fabricated stats.",
      attribution,
      sourceUrls: { skaters: sUrl, teams: tUrl },
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
