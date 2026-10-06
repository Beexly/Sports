/**
 * Arbiter ruling: the contract, the prompt, and a fail-closed parser.
 *
 * The arbiter is a Claude Opus-tier adjudicator asked ONE question: given two
 * measured, persisted claims about the same fixture, which claim should stand?
 * It does not re-score the game, does not fetch data, and is not allowed to
 * introduce a number that is not already in the two claims. Everything it is
 * given arrives in this file's prompt; everything it returns is validated here.
 *
 * THE CLOSED VERDICT SET. Three outcomes, and the third is load-bearing:
 *
 *   UPHOLD_REASONING  The reasoning path's claim survives.
 *   UPHOLD_LEGACY     The legacy path's claim survives.
 *   UNDECIDED         The evidence presented does not separate the two paths.
 *
 * UNDECIDED exists because an arbiter that must pick one of two sides will pick
 * one of two sides, and a forced choice between a calibrated estimator and a
 * measured-inverted one is a coin flip wearing a lab coat. A ruling that cannot
 * be graded is also a ruling whose own accuracy can never be measured, which is
 * the whole point of recording decisions. UNDECIDED is recorded, not dropped.
 *
 * FAIL CLOSED, THREE WAYS. A ruling is only accepted when ALL of these hold:
 *   1. the output parses as the exact object shape below,
 *   2. `winner` is one of the three literals, and `confidence` is a real
 *      probability in (0, 1) rather than a band label,
 *   3. every stat-shaped number in `reasoning` is present in the two claims.
 * Anything else is a REJECTED ruling, which is recorded with its rejection
 * reason. A rejected ruling never silently becomes UNDECIDED: the difference
 * between "the model declined" and "the model emitted garbage" is exactly what
 * you need in order to trust the acceptance rate.
 *
 * THE NUMERIC GUARD IS NOT OPTIONAL. `validateNumericClaims` is the repo's
 * existing anti-hallucination instrument (used by the content lane). A model
 * that cites "the market moved to 61.5%" when no such number was in its input
 * has invented a fact, and an arbiter that invents facts cannot be scored
 * against outcomes.
 *
 * MODEL TIER, NOT MODEL ID. The model id is resolved by the caller through
 * `resolveModelCatalog(env).opus`, the single auditable place that decides the
 * Opus tier, and it honors the `MODEL_OPUS` / `CLAUDE_MODEL_OPUS` env override.
 * That is deliberate: the tier map's law is that an Opus 5-class id is promoted
 * by env once the console id and cloud map are verified, never by hardcoding a
 * string into a new call site. When the owner sets `MODEL_OPUS` to the verified
 * Opus 5.5 id, this arbiter runs on it with no code change. No model id is
 * written into this file, so this file cannot be the thing that goes stale.
 */

import { validateNumericClaims } from "@/lib/claude-api/numeric-guard";
import {
  type Disagreement,
  type PathClaim,
} from "./disagreement";

/** The closed set of outcomes. Nothing outside it is ever stored as a ruling. */
export const ARBITER_VERDICTS = ["UPHOLD_REASONING", "UPHOLD_LEGACY", "UNDECIDED"] as const;

export type ArbiterVerdict = (typeof ARBITER_VERDICTS)[number];

export const SYSTEM_PROMPT = [
  "You are the adjudication layer of a sports prediction system.",
  "Two independent producers have written conflicting claims about one fixture.",
  "You are given both claims verbatim, with the measured bands each producer's",
  "confidence is known to fall in. You choose which claim should stand.",
  "",
  "Hard rules:",
  "1. Use ONLY the numbers supplied in the two claims. Never introduce a",
  "   statistic, a record, a percentage, or a line that is not in them. A",
  "   number you did not read is a fabrication and voids the ruling.",
  "2. Answer with one JSON object and nothing else. No prose before or after.",
  '3. The JSON keys are exactly: winner, confidence, reasoning.',
  "   winner is one of UPHOLD_REASONING, UPHOLD_LEGACY, UNDECIDED.",
  "   confidence is a decimal strictly between 0 and 1 expressing how strongly",
  "   you hold the ruling, not a pick grade and not a confidence band.",
  "   reasoning is one or two sentences naming the claim you relied on.",
  "4. If the two claims do not separate each other on the evidence supplied,",
  "   return UNDECIDED. Declining is a valid and useful answer.",
  "5. Never predict the result of the game. You are choosing between two",
  "   recorded claims, not forecasting an outcome.",
].join("\n");

/** A ruling that passed every check and is safe to persist and later score. */
export type ArbiterRuling = {
  readonly verdict: ArbiterVerdict;
  /** Probability the arbiter holds its own ruling, in (0, 1). */
  readonly confidence: number;
  readonly reasoning: string;
  /** True when the parser accepted this ruling without a repair. */
  readonly accepted: boolean;
};

export type RejectedRuling = {
  readonly verdict: null;
  readonly confidence: null;
  readonly reasoning: null;
  /** Why the output was refused. Recorded, never discarded. */
  readonly rejection: string;
};

export type RulingOutcome = ArbiterRuling | RejectedRuling;

export function isRejected(outcome: RulingOutcome): outcome is RejectedRuling {
  return outcome.verdict === null;
}

/**
 * Build the user turn. Both claims are rendered in full, with the band context
 * that makes the asymmetry legible, so the arbiter is not handed two bare
 * integers and left to assume they mean the same thing.
 *
 * The band lines are the reason the legacy claim is dangerous: its high
 * confidence bands are measured to hit LOWER than its low ones. A model shown
 * "legacy 95" with no band context will read it as near-certain.
 */
export function buildArbiterPrompt(disagreement: Disagreement): string {
  const describe = (claim: PathClaim, band: string) =>
    [
      `- producer: ${claim.path}`,
      `- pickId: ${claim.pickId}`,
      `- market: ${claim.pickType}`,
      `- selection: ${claim.selection}`,
      `- confidence: ${claim.confidence} (measured band: ${band})`,
      `- bookmakers behind it: ${claim.bookmakerCount}`,
      `- edgeIndex: ${claim.edgeScore ?? "none recorded"}`,
      `- grade: ${claim.pickGrade ?? "none recorded"}`,
      `- modelVersion: ${claim.modelVersion}`,
      `- model-signal row: ${claim.isModelSignal ? "yes" : "no"}`,
    ].join("\n");

  const question =
    disagreement.kind === "SIDE_CONFLICT"
      ? "The two claims name OPPOSITE sides of the same fixture. Which claim should stand?"
      : `The two claims name the SAME side but differ by ${disagreement.magnitude} confidence points. Which claim should stand?`;

  return [
    "FIXTURE CLAIMS UNDER ADJUDICATION",
    "",
    describe(disagreement.reasoning, reasoningBand(disagreement.reasoning.confidence)),
    "",
    describe(disagreement.legacy, legacyBand(disagreement.legacy.confidence)),
    "",
    "MEASURED BAND BEHAVIOUR (from settled history, not from this fixture):",
    `- reasoning path: ${BAND_TABLE.reasoning
      .map((r) => `${r.band} -> ${r.hitRate.toFixed(1)}%`)
      .join(", ")}. Rises with the band.`,
    `- legacy path: ${BAND_TABLE.legacy
      .map((r) => `${r.band} -> ${r.hitRate.toFixed(1)}%`)
      .join(", ")}. Its top bands are INVERTED, so a`,
    "  higher number there is weaker evidence, not stronger.",
    "",
    question,
    "",
    "Reply with the JSON object only.",
  ].join("\n");
}

/** The reasoning path's published bands, stated as the arbiter sees them. */
function reasoningBand(confidence: number): string {
  if (confidence >= 80) return "80-89, observed 67.8% hit rate";
  if (confidence >= 70) return "70-79, observed 66.0% hit rate";
  if (confidence >= 60) return "60-69, observed 57.0% hit rate";
  return "below 60, sparse";
}

/** The legacy path's published bands, which invert above 80. */
function legacyBand(confidence: number): string {
  if (confidence >= 90) return "90-99, observed 31.2% hit rate (INVERTED)";
  if (confidence >= 80) return "80-89, observed 41.5% hit rate (INVERTED)";
  if (confidence >= 70) return "70-79, observed 41.7% hit rate";
  return "below 70, thin";
}

/**
 * The measured band table, ONCE, as data.
 *
 * `buildArbiterPrompt` renders these into the prompt and `allowedNumbers`
 * licenses them for the numeric guard. They are declared in one place because a
 * table that appears twice drifts: if the prompt named a band the guard did not
 * license, the arbiter would be told to reason about the bands and then
 * REJECTED for citing one, which is a contradiction that would show up as an
 * inexplicable rejection rate rather than as a bug.
 *
 * `bandEdges` is the set of boundary integers the bands are written with
 * (60/69/70/79/80/89/90/99). The numeric guard reads a hyphenated range like
 * "60-69" as a RECORD, so citing a band in prose extracts those two integers and
 * both must be licensed or every band citation is rejected.
 */
export const BAND_TABLE = {
  reasoning: [
    { band: "60-69", hitRate: 57.0 },
    { band: "70-79", hitRate: 66.0 },
    { band: "80-89", hitRate: 67.8 },
  ],
  legacy: [
    { band: "70-79", hitRate: 41.7 },
    { band: "80-89", hitRate: 41.5 },
    { band: "90-99", hitRate: 31.2 },
  ],
} as const;

/** Every figure the prompt states, flattened for the numeric-guard allowlist. */
function bandNumbers(): number[] {
  const out: number[] = [];
  for (const row of [...BAND_TABLE.reasoning, ...BAND_TABLE.legacy]) {
    out.push(row.hitRate);
    for (const part of row.band.split("-")) {
      const n = Number(part);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}

/**
 * Every number the arbiter is permitted to echo: the claims' own fields plus
 * the band table the prompt itself supplied.
 *
 * Built from the claims, never from a hand-kept constant list, so a new field on
 * a claim is automatically licensable and nothing else ever is. The band figures
 * come from the same `BAND_TABLE` the prompt renders from, which is what makes
 * "the prompt said it" and "the guard licenses it" the same statement.
 */
function allowedNumbers(disagreement: Disagreement): number[] {
  const out: number[] = bandNumbers();
  for (const claim of [disagreement.reasoning, disagreement.legacy]) {
    out.push(claim.confidence, claim.bookmakerCount);
    if (claim.edgeScore !== null) out.push(claim.edgeScore);
  }
  out.push(disagreement.magnitude);
  return out;
}

/**
 * Parse and validate one model output. Pure, total, and never throws: a
 * malformed output is a REJECTED ruling carrying the reason, because "the model
 * returned junk" is a fact about the arbiter worth storing.
 */
export function parseRuling(text: string, disagreement: Disagreement): RulingOutcome {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { verdict: null, confidence: null, reasoning: null, rejection: "EMPTY_OUTPUT" };
  }

  // Tolerate a fenced block or a sentence wrapped around the object, but never
  // accept a second JSON object: the first one is what the model committed to.
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return { verdict: null, confidence: null, reasoning: null, rejection: "NO_JSON_OBJECT" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return { verdict: null, confidence: null, reasoning: null, rejection: "UNPARSEABLE_JSON" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { verdict: null, confidence: null, reasoning: null, rejection: "NOT_AN_OBJECT" };
  }

  const record = parsed as Record<string, unknown>;
  const winner = record["winner"];
  const confidence = record["confidence"];
  const reasoning = record["reasoning"];

  if (typeof winner !== "string" || !isArbiterVerdict(winner)) {
    return {
      verdict: null,
      confidence: null,
      reasoning: null,
      rejection: `UNKNOWN_VERDICT:${String(winner).slice(0, 40)}`,
    };
  }
  if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    return {
      verdict: null,
      confidence: null,
      reasoning: null,
      rejection: "CONFIDENCE_NOT_A_PROBABILITY",
    };
  }
  if (typeof reasoning !== "string" || reasoning.trim().length === 0) {
    return { verdict: null, confidence: null, reasoning: null, rejection: "MISSING_REASONING" };
  }

  // The fabricated-statistic check. Runs on the reasoning text, which is the
  // only free-form field; the other two are enum and number, already validated.
  const numeric = validateNumericClaims(reasoning, { allowed: allowedNumbers(disagreement) });
  if (!numeric.grounded) {
    const ungrounded = numeric.ungrounded.map((c) => c.raw).join(", ");
    return {
      verdict: null,
      confidence: null,
      reasoning: null,
      rejection: `UNGROUNDED_NUMBERS:${ungrounded.slice(0, 80)}`,
    };
  }

  return {
    verdict: winner,
    confidence,
    reasoning: reasoning.trim(),
    accepted: true,
  };
}

export function isArbiterVerdict(value: string): value is ArbiterVerdict {
  return (ARBITER_VERDICTS as readonly string[]).includes(value);
}
