/**
 * Loader for the honest reliability-diagram presentation.
 *
 * Bridges the EXISTING settled-pick record to the pure, unit-tested presentation
 * engine (`buildReliabilityPresentation`). It runs the same gated, canonical-only
 * query the calibration report uses — published, non-bootstrap, learning-eligible,
 * non-seed picks — and maps each settled pick to a `{probability, outcome}` sample:
 *
 *   probability = confidence / 100   (the stated win probability)
 *   outcome     = WIN -> 1, LOSS -> 0
 *
 * Pushes are excluded from the sample, exactly as they are excluded from the
 * public win-rate denominator (`/performance` methodology). The engine itself
 * enforces the honesty floor: below 100 settled picks it returns
 * `displayReady:false` and a "building the record" verdict — never a curve.
 *
 * Fails closed: if the performance gate is shut, or the read throws, it returns
 * a presentation built from an empty sample (the honest gated state), never a
 * fabricated number. (CLAUDE.md #1/#2/#5.)
 */

import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  buildReliabilityPresentation,
  type ReliabilityPresentation,
  type ReliabilitySample,
} from "@/lib/calibration/reliability-presentation";

const MAX_SAMPLES = 5000;

export async function loadReliabilityPresentation(): Promise<ReliabilityPresentation> {
  const gates = getReadinessGates();

  // Gate closed → honest "building the record" state, no fabrication.
  if (!gates.canExposePerformanceStats) {
    return buildReliabilityPresentation([]);
  }

  try {
    const picks = await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS"] }, // pushes excluded, same as the win-rate denominator
        signalSnapshot: { is: { eligibleForLearning: true } },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      select: { confidence: true, result: true },
      orderBy: { settledAt: "desc" },
      take: MAX_SAMPLES,
    });

    const samples: ReliabilitySample[] = picks.map((pick) => ({
      probability: Math.max(0, Math.min(1, pick.confidence / 100)),
      outcome: pick.result === "WIN" ? 1 : 0,
    }));

    return buildReliabilityPresentation(samples);
  } catch {
    // Read failure must never fabricate a record — fall back to the gated state.
    return buildReliabilityPresentation([]);
  }
}
