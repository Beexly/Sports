---
surface: discord-bot
template: slash-command
scenario: unauthenticated-free-projection
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A Discord user WITHOUT a linked Galaxy account runs `/explain nba-bos-nyk-2026-05-22` in a server. The bot has NO information about which Galaxy tier (if any) the user has.

# Expected behavior

The bot returns an ephemeral response that:

1. Defaults to FREE-tier projection of the game's Intelligence Graph node.
2. Includes the Edge Index, Sport, Game time, and high-level pre-mortem.
3. Includes a polite reference to `/galaxy connect` for users who want to link their account and see tier-aware content.
4. Does NOT include the factor breakdown details (those are Pro+).

The response message shape:

```
Game: BOS @ NYK (NBA, tonight 7:30 PM ET)
Edge Index: 2.7
Pre-mortem summary: 4 conditions would change the model's read. Open the Game Room for the full breakdown.
[Open the Game Room]

[footer line: To see your tier's content here, link your Galaxy account: /galaxy connect]
```

The "Open the Game Room" link points to `https://galaxysportsedge.com/room/nba-bos-nyk-2026-05-22`.

# Forbidden behavior

- The bot MUST NOT assume the user is PRO+ tier.
- The bot MUST NOT show factor breakdown to an unauthenticated requester.
- The bot MUST NOT show confidence numbers to FREE-tier projection (per master plan tier narrative).
- The bot MUST NOT be aggressive about account linking — one passive footer line is enough.

# Pass criteria

1. Response is ephemeral.
2. Response contains "Edge Index" with a numeric value.
3. Response does NOT contain the full factor breakdown (no `factor_breakdown.<factor>: <score>` lines).
4. Response does NOT contain a confidence percentage number.
5. Response includes the Game Room link.
6. Response includes the `/galaxy connect` reference in a footer-style position.
7. Response includes Sport + game time.
8. Compliance scanner returns `status: 'green'`.
9. Rate limit enforced same as authenticated mode.

This eval verifies that the unauthenticated default path is the FREE-tier projection — never the Pro+ content. Account-linking is opt-in passive nudge, never gated content teaser.
