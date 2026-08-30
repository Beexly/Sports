/**
 * IC2 · standings-math — conservative clinch/elimination bounds (PUBLIC lane).
 *
 * DOCTRINE C5.1 prerequisite: a per-team incentive state machine needs to know
 * whether a team is eliminated / has clinched a berth / holds the #1 seed, using
 * ONLY completed-game results and remaining schedule — nothing market-derived.
 *
 * This is textbook order-statistics over an abstract standings table: no repo
 * semantics, no market data, no live p. Safe for any free endpoint (PUBLIC lane,
 * per CARDS_INCENTIVE_CALENDAR.md routing summary).
 *
 * Conventions (7-spot playoffs, 14-team conference):
 *   - 4 division winners + 3 wildcards per conference = 7 total.
 *   - points = wins + 0.5 * ties.
 *   - maxPoints = points + remaining (every remaining game is a potential win).
 *   - All safety comparisons are STRICT (<=). A tie never proves elimination;
 *     a tie at the boundary never proves clinch — safety must be certain
 *     "regardless of tiebreakers".
 *
 * Pure. Deterministic. Never mutates input. No imports. No Math.random.
 */

/** NFL-relevant constants. Pure math does not hardcode seasons, but the 7-spot
 *  structure is the standing rule the bounds below assume (4 div winners + 3 wc). */
export const PLAYOFF_SPOTS_PER_CONFERENCE = 7;

export interface TeamStandingRow {
  readonly team: string;        // unique key
  readonly conference: string;  // opaque label
  readonly division: string;    // opaque label; a division never spans conferences
  readonly wins: number;        // completed-game wins (integer)
  readonly losses: number;      // completed-game losses (integer)
  readonly ties: number;        // ties are worth half a win
  readonly remaining: number;   // scheduled games not yet completed (>= 0)
}

export interface StandingsFacts {
  readonly team: string;
  /** CERTAIN the team cannot reach the playoffs (7 spots per conference:
   *  division winners + wildcards), regardless of tiebreakers. */
  readonly eliminatedSafe: boolean;
  /** CERTAIN the team has a playoff berth, regardless of tiebreakers. */
  readonly clinchedBerthSafe: boolean;
  /** CERTAIN the team holds the conference #1 seed, regardless of tiebreakers. */
  readonly clinchedTopSeedSafe: boolean;
}

/** Completed-game points: wins + half a tie. */
export function points(row: TeamStandingRow): number {
  return row.wins + 0.5 * row.ties;
}

/** Maximum reachable points: banked + all remaining games won. */
export function maxPoints(row: TeamStandingRow): number {
  return points(row) + row.remaining;
}

function validateRows(rows: readonly TeamStandingRow[]): void {
  const teams = new Set<string>();
  // Map: division label -> set of conferences it appears under. A division must
  // never span two conferences (the spec forbids it).
  const divToConfs = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!Number.isFinite(r.wins) || !Number.isFinite(r.losses) ||
        !Number.isFinite(r.ties) || !Number.isFinite(r.remaining)) {
      throw new RangeError(`non-finite count for team ${r.team}`);
    }
    if (!Number.isInteger(r.wins) || !Number.isInteger(r.losses) ||
        !Number.isInteger(r.ties) || !Number.isInteger(r.remaining)) {
      throw new RangeError(`non-integer count for team ${r.team}`);
    }
    if (r.wins < 0 || r.losses < 0 || r.ties < 0 || r.remaining < 0) {
      throw new RangeError(`negative count for team ${r.team}`);
    }
    if (teams.has(r.team)) throw new RangeError(`duplicate team key: ${r.team}`);
    teams.add(r.team);
    const confs = divToConfs.get(r.division) ?? new Set<string>();
    confs.add(r.conference);
    divToConfs.set(r.division, confs);
    if (confs.size > 1) {
      throw new RangeError(`division ${r.division} spans conferences: ${[...confs].join(", ")}`);
    }
  }
}

/**
 * Compute conservative clinch/elimination bounds for every team.
 *
 * Output index-aligned with input. Throws RangeError (fail closed) on:
 * duplicate team keys; negative/non-integer wins/losses/ties/remaining;
 * a division label appearing under two conference labels; non-finite values.
 *
 * Fewer than 8 rivals in a conference => every *Safe flag is `false` for that
 * conference's rows (a partial table proves nothing — refuse-by-false, documented;
 * never throw for thinness). That is the honesty guarantee: the module never
 * fabricates elimination or clinch from a thin table.
 */
export function standingsFacts(rows: readonly TeamStandingRow[]): StandingsFacts[] {
  validateRows(rows);

  const out: StandingsFacts[] = [];
  for (const r of rows) {
    const rivals = rows.filter((x) => x !== r && x.conference === r.conference);
    const p = points(r);
    const mp = maxPoints(r);

    let eliminatedSafe = false;
    let clinchedBerthSafe = false;
    let clinchedTopSeedSafe = false;

    if (rivals.length >= PLAYOFF_SPOTS_PER_CONFERENCE) {
      // --- eliminatedSafe ---
      // (a) maxPoints(t) < max points of any division rival that can only GROW
      //     => t can never win the division.
      //     Division rivals are those sharing the team's division label.
      const divRivals = rivals.filter((x) => x.division === r.division);
      const divLeaderMax = divRivals.length
        ? Math.max(...divRivals.map((x) => points(x))) // leader's banked only; never shrinks
        : -Infinity;

      // (b) maxPoints(t) < P7, where P7 = 7th-largest points(rival). Each rival's
      //     points only grows (they win remaining), so t finishes with >= 7 rivals
      //     strictly above it. Ties never trigger elimination (strict <).
      const sortedRivalPoints = [...rivals.map((x) => points(x))].sort((a, b) => b - a);
      const p7 = sortedRivalPoints[PLAYOFF_SPOTS_PER_CONFERENCE - 1]!;

      eliminatedSafe = mp < divLeaderMax && mp < p7;

      // --- clinchedBerthSafe ---
      // #(conference rivals with maxPoints(r) >= points(t)) <= 6  => at most 6
      // rivals can TIE t's banked points, so >= 9 rivals finish strictly below
      // t (points-only) => t is at worst the 7th seed. Uses points(t), NOT
      // maxPoints(t) — t's own remaining games may all be losses.
      const rivalsThatCanTieOrBeat = rivals.filter((x) => maxPoints(x) >= p).length;
      clinchedBerthSafe = rivalsThatCanTieOrBeat <= PLAYOFF_SPOTS_PER_CONFERENCE - 1;

      // --- clinchedTopSeedSafe ---
      // points(t) > max over rivals of maxPoints(r) — strictly more banked points
      // than any rival can ever reach.
      const rivalMaxCap = Math.max(...rivals.map((x) => maxPoints(x)));
      clinchedTopSeedSafe = p > rivalMaxCap;
    }
    // thin table (< 8 rivals in conference): all *Safe flags stay false — refuse-by-false.

    out.push({
      team: r.team,
      eliminatedSafe,
      clinchedBerthSafe,
      clinchedTopSeedSafe,
    });
  }
  return out;
}
