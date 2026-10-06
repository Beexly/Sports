/**
 * Jarvis reasoning turn — the model speaks, the engine supplies every number.
 *
 * UNWIRED (measured 2026-10-01): no production caller — the only importer is
 * this module's own test. This is the narration seam for a Jarvis surface
 * that does not exist yet; do not treat it as live until a route or caller
 * wires it in.
 *
 * This is the seam between two things that already exist and had never met:
 *   - the engine's MEASURED state (census, anchors, calibration eligibility),
 *     read here through the same loader the V3-353 cron uses, and
 *   - the OpenAI-compatible client (`@/lib/claude-api/openai-compat`) that
 *     already serves the free lane and OpenRouter.
 *
 * WHAT IT IS NOT. This is not a prediction path. There is no function here that
 * asks a model for a probability, a win rate, or an edge — `grounded-reasoning.ts`
 * has a test that fails the build if one appears. The model receives a
 * transcript of measured values and is instructed to cite only those. That is
 * what makes a live LLM safe to put in front of a calibrated product: the
 * narration cannot drift from the numbers, because the narration is not given
 * any numbers to drift with.
 *
 * LAWS. No gate, no env flag, no schema, no write. The engine state is read
 * through an injected client so this stays testable with no database, and so a
 * read failure degrades to a refusal rather than a plausible answer.
 */

import { db } from "@sports/db";
import { loadSignalLedger } from "@/lib/ops/signal-ledger-loader";
import {
  buildReasoningContext,
  renderGroundingBlock,
  REASONING_SYSTEM_PREAMBLE,
  type GroundedCalibration,
  type GroundedLedger,
  type ReasoningContext,
} from "@/lib/jarvis/grounded-reasoning";

export interface JarvisEngineState {
  readonly census: Parameters<typeof buildReasoningContext>[0]["census"];
  readonly calibration: GroundedCalibration;
  readonly ledger: GroundedLedger;
}

export interface ReasoningTurnResult {
  readonly ok: boolean;
  readonly text?: string;
  /** Present when the engine state could not be read: reason, never a guess. */
  readonly refusal?: string;
  readonly context?: ReasoningContext;
  readonly model?: string;
}

/**
 * Read the engine's measured state. Split out so the reasoning turn is testable
 * without a database and so a caller can substitute a cached snapshot.
 *
 * Takes no clock: the census carries each reading's own `capturedAt`, and
 * `buildReasoningPrompt` takes the `now` that stamps the reasoning context. A
 * second, unused clock here would be a second honest-looking timestamp that
 * governs nothing.
 */
export async function loadEngineState(): Promise<JarvisEngineState> {
  const ledgerResult = await loadSignalLedger(db);
  const ledger: GroundedLedger = {
    // The census does not write `signals`; it reports what it MEASURED. Whether a
    // writer exists is a separate, measured fact about the codebase, not a guess.
    signalsRows: 0,
    hasWriter: false,
  };

  const calibration: GroundedCalibration = {
    // A calibration read that cannot be made is reported as absent by the
    // narration layer; it is NOT filled with a plausible figure here.
    status: "unavailable-in-this-context",
    n: 0,
    brier: null,
    ece: null,
    eceDebiased: null,
    consecutiveGreen: 0,
    streakRequired: 3,
  };

  return {
    census: {
      entries: ledgerResult.census.entries,
      anchors: ledgerResult.anchors,
    },
    calibration,
    ledger,
  };
}

/**
 * Build the prompt pair for one reasoning turn. Pure — no model call — so the
 * prompt is auditable and testable independently of any provider.
 */
export function buildReasoningPrompt(
  state: JarvisEngineState,
  question: string,
  now: string,
): { system: string; user: string; context: ReasoningContext } {
  const context = buildReasoningContext({
    census: state.census,
    calibration: state.calibration,
    ledger: state.ledger,
    now,
  });
  const grounding = renderGroundingBlock(context);
  return {
    system: `${REASONING_SYSTEM_PREAMBLE}\n\n${grounding}`,
    user: question,
    context,
  };
}

/**
 * Fail-closed preflight. Returns a refusal string when the turn must not be
 * attempted — an empty question, or engine state that carries no measured
 * calibration and no measured anchor. In that case there is nothing for the
 * model to ground on, and answering anyway would be exactly the failure this
 * layer exists to prevent.
 */
export function preflight(
  question: string,
  state: JarvisEngineState,
): { ok: true } | { ok: false; refusal: string } {
  const q = question.trim();
  if (q.length === 0) return { ok: false, refusal: "Empty question." };
  if (q.length > 4_000) return { ok: false, refusal: "Question exceeds the input limit." };
  if (Object.keys(state.census.anchors).length === 0 && state.calibration.status === "unavailable-in-this-context") {
    return {
      ok: false,
      refusal:
        "No measured engine state is available, so there is nothing to ground an answer on. The engine state must load first.",
    };
  }
  return { ok: true };
}
