/**
 * DISCOVERY LAYER — Scientific Discovery Council (Invention 33).
 *
 * Not agents that "help" — agents that perform SCIENTIFIC ROLES. The council turns an observed
 * contradiction into tested knowledge through one loop: theorize → ghost-check → select →
 * experiment → trade-test → govern → archive → route. It may generate, rank, debate, and route
 * research tasks only — NO external action without existing approval gates, and nothing here flips
 * a live gate. GSE copies the structure of an AI co-scientist, applied to sports-market reality.
 *
 * Pure + deterministic: it orchestrates the other discovery/einstein modules.
 */

import { runTournament, type TheoryEntrant, type RankedTheory } from "./theory-tournament.js";
import { scoreTheoryValue, type TheoryEvidence, type TheoryStatus } from "./epistemic-compression.js";
import { assessAgainstGhosts, type GhostCluster } from "./ghost-economy.js";
import { rankByEDY, type DiscoveryYieldInputs, type DiscoveryYieldResult } from "./expected-discovery-yield.js";
import { assessTradability, type TradabilityInputs, type TradabilityStatus } from "../einstein/tradability-filter.js";
import type { CandidateShape } from "../einstein/negative-discovery-ledger.js";

export type CouncilRole =
  | "Theorist" | "Experimentalist" | "Instrumentalist" | "Statistician" | "Historian"
  | "Prosecutor" | "Economist" | "TrustOfficer" | "Archivist" | "Operator";

export interface CompetingTheory {
  readonly id: string;
  readonly name: string;
  readonly shape: CandidateShape;
  readonly entrant: TheoryEntrant;
  readonly evidence: TheoryEvidence;
}

export interface CouncilInput {
  readonly observation: string;
  readonly theories: readonly CompetingTheory[];
  readonly experiments: readonly DiscoveryYieldInputs[];
  readonly ghostClusters: readonly GhostCluster[];
  readonly winnerTradability: TradabilityInputs;
  readonly rightsStatus: "cleared" | "needs_review" | "blocked";
  /** A proposed new ontology term — accepted only if it compresses AND survives falsification. */
  readonly ontologyProposal?: { readonly name: string; readonly compressionGain: number; readonly survivesFalsification: boolean };
}

export interface CouncilResult {
  readonly observation: string;
  readonly ranked: readonly RankedTheory[];
  readonly winner: RankedTheory | null;
  readonly buried: readonly RankedTheory[];
  readonly theoryStatuses: Readonly<Record<string, TheoryStatus>>;
  readonly cheapestExperiment: DiscoveryYieldResult | null;
  readonly tradabilityStatus: TradabilityStatus;
  readonly publicClaimAllowed: boolean;
  readonly ontologyDecision: "accepted" | "rejected" | "none";
  readonly researchTasks: readonly string[];
  readonly roleLog: Readonly<Record<CouncilRole, string>>;
}

/** Run one discovery cycle over an observed contradiction. */
export function runDiscoveryCycle(input: CouncilInput): CouncilResult {
  const roleLog: Record<CouncilRole, string> = {
    Theorist: `Proposed ${input.theories.length} competing theories for: ${input.observation}.`,
    Experimentalist: "—", Instrumentalist: "—", Statistician: "—", Historian: "—",
    Prosecutor: "—", Economist: "—", TrustOfficer: "—", Archivist: "—", Operator: "—",
  };

  // Historian: penalize theories resembling prior failures (ghost economy).
  const ghostAdjusted: TheoryEntrant[] = input.theories.map((t) => {
    const g = assessAgainstGhosts(t.shape, input.ghostClusters);
    return { ...t.entrant, ghostSimilarity: Math.max(t.entrant.ghostSimilarity, g.maxPenalty) };
  });
  roleLog.Historian = `Checked ${input.theories.length} theories against ${input.ghostClusters.length} ghost clusters.`;

  // Theorist/Tournament: rank and bury.
  const tournament = runTournament(ghostAdjusted);
  roleLog.Prosecutor = `Buried ${tournament.buried.length} theories (fitness ≤ 0, leakage, or ghost-resemblance).`;

  // Statistician: classify each theory's compression status. Key by entrant.id — the SAME id the
  // tournament ranks/buries by (RankedTheory.id === entrant.id) — so theoryStatuses[winner.id] joins
  // correctly even when CompetingTheory.id differs from its entrant.id.
  const theoryStatuses: Record<string, TheoryStatus> = {};
  for (const t of input.theories) theoryStatuses[t.entrant.id] = scoreTheoryValue(t.evidence).status;
  roleLog.Statistician = `Classified theories: ${Object.entries(theoryStatuses).map(([k, v]) => `${k}=${v}`).join(", ")}.`;

  // Experimentalist + Instrumentalist: highest Expected-Discovery-Yield falsifier (yield already nets
  // cost, so the top-yield study — not the literally cheapest — is the one to run first).
  const rankedExp = rankByEDY(input.experiments);
  const cheapestExperiment = rankedExp[0] ?? null;
  roleLog.Experimentalist = cheapestExperiment ? `Highest-yield falsifier: ${cheapestExperiment.id} (EDY ${cheapestExperiment.edy}).` : "No experiment available.";
  roleLog.Instrumentalist = "Flagged required sensors via Expected Discovery Yield ranking.";

  // Economist: does the winner survive friction?
  const trad = assessTradability(input.winnerTradability);
  roleLog.Economist = `Winner tradability: ${trad.status}${trad.killStage ? ` (killed at ${trad.killStage})` : ""}.`;

  // TrustOfficer: rights + public claim governance (never certainty language; never auto-publish).
  const publicClaimAllowed = input.rightsStatus === "cleared";
  roleLog.TrustOfficer = `Rights ${input.rightsStatus}; public claim ${publicClaimAllowed ? "permitted (still no certainty language)" : "withheld"}.`;

  // Archivist: bury losers; decide ontology.
  let ontologyDecision: CouncilResult["ontologyDecision"] = "none";
  if (input.ontologyProposal) {
    ontologyDecision = input.ontologyProposal.compressionGain > 0 && input.ontologyProposal.survivesFalsification ? "accepted" : "rejected";
  }
  roleLog.Archivist = `Archived ${tournament.buried.length} ghosts; ontology proposal ${ontologyDecision}.`;

  // Operator: emit research tasks (no live action, no gate flip).
  const researchTasks: string[] = [];
  if (cheapestExperiment) researchTasks.push(`Run experiment ${cheapestExperiment.id} to falsify/confirm the winning theory.`);
  if (tournament.winner && trad.status === "EXECUTABLE_SHADOW") researchTasks.push(`Shadow-track ${tournament.winner.name} (no live bet, no gate).`);
  if (tournament.winner && trad.status === "FRICTION_KILLED") researchTasks.push(`Bury ${tournament.winner.name}: theoretically interesting but friction-killed.`);
  roleLog.Operator = `Emitted ${researchTasks.length} research task(s). No external action taken.`;

  return {
    observation: input.observation,
    ranked: tournament.ranked,
    winner: tournament.winner,
    buried: tournament.buried,
    theoryStatuses,
    cheapestExperiment,
    tradabilityStatus: trad.status,
    publicClaimAllowed,
    ontologyDecision,
    researchTasks,
    roleLog,
  };
}
