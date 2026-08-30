import { assertIngestible, fetchWithFailover, getSource, parseCsv } from "@sports/data-ingestion";

/**
 * MLB team-season signal via the Lahman Baseball Database (CC-BY-SA 3.0) — the
 * THIRD sport wired through the legal source registry (after NFL + NHL),
 * proving the framework generalizes. We read the small `Teams.csv` (one row per
 * team-season) and compute run differential and the Pythagorean win
 * expectation (R^1.83 / (R^1.83 + RA^1.83)) — the canonical sabermetric split
 * of skill vs. luck — for the latest season in the dataset.
 *
 * Multi-host failover (jsDelivr CDN -> raw GitHub -> community proxy) so a
 * single host outage never takes the feed down. Read-only, cached, attributed;
 * historical reference, not a betting pick. `canPublishPicks` stays false.
 */

export interface MlbTeamRow {
  readonly team: string;
  readonly franchise: string;
  readonly league: string;
  readonly division: string;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly runsScored: number;
  readonly runsAllowed: number;
  readonly runDiff: number;
  readonly winPct: number; // actual
  readonly pythagWinPct: number; // expected from runs
  /** actual − expected win%: positive = outperformed run differential ("luck"). */
  readonly luck: number;
}

export interface LahmanMlbTeams {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly sourceRows: number;
  readonly teams: readonly MlbTeamRow[];
  readonly canPublishPicks: false;
  readonly note: string;
  readonly attribution: string | null;
  readonly sourceUrl: string;
  readonly servedBy: string | null;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const REPO_PATH = "chadwickbureau/baseballdatabank/master/core/Teams.csv";
const RAW_URL = `https://raw.githubusercontent.com/${REPO_PATH}`;
// jsDelivr serves GitHub repo content from a global CDN — the most reliable
// primary; raw GitHub + a community proxy are ordered backups.
const HOSTS: readonly string[] = [
  `https://cdn.jsdelivr.net/gh/chadwickbureau/baseballdatabank@master/core/Teams.csv`,
  RAW_URL,
  `https://ghproxy.net/${RAW_URL}`,
];

const PYTHAG_EXP = 1.83;
let cache: { readonly expiresAt: number; readonly value: LahmanMlbTeams } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}
function round(value: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function pythag(runsScored: number, runsAllowed: number): number {
  if (runsScored <= 0 && runsAllowed <= 0) return 0;
  const rs = runsScored ** PYTHAG_EXP;
  const ra = runsAllowed ** PYTHAG_EXP;
  const denom = rs + ra;
  return denom > 0 ? rs / denom : 0;
}

export function resetLahmanMlbCacheForTests(): void {
  cache = null;
}

/** Build the team rows for the latest season present. Pure. */
export function buildMlbTeams(records: readonly CsvRecord[]): { season: number; teams: MlbTeamRow[] } {
  if (records.length === 0) return { season: 0, teams: [] };
  const season = records.reduce((max, r) => Math.max(max, toNumber(r["yearID"])), 0);
  const rows = records
    .filter((r) => toNumber(r["yearID"]) === season)
    .map((r): MlbTeamRow => {
      const wins = toNumber(r["W"]);
      const losses = toNumber(r["L"]);
      const rs = toNumber(r["R"]);
      const ra = toNumber(r["RA"]);
      const decided = wins + losses;
      const winPct = round(decided > 0 ? wins / decided : 0);
      const pythagWinPct = round(pythag(rs, ra));
      return {
        team: r["name"]?.trim() || r["teamID"] || "UNKNOWN",
        franchise: r["franchID"] || "",
        league: r["lgID"] || "",
        division: r["divID"] || "",
        games: toNumber(r["G"]),
        wins,
        losses,
        runsScored: rs,
        runsAllowed: ra,
        runDiff: rs - ra,
        winPct,
        pythagWinPct,
        luck: round(winPct - pythagWinPct),
      };
    })
    .sort((a, b) => b.runDiff - a.runDiff);
  return { season, teams: rows };
}

export async function loadLahmanMlbTeams({
  timeoutMs = 15000,
  cacheTtlMs = 24 * 60 * 60 * 1000,
  fetcher = fetch,
}: { timeoutMs?: number; cacheTtlMs?: number; fetcher?: FetchLike } = {}): Promise<LahmanMlbTeams> {
  assertIngestible("lahman-db");
  const attribution = getSource("lahman-db")?.attributionText ?? null;

  const now = Date.now();
  const live = fetcher === fetch;
  if (cacheTtlMs > 0 && live && cache && cache.expiresAt > now) return cache.value;

  try {
    // Integrity guard on every host (mirror supply-chain hardening): a host
    // serving HTML/garbage fails over to the next mirror instead of failing the
    // whole load. The post-parse shape checks below stay as defense-in-depth.
    const looksLikeLahmanCsv = (body: Uint8Array): boolean => {
      const head = new TextDecoder().decode(body.slice(0, 1024));
      return !head.trimStart().startsWith("<") && head.includes("yearID");
    };
    const { response, sourceUrl } = await fetchWithFailover(HOSTS, fetcher, {
      timeoutMs,
      validate: looksLikeLahmanCsv,
    });
    const text = await response.text();
    if (text.trimStart().startsWith("<")) throw new Error("Lahman host returned non-CSV (HTML)");
    const { records } = parseCsv(text);
    if (records.length === 0 || !("yearID" in (records[0] ?? {}))) throw new Error("Lahman Teams.csv shape unexpected");

    const { season, teams } = buildMlbTeams(records);
    const value: LahmanMlbTeams = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season,
      sourceRows: records.length,
      teams,
      canPublishPicks: false,
      note: `MLB team-season run differential and Pythagorean win expectation (${season}) from the Lahman database. Skill-vs-luck context, not a betting pick.`,
      attribution,
      sourceUrl: RAW_URL,
      servedBy: sourceUrl,
      error: null,
    };
    if (cacheTtlMs > 0 && live) cache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      sourceRows: 0,
      teams: [],
      canPublishPicks: false,
      note: "Lahman MLB data could not load from any mirror. The product shows an empty state instead of fabricated stats.",
      attribution,
      sourceUrl: RAW_URL,
      servedBy: null,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
