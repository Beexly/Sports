/**
 * Input of the slate generator.
 * A reasoning trace is required. WITHHELD does not fit `conclusion`.
 * The brand on a trace is a string, and this slot only accepts `never`
 * when the object is the trace itself rather than an options bag, so a
 * bare trace still cannot be passed as the options.
 */
import type { ReasoningTrace } from "./reasoning-trace.js";

export type SlateAcceptedTrace = Omit<ReasoningTrace, "conclusion"> & {
  readonly conclusion: "ASSOCIATION_ONLY";
};

export type SignalSlateOptions = {
  readonly horizonHours?: number;
  readonly logPrefix?: string;
  readonly now?: Date;
  /** When true, do not call ESPN seed (board-fill already seeded). */
  readonly skipSeed?: boolean;
  /** Injected fetch for the fixture confirmation scoreboard (tests); defaults to global fetch. */
  readonly fetchImpl?: typeof fetch;
  readonly trace: SlateAcceptedTrace;
  readonly reasoningTraceBrand?: never;
};
