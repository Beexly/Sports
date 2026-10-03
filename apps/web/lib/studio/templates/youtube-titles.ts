/**
 * Galaxy Studio template: YouTube title + thumbnail ideas.
 *
 * Returns 8-12 title options ranked by length appropriateness, plus 3-5
 * thumbnail concepts. No clickbait patterns, conforms to platform-wide
 * banned vocabulary.
 */

import type { StudioTemplate } from "./types";

export const youtubeTitlesTemplate: StudioTemplate = {
  kind: "YOUTUBE_TITLE_IDEAS",
  displayName: "YouTube Title + Thumbnail Ideas",
  voiceTone: "TITLE_LIST",
  targetLengthWords: { min: 100, max: 250 },

  complianceRules: [
    {
      pattern: /\b(YOU WON'T BELIEVE|I CAN'T BELIEVE|INSANE|GONE WRONG|GONE SEXUAL)\b/,
      severity: "block",
      message: "YouTube titles forbid clickbait patterns.",
    },
    {
      pattern: /\b\d+ THINGS\b|\b\d+ REASONS\b/,
      severity: "warn",
      message: "Listicle patterns sometimes read as clickbait. Confirm appropriate use.",
    },
    {
      pattern: /\$\d+,\d+/,
      severity: "warn",
      message: "Dollar amounts in titles may read as tout-coded. Confirm context.",
    },
  ],

  promptBuilder: (_node, _context) => ({
    system: `You are generating YouTube title options + thumbnail concepts
for a video about the model's read on a game.

Audience: YouTube viewers searching for sports-betting content. The titles
need to be discoverable without being clickbait.

OUTPUT FORMAT
Return as TWO sections:

## Title options (8-12, sorted by recommended use)

For each title:
- The title text (under 70 chars preferred, under 100 hard limit)
- One-line rationale for why this title works

## Thumbnail concepts (3-5)

For each concept:
- A one-line description of the visual.
- Suggested text overlay (5 words max).

VOICE RULES
- No "YOU WON'T BELIEVE" / "I CAN'T BELIEVE" / "INSANE" / "GONE WRONG."
- No all-caps numbers ("LOST $10,000" style).
- No "secret" / "hidden" framing.
- Conform to the platform-wide banned vocabulary.
- One descriptor adjective per title max (no "INSANE EPIC AMAZING").

PROHIBITED
- Clickbait patterns.
- Listicle ("5 THINGS YOU NEED TO KNOW").
- Dollar-amount hooks.
- Tout-coded language.
- Banned vocabulary.

TONE
Direct, informative, search-discoverable. Think "Bills vs Dolphins:
Schedule Stress Signal Says Buffalo" — not "BIGGEST UPSET ALERT 🚨🔥."`,

    user: `Generate the title options + thumbnail concepts for a video about
the model's read on this game.`,

    maxTokens: 1500,
    temperature: 0.6,
  }),
};
