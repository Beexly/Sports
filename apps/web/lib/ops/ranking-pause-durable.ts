/**
 * Durable RANKING_PAUSE_APPLY — multi-isolate founder opt-in without waiting
 * for a Vercel env redeploy. Env RANKING_PAUSE_APPLY=true still wins.
 * Does not open PROVEN / PERFORMANCE_STATS / maps.
 */

import { db, isStubMode } from "@sports/db";

export const RANKING_PAUSE_DURABLE_SCOPE = "ops.ranking.pause-apply";

export type RankingPauseDurableSnap = {
  readonly enabled: boolean;
  readonly groups: readonly string[];
  readonly setAt: string;
  readonly setBy: string;
  readonly note: string;
};

export async function persistRankingPauseApply(
  snap: RankingPauseDurableSnap,
): Promise<void> {
  if (isStubMode()) return;
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: RANKING_PAUSE_DURABLE_SCOPE,
        title: `RANKING_PAUSE_APPLY durable ${snap.enabled ? "ON" : "OFF"} n=${snap.groups.length}`,
        summary: snap.note,
        full_text: JSON.stringify(snap),
        source_type: "ops.ranking-pause-apply",
        source_timestamp: new Date(snap.setAt),
        actor: snap.setBy,
        owner: "system",
        confidence: 95,
        tags: ["ranking-pause", "selective", "founder-opt-in"],
        metadata: snap as object,
        owner_approval: true,
      },
    });
  } catch {
    /* best-effort */
  }
}

export async function loadRankingPauseApply(): Promise<RankingPauseDurableSnap | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: RANKING_PAUSE_DURABLE_SCOPE, memory_type: "episodic" },
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
    const s = raw as RankingPauseDurableSnap;
    if (typeof s.enabled !== "boolean") return null;
    return {
      enabled: s.enabled,
      groups: Array.isArray(s.groups) ? s.groups.map(String) : [],
      setAt: typeof s.setAt === "string" ? s.setAt : new Date().toISOString(),
      setBy: typeof s.setBy === "string" ? s.setBy : "unknown",
      note: typeof s.note === "string" ? s.note : "",
    };
  } catch {
    return null;
  }
}
