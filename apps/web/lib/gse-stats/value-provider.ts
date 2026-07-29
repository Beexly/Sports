/**
 * Seeded value provider for GSE Stats API — demo / dark path only.
 * Production replaces with FeatureStore + nflverse loaders.
 * Never invents win-rates; only returns seeded feature-like values.
 */

import type { ValueProvider } from "@sports/stats-api";

const SEED: Record<string, number> = {
  // entity-agnostic demo seeds (metric|entity loose key used by memory provider pattern)
  "nfl.box.pass_yds|demo_player": 287,
  "nfl.adv.epa|demo_player": 0.12,
  "nfl.ngs.separation|demo_player": 2.8,
  "gse.edge_index|demo_game": 0.041,
  "gse.clv_vs_pinnacle|demo_game": 0.018,
  "ctx.weather.temp_f|demo_game": 42,
  "mkt.consensus.spread.novig|demo_game": 0.52,
};

export const demoValueProvider: ValueProvider = (metric, entityId) => {
  const loose = `${metric.id}|${entityId}`;
  if (loose in SEED) return SEED[loose]!;
  // Deterministic hash-ish stub for ACTIVE public metrics only — still not a performance claim
  if (metric.status === "ACTIVE" && metric.publicApi && metric.family !== "calibration") {
    let h = 0;
    const s = `${metric.id}:${entityId}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    const u = (Math.abs(h) % 10000) / 10000;
    if (metric.unit === "count" || metric.unit === "yds") return Math.round(u * 100);
    if (metric.unit === "rate" || metric.unit === "prob") return Math.round(u * 1000) / 1000;
    return u;
  }
  return null;
};
