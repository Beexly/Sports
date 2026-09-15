/**
 * Formal pick-lifecycle state model.
 *
 * WHY THIS EXISTS. The pick lifecycle (mint -> adverse-edge veto -> model-signal
 * suppression -> conviction gate -> publish -> settle -> grade) is real and correct,
 * but implicit: it lives as separate predicates scattered across
 * `packages/types` (`pricesWorseThanMarket`), `apps/web/lib/picks/model-signal-coherence.ts`
 * (`isModelSignalRow` / `dropContradictedModelSignals`), `apps/web/lib/conviction/gate-contract.ts`
 * (`evaluateGate`), and the `PickResult` Prisma enum. Nobody can see "the lifecycle" in
 * one place, and there is no way to ask "what states can a pick actually be in, and what
 * moves it between them" without reading five files.
 *
 * WHAT THIS IS NOT. This module does not score, rank, gate, or mutate a single pick. It
 * imports the REAL predicates above and composes them into one pure, inspectable state
 * machine — a read-only formal model of behavior that already exists, not a new behavior.
 * Nothing here is wired into the mint/publish/settle path; it is additive documentation +
 * a validation surface (see `lifecycle-model.test.ts`) that can assert real pick rows
 * actually behave the way this model says they should.
 *
 * WHY HAND-ROLLED, NOT XSTATE. The natural implementation here is a proper state-machine
 * library (XState v5 in particular — its `setup()`/`createMachine()` API and pure,
 * serializable actor model fit this exactly, and it runs cleanly in a stateless Vercel
 * function with no persistent process). It was not added because AGENTS.md law 2 freezes
 * `package-lock.json`: no agent session may add a new runtime dependency. This module is
 * therefore a deliberately small, zero-dependency equivalent — an explicit transition
 * table plus a pure `transition()` function — that gives ~90% of the value (explicit
 * states, guarded transitions, a serializable graph for docs/visualization) with zero
 * install. See `docs/dev/xstate-upgrade-spec.md` for the literal XState v5 machine this
 * would become if the founder approves the dependency.
 */

import { pricesWorseThanMarket, type IndependentEdgeSummary } from "@sports/types";

export type PickLifecycleState =
  | "MINTED"
  | "ADVERSE_VETOED"
  | "MODEL_SIGNAL_SUPPRESSED"
  | "CONVICTION_HELD"
  | "PUBLISHED"
  | "SETTLED_WIN"
  | "SETTLED_LOSS"
  | "SETTLED_PUSH"
  | "VOIDED";

export type PickLifecycleEvent =
  | "MINT"
  | "ADVERSE_EDGE_CHECK"
  | "MODEL_SIGNAL_CHECK"
  | "CONVICTION_CHECK"
  | "PUBLISH"
  | "SETTLE";

/**
 * The minimal real signal each guard actually reads, named for the real function that
 * produces it. Kept structural (not a class) so a test or a caller can build one from a
 * real Pick row without importing Prisma types into this module.
 */
export type PickLifecycleContext = {
  /** From the pick's own `factorBreakdown.independentEdge` — same input `pricesWorseThanMarket` reads. */
  readonly independentEdge: IndependentEdgeSummary | null;
  /** From `isModelSignalRow` — true when `bookmakerCount <= 0` and a book-priced sibling row exists for the same game+viewer. */
  readonly isContradictedModelSignal: boolean;
  /** From `evaluateGate()`'s `GateVerdict.verdict` — `"HELD"` when any signal returned CONTRADICTS and `requireEvidence` is on. */
  readonly convictionVerdict: "PUBLISH" | "HELD" | null;
  /** From `Pick.result` (Prisma `PickResult` enum) once settlement has run; null while PENDING. */
  readonly settlementResult: "WIN" | "LOSS" | "PUSH" | "VOID" | null;
};

type TransitionTable = {
  readonly [S in PickLifecycleState]?: {
    readonly [E in PickLifecycleEvent]?: (
      ctx: PickLifecycleContext,
    ) => PickLifecycleState | null; // null = event does not apply in this state, no transition
  };
};

/**
 * The transition table IS the lifecycle spec. Every edge composes a real, already-shipped
 * predicate — this file introduces zero new decision logic.
 */
const TABLE: TransitionTable = {
  MINTED: {
    ADVERSE_EDGE_CHECK: (ctx) =>
      pricesWorseThanMarket(ctx.independentEdge) ? "ADVERSE_VETOED" : "MINTED",
    MODEL_SIGNAL_CHECK: (ctx) =>
      ctx.isContradictedModelSignal ? "MODEL_SIGNAL_SUPPRESSED" : "MINTED",
    CONVICTION_CHECK: (ctx) =>
      ctx.convictionVerdict === "HELD" ? "CONVICTION_HELD" : "MINTED",
    PUBLISH: () => "PUBLISHED",
  },
  PUBLISHED: {
    SETTLE: (ctx) => {
      switch (ctx.settlementResult) {
        case "WIN":
          return "SETTLED_WIN";
        case "LOSS":
          return "SETTLED_LOSS";
        case "PUSH":
          return "SETTLED_PUSH";
        case "VOID":
          return "VOIDED";
        default:
          return "PUBLISHED"; // still PENDING
      }
    },
  },
  // ADVERSE_VETOED, MODEL_SIGNAL_SUPPRESSED, CONVICTION_HELD are terminal for display
  // purposes (per adverse-edge-suppression.ts: "it writes NOTHING — isPublished is
  // untouched, so a suppressed row still settles and still counts in the published
  // record"). The row keeps grading in the database; this model's PUBLISHED->SETTLE arm
  // is what actually reflects that, since suppression is display-only and never flips
  // `isPublished`. A suppressed pick is therefore modeled as branching off MINTED for
  // *what the viewer sees*, while its real settlement is still reachable via PUBLISHED
  // in the underlying row — two valid readings of one row, which is the same honesty
  // the source module documents. This model surfaces that nuance rather than hiding it.
};

/** Advance one step. Returns the same state if the event doesn't apply (never throws). */
export function transition(
  state: PickLifecycleState,
  event: PickLifecycleEvent,
  ctx: PickLifecycleContext,
): PickLifecycleState {
  const next = TABLE[state]?.[event]?.(ctx);
  return next ?? state;
}

/** Run the full mint-time gate sequence in the real, fixed order the code applies them. */
export function runMintTimeGates(ctx: PickLifecycleContext): PickLifecycleState {
  let state: PickLifecycleState = "MINTED";
  state = transition(state, "ADVERSE_EDGE_CHECK", ctx);
  if (state !== "MINTED") return state;
  state = transition(state, "MODEL_SIGNAL_CHECK", ctx);
  if (state !== "MINTED") return state;
  state = transition(state, "CONVICTION_CHECK", ctx);
  return state;
}

/** Serializable node/edge graph for docs or a future visualization — no runtime behavior. */
export function describeLifecycle(): {
  states: readonly PickLifecycleState[];
  edges: ReadonlyArray<{ from: PickLifecycleState; event: PickLifecycleEvent }>;
} {
  const states = Object.keys(TABLE) as PickLifecycleState[];
  const edges = states.flatMap((from) =>
    (Object.keys(TABLE[from] ?? {}) as PickLifecycleEvent[]).map((event) => ({ from, event })),
  );
  return { states: [
    "MINTED", "ADVERSE_VETOED", "MODEL_SIGNAL_SUPPRESSED", "CONVICTION_HELD",
    "PUBLISHED", "SETTLED_WIN", "SETTLED_LOSS", "SETTLED_PUSH", "VOIDED",
  ], edges };
}
