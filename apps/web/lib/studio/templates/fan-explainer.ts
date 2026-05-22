/**
 * Galaxy Studio template: fan explainer.
 *
 * Plain-English game preview. No betting language. Treats the game as a
 * sporting event. 250-400 words.
 */

import type { StudioTemplate } from "./types";

export const fanExplainerTemplate: StudioTemplate = {
  kind: "FAN_EXPLAINER",
  displayName: "Fan Explainer",
  voiceTone: "INFORMED_SPORTS_COLUMN",
  targetLengthWords: { min: 250, max: 400 },

  complianceRules: [
    {
      pattern: /\b(spread|moneyline|odds|line|over\/under|o\/u|edge|pick|cover|push|juice|vig)\b/i,
      severity: "block",
      message:
        "Fan explainer template forbids betting vocabulary. This is a sporting-event preview, not a pick analysis.",
    },
    {
      pattern: /\b(lock|hammer|fade|tail|VIP|guarantee)\b/i,
      severity: "block",
      message: "Fan explainer forbids tout-coded language.",
    },
    {
      pattern: /\bgalaxy iq\b/i,
      severity: "warn",
      message:
        "Fan explainer template usually doesn't reference Galaxy IQ — keep the surface platform-agnostic for sharing.",
    },
  ],

  promptBuilder: (_node, context) => ({
    system: `You are writing a game preview for a sports fan audience.

Your audience: sports fans who want to understand what's at stake in this
game. They are NOT betting on it; they are watching it.

Tone: informed sports column. Think a good local paper's beat writer.
Specific. Confident. Not breathless. Not "experts say" hedging.

VOICE RULES
- No betting vocabulary. No spread, line, total, edge, pick, cover, push, juice, vig.
- No tout language. No "lock," "hammer," "fade," "tail," "VIP."
- No predictions about outcomes ("X will win"). The preview is context, not forecast.
- Active voice. Specific players, specific recent results, specific storylines.

STRUCTURE
1. Lead with the storyline that matters most for this game (rivalry, playoff
   implications, milestone, etc.).
2. Context for each team: recent form, key players, notable trends.
3. What to watch — specific moments or matchups that will define how the
   game plays out.
4. Close with the stakes: what does this game decide for each team's season?

LENGTH
250-400 words. Aim for 320.

PROHIBITED
- No "Galaxy Sports Edge" name-drop. The asset is for the creator's audience,
  not for Galaxy marketing.
- No "tune in" CTA. The reader is already engaged with the game.
- No banned vocabulary from the platform-wide list.

You will be given the game's metadata + relevant signals. Use them as context
but do NOT cite them in betting terms.`,

    user: `Write a fan-audience preview for the game. Brand context: ${context.brandConfig.publicUrl}.`,

    maxTokens: 1200,
    temperature: 0.6,
  }),
};
