import { ANALYST_VOICE_PROMPT_BLOCK } from "@/lib/voice/analyst-standard";

/**
 * Prompts for the "ask the model why" explainer. Same grounded, no-marketing
 * voice as the Model Court — the explanation must describe the engine's actual
 * factors and never drift into a betting recommendation.
 *
 * Reader registers (NFL House doctrine, "same data, different doorway"):
 * the SAME grounded context renders for three audiences. The register changes
 * vocabulary and depth only — grounding, safety, and citation rules are
 * identical in all three. A register may never weaken a rule.
 */

export type ExplainRegister = "teach" | "plain" | "math";

export const EXPLAIN_REGISTERS: readonly ExplainRegister[] = ["teach", "plain", "math"];

export const DEFAULT_EXPLAIN_REGISTER: ExplainRegister = "plain";

export function isExplainRegister(value: unknown): value is ExplainRegister {
  return value === "teach" || value === "plain" || value === "math";
}

/** Reader-facing labels — shared by every surface that offers the toggle. */
export const EXPLAIN_REGISTER_LABELS: Record<ExplainRegister, string> = {
  teach: "Teach me",
  plain: "Plain read",
  math: "Show me the math",
};

const REGISTER_DIRECTIVES: Record<ExplainRegister, string> = {
  teach: [
    "REGISTER — teach me (beginner):",
    "- The reader is new to betting markets and football analytics. Warm and",
    "  steady, never condescending — they are smart, just new.",
    "- Define every market term in-line the first time it appears (spread,",
    "  line, confidence, consensus, line movement) in a short parenthetical.",
    "- No unexplained abbreviations. Prefer plain words over jargon.",
    "- Up to 160 words so definitions have room. Still two paragraphs max.",
  ].join("\n"),
  plain: [
    "REGISTER — plain read (default):",
    "- A sharp reader who knows the basics. No definitions needed; no jargon",
    "  for its own sake. 120 words or fewer.",
  ].join("\n"),
  math: [
    "REGISTER — show me the math (analyst):",
    "- The reader wants the quantitative skeleton. Lead with the numbers.",
    "- Name every contributing factor with its signed weight, and read the",
    "  snapshot fields that matter (data quality, bookmaker count, line",
    "  movement delta) as numbers, not adjectives.",
    "- Compact and technical; tables of words, not prose flourishes.",
    "  140 words or fewer.",
  ].join("\n"),
};

const SYSTEM_CORE = [
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
  "- If the independent-edge layer is present, note that it is surfaced for",
  "  transparency and does NOT yet move the confidence score.",
  "",
  ANALYST_VOICE_PROMPT_BLOCK,
].join("\n");

/** Register-aware system prompt. The register block NEVER overrides a rule. */
export function buildExplainSystem(
  register: ExplainRegister = DEFAULT_EXPLAIN_REGISTER,
): string {
  return [SYSTEM_CORE, "", REGISTER_DIRECTIVES[register]].join("\n");
}

/**
 * Back-compat constant — the default (plain) register. Existing callers and
 * tests reference this directly.
 */
export const PICK_EXPLAINER_SYSTEM = buildExplainSystem("plain");

export interface ExplainPromptInput {
  /** The grounded context block from buildGroundedContext(). */
  readonly context: string;
  /** Optional focused question from the user (validated upstream). */
  readonly question?: string | null;
}

/**
 * Sanitize untrusted user text before it is interpolated into a prompt.
 *
 * GSE-SEC-057: the user's question is injected into the system prompt, so it
 * must not be able to break out of its quote-delimited slot or restructure the
 * surrounding instruction. We neutralize:
 *  - back-slash sequences (JSON-style escapes, \\n, \\t, etc.)
 *  - double quotes (the delimiter wrapping the question)
 *  - angle-bracketed delimiters that could shadow the context fence
 *    (=== CONTEXT === / === END CONTEXT ===)
 *  - control characters (newline, tab, carriage return, null, etc.)
 */
const PROMPT_DELIMITER_RE = /=+ /g;
export function sanitizePromptInput(text: string): string {
  return text
    .replace(/\\/g, "\\\\") // escape backslashes first
    .replace(/"/g, '\\"') // escape double quotes
    .replace(/[\x00-\x1f\x7f]/g, " ") // strip control chars
    .replace(PROMPT_DELIMITER_RE, " — ") // neutralize "=== " delimiter markers;
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
    const safeQ = sanitizePromptInput(q);
    parts.push("", `The user specifically asked: "${safeQ}"`, "Answer it only if the context supports an answer; otherwise say the data does not cover it.");
  }
  return parts.join("\n");
}
