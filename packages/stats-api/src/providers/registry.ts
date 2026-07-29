/**
 * Value provider registry — map metric id prefix → provider.
 * Production wires nflverse/odds/feature-store loaders here.
 */

import type { MetricDef } from "../catalog-types.js";
import type { ValueProvider } from "../values.js";

export type ProviderId =
  | "demo"
  | "nflverse"
  | "odds"
  | "feature_store"
  | "weather"
  | "unwired";

export interface ProviderEntry {
  readonly id: ProviderId;
  readonly match: (metricId: string) => boolean;
  readonly provider: ValueProvider;
  readonly note: string;
}

export function createCompositeProvider(entries: readonly ProviderEntry[]): ValueProvider {
  return async (metric, entityId, asOf) => {
    for (const e of entries) {
      if (e.match(metric.id)) {
        return e.provider(metric, entityId, asOf);
      }
    }
    return null;
  };
}

export function prefixMatch(...prefixes: string[]) {
  return (metricId: string) => prefixes.some((p) => metricId.startsWith(p));
}

/** Default routing table (providers inject at app layer). */
export function buildDefaultRouting(
  providers: Partial<Record<ProviderId, ValueProvider>>,
): ProviderEntry[] {
  const out: ProviderEntry[] = [];
  if (providers.nflverse) {
    out.push({
      id: "nflverse",
      match: prefixMatch("nfl."),
      provider: providers.nflverse,
      note: "nflverse CC-BY-4.0 loaders",
    });
  }
  if (providers.odds) {
    out.push({
      id: "odds",
      match: prefixMatch("mkt."),
      provider: providers.odds,
      note: "licensed odds snapshots",
    });
  }
  if (providers.weather) {
    out.push({
      id: "weather",
      match: prefixMatch("ctx.weather."),
      provider: providers.weather,
      note: "Open-Meteo / NWS",
    });
  }
  if (providers.feature_store) {
    out.push({
      id: "feature_store",
      match: () => true,
      provider: providers.feature_store,
      note: "PIT feature store fallback",
    });
  }
  if (providers.demo) {
    out.push({
      id: "demo",
      match: () => true,
      provider: providers.demo,
      note: "deterministic demo seed (not performance claims)",
    });
  }
  return out;
}

export function resolveProviderId(metric: MetricDef, entries: readonly ProviderEntry[]): ProviderId {
  for (const e of entries) {
    if (e.match(metric.id)) return e.id;
  }
  return "unwired";
}
