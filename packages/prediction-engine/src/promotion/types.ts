/**
 * Model Promotion Gate — row-level input/output types.
 *
 * FROZEN CONTRACT: docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md
 *
 * Anti-DEC-062 invariant #4 ("no self-reports, structurally"): every input
 * type here is a row-level, persisted record — a single event's paired
 * pre-lock probabilities, a single settlement outcome, a single
 * pipeline-graded CLV pick. There is deliberately NO aggregate field
 * anywhere in `PromotionInput` (no `meanClv`, no `brierImprovement`, no
 * pre-summed anything). Every mean, variance, and bound in this module is
 * recomputed from these rows by the evaluator itself — a hardcoded
 * `computeClvMean()`-style stub is unrepresentable by this type, not merely
 * discouraged. See __tests__/no-aggregate-inputs.test.ts for the
 * compile-time documentation check.
 */

/** A single settled event where BOTH champion and challenger emitted a
 * pre-lock probability before the event's line locked (walk-forward
 * discipline — PickSignalSnapshot). Leg 1 (paired Brier differential). */
export type PairedBrierRow = {
  /** Stable identifier of the settled event (game/market leg). */
  readonly eventId: string;
  /** Champion's pre-lock probability for the graded outcome, in [0, 1]. */
  readonly championProb: number;
  /** Challenger's pre-lock probability for the SAME graded outcome, in [0, 1]. */
  readonly challengerProb: number;
  /** Realized binary outcome (1 = the outcome the probabilities target occurred). */
  readonly outcome: 0 | 1;
  /** ISO timestamp the line/prediction locked. */
  readonly lockedAt: string;
  /** ISO timestamp the event was settled (must be after lockedAt). */
  readonly settledAt: string;
};

/** A single graded CLV pick from the pipeline's settlement/CLV grading
 * (production picks for the champion, shadow-lane picks for the
 * challenger — same settlement/CLV pipeline, Workstream E router). Leg 2
 * (CLV non-inferiority). Pick sets differ between models, so these are
 * NOT paired with PairedBrierRow — Leg 2 is an unpaired Welch comparison. */
export type ClvRow = {
  /** Stable identifier of the graded pick. */
  readonly pickId: string;
  /** Which model produced this pick. */
  readonly model: "champion" | "challenger";
  /** Pipeline-graded CLV as a decimal fraction (e.g. 0.012 = 120 bps of CLV). */
  readonly clv: number;
  /** ISO timestamp the pick locked. */
  readonly lockedAt: string;
  /** ISO timestamp the pick was settled/graded (must be after lockedAt). */
  readonly settledAt: string;
};

/** Pre-registered trial parameters (contract §4: registered BEFORE the
 * window opens, one evaluation per challenger per window). */
export type RegisteredWindow = {
  readonly windowId: string;
  readonly marketFamily: string;
  /** ISO timestamp — inclusive start of the evaluation window. */
  readonly start: string;
  /** ISO timestamp — inclusive end of the evaluation window. */
  readonly end: string;
  /** ISO timestamp the window/trial was registered. MUST be strictly
   * before `start` — a window registered at or after its own start could
   * have been shaped by peeking at in-window results (Leg 3). */
  readonly registeredAt: string;
  /** Leg 1 minimum paired settled events. Contract default: 500. */
  readonly nMin: number;
  /** Leg 1 practical-significance floor (Brier points). Contract default: 0.002. */
  readonly deltaPrac: number;
  /** Leg 2 non-inferiority margin (decimal fraction). Contract default: 0.0005 (5 bps). */
  readonly epsilonClv: number;
  /** Leg 2 minimum graded CLV picks per side. Contract default: 100. */
  readonly minClvN: number;
  /** m: number of challengers concurrently evaluated against this champion
   * in this window — drives the Bonferroni adjustment (alpha / m) applied
   * to BOTH legs. Contract default: 1. */
  readonly concurrentChallengers: number;
  /** Base significance level before Bonferroni adjustment. Contract default: 0.05. */
  readonly alpha: number;
  /**
   * Pre-registered event universe for this market family and window: the
   * FULL set of event ids the challenger is expected to cover, committed
   * (and window-hashed) before the window opens. Anti-cherry-picking: a
   * challenger cannot be evaluated on a favorable overlap subset — rows for
   * events outside this set are an integrity violation, and coverage below
   * `coverageFloor` fails Leg 1. Must be non-empty.
   */
  readonly registeredEventIds: readonly string[];
  /**
   * Minimum fraction of `registeredEventIds` that must appear in the paired
   * Brier sample for Leg 1 to pass (0 < coverageFloor <= 1). Contract
   * default: 0.95 — a challenger that abstains from more than 5% of the
   * registered universe is not evaluated on the family it would replace the
   * champion for.
   */
  readonly coverageFloor: number;
};

export type PromotionInput = {
  readonly window: RegisteredWindow;
  readonly championId: string;
  readonly challengerId: string;
  /** Code revision of the evaluator itself, folded into the window hash for
   * auditability (a decision is tied to the code that produced it). */
  readonly codeRevision: string;
  readonly brierRows: readonly PairedBrierRow[];
  readonly clvRows: readonly ClvRow[];
};

export type Verdict = "ELIGIBLE" | "NOT_ELIGIBLE";

export type Leg1Result = {
  readonly n: number;
  readonly meanD: number;
  readonly stdD: number;
  readonly lcb: number;
  readonly deltaPrac: number;
  readonly nMin: number;
  /** Size of the pre-registered event universe for this window. */
  readonly registeredEvents: number;
  /** n / registeredEvents — fraction of the registered universe covered by
   * the paired sample (duplicate event ids are an integrity throw upstream,
   * so n counts distinct events). */
  readonly coverage: number;
  readonly coverageFloor: number;
  readonly pass: boolean;
  readonly reason?: string;
};

export type Leg2Result = {
  readonly nChampion: number;
  readonly nChallenger: number;
  readonly meanChampion: number;
  readonly meanChallenger: number;
  readonly z: number;
  readonly oneSidedP: number;
  readonly zCrit: number;
  readonly epsilon: number;
  readonly alphaAdj: number;
  readonly minN: number;
  readonly pass: boolean;
  readonly reason?: string;
};

/**
 * The gate's output. Eligibility-only, per contract §5 invariant #6: this
 * type has no field that could flip a live model — `verdict` is ELIGIBLE or
 * NOT_ELIGIBLE and nothing else. Applying a promotion to the live-model
 * selection remains a separate, founder-applied, owner-only step outside
 * this module.
 */
export type PromotionDecision = {
  readonly windowId: string;
  /** Real sha256 over the canonical (sorted-key) serialization of the
   * registered window parameters + codeRevision. See window-hash.ts. */
  readonly windowHash: string;
  readonly marketFamily: string;
  readonly championId: string;
  readonly challengerId: string;
  readonly codeRevision: string;
  /** Injected, not sampled — callers must supply `now` explicitly so the
   * same inputs always replay to a byte-identical decision. */
  readonly decidedAt: string;
  readonly alpha: number;
  readonly alphaAdj: number;
  readonly concurrentChallengers: number;
  readonly leg1: Leg1Result;
  readonly leg2: Leg2Result;
  readonly verdict: Verdict;
};
