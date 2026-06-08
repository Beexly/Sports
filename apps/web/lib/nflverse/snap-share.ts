import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

/**
 * Snap share — the cleanest workload signal there is: the share of his team's
 * snaps a player is on the field for. Opportunity leads box-score production, so
 * rising snap share is an early tell. Read-only from the nflverse `snap_counts`
 * release (CC-BY-4.0). Historical fact, not a projection.
 *
 * The `snap_counts` asset carries three real per-game snap pairs — offense
 * (`offense_snaps`/`offense_pct`), defense (`defense_snaps`/`defense_pct`), and
 * special teams (`st_snaps`/`st_pct`). Historically GSE surfaced only the offense
 * side (skill positions). This loader now also exposes the defensive snap share
 * (grouped DL / LB / CB / S) and the special-teams snap share that were already
 * fetched in the same file but discarded. Every field is projected from a column
 * that ACTUALLY EXISTS in the asset — nothing is fabricated. A `positionGroup`
 * dimension lets a client render an offense, a defense, or an ST table.
 */

export type SkillPosition = "RB" | "WR" | "TE";

/** Defensive snap-share buckets, mapped from the real PFR `position` codes. */
export type DefensePositionGroup = "DL" | "LB" | "CB" | "S";

/** Offensive-line snap-share buckets (Tackle / Guard / Center), mapped from the
 *  real PFR `position` codes including the side variants (LT/RT, LG/RG). */
export type OlPositionGroup = "T" | "G" | "C";

/** The phase of play a snap-share row describes. */
export type PositionGroup = "offense" | "defense" | "specialTeams";

export interface SnapShareRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: SkillPosition;
  /** Phase of play this row measures — always "offense" for skill leaders. */
  readonly positionGroup: "offense";
  readonly games: number;
  readonly snapSharePct: number; // 0..1 average offensive snap share
  readonly snapsPerGame: number;
  readonly totalOffenseSnaps: number;
}

export interface DefenseSnapShareRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  /** The raw PFR position code from the asset (e.g. DE, NT, ILB, CB, FS). */
  readonly position: string;
  /** Bucketed defensive group for table grouping (DL / LB / CB / S). */
  readonly group: DefensePositionGroup;
  readonly positionGroup: "defense";
  readonly games: number;
  readonly snapSharePct: number; // 0..1 average defensive snap share
  readonly snapsPerGame: number;
  readonly totalDefenseSnaps: number;
}

export interface SpecialTeamsSnapShareRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  /** The raw PFR position code from the asset. */
  readonly position: string;
  readonly positionGroup: "specialTeams";
  readonly games: number;
  readonly snapSharePct: number; // 0..1 average special-teams snap share
  readonly snapsPerGame: number;
  readonly totalStSnaps: number;
}

export interface OlSnapShareRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  /** The raw PFR position code from the asset (e.g. LT, RT, LG, RG, C, T, G). */
  readonly position: string;
  /** Bucketed OL group for table grouping (T / G / C). */
  readonly group: OlPositionGroup;
  /** OL snaps are OFFENSIVE snaps — this row measures the offense phase. */
  readonly positionGroup: "offense";
  readonly games: number;
  readonly snapSharePct: number; // 0..1 average offensive snap share
  readonly snapsPerGame: number;
  readonly totalOffenseSnaps: number;
}

export interface NflverseSnapShare {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  readonly sourceRows: number;
  /** Offensive skill snap-share leaders (unchanged — RB / WR / TE). */
  readonly leaders: Readonly<Record<SkillPosition, readonly SnapShareRow[]>>;
  /** Defensive snap-share leaders, grouped DL / LB / CB / S. */
  readonly defense: Readonly<Record<DefensePositionGroup, readonly DefenseSnapShareRow[]>>;
  /** Offensive-line snap-share leaders, grouped T / G / C (real OFFENSE snaps). */
  readonly offensiveLine: Readonly<Record<OlPositionGroup, readonly OlSnapShareRow[]>>;
  /** Special-teams snap-share leaders (gunners, returners, core ST). */
  readonly specialTeams: readonly SpecialTeamsSnapShareRow[];
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SKILL: readonly SkillPosition[] = ["RB", "WR", "TE"];
const DEFENSE_GROUPS: readonly DefensePositionGroup[] = ["DL", "LB", "CB", "S"];
const OL_GROUPS: readonly OlPositionGroup[] = ["T", "G", "C"];
const MIN_GAMES = 4;
const TOP_N = 40;

let snapCache: { readonly expiresAt: number; readonly value: NflverseSnapShare } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isSkill(value: string | undefined): value is SkillPosition {
  return value === "RB" || value === "WR" || value === "TE";
}

/**
 * Map a raw PFR `position` code to a defensive snap-share group. Returns null for
 * non-defensive codes (offense / specialist) so they are excluded honestly rather
 * than mis-bucketed. PFR snap_counts uses front-seven and secondary codes such as
 * DE / DT / NT / EDGE (line), LB / ILB / OLB / MLB (linebacker), CB / DB (corner),
 * and S / SS / FS (safety).
 */
function defenseGroup(value: string | undefined): DefensePositionGroup | null {
  const code = (value ?? "").toUpperCase();
  if (!code) return null;
  switch (code) {
    case "DE":
    case "DT":
    case "NT":
    case "DL":
    case "EDGE":
    case "DED":
    case "DRE":
    case "DLE":
    case "DRT":
    case "DLT":
      return "DL";
    case "LB":
    case "ILB":
    case "OLB":
    case "MLB":
    case "LILB":
    case "RILB":
    case "LOLB":
    case "ROLB":
    case "WLB":
    case "MIKE":
    case "SLB":
      return "LB";
    case "CB":
    case "DB":
    case "LCB":
    case "RCB":
    case "NB":
    case "NCB":
      return "CB";
    case "S":
    case "SS":
    case "FS":
    case "SAF":
      return "S";
    default:
      return null;
  }
}

/**
 * Map a raw PFR `position` code to an offensive-line snap-share group, collapsing
 * the side variants the asset uses (LT/RT → Tackle, LG/RG → Guard). Returns null
 * for non-OL codes so they are excluded honestly rather than mis-bucketed. OL
 * snaps are OFFENSE snaps in snap_counts, so these rows read the offense pair.
 * Exported so offensive-line.ts can reuse the exact same bucketing.
 */
export function olGroup(value: string | undefined): OlPositionGroup | null {
  const code = (value ?? "").toUpperCase();
  if (!code) return null;
  switch (code) {
    case "T":
    case "LT":
    case "RT":
    case "OT":
      return "T";
    case "G":
    case "LG":
    case "RG":
    case "OG":
      return "G";
    case "C":
      return "C";
    default:
      return null;
  }
}

async function fetchCsv(url: string, fetcher: FetchLike, timeoutMs: number): Promise<readonly CsvRecord[]> {
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs, init: { cache: "no-store" } });
  return parseCsv(await response.text()).records;
}

interface OffenseAgg {
  name: string;
  team: string;
  position: SkillPosition;
  shares: number[];
  snaps: number;
}

function buildLeaders(records: readonly CsvRecord[]): Record<SkillPosition, SnapShareRow[]> {
  const byPlayer = new Map<string, OffenseAgg>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const position = row["position"];
    if (!isSkill(position)) continue;
    const snaps = toNumber(row["offense_snaps"]);
    if (snaps <= 0) continue; // count only games the player actually played offense
    const id = row["pfr_player_id"] || row["player"] || "";
    if (!id) continue;
    const agg = byPlayer.get(id) ?? { name: row["player"] ?? "UNKNOWN", team: row["team"] ?? "", position, shares: [], snaps: 0 };
    agg.shares.push(toNumber(row["offense_pct"]));
    agg.snaps += snaps;
    agg.name = row["player"] || agg.name;
    agg.team = row["team"] || agg.team;
    byPlayer.set(id, agg);
  }

  const rows: SnapShareRow[] = [];
  for (const [id, agg] of byPlayer) {
    const games = agg.shares.length;
    if (games < MIN_GAMES) continue;
    const avgShare = agg.shares.reduce((s, v) => s + v, 0) / games;
    rows.push({
      playerId: id,
      playerName: agg.name,
      team: agg.team,
      position: agg.position,
      positionGroup: "offense",
      games,
      snapSharePct: round(avgShare),
      snapsPerGame: round(agg.snaps / games, 1),
      totalOffenseSnaps: agg.snaps,
    });
  }

  const result: Record<SkillPosition, SnapShareRow[]> = { RB: [], WR: [], TE: [] };
  for (const position of SKILL) {
    result[position] = rows
      .filter((r) => r.position === position)
      .sort((a, b) => b.snapSharePct - a.snapSharePct || b.totalOffenseSnaps - a.totalOffenseSnaps)
      .slice(0, TOP_N);
  }
  return result;
}

interface DefenseAgg {
  name: string;
  team: string;
  position: string;
  group: DefensePositionGroup;
  shares: number[];
  snaps: number;
}

function buildDefense(records: readonly CsvRecord[]): Record<DefensePositionGroup, DefenseSnapShareRow[]> {
  const byPlayer = new Map<string, DefenseAgg>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const group = defenseGroup(row["position"]);
    if (!group) continue;
    const snaps = toNumber(row["defense_snaps"]);
    if (snaps <= 0) continue; // only games the player actually played defense
    const id = row["pfr_player_id"] || row["player"] || "";
    if (!id) continue;
    const agg =
      byPlayer.get(id) ??
      { name: row["player"] ?? "UNKNOWN", team: row["team"] ?? "", position: row["position"] ?? "", group, shares: [], snaps: 0 };
    agg.shares.push(toNumber(row["defense_pct"]));
    agg.snaps += snaps;
    agg.name = row["player"] || agg.name;
    agg.team = row["team"] || agg.team;
    agg.position = row["position"] || agg.position;
    byPlayer.set(id, agg);
  }

  const rows: DefenseSnapShareRow[] = [];
  for (const [id, agg] of byPlayer) {
    const games = agg.shares.length;
    if (games < MIN_GAMES) continue;
    const avgShare = agg.shares.reduce((s, v) => s + v, 0) / games;
    rows.push({
      playerId: id,
      playerName: agg.name,
      team: agg.team,
      position: agg.position,
      group: agg.group,
      positionGroup: "defense",
      games,
      snapSharePct: round(avgShare),
      snapsPerGame: round(agg.snaps / games, 1),
      totalDefenseSnaps: agg.snaps,
    });
  }

  const result: Record<DefensePositionGroup, DefenseSnapShareRow[]> = { DL: [], LB: [], CB: [], S: [] };
  for (const group of DEFENSE_GROUPS) {
    result[group] = rows
      .filter((r) => r.group === group)
      .sort((a, b) => b.snapSharePct - a.snapSharePct || b.totalDefenseSnaps - a.totalDefenseSnaps)
      .slice(0, TOP_N);
  }
  return result;
}

interface StAgg {
  name: string;
  team: string;
  position: string;
  shares: number[];
  snaps: number;
}

function buildSpecialTeams(records: readonly CsvRecord[]): SpecialTeamsSnapShareRow[] {
  const byPlayer = new Map<string, StAgg>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const snaps = toNumber(row["st_snaps"]);
    if (snaps <= 0) continue; // only games the player actually played special teams
    const id = row["pfr_player_id"] || row["player"] || "";
    if (!id) continue;
    const agg =
      byPlayer.get(id) ??
      { name: row["player"] ?? "UNKNOWN", team: row["team"] ?? "", position: row["position"] ?? "", shares: [], snaps: 0 };
    agg.shares.push(toNumber(row["st_pct"]));
    agg.snaps += snaps;
    agg.name = row["player"] || agg.name;
    agg.team = row["team"] || agg.team;
    agg.position = row["position"] || agg.position;
    byPlayer.set(id, agg);
  }

  const rows: SpecialTeamsSnapShareRow[] = [];
  for (const [id, agg] of byPlayer) {
    const games = agg.shares.length;
    if (games < MIN_GAMES) continue;
    const avgShare = agg.shares.reduce((s, v) => s + v, 0) / games;
    rows.push({
      playerId: id,
      playerName: agg.name,
      team: agg.team,
      position: agg.position,
      positionGroup: "specialTeams",
      games,
      snapSharePct: round(avgShare),
      snapsPerGame: round(agg.snaps / games, 1),
      totalStSnaps: agg.snaps,
    });
  }

  return rows
    .sort((a, b) => b.snapSharePct - a.snapSharePct || b.totalStSnaps - a.totalStSnaps)
    .slice(0, TOP_N);
}

interface OlAgg {
  name: string;
  team: string;
  position: string;
  group: OlPositionGroup;
  shares: number[];
  snaps: number;
}

/**
 * Offensive-line snap-share leaders, grouped T / G / C. OL workload is OFFENSE
 * snaps in the snap_counts asset, so this reads the exact same `offense_snaps` /
 * `offense_pct` pair the skill builder uses — only the position filter differs
 * (OL codes via `olGroup` instead of skill codes). Real columns only; nothing is
 * fabricated. A near-100% snap share is the honest, settled "iron-man" tell for a
 * starting lineman.
 */
function buildOffensiveLine(records: readonly CsvRecord[]): Record<OlPositionGroup, OlSnapShareRow[]> {
  const byPlayer = new Map<string, OlAgg>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const group = olGroup(row["position"]);
    if (!group) continue;
    const snaps = toNumber(row["offense_snaps"]);
    if (snaps <= 0) continue; // only games the lineman actually played offense
    const id = row["pfr_player_id"] || row["player"] || "";
    if (!id) continue;
    const agg =
      byPlayer.get(id) ??
      { name: row["player"] ?? "UNKNOWN", team: row["team"] ?? "", position: row["position"] ?? "", group, shares: [], snaps: 0 };
    agg.shares.push(toNumber(row["offense_pct"]));
    agg.snaps += snaps;
    agg.name = row["player"] || agg.name;
    agg.team = row["team"] || agg.team;
    agg.position = row["position"] || agg.position;
    byPlayer.set(id, agg);
  }

  const rows: OlSnapShareRow[] = [];
  for (const [id, agg] of byPlayer) {
    const games = agg.shares.length;
    if (games < MIN_GAMES) continue;
    const avgShare = agg.shares.reduce((s, v) => s + v, 0) / games;
    rows.push({
      playerId: id,
      playerName: agg.name,
      team: agg.team,
      position: agg.position,
      group: agg.group,
      positionGroup: "offense",
      games,
      snapSharePct: round(avgShare),
      snapsPerGame: round(agg.snaps / games, 1),
      totalOffenseSnaps: agg.snaps,
    });
  }

  const result: Record<OlPositionGroup, OlSnapShareRow[]> = { T: [], G: [], C: [] };
  for (const group of OL_GROUPS) {
    result[group] = rows
      .filter((r) => r.group === group)
      .sort((a, b) => b.snapSharePct - a.snapSharePct || b.totalOffenseSnaps - a.totalOffenseSnaps)
      .slice(0, TOP_N);
  }
  return result;
}

export function resetSnapShareCacheForTests(): void {
  snapCache = null;
}

export async function loadNflverseSnapShare({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseSnapShare> {
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && snapCache && snapCache.expiresAt > now) {
    return snapCache.value;
  }

  const emptyLeaders = { RB: [], WR: [], TE: [] } as const;
  const emptyDefense = { DL: [], LB: [], CB: [], S: [] } as const;
  const emptyOl = { T: [], G: [], C: [] } as const;
  const candidates = [season, season - 1];
  let lastError: unknown = null;

  for (const candidate of candidates) {
    const url = nflverseUrl("snap_counts", candidate);
    try {
      const records = await fetchCsv(url, fetcher, timeoutMs);
      const regRows = records.filter((row) => row["game_type"] === "REG");
      if (regRows.length === 0) throw new Error("no REG snap rows");
      const value: NflverseSnapShare = {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        seasonType: "REG",
        sourceRows: records.length,
        leaders: buildLeaders(records),
        defense: buildDefense(records),
        offensiveLine: buildOffensiveLine(records),
        specialTeams: buildSpecialTeams(records),
        canPublishProjections: false,
        blockReason:
          "Snap share is real, settled workload from nflverse — the share of team snaps (offense, defense, or special teams) a player was on the field for. It is historical opportunity, not a projection or a betting pick.",
        sourceUrl: url,
        error: null,
      };
      if (cacheTtlMs > 0 && fetcher === fetch) snapCache = { expiresAt: now + cacheTtlMs, value };
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
    leaders: emptyLeaders,
    defense: emptyDefense,
    offensiveLine: emptyOl,
    specialTeams: [],
    canPublishProjections: false,
    blockReason:
      "Snap counts could not load from nflverse. The product shows an empty state instead of fabricated workload.",
    sourceUrl: nflverseUrl("snap_counts", season),
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
