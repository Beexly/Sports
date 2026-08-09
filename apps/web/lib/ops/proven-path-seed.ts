/**
 * Auto-build proven path plan + projected metrics when durable missing.
 * No founder cron click required.
 */

import { db, isStubMode } from "@sports/db";
import { buildProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { projectProvenPathMetrics } from "@/lib/calibration/projected-proven-metrics";
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
      edgeScore: true,
      result: true,
      pickType: true,
      game: { select: { sport: { select: { key: true, name: true } } } },
    },
    orderBy: { settledAt: "desc" },
    take: 2000,
  });
  const rows: import("@/lib/calibration/proven-path-engine").ProvenPathPickRow[] = [];
  for (const pick of picks) {
    if (pick.result !== "WIN" && pick.result !== "LOSS") continue;
    if (typeof pick.confidence !== "number" || !Number.isFinite(pick.confidence)) continue;
    const pConfidence = Math.min(1, Math.max(0, pick.confidence / 100));
    const pEdge =
      typeof pick.edgeScore === "number" && Number.isFinite(pick.edgeScore)
        ? Math.min(1, Math.max(0, pick.edgeScore / 100))
        : null;
    const sport = pick.game?.sport?.key ?? pick.game?.sport?.name ?? "unknown";
    const market = pick.pickType ?? "unknown";
    rows.push({
      pConfidence,
      pEdge,
      y: (pick.result === "WIN" ? 1 : 0) as 0 | 1,
      groupKey: `${sport}|${market}`,
      marketP: null,
    });
  }
  return rows;
}

export async function loadOrSeedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  const surface = await loadProvenPathSurface();
  return surface?.plan ?? null;
}

export async function loadProvenPathSurface(): Promise<ProvenPathSurface | null> {
  if (isStubMode()) return null;
  try {
    let plan = await loadProvenPathPlan();
    const rows = await loadRows();
    if (rows.length < 50) return null;
    if (!plan) {
      plan = buildProvenPathPlan(rows);
      await persistProvenPathPlan(plan);
    }
    const projection = projectProvenPathMetrics(rows);
    return { plan, projection };
  } catch {
    return null;
  }
}
