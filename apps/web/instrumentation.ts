/**
 * Next.js instrumentation — runs once at server startup (before the app serves
 * requests).
 *
 * Founder-gated and INERT BY DEFAULT. It registers the real graded projections
 * provider ONLY when (a) we're in the Node.js runtime and (b) PROJECTIONS_PROVIDER
 * is set. When both hold, it loads the nflverse-graded pool and registers it
 * through the existing seam, so lineup / waivers / draft / trade go live on real
 * players via activePlayerPool() — with no per-request fetch. A load/source error
 * never crashes startup: it's logged and the tools stay on the illustrative pool.
 *
 * The graded-pool module pulls node-only deps (node:zlib via the nflverse
 * loaders), so it must NOT enter the Edge instrumentation bundle. We import it
 * dynamically inside a `process.env.NEXT_RUNTIME === "nodejs"` literal guard: Next
 * inlines NEXT_RUNTIME per compilation, so the Edge build dead-code-eliminates the
 * import entirely. Keep the runtime check a literal here for that to work.
 *
 * NOTE: the snapshot is loaded once at startup — correct and cheap for v1. A
 * future improvement is a periodic/cron refresh (re-run loadAndRegisterGradedProvider
 * on an interval) so a long-running server picks up new weekly grades without a
 * redeploy. Deliberately NOT a blocking fetch on every request.
 */

import type { GradedPoolResult } from "@/lib/integrations/graded-pool";
import { initObservability } from "@/lib/observability/sentry";

export type ProjectionsRegistrationOutcome =
  | "skipped-runtime"
  | "skipped-unset"
  | "registered"
  | "source-error"
  | "load-failed";

/**
 * The gate logic, separated from Next's hook so it's unit-testable: env-injectable
 * and with an injectable loader (mock the loader in tests — no network, no
 * node-only deps). `loader` registers the provider as a side effect and reports
 * the result; on a non-live/empty result or a throw, nothing is registered.
 */
export async function registerProjectionsFromEnv(
  env: Record<string, string | undefined>,
  loader: () => Promise<GradedPoolResult>,
): Promise<ProjectionsRegistrationOutcome> {
  // Only the Node.js server runtime can register the provider (the Edge runtime
  // can't run the nflverse loaders). Guard so this is a no-op everywhere else.
  if (env.NEXT_RUNTIME !== "nodejs") return "skipped-runtime";

  // Founder gate: do nothing unless the projections feed is explicitly enabled.
  const flag = env.PROJECTIONS_PROVIDER;
  if (!flag || flag.trim().length === 0) return "skipped-unset";

  try {
    const result = await loader();
    if (result.status !== "live" || result.count === 0) {
      // No fabrication: a source error registers nothing; tools stay illustrative.
      console.warn(
        `[projections] graded provider not registered (${result.status}; ${result.count} players)` +
          `${result.error ? `: ${result.error}` : ""}. Fantasy tools stay on the illustrative pool.`,
      );
      return "source-error";
    }
    console.info(`[projections] graded provider registered — ${result.count} real players live.`);
    return "registered";
  } catch (err) {
    // A fetch failure must never crash startup.
    console.error(
      "[projections] failed to load the graded provider; fantasy tools stay on the illustrative pool.",
      err,
    );
    return "load-failed";
  }
}

/**
 * Warm the live-evidence cache at instance start. Loader-injectable so it is
 * unit-testable without network or node-only deps, exactly like
 * registerProjectionsFromEnv above. ALWAYS resolves: a warm is best-effort by
 * definition, and its whole purpose is to keep a cold instance's first request from
 * paying the cost.
 *
 * WHY THIS EXISTS (C-328). loadSourceLiveEvidence pulls four nflverse datasets
 * SEQUENTIALLY — it must be, because running them concurrently OOM-killed the
 * instance (lib/data-sources/live-evidence.ts records the crash) — each with a 15s
 * budget, and caches the result for 15 minutes per instance. Steady state is fine
 * (measured 0.25s warm on /fantasy), but a FRESH instance makes its first request
 * wait 13-15s before any HTML is returned, and /fantasy, /integrations,
 * /cockpit/sources and /api/sources/catalog all await it.
 *
 * Warming here does NOT raise the memory ceiling: the peak is the same single
 * largest dataset whether the sequential chain runs on a request or at boot. This
 * only moves the work off the first user's path. Cold instances are exactly what a
 * traffic surge produces, so this is the surge case.
 */
export async function warmSourceLiveEvidence(
  load: (options: { timeoutMs: number }) => Promise<unknown>,
  timeoutMs = 20000,
): Promise<"warmed" | "failed"> {
  try {
    await load({ timeoutMs });
    return "warmed";
  } catch (err) {
    console.warn(
      "[live-evidence] background warm failed; the first request to this instance will pay the cost",
      err,
    );
    return "failed";
  }
}

/** Next.js calls this once at server startup. */
export async function register(): Promise<void> {
  // Initialise observability (Sentry) at startup. No-op when SENTRY_DSN is absent.
  initObservability();

  // Literal NEXT_RUNTIME check + dynamic import → graded-pool (and its node:zlib
  // dep) is excluded from the Edge instrumentation bundle by dead-code elimination.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadAndRegisterGradedProvider } = await import("@/lib/integrations/graded-pool");
    // NON-BLOCKING: we deliberately do NOT await the graded-pool load. It fetches
    // several MB of nflverse/ffverse data; awaiting it here would delay EVERY
    // serverless cold start (for every route, not just the fantasy tools). Instead
    // it registers in the background — the tools read the illustrative pool until
    // it completes, then switch to the live graded pool on that warm instance. A
    // failure never crashes startup (registerProjectionsFromEnv swallows it; the
    // extra .catch guards against an unhandled rejection).
    void registerProjectionsFromEnv(process.env, loadAndRegisterGradedProvider).catch((err) => {
      console.error("[projections] background graded-provider registration failed", err);
    });

    // C-328: the same shape and the same reasoning for the live-evidence cache that
    // /fantasy, /integrations, /cockpit/sources and /api/sources/catalog all await.
    // Dynamic import for the SAME Edge-bundle reason as the graded pool above: the
    // nflverse loaders pull node:zlib, and the literal NEXT_RUNTIME guard lets the
    // Edge compilation dead-code-eliminate this import.
    void import("@/lib/data-sources/live-evidence")
      .then((mod) => warmSourceLiveEvidence(mod.loadSourceLiveEvidence))
      .catch((err) => {
        console.error("[live-evidence] background warm could not import the loader", err);
      });
  }
}
