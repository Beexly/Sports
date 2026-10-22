# Welcome Sequence — Galaxy Sports Edge

A 5-email founder-voice nurture flow triggered by new free-account signup
during the silent-collection phase (before `PUBLIC_PICKS_ENABLED=true`).

**Voice:** First-person Garrett, calibrated and direct. No hype.
**Frequency:** Spaced over 14 days, ending on the live-board alert.
**Sender:** `hq@galaxysportsedge.com` (display name: "Garrett Baxley")
**Reply-to:** `hq@galaxysportsedge.com` — every reply lands in my inbox
**Brand-safety:** No banned phrases (per Brand Use Pack §8). No win-rate claims.
**Stack target:** Resend / Postmark / Loops — any provider with personalization.

---

## Email 1 — Welcome (sent immediately on signup)

**Subject (A):** Welcome to Galaxy Sports Edge — what happens next
**Subject (B):** You're in. Here's why the picks aren't live yet.
**Preheader:** I built this because I was tired of paying for picks from people who delete the losses.

---

Hey {{first_name}},

Garrett here — the person who built Galaxy Sports Edge.

You just created a free account, so I want to tell you what you're actually
in for. Three things:

**1. The Signal Feed isn't live yet.**

That's intentional. I gate every public surface — picks, performance,
the Vault — until the system has enough settled history to publish a
calibrated, defensible number. Most sports services do the opposite: they
publish on day one and curate the wins. I refuse to.

**2. You'll get one email when the board opens.**

That's the moment Galaxy IQ's readiness gate clears and the Signal Feed
goes public. Probably 7–14 days from now. You'll be in the first wave.

**3. Until then, here's the inside view.**

Over the next two weeks I'll send four short emails walking you through
the methodology — how a signal actually gets scored, gated, and published.
You'll understand exactly what you're buying before you're asked to buy
anything.

If any of that doesn't fit your inbox, the unsubscribe link is at the
bottom. No hard feelings.

— Garrett

PS: Reply to this email if you have questions. Every reply lands in my
inbox personally.

---

## Email 2 — Methodology deep-dive (Day 2)

**Subject (A):** How a sports signal actually gets scored
**Subject (B):** What "gated" means (and why most days nothing publishes)
**Preheader:** The four checks every signal has to clear before it ships.

---

Hey {{first_name}},

Day two. Let me show you what's running under the hood.

Every matchup gets pushed through four checks in sequence:

**01. Read the board** — spread, total, moneyline, bookmaker count,
freshness timestamp. The system records the market shape before any
opinion forms.

**02. Measure pressure** — movement, consensus, volatility, matchup
context. I'm studying how the number got where it is — who moved, how
far, how fast, whether the market is deep enough to trust.

**03. Gate the signal** — only matchups where the edge is explainable
ship. Weak inputs, stale prices, or thin markets stay off the customer
surface. If I can't defend it, it doesn't get published.

**04. Learn slowly** — settled outcomes inform calibration, but every
weight change goes through review. Overreacting to a single result is
expensive.

That's it. Four checks. No proprietary "AI" jargon, no neural-net
mysticism. Just disciplined market measurement.

The full methodology page lives here if you want to dig:
https://galaxysportsedge.com/methodology

— Garrett

---

## Email 3 — The "Collecting" page (Day 5)

**Subject (A):** Why my Performance page is empty (on purpose)
**Subject (B):** The number I refuse to publish until I can back it
**Preheader:** It's not a bug. It's the whole point.

---

Hey {{first_name}},

If you've poked around the site, you've seen the Performance page reads
"Calibration Report · Collecting" with no win-rate number on it.

That's intentional. Here's why.

Most sports services publish a win-rate from day one — usually built on
a curated subset of their picks. The numbers look great because they're
chosen to look great.

I built Galaxy Sports Edge to do the opposite. The public win-rate stays
gated until enough canonical settled signals exist to render a number
that's statistically defensible. Could be 100 settled signals. Could be
500. Whatever it takes for the number to be honest.

If I have to wait, I wait.

That's the whole product, in one decision.

When the page opens, you'll see every signal — wins, losses, pushes —
with the factor trail that drove each one. No curation, no cherry-picking,
no quietly deleted losses.

— Garrett

PS: The Vault opens at the same time. Every pick I've ever published,
with its reasoning and outcome attached.

---

## Email 4 — Eclipse Gate + Edge Index (Day 9)

**Subject (A):** The two scores you'll see on every signal
**Subject (B):** Eclipse Gate isn't what you think it is
**Preheader:** Confidence is a calibration, not a promise.

---

Hey {{first_name}},

When the Signal Feed opens, every published card carries two scores.

**Edge Index** — a composite confidence rating from 0 to 100 that
quantifies signal strength, volatility, and expected-value context.
It's not a probability the pick wins. It's a calibrated measure of how
much the market is offering vs. what the model thinks the matchup is
worth.

**Eclipse Gate** — verified conviction state. It is not a promise about
the outcome. It is a flag that says: "every gate cleared by a significant
margin, factor agreement is high, and the market depth is solid." It is
the model's strongest honest signal — and it still loses sometimes.

A 64% calibrated confidence still loses 36 out of 100 times. I designed
every surface around that reality. Variance is described, not hidden.

When you see Eclipse Gate, you're not seeing certainty. You're seeing the
model's most disciplined read.

— Garrett

PS: The name matters. It says a signal cleared the gates. It does not say
the future is settled.

---

## Email 5 — The board is open (triggered when PUBLIC_PICKS_ENABLED flips)

**Subject (A):** The board is open. First signals are live.
**Subject (B):** {{first_name}}, the Signal Feed just opened.
**Preheader:** Free plan gets one signal a day. Pro and Elite unlock everything.

---

Hey {{first_name}},

It's live.

Galaxy IQ's readiness gate cleared this morning. The Signal Feed is now
publishing — full factor trail on every card, all 7 sports (NFL, NCAAF,
NBA, NCAAB, MLB, NHL, MLS), 30-minute refresh loop.

**See today's signals:** https://galaxysportsedge.com/picks

You're on the Free plan, which gets one signal per day — the
highest-Edge-Index signal of the slate, with the matchup and pick type
visible but the confidence rating and factor trail gated.

If you want to see every signal with its reasoning attached:
https://galaxysportsedge.com/pricing

Pro is $19/mo. Elite is $49/mo. Every paid plan has a 7-day refund window.

That's the whole pitch. The product does the talking from here.

— Garrett

PS: The Calibration Report is still gated — I'm letting the canonical
record accumulate before I publish a number. That should fire sometime
in the next 30–60 days. You'll be notified then too.

---

## Branching / Exit Conditions

- If user upgrades to Pro/Elite at any point: skip remaining nurture, send "Welcome to Pro" or "Welcome to Elite" instead.
- If user has been inactive 30 days post-signup with no opens: drop from sequence; queue for re-engagement campaign at win-rate-publish time.
- If `PUBLIC_PICKS_ENABLED` flips earlier than Day 14: trigger Email 5 immediately, skip remaining methodology emails (or send them as backfill 1 per week after).
- Hard unsubscribe at any time exits all sequences (legal requirement, CAN-SPAM).

## Performance Benchmarks to Aim For

- Email 1 open rate: 55%+ (welcome emails skew high)
- Average open rate across sequence: 30%+
- Click-through to methodology / pricing: 8%+
- Reply rate: 2%+ (founder-voice should generate replies)
- Free → Paid conversion within 30 days of Email 5: 4–8% (industry baseline for transparent-pricing SaaS)

## A/B Tests to Run Post-Launch

- Subject line A vs B on Email 1 (curiosity vs explanatory)
- "From: Garrett Baxley" vs "From: Garrett @ Galaxy Sports Edge"
- Email 5 with vs without explicit pricing in the body
- Sending Email 3 on Day 5 vs Day 7
- Adding a 6th email at Day 21 with "first calibration report preview" once the win-rate page opens
