/** Edges that already failed a public test. They stay closed until a pre-registered sample beats them. */

export type KilledEdge = {
  id: string
  r: number
  n: number
  status: "killed"
  note: string
}

export const KILLED_EDGES: readonly KilledEdge[] = [
  {
    id: "steam",
    r: 0.005,
    n: 193,
    status: "killed",
    note: "cycle26. Correlation with the close is noise. Not an edge.",
  },
]

export function mayReopen(edge: KilledEdge, next: { r: number; n: number; preregistered: boolean }): boolean {
  if (!next.preregistered) return false
  if (next.n <= edge.n) return false
  return Math.abs(next.r) > Math.max(0.05, Math.abs(edge.r) * 4)
}
