# Content Surfaces — The Four Recurring Publishing Rhythms

**Phase:** 5 of the build plan ("Human Marketing").
**Status:** Templates + filled examples. Codex implements the publishing rails; this doc defines the *editorial frame*.
**Voice authority:** `docs/brand/brand-guidelines.md` is the master. This document inherits everything from it (first-person singular, "I built this", calibrated/precise/quietly confident).
**Brand-safety:** All four surfaces must pass `docs/brand-safety-rules-v2.md`. No fabricated stats, no banned claims, no Kelly/true-EV until activated.

---

## The four surfaces

| # | Surface | Cadence | Where it lives | One-line role |
|---|---|---|---|---|
| 1 | What I'm watching tonight | Daily, before slate publish | `/observatory` + email + social | Today's incoming pressure points. |
| 2 | Why the model stayed quiet | As-needed, after held/no-pick games | `/observatory/quiet` + email | Silence, explained. |
| 3 | Signal autopsy | Weekly, post-settlement | `/observatory/autopsy` + email | Honest review of one settled pick. |
| 4 | One number that moved | 2–3× per week | `/observatory/number` + social | A market datapoint, plain-spoken. |

Together they create a publishing rhythm where the engine's *thinking* is the product — not the picks themselves.

---

## Editorial rules — apply to all four

1. **First-person singular.** "I built this." "I held this." Never "we" or "our team."
2. **No prediction language about future games unbacked by the engine.** "I think the Lakers will cover" is a tout statement. Allowed: "the engine published a pick" or "I'm watching for X to confirm."
3. **Every number cites a source.** "Lakers on 3 days rest" is fine. "Lakers are 7-2 ATS in this spot" requires a source URL or internal data reference in the draft.
4. **No promotional CTAs in the body.** A subtle footer link is fine. Salesy mid-paragraph CTAs are not.
5. **No emojis.** No 🔥. No 💰. No 📈. The brand is Stripe-quiet, not sportsbook-loud.
6. **Banned-phrase scan before publish.** Every draft passes the brand-safety linter.
7. **Read aloud.** If a sentence sounds like an ESPN promo or a tout's Discord, rewrite.
8. **Older-reader friendly.** Short paragraphs, no jargon without a one-line definition, no acronyms on first use.

---

## Surface 1 — "What I'm watching tonight"

**Cadence:** Daily, published ~3 hours before slate publish (which is itself ~90 min before the first game).
**Length:** 150–300 words. Read time ≤90s.
**Posting surface:** `/observatory` page (top card), email to subscribers, X/Threads (truncated).

### Template

```
# What I'm watching tonight — {date}

It's {weekday}. {N} games on the slate.

The thing I'm tracking before the engine publishes:

**{game / market}** — {what's interesting about it in one sentence}.

Why it matters: {the specific factor I'm watching, from the registry —
restDays, lineup confirmation, weather, etc.}

What would shift my read:
- {specific event that would change the signal}
- {another}

I'll publish the slate at {time}. If {game} doesn't clear the gates, I'll
post the reason — not the pick.

— Garrett
```

### Filled example — NBA Thursday slate

```
# What I'm watching tonight — Thursday, May 22

It's Thursday. Six games on the slate.

The thing I'm tracking before the engine publishes:

**Celtics at Heat, Game 5** — Boston opened -4.5 and the line has held all
day. The market doesn't seem to be moving, but the underlying schedule is.

Why it matters: Boston is playing its third game in five nights. The
schedule-fatigue factor is in shadow mode in my engine — I can see it
internally, but it doesn't yet contribute to the published confidence.
I'm watching whether the public-line stickiness here matches what the
shadow factor would predict if it were activated.

What would shift my read:
- Tatum or Brown listed late as questionable would drop the line.
- A late steam to Miami (≥0.7 books moving) would suggest sharps are seeing
  what the shadow factor is seeing.

I'll publish the slate at 6:30 ET. If Boston/Miami doesn't clear the gates,
I'll post the reason — not the pick.

— Garrett
```

### Filled example — NFL Sunday morning

```
# What I'm watching tonight — Sunday, October 19

It's Sunday. Twelve games on the early slate, three afternoon, one prime.

The thing I'm tracking before the engine publishes:

**Bills at Dolphins, 1:00 ET** — opening total 49.5, currently 47, and the
wind speed at Hard Rock is forecast 18mph crosswind by kickoff.

Why it matters: the weather factor is in shadow for me — I'm collecting
data, not publishing it as a fact yet. But the line move is consistent
with the wind forecast. If the wind holds, the engine's market-side
read is already accounting for it via the total drop.

What would shift my read:
- Forecast cuts to <10mph by 11 ET — total walks back.
- Tua active without limitation — passing factor (currently shadow) gets noisier.

I'll publish the slate at 11:30 ET. Two games are already on the held
list — one for a stale lineup feed, one for confidence under threshold.

— Garrett
```

### Tone notes for this surface

- Specific, not breathless.
- Cites factor names from the registry (`restDays`, `weather`, `marketDepth`) — the audience learns the vocabulary by repetition.
- Names what's *not* activated yet. This is deliberate — transparency about the engine's maturity is the differentiator.
- Closes with what would change my read. Picks are claims; this is the *anti*-claim.

---

## Surface 2 — "Why the model stayed quiet"

**Cadence:** As needed, every time a game on a major slate ends up held or no-pick. May be 0× a day or 4× on a Sunday.
**Length:** 100–200 words per game.
**Posting surface:** `/observatory/quiet` page (rolling log), email digest weekly.

### Template

```
# Why the model stayed quiet — {game}, {date}

The engine did not publish a pick on {game} tonight.

Gate that stopped it: **{gate name from cockpit Frame 4}**

What that means: {one-sentence plain-English explanation of the gate}.

The data: {the specific fact — factor + value — that tripped the gate}.

If the gate had cleared: the engine would have leaned **{direction or "no
strong lean"}**. I'm telling you this so the silence is legible, not so you
bet it. Without the data clearing the gate, there's no pick to publish.

— Garrett
```

### Filled example — held game (lineup)

```
# Why the model stayed quiet — Lakers at Nuggets, May 22

The engine did not publish a pick on Lakers/Nuggets tonight.

Gate that stopped it: **Sample size — starStarter availability**.

What that means: the engine requires LeBron's status to be confirmed at
least 90 minutes before tip. As of the publish time (4:30 ET), the Lakers'
injury report read "available — pending pregame."

The data: my lineup-status factor (currently in shadow mode, not yet
contributing to confidence) flagged the absence of a confirmation. The
market had already moved Lakers from -3.5 to -2.5 overnight, suggesting
others were seeing the same uncertainty.

If the gate had cleared: the engine would have leaned **neither side
strongly** — the line movement already priced the uncertainty in. There
wasn't an edge to publish either way.

I'm telling you this so the silence is legible, not so you bet it. Without
LeBron's status confirmed before publish, there's no pick.

— Garrett
```

### Filled example — no-pick (stale data)

```
# Why the model stayed quiet — Bills at Dolphins, October 19

The engine did not publish a pick on Bills/Dolphins this morning.

Gate that stopped it: **Data freshness — weather feed**.

What that means: the engine requires a weather snapshot less than 60
minutes old at publish time for outdoor games. The provider's API was
returning a snapshot from 87 minutes prior.

The data: the wind forecast factor is in shadow mode (not yet activated),
but it's wired into the freshness gate as a hard dependency. If I can't
confirm the wind, I can't publish a total-leaning pick on an outdoor game
that the market is pricing as wind-affected.

If the gate had cleared: the engine had a lean toward the under (currently
47, the engine's modeled fair was 46.2). But the lean was inside the
calibrated noise floor — it would have been published as "no-strong-edge,"
not as a tier-3 pick.

I'm telling you this so the silence is legible, not so you bet it.

— Garrett
```

### Tone notes for this surface

- Doesn't apologize for the silence. The silence is the product.
- Names the gate from the cockpit. Repetition builds vocabulary.
- States what the engine *would have* leaned, *without* publishing it as advice. This is the trickiest line — the rule is: name the direction in plain language, never name a confidence number, never frame it as a pick that "would have been."
- The final line is mandatory: "I'm telling you this so the silence is legible, not so you bet it."

---

## Surface 3 — "Signal autopsy"

**Cadence:** Weekly, on Mondays. Reviews one settled pick from the prior week — winner or loser, doesn't matter.
**Length:** 400–700 words.
**Posting surface:** `/observatory/autopsy` page, email weekly.

### Template

```
# Signal autopsy — {pick}, settled {date}

The engine published this {win/loss/push} last {day}. Here's what it saw,
what it scored, and what the result tells me.

## The pick

{full pick line with confidence}

## What the engine saw at publish

**Market factors (activated):**
- Market depth: {n} books
- Line movement: {open} → {close}, {direction}
- Consensus: {pct}% on {side}
- Implied prob: {pct}%

**Schedule context:**
- {fact}
- {fact}

**Factors in shadow that I was watching internally:**
- {factor + value}
- {factor + value}

## The gate sequence

The pick cleared all six gates. Specifically, {note any close calls}.

## What happened

{factual result. score, what determined it.}

## What that tells me

{honest analysis — not "the engine was right" but "the engine got the
direction and the reason; the magnitude was within calibration."}

## What I'm updating

Nothing this week. {Or: a candidate change is queued in
docs/calibration-proposals/. It needs N more shadow-mode samples before
I'd consider promoting it.}

— Garrett
```

### Filled example — autopsy on a loss

```
# Signal autopsy — Lakers -2.5 vs Suns, settled May 18 (LOSS)

The engine published this loss last Saturday. The Lakers lost by 4. Here's
what it saw, what it scored, and what the result tells me.

## The pick

Lakers -2.5 (-110), Marketd-derived confidence 64.

## What the engine saw at publish

**Market factors (activated):**
- Market depth: 9 books
- Line movement: Lakers -1 → -2.5, half-point steps
- Consensus: 71% on Lakers
- Implied prob: 56%

**Schedule context:**
- Lakers home, 2 days rest
- Suns end of back-to-back

**Factors in shadow that I was watching internally:**
- Suns starStarter (Booker) listed questionable, played
- Refereetendency: crew has called -3.2 fewer fouls per game vs season avg

## The gate sequence

The pick cleared all six gates. The closest call was the confidence
threshold — 64 is one tick above the publish floor of 50, but two ticks
above the tier-3 floor of 62. It wasn't a high-conviction pick.

## What happened

Suns 117, Lakers 113. Booker scored 33. Lakers' second-unit defense
collapsed in the third quarter, 38–22 in that frame.

## What that tells me

The engine got the *direction* of the implied probability — Lakers were
likely-but-not-strongly favored. It did not have an activated factor for
"opposing star plays despite questionable tag." The shadow factor flagged
Booker; it didn't contribute to confidence (because shadow). If that
factor were activated and weighted reasonably, this pick wouldn't have
cleared the publish threshold.

The result is consistent with a 64-confidence pick being a coinflip-plus-
small-edge — and small edges lose ~36% of the time, which is what 64%
implied means. This loss is in calibration, not out of it.

## What I'm updating

Nothing this week. The `starStarter availability` factor has accumulated
21 days of shadow data; my proposal threshold is 30. When it hits 30, I'll
write a calibration proposal in `docs/calibration-proposals/`. If it earns
activation, picks like this Lakers one would have been held.

— Garrett
```

### Tone notes for this surface

- A loss isn't an apology; it's calibration check.
- A win isn't a victory lap; it's confirming the engine did what the math said it should.
- Always close with "what I'm updating" — even if the answer is "nothing." Predictable cadence builds trust.

---

## Surface 4 — "One number that moved"

**Cadence:** 2–3× per week. Triggered by a notable line move on a slate game.
**Length:** 60–120 words.
**Posting surface:** X / Threads / Instagram (short copy + image), `/observatory/number` page.

### Template

```
{Number — large, hero typography}

{Game / market context, one line.}

{One factual sentence about what moved.}

{One sentence connecting the move to a factor — activated or shadow.}

That's the number. Make of it what you will.
```

### Filled example

```
47

Bills at Dolphins, Sunday. Total opened 49.5 and walked down to 47 across
the morning. Wind forecast at Hard Rock cut from 8mph to 18mph between
opening and now.

My weather factor is in shadow — collecting, not publishing as a number —
but the market is doing the work for me here. When the wind moves like
this and the total moves like this, the read is the same regardless of
which model you're running.

That's the number. Make of it what you will.
```

### Filled example — defensive variant (line move without a clean cause)

```
-4.5

Boston at Miami, Thursday. Spread opened -3.5 and steamed to -4.5 by 6 ET.
Volume is up but I don't have a confirmed sharp-money source — my
sharp-money factor is in shadow and the trust level is low.

I'm logging this move so the autopsy on Monday has the data.

That's the number. Make of it what you will.
```

### Tone notes for this surface

- The number IS the headline. Visual: oversized type, brand colors.
- Never frames the number as a pick or a recommendation.
- Often references factors in shadow — keeps the audience aware of the engine's growing edges without overclaiming.
- Closing line is the same every time. Repetition builds brand: "That's the number. Make of it what you will."

---

## Where these live in the product

Recommended new routes for Codex to add (all read-only, server-rendered, sitemap-included):

```
apps/web/app/observatory/page.tsx           # existing — adds "what I'm watching" top card
apps/web/app/observatory/quiet/page.tsx     # new — "why the model stayed quiet" rolling log
apps/web/app/observatory/autopsy/page.tsx   # new — weekly signal autopsies
apps/web/app/observatory/number/page.tsx    # new — "one number that moved" log
```

Backed by:

```
packages/content/src/surfaces/             # new — typed schemas for each surface
docs/content-archive/                       # markdown source of truth for published items
```

**Publishing flow (Codex implementation suggestion):**

1. Garrett writes a markdown file in `docs/content-archive/{surface}/YYYY-MM-DD-{slug}.md` with frontmatter.
2. Build picks up new markdowns, validates against schema + brand-safety linter.
3. Published items render on the corresponding route.
4. RSS + JSON feed generated automatically.

This is content-as-code. Predictable, lintable, audit-trail intact. No CMS, no mid-paragraph promo CTAs of the kind the brand-safety linter rejects.

---

## Frontmatter schema (per surface)

```yaml
---
surface: watching | quiet | autopsy | number
publishedAt: 2026-05-22T15:00:00Z
title: "..."
relatedPickIds: []        # if this content cites a published pick, link the IDs
relatedFactorKeys: []     # registry keys cited
slatePublishTime: 2026-05-22T22:30:00Z  # "watching" only
gameId: "..."             # "quiet" / "number" — game referenced
settledPickId: "..."      # "autopsy" only
status: draft | published | retracted
---
```

The linter at build time validates:

- All `relatedFactorKeys` exist in the factor registry.
- All `relatedPickIds` exist in the database.
- For "quiet" content: the referenced pick has `gateState !== 'published'`.
- For "autopsy" content: the referenced pick is settled and at least 24h old.
- No banned phrases.

---

## Cadence calendar — first 30 days

| Day | Surface | Notes |
|---|---|---|
| Every day | What I'm watching tonight | 3h before slate publish |
| As-needed | Why the model stayed quiet | every held/no-pick on major slates |
| Monday | Signal autopsy | one settled pick from prior week |
| Mon/Wed/Fri | One number that moved | line-move-triggered or operator-initiated |

In the first 30 days, the rhythm should land at roughly:

- 30 "watching" posts
- 10–25 "quiet" posts (NFL Sunday alone will produce 4–6)
- 4 "autopsy" posts
- 8–12 "number" posts

That's a 50–70 piece content corpus in the first month, all data-attached, all linter-cleared, all from the founder's voice. The cumulative effect is a body of evidence that the engine has a *brain* and a *process* — the actual product is the publishing rhythm.

---

## What this is NOT

- **Not a blog.** A blog implies a CMS, a content calendar driven by SEO. These four surfaces are *operational outputs* of the engine, published.
- **Not picks marketing.** "Best bets for tonight" isn't on this list deliberately. We publish picks at `/picks`; we publish *thinking* on these four surfaces. They reinforce, not duplicate.
- **Not where to grow followers via volume.** Each post is precise. Hand-crafted (or template-driven from real factor data). Volume is a side-effect, not the goal.

---

## One-paragraph summary

Four surfaces, each a different cadence, each a different angle on the engine's thinking. "What I'm watching" is the engine warming up. "Why the model stayed quiet" is the engine being honest about silence. "Signal autopsy" is the engine grading itself. "One number that moved" is the market making the point for the engine. Together they create a publishing rhythm where the *thinking* is the product — readers buy the subscription not because the picks are loud but because the reasoning is visible. The marketing voice and the engine voice are the same voice. That's the bet.
