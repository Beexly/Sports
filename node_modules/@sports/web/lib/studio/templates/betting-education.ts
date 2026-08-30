/**
 * Galaxy Studio template: betting education angle.
 *
 * Explains what the line means, why it moved, how the model reads it.
 * Never a recommendation. Always closes with the "your call" disclaimer.
 */

import type { StudioTemplate } from "./types";

export const bettingEducationTemplate: StudioTemplate = {
  kind: "BETTING_EDUCATION",
  displayName: "Betting Education",
  voiceTone: "RESEARCH_EXPLAINER",
  targetLengthWords: { min: 300, max: 500 },

  complianceRules: [
    {
      pattern: /\b(lock|hammer|fade me|tail me|VIP|guarantee|sure thing|cant lose|cannot lose)\b/i,
      severity: "block",
      message:
        "Betting education template forbids tout-coded recommendation language.",
    },
    {
      pattern: /\b(I think|I see|I stay|I wait|in my opinion)\b/i,
      severity: "block",
      message:
        "Betting education uses 'the model' or 'the engine,' not first-person voice.",
    },
    {
      pattern:
        /\b(should bet|recommend|take this side|hammer this|fade this|smash this)\b/i,
      severity: "block",
      message:
        "Betting education explains the read; it does not recommend the bet.",
    },
    {
      pattern: /\bguaranteed\b/i,
      severity: "block",
      message: "No guarantee language.",
    },
  ],

  promptBuilder: (_node, context) => ({
    system: `You are writing a betting-education piece for a sports-betting
audience. Your job is to explain what the line means, why it moved, how the
model reads it — NOT to recommend the bet.

Audience: technically-literate sports bettors who want to understand the
market. They are NOT looking for picks; they are looking for analysis.

Tone: research explainer. Think a PFF methodology post or a Stripe documentation
page. Terse, technical, specific.

VOICE RULES
- Refer to the model as "the model" or "the engine." Not "I." Not "we believe."
- Cite specific factor reads. Specific numbers. Specific signals.
- Active voice.
- No first-person singular ("I think," "I see").
- No hedging ("could be," "might possibly").
- No recommendation language ("you should," "take this side," "hammer this").

STRUCTURE
1. What the line is and what it's saying about the market.
2. How the line moved since open, and what that movement signals.
3. What the model's heaviest factor reads are on this game (cite specific
   factor names and scores).
4. The pre-mortem perspective — what would have to be true for this read to
   be wrong.
5. Close with the verbatim disclaimer: "Whether to bet this is your call.
   What it teaches you about the market is the point."

LENGTH
300-500 words. Aim for 400.

PROHIBITED
- No recommendation. Not "you should bet." Not "take this side." Not
  "this is a play."
- No "VIP," "lock," "hammer," "smash," "guarantee."
- No win-rate or EV claims about the model.
- No comparison to other operators.
- No banned vocabulary from the platform-wide list.

CLOSE
Verbatim, as the last line of the asset:
"Whether to bet this is your call. What it teaches you about the market is the point."`,

    user: `Write a betting-education piece for this game. Cite factor reads
specifically. Close with the required disclaimer. Brand context: ${context.brandConfig.publicUrl}.`,

    maxTokens: 1500,
    temperature: 0.5,
  }),
};
