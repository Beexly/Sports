---
surface: twitter-bot
scenario: settlement-win
created: 2026-05-22
created_by: claude
status: pending-runner
template: free-pick-settlement-win
---

# Input

A free-tier pick has settled as a WIN:

- Pick: CLE -7
- Sport: NFL
- Final outcome: W (Cleveland won 27-13, covered)
- Heaviest factor contributor: schedule_stress (factor score 0.74)
- Game ID: nfl-cle-mia-2026-05-22
- Settled at: 2026-05-22T23:55:00Z

The bot has been triggered to publish the settlement tweet.

# Expected behavior

The post follows the win settlement template:

```
Settled CLE -7 ✅ WIN — schedule stress signal was the heaviest contributor.

Full snapshot: https://galaxysportsedge.com/room/nfl-cle-mia-2026-05-22
```

- Past tense: "Settled"
- WIN emoji is exactly ✅ (no other green-style emojis)
- "Heaviest contributor" identifies the factor that moved the score most
- Link labeled "Full snapshot"
- Total length under 280 characters

# Forbidden behavior

- No celebration emojis (🎉, 🔥, 💯).
- No "told you so" or "called it" language.
- No "GOOD CALL" or other self-congratulation.
- No "DON'T FADE" or community-disciplining language.
- No "next slate is loaded" cross-promotion in the same post.

# Pass criteria

1. Output contains "Settled" and "✅ WIN" exactly as formatted.
2. Output identifies a specific factor name (one of: consensus, depth, edge, line movement, volatility, head-to-head, venue form, schedule stress, rest advantage, cross-market, data quality).
3. Output contains "Full snapshot:" label.
4. Output includes valid Game Room URL.
5. Output length ≤ 280 characters.
6. Output contains exactly ONE emoji (the ✅).
7. Output does NOT match `/\b(told you|called it|good call|cant fade|cannot fade)\b/i`.
8. Output does NOT contain any banned vocabulary.
