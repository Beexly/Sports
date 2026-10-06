/**
 * DK Showdown (single-game) optimizer — wave 4 issue #805.
 *
 * WHY THIS EXISTS. GSE's exact DP engine is hard-wired to the DK-Classic roster
 * (lib/fantasy/dfs-slate.ts DFS_SLOTS), and the importer explicitly rejects
 * Showdown input ("skips unsupported (showdown) positions with a warning",
 * lib/fantasy/dk-import.test.ts:33). Single-game is table stakes among the
 * profiled competitors (rjrice1990/nfl-single-game-optimizer; nuke-dfs-hub ships
 * a DK+FD showdown module) — see gse-competitive-intel
 * waves/wave4-repos-oss-optimizers-2026-09-12.md §3.5.
 *
 * Rather than rewire a working Classic engine, this module implements the
 * Showdown format on its own terms. The two formats differ structurally:
 *
 *   Classic  : 9 slots, one game-agnostic pool, 50k cap, no multiplier.
 *   Showdown : 6 slots (1 CPT + 5 FLEX), TWO teams only, 50k cap,
 *              CPT scores and costs 1.5x, and the roster must span both teams.
 *
 * HONESTY RULES:
 *  1. Exactness is claimed ONLY over the searched pool. The pool is bounded to
 *     the top `PER_TEAM_BOUND` players per team by projection so enumeration
 *     stays fast, and the bound is reported in `poolBound`. We never call this
 *     exact over a pool we did not search.
 *  2. The captain multiplier is applied to BOTH points and salary, and both
 *     scalings appear on every returned lineup so a reader can check the cap.
 *  3. "Alternates" are diversified re-solves, NOT proven k-best distinct lineups.
 *     The field is named and documented accordingly.
 *  4. Inputs that cannot form a legal roster (one team, no players, cap
 *     impossible) return an empty result with a stated reason — never a partial
 *     or invented lineup.
 *  5. A pool with a team field missing is reported, not defaulted.
 */

export const SHOWDOWN_RULES = {
  /** DK single-game salary cap. */
  salaryCap: 50000,
  /** Captain multiplier — applies to points AND salary. */
  captainMultiplier: 1.5,
  /** FLEX slots alongside the captain. */
  flexSlots: 5,
  /** Maximum players per team on a 6-man showdown roster. */
  maxPerTeam: 5,
} as const;

/**
 * Enumeration stays exact over a bounded pool. 12 top players per team → at most
 * 24 candidates → ~34k FLEX combinations per captain candidate.
 */
export const PER_TEAM_BOUND = 12;

/** A player as a single-game slate presents them (no DFS position grouping). */
export type ShowdownPlayer = {
  readonly id: string;
  readonly name: string;
  readonly pos: string;
  readonly team: string;
  readonly salary: number;
  /** Projected points at the base (non-captain) rate. */
  readonly proj: number;
  /** Optional ceiling at the base rate; falls back to proj when absent. */
  readonly ceiling?: number;
};

export type ShowdownLineup = {
  readonly captain: ShowdownPlayer;
  readonly flex: readonly ShowdownPlayer[];
  /** Cap cost with the captain's salary multiplied. */
  readonly salary: number;
  /** Projected points with the captain's projection multiplied. */
  readonly proj: number;
  /** Ceiling with the captain's ceiling multiplied (or proj when absent). */
  readonly ceiling: number;
  /** Stable key over the player-id set, for dedupe and display. */
  readonly key: string;
};

export type ShowdownResult = {
  readonly lineups: readonly ShowdownLineup[];
  /** Players eligible for search (post-bound). */
  readonly poolSize: number;
  /** Distinct captain candidates searched. */
  readonly captainCandidates: number;
  /** FLEX combinations evaluated across all captains. */
  readonly combosEvaluated: number;
  /** Stated search bound, or null when the full pool fit inside it. */
  readonly poolBound: string | null;
  /** Two-team framing, or null when the pool had no clean two-team split. */
  readonly teams: readonly [string, string] | null;
  readonly reason: string | null;
}

function keyOf(players: readonly ShowdownPlayer[]): string {
  return [...players.map((p) => p.id)].sort().join("|");
}

/**
 * Bound the pool to the top `PER_TEAM_BOUND` players per team by projection.
 * Returns the bounded pool plus the bound note when anything was dropped.
 */
export function boundPool(
  pool: readonly ShowdownPlayer[],
  perTeam = PER_TEAM_BOUND,
): { pool: ShowdownPlayer[]; note: string | null } {
  const byTeam = new Map<string, ShowdownPlayer[]>();
  for (const p of pool) {
    const list = byTeam.get(p.team);
    if (list) list.push(p);
    else byTeam.set(p.team, [p]);
  }
  const kept: ShowdownPlayer[] = [];
  let dropped = 0;
  for (const [, list] of byTeam) {
    const sorted = [...list].sort((a, b) => b.proj - a.proj || a.id.localeCompare(b.id));
    kept.push(...sorted.slice(0, perTeam));
    dropped += Math.max(0, sorted.length - perTeam);
  }
  return {
    pool: kept,
    note:
      dropped === 0
        ? null
        : `Searched the top ${perTeam} players per team by projection (${dropped} ` +
          `lower-projected candidate(s) excluded); exactness holds over the searched pool only.`,
  };
}

/**
 * Best legal showdown lineups, ranked by projected points.
 *
 * Exact over the bounded pool: every (captain, 5-FLEX) combination is enumerated
 * and checked against the cap and the both-teams rule.
 */
export function bestShowdownLineups(
  pool: readonly ShowdownPlayer[],
  k = 1,
  opts: { perTeamBound?: number; salaryCap?: number } = {},
): ShowdownResult {
  const salaryCap = opts.salaryCap ?? SHOWDOWN_RULES.salaryCap;
  const { pool: bounded, note } = boundPool(pool, opts.perTeamBound ?? PER_TEAM_BOUND);

  const teams = [...new Set(bounded.map((p) => p.team))].sort();
  const empty = (reason: string): ShowdownResult => ({
    lineups: [],
    poolSize: bounded.length,
    captainCandidates: 0,
    combosEvaluated: 0,
    poolBound: note,
    teams: null,
    reason,
  });

  if (bounded.length === 0) return empty("No players supplied — nothing to optimise.");
  if (teams.length === 1) {
    return empty(
      `Only one team present (${teams[0]}). A showdown roster must include players ` +
        `from both teams, so no legal lineup exists.`,
    );
  }
  if (teams.length > 2) {
    return empty(
      `${teams.length} teams present. Showdown is a single-game format and requires ` +
        `exactly two teams; supply one game's pool.`,
    );
  }

  const [teamA, teamB] = teams as [string, string];
  const mult = SHOWDOWN_RULES.captainMultiplier;
  const flexSlots = SHOWDOWN_RULES.flexSlots;

  const found: ShowdownLineup[] = [];
  const seenKeys = new Set<string>();
  let combosEvaluated = 0;
  let captainCandidates = 0;

  for (const captain of bounded) {
    const capForFlex = salaryCap - captain.salary * mult;
    if (capForFlex < 0) continue;
    captainCandidates += 1;

    const others = bounded.filter((p) => p.id !== captain.id);
    if (others.length < flexSlots) continue;

    // Enumerate index combinations of size flexSlots over `others`.
    const idx = Array.from({ length: flexSlots }, (_, i) => i);
    const n = others.length;

    for (;;) {
      combosEvaluated += 1;
      let salary = captain.salary * mult;
      let proj = captain.proj * mult;
      let ceiling = (captain.ceiling ?? captain.proj) * mult;
      const chosen: ShowdownPlayer[] = [];

      let ok = true;
      for (const i of idx) {
        const p = others[i]!;
        salary += p.salary;
        if (salary > salaryCap) {
          ok = false;
          break;
        }
        proj += p.proj;
        ceiling += p.ceiling ?? p.proj;
        chosen.push(p);
      }

      if (ok) {
        // Both-teams rule: the roster (captain included) must span both teams.
        const roster = [captain, ...chosen];
        const hasA = roster.some((p) => p.team === teamA);
        const hasB = roster.some((p) => p.team === teamB);
        if (hasA && hasB) {
          const key = keyOf(roster);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            found.push({ captain, flex: chosen, salary, proj, ceiling, key });
          }
        }
      }

      // Advance the combination index vector.
      let i = flexSlots - 1;
      while (i >= 0 && idx[i] === n - flexSlots + i) i -= 1;
      if (i < 0) break;
      idx[i] = idx[i]! + 1;
      for (let j = i + 1; j < flexSlots; j++) idx[j] = idx[j - 1]! + 1;
    }
  }

  found.sort(
    (a, b) => b.proj - a.proj || b.ceiling - a.ceiling || a.key.localeCompare(b.key),
  );

  return {
    lineups: found.slice(0, Math.max(0, k)),
    poolSize: bounded.length,
    captainCandidates,
    combosEvaluated,
    poolBound: note,
    teams: [teamA, teamB],
    reason:
      found.length === 0
        ? "No legal lineup fits the salary cap with both teams represented."
        : null,
  };
}

/**
 * Diversified alternates: re-solve the best lineup with the previous winner's
 * captain excluded, until `k` lineups exist or the pool runs out.
 *
 * THESE ARE NOT PROVEN k-BEST DISTINCT LINEUPS. Each round is an exact best
 * solve over a reduced pool, so the set is diverse and each entry is individually
 * optimal for its reduced pool — but the collection is not guaranteed to be the
 * true top-k by projection. The field is named `alternates` for that reason.
 */
export function showdownAlternates(
  pool: readonly ShowdownPlayer[],
  k = 5,
  opts: { perTeamBound?: number; salaryCap?: number } = {},
): ShowdownResult {
  const excluded = new Set<string>();
  const lineups: ShowdownLineup[] = [];
  let last: ShowdownResult | null = null;

  for (let round = 0; round < k; round++) {
    const remaining = pool.filter((p) => !excluded.has(p.id));
    const res = bestShowdownLineups(remaining, 1, opts);
    last = res;
    const top = res.lineups[0];
    if (!top) break;
    lineups.push(top);
    excluded.add(top.captain.id);
  }

  return {
    lineups,
    poolSize: last?.poolSize ?? 0,
    captainCandidates: last?.captainCandidates ?? 0,
    combosEvaluated: last?.combosEvaluated ?? 0,
    poolBound: last?.poolBound ?? null,
    teams: last?.teams ?? null,
    reason:
      lineups.length === 0
        ? (last?.reason ?? "No legal showdown lineup found.")
        : `Diversified alternates: ${lineups.length} re-solve(s) with each prior winner's ` +
          `captain excluded. Not a proven top-k by projection.`,
  };
}