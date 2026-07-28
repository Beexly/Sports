/**
 * Selective abstention helpers mapped onto GSE reason codes.
 * Does NOT replace selective-gate.ts — production authority stays in the gate.
 * Does NOT rewrite pav.ts / ivap.ts.
 */

import type { NoBetReasonCode } from "./decision-certificate.js";
import { MIN_STRATUM_CALIBRATION } from "../edge-lab/selective-gate.js";

export interface Interval {
  lo: number;
  hi: number;
}

export interface AbstentionConfig {
  maxWidth: number;
  minLcb: number;
  minStratumN: number;
}

/**
 * Defaults for the DIAGNOSTIC helpers in this file.
 *
 * READ THIS BEFORE USING `minLcb` FOR ANYTHING: it is NOT the gate's firing
 * rule, and it is not a stricter version of it either — it is a DIFFERENT
 * QUESTION.
 *
 *   gate  (production authority):  fire ⇔ (p_lo − q) > τ      ← relative to the
 *                                                               market price
 *   minLcb (here):                 fire ⇔  p_lo     > 0.52    ← absolute, no q
 *
 * There is no q term here at all, so the two can disagree in BOTH directions:
 * a p_lo of 0.55 against a market q of 0.60 clears `minLcb` while the gate
 * correctly refuses it (no edge over the price), and a p_lo of 0.45 against a
 * q of 0.30 fails `minLcb` while the gate correctly fires (a real 15-point
 * edge). Neither is a bug in either place — they answer different questions —
 * but treating this file's verdict as the gate's verdict would publish a
 * decision the gate never made.
 *
 * These two numbers are deliberately NOT imported from selective-gate, because
 * the gate has no counterpart to import: τ is TUNED per operating point by
 * `tuneTau` rather than fixed, and `maxWidthForFire` is caller-supplied and
 * OFF by default. Hardcoding a stand-in for a tuned value is why this shape is
 * dangerous, so the values are documented as local diagnostic thresholds
 * rather than dressed up as the gate's.
 */
export const DEFAULT_ABSTENTION: AbstentionConfig = {
  /** Local diagnostic width tolerance. NOT the gate's `maxWidthForFire`
   * (caller-supplied, off by default). */
  maxWidth: 0.12,
  /** Local ABSOLUTE lower-bound floor. NOT the gate's `(p_lo − q) > τ`. See the
   * block comment above — this has no market term and is not comparable. */
  minLcb: 0.52,
  /**
   * IMPORTED from selective-gate.ts, not re-declared as a literal 100.
   *
   * The gate is the sample-floor authority. A second hardcoded copy of the
   * floor silently diverges the first time the gate's own floor is retuned,
   * and these helpers would then abstain on a different rule than the one
   * production actually enforces — while still reporting the same
   * INSUFFICIENT_SAMPLE reason code, which is the misleading part.
   *
   * This one CAN be imported because the gate exposes it as a fixed constant.
   * The two fields above cannot; that asymmetry is the point.
   */
  minStratumN: MIN_STRATUM_CALIBRATION,
};

export function chowStyleShouldAbstain(
  interval: Interval,
  cfg: AbstentionConfig = DEFAULT_ABSTENTION,
): { abstain: boolean; reasons: NoBetReasonCode[] } {
  const reasons: NoBetReasonCode[] = [];
  const width = interval.hi - interval.lo;
  if (!(width >= 0) || !Number.isFinite(width)) {
    return { abstain: true, reasons: ["INSUFFICIENT_CALIBRATION"] };
  }
  if (width > cfg.maxWidth) reasons.push("NO_BET_WIDTH");
  if (interval.lo < cfg.minLcb) reasons.push("NO_BET_LCB");
  return { abstain: reasons.length > 0, reasons };
}

export function npStyleLowerEndpointFire(
  interval: Interval,
  cfg: AbstentionConfig = DEFAULT_ABSTENTION,
): { fire: boolean; reasons: NoBetReasonCode[] } {
  const { abstain, reasons } = chowStyleShouldAbstain(interval, cfg);
  return { fire: !abstain, reasons };
}

export function sampleFloorAbstain(
  stratumN: number,
  cfg: AbstentionConfig = DEFAULT_ABSTENTION,
): { abstain: boolean; reasons: NoBetReasonCode[] } {
  if (!Number.isFinite(stratumN) || stratumN < cfg.minStratumN) {
    return { abstain: true, reasons: ["INSUFFICIENT_SAMPLE"] };
  }
  return { abstain: false, reasons: [] };
}

/** Pure combine of integrity + interval checks. Gate remains authority in prod. */
export function evaluateAbstentionHelpers(input: {
  interval?: Interval;
  stratumN: number;
  staleOdds?: boolean;
  priceIntegrityQ?: boolean;
  handicapMismatch?: boolean;
  notPlaceable?: boolean;
  provenanceFail?: boolean;
  cfg?: AbstentionConfig;
}): { kind: "FIRE" | "NO_BET"; reasons: NoBetReasonCode[] } {
  const cfg = input.cfg ?? DEFAULT_ABSTENTION;
  const reasons: NoBetReasonCode[] = [];

  if (input.staleOdds) reasons.push("STALE_ODDS");
  if (input.priceIntegrityQ) reasons.push("PRICE_INTEGRITY_Q");
  if (input.handicapMismatch) reasons.push("HANDICAP_MISMATCH");
  if (input.notPlaceable) reasons.push("NOT_PLACEABLE");
  if (input.provenanceFail) reasons.push("PROVENANCE");

  reasons.push(...sampleFloorAbstain(input.stratumN, cfg).reasons);

  if (!input.interval) {
    reasons.push("INSUFFICIENT_CALIBRATION");
  } else {
    reasons.push(...chowStyleShouldAbstain(input.interval, cfg).reasons);
  }

  const uniq = [...new Set(reasons)];
  if (uniq.length) return { kind: "NO_BET", reasons: uniq };
  return { kind: "FIRE", reasons: [] };
}
