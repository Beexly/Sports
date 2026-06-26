/**
 * Promotion law — the single, narrow gate through which a synthetic signal can become operational.
 *
 * There is exactly ONE place in the whole engine where `validationStatus` becomes `"promoted"`: inside
 * `promoteSignal`, after every gate passes. No raw cast may forge a PromotedSignal anywhere else. The
 * gates compose the rest of the engine — a valid receipt, no blocking doubt, an applied meta-doubt with
 * adequate coverage, and (for high-confidence / probabilistic signals) calibration evidence that clears
 * the sample-count and ECE thresholds. A signal that fails returns its failures; it is never silently
 * dropped and never half-promoted.
 */

import { promotionIdFrom } from "./ids.js";
import { isReceiptValid } from "./receipt.js";
import { requiresCalibrationEvidence, type SyntheticSignal } from "./signal.js";
import { isPromotableStatus } from "./validation.js";
import type { StructuredDoubt } from "./doubt.js";
import type { MetaDoubtReport } from "./meta-doubt.js";
import type { CalibrationCurveResult } from "./calibration.js";
import { calibrationTagFrom } from "./ids.js";
import type { CalibrationTag, MetaDoubtId, PromotionId } from "./brands.js";

export type PromotionFailureCode =
  | "missing_receipt"
  | "invalid_receipt"
  | "blocking_doubt"
  | "missing_meta_doubt"
  | "weak_doubt_coverage"
  | "missing_calibration"
  | "insufficient_samples"
  | "poor_calibration"
  | "licensing_block"
  | "model_leakage_risk"
  | "not_candidate"
  | "unknown";

export interface PromotionFailure {
  code: PromotionFailureCode;
  message: string;
  severity: "warning" | "blocker";
}

export type PromotedSignal<T extends SyntheticSignal = SyntheticSignal> = T & {
  validationStatus: "promoted";
  promotedAt: string;
  promotionId: PromotionId;
  metaDoubtApplied: true;
  calibrationTag?: CalibrationTag;
};

export type PromotionResult<T extends SyntheticSignal> =
  | { ok: true; signal: PromotedSignal<T>; promotionId: PromotionId }
  | { ok: false; signal: T; failures: PromotionFailure[] };

// ── type utilities ──
export type Promotable<T> = T extends { validationStatus: "promoted" } ? T : never;
export type WithMetaDoubt<T> = T & { metaDoubtApplied: true; metaId: MetaDoubtId };
export type Calibrated<T> = T & { isWellCalibrated: true; calibrationTag: CalibrationTag };

export interface PromoteSignalArgs {
  structuredDoubt: StructuredDoubt;
  metaDoubtReport: MetaDoubtReport;
  /** Calibration evidence — required for high-confidence / probabilistic signals. */
  calibration?: CalibrationCurveResult;
  /** Injected ISO timestamp for the promotion event. */
  promotedAt: string;
  minimumSamples?: number;
  maximumECE?: number;
  minDoubtCoverage?: number;
  highConfidenceThreshold?: number;
  /** When true, the receipt's licenseScope must explicitly allow a public claim. */
  publicClaim?: boolean;
}

function blocker(code: PromotionFailureCode, message: string): PromotionFailure {
  return { code, message, severity: "blocker" };
}

/**
 * The promotion gate. Returns `{ ok: true, signal: PromotedSignal }` only when every blocker clears;
 * otherwise `{ ok: false, signal, failures }`. The lone `as PromotedSignal<T>` in the codebase lives
 * here, after the gate — that is the point.
 */
export function promoteSignal<T extends SyntheticSignal>(
  signal: T,
  args: PromoteSignalArgs,
): PromotionResult<T> {
  const minimumSamples = args.minimumSamples ?? 50;
  const maximumECE = args.maximumECE ?? 0.05;
  const minDoubtCoverage = args.minDoubtCoverage ?? 1;
  const highConfidenceThreshold = args.highConfidenceThreshold ?? 0.7;
  const publicClaim = args.publicClaim ?? false;

  const failures: PromotionFailure[] = [];

  // 1 — status
  if (!isPromotableStatus(signal.validationStatus)) {
    failures.push(blocker("not_candidate", `status "${signal.validationStatus}" is not promotable (need candidate|validated)`));
  }

  // 2 — receipt
  if (!signal.receipt) {
    failures.push(blocker("missing_receipt", "signal has no genesis receipt"));
  } else if (!isReceiptValid(signal.receipt)) {
    failures.push(blocker("invalid_receipt", "receipt integrity is not valid"));
  }

  // 3 — doubt must belong to the signal and carry no blocker
  if (args.structuredDoubt.signalId !== signal.signalId) {
    failures.push(blocker("missing_meta_doubt", "structured doubt does not belong to this signal"));
  }
  if (args.structuredDoubt.promotionBlocked) {
    failures.push(blocker("blocking_doubt", "an unresolved blocking doubt is present"));
  }
  const unmitigatedLeakage = args.structuredDoubt.cases.some(
    (c) => c.category === "model_leakage" && c.blocksPromotion,
  );
  if (unmitigatedLeakage) {
    failures.push(blocker("model_leakage_risk", "an unmitigated model_leakage doubt is present"));
  }

  // 4 — meta-doubt must exist, belong to the signal, and be applied
  if (!args.metaDoubtReport || args.metaDoubtReport.metaDoubtApplied !== true || args.metaDoubtReport.signalId !== signal.signalId) {
    failures.push(blocker("missing_meta_doubt", "a valid meta-doubt report for this signal is required"));
  } else {
    // 5 — coverage / overconfidence
    if (args.metaDoubtReport.doubtCoverageScore < minDoubtCoverage || args.metaDoubtReport.overconfidenceFlag) {
      failures.push(
        blocker(
          "weak_doubt_coverage",
          `doubt coverage ${args.metaDoubtReport.doubtCoverageScore} < ${minDoubtCoverage}${args.metaDoubtReport.overconfidenceFlag ? " (overconfident)" : ""}`,
        ),
      );
    }
  }

  // 6 — calibration evidence where required
  const needsCalibration = requiresCalibrationEvidence(signal, highConfidenceThreshold);
  let calibrationTag: CalibrationTag | undefined;
  if (needsCalibration && !args.calibration) {
    failures.push(blocker("missing_calibration", "calibration evidence is required for this signal"));
  } else if (args.calibration) {
    if (args.calibration.totalSamples < minimumSamples) {
      failures.push(blocker("insufficient_samples", `calibration samples ${args.calibration.totalSamples} < ${minimumSamples}`));
    }
    if (args.calibration.expectedCalibrationError > maximumECE) {
      failures.push(blocker("poor_calibration", `ECE ${args.calibration.expectedCalibrationError} > ${maximumECE}`));
    }
    calibrationTag = calibrationTagFrom(`n${args.calibration.totalSamples}`);
  }

  // 7 — licensing, only when promoting for a public claim
  if (publicClaim && signal.receipt && signal.receipt.licenseScope !== "public_claim_allowed") {
    failures.push(blocker("licensing_block", `licenseScope "${signal.receipt.licenseScope}" does not allow a public claim`));
  }

  if (failures.some((f) => f.severity === "blocker")) {
    return { ok: false, signal, failures };
  }

  const promotionId = promotionIdFrom(signal.signalId, signal.receipt.receiptId);
  const promoted = {
    ...signal,
    validationStatus: "promoted",
    promotedAt: args.promotedAt,
    promotionId,
    metaDoubtApplied: true,
    ...(calibrationTag ? { calibrationTag } : {}),
  } as PromotedSignal<T>;

  return { ok: true, signal: promoted, promotionId };
}

/** Type guard: is this signal a PromotedSignal? Structural, no PromotedSignal cast. */
export function isPromotedSignal(signal: SyntheticSignal): signal is PromotedSignal {
  return (
    signal.validationStatus === "promoted" &&
    (signal as { metaDoubtApplied?: unknown }).metaDoubtApplied === true
  );
}

/** Extract the promoted signal from a successful result (already typed PromotedSignal on `ok`). */
export function promotedOrNull<T extends SyntheticSignal>(result: PromotionResult<T>): PromotedSignal<T> | null {
  return result.ok ? result.signal : null;
}

/** Attach a meta-doubt marker (uses the WithMetaDoubt utility type). */
export function attachMetaDoubt<T extends object>(value: T, metaId: MetaDoubtId): WithMetaDoubt<T> {
  return { ...value, metaDoubtApplied: true, metaId };
}

/** Mark a value as well-calibrated (uses the Calibrated utility type). */
export function markCalibrated<T extends object>(value: T, calibrationTag: CalibrationTag): Calibrated<T> {
  return { ...value, isWellCalibrated: true, calibrationTag };
}
