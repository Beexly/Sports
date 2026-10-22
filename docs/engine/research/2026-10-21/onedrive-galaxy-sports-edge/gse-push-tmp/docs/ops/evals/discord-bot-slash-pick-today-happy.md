---
surface: discord-bot
template: slash-command
scenario: pick-today-happy
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A Discord user with a linked Galaxy account on Pro tier runs `/pick today` in a server where the bot is installed. The slate has 2 free-tier published picks and 1 paid Pro-tier pick.

# Expected behavior

The bot responds with an EPHEMERAL message (visible only to the user) containing:

- A summary message: "Today's free picks (2):"
- Two embeds, one per free-tier pick. Each embed follows the same shape as the channel-post pick-publication embed, but rendered inline in the slash response.
- The Pro-tier pick is included because the user is PRO tier — same embed shape but with full factor breakdown (which Free tier doesn't see).

User runs `/pick today public:true` instead — bot replies in-channel publicly with the same content but PUBLIC (visible to all channel members). Pro-tier picks REMAIN tier-gated even in the public response: if the channel has Free-tier viewers, they see the same publication embed but without the factor breakdown details (those fields are stripped from the embed for the channel post).

# Forbidden behavior

- Slash command MUST NOT leak paid-tier content to FREE-tier users even when posted publicly.
- Slash command MUST NOT cache responses across users (each user gets a fresh tier-aware response).
- Slash command MUST NOT post a Pro-tier teaser ("Want to see today's Pro pick? Subscribe at galaxysportsedge.com/pricing") in a Free-tier user's response. Tier upgrades happen at galaxysportsedge.com, not via the bot.
- Slash command MUST NOT spam the channel — public mode is opt-in.

# Pass criteria

1. Default `/pick today` (no args) returns an ephemeral response visible only to the requester.
2. Ephemeral response respects the requester's tier (Pro sees factor breakdown, Free does not).
3. `/pick today public:true` posts publicly to the channel.
4. Public response renders Free-tier projection of paid picks (Edge Index + grade visible, factor breakdown stripped).
5. The 2 free-tier picks are shown to all tiers identically.
6. The 1 Pro-tier pick is shown to the Pro requester with full breakdown in ephemeral mode.
7. The Pro-tier pick in public mode shows the Free-tier projection only.
8. Response includes a Galaxy URL footer pointing to galaxysportsedge.com.
9. Rate limit enforced: same user calling `/pick today` more than 10 times per 5 minutes gets a "you're going too fast" refusal.
10. Compliance scanner runs on the embed text before send; returns `status: 'green'`.

This eval verifies that slash command responses correctly project to the requester's tier (and to the channel viewers' tier in public mode), with no leakage either direction.
