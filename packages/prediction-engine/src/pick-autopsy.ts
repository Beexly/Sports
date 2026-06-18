/**
 * Pick-autopsy taxonomy v1 — the structured, both-sides, computable autopsy of
 * WHY a settled pick turned out the way it did (win-rate loop step 11).
 *
 * WHAT THIS IS
 * A pure classifier that maps a settled pick's stored facts (result, CLV verdict,
 * line movement, freshness) onto the 16-class taxonomy in
 * reports/reality-engine/pick-autopsy-taxonomy-v1.md, and returns one of the ~10
 * classes that are COMPUTABLE TODAY from data already on the Pick row. It is the
 * complement of the narrative LossAutopsy: both-sides, machine-classified, and
 * learning-facing (it tells the model what to reinforce vs down-weight).
 *
 * THE CORE PRINCIPLE — RESULT IS NOT THE VERDICT
 * A win is not automatically good and a loss is not automatically bad. A pick that
 * beat the close and lost to a buzzer-beater was a GOOD LOSS — the process was
 * right; preserve the edge. A pick that lost CLV, contradicted our number, and won
 * anyway was a BAD WIN — flag it, do not reward the process. Classifying on result
 * alone is how a tout fools itself; CLV + line movement + freshness separate
 * process from luck.
 *
 * WHY IT IS INERT
 * This module does not score, gate, or price anything and is NOT imported by
 * scoring.ts or any live path. It is a settlement-time labeler, ready to wire the
 * day OUTCOME_LEARNING_ENABLED is flipped and the sample matures.
 *
 * HONESTY GUARDS (mirroring conviction-tier.ts)
 * - The six classes needing signals we lack (bad-expression, wrong-causal-assumption,
 *   injury-exit-variance, no-bet-gate-saved/cost) are UNREACHABLE by design — this
 *   function can never return them — so we never guess a label we cannot compute.
 * - Missing/invalid/unsettled inputs collapse to `insufficient-data`, the honest
 *   catch-all. We never force a label onto evidence that cannot support one.
 *
 * Pure functions, no I/O — fully unit-testable.
 */

import type { ClvVerdict } from "./clv.js";

/** Settled pick result. VOID/PENDING are not classifiable → insufficient-data. */
export type PickResult = "WIN" | "LOSS" | "PUSH" | "VOID" | "PENDING";

/** The 16 v1 autopsy classes (the full taxonomy; only the computable-now subset is reachable). */
export type AutopsyClass =
  // Result × CLV matrix (computable now)
  | "good-win"
  | "bad-win"
  | "good-loss"
  | "bad-loss"
  | "CLV-win/result-loss"
  | "CLV-loss/result-win"
  // Line-movement / freshness derived (computable now)
  | "market-already-corrected"
  | "bad-price"
  | "stale-data"
  // Variance term (computable now)
  | "volatility-ignored"
  // Honest catch-all (computable now)
  | "insufficient-data"
  // Needs-more-signal classes — UNREACHABLE by design in this v1 classifier
  | "bad-expression"
  | "wrong-causal-assumption"
  | "injury-exit-variance"
  | "no-bet-gate-saved-us"
  | "no-bet-gate-cost-us";

/** Whether an autopsy class is computable today (`C`) or needs more signal (`S`). */
export type AutopsyComputability = "computable-now" | "needs-more-signal";

/** Registry entry: definition + computability + how it updates learning. */
export interface AutopsyClassSpec {
  readonly cls: AutopsyClass;
  readonly definition: string;
  readonly computability: AutopsyComputability;
  /** The learning update this class implies (the rule that protects the model). */
  readonly learningUpdate: string;
}

/** The classes this v1 classifier can actually RETURN (the 10 computable-now classes + variance term). */
export const COMPUTABLE_NOW_CLASSES: readonly AutopsyClass[] = [
  "good-win",
  "bad-win",
  "good-loss",
  "bad-loss",
  "CLV-win/result-loss",
  "CLV-loss/result-win",
  "market-already-corrected",
  "bad-price",
  "stale-data",
  "volatility-ignored",
  "insufficient-data",
];

/** The classes that are UNREACHABLE by design here — they need signals we lack. */
export const NEEDS_MORE_SIGNAL_CLASSES: readonly AutopsyClass[] = [
  "bad-expression",
  "wrong-causal-assumption",
  "injury-exit-variance",
  "no-bet-gate-saved-us",
  "no-bet-gate-cost-us",
];

/** The full 16-class registry, in the taxonomy doc's order. */
export const AUTOPSY_CLASSES: readonly AutopsyClassSpec[] = [
  { cls: "good-win", definition: "Won AND beat the close.", computability: "computable-now", learningUpdate: "Reinforce the edge type; the gold case." },
  { cls: "bad-win", definition: "Won but lost to the close — got lucky.", computability: "computable-now", learningUpdate: "Do NOT reward the model; flag as result-flattered." },
  { cls: "good-loss", definition: "Lost but beat the close — right process, variance bit.", computability: "computable-now", learningUpdate: "Preserve the edge type; do not punish." },
  { cls: "bad-loss", definition: "Lost AND lost to the close — wrong on both counts.", computability: "computable-now", learningUpdate: "Down-weight the edge type / inputs." },
  { cls: "CLV-win/result-loss", definition: "Beat the close, lost the game.", computability: "computable-now", learningUpdate: "Reinforce process; tally toward the CLV→win-rate lag thesis." },
  { cls: "CLV-loss/result-win", definition: "Lost the close, won the game.", computability: "computable-now", learningUpdate: "Treat as luck; do not reinforce." },
  { cls: "market-already-corrected", definition: "The edge had vanished by the close — line moved to/past our number.", computability: "computable-now", learningUpdate: "The read may have been right but late; act earlier, do not distrust the signal." },
  { cls: "bad-price", definition: "Right side, wrong number — locked a price worse than we should have.", computability: "computable-now", learningUpdate: "Execution lesson, not a model lesson; tighten timing/price discipline." },
  { cls: "bad-expression", definition: "Right thesis, wrong market to express it.", computability: "needs-more-signal", learningUpdate: "Don't punish the thesis; learn market selection. Needs the correlated-market outcome." },
  { cls: "stale-data", definition: "Acted on data already out of date at lock time.", computability: "computable-now", learningUpdate: "Down-weight; a pipeline failure, not a model failure." },
  { cls: "wrong-causal-assumption", definition: "The model's reason was wrong even if the number was close.", computability: "needs-more-signal", learningUpdate: "Down-weight that edge type's causal premise. Needs the edge-type tag." },
  { cls: "injury-exit-variance", definition: "A key player got hurt/ejected mid-game — unpriceable event.", computability: "needs-more-signal", learningUpdate: "Exclude from edge-quality scoring (irreducible). Needs an event feed." },
  { cls: "volatility-ignored", definition: "Result fell inside known model variance we under-weighted.", computability: "computable-now", learningUpdate: "Recalibrate uncertainty, not the central estimate. (Variance term is computable.)" },
  { cls: "no-bet-gate-saved-us", definition: "A market we declined went on to be a clear loser.", computability: "needs-more-signal", learningUpdate: "Credit the gate. Needs the No-Bet Ledger." },
  { cls: "no-bet-gate-cost-us", definition: "A market we declined went on to win clearly.", computability: "needs-more-signal", learningUpdate: "Evidence to loosen the threshold. Needs the No-Bet Ledger." },
  { cls: "insufficient-data", definition: "Too little evidence to classify honestly.", computability: "computable-now", learningUpdate: "Exclude from learning; never force a label." },
];

/** Look up a class spec. */
export function getAutopsyClassSpec(cls: AutopsyClass): AutopsyClassSpec | undefined {
  return AUTOPSY_CLASSES.find((s) => s.cls === cls);
}

/** Settled-pick facts we HAVE on the Pick row — the inputs to classification. */
export interface AutopsyInput {
  /** Final result. Only WIN/LOSS are classifiable into the matrix; PUSH/VOID/PENDING → insufficient-data. */
  readonly result: PickResult;
  /**
   * CLV verdict vs the close (clv-capture.ts). null when no close was captured →
   * insufficient-data. This is the leading indicator that separates process from luck.
   */
  readonly clvVerdict?: ClvVerdict | null;
  /** Signed CLV value (probability/line points beaten); optional, used only as detail. */
  readonly clvValue?: number | null;
  /**
   * Line movement context, all derived from the stored Odds history. Optional;
   * present values sharpen the line-movement-derived classes.
   */
  readonly lineMovement?: AutopsyLineMovement;
  /** The pick's published 0–100 confidence (context only; never the verdict). */
  readonly confidence?: number | null;
  /**
   * Data-freshness facts at lock time. If `stale` is true, the pick was acted on
   * with out-of-date data → stale-data (a pipeline failure, not a model failure).
   */
  readonly freshness?: AutopsyFreshness;
}

export interface AutopsyLineMovement {
  /**
   * True when the close had moved to (or past) our locked number before kickoff —
   * the edge we saw had vanished by the close (market-already-corrected).
   */
  readonly closeReachedOurNumber?: boolean | null;
  /**
   * True when we locked a price worse than the opener offered (right side, wrong
   * number) — the execution signal behind bad-price.
   */
  readonly lockedWorseThanOpener?: boolean | null;
}

export interface AutopsyFreshness {
  /** True when a stale-data gate flagged the lock-time snapshot as out of date. */
  readonly stale?: boolean | null;
  /** Optional 0–100 data-quality score; low values corroborate a stale read. */
  readonly dataQualityScore?: number | null;
}

export interface AutopsyResult {
  /** The classified class — always one of COMPUTABLE_NOW_CLASSES; never a needs-more-signal class. */
  readonly cls: AutopsyClass;
  /** Whether this class is computable now (always true here) — kept for symmetry with the registry. */
  readonly computability: AutopsyComputability;
  /** The learning update this class implies (process, not scoreboard). */
  readonly learningUpdate: string;
  /** Plain-language, auditable reason for the classification. */
  readonly reason: string;
}

function beat(v: ClvVerdict): boolean {
  return v === "BEAT_CLOSE";
}
function lost(v: ClvVerdict): boolean {
  return v === "LOST_TO_CLOSE";
}

function build(cls: AutopsyClass, reason: string): AutopsyResult {
  const spec = getAutopsyClassSpec(cls);
  return {
    cls,
    computability: spec?.computability ?? "computable-now",
    learningUpdate: spec?.learningUpdate ?? "",
    reason,
  };
}

/**
 * Classify a settled pick into one of the computable-now autopsy classes from the
 * facts we have. Encodes the "process not scoreboard" rule: a good-loss that beat
 * the close preserves the edge; a bad-win that lost the close is flagged. The six
 * classes needing signals we lack are UNREACHABLE — anything we cannot compute
 * collapses to `insufficient-data` rather than being guessed.
 */
export function classifyAutopsy(input: AutopsyInput): AutopsyResult {
  // Freshness first: a stale-data read is a pipeline failure that overrides the
  // result×CLV reading (we cannot trust the process when the inputs were stale).
  if (input.freshness?.stale === true) {
    return build(
      "stale-data",
      "Bet-time snapshot was flagged stale — acted on out-of-date data; pipeline failure, not a model failure.",
    );
  }

  // Unsettled / non-decisive results cannot enter the matrix.
  if (input.result === "PENDING" || input.result === "VOID" || input.result === "PUSH") {
    return build(
      "insufficient-data",
      `Result is ${input.result} — not a decisive win/loss; excluded from learning rather than forced into a class.`,
    );
  }

  const verdict = input.clvVerdict;
  // No captured close → the process/luck cut is impossible; never guess.
  if (verdict === null || verdict === undefined) {
    return build(
      "insufficient-data",
      "No closing-line verdict captured — cannot separate process from luck; classifying as insufficient-data.",
    );
  }

  const won = input.result === "WIN";
  const lostGame = input.result === "LOSS";

  // ── The result × CLV matrix: the heart of "process vs luck" ──
  if (won && beat(verdict)) {
    return build(
      "good-win",
      "Won AND beat the close — process and outcome agreed. The gold case.",
    );
  }
  if (lostGame && beat(verdict)) {
    // Good-loss: right process, variance bit. The CLV-win/result-loss class
    // sharpens this same cut; we use the explicit CLV-leading-indicator label.
    return build(
      "CLV-win/result-loss",
      "Beat the close but lost the game — right process, variance bit. Preserve the edge; tally toward the CLV→win-rate lag thesis.",
    );
  }
  if (won && lost(verdict)) {
    // Bad-win: lost CLV, won anyway. CLV-loss/result-win sharpens this; we flag it.
    return build(
      "CLV-loss/result-win",
      "Won the game but lost the close — result-flattered luck. Do NOT reward the model; watch for regression.",
    );
  }
  if (lostGame && lost(verdict)) {
    // Wrong on both counts. Distinguish an execution miss (bad-price) and a
    // too-late read (market-already-corrected) from a genuine bad-loss.
    if (input.lineMovement?.closeReachedOurNumber === true) {
      return build(
        "market-already-corrected",
        "Lost and lost the close, but the close had reached our number — the read was right but late. Act earlier; do not distrust the signal.",
      );
    }
    if (input.lineMovement?.lockedWorseThanOpener === true) {
      return build(
        "bad-price",
        "Lost and lost the close, having locked a worse price than the opener offered — right side, wrong number. Execution lesson, not a model lesson.",
      );
    }
    return build(
      "bad-loss",
      "Lost AND lost to the close — wrong on both counts. The clearest 'we were wrong'; down-weight the inputs.",
    );
  }

  // MATCHED_CLOSE (or any residual): the close confirmed our number. A win here
  // is not edge-bearing; a loss is within expected noise. Honest fallthrough.
  if (verdict === "MATCHED_CLOSE") {
    if (won) {
      return build(
        "good-win",
        "Won with a matched close — the market confirmed our number; a clean, on-process win.",
      );
    }
    return build(
      "volatility-ignored",
      "Lost with a matched close — the result fell inside expected variance the model under-weighted. Recalibrate uncertainty, not the central estimate.",
    );
  }

  // Defensive honest default — should be unreachable, but never guess.
  return build(
    "insufficient-data",
    "Inputs did not resolve to a computable class — classifying as insufficient-data rather than forcing a label.",
  );
}
