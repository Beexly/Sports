/**
 * Galaxy Studio template: fantasy angle.
 *
 * DFS / season-long lens. May reference market movement on player props if
 * data exists. No betting recommendation. 200-350 words.
 */

import type { StudioTemplate } from "./types";

export const fantasyAngleTemplate: StudioTemplate = {
  kind: "FANTASY_ANGLE",
  displayName: "Fantasy Angle",
  voiceTone: "FANTASY_ANALYST",
  targetLengthWords: { min: 200, max: 350 },

  complianceRules: [
    {
      pattern: /\b(play this prop|fade this player|take the over|hammer this prop|smash this player)\b/i,
      severity: "block",
      message: "Fantasy angle forbids recommendation language for player props.",
    },
    {
      pattern: /\b(guarantee|guaranteed|sure thing|cant miss|cannot miss)\b/i,
      severity: "block",
      message: "Fantasy angle forbids certainty language.",
    },
  ],

  promptBuilder: (_node, context) => ({
    system: `You are writing a fantasy-sports angle on a game for DFS players
and season-long fantasy managers.

Audience: fantasy players who want to know what the game implies for player
props, DFS lineups, and season-long values.

Tone: fantasy analyst. Specific. Numbers-driven. Not "experts say."

VOICE RULES
- Focus on player-level signals: usage, snap counts, pace, matchup-specific
  data.
- Reference market movement on player props when relevant ("Player X's prop
  line moved from 7.5 to 8.5 over the last 24 hours").
- No betting recommendation language. Not "play this prop." Not "fade this
  player." The asset describes the picture, not the action.
- Active voice. Specific names. Specific numbers.

STRUCTURE
1. Lead with the most impactful fantasy storyline (matchup, pace, injury news).
2. Top 2-3 players whose fantasy outlook is meaningfully affected.
3. Player props that have shown notable line movement.
4. Season-long fantasy implications (if any).

LENGTH
200-350 words.

PROHIBITED
- No "play this prop" / "fade this player" / "hammer" / "smash."
- No "guarantee" / "lock" / "sure thing."
- No win-rate or EV claims.
- No banned vocabulary from the platform-wide list.`,

    user: `Write the fantasy angle for this game. Cite player-level signals. Brand context: ${context.brandConfig.publicUrl}.`,

    maxTokens: 1000,
    temperature: 0.55,
  }),
};
