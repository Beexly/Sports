/**
 * Public Claim Compiler — the single gate every public-facing number passes through.
 *
 * "No compiler pass, no public claim." Before any performance statement renders
 * (win rate, CLV beat-close, calibration, ROI), it is compiled against ALL the
 * platform's gates at once: banned-phrase scan, the performance readiness gate,
 * bootstrap status, settled-sample floor, CLV coverage (survivorship), calibration
 * readiness, a model-version stamp, and data freshness. If any gate fails, the claim
 * is BLOCKED and no number is shown.
 *
 * This module COMPOSES the existing sources of truth — it never re-implements them.
 * Banned phrases come from `scanForBannedPhrases` (@/lib/trust-claims), the single
 * source of truth. Pure, no I/O.
 */

import { scanForBannedPhrases } from "@/lib/trust-claims";

export type ClaimKind = "WIN_RATE" | "CLV_BEAT_CLOSE" | "CALIBRATION" | "ROI" | "GENERIC";

export interface ClaimContext {
  readonly kind: ClaimKind;
  /** The proposed public copy to render. */
  readonly text: string;
  /** The readiness gate (PERFORMANCE_STATS_ENABLED-derived). */
  readonly canExposePerformanceStats: boolean;
  /** Canonical settled picks behind the claim. */
  readonly settledSampleSize: number;
  /** Minimum settled picks required to publish. */
  readonly minSettledForPublic: number;
  /** True if the data is bootstrap-era (never public). */
  readonly isBootstrap: boolean;
  /** CLV coverage rate (0–100); null when unknown. Required for CLV claims. */
  readonly clvCoverageRatePct?: number | null;
  /** Whether calibration has cleared its own floor. Required for calibration claims. */
  readonly calibrationPublishable?: boolean;
  /** Model version stamping the claim; null/empty → blocked for performance claims. */
  readonly modelVersion?: string | null;
  /** Age of the underlying data in minutes; null when unknown. */
  readonly dataFreshnessAgeMinutes?: number | null;
  /** Max acceptable data age in minutes. Default 120. */
  readonly maxFreshnessMinutes?: number;
}

export type ClaimVerdict = "ALLOW" | "BLOCK";

export interface ClaimBlocker {
  readonly code: string;
  readonly message: string;
}

export interface CompiledClaim {
  readonly verdict: ClaimVerdict;
  readonly blockers: readonly ClaimBlocker[];
  /** The publishable text when ALLOWed; null when blocked (no number leaks). */
  readonly publicText: string | null;
  /** What must change for the claim to pass. */
  readonly requirements: readonly string[];
}

const PERFORMANCE_KINDS: ReadonlySet<ClaimKind> = new Set(["WIN_RATE", "CLV_BEAT_CLOSE", "CALIBRATION", "ROI"]);
const HEALTHY_COVERAGE_PCT = 95;
const DEFAULT_MAX_FRESHNESS_MIN = 120;

/**
 * Compile a proposed public claim against every gate. Pure; returns ALLOW + the text
 * only when ALL gates pass, otherwise BLOCK with the specific blockers (and no text).
 */
export function compilePublicClaim(ctx: ClaimContext): CompiledClaim {
  const blockers: ClaimBlocker[] = [];
  const requirements: string[] = [];
  const isPerformance = PERFORMANCE_KINDS.has(ctx.kind);

  // 1. Banned phrases — single source of truth, always enforced.
  const hits = scanForBannedPhrases(ctx.text);
  if (hits.length > 0) {
    blockers.push({
      code: "BANNED_PHRASE",
      message: `Contains banned phrase(s): ${[...new Set(hits.map((h) => h.phrase))].join(", ")}.`,
    });
    requirements.push("Remove banned/overclaiming language.");
  }

  if (isPerformance) {
    // 2. Performance readiness gate.
    if (!ctx.canExposePerformanceStats) {
      blockers.push({ code: "GATE_OFF", message: "Performance stats gate is off." });
      requirements.push("Open the performance gate after canonical history accumulates.");
    }
    // 3. Bootstrap data never goes public.
    if (ctx.isBootstrap) {
      blockers.push({ code: "BOOTSTRAP_DATA", message: "Claim is backed by bootstrap-era data." });
      requirements.push("Use canonical (non-bootstrap) settled picks only.");
    }
    // 4. Settled-sample floor.
    if (ctx.settledSampleSize < ctx.minSettledForPublic) {
      blockers.push({
        code: "INSUFFICIENT_SAMPLE",
        message: `Only ${ctx.settledSampleSize} settled (need ${ctx.minSettledForPublic}).`,
      });
      requirements.push(`Accumulate ${ctx.minSettledForPublic} settled canonical picks.`);
    }
    // 5. Model-version stamp.
    if (!ctx.modelVersion || ctx.modelVersion.trim() === "") {
      blockers.push({ code: "MISSING_MODEL_VERSION", message: "Performance claims must be model-version stamped." });
      requirements.push("Stamp the claim with a model version.");
    }
    // 6. Data freshness.
    const maxAge = ctx.maxFreshnessMinutes ?? DEFAULT_MAX_FRESHNESS_MIN;
    if (ctx.dataFreshnessAgeMinutes != null && ctx.dataFreshnessAgeMinutes > maxAge) {
      blockers.push({
        code: "STALE_DATA",
        message: `Data is ${ctx.dataFreshnessAgeMinutes}m old (max ${maxAge}m).`,
      });
      requirements.push("Refresh the underlying data.");
    }
  }

  // 7. CLV coverage — a beat-close rate over <healthy coverage is survivorship-biased.
  if (ctx.kind === "CLV_BEAT_CLOSE") {
    if (ctx.clvCoverageRatePct == null) {
      blockers.push({ code: "COVERAGE_UNKNOWN", message: "CLV coverage is unknown." });
      requirements.push("Measure CLV coverage before publishing the beat-close rate.");
    } else if (ctx.clvCoverageRatePct < HEALTHY_COVERAGE_PCT) {
      blockers.push({
        code: "INCOMPLETE_COVERAGE",
        message: `CLV coverage ${ctx.clvCoverageRatePct}% (need ≥${HEALTHY_COVERAGE_PCT}%): rate is survivorship-biased.`,
      });
      requirements.push(`Raise CLV coverage to ≥${HEALTHY_COVERAGE_PCT}%.`);
    }
  }

  // 8. Calibration readiness.
  if (ctx.kind === "CALIBRATION" && ctx.calibrationPublishable !== true) {
    blockers.push({ code: "CALIBRATION_NOT_READY", message: "Calibration has not cleared its floor." });
    requirements.push("Wait for calibration to clear its settled-sample floor.");
  }

  const verdict: ClaimVerdict = blockers.length === 0 ? "ALLOW" : "BLOCK";
  return {
    verdict,
    blockers,
    publicText: verdict === "ALLOW" ? ctx.text : null,
    requirements,
  };
}
