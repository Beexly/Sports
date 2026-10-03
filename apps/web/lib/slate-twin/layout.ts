/**
 * Galaxy Slate Twin — spatial layout.
 *
 * The hardcoded `pos` on each demo game packs leagues within ~1 unit of one
 * another, so in the ALL-LEAGUES view the systems pile into the centre with
 * overlapping orbit rings. This module computes a *separated* layout instead:
 *
 *   - Each league becomes its own cluster, seated on a wide ring in the XZ
 *     plane (and lifted/dropped on Y) so clusters never overlap.
 *   - Within a cluster, games sit on a small local ring with a guaranteed
 *     minimum separation, so no two cores land on top of each other.
 *
 * Fully deterministic (no RNG, no Date) so it is stable across SSR/CSR and
 * unit-testable. Distances are tuned against MIN_SEPARATION, which the test
 * suite asserts holds for every pair of systems.
 */

import { LEAGUES, type TwinGame, type TwinLeague } from "./demo-slate";

export type Vec3 = readonly [number, number, number];

/** Every pair of systems is guaranteed to be at least this far apart. */
export const MIN_SEPARATION = 2.4;

/** Radius of the ring the league clusters are seated on. */
const LEAGUE_RING = 12.5;

/** Per-league vertical offset so clusters read as separated layers, not a disc. */
const LEAGUE_Y: Record<TwinLeague, number> = {
  NFL: 2.2,
  NBA: -1.8,
  MLB: 1.4,
  NHL: -2.6,
};

/** Local cluster radius grows with how many games the league holds. */
function clusterRadius(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 2.7;
  return 2.7 + (count - 2) * 0.55;
}

export type GalaxyLayout = {
  /** game id -> world position */
  readonly positions: ReadonlyMap<string, Vec3>;
  /** league -> cluster centre (camera target + constellation label anchor) */
  readonly leagueCenters: Readonly<Record<TwinLeague, Vec3>>;
  /** leagues that actually have games, in canonical order */
  readonly activeLeagues: readonly TwinLeague[];
};

/**
 * Compute a separated, collision-aware galaxy layout for a slate.
 * Pure and deterministic - same input always yields the same positions.
 */
export function computeGalaxyLayout(games: readonly TwinGame[]): GalaxyLayout {
  const activeLeagues = LEAGUES.filter((lg) => games.some((g) => g.league === lg));
  const L = Math.max(1, activeLeagues.length);

  const positions = new Map<string, Vec3>();
  const leagueCenters = {} as Record<TwinLeague, Vec3>;

  activeLeagues.forEach((league, li) => {
    // Seat the cluster on the wide ring. A half-step phase offset keeps an
    // even number of leagues from lining up front-to-back from the camera.
    const ringAngle = (li / L) * Math.PI * 2 + Math.PI / L;
    const cx = Math.cos(ringAngle) * LEAGUE_RING;
    const cz = Math.sin(ringAngle) * LEAGUE_RING;
    const cy = LEAGUE_Y[league] ?? 0;
    const center: Vec3 = [cx, cy, cz];
    leagueCenters[league] = center;

    const inLeague = games.filter((g) => g.league === league);
    const c = inLeague.length;
    const radius = clusterRadius(c);

    inLeague.forEach((g, gi) => {
      if (c === 1) {
        positions.set(g.id, center);
        return;
      }
      // Even ring placement + a per-cluster phase so clusters don't share the
      // same orientation, plus a gentle Y wave for volumetric depth.
      const a = (gi / c) * Math.PI * 2 + li * 0.7;
      const yWave = Math.sin(gi * 1.6 + li) * 0.9;
      positions.set(g.id, [cx + Math.cos(a) * radius, cy + yWave, cz + Math.sin(a) * radius]);
    });
  });

  // Leagues with no games still get a sensible centre (off the active ring).
  LEAGUES.forEach((lg, i) => {
    if (!leagueCenters[lg]) {
      const a = (i / LEAGUES.length) * Math.PI * 2;
      leagueCenters[lg] = [Math.cos(a) * LEAGUE_RING, LEAGUE_Y[lg] ?? 0, Math.sin(a) * LEAGUE_RING];
    }
  });

  return { positions, leagueCenters, activeLeagues };
}

/** Smallest distance between any two systems in a layout - used by tests. */
export function minPairwiseDistance(layout: GalaxyLayout): number {
  const pts = Array.from(layout.positions.values());
  let min = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i]!;
      const b = pts[j]!;
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (d < min) min = d;
    }
  }
  return min;
}
