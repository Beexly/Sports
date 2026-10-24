/**
 * Showdown rules the desk enforces.
 * The full MILP, stacking, and exposure engine is pydfs-lineup-optimizer (MIT).
 * Projections come from the coach sim, not from a commercial feed.
 */

export const SHOWDOWN_CAP = 50_000
export const SHOWDOWN_SLOTS = 6
export const CAPTAIN_MULT = 1.5

export function captainSalary(salary: number): number {
  return Math.round(salary * CAPTAIN_MULT)
}

export function captainPoints(points: number): number {
  return points * CAPTAIN_MULT
}

export function underCap(used: number, add: number, cap = SHOWDOWN_CAP): boolean {
  return used + add <= cap
}

export function withinTeamLimit(counts: Readonly<Record<string, number>>, team: string, maxFromTeam: number): boolean {
  return (counts[team] ?? 0) < maxFromTeam
}
