/**
 * Conformal prediction methods — GSE inventory + primitives (apply/product OFF by default).
 *
 * Distinct from ACI show/abstain (CONFORMAL_ABSTAIN_ENABLED):
 * - Map CI: stationary bootstrap or block Wilson on PAVA (uncertainty on p_cal)
 * - Split-conformal on residual |y - p| gives prediction sets for outcomes,
 *   not a CI on the map itself (coverage ≠ map CI)
 * - IVAP: multiprobability [p0,p1] via dual isotonic (package ivap.ts)
 * - Mondrian: group-conditional quantiles (sport|market or class)
 * - CQR: numeric lines only (cqr.ts)
 *
 * Binary side calibration stays Temp/Platt/Beta/PAVA/EB-τ for point p.
 * PROVEN eligibility stays frequentist Brier · ECE · Murphy RES on shown p.
 * Coverage does NOT raise RES and does NOT unlock PROVEN.
 */

export type ConformalMethodStatus = {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly implemented: "yes" | "partial" | "notes";
  readonly module: string;
  readonly productFlag: string;
  readonly defaultOn: false;
  readonly unlocksProven: false;
  readonly raisesRes: false;
};

/** Durable inventory — no re-research needed; status is code truth. */
export const CONFORMAL_METHODS: readonly ConformalMethodStatus[] = [
  {
    id: "split_residual",
    name: "Split conformal residual sets",
    role: "Binary: nonconformity |y−p|; set / width for outcome surprise",
    implemented: "yes",
    module: "apps/web/lib/calibration/conformal-calibration.ts",
    productFlag: "internal bake-off only",
    defaultOn: false,
    unlocksProven: false,
    raisesRes: false,
  },
  {
    id: "ivap",
    name: "Inductive Venn–Abers (IVAP)",
    role: "Multiprobability [p0,p1] via dual PAVA; width = epistemic uncertainty",
    implemented: "yes",
    module: "packages/prediction-engine/src/calibration/ivap.ts",
    productFlag: "CONFORMAL_ABSTAIN optional consumer; default off",
    defaultOn: false,
    unlocksProven: false,
    raisesRes: false,
  },
  {
    id: "cvap",
    name: "Cross Venn–Abers (CVAP)",
    role: "Cross-fold Venn–Abers; heavier; multi-class extensions offline",
    implemented: "partial",
    module: "packages/prediction-engine/src/calibration/cvap.ts",
    productFlag: "R&D only",
    defaultOn: false,
    unlocksProven: false,
    raisesRes: false,
  },
  {
    id: "mondrian",
    name: "Mondrian / group-conditional conformal",
    role: "Per sport|market (or class) quantile — conditional coverage if exchangeable in group",
    implemented: "yes",
    module: "apps/web/lib/calibration/conformal-calibration.ts",
    productFlag: "internal; thin groups → wide thresholds",
    defaultOn: false,
    unlocksProven: false,
    raisesRes: false,
  },
  {
    id: "aci",
    name: "Adaptive conformal inference (ACI) abstain",
    role: "Online α adaptation for show/abstain only; α clipped [0.02,0.40]",
    implemented: "yes",
    module: "apps/web/lib/calibration/aci-state.ts + aci-durable.ts",
    productFlag: "CONFORMAL_ABSTAIN_ENABLED",
    defaultOn: false,
    unlocksProven: false,
    raisesRes: false,
  },
  {
    id: "cqr",
    name: "Conformalized quantile regression",
    role: "Numeric y (spreads/totals/props) intervals — not binary side maps",
    implemented: "yes",
    module: "apps/web/lib/calibration/cqr.ts",
    productFlag: "numeric product layer only",
    defaultOn: false,
    unlocksProven: false,
    raisesRes: false,
  },
  {
    id: "bootstrap_map",
    name: "Stationary bootstrap map bands",
    role: "Uncertainty bands on calibration map p_cal(s) — not RES",
    implemented: "partial",
    module: "apps/web/lib/calibration/bootstrap-calib-ci.ts",
    productFlag: "internal CI only",
    defaultOn: false,
    unlocksProven: false,
    raisesRes: false,
  },
] as const;

export const CONFORMAL_CALIBRATION_NOTES = {
  mapUncertainty: "stationary-bootstrap or Wilson-on-blocks (internal)",
  outcomeSets: "split-conformal residual sets — coverage on y, not map CI",
  aciAbstain: "CONFORMAL_ABSTAIN_ENABLED — show/abstain only; never publish",
  provenEligibility: "still frequentist Brier · ECE · Murphy RES on shown p",
  qrfNumeric: "QRF/CQR for spreads/totals/props only — skip for binary side cal",
  exchangeability:
    "Sports time series ≈ exchangeable only approximately — use time-ordered splits; treat coverage as diagnostic",
  resIndependence: "No conformal method raises Murphy RES or clears PROVEN floors",
} as const;

/** Nonconformity for binary: |y - p|. Higher = more surprising. */
export function residualNonconformity(p: number, y: 0 | 1): number {
  return Math.abs(y - Math.min(1, Math.max(0, p)));
}

/**
 * Finite-sample conformal quantile (split CP):
 * rank = ceil((1-α)(n+1)) − 1, clamped to [0, n−1].
 * Standard inductive conformal formula (Vovk et al.).
 */
export function conformalQuantile(
  scores: readonly number[],
  alpha: number,
): number {
  const n = scores.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  const a = Math.min(1, Math.max(0, alpha));
  const sorted = [...scores].sort((x, y) => x - y);
  const rank = Math.ceil((1 - a) * (n + 1)) - 1;
  const idx = Math.min(n - 1, Math.max(0, rank));
  return sorted[idx]!;
}

/**
 * Split-conformal absolute residual threshold (internal).
 * Returns q̂ such that P(|Y−p| ≤ q̂) ≳ 1−α under exchangeability.
 */
export function splitConformalResidualThreshold(
  residuals: readonly number[],
  alpha = 0.1,
): number {
  if (residuals.length === 0) return 1;
  return conformalQuantile(residuals, alpha);
}

/**
 * Mondrian (group-conditional) residual thresholds.
 * Thin groups inherit infinite threshold (always “surprise”) unless n≥minN.
 */
export function mondrianResidualThresholds(
  rows: readonly { group: string; residual: number }[],
  alpha = 0.1,
  minN = 20,
): Record<string, number> {
  const by = new Map<string, number[]>();
  for (const r of rows) {
    const arr = by.get(r.group) ?? [];
    arr.push(r.residual);
    by.set(r.group, arr);
  }
  const out: Record<string, number> = {};
  for (const [g, scores] of by) {
    out[g] =
      scores.length >= minN ? conformalQuantile(scores, alpha) : Number.POSITIVE_INFINITY;
  }
  return out;
}

/** Clip α for ACI-style controllers — GSE design band. */
export function clipConformalAlpha(
  alpha: number,
  lo = 0.02,
  hi = 0.4,
): number {
  return Math.min(hi, Math.max(lo, alpha));
}

/**
 * Ops-truth conformal posture — fully autonomous status, no founder research.
 */
export function conformalRdPosture(env: Record<string, string | undefined> = process.env) {
  const abstainOn = env["CONFORMAL_ABSTAIN_ENABLED"]?.trim().toLowerCase() === "true";
  return {
    methods: CONFORMAL_METHODS,
    notes: CONFORMAL_CALIBRATION_NOTES,
    product: {
      conformalAbstainEnabled: abstainOn,
      defaultOff: true,
      unlocksProven: false,
      raisesRes: false,
    },
    nextAutonomous:
      "Keep flags OFF. Use IVAP width / residual thresholds only after ranking RES improves if product wants abstain UX.",
  };
}
