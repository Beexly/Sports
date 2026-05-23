# Galaxy Year-End Annual Report — Template

**Status:** Template for Galaxy's free public annual report. Distinct from the Galaxy Almanac (paid, printed, 300 pages). The annual report is web-only, shorter, free, and serves as Galaxy's public year-end statement.

**Cadence:** Published December 31 of each year. The Almanac ships January 15. The annual report sets up the Almanac.

**Length:** ~2,500–3,500 words. Reads in 12–15 minutes.

**Author:** Garrett (founder-voice, "I"). Same register as the Vault digest, but written for a public audience.

**Where it lives:** `/annual-report/2026` permanent URL on galaxysportsedge.com. Linked from homepage for January, then archived under `/archive`.

---

## Why this document exists

Three reasons:

1. **Brand asset that compounds.** A free public year-end report from a sports research platform is rare. The first one signals the discipline. The fifth one is a recognized annual moment in sports analytics.
2. **SEO + discovery surface.** Long-form, dated, distinctive content with a clear author voice ranks well for "sports analytics annual report," "2026 sports betting research review," and similar queries.
3. **Almanac funnel.** Readers who land on the free annual report and find it valuable convert at meaningfully higher rates for the Almanac pre-order (paid, deeper).

---

## Structural template

The annual report has **eight sections** in this order. Section lengths are budgets.

### Section 1 — Opening note (~150 words)

Personal opening from Garrett. Sets the year in human terms before any data appears.

**Template:**

> 2026 was Galaxy's [first / second / third] full year of operations. I'm writing this report on December 31, knowing some of the year's data is still settling and some of the lessons haven't fully formed yet.
>
> This is the public version. The longer version — every settled pick, every loss with its autopsy, every game we considered and didn't publish, the full methodology snapshot at year-end — is the Galaxy Almanac, which ships January 15.
>
> What follows is the year, told plainly. I'm proud of some of it and embarrassed by some of it. Both belong here.

### Section 2 — What we published (~300 words)

Quantitative summary of the year's publication volume + headline outcomes.

**Template:**

> Total publications in 2026: [N]
> - NFL: [N]
> - NBA: [N]
> - MLB: [N]
> - NHL: [N]
> - College: [N]
> - Other: [N]
>
> Average daily publication volume: ~[N] picks/day (target: 5).
> Days with zero publications: [N] (typical: ~30 across the year).
>
> Publication outcomes (settled picks only):
> - Total settled: [N]
> - Wins: [N] ([N%])
> - Losses: [N] ([N%])
> - Pushes: [N] ([N%])
>
> Calibration check: of publications at 60–65% confidence, [N%] hit. Of publications at 65–70% confidence, [N%] hit. (The numbers should land within 5% of the confidence band.)

The calibration check is the most important sentence in the section. It's the only place Galaxy quantifies whether the confidence model actually works.

**What this section deliberately doesn't include:**
- Revenue numbers.
- Subscriber counts.
- Win-rate compared to historical or competitor benchmarks.

### Section 3 — What we passed on (~300 words)

The Pass List archive in summary form. This is the most uniquely-Galaxy section.

**Template:**

> Total games we considered and chose not to publish: [N]
> Reasons (multi-tag possible):
> - Confidence below 60% floor: [N]
> - Confidence above floor but factor-interaction concerns: [N]
> - Mid-series confidence below 65% threshold: [N]
> - Data quality concerns: [N]
> - Methodology change in flight: [N]
>
> The single pass that taught the most: [specific game]. We considered it at [X%] confidence. We passed because [specific reason]. What happened in the game: [specific outcome]. What we learned: [specific lesson — typically a factor-weighting refinement that fed into a model version that shipped later in the year].

The "single pass that taught the most" subsection is the heart of the year — surfaces Galaxy's operating philosophy through one concrete example.

### Section 4 — The losses (~400 words)

Aggregated insight from the Loss Room.

**Template:**

> 2026 losses by root-cause taxonomy:
> - Factor underweighted: [N]
> - Factor-interaction blind spot: [N]
> - Sample-size noise: [N]
> - Line-movement misread: [N]
> - Model-version-known-weakness: [N]
>
> The most expensive loss of the year (by impact on calibration): [specific game]. [2–3 sentences on what happened.]
>
> The most informative loss of the year (by what it taught the model): [specific game — usually different from the above]. The factor we hadn't been weighting properly was [specific factor]. The model version that incorporated the fix is [version number, in the changelog].
>
> Losses we don't have a clean autopsy for yet: [N]. These are losses where the model's reasoning failure isn't fully reconstructable from the available data. Working hypothesis: [brief]. We'll keep watching the pattern in 2027.

The honest acknowledgment of un-autopsied losses is rare in sports analytics. It earns trust because most operators don't admit to it.

### Section 5 — What changed in the model (~400 words)

The changelog narrative.

**Template:**

> 2026 model versions:
>
> - V[X.X] → V[X.X+1] (shipped [date]): [brief description of what changed and why].
> - V[X.X+1] → V[X.X+2] (shipped [date]): [brief description].
> - [continue for each version]
>
> The biggest rethink of the year: [specific version]. We had been [specific approach] for [duration]. The data through [month] showed [specific pattern]. The fix changed [specific factor-weighting] in [specific way]. Verification: the next [N] publications using the new weighting calibrated within [X%] of the model's confidence numbers.
>
> Versions that, in retrospect, mattered less than expected: [specific version]. The change moved factor weights for [factor]. Outcomes through year-end suggest the prior weighting was within noise of the new weighting; we can't confidently say the change improved outcomes. The improvement was theoretically motivated; we'll keep watching.
>
> Versions we're considering for 2027: [brief 1-sentence each, no commitments].

This section is the changelog as story. Reading it should give a reader a feel for how Galaxy thinks about iteration.

### Section 6 — What 2026 didn't teach us (~300 words)

The single most brand-aligned section. Acknowledges the limits.

**Template:**

> Some things 2026 didn't teach us:
>
> 1. Whether Galaxy's confidence calibration holds across sport cycles. We have one football season of NFL data, half a season of NBA data, and partial coverage of MLB and NHL. The calibration check in Section 2 covers the aggregate; we don't yet know whether sport-specific calibration is converging or diverging. 2027 will produce data on this.
>
> 2. Whether autopsy patterns are predictive or descriptive. We tag losses by root cause; the pattern across 2026 shows [specific frequency distribution]. We don't yet know whether these patterns repeat or whether they're an artifact of the year's specific events. 2027 will help differentiate.
>
> 3. Whether the restraint discipline scales. [If Vault exists] Vault hit [N members] in 2026. Whether the publishing-restraint model scales beyond the founding cohort is still an open question. 2027 will produce the data.
>
> Three more open questions:
>
> 4. [specific to year — to be filled by Garrett]
> 5. [specific to year]
> 6. [specific to year]
>
> If you read Galaxy's content regularly and have your own open questions about how we operate, the Almanac (shipping January 15) has the supporting essays that go deeper. The Vault Discord (members-only) has the live conversation.

The "what we don't know" section is rare in sports analytics. It's also the single section that does the most for Galaxy's positioning against competitors.

### Section 7 — The year's brand position note (~200 words)

A brief, personal reflection on whether the brand position held under pressure.

**Template:**

> Galaxy operates under explicit restraint. We cap publication volume at ~5/day. We publish our losses with autopsies. We publish the games we considered and didn't publish.
>
> In 2026, that discipline held [or: drifted in [specific way and how we corrected]]. I don't say "the discipline held" as a celebration — restraint is the bet, not the win. But the artifacts are still in place: the Loss Room exists, the Pass List archived [N] games, the methodology page received [N] documented changes.
>
> Where the discipline almost broke: [specific moment if there was one — e.g., "in March, after [N] consecutive losses, I drafted a defensive blog post explaining why the model was right anyway. I deleted it before publishing. It would have violated the brand position. The autopsy on the relevant losses is in the Loss Room."]
>
> Where the discipline served us: [specific moment — e.g., "in October, multiple subscribers asked us to add NHL coverage. We declined for 2026 because we didn't have the factor model verified at sufficient calibration. The decision-log entry is dated October 15."]

This section makes the restraint discipline VISIBLE. Most years it's invisible.

### Section 8 — Closing note + Almanac CTA (~150 words)

**Template:**

> Thank you for reading.
>
> If this report was useful, the deeper version is the 2026 Galaxy Almanac — every settled pick, every loss with autopsy, every pass archived, methodology snapshot at year-end, model changelog, and [N] supporting research essays. Hardcover $99, digital $39. Ships January 15. Pre-order at galaxysportsedge.com/almanac.
>
> If you're a subscriber: thanks. The work compounds because you keep reading it.
>
> If you're not: this report is the public version of what we do every week. The site is at galaxysportsedge.com.
>
> See you in 2027.
>
> — Garrett
> Galaxy Sports Edge
> December 31, 2026

---

## What this report deliberately does NOT include

1. **No subscriber growth charts.** Galaxy doesn't measure itself by subscriber count publicly.
2. **No revenue or financial information.** Galaxy is bootstrapped and private.
3. **No competitive comparisons.** Galaxy positions through its own work, not against others.
4. **No funding announcements or fundraising intent.** Galaxy is not raising in 2026.
5. **No hiring updates or team-building announcements.** Galaxy is single-operator V1.
6. **No "outlook" predictions for 2027.** Galaxy doesn't predict. The report is the year captured, not a forecast.
7. **No bragging about specific wins.** Wins are in the Ledger. The annual report includes them as data, not narrative.
8. **No apologies for specific losses.** Losses are in the Loss Room. The annual report includes them as data, not regret.
9. **No "lessons learned" inspirational framing.** Galaxy voice rejects this register.
10. **No founder personal story.** The annual report is about Galaxy's year, not Garrett's year.

---

## Production timeline for the annual report

The annual report is built in November–December of each year. The Almanac is built across Q3–Q4. Different documents, different timelines.

**Annual report production:**

- **November 1:** Garrett pulls aggregate data from Galaxy's database (settled picks, losses, passes, methodology versions). Codex's admin cockpit auto-generates Section 2 + parts of Section 3 + Section 5 numbers.
- **November 15:** Garrett drafts Sections 1, 6, 7, 8 (the editorial sections).
- **November 30:** Full draft assembled. Brand-safety scanner pass.
- **December 15:** Final read. Copyeditor review (if engaged).
- **December 31, 09:00 AM Eastern:** Annual report published at galaxysportsedge.com/annual-report/2026. Twitter/X announcement. Email to all subscribers.

**Effort:** ~15–20 hours of Garrett's time, mostly editorial. Auto-generated data sections require minimal additional work.

---

## Marketing for the annual report

Free public document. Light marketing.

- **December 31 send:** Email to all Galaxy subscribers with link to the report.
- **December 31 Twitter:** Single tweet thread with the URL + 1 paragraph teaser.
- **Vault Discord announcement:** In #vault-announcements (read-only channel), 1 paragraph.
- **No paid promotion. No PR cycle.** The annual report finds its audience through the year-end timing + the SEO + the subscriber list.

Each year's report links to all prior years' reports. The compounding archive is the marketing.

---

## What the annual report sets up

The annual report → Almanac pre-order conversion is the marketing path.

Readers who land on the free annual report and find it valuable see the Almanac CTA at the end. The conversion expectation:

- ~5–8% of annual report readers click the Almanac CTA.
- ~30–40% of clicks convert to Almanac pre-order.

Math: 10,000 annual report readers × 6% click × 35% convert = ~210 Almanac pre-orders attributable to the annual report.

If the annual report is read by 100,000+ readers (achievable by Year 3 with SEO compounding), the funnel scales.

---

## Cross-references

- The Almanac (deeper paid version): `copy/almanac-preorder-positioning.md` + `copy/almanac-production-pack.md`
- Almanac headline essay specimen: `copy/almanac-year-in-review-essay-specimen.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- Galaxy operating values: `galaxy-operating-values.md`
- Decision log (where the year's documented decisions are sourced): `templates/decision-log.md`

---

*The annual report is the year captured in a free-and-public form. The Almanac is the year captured in a paid-and-printed form. Both serve the same brand position: Galaxy publishes what it computes, and the record is the product. Build the report well; the archive becomes one of Galaxy's most durable brand assets over years.*
