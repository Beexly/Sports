/**
 * Input of the slate generator. A reasoning trace carries
 * `reasoningTraceBrand` and cannot be assigned here.
 */
export type SignalSlateOptions = {
  readonly horizonHours?: number;
  readonly logPrefix?: string;
  readonly now?: Date;
  /** When true, do not call ESPN seed (board-fill already seeded). */
  readonly skipSeed?: boolean;
  /** Injected fetch for the fixture confirmation scoreboard (tests); defaults to global fetch. */
  readonly fetchImpl?: typeof fetch;
  readonly reasoningTraceBrand?: never;
};
