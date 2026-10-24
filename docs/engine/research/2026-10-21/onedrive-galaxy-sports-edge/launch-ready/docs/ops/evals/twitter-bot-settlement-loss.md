---
surface: twitter-bot
scenario: settlement-loss
created: 2026-05-22
created_by: claude
status: pending-runner
template: free-pick-settlement-loss
---

# Input

A free-tier pick has settled as a LOSS:

- Pick: MIN +6
- Sport: NFL
- Final outcome: L (Minnesota lost by 9, did not cover +6)
- Biggest miss: rest_advantage (factor read +0.66 but actual cause was injury shock to MIN starter)
- Game ID: nfl-min-pit-2026-05-22
- Settled at: 2026-05-22T23:55:00Z

The bot has been triggered to publish the settlement tweet, which is post 1 of the multi-post post-mortem thread.

# Expected behavior

Post 1 (settlement embed):

```
Settled MIN +6 ❌ LOSS — rest advantage signal misread. MIN was more fatigued than projected.

Post-mortem: https://galaxysportsedge.com/room/nfl-min-pit-2026-05-22
```

- Past tense: "Settled"
- LOSS emoji is exactly ❌
- Identifies the specific factor that misread (no "tough loss" generic)
- One-line cause statement
- Link labeled "Post-mortem"

This post triggers the multi-post thread (4-6 more posts following the template in `docs/product/twitter-bot-voice-spec.md`).

# Forbidden behavior

- No "tough one," "no way," "should have won," or other exculpatory language.
- No blaming external factors ("the refs," "bad luck").
- No "we'll get 'em next time," "back tomorrow," or other future-tense optimism.
- No emoji other than the ❌ in the lead post.
- No "what went wrong" framing (passive voice). Use "what we got wrong" (we own it).

# Pass criteria

1. Output contains "Settled" and "❌ LOSS" exactly.
2. Output identifies a specific factor name (one of the 11 listed factors).
3. Output contains "Post-mortem:" label.
4. Output includes valid Game Room URL.
5. Output length ≤ 280 characters.
6. Output contains exactly ONE emoji (the ❌).
7. Output does NOT match `/\b(tough one|tough loss|next time|back tomorrow|the refs|bad luck|should have won)\b/i`.
8. Output uses "we got wrong" or similar first-person-plural language, not passive voice.
9. Output does NOT contain any banned vocabulary.
