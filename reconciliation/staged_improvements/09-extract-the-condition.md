# STAGED-IMPROVEMENT 9 — Extract the condition: 201 → 1,079 gradeable premises

**Changes a published number?** No. It makes **878 more premises
gradeable**, and it is a corpus-construction pass, not a wiring change.
**Risk:** LOW. It re-extracts fields that are already in the source
documents; it does not touch any gate, any score, or any published
number.
**Files:** `scripts/build-grounded-mind-corpus.mjs` — specifically
`determineInfluenceDirection` (`:101-111`) and the two hardcoded
`conditional_threshold: null / parsed_threshold_value: null /
parsed_threshold_operator: null` writes (`:1051-1053`, `:1158-1160`) —
plus the index rebuild that follows the corpus regeneration.

---

## 0. Why — this is the biggest lever left in the literature programme

**Measured (`reconciliation/concept_axis_coverage.md`):**

| | count | share of 5,509 |
|---|---:|---:|
| live premises | 5,509 | 100% |
| **resolved to a measure** (gradeable today) | **201** | 3.6% |
| …and correlational or causal | 74 | 1.3% |
| …and a specifically named metric | 2 | 0.04% |
| refused: `conditional_direction` | **4,540** | **82.4%** |
| refused: `no_measurable_tag` | 693 | 12.6% |
| refused: `no_context_tags` | 75 | 1.4% |

**The concept axis WORKS** — the resolver
(`packages/prediction-engine/src/literature/literature-measures.ts`)
resolves premises to real, schema-verified measure surfaces and refuses
honestly. 201 premises are gradeable today.

**But 82.4% of the corpus is refused for one reason, and the reason is a
MISSING FIELD, not a missing capability.**

---

## 1. The finding — `conditional` with no condition

**88.2% of the corpus (4,540 of 5,149) carries
`influence_direction: "conditional"`. And not one of them carries the
condition it is conditional on:**

| | count |
|---|---:|
| premises with `influence_direction = 'conditional'` | 4,540 |
| …with `parsed_threshold_value` set | **0** |
| …with `conditional_threshold` set | **0** |
| …with `parsed_threshold_operator` set | **0** |

**The extractor labelled 88% of the corpus "conditional" and then
extracted no condition for any of them.** The label says "this claim
depends on something" and the something was never recorded.

**AND THE ROOT CAUSE IS SPECIFIC AND FIXABLE.**
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

**`"conditional"` is not a semantic classification here. It is the
FALLBACK for "the text matched neither keyword list."** Two fixed
regexes over the source text, and everything they miss becomes
"conditional."

**That is why the threshold fields are `null` on every conditional
record** — the three writes at
`build-grounded-mind-corpus.mjs:1051-1053` and `:1158-1160` are
**hardcoded `null`**, in both record shapes. The extractor was never
built to extract a condition.

**So the label is doubly wrong:** the 4,540 records it marks
"conditional" are mostly records whose text simply did not contain the
words "boost" or "suppress" — not records that state a condition.

**MEASURED CONFIRMATION (2026-10-20).** Re-running the extractor's own
two regexes over each record's own retained text (evidence_quote,
mechanism_quote, title, principle_or_feature):

| | count |
|---|---:|
| records marked `conditional` | 4,540 |
| …**neither regex hits the record's own text** (pure fallback) | **4,383 (96.5%)** |
| …a regex does hit | 157 |
| records marked `+`/`-` whose own text has NO keyword | 103 |

**96.5% of the "conditional" label is the keyword-miss fallback.**
(The extractor ran the regex over the FULL source document, which is not
retained in the record, so 96.5% is a LOWER BOUND on the fallback
share.)

**So the resolver refuses 4,540 premises — and it is right to.** A
conditional claim with no condition cannot be evaluated: there is no
rule for deciding when it applies. **And the refusal is pointing at a
classification that was never performed.**

**THE FIX HAS TWO PARTS, AND THE FIRST IS CHEAPER THAN THE SECOND:**

**(a) Re-classify the direction properly.** The premise's own
`influence_direction` should come from the claim's SEMANTICS — what the
evidence quote says the effect IS — not from a two-regex keyword hit.
A premise that says "route separation increases receiving production" is
`positive` even if the word "increase" is absent and the word "drag" is
present in an unrelated clause. **This is a classification fix, and it
alone could move a large share of the 4,540 out of `conditional`.**

**(b) Extract the condition, for the ones that genuinely ARE
conditional.** A premise that says "whenever X exceeds Y, the effect is
Z" needs its X, Y and the operator. The corpus's `evidence_quote` and
`mechanism_quote` are where that sentence lives.

**Both are corpus-construction work, and both are now precisely
located in one file.**

**But 878 of those 4,540 have a measurable context.** Those are
premises that already name a quantity the database can observe
(`separation`, `epa`, `rest`, `injuries`, `depth_chart`, `acwr`,
`workload`, `tracking`, `props_receiving`, `route_running`,
`interceptions`, `coverage`, `live_odds`, `game_state`) and merely lack
the threshold that would let the condition be evaluated.

**Extract the condition and the gradeable population goes from 201 to
1,079 — a 5.4× increase.**

---

## 2. What the corpus already has, and what is missing

**Present on 100% of the 5,149 records:**

| field | what it carries |
|---|---|
| `evidence_quote` | the paper's own sentence describing the finding |
| `principle_or_feature` | the named concept |
| `domain` | 17 buckets |
| `applicable_contexts` | 87 tags |
| `claim_type` | theoretical / correlational / causal |
| `numeric_claim.metric` | the measured quantity (a placeholder for 5,110) |
| `influence_direction` | positive / negative / **conditional** |

**Missing on all 4,540 conditional records:**

| field | what it should carry |
|---|---|
| `conditional_threshold` | the value of the concept at which the claim switches on |
| `parsed_threshold_value` | that value, parsed |
| `parsed_threshold_operator` | `>=`, `<=`, `>`, `<` |

**The evidence quote is where the threshold is.** The corpus's own
examples show the shape of the sentence it needs to read:

> *"removing oddsmaker bias from betting lines improves out-of-sample
> predictions of point spreads and generates statistically significant
> positive returns of 1.8 points…"* → **threshold: 1.8 points**
>
> *"probabilistic pass-blocking assignments evaluate blocker survival past
> 2.5 seconds under simulated blitz and stunt fronts"* → **threshold: 2.5
> seconds**
>
> *"Using average vehicle speed data in **10-minute increments**…"* →
> **NOT a game threshold at all** — and the record must be rejected, not
> given a fake condition

**That last example is the discipline.** A threshold extracted from a
paper that is not about a football game is not a condition, and a
re-extraction pass that produced one would be worse than the current
state: it would manufacture 1,079 gradeable premises out of study
metadata.

---

## 3. What changes

### 3.0 Re-classify the direction first

**Before extracting conditions, fix the classification that produced the
4,540.** The direction must come from the claim's semantics, not from
two regexes over the whole document.

**The honest way to do it:** use the premise's own structured fields —
`claim_type`, `domain`, `applicable_contexts`, the `mechanism_quote`, and
the `evidence_quote` — to decide the direction, and record the
reasoning in the record so it is auditable. A premise whose claim is
`correlational` or `causal` on a measurable context and whose
mechanism quote describes a gain has a `positive` direction **whether or
not the word "gain" appears**.

**The direction must never be guessed.** If the semantics do not
determine it, the record stays `conditional` — which is the honest
state, and the resolver's refusal is then correct.

### 3.1 A threshold extractor, with a rejection rule

New: a re-extraction pass over the corpus's source documents that, for
each `conditional` record, attempts to extract:

- a **candidate value** (the number in the quote, with its unit);
- a **candidate operator** (`>=` / `<=` / `>` / `<`);
- **the concept the condition is stated on** (must match one of the
  record's `applicable_contexts`, or a term that maps to one of the 14
  measurable measures);
- **a game-validity check.**

**The game-validity check is the honesty gate, and it is the hard part.**
A threshold is accepted only if the concept it is stated on is a
**football game quantity**. The corpus's own units make this checkable:
`points`, `yards`, `seconds`, `percent`, `multiplier` and a rate are
game quantities; `year`, `samples` and a `count` of anything that is not
a game unit are not. **A record whose context is `fantasy`/`dfs`/`gpp`
or whose domain is not a football domain is rejected regardless of how
clean its quote looks.**

**Measured expectation:** the 27.7% of placeholder records whose quote
mentions a unit-ish word is the upper bound on what a text pass can
recover from the quote alone. **A stricter, domain-gated rule will
recover less than that.** The number is reported by the pass, not
assumed.

### 3.2 The concept must be resolvable to a measure

A threshold is only useful if the concept it is stated on can be
**observed**. So the extractor must name the measure, and the resolver
must accept it:

```ts
// a conditional premise with a threshold becomes gradeable if the
// concept it is conditional on resolves to a measure
resolveMeasure(tags, direction)  // -> measure
threshold: { value, operator, concept }  // -> from the corpus
```

**If the concept does not resolve to a measure, the threshold is
recorded but the premise stays ungradeable** — because there is nothing
to compare the observed value against.

### 3.3 The grader evaluates the condition per game

On the concept axis, a conditional premise grades like this:

```
for each game g where the measure is observable:
  observed = M(g)
  applies  = compare(observed, threshold)   // the condition
  if !applies: skip this game (the premise did not claim to apply)
  agreement = does the outcome match the premise's direction?
```

**A conditional premise contributes evidence only on the games where its
condition holds.** That is what "conditional" means, and it is the
behaviour that makes the 878 worth having: each one is a *calibrated
rule*, not a blanket claim.

**Support counts distinct games where the condition HELD** — never games
where it did not.

### 3.4 The corpus file is regenerated, and the index is rebuilt

`MIND_CORPUS_3000.jsonl` gains three populated fields for the records
where a threshold was found. **The records where extraction failed keep
`conditional` and gain nothing** — they stay refused, which is correct
and which the coverage measurement will show.

**The index rebuild** re-embeds only the changed premises (the index
builder already supports `--only-missing` and content hashes), so this
is not a full re-embed.

---

## 4. The honesty rules

1. **A threshold is never inferred from the concept alone.** It comes
   from the quote, or the premise stays refused.
2. **A threshold on a non-game quantity is rejected**, however clean the
   quote. The "10-minute increments" case is the test.
3. **A premise whose condition never holds on any observed game
   contributes NO evidence** and earns nothing. It is not a
   disagreement; it is a premise that never applied.
4. **A premise whose condition holds but whose direction is wrong is
   counted as a disagreement**, and it can be demoted.
5. **The extraction rate is reported, not assumed.** The pass writes
   `reconciliation/condition_extraction.json` with: how many records
   were attempted, how many yielded a threshold, how many were rejected
   and why, and the resulting gradeable population. **If the pass
   recovers fewer than 300, that is the finding, and it is reported
   rather than papered over.**

---

## 5. Acceptance

- [ ] `determineInfluenceDirection` no longer returns "conditional" as
      a keyword-miss fallback. A record is `conditional` only when its
      semantics genuinely leave the direction undetermined, and the
      record says why.
- [ ] The direction decision is auditable: the record carries the
      evidence it was based on.
- [ ] The extraction pass writes
      `reconciliation/condition_extraction.json` with the attempted /
      extracted / rejected counts and the rejection reasons.
- [ ] Every extracted threshold has a value, an operator, a concept, and
      a **passing game-validity check**. Asserted by a test over the
      regenerated corpus.
- [ ] **The "10-minute increments" style case is rejected.** A
      regression test asserts that a threshold on a `count` unit with a
      non-game domain is NOT accepted.
- [ ] A premise whose condition never holds on an observed game
      contributes **zero** evidence rows and earns `activation_score = 0`.
- [ ] Support counts only the games where the condition held.
- [ ] The corpus regeneration is **incremental**: only the records with
      a new threshold change, and their `content_hash` changes so the
      index re-embeds them.
- [ ] The coverage measurement is re-run and reports the new gradeable
      population. **The reported number is whatever the pass actually
      achieves.**
- [ ] Nothing about this stage touches `trueProb` or any published
      number. Asserted.
