/**
 * Isotonic regression alternatives — selection matrix for offline use.
 * Not a second PAVA implementation. Points at existing CIR / local patch / parametric maps.
 *
 * Apply OFF until RES + holdout floors improve. CALIBRATION_ADJUSTMENTS stays false.
 */

export type IsotonicSituation =
  | "smooth_global_rescale"
  | "monotone_weird_shape"
  | "thin_tails"
  | "hierarchical_markets"
  | "small_n"
  | "ranking_ok_levels_wrong"
  | "group_bin_violation"
  | "need_identity_preserving";

export type IsotonicAlternative = {
  readonly situation: IsotonicSituation;
  readonly prefer: string;
  readonly existingModule: string;
  readonly why: string;
  readonly raisesRes: false;
};

/**
 * Alternatives to plain PAVA already in-tree (do not re-implement).
 */
export const ISOTONIC_ALTERNATIVES: readonly IsotonicAlternative[] = [
  {
    situation: "smooth_global_rescale",
    prefer: "Temperature scaling (1-param) or Platt MAP IRLS",
    existingModule: "temperature-scaling.ts / platt-map.ts",
    why: "One global T or (A,B) avoids PAVA plateaus destroying ranking/Kelly resolution",
    raisesRes: false,
  },
  {
    situation: "monotone_weird_shape",
    prefer: "Isotonic PAVA + optional CIR",
    existingModule: "isotonic-pava.ts / probability-calibration centeredIsotonic",
    why: "Nonparametric monotone CEP; CIR collapses plateaus to mass centers for finer ranking",
    raisesRes: false,
  },
  {
    situation: "thin_tails",
    prefer: "Platt or Temperature — avoid isotonic plateaus",
    existingModule: "platt-scaling.ts / temperature-map.ts",
    why: "Sparse extremes make PAVA steps unreliable; parametric shrinks tails",
    raisesRes: false,
  },
  {
    situation: "hierarchical_markets",
    prefer: "Platt/logistic + EB-τ group intercepts u_g",
    existingModule: "hierarchical-eb-tau.ts",
    why: "sport|market structure with shared global slope; fixed keys, auditable",
    raisesRes: false,
  },
  {
    situation: "small_n",
    prefer: "Platt MAP or Temperature with prior",
    existingModule: "calibration-map.ts plattScaling / fitTemperature",
    why: "2–3 params vs O(n) isotonic steps; lower variance on thin settle samples",
    raisesRes: false,
  },
  {
    situation: "ranking_ok_levels_wrong",
    prefer: "Isotonic PAVA or Beta calibration",
    existingModule: "isotonic-pava.ts / betaCalibration in calibration-map.ts",
    why: "When separation exists, monotone map fixes levels; Beta can leave identity alone",
    raisesRes: false,
  },
  {
    situation: "group_bin_violation",
    prefer: "Local isotonic patch (multicalib audit)",
    existingModule: "packages/prediction-engine/src/calibration/local-isotonic-patch.ts",
    why: "Soft λ-blend local PAV on group×bin only — not full global re-isotonic",
    raisesRes: false,
  },
  {
    situation: "need_identity_preserving",
    prefer: "Beta calibration (a=b=1,c=0 in family)",
    existingModule: "calibration-map.ts betaCalibration",
    why: "Platt cannot represent identity; Beta can leave already-calibrated scores alone",
    raisesRes: false,
  },
] as const;

export function recommendIsotonicAlternative(
  situation: IsotonicSituation,
): IsotonicAlternative {
  const hit = ISOTONIC_ALTERNATIVES.find((a) => a.situation === situation);
  return hit ?? ISOTONIC_ALTERNATIVES[1]!;
}
