/**
 * Edge engine — the part that makes picks *smarter*, not just confident.
 *
 * THE PROBLEM IT FIXES
 * The legacy scorer derives "fair value" and "edge" entirely from the sportsbook
 * itself: fairProb = de-vigged average of the books' own prices, edge = fairProb
 * − offeredProb. That measures the vig and cross-book scatter, not an opinion —
 * the market grading itself. You cannot beat the close by re-pricing the close.
 *
 * THE FIX — INDEPENDENT ESTIMATORS, MARKET AS BENCHMARK, CLV AS JUDGE
 * Real edge is the gap between an estimate the market has NOT already absorbed
 * and the market's fair price. So this engine takes one or more *independent*
 * estimators — the Poisson model (poisson.ts) and the Kalshi exchange (an
 * independent market, not the sportsbook) — and surfaces a pick only when they:
 *   1. diverge from the sportsbook's de-vigged fair probability, AND
 *   2. agree with each OTHER on the direction of that divergence, AND
 *   3. clear an evidence/uncertainty-shrunk edge threshold.
 * Using a second, independent market as a *referee* on our own model is the part
 * tout tools don't do: if the exchange agrees with the sportsbook, our model is
 * the outlier and we pass rather than fade the world on one signal.
 *
 * The honest default is silence. With no independent estimate we PASS — we never
 * manufacture an edge from the market's own price. Every surfaced pick carries an
 * expected-CLV number, because beating the close is the claim we actually make.
 *
 * Pure functions, no I/O — fully unit-testable. Sign convention: all probabilities
 * are P(the side under consideration is correct), in [0, 1].
 */

import { clamp } from "./scoring.js";

/** Edge below this (after shrink) → PASS. Above LEAN_EDGE → LEAN; above SPEAK_EDGE → SPEAK. */
export const SPEAK_EDGE = 0.025; // +2.5 pts of shrunk edge to publish a pick
export const LEAN_EDGE = 0.012; // +1.2 pts to register a soft lean
/** Below this magnitude an estimator is treated as agreeing with the market (no divergence). */
const DIRECTION_EPSILON = 0.005;

export interface IndependentEstimate {
  /** Where this estimate came from — must NOT be the sportsbook line itself. */
  readonly source: string; // e.g. "poisson", "kalshi"
  /** Independent P(side is correct), in [0, 1]. */
  readonly prob: number;
  /** Relative trust weight (default 1). */
  readonly weight?: number;
}

export interface EdgeInput {
  /** Sportsbook de-vigged fair probability for the side (from removeVig). */
  readonly marketFairProb: number;
  /** Independent estimators that did not look at the sportsbook price. */
  readonly independents: readonly IndependentEstimate[];
  /** Model/market uncertainty in [0, 1] (1 = maximally uncertain) — shrinks edge. */
  readonly uncertainty?: number;
  /** Evidence health in [0, 100] — shrinks edge when thin. */
  readonly evidenceScore?: number;
  /**
   * Was the two-way book market internally consistent (overround ≥ 1)? A sub-vig
   * book (crossed/stale/mixed formats) manufactures spurious positive edge — we
   * refuse to credit it, mirroring computeEdgeScore's guard.
   */
  readonly marketConsistent?: boolean;
}

export type EdgeDecision = "SPEAK" | "LEAN" | "PASS";
/** How the independent estimators relate to the edge direction. */
export type AnchorAgreement = "CONFIRMS" | "SPLIT" | "SOLO" | "CONTRADICTS" | "NONE";

export interface EdgeAssessment {
  readonly marketFairProb: number;
  /** Weighted blend of the independent estimates; null when there are none. */
  readonly trueProb: number | null;
  /** trueProb − marketFairProb (positive = independents think the side is underpriced). */
  readonly rawEdge: number;
  /** rawEdge after evidence, uncertainty, market-consistency and agreement shrink. */
  readonly shrunkEdge: number;
  readonly agreement: AnchorAgreement;
  /** Share of independent estimators on the edge's side, in [0, 1]. */
  readonly agreementRatio: number;
  /** Honest expectation of beating the close, in probability points. */
  readonly expectedClv: number;
  /** Glass-box conviction 0–100 for display. */
  readonly conviction: number;
  readonly decision: EdgeDecision;
  /** Plain-language, measured "why" — safe for the glass-box surface. */
  readonly rationale: string;
}

function round(v: number, d = 4): number {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

/**
 * Assess whether we have a genuine, independent edge on a side and how strong.
 * Returns a PASS (with a reason) far more often than a SPEAK — that restraint is
 * the product: we only have an opinion where one is defensible.
 */
export function assessEdge(input: EdgeInput): EdgeAssessment {
  const marketFairProb = clamp(input.marketFairProb, 0, 1);
  const evidenceFactor = clamp((input.evidenceScore ?? 100) / 100, 0, 1);
  const uncertaintyFactor = clamp(1 - (input.uncertainty ?? 0), 0, 1);
  const marketConsistent = input.marketConsistent ?? true;

  const independents = input.independents.filter(
    (e) => Number.isFinite(e.prob) && e.prob >= 0 && e.prob <= 1,
  );

  // Honest default: no independent estimate → no opinion.
  if (independents.length === 0) {
    return {
      marketFairProb,
      trueProb: null,
      rawEdge: 0,
      shrunkEdge: 0,
      agreement: "NONE",
      agreementRatio: 0,
      expectedClv: 0,
      conviction: 0,
      decision: "PASS",
      rationale:
        "No independent estimate available — we decline rather than manufacture an edge from the market's own price.",
    };
  }

  const totalWeight = independents.reduce((s, e) => s + (e.weight ?? 1), 0);
  const trueProb = clamp(
    independents.reduce((s, e) => s + e.prob * (e.weight ?? 1), 0) / totalWeight,
    0,
    1,
  );

  let rawEdge = trueProb - marketFairProb;
  // Sub-vig guard: never credit a positive edge from an inconsistent book.
  if (!marketConsistent && rawEdge > 0) rawEdge = 0;

  const dir = Math.sign(rawEdge);
  const onSide = independents.filter(
    (e) => Math.sign(e.prob - marketFairProb) === dir && Math.abs(e.prob - marketFairProb) > DIRECTION_EPSILON,
  ).length;
  const against = independents.filter(
    (e) => dir !== 0 && Math.sign(e.prob - marketFairProb) === -dir && Math.abs(e.prob - marketFairProb) > DIRECTION_EPSILON,
  ).length;
  const agreementRatio = independents.length > 0 ? round(onSide / independents.length) : 0;

  let agreement: AnchorAgreement;
  if (dir === 0 || Math.abs(rawEdge) <= DIRECTION_EPSILON) agreement = "NONE";
  else if (against > 0) agreement = "CONTRADICTS";
  else if (independents.length === 1) agreement = "SOLO";
  else if (onSide === independents.length) agreement = "CONFIRMS";
  else agreement = "SPLIT";

  // An independent estimator sitting on the *market's* side is a red flag: our
  // blend may be edge-positive on net, but a referee disagrees → stand down.
  const agreementFactor =
    agreement === "CONFIRMS" ? 1.0 :
    agreement === "SOLO" ? 0.6 : // single source can't be cross-checked
    agreement === "SPLIT" ? 0.5 :
    0; // CONTRADICTS / NONE → no credit

  const shrunkEdge = round(Math.abs(rawEdge) * evidenceFactor * uncertaintyFactor * agreementFactor) * (dir < 0 ? -1 : 1);
  const shrunkMag = Math.abs(shrunkEdge);

  // Expected CLV: if independents are right that the book is soft by `shrunkEdge`,
  // the closing line should drift toward our number — that drift IS our CLV.
  const expectedClv = round(shrunkEdge);

  // Glass-box conviction: a confirmed ~+6pt shrunk edge tops out near 85.
  const agreementBonus = agreement === "CONFIRMS" ? 15 : agreement === "SOLO" ? -5 : agreement === "SPLIT" ? -8 : 0;
  const conviction = clamp(Math.round((Math.min(shrunkMag, 0.06) / 0.06) * 70 + agreementBonus), 0, 100);

  let decision: EdgeDecision;
  if (agreement === "CONTRADICTS" || dir <= 0) decision = "PASS";
  else if (shrunkMag >= SPEAK_EDGE) decision = "SPEAK";
  else if (shrunkMag >= LEAN_EDGE) decision = "LEAN";
  else decision = "PASS";

  const sourceList = independents.map((e) => e.source).join(", ");
  let rationale: string;
  if (decision === "PASS") {
    if (agreement === "CONTRADICTS") {
      rationale =
        `An independent estimator sides with the sportsbook (${pct(marketFairProb)} fair); our blend (${pct(trueProb)}) is the outlier — ` +
        "we pass rather than fade the market on one disagreeing signal.";
    } else {
      rationale =
        `Independent estimate ${pct(trueProb)} sits within ${pct(Math.abs(rawEdge))} of the sportsbook's fair value (${pct(marketFairProb)}) — ` +
        "no demonstrable edge; we decline rather than overclaim one.";
    }
  } else {
    const refereed = agreement === "CONFIRMS" ? `${independents.length} independent estimates agree` : "estimate";
    rationale =
      `${refereed} (${sourceList}) put the side at ${pct(trueProb)} vs the sportsbook's ${pct(marketFairProb)} fair value — ` +
      `a +${pct(Math.abs(rawEdge))} divergence (evidence/uncertainty-adjusted to +${pct(shrunkMag)}). ` +
      `If correct, the close should move our way: expected CLV +${pct(Math.abs(expectedClv))}.`;
  }

  return {
    marketFairProb: round(marketFairProb),
    trueProb: round(trueProb),
    rawEdge: round(rawEdge),
    shrunkEdge: round(shrunkEdge),
    agreement,
    agreementRatio,
    expectedClv,
    conviction,
    decision,
    rationale,
  };
}
