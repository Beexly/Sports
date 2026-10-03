/**
 * Galaxy Studio template: sponsor-safe blurb.
 *
 * 100-200 words. Lives next to a sportsbook ad without conflicting with the
 * operator's claims. Extra-strict compliance scanning.
 */

import type { StudioTemplate } from "./types";

export const sponsorSafeTemplate: StudioTemplate = {
  kind: "SPONSOR_SAFE_BLURB",
  displayName: "Sponsor-Safe Blurb",
  voiceTone: "BRAND_COMPLIANT_PROMO",
  targetLengthWords: { min: 100, max: 200 },

  complianceRules: [
    {
      pattern:
        /\b(best book|sharpest lines?|cheapest juice|lowest hold|fastest payouts?|guaranteed)\b/i,
      severity: "block",
      message:
        "Sponsor-safe blurb forbids competitive claims about sportsbooks. The blurb must NOT conflict with any sponsor's marketing claims.",
    },
    {
      pattern: /\b(DraftKings|FanDuel|BetMGM|Caesars|BetRivers|Underdog|PrizePicks|ESPN BET|Hard Rock Bet)\b/i,
      severity: "warn",
      message:
        "Sponsor-safe blurb references a specific sportsbook by name. Confirm this is the actual sponsor before approving.",
    },
    {
      pattern: /\b(must|always|guaranteed to|certain to|definitely will)\b/i,
      severity: "block",
      message: "Sponsor-safe blurb forbids certainty language.",
    },
    {
      pattern: /\b(I think|I see|I bet)\b/i,
      severity: "block",
      message: "Sponsor-safe blurb avoids first-person voice.",
    },
  ],

  promptBuilder: (_node, context) => ({
    system: `You are writing a sponsor-safe blurb for a sports-betting
audience. The blurb will appear next to a sportsbook ad in a newsletter,
embed, or sponsorship slot. It MUST NOT make claims that compete with the
sportsbook sponsor.

Audience: newsletter / content readers who see this in a sponsored context.

Tone: brand-compliant promotional. Informative without competing with the
sponsor's claims.

ABSOLUTE RULES
- No "best book," "sharpest lines," "cheapest juice," "fastest payouts."
- No comparison between sportsbooks.
- No certainty language ("will," "guaranteed," "must").
- No first-person voice.
- No prediction of outcomes for any game.
- No win-rate claim for Galaxy.

WHAT THE BLURB DOES
- Introduces the game / matchup briefly.
- References the model's read in a factual, non-recommendatory way.
- Drives to Galaxy's Game Room for the full breakdown.
- Closes with a one-line description of what Galaxy is (math you can read).

LENGTH
100-200 words. Aim for 140.

OUTPUT
Plain prose. No markdown headers.`,

    user: `Write the sponsor-safe blurb for this game. Brand context: ${context.brandConfig.publicUrl}.`,

    maxTokens: 600,
    temperature: 0.4,
  }),
};
