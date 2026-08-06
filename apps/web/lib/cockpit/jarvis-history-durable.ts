/**
 * Durable Jarvis history — Neon-backed snapshots for multi-instance cockpit.
 *
 * Process-local ring buffer still used for hot path; cron also writes here so
 * trend survives isolate restarts. Uses existing JarvisMemoryEvent (no migration).
 * Stub DB → no-op reads/writes (honest).
 */
import { db, isStubMode } from "@sports/db";
import type { JarvisHistorySnapshot } from "@/lib/cockpit/jarvis-history";

export const JARVIS_HISTORY_SCOPE = "cockpit.jarvis.history";

function isSnapshot(value: unknown): value is JarvisHistorySnapshot {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return typeof o.assessedAt === "string" && typeof o.launchStatus === "string";
}

/** Persist one snapshot. Never throws. */
export async function persistJarvisHistorySnapshot(
  snap: JarvisHistorySnapshot,
): Promise<"ok" | "stub" | "error"> {
  if (isStubMode()) return "stub";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: JARVIS_HISTORY_SCOPE,
        title: `Jarvis ${snap.launchStatus} · settle=${snap.settlementStatus}`,
        summary: `ingest=${snap.ingestionStatus} public=${snap.publicSurfaceStatus} actions=${snap.recommendedActionCount}`,
        full_text: JSON.stringify(snap),
        source_type: "cron.jarvis-snapshot",
        source_timestamp: new Date(snap.assessedAt),
        actor: "system",
        owner: "system",
        confidence: 90,
        tags: ["jarvis", "history", "cockpit"],
        metadata: snap as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

/** Newest-first durable snapshots (empty on stub / error). */
export async function loadDurableJarvisHistory(
  limit = 48,
): Promise<readonly JarvisHistorySnapshot[]> {
  if (isStubMode()) return [];
  const take = Math.min(Math.max(1, Math.floor(limit)), 96);
  try {
    const rows = await db.jarvisMemoryEvent.findMany({
      where: { scope: JARVIS_HISTORY_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      take,
      select: { metadata: true, full_text: true },
    });
    const out: JarvisHistorySnapshot[] = [];
    for (const row of rows) {
      if (isSnapshot(row.metadata)) {
        out.push(row.metadata);
        continue;
      }
      if (typeof row.full_text === "string") {
        try {
          const parsed: unknown = JSON.parse(row.full_text);
          if (isSnapshot(parsed)) out.push(parsed);
        } catch {
          /* skip */
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}
