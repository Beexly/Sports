/** Self-reliance / dominance scoring for the own feed. */

import { OWN_METRICS, ownCatalogStats } from "./catalog.js";
import type { DominanceScore, OwnFeedSnapshot } from "./types.js";

export function computeDominanceScore(): DominanceScore {
  const s = ownCatalogStats();
  const n = s.total || 1;
  const firstPartyShare = s.firstParty / n;
  const derivedShare = s.derived / n;
  const thirdPartyShare = s.third / n;
  const blockedShare = s.blocked / n;
  const selfReliance = Math.round(100 * (firstPartyShare + derivedShare));
  const notes: string[] = [];
  if (selfReliance >= 80) {
    notes.push("Strong first-party + derived ownership");
  } else {
    notes.push("Grow first_party model/cal/decision metrics");
  }
  notes.push("oddsApiRequired=false — books not on critical path");
  notes.push("Optical plane grows self-reliance when unparked");
  if (thirdPartyShare > 0.15) {
    notes.push("Trim attributed_third surface; keep attribution");
  }
  return {
    selfReliance,
    firstPartyShare,
    thirdPartyShare,
    blockedShare,
    oddsVendorRequired: false,
    notes,
  };
}

export function ownFeedSnapshot(now = new Date()): OwnFeedSnapshot {
  const s = ownCatalogStats();
  return {
    generatedAt: now.toISOString(),
    metricCount: s.total,
    firstPartyCount: s.firstParty,
    publicEligibleCount: s.publicEligible,
    dominance: computeDominanceScore(),
    law: [
      "We own p, calibration, gate, ledger, refusal KPIs",
      "q from multi-source plane — Odds API optional",
      "Derived stats: we own formula; attribute base data",
      "refuse-default on values without asOf / rights",
      "No fabricated win-rate on public surfaces",
      "LIVE_BOARD founder-gated",
      "publicFire ≠ multiprob FIRE until authority green",
    ],
  };
}

export function expandOwnedRollingMetrics(
  baseIds: readonly string[],
  windows: readonly number[],
): number {
  return baseIds.length * windows.length;
}

export function designSpaceReport() {
  const windows = [3, 5, 8, 10, 16];
  const rollingBases = [
    "epa",
    "success_rate",
    "cpoe",
    "air_yards",
    "yac",
    "pressure_rate",
    "blitz_rate",
    "play_action_rate",
    "yards_per_play",
    "target_share",
  ];
  const sports = ["NFL", "NCAAF", "NBA", "MLB", "NHL"];
  const theoretical =
    expandOwnedRollingMetrics(rollingBases, windows) * sports.length + OWN_METRICS.length;
  return {
    windows,
    rollingBases,
    sports,
    registeredNow: OWN_METRICS.length,
    theoreticalOwnedRolling: theoretical,
    note: "Theoretical density is design space, not a claim of shipped accuracy.",
  };
}
