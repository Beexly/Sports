/**
 * Marchenko-Pastur bulk and a BBP-style outside-bulk flag.
 * An eigenvalue is flagged only when the factor is public and not already priced.
 * σ² is the noise scale. γ = p / n. Edges are σ² (1 ± √γ)².
 */

export function marchenkoPasturEdges(sigma2: number, gamma: number): { lower: number; upper: number } | null {
  if (!(sigma2 > 0) || !(gamma > 0)) return null
  const root = Math.sqrt(gamma)
  return {
    lower: sigma2 * (1 - root) * (1 - root),
    upper: sigma2 * (1 + root) * (1 + root),
  }
}

export function flagOutsideBulk(
  eigenvalue: number,
  edges: { lower: number; upper: number },
  opts: { public: boolean; priced: boolean },
): { flag: boolean; reason: "not-public" | "already-priced" | "inside-bulk" | "outside-bulk" } {
  if (!opts.public) return { flag: false, reason: "not-public" }
  if (opts.priced) return { flag: false, reason: "already-priced" }
  if (!Number.isFinite(eigenvalue)) return { flag: false, reason: "inside-bulk" }
  if (eigenvalue < edges.lower || eigenvalue > edges.upper) return { flag: true, reason: "outside-bulk" }
  return { flag: false, reason: "inside-bulk" }
}
