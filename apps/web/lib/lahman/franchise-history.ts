/**
 * Franchise history — the History Lab's MLB spine (1871 → present).
 *
 * Reads the same Lahman Teams.csv as mlb-teams.ts but keeps EVERY
 * season, rolled up per franchise: all-time record, World Series
 * titles, pennants, and the single best season on record. Rights-gated
 * through the source registry (lahman-db, open license) with the same
 * mirror-failover and honest empty states as the rest of the lab.
 */

import { assertIngestible, fetchWithFailover, getSource, parseCsv } from "@sports/data-ingestion";

export interface FranchiseHistoryRow {
  readonly franchise: string;
  /** Most recent team name the franchise played under. */
  readonly currentName: string;
  readonly firstSeason: number;
  readonly lastSeason: number;
  readonly seasons: number;
  readonly wins: number;
  readonly losses: number;
  readonly winPct: number;
  readonly worldSeriesTitles: number;
  readonly pennants: number;
  readonly bestSeason: { readonly year: number; readonly wins: number; readonly losses: number };
}

export interface FranchiseHistory {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly seasonsCovered: { readonly from: number; readonly to: number } | null;
  readonly sourceRows: number;
  readonly rows: readonly FranchiseHistoryRow[];
  readonly note: string;
  readonly attribution: string | null;
  readonly servedBy: string | null;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const RAW_URL =
  "https://raw.githubusercontent.com/chadwickbureau/baseballdatabank/master/core/Teams.csv";
const HOSTS: readonly string[] = [
  "https://cdn.jsdelivr.net/gh/chadwickbureau/baseballdatabank@master/core/Teams.csv",
  RAW_URL,
  `https://ghproxy.net/${RAW_URL}`,
];

let cache: { readonly expiresAt: number; readonly value: FranchiseHistory } | null = null;

export function resetFranchiseHistoryCacheForTests(): void {
  cache = null;
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Roll every team-season up to its franchise. Pure. */
export function buildFranchiseHistory(
  records: readonly CsvRecord[]
): readonly FranchiseHistoryRow[] {
  interface Acc {
    franchise: string;
    currentName: string;
    firstSeason: number;
    lastSeason: number;
    seasons: number;
    wins: number;
    losses: number;
    worldSeriesTitles: number;
    pennants: number;
    bestSeason: { year: number; wins: number; losses: number };
  }
  const byFranchise = new Map<string, Acc>();

  for (const r of records) {
    const franchise = r["franchID"] ?? "";
    const year = toNumber(r["yearID"]);
    if (!franchise || year === 0) continue;
    const wins = toNumber(r["W"]);
    const losses = toNumber(r["L"]);
    const name = r["name"]?.trim() || franchise;

    const acc = byFranchise.get(franchise);
    if (!acc) {
      byFranchise.set(franchise, {
        franchise,
        currentName: name,
        firstSeason: year,
        lastSeason: year,
        seasons: 1,
        wins,
        losses,
        worldSeriesTitles: r["WSWin"] === "Y" ? 1 : 0,
        pennants: r["LgWin"] === "Y" ? 1 : 0,
        bestSeason: { year, wins, losses },
      });
      continue;
    }
    acc.seasons += 1;
    acc.wins += wins;
    acc.losses += losses;
    if (r["WSWin"] === "Y") acc.worldSeriesTitles += 1;
    if (r["LgWin"] === "Y") acc.pennants += 1;
    if (year > acc.lastSeason) {
      acc.lastSeason = year;
      acc.currentName = name;
    }
    if (year < acc.firstSeason) acc.firstSeason = year;
    const bestDecided = acc.bestSeason.wins + acc.bestSeason.losses;
    const bestPct = bestDecided > 0 ? acc.bestSeason.wins / bestDecided : 0;
    const decided = wins + losses;
    const pct = decided > 0 ? wins / decided : 0;
    if (pct > bestPct) acc.bestSeason = { year, wins, losses };
  }

  return [...byFranchise.values()]
    .map((a) => {
      const decided = a.wins + a.losses;
      return { ...a, winPct: decided > 0 ? Math.round((a.wins / decided) * 1000) / 1000 : 0 };
    })
    .sort((a, b) => b.wins - a.wins);
}

export async function loadFranchiseHistory({
  timeoutMs = 15000,
  cacheTtlMs = 24 * 60 * 60 * 1000,
  fetcher = fetch as FetchLike,
}: { timeoutMs?: number; cacheTtlMs?: number; fetcher?: FetchLike } = {}): Promise<FranchiseHistory> {
  assertIngestible("lahman-db");
  const attribution = getSource("lahman-db")?.attributionText ?? null;

  const now = Date.now();
  const live = fetcher === fetch;
  if (cacheTtlMs > 0 && live && cache && cache.expiresAt > now) return cache.value;

  try {
    const { response, sourceUrl } = await fetchWithFailover(HOSTS, fetcher, { timeoutMs });
    const text = await response.text();
    if (text.trimStart().startsWith("<")) throw new Error("Lahman host returned non-CSV (HTML)");
    const { records } = parseCsv(text);
    if (records.length === 0 || !("yearID" in (records[0] ?? {}))) {
      throw new Error("Lahman Teams.csv shape unexpected");
    }

    const rows = buildFranchiseHistory(records);
    const years = records.map((r) => toNumber(r["yearID"])).filter((y) => y > 0);
    const value: FranchiseHistory = {
      generatedAt: new Date().toISOString(),
      status: "live",
      seasonsCovered: { from: Math.min(...years), to: Math.max(...years) },
      sourceRows: records.length,
      rows,
      note:
        "Every MLB franchise rolled up across every recorded season — record, titles, pennants, " +
        "best year. History as it happened, from the Lahman database.",
      attribution,
      servedBy: sourceUrl,
      error: null,
    };
    if (cacheTtlMs > 0 && live) cache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      seasonsCovered: null,
      sourceRows: 0,
      rows: [],
      note: "Franchise history could not load from any Lahman mirror — empty state, nothing invented.",
      attribution,
      servedBy: null,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
