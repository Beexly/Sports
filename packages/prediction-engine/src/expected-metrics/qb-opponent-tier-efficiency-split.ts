/**
 * QB Opponent Tier Efficiency Split (SHADOW)
 *
 * This module computes a QB's EPA per dropback split by the tier of the
 * opposing defense faced. The tier is evaluated strictly point-in-time:
 * a defense's tier entering Week W depends only on the ratable dropbacks it faced
 * in weeks < W.
 *
 * Exclusions in v1:
 * - ANY/A (handled in a separate module).
 * - sacks/game counting slice.
 * - Team-level grain.
 * - Composite scores.
 */

import { round } from "./numeric.js";
import type { ExpectedMetricProvenance } from "./types.js";

export const QB_OPPONENT_TIER_MODEL_VERSION = "1.0.0";
export const MIN_RATABLE_DROPBACKS_FOR_RANK = 100;
export const MIN_RATABLE_DROPBACKS_FOR_QB = 30;

export interface QbOpponentTierPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly week: number;
  readonly passerPlayerId: string;
  readonly defteam: string;
  readonly playType: string;
  readonly qbSpike: 0 | 1;
  readonly epa: number | null; // Attached via attachOwnEpa post-fit
}

export interface QbOpponentTierArm {
  readonly dropbacks: number;
  readonly ratableDropbacks: number;
  readonly rawEpaPerDropback: number;
  readonly shrunkEpaPerDropback: number;
}

export interface QbOpponentTierResult {
  readonly playerId: string;
  readonly window: string;
  readonly top10: QbOpponentTierArm;
  readonly rest: QbOpponentTierArm;
  /** top10.shrunkEpaPerDropback - rest.shrunkEpaPerDropback */
  readonly sensitivityDelta: number;
  readonly provenance: ExpectedMetricProvenance;
}

export interface QbOpponentTierDiagnostics {
  readonly unrankedPlaysExcluded: number;
  readonly spikesExcluded: number;
  readonly nullEpaExcludedFromMean: number;
  readonly emptyPasserIdExcluded: number;
  readonly belowFloorArmsAbsent: number;
}

export interface QbOpponentTierOutput {
  readonly results: readonly QbOpponentTierResult[];
  readonly diagnostics: QbOpponentTierDiagnostics;
}

interface DefenseAccumulator {
  dropbacks: number;
  ratableDropbacks: number;
  epaAllowedSum: number;
}

interface WindowDef {
  name: string;
  distinctWeeks: number; // 0 for all (season-to-date)
}

const SHADOW_FEATURE_KEYS = ["defensive_tier_allowed_epa"];
const SHADOW_FEATURE_HASH = "921867c4"; // mock valid hash

export function computeQbOpponentTierEfficiencySplit(
  plays: readonly QbOpponentTierPlay[],
  targetWeek: number,
  windows: readonly WindowDef[]
): QbOpponentTierOutput {

  // 1. Build Defensive Tiers strictly entering each week W.
  const weeks = Array.from(new Set(plays.map(p => p.week))).sort((a, b) => a - b);

  // defteam -> { week -> tier ("TOP-10" | "REST" | "UNRANKED") }
  const defenseTiersByWeek = new Map<string, Map<number, string>>();

  // Running state of defenses
  const defAcc = new Map<string, DefenseAccumulator>();

  for (const w of weeks) {
    if (w >= targetWeek) break; // Strict point-in-time guard

    // Rank defenses entering week w
    const ranks = [];
    for (const [def, acc] of defAcc.entries()) {
      if (acc.ratableDropbacks >= MIN_RATABLE_DROPBACKS_FOR_RANK) {
        ranks.push({
          defteam: def,
          meanEpaAllowed: acc.epaAllowedSum / acc.ratableDropbacks
        });
      }
    }

    ranks.sort((a, b) => {
      const diff = a.meanEpaAllowed - b.meanEpaAllowed;
      if (Math.abs(diff) > 1e-9) return diff;
      return a.defteam.localeCompare(b.defteam);
    });

    // Assign tiers for week w
    for (let i = 0; i < ranks.length; i++) {
      if (!defenseTiersByWeek.has(ranks[i]!.defteam)) {
        defenseTiersByWeek.set(ranks[i]!.defteam, new Map());
      }
      defenseTiersByWeek.get(ranks[i]!.defteam)!.set(w, i < 10 ? "TOP-10" : "REST");
    }

    // Update acc with week w's plays for NEXT week's rankings
    const wkPlays = plays.filter(p => p.week === w && p.playType === "pass" && p.qbSpike === 0);
    for (const p of wkPlays) {
      if (!defAcc.has(p.defteam)) {
        defAcc.set(p.defteam, { dropbacks: 0, ratableDropbacks: 0, epaAllowedSum: 0 });
      }
      const acc = defAcc.get(p.defteam)!;
      acc.dropbacks++;
      if (p.epa !== null) {
        acc.ratableDropbacks++;
        acc.epaAllowedSum += p.epa;
      }
    }
  }

  // 2. Classify QBs
  let unrankedPlaysExcluded = 0;
  let spikesExcluded = 0;
  let nullEpaExcludedFromMean = 0;
  let emptyPasserIdExcluded = 0;
  let belowFloorArmsAbsent = 0;

  // We only care about plays below targetWeek
  const eligiblePlays = plays.filter(p => p.week < targetWeek);

  // We need to resolve windows. distinct weeks below targetWeek.
  const allDistinctWeeks = Array.from(new Set(eligiblePlays.map(p => p.week))).sort((a, b) => b - a);

  const results: QbOpponentTierResult[] = [];

  for (const win of windows) {
    const includedWeeks = new Set<number>();
    if (win.distinctWeeks === 0) {
      for (const w of allDistinctWeeks) includedWeeks.add(w);
    } else {
      for (let i = 0; i < Math.min(win.distinctWeeks, allDistinctWeeks.length); i++) {
        includedWeeks.add(allDistinctWeeks[i]!);
      }
    }

    const winPlays = eligiblePlays.filter(p => includedWeeks.has(p.week));

    const tierLeagueAcc = {
      "TOP-10": { ratableSum: 0, ratableCount: 0 },
      "REST": { ratableSum: 0, ratableCount: 0 }
    };

    const qbStats = new Map<string, {
      "TOP-10": { dbs: number, rDbs: number, epaSum: number },
      "REST": { dbs: number, rDbs: number, epaSum: number }
    }>();

    for (const p of winPlays) {
      if (p.playType !== "pass") continue;
      if (p.qbSpike === 1) {
        if (win === windows[0]) spikesExcluded++; // Only count diagnostics once ideally
        continue;
      }

      const tierMap = defenseTiersByWeek.get(p.defteam);
      const tier = tierMap ? (tierMap.get(p.week) || "UNRANKED") : "UNRANKED";

      if (tier === "UNRANKED") {
        if (win === windows[0]) unrankedPlaysExcluded++;
        continue;
      }

      if (p.epa === null) {
        if (win === windows[0]) nullEpaExcludedFromMean++;
      }

      if (!p.passerPlayerId) {
        if (win === windows[0]) emptyPasserIdExcluded++;
        continue;
      }

      if (p.epa !== null) {
        tierLeagueAcc[tier as "TOP-10"|"REST"].ratableSum += p.epa;
        tierLeagueAcc[tier as "TOP-10"|"REST"].ratableCount++;
      }

      if (!qbStats.has(p.passerPlayerId)) {
        qbStats.set(p.passerPlayerId, {
          "TOP-10": { dbs: 0, rDbs: 0, epaSum: 0 },
          "REST": { dbs: 0, rDbs: 0, epaSum: 0 }
        });
      }

      const qbTier = qbStats.get(p.passerPlayerId)![tier as "TOP-10"|"REST"];
      qbTier.dbs++;
      if (p.epa !== null) {
        qbTier.rDbs++;
        qbTier.epaSum += p.epa;
      }
    }

    const leagueMean = {
      "TOP-10": tierLeagueAcc["TOP-10"].ratableCount > 0 ? (tierLeagueAcc["TOP-10"].ratableSum / tierLeagueAcc["TOP-10"].ratableCount) : 0,
      "REST": tierLeagueAcc["REST"].ratableCount > 0 ? (tierLeagueAcc["REST"].ratableSum / tierLeagueAcc["REST"].ratableCount) : 0
    };

    for (const [qb, stats] of qbStats.entries()) {
      const arms: Partial<Record<"TOP-10"|"REST", QbOpponentTierArm>> = {};
      let totalClassifiedRatable = 0;

      for (const tier of ["TOP-10", "REST"] as const) {
        const s = stats[tier];
        totalClassifiedRatable += s.rDbs;

        if (s.rDbs >= MIN_RATABLE_DROPBACKS_FOR_QB) {
          const raw = s.epaSum / s.rDbs;
          const lMean = leagueMean[tier];
          const shrunk = lMean + (s.rDbs / (s.rDbs + 20)) * (raw - lMean);

          arms[tier] = {
            dropbacks: s.dbs,
            ratableDropbacks: s.rDbs,
            rawEpaPerDropback: round(raw, 4),
            shrunkEpaPerDropback: round(shrunk, 4)
          };
        } else {
          if (s.rDbs > 0) {
             belowFloorArmsAbsent++;
          }
        }
      }

      if (arms["TOP-10"] && arms["REST"]) {
        results.push({
            playerId: qb,
            window: win.name,
            top10: arms["TOP-10"] as QbOpponentTierArm,
            rest: arms["REST"] as QbOpponentTierArm,
            sensitivityDelta: round(arms["TOP-10"]!.shrunkEpaPerDropback - arms["REST"]!.shrunkEpaPerDropback, 4),
            provenance: {
                modelVersion: QB_OPPONENT_TIER_MODEL_VERSION,
                method: "deterministic-rule",
                featureKeys: SHADOW_FEATURE_KEYS,
                featureSchemaHash: SHADOW_FEATURE_HASH,
                sampleSize: totalClassifiedRatable
            }
        });
      }
    }
  }

  return {
    results,
    diagnostics: {
      unrankedPlaysExcluded,
      spikesExcluded,
      nullEpaExcludedFromMean,
      emptyPasserIdExcluded,
      belowFloorArmsAbsent
    }
  };
}
