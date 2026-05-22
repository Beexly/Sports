/**
 * Galaxy Studio template: newsletter block.
 *
 * 400-700 words. H2 → paragraph → optional pull-quote → paragraph → close.
 * Drops cleanly into Substack / Beehiiv / Ghost. Includes one inline link to
 * the Galaxy Game Room.
 */

import type { StudioTemplate } from "./types";

export const newsletterBlockTemplate: StudioTemplate = {
  kind: "NEWSLETTER_BLOCK",
  displayName: "Newsletter Block",
  voiceTone: "NEWSLETTER_LONG_FORM",
  targetLengthWords: { min: 400, max: 700 },

  complianceRules: [
    {
      pattern: /\b(check out our|sign up for|join our|subscribe to our)\b/i,
      severity: "warn",
      message: "Newsletter block normally serves the CREATOR's audience, not Galaxy marketing. Confirm any CTA mentions are appropriate.",
    },
    {
      pattern: /\b(LOCK|HAMMER|FADE this)\b/,
      severity: "block",
      message: "Tout-coded language is forbidden.",
    },
  ],

  promptBuilder: (_node, context) => ({
    system: `You are writing a newsletter block about a game and the model's
read. The block will live inside a creator's newsletter (Substack, Beehiiv,
Ghost), positioned to read as the creator's own writing — they bring the
audience, Galaxy brings the data and citations.

Audience: the creator's existing newsletter readership. Tone matches
informed sports analysis.

Tone: newsletter long-form. Conversational but data-anchored. Think a good
beat writer's weekly column.

STRUCTURE
1. H2 headline (specific, not clickbait).
2. Opening paragraph: the storyline + why this game matters.
3. Walk through the model's read: 2-3 specific factor breakdowns with the
   numbers.
4. Optional pull-quote: one striking sentence from the analysis.
5. Closing paragraph: what to watch + how the model would update its read.
6. Inline link to Galaxy Game Room (one link, embedded naturally).

VOICE RULES
- Active voice. Specific players, specific recent events.
- No marketing CTAs for Galaxy itself. The creator owns the relationship
  with the reader.
- One inline link to the Game Room. No banner-style "READ MORE AT GALAXY"
  callout.
- No "experts say" hedging. Either the model said it or it didn't.

LENGTH
400-700 words. Aim for 550.

OUTPUT
Markdown. H2 (##) for the headline. Paragraphs separated by blank lines.
Pull-quote (if used) formatted as a blockquote.

PROHIBITED
- No "subscribe to Galaxy" CTAs.
- No tout-coded language.
- No win-rate claims.
- No banned vocabulary.`,

    user: `Write the newsletter block for this game. The creator's audience
will read this as their newsletter content. Include one inline link to ${context.brandConfig.publicUrl}/room/[gameId].`,

    maxTokens: 2000,
    temperature: 0.55,
  }),
};
