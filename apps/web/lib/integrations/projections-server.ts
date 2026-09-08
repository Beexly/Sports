import "server-only";
import { isConfigured } from "./providers";
import { isLiveProjections, resolveToolPool } from "./projections";
import type { Player } from "../fantasy/players";

/**
 * SERVER-ONLY live-projections loader. Kept out of projections.ts because that
 * module is reachable from client components (e.g. the lineup optimizer), and the
 * dynamic graded-pool import below pulls node:zlib — which must never enter a
 * client bundle. The `server-only` import makes a client import a hard build error.
 *
 * RELIABILITY: serverless instances freeze after a response, so a background
 * (fire-and-forget) registration in instrumentation may never finish on a
 * low-traffic instance. This lazily loads on first tool access instead,
 * guaranteeing the fantasy tools get the live pool — while the showcase pages
 * (which never call this) keep their fast cold starts.
 *
 * De-duplicated via a module-level cached promise so concurrent tool requests and
 * the instrumentation head-start share ONE multi-MB load.
 *
 * THE CACHE IS TIME-BOUNDED, and both reasons were found in review (C-229).
 *
 * 1. A cached attempt used to be cleared only when the promise REJECTED. Once
 *    the graded pool started returning `source-error` as a normal value for a
 *    refused basis rather than throwing, the promise fulfilled with no provider
 *    registered - so the cache stuck, `isLiveProjections` stayed false, and the
 *    instance never retried. Paid tools fell back to the illustrative pool for
 *    the entire life of the process. A non-live result now clears the cache.
 *
 * 2. The registration is a process-wide singleton and the basis decision is
 *    WEEK-DEPENDENT. A provider registered inside the prior-season grace window
 *    stayed registered after that window closed, so a basis the gate would now
 *    refuse kept serving. Nothing about "already registered" implies "still
 *    admissible".
 *
 * One mechanism covers both: a reload interval. The fast path stays a timestamp
 * comparison with no import, an inadmissible basis cannot outlive the interval,
 * and a refusal retries on the next request after a short cooldown rather than
 * waiting it out.
 *
 * A REFRESH IS SINGLE-FLIGHT (C-230, found in review of the above). The stale
 * path cleared the cached promise so the next call would rebuild — but under
 * concurrent traffic EVERY request took that path, because the old provider is
 * still registered and `registeredAt` does not move until a load succeeds. So
 * each concurrent request cleared the in-flight promise and started its own
 * multi-MB load, defeating the de-duplication this module's whole design rests
 * on, and letting a losing reload call `registerProjectionsProvider(null)` on
 * top of the provider a winning reload had just installed. `loadInFlight`
 * makes the refresh shared: concurrent callers await the one that is running.
 */
let gradedLoadPromise: Promise<void> | null = null;
/**
 * Whether `gradedLoadPromise` is still running. Distinct from "the promise is
 * non-null": after a load settles the promise is kept as a CACHED RESULT that
 * the stale path is allowed to discard, but an unsettled one must never be
 * discarded — that is what forks a second load.
 */
let loadInFlight = false;
/** When the currently-registered provider was built. */
let registeredAt = 0;
/**
 * When the last attempt ran, live or not - bounds retry pressure on a refusal.
 * NEGATIVE_INFINITY, not 0, so a cold start is unambiguously "never attempted"
 * rather than "attempted at epoch": with 0 the cooldown comparison reads as a
 * recent attempt whenever the clock is near zero, which suppressed the very
 * first load.
 */
let lastAttemptAt = Number.NEGATIVE_INFINITY;

/**
 * How long a registered provider is trusted before it is rebuilt. An hour
 * bounds how long a basis that has become inadmissible can keep serving: the
 * week rolls over on a Tuesday, so an hour is far inside the boundary while
 * still costing at most 24 multi-MB loads a day per instance.
 */
export const PROVIDER_RELOAD_AFTER_MS = 60 * 60 * 1000;

/**
 * Minimum gap between attempts after one that did not register a provider.
 * Without it, a refused basis would re-fetch several megabytes on every single
 * request; with it, the retry is prompt but bounded.
 */
export const PROVIDER_RETRY_COOLDOWN_MS = 60 * 1000;

/** Test seam: forget any registration decision without touching the provider. */
export function resetLiveProjectionsCacheForTests(): void {
  gradedLoadPromise = null;
  loadInFlight = false;
  registeredAt = 0;
  lastAttemptAt = Number.NEGATIVE_INFINITY;
}

export function ensureLiveProjections(
  env: Record<string, string | undefined> = process.env,
  nowMs: number = Date.now(),
): Promise<void> {
  if (!isConfigured("projections", env)) return Promise.resolve(); // founder gate off

  const live = isLiveProjections(env);
  // Registered AND still inside the trust interval: nothing to do.
  if (live && nowMs - registeredAt < PROVIDER_RELOAD_AFTER_MS) return Promise.resolve();
  // A load is already running: share it, never restart it. This check must come
  // BEFORE the stale-path clear below — otherwise every concurrent request on a
  // stale provider forks its own multi-MB reload (C-230).
  if (loadInFlight && gradedLoadPromise) return gradedLoadPromise;
  // Registered but stale, and nothing is running: drop the cached attempt so the
  // next load rebuilds it against the current target week.
  if (live) gradedLoadPromise = null;
  // Not registered, with nothing running: a SETTLED cached promise is now only a
  // record of a registration that has since been undone, so it must not be
  // returned as though it still stood (C-232). instrumentation.ts is a SECOND
  // registration entry point - it calls loadAndRegisterGradedProvider directly,
  // bypassing every variable here - so an unawaited startup load completing with
  // a refusal can unregister a provider a lazy load installed, while registeredAt
  // stays set. Without this line the next call finds live false, nothing in
  // flight, and a non-null fulfilled promise: it skips the cooldown branch (which
  // requires a null promise), skips the start branch, and returns the settled
  // promise - forever. Paid tools would sit on the illustrative pool for the life
  // of the instance, which is exactly the C-229 failure this module exists to
  // prevent, reached through the other door.
  if (!live && !loadInFlight) gradedLoadPromise = null;
  // Not registered, and the last attempt was recent: do not re-fetch megabytes
  // on every request while a refusal or outage persists.
  if (!live && gradedLoadPromise === null && nowMs - lastAttemptAt < PROVIDER_RETRY_COOLDOWN_MS) {
    return Promise.resolve();
  }

  if (!gradedLoadPromise) {
    lastAttemptAt = nowMs;
    loadInFlight = true;
    gradedLoadPromise = import("./graded-pool")
      .then((m) => m.loadAndRegisterGradedProvider())
      .then((result) => {
        loadInFlight = false;
        const registered = result.status === "live" && result.players.length > 0;
        if (registered) {
          registeredAt = nowMs;
        } else {
          // A refusal or an empty pool is NOT a successful registration. Clear
          // the cache so a later request can try again instead of inheriting a
          // fulfilled promise that registered nothing.
          registeredAt = 0;
          gradedLoadPromise = null;
        }
      })
      .catch((err) => {
        loadInFlight = false;
        gradedLoadPromise = null; // allow a later request to retry
        registeredAt = 0;
        throw err;
      });
  }
  return gradedLoadPromise;
}

/**
 * The async tool-pool resolver a tool PAGE should use: lazily ensures the live
 * provider is registered, then resolves the pool. Falls back to the illustrative
 * pool (undefined) if the live load fails — never fabricates.
 */
export async function resolveToolPoolAsync(env: Record<string, string | undefined> = process.env): Promise<readonly Player[] | undefined> {
  try {
    await ensureLiveProjections(env);
  } catch {
    // honest fallback to illustrative on a source/load error
  }
  return resolveToolPool(env);
}
