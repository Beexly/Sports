/**
 * Server-side enforcement for the depth-limited fantasy FREE trial.
 *
 * The live graded pool (real, model-derived projections) is the paid Fantasy-suite
 * value. CLAUDE.md rule 3 is absolute: **no frontend-only paywalls — enforcement is
 * server-side**. A client-side `.slice()` does not enforce anything because the full
 * pool would still be serialized into the FREE client's payload and readable from the
 * network response. So the trim must happen on the SERVER, before the data crosses to
 * the client: a FREE viewer receives only the trial subset; the board's client-side cap
 * is then merely presentation.
 *
 * The trial is a real, useful preview (not a hard lock — the tools were free, so a
 * takeaway is off the table per ENTITLEMENT_REMAP_SPEC): the top `perPosition` players
 * at each position. Pure + deterministic (stable id tie-break) so SSR output is stable.
 */

import { type Player, POSITIONS } from "./players";

/** Depth shown per position in the FREE trial board; the rest is the paid suite. */
export const FREE_BOARD_DEPTH = 12;

/**
 * The subset of a live pool a FREE viewer may receive: the top `perPosition` players
 * per position by season projection. Returns a fresh array; never mutates the input.
 */
export function freeTrialPool(
  pool: readonly Player[],
  perPosition: number = FREE_BOARD_DEPTH,
): Player[] {
  const keep = Math.max(0, perPosition);
  const out: Player[] = [];
  for (const pos of POSITIONS) {
    const atPos = pool
      .filter((p) => p.pos === pos)
      .sort((a, b) => b.proj - a.proj || a.id.localeCompare(b.id))
      .slice(0, keep);
    out.push(...atPos);
  }
  return out;
}

/**
 * Resolve the pool to hand a viewer for a gated fantasy tool. Full pool for paid
 * viewers; the trial subset for FREE; `undefined` (illustrative demo) passes through
 * untouched — demo data is fictional, so it carries no paywall obligation.
 */
export function poolForViewer(
  pool: readonly Player[] | undefined,
  canUseFantasyFull: boolean,
): readonly Player[] | undefined {
  if (!pool || canUseFantasyFull) return pool;
  return freeTrialPool(pool);
}
