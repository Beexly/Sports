# Galaxy Methodology FAQ

**Route:** `/methodology/faq`
**Audience:** Public. Anyone with a deeper question about Galaxy's methodology that the main methodology page doesn't directly answer.
**Voice:** Galaxy. Functional. Precise.
**Update cadence:** New questions surface in Vault office hours + Vault feedback. Quarterly review pulls 1-3 new questions into this page.

---

## Page header

```
Methodology FAQ

Questions about Galaxy's methodology that come up regularly. The main methodology page at /methodology covers the framework; this page covers the questions readers ask after they've read it.

If your question isn't answered here: garrett@galaxysportsedge.com. Worth answering for the room means it probably ends up on this page next quarter.
```

---

## Q1 — Why don't you publish the exact factor weights?

```
The factor weighting is the work. Publishing the exact numerical weights would let other models replicate Galaxy's reasoning without doing the validation that earned the weights.

What we DO publish:
- The factor categories (1-4 by importance).
- The list of factors in each category.
- The model version each publication was generated under.
- How the weights evolve in our public changelog.

What we DON'T publish:
- The specific numerical weight assigned to each factor.
- Any factor we're still validating (these are tagged "experimental" internally and don't drive publications until we trust them).

Some readers ask whether this is honest. The answer is: yes. Galaxy's brand position is transparency about what we did, not transparency about how we computed it. The Loss Room shows every losing call with the factor that drove it. The Pass List shows every game we considered and didn't publish. The methodology page documents the full process at the category level. The exact weights stay private; everything else stays public.
```

---

## Q2 — How do you know your confidence numbers are calibrated?

```
We check.

The calibration test is straightforward: publications at 60% confidence should win 60% of the time over a long enough sample. Publications at 70% should win 70%. And so on.

We compute calibration in rolling 6-month windows + per-sport + per-confidence-band. The data is at /methodology#calibration.

The honest read: calibration improves over time but never reaches "perfect." We've seen drift of 3-7 percentage points in specific bands. We document the drift; we ship model versions to address it; we keep watching.

The quarterly data review (Vault members only) goes deeper on calibration drift. The public version lives on the methodology page.

If a band is consistently over-confident or under-confident: that's data we use, not data we hide.
```

---

## Q3 — How is "process beats outcome on horizon" not just an excuse for losses?

```
Fair question.

The distinction matters because Galaxy publishes calibrated probabilities, not predictions. A 60% confidence call should hit 60% of the time. The 40% of the time it doesn't hit, the loss isn't a failure — it's the expected variance.

If Galaxy were claiming "every 60% call wins," then losses would be excuse-making.

What Galaxy IS saying:
- The publication threshold (60% / 65% mid-series) is the discipline.
- Over a sample of N publications, the actual hit rate should match the published confidence band.
- A specific loss is a data point; the pattern across many losses is the signal.

What Galaxy is NOT saying:
- "We don't care about wins."
- "Losses are fine because the model is calibrated."
- "Members shouldn't track our actual record."

The Ledger shows the actual record. The Loss Room explains the losses. The Pass List shows what we didn't publish. The calibration data verifies whether the methodology is producing what it claims.

Process beats outcome over the horizon. Not as a slogan. As a measurable claim.
```

---

## Q4 — Why 60% confidence as the floor, not 55% or 65%?

```
60% is the floor we landed on empirically. The reasoning:

At 55%: too close to coin-flip. The publication discipline degrades; members can't reasonably differentiate a publication from a guess.

At 65%: too restrictive. Galaxy would publish ~2 picks/week instead of ~5/day. The brand position depends on publishing enough that the methodology can be validated; too restrictive defeats the calibration check.

At 60%: enough above-floor to be meaningful (the model is making a real call) but enough above-baseline to support 5/day publication volume.

The mid-series floor at 65% reflects that mid-series factor noise is higher (per the autopsy taxonomy). The 5-percentage-point gap accommodates the additional variance.

Whether 60% is the right floor for Year 2 is an open question. We'll know more after another 12 months of calibration data.
```

---

## Q5 — How do you decide which factors to add or remove from the model?

```
Three triggers:

1. Autopsy patterns. If a factor we're underweighting shows up in 5+ losses tagged "factor underweighted" over a quarter, the next model version increases the weight (or adds a sub-factor that captures the interaction).

2. Calibration drift. If a specific factor band shows calibration that's been off-target for 2+ quarters, we investigate whether the factor is mismeasured or unstable.

3. Member feedback. Vault advisory channels surface factor proposals from members. If 3+ independent members raise the same factor concern, it gets evaluated.

Whether a proposed factor enters the model:
- It must be measurable at publication time (not after-the-fact).
- It must add information not already captured by existing factors.
- It must pass a 6-week backtest before going live.
- Its weight starts at category-4 (smallest) and may be increased over time if performance justifies.

Whether a factor leaves the model:
- If it's been low-impact for 3+ quarters (its inclusion or exclusion doesn't change calibration).
- If its data source becomes unreliable.
- If the model can compute the same signal from other factors.

Factor changes are tracked in the model changelog. Major changes get a Vault digest. The annual Almanac includes a chapter on the year's changelog.
```

---

## Q6 — Why do some publications take 30-40 minutes to generate?

```
Each publication runs through 5 gates:

Gate 1: Slot. The model surfaces a candidate game.
Gate 2: Factor verification. Dominant factors are sanity-checked against latest data.
Gate 3: Cross-model sanity check. The publication is compared against two external models we benchmark privately.
Gate 4: Line-movement check. Current line is compared against the line at factor computation.
Gate 5: Final operator review. Garrett reads the candidate publication, considers any qualitative factor not in the model.

Each gate adds time but reduces error.

The 30-40 minute timeline is mostly Gates 2 + 5. Gate 2 requires pulling the latest injury data, lineup confirmations, etc. Gate 5 requires Garrett's actual attention; he doesn't rubber-stamp.

The alternative — faster publication, fewer gates — would be "the model surfaced this, we shipped it." That's what most platforms do. Galaxy doesn't.

The publication time is the discipline. Publications surface faster on quieter sports days when fewer factors need verification.
```

---

## Q7 — How is the model evolving over time? Is the latest version always best?

```
The model evolves. Whether each new version is "best" is something the data tells us months later.

Galaxy ships model versions when:
- Autopsy patterns suggest a structural fix is needed.
- Calibration drift indicates a factor weighting is off.
- A new factor passes backtest validation.
- An existing factor needs to be retired or restructured.

Each new version has a hypothesis: "this change will improve calibration in [specific band]."

After the new version ships, we watch:
- Did calibration improve in the targeted band?
- Did calibration worsen in any other band?
- Did autopsies show fewer instances of the targeted pattern?

If the hypothesis holds (calibration improves): the version stays.
If the hypothesis doesn't hold: the version stays anyway, but the next version may revert or restructure the change.
If the hypothesis catastrophically fails (calibration worsens): the version is rolled back via emergency revert.

Catastrophic rollbacks are rare. We've shipped 4-7 versions in 2026; one minor revert in a sub-factor.

The model is not perfectly improving over time. It's improving on the dimensions we're targeting, sometimes with regressions on dimensions we weren't watching. The changelog is honest about both.
```

---

## Q8 — Why do you have a Pass List but not a "considered but rejected" log for autopsies?

```
The Pass List exists because the publication threshold is the discipline. Galaxy considers many games per day; publishes ~5; passes the rest. The Pass List makes the publication-decision-process auditable.

The autopsies don't have an equivalent "considered but rejected" structure because:

1. Every loss gets an autopsy. There's no "considered" loss that doesn't get one.

2. The autopsy classifies losses into 5 root-cause tags. Different from a binary publish/pass decision; an autopsy is a forensic reconstruction.

3. Some autopsies do get re-examined later. If a new model version shows that the original autopsy's root-cause tag was incorrect, we update the autopsy with a note explaining the re-examination. We don't delete or hide the original; we annotate.

So the structure differs:
- Pass List = comprehensive log of unpublished considerations.
- Loss Room = comprehensive log of losses with autopsy + re-examination annotations.

Both serve the same brand-position purpose: making the operating discipline auditable. Different structures because the underlying decisions are different.
```

---

## Q9 — Can you verify that the model is deterministic?

```
Yes - within limits.

The factor model is deterministic. Given the same input data and the same model version, the same publication is computed. The confidence number comes from factor weights, thresholds, and operator review gates documented on the methodology page.

You can verify this externally:
- The methodology page documents the factor categories.
- Each publication carries its model version (linked to changelog).
- Calibration data is publicly tracked.
- The Loss Room shows how losing publications are reconstructed after settlement.
- The Pass List shows where the model surfaced a game and Galaxy declined to publish.

That does not mean a reader can reproduce the exact number from the public page alone. The exact factor weights stay private. It does mean the number comes from a defined model, not from a vibes-based write-up after the fact.
```

---

## Q10 — Has Galaxy ever published a methodology change you regretted?

```
Yes. The autopsy taxonomy revision in [date if Garrett has shipped one] adjusted how root-cause tags were assigned. We initially expected the new taxonomy to surface 30-40% more patterns; in practice it surfaced patterns at roughly the same rate, suggesting the previous taxonomy was already capturing most signals.

The revision wasn't a mistake — it was a more rigorous structure. But the expected impact didn't materialize. We documented this in the model changelog and Vault digest.

Specifically what we'd do differently:
- The pre-revision data we used to forecast impact was thinner than we treated it.
- The taxonomy should have been backtested over 12+ months of data before shipping.
- We should have shipped the new taxonomy in shadow mode (running both old + new in parallel) for 6 weeks before fully replacing the old.

These are operational improvements that ship in the next major revision. The decision-log entry from that period captures the full reasoning.

In a broader sense: methodology changes are bets. We don't regret making them; we regret the bets we didn't validate carefully enough. The Loss Room exists in part to surface those regrets.
```

---

## Q11 — Why does Vault use a 30-day refund window?

```
Vault has a 30-day refund window (per `/vault` landing). Members who decide Vault isn't a fit within 30 days get a full no-questions-asked refund.

Beyond 30 days, refunds are case-by-case (see Vault FAQ on the landing page).

We don't extend the refund window to 60 or 90 days because:
- Vault is an annual product. The commitment is the offer.
- A 60-90 day refund window incentivizes "try-it-and-leave" behavior that drains founder time without producing committed members.
- The 30-day window is generous enough that members who genuinely don't fit can exit cleanly.

Galaxy does not frame the refund policy as a promise of satisfaction or outcome. It is a clean exit window for members who realize Vault is not the right fit.

For members who hit specific Galaxy issues (technical access failure for ≥7 days, personal hardship, etc.) outside the 30-day window: we evaluate refunds case-by-case. The bar is genuine impact, not buyer's remorse.
```

---

## Q12 — How does Galaxy handle when the model and Garrett's gut disagree?

```
Gate 5 of the publication process is Garrett's review. If Garrett's qualitative read disagrees with the model:

Step 1: Document the disagreement. What does the model say? What does Garrett's gut say? What's the specific factor the disagreement is about?

Step 2: Default to the model. Galaxy is built on the deterministic factor model. If the model's reasoning is sound and Galaxy can't articulate a specific factor the model is missing, Galaxy publishes per the model.

Step 3: Capture the disagreement for autopsy. If Garrett's gut was right (the model was wrong), the post-game autopsy tags the factor that was missed.

Step 4: Consider methodology update. If Garrett's gut repeatedly catches things the model misses, the model needs the factor that Garrett is implicitly considering. Add it to the next model version.

The risk we're managing: Garrett's gut sometimes overrides good model reasoning with poor judgment. The discipline of defaulting to the model + capturing disagreements is what prevents that.

The risk we're NOT managing: Garrett's gut being right when the model is wrong. We don't try to be the operator who's right; we try to be the operator who has the model that surfaces what we should reason about.

Office hours sometimes surface this question. It's an honest open part of the methodology.
```

---

## What this FAQ deliberately doesn't include

1. **Hot-take responses to specific competitor methodology critiques.** Galaxy responds via demonstration, not argument.

2. **Detailed factor weighting examples.** The methodology page covers categories; the FAQ covers process. Specific weights stay private.

3. **Marketing-style answers.** Each Q&A is functional. No "Galaxy makes the best research available" phrasing.

4. **Member-specific responses.** This is a public FAQ. Member-specific questions go to garrett@galaxysportsedge.com.

5. **Predictions about future model performance.** Galaxy doesn't predict.

---

## Cross-references

- Methodology page (the framework this FAQ extends): `copy/methodology-page-copy.md`
- Loss Room (where autopsies live): `copy/loss-room-page-copy.md`
- Pass List (the sibling discipline-visible surface): `copy/pass-list-page-copy.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`

---

*This FAQ is a living document. New questions surface in Vault office hours + Vault feedback channel; the most frequent get added here. Quarterly review pulls 1-3 questions from member discussion into this page.*
