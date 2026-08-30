/**
 * Persist PROVEN path plan for multi-isolate runtime (pause list + selective δ).
 */

import { db, isStubMode } from "@sports/db";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";

export const PROVEN_PATH_SCOPE = "ops.calibration.proven-path";

export async function persistProvenPathPlan(plan: ProvenPathPlan): Promise<void> {
  if (isStubMode()) return;
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: PROVEN_PATH_SCOPE,
        title: `Proven-path best=${plan.bestScore} Res=${plan.baseline.murphyResolution}`,
        summary: `selectiveΔRes=${plan.selectiveGainRes ?? "n/a"} pause=${plan.pauseGroups.length} δ=${plan.defaultDelta}`,
        full_text: JSON.stringify(plan),
        source_type: "cron.calibration-metrics",
        source_timestamp: new Date(plan.generatedAt),
        actor: "system",
        owner: "system",
        confidence: 90,
        tags: ["proven-path", "resolution", "selective-publish"],
        metadata: plan as object,
        owner_approval: true,
      },
    });
  } catch {
    /* best-effort */
  }
}

export async function loadProvenPathPlan(): Promise<ProvenPathPlan | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: PROVEN_PATH_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { metadata: true, full_text: true },
    });
    if (!row) return null;
    const raw =
      typeof row.metadata === "object" && row.metadata !== null
        ? row.metadata
        : row.full_text
          ? JSON.parse(row.full_text)
          : null;
    if (!raw || typeof raw !== "object") return null;
    return raw as ProvenPathPlan;
  } catch {
    return null;
  }
}
