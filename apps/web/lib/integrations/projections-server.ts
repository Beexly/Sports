import "server-only";
import { isLiveProjections, resolveToolPool } from "./projections";
import type { Player } from "../fantasy/players";

/**
 * SERVER-ONLY live-projections loader. Kept out of projections.ts because that
 * module is reachable from client components (e.g. the lineup optimizer), and the
 * dynamic graded-pool import below pulls node:zlib — which must never enter a
 * client bundle. The `server-only` import makes a client import a hard build error.
 *
 * The nflverse graded pool always activates — no env flag required. PROJECTIONS_PROVIDER
 * is reserved for a future licensed external feed. The lazy load + shared promise
 * ensures the multi-MB nflverse files are fetched at most once per process.
 *
 * De-duplicated via a module-level cached promise so concurrent tool requests
 * share ONE multi-MB load; a failure clears the cache to allow a later retry.
 */
let gradedLoadPromise: Promise<void> | null = null;

export function ensureLiveProjections(_env: Record<string, string | undefined> = process.env): Promise<void> {
  if (isLiveProjections()) return Promise.resolve(); // already registered
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
  return resolveToolPool();
}
