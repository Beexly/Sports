# Concept-Axis Coverage — the measured gradeable population

**Measured:** 2026-10-20T08:09Z · **Branch:** `dev-lit-vectors-2026-10`
**Code:** `audit/reconciliation-2026-10-20` @ `ce9073f64`
**Machine-readable:** `reconciliation/concept_axis_coverage.json`
**Reproduce:** `node reconciliation/measure_concept_axis_coverage.mjs`
**Resolver:** `packages/prediction-engine/src/literature/literature-measures.ts`
(the real module — this script imports it, so the numbers are the numbers
the code produces, not a re-derivation of them)

---

## 0. The finding

**The concept axis works, and it works on 201 premises — not the 128 I
estimated, and not the 5,224 the corpus contains.** The gap is dominated
by one refusal reason, and that reason points at the single biggest
lever left in the literature programme.

| | count | share of 5,509 |
|---|---:|---:|
| live premises | 5,509 | 100% |
| **resolved to a measure** | **201** | **3.6%** |
| …and `claim_type` in {correlational, causal} | **74** | 1.3% |
| refused: `conditional_direction` | **4,540** | **82.4%** |
| refused: `no_measurable_tag` | 693 | 12.6% |
| refused: `no_context_tags` | 75 | 1.4% |

**The live index numbers and the corpus numbers agree exactly** (201
resolved, 74 correlational/causal) — which is the check that the indexer
copies the corpus's contexts and directions faithfully.

---

## 1. The `conditional` label is uninformative — and that is the lever

**88.2% of the corpus (4,540 of 5,149) carries
`influence_direction: "conditional"`. And NOT ONE of them carries a
condition:**

| | count |
|---|---:|
| premises with `influence_direction = 'conditional'` | 4,540 |
| …with `parsed_threshold_value` set | **0** |
| …with `conditional_threshold` set | **0** |
| …with `parsed_threshold_operator` set | **0** |

**So the extractor labelled 88% of the corpus "conditional" and then
extracted no condition for any of them.** The label says "this claim
depends on something" and the something is not recorded.

**This is why the resolver refuses 4,540 premises**, and the refusal is
correct: a conditional claim with no condition cannot be evaluated.

**But the lever is large.** Of the 4,540 conditional premises, **878 have
a measurable context.** If the condition were extracted for them, the
gradeable population would go from **201 to 1,079** — a 5.4× increase,
from a corpus-construction fix rather than a code change.

| population | count |
|---|---:|
| premises with a measurable context | 1,079 |
| …of which `+`/`-` direction (gradeable today) | **201** |
| …of which `conditional` with **no** condition (blocked on extraction) | **878** |

**This is the highest-value remaining work on the literature side, and it
is now precisely specified:** the corpus already carries the evidence
quote for all 5,149 records, the concept name for all 5,149, and the
domain for all 5,149. What is missing is the *condition* — the threshold
at which the claim switches on.

### 1a. The `conditional` label is a keyword-miss FALLBACK, not a classification

**This was located in the extractor, and it changes the fix.**
`scripts/build-grounded-mind-corpus.mjs:101-111`:

```js
export function determineInfluenceDirection(text) {
  if (/(?:suppress|decay|penalty|drop|loss|deficit|fatigue|blame|under|adverse|drag|slow|compress)/i.test(text)) {
    return "negative";
  }
  if (/(?:boost|improve|gain|advantage|increase|positive|synergy|burst|efficiency)/i.test(text)) {
    return "positive";
  }
  return "conditional";     // <-- FALLBACK
}
```

**`"conditional"` here means "neither regex matched."** It is not a
semantic classification. And the three threshold fields are **hardcoded
`null`** in both record shapes (`:1051-1053`, `:1158-1160`) — the
extractor was never built to extract a condition.

**MEASURED CONFIRMATION** — re-running the extractor's own two regexes
over each record's own retained text:

| | count |
|---|---:|
| records marked `conditional` | 4,540 |
| …**neither regex hits the record's own text** (pure fallback) | **4,383 (96.5%)** |
| records marked `+`/`-` whose own text has NO keyword | 103 |

**96.5% of the "conditional" label is a keyword miss, not a stated
condition.** (The extractor ran over the FULL source document, which is
not retained, so 96.5% is a LOWER BOUND.)

**So the cheapest fix is not threshold extraction at all — it is
re-classifying the direction from the premise's semantics.** A premise
that says "route separation increases receiving production" is
`positive` whether or not the word "increase" appears. **If the
semantics do not determine the direction, the record stays
`conditional` — and the resolver's refusal is then correct.**

Staged as `staged_improvements/09-extract-the-condition.md`.

---

## 2. The direction distribution

| direction | records | share |
|---|---:|---:|
| `conditional` | 4,540 | 88.2% |
| `negative` | 312 | 6.1% |
| `positive` | 297 | 5.8% |

**Only 609 records (11.8%) carry a usable sign.** Cross-tabulated
against claim type:

| claim_type | conditional | positive | negative |
|---|---:|---:|---:|
| `theoretical` | 4,032 | 205 | 208 |
| `correlational` | 411 | 56 | 50 |
| `causal` | 97 | 36 | 54 |

**A `theoretical` premise with a `+`/`-` direction is still gradeable
directionally.** "Decoding Defensive Coverage via Factorized Attention"
asserts a direction about coverage; that is a measurable association
whether or not the paper called it a correlation. **So the 201, not the
74, is the real gradeable population** — the 74 is the subset that is
*also* labelled correlational or causal, which is the subset worth
looking at first.

---

## 3. Which measures actually get used

| measure tag | premises | surface | proxy? |
|---|---:|---|---|
| `coverage` | 70 | `NextGenStat.avgCushion` | **yes** — no coverage column exists |
| `tracking` | 68 | `NextGenStat.avgSeparation` | **yes** — tracking is a family, not a column |
| `rest` | 32 | `Game.restDaysHome` | no |
| `epa` | 23 | `TeamGameEfficiency.offEpaPerPlay` | no |
| `injuries` | 5 | `Injury.reportStatus` | no |
| `route_running` | 1 | `PlayerGameStat.receivingYards` | no |
| `live_odds` | 1 | `OddsLineSnapshot.price` | **yes** — the price is context, not an objective |
| `workload` | 1 | `SnapCount.offenseSnaps` | no |
| `separation`, `props_receiving`, `depth_chart`, `acwr`, `interceptions`, `game_state` | **0** | — | — |

**Six of the fourteen registered measures are never used by the current
corpus.** `separation` (352 tag-pairs), `props_receiving` (352),
`depth_chart` (408), `acwr` (409), `workload` (409) and `tracking` (351)
carry hundreds of tag-pairs each — **but almost every premise that
carries them is `conditional`.**

**This is the same finding as §1, seen from the other side:** the corpus
*has* the contexts; the corpus does not have the conditions. The
registry is right; the corpus is under-specified.

**The 8 measures that do get used cover 201 premises**, and **4 of the 8
are labelled proxies** — which is the honesty rule working: when the
exact column does not exist, the nearest real surface is used and it is
marked as a stand-in.

---

## 4. The two fully-specified premises

Both are gradeable, both are real, and both are NFL:

| premise | metric | direction | measure | surface |
|---|---|---|---|---|
| *"Bye-Bye, Bye Advantage: Impact of Rest Differential in the NFL"* (`arXiv:2408.10867`) | `fourth_quarter_pass_rush_decay` | negative | `rest` | `Game.restDaysHome` |
| *"The Training—Injury Prevention Paradox: Should Athletes Be Training Smarter and Harder?"* (`arXiv:2102.03453`) | `injury_fatigue_hazard_spike` | negative | `injuries` | `Injury.reportStatus` |

**Two is not a programme.** It is a proof that the mechanism resolves,
scores, and refuses honestly. The 201 is the programme; the 878 is the
bigger prize.

---

## 5. What the concept axis does NOT do

**It does not touch a published number.** A concept premise grades on
its own axis and earns an `activation_score`; it is not wired into
`trueProb`, and the market-comparison gate (`maxBrierScoreVsMarket
0.250`) has not been applied to it. **The concept axis produces evidence
and promotion candidates, not picks.**

**It does not mix with the probability axis.** The scorecard branches on
`axis`; the two branches are never summed. The probability-axis rows in
`lit.residual` are unchanged by any of this.

**It does not rescue the 285 bridge premises.** Those are game-scoped
and probability-typed; they live on the probability axis, and the f2
measurement (`reconciliation/f2_duplicate_measurement.md`) is unaffected.

---

## 6. The ranked next steps, revised by this measurement

| # | step | what it unlocks | size |
|---|---|---|---|
| 1 | **Extract the condition for the 4,540 `conditional` premises** — the evidence quote, the concept name and the domain are all present; only the threshold is missing | **201 → up to 1,079 gradeable (5.4×)** | corpus pass |
| 2 | **Grade the 201 today** on the concept axis: measure, compare direction, score by agreement | a promotion path that does not need probabilities | small — the resolver exists |
| 3 | **Add the 6 unused measures' contexts** as the corpus's conditional conditions resolve | 6 of 14 measures live, 8 of 14 | follows 1 |
| 4 | Measure the concept axis against the **market**, so a concept premise can be allowed to influence a number | the honesty gate for this axis | medium |
| 5 | Re-extract `numeric_claim.metric` for the 5,110 placeholder records | the fully-specified population from 2 to thousands | large — a corpus pass |

**Steps 1 and 2 together are the literature programme's remaining core.**
Step 1 is a corpus-construction fix that is now precisely specified, and
step 2's machinery is already built and already honest.

---

## 7. Verification record

| Claim | How verified | Result |
|---|---|---|
| the resolver is the real one | the script imports `literature-measures.ts` directly | no re-derivation |
| every registry table and column exists | `literature-measures.test.ts` parses `schema.prisma` | 20/20 pass, including 4 columns the first draft got wrong |
| the live index agrees with the corpus | both resolved through the same resolver | **201 / 74, exactly equal** |
| the conditional premises have no condition | full scan of `parsed_threshold_value`, `conditional_threshold`, `parsed_threshold_operator` | **0 of 4,540** |
| the resolved-tag distribution | the same resolver, over all 5,509 live premises | 8 tags used, 6 unused |
| the proxy labels are honest | every proxy carries a note; every non-proxy carries none | asserted by test |
