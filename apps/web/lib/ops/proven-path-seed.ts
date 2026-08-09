/**
 * Auto-build proven path plan when durable missing — no founder cron click.
 */

import { db, isStubMode } from "@sports/db";
import { buildProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import {
  loadProvenPathPlan,
  persistProvenPathPlan,
} from "@/lib/ops/proven-path-durable";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { CANONICAL_LEARNING_PICK_WHERE } from "@/lib/ops/compute-live-calibration-metrics";

export async function loadOrSeedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  const existing = await loadProvenPathPlan();
  if (existing) return existing;
  if (isStubMode()) return null;

  try {
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

    const rows = [];
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
        marketP: null as number | null,
      });
    }
    if (rows.length < 50) return null;
    const plan = buildProvenPathPlan(rows);
    await persistProvenPathPlan(plan);
    return plan;
  } catch {
    return null;
  }
}
