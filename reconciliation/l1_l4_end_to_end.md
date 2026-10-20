# The L1–L4 admission gate, end to end

**Branch:** `audit/reconciliation-2026-10-20`
**Commits:** `ea4093892` → `5f54ee254` → `349c24466` → `0f9a00998`

This is the record of what the d6af20a6c audit found, what was done
about it, and what is still open. Every number here was measured by
running something; the scripts that produce them are named.

---

## 1. What the audit found

The repo had an L1–L4 admission gate, and it reported **67.4% of the
5,149-record MIND corpus admitted** (3,470 records). That number was
produced by checking *shape*, not truth. No layer opened the cited
document.

| layer | what the legacy gate checked | what it means |
|---|---|---|
| L1 | the quote is ≥ 10 characters | the quote is *long* |
| L2 | the quote contains a unit word ("seconds", "mph", "%") | the quote *mentions* a unit |
| L3 | `end_char > start_char` | the offsets are ordered |
| L4 | the mechanism quote is non-empty | the mechanism *exists* |

Checked against the actual source files, the corpus scored **0 of
5,049** on a truthful L3 — not one record's claimed offsets selected its
own quote — while every record carried `verification_tier:
"MSVH_S1_EXACT"`.

Four mechanical defects, all in `scripts/build-grounded-mind-corpus.mjs`:

1. **Curated-path alias.** The non-curated branch checked
   `sourceText.includes(quote)`; the curated branch evaluated
   `const isQuoteInSource = evidence_quote.length >= 15`. A length check
   wearing a provenance claim's name.
2. **L2 unit-word escape.** 1,704 records passed because the quote
   contained "seconds" while the number (e.g. `0.25`) was nowhere in it.
3. **L3 fabrication.** `Math.max(0, sourceText.indexOf(quote))` reported
   "found at offset 0" whenever `indexOf` returned −1 — that is, whenever
   the quote was *not in the document at all*.
4. **Circular referee.** The sample audit set
   `origText = orig.curated.evidence_quote`, so the check
   `origText.includes(quote)` evaluated `quote.includes(quote)` — always
   true. That is why the builder reported a 100% referee pass rate.

The 3,509 quotes that failed L1 are absent *entirely*: whitespace
normalisation recovers 0. They are text from a **different paper** — a
thermodynamic-economics abstract, an MMA analytics abstract, a
radar-imaging abstract, an acoustics abstract — filed under NFL
records.

And the 26 `FOUNDATIONAL_PAPERS` cite `FOUNDATIONAL_NFL_MIND_COMPENDIUM`,
a file that does not exist anywhere in the repo.

---

## 2. What the builder does now

`scripts/build-grounded-mind-corpus.mjs` runs clean, exit 0, and its
50-record referee passes 50/50.

**The three-class partition**, every record explicitly typed:

| class | count | meaning |
|---|---|---|
| `CITABLE_VERIFIED` | 968 | the quote is verbatim in the document it names, and all four layers pass |
| `DERIVED_MARKET_SYNTHESIS` | 1,134 | synthesised from a market/table row; cites nothing |
| `HONESTLY_UNCITED_PRIOR` | 3,201 | no source document on disk |

**One definition of "citable."** The builder used to have its own copy
of the admission logic while the gate module had another. It stamped
`CITABLE_VERIFIED` on 3,735 records while only 968 passed all four
layers under the shared gate — overstating by 3,859. The builder now
*calls* `literature-verification.ts`; the class is whatever the gate
says. The two now agree exactly.

**The corpus carries `source_path`** (repo-relative, authoritative)
alongside `source_file` (basename, fallback). 29 of the 69 cited
basenames exist in more than one place in the repo, so a basename does
not identify a document. With the path recorded, **3,735 of 3,735**
citable records have offsets that select their quote; keyed by basename
alone, 318 did not.

**The mechanism quote is checked too.** A record is citable only if
*both* the evidence quote and the mechanism quote are byte-exact in the
document, each with its own offsets. The mechanism was previously never
checked against the document at all.

### Measured under the independent gate

```
corpus records            5,303
L1 verbatim provenance     3,772  (71.1%)
L2 numeric containment     1,989  (37.5%)
L3 span anchoring          3,735  (70.4%)
L4 mechanism entailment    1,778  (33.5%)
ADMITTED (all four)          968  (18.3%)

citable records whose span does NOT select their quote    0
non-citable records claiming a span or the EXACT tier     0
all 26 FOUNDATIONAL papers -> HONESTLY_UNCITED_PRIOR     yes
```

L2's remaining failures are legitimate: 1,453 records carry no numeric
claim at all, and 719 carry a claim that is not token-bounded in the
quote (a `10` extracted from `10-minute`).

---

## 3. L4 gained the domain checks the spec names

A verbatim quote is not a sports quote. With only "the mechanism is in
the source", the gate admitted ophthalmology, traffic-engineering and
semiconductor papers as NFL records — each a *real* quote from a *real*
document, so L1, L2 and L3 all passed. What was false was the claim
that the document is sports literature.

The mechanism must now hit a sports vocabulary and the document must
hit no cross-domain exclusion term. L4 fell from 3,735/3,735 to
1,769/3,735.

---

## 4. The consumer had the same defect as the builder

`packages/prediction-engine/src/reasoning/mind-reasoning.ts` papered
over a missing span with:

```ts
const evSpan: CharacterSpan = rec.evidence_span ?? {
  start_char: 0, end_char: evQuote.length,
  verification_tier: "MSVH_S1_EXACT",
};
```

That asserts "verified verbatim at offset 0" for a quote that is in no
document — the same fabrication the builder had, reproduced downstream.
The offsets are now nullable and the fallback says `MSVH_S0_UNCITED`,
because a record with no span **has** no span.

**Class-A exclusivity** is enforced at both delta sites: only a
`CITABLE_VERIFIED` record may inject a numeric delta, and a record with
*no* class is treated as not citable — the honest default for an unknown
provenance is "unverified", not "assume the best".

A mutation check (`reconciliation/_mutation_check_honesty_tests.mjs`)
reintroduces each defect and requires the suite to fail. **All four
mutants are caught.** The first run found that two of the three class
filters were *not* covered — the test's context produced no match, so
the assertions were vacuous — and the test was corrected until it had a
positive control.

---

## 5. Class-A exclusivity in the database

The spec asks for `WHERE record_class = 'CITABLE_VERIFIED'` on the HNSW
premise index. The real equivalents in this repo are `lit.premise` and
`lit.retrieve_premises()`.

- `lit.premise` gains `record_class` and `verification_tier`. The
  DEFAULT is `'HONESTLY_UNCITED_PRIOR'`, **not** `CITABLE_VERIFIED`: a
  premise predating the class system has unknown provenance, and a
  permissive default would silently re-open the hole the gate closed.
- `lit.retrieve_premises()` filters on the class — this is where an
  unverified premise becomes a live activation.
- `promotePremisesToCausalEdges()` filters — promotion is the only path
  to an intervention test.
- `listPromotedEdges()` filters — a gate on *promotion* is not enough:
  edges promoted before the gate existed are still `promoted`.
- `run-loop.cjs` had its **own** promotion gate (weaker than the
  module's, contradicting the module's own "one gate, one place"
  comment). It now filters too, and retires edges whose premise has
  lost its class.
- All four INSERT paths set the class.
- Only class-A citable premises are graded.

**Proven against a real Postgres**
(`reconciliation/apply_and_verify_class_a_schema.mjs`):

```
schema applied cleanly
record_class default = 'HONESTLY_UNCITED_PRIOR'::text, NOT NULL
record_class CHECK present, verification_tier CHECK present
lit.retrieve_premises filters on record_class: YES
retrieve_premises returned: ["test:class_a:citable"]
only the CITABLE_VERIFIED premise came back: YES
a premise inserted with no class gets: HONESTLY_UNCITED_PRIOR
```

A coverage check enumerates every insert and read of `lit.premise`:
**4 insert paths, 21 read sites, 0 gaps.**

---

## 6. The do-calculus module, and Gate G3

`packages/prediction-engine/src/causal/do-calculus-id.ts` implements
mutilation, exact d-separation by ancestral moralization, maximal
C-components, the Shpitser-Pearl ID algorithm, IDC, and the
HCID/ID-EnablingEdges hedge breaker. 26 tests, each naming the failure
it prevents.

It was built by a subagent, so its claims were **re-derived** rather
than accepted — two verifiers, because either alone is weak:

- **Structural** (`reconciliation/_verify_do_calculus_math.mjs`): the
  module's estimand tree is compared node for node against the equation
  the spec publishes by hand. Every query on every 4-node DAG is
  identified (18,144 queries, 0 false hedges). The verdict is invariant
  under vertex re-ordering (600 comparisons).
- **Numeric** (`reconciliation/_verify_estimand_numerically.mjs`): the
  module's factor tree is evaluated on a linear-Gaussian SCM fitted from
  *observational* data only, and the recovered total effect is compared
  with the truth — which is confirmed by intervention simulation, not by
  theory.

```
front-door   5.9710   (truth 6.0)
4-node       4.9942   (truth 5.0)
```

Both verifiers' first runs **failed**, and each failure was a defect in
the harness, not the module: a Gauss-Jordan solver that skipped the
pivot-row normalisation (a 1×1 system returned 1 instead of the
coefficient), an LCG whose divisor could exceed 1 (`Math.log` of a
value > 1 is NaN, poisoning every downstream mean), and an elimination
that divided the wrong row.

The numeric check also settled a question about the **spec**. The
standard front-door formula is often written with `P(x'|m)` in the inner
sum; the spec writes `P(x')`. Measured on this SCM: the `P(x'|m)`
variant gives 8.27, the spec's `P(x')` variant gives 5.97, and the
truth is 6.0. **The spec's published equation is the correct one.**

### Gate G3

The engine's causal path ends in `runInterventionTest`, which compares
the mean residual of *strongly activated* games against the mean
residual of *weakly activated* ones. That is an **association** between
activation strength and residual — nothing was intervened on.

`packages/prediction-engine/src/causal/causal-claim-gate.ts` now runs
the ID/IDC algorithm on the graph the estimate was computed in. The
graph is **required**: a caller that omits it gets a refusal, not an
assumption, because identifiability is a property of a graph and
checking it against a graph nobody estimated in proves nothing.

The gate is proven to reach the real path
(`src/literature/__tests__/gate-g3-integration.test.ts`), with a mock
DB whose residual rows are strongly separated — so the test would reach
a statistical PASS if the gate did not stop it first. That test's first
run failed because my *fixture* was wrong (the control rows' activation
score equalled `doValue`, so the control arm came back empty and the
function stopped for the wrong reason).

---

## 7. The re-anchoring pass, and what it found

`scripts/reanchor-mind-corpus.mjs` searches the paper corpus for each
record's quote and re-links it when the gate accepts.

**0 records were re-anchored.** That is the honest result, and it is not
a broken harness — the script's `--selftest` proves the index finds
known slices at the right offsets.

The builder's links were already correct: all 3,735 records it called
`CITABLE_VERIFIED` have their quote in the document they name, verified
by direct read of the file. The **397 quarantined** are records whose
quote is in *no* document — 26 the `FOUNDATIONAL_PAPERS` citing the
phantom compendium, and 371 the **original corruption**: a
thermodynamic-economics abstract, an ophthalmology scan, a traffic
engineering paper, each filed under an NFL record.

**The remaining gap is L2/L4 semantics, not mispointed links.**

### The paper corpus path, corrected

An earlier commit said the corpus is at repo-root `arxiv-deep/`
(1,532 files). That was wrong: the `git ls-tree | grep` matched a
*substring*. The real location is

```
docs/arxiv-program/research/2026-09-21/arxiv-deep   1,511 .md files
arxiv-deep                                           12 .md files
docs/research/2026-09-21/arxiv-deep                   1 .md file
```

The spec's number (1,511) was right and its path was off by a reorg.

---

## 8. Verified

| check | result |
|---|---|
| `node scripts/build-grounded-mind-corpus.mjs` | exit 0, referee 50/50, 5,303 records |
| literature + causal suites | **196/196** |
| mutation suite (honesty probes) | 10/10, **4/4 mutants caught** |
| do-calculus structural verifier | all checks pass |
| do-calculus numeric verifier | all checks pass |
| class-A coverage check | 4 insert paths, 21 read sites, 0 gaps |
| schema applied to Neon | clean; filter bites; default is honest |
| `tsc` | 66 errors, down from **74 at baseline**, **zero new** signatures |

The 66 remaining tsc errors are pre-existing and live in files this work
does not touch (`index.ts`, `reasoning/*`, `scoring.ts`,
`literature-registries.ts`).

---

## 9. Still open

1. **§3 — FCI + Precision-Preconditioned DYNOTEARS** (`causal-graph-builder.ts`
   in the spec's naming; no such file exists in this repo). In progress.
2. **The corpus is 18.3% admitted, not 100%.** 3,201 records are
   `HONESTLY_UNCITED_PRIOR`. That is the honest state, and it is
   materially smaller than the legacy 67.4%. A corpus of 968 falsifiable
   premises is a corpus of 968 falsifiable premises.
3. **`runCausalPromotionSweep` has no production caller** with a graph.
   `useEdgeAssertedGraph` is off by default, so the sweep currently
   reports `ASSOCIATION_ONLY` for every edge — which is the correct
   answer when nobody has checked the confounding structure, and a
   prompt for whoever wires it to supply a real PAG.
4. **The 26 `FOUNDATIONAL_PAPERS`** are hand-authored principles with no
   document behind them. They are preserved as structural
   edge-existence hypotheses and are excluded from the literature path
   entirely. Whether to source them or retire them is a decision, not a
   bug.
