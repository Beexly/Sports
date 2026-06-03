# Humanizing the Copy — Voice Directions (pick one)

You said the verbiage still "sounds AI-generated" and you want it to sound human, with real
sales psychology behind it. Fair. The current copy leans on clipped, clever fragments
("Measured. Not guessed.", "Prices first.") — that machine-gun cadence is exactly what reads as
AI. Humans use connective tissue, contractions, a little swagger, and they talk to *you*.

This doc gives you **three hero directions** plus pillar rewrites. They all stay inside the
compliance rails (`apps/web/lib/compliance-scanner/rules.ts`): no "AI-powered", no guarantees, no
win-rate/EV claims, no tout all-caps, no "track record", no competitor swipes. Pick a direction
(or mix lines) and I'll roll it across `lib/brand.ts` + the home components in one pass — the
hero in `app/page.tsx` is test-locked to "We post our losses.", so I'll update those tests with it.

> How to choose: read each one out loud. The one that sounds like *you* talking to a friend at
> the bar — not a brochure — is the winner.

---

## The current copy (for contrast)

- **Kicker:** "Find the SIGNAL before the market moves."
- **Subhead:** "Galaxy Sports Edge watches the board, scores market drift, and turns pricing gaps
  into auditable signals."
- **Pillars:** Intelligence — "Data with purpose." · Precision — "Measured. Not guessed." ·
  Advantage — "See it first. Use it better." · Discipline — "Process over emotion." · Results —
  "Consistent long-term edge."

Reads competent. Reads like software. Doesn't make you feel anything.

---

## Direction A — "Straight shooter" (trust through honesty)
*Psychology: radical transparency disarms skepticism. Lead with the thing touts hide — losses.*

- **Kicker:** Most picks are sold to you. Ours are shown to you.
- **Headline (keep):** We post our losses.
- **Subhead:** Every pick comes with the actual reasoning — the lines, the movement, the rest, the
  matchup. When we're wrong, it stays up. You're not buying confidence; you're watching the work.
- **CTA:** See today's board — free, no card.

## Direction B — "Quiet confidence" (the sharp insider)
*Psychology: scarcity + in-group. The calm pro who doesn't need to shout.*

- **Kicker:** The market tells on itself. We just read it out loud.
- **Headline (keep):** We post our losses.
- **Subhead:** Lines move for a reason. We track where the money pushes, when the price drifts,
  who's on rest — and we show you the read before the number settles. No screaming. Just the math,
  in plain sight.
- **CTA:** Start watching the board.

## Direction C — "Talk to me like a person" (warmth + relief)
*Psychology: relief from being burned before. Empathy, then the promise.*

- **Kicker:** You've been sold "locks" before. This isn't that.
- **Headline (keep):** We post our losses.
- **Subhead:** Here's the deal: every pick shows its homework, and the misses don't get deleted.
  No emojis, no "trust me," no countdown timers. Just a model you can actually check — and a free
  pick a day to see if we're worth it.
- **CTA:** Pull up today's board.

---

## Pillar rewrites (compliant, warmer) — pair with any direction

| Pillar | Current | Warmer |
|---|---|---|
| Intelligence | "Data with purpose." | "We read the board, not tea leaves." |
| Precision | "Measured. Not guessed." | "Every number traces back to something real." |
| Advantage | "See it first. Use it better." | "You see the move while it's still moving." |
| Discipline | "Process over emotion." | "Thin slate? We'd rather post nothing than force it." |
| Results | "Consistent long-term edge." | "The record's all public — wins, losses, the lot." |

---

## Reassurance bar (`start-in-sixty.tsx`) — already decent, small warmups

- "No card for free." → "Free means free — we never ask for a card."
- "7-day refund window." → "Don't like it? Seven days to get your money back, no forms."
- "Every reply gets read." → "Email us and a human answers. Usually the one who built this."

---

## Want it to sound *exactly* like you?

Drop 3–5 examples of how you actually write — texts, voice-memo transcripts, a tweet you liked,
the way you'd hype this to a buddy. I'll match the rhythm, the slang, the punctuation. That's the
fastest way to kill the "AI wrote this" feeling, because I'll be copying a real human: you.
