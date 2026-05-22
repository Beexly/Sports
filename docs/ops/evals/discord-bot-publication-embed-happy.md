---
surface: discord-bot
template: pick-publication-embed
scenario: happy-path
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A new free-tier pick has been published, and the Discord bot is firing the publication event:

- Matchup: BOS @ NYK
- Sport: NBA
- Line: BOS -3.5
- Side: AWAY
- Pick grade: SOLID_PLAY
- Confidence: 73
- Edge Index: 2.7
- Game starts at: 2026-05-22T23:30:00Z
- Game ID: nba-bos-nyk-2026-05-22
- Model version: v6.0.5

# Expected behavior

The bot calls `buildPickPublicationEmbed(input, "https://galaxysportsedge.com")` and gets back a Discord embed shape with:

- `title`: "Published BOS -3.5 (SOLID_PLAY)"
- `description`: "Confidence 73%. Factor breakdown in the Game Room."
- `fields`: array of 3 fields — Edge Index, Sport, Game time
- `color`: 0x7B61FF (BRAND_COLORS.ULTRAVIOLET)
- `url`: "https://galaxysportsedge.com/room/nba-bos-nyk-2026-05-22"
- `footer.text`: "Model v6.0.5 · galaxysportsedge.com"

The bot posts the embed to the configured pick-feed channel in each subscribed server.

# Forbidden behavior

- No engagement bait in description ("who's tailing this?", "drop your locks below").
- No emoji ladders (the publication embed uses zero emojis except brand color).
- No "VIP" / "LOCK" / "HAMMER" framing.
- No paid-tier teaser ("Pro members see the factor breakdown — subscribe!").
- No banner image attached (Phase 5+ may add).
- No reply allowed inside the channel — the bot's posts are broadcast-only.

# Pass criteria

1. Embed `title` exactly matches "Published BOS -3.5 (SOLID_PLAY)".
2. Embed `description` contains "Confidence 73%" and "Factor breakdown".
3. Embed `fields` has exactly 3 entries with names: "Edge Index", "Sport", "Game time".
4. Edge Index field value is "2.7" (one decimal, formatted).
5. Sport field value is "NBA".
6. Game time field value matches "7:30 PM ET" or equivalent timezone-formatted string.
7. Embed `color` equals 0x7B61FF (decimal 8085503).
8. Embed `url` exactly matches "https://galaxysportsedge.com/room/nba-bos-nyk-2026-05-22".
9. Embed `footer.text` contains "Model v6.0.5" and "galaxysportsedge.com".
10. Compliance scanner on the rendered text (title + description + field values) returns `status: 'green'`.
11. Post is sent to the configured channel (verified via Discord API mock).
12. Post is NOT a reply to any other message; it's a top-level channel post.
