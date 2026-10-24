/**
 * Team-Elo baseline matching fivethirtyeight/nfl-elo-game forecast.py (MIT).
 * Winner-signed margin multiplier. No quarterback term. Not a coach projection.
 */

export const HFA = 65
export const K = 20
export const REVERT = 1 / 3
export const REVERT_MEAN = 1505

export const REVERSIONS: Record<string, number> = {
  CBD1925: 1502.032,
  RAC1926: 1403.384,
  LOU1926: 1307.201,
  CIB1927: 1362.919,
  MNN1929: 1306.702,
  BFF1929: 1331.943,
  LAR1944: 1373.977,
  PHI1944: 1497.988,
  ARI1945: 1353.939,
  PIT1945: 1353.939,
  CLE1999: 1300,
}

export type EloGame = {
  team1: string
  team2: string
  season: string | number
  neutral?: boolean | 0 | 1 | "0" | "1"
  score1: number | null
  score2: number | null
  result1: number | null
}

type Side = { name: string; elo: number; season: string | null }

export function winProb(eloDiff: number): number {
  return 1 / (10 ** (-eloDiff / 400) + 1)
}

/** Published form. A tie uses denominator 1, not 2.2. Sign follows the winner, not |Δ|. */
export function movMultiplier(pointDiff: number, eloDiff: number, result1: number): number {
  const pd = Math.abs(pointDiff)
  const denom = result1 === 0.5 ? 1 : (result1 === 1 ? eloDiff : -eloDiff) * 0.001 + 2.2
  return Math.log(Math.max(pd, 1) + 1) * (2.2 / denom)
}

/** The wrong simplification. Tests require this to diverge on upsets. */
export function absDeltaMultiplier(pointDiff: number, eloDiff: number): number {
  const pd = Math.abs(pointDiff)
  return Math.log(Math.max(pd, 1) + 1) * (2.2 / (Math.abs(eloDiff) * 0.001 + 2.2))
}

function neutral(flag: EloGame["neutral"]): boolean {
  return flag === true || flag === 1 || flag === "1"
}

function ensure(map: Map<string, Side>, name: string): Side {
  let side = map.get(name)
  if (!side) {
    side = { name, elo: REVERT_MEAN, season: null }
    map.set(name, side)
  }
  return side
}

function revert(side: Side, season: string) {
  if (side.season && side.season !== season) {
    const key = `${side.name}${season}`
    const pinned = REVERSIONS[key]
    side.elo = pinned ?? REVERT_MEAN * REVERT + side.elo * (1 - REVERT)
  }
  side.season = season
}

export type ReplayRow = { prob1: number; elo1: number; elo2: number; shift: number }

export function replay(games: EloGame[], initial: Record<string, number> = {}): ReplayRow[] {
  const map = new Map<string, Side>()
  for (const [name, elo] of Object.entries(initial)) {
    map.set(name, { name, elo, season: null })
  }
  const rows: ReplayRow[] = []
  for (const game of games) {
    const a = ensure(map, game.team1)
    const b = ensure(map, game.team2)
    const season = String(game.season)
    revert(a, season)
    revert(b, season)
    const eloDiff = a.elo - b.elo + (neutral(game.neutral) ? 0 : HFA)
    const prob1 = winProb(eloDiff)
    let shift = 0
    if (game.score1 != null && game.score2 != null && game.result1 != null) {
      const mult = movMultiplier(game.score1 - game.score2, eloDiff, game.result1)
      shift = K * mult * (game.result1 - prob1)
      a.elo += shift
      b.elo -= shift
    }
    rows.push({ prob1, elo1: a.elo, elo2: b.elo, shift })
  }
  return rows
}

export function publicPrior(args: { site: "BAL" | "CIN"; eloBal?: number; eloCin?: number }): {
  pHome: number
  pBal: number
  note: string
} {
  const eloBal = args.eloBal ?? REVERT_MEAN
  const eloCin = args.eloCin ?? REVERT_MEAN
  const elo1 = args.site === "BAL" ? eloBal : eloCin
  const elo2 = args.site === "BAL" ? eloCin : eloBal
  const pHome = winProb(elo1 - elo2 + HFA)
  return {
    pHome,
    pBal: args.site === "BAL" ? pHome : 1 - pHome,
    note: "538 team Elo. Equal ratings are home field only. No QB term. Not the coach projection.",
  }
}
