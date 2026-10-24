/**
 * Kernels taken from the research triage that this engine can run exactly.
 * The sheet has 1,343 papers. These four are the ones with a formula we can test.
 * They do not read a betting line.
 */

export function brierScore(rows: readonly { p: number; y: 0 | 1 }[]): number | null {
  if (rows.length === 0) return null
  let sum = 0
  for (const row of rows) {
    if (!(row.p >= 0 && row.p <= 1)) return null
    const gap = row.p - row.y
    sum += gap * gap
  }
  return sum / rows.length
}

export type ReliabilityBin = { lo: number; hi: number; n: number; meanP: number; meanY: number }

/** Equal-width bins. Empty bins are omitted. A calibrated bin has meanP near meanY. */
export function reliabilityBins(rows: readonly { p: number; y: 0 | 1 }[], bins = 10): ReliabilityBin[] | null {
  if (bins < 1) return null
  const counts = Array.from({ length: bins }, () => ({ n: 0, p: 0, y: 0 }))
  for (const row of rows) {
    if (!(row.p >= 0 && row.p <= 1)) return null
    const index = Math.min(bins - 1, Math.floor(row.p * bins))
    const bin = counts[index]!
    bin.n += 1
    bin.p += row.p
    bin.y += row.y
  }
  const out: ReliabilityBin[] = []
  for (let i = 0; i < bins; i++) {
    const bin = counts[i]!
    if (bin.n === 0) continue
    out.push({
      lo: i / bins,
      hi: (i + 1) / bins,
      n: bin.n,
      meanP: bin.p / bin.n,
      meanY: bin.y / bin.n,
    })
  }
  return out
}

/**
 * Page's one-sided CUSUM on a residual series.
 * This is not the functional CUSUM in arXiv:2602.13152. It is the break test the engine can run today.
 */
export function pageCusum(series: readonly number[], drift: number, threshold: number): { breakAt: number | null } {
  let level = 0
  for (let i = 0; i < series.length; i++) {
    level = Math.max(0, level + series[i]! - drift)
    if (level >= threshold) return { breakAt: i }
  }
  return { breakAt: null }
}

function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let value = 1
  for (let i = 1; i <= k; i++) value = (value * (n - k + i)) / i
  return value
}

/** P(the favorite wins a best-of series) when each game is an independent coin with probability p. */
export function seriesWinProb(p: number, bestOf: number): number | null {
  if (!(p >= 0 && p <= 1) || bestOf < 1 || bestOf % 2 === 0) return null
  const need = (bestOf + 1) / 2
  let total = 0
  for (let wins = need; wins <= bestOf; wins++) {
    total += binom(bestOf, wins) * p ** wins * (1 - p) ** (bestOf - wins)
  }
  return total
}

export type SeasonGame = { home: number; away: number; pHome: number }

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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
): number | null {
  if (teams < 2 || best < 0 || best >= teams || sims < 1) return null
  const random = mulberry32(seed)
  let titles = 0
  for (let sim = 0; sim < sims; sim++) {
    const wins = Array.from({ length: teams }, () => 0)
    for (const game of games) {
      if (game.home < 0 || game.away < 0 || game.home >= teams || game.away >= teams) return null
      if (!(game.pHome >= 0 && game.pHome <= 1)) return null
      if (random() < game.pHome) wins[game.home]! += 1
      else wins[game.away]! += 1
    }
    const top = Math.max(...wins)
    const leaders = wins.filter((win) => win === top).length
    if (leaders === 1 && wins[best] === top) titles += 1
  }
  return titles / sims
}
