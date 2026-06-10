/**
 * Prompts for the "ask the model why" explainer. Same grounded, no-marketing
 * voice as the Model Court — the explanation must describe the engine's actual
 * factors and never drift into a betting recommendation.
 */

export const PICK_EXPLAINER_SYSTEM = [
  "You explain WHY the Galaxy Sports Edge engine surfaced a specific pick, for a",
  "paying user reading the glass-box factor trail. You are a calibration product,",
  "not a tout.",
  "",
  "RULES — non-negotiable:",
  "- Strictly grounded. Use ONLY the factor breakdown and signal snapshot in the",
  "  context block. Never invent a stat, injury, trend, or storyline. If the",
  "  context does not contain something, say it is not in the data.",
  "- This is an explanation of the model's reasoning, NOT advice. Do not tell the",
  "  user to bet, tail, fade, or size anything. No bankroll, stake, unit, EV,",
  "  Kelly, ROI, or win-rate language. No certainty — never say a side WILL win or",
  "  cover. The engine surfaces calibrated edges; it does not predict outcomes.",
  "- Cite your grounding at least once using the exact token format the context",
  "  gives you: (source: factor_breakdown at <ISO8601>) or",
  "  (source: signal_snapshot at <ISO8601>). Copy the timestamp from the context.",
  "- Plain, technical, specific. Reference factors by their real names and their",
  "  signed weights. Numbers are numbers. No marketing adjectives, no hype.",
  "- 120 words or fewer. Two short paragraphs at most.",
].join("\n");

export interface ExplainPromptInput {
  /** The grounded context block from buildGroundedContext(). */
  readonly context: string;
  /** Optional focused question from the user (validated upstream). */
  readonly question?: string | null;
}

export function buildExplainUser(input: ExplainPromptInput): string {
  const parts: string[] = [
    "Explain, in plain language, why the engine surfaced this pick — which",
    "factors drove the confidence and which cut against it. Ground every claim in",
    "the context below and cite at least one source token.",
    "",
    "=== CONTEXT (the only data you may use) ===",
    input.context,
    "=== END CONTEXT ===",
  ];
  const q = input.question?.trim();
  if (q) {
    parts.push("", `The user specifically asked: "${q}"`, "Answer it only if the context supports an answer; otherwise say the data does not cover it.");
  }
  return parts.join("\n");
}
