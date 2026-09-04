/**
 * Durable RANKING_PAUSE_APPLY — multi-isolate founder opt-in without waiting
 * for a Vercel env redeploy. Env RANKING_PAUSE_APPLY=true still wins.
 * Does not open PROVEN / PERFORMANCE_STATS / maps.
 */

import { db, isStubMode } from "@sports/db";
import { redactErrorDetail, sanitizeLogField } from "@/lib/log-safety";

export const RANKING_PAUSE_DURABLE_SCOPE = "ops.ranking.pause-apply";

/**
 * Driver errors are not safe to print raw: Prisma's P1001 carries the database
 * host and port, and an initialization error can carry the datasource URL with
 * its credentials. Redact before logging.
 */
function errMessage(err: unknown): string {
  return redactErrorDetail(err);
}

export type RankingPauseDurableSnap = {
  readonly enabled: boolean;
  readonly groups: readonly string[];
  readonly setAt: string;
  readonly setBy: string;
  readonly note: string;
};

/**
 * Outcome of a durable write. Mirrors the `"ok" | "stub" | "error"` shape
 * `persistDurableFreeSpine` already uses so callers read the same three states
 * everywhere.
 */
export type RankingPauseWriteResult = "ok" | "stub" | "error";

/**
 * Persist the durable pause snapshot.
 *
 * RETURNS AN OUTCOME instead of `void`. It previously ended in a bare
 * "best-effort" catch and returned nothing, so a failed write was
 * indistinguishable from a successful one — and the only caller
 * (`POST /api/ops/ranking-pause-apply`) went on to answer `{ ok: true, durable:
 * snap }`, echoing back a snapshot that had never been stored. This is a
 * SUPPRESSION control: the founder reads "applied", the other isolates read the
 * DB, find nothing, and keep publishing the groups that were supposed to be
 * paused. "Best-effort" is not an acceptable posture for a kill switch.
 */
export async function persistRankingPauseApply(
  snap: RankingPauseDurableSnap,
): Promise<RankingPauseWriteResult> {
  if (isStubMode()) return "stub";
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
    return "ok";
  } catch (err) {
    console.error(
      `[ops:ranking-pause] persistRankingPauseApply FAILED (enabled=${snap.enabled} ` +
        `groups=${snap.groups.length} setBy=${sanitizeLogField(snap.setBy, 120)}): ` +
        `${errMessage(err)}. ` +
        "The durable pause was NOT stored — other isolates will keep the previous posture.",
    );
    return "error";
  }
}

/**
 * Outcome of a durable READ, with absence and unavailability kept apart.
 *
 * `loadRankingPauseApply` collapses both to `null`, which is right for callers
 * that must degrade rather than crash — but it is NOT safe to cache. A caller
 * that memoises the `null` from a transient read failure latches "no pause is
 * in effect" for the life of the isolate, which turns a kill switch into a
 * no-op. `getCachedRankingPauseDurable` uses this shape so it can cache a real
 * absence and retry an unavailability.
 */
export type RankingPauseReadResult =
  | { readonly status: "ok"; readonly snap: RankingPauseDurableSnap }
  | { readonly status: "absent" }
  | { readonly status: "error"; readonly message: string };

/**
 * Read the durable pause, distinguishing "no record" from "could not read".
 *
 * This is the ONE reader; `loadRankingPauseApply` is a lossy wrapper over it.
 * They were briefly separate implementations of the same parse, which is how a
 * cached read and an API read drift apart on what a valid payload is.
 *
 * A row whose payload cannot be parsed reports `error`, not `absent`. Absence
 * is the LESS restrictive answer — it hands the decision back to the env var —
 * so a snapshot we merely failed to understand must not be reported as "no
 * pause is set", which would leave a corrupt row silently disabling the kill
 * switch for the isolate's whole life.
 */
export async function readRankingPauseApply(): Promise<RankingPauseReadResult> {
  if (isStubMode()) return { status: "absent" };
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: RANKING_PAUSE_DURABLE_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { metadata: true, full_text: true },
    });
    if (!row) return { status: "absent" };
    const raw =
      typeof row.metadata === "object" && row.metadata !== null
        ? row.metadata
        : row.full_text
          ? JSON.parse(row.full_text)
          : null;
    if (!raw || typeof raw !== "object" || typeof (raw as RankingPauseDurableSnap).enabled !== "boolean") {
      // A row exists but we cannot read it. Treated as unavailability so the
      // caller retries and an operator sees it, never as "no pause set".
      throw new Error("durable ranking-pause payload is malformed (no boolean `enabled`)");
    }
    const s = raw as RankingPauseDurableSnap;
    return {
      status: "ok",
      snap: {
        enabled: s.enabled,
        groups: Array.isArray(s.groups) ? s.groups.map(String) : [],
        setAt: typeof s.setAt === "string" ? s.setAt : new Date().toISOString(),
        setBy: typeof s.setBy === "string" ? s.setBy : "unknown",
        note: typeof s.note === "string" ? s.note : "",
      },
    };
  } catch (err) {
    const message = errMessage(err);
    console.error(
      `[ops:ranking-pause] readRankingPauseApply FAILED: ${message}. ` +
        "Reporting 'unavailable' — this is a read failure, not proof of absence.",
    );
    return { status: "error", message };
  }
}

/**
 * Newest durable pause snapshot, or null.
 *
 * `null` means "no durable pause is in force", which is the LESS restrictive
 * answer — so a read failure must not be mistaken for a deliberate absence.
 * The verdict is unchanged (callers already treat null as "env decides"), and
 * `readRankingPauseApply` has already logged the cause, so an operator can
 * still tell a real "no pause set" from a database that could not answer.
 *
 * Prefer `readRankingPauseApply` anywhere the answer is stored, cached, or
 * reported: this wrapper throws away the distinction on purpose.
 */
export async function loadRankingPauseApply(): Promise<RankingPauseDurableSnap | null> {
  const result = await readRankingPauseApply();
  return result.status === "ok" ? result.snap : null;
}
