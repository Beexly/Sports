/**
 * DECISION FACTORY — Product Intelligence Loop (the moat: scar memory).
 *
 * The closed loop. A settled card is graded by the engine's autopsy — PROCESS over outcome, so a
 * single week can never move a weight. Only an UNSOUND process (a lucky win or a process error) emits
 * a lesson, and that lesson becomes a GHOST: a scar that suppresses a resembling card next cycle. A
 * deserved win reinforces (optionally graduating a theory toward LAW); an unlucky/deserved loss
 * changes nothing. Competitors do Data → Projection → Advice and forget. GSE remembers. It reuses
 * `fantasyAutopsy`, the ghost-economy `GhostCluster`, and `evolveTheory` — no new science. Pure.
 */

import {
  type FantasyAction,
  type FantasyProcessVerdict,
  type GhostCluster,
  type CandidateShape,
  type FailureReason,
  type TheoryOrganism,
  type EcologySignals,
  type EcologyTransition,
  fantasyAutopsy,
  evolveTheory,
} from "@sports/engine";

export interface SettledCard {
  readonly cardId: string;
  readonly subject: string;
  readonly action: FantasyAction;
  readonly candidateShape: CandidateShape;
  readonly roleImpliedValue: number;
  readonly marketBeliefAtDecision: number;
  readonly knowableAtDecision: boolean;
  readonly ghostMatched: boolean;
  readonly expectedFantasyPoints: number;
  readonly outcomeFantasyPoints: number;
  readonly varianceBand: number;
  /** Optional theory this card expressed, advanced through the ecology when provided. */
  readonly theory?: TheoryOrganism;
  readonly ecologySignals?: EcologySignals;
}

export type LoopAction = "GHOST" | "REINFORCE" | "RETIRE" | "NO_CHANGE";

export interface LoopOutcome {
  readonly cardId: string;
  readonly verdict: FantasyProcessVerdict;
  readonly emitsLesson: boolean;
  readonly loopAction: LoopAction;
  /** The scar this loop emits — added to the ghost economy to suppress its twin next cycle. */
  readonly emittedGhost: GhostCluster | null;
  readonly theoryTransition: EcologyTransition | null;
  readonly note: string;
}

/** Map an unsound-process verdict to a ghost-economy failure reason. */
function failureReasonFor(verdict: FantasyProcessVerdict): FailureReason {
  return verdict === "process_error" ? "settlement_negative" : "public_overreaction";
}

/** Grade a settled card and route the pattern to law / ghost / retire / no-change. */
export function runProductIntelligenceLoop(settled: SettledCard): LoopOutcome {
  const autopsy = fantasyAutopsy({
    action: settled.action,
    roleImpliedValue: settled.roleImpliedValue,
    marketBeliefAtDecision: settled.marketBeliefAtDecision,
    knowableAtDecision: settled.knowableAtDecision,
    ghostMatched: settled.ghostMatched,
    expectedFantasyPoints: settled.expectedFantasyPoints,
    outcomeFantasyPoints: settled.outcomeFantasyPoints,
    varianceBand: settled.varianceBand,
  });

  let loopAction: LoopAction;
  let emittedGhost: GhostCluster | null = null;

  if (autopsy.emitsLesson) {
    // Lucky win or process error → bury the shape as a ghost so its twin is suppressed next time.
    loopAction = "GHOST";
    emittedGhost = {
      id: `ghost:${settled.cardId}`,
      shape: settled.candidateShape,
      failureReason: failureReasonFor(autopsy.verdict),
      severity: autopsy.verdict === "process_error" ? 0.9 : 0.7,
      recencyWeight: 1,
    };
  } else if (autopsy.verdict === "deserved_win") {
    loopAction = "REINFORCE";
  } else {
    // unlucky_loss / deserved_loss — sound process; a single week cannot move a weight.
    loopAction = "NO_CHANGE";
  }

  // Optionally advance the linked theory through the ecology (law / ghost / retire / quarantine).
  let theoryTransition: EcologyTransition | null = null;
  if (settled.theory && settled.ecologySignals) {
    theoryTransition = evolveTheory(settled.theory, settled.ecologySignals).transition;
  }

  return {
    cardId: settled.cardId,
    verdict: autopsy.verdict,
    emitsLesson: autopsy.emitsLesson,
    loopAction,
    emittedGhost,
    theoryTransition,
    note: `${autopsy.verdict}: ${autopsy.note} → ${loopAction}.`,
  };
}
