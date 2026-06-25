/**
 * DATA INTELLIGENCE MESH — Acquisition Governor.
 *
 * Decides what to buy, what to use free, what to ignore, and what to never touch. The legal verdict
 * is the FIRST gate (a forbidden source can never be USE_NOW, regardless of yield), then priority
 * is intelligence yield per unit cost/risk/complexity, optionally weighted by how well the source
 * covers a target experiment (so The Odds API ranks first for Book DNA, SportsDataIO first for DFS
 * salary lag). Pure + deterministic. Emits recommendations only; it buys nothing.
 *
 *   AcquisitionPriority = (Reliability + Novelty + FreshnessAlpha + DecisionLeverage + ProofValue)
 *                       ÷ (1 + Cost + RiskPenalty + IntegrationComplexity)
 */

import { isForbidden, type SourceGenome } from "./source-genome.js";
import { endpointCovers, type EndpointGenome } from "./endpoint-genome.js";
import type { FactType } from "./fact-type.js";

export type Recommendation =
  | "USE_NOW" | "EXPAND_EXISTING" | "ADD_ADAPTER" | "RESEARCH_ONLY"
  | "RIGHTS_REVIEW" | "PAID_EVALUATION" | "ENTERPRISE_DOSSIER" | "DO_NOT_USE";

export interface AcquisitionInputs {
  readonly genome: SourceGenome;
  readonly reliability: number;          // 0..1 (from SourceQualityScore)
  readonly novelty: number;              // 0..1 (unique facts / total)
  readonly freshnessAlpha: number;       // 0..1 (time advantage vs other sources × importance)
  readonly decisionLeverage: number;     // 0..1
  readonly proofValue: number;           // 0..1
  readonly integrationComplexity: number;// 0..1
  readonly alreadyIntegrated?: boolean;
  readonly endpoints?: readonly EndpointGenome[];
}

export interface ExperimentTarget {
  readonly name: string;
  readonly neededFacts: readonly FactType[];
}

export interface AcquisitionResult {
  readonly sourceId: string;
  readonly basePriority: number;
  readonly coverageMatch: number; // vs the target experiment, 0..1
  readonly priority: number;      // coverage-weighted
  readonly recommendation: Recommendation;
  readonly note: string;
}

const RIGHTS_RISK_REVIEW_FLOOR = 0.5;
const ENTERPRISE_COST_FLOOR = 5000;

function recommend(g: SourceGenome, basePriority: number, alreadyIntegrated: boolean): Recommendation {
  // Legal gate first — never overridden by yield.
  if (isForbidden(g.legalVerdict)) return "DO_NOT_USE";
  if (g.legalVerdict === "RIGHTS_REVIEW") return "RIGHTS_REVIEW";
  if (g.legalVerdict === "PAID_REQUIRED") return g.costPerMonth >= ENTERPRISE_COST_FLOOR ? "ENTERPRISE_DOSSIER" : "PAID_EVALUATION";
  // High rights risk gates even a nominally-free source — review before any live use.
  if (g.rightsRisk >= RIGHTS_RISK_REVIEW_FLOOR) return "RIGHTS_REVIEW";
  if (g.legalVerdict === "FREE_CAUTION") return "ADD_ADAPTER";
  // LICENSED / FREE_OPEN, low rights risk:
  if (alreadyIntegrated) return basePriority >= 0.3 ? "EXPAND_EXISTING" : "RESEARCH_ONLY";
  return basePriority >= 0.55 ? "USE_NOW" : basePriority >= 0.3 ? "ADD_ADAPTER" : "RESEARCH_ONLY";
}

/** Score one acquisition candidate (optionally weighted by a target experiment's coverage). */
export function scoreAcquisition(i: AcquisitionInputs, target?: ExperimentTarget): AcquisitionResult {
  const yieldSum = i.reliability + i.novelty + i.freshnessAlpha + i.decisionLeverage + i.proofValue;
  const costNorm = Math.min(2, i.genome.costPerMonth / 5000); // $5k/mo ≈ 1.0 cost unit
  const riskPenalty = i.genome.rightsRisk + (i.genome.attributionRequired ? 0.05 : 0);
  const basePriority = Number((yieldSum / (1 + costNorm + riskPenalty + i.integrationComplexity)).toFixed(4));

  const coverageMatch = target
    ? Number(Math.max(0, ...(i.endpoints ?? []).map((e) => endpointCovers(e, target.neededFacts)), 0).toFixed(4))
    : 0;
  // Coverage weighting: a source covering the target experiment's needed facts is worth far more for
  // that experiment; off-target sources are heavily discounted (but never zeroed).
  const priority = target ? Number((basePriority * (0.3 + 0.7 * coverageMatch)).toFixed(4)) : basePriority;

  const recommendation = recommend(i.genome, basePriority, i.alreadyIntegrated ?? false);
  return {
    sourceId: i.genome.sourceId,
    basePriority,
    coverageMatch,
    priority,
    recommendation,
    note: target
      ? `Priority ${priority} for "${target.name}" (coverage ${coverageMatch}); ${recommendation}.`
      : `Priority ${basePriority}; ${recommendation}.`,
  };
}

/** Rank acquisition candidates, best-first, optionally for a specific target experiment. */
export function rankAcquisition(candidates: readonly AcquisitionInputs[], target?: ExperimentTarget): AcquisitionResult[] {
  return candidates.map((c) => scoreAcquisition(c, target)).sort((a, b) => b.priority - a.priority);
}
