/**
 * Input of the slate generator.
 * A reasoning trace is required. WITHHELD does not fit `conclusion`.
 * The brand on a trace is a string, and this slot only accepts `never`
 * when the object is the trace itself rather than an options bag, so a
 * bare trace still cannot be passed as the options.
 */
import type { ReasoningTrace } from "./reasoning-trace.js";
import type { MindVerdict } from "./mint-gate.js";

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
  /**
   * Games the mind was asked to cover, keyed by game id. Absent, or a game
   * missing from the map, means the mind was not asked. Those games are minted
   * exactly as they are without this field.
   */
  readonly mindByGameId?: ReadonlyMap<string, MindVerdict>;
  /**
   * Walk-forward emission override. Production omits this and reads
   * walk-forward-gate.json. passed !== true blocks every Pick write.
   *
   * The override is a TEST-HARNESS ESCAPE HATCH from reading the file, not a
   * way around the gate: it is evaluated by the same constitutional
   * conjunction the file is (n >= 150 AND delta_vs_gaussian >= 0.01 AND
   * crps <= 7.099). An override that carries `passed: true` and no evidence
   * is BLOCKED -- a bare boolean is the hole the gate exists to close. Tests
   * that need the minting path open supply the evidence.
   */
  readonly emissionGate?: {
    readonly passed: boolean;
    readonly crps?: number | null;
    readonly n?: number | null;
    readonly deltaVsGaussian?: number | null;
  };
};
