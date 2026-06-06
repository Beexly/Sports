import {
  assertIngestible,
  fetchWithFailover,
  nflverseUrl,
  parseCsv,
  withMirrors,
} from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

/**
 * Pressure & Coverage — PFR advanced charting via the nflverse `pfr_advstats`
 * release (CC-BY-4.0): how much pressure each QB faces/handles, and how throwable
 * each defender in coverage is. These are charting facts no box score carries.
 * The per-week files carry `pfr_player_name`, so no ID join is needed. Read-only,
 * historical, gated; `canPublishProjections` stays false.
 */

export interface QbPressureRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly games: number;
  readonly pressurePct: number; // 0..1 mean share of dropbacks pressured
  readonly badThrowPct: number; // 0..1
  readonly sacks: number;
  readonly blitzesFaced: number;
}

export interface CoverageRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly games: number;
  readonly targets: number;
  readonly completionsAllowed: number;
  readonly completionPct: number; // 0..1
  readonly yardsPerTarget: number;
  readonly passerRatingAllowed: number; // 0..158.3, target-weighted
  readonly missedTacklePct: number; // 0..1 mean
}

export interface NflversePressureCoverage {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  readonly sourceRows: number;
  readonly qbPressure: readonly QbPressureRow[];
  readonly coverage: readonly CoverageRow[];
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrls: Record<"pass" | "def", string>;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MIN_QB_GAMES = 4;
const MIN_COVERAGE_TARGETS = 25;
const TOP_N = 30;

let cache: { readonly expiresAt: number; readonly value: NflversePressureCoverage } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}
function finite(value: string | undefined): number | null {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}
function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}
function round(value: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

async function fetchVariant(
  variant: "pass" | "def",
  season: number,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<{ url: string; records: readonly CsvRecord[] }> {
  const url = nflverseUrl("pfr_advstats", season, variant);
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
  return { url, records: parseCsv(await response.text()).records };
}

function buildQbPressure(records: readonly CsvRecord[]): QbPressureRow[] {
  const byPlayer = new Map<string, { name: string; team: string; press: number[]; bad: number[]; sacks: number; blitz: number }>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const id = row["pfr_player_id"];
    if (!id) continue;
    const agg = byPlayer.get(id) ?? { name: row["pfr_player_name"] ?? "UNKNOWN", team: row["team"] ?? "", press: [], bad: [], sacks: 0, blitz: 0 };
    const p = finite(row["times_pressured_pct"]);
    const b = finite(row["passing_bad_throw_pct"]);
    if (p !== null) agg.press.push(p);
    if (b !== null) agg.bad.push(b);
    agg.sacks += toNumber(row["times_sacked"]);
    agg.blitz += toNumber(row["times_blitzed"]);
    agg.team = row["team"] || agg.team;
    byPlayer.set(id, agg);
  }
  const rows: QbPressureRow[] = [];
  for (const [id, a] of byPlayer) {
    const games = a.press.length;
    if (games < MIN_QB_GAMES) continue;
    rows.push({
      playerId: id,
      name: a.name,
      team: a.team,
      games,
      pressurePct: round(mean(a.press)),
      badThrowPct: round(mean(a.bad)),
      sacks: a.sacks,
      blitzesFaced: a.blitz,
    });
  }
  return rows.sort((x, y) => y.pressurePct - x.pressurePct).slice(0, TOP_N);
}

function buildCoverage(records: readonly CsvRecord[]): CoverageRow[] {
  const byPlayer = new Map<string, { name: string; team: string; games: number; tgt: number; comp: number; yards: number; prWeighted: number; mt: number[] }>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const id = row["pfr_player_id"];
    if (!id) continue;
    const tgt = toNumber(row["def_targets"]);
    const agg = byPlayer.get(id) ?? { name: row["pfr_player_name"] ?? "UNKNOWN", team: row["team"] ?? "", games: 0, tgt: 0, comp: 0, yards: 0, prWeighted: 0, mt: [] };
    agg.games += 1;
    agg.tgt += tgt;
    agg.comp += toNumber(row["def_completions_allowed"]);
    agg.yards += toNumber(row["def_yards_allowed"]);
    agg.prWeighted += toNumber(row["def_passer_rating_allowed"]) * tgt;
    const m = finite(row["def_missed_tackle_pct"]);
    if (m !== null) agg.mt.push(m);
    agg.team = row["team"] || agg.team;
    byPlayer.set(id, agg);
  }
  const rows: CoverageRow[] = [];
  for (const [id, a] of byPlayer) {
    if (a.tgt < MIN_COVERAGE_TARGETS) continue;
    rows.push({
      playerId: id,
      name: a.name,
      team: a.team,
      games: a.games,
      targets: a.tgt,
      completionsAllowed: a.comp,
      completionPct: round(a.tgt > 0 ? a.comp / a.tgt : 0),
      yardsPerTarget: round(a.tgt > 0 ? a.yards / a.tgt : 0, 2),
      passerRatingAllowed: round(a.tgt > 0 ? a.prWeighted / a.tgt : 0, 1),
      missedTacklePct: round(mean(a.mt)),
    });
  }
  // Lockdown first (lowest passer rating allowed).
  return rows.sort((x, y) => x.passerRatingAllowed - y.passerRatingAllowed).slice(0, TOP_N);
}

export function resetPressureCoverageCacheForTests(): void {
  cache = null;
}

export async function loadNflversePressureCoverage({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflversePressureCoverage> {
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && cache && cache.expiresAt > now) return cache.value;

  const candidates = [season, season - 1];
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const [pass, def] = await Promise.all([
        fetchVariant("pass", candidate, fetcher, timeoutMs),
        fetchVariant("def", candidate, fetcher, timeoutMs),
      ]);
      const passReg = pass.records.filter((r) => r["game_type"] === "REG");
      if (passReg.length === 0) throw new Error("no REG pass rows");
      const value: NflversePressureCoverage = {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        seasonType: "REG",
        sourceRows: pass.records.length + def.records.length,
        qbPressure: buildQbPressure(pass.records),
        coverage: buildCoverage(def.records),
        canPublishProjections: false,
        blockReason:
          "PFR advanced charting (pressure faced, bad-throw rate, coverage allowed) is real historical fact from nflverse. It is context, not a projection or a betting pick.",
        sourceUrls: { pass: pass.url, def: def.url },
        error: null,
      };
      if (cacheTtlMs > 0 && fetcher === fetch) cache = { expiresAt: now + cacheTtlMs, value };
      return value;
    } catch (error) {
      lastError = error;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season,
    seasonType: "REG",
    sourceRows: 0,
    qbPressure: [],
    coverage: [],
    canPublishProjections: false,
    blockReason:
      "PFR advanced charting could not load from nflverse. The product shows an empty state instead of fabricated charting.",
    sourceUrls: { pass: nflverseUrl("pfr_advstats", season, "pass"), def: nflverseUrl("pfr_advstats", season, "def") },
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
