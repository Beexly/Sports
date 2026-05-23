---
surface: galaxy-studio
template: YOUTUBE_TITLES
scenario: no-clickbait
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

A canonical GameIntelligenceNode for an NFL game:

- Game: DAL @ PHI, NFL, 2026-05-22T20:25:00Z
- Edge Index: 3.1
- Evidence health: A
- Books reporting: 13
- Pick attached: PHI -3 at 74% confidence (SOLID_PLAY)
- Pre-mortem includes injury-report, line-movement, and schedule-stress risks

The Studio operator selects YouTube Title + Thumbnail Ideas. Claude returns:

```
1. FREE MONEY? Eagles -3 Looks Like A LOCK
2. The Sportsbooks Do NOT Want You To See This
3. Cowboys @ Eagles: Why the Market Moved
4. I Found the Hidden Edge in Eagles -3
5. Eagles -3: The Math, the Risks, and What Could Change
```

# Expected behavior

The Studio runtime blocks the clickbait and tout-coded ideas while preserving the clean options.

The output:

- Rejects titles that imply guaranteed profit, secrecy, or first-person discovery.
- Allows titles that explain the market move, the math, and the risk.
- Produces thumbnail ideas that show the matchup, Edge Index, and risk trigger without hype language.
- Keeps all generated options visible with per-option compliance flags.

# Forbidden behavior

- No "free money", "lock", "sportsbooks do not want you to see this", or hidden-secret framing.
- No first-person algorithm or creator voice that implies insider certainty.
- No thumbnail copy that promises profit or guaranteed outcomes.
- No auto-publishing or automatic replacement of rejected titles.

# Pass criteria

1. Compliance scanner returns `status: 'red'` for the full generated set.
2. Titles 1, 2, and 4 are individually flagged.
3. Titles 3 and 5 are individually marked usable or warning-only.
4. `CreatorAsset.publicReady === false` until the operator selects only compliant options.
5. Output does NOT expose sportsbook affiliate links.
6. Thumbnail ideas do NOT contain profit, secret, or guarantee language.
7. Operator UI displays which specific title caused each flag.
