# The L1–L4 Root Cause — how 3,509 quotes came to cite documents they are not in

**Measured:** 2026-10-20 · **Code:** `audit/reconciliation-2026-10-20`
**Companion:** `reconciliation/l1_l4_admission_gate.md` (the gate and its
measurement) · `l1_l4_admission_gate_truthful.json`

---

## 0. The finding in one paragraph

**The corpus builder has two admission paths. One checks that the quote
is in the source document. The other does not — and the second one
produced 3,509 records whose `evidence_quote` is absent from the
document it names.** The failure is not a rounding error in a regex; it
is a missing check on a branch, and the branch is the *curated* path.

---

## 1. The two paths, side by side

`scripts/build-grounded-mind-corpus.mjs`, the main harvest loop
(line 1021 onward):

### The NON-CURATED path — the referee is real

```js
// Step C: Deterministic Referee Invariants
const doesSourceHaveQuote = sourceText.includes(quote);
const doesQuoteHaveNum  = claim ? quote.includes(String(claim.value)) : true;

if (!doesSourceHaveQuote || !doesQuoteHaveNum || quote.length < 15) {
  refereeFailures++;
  continue;                     // <-- DROPPED
}
```

**This path is correct.** A record whose quote is not in its source is
dropped and counted in `refereeFailures`.

### The CURATED path — the referee is a length check

```js
// If it's one of the curated foundational papers, verify and admit directly
if (curated) {
  const isQuoteInSource = curated.evidence_quote.length >= 15;   // <-- LENGTH, NOT PRESENCE
  const isNumInQuote = curated.numeric_claim
    ? curated.evidence_quote.includes(String(curated.numeric_claim.value))
    : true;
  if (isQuoteInSource && isNumInQuote) {
    ... admitted ...
  }
}
```

**`isQuoteInSource` does not check the source at all.** The variable name
says one thing and the code does another. **This is the defect.**

**The header comment of the same file documents the correct behaviour and
claims the builder implements it:**

> *"Non-LLM referee asserts `sourceText.includes(evidence_quote)`"*
> *"Ungrounded rows are strictly dropped."*

**So the builder's own contract says what should happen, and one branch
does not do it.** The header is not a description of the code; it is a
description of the *intended* code.

---

## 2. The other half: the span is a LIE by construction

Even on the curated path, the span is computed as:

```js
const evIdx = clean.indexOf(evidenceQuote);
return {
  quote: evidenceQuote,
  span: {
    start_char: Math.max(0, evIdx),              // <-- indexOf returns -1
    end_char:   Math.max(0, evIdx) + evidenceQuote.length,
    verification_tier: "MSVH_S1_EXACT",           // <-- hardcoded
  },
};
```

**When the quote is not in the source, `indexOf` returns -1, and
`Math.max(0, -1)` claims the quote starts at offset 0.** The span is
therefore *always* well-formed, which is why the existing L3 gate
(`end_char > start_char`) never rejected anything.

**And `verification_tier: "MSVH_S1_EXACT"` is a hardcoded string literal
on every path.** It is a label the builder writes, not a result it
computes. All 5,149 records carry it; **0 of their offsets select their
own quote.**

---

## 3. Where the 26 curated papers come from

```js
export const FOUNDATIONAL_PAPERS = [ ... ];   // line 286, 26 entries

for (const paper of FOUNDATIONAL_PAPERS) {
  rawMap.set(paper.item_id, {
    raw: { id: paper.item_id, title: paper.title,
           abstract: paper.evidence_quote, source: paper.source },
    curated: paper,
    sourceFile: "FOUNDATIONAL_NFL_MIND_COMPENDIUM",   // <-- a FILE THAT DOES NOT EXIST
  });
}
```

**`FOUNDATIONAL_NFL_MIND_COMPENDIUM` is not a file.** A walk of the whole
repo for any filename containing `FOUNDATIONAL` returns **0 hits**. The
26 `FOUNDATIONAL_PAPERS` entries are **hand-written in the builder
script itself**, and every one of them is filed under a source document
that was never written.

**This is where the 39 real-metric records live** — the ones with a
specific, non-placeholder `numeric_claim.metric`:
`public_darling_spread_shading`, `blocker_survival_threshold`,
`trench_interaction_beta`, `separation_over_expected`,
`fourth_quarter_pass_rush_decay`, `modern_home_field_advantage`,
`coach_aversion_total_shift`, `true_pathwise_trailing_equity`, and 18
more. **All 39 cite `FOUNDATIONAL_NFL_MIND_COMPENDIUM`.**

**So the corpus's most load-bearing records — the only 39 with a
falsifiable quantity — are hand-authored premises attributed to a
non-existent document.** Their quotes read like paper abstracts because
they were *written* to read like paper abstracts:

> *"removing oddsmaker bias from betting lines improves out-of-sample
> predictions of point spreads and generates statistically significant
> positive returns of 1.8 points on shaded favorites"*

> *"Separation Over Expected measures receivers generating 1.4 yards
> above ghost baseline isolating burst from blown coverage noise"*

**And the 2,106 non-football records the audit found surviving the
cross-domain filter are the same population** — the corpus's own
domain filter is a keyword test over text that was written rather than
read, so a keyword miss files a thermodynamics abstract under an NFL
primitive.

---

## 4. Why the markdown sources fail at 0% and the JSON ones verify

| source file | quotes present | which path |
|---|---:|---|
| `ARXIV_OMNIBUS_SPORTS_AND_BETTING_CORPUS.json` | 461 / 492 | **harvested** — referee enforced |
| `methodology-definitions.json` | 369 / 407 | **harvested** — referee enforced |
| `KAGGLE_SPORTS_AND_BETTING_REGISTRY.json` | 269 / 269 | **harvested** — referee enforced |
| `nfl-analytics-reverse-engineering.md` | **8 / 369** | **curated / templated** |
| `2025-holdout-distribution-v2.md` | **0 / 286** | **curated / templated** |
| `player-advanced-metrics-2026-09-19.md` | **0 / 266** | **curated / templated** |
| `wr-te-full-pool-2026-09-19.md` | **0 / 202** | **curated / templated** |

**The split is exactly the split between the two code paths.** The JSON
sources that hold an actual document's text are harvested, so the referee
filters them, and their quotes are real. The markdown sources are
templated or row-derived, so their quotes are fragments of a data row:

> title: *"NFL Sports Analysis [2025-holdout-distribution-v2]: 2025_01_DAL_PHI"*
> quote: *"ASSOCIATION_ONLY - 1 - 0.8507281977552686"*

**That is not a citable premise. It is a database row with a citation
attached.**

---

## 5. The fix, in the order the failures compose

| # | fix | where | why |
|---|---|---|---|
| 1 | **Make the curated path check the source** the way the non-curated path does: `sourceText.includes(evidence_quote)` | `build-grounded-mind-corpus.mjs:1026-1028` | the single-line defect that admits 3,509 records |
| 2 | **Give `FOUNDATIONAL_NFL_MIND_COMPENDIUM` a real file**, or mark its 26 entries as `curated_derived` with an explicit `not_citable` flag | `build-grounded-mind-corpus.mjs:906` | a source that does not exist cannot verify anything |
| 3 | **Stop writing `verification_tier` as a constant** — compute it from the check, or delete it | `build-grounded-mind-corpus.mjs:136,155,168` | a label that asserts exactness on records where 0 of the offsets are exact |
| 4 | **Never emit a span when `indexOf` returns -1** — emit `null` and let the record fail L3 | `build-grounded-mind-corpus.mjs:162-168` | `Math.max(0, -1)` turns "not found" into "found at 0" |
| 5 | **Run the new gate in CI** over the emitted corpus | `packages/prediction-engine/src/literature/literature-verification.ts` | a gate that runs only on demand is a gate that rots |
| 6 | **Distinguish "curated premise" from "quoted source"** in the schema | the corpus record shape | the corpus currently conflates a hand-authored principle with a citable source, and downstream consumers cannot tell them apart |

**Fix 1 alone would drop 3,509 records.** That is the point: they should
not have been in the corpus.

**But dropping them is not the whole answer**, and this is the honest
caveat. The corpus would fall from 5,149 to **1,640**, and the 39
real-metric records — the only falsifiable ones — would fall to **13**,
because the other 26 come from the non-existent compendium. **A corpus of
13 falsifiable premises is not a literature base.** Fix 2 is therefore
not optional: the hand-authored principles are *good premises* with
*no citation*, and they need either a real source or an honest label.

---

## 6. What this changes about the programme

**The retrieval, indexing, embedding, and promotion machinery has been
solid throughout this engagement. Every defect has been in the honesty
layer. This is the largest instance of that pattern found so far, and it
is the first one that is a single line of code.**

| layer | found | shape of the defect |
|---|---|---|
| effect estimate | the premise's own claim was written into the causal edge | tautology |
| residual grounding | residuals graded against any game, not their own | category error |
| support factor | 21 rows counted as 21 games | unit error |
| promotion | add-only, never demoted | missing negative case |
| `premise_score.promoted` | never cleared | missing negative case |
| intervention tests | retired edges kept their tests | stale state |
| concept resolution | first resolvable tag, not the premise's concept | category error |
| concept outcome | `targets` against `receivingYards` | **definitional** |
| **corpus admission** | **curated path never checked the source** | **missing check** |

**And note the shape of the last one: it is the ONLY defect in this list
that is a missing check on a branch rather than a wrong computation.**
Everything else produced a wrong number. This one produced a number
about verification that was never verified — which is why the repo could
report a 67.4% admission rate for a corpus where 0% is defensible.

---

## 7. Verification record

| claim | how verified | result |
|---|---|---|
| the non-curated path enforces the referee | read `build-grounded-mind-corpus.mjs:1101-1108` | `sourceText.includes(quote)` → drop |
| the curated path does not | read `build-grounded-mind-corpus.mjs:1026-1028` | `length >= 15` only |
| the header claims the correct behaviour | read lines 18-20 | "Non-LLM referee asserts `sourceText.includes(evidence_quote)`" |
| the span is fabricated when the quote is absent | read lines 162-168 | `Math.max(0, indexOf(...))` with a hardcoded tier |
| `FOUNDATIONAL_NFL_MIND_COMPENDIUM` does not exist | repo-wide walk for `FOUNDATIONAL*` | **0 files** |
| 26 curated papers are hand-written in the builder | `grep -c 'evidence_quote: "'` in the builder | **26** |
| all 39 real-metric records cite the non-existent file | metric census over the corpus | 39/39 → `FOUNDATIONAL_NFL_MIND_COMPENDIUM` |
| the JSON/markdown split is the harvested/curated split | per-source quote-presence vs the builder's two paths | JSON 461/492, 369/407, 269/269 present; markdown 8/369, 0/286, 0/266 absent |
| fixing the curated check would drop 3,509 records | the truthful gate's L1 failures | 3,509 / 5,046 |
| fixing it would leave 13 falsifiable premises | 39 real-metric records − 26 from the compendium | 13 |
| the gate can fail | 23 regression tests | 23/23, suite 95/95 |
