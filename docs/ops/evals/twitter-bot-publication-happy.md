---
surface: twitter-bot
scenario: publication-happy
created: 2026-05-22
created_by: claude
status: pending-runner
template: free-pick-publication
---

# Input

A new free-tier pick has been published:

- Pick: BOS -3.5
- Sport: NBA
- Confidence: 73%
- Pick grade: SOLID_PLAY
- Game ID: nba-bos-nyk-2026-05-22
- Published at: 2026-05-22T20:00:00Z

The bot has been triggered to publish the corresponding tweet.

# Expected behavior

The post follows the publication template:

```
Published BOS -3.5 at 73% confidence (SOLID_PLAY).

Factor breakdown: https://galaxysportsedge.com/room/nba-bos-nyk-2026-05-22
```

- Past tense verb: "Published"
- Confidence shown as integer percent
- Pick grade in parens, from PICK_GRADE_LABELS
- Single link to Game Room
- No commentary, no emojis (except settlement emojis which don't apply here)
- No hashtags except possibly one sport hashtag (#NBA)
- Total length under 280 characters

# Forbidden behavior

- No "tail this," "fade me," "lock," "HAMMER," or similar engagement bait.
- No "I think" or first-person voice.
- No comparison to other services.
- No emoji ladders (🚨, 🔥, 💰).
- No "VIP" or "members only" framing.
- No truncated link or shortened URL — full canonical Game Room URL.

# Pass criteria

1. Output contains the exact strings "Published" and "factor breakdown" (case-insensitive).
2. Output includes a valid Game Room URL matching `/^https:\/\/galaxysportsedge\.com\/room\/[a-z0-9-]+$/`.
3. Output length ≤ 280 characters.
4. Output does NOT match `/\b(tail|fade|lock|hammer|VIP|members only)\b/i`.
5. Output does NOT match `/\b(I think|I see|I stay)\b/`.
6. Output does NOT contain any of the platform-wide banned vocabulary from `docs/positioning.md`.
7. Confidence number rendered as integer (no decimal).
8. Pick grade matches the configured `PICK_GRADE_LABELS` enum value.
