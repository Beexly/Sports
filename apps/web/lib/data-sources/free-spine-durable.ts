/**
 * Durable free-spine probe snapshot — Neon-backed for multi-instance cockpit.
 *
 * Process-local free-spine-cache is hot-path; free-spine-health also writes
 * here so jarvis-data on a cold isolate can still score live multi-source
 * probes. Uses existing JarvisMemoryEvent (no migration) — same pattern as
 * jarvis-history-durable. Stub DB → no-op reads/writes (honest).
 *
 * Invariants: I3 (multi-isolate cache) · I8 (durable snap age ≤ 120m SLA)
 */
import { db, isStubMode } from "@sports/db";
import type { FreeSpineCacheSnapshot } from "@/lib/data-sources/free-spine-cache";

export const FREE_SPINE_SCOPE = "data-sources.free-spine.health";

/** Cockpit SLA: free-spine durable snap should be ≤ 120 minutes old. */
export const FREE_SPINE_DURABLE_SLA_MS = 120 * 60 * 1000;

function isLiveRow(value: unknown): value is FreeSpineCacheSnapshot["live"][number] {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.sport === "string" &&
    (o.used === null || typeof o.used === "string") &&
    typeof o.games === "number" &&
    typeof o.failover === "boolean"
  );
}

function isFreeSpineSnapshot(value: unknown): value is FreeSpineCacheSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  if (typeof o.probedAt !== "string") return false;
  if (typeof o.sportsProbed !== "number") return false;
  if (typeof o.sportsWithGames !== "number") return false;
  if (typeof o.criticalGaps !== "number") return false;
  if (typeof o.requireSpend !== "number") return false;
  if (typeof o.freeCovered !== "number") return false;
  if (!Array.isArray(o.live)) return false;
  for (const row of o.live) {
    if (!isLiveRow(row)) return false;
  }
  return true;
}

/** Persist latest free-spine probe. Never throws. */
export async function persistFreeSpineSnapshot(
  snap: FreeSpineCacheSnapshot,
): Promise<"ok" | "stub" | "error"> {
  if (isStubMode()) return "stub";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: FREE_SPINE_SCOPE,
        title: `Free-spine ${snap.sportsWithGames}/${snap.sportsProbed} games · gaps=${snap.criticalGaps}`,
        summary: `freeCovered=${snap.freeCovered} requireSpend=${snap.requireSpend} sportsWithGames=${snap.sportsWithGames}`,
        full_text: JSON.stringify(snap),
        source_type: "cron.free-spine-health",
        source_timestamp: new Date(snap.probedAt),
        actor: "system",
        owner: "system",
        confidence: 90,
        tags: ["free-spine", "multi-source", "i3", "i8"],
        metadata: snap as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

/** Newest durable free-spine snapshot (null on stub / error / empty). */
export async function loadDurableFreeSpine(): Promise<FreeSpineCacheSnapshot | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: FREE_SPINE_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { metadata: true, full_text: true },
    });
    if (!row) return null;
    if (isFreeSpineSnapshot(row.metadata)) return row.metadata;
    if (typeof row.full_text === "string") {
      try {
        const parsed: unknown = JSON.parse(row.full_text);
        if (isFreeSpineSnapshot(parsed)) return parsed;
      } catch {
        /* skip corrupt */
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Age of snap in ms, or null if unparseable. */
export function freeSpineSnapAgeMs(
  snap: FreeSpineCacheSnapshot | null,
  nowMs = Date.now(),
): number | null {
  if (!snap) return null;
  const t = Date.parse(snap.probedAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, nowMs - t);
}

/** True when snap is present and age ≤ FREE_SPINE_DURABLE_SLA_MS (I8). */
export function freeSpineWithinSla(
  snap: FreeSpineCacheSnapshot | null,
  nowMs = Date.now(),
  maxAgeMs = FREE_SPINE_DURABLE_SLA_MS,
): boolean {
  const age = freeSpineSnapAgeMs(snap, nowMs);
  return age != null && age <= maxAgeMs;
}
