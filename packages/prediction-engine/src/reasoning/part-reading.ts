/**
 * Turns live edge parts into one reading and shows them to the aggregation trace.
 * The home or away call is the sign of the sum. The trace records agreement.
 * It does not publish a pick and its confidence is not a win probability.
 */

import { aggregateSignals, type AggregationTrace } from "./aggregation-trace.js";
import { readingConclusion, type PartDecision } from "./part-selector.js";
import type { SignalFamily } from "@sports/types";

const TRACE_FAMILY: Record<string, SignalFamily> = {
  on_field_efficiency: "EFFICIENCY",
  scheme_play_design: "SITUATIONAL",
  availability: "SITUATIONAL",
  schedule_and_body: "SITUATIONAL",
  historical_strength: "EFFICIENCY",
  trench_personnel: "TRENCHES",
  chemistry: "SITUATIONAL",
  airwave: "NARRATIVE",
  narrative_contract: "NARRATIVE",
};

export interface EdgePartInput {
  readonly id: string;
  readonly signed: number;
  readonly points: number;
}

export interface PartReading {
  readonly gameId: string;
  readonly liveCount: number;
  readonly dark: readonly PartDecision[];
  readonly stored: readonly PartDecision[];
  readonly edge: number;
  readonly side: "home" | "away" | "level";
  readonly publishesPick: false;
  readonly probabilityEncoding: "0.5 + 0.49 * signed";
  readonly encodingIsWinProbability: false;
  readonly trace: AggregationTrace | null;
  readonly traceRefusal: string | null;
  readonly conclusion: string;
}

/** Maps a signed part onto (0, 1) so the trace can see direction. Not a win probability. */
export function encodeSigned(signed: number): number {
  const clipped = Math.max(-1, Math.min(1, signed));
  return 0.5 + 0.49 * clipped;
}

export function readParts(input: {
  readonly gameId: string;
  readonly edge: number;
  readonly parts: readonly EdgePartInput[];
  readonly decisions: readonly PartDecision[];
  readonly decisionTimestamp: string;
}): PartReading {
  const dark = input.decisions.filter((decision) => decision.status === "DARK");
  const stored = input.decisions.filter((decision) => decision.status === "STORED");
  const side = input.edge > 0 ? "home" : input.edge < 0 ? "away" : "level";
  const signals = input.parts.map((part) => ({
    signalId: part.id,
    sourceModule: "part-selector",
    family: TRACE_FAMILY[part.id] ?? "SITUATIONAL",
    reasoningPath: part.id,
    outcome: "home_direction",
    probability: encodeSigned(part.signed),
    declaredWeight: Math.abs(part.points),
    evidenceTimestamp: input.decisionTimestamp,
    provenance: ["live-edge-registry", part.id],
  }));
  const evaluated = aggregateSignals({
    signals,
    decisionTimestamp: input.decisionTimestamp,
    decisionWindowMs: 86_400_000,
  });
  const trace = evaluated.ok ? evaluated.data : null;
  const traceRefusal = evaluated.ok ? null : evaluated.reason;
  const conclusion = readingConclusion(input.gameId, input.parts.length, input.decisions, input.edge);
  return {
    gameId: input.gameId,
    liveCount: input.parts.length,
    dark,
    stored,
    edge: input.edge,
    side,
    publishesPick: false,
    probabilityEncoding: "0.5 + 0.49 * signed",
    encodingIsWinProbability: false,
    trace,
    traceRefusal,
    conclusion,
  };
}
