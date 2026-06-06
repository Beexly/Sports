import { gunzipSync } from "node:zlib";
import { assertIngestible, fetchWithFailover, NFLVERSE_BASE, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

/**
 * Edge Signals — a buy-low / sell-high board that FUSES two real nflverse
 * datasets nobody else cross-publishes transparently:
 *  - Next Gen Stats (tracking): how open a receiver gets (separation), how many
 *    yards he earns after the catch over expected (YAC+/-), and his share of the
 *    team's intended air yards — the "underlying" signal.
 *  - player_stats (box score): actual PPR production — the "output".
 *
 * When the underlying signal runs hot but production lags, that's a regression-
 * to-mean BUY-LOW candidate; when output outruns the underlying, it's a SELL-HIGH
 * / regression-risk flag. This is a research lens on settled, historical data —
 * explicitly NOT a projection or a betting pick. canPublishPicks stays false.
 */

export type EdgeLabel = "buy-low" | "sell-high" | "aligned";

export interface EdgeSignalRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly games: number;
  readonly pprPerGame: number;
  readonly targetShare: number | null;
  readonly avgSeparation: number;
  readonly yacAboveExpectation: number;
  readonly shareIntendedAirYards: number;
  /** z-score of the underlying tracking signal across the qualified pool. */
  readonly underlyingZ: number;
  /** z-score of actual production across the qualified pool. */
  readonly productionZ: number;
  /** underlyingZ - productionZ. Positive = doing more than the box score shows. */
  readonly gap: number;
  readonly label: EdgeLabel;
}

export interface NflverseEdgeSignals {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  readonly qualifiedPlayers: number;
  readonly buyLow: readonly EdgeSignalRow[];
  readonly sellHigh: readonly EdgeSignalRow[];
  readonly canPublishPicks: false;
  readonly blockReason: string;
  readonly sourceUrls: Record<"playerStats" | "ngsReceiving", string>;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MIN_TARGETS = 40;
const MIN_GAMES = 4;
const GAP_THRESHOLD = 0.75;
const TOP_N = 20;

let edgeCache: { readonly expiresAt: number; readonly value: NflverseEdgeSignals } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdev(values: readonly number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

async function fetchGz(url: string, fetcher: FetchLike, timeoutMs: number): Promise<readonly CsvRecord[]> {
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs, init: { cache: "no-store" } });
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = url.endsWith(".gz") ? gunzipSync(buffer).toString("utf8") : buffer.toString("utf8");
  return parseCsv(text).records;
}

function ngsReceivingUrl(): string {
  return `${NFLVERSE_BASE}/nextgen_stats/ngs_receiving.csv.gz`;
}

function resolveSeason(records: readonly CsvRecord[], requested: number, predicate: (r: CsvRecord) => boolean): number {
  const seasons = Array.from(
    new Set(records.filter(predicate).map((r) => toNumber(r["season"])).filter((s) => s > 0)),
  ).sort((a, b) => a - b);
  const atOrBefore = seasons.filter((s) => s <= requested);
  return atOrBefore.at(-1) ?? seasons.at(-1) ?? requested;
}

interface ProductionAgg {
  playerName: string;
  team: string;
  position: string;
  games: number;
  ppr: number;
  targetShares: number[];
}

export function resetEdgeSignalsCacheForTests(): void {
  edgeCache = null;
}

export async function loadNflverseEdgeSignals({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseEdgeSignals> {
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && edgeCache && edgeCache.expiresAt > now) {
    return edgeCache.value;
  }

  const playerStatsUrl = nflverseUrl("player_stats_week", season);
  const ngsUrl = ngsReceivingUrl();

  try {
    const [statRecords, ngsRecords] = await Promise.all([
      fetchGz(playerStatsUrl, fetcher, timeoutMs),
      fetchGz(ngsUrl, fetcher, timeoutMs),
    ]);

    const activeSeason = resolveSeason(
      statRecords,
      season,
      (r) => r["season_type"] === "REG" && (r["position"] === "WR" || r["position"] === "TE"),
    );

    // Aggregate box-score production per receiver for the active season.
    const production = new Map<string, ProductionAgg>();
    for (const row of statRecords) {
      if (row["season_type"] !== "REG" || toNumber(row["season"]) !== activeSeason) continue;
      const position = row["position"];
      if (position !== "WR" && position !== "TE") continue;
      const id = row["player_id"];
      if (!id) continue;
      const agg = production.get(id) ?? {
        playerName: row["player_display_name"] || row["player_name"] || "UNKNOWN",
        team: row["recent_team"] ?? "",
        position,
        games: 0,
        ppr: 0,
        targetShares: [],
      };
      agg.games += 1;
      agg.ppr += toNumber(row["fantasy_points_ppr"]);
      const ts = Number(row["target_share"]);
      if (Number.isFinite(ts)) agg.targetShares.push(ts);
      agg.playerName = row["player_display_name"] || agg.playerName;
      agg.team = row["recent_team"] || agg.team;
      production.set(id, agg);
    }

    // NGS season-aggregate (week 0) tracking signal per receiver.
    const ngs = new Map<string, { separation: number; yacOverExp: number; airShare: number; targets: number }>();
    for (const row of ngsRecords) {
      if (row["season_type"] !== "REG" || toNumber(row["week"]) !== 0 || toNumber(row["season"]) !== activeSeason) {
        continue;
      }
      const id = row["player_gsis_id"];
      if (!id) continue;
      ngs.set(id, {
        separation: toNumber(row["avg_separation"]),
        yacOverExp: toNumber(row["avg_yac_above_expectation"]),
        airShare: toNumber(row["percent_share_of_intended_air_yards"]) / 100,
        targets: toNumber(row["targets"]),
      });
    }

    // Join + qualify.
    interface Joined {
      id: string;
      agg: ProductionAgg;
      sep: number;
      yac: number;
      airShare: number;
      pprPerGame: number;
      targetShare: number | null;
    }
    const joined: Joined[] = [];
    for (const [id, agg] of production) {
      const tracking = ngs.get(id);
      if (!tracking) continue;
      if (agg.games < MIN_GAMES || tracking.targets < MIN_TARGETS) continue;
      joined.push({
        id,
        agg,
        sep: tracking.separation,
        yac: tracking.yacOverExp,
        airShare: tracking.airShare,
        pprPerGame: agg.ppr / agg.games,
        targetShare: agg.targetShares.length > 0 ? mean(agg.targetShares) : null,
      });
    }

    // Standardize the underlying signal (separation + YAC over expected + air share)
    // and production (PPR/game) across the qualified pool.
    const sepVals = joined.map((j) => j.sep);
    const yacVals = joined.map((j) => j.yac);
    const airVals = joined.map((j) => j.airShare);
    const pprVals = joined.map((j) => j.pprPerGame);
    const sepM = mean(sepVals), sepS = stdev(sepVals, sepM);
    const yacM = mean(yacVals), yacS = stdev(yacVals, yacM);
    const airM = mean(airVals), airS = stdev(airVals, airM);
    const pprM = mean(pprVals), pprS = stdev(pprVals, pprM);
    const z = (v: number, m: number, s: number) => (s > 0 ? (v - m) / s : 0);

    const rows: EdgeSignalRow[] = joined.map((j): EdgeSignalRow => {
      const underlyingZ = (z(j.sep, sepM, sepS) + z(j.yac, yacM, yacS) + z(j.airShare, airM, airS)) / 3;
      const productionZ = z(j.pprPerGame, pprM, pprS);
      const gap = underlyingZ - productionZ;
      const label: EdgeLabel = gap >= GAP_THRESHOLD ? "buy-low" : gap <= -GAP_THRESHOLD ? "sell-high" : "aligned";
      return {
        playerId: j.id,
        playerName: j.agg.playerName,
        team: j.agg.team,
        position: j.agg.position,
        games: j.agg.games,
        pprPerGame: round(j.pprPerGame, 1),
        targetShare: j.targetShare === null ? null : round(j.targetShare, 3),
        avgSeparation: round(j.sep),
        yacAboveExpectation: round(j.yac),
        shareIntendedAirYards: round(j.airShare, 3),
        underlyingZ: round(underlyingZ),
        productionZ: round(productionZ),
        gap: round(gap),
        label,
      };
    });

    const buyLow = rows.filter((r) => r.label === "buy-low").sort((a, b) => b.gap - a.gap).slice(0, TOP_N);
    const sellHigh = rows.filter((r) => r.label === "sell-high").sort((a, b) => a.gap - b.gap).slice(0, TOP_N);

    const value: NflverseEdgeSignals = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      seasonType: "REG",
      qualifiedPlayers: joined.length,
      buyLow,
      sellHigh,
      canPublishPicks: false,
      blockReason:
        "Edge Signals fuse real NGS tracking data with real production to flag regression-to-mean candidates. This is a research lens on settled, historical data — not a projection, betting pick, or significant trend.",
      sourceUrls: { playerStats: playerStatsUrl, ngsReceiving: ngsUrl },
      error: null,
    };
    if (cacheTtlMs > 0 && fetcher === fetch) edgeCache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season,
      seasonType: "REG",
      qualifiedPlayers: 0,
      buyLow: [],
      sellHigh: [],
      canPublishPicks: false,
      blockReason:
        "Edge Signals could not load source rows. The product shows an empty state instead of fabricated signals.",
      sourceUrls: { playerStats: playerStatsUrl, ngsReceiving: ngsUrl },
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
