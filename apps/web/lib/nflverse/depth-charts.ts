import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

/**
 * NFL depth charts — weekly role/order per player, read-only from the openly
 * licensed nflverse `depth_charts` release (CC-BY-4.0). Who is the starter and
 * who is the next man up at each position is the structural context behind every
 * injury cascade: when a starter is OUT, the depth chart names the beneficiary.
 *
 * nflverse changed this source after the 2024 season, so we parse BOTH schemas
 * defensively:
 *   • legacy (≤2024): full_name / season / week / club_code|team / position /
 *     depth_team (1 = starter) / game_type|season_type.
 *   • new (2025+): player_name / team / pos_abb|pos_name / pos_rank (1 = starter).
 * Any missing column simply drops the row — we never invent an order or a name.
 * These are reported roster facts, not our prediction of who will play.
 */

export interface DepthChartRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  /** Order on the chart for this team+position; 1 = starter. */
  readonly depthOrder: number;
  readonly week: number | null;
}

export interface NflverseDepthCharts {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly week: number | null;
  readonly sourceRows: number;
  readonly rows: readonly DepthChartRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

let depthChartsCache: { readonly expiresAt: number; readonly value: NflverseDepthCharts } | null = null;

function finite(value: string | undefined): number | null {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && value !== undefined && value !== "" ? parsed : null;
}

/** First non-empty value among the candidate columns; "" if none present. */
function pick(r: CsvRecord, keys: readonly string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v.trim() !== "") return v.trim();
  }
  return "";
}

/** Parse a depth-charts CSV (legacy or 2025+ schema) into normalized rows. Pure. */
export function buildDepthCharts(records: readonly CsvRecord[]): { rows: DepthChartRow[]; week: number | null } {
  // Regular-season only where a season-type column exists; otherwise keep all.
  const seasonTyped = records.filter((r) => {
    const st = pick(r, ["game_type", "season_type"]);
    return st === "" || st === "REG";
  });

  const weeks = seasonTyped.map((r) => finite(r["week"])).filter((w): w is number => w != null);
  const latestWeek = weeks.length ? weeks.reduce((m, w) => Math.max(m, w), 0) : null;

  // When a week column is present, keep only the most recent week (current roles).
  const scoped = latestWeek == null ? seasonTyped : seasonTyped.filter((r) => finite(r["week"]) === latestWeek);

  const rows: DepthChartRow[] = [];
  for (const r of scoped) {
    const playerName = pick(r, ["full_name", "player_name", "football_name", "player"]);
    const position = pick(r, ["position", "depth_position", "pos_abb", "pos_name"]).toUpperCase();
    const team = pick(r, ["club_code", "team", "recent_team"]).toUpperCase();
    // depth_team (legacy) and pos_rank (2025+) both encode order, 1 = starter.
    const depthOrder = finite(r["depth_team"]) ?? finite(r["pos_rank"]) ?? finite(r["pos_slot"]);
    if (!playerName || !position || !team || depthOrder == null) continue; // never invent a role
    rows.push({
      playerId: pick(r, ["gsis_id", "player_id", "elias_id", "espn_id"]),
      playerName,
      team,
      position,
      depthOrder,
      week: finite(r["week"]),
    });
  }
  return { rows, week: latestWeek };
}

export function resetDepthChartsCacheForTests(): void {
  depthChartsCache = null;
}

export async function loadNflverseDepthCharts({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseDepthCharts> {
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && depthChartsCache && depthChartsCache.expiresAt > now) {
    return depthChartsCache.value;
  }

  // depth_charts are per-season files; fall back one year if the season isn't published yet.
  const candidates = [season, season - 1];
  let lastError: unknown = null;

  for (const candidate of candidates) {
    const url = nflverseUrl("depth_charts", candidate);
    try {
      const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
      const { records } = parseCsv(await response.text());
      if (records.length === 0) throw new Error("empty depth_charts file");

      const { rows, week } = buildDepthCharts(records);
      if (rows.length === 0) throw new Error("no usable depth-chart rows");

      const value: NflverseDepthCharts = {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        week,
        sourceRows: records.length,
        rows,
        canPublishProjections: false,
        note: "Weekly depth-chart order per player (1 = starter) from the latest week in the source file. Reported roster facts, not a prediction of who will play.",
        sourceUrl: url,
        error: null,
      };
      if (cacheTtlMs > 0 && fetcher === fetch) depthChartsCache = { expiresAt: now + cacheTtlMs, value };
      return value;
    } catch (error) {
      lastError = error;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season,
    week: null,
    sourceRows: 0,
    rows: [],
    canPublishProjections: false,
    note: "The depth charts could not load from nflverse. The product shows an empty state instead of a fabricated chart.",
    sourceUrl: nflverseUrl("depth_charts", season),
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
