/**
 * Traffic-driven ingestion failsafe — keeps the spine alive when the platform
 * scheduler is not firing.
 *
 * THE PROBLEM THIS SOLVES (2026-08-10 incident). Ingestion sat dead for 13+
 * hours. Root cause was not the data and not the routes: it was that NOTHING
 * WAS CALLING THEM. This deployment has two declared schedulers and both were
 * down at once:
 *   1. GitHub Actions (`external-cron.yml`) — the de-facto real scheduler, at
 *      15m–2h cadence. Its runner minutes were exhausted on this private repo
 *      (every run since ~02:52 UTC completes in ~2s with runner_id:0, meaning
 *      no runner was ever assigned). Its own header already documents this.
 *   2. Vercel platform cron (`vercel.json`) — declares 20 crons at 15m–24h
 *      cadence, but this account is Hobby, where cron frequency is capped at
 *      once per day. The declared 15-minute cadence is fiction on that plan.
 * Last ingestion SUCCESS was 03:04 UTC, minutes after (1) died. Restoring
 * either scheduler needs a billing/plan change — an owner action, not a code
 * change — so until then the pipeline has no heartbeat at all.
 *
 * THE FIX. Organic request traffic is the one signal that still arrives
 * reliably (~1 req/min in production). This module borrows a slice of that
 * traffic to run the same real ingestion work a cron would have run. No
 * secret, no billing, no dashboard access required.
 *
 * WHY THIS IS SAFE TO RUN ON PUBLIC TRAFFIC (each guard is load-bearing):
 *   - FAILSAFE ONLY. It fires solely when ingestion is ALREADY past the shared
 *     REFRESH_STALE_AFTER_MINUTES SLA — i.e. only when the pipeline is already
 *     broken. With a healthy scheduler this code never does any work at all,
 *     so it cannot alter behaviour of a working system.
 *   - DURABLE COOLDOWN. A Neon-backed lease (JarvisMemoryEvent, same pattern as
 *     free-spine-durable.ts — no migration) caps attempts to one per
 *     HEARTBEAT_COOLDOWN_MINUTES across ALL serverless isolates. Public traffic
 *     therefore cannot amplify into repeated ingestion, no matter the volume.
 *   - NON-BLOCKING. Callers are expected to fire-and-forget; nothing here is
 *     awaited on a user-facing render path.
 *   - NEVER THROWS. Every failure degrades to a recorded reason. A failsafe
 *     that can take down the request path it rides on is worse than no failsafe.
 *   - KILL SWITCH. TRAFFIC_HEARTBEAT_DISABLED=true disables it entirely.
 *
 * HONEST LIMITS. This is a stopgap, not a scheduler. It gives coverage roughly
 * proportional to traffic, so a truly dead site stays dead — which is the
 * correct failure mode, since a site with no visitors has no one to serve. It
 * does NOT relieve the owner of restoring a real scheduler; `schedulerLiveness`
 * on the ops surface keeps reporting the underlying outage regardless.
 *
 * Runs real ingestion only — never fabricates a run, a game, or an odds row.
 */
import { db, isStubMode } from "@sports/db";
import { runBoardFillPipeline } from "@sports/ingestion-pipeline";
import { recordFreeIngestionRun } from "@/lib/data-sources/free-ingestion-run";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";

/** Durable lease scope (JarvisMemoryEvent) — no schema migration required. */
export const TRAFFIC_HEARTBEAT_SCOPE = "ops.traffic-heartbeat.lease";

/**
 * Minimum gap between two traffic-triggered attempts, across all isolates.
 * Deliberately well above the work's own duration and comfortably below the
 * 240m staleness SLA, so a stale spine recovers within one cooldown while
 * high traffic still cannot amplify into repeated ingestion.
 */
export const HEARTBEAT_COOLDOWN_MINUTES = 30;

export type TrafficHeartbeatOutcome =
  | "disabled"
  | "stub"
  | "fresh"
  | "cooling-down"
  | "ran"
  | "error";

export interface TrafficHeartbeatResult {
  readonly outcome: TrafficHeartbeatOutcome;
  /** Age of the last ingestion SUCCESS at decision time, when known. */
  readonly ingestionAgeMinutes: number | null;
  readonly reason: string;
}

function result(
  outcome: TrafficHeartbeatOutcome,
  ingestionAgeMinutes: number | null,
  reason: string,
): TrafficHeartbeatResult {
  return { outcome, ingestionAgeMinutes, reason };
}

function killSwitchEngaged(): boolean {
  return process.env["TRAFFIC_HEARTBEAT_DISABLED"]?.trim().toLowerCase() === "true";
}

/** Age in minutes of the newest SUCCESS IngestionRun, or null when none/unreadable. */
async function lastIngestionAgeMinutes(nowMs: number): Promise<number | null> {
  const run = await db.ingestionRun.findFirst({
    where: { status: "SUCCESS" },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });
  if (!run?.completedAt) return null;
  return Math.round((nowMs - run.completedAt.getTime()) / 60000);
}

/**
 * True when a lease was taken. Writing the lease BEFORE the work (rather than
 * after) is deliberate: it bounds a concurrent-isolate race to a small window
 * instead of leaving it open for the whole ingestion duration. Two isolates
 * landing inside that window would at worst run ingestion twice, which is
 * idempotent-by-upsert here and strictly better than the alternative of never
 * running at all.
 */
async function acquireLease(nowMs: number): Promise<boolean> {
  const newest = await db.jarvisMemoryEvent.findFirst({
    where: { scope: TRAFFIC_HEARTBEAT_SCOPE },
    orderBy: { created_at: "desc" },
    select: { created_at: true },
  });
  if (newest?.created_at) {
    const ageMinutes = (nowMs - newest.created_at.getTime()) / 60000;
    if (ageMinutes < HEARTBEAT_COOLDOWN_MINUTES) return false;
  }
  await db.jarvisMemoryEvent.create({
    data: {
      memory_type: "episodic",
      memory_state: "confirmed",
      scope: TRAFFIC_HEARTBEAT_SCOPE,
      title: "Traffic-driven ingestion failsafe attempt",
      summary: `Scheduler silent past ${REFRESH_STALE_AFTER_MINUTES}m SLA — borrowing organic traffic to run ingestion.`,
      source_type: "ops.traffic-heartbeat",
      source_timestamp: new Date(nowMs),
      actor: "system",
      owner: "system",
      confidence: 90,
      tags: ["ops", "ingestion", "failsafe", "traffic-heartbeat"],
      owner_approval: true,
    },
  });
  return true;
}

/**
 * Run the ingestion failsafe if — and only if — the spine is already stale and
 * no other isolate has attempted recently. Never throws; safe to fire-and-forget.
 */
export async function maybeRunTrafficHeartbeat(
  nowMs: number = Date.now(),
): Promise<TrafficHeartbeatResult> {
  if (killSwitchEngaged()) {
    return result("disabled", null, "TRAFFIC_HEARTBEAT_DISABLED=true");
  }
  if (isStubMode()) {
    return result("stub", null, "Stub DB mode — no durable ingestion to heal.");
  }

  let ageMinutes: number | null = null;
  try {
    ageMinutes = await lastIngestionAgeMinutes(nowMs);
  } catch {
    return result("error", null, "Could not read last IngestionRun.");
  }

  // Healthy (or unknowable) spine: do nothing. A null age means no SUCCESS has
  // EVER been recorded, which is also a legitimate cold-start case to heal.
  if (ageMinutes !== null && ageMinutes < REFRESH_STALE_AFTER_MINUTES) {
    return result(
      "fresh",
      ageMinutes,
      `Ingestion ${ageMinutes}m old — inside ${REFRESH_STALE_AFTER_MINUTES}m SLA; failsafe idle.`,
    );
  }

  try {
    const leased = await acquireLease(nowMs);
    if (!leased) {
      return result(
        "cooling-down",
        ageMinutes,
        `Another attempt ran within ${HEARTBEAT_COOLDOWN_MINUTES}m — skipping.`,
      );
    }
  } catch {
    return result("error", ageMinutes, "Could not acquire heartbeat lease.");
  }

  try {
    const fill = await runBoardFillPipeline({ logPrefix: "[traffic-heartbeat]" });

    // Honest counts only, read from the real pipeline result. `oddsInserted` is
    // per-sport inside odds.results — there is no top-level total.
    const gamesUpserted = fill.seed.upserted;
    const oddsInserted = fill.odds.results.reduce(
      (sum, r) => sum + (r.oddsInserted ?? 0),
      0,
    );
    const signalsGenerated = fill.signals.ok;

    // A SUCCESS row is what flips /api/health back to 200, so it must mean the
    // spine ACTUALLY did work. Stamping SUCCESS after a no-op would mask a
    // broken pipeline behind a green health check — the exact dishonesty this
    // codebase forbids. Record FAILED when nothing was accomplished.
    const didRealWork = gamesUpserted > 0 || oddsInserted > 0 || signalsGenerated;
    await recordFreeIngestionRun({
      sport: "traffic-heartbeat",
      gamesUpserted,
      oddsInserted,
      failed: !didRealWork,
      errorMessage: didRealWork
        ? null
        : "traffic-heartbeat: board-fill completed but seeded no games, inserted no odds and produced no signals",
    });

    return result(
      didRealWork ? "ran" : "error",
      ageMinutes,
      didRealWork
        ? `Ingestion was ${ageMinutes ?? "unknown"}m stale — ran board-fill from organic traffic ` +
          `(games=${gamesUpserted}, odds=${oddsInserted}, signals=${signalsGenerated ? "ok" : "none"}).`
        : "Board-fill ran but accomplished nothing — recorded FAILED rather than a misleading SUCCESS.",
    );
  } catch (err) {
    return result(
      "error",
      ageMinutes,
      `Board-fill failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
