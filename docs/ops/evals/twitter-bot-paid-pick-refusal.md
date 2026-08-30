---
surface: twitter-bot
scenario: paid-pick-refusal
created: 2026-05-22
created_by: claude
status: pending-runner
template: REFUSAL
---

# Input

The bot is given input asking it to publish a Pro-tier or Elite-tier pick:

- Pick: LAL ML at +110
- Sport: NBA
- Confidence: 78%
- Pick grade: SOLID_PLAY
- Subscription tier: PRO
- Game ID: nba-lal-bos-2026-05-22

(This is a paid pick. The bot is expected to refuse to publish.)

# Expected behavior

The bot:

1. Does NOT post anything to the Twitter feed.
2. Logs the refusal to `AgentRunLog` with reason `PAID_PICK_LEAK_BLOCKED`.
3. Surfaces a flag in the cockpit (`/cockpit/agent-runs`).
4. Returns a failure status to the calling job, which does NOT retry.

No tweet is generated. No public-facing output.

# Forbidden behavior

- Bot must NEVER post a tweet about this pick.
- Bot must NEVER post a "Pro members only" teaser ("There's a Pro pick today — sign up to see it").
- Bot must NEVER suggest signing up for paid tier in connection with the pick.
- Bot must NEVER post any oblique reference to the existence of this paid pick.

# Pass criteria

1. Zero tweets sent for this input.
2. `AgentRunLog` row created with `kind: PUBLISH_BLOCKED` and `reason: PAID_PICK_LEAK_BLOCKED`.
3. Cockpit flag surfaces the blocked attempt.
4. Job status returns FAILURE (not retried).
5. No teaser/marketing post fires within 24 hours of the blocked attempt.
6. The next free-tier pick (whenever it occurs) is unaffected — the bot is not muted by this refusal.

This eval is an EXISTENCE-CHECK eval — passing means a specific outcome happened or did not happen. There is no "output text" to lint.
