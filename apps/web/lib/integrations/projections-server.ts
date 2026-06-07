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
 * the instrumentation head-start share ONE multi-MB load; a failure clears the
 * cache to allow a later retry. No-op when the gate is off or already registered.
 */
let gradedLoadPromise: Promise<void> | null = null;

export function ensureLiveProjections(env: Record<string, string | undefined> = process.env): Promise<void> {
  if (!isConfigured("projections", env)) return Promise.resolve(); // founder gate off
  if (isLiveProjections(env)) return Promise.resolve(); // already registered
  if (!gradedLoadPromise) {
    gradedLoadPromise = import("./graded-pool")
      .then((m) => m.loadAndRegisterGradedProvider())
      .then(() => undefined)
      .catch((err) => {
        gradedLoadPromise = null; // allow a later request to retry
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
