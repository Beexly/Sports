/**
 * NFL publication gate. User text cannot flip a PASS.
 * Book-path only: this file does not touch Signal Path confidence.
 */

export interface GateLedgerRecord {
  readonly timestamp?: string;
  readonly game_id: string;
  readonly market_type: string;
  readonly selection: string;
  readonly line: number;
  readonly model_prob: number;
  readonly market_prob_devig: number;
  readonly raw_edge: number;
  readonly decision: "PASS" | "KILLED";
  readonly reason_codes: readonly string[];
  readonly state_hash?: string;
}

export interface InjuryTransitionProof {
  readonly official: true;
  readonly from_status: "Questionable" | "Active";
  readonly to_status: "Active" | "Out";
  readonly impact_weight: number;
}

export interface MarketOrRosterDeltaProof {
  readonly verified: true;
  readonly injury_transition?: InjuryTransitionProof;
}

export interface CurrentMarketState {
  readonly line: number;
  readonly marketProbDevig: number;
  readonly marketOrRosterDeltaProof?: MarketOrRosterDeltaProof;
  readonly userText?: string;
}

export interface ParlayLeg {
  readonly game_id: string;
  readonly market_type: string;
  readonly selection: string;
  readonly publishAllowed: boolean;
  readonly decision: "PASS" | "SPEAK" | "KILLED";
}

const LINE_MOVE = 1.5;
const PROB_MOVE = 0.035;
const JOINT_EDGE = 0.035;

export function canOverrideGateDecision(
  ledgerRecord: GateLedgerRecord,
  currentMarketState: CurrentMarketState,
): boolean {
  const proof = currentMarketState.marketOrRosterDeltaProof;
  if (!proof?.verified) return false;
  const lineDelta = Math.abs(currentMarketState.line - ledgerRecord.line);
  const probDelta = Math.abs(currentMarketState.marketProbDevig - ledgerRecord.market_prob_devig);
  if (lineDelta >= LINE_MOVE || probDelta >= PROB_MOVE) return true;
  const injury = proof.injury_transition;
  if (!injury?.official) return false;
  const flipped =
    (injury.from_status === "Questionable" && injury.to_status === "Active") ||
    (injury.from_status === "Active" && injury.to_status === "Out");
  return flipped && injury.impact_weight >= 0.15;
}

function wilsonLower(successes: number, n: number, z = 1.6448536269514722): number {
  if (n <= 0) return 0;
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return Math.max(0, (center - margin) / denom);
}

function structuralContradiction(legs: readonly ParlayLeg[]): boolean {
  const gameIds = new Set(legs.map((leg) => leg.game_id));
  const under = legs.some(
    (leg) => leg.market_type.toUpperCase().includes("TOTAL") && leg.selection.toUpperCase() === "UNDER",
  );
  const over = legs.some((leg) => {
    const market = leg.market_type.toUpperCase();
    const side = leg.selection.toUpperCase();
    return side === "OVER" && (market.includes("PASS") || market.includes("REC"));
  });
  return under && over && gameIds.size <= 1;
}

export function evaluateParlayConjunctionGate(
  legs: readonly ParlayLeg[],
  jointSimProb: number,
  bookParlayImpliedProb: number,
  nWorlds = 10000,
): { publishAllowed: boolean; decision: "PASS" | "SPEAK"; reason: string; wilsonLower90: number } {
  if (legs.some((leg) => !leg.publishAllowed || leg.decision === "PASS")) {
    return { publishAllowed: false, decision: "PASS", reason: "PARLAY_CONTAINS_PASS_LEG", wilsonLower90: 0 };
  }
  const lower = wilsonLower(jointSimProb * nWorlds, nWorlds);
  const edge = jointSimProb - bookParlayImpliedProb;
  if (structuralContradiction(legs) && !(edge >= JOINT_EDGE && lower > bookParlayImpliedProb)) {
    return { publishAllowed: false, decision: "PASS", reason: "SGP_STRUCTURAL_CONTRADICTION", wilsonLower90: lower };
  }
  return { publishAllowed: true, decision: "SPEAK", reason: "PARLAY_CONJUNCTION_PASS", wilsonLower90: lower };
}

export function publicationAllowedForJev(jevStatus: string | null | undefined): boolean {
  return jevStatus === "VERIFIED_LIVE";
}
