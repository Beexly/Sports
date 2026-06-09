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
 *     depth_team (1 = starter) / game_type|season_type. Weekly grain — we scope to
 *     the latest REG week so the chart reflects current roles.
 *   • new (2025+, ESPN schema): player_name / team / pos_abb|pos_name / pos_slot /
 *     pos_rank. Per the nflverse `dictionary_depth_charts`, pos_slot is "a number
 *     assigned to each position in a formation" and pos_rank is the player's rank
 *     "grouped by pos_slot" — i.e. rank WITHIN a slot, not within a position. A
 *     single position (e.g. guard) spans multiple slots (LG, RG), so several
 *     players at one pos_name can each carry pos_rank===1. Treating any
 *     pos_rank===1 as "the starter" is therefore wrong. Instead we re-rank each
 *     team+position group by (pos_slot, pos_rank) into a dense 1-based depthOrder,
 *     so the single most-prominent player becomes the starter (depthOrder 1). The
 *     ESPN schema carries no season/week/game_type column, so this is a
 *     point-in-time snapshot of the latest published chart — there is no week to
 *     scope to and week-scoping is a no-op.
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

/** Shared, schema-agnostic identity/position fields for one depth-chart record. */
function normalizeRecord(r: CsvRecord): { playerId: string; playerName: string; team: string; position: string } | null {
  const playerName = pick(r, ["full_name", "player_name", "football_name", "player"]);
  const position = pick(r, ["position", "depth_position", "pos_abb", "pos_name"]).toUpperCase();
  const team = pick(r, ["club_code", "team", "recent_team"]).toUpperCase();
  if (!playerName || !position || !team) return null; // never invent a role
  return {
    playerId: pick(r, ["gsis_id", "player_id", "elias_id", "espn_id"]),
    playerName,
    team,
    position,
  };
}

/**
 * Parse a depth-charts CSV (legacy or 2025+ ESPN schema) into normalized rows.
 * Pure. Legacy rows (with a `depth_team` order) keep their per-week scoping and
 * their depth_team value as the starter order. 2025+ rows (no depth_team; instead
 * pos_slot + pos_rank, where pos_rank is rank WITHIN a slot) are re-ranked per
 * team+position by (pos_slot, pos_rank) so exactly one player becomes the starter.
 */
export function buildDepthCharts(records: readonly CsvRecord[]): { rows: DepthChartRow[]; week: number | null } {
  // Regular-season only where a season-type column exists; otherwise keep all.
  const seasonTyped = records.filter((r) => {
    const st = pick(r, ["game_type", "season_type"]);
    return st === "" || st === "REG";
  });

  // Legacy carries an explicit depth_team order; the 2025+ ESPN schema does not.
  const legacyRecords = seasonTyped.filter((r) => finite(r["depth_team"]) != null);
  const espnRecords = seasonTyped.filter((r) => finite(r["depth_team"]) == null);

  const weeks = legacyRecords.map((r) => finite(r["week"])).filter((w): w is number => w != null);
  const latestWeek = weeks.length ? weeks.reduce((m, w) => Math.max(m, w), 0) : null;

  const rows: DepthChartRow[] = [];

  // ── Legacy (≤2024) ── depth_team is the order; scope to the latest REG week. ──
  const legacyScoped =
    latestWeek == null ? legacyRecords : legacyRecords.filter((r) => finite(r["week"]) === latestWeek);
  for (const r of legacyScoped) {
    const base = normalizeRecord(r);
    const depthOrder = finite(r["depth_team"]);
    if (!base || depthOrder == null) continue; // never invent a role
    rows.push({ ...base, depthOrder, week: finite(r["week"]) });
  }

  // ── 2025+ (ESPN schema) ── pos_rank is rank WITHIN a pos_slot, so several
  // players at one position can each be pos_rank===1. Re-rank each team+position
  // group by (pos_slot, pos_rank) into a dense 1-based order; only the single
  // most-prominent player gets depthOrder 1 (the starter). No week column exists
  // in this schema, so it is a point-in-time snapshot — week stays null.
  interface EspnEntry {
    base: NonNullable<ReturnType<typeof normalizeRecord>>;
    posSlot: number;
    posRank: number;
  }
  const espnByKey = new Map<string, EspnEntry[]>();
  for (const r of espnRecords) {
    const base = normalizeRecord(r);
    // pos_rank is required to order; fall back to pos_slot when pos_rank is absent.
    const posRank = finite(r["pos_rank"]) ?? finite(r["pos_slot"]);
    if (!base || posRank == null) continue; // never invent a role
    const posSlot = finite(r["pos_slot"]) ?? posRank;
    const key = `${base.team}|${base.position}`;
    const list = espnByKey.get(key) ?? [];
    list.push({ base, posSlot, posRank });
    espnByKey.set(key, list);
  }
  for (const list of espnByKey.values()) {
    // Sort by slot first (most-prominent slot wins the starter spot), then rank.
    list.sort((a, b) => a.posSlot - b.posSlot || a.posRank - b.posRank);
    list.forEach((entry, index) => {
      rows.push({ ...entry.base, depthOrder: index + 1, week: null });
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
        note:
          week == null
            ? "Depth-chart order per player (1 = starter) — a point-in-time snapshot of the latest published chart (the 2025+ ESPN source carries no week). Reported roster facts, not a prediction of who will play."
            : "Weekly depth-chart order per player (1 = starter) from the latest week in the source file. Reported roster facts, not a prediction of who will play.",
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
