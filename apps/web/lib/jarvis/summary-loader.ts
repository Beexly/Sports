/**
 * Server-side OwnerSummary loader shared by the Jarvis v2 pages.
 * Mirrors the cockpit page's assembly; returns null (with the reason)
 * instead of throwing so pages can render an honest degraded state.
 */

import { getReadinessGates } from "@sports/prediction-engine";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { buildOwnerSummary, type OwnerSummary } from "@/lib/cockpit/owner-summary";
import { db, isStubMode } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";

export interface LoadedSummary {
  readonly summary: OwnerSummary | null;
  readonly error: string | null;
}

export async function loadOwnerSummaryServer(): Promise<LoadedSummary> {
  try {
    const gates = getReadinessGates();
    const jarvis = await loadJarvisAssessment();
    let todayPickCount = 0;
    if (!isStubMode) {
      const now = new Date();
      todayPickCount = await db.pick
        .count({
          where: { generatedAt: { gte: startOfDay(now), lte: endOfDay(now) } },
        })
        .catch(() => 0);
    }
    return {
      summary: buildOwnerSummary({
        assessment: jarvis.assessment,
        performancePolicy: jarvis.performancePolicy,
        gates,
        todayPickCount,
      }),
      error: null,
    };
  } catch (err) {
    return {
      summary: null,
      error: err instanceof Error ? err.message : "Jarvis synthesis failed.",
    };
  }
}
