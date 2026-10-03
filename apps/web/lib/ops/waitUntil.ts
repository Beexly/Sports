/**
 * Serverless waitUntil helper — keep fire-and-forget work alive past the HTTP
 * response (PR #446 follow-up, Hermes Lane B).
 *
 * On Vercel, a `void promise` on a route handler is torn down when the
 * response is returned. Traffic-heartbeat and similar failsafes therefore die
 * mid-run unless their work is registered with waitUntil. Prefer
 * `@vercel/functions` waitUntil when the runtime provides it; fall back to
 * fire-and-forget on local/non-Vercel so tests and `next dev` still work.
 */

type WaitUntilFn = (promise: Promise<unknown>) => void;

let cached: WaitUntilFn | null | undefined;

function resolveWaitUntil(): WaitUntilFn | null {
  if (cached !== undefined) return cached;
  // Dynamic require: @vercel/functions is only meaningful on Vercel. Missing
  // package or non-Vercel runtime must not crash the request path.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod = require("@vercel/functions") as { waitUntil?: WaitUntilFn };
    cached = typeof mod.waitUntil === "function" ? mod.waitUntil : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Register background work so the isolate does not freeze when the response closes. */
export function runInBackground(promise: Promise<unknown>): void {
  const safe = promise.catch(() => undefined);
  const wt = resolveWaitUntil();
  if (wt) {
    wt(safe);
    return;
  }
  void safe;
}

/** Test hook — reset the module cache. */
export function resetWaitUntilCacheForTests(): void {
  cached = undefined;
}
