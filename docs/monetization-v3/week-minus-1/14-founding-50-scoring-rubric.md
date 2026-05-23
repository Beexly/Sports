# Founding-50 Candidate Scoring Rubric

**Audience:** Garrett. Internal.
**Purpose:** The founding-50 selection framework (`week-minus-1/07-founding-50-selection-framework.md`) describes the qualitative criteria. The rubric below operationalizes those criteria into a 1-5 score per candidate so the cohort gets curated with discipline rather than gut feel.

**Status:** Pre-launch artifact. Used during the founding-50 candidate review phase (after customer dev, before invitations go out).

---

## How to use this rubric

For each candidate on the founding-50 long list (typically 80-120 names after customer dev), score across the 6 dimensions below. Each dimension is 1-5. Maximum score: 30. Minimum score: 6.

The rubric isn't a sorting algorithm — Garrett still makes final judgment calls. But the rubric forces deliberate trade-offs and surfaces the implicit weighting decisions that happen anyway.

---

## Dimension 1 — Brand-position alignment (weight: highest)

How aligned is this candidate with Galaxy's methodology + restraint + transparency posture?

| Score | Signal |
|---|---|
| 5 | Publicly critiques tout-certainty content; engages substantively with model methodology; explicit skepticism of black-box prediction marketing |
| 4 | Methodology-curious; serious about how forecasts get built; not primarily a pick-buyer |
| 3 | Sports-savvy but neutral on methodology vs marketing |
| 2 | Currently subscribes to tout-style services; sees Galaxy as one option among many |
| 1 | Tout-certainty buyer; engagement-bait reader; brand-position mismatch |

---

## Dimension 2 — Substantive engagement signal

Has this candidate already engaged substantively with Galaxy (or with similar methodology-led content) in observable ways?

| Score | Signal |
|---|---|
| 5 | Multiple substantive replies on Twitter / customer-dev interview produced 5+ usable quotes / written substantive critique |
| 4 | Multiple meaningful engagements; would qualify as "active reader" |
| 3 | Some engagement; clearly paying attention |
| 2 | Casual engagement; could be a passing follower |
| 1 | No observable engagement; only a name from a network intro |

---

## Dimension 3 — Honest skepticism

Will this candidate push back when Galaxy drifts? Founding-50 is a feedback layer, not a cheering section.

| Score | Signal |
|---|---|
| 5 | Has publicly critiqued Galaxy or similar platforms; willing to disagree substantively |
| 4 | Asked hard questions in interview; comfortable with disagreement |
| 3 | Engaged but mostly agreeable |
| 2 | Enthusiastic without pushback |
| 1 | Pure enthusiast; won't surface drift |

Note: this dimension intentionally rewards skepticism. Pure-enthusiast founding cohorts produce echo chambers, not signal.

---

## Dimension 4 — Public credibility (relative weight: lower)

Does this candidate have any public profile that compounds Galaxy's signal? Useful but not required.

| Score | Signal |
|---|---|
| 5 | Recognizable name in sports analytics / quant sports / sports media; would be a public co-sign |
| 4 | Active in relevant Twitter or substack circles; mid-tier public profile |
| 3 | Some public footprint; substantive comments visible |
| 2 | Largely private but knowledgeable |
| 1 | Fully private; would be invisible to Galaxy's audience |

This dimension is **deliberately low-weighted**. Founding-50 is about cohort quality, not marketing co-signs. A 1 here can still be a founding-50 member.

---

## Dimension 5 — Long-term renewal likelihood

Will this candidate likely still be in Vault at Year-2? Galaxy's founding cohort needs renewers, not one-year flyers.

| Score | Signal |
|---|---|
| 5 | Pays for premium sports content already; multi-year subscription history; treats sports content as ongoing investment |
| 4 | Has paid for similar content; renewal pattern suggests stickiness |
| 3 | First-time premium subscriber; intent positive but unproven |
| 2 | Likely to try Vault but uncertain on renewal |
| 1 | High flight risk; likely to cancel within Month 6 |

---

## Dimension 6 — Founding-relationship fit

Will this candidate honor the founding-50 dynamic (private advisory channel access, honest input, low-drama relationship)?

| Score | Signal |
|---|---|
| 5 | Demonstrated discretion in past contexts; respects gated content boundaries; substantive without being needy |
| 4 | Mature operator; would honor the channel norms |
| 3 | Likely to engage well but unproven |
| 2 | High-maintenance signal; might require disproportionate attention |
| 1 | Likely to drama-engage; potential brand-position liability |

---

## Aggregate scoring

For each candidate, sum the 6 dimensions for a raw score (6-30).

| Range | Interpretation |
|---|---|
| 25-30 | Tier 1: high-conviction founding-50 invitation |
| 20-24 | Tier 2: solid founding-50 candidate; invite if cohort has capacity |
| 15-19 | Tier 3: edge case; invite only if specific gap (sport / geography / perspective) needs filling |
| 10-14 | Not founding-50; welcome them at broader launch |
| <10 | Not invited; politely defer |

Target distribution for the 50 invitations:
- ~25 Tier 1
- ~20 Tier 2
- ~5 Tier 3 (deliberate fills for cohort balance)

---

## Cohort balance check

Beyond raw score, the founding-50 should be balanced across:

### Sport-following diversity

Aim for the cohort to represent multiple sports, not just NFL. Per `02-active-tracks.md`, Galaxy covers NFL, NBA, MLB, college football. A founding-50 that is 90% NFL-followers will skew feedback.

### Source diversity

Per `week-minus-1/13-founding-50-outreach-by-source.md`, mix sources:
- ~15 from customer-dev GO-signal interviewees
- ~10 from Twitter substantive engagers
- ~10 from warm-intro suggestions
- ~5 from existing professional relationships
- ~10 from public methodology rigorists

### Skepticism representation

At least 25% of the cohort should score 4 or 5 on Dimension 3 (honest skepticism). Pure-enthusiast cohorts produce drift.

### Public-profile representation

5-10 of the cohort should score 4 or 5 on Dimension 4 (public credibility) — useful for the brand-position signal — but the majority (40+) can score 1-3. Public profile is welcome, not required.

---

## What this rubric WON'T do

1. **Won't substitute for judgment.** The scores are inputs; the decision is Garrett's.

2. **Won't optimize for marketing.** The rubric weights brand-position fit highest, not public co-sign value.

3. **Won't apply to broader Vault cohort.** Broader Vault doesn't get rubric-screened. Only founding-50 gets this treatment.

4. **Won't be shared publicly.** The rubric is operational; the cohort is curated; the methodology is internal.

5. **Won't drive year-2 cohort selection.** Year-2 onboarding is broader Vault dynamics; the rubric retires at founding-50 close.

---

## Scoring workflow

For each candidate during the founding-50 review phase:

1. Open the candidate's record (interview notes, Twitter engagement, network context).
2. Score 1-5 on each dimension.
3. Note 1-sentence justification for any dimension scored 4 or 5.
4. Note 1-sentence concern for any dimension scored 1 or 2.
5. Tag with Tier 1 / 2 / 3 / not-founding-50.

Log in `templates/founding-50-candidate-scoring.csv`:

```
candidate_name,d1_brand,d2_engagement,d3_skepticism,d4_public,d5_renewal,d6_fit,total,tier,notes
Jane Doe,5,4,5,2,4,5,25,Tier 1,Methodology-rigorist; explicit GO signal in interview; might engage too lightly
John Smith,4,5,3,4,4,4,24,Tier 2,Active Twitter engager; pattern of premium sports content subscription; some enthusiasm concern
```

---

## When to invite below score threshold

In rare cases, invite a Tier 3 (score 15-19) candidate over a Tier 2 (score 20-24) candidate:

- Specific sport coverage gap (e.g., MLB underrepresented in the cohort).
- Specific geographic representation (international member adds perspective).
- Specific demographic representation that's missing.
- Specific skepticism profile that adds honest dissent.

These exceptions get a decision-log entry: DEC-NEXT-FOUNDING-COHORT-OVERRIDE-N. The override is documented; the reasoning is preserved.

---

## When to NOT invite at score threshold

A candidate scoring Tier 1 may still be passed over if:

- Brand-position interview surfaces a specific drift risk (e.g., they want Galaxy to be tout-content).
- Their public footprint conflicts with Galaxy's brand position (e.g., active sportsbook affiliate).
- Their renewal-likelihood pattern is fundamentally short-term (e.g., they've cancelled 5 premium services in 18 months).

These exceptions also get a decision-log entry: DEC-NEXT-FOUNDING-COHORT-PASS-N.

---

## Re-running the rubric mid-process

If founding-50 outreach is in flight and the cohort isn't filling (5-day check at Day -3 shows <20 conversions):

- Re-score Tier 2 candidates with a sharper eye on what's working in Tier 1 conversions.
- Lower the invite threshold if needed (Tier 2 floor of 18 instead of 20).
- Document the threshold change in a decision-log entry.

The rubric flexes. The cohort quality discipline doesn't.

---

## Cross-references

- Founding-50 selection framework: `week-minus-1/07-founding-50-selection-framework.md`
- Founding-50 outreach by source: `week-minus-1/13-founding-50-outreach-by-source.md`
- Customer dev sprint day-by-day: `week-minus-1/10-customer-dev-sprint-day-by-day.md`
- Decision-log entry templates: `week-minus-1/06-decision-log-entry-templates.md`
- Galaxy brand voice canonical: `galaxy-brand-voice-canonical.md`
- Vault advisory channel spec: `copy/vault-advisory-channel-spec.md`

---

*Founding-50 is the highest-leverage cohort selection in Year-1. The rubric forces deliberate trade-offs across brand-fit, engagement, skepticism, and longevity. The discipline is the curation; the cohort is the compounding asset.*
