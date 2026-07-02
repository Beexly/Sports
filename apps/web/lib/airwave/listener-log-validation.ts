/**
 * Listener-log batch validation — pure law for the LEGAL manual lane
 * (docs/legal/SIRIUSXM_CONNECTION.md · registry: siriusxm-streaming).
 *
 * Batch mode exists for THROUGHPUT, not for transcripts: a whole show's
 * worth of claims, each in the listener's own words, one per line. The
 * guards below keep the lane lawful:
 *   - per-line 280-char cap (a paraphrase, never a transcript)
 *   - 30 lines per filing (a show's takes, not its audio)
 *   - timestamp-pattern rejection ([12:34], 00:12:34 —) — the clearest
 *     marker that someone pasted a transcript instead of paraphrasing
 */

// A 4-hour show throws off many distinct takes — the lane is generous in
// COUNT (your paraphrases) but capped per line so it can't become a place
// to paste a transcript.
export const MAX_BATCH_CLAIMS = 60;
export const MAX_CLAIM_LENGTH = 280;

/** [mm:ss], [hh:mm:ss], (12:34), 00:12:34 — classic transcript furniture. */
const TRANSCRIPT_TIMESTAMP_RE =
  /[[(]?\d{1,2}:\d{2}(:\d{2})?[\])]?\s*[—–-]|^\s*[[(]\d{1,2}:\d{2}/;

export type BatchValidation =
  | { readonly ok: true; readonly claims: readonly string[] }
  | { readonly ok: false; readonly error: string; readonly detail: string };

export function validateClaimBatch(input: readonly string[]): BatchValidation {
  const claims = input.map((c) => c.trim()).filter((c) => c.length > 0);

  if (claims.length === 0) {
    return { ok: false, error: "no-claims", detail: "Add at least one claim line." };
  }
  if (claims.length > MAX_BATCH_CLAIMS) {
    return {
      ok: false,
      error: "too-many-claims",
      detail: `Max ${MAX_BATCH_CLAIMS} claims per filing. File the rest in a second batch.`,
    };
  }
  const tooLong = claims.find((c) => c.length > MAX_CLAIM_LENGTH);
  if (tooLong) {
    return {
      ok: false,
      error: "claim-too-long",
      detail: "Each line must be a short paraphrase in your own words, not a transcript.",
    };
  }
  const timestamped = claims.filter((c) => TRANSCRIPT_TIMESTAMP_RE.test(c));
  if (timestamped.length > 0) {
    return {
      ok: false,
      error: "transcript-detected",
      detail:
        "Lines with timestamps look like a pasted transcript. The legal lane is paraphrase " +
        "only: your words, no recordings, no transcripts (SiriusXM §9(l)).",
    };
  }
  return { ok: true, claims };
}
