/**
 * DISCOVERY LAYER — Belief Geodesic Mapper (Invention 30).
 *
 * A market does not jump randomly from belief A to belief B — it travels a PATH through probability
 * space. This maps that path from open to close and measures its geometry: length, curvature,
 * reversals, speed, and efficiency. A straight smooth path means normal absorption; a jagged path
 * means uncertainty, conflict, or manipulation; a path that lengthens as information IMPROVES means
 * market confusion. Line movement becomes geometry: not "-3 to -4" but "an inefficient belief path."
 *
 * Pure + deterministic. Belief is a probability in (0,1); distance is along that axis.
 */

export interface BeliefPoint {
  readonly timestamp: string;
  /** Belief as a probability in (0,1). */
  readonly belief: number;
}

export interface GeodesicMetrics {
  readonly n: number;
  /** Total absolute travel Σ|B_{t+1} − B_t|. */
  readonly pathLength: number;
  /** Net displacement |B_end − B_start|. */
  readonly displacement: number;
  /** displacement / pathLength: 1 = perfectly straight, →0 = maximally jagged. */
  readonly efficiency: number;
  /** Number of direction reversals along the path. */
  readonly reversals: number;
  /** Mean |Δbelief| per minute. */
  readonly speedPerMin: number;
  /** A coarse curvature proxy: reversals / pathLength. */
  readonly curvature: number;
}

const ms = (iso: string): number => Date.parse(iso);

/** Map the belief path's geometry. */
export function mapGeodesic(path: readonly BeliefPoint[]): GeodesicMetrics {
  const pts = [...path].filter((p) => Number.isFinite(ms(p.timestamp)) && p.belief > 0 && p.belief < 1).sort((a, b) => ms(a.timestamp) - ms(b.timestamp));
  const n = pts.length;
  if (n < 2) return { n, pathLength: 0, displacement: 0, efficiency: 1, reversals: 0, speedPerMin: 0, curvature: 0 };

  let pathLength = 0;
  let reversals = 0;
  let lastDir = 0;
  for (let i = 1; i < n; i++) {
    const d = pts[i]!.belief - pts[i - 1]!.belief;
    pathLength += Math.abs(d);
    const dir = Math.sign(d);
    if (dir !== 0 && lastDir !== 0 && dir !== lastDir) reversals += 1;
    if (dir !== 0) lastDir = dir;
  }
  const displacement = Math.abs(pts.at(-1)!.belief - pts[0]!.belief);
  const minutes = (ms(pts.at(-1)!.timestamp) - ms(pts[0]!.timestamp)) / 60_000 || 1;
  return {
    n,
    pathLength,
    displacement,
    efficiency: pathLength === 0 ? 1 : displacement / pathLength,
    reversals,
    speedPerMin: pathLength / minutes,
    curvature: pathLength === 0 ? 0 : reversals / pathLength,
  };
}

/** Correction energy: how much "work" a stale frame must do to reach consensus. */
export function correctionEnergy(staleBelief: number, consensusBelief: number, liquidityPressure: number, timeSensitivity: number): number {
  return Math.abs(consensusBelief - staleBelief) * liquidityPressure * timeSensitivity;
}
