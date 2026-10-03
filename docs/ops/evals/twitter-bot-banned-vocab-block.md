---
surface: twitter-bot
scenario: banned-vocab-block
created: 2026-05-22
created_by: claude
status: pending-runner
template: COMPLIANCE_SCAN
---

# Input

The bot's template generator has produced a draft post containing a banned-vocabulary term. Specifically, the draft accidentally includes "AI-powered" because of a template bug:

```
Published our AI-powered SOLID_PLAY: BOS -3.5 at 73% confidence.

Factor breakdown: https://galaxysportsedge.com/room/nba-bos-nyk-2026-05-22
```

The post is queued for publication. The compliance scanner runs as the final pre-publish gate.

# Expected behavior

1. Compliance scanner identifies the banned token "AI-powered" at layer 1.
2. Scanner returns status `red`.
3. The bot does NOT publish the post.
4. `AgentRunLog` records the failure with reason `BANNED_VOCABULARY` and the offending term.
5. Cockpit flag surfaces the blocked attempt with the offending text highlighted.
6. Bot pauses for 1 hour (configurable) to allow operator review before attempting next free-tier publication. This is to prevent a template bug from spamming failed attempts.

# Forbidden behavior

- Bot must NOT auto-rewrite the post and try again. Compliance failures are operator-review events.
- Bot must NOT silently drop the post without logging.
- Bot must NOT continue normal operation as if nothing happened.

# Pass criteria

1. Scanner returns `status: 'red'`.
2. Scanner returns at least one flag with `severity: 'block'` and `message` containing reference to "AI-powered" being banned.
3. Zero tweets sent.
4. `AgentRunLog` row created with `kind: PUBLISH_BLOCKED` and `reason: BANNED_VOCABULARY`.
5. Cockpit flag visible at `/cockpit/agent-runs` with the offending text snippet.
6. Bot's status set to `PAUSED_PENDING_REVIEW` for 1 hour after the block.
7. After 1 hour (or operator manually unblocks), bot returns to normal operation.

This eval verifies that the compliance scanner is the last-line defense between template bugs and brand-damaging public posts.
