# The L1–L4 Admission Gates — a gate that cannot fail

**Measured:** 2026-10-20 · **Code:** `audit/reconciliation-2026-10-20`
**Machine-readable:** `reconciliation/l1_l4_admission_gate_truthful.json`
**Reproduce:** `node reconciliation/run-l1-l4-verification.mjs`
**New code:** `packages/prediction-engine/src/literature/literature-verification.ts`
(+ `__tests__/literature-verification.test.ts`, 23 tests)

---

## 0. The finding

**The repo already has an L1–L4 admission gate. It reports that 67.4% of
the MIND corpus is admitted. Checked against the actual source documents
the records name, the truthful answer is 0%.**

| layer | the existing gate reports | the truthful gate measures |
|---|---:|---:|
| L1 verbatim provenance | 5,149 / 5,149 | **1,537 / 5,149 (29.9%)** |
| L2 numeric containment | 3,470 / 5,149 | **1,766 / 5,149 (34.3%)** |
| L3 character-span anchoring | 3,470 / 5,149 | **0 / 5,149 (0.0%)** |
| L4 mechanism entailment | 3,470 / 5,149 | **1,589 / 5,149 (30.9%)** |
| **ADMITTED (all four)** | **3,470 (67.4%)** | **0 (0.0%)** |

**A gate that cannot fail is worse than no gate**, because it produces a
number that looks like verification.

---

## 1. Why the existing gate passes everything

`scripts/audit-l1-l4-admission-gates.ts` (224 lines) checks **shape**, not
**truth**. Not one of its four layers opens the source document.

```ts
// L1: the quote is non-empty
const l1 = typeof evQuote === "string" && evQuote.trim().length >= 10;

// L2: the number is in the quote OR the quote contains a UNIT WORD
const hasNum = evQuote.includes(magStr) || evQuote.includes(wholeInt) ||
  /\b(percent|seconds|points|yards|coefficient|beta|decay|odds|threshold)\b/i.test(evQuote);

// L3: the offsets are well-formed
l3 = Boolean(span && typeof span.start_char === "number" &&
             typeof span.end_char === "number" && span.end_char > span.start_char);

// L4: the fields are in the vocabulary and the mechanism quote is non-empty
l4 = allFieldsValid && hasMechanism;
```

**L3 is the clearest case.** It asks "is `end_char > start_char`?" — which
every record satisfies by construction, because the builder wrote both
numbers. **It never asks whether the offsets select the quote.** And all
5,149 records carry `verification_tier: "MSVH_S1_EXACT"` — **a label
asserting exactness, on records where 0 of the offsets are exact.**

**L2's unit-word escape hatch admits 1,704 records whose number is
nowhere in the evidence:**

> number **0.25**, not in the quote — quote: *"probabilistic pass-blocking
> assignments evaluate individual blocker survival past 2.5 seconds
> under pressure"* → passes on the word "seconds".

> number **0.34**, not in the quote — quote: *"cumulative pocket strain
> crossing critical threshold prior to 2.2 seconds spikes QB off-target
> rate"* → passes on the word "seconds".

> number **0.65**, not in the quote — quote: *"defenses show two-high
> safety shells on 65 percent of downs rotating dynamically post-snap"*
> → passes on the word "percent".

**1,766 records pass the truthful L2; 3,470 pass the existing L2. The
difference is 1,704 records admitted on a unit word alone.**

---

## 2. The measurement that produced the 0%

All 70 cited source files were located (68 in the repo; 2 are `[EMAIL]`
placeholders) and opened. Then, for every record:

- **L1** — is the quote in the source document, exactly?
- **L2** — is the claimed magnitude literally in the quote?
- **L3** — does `source.slice(start_char, end_char)` equal the quote?
- **L4** — is the vocabulary held AND the mechanism quote in the source?

### 2.1 L1: 3,509 quotes are absent from the documents they cite

| | count |
|---|---:|
| records with a locatable source | 5,046 |
| **quote present in the source** | **1,537 (30.5%)** |
| **quote ABSENT from the source** | **3,509 (69.5%)** |
| source file not locatable | 103 |

**The absent quotes are absent ENTIRELY.** Whitespace normalisation
recovers **0** of them. They are not formatting drift — they are text
from a different paper, filed under an NFL record:

> *"This paper presents an application of geometrothermodynamics (GTD)
> to the economic analysis of Bogotá's sports…"* — cited to
> `ARXIV_BETTING_CANONICAL.json`

> *"One model predicts the judges' majority score by round while the
> other predicts whether the red fighter will…"* — an **MMA** abstract,
> cited to the betting corpus

> *"A 77 GHz frequency-modulated continuous wave (FMCW) radar is used to
> capture high-resolution range profiles…"* — **radar imaging**, cited to
> `ARXIV_OMNIBUS_SPORTS_AND_BETTING_CORPUS.json`

> *"This paper considers the Cramèr-Rao lower Bound (CRB) for the source
> localization problem in the near field."* — **acoustics**, cited to
> `ARXIV_NFL_310_FULL_PARSED.json`

### 2.2 The failure is structural, and the source type predicts it

| source file type | quotes present in the source | notes |
|---|---:|---|
| `ARXIV_OMNIBUS_SPORTS_AND_BETTING_CORPUS.json` | 461 / 492 | JSON — real |
| `methodology-definitions.json` | 369 / 407 | JSON — real |
| `KAGGLE_SPORTS_AND_BETTING_REGISTRY.json` | 269 / 269 | JSON — real |
| `ARXIV_PREDICTION_MODEL_SPORTS.json` | 118 / 123 | JSON — real |
| `nfl-analytics-reverse-engineering.md` | **8 / 369** | **markdown** |
| `2025-holdout-distribution-v2.md` | **0 / 286** | **markdown** |
| `player-advanced-metrics-2026-09-19.md` | **0 / 266** | **markdown** |
| `guest_2026-10-14T01-34-05Z.json` | **0 / 223** | **markdown-derived** |
| `wr-te-full-pool-2026-09-19.md` | **0 / 202** | **markdown** |
| `pinnacle_mkt_1637432964.json` | **0 / 74** | market snapshot |

**Every JSON source that holds a document's text verifies; every markdown
source fails at ~0%.** The markdown records are the ones whose
`evidence_quote` is a fragment of a data row, not of a document:

> title: *"NFL Sports Analysis [2025-holdout-distribution-v2]: 2025_01_DAL_PHI"*
> quote: *"ASSOCIATION_ONLY - 1 - 0.8507281977552686"*
> quote: *"conclusion - sources - summary - withheld reasons"*

**That is not a citable premise.** It is a database row.

### 2.3 L3: not one record's offsets select its own quote

**0 of 5,049 records with a span pass.** The offsets are present,
well-formed, and wrong. Two examples where the claimed window lands
somewhere else entirely:

> quote: *"Historically, statistical analysis of offensive lineman has
> been hindered by the…"* — the claimed window selects
> `[\n  {\n    "id": "2609.34458",\n    "title": "Understanding Generalization Require…`

> quote: *"Using a corpus of game-referencing tweets, we measure
> variation in sentiment tow…"* — the claimed window selects
> `uction",\n    "link": "https://arxiv.org/abs/2609.34458",\n    "authors": [\n`

**`verification_tier: "MSVH_S1_EXACT"` on 5,149 records, of which 0 have
exact spans.** The tier is a label the builder wrote; it was never a
check.

---

## 3. What was built

**`packages/prediction-engine/src/literature/literature-verification.ts`**
implements the four layers so that each can fail, and — unlike the
existing audit — computes them **independently**, so a report can say
how deep a failure goes rather than only naming the first one.

| layer | the truthful check |
|---|---|
| **L1** | the quote appears **exactly** in the source document the record names. Whitespace normalisation is **not** applied: if the quote needed normalising to be found, it is not the quote that was written. |
| **L2** | the claimed magnitude appears **literally** in the quote. **No unit-word escape.** |
| **L3** | `source.slice(start_char, end_char)` **equals** the quote. |
| **L4** | the controlled vocabulary holds **AND** the mechanism quote is itself in the source document — because a mechanism quote that is not in the document cannot entail a mechanism. |

**23 regression tests** pin the gate to that behaviour, and each test
names the failure it exists to prevent:

- *"fails when the quote is NOT in the source document"* — the fabricated-provenance case
- *"fails when the number is absent EVEN THOUGH the quote contains a unit word"* — the 1,704-record case
- *"is not fooled by a verification_tier label"* — the `MSVH_S1_EXACT` case
- *"does NOT rescue a quote that only matches after whitespace normalisation"*
- *"computes every layer INDEPENDENTLY rather than short-circuiting"*

**All 23 pass. The suite is 95/95** (`literature.test.ts` 45,
`literature-measures.test.ts` 27, `literature-verification.test.ts` 23),
and `tsc --noEmit` reports **0 errors in `src/literature/`**.

**Note on what this does NOT do:** the gate is a *gate*, not a repair. It
does not fix quotes, and it does not change any published number. Its
only output is a verdict per record and a summary.

---

## 4. The honest reading of the 0%

**Zero admitted does not mean "the corpus is worthless." It means the
corpus has never been verified, and the verification had never been
performed.**

The 1,537 records whose quotes **are** genuinely in their source
documents are the real corpus. They are the arXiv records — a paper
about a paper about NFL outcomes, with the abstract actually quoted and
the number actually present. **Those are citable. The other 3,509 are
not, and no amount of scoring or promotion will make them so.**

**And that is a good outcome, because it is actionable.** The corpus's
problem was never "not enough literature" — it was 5,149 records that
looked equally citable and were not. **The gate makes the difference
visible, and it does it before the records reach a scorecard, a
promotion gate, or a reasoning trace.**

**This is the spec's L1–L4 remedy, and the spec was right to demand it.**
The audit's independent finding was that 2,106 non-football records
survive the corpus's own cross-domain filter. **The gate catches a
strictly larger set — 3,509 records with a quote that is in no document
at all — and it does so on a mechanical, per-record test that needs no
model and no judgment call.**

---

## 5. What follows from this

| # | next step | why |
|---|---|---|
| 1 | **Wire the gate into the corpus builder** so a record that fails L1 is never emitted, and mark the 3,509 existing offenders `unverified` rather than deleting them | the corpus is an input to scoring; unverifiable records must not be scored as if verified |
| 2 | **Investigate the markdown-source path in the builder** | it is the mechanism that produced 100% of the markdown failures and the `ASSOCIATION_ONLY - 1 - 0.85…` quotes |
| 3 | **Stop writing `verification_tier` as a constant** | it is a label, and on 5,149 records it asserts an exactness that 0 of them have |
| 4 | **Apply the same "can it fail?" test to the other gates** | the probability axis's promotion gate had the same shape of defect and was already fixed in this engagement; this is the same failure mode in a new place |

**And the headline for the whole programme, unchanged by this finding:**
the retrieval, indexing, embedding, and promotion machinery has been
solid throughout. **Every single defect has been in the honesty layer.**
This gate is the honesty layer's biggest surface, and it was the one
place where a number was being reported as verification without any
check behind it.

---

## 6. Verification record

| claim | how verified | result |
|---|---|---|
| the existing gate reports 67.4% | ran `scripts/audit-l1-l4-admission-gates.ts` | 3,470 / 5,149 admitted |
| the truthful gate reports 0% | `node reconciliation/run-l1-l4-verification.mjs` | 0 / 5,149 admitted |
| L1 fails for 3,509 records | quote searched in the located source file | 1,537 present, 3,509 absent |
| the absent quotes are truly absent | whitespace-normalised re-search | **0 recovered** |
| L3 fails for every record | `source.slice(start, end) === quote` | **0 exact** |
| the tier is a constant label | tier census over the corpus | `MSVH_S1_EXACT` on 5,149 / 5,149 |
| L2's unit-word escape admits 1,704 | replayed the existing regex vs the truthful check | 3,470 vs 1,766 |
| the gate can fail | 23 regression tests | 23/23 pass, suite 95/95 |
| no new type errors | `tsc --noEmit -p packages/prediction-engine` | 0 in `src/literature/` |
| the source files are real | `find` for all 70 cited names | 68 located, 2 are `[EMAIL]` placeholders |
