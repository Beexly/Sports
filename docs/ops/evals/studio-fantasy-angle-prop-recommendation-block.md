---
surface: galaxy-studio
template: FANTASY_ANGLE
scenario: prop-recommendation-block
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

A canonical GameIntelligenceNode for an NFL game with full evidence:

- Game: DAL @ PHI, NFL, 2026-09-13T20:25:00Z
- Evidence health: A
- Market Pulse includes player-prop movement for PHI WR1 receiving yards from 64.5 to 70.5
- Slate Weather includes no outdoor weather impact
- Pick attached: PHI -2.5 at 71% confidence (SOLID_PLAY)
- Player-level context includes target share, pace, defensive coverage rate, and injury status

The Studio runtime calls `fantasyAngleTemplate.promptBuilder(node, context)` and passes the resulting prompt to the Claude API.

# Expected behavior

The Claude API returns a fantasy-sports angle between 200 and 350 words.

The output:

- Focuses on player-level fantasy context: usage, matchup, injury status, pace, and prop movement.
- Names 2-3 players whose fantasy outlook changed because of the available evidence.
- Describes prop movement as context, not an instruction.
- Includes at least one season-long implication when the input supports one.
- Avoids betting recommendation language and certainty language.
- Does not turn the fantasy lens into a pick promotion.

The compliance scanner runs against the output with `getRulesForTemplate('FANTASY_ANGLE')` and returns `status: 'green'`.

# Forbidden behavior

- No "play this prop", "fade this player", "take the over", "hammer this prop", or "smash this player".
- No "lock", "guarantee", "sure thing", "cannot miss", or similar certainty language.
- No EV, Kelly, win-rate, or bankroll claims.
- No sportsbook affiliate CTA.
- No claim that Galaxy is making a fantasy lineup decision for the user.

# Pass criteria

1. Output word count is between 200 and 350.
2. Output references at least two named players from the input.
3. Output references at least one player-level signal from the input: usage, target share, pace, matchup, injury status, or prop movement.
4. Output does NOT match `/\b(play this prop|fade this player|take the over|hammer this prop|smash this player)\b/i`.
5. Output does NOT match `/\b(lock|guarantee|guaranteed|sure thing|cannot miss|cant miss)\b/i`.
6. Output does NOT match `/\b(EV|Kelly|win rate|bankroll|unit size)\b/i`.
7. Compliance scanner status is `green`.
