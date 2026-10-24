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

// ── Types ────────────────────────────────────────────────────────────────────

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

/** A (team, rating) pair. */
export type RatingMap = Record<string, number>

/** A (team, rating, deviation) triple from the Kalman filter. */
export type KalmanRating = { rating: number; rd: number }

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

/** A competitor's published rating and the delta it implies for a game. */
export type CompetitorRatingDelta = {
  competitor: string
  team: string
  rating: number
  /** The competitor's implied margin for this game, if published. */
  impliedMargin?: number
}

/** A slate row for market inversion. `home` is the home team. */
export type MarketSlateRow = {
  home: string
  away: string
  /** Closing spread from the home team's perspective (positive = home favored by that many points). */
  homeSpread: number
}

// ── Small linear algebra ─────────────────────────────────────────────────────

/**
 * Gaussian elimination with partial pivoting. Handles overdetermined (tall)
 * systems via the normal equations: solves (AᵀA)x = Aᵀb.
 *
 * Ported from `gauss_solve` in engine_math.py. Throws on a singular system
 * rather than returning a silent NaN, because a rating that cannot be solved
 * is a named gap, not a zero.
 */
export function gaussSolve(A: number[][], b: number[]): number[] {
  const m = A.length
  const n = A[0]?.length ?? 0
  if (m === 0 || n === 0) throw new Error("gaussSolve: empty system")
  if (b.length !== m) throw new Error("gaussSolve: b length mismatch")

  if (m > n) {
    // Normal equations for least squares.
    const AtA: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    const Atb: number[] = Array(n).fill(0)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let s = 0
        for (let r = 0; r < m; r++) {
          const row = A[r]!
          s += row[i]! * row[j]!
        }
        AtA[i]![j] = s
      }
      let s = 0
      for (let r = 0; r < m; r++) {
        const row = A[r]!
        s += row[i]! * b[r]!
      }
      Atb[i] = s
    }
    return gaussSolve(AtA, Atb)
  }

  // Square system, augmented matrix.
  const M: number[][] = A.map((row, i) => [...row, b[i]!])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r
    }
    if (Math.abs(M[piv]![c]!) < 1e-12) throw new Error(`gaussSolve: singular pivot at column ${c}`)
    const tmp = M[c]!
    M[c] = M[piv]!
    M[piv] = tmp
    for (let r = 0; r < n; r++) {
      if (r === c || M[r]![c]! === 0) continue
      const f = M[r]![c]! / M[c]![c]!
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!
    }
  }
  return Array.from({ length: n }, (_, i) => M[i]![n]! / M[i]![i]!)
}

// ── 1. Bradley-Terry ─────────────────────────────────────────────────────────

/**
 * Bradley-Terry win probability: P(i beats j) = π_i/(π_i+π_j), expressed on the
 * Elo 400-point logistic scale. Elo IS Bradley-Terry run online.
 *
 * Ported from `bt_prob` in engine_math.py.
 */
export function bradleyTerryProb(ratingA: number, ratingB: number, scale = 400): number {
  return 1 / (10 ** ((ratingB - ratingA) / scale) + 1)
}

/**
 * MM-algorithm MLE for a static Bradley-Terry fit from a win list.
 * Iterates π_t = W_t / Σ_o 1/(π_t+π_o), normalizing to sum 1 each pass.
 *
 * Ported from `bt_fit` in engine_math.py. Returns a rating map scaled so the
 * mean is 1.0; multiply by a base to express on an Elo-like scale.
 */
export function bradleyTerryMle(games: readonly [string, string][], iters = 150): RatingMap {
  const teams = new Set<string>()
  const wins: Record<string, number> = {}
  const opp: Record<string, string[]> = {}
  for (const [w, l] of games) {
    teams.add(w)
    teams.add(l)
    wins[w] = (wins[w] ?? 0) + 1
    ;(opp[w] ??= []).push(l)
    ;(opp[l] ??= []).push(w)
  }
  let pi: RatingMap = {}
  for (const t of teams) pi[t] = 1
  for (let k = 0; k < iters; k++) {
    const next: RatingMap = {}
    for (const t of teams) {
      let s = 0
      for (const o of opp[t] ?? []) s += 1 / ((pi[t] ?? 1) + (pi[o] ?? 1))
      next[t] = s > 0 ? (wins[t] ?? 0) / s : 1
    }
    const tot = Object.values(next).reduce((a, b) => a + b, 0)
    for (const t of teams) pi[t] = next[t]! / tot
  }
  return pi
}

// ── 2. Colley ────────────────────────────────────────────────────────────────

/**
 * Colley ratings. Linear system (C + I)·r = b with C_ij = −n_ij (games played)
 * and b_i = 1 + ½(w − l). Solve by matrix inversion. Fast, margin-free, and
 * transparent — but it ignores point differentials entirely.
 *
 * Equation from RATING_ATLAS.md #7; solved with gaussSolve.
 */
export function colleyRatings(games: readonly TeamGame[]): RatingMap {
  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))].sort()
  const n = teams.length
  const idx: Record<string, number> = {}
  teams.forEach((t, i) => (idx[t] = i))

  const C: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  const b: number[] = Array(n).fill(1)
  for (const g of games) {
    const h = idx[g.home]!
    const a = idx[g.away]!
    C[h]![a]! -= 1
    C[a]![h]! -= 1
    const hw = g.homeScore > g.awayScore ? 1 : 0
    const aw = g.awayScore > g.homeScore ? 1 : 0
    b[h]! += 0.5 * (hw - aw)
    b[a]! += 0.5 * (aw - hw)
  }
  // (C + I)
  for (let i = 0; i < n; i++) C[i]![i]! += 1
  const r = gaussSolve(C, b)
  const out: RatingMap = {}
  teams.forEach((t, i) => (out[t] = r[i]!))
  return out
}

// ── 3. Massey ────────────────────────────────────────────────────────────────

/**
 * Massey ratings. Least squares on point differentials: M·r = p, with M_ij =
 * −n_ij and the diagonal equal to games played. Decomposes into offense and
 * defense automatically — the margin-aware Colley.
 *
 * Equation from RATING_ATLAS.md #8. A small ridge term is added to keep the
 * system full-rank when a team has no games.
 */
export function masseyRatings(games: readonly TeamGame[], ridge = 1e-6): RatingMap {
  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))].sort()
  const n = teams.length
  const idx: Record<string, number> = {}
  teams.forEach((t, i) => (idx[t] = i))

  const M: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  const p: number[] = Array(n).fill(0)
  for (const g of games) {
    const h = idx[g.home]!
    const a = idx[g.away]!
    const diff = g.homeScore - g.awayScore
    M[h]![a]! -= 1
    M[a]![h]! -= 1
    M[h]![h]! += 1
    M[a]![a]! += 1
    p[h]! += diff
    p[a]! -= diff
  }
  // Ridge for stability and to center the ratings.
  for (let i = 0; i < n; i++) {
    M[i]![i]! += ridge
    p[i]! += ridge * 0
  }
  const r = gaussSolve(M, p)
  const out: RatingMap = {}
  teams.forEach((t, i) => (out[t] = r[i]!))
  return out
}

// ── 4. SRS ───────────────────────────────────────────────────────────────────

/**
 * Simple Rating System. Team rating = own average margin + opponent-strength
 * adjustment, iterated to convergence. The "schedule strength done right"
 * baseline every football model inherits.
 *
 * Equation from RATING_ATLAS.md #9. Converges when the mean absolute change
 * falls below `tol`.
 */
export function srsRatings(games: readonly TeamGame[], iters = 100, tol = 1e-9): RatingMap {
  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))].sort()
  const gamesByTeam: Record<string, TeamGame[]> = {}
  for (const t of teams) gamesByTeam[t] = []
  for (const g of games) {
    gamesByTeam[g.home]!.push(g)
    gamesByTeam[g.away]!.push(g)
  }

  const rating: RatingMap = {}
  for (const t of teams) rating[t] = 0

  for (let k = 0; k < iters; k++) {
    const next: RatingMap = {}
    for (const t of teams) {
      const gs = gamesByTeam[t]!
      if (gs.length === 0) {
        next[t] = 0
        continue
      }
      let marginSum = 0
      let oppSum = 0
      for (const g of gs) {
        const isHome = g.home === t
        const own = isHome ? g.homeScore : g.awayScore
        const oppScore = isHome ? g.awayScore : g.homeScore
        marginSum += own - oppScore
        oppSum += rating[isHome ? g.away : g.home] ?? 0
      }
      next[t] = marginSum / gs.length + oppSum / gs.length
    }
    let maxDelta = 0
    for (const t of teams) {
      maxDelta = Math.max(maxDelta, Math.abs(next[t]! - rating[t]!))
      rating[t] = next[t]!
    }
    if (maxDelta < tol) break
  }
  return rating
}

// ── 5. SP+ efficiency ────────────────────────────────────────────────────────

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
): RatingMap {
  const w = {
    offense: weights.offense ?? 1,
    defense: weights.defense ?? 1,
    success: weights.success ?? 1,
    explosiveness: weights.explosiveness ?? 1,
    fieldPosition: weights.fieldPosition ?? 1,
    finishing: weights.finishing ?? 1,
  }
  const out: RatingMap = {}
  for (const s of splits) {
    out[s.team] =
      w.offense * (s.offenseEpaPerPlay ?? 0) -
      w.defense * (s.defenseEpaPerPlay ?? 0) +
      w.success * (s.successRate ?? 0) +
      w.explosiveness * (s.explosiveness ?? 0) +
      w.fieldPosition * (s.fieldPosition ?? 0) +
      w.finishing * (s.finishingDrives ?? 0)
  }
  return out
}

// ── 6. Kalman ────────────────────────────────────────────────────────────────

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
): Record<string, KalmanRating> {
  const hfa = opts.hfa ?? 1.56
  const q = opts.q ?? 1
  const rSd = opts.rSd ?? 13.45
  const initSd = opts.initSd ?? 9
  const mu: Record<string, number> = {}
  const P: Record<string, number> = {}

  const ensure = (t: string) => {
    if (!(t in mu)) {
      mu[t] = 0
      P[t] = initSd ** 2
    }
  }

  for (const g of games) {
    ensure(g.home)
    ensure(g.away)
    P[g.home]! += q
    P[g.away]! += q
    const margin = g.homeScore - g.awayScore
    const innov = margin - (mu[g.home]! - mu[g.away]! + hfa)
    const S = P[g.home]! + P[g.away]! + rSd ** 2
    for (const t of [g.home, g.away]) {
      const h = t === g.home ? 1 : -1
      const K = (P[t]! * h) / S
      mu[t]! += K * innov
      P[t]! = Math.max(1, P[t]! * (1 - K * h))
    }
  }

  const out: Record<string, KalmanRating> = {}
  for (const t of Object.keys(mu)) {
    out[t] = { rating: round(mu[t]!, 2), rd: round(Math.sqrt(P[t]!), 2) }
  }
  return out
}

// ── 7. FPI decomposition ─────────────────────────────────────────────────────

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
): { team: string; offense: number; defense: number; special: number; composite: number }[] {
  const w = { offense: weights.offense ?? 1, defense: weights.defense ?? 1, special: weights.special ?? 1 }
  return splits.map((s) => {
    const offense = w.offense * (s.offenseEpaPerPlay ?? 0)
    const defense = -w.defense * (s.defenseEpaPerPlay ?? 0)
    const special = w.special * (s.specialTeamsEpa ?? 0)
    return { team: s.team, offense, defense, special, composite: offense + defense + special }
  })
}

// ── 8. PFF-style unit grades ─────────────────────────────────────────────────

/**
 * PFF-style unit grades. PFF's grades are proprietary and player-level; this
 * reproduces the structure from team-level splits: pressure allowed, pass-rush
 * win rate, coverage EPA per target, clean vs pressured QB EPA, and NGS
 * receiving splits (YACOE, CPOE, separation).
 *
 * A positive grade means "better than league average" for the unit. Grades are
 * unitless composites, not 0–100 PFF scores.
 */
export function pffStyleUnitGrades(splits: readonly PffSplits[]): Record<string, { pass: number; rush: number; coverage: number; composite: number }> {
  const out: Record<string, { pass: number; rush: number; coverage: number; composite: number }> = {}
  for (const s of splits) {
    // Pass offense: clean QB EPA, minus pressure allowed, plus CPOE and YACOE.
    const pass = (s.cleanQbEpa ?? 0) - (s.pressureRateAllowed ?? 0) + (s.cpoe ?? 0) + (s.yacoe ?? 0)
    // Pass rush: win rate, plus the QB's pressured EPA (lower is better for the offense).
    const rush = (s.passRushWinRate ?? 0) - (s.pressuredQbEpa ?? 0)
    // Coverage: EPA per target allowed, inverted so a positive number is better.
    const coverage = -(s.coverageEpaPerTarget ?? 0) + (s.separation ?? 0)
    out[s.team] = { pass, rush, coverage, composite: pass + rush + coverage }
  }
  return out
}

// ── 9. Invert competitor rating deltas ───────────────────────────────────────

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
): RatingMap {
  const hfa = opts.hfa ?? 1.56
  const ridge = opts.ridge ?? 1e-6
  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))].sort()
  const n = teams.length
  const idx: Record<string, number> = {}
  teams.forEach((t, i) => (idx[t] = i))

  // Build a tall system: each competitor delta becomes a row asserting
  // rating(team) ≈ competitor rating, scaled onto the margin axis.
  const rows: number[][] = []
  const b: number[] = []
  for (const d of deltas) {
    if (!(d.team in idx)) continue
    const row = Array(n).fill(0)
    row[idx[d.team]!] = 1
    rows.push(row)
    b.push(d.rating)
  }
  // Add one row per game asserting home − away + hfa ≈ observed margin.
  for (const g of games) {
    const row = Array(n).fill(0)
    row[idx[g.home]!] = 1
    row[idx[g.away]!] = -1
    rows.push(row)
    b.push(g.homeScore - g.awayScore - hfa)
  }
  // Ridge for stability.
  for (let i = 0; i < n; i++) {
    const row = Array(n).fill(0)
    row[i] = ridge
    rows.push(row)
    b.push(0)
  }
  const r = gaussSolve(rows, b)
  const out: RatingMap = {}
  teams.forEach((t, i) => (out[t] = r[i]!))
  return out
}

// ── 10. Market strengths least squares ───────────────────────────────────────

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
): { strengths: RatingMap; fittedSpreads: number[] } {
  const hfa = opts.hfa ?? 1.56
  const ridge = opts.ridge ?? 1e-6
  const teams = [...new Set(slate.flatMap((g) => [g.home, g.away]))].sort()
  const n = teams.length
  const idx: Record<string, number> = {}
  teams.forEach((t, i) => (idx[t] = i))

  const rows: number[][] = []
  const b: number[] = []
  for (const g of slate) {
    const row = Array(n).fill(0)
    row[idx[g.home]!] = 1
    row[idx[g.away]!] = -1
    rows.push(row)
    b.push(g.homeSpread - hfa)
  }
  // Ridge rows to center and stabilize.
  for (let i = 0; i < n; i++) {
    const row = Array(n).fill(0)
    row[i] = ridge
    rows.push(row)
    b.push(0)
  }
  const s = gaussSolve(rows, b)
  const strengths: RatingMap = {}
  teams.forEach((t, i) => (strengths[t] = round(s[i]!, 2)))
  const fittedSpreads = slate.map((g) => round(s[idx[g.home]!]! - s[idx[g.away]!]! + hfa, 2))
  return { strengths, fittedSpreads }
}

// ── 11. Stack with market ────────────────────────────────────────────────────

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
export function stackWithMarket(pModel: number, pMarket: number, w: number): number {
  const lg = (p: number) => Math.log(p / (1 - p))
  const z = w * lg(pModel) + (1 - w) * lg(pMarket)
  return 1 / (1 + Math.exp(-z))
}

// ── 12. Public hype valuation check ──────────────────────────────────────────

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
): { team: string; hypeDelta: number; material: boolean; direction: "public-overpriced" | "public-underpriced" | "aligned" } {
  const hypeDelta = modelWinProb - marketFairProb
  const material = Math.abs(hypeDelta) >= materialGap && publicTicketShare >= 0.6
  const direction: "public-overpriced" | "public-underpriced" | "aligned" =
    !material ? "aligned" : hypeDelta < 0 ? "public-overpriced" : "public-underpriced"
  return { team, hypeDelta: round(hypeDelta, 4), material, direction }
}

// ── 13. 2-state regime HMM ───────────────────────────────────────────────────

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
): { mu: [number, number]; sd: number; A: [[number, number], [number, number]]; hotProbLast: number; path: number[] } {
  const iters = opts.iters ?? 60
  const m0 = opts.m0 ?? [-3, 3]
  const sd0 = opts.sd0 ?? 10
  const T = x.length
  if (T === 0) throw new Error("hmm2RegimeFit: empty series")

  let A: [[number, number], [number, number]] = [
    [0.85, 0.15],
    [0.15, 0.85],
  ]
  const mu: [number, number] = [m0[0]!, m0[1]!]
  let sd = sd0
  const p0: [number, number] = [0.5, 0.5]

  const dens = (t: number, s: 0 | 1) =>
    Math.exp(-((x[t]! - mu[s]!) ** 2) / (2 * sd * sd)) / Math.sqrt(2 * Math.PI * sd * sd)

  let g: number[][] = []
  for (let iter = 0; iter < iters; iter++) {
    const al: number[][] = []
    const cs: number[] = []
    al.push([p0[0]! * dens(0, 0), p0[1]! * dens(0, 1)])
    cs.push(sum(al[0]!) || 1e-12)
    al[0] = al[0]!.map((v) => v / cs[0]!)
    for (let t = 1; t < T; t++) {
      const row = [0, 1].map(
        (s) => (al[t - 1]![0]! * A[0]![s as 0 | 1]! + al[t - 1]![1]! * A[1]![s as 0 | 1]!) * dens(t, s as 0 | 1),
      )
      const c = sum(row) || 1e-12
      al.push(row.map((v) => v / c))
      cs.push(c)
    }
    const be: number[][] = Array.from({ length: T }, () => [1, 1])
    for (let t = T - 2; t >= 0; t--) {
      for (let j = 0; j < 2; j++) {
        be[t]![j]! = 0
        for (let s = 0; s < 2; s++) {
          be[t]![j]! += A[j]![s]! * dens(t + 1, s as 0 | 1) * be[t + 1]![s]!
        }
      }
    }
    g = Array.from({ length: T }, (_, t) => [al[t]![0]! * be[t]![0]!, al[t]![1]! * be[t]![1]!])
    g = g.map((row) => row.map((v) => v / (sum(row) || 1e-12)))

    for (let s = 0; s < 2; s++) {
      let wsum = 0
      for (let t = 0; t < T; t++) wsum += g[t]![s]!
      wsum = wsum || 1e-12
      let mean = 0
      for (let t = 0; t < T; t++) mean += g[t]![s]! * x[t]!
      mu[s]! = mean / wsum
    }
    let variance = 0
    for (let t = 0; t < T; t++) {
      for (let s = 0; s < 2; s++) variance += g[t]![s]! * (x[t]! - mu[s]!) ** 2
    }
    variance /= T
    sd = Math.sqrt(Math.max(variance, 1e-4))
    for (let j = 0; j < 2; j++) {
      let den = 0
      for (let t = 0; t < T - 1; t++) den += g[t]![j]!
      den = den || 1e-12
      for (let s = 0; s < 2; s++) {
        let num = 0
        for (let t = 0; t < T - 1; t++) {
          num += (al[t]![j]! * A[j]![s]! * dens(t + 1, s as 0 | 1) * be[t + 1]![s]!) / (cs[t + 1]! || 1e-12)
        }
        A[j]![s]! = Math.max(0.01, Math.min(0.99, num / den))
      }
      const tot = A[j]![0]! + A[j]![1]!
      A[j]![0]! /= tot
      A[j]![1]! /= tot
    }
  }

  const filt = g.map((row) => row[1]!)
  return {
    mu: [round(mu[0]!, 2), round(mu[1]!, 2)],
    sd: round(sd, 2),
    A: [
      [round(A[0]![0]!, 2), round(A[0]![1]!, 2)],
      [round(A[1]![0]!, 2), round(A[1]![1]!, 2)],
    ],
    hotProbLast: round(filt[filt.length - 1] ?? 0.5, 3),
    path: filt.slice(-8).map((v) => round(v, 2)),
  }
}

// ── 14. Deflated Sharpe ──────────────────────────────────────────────────────

/**
 * Bailey & López de Prado's Deflated Sharpe Ratio. P(the backtest Sharpe is
 * real after "trials" attempts). The anti-self-deception engine: "I found an
 * edge" dies here or becomes a claim.
 *
 * Ported from `deflated_sharpe` in engine_math.py. Returns P(real) and the
 * expected-max Sharpe under pure noise.
 */
export function deflatedSharpe(sr: number, n: number, trials: number, skew = 0, kurt = 3): { pReal: number; sr0: number } {
  const gamma = 0.5772156649015329 // Euler–Mascheroni
  const varSr = (1 - skew * sr + ((kurt - 1) / 4) * sr * sr) / Math.max(n - 1, 1)
  const sdSr = Math.sqrt(varSr)
  const T = Math.max(trials, 1)
  const sr0 = sdSr * ((1 - gamma) * invNorm(1 - 1 / T) + gamma * invNorm(1 - 1 / (T * Math.E)))
  const z = ((sr - sr0) * Math.sqrt(Math.max(n - 1, 1))) / Math.sqrt(Math.max(1 - skew * sr + ((kurt - 1) / 4) * sr * sr, 1e-9))
  return { pReal: normCdf(z), sr0 }
}

// ── 15. Shin closed-form de-vig ──────────────────────────────────────────────

/**
 * Shin's insider-trading de-vig, closed-form inversion. π_i = (1−z)·p_i +
 * z·p_i²/S, with S = Σp². The existing `shinDevig` in devig.ts solves this by
 * root-finding; this exposes the fixed-point form directly so the two can be
 * cross-checked. Falls back to multiplicative on sub-1 books, where Shin
 * degenerates.
 */
export function shinDevigClosedForm(prices: readonly number[]): { z: number; probs: number[] } {
  const raw = prices.map((o) => (o > 0 ? 100 / (o + 100) : -o / (-o + 100)))
  const s = raw.reduce((a, b) => a + b, 0)
  if (s <= 1) {
    return { z: 0, probs: raw.map((p) => p / s) }
  }
  let lo = 1e-4
  let hi = 0.95
  let probs: number[] = raw
  for (let iter = 0; iter < 60; iter++) {
    const z = (lo + hi) / 2
    let S = 1
    let ps = raw.slice()
    for (let k = 0; k < 40; k++) {
      const next = ps.map((pi) => {
        const disc = (1 - z) ** 2 - (4 * z * pi) / S
        const d = Math.max(disc, 0)
        if (z <= 0) return pi
        return Math.max(0, (((1 - z) - Math.sqrt(d)) * S) / (2 * z))
      })
      ps = next
      S = ps.reduce((a, p) => a + p * p, 0) || 1e-9
    }
    const tot = ps.reduce((a, b) => a + b, 0)
    const valid = ps.every((p) => p > 0 && p < 1)
    if (!valid || tot > 1) hi = z
    else {
      lo = z
      probs = ps
    }
  }
  const z = (lo + hi) / 2
  if (!probs.every((p) => p > 0 && p < 1) || Math.abs(probs.reduce((a, b) => a + b, 0) - 1) > 0.05) {
    return { z: 0, probs: raw.map((p) => p / s) }
  }
  return { z: round(z, 6), probs }
}

// ── helpers ──────────────────────────────────────────────────────────────────

export function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

/** Abramowitz & Stegun 7.1.26 error function, good to ~1.5e-7. */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax)
  return sign * y
}

export function invNorm(u: number): number {
  let lo = -6
  let hi = 6
  for (let i = 0; i < 48; i++) {
    const m = (lo + hi) / 2
    if (normCdf(m) < u) lo = m
    else hi = m
  }
  return (lo + hi) / 2
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}

function round(x: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(x * f) / f
}
