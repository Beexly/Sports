/**
 * GSE GALILEO — Alt-Line Geometry (Invention 6).
 *
 * Re-exports the tested alt-line curvature engine and adds two comparators the spec calls for:
 * a book ladder vs the CONSENSUS ladder (which book's tail diverges from the field), and a
 * ladder vs ROLE-STATE VOLATILITY (a tail too thin for a volatile role is a cheap-tail
 * candidate; too fat for a stable role is overpriced). Main lines are watched; tail ladders
 * are weaker — this is a high-upside lane. Pure.
 */

export * from "../market-physics/alt-line-curvature.js";
import { checkAltLadder, type AltRung, type CurvatureFlag } from "../market-physics/alt-line-curvature.js";

export interface LadderDivergence {
  readonly point: number;
  readonly bookOverImplied: number;
  readonly consensusOverImplied: number;
  readonly deltaImplied: number;
  readonly note: string;
}

/**
 * Compare a single book's alt ladder against the consensus ladder rung-by-rung; flag rungs
 * where the book's implied survival diverges from consensus by more than `tol`. A tail rung
 * the book prices far cheaper than the field is a stale/soft-tail candidate.
 */
export function compareToConsensusLadder(
  bookLadder: readonly AltRung[],
  consensusLadder: readonly AltRung[],
  tol = 0.03,
): LadderDivergence[] {
  const cons = new Map(consensusLadder.map((r) => [r.point, r.overImplied]));
  const out: LadderDivergence[] = [];
  for (const r of bookLadder) {
    const c = cons.get(r.point);
    if (c == null) continue;
    const delta = r.overImplied - c;
    if (Math.abs(delta) > tol) {
      out.push({
        point: r.point,
        bookOverImplied: r.overImplied,
        consensusOverImplied: c,
        deltaImplied: delta,
        note: `${delta > 0 ? "richer" : "cheaper"} than consensus by ${(Math.abs(delta) * 100).toFixed(1)}pp`,
      });
    }
  }
  return out;
}

export interface GeometryVsVolatility {
  readonly curvatureFlags: readonly CurvatureFlag[];
  /** Tail width implied by the ladder (P(>highRung)); compare to role volatility. */
  readonly tailWeight: number;
  readonly verdict: "tail_too_thin_for_role" | "tail_too_fat_for_role" | "consistent" | "insufficient";
  readonly note: string;
}

/**
 * Compare a ladder's tail weight to a player's role volatility (0..1). A volatile role should
 * carry a FATTER tail (bigger ceiling/floor); a ladder with a thin tail under high volatility
 * is a cheap-tail candidate, and a fat tail under a stable role is overpriced.
 */
export function compareToRoleVolatility(ladder: readonly AltRung[], roleVolatility: number): GeometryVsVolatility {
  const curvatureFlags = checkAltLadder(ladder);
  const sorted = [...ladder].sort((a, b) => a.point - b.point);
  if (sorted.length < 3) {
    return { curvatureFlags, tailWeight: 0, verdict: "insufficient", note: "Ladder too short to judge tail." };
  }
  const tailWeight = sorted.at(-1)!.overImplied; // survival at the highest rung
  // Heuristic bands: expected tail weight scales with volatility.
  const expectedTail = 0.05 + 0.15 * roleVolatility;
  if (tailWeight < expectedTail * 0.6) {
    return { curvatureFlags, tailWeight, verdict: "tail_too_thin_for_role", note: `Tail ${(tailWeight * 100).toFixed(1)}% is thin for role volatility ${roleVolatility.toFixed(2)} — cheap-tail candidate.` };
  }
  if (tailWeight > expectedTail * 1.6) {
    return { curvatureFlags, tailWeight, verdict: "tail_too_fat_for_role", note: `Tail ${(tailWeight * 100).toFixed(1)}% is fat for role volatility ${roleVolatility.toFixed(2)} — overpriced tail.` };
  }
  return { curvatureFlags, tailWeight, verdict: "consistent", note: "Tail weight consistent with role volatility." };
}
