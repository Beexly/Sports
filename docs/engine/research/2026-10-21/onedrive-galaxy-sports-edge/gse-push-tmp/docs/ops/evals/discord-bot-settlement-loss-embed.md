---
surface: discord-bot
template: settlement-embed
scenario: loss-outcome
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A free-tier pick settled as a LOSS, and the Discord bot is firing the settlement event:

- Matchup: MIN @ PIT
- Sport: NFL
- Pick line: MIN +6
- Outcome: L
- Final score: "PIT 28 - MIN 19"
- Confidence at publish: 68
- Heaviest contributor (irrelevant for loss): none
- Biggest miss factor: restAdvantage
- One-line cause: "MIN was more fatigued than projected"
- Game ID: nfl-min-pit-2026-05-22
- Model version: v6.0.5
- Settled at: 2026-05-22T23:55:00Z

# Expected behavior

The bot calls `buildSettlementEmbed(input, "https://galaxysportsedge.com")` and gets back a Discord embed:

- `title`: "Settled MIN +6 ❌ LOSS"
- `description`: "rest advantage signal misread. MIN was more fatigued than projected."
- `fields`: 3 fields — Result ("PIT 28 - MIN 19"), At publish ("68% confidence"), Outcome ("LOSS — did not cover")
- `color`: 0xE53935 (BRAND_COLORS.LOSS_RED)
- `url`: "https://galaxysportsedge.com/room/nfl-min-pit-2026-05-22"
- `footer.text`: contains "Model v6.0.5", "galaxysportsedge.com", "Post-mortem"

The bot then opens a thread on the embed and posts the post-mortem follow-up messages (using `buildPostMortemThread` from the Twitter bot templates, since the content is the same; Discord renders it as thread replies instead of tweets).

# Forbidden behavior

- No "tough one" / "next time" / "back tomorrow" / "the refs" exculpatory language anywhere.
- No celebration emojis (this is a loss).
- No "don't blame us" language.
- LOSS color must be red (0xE53935), NOT amber (push) or grey (gated).
- The settlement embed itself uses exactly ONE emoji: ❌. The post-mortem thread follow-ups use zero emojis.

# Pass criteria

1. Embed `title` exactly matches "Settled MIN +6 ❌ LOSS".
2. Embed `description` identifies the specific misread factor ("rest advantage") AND includes a one-line cause.
3. Embed `color` equals 0xE53935 (LOSS_RED).
4. Embed `footer.text` contains "Post-mortem" label (not "Full snapshot").
5. Embed contains exactly ONE emoji (the ❌).
6. Description does NOT match `/\b(tough one|tough loss|next time|back tomorrow|the refs|bad luck|should have won)\b/i`.
7. Description uses first-person plural style ("we got wrong", "we missed") consistent with the Twitter bot voice for losses.
8. Thread is opened on the embed.
9. Thread contains 4-6 follow-up messages following the post-mortem structure (heaviest signals at publish, what changed, what we got wrong, what this updates, full breakdown link).
10. Compliance scanner returns `status: 'green'` on the embed AND on each thread reply.
