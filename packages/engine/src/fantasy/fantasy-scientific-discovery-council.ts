/**
 * FANTASY DISCOVERY LAYER — Fantasy Scientific Discovery Council (Invention F20).
 *
 * Typed research roles that turn an observed fantasy contradiction into tested knowledge: theorize →
 * ghost-check → select → experiment → actionability-test → govern → archive → route. It reuses the
 * Discovery Layer's tournament + epistemic-compression primitives (the science is shared; only the
 * surfaces differ). It generates, ranks, and routes RESEARCH tasks only — it executes no roster
 * move, publishes no claim, and flips no live gate. Pure + deterministic.
 */

import { runTournament, type TheoryEntrant, type RankedTheory } from "../discovery/theory-tournament.js";
import { scoreTheoryValue, type TheoryEvidence, type TheoryStatus } from "../discovery/epistemic-compression.js";
import { assessFantasyGhosts, type FantasyGhost, type FantasyCandidateShape } from "./fantasy-ghost-bench.js";
import { rankFantasyExperiments, type FantasyExperimentInputs, type FantasyExperimentResult } from "./fantasy-experiment-governor.js";
import type { FantasyActionStatus } from "./fantasy-belief-state-transition.js";

export type FantasyCouncilRole =
  | "Theorist" | "Experimentalist" | "Instrumentalist" | "Statistician" | "Historian"
  | "Prosecutor" | "Economist" | "TrustOfficer" | "Archivist" | "Operator";

export interface FantasyCompetingTheory {
  readonly id: string;
  readonly name: string;
  readonly shape: FantasyCandidateShape;
  readonly entrant: TheoryEntrant;
  readonly evidence: TheoryEvidence;
}

export interface FantasyCouncilInput {
  readonly observation: string;
  readonly theories: readonly FantasyCompetingTheory[];
  readonly experiments: readonly FantasyExperimentInputs[];
  readonly ghosts: readonly FantasyGhost[];
  /** The winning theory's actionability disposition (from the belief-state transition). */
  readonly winnerActionability: FantasyActionStatus;
  readonly rightsStatus: "cleared" | "needs_review" | "blocked";
  readonly ontologyProposal?: { readonly name: string; readonly compressionGain: number; readonly survivesFalsification: boolean };
}

export interface FantasyCouncilResult {
  readonly observation: string;
  readonly ranked: readonly RankedTheory[];
  readonly winner: RankedTheory | null;
  readonly buried: readonly RankedTheory[];
  readonly theoryStatuses: Readonly<Record<string, TheoryStatus>>;
  readonly cheapestExperiment: FantasyExperimentResult | null;
  readonly actionability: FantasyActionStatus;
  readonly publicClaimAllowed: boolean;
  readonly ontologyDecision: "accepted" | "rejected" | "none";
  readonly researchTasks: readonly string[];
  readonly roleLog: Readonly<Record<FantasyCouncilRole, string>>;
}

/** Run one fantasy discovery cycle over an observed contradiction. */
export function runFantasyDiscoveryCycle(input: FantasyCouncilInput): FantasyCouncilResult {
  const roleLog: Record<FantasyCouncilRole, string> = {
    Theorist: `Proposed ${input.theories.length} competing theories for: ${input.observation}.`,
    Experimentalist: "—", Instrumentalist: "—", Statistician: "—", Historian: "—",
    Prosecutor: "—", Economist: "—", TrustOfficer: "—", Archivist: "—", Operator: "—",
  };

  // Historian: penalize theories resembling buried fantasy traps.
  const ghostAdjusted: TheoryEntrant[] = input.theories.map((t) => {
    const g = assessFantasyGhosts(t.shape, input.ghosts);
    return { ...t.entrant, ghostSimilarity: Math.max(t.entrant.ghostSimilarity, g.maxPenalty) };
  });
  roleLog.Historian = `Checked ${input.theories.length} theories against ${input.ghosts.length} fantasy ghosts.`;

  // Theorist/Tournament: rank and bury.
  const tournament = runTournament(ghostAdjusted);
  roleLog.Prosecutor = `Buried ${tournament.buried.length} theories (fitness ≤ 0, leakage, or ghost-resemblance).`;

  // Statistician: classify each theory's compression status.
  const theoryStatuses: Record<string, TheoryStatus> = {};
  for (const t of input.theories) theoryStatuses[t.id] = scoreTheoryValue(t.evidence).status;
  roleLog.Statistician = `Classified theories: ${Object.entries(theoryStatuses).map(([k, v]) => `${k}=${v}`).join(", ")}.`;

  // Experimentalist + Instrumentalist: cheapest/highest-yield falsifying study.
  const rankedExp = rankFantasyExperiments(input.experiments);
  const cheapestExperiment = rankedExp[0] ?? null;
  roleLog.Experimentalist = cheapestExperiment ? `Cheapest falsifier: ${cheapestExperiment.id} (yield ${cheapestExperiment.yield}).` : "No experiment available.";
  roleLog.Instrumentalist = "Flagged required fantasy sensors via Expected Discovery Yield ranking.";

  // Economist: is the winner actionable before its lock, net of friction/cost?
  roleLog.Economist = `Winner actionability: ${input.winnerActionability}.`;

  // TrustOfficer: rights + public-claim governance (no certainty language; no auto-publish).
  const publicClaimAllowed = input.rightsStatus === "cleared";
  roleLog.TrustOfficer = `Rights ${input.rightsStatus}; public claim ${publicClaimAllowed ? "permitted (still no certainty language)" : "withheld"}.`;

  // Archivist: ontology only when a concept earns its keep.
  let ontologyDecision: FantasyCouncilResult["ontologyDecision"] = "none";
  if (input.ontologyProposal) {
    ontologyDecision = input.ontologyProposal.compressionGain > 0 && input.ontologyProposal.survivesFalsification ? "accepted" : "rejected";
  }
  roleLog.Archivist = `Archived ${tournament.buried.length} ghosts; ontology proposal ${ontologyDecision}.`;

  // Operator: emit research tasks (no live action, no gate flip, no roster move).
  const researchTasks: string[] = [];
  if (cheapestExperiment) researchTasks.push(`Run study ${cheapestExperiment.id} to falsify/confirm the winning theory.`);
  if (tournament.winner && input.winnerActionability === "ACTIONABLE_SHADOW") researchTasks.push(`Shadow-track ${tournament.winner.name} (no roster move, no live bet, no gate).`);
  if (tournament.winner && input.winnerActionability === "POST_LOCK_ONLY") researchTasks.push(`Log ${tournament.winner.name}: knowable but only post-lock — do not credit or act.`);
  roleLog.Operator = `Emitted ${researchTasks.length} research task(s). No external action taken.`;

  return {
    observation: input.observation,
    ranked: tournament.ranked,
    winner: tournament.winner,
    buried: tournament.buried,
    theoryStatuses,
    cheapestExperiment,
    actionability: input.winnerActionability,
    publicClaimAllowed,
    ontologyDecision,
    researchTasks,
    roleLog,
  };
}
