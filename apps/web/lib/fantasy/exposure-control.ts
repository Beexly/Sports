/**
 * Exposure control — the portfolio governor for multi-lineup generation.
 *
 * WHY THIS EXISTS (wave 4). GSE can generate k-best lineups (lib/fantasy/dfs-exact.ts)
 * and can REPORT the resulting exposure (lib/fantasy/stack-exposure.ts), but it has
 * no way to GOVERN the portfolio as it is built: a player can be rostered in all 150
 * lineups and nothing stops it. Two of the profiled competitors ship exactly this
 * layer and it is the single most reusable thing in the whole sweep:
 *
 *   - BenBrostoff/draftfast (298 stars, MIT): exposure.py bans a player once
 *     generated exposure reaches max, locks players still under min, and
 *     optimize.run_multi loops the solve while applying that policy.
 *   - DimaKudosh/pydfs-lineup-optimizer (447 stars, MIT): a rules engine with
 *     per-player AND per-team max exposure, plus lineup spacing so a portfolio
 *     does not collapse into near-duplicates.
 *
 * See gse-competitive-intel waves/wave4-repos-oss-optimizers-2026-09-12.md §3.6.
 *
 * HONESTY RULES (this module makes promises about a portfolio, so it must not lie):
 *  1. An exposure fraction is NEVER invented. With zero lineups generated there is
 *     no denominator, so pct is null — not 0, not a guess.
 *  2. A min-exposure floor can be arithmetically impossible (asking for 60% exposure
 *     on 40 players across 10 nine-man lineups cannot happen). Infeasibility is
 *     COMPUTED and reported with the shortfall, never silently dropped. A governor
 *     that quietly ignores a constraint is worse than no governor.
 *  3. Ban and lock sets are returned deterministically sorted, so a caller that
 *     feeds them into a solver gets a reproducible portfolio.
 *  4. This module policies a portfolio. It does not predict anything, and it never
 *     claims the resulting portfolio is optimal or profitable.
 */

/** How many roster slots a single lineup contributes to each team's tally. */
export type ExposureRules = {
  /** Ban a player once generated exposure is at or above this fraction (0..1). */
  readonly maxPlayerExposure?: number;
  /** Hold a player as required while exposure is below this fraction (0..1). */
  readonly minPlayerExposure?: number;
  /** Cap a team's total rostered SLOTS as a fraction of (lineups x slots) (0..1). */
  readonly maxTeamExposure?: number;
  /** Minimum number of differing players between any two lineups. */
  readonly minSpacing?: number;
  /** Roster size, needed for the min-exposure feasibility check. */
  readonly slotsPerLineup?: number;
};

export type ExposureState = {
  /** Lineups generated so far — the denominator for every fraction. */
  readonly lineups: number;
  /** playerId -> appearances across generated lineups. */
  readonly playerCounts: ReadonlyMap<string, number>;
  /** team -> total rostered slots across generated lineups. */
  readonly teamCounts: ReadonlyMap<string, number>;
  /** Player ids known to the universe (so locks can be considered pre-generation). */
  readonly universe: readonly string[];
};

export type PlayerExposure = {
  readonly playerId: string;
  readonly count: number;
  /** null when no lineups have been generated — there is no honest fraction yet. */
  readonly pct: number | null;
};

export type ExposureDecision = {
  /** Players at or over the max — the solver must exclude them. Sorted. */
  readonly banned: readonly string[];
  /** Players still under the min — the solver should include them. Sorted. */
  readonly locked: readonly string[];
  /** Teams at or over their slot cap. Sorted. */
  readonly cappedTeams: readonly string[];
  /** Per-player exposure, most-exposed first (ties broken by id). */
  readonly exposure: readonly PlayerExposure[];
  /** False when the remaining slots can no longer satisfy the min floor. */
  readonly minExposureFeasible: boolean;
  /** True when more players are under the floor than the next lineup has slots. */
  readonly lockOverflow: boolean;
  /** Human-readable statement of the first blocking condition, or null. */
  readonly reason: string | null;
};

/** A fresh state over a known player universe. */
export function initExposure(universe: readonly string[]): ExposureState {
  return {
    lineups: 0,
    playerCounts: new Map(),
    teamCounts: new Map(),
    universe: [...universe],
  };
}

/**
 * Fold one generated lineup into the state. Pure — returns a new state.
 * `teamsFn` maps a player id to its team so the per-team cap can be tallied.
 */
export function recordLineup(
  state: ExposureState,
  lineup: readonly string[],
  teamsFn: (playerId: string) => string | undefined = () => undefined,
): ExposureState {
  const playerCounts = new Map(state.playerCounts);
  const teamCounts = new Map(state.teamCounts);
  for (const id of lineup) {
    playerCounts.set(id, (playerCounts.get(id) ?? 0) + 1);
    const team = teamsFn(id);
    if (team !== undefined) teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
  }
  return {
    lineups: state.lineups + 1,
    playerCounts,
    teamCounts,
    universe: state.universe,
  };
}

/** Exposure of one player. pct is null until at least one lineup exists. */
export function playerExposure(state: ExposureState, playerId: string): PlayerExposure {
  const count = state.playerCounts.get(playerId) ?? 0;
  return {
    playerId,
    count,
    pct: state.lineups === 0 ? null : count / state.lineups,
  };
}

function sortedUnique(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort();
}

/**
 * The minimum lineups required to give every universe member at least the min
 * exposure floor. Returns the shortfall in lineups (0 when satisfiable).
 */
export function minExposureShortfall(
  state: ExposureState,
  rules: ExposureRules,
): { required: number; shortfall: number; perLineup: number } {
  const perLineup = rules.slotsPerLineup ?? 0;
  const min = rules.minPlayerExposure ?? 0;
  if (min <= 0 || perLineup <= 0) return { required: 0, shortfall: 0, perLineup };
  // Each lineup contributes at most `perLineup` coverage instances, and a player
  // needs ceil(min * N) appearances out of N lineups — so the floor is only
  // reachable when N * perLineup >= universeSize * min * N, i.e. perLineup >=
  // universeSize * min. Solve for the smallest N satisfying it.
  const needed = Math.ceil((state.universe.length * min) / perLineup);
  const required = Math.max(0, needed);
  return { required, shortfall: Math.max(0, required - state.lineups), perLineup };
}

/**
 * Decide what the next solve may and may not do.
 *
 * `maxPlayerExposure` is enforced against the CURRENT state: once a player has
 * appeared in >= max of the generated lineups, they are banned from the next one.
 */
export function nextLineupPolicy(
  state: ExposureState,
  rules: ExposureRules = {},
): ExposureDecision {
  const exposure: PlayerExposure[] = state.universe
    .map((id) => playerExposure(state, id))
    .sort((a, b) => b.count - a.count || a.playerId.localeCompare(b.playerId));

  const max = rules.maxPlayerExposure;
  const min = rules.minPlayerExposure;

  const banned =
    max === undefined || state.lineups === 0
      ? []
      : sortedUnique(
          exposure.filter((e) => (e.pct ?? 0) >= max).map((e) => e.playerId),
        );

  const lockedIds =
    min === undefined || min <= 0
      ? []
      : exposure
          .filter((e) => e.pct === null || (e.pct ?? 0) < min)
          // Most urgent first: lowest exposure, then id for determinism. The caller
          // takes the first `slotsPerLineup` of these.
          .sort((a, b) => a.count - b.count || a.playerId.localeCompare(b.playerId))
          .map((e) => e.playerId);

  // A lineup can only carry `slotsPerLineup` players, so more urgent locks than
  // that means the floor cannot be met by the immediate next solve.
  const perLineupCap = rules.slotsPerLineup ?? 0;
  const lockOverflow = perLineupCap > 0 && lockedIds.length > perLineupCap;

  const cappedTeams: string[] = [];
  const maxTeam = rules.maxTeamExposure;
  const perLineup = rules.slotsPerLineup ?? 0;
  if (maxTeam !== undefined && state.lineups > 0 && perLineup > 0) {
    const slotBudget = state.lineups * perLineup;
    for (const [team, count] of state.teamCounts) {
      if (count / slotBudget >= maxTeam) cappedTeams.push(team);
    }
    cappedTeams.sort();
  }

  const shortfall = minExposureShortfall(state, rules);
  const minExposureFeasible = shortfall.shortfall === 0;

  let reason: string | null = null;
  if (!minExposureFeasible) {
    reason =
      `The ${(min ?? 0) * 100}% minimum exposure floor on ${state.universe.length} players ` +
      `needs at least ${shortfall.required} lineups at ${shortfall.perLineup} slots each; ` +
      `${state.lineups} generated so far, ${shortfall.shortfall} more required. The floor ` +
      `cannot be satisfied by the remaining lineups as configured.`;
  } else if (lockOverflow) {
    reason =
      `${lockedIds.length} player(s) sit below the ${(min ?? 0) * 100}% floor but only ` +
      `${perLineupCap} slots exist in the next lineup, so the most urgent ${perLineupCap} are ` +
      `listed first and the rest cannot be lifted by this solve.`;
  } else if (banned.length > 0) {
    reason = `${banned.length} player(s) have reached the ${(max ?? 0) * 100}% exposure ceiling and are excluded from the next solve.`;
  } else if (cappedTeams.length > 0) {
    reason = `${cappedTeams.length} team(s) have reached their slot cap: ${cappedTeams.join(", ")}.`;
  } else if (state.lineups === 0) {
    reason = "No lineups generated yet — no exposure exists to govern, so nothing is banned or locked.";
  }

  return {
    banned,
    locked: lockedIds,
    cappedTeams,
    exposure,
    minExposureFeasible,
    lockOverflow,
    reason,
  };
}

/** Number of players that differ between two lineups (order-insensitive). */
export function lineupDistance(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let differing = 0;
  for (const id of setA) if (!setB.has(id)) differing += 1;
  for (const id of setB) if (!setA.has(id)) differing += 1;
  return differing;
}

/** Whether a candidate is far enough from EVERY already-accepted lineup. */
export function meetsSpacing(
  candidate: readonly string[],
  accepted: readonly (readonly string[])[],
  minSpacing: number,
): { ok: boolean; worstAgainst: number | null } {
  if (minSpacing <= 0 || accepted.length === 0) return { ok: true, worstAgainst: null };
  let worst = Infinity;
  for (const other of accepted) {
    const d = lineupDistance(candidate, other);
    if (d < worst) worst = d;
  }
  return { ok: worst >= minSpacing, worstAgainst: Number.isFinite(worst) ? worst : null };
}