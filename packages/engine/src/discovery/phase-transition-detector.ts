/**
 * DISCOVERY LAYER — Phase Transition Detector (Invention 31).
 *
 * Edges may not appear smoothly — they appear at PHASE TRANSITIONS, where the market's pricing
 * regime changes: questionable→doubtful, backup-expected→confirmed, wind 12→22mph, committee→
 * bell-cow, low-attention→primetime flood, thin→sudden liquidity. At the threshold the implied
 * distribution should reshape; if the book updates the median but not the tail, the alt ladder
 * fractures — and that fracture is a candidate. The framing is not "RB over" but "the market
 * crossed a role-state phase boundary and one derivative surface did not."
 *
 * Pure + deterministic.
 */

export interface PhaseSignals {
  /** Change in cross-book dispersion (rising = approaching a transition) [-1,1]. */
  readonly dispersionDelta: number;
  /** Correction speed after recent shocks (falling = stress) [0,1]. */
  readonly correctionSpeed: number;
  /** Alt-ladder curvature instability [0,1]. */
  readonly altCurvatureInstability: number;
  /** Desync between main and derivative markets [0,1]. */
  readonly mainDerivativeDesync: number;
  /** Attention acceleration [0,1]. */
  readonly attentionAcceleration: number;
  /** Liquidity thinning [0,1]. */
  readonly liquidityThinning: number;
}

export interface PhaseTransitionVerdict {
  readonly transitionDetected: boolean;
  readonly intensity: number; // 0..1
  readonly earlyWarnings: readonly string[];
  readonly note: string;
}

/** Detect an approaching/active market phase transition from early-warning signals. */
export function detectPhaseTransition(s: PhaseSignals, options: { threshold?: number } = {}): PhaseTransitionVerdict {
  const threshold = options.threshold ?? 0.4;
  const warnings: Array<{ w: string; v: number }> = [
    { w: "rising book dispersion", v: Math.max(0, s.dispersionDelta) },
    { w: "slowing correction after shocks", v: 1 - s.correctionSpeed },
    { w: "alt-ladder curvature instability", v: s.altCurvatureInstability },
    { w: "main↔derivative desynchronization", v: s.mainDerivativeDesync },
    { w: "attention acceleration", v: s.attentionAcceleration },
    { w: "liquidity thinning", v: s.liquidityThinning },
  ];
  const active = warnings.filter((x) => x.v >= 0.5).map((x) => x.w);
  const intensity = warnings.reduce((sum, x) => sum + x.v, 0) / warnings.length;
  return {
    transitionDetected: intensity >= threshold,
    intensity,
    earlyWarnings: active,
    note: intensity >= threshold ? "Market is near/at a phase transition — pricing regime may be reshaping; watch for derivative-surface fractures." : "No phase-transition signature.",
  };
}

export interface RoleBoundary {
  readonly name: string;
  /** Role magnitude (0..1) before and after; a boundary is crossed if they fall in different bands. */
  readonly before: number;
  readonly after: number;
  /** Band edges, e.g. [0.33, 0.5, 0.7] for committee→rotation→bell-cow. */
  readonly bands: readonly number[];
}

/** Did a player's role cross a phase boundary (e.g. committee → bell-cow)? */
export function crossedRoleBoundary(rb: RoleBoundary): { crossed: boolean; fromBand: number; toBand: number } {
  const band = (x: number) => rb.bands.filter((b) => x >= b).length;
  const fromBand = band(rb.before);
  const toBand = band(rb.after);
  return { crossed: fromBand !== toBand, fromBand, toBand };
}
