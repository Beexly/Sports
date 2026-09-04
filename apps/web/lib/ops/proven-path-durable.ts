/**
 * Persist PROVEN path plan for multi-isolate runtime (pause list + selective δ).
 */

import { db, isStubMode } from "@sports/db";
import { redactErrorDetail } from "@/lib/log-safety";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";

export const PROVEN_PATH_SCOPE = "ops.calibration.proven-path";

/**
 * Driver errors are not safe to print raw: Prisma's P1001 carries the database
 * host and port, and an initialization error can carry the datasource URL with
 * its credentials. Redact before logging.
 */
function errMessage(err: unknown): string {
  return redactErrorDetail(err);
}

/** Outcome of a durable write — same three states as the other ops persisters. */
export type ProvenPathWriteResult = "ok" | "stub" | "error";

/**
 * Persist the proven-path plan.
 *
 * RETURNS AN OUTCOME instead of `void`. The bare "best-effort" catch it used to
 * end in meant a failed write looked exactly like a successful one, and both
 * callers discarded the (absent) result: the calibration-metrics cron answered
 * 200, and `proven-path-seed` reported a completed seed. Downstream,
 * `loadProvenPathPlan` feeds the selective-publish pause list and the
 * FOUNDING → PROVEN proof gate, so a silently dropped write leaves the ladder
 * stuck and the pause groups unapplied while every surface claims a healthy
 * cycle.
 */
export async function persistProvenPathPlan(
  plan: ProvenPathPlan,
): Promise<ProvenPathWriteResult> {
  if (isStubMode()) return "stub";
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
    return "ok";
  } catch (err) {
    console.error(
      `[ops:proven-path] persistProvenPathPlan FAILED (generatedAt=${plan.generatedAt} ` +
        `pauseGroups=${plan.pauseGroups.length} defaultDelta=${plan.defaultDelta}): ` +
        `${errMessage(err)}. The plan was NOT stored — selective publish and the ` +
        "PROVEN gate keep running on the previous plan this cycle.",
    );
    return "error";
  }
}

/**
 * Outcome of a durable plan READ, with absence and unavailability kept apart.
 *
 * Same shape and same reason as `RankingPauseReadResult`: `loadProvenPathPlan`
 * collapses both to `null`, which callers must degrade on — but a cache that
 * memoises the `null` from a transient read failure latches "no plan recorded"
 * for the life of the isolate. Plan-backed pause groups and thresholds then
 * stay disabled long after the database recovers.
 */
export type ProvenPathReadResult =
  | { readonly status: "ok"; readonly plan: ProvenPathPlan }
  | { readonly status: "absent" }
  | { readonly status: "error"; readonly message: string };

/**
 * Read the durable plan, distinguishing "no plan yet" from "could not read".
 *
 * The ONE reader; `loadProvenPathPlan` is the lossy wrapper over it. A row
 * whose payload cannot be parsed reports `error`, not `absent`, for the same
 * reason as the ranking pause: absence is the less restrictive answer, and a
 * snapshot we merely failed to understand must not be reported as "no plan".
 */
export async function readProvenPathPlan(): Promise<ProvenPathReadResult> {
  if (isStubMode()) return { status: "absent" };
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: PROVEN_PATH_SCOPE, memory_type: "episodic" },
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
    // Validate the fields callers actually read before reporting "ok". A bare
    // `{}` is an object, and returning it as a plan would put an empty control
    // state into the runtime cache — `resolvePausedGroups` would then read
    // `pauseGroups` off it and conclude nothing is paused.
    const shape = raw as { pauseGroups?: unknown; defaultDelta?: unknown };
    if (
      Array.isArray(raw) ||
      !Array.isArray(shape.pauseGroups) ||
      typeof shape.defaultDelta !== "number" ||
      !Number.isFinite(shape.defaultDelta)
    ) {
      throw new Error("durable proven-path payload is malformed (missing pauseGroups/defaultDelta)");
    }
    return { status: "ok", plan: raw as ProvenPathPlan };
  } catch (err) {
    const message = errMessage(err);
    console.error(
      `[ops:proven-path] readProvenPathPlan FAILED: ${message}. ` +
        "Reporting 'no plan' — this is a read failure, not proof of absence.",
    );
    return { status: "error", message };
  }
}

/**
 * Newest durable proven-path plan, or null.
 *
 * `null` legitimately means "no plan recorded yet". A failed read returns the
 * same null (verdict unchanged — callers must degrade, not crash) and has
 * already been logged by `readProvenPathPlan`, so absence and unavailability
 * stay distinguishable in the logs. Prefer `readProvenPathPlan` anywhere the
 * answer is cached.
 */
export async function loadProvenPathPlan(): Promise<ProvenPathPlan | null> {
  const result = await readProvenPathPlan();
  return result.status === "ok" ? result.plan : null;
}
