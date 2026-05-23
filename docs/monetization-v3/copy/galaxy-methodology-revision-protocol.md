# Galaxy Methodology Revision Protocol

**Audience:** Garrett. Internal.
**Purpose:** Galaxy's factor model evolves. The methodology page is the public record of the model's current state. The protocol below specifies how revisions get made, documented, and communicated.

**Why this matters:** A methodology that quietly drifts is a methodology that loses members' trust. Documenting changes is the brand-position commitment in action.

---

## What counts as a "methodology revision"

### MAJOR revision (v.X to v.X+1)

Substantive change to the model's structure:
- New factor category added (e.g., adding a 5th category beyond the current 4).
- Existing factor category removed or fundamentally redefined.
- Calibration framework altered (e.g., bin boundaries changed).
- Confidence threshold changes (e.g., lowering the publication threshold below 60%).
- Sport coverage added or removed.

### MINOR revision (v.X.Y to v.X.(Y+1))

Refinement within the existing structure:
- Individual factor weight tuned by >10%.
- Factor weighting algorithm updated.
- Edge case handling refined (e.g., how injuries are classified).
- Performance metrics calculation changed.

### PATCH revision (v.X.Y.Z to v.X.Y.(Z+1))

Bug fix or minor calibration:
- Mathematical correction.
- Edge case handling fix.
- Tooling change (e.g., a data source switched).
- Documentation correction.

The current version is documented on galaxysportsedge.com/methodology + in the Almanac.

---

## When revisions get made

Galaxy's revision cadence is deliberately slow:

| Revision type | Cadence | Trigger |
|---|---|---|
| PATCH | As needed (bug fixes) | Mathematical errors, data anomalies |
| MINOR | Monthly review | Performance pattern, autopsy insights |
| MAJOR | Quarterly review | Cross-quarter trends, member feedback patterns, calibration drift |

The discipline: don't revise reactively. Revisions are evidence-based, documented, and brand-position-checked.

---

## The revision decision process

### Step 1: Pattern identification (across the relevant window)

Per `galaxy-quarterly-deep-audit-protocol.md`:

- What does the calibration data say across the window?
- What patterns appeared in the Loss Room autopsies?
- What patterns appeared in the Pass List?
- What member feedback signaled a structural issue?

A revision shouldn't be made without a pattern. Single autopsies don't trigger revisions; patterns do.

### Step 2: Hypothesis formulation

A specific change to the model. Documented as:

```
Current state: [exact factor weight or calibration parameter]
Proposed change: [exact new value or structure]
Reasoning: [the pattern + the model-theoretical justification]
Expected impact: [calibration improvement, Pass List rate change, etc.]
Worst-case impact: [downside risks]
```

### Step 3: Backtest

Apply the proposed change to historical data:
- 24-month look-back minimum.
- Calibration comparison: did the new weighting improve calibration across the period?
- Stability check: did the change introduce new edge case failures?

A revision doesn't ship without backtest validation showing improvement.

### Step 4: Brand-position check

The methodology revision must align with the brand position:

- Does the revision compromise transparency (e.g., adding a "secret sauce" factor that can't be published)?
- Does the revision introduce overfitting risk (e.g., adding many factors to chase recent performance)?
- Does the revision make the methodology more or less explainable?

If transparency or explainability is harmed: don't ship.

### Step 5: Decision-log entry

DEC-NEXT-MODEL-NNN entry per `galaxy-decision-rights-matrix.md`. The entry includes:

- The change (exact factor weight, structural change, etc.).
- The pattern that triggered the change.
- The backtest results.
- The expected calibration impact.
- The version bump (PATCH/MINOR/MAJOR).
- The effective date.
- Cross-references to autopsies that informed the change.

### Step 6: Implementation

For PATCH or MINOR revisions:
- Update the factor model code.
- Update the methodology page.
- Update the Model Journal (if substantive).
- No member communication unless requested.

For MAJOR revisions:
- All above, plus:
- Schedule the change for a calendar boundary (start of week, start of month).
- Communicate to Vault members ahead of time.
- Update the Almanac if revision happens before annual ship.

### Step 7: Post-implementation monitoring

For ~30 days after the revision:
- Track calibration daily.
- Flag any unexpected calibration drift.
- Document in the Model Journal what the revision actually produced.

If the revision performs worse than backtest predicted: triage. Don't roll back automatically; investigate first.

---

## Member communication for MAJOR revisions

```
Subject: A methodology update — Galaxy model v[N+1]

Hey [first name],

A note about a methodology change going live on [date].

What's changing:
- [Specific change in plain English]

Why:
- [Pattern that triggered the change]
- [Backtest result that supports it]

What stays the same:
- The published methodology page will be updated to reflect the change before the effective date.
- The factor categories don't change unless explicitly named above.
- The Loss Room + Pass List archive remain accessible.

What's expected to change in practice:
- [Specific operational change members might notice — e.g., calibration in a specific band, Pass List rate, etc.]

The decision log entry for this change is in the next Model Journal.

If you have questions, reply directly or post in #vault-feedback. The methodology change is the bet; the communication is the discipline.

— Garrett
```

### Why this email shape

- Specifies the change concretely.
- Explains the reasoning.
- References the documentation.
- Doesn't apologize or over-explain.

### What this email doesn't do

- Promise specific outcome improvements.
- Use marketing language.
- Hide the change behind generic "model improvements."

---

## What Galaxy does NOT do in revision

1. **No silent revisions.** Even PATCH-level changes get a decision-log entry.

2. **No "we ran better numbers in beta" reveals.** Revisions ship with documentation, not afterward.

3. **No factor weight tuning without backtest.** Every change validates against historical data.

4. **No reactive revisions to a single loss.** Loss Room autopsies inform patterns; patterns inform revisions; single autopsies don't trigger revisions.

5. **No "secret sauce" factors.** Every factor in the model is publicly documented + can be cited in autopsies.

6. **No proprietary calibration framework that members can't audit.** The calibration data + bin boundaries are public.

7. **No mid-revision pricing changes.** Pricing decisions per `copy/galaxy-vault-pricing-evolution-framework.md` are separate from methodology decisions.

---

## When the revision is rolled back

Rollback triggers:

- Post-implementation calibration is significantly worse than backtest predicted (e.g., calibration drift >5% from expected).
- Edge case failure that wasn't surfaced in backtest.
- Member feedback pattern that suggests the change harmed methodology clarity.

Rollback process:

1. Decision-log entry: DEC-NEXT-MODEL-ROLLBACK-NNN.
2. Revert to prior version.
3. Update methodology page.
4. Communicate to Vault members:

```
Subject: A methodology rollback — Galaxy model returning to v[N]

Hey [first name],

A note: the methodology revision (model v[N+1]) shipped on [date] is being rolled back to v[N], effective [date].

Why:
- [Specific reason — calibration drift, edge case failure, etc.]

What this means:
- The factor model returns to its pre-revision state.
- The methodology page is updated to v[N].
- The decision log entry documents both the revision + the rollback.

This is the discipline of the brand position. We don't pretend a revision worked when it didn't. The pattern that originally triggered the revision is still real; we'll investigate further before attempting another revision.

— Garrett
```

A rollback is not a failure. It's the operational expression of brand-position discipline.

---

## Methodology page updates

The methodology page at galaxysportsedge.com/methodology gets updated for every revision (PATCH or higher):

- Current version number.
- Date of last revision.
- Brief summary of what changed (1-2 sentences).
- Link to the relevant decision-log entry.
- Archive of previous methodology versions accessible.

The page is the canonical record. Even if a member doesn't subscribe to Vault, the methodology page tells them the current state.

---

## Loss Room ↔ revision linking

When a Loss Room autopsy directly influenced a methodology revision:

- The autopsy references the revision by version number.
- The revision's decision-log entry references the autopsy.
- The Model Journal narrates the loop.

This bidirectional linkage demonstrates the brand position: losses inform the model; the model evolves; the evolution is documented; members can audit the entire loop.

---

## Almanac methodology section

The annual Almanac includes a "methodology year" section covering:

- All revisions made during the year (PATCH, MINOR, MAJOR).
- The autopsy patterns that triggered each.
- The calibration impact of each.
- The aggregate calibration result for the year.

This is the most-substantive methodology documentation Galaxy publishes annually. Members can compare year-over-year evolution.

---

## What this protocol deliberately doesn't do

1. **No "model improvements" without specifics.** Every revision has a documented change.

2. **No marketing of methodology improvements.** Revisions ship quietly; the documentation is the record.

3. **No competitive comparison.** Galaxy's methodology evolves on its own logic, not in response to competitors.

4. **No "AI" framing for any revision.** Galaxy's brand position rejects AI-prediction marketing per `galaxy-ai-policy.md`.

5. **No member-vote on methodology decisions.** Members provide input; Garrett decides per `galaxy-decision-rights-matrix.md`.

---

## Versioning examples

Year-1 expected version evolution:

- **v2.0** — Launch state (methodology as designed in pre-launch). Documented in the methodology page at galaxysportsedge.com/methodology.
- **v2.1** — First MINOR revision around Month 3 (based on early calibration data).
- **v2.1.1** — PATCH around Month 4 (calibration edge case fix).
- **v2.2** — Second MINOR revision around Month 6 (Loss Room patterns surfaced).
- **v2.3** — Third MINOR revision around Month 10 (preparing for Year-2).
- **v3.0** — MAJOR revision around Year-2 launch (significant structural change, e.g., new factor category).

The exact cadence depends on what the data + autopsies reveal. The discipline is documented evidence, not arbitrary versioning.

---

## Cross-references

- Methodology page copy: `copy/methodology-page-copy.md`
- Methodology FAQ: `copy/methodology-faq.md`
- Model Journal template: `copy/model-journal-template.md`
- Loss Room page copy: `copy/loss-room-page-copy.md`
- Galaxy quarterly deep audit protocol: `galaxy-quarterly-deep-audit-protocol.md`
- Galaxy decision rights matrix: `galaxy-decision-rights-matrix.md`
- Galaxy AI policy: `galaxy-ai-policy.md`
- Vault feedback synthesis protocol: `copy/vault-feedback-synthesis-protocol.md`
- Almanac production pack: `copy/almanac-production-pack.md`
- Galaxy brand voice canonical: `galaxy-brand-voice-canonical.md`

---

*The methodology is the bet. Revisions to the methodology are the most-important decisions Galaxy makes. The protocol above ensures revisions are evidence-based, documented, brand-position-checked, and communicated. The discipline compounds.*
