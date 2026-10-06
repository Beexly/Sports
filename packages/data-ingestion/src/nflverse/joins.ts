/**
 * Pure joiners for the nflverse grains. No network, no filesystem, no clock.
 *
 * The rules this file exists to enforce:
 *   - A blank join key is a refusal, never a fill.
 *   - An ambiguous key keeps BOTH rows and says so. It never picks one.
 *   - A row that does not join is reported unmatched. It is never dropped, and
 *     it is never given a synthetic `gsis_id` to make it look joined.
 *   - `null` in, `null` out. An absent personnel list is not an empty roster.
 *
 * Nothing here produces a LIVE part. This is lineage, not an edge.
 */

import type { ContractRow, ParticipationRow, RosterRow, SnapRow } from "./rows.js";

export interface RosterEntry {
  readonly row: RosterRow;
  /**
   * True when more than one row shares this key. Ambiguity is a fact about the
   * data; it is reported, not resolved.
   */
  readonly ambiguous: boolean;
}

export interface RosterIndex {
  /** `${season}|${gsis_id}` — the personnel lookup, season-qualified. */
  readonly byGsis: ReadonlyMap<string, readonly RosterEntry[]>;
  /** `${season}|${pfr_id}` — the snap lookup, season-qualified. */
  readonly byPfr: ReadonlyMap<string, readonly RosterEntry[]>;
  /**
   * `gsis_id` across every season — the contract lookup. A contract has no
   * season field, so joining it on the qualified key would be a silent miss.
   * Precomputed rather than scanned: a linear scan per lookup turns a full
   * participation pass into billions of operations.
   */
  readonly byGsisAll: ReadonlyMap<string, readonly RosterEntry[]>;
  readonly gsisKeys: number;
  readonly pfrKeys: number;
  readonly ambiguousGsisKeys: number;
  readonly ambiguousPfrKeys: number;
  /** Roster rows whose `pfr_id` is null, so they can never be a snap target. */
  readonly noPfrId: number;
}

export function rosterKey(season: number | null, id: string): string {
  return `${season ?? "null"}|${id}`;
}

/**
 * Index roster rows by season + gsis_id and by season + pfr_id.
 *
 * Weekly and season rows both land in the index and stay distinguishable through
 * `roster_level`. They are NOT deduplicated against each other: a player having a
 * season row and a weekly row is normal, not a collision. A collision is two
 * rows at the SAME level under the same key, and that key is marked ambiguous
 * with both rows kept.
 */
export function indexRosters(rows: readonly RosterRow[]): RosterIndex {
  // Pass 1: bucket raw rows. A season row and a weekly row under one key is the
  // normal shape, not a collision; a collision is two rows at the SAME level.
  const gsisGroups = new Map<string, RosterRow[]>();
  const pfrGroups = new Map<string, RosterRow[]>();
  const allGroups = new Map<string, RosterRow[]>();
  let noPfrId = 0;

  for (const row of rows) {
    const gk = rosterKey(row.season, row.gsis_id);
    const gl = gsisGroups.get(gk);
    if (gl) gl.push(row);
    else gsisGroups.set(gk, [row]);

    const ak = row.gsis_id;
    const al = allGroups.get(ak);
    if (al) al.push(row);
    else allGroups.set(ak, [row]);

    if (row.pfr_id === null) {
      noPfrId += 1;
      continue;
    }
    const pk = rosterKey(row.season, row.pfr_id);
    const pl = pfrGroups.get(pk);
    if (pl) pl.push(row);
    else pfrGroups.set(pk, [row]);
  }

  // Pass 2: stamp the ambiguity flag, then freeze. Nothing mutates afterwards.
  //
  // Ambiguity means "two rows that claim to be the same thing", NOT "several
  // rows exist". A player has one season row and one weekly row PER WEEK, so
  // 18 weekly rows under one (season, gsis) key is a time series, not a
  // conflict. Only rows that agree on level AND week genuinely collide.
  const build = (groups: Map<string, RosterRow[]>): Map<string, RosterEntry[]> => {
    const out = new Map<string, RosterEntry[]>();
    for (const [key, group] of groups) {
      const slots = new Map<string, number>();
      for (const row of group) {
        // The season belongs in the slot even though the season-qualified maps
        // already carry it: byGsisAll groups across seasons, and without this a
        // player's 2023 and 2024 season rows would look like one collided slot.
        const slot = `${row.season}|${row.roster_level}|${row.week ?? "null"}`;
        slots.set(slot, (slots.get(slot) ?? 0) + 1);
      }
      const conflicted = [...slots.values()].some((n) => n > 1);
      out.set(key, group.map((row) => ({ row, ambiguous: conflicted })));
    }
    return out;
  };

  const byGsis = build(gsisGroups);
  const byPfr = build(pfrGroups);
  const byGsisAll = build(allGroups);

  let ambiguousGsis = 0;
  for (const entries of byGsis.values()) if (entries.some((e) => e.ambiguous)) ambiguousGsis += 1;
  let ambiguousPfr = 0;
  for (const entries of byPfr.values()) if (entries.some((e) => e.ambiguous)) ambiguousPfr += 1;

  return {
    byGsis,
    byPfr,
    byGsisAll,
    gsisKeys: byGsis.size,
    pfrKeys: byPfr.size,
    ambiguousGsisKeys: ambiguousGsis,
    ambiguousPfrKeys: ambiguousPfr,
    noPfrId,
  };
}

export interface MatchedRoster {
  readonly gsis_id: string;
  readonly roster: readonly RosterEntry[];
  readonly ambiguous: boolean;
}

export interface PersonnelMatch {
  readonly matched: readonly MatchedRoster[];
  /** GSIS ids from the play that had no roster row. Never filled, never dropped. */
  readonly unmatched: readonly string[];
  /** GSIS ids whose key is ambiguous. Kept, flagged, not resolved. */
  readonly ambiguous: readonly string[];
}

/**
 * Resolve the players on a play against the roster index.
 *
 * `season` comes from the play's own game id, so the lookup is exact and O(1).
 * A player who changed teams mid-career has a different gsis id per team, but
 * the same id can appear in several seasons — qualifying on season is what
 * stops a 2018 roster from answering a 2025 play.
 *
 * `null` players stays `null`. An empty array is a real (and empty) answer and
 * is reported as empty, because collapsing the two would turn "we do not know"
 * into "nobody was on the field".
 */
export function personnelForPlay(
  playersOnField: readonly string[] | null,
  index: RosterIndex,
  season: number | null,
): PersonnelMatch | null {
  if (playersOnField === null) return null;

  const matched: MatchedRoster[] = [];
  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  for (const gsisId of playersOnField) {
    if (typeof gsisId !== "string" || gsisId.trim() === "") {
      // A blank id is a refusal, not a lookup.
      unmatched.push(gsisId);
      continue;
    }
    const entries = index.byGsis.get(rosterKey(season, gsisId));
    if (entries === undefined || entries.length === 0) {
      unmatched.push(gsisId);
      continue;
    }
    const isAmbiguous = entries.some((e) => e.ambiguous);
    matched.push({ gsis_id: gsisId, roster: entries, ambiguous: isAmbiguous });
    if (isAmbiguous) ambiguous.push(gsisId);
  }

  return { matched, unmatched, ambiguous };
}

/** `2024_01_TEN_CHI` -> 2024. Returns null for an unparseable game id. */
export function seasonOfGameId(gameId: string): number | null {
  const head = gameId.split("_", 1)[0];
  if (head !== undefined && head.length === 4 && /^\d{4}$/.test(head)) return Number(head);
  return null;
}

export interface SnapJoin {
  readonly matched: readonly { readonly snap: SnapRow; readonly roster: readonly RosterEntry[]; readonly ambiguous: boolean }[];
  readonly unmatched: readonly SnapRow[];
  readonly ambiguous: readonly SnapRow[];
  readonly unmatchedGsis: readonly string[];
}

/**
 * Join snaps to rosters on `pfr_player_id` = roster `pfr_id` AND season.
 *
 * A snap with no roster match is reported unmatched. It is never dropped and
 * never assigned a synthetic gsis_id.
 */
export function joinSnapsToRosters(
  snaps: readonly SnapRow[],
  index: RosterIndex,
): SnapJoin {
  const matched: { snap: SnapRow; roster: readonly RosterEntry[]; ambiguous: boolean }[] = [];
  const unmatched: SnapRow[] = [];
  const ambiguous: SnapRow[] = [];
  const unmatchedGsis: string[] = [];

  for (const snap of snaps) {
    const key = rosterKey(snap.season, snap.pfr_player_id);
    const entries = index.byPfr.get(key);
    if (entries === undefined || entries.length === 0) {
      unmatched.push(snap);
      continue;
    }
    const isAmbiguous = entries.some((e) => e.ambiguous);
    matched.push({ snap, roster: entries, ambiguous: isAmbiguous });
    if (isAmbiguous) ambiguous.push(snap);
  }

  return { matched, unmatched, ambiguous, unmatchedGsis };
}

export interface ContractMatch {
  readonly contract: ContractRow;
  readonly roster: readonly RosterEntry[];
  /**
   * How many seasons this gsis id appears in. A veteran appearing in eight
   * seasons is a normal career, so this is reported rather than called a
   * conflict. A contract carries no season to pin one of them.
   */
  readonly seasonsMatched: number;
  /** True only on a genuine same-level, same-week collision. */
  readonly ambiguous: boolean;
}

export interface ContractJoin {
  readonly matched: readonly ContractMatch[];
  readonly unmatched: readonly ContractRow[];
  readonly ambiguous: readonly ContractRow[];
}

/** Join contracts to the matched roster on `gsis_id`. Season is not a contract field. */
export function joinContractsToRosters(
  contracts: readonly ContractRow[],
  index: RosterIndex,
): ContractJoin {
  const matched: ContractMatch[] = [];
  const unmatched: ContractRow[] = [];
  const ambiguous: ContractRow[] = [];

  for (const contract of contracts) {
    const entries = index.byGsisAll.get(contract.gsis_id);
    if (entries === undefined || entries.length === 0) {
      unmatched.push(contract);
      continue;
    }
    const seasons = new Set(entries.map((e) => e.row.season));
    const isAmbiguous = entries.some((e) => e.ambiguous);
    matched.push({ contract, roster: entries, seasonsMatched: seasons.size, ambiguous: isAmbiguous });
    if (isAmbiguous) ambiguous.push(contract);
  }

  return { matched, unmatched, ambiguous };
}

export interface JoinCounts {
  readonly total: number;
  readonly matched: number;
  readonly unmatched: number;
  readonly ambiguous: number;
  /** null when nothing was walked. A zero denominator is not a zero match rate. */
  readonly matchRate: number | null;
}

/** Counts are measured from the rows actually walked. */
export function summarize(
  total: number,
  matched: number,
  unmatched: number,
  ambiguous: number,
): JoinCounts {
  return {
    total,
    matched,
    unmatched,
    ambiguous,
    matchRate: total === 0 ? null : matched / total,
  };
}
