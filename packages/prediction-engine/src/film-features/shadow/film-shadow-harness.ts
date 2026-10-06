/**
 * Shadow scoring harness: the engine runs TWICE per slate.
 *
 *   control   — the engine on today's inputs (what ships).
 *   treatment — the engine on film-augmented inputs (what film suggests).
 *
 * Both probabilities are logged to the shadow ledger along with the
 * film prior, the weight (literal 0), the realized outcome once graded,
 * and the would-be delta at w=1 (the research signal the calibrate step
 * will fit on). The published output is ALWAYS the control arm.
 *
 * This is the research→wire step of Garrett's loop. Weight, calibrate,
 * test, and polish are later streams — this harness must not perform
 * them.
 *
 * Ledger rows mirror db/schema/watch-shadow-ledger.sql (branch-only).
 *
 * Original implementation for GSE.
 */

import { blendProbability } from "../film-priors.js";

export type ShadowLane = "props" | "fantasy" | "picks";

/** One scored subject on a slate (player-prop, fantasy player, team). */
export interface ShadowSlateInput<TInput> {
  readonly slateId: string;
  readonly lane: ShadowLane;
  /** playerId or team abbrev. */
  readonly subjectId: string;
  /** e.g. "receiving_yards_over", "anytime_td", "spread_home". */
  readonly market: string;
  readonly line: number | null;
  readonly controlInputs: TInput;
  readonly treatmentInputs: TInput;
  /**
   * The REAL engine probability function — e.g. (r) =>
   * anytimeTdProbability({...ctx, rolling: r}).probability.
   * The harness calls it twice: once per arm.
   */
  readonly runEngine: (inputs: TInput) => number;
  /** Film-derived prior for this market, if the adapter produced one. */
  readonly filmPrior: number | null;
  /**
   * Realized outcome once graded: 1/0 for binary markets, or the
   * realized stat value. Null until the slate is graded.
   */
  readonly actual?: number | null;
}

/** One shadow ledger row (mirrors watch-shadow-ledger.sql). */
export interface ShadowSlateRow {
  readonly slateId: string;
  readonly lane: ShadowLane;
  readonly subjectId: string;
  readonly market: string;
  readonly line: number | null;
  readonly controlProb: number;
  readonly treatmentProb: number;
  readonly filmPrior: number | null;
  /** Literal 0 until validated. */
  readonly weight: 0;
  /** Published probability — ALWAYS the control arm at w=0. */
  readonly blendedProb: number;
  /** blended − control. 0 at w=0 by construction; logged anyway. */
  readonly delta: number;
  /**
   * What the delta WOULD be at w=1 (treatment − control). The research
   * signal: persistent non-zero would-be deltas that agree with actuals
   * are what the calibrate step fits on.
   */
  readonly wouldBeDeltaW1: number;
  readonly actual: number | null;
  /** 1 when graded and the control arm called it right, else 0/null. */
  readonly controlCorrect: number | null;
  readonly calibration: "UNCALIBRATED";
  readonly createdAt: string;
}

/**
 * Score one subject through both arms and log the shadow row.
 * runEngine is invoked exactly twice (control, treatment).
 */
export function runShadowPair<TInput>(
  input: ShadowSlateInput<TInput>,
): ShadowSlateRow {
  const controlProb = input.runEngine(input.controlInputs);
  const treatmentProb = input.runEngine(input.treatmentInputs);

  if (
    !Number.isFinite(controlProb) ||
    !Number.isFinite(treatmentProb)
  ) {
    throw new Error(
      `runShadowPair: engine returned non-finite probability for ${input.subjectId}/${input.market}`,
    );
  }

  const blendedProb = blendProbability(
    controlProb,
    input.filmPrior ?? controlProb,
    0,
  );
  const actual = input.actual ?? null;
  const controlCorrect =
    actual == null ? null : (controlProb >= 0.5 ? 1 : 0) === actual ? 1 : 0;

  return {
    slateId: input.slateId,
    lane: input.lane,
    subjectId: input.subjectId,
    market: input.market,
    line: input.line,
    controlProb: Math.round(controlProb * 10000) / 10000,
    treatmentProb: Math.round(treatmentProb * 10000) / 10000,
    filmPrior: input.filmPrior,
    weight: 0,
    blendedProb: Math.round(blendedProb * 10000) / 10000,
    delta: Math.round((blendedProb - controlProb) * 10000) / 10000,
    wouldBeDeltaW1:
      Math.round((treatmentProb - controlProb) * 10000) / 10000,
    actual,
    controlCorrect,
    calibration: "UNCALIBRATED",
    createdAt: new Date().toISOString(),
  };
}

/** Score a full slate of subjects; returns one row per subject. */
export function runShadowSlate<TInput>(
  inputs: readonly ShadowSlateInput<TInput>[],
): ShadowSlateRow[] {
  return inputs.map(runShadowPair);
}

/**
 * Aggregate a slate of graded rows: does the film arm add anything?
 * MEANINGLESS until n is large and film is real — this is scaffolding
 * for the calibrate step, not a verdict.
 */
export interface ShadowSlateSummary {
  readonly slateId: string;
  readonly n: number;
  readonly nGraded: number;
  readonly meanAbsWouldBeDeltaW1: number | null;
  readonly controlAccuracy: number | null;
  /** Share of graded rows where the treatment arm agreed with actuals
   *  while control disagreed — the "film would have helped" rate. */
  readonly filmWouldHaveHelped: number | null;
}

export function summarizeShadowSlate(
  slateId: string,
  rows: readonly ShadowSlateRow[],
): ShadowSlateSummary {
  const graded = rows.filter((r) => r.actual != null);
  const absDeltas = rows.map((r) => Math.abs(r.wouldBeDeltaW1));
  const helped = graded.filter((r) => {
    const treatmentCall = r.treatmentProb >= 0.5 ? 1 : 0;
    const controlCall = r.controlProb >= 0.5 ? 1 : 0;
    return treatmentCall === r.actual && controlCall !== r.actual;
  }).length;
  const correct = graded.filter((r) => r.controlCorrect === 1).length;

  return {
    slateId,
    n: rows.length,
    nGraded: graded.length,
    meanAbsWouldBeDeltaW1:
      absDeltas.length > 0
        ? Math.round(
            (absDeltas.reduce((a, b) => a + b, 0) / absDeltas.length) * 10000,
          ) / 10000
        : null,
    controlAccuracy:
      graded.length > 0
        ? Math.round((correct / graded.length) * 10000) / 10000
        : null,
    filmWouldHaveHelped:
      graded.length > 0
        ? Math.round((helped / graded.length) * 10000) / 10000
        : null,
  };
}
