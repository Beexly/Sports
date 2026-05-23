# Galaxy Methodology Page — Copy + Publication Framework

**Route:** `/methodology`
**Audience:** Public. Anyone who clicks through from `/board`, `/ledger`, `/loss-room`, `/passes`, or external press.
**Update cadence:** Continuous (minor) + quarterly (significant) + annual snapshot (frozen for Almanac).
**Brand role:** The most-linked Galaxy surface. Anchor for every other public surface.

**Voice:** Third-person Galaxy voice with structural precision. Less personal than Vault digests; more precise than the homepage.

---

## Page structure (final)

The methodology page has 9 sections in this order. Each section can be linked to directly via anchor (e.g., `/methodology#factor-model`).

---

## Section 1 — What this page is

```
Methodology

This page documents how Galaxy publishes. It updates continuously when the model changes. The year-end snapshot is frozen in the Galaxy Almanac.

What you'll find here:

01 — The factor model (how publications get computed)
02 — Confidence thresholds (when we publish vs pass)
03 — The publication process (slot to ship)
04 — The autopsy framework (how we walk through losses)
05 — The Pass List (why we archive games we don't publish)
06 — Calibration (whether our confidence numbers hold)
07 — Model versioning (the changelog, year-to-date)
08 — What this methodology cannot do
09 — Open questions
```

That's the table of contents. Each section follows.

---

## Section 2 — The factor model (how publications get computed)

```
01 — The factor model

Galaxy publishes calibrated probability assessments of sports outcomes.

The model is deterministic. Each publication is computed from a defined set of factors, each weighted by category. The output is a confidence number — the model's probability estimate that a specific outcome (a side covering a spread, a total going over or under) is correct.

Factor categories (current as of [date]):

— Category 1 (highest weight): Direct game-state factors. Team-level offensive and defensive efficiency, health-adjusted lineup quality, rest differential, travel.

— Category 2: Situational factors. Game script tendencies, second-half-of-series adjustments, role-changes from injury news, pace mismatches.

— Category 3: Market factors. Line movement vs sharp money signals, market efficiency at the relevant book, public vs sharp money split.

— Category 4 (smallest weight): Modifier factors. Weather (where relevant), referee tendencies, situational (revenge games, lookahead spots, must-win contexts).

The exact factor list — and the exact weight assigned to each — is documented internally but not published. The reason is competitive: publishing the weights would let competitors replicate the model without doing the work of validating it.

What we DO publish:
- The category each factor belongs to (1-4 above).
- The reasoning for each category's weight (which we explain in autopsies and digests).
- The model version every publication was generated under (linked to the changelog).
- The full list of factor names, even when weights are private.

What we DON'T publish:
- The specific numerical weights.
- Any factor we are still validating (these are tagged "experimental" internally and don't drive publications).
```

---

## Section 3 — Confidence thresholds

```
02 — Confidence thresholds (when we publish vs pass)

Galaxy publishes at:

— 60% confidence floor for standard publications.
— 65% confidence floor for mid-series publications (playoffs, multi-game contexts, situations where factor noise tends to compound).

Why these floors:

A 60% confidence threshold means: if Galaxy publishes 100 standard picks at 60% confidence and the model is calibrated, ~60 of them should win. Over a sufficient sample, that calibration check is verifiable. The 60% floor is high enough that publication is meaningful, low enough that Galaxy publishes more than once per week.

The 65% mid-series floor is empirically derived. In multi-game playoff contexts, factor noise tends to be higher (injury status changes, late-arriving lineup decisions, line movement reflecting public sentiment rather than model agreement). The higher threshold accommodates that additional noise.

A pass means:

When the model reaches a confidence below the relevant floor (after all factors have been weighed), Galaxy archives the game in the Pass List. The Pass List makes the discipline visible — every game we considered but did not publish, archived publicly.

A pass is not "Galaxy doesn't have a take." A pass is "Galaxy's take exists, but is below the threshold the discipline requires."
```

---

## Section 4 — The publication process (slot to ship)

```
03 — The publication process

A publication moves through five gates from slot to ship:

— Gate 1: Slot. The model surfaces a candidate game. Confidence above floor. Factor data quality acceptable.

— Gate 2: Factor verification. The dominant factors driving the publication are sanity-checked. (Example: if a publication depends on a player's availability, the latest official status is confirmed.)

— Gate 3: Cross-model sanity check. The publication is compared against the two external models Galaxy benchmarks privately. (External models are not "trusted as more correct" — they exist as a noise check. Disagreement above a defined threshold flags the publication for additional review.)

— Gate 4: Line-movement check. The current line on the publication's specific market is compared against the line at the time of factor computation. Significant movement triggers re-computation.

— Gate 5: Final operator review. Garrett reviews the candidate publication, considers any qualitative factor not in the model, and ships or passes.

The process takes 20-40 minutes per publication for standard slates. Mid-series publications take longer because Gates 2-4 require fresher data and Gate 5 considers more contextual variables.
```

---

## Section 5 — The autopsy framework

```
04 — The autopsy framework

Every settled losing publication receives a public autopsy in the Loss Room.

The autopsy isn't optional. It's the operating discipline that makes the rest of the work possible — because if losses aren't honestly examined, the model can't improve.

Each autopsy tags one of five root causes:

— Factor underweighted. The model had the right factor but didn't weigh it enough. The pattern across multiple "factor underweighted" autopsies indicates a structural fix needed in the next model version.

— Factor-interaction blind spot. The model had the relevant factors but didn't compose them correctly. Specific to multi-factor situations where each factor was reasonable in isolation but the combination produced misleading confidence.

— Sample-size noise. The publication was correct in process; the outcome was within the expected range of variance for a probability-based call. Not all 60% confidence calls win.

— Line-movement misread. The model's factor weighting was correct, but the line moved between factor computation and game start in a way that meaningfully changed expected value.

— Model-version known weakness. The model version that generated the publication had a known limitation that hadn't been fixed yet. The autopsy logs which version + what the limitation was + what the fix shipped in subsequent versions.

The Loss Room makes these autopsies public. Patterns across many autopsies feed back into the model changelog.
```

---

## Section 6 — The Pass List

```
05 — The Pass List

The Pass List archives every game Galaxy considered publishing and chose not to.

Reasons a game ends up on the Pass List:

— Confidence below the relevant floor.
— Confidence above floor but factor-quality concerns (e.g., late-arriving injury news that may shift the call).
— Confidence above floor but cross-model sanity check failed (Gate 3 above).
— Methodology change in flight that would affect this publication.

The Pass List is the publication discipline made visible. Most platforms don't publish the games they considered and rejected. Galaxy archives them so the discipline of saying no is auditable.

Pass List entries are compact. Each entry shows:
- The game.
- The model's confidence at the time of pass.
- The model version.
- The category of reason for the pass.
- (Optional) A short note if the pass is unusually instructive.

The Pass List doesn't include games the model didn't consider at all. Galaxy publishes 5 picks per day on average; the Pass List averages 10-20 entries per day, representing the games the model surfaced but didn't pass the publication gates.
```

---

## Section 7 — Calibration

```
06 — Calibration

Calibration is the check on whether Galaxy's confidence numbers mean what they claim.

If Galaxy publishes at 64% confidence and the model is calibrated, then 64% of publications at that confidence level should win. Across enough publications, this is verifiable.

Galaxy tracks calibration continuously. The current calibration band (rolling 6-month window):

[This section updates dynamically — placeholder for current data]

— Publications at 60-65% confidence: ___ % won. (Calibration: aligned / over / under.)
— Publications at 65-70% confidence: ___ % won. (Calibration: aligned / over / under.)
— Publications at 70-75% confidence: ___ % won. (Calibration: aligned / over / under.)
— Publications at 75%+ confidence: ___ % won. (Calibration: aligned / over / under.)

A calibration drift is when the actual hit rate moves away from the published confidence band. Drifts of more than 5 percentage points trigger investigation.

What calibration check tells us:
- Whether the model's confidence outputs are reliable predictions vs over- or under-confident.
- Where the model is strongest (sport, market, situation) vs where it's weakest.
- When a methodology change has actually improved outcomes vs when the change is within noise.

Calibration data is updated weekly on the Ledger page. The annual snapshot is frozen in the Galaxy Almanac.
```

---

## Section 8 — Model versioning

```
07 — Model versioning (the changelog, year-to-date)

The Galaxy model evolves. Every meaningful change to factor weighting or factor list ships as a new version.

Versions in 2026 [list updates as new versions ship]:

— V5.0 → V5.1 (shipped [date]): [Description of what changed and why.]
— V5.1 → V5.2 (shipped [date]): [Description.]
— V5.2 → V5.3 (shipped [date]): [Description.]

Per-version detail in [link to changelog page].

Why publish the changelog:
- A reader who is comparing Galaxy's confidence on a publication today vs a similar publication 6 months ago should know which model version generated each.
- The pattern across versions tells you what the model is learning — which factors get recurring attention, which categories are stable, which areas are still being figured out.
- Methodology versioning makes the rate of operational improvement auditable.

What a "minor" version change looks like:
- Factor weight adjustment within an existing category.
- New factor added to an existing category (with backtesting validation noted).
- Old factor removed (with explanation).

What a "major" version change looks like:
- New factor category added.
- Existing category retired.
- Confidence threshold revised.
- Cross-model sanity check process revised.

Major changes get accompanying digests in the public Galaxy publication stream + a Vault office hours discussion in the month they ship.
```

---

## Section 9 — What this methodology cannot do

```
08 — What this methodology cannot do

The methodology has limits. Some of them are structural; some are about Galaxy's specific operating choices.

Things the methodology cannot do:

— Predict any specific game's outcome. The model produces probability assessments, not predictions. A 68% confidence call doesn't predict a win — it estimates the probability of one.

— Detect changes the model hasn't been trained on. If a new rule, new player development, or new game-script pattern emerges that no factor weights against, the model will be silent on it until a methodology update accommodates the new context.

— Compensate for line movement after publication. Once Galaxy publishes a confidence number against a specific line, line movement in the next hour will not be reflected in that publication. The publication is dated to the line it was computed against.

— Provide game-by-game investment advice. Galaxy publishes calibrated probabilities for outcomes. What a reader does with that information is their own discipline. Galaxy doesn't issue betting advice.

— Replace independent judgment. Galaxy's model is one input. The reader's own factor model (or qualitative read of a game) may diverge. Both can be reasonable; the methodology doesn't claim authority.

What this methodology page is FOR:

— Audit. A reader can verify Galaxy's reasoning is structured and consistent over time.
— Trust calibration. A reader can decide whether Galaxy's process matches their own intuition about how a probabilistic sports analytics model should work.
— Critique. A reader who finds the methodology lacking can raise specific objections (in Vault Discord, in office hours, in email to Garrett directly).
```

---

## Section 10 — Open questions

```
09 — Open questions

Methodology is a living document. Some questions Galaxy doesn't have answers to yet:

— Whether confidence calibration holds across sport cycles. The model has more data for some sports than others. Calibration for sports with thinner data (NHL, college basketball outside major conferences) is still settling.

— Whether autopsy root-cause patterns are predictive or descriptive. We tag losses by root cause; whether these tags predict future losses or merely describe past ones is an open empirical question.

— Whether the 60% / 65% publication floors are the right numbers. They were chosen empirically from early operating data. Whether they remain correct as the model evolves is a question we'll re-examine annually.

— Whether the Cross-model sanity check (Gate 3 in the publication process) is improving or degrading calibration over time. The check rejects publications where Galaxy's model disagrees with two external models above a threshold. Whether this rule is helping or just consensus-biasing is a question for 2027 data.

These open questions appear in this page, the Vault advisory discussion, and the annual Galaxy Almanac. They are not unstated assumptions hidden under the methodology — they are documented limitations Galaxy is actively examining.
```

---

## Page-level interaction notes (for Codex engineering)

### Live updates

The methodology page surface should update dynamically for:

- **Section 6 (Calibration):** Pull current calibration band from the Ledger data. Update weekly.
- **Section 7 (Model versioning):** Pull current version list from the changelog. Update on every new version ship.
- **Section 9 (Open questions):** Manual update by Garrett quarterly.

All other sections are static + updated when Garrett pushes a substantial methodology change.

### URLs and anchors

- `/methodology` → root page.
- `/methodology#factor-model` → Section 2.
- `/methodology#confidence-thresholds` → Section 3.
- `/methodology#publication-process` → Section 4.
- `/methodology#autopsy-framework` → Section 5.
- `/methodology#pass-list` → Section 6.
- `/methodology#calibration` → Section 7.
- `/methodology#model-versioning` → Section 8.
- `/methodology#limits` → Section 9.
- `/methodology#open-questions` → Section 10.

External press, vault digests, and other Galaxy surfaces link to specific anchors when appropriate.

### Change log for the methodology page itself

Maintain a `/methodology/changes` sub-page that lists every revision to the methodology page (date + summary + diff link). This makes the page's evolution auditable in the same way the model versioning is.

---

## Publication framework — when to update what

### Continuous updates (Garrett edits)

- Factor names if a factor is added or removed from the model.
- Calibration data (auto-updated weekly from the Ledger).
- Recently shipped model versions appear in the changelog.

### Quarterly updates (substantial edits)

- Open questions section gets refreshed: which questions answered, which new questions surfaced.
- Factor category descriptions refined based on year-to-date pattern recognition.
- Cross-references to recent Vault office hours discussions where methodology was debated.

### Annual update (frozen for Almanac)

- December 31: methodology page is snapshotted. The snapshot becomes Chapter 5 of the Galaxy Almanac for that year.
- The live `/methodology` page continues to evolve in the new year, but readers can access prior snapshots via `/methodology/2025`, `/methodology/2026`, etc.

This versioning means a reader of a 2026 publication can always go back to the methodology page as it existed when the publication was made.

---

## What this page deliberately does NOT include

1. **No specific factor weights.** Galaxy's competitive moat depends on the weights not being copy-pasted by competitors.
2. **No "Galaxy is the most accurate" claims.** Calibration data speaks; marketing claims do not.
3. **No founder photo or personal background.** Method-led, not personality-led.
4. **No subscription CTAs.** Methodology page is a trust artifact; don't dilute it with conversion optimization.
5. **No comparison to specific competitor methodologies.** Galaxy doesn't position publicly against competitors; the methodology stands on its own.
6. **No predictions or forecasts.** The page describes how Galaxy publishes, not what Galaxy thinks will happen.

---

## Cross-references

- The Ledger (where settled picks live): `/ledger` page copy
- The Loss Room (where autopsies live): `copy/loss-room-page-copy.md`
- The Pass List (where passes live): `copy/pass-list-page-copy.md`
- The changelog (linked from Section 7): `/methodology/changelog` (Codex builds the page)
- The Almanac chapter 5 (frozen annual snapshot): `copy/almanac-production-pack.md`
- Brand voice rules: `galaxy-brand-voice-canonical.md`

---

*The methodology page is the load-bearing surface in Galaxy's brand position. The Loss Room, Pass List, and Ledger all reference back to it. Get this page right and every other public surface inherits credibility. Get it wrong and everything else needs to over-compensate.*
