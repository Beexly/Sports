/**
 * Pick'em lines provider — the swappable source for the Pick'em Edge tool.
 *
 * Mirrors the projections provider exactly: the default is the clearly-labelled
 * illustrative slate; a licensed live lines feed (Underdog / DK Pick6 / PrizePicks
 * pricing, obtained under a real agreement — never scraped) is injected by the
 * founder and activates only when registered AND enabled by env. The Pick'em
 * Edge reads `activePickemLines()` so it flips from illustrative to live without
 * any tool change, and never fabricates a "live" line. Pure (env-injectable).
 */

import { PROPS, type Prop } from "../fantasy/props";
import { isConfigured } from "./providers";

export interface PickemProvider {
  readonly name: string;
  readonly live: boolean;
  lines(): readonly Prop[];
}

/** The default: the clearly-labelled illustrative slate. */
export const ILLUSTRATIVE_PICKEM: PickemProvider = {
  name: "Illustrative lines",
  live: false,
  lines: () => PROPS,
};

let liveProvider: PickemProvider | null = null;

/** Founder hook: register a licensed live pick'em-lines provider. */
export function registerPickemProvider(provider: PickemProvider | null): void {
  liveProvider = provider && provider.live ? provider : null;
}

export function resolvePickemProvider(env: Record<string, string | undefined> = process.env): PickemProvider {
  if (liveProvider && isConfigured("pickem-lines", env)) return liveProvider;
  return ILLUSTRATIVE_PICKEM;
}

export function isLivePickem(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(liveProvider) && isConfigured("pickem-lines", env);
}

/** The active pick'em slate — live only when registered, live, AND keyed. */
export function activePickemLines(env: Record<string, string | undefined> = process.env): readonly Prop[] {
  const provider = resolvePickemProvider(env);
  return provider.live ? provider.lines() : PROPS;
}
