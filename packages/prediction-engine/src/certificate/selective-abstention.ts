/**
 * Selective abstention helpers mapped onto GSE reason codes.
 * Does NOT replace selective-gate.ts — production authority stays in the gate.
 * Does NOT rewrite pav.ts / ivap.ts.
 */

import type { NoBetReasonCode } from "./decision-certificate.js";

export interface Interval {
  lo: number;
  hi: number;
}

export interface AbstentionConfig {
  maxWidth: number;
  minLcb: number;
  minStratumN: number;
}

export const DEFAULT_ABSTENTION: AbstentionConfig = {
  maxWidth: 0.12,
  minLcb: 0.52,
  minStratumN: 100,
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
