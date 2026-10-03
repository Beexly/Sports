/**
 * Galaxy Studio template: TikTok / Reels short-form video script.
 *
 * 45-90 seconds when read at normal pace.
 * Three beats: hook (5s), explanation with data (30-60s), close (5-10s).
 * Close includes a verbal citation pointing to the Game Room URL.
 */

import type { StudioTemplate } from "./types";

export const tiktokReelsScriptTemplate: StudioTemplate = {
  kind: "TIKTOK_REELS_SCRIPT",
  displayName: "TikTok / Reels Script",
  voiceTone: "SHORT_FORM_VIDEO",
  targetLengthWords: { min: 120, max: 240 }, // ~45-90s at normal pace

  complianceRules: [
    {
      pattern: /\b(you won't believe|wait til you see|here's the secret|nobody is talking about|the truth about|insane|MIND BLOWING|MIND-BLOWING)\b/i,
      severity: "block",
      message: "TikTok / Reels template forbids clickbait hooks. Lead with data, not hype.",
    },
    {
      pattern: /\b(LOCK|HAMMER|FADE|tail)\b/,
      severity: "block",
      message: "Tout-coded language is forbidden.",
    },
    {
      pattern: /[🚨🔥💰💎🚀💯🏆]{2,}/u,
      severity: "warn",
      message: "Multiple hype emojis. TikTok/Reels script should describe visual cues in stage directions, not emoji ladders.",
    },
  ],

  promptBuilder: (_node, context) => ({
    system: `You are writing a TikTok / Reels short-form video script about
the model's read on a game.

Audience: sports-betting curious viewers scrolling vertical video. Attention
span: ~3-5 seconds for the hook.

Output: a SCRIPT with stage directions in brackets and dialog in plain text.

STRUCTURE
1. Hook (5 seconds, ~15 words). Specific claim from the model. No "wait til
   you see this." No "the secret nobody's talking about." Lead with a number.
2. Explanation (30-60 seconds, ~80-160 words). Walk through 2-3 specific
   factor reads. Use stage directions for visual callouts ("[show factor
   breakdown graphic]", "[zoom on edge index number]").
3. Close (5-10 seconds, ~15-25 words). Verbal citation pointing to the Game
   Room URL ("Source: galaxy sports edge dot com slash room slash [gameId].")
   plus a one-line restatement of the platform's position.

VOICE RULES
- Conversational but data-anchored.
- No "you won't believe" / "wait til you see" / "the secret nobody knows."
- No tout-coded calls.
- Specific factor names. Specific numbers.
- Total runtime: 45-90 seconds.

OUTPUT FORMAT
SCRIPT format. Stage directions in [brackets]. Dialog in plain text.
Optional: short timestamps in (parens) at scene breaks.

PROHIBITED
- No banned vocabulary.
- No emoji ladders in dialog.
- No "Galaxy is the BEST" claims.
- No comparison to other operators.`,

    user: `Write the TikTok/Reels script for this game's model read. Include
the verbal citation in the close pointing to ${context.brandConfig.publicUrl}/room/[gameId].`,

    maxTokens: 900,
    temperature: 0.65,
  }),
};
