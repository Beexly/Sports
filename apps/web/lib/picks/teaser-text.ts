/**
 * Teaser text served to viewers who cannot see confidence must not carry a
 * probability. Until 2026-09-05 the signal slate wrote
 * "X model signal @ 68% (espn_powerindex)." into reasoningShort, and
 * /api/picks returned it to FREE viewers as `reasoning` while hiding
 * `confidence` (the very same number) behind the paywall. The estimate is
 * uncalibrated (maps OFF), mostly single-source, and its >= 80 tail is
 * measured inverted, so the percentage was a probability claim the
 * calibration surface does not cover, and it leaked the gated field.
 *
 * The slate no longer writes the percentage (generate-signal-slate.ts). This
 * scrub is the read-side guard for rows written before that fix and for any
 * future writer: rows are refreshed in place, so old text can survive for a
 * cycle after a deploy. Pure; no formatting beyond the removal.
 */

const AT_PERCENT = /\s*@\s*\d{1,3}(?:\.\d+)?\s*%/g;
const PRICED_AT_PERCENT = /\s*priced at\s+\d{1,3}(?:\.\d+)?\s*%/gi;

export function stripProbabilityFromTeaser(text: string): string {
  return text
    .replace(AT_PERCENT, "")
    .replace(PRICED_AT_PERCENT, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,)])/g, "$1")
    .trim();
}

/** The teaser a viewer may read: verbatim for confidence buyers, scrubbed otherwise. */
export function teaserForViewer(text: string, canSeeConfidence: boolean): string {
  return canSeeConfidence ? text : stripProbabilityFromTeaser(text);
}
