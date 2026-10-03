/**
 * Twitter bot template: slate state - gated game.
 *
 * Spec: docs/product/twitter-bot-voice-spec.md section "Slate state updates"
 *
 * Format:
 *   Just gated MIA @ NYY - spread balanced at 51% consensus across 8 books.
 *
 *   Edge Index: 0.4 (below publish threshold).
 *   https://galaxysportsedge.com/room/<gameId>
 */

import type { SlateStateGatedInput, TweetOutput } from "./types";

const SPORT_HASHTAGS: Record<string, string> = {
  NBA: "NBA",
  NFL: "NFL",
  MLB: "MLB",
  NHL: "NHL",
  NCAAF: "CFB",
  NCAAB: "CBB",
};

export function buildSlateStateGatedTweet(
  input: SlateStateGatedInput,
  publicUrl: string,
): TweetOutput {
  const linkUrl = `${publicUrl}/room/${input.gameId}`;
  const hashtag = SPORT_HASHTAGS[input.sport];
  const edgeIndexText =
    input.edgeIndex !== null
      ? `Edge Index: ${input.edgeIndex.toFixed(1)} (below publish threshold).`
      : "Edge Index: n/a (data still settling).";

  const text = [
    `Just gated ${input.matchup} - ${input.gateReasonText}`,
    "",
    edgeIndexText,
    linkUrl,
    hashtag ? `#${hashtag}` : "",
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
