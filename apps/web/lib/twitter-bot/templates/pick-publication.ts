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

const PICK_GRADE_LABELS: Record<string, string> = {
  SOLID_PLAY: "SOLID_PLAY",
  LEAN: "LEAN",
  NOTE: "NOTE",
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
  const pickLine = `${input.matchup.includes("@") ? input.matchup : input.matchup} ${input.line}`.trim();
  const gradeLabel = PICK_GRADE_LABELS[input.pickGrade] ?? input.pickGrade;
  const confidence = Math.round(input.confidence);
  const linkUrl = `${publicUrl}/room/${input.gameId}`;
  const hashtag = SPORT_HASHTAGS[input.sport];

  const text = [
    `Published ${pickLine} at ${confidence}% confidence (${gradeLabel}).`,
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
