import "server-only";
import { isConfigured } from "./providers";
import { isLiveProjections, resolveToolPool } from "./projections";
import type { Player } from "../fantasy/players";
import type { GradedPoolResult } from "./graded-pool";

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
type GradedLoader = () => Promise<GradedPoolResult>;

/**
 * One load, exposed two ways. `result` is what the loader returned — the
 * startup path needs it to report an outcome. `done` is the void-typed twin
 * every request-time caller awaits. They are held in ONE field so there is no
 * way to clear the cache through one branch and leave the other standing.
 */
type InFlightLoad = {
  readonly result: Promise<GradedPoolResult>;
  readonly done: Promise<void>;
};

let gradedLoad: InFlightLoad | null = null;
/**
 * Whether `gradedLoad` is still running. Distinct from "the field is
 * non-null": after a load settles it is kept as a CACHED RESULT that the stale
 * path is allowed to discard, but an unsettled one must never be discarded —
 * that is what forks a second load.
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
  gradedLoad = null;
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
  if (loadInFlight && gradedLoad) return gradedLoad.done;
  // Registered but stale, and nothing is running: drop the cached attempt so the
  // next load rebuilds it against the current target week.
  if (live) gradedLoad = null;
  // Not registered, with nothing running: a SETTLED cached promise is now only a
  // record of a registration that has since been undone, so it must not be
  // returned as though it still stood (C-232). The fork that motivated this is
  // closed as of C-243 - startup now runs through adoptGradedLoad below rather
  // than calling loadAndRegisterGradedProvider directly - but the line stays:
  // ANY path that unregisters the provider without moving these variables
  // (a direct registerProjectionsProvider(null) call, a future second entry
  // point) reaches the same state. Without it the next call finds live false, nothing in
  // flight, and a non-null fulfilled promise: it skips the cooldown branch (which
  // requires a null promise), skips the start branch, and returns the settled
  // promise - forever. Paid tools would sit on the illustrative pool for the life
  // of the instance, which is exactly the C-229 failure this module exists to
  // prevent, reached through the other door.
  if (!live && !loadInFlight) gradedLoad = null;
  // Not registered, and the last attempt was recent: do not re-fetch megabytes
  // on every request while a refusal or outage persists.
  if (!live && gradedLoad === null && nowMs - lastAttemptAt < PROVIDER_RETRY_COOLDOWN_MS) {
    return Promise.resolve();
  }

  if (gradedLoad) return gradedLoad.done;
  return startGradedLoad(nowMs, defaultGradedLoader).done;
}

/** The production loader: the dynamic import that keeps node:zlib out of any client bundle. */
const defaultGradedLoader: GradedLoader = () =>
  import("./graded-pool").then((m) => m.loadAndRegisterGradedProvider());

/**
 * Run one load through the coordinator, recording it in `gradedLoad` and
 * stamping `registeredAt` only on a real registration.
 */
function startGradedLoad(nowMs: number, loader: GradedLoader): InFlightLoad {
  lastAttemptAt = nowMs;
  loadInFlight = true;
  const result = loader()
    .then((r) => {
      loadInFlight = false;
      const registered = r.status === "live" && r.players.length > 0;
      if (registered) {
        registeredAt = nowMs;
      } else {
        // A refusal or an empty pool is NOT a successful registration. Clear
        // the cache so a later request can try again instead of inheriting a
        // fulfilled promise that registered nothing.
        registeredAt = 0;
        gradedLoad = null;
      }
      return r;
    })
    .catch((err: unknown) => {
      loadInFlight = false;
      gradedLoad = null; // allow a later request to retry
      registeredAt = 0;
      throw err;
    });
  const done = result.then(() => undefined);
  // One load, two branches. A caller takes one of them and handles its
  // rejection; the other would otherwise settle rejected with nobody attached
  // and surface as an unhandled rejection. A terminal no-op handler on each is
  // not a swallow: `p.catch(...)` returns a NEW promise and leaves `p`
  // rejecting exactly as it did for whoever is actually awaiting it.
  result.catch(() => {});
  done.catch(() => {});
  const load: InFlightLoad = { result, done };
  gradedLoad = load;
  return load;
}

/**
 * Adopt an externally-driven load into this coordinator (C-243).
 *
 * `instrumentation.ts` was a SECOND registration entry point: it called
 * `loadAndRegisterGradedProvider` directly, so the startup load was recorded
 * nowhere here. `registeredAt` stayed 0, which made the first fantasy request
 * treat the provider startup had just installed as stale and begin its own
 * multi-MB load; both were then in flight against one process-wide registry,
 * and `loadAndRegisterGradedProvider` calls `registerProjectionsProvider(null)`
 * on a refusal — so the loser could unregister the winner's provider. The
 * module already carried a defence against the WORST consequence of that fork
 * (the `!live && !loadInFlight` line above, which stops a settled promise from
 * standing in for a registration that has since been undone). This closes the
 * fork itself.
 *
 * Startup keeps its own founder gate and its own outcome logging. All this
 * takes over is WHERE the load runs: if a request-time load is already in
 * flight, or a live one is cached, that one is shared instead of forked.
 */
export function adoptGradedLoad(
  loader: GradedLoader,
  nowMs: number = Date.now(),
): Promise<GradedPoolResult> {
  if (gradedLoad) return gradedLoad.result;
  return startGradedLoad(nowMs, loader).result;
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
