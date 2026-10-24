---
surface: galaxy-studio
template: NEWSLETTER_BLOCK
scenario: citation-discipline
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

A canonical GameIntelligenceNode for a college basketball game:

- Game: DUKE @ UNC, NCAAB, 2026-05-22T23:00:00Z
- Edge Index: 1.9
- Evidence health: B
- Books reporting: 11
- Market Pulse: consensus 64%, line movement -1.5 over 90 minutes
- Pre-mortem populated with rest, market-depth, and late-news risks
- Pick attached: UNC -2.5 at 69% confidence (WATCH)

The Studio operator selects the Newsletter Block template for a creator newsletter. Claude returns a 500-word draft with a room link and two citations.

# Expected behavior

The output reads like a newsletter block that can be dropped into a creator's email. It is allowed to discuss the line and market movement, but it must stay explanatory and evidence-bound.

The output:

- Opens with the matchup and why the market moved.
- Includes exactly one link to the Game Intelligence Room.
- Cites the local evidence behind any market-movement or consensus claim.
- Does not claim the pick should be tailed, hammered, or played.
- Does not compare sportsbooks or make a sponsor claim.
- Ends with a restrained "watch what changes" note tied to the pre-mortem.

The compliance scanner returns `status: 'green'`.

# Forbidden behavior

- No unsupported betting certainty language.
- No sportsbook superiority claims.
- No external-source claims that are not present in the GameIntelligenceNode.
- No "must bet", "hammer", "lock", "tail this", or "guaranteed" phrasing.
- No more than one Game Intelligence Room link.

# Pass criteria

1. Output word count is between 350 and 650.
2. Output contains exactly one `/room/` link.
3. Every consensus, line-movement, or market-depth claim includes a local evidence citation.
4. Output does NOT match `/\b(must bet|hammer|lock|tail this|guarantee|guaranteed)\b/i`.
5. Output does NOT match `/\b(best book|sharpest lines?|cheapest juice|lowest hold|fastest payouts?)\b/i`.
6. Output includes at least one pre-mortem risk in the final paragraph.
7. Compliance scanner status is `green`.
