import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

/**
 * Rushing contact — PFR advanced charting (nflverse pfr_advstats variant 'rush',
 * CC-BY-4.0): yards AFTER contact per attempt (the back's own elusiveness/power,
 * independent of blocking), yards BEFORE contact per attempt (the line/scheme
 * term), and broken tackles. This is a SECOND, independent estimator of rushing
 * talent to triangulate against Next Gen RYOE/att — when both agree, confidence
 * rises; when they diverge, the read widens. Read-only, historical, honest
 * source-error; canPublishProjections false.
 */

export interface RushingContactRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly attempts: number;
  readonly yacPerAtt: number; // yards after contact / attempt — the talent term
  readonly ybcPerAtt: number; // yards before contact / attempt — the blocking term
  readonly brokenTackles: number;
  readonly brokenPerAtt: number;
  readonly yacPct: number; // YAC/att percentile in the pool
}

export interface RushingContact {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly sourceRows: number;
  readonly rows: readonly RushingContactRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MIN_ATT = 40;
const TOP_N = 30;

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

interface Agg { name: string; team: string; att: number; yac: number; ybc: number; brk: number }

/** Aggregate weekly PFR rush rows into season contact profiles. Pure. */
export function buildRushingContact(records: readonly CsvRecord[]): RushingContactRow[] {
  const byPlayer = new Map<string, Agg>();
  for (const r of records) {
    if (r["game_type"] !== "REG") continue;
    const id = r["pfr_player_id"];
    if (!id) continue;
    const a = byPlayer.get(id) ?? { name: r["pfr_player_name"] ?? "UNKNOWN", team: r["team"] ?? "", att: 0, yac: 0, ybc: 0, brk: 0 };
    a.att += num(r["att"]);
    a.yac += num(r["yac"]);
    a.ybc += num(r["ybc"]);
    a.brk += num(r["brk_tkl"]);
    a.team = r["team"] || a.team;
    byPlayer.set(id, a);
  }
  const qualified = [...byPlayer.entries()].filter(([, a]) => a.att >= MIN_ATT);
  if (qualified.length === 0) return [];

  const yacPcts = percentileRanks(qualified.map(([, a]) => (a.att ? a.yac / a.att : 0)));
  const rows = qualified.map(([id, a], i): RushingContactRow => ({
    playerId: id,
    name: a.name,
    team: a.team,
    attempts: a.att,
    yacPerAtt: round(a.att ? a.yac / a.att : 0),
    ybcPerAtt: round(a.att ? a.ybc / a.att : 0),
    brokenTackles: a.brk,
    brokenPerAtt: round(a.att ? a.brk / a.att : 0, 3),
    yacPct: Math.round(yacPcts[i] ?? 0),
  }));
  return rows.sort((x, y) => y.yacPerAtt - x.yacPerAtt).slice(0, TOP_N);
}

export async function loadRushingContact({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<RushingContact> {
  assertIngestible("nflverse");
  let lastError: unknown = null;
  for (const candidate of [season, season - 1]) {
    const url = nflverseUrl("pfr_advstats", candidate, "rush");
    try {
      const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
      const { records } = parseCsv(await response.text());
      const reg = records.filter((r) => r["game_type"] === "REG");
      if (reg.length === 0) throw new Error("no REG rush rows");
      return {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        sourceRows: records.length,
        rows: buildRushingContact(records),
        canPublishProjections: false,
        note: "PFR advanced rushing: yards after contact per carry (the back's own talent, blocking-independent) vs yards before contact (the line). An independent estimator to triangulate against Next Gen RYOE. Context, not a pick.",
        sourceUrl: url,
        error: null,
      };
    } catch (error) {
      lastError = error;
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season,
    sourceRows: 0,
    rows: [],
    canPublishProjections: false,
    note: "PFR rushing charting could not load from nflverse. The board shows an empty state instead of fabricated contact data.",
    sourceUrl: nflverseUrl("pfr_advstats", season, "rush"),
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
