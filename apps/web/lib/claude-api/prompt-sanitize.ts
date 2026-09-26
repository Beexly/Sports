/**
 * Prompt-input sanitization — shared by every surface that interpolates
 * untrusted user text into a Claude prompt.
 *
 * GSE-SEC-057: a user's question is injected into a prompt, so it must not be
 * able to break out of its quote-delimited slot or restructure the surrounding
 * instruction. We neutralize:
 *  - back-slash sequences (JSON-style escapes, \\n, \\t, etc.)
 *  - double quotes (the delimiter wrapping the question)
 *  - control characters (newline, tab, carriage return, null, etc.) — these are
 *    what let a question forge its own "User question:" / context headings
 *  - angle-bracketed "=== " delimiters that could shadow a context fence
 *    (=== CONTEXT === / === END CONTEXT ===)
 *
 * Lives here (not in pick-explainer) because the Model Court needs the identical
 * treatment: it interpolates the reader's raw question at `User question:\n...`.
 * `lib/pick-explainer/prompts.ts` re-exports this for its existing callers.
 */

const PROMPT_DELIMITER_RE = /=+ /g;

export function sanitizePromptInput(text: string): string {
  return text
    .replace(/\\/g, "\\\\") // escape backslashes first
    .replace(/"/g, '\\"') // escape double quotes
    .replace(/[\x00-\x1f\x7f]/g, " ") // strip control chars
    .replace(PROMPT_DELIMITER_RE, " — "); // neutralize "=== " delimiter markers
}
