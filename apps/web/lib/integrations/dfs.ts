/**
 * DFS slate provider — the swappable source for the DFS optimizer.
 *
 * THE CONTRACT (changed 2026-10-12, motif/web-dfs-real-2026-10-12):
 * `activeDfsSlate()` returns the REAL slate or an explicit empty slate —
 * never the illustrative fixture by default. The sample pool was a silent
 * fallback for every caller that forgot to register a provider, which meant
 * the optimizer's default argument was 36 fictional players and only the
 * page copy admitted it. That bug class is removed:
 *
 *   - A registered live provider + the founder's `DFS_PROVIDER` env flag
 *     (law 3) serves the real slate (see `lib/dfs/real-slate.ts`, which
 *     builds it from measured engine data and registers it).
 *   - No provider → `EMPTY_DFS`: an explicit empty slate. Callers render an
 *     honest empty state; nobody optimizes fiction by accident.
 *   - The illustrative fixture survives ONLY as an explicit dev opt-in:
 *     `DFS_SAMPLE_SLATE=1`. Any surface that renders it must banner it as
 *     SAMPLE (the DFS optimizer component does).
 *
 * Pure (env-injectable), so the seam stays fully testable.
 */

import { DFS_SLATE, type DfsPlayer } from "../fantasy/dfs-slate";
import { isConfigured } from "./providers";

export interface DfsSlateProvider {
  readonly name: string;
  readonly live: boolean;
  slate(): readonly DfsPlayer[];
}

/** The dev-only sample: clearly-labelled illustrative players. */
export const ILLUSTRATIVE_DFS: DfsSlateProvider = {
  name: "Illustrative slate (sample, dev opt-in)",
  live: false,
  slate: () => DFS_SLATE,
};

/**
 * The default when nothing real is registered: an explicit EMPTY slate.
 * An absent slate is an empty slate, not a sample slate.
 */
export const EMPTY_DFS: DfsSlateProvider = {
  name: "Empty slate (no real slate registered)",
  live: false,
  slate: () => [],
};

let liveProvider: DfsSlateProvider | null = null;

/** Founder hook: register a live DFS slate provider. */
export function registerDfsSlateProvider(provider: DfsSlateProvider | null): void {
  liveProvider = provider && provider.live ? provider : null;
}

/** The sample fixture is reachable only when a developer asks for it by name. */
export function sampleSlateOptedIn(env: Record<string, string | undefined> = process.env): boolean {
  return env["DFS_SAMPLE_SLATE"]?.trim() === "1";
}

export function resolveDfsSlateProvider(env: Record<string, string | undefined> = process.env): DfsSlateProvider {
  if (liveProvider && isConfigured("dfs", env)) return liveProvider;
  if (sampleSlateOptedIn(env)) return ILLUSTRATIVE_DFS;
  return EMPTY_DFS;
}

export function isLiveDfs(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(liveProvider) && isConfigured("dfs", env);
}

/**
 * The active DFS slate — the registered real slate when live, the sample
 * fixture only under the explicit dev opt-in, otherwise EMPTY.
 */
export function activeDfsSlate(env: Record<string, string | undefined> = process.env): readonly DfsPlayer[] {
  return resolveDfsSlateProvider(env).slate();
}
