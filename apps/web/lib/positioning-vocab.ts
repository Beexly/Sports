/**
 * Positioning vocabulary — single source of truth.
 *
 * Brand rule: "We're not AI. We're math you can read." The picks and the
 * scoring engine are a deterministic system; Claude is used only in the
 * content/atmosphere layer (see CLAUDE.md — "AI Layer: Claude API (content
 * generation only — not source of truth)"). Copy must never frame the
 * engine or the picks themselves as AI.
 *
 * The banned-phrase list and the phrase -> safe-replacement map both live in
 * `positioning-vocab.json` so every consumer — the runtime compliance
 * scanner (`compliance-scanner/rules.ts`), the CI trust-gate
 * (`scripts/guardrails/trust-gate.mjs`), and the docs copy-scan test
 * (`__tests__/docs-public-copy-scan.test.ts`) — reads the exact same list.
 * Add or remove a phrase here, once, and every surface picks it up.
 */
import vocab from "./positioning-vocab.json";

export const FORBIDDEN_PHRASES: readonly string[] = vocab.bannedPhrases;

export const SAFE_REPLACEMENTS: Readonly<Record<string, string>> = vocab.safeReplacements;

/**
 * Escape a literal string for use inside a RegExp, the same conservative
 * character class every other scanner in this repo uses (trust-claims.ts,
 * trust-gate.mjs). Does not escape "-" — it is not a metacharacter outside
 * a character class, and we need it literal so the `[\s-]` swap below can
 * find it.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build one case-insensitive, word-boundary regex that matches any phrase
 * in the given list (defaults to the full FORBIDDEN_PHRASES vocab).
 *
 * A hyphen or run of whitespace between tokens is treated as equivalent —
 * "AI-powered", "AI powered", and "AI   powered" all match the same phrase
 * entry — by escaping the phrase first, then replacing each literal space
 * or hyphen with `[\s-]+`.
 */
export function buildPositioningRegex(
  phrases: readonly string[] = FORBIDDEN_PHRASES
): RegExp {
  const alternatives = phrases.map((phrase) =>
    escapeRegex(phrase).replace(/[\s-]/g, "[\\s-]+")
  );
  // Static-analysis note (detect-non-literal-regexp): every alternative is a
  // regex-escaped phrase from positioning-vocab.json (repo content, not user
  // input), so there is no injection or ReDoS surface here.
  // An empty phrase list must match NOTHING, not every word boundary.
  if (alternatives.length === 0) return /(?!)/;
  // eslint-disable-next-line -- pattern is built from escaped constants
  return new RegExp(`\\b(?:${alternatives.join("|")})\\b`, "i"); // nosemgrep
}
