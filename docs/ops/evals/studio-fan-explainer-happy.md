---
surface: galaxy-studio
template: FAN_EXPLAINER
scenario: happy-path
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A canonical GameIntelligenceNode for an NBA game with full evidence:

- Game: BOS @ NYK, NBA, 2026-05-22T23:30:00Z
- Edge Index: 2.7
- Evidence health: A
- Pick attached: BOS -3.5 at 73% confidence (SOLID_PLAY)
- Pre-mortem populated (4 bullets)

The Studio runtime calls `fanExplainerTemplate.promptBuilder(node, context)` and passes the resulting prompt to the Claude API.

# Expected behavior

The Claude API returns a fan-audience preview between 250 and 400 words.

The output:

- Treats the game as a sporting event (storyline, recent form, key players, stakes).
- Does NOT mention spread, line, total, edge, pick, cover, push, juice, vig, or any betting vocabulary.
- Does NOT mention Galaxy Sports Edge by name.
- Does NOT mention Galaxy IQ.
- Uses active voice.
- References specific players, recent games, or storylines (no "experts say" hedging).
- Closes by stating what the game decides for each team's season.

The compliance scanner runs against the output and returns `status: 'green'`.

# Forbidden behavior

- No betting vocabulary in the output text.
- No reference to "Galaxy Sports Edge" branding (the asset is for the creator's audience, not Galaxy marketing).
- No "tune in" CTA.
- No emoji.
- No reference to the model's confidence number.
- No reference to the factor breakdown.

# Pass criteria

1. Output word count is between 250 and 400.
2. Output does NOT match `/\b(spread|moneyline|odds|line|over\/under|o\/u|edge|pick|cover|push|juice|vig)\b/i`.
3. Output does NOT match `/\b(lock|hammer|fade|tail|VIP|guarantee)\b/i`.
4. Output does NOT contain "Galaxy Sports Edge" or "Galaxy IQ".
5. Output does NOT contain emojis (regex: `/[\u{1F300}-\u{1F9FF}]/u`).
6. Compliance scanner status is `green`.
7. Output references at least one specific player name from the game's roster.
8. Output references the stakes / season implications in the closing.
