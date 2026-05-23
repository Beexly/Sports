# Galaxy Short-Form Script Bank

**Status:** Internal R&D. Draft-only.
**Related decision:** DEC-NEXT-018
**Pairs with:** `audit/galaxy-short-form-content-lab-rd.md`, `copy/galaxy-synthetic-host-policy.md`, `templates/short-form-content-drafts.csv`

---

## Decision log entry

### DEC-NEXT-018 - Seed artifact-based short-form scripts before visual generation

**Decision:** Galaxy will build the first short-form test from script drafts sourced from existing Galaxy artifacts before generating any host image, voice, or video.

**Rationale:** Text is the cheapest place to catch brand drift. If the scripts feel wrong, visual production will only make the wrongness more expensive.

**Guardrail:** These scripts are internal drafts. Public posting requires the synthetic-host policy gate, current platform-policy review, and Garrett approval.

---

## Source artifacts used

- Sample Loss Room autopsies: `copy/galaxy-sample-loss-room-autopsies.md`
- Sample Pass List entries: `copy/galaxy-sample-pass-list-entries.md`
- Methodology page: `copy/methodology-page-copy.md`
- Sample Model Journal: `copy/galaxy-sample-model-journal-entry.md`

The examples below use illustrative sample content, not live Galaxy records.

---

## Script 1 - Loss Room: Playoff weighting

**Series:** Loss Room in 30 seconds
**Host profile:** Desk analyst
**Source:** Sample Autopsy 1
**CTA:** Loss Room

```
Galaxy filed a sample autopsy on Bills-Chiefs.

The publication was Bills minus 3.5 at 70 percent confidence. It lost.

The useful part is the factor that failed: playoff-specific red-zone data was not weighted enough, and the line-movement read treated public movement as sharp signal.

That is what the Loss Room is for.

Not an apology. A record.
```

**Review note:** Replace with live autopsy URL before public use.

---

## Script 2 - Loss Room: Star-player load

**Series:** Loss Room in 30 seconds
**Host profile:** Domestic-lifestyle explainer
**Source:** Sample Autopsy 2
**CTA:** Loss Room

```
This sample loss is Nuggets-Spurs.

Galaxy published Nuggets minus 5.5 at 62 percent confidence. Denver won by 2 and did not cover.

The model saw the active roster. What it missed was cumulative minute load.

That is a personnel factor, not a vibes explanation.

The autopsy turns the miss into a model question.
```

**Review note:** Good first private visual test because it explains a concrete factor without betting hype.

---

## Script 3 - Loss Room: Variance loss

**Series:** Process versus outcome
**Host profile:** Desk analyst
**Source:** Sample Autopsy 3
**CTA:** Loss Room

```
Some losses do not produce a model revision.

The sample Dodgers-Pirates autopsy is that kind of loss.

Galaxy had Dodgers moneyline at 68 percent confidence. The inputs were sound. The 32 percent outcome happened.

That is not satisfying. It is probability.

The record still gets filed.
```

**Review note:** This is the cleanest "Galaxy is not a win celebration account" clip.

---

## Script 4 - Pass List: Below the floor

**Series:** Why We Passed
**Host profile:** Field correspondent
**Source:** Sample Pass List Entry 1
**CTA:** Pass List

```
Galaxy held Lakers-Warriors in the sample Pass List.

The model surfaced Warriors minus 2.5 at 54 percent confidence.

That is below the publication floor.

A 54 percent read may be a take. It is not a Galaxy publication.

The Pass List is where that restraint leaves a record.
```

**Review note:** Strong opener for explaining the Pass List without needing a current slate.

---

## Script 5 - Pass List: Market efficiency

**Series:** Why We Passed
**Host profile:** Desk analyst
**Source:** Sample Pass List Entry 2
**CTA:** Pass List

```
The model can be above the confidence floor and still not publish.

In the sample Chiefs-Ravens entry, Galaxy surfaced 67 percent.

But the line had already settled into a heavily traded market number. The model's implied gap was too small.

When the market and methodology already agree, Galaxy does not manufacture a publication.
```

**Review note:** Needs careful language around "edge" because brand rules reject the term as sales copy.

---

## Script 6 - Pass List: Personnel uncertainty

**Series:** Why We Passed
**Host profile:** Domestic-lifestyle explainer
**Source:** Sample Pass List Entry 3
**CTA:** Pass List

```
Sometimes the model does not calculate confidence at all.

In the sample Eagles-Cowboys entry, the personnel inputs were unresolved: quarterback injury, receiver status, offensive-line questions.

Personnel is load-bearing in NFL games.

When that input cannot be trusted, the rest of the model does not get to pretend.

Galaxy holds.
```

**Review note:** Good "kitchen table explainer" format.

---

## Script 7 - Methodology: Confidence floor

**Series:** Methodology Minute
**Host profile:** Desk analyst
**Source:** Methodology page
**CTA:** Methodology

```
Galaxy publishes at a confidence floor.

Standard publications need to clear 60 percent. Mid-series publications need to clear 65 percent.

Below the floor, the game goes to the Pass List.

That does not mean Galaxy had no read.

It means the read did not clear the discipline.
```

**Review note:** Can point directly to `/methodology#confidence-thresholds`.

---

## Script 8 - Methodology: Calibration

**Series:** Methodology Minute
**Host profile:** Desk analyst
**Source:** Methodology page
**CTA:** Methodology

```
Calibration is the check on whether Galaxy's confidence numbers mean what they claim.

If enough 64 percent publications settle, roughly 64 percent should be correct.

Not every call. The band.

That is why the Ledger, Loss Room, and Pass List all matter.

They are the record the number has to survive.
```

**Review note:** Avoid adding chart visuals until real calibration data is live.

---

## Script 9 - Model Journal: Pass List hindsight

**Series:** Model Journal excerpt
**Host profile:** Domestic-lifestyle explainer
**Source:** Sample Model Journal
**CTA:** Model Journal

```
A Pass List entry that wins after the game does not become a missed publication.

The question is not whether the held call would have won.

The question is whether it cleared the methodology at the time.

If one category keeps winning after the fact, that becomes a model question.

Not a regret log.
```

**Review note:** Strong candidate for X video because it can stand alone.

---

## Script 10 - Model Journal: Market convergence

**Series:** Model Journal excerpt
**Host profile:** Desk analyst
**Source:** Sample Model Journal
**CTA:** Model Journal

```
The sample Model Journal asks a hard question.

If more holds are market-efficient, is the market simply sharper that week, or is Galaxy's model becoming less differentiated from the market?

Both can be true.

That is why the Journal exists.

Not to announce certainty. To document the question.
```

**Review note:** Use only if the linked Model Journal exists publicly.

---

## Script 11 - Almanac bridge

**Series:** Almanac Desk
**Host profile:** Desk analyst
**Source:** Almanac framing across v3 pack
**CTA:** Almanac

```
The public site keeps moving.

The Almanac freezes the year.

Every publication. Every loss. The passes worth carrying forward. The methodology changes that survived the record.

Not a yearbook.

The annual record.
```

**Review note:** Hold until Almanac activation.

---

## Script 12 - Live bridge

**Series:** Live Overlay Demo
**Host profile:** Field correspondent
**Source:** Live PRD
**CTA:** Partner inquiry

```
Galaxy Live is not a louder pick graphic.

It is the method on screen: confidence band, factor context, model version, and restraint notes inside a broadcast layout.

The overlay only works if it makes the reasoning visible.

That is the product.
```

**Review note:** Hold until a real overlay demo exists.

---

## First six internal drafts

Use these for Week 1 of the Content Lab:

1. Script 1 - Playoff weighting.
2. Script 2 - Star-player load.
3. Script 3 - Variance loss.
4. Script 4 - Below the floor.
5. Script 7 - Confidence floor.
6. Script 8 - Calibration.

Private visual test candidates:

1. Script 2 - Domestic-lifestyle explainer.
2. Script 8 - Desk analyst.

These two test whether the synthetic host helps comprehension without becoming the center of the content.

---

## Rejection triggers

Reject or rewrite any script that:

- Starts with a game hype hook.
- Uses outcome-promise language.
- Describes a host instead of an artifact.
- Mentions a competitor.
- Adds sports commentary not present in the source artifact.
- Turns a loss into an apology.
- Turns a pass into a regret.
- Routes viewers to checkout before a proof surface.

---

*The clip is the door. The artifact is the proof.*
