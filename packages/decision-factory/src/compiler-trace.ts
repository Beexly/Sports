/**
 * DECISION FACTORY — Compiler Trace.
 *
 * The runtime collapses the pipeline into one frame; the factory exposes it as a COMPILER: a sequence
 * of named passes, each emitting a CompilerTrace (inputCount, outputCount, suppressedCount, notes).
 * The user sees the card; the owner sees the trace; the system sees where intelligence failed. This is
 * a thin instrumentation layer over `runDecisionFieldFrame` — it forks no logic. Pure + deterministic.
 */

import {
  type DecisionFieldFrame,
  type DecisionFieldInput,
  runDecisionFieldFrame,
} from "@sports/decision-field-runtime";

export interface CompilerTrace {
  readonly passIndex: number;
  readonly passName: string;
  readonly inputCount: number;
  readonly outputCount: number;
  readonly suppressedCount: number;
  readonly notes: readonly string[];
}

export interface CompileResult {
  readonly frame: DecisionFieldFrame;
  readonly traces: readonly CompilerTrace[];
}

/** Compile a decision field input into a frame plus a per-pass trace. */
export function compileFieldFrame(input: DecisionFieldInput): CompileResult {
  const frame = runDecisionFieldFrame(input);
  const candidates = frame.decisionCandidates.length;
  const claims = frame.decisionCandidates.reduce((n, c) => n + c.claims.length, 0);

  const traces: CompilerTrace[] = [
    t(0, "point_in_time_filter", frame.facts.rawSeen.length, frame.facts.pointInTime.length, frame.facts.futureLeaked.length + frame.facts.rightsBlocked.length, [frame.proof.note]),
    t(1, "entity_resolution", frame.facts.pointInTime.length, frame.fieldStress.length, 0, [`${frame.fieldStress.length} subject(s) resolved.`]),
    t(2, "change_detection", frame.facts.pointInTime.length, frame.detectedChanges.length, 0, frame.detectedChanges.map((c) => c.note)),
    t(3, "conflict_classification", frame.facts.pointInTime.length, frame.conflicts.length, 0, frame.conflicts.map((c) => `${c.conflictClass}: ${c.verdict}`)),
    t(4, "data_leverage_scoring", frame.facts.pointInTime.length, frame.sourceRent.length, 0, frame.sourceRent.map((s) => `${s.sourceId}: rent ${s.decisionLeverageCreated}`)),
    t(5, "required_stat_audit", candidates, candidates, frame.missedObservations.length, frame.missedObservations.map((m) => m.note)),
    t(6, "regime_adjustment", candidates, candidates, frame.regime.suppressAction ? candidates : 0, [`${frame.regime.regime} (suppressAction=${frame.regime.suppressAction})`]),
    t(7, "engine_prosecution", candidates, frame.emittedCards.length, frame.suppressedCards.length, frame.emittedCards.flatMap((c) => c.prosecution.downgradeReasons)),
    t(8, "decision_state_classification", candidates, candidates, 0, frame.decisionCandidates.map((c) => `${c.subject}: ${c.decisionState}`)),
    t(9, "claim_construction", candidates, claims, 0, [`${claims} claim(s) across ${candidates} candidate(s).`]),
    t(10, "card_construction", candidates, frame.emittedCards.length, frame.suppressedCards.length, frame.suppressedCards.map((s) => s.reason)),
    t(11, "surface_routing", frame.emittedCards.length, frame.emittedCards.length, 0, frame.emittedCards.map((c) => `${c.subject} → ${c.routeTo}`)),
    t(12, "autopsy_hook", frame.emittedCards.length, frame.learning.autopsyHooks.length, 0, ["Deferred grading attached; no weight moves."]),
    t(13, "conscience_snapshot", frame.emittedCards.length, 1, 0, [frame.conscience.note]),
  ];
  return { frame, traces };
}

function t(passIndex: number, passName: string, inputCount: number, outputCount: number, suppressedCount: number, notes: readonly string[]): CompilerTrace {
  return { passIndex, passName, inputCount, outputCount, suppressedCount, notes };
}
