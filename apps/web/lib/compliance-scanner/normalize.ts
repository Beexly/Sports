/**
 * Compliance Scanner — input normalization.
 *
 * Submit-time enforcement scans author-supplied Markdown against the banned
 * vocabulary in `rules.ts`. Editors (and Markdown authoring in general) soft-wrap
 * long lines, so a multi-word banned phrase can end up split across a newline:
 *
 *     ...the model favors the home side. basically a sure
 *     thing for Sunday.
 *
 * Markdown renders that soft wrap as one continuous sentence ("...a sure thing
 * for Sunday."), but the rule regexes match a literal space, not a "\n" — so the
 * wrapped phrase would slip the gate. This collapses soft wraps back into single
 * spaces BEFORE scanning so authoring-time enforcement can't be evaded by an
 * editor line-break.
 *
 * This is the same normalization the read-time public-journal guard applies,
 * keeping the submit-time gate and the read-time backstop in lock-step.
 *
 * Behavior:
 *   - CRLF is folded to LF first.
 *   - A single "soft" newline (one not adjacent to another newline) becomes a
 *     space, in place. This is length-preserving for LF content, so any match
 *     offsets/spans computed against the result stay aligned with the source.
 *   - Paragraph breaks (blank lines / "\n\n") are preserved, so words on either
 *     side of a real paragraph boundary are NOT merged into a false phrase.
 *
 * Pure: no I/O, no side effects.
 */
export function normalizeForComplianceScan(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/([^\n])\n(?!\n)/g, "$1 ");
}
