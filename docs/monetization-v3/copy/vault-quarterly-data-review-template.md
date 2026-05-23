# Vault Quarterly Data Review — Template

**Cadence:** Once per quarter. Delivered Day 75–80 of each quarter.
**Format:** PDF (~20 pages) + 30-minute recorded walkthrough video.
**Audience:** Vault members only. Gated by `vault-member` role.
**Distinct from:** Year-end annual report (free, public, web-only) AND Galaxy Almanac (paid, printed, annual). The quarterly review is the deepest internal-data artifact Galaxy publishes; it goes to paying members only.
**Effort:** ~25 hours of Garrett's time per quarter.

---

## Why the quarterly data review exists

The quarterly review surfaces internal calibration and methodology evolution that doesn't belong on public Galaxy surfaces. Reasons it stays member-only:

1. **Competitive moat protection.** Per-quarter calibration drift data + specific factor-weighting experiments are competitive intelligence. Public would let competitors reverse-engineer the model.
2. **Member value delivery.** Vault members paid $200/year specifically for depth. The quarterly review is the headline depth artifact. Without it, the value proposition weakens.
3. **Operating discipline forcing function.** Producing the quarterly review forces Garrett to do internal-data work that would otherwise drift. The cadence keeps the methodology honest.

---

## Structural template

Each quarterly review has 8 sections in this order. Section lengths are budgets.

### Section 1 — Quarter at a glance (~2 pages)

```
[Q] [Year] Quarterly Data Review

Vault members only · [Date sent]

Quarter at a glance:

- Total publications: [N]
- Settlement breakdown: [N wins / N losses / N pushes]
- Aggregate confidence-band calibration: [aligned / over / under]
- Total passes: [N]
- New model versions shipped: [N + version numbers]
- Most expensive autopsy of the quarter: [single sentence reference]
- Most instructive pass of the quarter: [single sentence reference]
- Major methodology change: [if any, single sentence]

This document is for Vault members. Don't share outside the channel. The full discussion happens at the next office hours.

— Garrett
```

This is the elevator-summary page. A member who reads only this page gets the headline of the quarter.

### Section 2 — Calibration deep-dive (~3 pages)

Per-confidence-band calibration data. This is the most rigorous section.

```
Calibration by confidence band

| Band | N publications | Hit rate | Expected | Drift |
|---|---:|---:|---:|---|
| 60-65% | [N] | [N%] | 62% | [aligned/over/under] |
| 65-70% | [N] | [N%] | 67% | [aligned/over/under] |
| 70-75% | [N] | [N%] | 72% | [aligned/over/under] |
| 75%+ | [N] | [N%] | 78% | [aligned/over/under] |

Calibration commentary:

[2-3 paragraphs interpreting the data. Honest about what the calibration suggests.

Example: "Q1's 60-65% band hit at 64%, which is the calibration band but is sample-size noisy at N=23 publications. The 65-70% band hit at 69% — the model is calibrated in this band, which is the band where most mid-series publications land. The 70%+ band hit at 71%; below expected but the sample (N=11) is small enough to be variance. We'll watch.

Compared to the prior quarter: [improvement/degradation/stable].

The honest read: the model is calibrated in the 65-70% band where most publications land. Calibration in the lower band (60-65%) is suggestive but not yet sample-sized enough to claim confidently. Calibration in the upper band (70%+) is mildly under-performing but within noise."]

Sport-specific calibration:

| Sport | N | Hit rate | Notes |
|---|---:|---:|---|
| NFL | [N] | [N%] | [1 line] |
| NBA | [N] | [N%] | [1 line] |
| MLB | [N] | [N%] | [1 line] |
| NHL | [N] | [N%] | [1 line] |
| College | [N] | [N%] | [1 line] |

[Sport-specific commentary if any sport is meaningfully off-band.]
```

This section is what members will quote externally (with permission) when they explain to non-members why Vault was worth $200/year.

### Section 3 — Factor performance (~3 pages)

Which factors carried the publications this quarter? Which factors disappointed?

```
Factor performance review

The dominant factors in this quarter's publications (by frequency of being the primary driver):

1. [Factor name + category]: appeared as primary driver in [N] publications.
   - Hit rate when this factor was primary: [N%]
   - Commentary: [1-2 lines]

2. [Factor name]: [N] publications.
   - Hit rate: [N%]
   - Commentary.

3. [Factor name]: [N] publications.
   - Hit rate: [N%]
   - Commentary.

[Continue for top 5-7 factors.]

Factors that disappointed this quarter:

[List 2-3 factors that produced losses or drove publications into the autopsy taxonomy as "factor underweighted." Explain why each disappointed and what the model is watching.]

Factors that surprised this quarter:

[List 1-2 factors that performed better than expected and might warrant increased weighting in the next model version.]

Note on disclosure: We name factor categories and qualitative observations here. We do NOT name specific weight values, even for Vault members. The competitive moat is the weight structure; depth of explanation does not require revealing weights.
```

### Section 4 — Autopsy patterns (~3 pages)

What patterns emerged across the quarter's autopsies?

```
Autopsy patterns this quarter

[N] settled losses tagged by root cause:

| Root cause | Count | % of losses |
|---|---:|---:|
| Factor underweighted | [N] | [N%] |
| Factor-interaction blind spot | [N] | [N%] |
| Sample-size noise | [N] | [N%] |
| Line-movement misread | [N] | [N%] |
| Model-version known weakness | [N] | [N%] |

Patterns observed:

1. [Recurring factor underweighting pattern]: [2-3 sentences. Specific factor name + how often it appeared + whether the next model version addresses it.]

2. [Factor-interaction blind spot pattern, if applicable]: [Specific to multi-factor situations.]

3. [Sample-size noise distribution]: [Whether the noise band is consistent with calibration expectations.]

The autopsy of the quarter:

[2-3 paragraphs on the single autopsy that taught the model the most this quarter. Specific game, specific factor, specific lesson. Link to the public Loss Room entry.]

What we changed in response to autopsy patterns this quarter:

[List model-version changes that originated in autopsy synthesis. Link to changelog entries.]
```

### Section 5 — Pass List patterns (~2 pages)

Restraint discipline check.

```
Pass List patterns this quarter

[N] passes total this quarter. Distribution by category:

| Category | Count | % |
|---|---:|---:|
| A — Below confidence floor | [N] | [N%] |
| B — Factor quality concern | [N] | [N%] |
| C — Cross-model disagreement | [N] | [N%] |
| D — Methodology change in flight | [N] | [N%] |
| E — Line-movement disagreement | [N] | [N%] |

Hindsight calibration of passes:

Of [N] passes this quarter, [N%] would have been wins if published. The expected rate for passes (which are below-threshold confidence calls) is somewhere around 45-55%. We're at [N%], which is [in-band / below / above].

If significantly above 55%, the publication floor may be miscalibrated upward (we're holding back too much). If significantly below 45%, the publication floor is doing exactly what it should.

Commentary on the hindsight calibration:

[1-2 paragraphs. Honest assessment of whether the floor is right. If a floor adjustment is shipping in the next quarter's methodology, link it here.]

The pass of the quarter:

[2-3 paragraphs on the single most instructive pass of the quarter. Specific game, specific reason, specific outcome, specific lesson.]
```

### Section 6 — Model version evolution (~2 pages)

The quarter's changelog narrative.

```
Model versions shipped this quarter

— V[X.X] → V[X.X+1] (shipped [date]): [2-3 sentences. What changed and why.]

  Verification:
  - First 15 publications under v[X.X+1] calibrated at [N%] confidence band hit rate.
  - Autopsies under v[X.X+1] showed [pattern compared to v[X.X]].
  - Open question: [if any].

— V[X.X+1] → V[X.X+2] (shipped [date]): [Same structure.]

[Continue for each version shipped this quarter.]

Model versions in flight for next quarter:

[List planned changes for the next quarter. Brief descriptions. No commitments.]

The biggest rethink of the quarter:

[2-3 paragraphs on the most consequential methodology change of the quarter — typically a factor weight refactor or a structural addition. What we believed before. What the data changed. What the new methodology assumes.]
```

### Section 7 — Open questions (~2 pages)

The "what we still don't know" section. Brand-aligned content.

```
Open questions

Some questions the quarter did not answer:

1. [Specific open question]: [2-3 sentences. What we hoped to learn. What we actually learned. What's still unclear.]

2. [Specific open question]: Same.

3. [Specific open question]: Same.

[Continue for 3-5 questions.]

Questions Vault members raised this quarter that influenced methodology thinking:

[List 2-3 specific Vault Discord conversations or office-hours questions that fed into model decisions. Credit by member with explicit permission OR anonymized ("A Vault member raised in March...").]

Questions for next quarter:

[List 2-3 things Garrett is specifically watching for in Q[Q+1] data.]
```

This section is the highest-value Vault-exclusive content. The honest unknowns earn member trust at depth.

### Section 8 — Office hours pre-load (~1 page)

The bridge to the live conversation.

```
At the next office hours

I want to walk through [specific topic from this review] in more depth. The conversation I'm most ready for is [specific question].

Specifically, I'd value pushback on:

— [Specific claim or interpretation from this review]
— [Specific methodology change consideration]
— [Specific open question]

Office hours: [date], 8pm Eastern, Discord stage in #vault-office-hours.

If you can't attend live, the recording stays available in the channel. Replies in #vault-feedback or DM also welcome before then.

— Garrett · [Date sent]
```

---

## Recorded walkthrough video (30 min)

After the PDF is sent, Garrett records a 30-minute walkthrough video for Vault members. Format:

1. **Opening (3 min):** Brief intro. "This is the Q[X] data review. I'm going to walk through it section by section. Should run about 30 minutes. The PDF is sent; this video adds verbal context."

2. **Quarter at a glance (3 min):** Read Section 1 aloud with light commentary.

3. **Calibration deep-dive (8 min):** This is the section with the most data + most reader-friction. Walk through the calibration table slowly. Explain each band's hit rate. Be honest about what's in-band vs out.

4. **Factor performance (5 min):** Walk through the top 3 dominant factors. Brief on the disappointers and surprises.

5. **Autopsy + pass patterns (5 min):** Highlight 1 autopsy + 1 pass from the quarter. Explain why each is instructive.

6. **Open questions (4 min):** The "what we don't know" section. Read each open question. Add 1-2 sentences of contextual commentary on why each is open.

7. **Closing (2 min):** "That's the review. Office hours [date]. Drop questions in #vault-feedback before then if you want depth on anything specific. Thanks for being in Vault."

### Recording technical notes

- Single take preferred. Galaxy voice is conversational; if there's a stumble, leave it.
- No flashy visuals. Screen-share the PDF with cursor highlighting. That's it.
- Garrett's voice + face on camera. Founder-led editorial surface; "I" pronoun.
- Save as `vault-quarterly-review-Q[N]-2026.mp4` in Vault channel.
- Don't post on public YouTube. Vault-only.

---

## Production timeline (per quarter)

Day 50 of each quarter: begin data work.
Day 60: factor performance + autopsy patterns analyzed.
Day 65: calibration data finalized.
Day 70: PDF drafted (~80% complete).
Day 75: PDF final + sent to Vault members.
Day 78–80: recorded walkthrough video posted.

Total Garrett effort: ~25 hours over 4 weeks.

If the timeline slips: ship 1 week late + post in #vault-announcements explaining why. Don't skip a quarter; the cadence is the discipline.

---

## What this template deliberately does NOT include

1. **No specific factor weight values.** Even for Vault members. Brand-position-protective.
2. **No subscriber growth data.** Galaxy's Vault doesn't measure itself by member count externally. Quarterly review is methodology-focused, not business-focused.
3. **No competitor comparisons.** Galaxy's quarterly data review doesn't reference Outlier or other competitors. Brand position is method-led, not against-led.
4. **No outlook or predictions for next quarter.** Galaxy doesn't predict.
5. **No subscription pricing reflections.** Vault price is settled. Quarterly data doesn't argue for pricing changes.
6. **No member-specific analytics.** The data is aggregate. Galaxy doesn't surface "how member X engaged" data even to that member.

---

## Drift patterns to watch for

### Drift 1: Quarterly review gets shorter as quarters compound

After 3-4 quarters, the temptation is to produce a shorter, faster review. Members notice.

**Counter:** stick to the 20-page target. If a section is light, surface it explicitly ("Section 5 is shorter this quarter because there were no methodology changes worth elaborating") rather than padding.

### Drift 2: Calibration table becomes performative

The calibration data starts looking suspiciously consistent. The numbers always land in-band. The honest read suggests selective interpretation.

**Counter:** the hindsight calibration check (Section 5) and the publication-band check (Section 2) can catch each other. If both consistently look great, audit raw data carefully.

### Drift 3: Open-questions section gets formulaic

The "what we don't know" section starts repeating the same 3 questions across multiple quarters.

**Counter:** retire any open question that's been on the list for 4+ quarters without progress. Either answer it (decision-log entry) or admit Galaxy isn't equipped to answer it (different decision-log entry).

---

## Cross-references

- Methodology page (the framework this measures): `methodology-page-copy.md`
- Loss Room (where autopsies referenced here live): `loss-room-page-copy.md`
- Pass List (where passes referenced here live): `pass-list-page-copy.md`
- Vault PRD (data model for the review): `product/vault-prd.md`
- Vault digest template (related cadence): `copy/vault-digest-template.md`
- Office hours playbook (where the live discussion happens): `copy/vault-office-hours-playbook.md`
- Year-end annual report (free public sibling): `copy/galaxy-year-end-annual-report-template.md`
- Almanac (paid annual sibling): `copy/almanac-production-pack.md`

---

*The quarterly data review is Vault's deepest internal artifact. Members paid $200/year to see it. Members compare across quarters to track Galaxy's evolution. Members reference quarters years later when methodology questions resurface. Build each quarter like it'll be re-read for 5 years.*
