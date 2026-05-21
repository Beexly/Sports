# Galaxy Sports Edge — 30-Day Launch Campaign Plan

**Author:** Garrett Baxley, founder.
**Cadence:** Day 0 (today) → Day 30 (Calibration Report open).
**Mode:** Silent collection. No paid acquisition until Day 21.
**North star:** 500 free signups + first 25 paid conversions by Day 30.

This plan integrates with the email sequence (`docs/email-sequences/welcome-flow.md`), the
social-day playbook (`social/launch-day.md`), and the gate model in `apps/web/lib/feature-gates.ts`.

---

## Objectives & success metrics

| Pillar | Day-7 target | Day-30 target |
|---|---|---|
| Free signups | 75 | 500 |
| Email open rate (welcome flow) | 50%+ | 40%+ (decay-normalized) |
| Settled canonical signals | 25 | 100+ |
| Paid conversions (Pro/Elite) | n/a (paywall off) | 25 |
| MRR | $0 | ~$600 |
| X followers | 30 | 200 |
| Threads followers | 30 | 200 |
| Founder DMs received | 5 | 30 |

The *real* metric is **calibration readiness**: enough settled signals to publish a defensible
win-rate on Day 30. Everything else is a leading indicator.

---

## Audience & ICP

**Primary persona — "The Disillusioned Bettor"**
- 28-45, college-educated, $80k+ income.
- Has paid for a tout service or capper before; lost money; angry at the lack of transparency.
- Sports fan first, bettor second.
- Buys software products (Notion, Linear, Vercel, Bloomberg Terminal).
- Reads sharp Twitter accounts but knows half of them are vibes.
- *What they want:* defensible reasoning, not vibes.

**Secondary persona — "The Quant-Curious"**
- 25-40, technical (engineer / data scientist / analyst).
- Wants to understand HOW models work.
- Will spend hours reading methodology pages.
- Skeptical of black-box AI claims.
- *What they want:* model transparency, factor breakdowns, calibration data.

**Anti-persona — "The Lock Hunter"**
- Wants "today's best pick guaranteed."
- Cares about the prediction, not the process.
- Will churn after one losing weekend.
- *We don't sell to this person.* The brand voice should actively repel them.

---

## Channel mix

| Channel | Weight | Role | Owner |
|---|---|---|---|
| X (@GalaxySportsAI) | 35% | Real-time thoughts, methodology threads, response to industry news | Founder |
| Threads (@galaxysportsedge) | 20% | Longer takes, founder voice, philosophy posts | Founder |
| Email (HQ → subscribers) | 25% | Welcome sequence + Calibration Report alert | Triggered |
| Founder DMs / direct outreach | 10% | First 25 paid customers will come from here | Founder |
| Search / SEO (organic) | 5% | Long-tail "transparent sports picks" / "anti-tout" queries | SEO basics done |
| Blog | 5% | Methodology deep-dives, weekly Friday recap once published | Founder |

**Explicitly NOT in the mix for the first 30 days:**
- Paid social (Facebook/X ads) — no track record to defend yet
- Affiliate / sponsorship deals — same reason
- Press outreach — wait until Day 30 when Calibration Report opens
- Reddit promotion — too high noise-to-signal for cold launch
- TikTok / YouTube — content production cost outweighs early reach

---

## Week-by-week content calendar

### Week 1 — Launch & methodology (Days 1–7)

**Day 1 (Mon — TODAY)**
- 6:00 PM CT — Round 1 launch post (all four platforms — X done, Threads done, IG/FB pending asset)
- Email: welcome flow Email 1 fires on first signup
- Founder-voice X reply to anyone who replies

**Day 2 (Tue)**
- 10:00 AM — Quote-graphic: "Find the signal before the market moves." (X + Threads)
- 6:00 PM — Round 2 methodology teaser (all four)
- Email: welcome flow Email 2 (Day-2 cadence)

**Day 3 (Wed)**
- 10:00 AM — Behind-the-scenes carousel: "what ingesting market data actually means" (IG + FB)
- 2:00 PM — X thread: "5 things tout services do that I refuse to" (5-7 posts)

**Day 4 (Thu)**
- 6:00 PM — Round 3 five operating principles (all four)
- Founder personal DM outreach: 10 sharp bettors I know personally, "I built this, would love your eyes on it"

**Day 5 (Fri)**
- 10:00 AM — Single-line truth bomb: "I don't publish a record I can't back. That's the whole point." (X + Threads)
- 5:00 PM — Friday recap thread on X: "Week 1 — what shipped, what I learned"

**Day 6 (Sat) — game-day**
- 12:00 PM — Galaxy IQ deep dive carousel (IG + FB)
- 3:00 PM — Live observation thread on X (real-time line movement commentary)

**Day 7 (Sun) — game-day**
- 9:00 AM — Week-1 recap email to subscriber list ("here's what shipped, what's coming")
- 8:00 PM — Single post reflecting on the day's slate

### Week 2 — Trust building (Days 8–14)

**Daily cadence:** one X post + one IG/Threads post + one founder reply round.

Themes for the week:
- **Mon:** "What I built when I lost money on a tout" (founder origin story)
- **Tue:** "How a signal becomes a pick" — annotated screenshot
- **Wed:** "The 4 gates" deep-dive thread
- **Thu:** "Why Eclipse Lock isn't what you think it is"
- **Fri:** "Friday recap — settled signals so far, what the model got right and wrong"
- **Sat:** Live slate commentary
- **Sun:** Variance education — "a 64% confidence signal still loses 36 times in 100"

Day 14 milestone: `PUBLIC_PICKS_ENABLED=true` flips. Signal Feed opens publicly.
- Send welcome flow Email 5 (board-open alert) to all subscribers.
- Pin "The board is open" post on X.

### Week 3 — Conversion preparation (Days 15–21)

The board is open. Now the goal is converting Free → Pro/Elite.

**Daily cadence:** one feature/value post + one social proof seeding post + one founder DM round (15 people/day to anyone who's been actively replying).

Themes for the week:
- **Mon:** "Inside the Signal Feed" — what Free shows vs Pro
- **Tue:** "Show your work" — a deep-dive on one specific published signal's factor trail
- **Wed:** "Why I'm charging $19 instead of $99" — pricing philosophy
- **Thu:** "I'd rather you cancel than complain" — refund policy as a feature
- **Fri:** "Week 3 recap — first paid subscribers + what I'm learning"
- **Sat:** Live slate commentary with Eclipse Lock callouts
- **Sun:** Variance recap — the week's losses, framed honestly

Day 21 milestone: First paid conversion target hit (~10 paid customers).

### Week 4 — Calibration & first proof (Days 22–30)

**Daily cadence:** one calibration teaser + one customer-quote (with permission) + one variance lesson.

Themes:
- **Mon:** "100 settled signals coming up — here's what I'll show you"
- **Tue:** "The factors that mattered most in Week 3" — model meta-analysis
- **Wed:** Walking through one Pro customer's first month
- **Thu:** "What I'll publish when the Calibration Report opens"
- **Fri:** "Week 4 recap — calibration prep, paid milestone"
- **Sat:** Live commentary
- **Sun:** Variance recap

Day 30 milestone: `PERFORMANCE_STATS_ENABLED=true` flips when ≥100 settled signals exist.
- Major announcement post (all four channels).
- Email blast to subscriber list: "The Calibration Report just opened."
- Press outreach begins (small list of sharp-bettor podcasts + Action Network / Athletic).

---

## The 5 message pillars (use these across ALL channels)

1. **Show your work.** "If I can't explain why, I don't publish."
2. **Wait for the data.** "Performance stats stay gated until they're honest."
3. **No locks.** "Variance is described, not hidden."
4. **One person.** "I built this because I was tired of paying for picks people can't back."
5. **Calibration over conviction.** "A 64% signal still loses 36 of 100. That's the whole point."

Every post should ladder to ONE of these five pillars. If a draft post doesn't ladder, rewrite or kill it.

---

## Banned moves

- Don't post a "lock of the day" — even framed as a joke
- Don't promise outcomes ("this is going to win")
- Don't quote any number (win-rate, ROI, accuracy) until the Calibration Report opens
- Don't pay for "growth hacks" (follower buying, engagement pods)
- Don't auto-DM new followers
- Don't post engagement bait ("comment 🔥 if you want this")
- Don't engage with tout drama or call out specific competitors by name

---

## Risks & contingencies

| Risk | Probability | Mitigation |
|---|---|---|
| Slate clears the readiness gate before Day 14 | Medium | Ship the public picks early; pull welcome Email 5 forward |
| Major losing signal in Week 2 | High | Pre-write the variance education post; lean into it |
| Tout-service operator attacks the brand publicly | Low | Don't engage. Stay on message. The methodology page is the response |
| Vercel build breaks before Round 2 | Low | Keep the social posts brand-asset-only on those days; defer site-driven content |
| Anthropic API outage | Low | Blog content engine pauses; queue posts pre-written |
| Calibration Report doesn't have 100 settled signals by Day 30 | High | Page stays "Collecting." Sequence Email 5 holds. No fake deadline. The brand survives missing the date — it cannot survive publishing a number that isn't honest |

---

## Tracking & ops

**Weekly dashboard (Garrett, Sunday evenings):**
- Free signups this week vs target
- Paid conversions this week vs target
- Top-3 organic posts by reach
- Founder DM count (sent + received)
- Settled signals count vs Calibration Report threshold
- One open question to resolve next week

**Tools used:**
- Vercel Analytics (free) for site traffic
- X / Threads / IG native analytics for social
- Postmark/Resend dashboard for email open rates
- Stripe Dashboard for paid conversion + MRR
- Notion or a single Google Sheet for the weekly review log

**No paid analytics tools** in the first 30 days. Free-tier tooling is sufficient.

---

## Day-by-day checklist (printable)

Print this. Tape it next to the monitor. Check off each day.

```
WEEK 1
[ ] Day 1: Round 1 launch (X ✓ Threads ✓ IG TBD FB TBD)
[ ] Day 2: Quote-graphic + Round 2 methodology teaser
[ ] Day 3: BTS carousel + "5 things tout services do" thread
[ ] Day 4: Round 3 principles + 10 founder DM outreach
[ ] Day 5: Truth bomb + Friday recap thread
[ ] Day 6: Galaxy IQ carousel + live slate observation
[ ] Day 7: Week-1 recap email + Sunday post

WEEK 2 (Trust building)
[ ] Day 8: Founder origin story
[ ] Day 9: Annotated signal screenshot
[ ] Day 10: 4 gates deep-dive thread
[ ] Day 11: Eclipse Lock explainer
[ ] Day 12: Friday settled-signals recap
[ ] Day 13: Live slate commentary
[ ] Day 14: Variance education + BOARD OPENS

WEEK 3 (Conversion)
[ ] Day 15: Free vs Pro comparison
[ ] Day 16: One specific signal's factor trail
[ ] Day 17: Pricing philosophy post
[ ] Day 18: Refund policy as feature
[ ] Day 19: Week-3 recap + first paid milestone
[ ] Day 20: Live slate + Eclipse Lock callouts
[ ] Day 21: Variance recap

WEEK 4 (Calibration)
[ ] Day 22: "100 settled signals" teaser
[ ] Day 23: Factors that mattered most
[ ] Day 24: One Pro customer's first month
[ ] Day 25: What I'll publish at calibration open
[ ] Day 26: Week-4 recap + paid milestone
[ ] Day 27: Live commentary
[ ] Day 28: Variance recap
[ ] Day 29: Calibration prep update
[ ] Day 30: CALIBRATION REPORT OPENS + press outreach
```

That's the plan. Now go run it.
