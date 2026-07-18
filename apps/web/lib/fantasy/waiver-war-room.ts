/**
 * Waiver War Room (Task #13) — pure composition of three already-live, cleared
 * data paths into two personalized, DESCRIPTIVE reads for a synced roster:
 *
 *   1. Bye-week collisions — real per-player bye weeks from the FFC ADP feed
 *      (adp-source.ts, approved_api, attribution required), grouped into the
 *      weeks where two or more rostered players sit out together. A calendar
 *      FACT view: zero recommendation language.
 *   2. Model-vs-market disagreements — where the live nflverse process-grade
 *      signal (player-model.ts) and the live Sleeper waiver momentum
 *      (loadSleeperTrending) point in OPPOSITE directions. The repo's
 *      "disagreement surfaced, not averaged" doctrine applied to real players:
 *      we describe what each side says, we never merge them into advice.
 *
 * Pure functions only — no I/O, no clock. Joins are ALWAYS normName+position
 * (adpJoinKey's own rule): a name alone is not identity, and a bye/market row
 * must never attach to a same-named player at another position. Bye <= 0 means
 * "no bye joined" (the pool's established convention), so such rows are
 * reported as unknown — never grouped as a fictional "Week 0" collision.
 */

import { adpJoinKey, type FfcAdpRow } from "./adp-source";
import type { PlayerProfile, ProcessSignal } from "../intelligence/player-model";
import type { TrendingRow } from "../integrations/sleeper";

export interface RosterPlayerRef {
  readonly name: string;
  readonly pos: string;
  readonly team: string;
}

export interface ByeCollisionWeek {
  readonly bye: number;
  /** The rostered players (2+) who all sit this week, in roster order. */
  readonly players: readonly RosterPlayerRef[];
}

export interface ByeCollisionReport {
  /** Weeks with >= 2 rostered players out, most crowded first. */
  readonly collisions: readonly ByeCollisionWeek[];
  /** Roster players with a real joined bye that collides with nobody. */
  readonly clear: readonly (RosterPlayerRef & { readonly bye: number })[];
  /** Roster players with no joinable bye (no ADP row, or bye <= 0) — reported, never guessed. */
  readonly unknown: readonly RosterPlayerRef[];
}

/**
 * Group a synced roster's REAL byes into collision weeks. Position-safe join
 * against the FFC rows; players without a real joined bye go to `unknown`.
 */
export function byeCollisions(roster: readonly RosterPlayerRef[], adpRows: readonly FfcAdpRow[]): ByeCollisionReport {
  const byKey = new Map<string, FfcAdpRow>();
  for (const row of adpRows) {
    const key = adpJoinKey(row.player, row.pos);
    if (!byKey.has(key)) byKey.set(key, row);
  }

  const byWeek = new Map<number, (RosterPlayerRef & { readonly bye: number })[]>();
  const unknown: RosterPlayerRef[] = [];
  for (const player of roster) {
    const row = byKey.get(adpJoinKey(player.name, player.pos));
    // bye <= 0 is "no bye joined" in this codebase — never a real week.
    if (!row || !(row.bye > 0)) {
      unknown.push(player);
      continue;
    }
    const entry = { ...player, bye: row.bye };
    const bucket = byWeek.get(row.bye);
    if (bucket) bucket.push(entry);
    else byWeek.set(row.bye, [entry]);
  }

  const collisions: ByeCollisionWeek[] = [];
  const clear: (RosterPlayerRef & { readonly bye: number })[] = [];
  for (const [bye, players] of byWeek) {
    if (players.length >= 2) collisions.push({ bye, players });
    else if (players[0]) clear.push(players[0]);
  }
  collisions.sort((a, b) => b.players.length - a.players.length || a.bye - b.bye);
  clear.sort((a, b) => a.bye - b.bye);
  return { collisions, clear, unknown };
}

export type MarketDirection = "adding" | "dropping";

export interface Disagreement {
  readonly name: string;
  readonly pos: string;
  readonly team: string;
  readonly onRoster: boolean;
  readonly modelSignal: ProcessSignal;
  readonly processGrade: number;
  readonly marketDirection: MarketDirection;
  /** Sleeper leagues adding/dropping this player over the lookback window. */
  readonly marketCount: number;
  /** Descriptive, two-sided read — never merged advice. */
  readonly description: string;
}

/**
 * Surface where the model signal and the market's waiver momentum point in
 * opposite directions. Exactly two disagreement classes exist:
 *   - model says buy-low  AND the market's DOMINANT direction is dropping;
 *   - model says sell-high AND the market's DOMINANT direction is adding.
 * A player can legitimately appear in BOTH Sleeper lists at once (added in
 * some leagues, dropped in others — churn), so direction is judged on the
 * larger side, never on mere presence in one list: a player added in 900
 * leagues and dropped in 5 is being ADDED, and reporting the 5 as "the
 * market is leaving" would be a dishonest presentation. Equal counts are
 * ambiguous and skipped. Agreement (model likes + market adding, etc.) is
 * corroboration and is NOT reported — same rule Worldline's conflict
 * detection follows. Join is normName+position; players absent from either
 * side simply don't appear.
 */
export function marketDisagreements(
  profiles: readonly PlayerProfile[],
  trending: { readonly adds: readonly TrendingRow[]; readonly drops: readonly TrendingRow[] },
  rosterNames: readonly string[],
  { limit = 12 }: { limit?: number } = {},
): Disagreement[] {
  const profileByKey = new Map<string, PlayerProfile>();
  for (const p of profiles) {
    const key = adpJoinKey(p.name, p.position);
    if (!profileByKey.has(key)) profileByKey.set(key, p);
  }
  const rostered = new Set(rosterNames.map((n) => n.toLowerCase().trim()));

  // Net market view per player: both sides collected before any judgment.
  const market = new Map<string, { addCount: number; dropCount: number }>();
  const tally = (rows: readonly TrendingRow[], side: "addCount" | "dropCount") => {
    for (const row of rows) {
      const key = adpJoinKey(row.name, row.position);
      const entry = market.get(key) ?? { addCount: 0, dropCount: 0 };
      entry[side] += row.count;
      market.set(key, entry);
    }
  };
  tally(trending.adds, "addCount");
  tally(trending.drops, "dropCount");

  const out: Disagreement[] = [];
  for (const [key, counts] of market) {
    const profile = profileByKey.get(key);
    if (!profile) continue;
    if (counts.addCount === counts.dropCount) continue; // ambiguous churn — skip, never guess
    const direction: MarketDirection = counts.addCount > counts.dropCount ? "adding" : "dropping";
    const dominantCount = Math.max(counts.addCount, counts.dropCount);
    const conflict =
      (direction === "dropping" && profile.signal === "buy-low") ||
      (direction === "adding" && profile.signal === "sell-high");
    if (!conflict) continue;
    out.push({
      name: profile.name,
      pos: profile.position,
      team: profile.team,
      onRoster: rostered.has(profile.name.toLowerCase().trim()),
      modelSignal: profile.signal,
      processGrade: profile.processGrade,
      marketDirection: direction,
      marketCount: dominantCount,
      description:
        direction === "dropping"
          ? `The model reads buy-low (process grade ${profile.processGrade}); the market shows ${dominantCount.toLocaleString()} recent drops across Sleeper leagues. Two live signals, opposite directions — decide with both in view.`
          : `The market shows ${dominantCount.toLocaleString()} recent adds across Sleeper leagues; the model reads sell-high (process grade ${profile.processGrade} below his production). Two live signals, opposite directions — decide with both in view.`,
    });
  }

  // Roster players first, then by market intensity — a deterministic order.
  out.sort((a, b) => Number(b.onRoster) - Number(a.onRoster) || b.marketCount - a.marketCount || a.name.localeCompare(b.name));
  return out.slice(0, limit);
}
