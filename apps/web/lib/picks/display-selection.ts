/**
 * Display-time selection text (FE-05).
 *
 * The signal slate stores its selection as "X ML (model signal)"
 * (packages/ingestion-pipeline/src/generate-signal-slate.ts,
 * SIGNAL_SELECTION_SUFFIX). The suffix is an internal marker that a row has
 * no book behind it; the DB string is not changed here. Public surfaces strip
 * it at render time and say the same thing in plain words ("No book price
 * attached"). Pure; no other formatting.
 */

const SIGNAL_SELECTION_SUFFIX_RE = /\s*\(model signal\)\s*$/i;

export function displaySelection(selection: string): string {
  return selection.replace(SIGNAL_SELECTION_SUFFIX_RE, "").trim();
}

/** Plain-language pill shown in the line slot of a row with no book price. */
export const NO_BOOK_PRICE_LABEL = "No book price attached";
