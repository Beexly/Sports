/**
 * Signal Registry Runner.
 *
 * Evaluates all registered, active signals for a given game context and
 * produces the canonical IndependentMarketFairValue[] array.
 *
 * Implements strict silence on null/errors, preserves exact wire source tags,
 * and maintains byte-identical output to legacy procedural branches.
 */

import type { IndependentMarketFairValue } from "@sports/types";
import type { IndependentFairValueBuildInput } from "./build-independent-fair-values.js";
import { SIGNAL_REGISTRY } from "./signal-registry-definitions.js";

export async function runSignalRegistry(
  input: IndependentFairValueBuildInput,
): Promise<IndependentMarketFairValue[]> {
  const out: IndependentMarketFairValue[] = [];
  const now = input.now ?? (() => new Date());

  // 1) Prefetched (e.g. Kalshi or caller-supplied)
  if (input.prefetched) {
    for (const fv of input.prefetched) {
      if (
        (fv.homeFairProb != null && Number.isFinite(fv.homeFairProb)) ||
        (fv.awayFairProb != null && Number.isFinite(fv.awayFairProb))
      ) {
        out.push(fv);
      }
    }
  }

  const ctx = {
    sportKey: input.sportKey,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    commenceTime: input.commenceTime,
    spreadHome: input.spreadHome,
    env: (input.env ?? process.env) as Record<string, string | undefined>,
    now,
    prefetched: input.prefetched,
    skipNetworkIndependents: input.skipNetworkIndependents,
  };

  for (const signal of SIGNAL_REGISTRY) {
    if (signal.id === "prefetched_exchange") continue;
    if (signal.activationStatus !== "ACTIVE") continue;
    if (!signal.isRightsCleared(ctx.env)) continue;
    if (signal.validSports.length > 0 && !signal.validSports.includes(ctx.sportKey as any)) {
      continue;
    }
    if (!signal.evaluate) continue;

    try {
      const val = await signal.evaluate(ctx);
      if (
        val &&
        Number.isFinite(val.homeFairProb) &&
        Number.isFinite(val.awayFairProb) &&
        val.homeFairProb >= 0 &&
        val.homeFairProb <= 1 &&
        val.awayFairProb >= 0 &&
        val.awayFairProb <= 1
      ) {
        const source = (val.metadata?.source as string) ?? signal.id;
        out.push({
          source,
          homeFairProb: val.homeFairProb,
          awayFairProb: val.awayFairProb,
          capturedAt: val.capturedAt,
        });
      }
    } catch (err) {
      // Catch exceptions silently to satisfy the Null Semantics invariant
      console.warn(`[SignalRegistry] Signal ${signal.id} abstained on error:`, err);
    }
  }

  return out;
}
