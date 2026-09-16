/**
 * Twitter bot template: free pick publication.
 *
 * Spec: docs/product/twitter-bot-voice-spec.md section "Free pick publications"
 *
 * Format:
 *   Published BOS -3.5 at 73% confidence (SOLID_PLAY).
 *
 *   Factor breakdown: https://galaxysportsedge.com/room/<gameId>
 */

import type { PickPublicationInput, TweetOutput } from "./types";

/**
 * Grade labels.
 *
 * DEFECT FIXED 2026-09-15: this map covered only SOLID_PLAY / LEAN / NOTE while
 * the real `PickGrade` enum (packages/types) is
 * ELITE_PLAY | STRONG_PLAY | SOLID_PLAY | LEAN. The two HIGHEST grades fell
 * through to the `?? input.pickGrade` fallback and published a raw enum name on
 * a public post. A NOTE grade does not exist in the engine at all.
 *
 * The list is now the full enum. The fallback stays, but it should never fire:
 * an exhaustive map plus a fallback is how a new enum member gets a raw name
 * instead of a build failure, and that is preferable to a crash in a bot.
 */
const PICK_GRADE_LABELS: Record<string, string> = {
  ELITE_PLAY: "ELITE_PLAY",
  STRONG_PLAY: "STRONG_PLAY",
  SOLID_PLAY: "SOLID_PLAY",
  LEAN: "LEAN",
};

const SPORT_HASHTAGS: Record<string, string> = {
  NBA: "NBA",
  NFL: "NFL",
  MLB: "MLB",
  NHL: "NHL",
  NCAAF: "CFB",
  NCAAB: "CBB",
};

export function buildPickPublicationTweet(
  input: PickPublicationInput,
  publicUrl: string,
): TweetOutput {
  /**
   * The pick line, which is the SELECTION, not the matchup.
   *
   * DEFECT FIXED 2026-09-15. The previous line was:
   *
   *   `${input.matchup.includes("@") ? input.matchup : input.matchup} ${input.line}`.trim()
   *
   * Two problems. First the ternary has IDENTICAL branches, so it was
   * vestigial; second, the composition itself is wrong against the real
   * adapter. `pickRecordToPublicationInput` sets `matchup` to the GAME
   * ("BOS @ NYK") and `line` to the SELECTION ("BOS -3.5", which already
   * carries the side). Appending one to the other produced
   * "BOS @ NYK BOS -3.5" in production and "BOS -3.5 -3.5" in any test whose
   * fixture followed the field names rather than the adapter.
   *
   * The voice spec's own example is `Published BOS -3.5 at ...`, so the
   * selection is the whole of it: the matchup is NOT part of the post. The
   * fallback chain exists so a row with an empty selection still publishes
   * something legible rather than a trailing space.
   */
  const pickLine = (input.line || input.side || input.matchup).trim();
  const gradeLabel = PICK_GRADE_LABELS[input.pickGrade] ?? input.pickGrade;
  const confidence = Math.round(input.confidence);
  const linkUrl = `${publicUrl}/room/${input.gameId}`;
  const hashtag = SPORT_HASHTAGS[input.sport];

  const text = [
    // CONFIDENCE IS RENDERED AS A SCORE, NEVER A PERCENT.
    //
    // The voice spec this template was written from said "at 73% confidence".
    // That predates the 2026-09-13 measurement recorded in AGENTS.md: `confidence`
    // is a weighted factor sum whose 80+ band CLAIMS 0.8663 and REALIZES 0.5191
    // (z = -10.7). A percent sign on it asserts a win probability the number
    // demonstrably is not, on the widest-reach surface the product owns, and a
    // tweet cannot be recalled.
    //
    // The app renders `72/100` for the same reason. Both must agree.
    `Published ${pickLine} at ${confidence}/100 confidence score (${gradeLabel}).`,
    "",
    `Factor breakdown: ${linkUrl}`,
    hashtag ? `\n#${hashtag}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  return {
    text,
    charCount: text.length,
    hashtags: hashtag ? [hashtag] : [],
    linkUrl,
  };
}
