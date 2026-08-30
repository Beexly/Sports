/**
 * Galaxy Studio template: X (Twitter) thread.
 *
 * 5-7 posts. First post hooks. Last post drives to the source with citation.
 * No engagement bait. No emoji ladders.
 */

import type { StudioTemplate } from "./types";

export const xThreadTemplate: StudioTemplate = {
  kind: "X_THREAD",
  displayName: "X / Twitter Thread",
  voiceTone: "TERSE_SOCIAL_THREAD",
  targetLengthWords: { min: 150, max: 350 },

  complianceRules: [
    {
      pattern: /🚨|🔥|💰|💎|🚀|💯|🏆/u,
      severity: "block",
      message:
        "X thread template forbids hype emoji ladders. Galaxy bot voice does not use these.",
    },
    {
      pattern: /\b(BREAKING|HUGE|GIGANTIC|MASSIVE|INSANE)\b/,
      severity: "block",
      message: "All-caps hype language is forbidden.",
    },
    {
      pattern: /\b(who do you have|comment your locks|RT if|drop your picks)\b/i,
      severity: "block",
      message: "Engagement-bait CTAs are forbidden.",
    },
    {
      pattern: /\bcards?\b/i,
      severity: "warn",
      message:
        "Galaxy voice avoids 'card' as in 'pick card'. Use 'pick' or 'play' instead.",
    },
  ],

  promptBuilder: (_node, context) => ({
    system: `You are writing an X (Twitter) thread for a sports-betting
audience. The thread serves as a teaser that drives readers back to the
full Galaxy Sports Edge analysis.

Audience: bettors scrolling X for sports-betting content.

Tone: terse, factual, specific. No hype. No engagement bait. No emoji ladders.

VOICE RULES
- 5-7 posts total.
- First post hooks with a specific claim from the analysis.
- Middle posts walk through 2-3 specific factor reads with the actual numbers.
- Last post links to the Game Room with a citation reference.
- Maximum one emoji per thread, used sparingly. NO 🚨 🔥 💰 💎 🚀 💯 🏆 ladders.
- No threadbait questions ("here's what nobody's talking about").
- No "but here's the kicker" bridges. Bridge with data, not hype.
- Each post ≤ 280 characters.

STRUCTURE EXAMPLE
Post 1: One-line claim. Cite the model's read.
Post 2: First specific factor with the score.
Post 3: Second specific factor with the score.
Post 4: Third specific factor (if applicable) or pre-mortem perspective.
Post 5: What would change our mind.
Post 6: Where to read the full breakdown (link).
Post 7 (optional): Sport hashtag + close.

PROHIBITED
- No "Lock," "Hammer," "Smash," "VIP," "Guarantee."
- No "card" framing.
- No comparison to other operators.
- No win-rate claim.
- No "I think" or first-person voice.
- No banned vocabulary from the platform-wide list.

OUTPUT FORMAT
Return the thread as a JSON array of strings, one per post, no post longer
than 280 characters.`,

    user: `Write the X thread for this analysis. Link in the last post to
${context.brandConfig.publicUrl}/room/[gameId].`,

    maxTokens: 1500,
    temperature: 0.6,
  }),
};
