/**
 * Pricing phase readiness — evaluates whether the named proof milestone for the
 * NEXT rung of the pricing ladder is met, from real platform metrics.
 *
 * This operationalizes the "tier up only on proof" doctrine: pricing-phases.ts
 * NAMES the ladder and its triggers ahead of time; this module CHECKS them against
 * live data (canonical settled picks, published calibration, verified closing-line
 * value). It never advances the phase — advancing remains a deliberate operator
 * action (set PRICING_PHASE) taken only when eligible AND the rung's added value
 * has shipped. Pure module: no DB, no env writes, fully unit-testable.
 */

import {
  PRICING_PHASES,
  getCurrentPricingPhaseId,
  type PricingPhaseId,
} from "./pricing-phases";

export interface PhaseReadinessMetrics {
  /** Canonical (non-bootstrap) settled picks. */
  readonly canonicalSettledPicks: number;
  /** Whether a public calibration curve is live (gate open + sample present). */
  readonly calibrationPublished: boolean;
  /** Closing-line-value beat-close rate (0–1), or null when not yet measurable. */
  readonly beatCloseRate: number | null;
}

export interface PhaseAdvanceCheck {
  readonly currentPhaseId: PricingPhaseId;
  readonly nextPhaseId: PricingPhaseId | null;
  readonly nextPhaseName: string | null;
  readonly eligible: boolean;
  readonly met: readonly string[];
  readonly unmet: readonly string[];
  readonly rationale: string;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Evaluate whether the platform has earned the next pricing rung.
 *
 * @param metrics        live proof metrics
 * @param currentPhaseId defaults to the live phase (PRICING_PHASE env)
 */
export function evaluatePhaseAdvance(
  metrics: PhaseReadinessMetrics,
  currentPhaseId: PricingPhaseId = getCurrentPricingPhaseId(),
): PhaseAdvanceCheck {
  const current = PRICING_PHASES.find((p) => p.id === currentPhaseId) ?? PRICING_PHASES[0]!;
  const next = PRICING_PHASES.find((p) => p.order === current.order + 1) ?? null;

  if (!next) {
    return {
      currentPhaseId: current.id,
      nextPhaseId: null,
      nextPhaseName: null,
      eligible: false,
      met: [],
      unmet: [],
      rationale: `${current.name} is the top rung of the ladder. No further price increase is named.`,
    };
  }

  const t = next.triggerMetrics;
  const met: string[] = [];
  const unmet: string[] = [];

  if (t.minCanonicalSettledPicks !== null) {
    const ok = metrics.canonicalSettledPicks >= t.minCanonicalSettledPicks;
    (ok ? met : unmet).push(
      `${metrics.canonicalSettledPicks}/${t.minCanonicalSettledPicks} canonical settled picks`,
    );
  }
  if (t.requiresPublishedCalibration) {
    (metrics.calibrationPublished ? met : unmet).push("published calibration curve");
  }
  if (t.minBeatCloseRate !== null) {
    const ok = metrics.beatCloseRate !== null && metrics.beatCloseRate >= t.minBeatCloseRate;
    const observed = metrics.beatCloseRate !== null ? pct(metrics.beatCloseRate) : "n/a";
    (ok ? met : unmet).push(
      `closing-line-value beat rate ${observed} vs ${pct(t.minBeatCloseRate)} required`,
    );
  }

  const eligible = unmet.length === 0;
  const rationale = eligible
    ? `Proof milestone for ${next.name} is met. Advancing is a deliberate operator action ` +
      `(set PRICING_PHASE=${next.id}), and only after the added value ships: ${next.addedValue}`
    : `Not yet eligible for ${next.name}. Still needed: ${unmet.join("; ")}.`;

  return {
    currentPhaseId: current.id,
    nextPhaseId: next.id,
    nextPhaseName: next.name,
    eligible,
    met,
    unmet,
    rationale,
  };
}
