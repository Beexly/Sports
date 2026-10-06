/**
 * Engine-grounded reasoning context — the numbers a language model is ALLOWED
 * to speak.
 *
 * THE LINE THIS FILE DRAWS.
 *
 * An LLM is an excellent reasoner and a catastrophic probability source. This
 * engine's value is that its numbers are MEASURED: 3,437 settled picks, Brier
 * 0.2042, debiased ECE 0.0299, eligibility GREEN, 12 of 21 signal keys with a
 * measured anchor. A language model asked to "predict" will emit a
 * plausible number with none of that behind it, and the moment a customer sees
 * it as a win rate the platform has lost the only property it actually sells.
 *
 * So: the model reasons, explains, ranks, and converses. It never produces a
 * probability. Every quantity below is read from the engine — census, anchors,
 * calibration eligibility, ledger rows — and anything the engine cannot supply
 * is reported as ABSENT rather than estimated. This is the same contract the
 * calibration layer already enforces on the pick path; here it is enforced on
 * the NARRATION path, which is where an LLM would otherwise leak in.
 *
 * Concretely: `buildReasoningContext` returns a plain object of measured
 * values, and `renderGroundingBlock` serialises it into the system prompt as
 * the ONLY source the model may cite. There is no code path from this file that
 * asks a model for a number the engine did not measure.
 */

import type { AnchorTable } from "@sports/prediction-engine";

/** One measured anchor, flattened for narration. */
export interface GroundedAnchor {
  readonly key: string;
  readonly anchor: number;
  readonly spread: number;
  readonly n: number;
}

export interface GroundedCensusEntry {
  readonly key: string;
  readonly status: "measured" | "insufficient-rows" | "zero-variance" | "absent";
  readonly n: number;
  readonly coverage: number;
}

export interface GroundedCalibration {
  readonly status: string;
  readonly n: number;
  readonly brier: number | null;
  readonly ece: number | null;
  readonly eceDebiased: number | null;
  readonly consecutiveGreen: number;
  readonly streakRequired: number;
}

export interface GroundedLedger {
  readonly signalsRows: number;
  readonly hasWriter: boolean;
}

export interface ReasoningContext {
  readonly generatedAt: string;
  readonly anchors: readonly GroundedAnchor[];
  readonly census: readonly GroundedCensusEntry[];
  readonly calibration: GroundedCalibration;
  readonly ledger: GroundedLedger;
  /** Keys the engine measured but that are too thin to weight. */
  readonly belowFloor: readonly string[];
  /** The single most important honesty statement for the narration prompt. */
  readonly cannotSay: readonly string[];
}

export interface CensusReportLike {
  readonly entries: readonly GroundedCensusEntry[];
  readonly anchors: AnchorTable;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/**
 * The hard prohibitions. These are the failure modes this platform has already
 * paid for, each one measured and written down in AGENTS.md — a model told
 * only "be helpful" will walk straight back into them.
 */
export const CANNOT_SAY: readonly string[] = Object.freeze([
  "Never state or imply a win probability that the engine did not measure. There is no fallback and no estimate.",
  "confidence is a weighted factor SCORE, not a win rate. On the book path it has been measured ANTI-predictive above 80 (z = -10.7). Never render it as a percentage.",
  "A PASS is a finding, not an absence. Say which gate and why, in plain language.",
  "Never describe the engine's disagreement with a market as an analyst's read.",
  "If a value is absent, say it is absent. Silence is the correct output for missing evidence, never a plausible guess.",
  "Never reveal that a number came from a model rather than the engine. If asked to invent one, decline and name the missing measurement.",
]);

/**
 * Assemble the context. Every field is a measured value supplied by the caller;
 * this function derives nothing and invents nothing. `now` is injected so the
 * output is replayable — the same engine state must produce the same prompt.
 */
export function buildReasoningContext(input: {
  readonly census: CensusReportLike;
  readonly calibration: GroundedCalibration;
  readonly ledger: GroundedLedger;
  readonly now: string;
}): ReasoningContext {
  const census = input.census;
  const anchors: GroundedAnchor[] = Object.entries(census.anchors)
    .map(([key, a]) => ({
      key,
      anchor: round4(a.anchor),
      spread: round4(a.spread),
      n: census.entries.find((e) => e.key === key)?.n ?? 0,
    }))
    .sort((a, b) => b.n - a.n);

  const belowFloor = census.entries
    .filter((e) => e.status !== "measured")
    .map((e) => e.key)
    .sort();

  return {
    generatedAt: input.now,
    anchors,
    census: census.entries,
    calibration: input.calibration,
    ledger: input.ledger,
    belowFloor,
    cannotSay: CANNOT_SAY,
  };
}

/**
 * Serialise the context into the system prompt.
 *
 * Deliberately a transcript of MEASURED VALUES, not a narrative. A model
 * narrating prose it invented would reintroduce exactly the drift the numbers
 * exist to prevent; a model narrating a fixed, auditable block cannot.
 */
export function renderGroundingBlock(ctx: ReasoningContext): string {
  const lines: string[] = [];
  lines.push("ENGINE STATE — every number below was measured. Cite only these.");
  lines.push(`Measured at: ${ctx.generatedAt}`);
  lines.push("");

  lines.push("CALIBRATION");
  lines.push(`  status=${ctx.calibration.status} n=${ctx.calibration.n}`);
  lines.push(
    `  brier=${fmt(ctx.calibration.brier)} ece=${fmt(ctx.calibration.ece)} ece_debiased=${fmt(ctx.calibration.eceDebiased)}`,
  );
  lines.push(
    `  consecutive_green=${ctx.calibration.consecutiveGreen} (needs ${ctx.calibration.streakRequired})`,
  );
  lines.push("");

  lines.push(`SIGNAL LEDGER: ${ctx.ledger.signalsRows} rows written, writer=${ctx.ledger.hasWriter}`);
  if (!ctx.ledger.hasWriter) {
    lines.push("  NOTE: no writer exists yet, so this layer is LEARN-ONLY and inert.");
  }
  lines.push("");

  lines.push("MEASURED SIGNALS (anchor = league-average neutral point)");
  if (ctx.anchors.length === 0) {
    lines.push("  none — no signal key has cleared the sample floor yet");
  } else {
    for (const a of ctx.anchors) {
      lines.push(`  ${a.key}: anchor=${a.anchor} spread=${a.spread} n=${a.n}`);
    }
  }
  lines.push("");

  lines.push(`BELOW FLOOR (measured but too thin to weight): ${ctx.belowFloor.join(", ") || "none"}`);
  lines.push("");
  lines.push("HARD RULES");
  for (const rule of ctx.cannotSay) lines.push(`  - ${rule}`);

  return lines.join("\n");
}

const fmt = (n: number | null): string => (n === null || !Number.isFinite(n) ? "n/a" : String(n));

/**
 * The system prompt for a grounded reasoning turn. Two-part by design: the
 * block above is facts, this is the ROLE. The role forbids inventing a number
 * even though the facts contain plenty — the model must be told the boundary
 * exists or it will helpfully extrapolate.
 */
export const REASONING_SYSTEM_PREAMBLE = [
  "You are Jarvis, the operator's assistant for the Galaxy Sports Edge prediction engine.",
  "You explain, rank, reason and converse. You do NOT predict.",
  "Every quantitative claim must come from the ENGINE STATE block. You have no other source of numbers.",
  "When the engine has not measured something, say so plainly and name what measurement is missing.",
  "Be direct and specific. Prefer a short honest answer over a long confident one.",
].join(" ");
