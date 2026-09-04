/**
 * Runtime selective publish + pause-list for public board rows.
 * PROVEN path: default ON (opt-out with SELECTIVE_PUBLISH_ENABLED=false).
 *
 * Pause groups:
 * - SELECTIVE_PAUSE_GROUPS env always applies
 * - plan.pauseGroups when RANKING_PAUSE_APPLY=true
 * - durable founder-yes snap (multi-isolate)
 * See ranking-pause-apply.ts.
 */

import {
  passesSelectiveThresholds,
  type SelectiveThresholds,
} from "@/lib/calibration/selective-publish";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import {
  resolvePausedGroups,
  rankingPauseApplyPosture,
} from "@/lib/calibration/ranking-pause-apply";
import type { RankingPauseDurableSnap } from "@/lib/ops/ranking-pause-durable";
import { redactErrorDetail } from "@/lib/log-safety";

export type PublicPickLike = {
  readonly confidence?: number | null;
  readonly rankingScore?: number | null;
  readonly edgeScore?: number | null;
  readonly pickType?: string | null;
  readonly sportKey?: string | null;
  readonly marketImpliedProb?: number | null;
  readonly rankingP?: number | null;
};

const DEFAULT_DELTA = 0.1;

export function isSelectivePublishRuntimeEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env["SELECTIVE_PUBLISH_ENABLED"]?.trim();
  if (v === "false") return false;
  if (v === "true") return true;
  return true;
}

export function loadSelectiveRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
  plan: ProvenPathPlan | null = null,
  durablePause: RankingPauseDurableSnap | null = null,
): {
  readonly enabled: boolean;
  readonly thresholds: SelectiveThresholds;
  readonly pausedGroups: readonly string[];
  readonly pauseSource: "env" | "plan" | "durable" | "none";
  readonly pauseApplyEnabled: boolean;
  readonly pauseOperatorHint: string;
} {
  const enabled = isSelectivePublishRuntimeEnabled(env);
  const deltaRaw = env["SELECTIVE_PUBLISH_DELTA"]?.trim();
  const deltaFromEnv = deltaRaw ? Number(deltaRaw) : NaN;
  const delta = Number.isFinite(deltaFromEnv)
    ? deltaFromEnv
    : plan?.selectiveRecommended?.delta ?? plan?.defaultDelta ?? DEFAULT_DELTA;

  const pause = resolvePausedGroups(env, plan, durablePause);

  return {
    enabled,
    thresholds: {
      delta,
      edge: plan?.selectiveRecommended?.edge ?? null,
      minGroupRes: null,
    },
    pausedGroups: pause.pausedGroups,
    pauseSource: pause.source,
    pauseApplyEnabled: pause.applyEnabled && pause.pausedGroups.length > 0,
    pauseOperatorHint: pause.operatorHint,
  };
}

/**
 * Read outcome shape both durable readers share.
 *
 * Kept structural rather than importing either concrete type: this module
 * loads the readers through a dynamic `import()` to stay out of their
 * dependency graph at module scope.
 */
type DurableReadOutcome<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "absent" }
  | { readonly status: "error" };

/**
 * How long a SUCCESSFUL read — a value or a genuine absence — is trusted.
 *
 * These caches used to have no expiry at all, which is wrong for a control
 * that other isolates can change: `POST /api/ops/ranking-pause-apply` clears
 * the cache in the isolate that served the request and no other, so a founder
 * enabling a pause was invisible to every already-warm isolate until it was
 * recycled. A minute of staleness is the cost of two indexed reads per minute
 * per isolate, and it bounds how long a kill switch can be ignored.
 */
const DURABLE_FRESH_MS = 60_000;

/**
 * How long to wait after a FAILED read before trying again.
 *
 * Refusing to cache a failure is right — a transient fault must not latch —
 * but on its own it is a stampede: `passesPublicSelectiveFilterAsync` runs
 * once per candidate pick inside a `Promise.all`, so an unreadable database
 * would be hit twice per pick, per request, for as long as the outage lasted.
 * Single-flight collapses the concurrent calls; this backoff bounds the serial
 * ones. Deliberately short — the pause must reassert itself quickly once the
 * database recovers.
 */
const DURABLE_FAILURE_BACKOFF_MS = 5_000;

/**
 * What one read attempt concluded.
 *
 * `superseded` means a `clear()` landed mid-read, so the answer describes the
 * world before a durable write — useless to everyone, including the caller
 * that started it.
 */
type ReadResolution<T> = {
  readonly superseded: boolean;
  readonly value: T | null;
};

type DurableCache<T> = {
  get(): Promise<T | null>;
  clear(): void;
};

/**
 * Freshness-bounded, single-flight cache over one durable control.
 *
 * Three properties, each of which was a defect on its own:
 *
 *  - a read FAILURE is never stored as a value, so a transient fault cannot
 *    latch "no pause is in effect" for the life of the isolate;
 *  - concurrent callers share one in-flight read, and a failed read is not
 *    retried for `DURABLE_FAILURE_BACKOFF_MS`, so an outage cannot turn one
 *    picks request into a query storm;
 *  - while a read is failing, the LAST KNOWN value keeps being served rather
 *    than `null`. For a suppression control that is the safe direction: a
 *    database we cannot reach is not evidence that the founder lifted the
 *    pause.
 */
function makeDurableCache<T>(
  label: string,
  read: () => Promise<DurableReadOutcome<T>>,
): DurableCache<T> {
  let cached: { value: T | null; at: number } | undefined;
  let failedAt = 0;
  let inFlight: Promise<ReadResolution<T>> | undefined;
  /**
   * Bumped by `clear()`. A read captures it at the moment it starts and may
   * only write back if it still matches.
   *
   * Without this, `clear()` merely forgot the in-flight promise — it could not
   * stop it. The ops route writes a new pause and calls
   * `clearSelectiveRuntimeCaches()`, but a read that started BEFORE the write
   * is still running; when it lands it would store the pre-write snapshot for
   * a full freshness window, so the pause the founder just enabled is ignored
   * for 60 seconds. Its `finally` would also clear a NEWER in-flight promise,
   * breaking single-flight for whoever was waiting on that one.
   */
  let generation = 0;

  /**
   * A superseded read re-reads rather than answering. Bounded only so a
   * pathological storm of writes cannot recurse without end; reaching the cap
   * needs three durable writes inside one request, which does not happen.
   */
  const MAX_SUPERSEDED_RETRIES = 3;

  /**
   * Hand the caller the freshest answer we can, never the superseded one.
   *
   * Returning a superseded read's own value was still wrong: the caller began
   * before the write, but it RESPONDS after it, so a request in flight when the
   * founder enabled a pause would go on to publish the groups that pause names.
   * "They asked first" is not a defence for a suppression control. Every waiter
   * on a superseded read — the originator and anyone who joined it — retries
   * into the current generation instead.
   */
  async function settle(res: ReadResolution<T>, depth: number): Promise<T | null> {
    if (!res.superseded) return res.value;
    // Cap reached: answer from the post-write cache, never from the stale read.
    if (depth >= MAX_SUPERSEDED_RETRIES) return cached?.value ?? null;
    return get(depth + 1);
  }

  async function get(depth = 0): Promise<T | null> {
    const now = Date.now();
    if (cached && now - cached.at < DURABLE_FRESH_MS) return cached.value;
    // Serve the last known answer rather than hammering a database that just
    // refused us. With no last known answer this is `null` — the same
    // less-restrictive answer as before, but reached at most once per
    // backoff window instead of once per candidate pick.
    if (now - failedAt < DURABLE_FAILURE_BACKOFF_MS) return cached?.value ?? null;
    if (inFlight) return settle(await inFlight, depth);

    const startedAt = generation;
    const current = (async (): Promise<ReadResolution<T>> => {
      try {
        const result = await read();
        // A clear() landed while we were reading: this answer describes the
        // world before the write. Never write it back, and never return it.
        if (startedAt !== generation) {
          return { superseded: true, value: null };
        }
        if (result.status === "error") {
          failedAt = Date.now();
          return { superseded: false, value: cached?.value ?? null };
        }
        cached = { value: result.status === "ok" ? result.value : null, at: Date.now() };
        return { superseded: false, value: cached.value };
      } catch (err) {
        // The dynamic import itself failed, or the reader threw unexpectedly.
        // Unavailability, not absence — do not store it as a value, and do
        // not swallow it silently.
        const superseded = startedAt !== generation;
        if (!superseded) failedAt = Date.now();
        console.error(
          `[selective-publish] ${label} could not be read: ${redactErrorDetail(err)}. ` +
            "Treating as UNAVAILABLE (not 'not set'); serving the last known value " +
            "and retrying after a short backoff.",
        );
        return { superseded, value: cached?.value ?? null };
      }
    })();

    inFlight = current;
    void current.finally(() => {
      // Only retract our OWN handle. A superseded read must not clear the
      // in-flight promise a later caller is waiting on.
      if (inFlight === current) inFlight = undefined;
    });

    return settle(await current, depth);
  }

  return {
    get: () => get(),
    clear(): void {
      generation += 1;
      cached = undefined;
      failedAt = 0;
      inFlight = undefined;
    },
  };
}

const provenPathCache = makeDurableCache<ProvenPathPlan>("durable proven-path plan", async () => {
  const { readProvenPathPlan } = await import("@/lib/ops/proven-path-durable");
  const result = await readProvenPathPlan();
  return result.status === "ok" ? { status: "ok", value: result.plan } : { status: result.status };
});

const rankingPauseCache = makeDurableCache<RankingPauseDurableSnap>(
  "durable ranking pause",
  async () => {
    const { readRankingPauseApply } = await import("@/lib/ops/ranking-pause-durable");
    const result = await readRankingPauseApply();
    return result.status === "ok" ? { status: "ok", value: result.snap } : { status: result.status };
  },
);

export async function getCachedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  return provenPathCache.get();
}

export async function getCachedRankingPauseDurable(): Promise<RankingPauseDurableSnap | null> {
  return rankingPauseCache.get();
}

/** Test / post-write: drop in-memory caches. */
export function clearSelectiveRuntimeCaches(): void {
  provenPathCache.clear();
  rankingPauseCache.clear();
}

export function passesPublicSelectiveFilter(
  pick: PublicPickLike,
  env: Record<string, string | undefined> = process.env,
  plan: ProvenPathPlan | null = null,
  durablePause: RankingPauseDurableSnap | null = null,
): boolean {
  const cfg = loadSelectiveRuntimeConfig(env, plan, durablePause);
  if (!cfg.enabled) return true;
  let p = 0.5;
  if (typeof pick.rankingP === "number" && Number.isFinite(pick.rankingP)) {
    p = Math.min(1, Math.max(0, pick.rankingP));
  } else if (
    typeof pick.rankingScore === "number" &&
    Number.isFinite(pick.rankingScore)
  ) {
    p = Math.min(1, Math.max(0, pick.rankingScore / 100));
  } else if (
    typeof pick.confidence === "number" &&
    Number.isFinite(pick.confidence)
  ) {
    p = Math.min(1, Math.max(0, pick.confidence / 100));
  }
  const groupKey = `${pick.sportKey ?? "unknown"}|${pick.pickType ?? "unknown"}`;
  if (cfg.pausedGroups.includes(groupKey)) return false;
  return passesSelectiveThresholds(
    {
      p,
      y: 0,
      groupKey,
      marketP: pick.marketImpliedProb ?? null,
    },
    cfg.thresholds,
  );
}

export async function passesPublicSelectiveFilterAsync(
  pick: PublicPickLike,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const plan = await getCachedProvenPathPlan();
  const durable = await getCachedRankingPauseDurable();
  return passesPublicSelectiveFilter(pick, env, plan, durable);
}

export function selectiveRuntimePosture(
  env: Record<string, string | undefined> = process.env,
  plan: ProvenPathPlan | null = null,
  durablePause: RankingPauseDurableSnap | null = null,
) {
  const cfg = loadSelectiveRuntimeConfig(env, plan, durablePause);
  const pause = rankingPauseApplyPosture(env, plan, durablePause);
  return {
    selectiveEnabled: cfg.enabled,
    delta: cfg.thresholds.delta,
    pause,
    operatorHint: cfg.enabled
      ? `Selective δ=${cfg.thresholds.delta}. ${pause.operatorHint}`
      : `Selective publish OFF. ${pause.operatorHint}`,
  };
}

/** Async posture with durable plan + pause snap loaded. */
export async function selectiveRuntimePostureAsync(
  env: Record<string, string | undefined> = process.env,
) {
  const plan = await getCachedProvenPathPlan();
  const durable = await getCachedRankingPauseDurable();
  return selectiveRuntimePosture(env, plan, durable);
}
