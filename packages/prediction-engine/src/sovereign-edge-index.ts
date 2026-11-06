/**
 * Sovereign Edge Index — the SHADOW decision-support index (Workstream-K "K2").
 *
 * WHAT THIS IS
 * A pure composer that folds signals we ALREADY compute — the independent edge
 * assessment (assessEdge: shrunkEdge / decision / expectedClv), calibration trust,
 * an optional CLV beat-rate + sample, the pick's price (for break-even), and an
 * uncertainty/volatility read — into a single label plus a component breakdown and
 * the reasons behind it. It is the "Sovereign Edge Index" section of
 * reports/reality-engine/workstream-k-activation-audit.md.
 *
 * WHY IT IS INERT (WEIGHT 0)
 * This is a shadow index: weight 0, decision-support only. It does NOT score, gate,
 * tier, or price anything, and it is NOT imported by scoring.ts or any live path.
 * Confidence remains the heuristic sum in scoring.ts. The index exists so the
 * composition logic is written, tested, and ready the day the upstream engines
 * (calibration especially) become real.
 *
 * THE NON-NEGOTIABLE HONESTY GUARD
 * If calibration is INACTIVE / the probability is UNCALIBRATED — the live reality
 * today, where the settled sample is < 100 — the index can NEVER return ATTACK.
 * It caps at WATCH/PASS and says exactly why. ATTACK is a claim of a real,
 * calibrated edge; without a calibrated probability that claim cannot be made.
 * This mirrors conviction-tier.ts: missing/invalid calibration → no certainty.
 *
 * Pure functions, no I/O — fully unit-testable. All probabilities are in [0, 1].
 */

import { clamp, americanToImpliedProbability } from "./scoring.js";
import { BREAK_EVEN_PROBABILITY, CONVICTION_MIN_PROBABILITY } from "./conviction-tier.js";
import type { EdgeDecision, AnchorAgreement } from "./edge-engine.js";

/**
 * The label this index emits. ATTACK is the only one asserting a real, calibrated
 * edge and is reachable ONLY when calibration is active (see the honesty guard).
 *   ATTACK         — calibrated edge clears every bar; act.
 *   WAIT           — real edge, but timing/CLV says hold for a better number.
 *   WATCH          — promising but not yet certifiable (e.g. uncalibrated) — monitor.
 *   PASS           — no demonstrable edge; the honest default silence.
 *   NO_BET         — a hard disqualifier fired (price below break-even, edge PASS).
 *   CHANGE_MARKET  — the read may be right but this market/expression is wrong.
 *   NEEDS_REVIEW   — inputs are contradictory/invalid; a human must look.
 */
export type SovereignLabel =
  | "ATTACK"
  | "WAIT"
  | "WATCH"
  | "PASS"
  | "NO_BET"
  | "CHANGE_MARKET"
  | "NEEDS_REVIEW";

/** Calibration trust — is the probability calibrated, and how well (ECE)? */
export interface CalibrationTrust {
  /**
   * True ONLY when a held-out-validated calibrator is active (calibration-apply.ts
   * marks calibrated:true). When false, the probability is the raw heuristic and
   * the index is capped below ATTACK.
   */
  readonly calibrated: boolean;
  /** Expected Calibration Error in [0, 1] when known; lower = better calibrated. */
  readonly ece?: number | null;
}

/** The edge facts we already compute (assessEdge output, threaded in). */
export interface SovereignEdgeFacts {
  /** assessEdge decision: SPEAK / LEAN / PASS. */
  readonly decision: EdgeDecision;
  /** assessEdge shrunkEdge — evidence/uncertainty/agreement-shrunk edge, signed. */
  readonly shrunkEdge: number;
  /** assessEdge expectedClv — honest expectation of beating the close (prob pts). */
  readonly expectedClv: number;
  /** assessEdge agreement between independent estimators. */
  readonly agreement: AnchorAgreement;
}

export interface SovereignEdgeInput {
  /** The independent edge assessment (from assessEdge). */
  readonly edge: SovereignEdgeFacts;
  /** Calibration trust — the gate on ATTACK. */
  readonly calibration: CalibrationTrust;
  /**
   * The calibrated win probability in [0, 1], when calibration is active. Treated
   * as MISSING (never clamped) if outside [0, 1] — a raw 0–100 score must never be
   * mistaken for a calibrated probability (mirrors conviction-tier.ts).
   */
  readonly calibratedProbability?: number | null;
  /** Historical CLV beat-rate on this segment in [0, 1], or null when no history. */
  readonly clvBeatRate?: number | null;
  /** How many graded picks the beat-rate is over (small samples cannot certify). */
  readonly clvSampleSize?: number | null;
  /** The pick's American price (e.g. -200), for a price-specific break-even. */
  readonly americanPrice?: number | null;
  /** Model/market uncertainty in [0, 1] (1 = maximally uncertain). */
  readonly uncertainty?: number | null;
  /** Realized/expected volatility of the market in [0, 1] (1 = most volatile). */
  readonly volatility?: number | null;
}

/** A 0–1 component score with the reason it landed where it did. */
export interface SovereignComponent {
  readonly name: string;
  /** Normalized 0–1 contribution (0 = unsupportive, 1 = fully supportive). */
  readonly score: number;
  readonly note: string;
}

export interface SovereignEdgeResult {
  readonly label: SovereignLabel;
  /**
   * Always 0. This index is the shadow index — it is decision-support only and is
   * never priced into live confidence. Kept explicit so any future wire-in is loud.
   */
  readonly weight: 0;
  /** The break-even win rate the price implies (price-specific when a price is given). */
  readonly breakEven: number;
  /** Per-signal breakdown (auditable; never a certainty claim). */
  readonly components: readonly SovereignComponent[];
  /** Plain-language reasons behind the label. */
  readonly reasons: readonly string[];
}

/** Minimum CLV sample before a beat-rate can support (not certify) an ATTACK. */
export const SOVEREIGN_MIN_CLV_SAMPLE = 20;

function isValidProbability(p: number | null | undefined): p is number {
  return typeof p === "number" && Number.isFinite(p) && p >= 0 && p <= 1;
}

function pct(x: number): string {
  return `${(clamp(x, 0, 1) * 100).toFixed(1)}%`;
}

/**
 * Compose the Sovereign Edge Index from existing signals into a label + component
 * breakdown + reasons. CRITICAL: when calibration is inactive or the probability is
 * uncalibrated, the result can NEVER be ATTACK — it caps at WATCH (or PASS/NO_BET if
 * the edge itself is absent) and the reasons say why. This is the shadow index:
 * weight is always 0 and it is never priced into live confidence.
 */
export function sovereignEdgeIndex(input: SovereignEdgeInput): SovereignEdgeResult {
  const reasons: string[] = [];

  const breakEven =
    input.americanPrice != null && Number.isFinite(input.americanPrice)
      ? americanToImpliedProbability(input.americanPrice)
      : BREAK_EVEN_PROBABILITY;

  const calibrated = input.calibration.calibrated === true;
  const probValid = isValidProbability(input.calibratedProbability);
  // ATTACK requires a calibrator that is active AND a valid calibrated probability.
  const calibrationActive = calibrated && probValid;

  // ── Components (each normalized 0–1) ──
  // Edge component: SPEAK = full credit, LEAN = partial, PASS = none.
  const edgeScore =
    input.edge.decision === "SPEAK" ? 1 : input.edge.decision === "LEAN" ? 0.5 : 0;
  const components: SovereignComponent[] = [
    {
      name: "independent-edge",
      score: edgeScore,
      note: `assessEdge decision ${input.edge.decision} (shrunkEdge ${input.edge.shrunkEdge}, agreement ${input.edge.agreement}).`,
    },
  ];

  // Calibration component: the gate. Without it, ATTACK is impossible.
  const eceTerm = isValidProbability(input.calibration.ece)
    ? clamp(1 - (input.calibration.ece as number) / 0.1, 0, 1)
    : 0.5;
  components.push({
    name: "calibration-trust",
    score: calibrationActive ? eceTerm : 0,
    note: calibrationActive
      ? `Calibration active (ECE ${input.calibration.ece ?? "unknown"}); calibrated P ${pct(input.calibratedProbability as number)}.`
      : "Calibration INACTIVE / probability uncalibrated — capped below ATTACK.",
  });

  // Probability-vs-break-even component (only meaningful when calibrated).
  const clearsFloor =
    probValid &&
    (input.calibratedProbability as number) >= Math.max(CONVICTION_MIN_PROBABILITY, breakEven);
  components.push({
    name: "probability-vs-breakeven",
    score: calibrationActive ? (clearsFloor ? 1 : 0) : 0,
    note: probValid
      ? `Calibrated P ${pct(input.calibratedProbability as number)} vs floor ${pct(Math.max(CONVICTION_MIN_PROBABILITY, breakEven))} (break-even ${pct(breakEven)}).`
      : `No valid calibrated probability; break-even ${pct(breakEven)}.`,
  });

  // CLV-track-record component (supports, never certifies on its own).
  const clvValid = isValidProbability(input.clvBeatRate);
  const clvN = input.clvSampleSize ?? 0;
  const clvSupportsAttack = clvValid && (input.clvBeatRate as number) >= 0.5 && clvN >= SOVEREIGN_MIN_CLV_SAMPLE;
  components.push({
    name: "clv-track-record",
    score: clvValid ? clamp(input.clvBeatRate as number, 0, 1) : 0,
    note: clvValid
      ? `CLV beat-rate ${pct(input.clvBeatRate as number)} over ${clvN} graded picks.`
      : "No CLV history on this segment yet.",
  });

  // Uncertainty/volatility component: high values erode support.
  const u = isValidProbability(input.uncertainty) ? (input.uncertainty as number) : 0;
  const v = isValidProbability(input.volatility) ? (input.volatility as number) : 0;
  const stability = clamp(1 - Math.max(u, v), 0, 1);
  components.push({
    name: "stability",
    score: stability,
    note: `Uncertainty ${u}, volatility ${v} → stability ${stability.toFixed(2)}.`,
  });

  // ── Label resolution ──
  // 1. Hard disqualifiers → NO_BET / CHANGE_MARKET, regardless of calibration.
  if (input.edge.agreement === "CONTRADICTS") {
    reasons.push("An independent estimator sides with the market — our model is the outlier.");
    return result("CHANGE_MARKET", breakEven, components, reasons);
  }
  if (input.edge.decision === "PASS") {
    reasons.push("Independent edge decision is PASS — no demonstrable edge; the honest default.");
    return result("PASS", breakEven, components, reasons);
  }
  if (probValid && (input.calibratedProbability as number) < breakEven) {
    reasons.push(
      `Calibrated P ${pct(input.calibratedProbability as number)} is below the price's break-even ${pct(breakEven)} — no bet.`,
    );
    return result("NO_BET", breakEven, components, reasons);
  }

  // 2. THE HONESTY CAP: no active calibration → never ATTACK.
  if (!calibrationActive) {
    if (calibrated && !probValid) {
      reasons.push(
        "Calibration is marked active but the supplied probability is invalid/out-of-range — needs review.",
      );
      return result("NEEDS_REVIEW", breakEven, components, reasons);
    }
    reasons.push(
      "Calibration is INACTIVE (sample < 100 / probability uncalibrated) — the index CANNOT return ATTACK; capping at WATCH.",
    );
    if (input.edge.decision === "SPEAK") {
      reasons.push("Independent edge is SPEAK, but without a calibrated probability we only WATCH, never attack.");
    }
    return result("WATCH", breakEven, components, reasons);
  }

  // 3. Calibration is active and the price clears break-even. Decide ATTACK vs WAIT vs WATCH.
  if (!clearsFloor) {
    reasons.push(
      `Calibrated P ${pct(input.calibratedProbability as number)} is above break-even but below the conviction floor ${pct(Math.max(CONVICTION_MIN_PROBABILITY, breakEven))} — watch, do not attack.`,
    );
    return result("WATCH", breakEven, components, reasons);
  }
  if (input.edge.decision !== "SPEAK") {
    reasons.push(`Edge decision is ${input.edge.decision} (ATTACK needs SPEAK) — watching.`);
    return result("WATCH", breakEven, components, reasons);
  }
  if (stability < 0.4) {
    reasons.push("Edge clears the floor but uncertainty/volatility is high — WAIT for a stabler read.");
    return result("WAIT", breakEven, components, reasons);
  }
  if (input.edge.expectedClv > 0 && !clvSupportsAttack && clvValid) {
    // We have CLV history and it is weak/thin — hold for confirmation rather than attack.
    reasons.push(
      `Calibrated edge clears every bar, but the CLV track record (${pct(input.clvBeatRate as number)} over ${clvN}) does not yet confirm it — WAIT.`,
    );
    return result("WAIT", breakEven, components, reasons);
  }

  // Every bar cleared with active calibration → ATTACK.
  reasons.push(
    `Calibrated P ${pct(input.calibratedProbability as number)} clears the floor, edge is SPEAK, market is stable${
      clvSupportsAttack ? `, and CLV history confirms (${pct(input.clvBeatRate as number)} over ${clvN})` : ""
    } — ATTACK.`,
  );
  return result("ATTACK", breakEven, components, reasons);
}

function result(
  label: SovereignLabel,
  breakEven: number,
  components: readonly SovereignComponent[],
  reasons: readonly string[],
): SovereignEdgeResult {
  return { label, weight: 0, breakEven, components, reasons };
}
