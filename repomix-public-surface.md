This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.
The content has been processed where content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: packages/prediction-engine/src/public-baseline/**
- Files matching these patterns are excluded: **/locked-projection*, **/fixtures/**, **/*.csv, **/*.test.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
packages/
  prediction-engine/
    src/
      public-baseline/
        cadence.ts
        calibration-map.ts
        call-sheet.ts
        conformal-diagnostic.ts
        corpus-ledger.ts
        corpus-path.ts
        devig.ts
        elo538.ts
        espn.ts
        fence.ts
        index.ts
        jamesStein.ts
        killed.ts
        lineup.ts
        marchenko.ts
        metrics.ts
        milp.ts
        narrative-rejections.ts
        no-book-fence.ts
        rankings.ts
        realized-settlement.ts
        registry.ts
        research.ts
        scores365.ts
        withhold.ts
        x-corpus.ts
```

# Files

## File: packages/prediction-engine/src/public-baseline/cadence.ts
```typescript
/**
 * Cadence locks. The schedule is the spec. Nothing here registers a cron.
 *
 * v1.0 Tue 04:00 CT, v2.0 Wed 17:00 CT, v3.0 Fri 16:30 CT,
 * v4.0 Sunday kickoff minus 90 minutes.
 * Each lock carries valid_time, transaction_time, and a sha256 Merkle of the
 * canonical payload. The 5-minute day is a 288-bit mask, Uint32Array(9).
 */
⋮----
import { createHash } from "node:crypto"
⋮----
export type CadenceVersion = "v1.0" | "v2.0" | "v3.0" | "v4.0"
⋮----
export type WallClock = { dow: string; hour: number; minute: number }
⋮----
export function chicagoParts(instant: Date): WallClock
⋮----
const get = (type: string)
⋮----
export function dueVersion(parts: WallClock): "v1.0" | "v2.0" | "v3.0" | null
⋮----
export function tMinus90(kickoff: Date): Date
⋮----
function canonicalize(value: unknown): string
⋮----
export type SnapshotLock = {
  version: CadenceVersion
  validTime: string
  transactionTime: string
  merkle: string
}
⋮----
export function sealLock(
  version: CadenceVersion,
  payload: unknown,
  validTime: string,
  transactionTime: string,
): SnapshotLock
⋮----
export function emptyMask(): Uint32Array
⋮----
export function slotIndex(hour: number, minute: number): number
⋮----
export function setBit(mask: Uint32Array, bit: number): void
⋮----
export function xorMasks(a: Uint32Array, b: Uint32Array): Uint32Array
```

## File: packages/prediction-engine/src/public-baseline/conformal-diagnostic.ts
```typescript
/**
 * Grok-2 Conformal Prediction Diagnostic & Sealed EPA Dropoff Table
 *
 * Conformal Diagnostic:
 *   Residual: r_i = sealedModelTotal_i - externalTotal_i
 *   Sorted absolute residuals: |r|_(1) <= |r|_(2) <= ... <= |r|_(n)
 *   Empirical quantile at level 1 - alpha: qHat = |r|_(ceil((1 - alpha) * (n + 1)))
 *   Conformal Prediction Interval: [sealedModelTotal - qHat, sealedModelTotal + qHat]
 *
 * Sealed EPA Dropoff Table:
 *   Lookup of expected-points-added residual when a player is removed.
 *   Injury adjustments redistribute strictly under sealed numbers with zero mid-week re-estimation.
 */
⋮----
import { createHash } from 'crypto';
⋮----
export type SealedEpaDropoffTable = Readonly<Record<string, number>>;
⋮----
export interface ConformalPredictionInterval {
  readonly lower: number;
  readonly upper: number;
}
⋮----
export interface ConformalDiagnosticResult {
  readonly gameId: string;
  readonly residual: number;
  readonly absResidual: number;
  readonly interval: ConformalPredictionInterval;
  readonly flagged: boolean;
  readonly reason?: string;
}
⋮----
export function computeConformalQuantile(
  sortedAbsResiduals: readonly number[],
  alpha = 0.10,
): number
⋮----
// 1-indexed order statistic index: ceil((1 - alpha) * (n + 1))
⋮----
// Clamp to valid array index [0, n - 1]
⋮----
export function buildConformalPredictionInterval(
  sealedModelTotal: number,
  qHat: number,
): ConformalPredictionInterval
⋮----
export function evaluateConformalDiagnostic(input: {
  gameId: string;
  sealedModelTotal: number;
  externalTotal: number;
  qHat: number;
}): ConformalDiagnosticResult
⋮----
export function hashEpaDropoffTable(table: SealedEpaDropoffTable): string
⋮----
export interface EpaReallocationResult {
  readonly originalDropoff: number;
  readonly allocations: Readonly<Record<string, number>>;
  readonly tableHash: string;
}
⋮----
export function reallocateEpaDropoff(input: {
  table: SealedEpaDropoffTable;
  inactivePlayerId: string;
  replacementDepthIds: readonly string[];
  depthWeights: readonly number[];
}): EpaReallocationResult
```

## File: packages/prediction-engine/src/public-baseline/corpus-ledger.ts
```typescript
/**
 * Every number in the coach corpus is kept.
 * A number moves a published figure only when the posts determine the arithmetic.
 * A vacated share is not handed to whoever is left. A complement that was not
 * stated is not invented.
 */
import type { CoachPost } from "./x-corpus.js"
⋮----
export type NumberUse = "applied" | "held" | "not-a-rate"
⋮----
export type NumberToken = {
  postId: string
  raw: string
  value: number
  use: NumberUse
  reason: string
}
⋮----
export type OwnershipPosition = "TE" | "DST" | "K" | "QB-mid" | "QB-high"
⋮----
function numeric(raw: string): number
⋮----
export function scanNumbers(posts: readonly CoachPost[]): NumberToken[]
⋮----
function classify(raw: string, context: string):
⋮----
function post(posts: readonly CoachPost[], id: string): string
⋮----
function take(text: string, pattern: RegExp, label: string, raws: string[]): number
⋮----
export type CoachPublished = {
  baselineIfCorpusIgnored: null
  balCin: {
    dropbackEpa: number
    formula: string
    pressureRate: number
    chaseTargets: number
    chaseYards: number
    chaseFpg: number
    chaseSince: number
  }
  sf: {
    vacatedTargetShare: number
    vacatedAllocated: false
    cooksRouteShareBefore: number
    cooksRouteShareAfter: number
    cooksRouteShareDelta: number
    kittleTargetShareAfterEvansExit: number
  }
  zoneRun: { allenYpc: number; hallYpc: number; allenMinusHall: number }
  airYards: {
    mayeRbsdm: number
    williamsRbsdm: number
    rbsdmGap: number
    mayeNgs: number
    williamsNgs: number
    ngsGap: number
  }
  bostonYprr: { man: number; zone: number; singleHigh: number; twoHigh: number }
  titansRates: { zone: number; twoHigh: number }
  ownershipPercentagePoints: Record<OwnershipPosition, number>
  tnf: { maye: number; williams: number; floorBothOffenses: number; santosMadeYards: number; santosMissedYards: number }
  seasonEpaPerPlay: { year: number; qb: string; epa: number }[]
  totalEpaLastTwoYears: { rank: number; name: string; epa: number }[]
  worstEpaPerPlay: { name: string; team: string; epa: number }[]
  attemptsSinceInterception: { name: string; attempts: number }[]
  roster: { signed: string; released: string }
  clePresnapPenaltiesPerGame: number
  tables: { postId: string; label: string; rows: { name: string; value: number }[] }[]
  /** Exact tokens consumed by the figures above. */
  sourceTokens: string[]
}
⋮----
/** Exact tokens consumed by the figures above. */
⋮----
export function correctShowdownOwnership(position: OwnershipPosition, projected: number): number | null
⋮----
export function publishFromCorpus(posts: readonly CoachPost[]): CoachPublished
⋮----
const close = (got: number, want: number)
⋮----
export function markApplied(tokens: readonly NumberToken[], sourceTokens: readonly string[]): NumberToken[]
```

## File: packages/prediction-engine/src/public-baseline/corpus-path.ts
```typescript
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
⋮----
/**
 * Absolute path to the coach corpus.
 *
 * Resolved by walking UP from process.cwd() until the repo root containing
 * docs/engine/corpus/x-pull-2026-10-24.md is found. The corpus lives at the repo
 * root while these tests live four directories down in the package, so a single
 * cwd-relative join broke whenever the runner's cwd differed (vitest runs from
 * the package dir; node --test runs from the repo root).
 *
 * Deliberately avoids import.meta.url: this package compiles with
 * "module": "CommonJS", where import.meta is a TS1343 error.
 */
⋮----
function findCorpus(): string
⋮----
// Best guess so callers get a useful ENOENT path rather than a silent fallback.
```

## File: packages/prediction-engine/src/public-baseline/elo538.ts
```typescript
/**
 * Team-Elo baseline matching fivethirtyeight/nfl-elo-game forecast.py (MIT).
 * Winner-signed margin multiplier. No quarterback term. Not a coach projection.
 */
⋮----
export type EloGame = {
  team1: string
  team2: string
  season: string | number
  neutral?: boolean | 0 | 1 | "0" | "1"
  score1: number | null
  score2: number | null
  result1: number | null
}
⋮----
type Side = { name: string; elo: number; season: string | null }
⋮----
export function winProb(eloDiff: number): number
⋮----
/** Published form. A tie uses denominator 1, not 2.2. Sign follows the winner, not |Δ|. */
export function movMultiplier(pointDiff: number, eloDiff: number, result1: number): number
⋮----
/** The wrong simplification. Tests require this to diverge on upsets. */
export function absDeltaMultiplier(pointDiff: number, eloDiff: number): number
⋮----
function neutral(flag: EloGame["neutral"]): boolean
⋮----
function ensure(map: Map<string, Side>, name: string): Side
⋮----
function revert(side: Side, season: string)
⋮----
export type ReplayRow = { prob1: number; elo1: number; elo2: number; shift: number }
⋮----
export function replay(games: EloGame[], initial: Record<string, number> =
⋮----
export function publicPrior(args:
```

## File: packages/prediction-engine/src/public-baseline/fence.ts
```typescript
/** Market fields stop here. The coach simulator does not import a price. */
⋮----
export class CoachFenceError extends Error
⋮----
constructor(key: string)
⋮----
export function assertCoachInputs(input: Record<string, unknown>): void
```

## File: packages/prediction-engine/src/public-baseline/jamesStein.ts
```typescript
/** Positive-part James-Stein. Dominates the unsigned shrinkage when ||X||² is small. */
⋮----
export function positivePartJamesStein(x: readonly number[], sigma2: number): number[]
```

## File: packages/prediction-engine/src/public-baseline/killed.ts
```typescript
/** Edges that already failed a public test. They stay closed until a pre-registered sample beats them. */
⋮----
export type KilledEdge = {
  id: string
  r: number
  n: number
  status: "killed"
  note: string
}
⋮----
export function mayReopen(edge: KilledEdge, next:
```

## File: packages/prediction-engine/src/public-baseline/lineup.ts
```typescript
/**
 * Showdown rules the desk enforces.
 * The full MILP, stacking, and exposure engine is pydfs-lineup-optimizer (MIT).
 * Projections come from the coach sim, not from a commercial feed.
 */
⋮----
export function captainSalary(salary: number): number
⋮----
export function captainPoints(points: number): number
⋮----
export function underCap(used: number, add: number, cap = SHOWDOWN_CAP): boolean
⋮----
export function withinTeamLimit(counts: Readonly<Record<string, number>>, team: string, maxFromTeam: number): boolean
```

## File: packages/prediction-engine/src/public-baseline/marchenko.ts
```typescript
/**
 * Marchenko-Pastur bulk and a BBP-style outside-bulk flag.
 * An eigenvalue is flagged only when the factor is public and not already priced.
 * σ² is the noise scale. γ = p / n. Edges are σ² (1 ± √γ)².
 */
⋮----
export function marchenkoPasturEdges(sigma2: number, gamma: number):
⋮----
export function flagOutsideBulk(
  eigenvalue: number,
  edges: { lower: number; upper: number },
  opts: { public: boolean; priced: boolean },
):
```

## File: packages/prediction-engine/src/public-baseline/metrics.ts
```typescript
/** Seven GSE metrics as pure functions over counted cells. No season-average fallback. */
⋮----
export type Cell = { n: number; epaSum: number; signStable: boolean }
⋮----
export function cellEpa(cell: Cell): number | null
⋮----
function gap(a: Cell, b: Cell): number | null
⋮----
/** ΔEPA of motion+play-action, single-high minus split-safety. */
export function computeGseSii(single: Cell, split: Cell): number | null
⋮----
/** Quick-pressure EPA minus the checkdown residual. */
export function computeGseQptsr(quickPressure: Cell, checkdown: Cell): number | null
⋮----
/** Route EPA on the called shell minus the other shell. */
export function computeGseRls(onShell: Cell, otherShell: Cell): number | null
⋮----
export function shannonBits(probs: readonly number[]): number | null
⋮----
/** Between-the-20s entropy minus red-zone entropy, in bits. */
export function computeGseSpese(betweenTwenties: readonly number[], redZone: readonly number[]): number | null
⋮----
/** Light-box EPA minus loaded-box EPA. */
export function computeGseTor(lightBox: Cell, loadedBox: Cell): number | null
⋮----
/** Leverage-weighted EPA. Negative leverage is a bad cell, not a sign flip. */
export function computeGseSva(plays: readonly
⋮----
/** Mean win-probability bleed: chosen decision minus the best available. */
export function computeGseDwp(decisions: readonly
```

## File: packages/prediction-engine/src/public-baseline/milp.ts
```typescript
/**
 * MILP solver bridge: pydfs-lineup-optimizer (MIT) via the python bridge.
 * Projections come from the GSE simulator only (publicPrior lineage).
 * The 50000 cap / 6 slots / 1.5x captain are enforced twice: by pydfs site
 * settings AND by lineup.ts on the TS side.
 */
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
⋮----
export type MilpPlayer = {
  name: string
  position: string
  salary: number
  projected: number
  team?: string
  opponent?: string
  player_id?: string
}
⋮----
export type MilpRequest = {
  site: "draftkings" | "draftkings_captain" | "fanduel" | "fanduel_single_game"
  n?: number
  players: MilpPlayer[]
}
⋮----
export type MilpLineup = {
  total_points: number
  total_salary: number
  players: { name: string; positions: string[]; salary: number; projected: number; team: string }[]
}
⋮----
export type MilpOptions = { python?: string; timeoutMs?: number }
⋮----
export function pydfsAvailable(python = process.env.GSE_PYTHON ?? "python"): boolean
⋮----
function spawnSync(python: string, args: string[])
⋮----
// lazily imported to keep the module import light
⋮----
export async function solveLineupsViaPydfs(
  req: MilpRequest,
  opts: MilpOptions = {},
): Promise<MilpLineup[]>
```

## File: packages/prediction-engine/src/public-baseline/no-book-fence.ts
```typescript
/**
 * Build-time guard for the coach path. Scans import and require lines only.
 * A comment that says "odds" is not an import. assertCoachInputs still rejects
 * price keys on the value object; this rejects a book module at the source.
 */
⋮----
export function findBookImports(source: string): string[]
⋮----
export function assertNoBookInCoachSource(source: string, file: string): void
```

## File: packages/prediction-engine/src/public-baseline/rankings.ts
```typescript
/**
 * Clean-room competitor ranking kernels.
 *
 * Ported from `engine_math.py` (RATING_ATLAS 60 methods) and the equations in
 * `RATING_ATLAS.md`. Every function here is a public textbook method — the moat
 * is not the equation, it is the data latency and the covariate engine that
 * feeds these priors.
 *
 * Doctrine: none of these functions reads a book price. Market inputs are
 * passed in explicitly by the caller and are only used in the functions whose
 * name says so (`marketStrengthsLeastSquares`, `stackWithMarket`,
 * `publicHypeValuationCheck`, `shinDevigClosedForm`).
 */
⋮----
// ── Types ────────────────────────────────────────────────────────────────────
⋮----
/** One settled game, from the home team's perspective. */
export type TeamGame = {
  home: string
  away: string
  /** Home score. */
  homeScore: number
  /** Away score. */
  awayScore: number
  /** True when the game is on a neutral field. */
  neutral?: boolean
  season?: string | number
}
⋮----
/** Home score. */
⋮----
/** Away score. */
⋮----
/** True when the game is on a neutral field. */
⋮----
/** A (team, rating) pair. */
export type RatingMap = Record<string, number>
⋮----
/** A (team, rating, deviation) triple from the Kalman filter. */
export type KalmanRating = { rating: number; rd: number }
⋮----
/** Efficiency split inputs for SP+ style ratings. */
export type EpaSplit = {
  team: string
  offenseEpaPerPlay?: number
  defenseEpaPerPlay?: number
  successRate?: number
  explosiveness?: number
  fieldPosition?: number
  finishingDrives?: number
  specialTeamsEpa?: number
  plays?: number
}
⋮----
/** PFF-style unit grade inputs. */
export type PffSplits = {
  team: string
  pressureRateAllowed?: number
  passRushWinRate?: number
  coverageEpaPerTarget?: number
  cleanQbEpa?: number
  pressuredQbEpa?: number
  snapShare?: number
  timeToThrow?: number
  yacoe?: number
  cpoe?: number
  separation?: number
}
⋮----
/** A competitor's published rating and the delta it implies for a game. */
export type CompetitorRatingDelta = {
  competitor: string
  team: string
  rating: number
  /** The competitor's implied margin for this game, if published. */
  impliedMargin?: number
}
⋮----
/** The competitor's implied margin for this game, if published. */
⋮----
/** A slate row for market inversion. `home` is the home team. */
export type MarketSlateRow = {
  home: string
  away: string
  /** Closing spread from the home team's perspective (positive = home favored by that many points). */
  homeSpread: number
}
⋮----
/** Closing spread from the home team's perspective (positive = home favored by that many points). */
⋮----
// ── Small linear algebra ─────────────────────────────────────────────────────
⋮----
/**
 * Gaussian elimination with partial pivoting. Handles overdetermined (tall)
 * systems via the normal equations: solves (AᵀA)x = Aᵀb.
 *
 * Ported from `gauss_solve` in engine_math.py. Throws on a singular system
 * rather than returning a silent NaN, because a rating that cannot be solved
 * is a named gap, not a zero.
 */
export function gaussSolve(A: number[][], b: number[]): number[]
⋮----
// Normal equations for least squares.
⋮----
// Square system, augmented matrix.
⋮----
// ── 1. Bradley-Terry ─────────────────────────────────────────────────────────
⋮----
/**
 * Bradley-Terry win probability: P(i beats j) = π_i/(π_i+π_j), expressed on the
 * Elo 400-point logistic scale. Elo IS Bradley-Terry run online.
 *
 * Ported from `bt_prob` in engine_math.py.
 */
export function bradleyTerryProb(ratingA: number, ratingB: number, scale = 400): number
⋮----
/**
 * MM-algorithm MLE for a static Bradley-Terry fit from a win list.
 * Iterates π_t = W_t / Σ_o 1/(π_t+π_o), normalizing to sum 1 each pass.
 *
 * Ported from `bt_fit` in engine_math.py. Returns a rating map scaled so the
 * mean is 1.0; multiply by a base to express on an Elo-like scale.
 */
export function bradleyTerryMle(games: readonly [string, string][], iters = 150): RatingMap
⋮----
// ── 2. Colley ────────────────────────────────────────────────────────────────
⋮----
/**
 * Colley ratings. Linear system (C + I)·r = b with C_ij = −n_ij (games played)
 * and b_i = 1 + ½(w − l). Solve by matrix inversion. Fast, margin-free, and
 * transparent — but it ignores point differentials entirely.
 *
 * Equation from RATING_ATLAS.md #7; solved with gaussSolve.
 */
export function colleyRatings(games: readonly TeamGame[]): RatingMap
⋮----
// (C + I)
⋮----
// ── 3. Massey ────────────────────────────────────────────────────────────────
⋮----
/**
 * Massey ratings. Least squares on point differentials: M·r = p, with M_ij =
 * −n_ij and the diagonal equal to games played. Decomposes into offense and
 * defense automatically — the margin-aware Colley.
 *
 * Equation from RATING_ATLAS.md #8. A small ridge term is added to keep the
 * system full-rank when a team has no games.
 */
export function masseyRatings(games: readonly TeamGame[], ridge = 1e-6): RatingMap
⋮----
// Ridge for stability and to center the ratings.
⋮----
// ── 4. SRS ───────────────────────────────────────────────────────────────────
⋮----
/**
 * Simple Rating System. Team rating = own average margin + opponent-strength
 * adjustment, iterated to convergence. The "schedule strength done right"
 * baseline every football model inherits.
 *
 * Equation from RATING_ATLAS.md #9. Converges when the mean absolute change
 * falls below `tol`.
 */
export function srsRatings(games: readonly TeamGame[], iters = 100, tol = 1e-9): RatingMap
⋮----
// ── 5. SP+ efficiency ────────────────────────────────────────────────────────
⋮----
/**
 * SP+ style efficiency rating. Connelly's SP+ is proprietary, but its published
 * structure is a play-level efficiency composite. This reproduces the structure:
 * weighted z-scores across offense/defense EPA, success rate, explosiveness,
 * field position, and finishing drives. Inputs must be pre-normalized per play.
 *
 * The composite is a weighted sum; weights default to equal weight across the
 * five play-level terms. Defense terms are inverted so a positive rating always
 * means "better team".
 */
export function spPlusEfficiencyRatings(
  splits: readonly EpaSplit[],
  weights: { offense?: number; defense?: number; success?: number; explosiveness?: number; fieldPosition?: number; finishing?: number } = {},
): RatingMap
⋮----
// ── 6. Kalman ────────────────────────────────────────────────────────────────
⋮----
/**
 * State-space ratings: team strengths are a hidden state, each game is a noisy
 * observation margin = (s_home − s_away + hfa) + ε. Returns each team's rating
 * and rating deviation. "Form" is the process noise `q`.
 *
 * Ported from `kalman_ratings` in engine_math.py. The variance floor of 1.0
 * keeps a team from becoming infinitely certain.
 */
export function kalmanRatings(
  games: readonly TeamGame[],
  opts: { hfa?: number; q?: number; rSd?: number; initSd?: number } = {},
): Record<string, KalmanRating>
⋮----
const ensure = (t: string) =>
⋮----
// ── 7. FPI decomposition ─────────────────────────────────────────────────────
⋮----
/**
 * FPI decomposition. ESPN's FPI is proprietary, but its published structure is
 * offense/defense/special-teams components that combine into a single rating
 * and a projected win total. This reproduces that decomposition as a weighted
 * sum of efficiency splits.
 *
 * A positive component means "better than league average" for that unit.
 */
export function fpiDecomposition(
  splits: readonly EpaSplit[],
  weights: { offense?: number; defense?: number; special?: number } = {},
):
⋮----
// ── 8. PFF-style unit grades ─────────────────────────────────────────────────
⋮----
/**
 * PFF-style unit grades. PFF's grades are proprietary and player-level; this
 * reproduces the structure from team-level splits: pressure allowed, pass-rush
 * win rate, coverage EPA per target, clean vs pressured QB EPA, and NGS
 * receiving splits (YACOE, CPOE, separation).
 *
 * A positive grade means "better than league average" for the unit. Grades are
 * unitless composites, not 0–100 PFF scores.
 */
export function pffStyleUnitGrades(splits: readonly PffSplits[]): Record<string,
⋮----
// Pass offense: clean QB EPA, minus pressure allowed, plus CPOE and YACOE.
⋮----
// Pass rush: win rate, plus the QB's pressured EPA (lower is better for the offense).
⋮----
// Coverage: EPA per target allowed, inverted so a positive number is better.
⋮----
// ── 9. Invert competitor rating deltas ───────────────────────────────────────
⋮----
/**
 * Invert a competitor's published rating delta back onto our own rating scale.
 * Given a competitor's rating for a team and the game's margin, solve for the
 * implied team strength offset via ridge regression. This is the "don't debate
 * the market — find its inconsistency" move, applied to competitor ratings.
 *
 * Returns a per-team offset that, added to our rating, reproduces the
 * competitor's implied margins as closely as the slate allows.
 */
export function invertCompetitorRatingDeltas(
  deltas: readonly CompetitorRatingDelta[],
  games: readonly TeamGame[],
  opts: { hfa?: number; ridge?: number } = {},
): RatingMap
⋮----
// Build a tall system: each competitor delta becomes a row asserting
// rating(team) ≈ competitor rating, scaled onto the margin axis.
⋮----
// Add one row per game asserting home − away + hfa ≈ observed margin.
⋮----
// Ridge for stability.
⋮----
// ── 10. Market strengths least squares ───────────────────────────────────────
⋮----
/**
 * Invert the market: solve team strengths directly from closing spreads.
 * The sharp-syndicate move is not to debate the market with your model — it is
 * to find where the market's OWN implied strengths are internally inconsistent
 * (stale lines, news lag) and trade the inconsistency.
 *
 * Ported from `market_strengths` in engine_math.py. Returns the strength map and
 * the fitted spread for each slate row.
 */
export function marketStrengthsLeastSquares(
  slate: readonly MarketSlateRow[],
  opts: { hfa?: number; ridge?: number } = {},
):
⋮----
// Ridge rows to center and stabilize.
⋮----
// ── 11. Stack with market ────────────────────────────────────────────────────
⋮----
/**
 * Log-odds pooling with the market:
 *   p* = σ(w·logit(p_model) + (1−w)·logit(p_market))
 *
 * The market term is non-negotiable: the closing line is the most
 * cross-validated probability alive. `w` is the model's weight; estimate it by
 * max log-likelihood on a validation fold, never on the test set.
 *
 * Ported from `stack_with_market` in engine_math.py.
 */
export function stackWithMarket(pModel: number, pMarket: number, w: number): number
⋮----
const lg = (p: number)
⋮----
// ── 12. Public hype valuation check ──────────────────────────────────────────
⋮----
/**
 * Public hype valuation check. A team carrying a large share of public tickets
 * but a model probability below the market's fair probability is being priced
 * up by public money — the "hype tax". Returns the hype delta and a flag when
 * the gap is material.
 *
 * This is a valuation check, not a bet: it names where public money has moved
 * the price away from the model's read.
 */
export function publicHypeValuationCheck(
  team: string,
  publicTicketShare: number,
  modelWinProb: number,
  marketFairProb: number,
  materialGap = 0.05,
):
⋮----
// ── 13. 2-state regime HMM ───────────────────────────────────────────────────
⋮----
/**
 * 2-state regime HMM (cold/hot form) on margin residuals — full Baum-Welch EM.
 * Answers "is the team in a regime or is it noise?" with filtered probabilities.
 *
 * Ported from `hmm2_fit` in engine_math.py. Returns the two state means, the
 * shared sd, the 2×2 transition matrix, the last filtered hot probability, and
 * the last eight filtered values.
 */
export function hmm2RegimeFit(
  x: readonly number[],
  opts: { iters?: number; m0?: [number, number]; sd0?: number } = {},
):
⋮----
const dens = (t: number, s: 0 | 1)
⋮----
// ── 14. Deflated Sharpe ──────────────────────────────────────────────────────
⋮----
/**
 * Bailey & López de Prado's Deflated Sharpe Ratio. P(the backtest Sharpe is
 * real after "trials" attempts). The anti-self-deception engine: "I found an
 * edge" dies here or becomes a claim.
 *
 * Ported from `deflated_sharpe` in engine_math.py. Returns P(real) and the
 * expected-max Sharpe under pure noise.
 */
export function deflatedSharpe(sr: number, n: number, trials: number, skew = 0, kurt = 3):
⋮----
const gamma = 0.5772156649015329 // Euler–Mascheroni
⋮----
// ── 15. Shin closed-form de-vig ──────────────────────────────────────────────
⋮----
/**
 * Shin's insider-trading de-vig, closed-form inversion. π_i = (1−z)·p_i +
 * z·p_i²/S, with S = Σp². The existing `shinDevig` in devig.ts solves this by
 * root-finding; this exposes the fixed-point form directly so the two can be
 * cross-checked. Falls back to multiplicative on sub-1 books, where Shin
 * degenerates.
 */
export function shinDevigClosedForm(prices: readonly number[]):
⋮----
// ── helpers ──────────────────────────────────────────────────────────────────
⋮----
export function normCdf(z: number): number
⋮----
/** Abramowitz & Stegun 7.1.26 error function, good to ~1.5e-7. */
export function erf(x: number): number
⋮----
export function invNorm(u: number): number
⋮----
function sum(xs: readonly number[]): number
⋮----
function round(x: number, digits: number): number
```

## File: packages/prediction-engine/src/public-baseline/realized-settlement.ts
```typescript
/**
 * T+2h realized-play grader.
 *
 * Writes one trainer record per kept play under brain/feeds/<date>/.
 * A second write of the same key throws. brain/mind.jsonl is not a dest.
 * Kneels, spikes, and plays with win probability above 0.95 or below 0.05
 * are dropped. A missing EPA is dropped. Nothing here is a signed PLAY.
 */
⋮----
export type RealizedPlay = {
  gameId: string
  playId: string
  playType?: string
  desc?: string
  epa: number | null
  wp: number | null
}
⋮----
export type TrainerRecord = {
  key: string
  dest: string
  gameId: string
  playId: string
  epa: number
  validTime: string
}
⋮----
export function feedDest(date: string): string
⋮----
export function isKneelOrSpike(play: RealizedPlay): boolean
⋮----
/** Strict. A missing win probability is not treated as garbage. */
export function isGarbageWp(wp: number | null): boolean
⋮----
export function gradeRealizedPlays(plays: readonly RealizedPlay[]):
⋮----
export class FeedWriter
⋮----
write(record: TrainerRecord): TrainerRecord
⋮----
export function settleAndWrite(
  writer: FeedWriter,
  date: string,
  plays: readonly RealizedPlay[],
  validTime: string,
):
```

## File: packages/prediction-engine/src/public-baseline/research.ts
```typescript
/**
 * Kernels taken from the research triage that this engine can run exactly.
 * The sheet has 1,343 papers. These four are the ones with a formula we can test.
 * They do not read a betting line.
 */
⋮----
export function brierScore(rows: readonly
⋮----
export type ReliabilityBin = { lo: number; hi: number; n: number; meanP: number; meanY: number }
⋮----
/** Equal-width bins. Empty bins are omitted. A calibrated bin has meanP near meanY. */
export function reliabilityBins(rows: readonly
⋮----
/**
 * Page's one-sided CUSUM on a residual series.
 * This is not the functional CUSUM in arXiv:2602.13152. It is the break test the engine can run today.
 */
export function pageCusum(series: readonly number[], drift: number, threshold: number):
⋮----
function binom(n: number, k: number): number
⋮----
/** P(the favorite wins a best-of series) when each game is an independent coin with probability p. */
export function seriesWinProb(p: number, bestOf: number): number | null
⋮----
export type SeasonGame = { home: number; away: number; pHome: number }
⋮----
function mulberry32(seed: number): () => number
⋮----
/**
 * How often the named team finishes strictly first.
 * This is the question in arXiv:1701.05976, answered from our game probabilities, not from a betting line.
 */
export function bestTeamTitleRate(
  games: readonly SeasonGame[],
  teams: number,
  best: number,
  sims: number,
  seed: number,
): number | null
```

## File: packages/prediction-engine/src/public-baseline/withhold.ts
```typescript
/** Frozen-slice veto is dead once the measured shift clears this. Quiet shifts still withhold. */
⋮----
/**
 * Mean of lean × freshness × trust, plus one rest term (days × 0.025).
 * Rest is not averaged away. Seven days is +0.175 on top of the mean product.
 */
export function situationalShift(
  obs: readonly { lean: number; freshness?: number; trust?: number }[],
  restDays = 0,
): number
⋮----
export function shouldWithhold(shift: number): boolean
```

## File: packages/prediction-engine/src/public-baseline/calibration-map.ts
```typescript
/**
 * Isotonic calibration map for GSE model probabilities, plus signed call-sheet
 * ticket pricing.
 *
 * The verified GSE curve removes ~5.2 points of overconfidence: a raw 0.53 is
 * really 0.455-0.48, and a raw 0.67 is 0.618. The knots below are the measured
 * calibration, not a guess. Interpolation is piecewise linear and monotone.
 *
 * Pricing is deterministic. A ticket is minted only when the calibrated edge
 * over the Shin no-vig price clears minEdgePct AND the contradiction gate
 * allows the direction. The gate blocks:
 *   - a market label with no OVER/UNDER direction,
 *   - the same player+stat priced OVER and UNDER in the same signed set.
 * That is how the Brandin Cooks OVER/UNDER split is stopped at the source.
 */
import { shinDevig } from "./devig.js"
import type { Call, SignedTicket } from "./call-sheet.js"
⋮----
export interface MarketQuoteForCall {
  readonly marketLabel: string
  readonly rawModelProb: number
  readonly americanOdds: number
  readonly opposingAmericanOdds?: number
}
⋮----
export interface SignedCall extends Call {
  readonly signedTicket: SignedTicket | null
}
⋮----
export interface ContradictionGateResult {
  readonly allowed: boolean
  readonly reason: string | null
}
⋮----
export type TicketDirection = "OVER" | "UNDER"
⋮----
export interface TicketLeg {
  readonly playerKey: string
  readonly statKey: string
  readonly direction: TicketDirection
  readonly line: number
  readonly raw: string
}
⋮----
/**
 * Measured GSE isotonic knots. Strictly increasing in both coordinates, so the
 * piecewise-linear interpolation is monotone and cannot cross itself.
 */
⋮----
// Upper tail. 0.95 is the last measured knot; above it we continue the final
// segment's slope (0.214 per 0.20) to 1.0 so an overconfident 0.97-0.99 is
// separated instead of collapsing onto the single 0.95 point. Linear
// extrapolation past observed support, not a measured knot -- revisit once
// raw probabilities above 0.95 appear in the graded sample.
⋮----
export function calibrateGseProbability(rawProb: number): number
⋮----
function normalizeKey(value: string): string
⋮----
/**
 * Split a market label into priced legs. A compound label uses "&" between
 * legs, e.g. "Brandin Cooks OVER 24.5 Receiving Yards & George Kittle OVER
 * 71.5 Receiving Yards".
 */
export function parseTicketLegs(marketLabel: string): TicketLeg[]
⋮----
export function detectTicketDirection(marketLabel: string): TicketDirection | null
⋮----
/**
 * Contradiction gate. Returns a refusal reason when the ticket's label has no
 * direction, contradicts itself, or prices the same player+stat opposite to an
 * already-signed ticket.
 */
export function contradictionGate(
  ticket: SignedTicket,
  existing: readonly SignedTicket[] = [],
): ContradictionGateResult
⋮----
/** Throw when a signed set prices the same player+stat in both directions. */
export function assertNoContradictoryTickets(tickets: readonly SignedTicket[]): void
⋮----
/**
 * Price the call sheet. The historical Call rows keep ticket = null; this
 * function returns SignedCall rows whose `ticket` and `signedTicket` are the
 * same frozen ticket when the gate passes. No quote means no ticket.
 */
export function signCallSheetTickets(
  calls: readonly Call[],
  marketQuotes: Readonly<Record<string, MarketQuoteForCall>>,
  minEdgePct = 2.0,
): SignedCall[]
```

## File: packages/prediction-engine/src/public-baseline/call-sheet.ts
```typescript
/**
 * The call sheet. The ledger kept the film. This decides.
 *
 * A later designation beats an earlier status graphic.
 * A deleted video does not beat a designation.
 * You install the modal tendency. The weighted number is the expectation, not a hiding place.
 * You do not fade a team for a body count. You sit the man who is out.
 * If your tendency is what they are built to punish, you change it.
 * None of this mints a ticket. Pricing happens later, in calibration-map.ts,
 * and only when the isotonic calibration and contradiction gate both pass.
 */
import type { CoachPost } from "./x-corpus.js"
import { publishFromCorpus, type CoachPublished } from "./corpus-ledger.js"
⋮----
/**
 * A priced ticket. The call sheet itself never fills this in; it is minted by
 * signCallSheetTickets() in calibration-map.ts after the calibrated edge clears
 * the threshold and the contradiction gate allows the direction.
 */
export type SignedTicket = {
  readonly callId: string
  readonly marketLabel: string
  readonly americanOdds: number
  readonly noVigImpliedProb: number
  readonly rawModelProb: number
  readonly calibratedProb: number
  readonly edgePct: number
  readonly kellyQuarterUnits: number
}
⋮----
export type Call = {
  id: string
  install: string
  expectation: string | null
  alert: string
  willNot: string
  /** Null until a signed ticket clears the gate. Never a placeholder price. */
  ticket: SignedTicket | null
}
⋮----
/** Null until a signed ticket clears the gate. Never a placeholder price. */
⋮----
function text(posts: readonly CoachPost[], id: string): string
⋮----
function has(posts: readonly CoachPost[], id: string, needle: string): boolean
⋮----
export function callSheet(posts: readonly CoachPost[], published: CoachPublished): Call[]
```

## File: packages/prediction-engine/src/public-baseline/devig.ts
```typescript
/**
 * Four ways to take the book's cut out of a posted price.
 * Every fair price must sit at or below the raw implied price and the vector must sum to 1.
 * 0.584 and 0.4202 are from different methods. They sum to 1.0042 and are not a price.
 */
⋮----
export function americanImplied(odds: number): number
⋮----
function fair(raw: readonly number[], fairPrices: readonly number[]): number[]
⋮----
function solveRoot(low: number, high: number, sumAt: (value: number) => number): number
⋮----
function rawOf(odds: readonly number[]): number[]
⋮----
/** Divide each implied price by the overround. Same fraction off every side. */
export function multiplicativeDevig(odds: readonly number[]): number[]
⋮----
/** Take the same number of probability points off every side. Two-way Shin is this method. */
export function additiveDevig(odds: readonly number[]): number[]
⋮----
function shinPrices(raw: readonly number[], overround: number, z: number): number[]
⋮----
/** Shin's insider share. Solved so the fair prices sum to 1. */
export function shinInsiderShare(odds: readonly number[]): number
⋮----
/** Shin (1993). Matches additive on two outcomes. Diverges once a third outcome exists. */
export function shinDevig(odds: readonly number[]): number[]
⋮----
/** The exponent the power method had to solve. It is not assumed to be 2. */
export function powerExponent(odds: readonly number[]): number
⋮----
/** Solve k so the powered implied prices sum to 1. */
export function powerDevig(odds: readonly number[]): number[]
⋮----
export type DevigBook = {
  raw: number[]
  overround: number
  multiplicative: number[]
  additive: number[]
  power: number[]
  powerK: number
  shin: number[]
  shinZ: number
}
⋮----
/** All four fair books for one posted market. None of them is a pick. */
export function compareDevig(odds: readonly number[]): DevigBook
```

## File: packages/prediction-engine/src/public-baseline/narrative-rejections.ts
```typescript
/**
 * NE @ CHI narrative rejections. Game 401873010 is final, CHI 30 NE 24.
 * A missing fact is a named gap. A contradicting fact is a rejection.
 * Neither path signs a PLAY. Class A does not import a spread.
 */
⋮----
export type PublicFacts = {
  olCounts?: { CHI?: number; NE?: number } | null
  windMph?: number | null
  gonzalezStatus?: string | null
}
⋮----
export type NarrativeClaim =
  | { id: "ol-4-vs-2"; chi: 4; ne: 2 }
  | { id: "wind-15"; claimedMph: 15 }
  | { id: "bears-spread"; line: -1.5 | -3 }
  | { id: "gonzalez-hip" }
⋮----
export type NarrativeRejection = {
  gameId: typeof NE_CHI_GAME_ID
  claim: NarrativeClaim["id"]
  accepted: false
  playSigned: false
  reason: string
}
⋮----
export function rejectNarrative(claim: NarrativeClaim, facts: PublicFacts): NarrativeRejection
⋮----
// Annotated rather than inferred: an inferred object literal widens gameId to
// `string`, which fails NarrativeRejection's literal type `typeof NE_CHI_GAME_ID`.
```

## File: packages/prediction-engine/src/public-baseline/espn.ts
```typescript
/**
 * Public ESPN NFL scoreboard. No key.
 * A scheduled game reports score "0". That zero is not a result.
 * Home and away come from `homeAway`, never from array order.
 */
⋮----
import type { LiveGame, ScoresBoard } from "./scores365.js"
⋮----
export type EspnBoard = ScoresBoard & { season: number | null; week: number | null }
⋮----
function num(value: unknown): number | null
⋮----
export function parseEspnScoreboard(payload: unknown): EspnBoard
⋮----
competitionId: null, // ESPN ids live in their own space; 352 is 365Scores-only
```

## File: packages/prediction-engine/src/public-baseline/registry.ts
```typescript
/** What the 2026-10-24 sweep actually established. Identity gates are not engines. */
⋮----
export type SourceStatus = "PUBLIC-CODE" | "PUBLIC-ARCHIVE" | "OPEN-HTML" | "WIRED" | "IDENTITY-GATED" | "DEAD" | "NOT-NFL"
⋮----
export type SourceRow = { id: string; status: SourceStatus; note: string }
```

## File: packages/prediction-engine/src/public-baseline/x-corpus.ts
```typescript
/**
 * The analyst X pull is the coach corpus. Every post is an input.
 * A step that does not read the corpus does not run.
 * The corpus does not mint a ticket: 401873010 is a final.
 */
import { readFileSync } from "node:fs"
import { advanceOutcome, type MarkovState, type SituationInputs, type StepResult } from "../markov-simulator.js"
import { markApplied, publishFromCorpus, scanNumbers, type CoachPublished, type NumberToken } from "./corpus-ledger.js"
import { callSheet, type Call } from "./call-sheet.js"
⋮----
export type CoachPost = {
  account: string
  createdAt: string
  postId: string
  url: string
  text: string
  coachInput: true
}
⋮----
export type AvailabilityStatus = "out" | "questionable" | "playing" | "no-designation"
⋮----
export type Availability = {
  player: string
  status: AvailabilityStatus
  detail: string
  team: string | null
  postId: string
  coachInput: true
}
⋮----
export type Measurement = {
  label: string
  value: number
  postId: string
  coachInput: true
}
⋮----
export type CoachBrief = {
  corpusRead: true
  coachInput: true
  ticket: null
  posts: CoachPost[]
  availability: Availability[]
  measurements: Measurement[]
  personnel: {
    SF: { wrActive: string[]; wrOut: string[] }
  }
  games: {
    "401873010": {
      gameId: "401873010"
      coachInput: true
      ticket: null
      mayeEpaPerDropback: number
      williamsEpaPerDropback: number
      santosFieldGoalYards: 58
      santosPostId: string
    }
    "401873012": {
      gameId: "401873012"
      coachInput: true
      ticket: null
      lamar: Availability
      bengalsBlitzRate: number
      bengalsPressureRate: number
      ravensEpaWhenBlitzed: number
      ravensEpaWithoutBlitz: number
      /** blitzRate * epaBlitzed + (1 - blitzRate) * epaUnblitzed. Weights are the post. */
      ravensExpectedEpaPerDropback: number
      chaseTargets: number
      chaseYards: number
      chaseFpg: number
    }
  }
  published: CoachPublished
  numbers: NumberToken[]
  calls: Call[]
}
⋮----
/** blitzRate * epaBlitzed + (1 - blitzRate) * epaUnblitzed. Weights are the post. */
⋮----
export function parseXPull(markdown: string): CoachPost[]
⋮----
function firstSentence(value: string): string
⋮----
function splitPlayers(sentence: string): string[]
⋮----
const push = () =>
⋮----
function statusFromParen(paren: string, fallback: AvailabilityStatus):
⋮----
export function availabilityFromPosts(posts: readonly CoachPost[]): Availability[]
⋮----
function numberBefore(text: string, pattern: RegExp): number | null
⋮----
export function measurementsFromPosts(posts: readonly CoachPost[]): Measurement[]
⋮----
function must(measurements: readonly Measurement[], label: string): number
⋮----
export function expectedEpaPerDropback(blitzRate: number, whenBlitzed: number, whenNot: number): number
⋮----
export function readCoachBrief(markdown: string): CoachBrief
⋮----
export function loadCoachCorpus(path: string): CoachBrief
⋮----
export function requireCorpus(brief: CoachBrief | null | undefined): CoachBrief
⋮----
/** Personnel the coach is allowed to put on the field after reading the corpus. */
export function personnelOnField(brief: CoachBrief, team: "SF", group: "WR"): string[]
⋮----
export function advanceWithCorpus(
  state: MarkovState,
  inputs: SituationInputs,
  brief: CoachBrief | null,
): StepResult &
```

## File: packages/prediction-engine/src/public-baseline/scores365.ts
```typescript
/**
 * Public 365Scores JSON. No key.
 * `current` without `sports` returns an empty shell. American football is sports=6.
 * The NFL competition is 352. A score of -1 means the game has not been played.
 */
⋮----
export type LiveSide = { name: string; abbr: string; score: number | null }
⋮----
export type LiveGame = {
  id: number
  competitionId: number | null
  competition: string
  startTime: string
  status: string
  home: LiveSide
  away: LiveSide
}
⋮----
export type ScoresBoard = {
  ttl: number
  lastUpdateId: number | null
  paging: { previousPage: string | null; nextPage: string | null }
  games: LiveGame[]
}
⋮----
function qs(params: Record<string, string>): string
⋮----
const common = (timezone: string) => (
⋮----
export function currentGamesUrl(sportId = SPORT_AMERICAN_FOOTBALL, timezone = "America/Chicago"): string
⋮----
export function fixturesUrl(competitionId = NFL_COMPETITION_ID, timezone = "America/Chicago"): string
⋮----
function played(score: unknown): number | null
⋮----
function side(raw: unknown): LiveSide
⋮----
export function homeVsAway(game: LiveGame): string
⋮----
export function homeAwayScore(game: LiveGame): string
⋮----
export function parseScores365(payload: unknown): ScoresBoard
⋮----
/**
 * Follow paging.nextPage from the NFL fixtures board (competition 352) until
 * `wantIds` are all seen or `maxPages` is exhausted. `fetchPage` is injected
 * so tests stay offline. Competition 352 rows are the NFL window; the
 * sports=6 /current/ pull is NCAAF and CFL and must never be tagged NFL.
 */
export async function fixturesWindow(
  fetchPage: (url: string) => Promise<ScoresBoard>,
  wantIds: ReadonlySet<number>,
  maxPages = 6,
): Promise<
⋮----
// live payload paging is a relative cursor path (/web/games/?...aftergame=ID&direction=1)
```

## File: packages/prediction-engine/src/public-baseline/index.ts
```typescript

```


