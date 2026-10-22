/**
 * TEAG contraction and the named scalar gates from the approved 2026-10-21 plan.
 *
 * These are the formulas as specified, not a claim that a paper result was
 * reproduced or that a Navier–Stokes residual was measured.
 *
 * Phi+(h) = max(Phi-(h), psi(h))
 * falsifiability floor: N_k >= 1 - I_k
 * gamma_collapse = exp(-W / W0)
 * Toomre torsion tau = B / P, compared to TL = 0.136899099984016
 */

export const TOOMRE_TL = 0.136899099984016;

export function teagContraction(phiMinus: number, psi: number): number {
  if (!Number.isFinite(phiMinus) || !Number.isFinite(psi)) {
    throw new Error("teagContraction: non-finite input");
  }
  return Math.max(phiMinus, psi);
}

export function falsifiabilityFloorHolds(nK: number, iK: number): boolean {
  if (!Number.isFinite(nK) || !Number.isFinite(iK)) return false;
  return nK >= 1 - iK;
}

export function gaussianCollapseWeight(w: number, w0: number): number {
  if (!(w0 > 0) || !Number.isFinite(w) || w < 0) return Number.NaN;
  return Math.exp(-w / w0);
}

export function toomreTorsion(b: number, p: number): { tau: number; aboveTl: boolean } | null {
  if (!Number.isFinite(b) || !Number.isFinite(p) || p === 0) return null;
  const tau = b / p;
  return { tau, aboveTl: tau > TOOMRE_TL };
}

export interface GridResidual {
  readonly label: string;
  readonly residual: number;
}

/** STOPPED-FORCE gate: refinement must not increase the residual. */
export function multiScaleRefinementHolds(grids: readonly GridResidual[]): boolean {
  if (grids.length < 2) return false;
  for (const g of grids) {
    if (!Number.isFinite(g.residual) || g.residual < 0) return false;
  }
  for (let i = 1; i < grids.length; i++) {
    if (grids[i].residual > grids[i - 1].residual) return false;
  }
  return true;
}
