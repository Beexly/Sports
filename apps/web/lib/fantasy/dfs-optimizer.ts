/**
 * DFS Optimizer engine — salary-cap lineup optimization, glass-box, EXACT.
 *
 * Exact dynamic program over (roster-slot fill state) × (salary bucket): for a
 * fixed, deterministic player order, DP[i][state] holds the maximum achievable
 * objective over every way to reach `state` using only the first i players —
 *
 *   DP[i][state] = max(DP[i-1][state], DP[i-1][priorState] + value(player_i))
 *
 * — the standard bounded multi-dimensional 0/1-knapsack recurrence. It is
 * optimal by induction on i: DP[0] is trivially exact (only the empty state,
 * value 0, is reachable), and each step considers exactly one new player
 * exactly once, so DP[i][state] is the true optimum over every subset of the
 * first i players that reaches `state`. No randomness, no local search, no
 * restarts: taking argmax over the final layer's fully-filled states and
 * walking the backpointers IS the provably optimal lineup for the given
 * objective and constraints — not an approximation of one.
 *
 * State dimensions: one fill-count per roster-slot category — QB, RB, WR, TE,
 * DST, and FLEX (shared by RB/WR/TE; a player fills its base slot OR the FLEX
 * slot, never both — enforced by construction, since each category is a
 * distinct DP dimension a player can only advance one of per pick) — crossed
 * with salary spent, in units of the pool's detected granularity. DK salaries
 * are always multiples of 100; that is asserted first, falling back to 50,
 * then 10, then 1 for non-standard pools (imports, synthetic fixtures).
 * Whole-dollar salaries are required — the DP's salary axis is unit-indexed
 * and a fractional salary would silently misalign it, so that case throws.
 *
 * QB stacking (`opts.stack`) is enforced exactly, not as a swap-in fixup on
 * top of an unconstrained solve: the solver re-runs once per candidate
 * "stacked team" (every team that can supply both the QB slot and a same-team
 * WR/TE), adding one extra 0/1 "has a same-team pass-catcher yet" DP
 * dimension per run, and keeps the best result across every team tried. That
 * means every feasible choice of which team to stack is actually considered,
 * not just the incumbent QB's team with a single fallback swap.
 *
 * DraftKings' roster-diversity rule — players from at least 2 different
 * GAMES (which implies 2 different teams) — is enforced exactly and lazily:
 * the relaxed solve (no diversity dimension) runs first, and only if its
 * argmax draws all 9 players from a single game does a second, constrained
 * solve run. That second solve adds one extra DP dimension tracking, per
 * partial lineup, "no player chosen yet" / "every player chosen so far is in
 * game Gᵢ" (one state per distinct game in the pool) / "already spans ≥2
 * games" (one absorbing state shared by every way of getting there) — O(games)
 * states, not a per-attempt bitmask. Forcing the final state to the absorbing
 * "spans ≥2 games" value is a single exact DP pass, so unlike a bitmask that
 * bans one already-seen single game per retry (doubling its state count each
 * time, and needing as many retries as there are individually-dominant single
 * games) this never needs more than one extra solve. On realistic pools the
 * rule never binds and the relax-check costs nothing.
 *
 * Complexity: O(teamRuns × players × countStates × salaryStates × flagStates),
 * where flagStates = stackDim (1 or 2) × gameDim (1, or distinctGames + 2 when
 * the game-diversity dimension is active). For the DK-Classic roster (QB, RB,
 * RB, WR, WR, WR, TE, FLEX, DST) countStates = 192 and, at $100 granularity on
 * a $50,000 cap, salaryStates = 501 — so the common relaxed (flagStates = 1)
 * solve over ~600 players touches on the order of 600 × 192 × 501 ≈ 5.8×10^7
 * DP cells, comfortably inside the file's timed 600-player fixture (see
 * dfs-optimizer.test.ts). flagStates only grows past 1 for a stack-required
 * and/or diversity-constrained re-solve, and gameDim is linear in the pool's
 * distinct-game count (typically a dozen or two for a real slate) — not
 * exponential in anything, which bounds that re-solve's per-cell state count.
 * Retained MEMORY is bounded separately, by `solveExact`'s checkpointed
 * reconstruction (see its docstring): O(sqrt(players)) full-DP-state arrays
 * are ever held at once, not one per player, so even the widest realistic
 * flagStates does not scale retained memory linearly in the player count.
 *
 * Illustrative slate; the optimizer itself takes any DfsPlayer pool.
 */

import { DFS_SLOTS, SALARY_CAP, leverage, type DfsPlayer, type DfsPos } from "./dfs-slate";
import { activeDfsSlate } from "@/lib/integrations/dfs";

export type Mode = "cash" | "gpp" | "leverage";
export type OptOpts = {
  readonly mode: Mode;
  readonly stack: boolean;
  readonly locks: ReadonlySet<string>;
  readonly excludes: ReadonlySet<string>;
};

const FLEX_POS: readonly DfsPos[] = ["RB", "WR", "TE"];

/** Canonical unordered game key — both sides of a matchup map to the same key. */
const gameKeyOf = (p: DfsPlayer): string => (p.team < p.opp ? `${p.team}@${p.opp}` : `${p.opp}@${p.team}`);

function objVal(p: DfsPlayer, mode: Mode): number {
  if (mode === "cash") return p.proj;
  if (mode === "gpp") return p.ceiling;
  return leverage(p) * 6 + p.ceiling * 0.45; // leverage: contrarian ceiling
}

export type Lineup = readonly DfsPlayer[];

const salaryOf = (lu: Lineup) => lu.reduce((s, p) => s + p.salary, 0);

function qbStackCount(lu: Lineup): { team: string | null; stacked: number } {
  const qb = lu.find((p) => p.pos === "QB");
  if (!qb) return { team: null, stacked: 0 };
  const stacked = lu.filter((p) => p.id !== qb.id && p.team === qb.team && (p.pos === "WR" || p.pos === "TE")).length;
  return { team: qb.team, stacked };
}

// ---------------------------------------------------------------------------
// Roster-slot state space — derived from DFS_SLOTS (the slate module's roster
// rule), so any base-position counts + any number of FLEX slots that module
// defines are supported without touching the solver.
// ---------------------------------------------------------------------------

const POS_ORDER: readonly DfsPos[] = ["QB", "RB", "WR", "TE", "DST"];
const FLEX_CATEGORY = POS_ORDER.length; // DP-dimension index reserved for FLEX

type SlotSpace = {
  readonly baseCap: Readonly<Record<DfsPos, number>>;
  readonly flexCap: number;
  readonly dims: readonly number[]; // one (count+1) per category: POS_ORDER order, then FLEX
  readonly strides: readonly number[]; // mixed-radix encoding strides, same order as dims
  readonly totalCountStates: number;
  readonly fullCountIdx: number; // the single "every roster slot filled" count-state
};

function buildSlotSpace(slots: readonly DfsPos[]): SlotSpace {
  const baseCap: Record<DfsPos, number> = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0 };
  let flexCap = 0;
  for (const s of slots) {
    if ((s as string) === "FLEX") flexCap++;
    else baseCap[s]++;
  }
  const dims = [...POS_ORDER.map((p) => baseCap[p] + 1), flexCap + 1];
  const strides = new Array<number>(dims.length);
  let acc = 1;
  for (let i = dims.length - 1; i >= 0; i--) {
    strides[i] = acc;
    acc *= dims[i]!;
  }
  let fullCountIdx = 0;
  POS_ORDER.forEach((p, i) => { fullCountIdx += baseCap[p] * strides[i]!; });
  fullCountIdx += flexCap * strides[FLEX_CATEGORY]!;
  return { baseCap, flexCap, dims, strides, totalCountStates: acc, fullCountIdx };
}

/** DP-dimension categories a player at `pos` may advance: its base slot, and/or FLEX. */
function categoriesFor(pos: DfsPos, space: SlotSpace): readonly number[] {
  const cats: number[] = [];
  const baseDim = POS_ORDER.indexOf(pos);
  if (baseDim >= 0 && space.baseCap[pos] > 0) cats.push(baseDim);
  if (FLEX_POS.includes(pos) && space.flexCap > 0) cats.push(FLEX_CATEGORY);
  return cats;
}

/**
 * Detect the pool's salary granularity. DK salaries are always multiples of
 * 100 — assert that first — then fall back to 50, then 10, then 1 so
 * imported or synthetic pools still solve exactly instead of being silently
 * misaligned. Whole-dollar salaries are required.
 */
function detectGranularity(values: readonly number[]): number {
  for (const g of [100, 50, 10, 1]) {
    if (values.every((v) => Number.isInteger(v / g))) return g;
  }
  throw new Error("DFS salaries must be whole-dollar amounts — found a fractional salary or cap.");
}

export type DecayFn = (p: DfsPlayer) => number;

type SolveResult = { readonly lineup: DfsPlayer[]; readonly value: number };

/**
 * The game-diversity requirement solveExact enforces, chosen by the caller
 * (see optimizeOne) to fit the requirement actually needed:
 *   - "none": no dimension — the free, common-case relaxed solve.
 *   - "escape": one extra 0/1 bit, "has a player outside `bannedGame` been
 *     chosen yet" — the cheap retry for the overwhelming majority of cases
 *     where the rule binds (a single dominant single-game lineup to avoid).
 *   - "diverse": a full `gameIndex.size + 2`-valued dimension tracking exact
 *     committed-game identity (see below) — guarantees termination in one
 *     solve regardless of how many individual games would need excluding,
 *     at the cost of a wider (but still only linear-in-games, not
 *     exponential) state space. Reserved for the rare case where "escape"
 *     wasn't enough (the pool has more than one individually-dominant game).
 */
type GameRequirement = { readonly kind: "none" } | { readonly kind: "escape"; readonly bannedGame: string } | { readonly kind: "diverse" };

/**
 * Exact solve for one roster, optionally requiring a QB + same-team WR/TE
 * pairing on `requiredStackTeam`, and optionally requiring game diversity
 * per `gameReq` (see its doc). Both requirements share one generalized
 * "flags" DP dimension, mixed-radix encoded: a 0/1 stack digit (has a
 * same-team pass-catcher been chosen yet) times the game digit described by
 * `gameReq`. Only final states with the stack digit at 1 (if required) and
 * the game digit at its highest ("satisfied") value (if required) count —
 * conveniently, for both "escape" (dim 2) and "diverse" (dim gameIndex.size
 * + 2), the satisfied value is simply `gameDim - 1`. `ordered`, `space`,
 * `unit`, and `gameIndex` are hoisted by the caller so repeated calls (one
 * per candidate stacked team, or across the relaxed/escape/diverse retries)
 * don't redo the deterministic sort, granularity detection, or per-game
 * indexing.
 *
 * Reconstruction is CHECKPOINTED, not a full per-player backpointer array:
 * a naive backpointer array retains one full DP-state-sized array PER
 * PLAYER (O(players) of them), which on a large pool with the wide
 * "diverse" flag dimension can retain several GiB (a real memory-exhaustion
 * risk CodeRabbit caught against an earlier version of this function). This
 * function instead snapshots the DP value layer only every
 * `~sqrt(players)`-th player during a single value-only forward pass, then
 * during backward reconstruction re-derives each ~sqrt(players)-sized
 * segment's choices on demand from its nearest checkpoint before
 * backtracking through it — trading roughly 2x the forward-pass compute
 * (an offline/R&D solve, not a hot path) for cutting retained memory from
 * O(players) full-state arrays to O(sqrt(players)) of them. Both the
 * checkpoints and every re-derived segment are exact re-runs of the same
 * deterministic step function, so this changes nothing about the result —
 * only how much of the trajectory is kept in memory at once.
 */
function solveExact(
  ordered: readonly DfsPlayer[],
  opts: OptOpts,
  decay: DecayFn,
  space: SlotSpace,
  unit: number,
  requiredStackTeam: string | null,
  gameIndex: ReadonlyMap<string, number>,
  gameReq: GameRequirement,
): SolveResult | null {
  const capUnits = SALARY_CAP / unit;
  const salaryStates = capUnits + 1;
  const stackDim = requiredStackTeam ? 2 : 1;
  // Game-digit values when gameReq.kind === "diverse": 0 = empty,
  // 1..gameIndex.size = "single game i so far", gameIndex.size + 1 = the
  // absorbing "spans ≥2 games" state. When "escape": 0 = not yet escaped,
  // 1 = escaped (absorbing). When "none": the trivial single-value 0.
  const gameDim = gameReq.kind === "diverse" ? gameIndex.size + 2 : gameReq.kind === "escape" ? 2 : 1;
  const flagStates = stackDim * gameDim;
  const requiredFlags = (requiredStackTeam ? 1 : 0) * gameDim + (gameReq.kind === "none" ? 0 : gameDim - 1);
  const countStates = space.totalCountStates;
  const fullStates = countStates * salaryStates * flagStates;
  const wideCodes = 6 * flagStates > 127;
  const n = ordered.length;

  // Per-player transition metadata: O(1) fields per player, computed once
  // and shared by every re-run of stepPlayer below (the initial value-only
  // pass, and every segment's choice-recording re-run during
  // reconstruction) — cheap to keep for all N players, unlike the
  // O(states)-sized DP layers themselves.
  const meta = ordered.map((p) => {
    const su = Math.round(p.salary / unit);
    const locked = opts.locks.has(p.id);
    const isOffTeamQb = requiredStackTeam !== null && p.pos === "QB" && p.team !== requiredStackTeam;
    const tooExpensive = su > capUnits;
    const cats = isOffTeamQb || tooExpensive ? [] : categoriesFor(p.pos, space);
    const advancesStack = requiredStackTeam !== null && p.team === requiredStackTeam && (p.pos === "WR" || p.pos === "TE");
    const playerGameKey = gameReq.kind === "none" ? null : gameKeyOf(p);
    // Only looked up for "diverse" — gameIndex is built from this same
    // `ordered` array by the caller, so every player has an entry.
    const playerGame = gameReq.kind === "diverse" ? gameIndex.get(playerGameKey!)! : 0;
    const escapesBanned = gameReq.kind === "escape" && playerGameKey !== gameReq.bannedGame;
    const val = objVal(p, opts.mode) * decay(p);
    return { su, locked, cats, advancesStack, playerGame, escapesBanned, val };
  });
  const suOf = meta.map((m) => m.su);

  /**
   * One DP step: given the layer BEFORE player `i`, produce the layer
   * after. `ch` (the per-state backpointer code, decoded during backward
   * reconstruction) is only allocated when `recordChoices` is true —
   * skipped entirely for the value-only forward pass.
   */
  const stepPlayer = (i: number, dpPrev: Float64Array<ArrayBufferLike>, recordChoices: boolean): { dpNext: Float64Array<ArrayBufferLike>; ch: Int8Array | Int16Array | null } => {
    const m = meta[i]!;
    const dpNext = m.locked ? new Float64Array(fullStates).fill(-Infinity) : dpPrev.slice();
    const ch = recordChoices ? (wideCodes ? new Int16Array(fullStates) : new Int8Array(fullStates)) : null;
    if (ch && !m.locked) ch.fill(-1); // baseline: every state carried forward unchanged (skip)

    for (const c of m.cats) {
      const stride = space.strides[c]!;
      const capOfDim = space.dims[c]! - 1;
      const maxSu = capUnits - m.su;
      for (let countIdx = 0; countIdx < countStates; countIdx++) {
        const cur = Math.floor(countIdx / stride) % (capOfDim + 1);
        if (cur >= capOfDim) continue; // this category is already at capacity
        const targetCountIdx = countIdx + stride;
        for (let srcFlags = 0; srcFlags < flagStates; srcFlags++) {
          // Decode the mixed-radix flags digit, advance each sub-digit
          // independently, and re-encode. The stack digit is a simple OR
          // (once set, stays set). The game digit depends on gameReq.kind:
          // "escape" is also a simple OR (has this player, or any earlier
          // one, been outside the banned game); "diverse" is a genuine
          // 3-way state machine — empty -> this player's game; same single
          // game -> stays; any other single game, or already "spans ≥2
          // games" -> the absorbing "spans ≥2 games" value.
          const srcStack = stackDim === 2 ? Math.floor(srcFlags / gameDim) : 0;
          const srcGame = gameDim > 1 ? srcFlags % gameDim : 0;
          const dstStack = stackDim === 2 ? (srcStack || (m.advancesStack ? 1 : 0)) : 0;
          const dstGame =
            gameReq.kind === "none" ? 0 :
            gameReq.kind === "escape" ? (srcGame || (m.escapesBanned ? 1 : 0)) :
            srcGame === 0 ? m.playerGame : srcGame === m.playerGame ? srcGame : gameDim - 1;
          const dstFlags = dstStack * gameDim + dstGame;
          const srcBase = countIdx * salaryStates * flagStates + srcFlags;
          const dstBase = targetCountIdx * salaryStates * flagStates + dstFlags;
          const code = c * flagStates + srcFlags;
          for (let s2 = 0; s2 <= maxSu; s2++) {
            const v = dpPrev[srcBase + s2 * flagStates]!;
            if (v === -Infinity) continue;
            const dstIdx = dstBase + (s2 + m.su) * flagStates;
            const candidate = v + m.val;
            if (candidate > dpNext[dstIdx]!) {
              dpNext[dstIdx] = candidate;
              if (ch) ch[dstIdx] = code;
            }
          }
        }
      }
    }

    return { dpNext, ch };
  };

  // Value-only forward pass, snapshotting the layer before every
  // checkpointStride-th player. ~sqrt(n) balances checkpoint count against
  // re-derived segment size for minimal peak memory.
  const checkpointStride = Math.max(1, Math.round(Math.sqrt(n)));
  const checkpoints: Float64Array<ArrayBufferLike>[] = [];
  let dpPrev: Float64Array<ArrayBufferLike> = new Float64Array(fullStates).fill(-Infinity);
  dpPrev[0] = 0; // count-state 0, salary 0, no flags — the empty lineup
  for (let i = 0; i < n; i++) {
    if (i % checkpointStride === 0) checkpoints.push(dpPrev.slice());
    dpPrev = stepPlayer(i, dpPrev, false).dpNext;
  }

  const baseIdx = space.fullCountIdx * salaryStates * flagStates + requiredFlags;
  let bestVal = -Infinity;
  let bestSalaryUnits = -1;
  for (let su = 0; su <= capUnits; su++) {
    const v = dpPrev[baseIdx + su * flagStates]!;
    if (v > bestVal) { bestVal = v; bestSalaryUnits = su; }
  }
  if (bestSalaryUnits < 0 || !Number.isFinite(bestVal)) return null;

  // Checkpointed backward reconstruction: walk segments from the end back
  // to the start. Each segment is re-derived (with choice recording) from
  // its nearest checkpoint, backtracked through, then discarded before
  // moving to the previous segment.
  const chosen: { category: number; player: DfsPlayer }[] = [];
  let countIdx = space.fullCountIdx;
  let salaryUnits = bestSalaryUnits;
  let flags = requiredFlags;

  let segEnd = n; // exclusive
  while (segEnd > 0) {
    const checkpointIdx = Math.floor((segEnd - 1) / checkpointStride);
    const segStart = checkpointIdx * checkpointStride;
    let segDp = checkpoints[checkpointIdx]!;
    const segChoices: (Int8Array | Int16Array)[] = [];
    for (let i = segStart; i < segEnd; i++) {
      const { dpNext, ch } = stepPlayer(i, segDp, true);
      segChoices.push(ch!);
      segDp = dpNext;
    }
    for (let i = segEnd - 1; i >= segStart; i--) {
      const state = (countIdx * salaryStates + salaryUnits) * flagStates + flags;
      const code = segChoices[i - segStart]![state]!;
      if (code === -1) continue; // player i was not used; state is unchanged going into it
      const category = Math.floor(code / flagStates);
      const srcFlags = code % flagStates;
      chosen.push({ category, player: ordered[i]! });
      countIdx -= space.strides[category]!;
      salaryUnits -= suOf[i]!;
      flags = srcFlags;
    }
    segEnd = segStart;
  }

  return { lineup: assembleLineup(chosen), value: bestVal };
}

/** Place the DP's chosen (category, player) pairs into DFS_SLOTS positions, deterministically. */
function assembleLineup(chosen: readonly { category: number; player: DfsPlayer }[]): DfsPlayer[] {
  const byCategory = new Map<number, DfsPlayer[]>();
  for (const { category, player } of chosen) {
    const arr = byCategory.get(category) ?? [];
    arr.push(player);
    byCategory.set(category, arr);
  }
  for (const arr of byCategory.values()) arr.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const cursors = new Map<number, number>();
  const lineup: DfsPlayer[] = [];
  for (const slot of DFS_SLOTS) {
    const category = (slot as string) === "FLEX" ? FLEX_CATEGORY : POS_ORDER.indexOf(slot);
    const arr = byCategory.get(category) ?? [];
    const cur = cursors.get(category) ?? 0;
    const player = arr[cur];
    if (!player) throw new Error("DFS optimizer: DP reconstruction produced an incomplete lineup — internal invariant violated.");
    lineup.push(player);
    cursors.set(category, cur + 1);
  }
  return lineup;
}

/**
 * A fast, deliberately loose per-team UPPER BOUND on the value any
 * team-T-stacked lineup could achieve: team T's best available QB, plus the
 * sum of the top-`capacity` values in every other base category, plus the
 * top FLEX value — computed by relaxing the salary cap and single-use-per-
 * player constraints, which can only ever inflate the true achievable value,
 * never deflate it. Used purely to prune solveExact runs in optimizeOne's
 * stack path (branch and bound): a team whose bound cannot beat an already
 * fully-solved team's confirmed value is provably unable to win, so its full
 * DP run can be skipped without ever giving up exactness.
 */
function stackBounds(ordered: readonly DfsPlayer[], opts: OptOpts, decay: DecayFn, space: SlotSpace): { readonly bestQbByTeam: ReadonlyMap<string, number>; readonly otherCategorySum: number } {
  const valuesByCategory: number[][] = POS_ORDER.map(() => []);
  const flexValues: number[] = [];
  const bestQbByTeam = new Map<string, number>();
  for (const p of ordered) {
    const v = objVal(p, opts.mode) * decay(p);
    const baseDim = POS_ORDER.indexOf(p.pos);
    if (baseDim >= 0 && space.baseCap[p.pos] > 0) valuesByCategory[baseDim]!.push(v);
    if (FLEX_POS.includes(p.pos) && space.flexCap > 0) flexValues.push(v);
    if (p.pos === "QB") {
      const cur = bestQbByTeam.get(p.team) ?? -Infinity;
      if (v > cur) bestQbByTeam.set(p.team, v);
    }
  }
  let otherCategorySum = 0;
  POS_ORDER.forEach((pos, i) => {
    if (pos === "QB") return; // QB is team-specific; added per team by the caller
    const cap = space.baseCap[pos];
    const sorted = valuesByCategory[i]!.sort((a, b) => b - a);
    for (let k = 0; k < cap; k++) otherCategorySum += sorted[k] ?? 0;
  });
  const sortedFlex = flexValues.sort((a, b) => b - a);
  for (let k = 0; k < space.flexCap; k++) otherCategorySum += sortedFlex[k] ?? 0;
  return { bestQbByTeam, otherCategorySum };
}

/**
 * Exact, deterministic salary-cap optimization for one lineup: the provable
 * optimum for `opts.mode`'s objective under the roster/cap rules in
 * dfs-slate.ts, respecting locks/excludes/stack exactly. Null iff the pool,
 * locks, and excludes make no legal lineup possible (including: stack was
 * requested but no team can supply both the QB and a same-team WR/TE).
 * `decay` optionally reweights each player's objective contribution — used
 * by generateLineups for deterministic exposure control across N lineups.
 */
export function optimizeOne(
  opts: OptOpts,
  decay: DecayFn = () => 1,
  slate: readonly DfsPlayer[] = activeDfsSlate(),
): DfsPlayer[] | null {
  const cand = slate.filter((p) => !opts.excludes.has(p.id));
  if (!cand.length) return null;

  // Deterministic processing order — required for reproducible tie-breaks
  // (see solveExact's fixed category/state iteration order).
  const ordered = [...cand].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const space = buildSlotSpace(DFS_SLOTS);
  const unit = detectGranularity([...ordered.map((p) => p.salary), SALARY_CAP]);

  // Deterministic 1..N index per distinct game in the pool, shared by every
  // solveExact call below (see its docstring for the game-diversity digit).
  const gameIndex = new Map<string, number>();
  for (const key of [...new Set(ordered.map(gameKeyOf))].sort()) gameIndex.set(key, gameIndex.size + 1);

  // Exact stacking: every team that can field both the QB slot and a
  // same-team WR/TE is a candidate. Solving each exactly and keeping the
  // best tries every feasible "which team is stacked" choice — not a
  // swap-in fixup layered on top of an unconstrained solve — but at slate
  // sizes with many teams that's many full DP runs. Rank teams by a cheap
  // upper bound and solve best-first with branch-and-bound pruning: once a
  // team's bound can't beat an already-confirmed value, neither can any
  // team after it (bounds are sorted descending), so the remaining runs are
  // skipped with the result still provably optimal. The bound ignores the
  // lazy game-diversity constraints as well as the cap — both only remove
  // lineups, so it stays a valid upper bound in every re-solve below.
  let ranked: readonly { team: string; bound: number }[] = [];
  if (opts.stack) {
    const teams = [...new Set(ordered.filter((p) => p.pos === "QB").map((p) => p.team))]
      .filter((team) => ordered.some((p) => p.team === team && (p.pos === "WR" || p.pos === "TE")))
      .sort();
    const { bestQbByTeam, otherCategorySum } = stackBounds(ordered, opts, decay, space);
    ranked = teams
      .map((team) => ({ team, bound: (bestQbByTeam.get(team) ?? -Infinity) + otherCategorySum }))
      .sort((a, b) => b.bound - a.bound || (a.team < b.team ? -1 : a.team > b.team ? 1 : 0));
  }

  const solveUnder = (gameReq: GameRequirement): DfsPlayer[] | null => {
    if (!opts.stack) return solveExact(ordered, opts, decay, space, unit, null, gameIndex, gameReq)?.lineup ?? null;
    let best: SolveResult | null = null;
    for (const { team, bound } of ranked) {
      if (best && bound <= best.value) break; // no remaining team can beat the confirmed best
      const result = solveExact(ordered, opts, decay, space, unit, team, gameIndex, gameReq);
      if (result && (!best || result.value > best.value)) best = result;
    }
    return best?.lineup ?? null;
  };

  // DK game-diversity rule (players from ≥2 different games), resolved in up
  // to three tiers, cheapest first:
  //   1. Relaxed (no game dimension) — free, and already diverse on the
  //      overwhelming majority of real pools.
  //   2. If the relaxed argmax draws every player from one game G, retry
  //      with a single "escape G" bit (GameRequirement "escape") — as cheap
  //      as tier 1 (one extra bit), and sufficient whenever the pool has at
  //      most one individually-dominant game, which is the expected shape
  //      of the rule actually binding.
  //   3. Only if THAT retry is still single-game (a second, different
  //      dominant game) does the wider, exact "diverse" dimension run —
  //      bounded (linear in the pool's distinct-game count) and guaranteed
  //      to terminate in one solve, but paid only in this rare case rather
  //      than on every retry.
  const relaxed = solveUnder({ kind: "none" });
  if (!relaxed) return null;
  if (new Set(relaxed.map(gameKeyOf)).size >= 2) return relaxed;
  const escaped = solveUnder({ kind: "escape", bannedGame: gameKeyOf(relaxed[0]!) });
  if (!escaped) return null;
  if (new Set(escaped.map(gameKeyOf)).size >= 2) return escaped;
  return solveUnder({ kind: "diverse" });
}

export type LineupMetrics = {
  readonly salary: number;
  readonly proj: number;
  readonly floor: number;
  readonly ceiling: number;
  readonly totalOwn: number; // sum of ownership points
  readonly leverageScore: number; // avg leverage
  readonly stackTeam: string | null;
  readonly stacked: number;
};

export function metrics(lu: Lineup): LineupMetrics {
  const { team, stacked } = qbStackCount(lu);
  return {
    salary: salaryOf(lu),
    proj: Math.round(lu.reduce((s, p) => s + p.proj, 0) * 10) / 10,
    floor: Math.round(lu.reduce((s, p) => s + p.floor, 0)),
    ceiling: Math.round(lu.reduce((s, p) => s + p.ceiling, 0)),
    totalOwn: Math.round(lu.reduce((s, p) => s + p.own * 100, 0)),
    leverageScore: Math.round((lu.reduce((s, p) => s + leverage(p), 0) / lu.length) * 100) / 100,
    stackTeam: team,
    stacked,
  };
}

export type GenResult = {
  readonly lineups: ReadonlyArray<{ players: Lineup; metrics: LineupMetrics }>;
  readonly exposure: ReadonlyArray<{ id: string; name: string; pos: DfsPos; count: number; pct: number }>;
  /** Number of unique lineups the caller requested (input `count`). */
  readonly requested: number;
  /**
   * True when fewer unique feasible lineups could be found than requested.
   * The optimizer never emits duplicates — if the exposure pressure or
   * salary-stack constraints exhaust the solution space before `count`
   * lineups are produced, generation stops early and `partial` is set.
   * Callers should surface this so the user knows the result is truncated,
   * not a bug in the count.
   */
  readonly partial: boolean;
};

const EXPOSURE_DECAY = 0.97;
const MAX_DEDUP_RETRIES = 5;

/**
 * Generate N unique lineups with deterministic exposure control. After each
 * exact solve, already-used players' objective contribution is multiplied by
 * EXPOSURE_DECAY (compounding with reuse), and the next lineup is solved
 * exactly again against that reweighted objective — steering later lineups
 * away from the field without ever guessing randomly. If a solve reproduces
 * an already-seen lineup exactly (decay hasn't yet been enough to move the
 * argmax), that lineup's players get one additional local decay compound and
 * the solve is retried, up to MAX_DEDUP_RETRIES times; if it still can't find
 * a fresh one, generation stops early (no duplicates are ever emitted).
 */
export function generateLineups(opts: OptOpts, count: number, maxExposure = 0.6, slate: readonly DfsPlayer[] = activeDfsSlate()): GenResult {
  const usage = new Map<string, number>();
  const seen = new Set<string>();
  const lineups: { players: Lineup; metrics: LineupMetrics }[] = [];

  const key = (lu: Lineup) => lu.map((p) => p.id).sort().join(",");

  for (let n = 0; n < count; n++) {
    // hard exclude players at max exposure
    const overexposed = new Set<string>();
    for (const [id, c] of usage) if (c / Math.max(1, n) >= maxExposure) overexposed.add(id);
    const dynOpts: OptOpts = { ...opts, excludes: new Set([...opts.excludes, ...overexposed]) };

    let extraDecay = new Map<string, number>();
    let lu: DfsPlayer[] | null = null;
    for (let attempt = 0; attempt <= MAX_DEDUP_RETRIES; attempt++) {
      const decay: DecayFn = (p) => EXPOSURE_DECAY ** ((usage.get(p.id) ?? 0) + (extraDecay.get(p.id) ?? 0));
      const c = optimizeOne(dynOpts, decay, slate);
      if (!c) { lu = null; break; }
      if (!seen.has(key(c))) { lu = c; break; }
      // duplicate of an already-accepted lineup: compound decay on exactly
      // these players (deterministically) and try again.
      const next = new Map(extraDecay);
      for (const p of c) next.set(p.id, (next.get(p.id) ?? 0) + 1);
      extraDecay = next;
      lu = null;
    }
    if (!lu) break; // exhausted: no more unique, feasible lineups under current pressure

    seen.add(key(lu));
    lineups.push({ players: lu, metrics: metrics(lu) });
    for (const p of lu) usage.set(p.id, (usage.get(p.id) ?? 0) + 1);
  }

  const byId = new Map(slate.map((p) => [p.id, p]));
  const exposure = [...usage.entries()]
    .map(([id, c]) => {
      const p = byId.get(id)!;
      return { id, name: p.name, pos: p.pos, count: c, pct: Math.round((c / Math.max(1, lineups.length)) * 100) };
    })
    .sort((a, b) => b.count - a.count);

  return { lineups, exposure, requested: count, partial: lineups.length < count };
}
