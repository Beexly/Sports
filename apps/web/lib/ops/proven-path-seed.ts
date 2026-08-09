/**
 * Auto-build proven path plan + projected metrics when durable missing.
 * No founder cron click required.
 *
 * Ranking p law: load confidence + independent trueProb only.
 * edgeScore is never converted to a probability for bake-off.
 * confidence-sourced rankingP is never treated as independent.
 */

import { db, isStubMode } from "@sports/db";
import { buildProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { projectProvenPathMetrics } from "@/lib/calibration/projected-proven-metrics";
import { toProvenPathPickRows } from "@/lib/calibration/proven-path-rows";
import {
  loadProvenPathPlan,
  persistProvenPathPlan,
} from "@/lib/ops/proven-path-durable";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import type { ProjectedProvenMetrics } from "@/lib/calibration/projected-proven-metrics";
import { CANONICAL_LEARNING_PICK_WHERE } from "@/lib/ops/compute-live-calibration-metrics";

export type ProvenPathSurface = {
  readonly plan: ProvenPathPlan;
  readonly projection: ProjectedProvenMetrics;
};

async function loadRows() {
  const picks = await db.pick.findMany({
    where: CANONICAL_LEARNING_PICK_WHERE,
    select: {
      confidence: true,
      result: true,
      pickType: true,
      factorBreakdown: true,
      game: { select: { sport: { select: { key: true, name: true } } } },
    },
    orderBy: { settledAt: "desc" },
    take: 2000,
  });
  return toProvenPathPickRows(picks);
}

export async function loadOrSeedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  const surface = await loadProvenPathSurface();
  return surface?.plan ?? null;
}

export async function loadProvenPathSurface(): Promise<ProvenPathSurface | null> {
  if (isStubMode()) return null;
  try {
    const rows = await loadRows();
    if (rows.length < 50) return null;
    // Always rebuild so polarity law applies (edge-as-p plans are invalid).
    const plan = buildProvenPathPlan(rows);
    await persistProvenPathPlan(plan);
    const projection = projectProvenPathMetrics(rows);
    return { plan, projection };
  } catch {
    return null;
  }
}
