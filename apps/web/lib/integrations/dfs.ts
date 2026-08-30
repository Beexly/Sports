/**
 * DFS slate provider — the swappable source for the DFS optimizer.
 *
 * Same founder-gated pattern as projections + pick'em: the default is the
 * clearly-labelled illustrative slate; a licensed live slate (salaries +
 * projections + ownership, obtained from a contracted provider — never scraped,
 * and never the forbidden DraftKings hidden endpoint) is injected by the founder
 * and activates only when registered AND enabled by env. The optimizer already
 * takes the slate as a parameter, so it flips live with no tool change. Pure.
 */

import { DFS_SLATE, type DfsPlayer } from "../fantasy/dfs-slate";
import { isConfigured } from "./providers";

export interface DfsSlateProvider {
  readonly name: string;
  readonly live: boolean;
  slate(): readonly DfsPlayer[];
}

/** The default: the clearly-labelled illustrative slate. */
export const ILLUSTRATIVE_DFS: DfsSlateProvider = {
  name: "Illustrative slate",
  live: false,
  slate: () => DFS_SLATE,
};

let liveProvider: DfsSlateProvider | null = null;

/** Founder hook: register a licensed live DFS slate provider. */
export function registerDfsSlateProvider(provider: DfsSlateProvider | null): void {
  liveProvider = provider && provider.live ? provider : null;
}

export function resolveDfsSlateProvider(env: Record<string, string | undefined> = process.env): DfsSlateProvider {
  if (liveProvider && isConfigured("dfs", env)) return liveProvider;
  return ILLUSTRATIVE_DFS;
}

export function isLiveDfs(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(liveProvider) && isConfigured("dfs", env);
}

/** The active DFS slate — live only when registered, live, AND keyed. */
export function activeDfsSlate(env: Record<string, string | undefined> = process.env): readonly DfsPlayer[] {
  const provider = resolveDfsSlateProvider(env);
  return provider.live ? provider.slate() : DFS_SLATE;
}
