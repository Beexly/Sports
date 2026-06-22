/**
 * DFS Lineup Optimizer — Core Solver (Phase 3)
 *
 * Greedy + hill-climb solver for DraftKings Classic NFL contests.
 * No external LP/ILP library — pure TypeScript.
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type ContestMode =
  | "CASH"
  | "BALANCED"
  | "SINGLE_ENTRY"
  | "SMALL_FIELD_GPP"
  | "LARGE_FIELD_GPP"
  | "CONTRARIAN"
  | "LEVERAGE";

export interface SolverPlayer {
  id: string;
  name: string;
  position: string; // QB | RB | WR | TE | DST
  team: string;
  opponent: string;
  salary: number;
  projection: number;
  floor: number;
  ceiling: number;
  ownership: number; // 0–1
  isLocked: boolean;
  isExcluded: boolean;
}

export interface SolverWeights {
  meanProjection: number;
  ceiling: number;
  floor: number;
  leverage: number;
  ownership: number;
}

export interface OptimizerRule {
  type: string;
  parameters: Record<string, unknown>;
}

export interface SolverSettings {
  salaryCap?: number;
  minSalaryUsed?: number;
  maxExposure?: number;
  minExposure?: number;
  stackRequired?: boolean;
  minStackSize?: number;
  bringBackRequired?: boolean;
  noQbVsDst?: boolean;
  maxPlayersPerTeam?: number;
  uniquenessThreshold?: number;
  weights?: Partial<SolverWeights>;
  rules?: OptimizerRule[];
}

export interface SolvedLineup {
  players: SolverPlayer[];
  salary: number;
  projection: number;
  floor: number;
  ceiling: number;
  totalOwnership: number;
  leverageScore: number;
  stackTeam: string | null;
  stackCount: number;
  objectiveScore: number;
  lineupKey: string;
}

export interface PortfolioMetrics {
  avgProjection: number;
  avgCeiling: number;
  avgOwnership: number;
  avgLeverage: number;
  avgSalary: number;
  uniqueLineupCount: number;
  teamExposure: Record<string, number>;
  stackDistribution: Record<string, number>;
}

export interface SolverResult {
  lineups: SolvedLineup[];
  exposure: Record<string, number>;
  portfolioMetrics: PortfolioMetrics;
  warnings: string[];
  durationMs: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const DK_SLOTS: string[] = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"];
const SALARY_CAP = 50_000;
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);

// ── Default weights ────────────────────────────────────────────────────────

const MODE_WEIGHTS: Record<ContestMode, SolverWeights> = {
  CASH: { meanProjection: 0.7, ceiling: 0.1, floor: 0.2, leverage: 0.0, ownership: 0.0 },
  BALANCED: { meanProjection: 0.5, ceiling: 0.3, floor: 0.0, leverage: 0.2, ownership: -0.05 },
  SINGLE_ENTRY: { meanProjection: 0.5, ceiling: 0.3, floor: 0.0, leverage: 0.2, ownership: -0.1 },
  SMALL_FIELD_GPP: { meanProjection: 0.4, ceiling: 0.4, floor: 0.0, leverage: 0.3, ownership: -0.15 },
  LARGE_FIELD_GPP: { meanProjection: 0.3, ceiling: 0.5, floor: 0.0, leverage: 0.4, ownership: -0.2 },
  CONTRARIAN: { meanProjection: 0.2, ceiling: 0.4, floor: 0.0, leverage: 0.5, ownership: -0.3 },
  LEVERAGE: { meanProjection: 0.3, ceiling: 0.5, floor: 0.0, leverage: 0.5, ownership: -0.25 },
};

const GPP_MODES = new Set<ContestMode>([
  "SMALL_FIELD_GPP",
  "LARGE_FIELD_GPP",
  "CONTRARIAN",
  "LEVERAGE",
]);

// ── Public: modeDefaults ──────────────────────────────────────────────────

export function modeDefaults(mode: ContestMode): SolverSettings {
  const isGpp = GPP_MODES.has(mode);
  return {
    salaryCap: SALARY_CAP,
    maxExposure: 0.6,
    stackRequired: isGpp,
    minStackSize: 1,
    noQbVsDst: true,
    maxPlayersPerTeam: 8,
    uniquenessThreshold: 1,
    weights: MODE_WEIGHTS[mode],
  };
}

// ── Validation ─────────────────────────────────────────────────────────────

export function validateSolverInput(
  players: SolverPlayer[],
  settings: SolverSettings
): string[] {
  const errors: string[] = [];

  const eligible = players.filter((p) => !p.isExcluded);

  const byPos = (pos: string) => eligible.filter((p) => p.position === pos);
  const flexEligible = eligible.filter((p) => FLEX_POSITIONS.has(p.position));

  if (byPos("QB").length < 1) errors.push("Need at least 1 QB");
  if (byPos("RB").length < 2) errors.push("Need at least 2 RBs");
  if (byPos("WR").length < 3) errors.push("Need at least 3 WRs");
  if (byPos("TE").length < 1) errors.push("Need at least 1 TE");
  if (flexEligible.length < 4) errors.push("Need at least 4 FLEX-eligible players (RB/WR/TE)");
  if (byPos("DST").length < 1) errors.push("Need at least 1 DST");

  const maxExp = settings.maxExposure ?? 0.6;
  if (maxExp <= 0 || maxExp > 1) {
    errors.push("maxExposure must be between 0 and 1");
  }

  return errors;
}

// ── Scoring ────────────────────────────────────────────────────────────────

function objScore(p: SolverPlayer, w: SolverWeights): number {
  return (
    w.meanProjection * p.projection +
    w.ceiling * p.ceiling +
    w.floor * p.floor +
    w.leverage * (p.ceiling / Math.max(p.ownership * 100, 1)) +
    w.ownership * p.ownership * 100
  );
}

// ── Slot eligibility ───────────────────────────────────────────────────────

function eligibleForSlot(player: SolverPlayer, slot: string): boolean {
  if (slot === "FLEX") return FLEX_POSITIONS.has(player.position);
  return player.position === slot;
}

// ── Greedy fill ────────────────────────────────────────────────────────────

/**
 * Compute the minimum salary needed to fill a list of slots from a given
 * available player pool. Used for budget-look-ahead in greedy fill.
 *
 * For each remaining slot we greedily take the cheapest eligible player
 * (from players NOT yet used). This is an O(slots * pool) operation, which
 * is fine for our 9-slot, ~30-player problem.
 */
function minSalaryForSlots(
  remainingSlots: string[],
  availablePlayers: SolverPlayer[]
): number {
  if (remainingSlots.length === 0) return 0;
  const used = new Set<string>();
  let total = 0;
  for (const slot of remainingSlots) {
    const eligible = availablePlayers
      .filter((p) => !used.has(p.id) && eligibleForSlot(p, slot))
      .sort((a, b) => a.salary - b.salary);
    const cheapest = eligible[0];
    if (!cheapest) return Infinity; // impossible to fill
    used.add(cheapest.id);
    total += cheapest.salary;
  }
  return total;
}

function greedyFill(
  slots: string[],
  players: SolverPlayer[],
  locked: SolverPlayer[],
  excluded: Set<string>,
  cap: number,
  scores: Map<string, number>,
  jitter: Map<string, number>
): SolverPlayer[] | null {
  const result: (SolverPlayer | null)[] = new Array<SolverPlayer | null>(slots.length).fill(null);
  const usedIds = new Set<string>();

  // 1. Place locked players
  for (const lp of locked) {
    let placed = false;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (result[i] !== null) continue;
      if (!slot) continue;
      if (eligibleForSlot(lp, slot)) {
        result[i] = lp;
        usedIds.add(lp.id);
        placed = true;
        break;
      }
    }
    if (!placed) return null;
  }

  // Build a set of available (not excluded, not used) players for look-ahead
  const available = (idx: number, extraExclude: string) =>
    players.filter(
      (p) =>
        !usedIds.has(p.id) &&
        p.id !== extraExclude &&
        !excluded.has(p.id)
    );

  // 2. Fill remaining slots greedily
  for (let i = 0; i < slots.length; i++) {
    if (result[i] !== null) continue;
    const slot = slots[i];
    if (!slot) continue;

    const candidates = players
      .filter(
        (p) =>
          !usedIds.has(p.id) &&
          !excluded.has(p.id) &&
          eligibleForSlot(p, slot)
      )
      .sort((a, b) => {
        const sa = (scores.get(a.id) ?? 0) + (jitter.get(a.id) ?? 0);
        const sb = (scores.get(b.id) ?? 0) + (jitter.get(b.id) ?? 0);
        return sb - sa;
      });

    const currentSalary = (result.filter((p) => p !== null) as SolverPlayer[])
      .reduce((s, p) => s + p.salary, 0);

    let placed = false;
    for (const candidate of candidates) {
      const salaryAfterPlacing = currentSalary + candidate.salary;
      if (salaryAfterPlacing > cap) continue;

      const remainingAfter = cap - salaryAfterPlacing;

      // Compute minimum salary for remaining unfilled slots (excluding this slot)
      // using actual cheapest players from the pool (dynamic look-ahead)
      const remainingSlots = slots.filter((_, idx) => idx !== i && result[idx] === null);
      const poolForRemaining = available(i, candidate.id);
      const minNeeded = minSalaryForSlots(remainingSlots, poolForRemaining);

      if (remainingAfter >= minNeeded) {
        result[i] = candidate;
        usedIds.add(candidate.id);
        placed = true;
        break;
      }
    }

    if (!placed) return null;
  }

  if (result.some((p) => p === null)) return null;
  return result as SolverPlayer[];
}

// ── Hill climb ─────────────────────────────────────────────────────────────

function hillClimb(
  lineup: SolverPlayer[],
  slots: string[],
  allPlayers: SolverPlayer[],
  locked: Set<string>,
  excluded: Set<string>,
  cap: number,
  scores: Map<string, number>,
  jitter: Map<string, number>,
  maxIter = 30
): SolverPlayer[] {
  let current = [...lineup];

  const totalScore = (lp: SolverPlayer[]) =>
    lp.reduce((s, p) => s + (scores.get(p.id) ?? 0) + (jitter.get(p.id) ?? 0), 0);

  for (let iter = 0; iter < maxIter; iter++) {
    let improved = false;

    for (let i = 0; i < slots.length; i++) {
      const currentPlayer = current[i];
      if (!currentPlayer) continue;
      if (locked.has(currentPlayer.id)) continue;

      const slot = slots[i];
      if (!slot) continue;

      const inLineupIds = new Set(current.map((p) => p.id));
      const salarySansI = current.reduce((s, p) => s + p.salary, 0) - currentPlayer.salary;

      const alternatives = allPlayers
        .filter(
          (p) =>
            !inLineupIds.has(p.id) &&
            !excluded.has(p.id) &&
            eligibleForSlot(p, slot) &&
            salarySansI + p.salary <= cap
        )
        .sort((a, b) => {
          const sa = (scores.get(a.id) ?? 0) + (jitter.get(a.id) ?? 0);
          const sb = (scores.get(b.id) ?? 0) + (jitter.get(b.id) ?? 0);
          return sb - sa;
        });

      const currentScore = totalScore(current);
      for (const alt of alternatives.slice(0, 20)) {
        const candidate = [...current];
        candidate[i] = alt;
        if (totalScore(candidate) > currentScore) {
          current = candidate;
          improved = true;
          break;
        }
      }
    }

    if (!improved) break;
  }

  return current;
}

// ── Enforce stack ──────────────────────────────────────────────────────────

function enforceStack(
  lineup: SolverPlayer[],
  slots: string[],
  allPlayers: SolverPlayer[],
  locked: Set<string>,
  excluded: Set<string>,
  cap: number,
  minStackSize: number,
  scores: Map<string, number>
): SolverPlayer[] {
  const qb = lineup.find((p) => p.position === "QB");
  if (!qb) return lineup;

  const countStackable = (lp: SolverPlayer[]) =>
    lp.filter(
      (p) => p.team === qb.team && (p.position === "WR" || p.position === "TE")
    ).length;

  if (countStackable(lineup) >= minStackSize) return lineup;

  const inLineupIds = new Set(lineup.map((p) => p.id));
  const teamMates = allPlayers
    .filter(
      (p) =>
        p.team === qb.team &&
        (p.position === "WR" || p.position === "TE") &&
        !inLineupIds.has(p.id) &&
        !excluded.has(p.id)
    )
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));

  let result = [...lineup];

  for (const mate of teamMates) {
    if (countStackable(result) >= minStackSize) break;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const occupant = result[i];
      if (!occupant) continue;
      if (locked.has(occupant.id)) continue;
      if (occupant.team === qb.team && (occupant.position === "WR" || occupant.position === "TE")) continue;
      if (!eligibleForSlot(mate, slot)) continue;

      const salarySansI = result.reduce((s, p) => s + p.salary, 0) - occupant.salary;
      if (salarySansI + mate.salary > cap) continue;

      const next = [...result];
      next[i] = mate;
      result = next;
      break;
    }
  }

  return result;
}

// ── Enforce no QB vs DST ───────────────────────────────────────────────────

function enforceNoQbVsDst(
  lineup: SolverPlayer[],
  slots: string[],
  allPlayers: SolverPlayer[],
  locked: Set<string>,
  excluded: Set<string>,
  cap: number,
  scores: Map<string, number>
): SolverPlayer[] {
  const qb = lineup.find((p) => p.position === "QB");
  const dst = lineup.find((p) => p.position === "DST");

  if (!qb || !dst) return lineup;
  if (dst.team !== qb.opponent) return lineup;
  if (locked.has(dst.id)) return lineup;

  const inLineupIds = new Set(lineup.map((p) => p.id));
  const alternatives = allPlayers
    .filter(
      (p) =>
        p.position === "DST" &&
        !inLineupIds.has(p.id) &&
        !excluded.has(p.id) &&
        p.team !== qb.opponent
    )
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));

  const dstIdx = lineup.findIndex((p) => p.position === "DST");
  if (dstIdx === -1) return lineup;

  const salarySansDst = lineup.reduce((s, p) => s + p.salary, 0) - dst.salary;

  for (const alt of alternatives) {
    if (salarySansDst + alt.salary <= cap) {
      const result = [...lineup];
      result[dstIdx] = alt;
      return result;
    }
  }

  return lineup;
}

// ── Lineup validation ──────────────────────────────────────────────────────

function isValidLineup(lineup: SolverPlayer[], cap: number): boolean {
  if (lineup.length !== 9) return false;
  const ids = lineup.map((p) => p.id);
  if (new Set(ids).size !== ids.length) return false;
  const salary = lineup.reduce((s, p) => s + p.salary, 0);
  if (salary > cap) return false;
  return true;
}

function makeLineupKey(lineup: SolverPlayer[]): string {
  return [...lineup.map((p) => p.id)]
    .sort()
    .join(",");
}

// ── Lineup metrics ─────────────────────────────────────────────────────────

function buildSolvedLineup(
  lineup: SolverPlayer[],
  scores: Map<string, number>
): SolvedLineup {
  const salary = lineup.reduce((s, p) => s + p.salary, 0);
  const projection = lineup.reduce((s, p) => s + p.projection, 0);
  const floor = lineup.reduce((s, p) => s + p.floor, 0);
  const ceiling = lineup.reduce((s, p) => s + p.ceiling, 0);
  const totalOwnership = lineup.reduce((s, p) => s + p.ownership, 0);
  const leverageScore = lineup.reduce(
    (s, p) => s + p.ceiling / Math.max(p.ownership * 100, 1),
    0
  );
  const objectiveScore = lineup.reduce(
    (s, p) => s + (scores.get(p.id) ?? 0),
    0
  );

  // Find stack team (team with most players, if ≥3 from same team)
  const teamCounts: Record<string, number> = {};
  for (const p of lineup) {
    teamCounts[p.team] = (teamCounts[p.team] ?? 0) + 1;
  }
  let stackTeam: string | null = null;
  let stackCount = 0;
  for (const [team, count] of Object.entries(teamCounts)) {
    if (count >= 3 && count > stackCount) {
      stackTeam = team;
      stackCount = count;
    }
  }

  return {
    players: lineup,
    salary,
    projection,
    floor,
    ceiling,
    totalOwnership,
    leverageScore,
    stackTeam,
    stackCount: stackTeam ? stackCount : 0,
    objectiveScore,
    lineupKey: makeLineupKey(lineup),
  };
}

// ── Portfolio metrics ──────────────────────────────────────────────────────

function computePortfolioMetrics(lineups: SolvedLineup[]): PortfolioMetrics {
  if (lineups.length === 0) {
    return {
      avgProjection: 0,
      avgCeiling: 0,
      avgOwnership: 0,
      avgLeverage: 0,
      avgSalary: 0,
      uniqueLineupCount: 0,
      teamExposure: {},
      stackDistribution: {},
    };
  }

  const n = lineups.length;
  const avgProjection = lineups.reduce((s, l) => s + l.projection, 0) / n;
  const avgCeiling = lineups.reduce((s, l) => s + l.ceiling, 0) / n;
  const avgOwnership = lineups.reduce((s, l) => s + l.totalOwnership, 0) / n;
  const avgLeverage = lineups.reduce((s, l) => s + l.leverageScore, 0) / n;
  const avgSalary = lineups.reduce((s, l) => s + l.salary, 0) / n;
  const uniqueLineupCount = new Set(lineups.map((l) => l.lineupKey)).size;

  // teamExposure: pct of lineups with ≥1 player from team
  const teamLineupCount: Record<string, number> = {};
  for (const lineup of lineups) {
    const teams = new Set(lineup.players.map((p) => p.team));
    for (const team of teams) {
      teamLineupCount[team] = (teamLineupCount[team] ?? 0) + 1;
    }
  }
  const teamExposure: Record<string, number> = {};
  for (const [team, count] of Object.entries(teamLineupCount)) {
    teamExposure[team] = count / n;
  }

  // stackDistribution: count of lineups where that team is stackTeam
  const stackDistribution: Record<string, number> = {};
  for (const lineup of lineups) {
    if (lineup.stackTeam) {
      stackDistribution[lineup.stackTeam] =
        (stackDistribution[lineup.stackTeam] ?? 0) + 1;
    }
  }

  return {
    avgProjection,
    avgCeiling,
    avgOwnership,
    avgLeverage,
    avgSalary,
    uniqueLineupCount,
    teamExposure,
    stackDistribution,
  };
}

// ── Small random jitter ────────────────────────────────────────────────────

function makeJitter(players: SolverPlayer[], scale: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of players) {
    m.set(p.id, (Math.random() - 0.5) * 2 * scale);
  }
  return m;
}

// ── Internal: single lineup build attempt ─────────────────────────────────

function tryBuildLineup(
  eligiblePlayers: SolverPlayer[],
  lockedPlayers: SolverPlayer[],
  excluded: Set<string>,
  cap: number,
  scores: Map<string, number>,
  jitter: Map<string, number>,
  stackRequired: boolean,
  minStackSize: number,
  noQbVsDst: boolean
): SolverPlayer[] | null {
  const lockedNotExcluded = lockedPlayers.filter((p) => !excluded.has(p.id));
  const lockedIds = new Set(lockedNotExcluded.map((p) => p.id));

  const result = greedyFill(
    DK_SLOTS,
    eligiblePlayers,
    lockedNotExcluded,
    excluded,
    cap,
    scores,
    jitter
  );

  if (!result) return null;

  let lineup = hillClimb(
    result,
    DK_SLOTS,
    eligiblePlayers,
    lockedIds,
    excluded,
    cap,
    scores,
    jitter
  );

  if (stackRequired) {
    lineup = enforceStack(
      lineup,
      DK_SLOTS,
      eligiblePlayers,
      lockedIds,
      excluded,
      cap,
      minStackSize,
      scores
    );
  }

  if (noQbVsDst) {
    lineup = enforceNoQbVsDst(
      lineup,
      DK_SLOTS,
      eligiblePlayers,
      lockedIds,
      excluded,
      cap,
      scores
    );
  }

  return lineup;
}

// ── Main solver ────────────────────────────────────────────────────────────

export function solve(
  players: SolverPlayer[],
  mode: ContestMode,
  count: number,
  settings?: SolverSettings
): SolverResult {
  const startMs = Date.now();
  const warnings: string[] = [];

  // Merge defaults
  const defaults = modeDefaults(mode);
  const cap = settings?.salaryCap ?? defaults.salaryCap ?? SALARY_CAP;
  const maxExposure = settings?.maxExposure ?? defaults.maxExposure ?? 0.6;
  const stackRequired = settings?.stackRequired ?? defaults.stackRequired ?? false;
  const minStackSize = settings?.minStackSize ?? defaults.minStackSize ?? 1;
  const noQbVsDst = settings?.noQbVsDst ?? defaults.noQbVsDst ?? true;
  const uniquenessThreshold = settings?.uniquenessThreshold ?? defaults.uniquenessThreshold ?? 1;

  const mergedWeights: SolverWeights = {
    ...MODE_WEIGHTS[mode],
    ...(settings?.weights ?? {}),
  };

  // Validate
  const validationErrors = validateSolverInput(players, {
    ...defaults,
    ...settings,
    weights: mergedWeights,
  });
  if (validationErrors.length > 0) {
    warnings.push(...validationErrors.map((e) => `Validation: ${e}`));
  }

  // Filter excluded
  const eligiblePlayers = players.filter((p) => !p.isExcluded);
  const lockedPlayers = players.filter((p) => p.isLocked && !p.isExcluded);
  const lockedIds = new Set(lockedPlayers.map((p) => p.id));

  // Score all players
  const baseScores = new Map<string, number>();
  for (const p of eligiblePlayers) {
    baseScores.set(p.id, objScore(p, mergedWeights));
  }

  // Usage tracking
  const usage = new Map<string, number>();
  const lineups: SolvedLineup[] = [];
  const seenKeys = new Set<string>();

  for (let n = 0; n < count; n++) {
    // Determine exposure-excluded players (not on first lineup)
    const exposureExcluded = new Set<string>();
    if (n > 0) {
      for (const p of eligiblePlayers) {
        const uses = usage.get(p.id) ?? 0;
        if (uses / n >= maxExposure && !lockedIds.has(p.id)) {
          exposureExcluded.add(p.id);
        }
      }
    }

    let accepted: SolvedLineup | null = null;
    let bestValid: SolvedLineup | null = null;

    // Try up to 8 attempts with jitter
    for (let attempt = 0; attempt < 8; attempt++) {
      const jitterScale = 0.5 + attempt * 0.3;
      const jitter = makeJitter(eligiblePlayers, jitterScale);
      const excluded = new Set([...exposureExcluded]);

      const result = tryBuildLineup(
        eligiblePlayers,
        lockedPlayers,
        excluded,
        cap,
        baseScores,
        jitter,
        stackRequired,
        minStackSize,
        noQbVsDst
      );

      if (!result) continue;
      if (!isValidLineup(result, cap)) continue;

      const solved = buildSolvedLineup(result, baseScores);

      if (!bestValid || solved.objectiveScore > bestValid.objectiveScore) {
        bestValid = solved;
      }

      // Check uniqueness: how many existing lineups share too many players
      const key = solved.lineupKey;
      if (seenKeys.has(key)) continue;

      // Check uniquenessThreshold — at least `uniquenessThreshold` players must differ
      const tooSimilar = lineups.some((l) => {
        const existingIds = new Set(l.players.map((p) => p.id));
        const diffCount = solved.players.filter((p) => !existingIds.has(p.id)).length;
        return diffCount < uniquenessThreshold;
      });

      if (tooSimilar && attempt < 7) continue;

      accepted = solved;
      break;
    }

    // If not found with normal exposure, relax to maxExposure*1.2
    if (!accepted) {
      const relaxedMax = maxExposure * 1.2;
      const relaxedExposureExcluded = new Set<string>();
      if (n > 0) {
        for (const p of eligiblePlayers) {
          const uses = usage.get(p.id) ?? 0;
          if (uses / n >= relaxedMax && !lockedIds.has(p.id)) {
            relaxedExposureExcluded.add(p.id);
          }
        }
      }

      for (let attempt = 0; attempt < 4; attempt++) {
        const jitter = makeJitter(eligiblePlayers, 1.0 + attempt * 0.5);
        const excluded = new Set([...relaxedExposureExcluded]);

        const result = tryBuildLineup(
          eligiblePlayers,
          lockedPlayers,
          excluded,
          cap,
          baseScores,
          jitter,
          stackRequired,
          minStackSize,
          noQbVsDst
        );

        if (!result) continue;
        if (!isValidLineup(result, cap)) continue;

        const solved = buildSolvedLineup(result, baseScores);
        if (!bestValid || solved.objectiveScore > bestValid.objectiveScore) {
          bestValid = solved;
        }

        if (!seenKeys.has(solved.lineupKey)) {
          accepted = solved;
          break;
        }
      }
    }

    // Fall back to best valid (may be duplicate)
    if (!accepted) {
      if (bestValid) {
        warnings.push(
          `Lineup ${n + 1}: could not generate unique lineup, accepting best available`
        );
        accepted = bestValid;
      } else {
        warnings.push(`Lineup ${n + 1}: failed to generate valid lineup`);
        continue;
      }
    }

    lineups.push(accepted);
    seenKeys.add(accepted.lineupKey);

    // Update usage
    for (const p of accepted.players) {
      usage.set(p.id, (usage.get(p.id) ?? 0) + 1);
    }
  }

  // Compute exposure percentages
  const exposure: Record<string, number> = {};
  const total = lineups.length;
  for (const [id, uses] of usage.entries()) {
    exposure[id] = total > 0 ? uses / total : 0;
  }

  const portfolioMetrics = computePortfolioMetrics(lineups);

  return {
    lineups,
    exposure,
    portfolioMetrics,
    warnings,
    durationMs: Date.now() - startMs,
  };
}
