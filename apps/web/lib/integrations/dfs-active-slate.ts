/**
 * dfs-active-slate — the registration seam the DFS Process System needs.
 *
 * THE GAP THIS CLOSES. The DFS process artifact's live-feed registration was
 * never done: with nothing registered, the slate resolution fell back to
 * the illustrative sample slate (fictional players), and the only thing
 * standing between that fiction and a customer was a disclosure string.
 * The engine-side provider registry (`integrations/dfs.ts`) exists for the
 * optimizer; this seam is the artifact-facing contract with a stricter
 * fallback law:
 *
 *   REGISTERED provider  → its slate, even when that slate is EMPTY.
 *                            A live provider that finds nothing returns
 *                            nothing; empty is the honest state.
 *   UNREGISTERED          → honest-empty ([]). NEVER the sample slate.
 *   SAMPLE SLATE          → served ONLY when the explicit developer flag
 *                            DFS_SAMPLE_SLATE_DEV=1 is set, for local work.
 *                            It is not a fallback; it is an opt-in fixture.
 *
 * Shadow wiring: registering a provider changes nothing customer-facing by
 * itself — publication still runs through the existing gates and the
 * founder-gated DFS_PROVIDER path. This seam only decides what the slate
 * IS, and its first registered provider is the ESPN keyless slate
 * (`espn-dfs-slate-provider.ts`).
 */

import { DFS_SLATE, type DfsPlayer } from "../fantasy/dfs-slate";

/** A source of DFS slates. `slate()` may be empty; it may never be fictional. */
export interface ActiveSlateProvider {
  readonly name: string;
  /** Provenance label, e.g. "espn-keyless" or "gse-engine". */
  readonly source: string;
  slate(): Promise<readonly DfsPlayer[]> | readonly DfsPlayer[];
}

/** The explicit developer opt-in for the illustrative fixture. Not a fallback. */
export const DFS_SAMPLE_SLATE_DEV_ENV = "DFS_SAMPLE_SLATE_DEV";

let activeProvider: ActiveSlateProvider | null = null;

/**
 * Register the active slate provider. Pass null to unregister (tests, local
 * teardown). Registering is idempotent: the last registration wins, and a
 * registered provider's empty slate is served as empty — registration never
 * re-arms the sample fallback.
 */
export function registerActiveSlate(provider: ActiveSlateProvider | null): void {
  activeProvider = provider;
}

export function registeredActiveSlateProvider(): ActiveSlateProvider | null {
  return activeProvider;
}

export function isSampleSlateDevEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[DFS_SAMPLE_SLATE_DEV_ENV] === "1";
}

/**
 * Resolve the active slate under the fallback law above. Async because a
 * real provider fetches; the sample fixture and the empty state resolve
 * immediately.
 */
export async function resolveActiveSlate(
  env: Record<string, string | undefined> = process.env,
): Promise<readonly DfsPlayer[]> {
  if (activeProvider) return activeProvider.slate();
  if (isSampleSlateDevEnabled(env)) return DFS_SLATE;
  return [];
}
