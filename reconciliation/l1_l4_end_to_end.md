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
| `CITABLE_VERIFIED` | 1,098 | the quote is verbatim in the document it names, and all four layers pass |
| `DERIVED_MARKET_SYNTHESIS` | 1,134 | synthesised from a market/table row; cites nothing |
| `HONESTLY_UNCITED_PRIOR` | 2,881 | not admissible evidence (see the status below) |
| `REJECTED_CORRUPT` | 190 | the "quote" is a machine identifier, not prose |

**The status says WHY**, which the class alone cannot:

| status | count | meaning |
|---|---|---|
| `ACTIVE` | 1,098 | admitted; all four layers pass |
| `LINK_VERIFIED_SEMANTIC_FAIL` | 2,674 | the quote IS verbatim in the document; the claim does not follow from it |
| `UNCITED_NO_SOURCE` | 397 | the quote is in no document at all |
| `DERIVED_TABLE` | 1,134 | synthesised from a table row |
| `CORRUPT_QUOTE` | 190 | a dataset slug or a database row where a quote should be |

### The re-run after A087, and the 2,804 vs 2,674 question

The builder was re-run after A087 (`locateDocumentRegion` now locates
a record's quote by SUBSTRING rather than requiring a whole-field
match) and the corpus it wrote is **byte-identical** to the committed
one. That is the correct outcome and it is not a null result — it
means the corpus already incorporated A087, and here is the proof
from the git history rather than an assertion:

```
3b80b5f27  11:55  the A087 fix lands
60bc3d5f8  12:01  the corpus is regenerated -- SIX MINUTES LATER
```

The distribution before and after, read out of the corpus files
themselves:

| | `5f54ee254` (pre-A087) | `3b80b5f27` (A087 landed) | `60bc3d5f8` (regenerated) | now |
|---|---|---|---|---|
| `ACTIVE` | 968 (`CITABLE_VERIFIED`) | 1,019 | 1,098 | **1,098** |
| `LINK_VERIFIED_SEMANTIC_FAIL` | — | 2,484 | 2,674 | **2,674** |
| `UNCITED_NO_SOURCE` | 3,201 (`HONESTLY_UNCITED_PRIOR`) | 397 | 397 | **397** |
| `CORRUPT_QUOTE` | — | 269 | 0 | **0** (190 `REJECTED_CORRUPT`) |

**Why 2,804 and 2,674 are both true, and not in conflict.** The 2,804
is the number of records the *mechanism-extraction* fix recovered from
the `UNCITED_NO_SOURCE` mislabelling. The 2,674 is where those records
ended up *after* the whole gate ran on them: their quotes are verbatim
in their documents, so they are no longer "uncited", but they then fail
a LATER layer, so they are not admitted either. The 190 that moved out
of `CORRUPT_QUOTE` are a class of their own, and

```
2,484 (semantic fail) + 190 (rejected corrupt) = 2,674
```

**The re-derived per-layer tallies, under the gate's OWN predicates**
(`node reconciliation/_verify_layer_tallies.mjs` — not a re-implementation
of the rules, the gate's exported `checkL1..L4` called directly):

```
corpus records            5,303
L1 verbatim provenance     3,772  (71.1%)
L2 numeric containment     1,989  (37.5%)
L3 span anchoring          1,098  (20.7%)
L4 mechanism entailment    2,107  (39.7%)
ADMITTED (all four)        1,098  (20.7%)

per class:
CITABLE_VERIFIED      n=1,098  L1=1,098  L2=1,098  L3=1,098  L4=1,098  ADMITTED=1,098
HONESTLY_UNCITED_PRIOR n=2,881  L1=2,484  L2=  828  L3=    0  L4=  867  ADMITTED=    0
DERIVED_MARKET_SYNTH. n=1,134  L1=    0  L2=   43  L3=    0  L4=    0  ADMITTED=    0
REJECTED_CORRUPT      n=  190  L1=  190  L2=   20  L3=    0  L4=  142  ADMITTED=    0
```

**The two views of the corpus agree**: the gate admits 1,098 records
and exactly 1,098 records carry `status: ACTIVE`. Those are computed
by different code paths — one calls the gate's predicates, the other
reads the builder's own field — so their agreement is a check on both.

**The 2,674 are not a provenance failure, and the corpus now says so.**
Every one of them fails L2 and/or L4, and NONE fails for some other
reason (`node reconciliation/_why_semantic_fail.mjs`):

```
L2 only  (the number is not in the quote)     1,009
L4 only  (the mechanism is not entailed)        502
L2 AND L4                                     1,163
neither (some other layer)                        0
```

So the honest answer to "how many remain uncited for real reasons" is
**397 (7.49%)** — the quote is in no document at all. The other 2,674
(50.42%) have their quote byte-exact in the document they name; what
they lack is support for the claim, which is a different and better
problem than a broken citation.

**One gap this exposed, and did not fix:** the builder computes
`_failed_layers` for every record whose verdict was not admitted, and
then **does not persist it**. So the corpus records THAT a record
failed without recording WHAT failed. The numbers above are re-derived
by `reconciliation/_why_semantic_fail.mjs` for exactly that reason.
Persisting the field is the fix; it is not done here.

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

### Three further defects, found by reading the labels

The `status` field did not exist at first, and adding it exposed three
more defects in the builder. Each was found by asking whether the label
was TRUE, not by reading the code.

**The mechanism was searched in the record's REGION, not the document.**
The record's region is its own field -- an abstract, which these corpora
TRUNCATE to 300 characters. The mechanism sentence is a different
sentence of the same document and routinely falls just past the
truncation: the mechanism for record `2609.33664` sits at file offset
1241, past the end of its 300-char region. **2,804 records** were
stamped `UNCITED_NO_SOURCE` for this reason, with both of their quotes
in the document all the time. The mechanism is now located in the
document, and the offsets are document offsets -- the same space the
gate checks them in.

**JSON syntax reads like prose to a sentence splitter.** Searching the
whole document made the extractor pick
`Sutherland",
 ],
 "date": "Submitted 28 September, 2026;` as a
"mechanism". A mechanism must now read like a sentence: no quote marks,
braces or brackets, a sentence terminator, and not a `field: value`
pair.

**A dataset slug is not a quotation.** The Kaggle registry's records
have `nickcantalupa/nfl-team-data-2003-2023` where a quote should be
-- a database KEY that asserts nothing. **79 records** were stamped
`CITABLE_VERIFIED` on one. They are now `REJECTED_CORRUPT`, the same
verdict the `ASSOCIATION_ONLY - 1 - 0.8507...` row dumps get: a machine
identifier wearing a quotation's clothes.

And the status itself: the gate's refusal branch returned
`UNCITED_NO_SOURCE` for a record whose quote was demonstrably in its
document. A record with no document and a record whose document was
there but whose claim was unsupported wore the same label, and
**2,484 records** were the second kind wearing the first kind's name.

### Measured under the independent gate

```
corpus records            5,303
L1 verbatim provenance     3,772  (71.1%)
L2 numeric containment     1,989  (37.5%)
L3 span anchoring          1,098  (20.7%)
L4 mechanism entailment    2,107  (39.7%)
ADMITTED (all four)        1,098  (20.7%)

citable records whose span does NOT select their quote    0
non-citable records claiming a span or the EXACT tier     0
all 26 FOUNDATIONAL papers -> HONESTLY_UNCITED_PRIOR     yes
```

And per class, under the gate:

```
CITABLE_VERIFIED      n=1,098  L1=1,098  L2=1,098  L3=1,098  L4=1,098  ADMITTED=1,098
HONESTLY_UNCITED_PRIOR n=2,881  L1=2,484  L2=  828  L3=    0  L4=  867  ADMITTED=    0
DERIVED_MARKET_SYNTH. n=1,134  L1=    0  L2=   43  L3=    0  L4=    0  ADMITTED=    0
REJECTED_CORRUPT      n=  190  L1=  190  L2=   20  L3=    0  L4=  142  ADMITTED=    0
```

Every `CITABLE_VERIFIED` record passes all four layers, and no other
record is admitted. The builder and the independent gate agree exactly.

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

## 7a. The live database was serving an empty corpus

This was found by asking the retrieval function what it actually
returns, rather than by reading the SQL.

The class filter is on `lit.premise`, JOINED to `lit.premise_vector`
(where the HNSW index lives), so the ANN search returns its top-k and
the filter is applied afterwards. That is a post-filter, and a
post-filter can under-return.

MEASURED, BEFORE ANYTHING WAS CHANGED:

```
asked for k=  5  got   1  SHORT by 4
asked for k= 20  got   1  SHORT by 19
asked for k= 50  got   1  SHORT by 49
the same search with NO class filter returns 5,513
```

The shortfall was real, and it was **not** a post-filter artifact: the
planner had chosen a filter-first plan (Bitmap Index Scan on
`premise_record_class_idx`), and there was genuinely only one premise
in the table with the right class.

**Why there was only one.** The premise rows were written *before* the
`record_class` and `status` columns existed, so they all carried the
columns' DEFAULTs:

```
5,511  HONESTLY_UNCITED_PRIOR / UNCITED_NO_SOURCE
    1  CITABLE_VERIFIED / ACTIVE
```

The corpus file on disk has the truth (1,098 ACTIVE) and the loader
carries `record_class` and `status` through — but the database had
never been told. Every premise was honestly stamped
`UNCITED_NO_SOURCE` by default, and the filter correctly excluded
every one of them.

**The gate was not lying. The data behind it was empty.** This is the
same shape as the original defect: a label that reads like
verification, over nothing.

Three things were needed:

1. A re-stamp touching **only** the two columns, keyed on the loader's
   own `premise_key` construction (read from the loader's source,
   because importing `build-index.cjs` *runs* the whole build). The
   embeddings, the ids and every other column are untouched.
2. The 231 corpus records that had no premise row at all — the corpus
   grew from 5,149 to 5,303 during re-anchoring — embedded with the
   loader's own `--only-missing` path. 231 embedded, 0 failed.
3. A **schema gap the re-stamp found**: the corpus stamps
   `MSVH_S0_CORRUPT_MARKDOWN_ROW` on the 190 records whose "quote" was
   a database row, and the CHECK constraint did not allow that tier.
   The constraint also had to be **dropped and re-added** rather than
   added when absent — the `IF NOT EXISTS` guard meant widening the
   allowed set would silently not happen on a table that already had
   the narrower constraint. A guard that prevents a change from taking
   effect is the same shape of defect as a default that admits
   everything.

MEASURED, AFTER:

```
2,484  HONESTLY_UNCITED_PRIOR / LINK_VERIFIED_SEMANTIC_FAIL
1,135  DERIVED_MARKET_SYNTHESIS / DERIVED_TABLE
1,099  CITABLE_VERIFIED / ACTIVE
  836  HONESTLY_UNCITED_PRIOR / UNCITED_NO_SOURCE
  190  REJECTED_CORRUPT / LINK_VERIFIED_SEMANTIC_FAIL
5,745  TOTAL

asked for k=  5  got   5  complete
asked for k= 20  got  20  complete
asked for k= 50  got  50  complete
```

The plan is still filter-first, so the completeness is not an artifact
of a different plan. The 19.1% admitted rate is the real number, and
it is the number the corpus file says it should be.

**All of this is on the dev branch `dev-lit-vectors-2026-10`.**
Production `main` has no `lit` schema and no pgvector extension, so
the stack has never been deployed there at all.

---

## 7b. The three stages, joined

The spec describes a three-stage hybrid. The code had two separate
functions and nothing between them: `discoverCausalStructure` did FCI
→ PAG → ADMG and **stopped**. It never ran Stage 2, so the circle
marks were carried into the ADMG unresolved, and the projection used
the *maximally-confounded* representative — any edge that is not a
definite tail→arrowhead becomes bidirected.

That representative is sound in one direction (it never over-claims),
but it is not the spec's Stage 3, and it is not harmless.

MEASURED on a clean chain 0 → 1 → 2 with **no latent confounder**
(n=6000):

| projection | directed | bidirected |
|---|---|---|
| spec's Stage 3 | `0->1, 0->2, 2->1` | (none) |
| maximally-confounded | (none) | `0<->1, 0<->2, 1<->2` |

**Three false hedges.** A hedge is not a conservative annotation: it
makes the Shpitser-Pearl ID algorithm *fail*, so each one refuses an
effect the data identify. The pessimistic rule never over-claims; it
also claims nothing at all on clean data.

### The order of the rules is the whole thing, and I got it wrong first

I tested `|W| > tau_edge` before the residual covariance, reasoning
that a large coefficient means a real edge. Measured on a
two-variable **latent-confounder** SCM, the residual z was **49.5** —
the confounding is overwhelming — and `|W|` was 0.39, and the edge
came out **directed** `0->1`: a direction the data cannot identify,
on a graph that would then let do-calculus mint a causal claim about
it.

**A large coefficient is the signature of confounding, not evidence of
direction.** A common cause induces a direct-looking coefficient
between its effects, and the larger the confounding, the larger the
induced coefficient. So the residual correlation is tested *first*: if
the residuals stay correlated, the direction is not identified
whatever the coefficient says. That is the spec's circle-arrow rule
generalised — the spec's version is the special case "DYNOTEARS set
`W_0,ij = 0`", and the general form is "the confounding is real,
whether or not the coefficient happened to be estimated at zero".

MEASURED, AFTER THE REORDER:

```
clean chain, no confounder
  0-1  directed   |W|=0.4346  |z|= 0.439
  0-2  directed   |W|=0.8673  |z|= 0.158
  1-2  directed   |W|=0.5261  |z|=-0.603
  -> directed 0->1, 0->2, 2->1, bidirected (none)

latent confounder (shared u drives x0 and x1)
  0-1  bidirected |W|=0.3915  |z|=49.498
  -> the confounding is real, the direction is not identified
```

**Every projection decision carries its reason.** A projection with no
audit trail is a projection nobody can check, so the pipeline returns
one decision per PAG edge with the numbers that produced it.

### The stack was unreachable

A repo-wide sweep for non-test callers:

| function | non-test callers |
|---|---|
| `discoverCausalStructure` | **0** |
| `dynotearsFit` | **0** |
| `pagToAdmg` | **0** |
| `runShpitserPearlIDC` | 1 (the gate) |
| `evaluateCausalClaim` | 1 (the retrieval path) |

And **none** of the causal modules were exported from `src/index.ts`
— 456 export blocks in that file, not one of them from `causal/`.

Even once reachable, wiring them together needed four pieces of
knowledge a caller should not have to assemble: that
`discoverCausalStructure` exists, that its `admg` is a `PagAdmg` over
*numeric* indices, that `admgToCausalADMG` converts it, and that the
result's node ids are `v0`/`v1` rather than the **signal names** the
literature edges use. A caller who got that wrong would check
identifiability against a graph with the wrong node names — and the
gate would refuse it with "not identified", which looks like a finding
rather than a wiring bug.

So the wiring is now one call:

```ts
const { admg } = discoverCausalStructure(matrix, { ... });
const graphForEdge = graphForEdgeFromDiscovery(admg, signalNames);
await runCausalEdgeSuite(db, { graphForEdge });
```

and the sweep asks the gate whether each edge's effect is identified
**in the graph the pipeline discovered**, rather than in a graph the
edge asserts about itself.

The topological order comes from `admgToCausalADMG`'s Kahn sort rather
than a second implementation — two topological sorts is two chances to
disagree, and the disagreement would show up as a graph the gate
accepts in one place and rejects in another. And the signal names are
applied to the **node ids**, not to the positions: a name belongs to a
variable, not to a position in an ordering.

---

## 7c. The class filter had 22 read sites to check; it had 77

The class-A coverage check looked for `FROM lit.premise` and
`FROM lit.premise_score`. It reported **"22 read sites, 0 gaps"**,
and that sentence was true and useless.

The delta **magnitude** lives in `lit.activation` (`activation_score`),
the graded outcome lives in `lit.residual`, and the edge lives in
`lit.causal_edge`. A query written as

```sql
FROM lit.activation a JOIN lit.premise p ON p.id = a.premise_id
```

has `lit.activation` as its FROM — so the pattern never fired on the
line, and the JOIN and the WHERE that follow it, where the filter has
to be, were never examined.

MEASURED, against the real database, with a checker that looks at
every table that can carry a number into a reasoning path:

| hop | rows pointing at a non-class-A premise |
|---|---|
| `lit.activation` | **781** (641 `HONESTLY_UNCITED_PRIOR`, 140 `DERIVED_MARKET_SYNTHESIS` — every one 'active') |
| `lit.causal_edge` | 16 (all retired, unreachable) |
| `lit.premise_score` | 69 |
| `lit.residual` | 295 |
| `lit.intervention_test` | 38 |

781 activations pointing at premises with no document behind them,
and `activation_score` **is** the magnitude of the delta. A number
that looks like a measurement and is not one — the exact shape of the
corruption this reconciliation exists to remove.

### Six real leaks, fixed

1. **`run-loop.cjs` — the activation read that grades premises.**
   It pulled `activation_score` for every activation and wrote
   scores for unverified premises.
2. **`run-loop.cjs` — the promotion gate had `record_class` but not
   `status`.** A `CITABLE_VERIFIED / LINK_VERIFIED_SEMANTIC_FAIL`
   premise — class-A, but whose claim does *not* follow from its
   quote — could be promoted to a causal edge. The TypeScript
   promotion path has had both halves since the class filter landed.
   This one *looked* complete because the class filter *looks*
   complete.
3. **`run-loop.cjs` — the scorecard recompute**, which writes the
   `graded` / `mean_residual` / `residual_mse` the promotion gate
   reads.
4. **`run-loop.cjs` — the intervention-test loop**: the edge list, the
   edge fetch, and the residual read.
5. **`literature-retrieval.ts`** — the edge fetch *by key* (the key is
   whatever the caller passed), the residual read, the scorecard
   recompute, and the activation-score read.
6. **`apps/web/lib/literature/literature-residual-bridge.ts` — a live
   settlement path.** It reads the premises that fired for a settled
   pick and grades them; grading writes a residual; the residual
   becomes the `activation_score`. The web app's own read was
   unfiltered.

### A promoted edge whose premise loses class-A is now retired

The promotion gate refuses to *create* such an edge, but an edge
created while the premise was class-A stays promoted after a corpus
rebuild re-classifies it. The 16 edges in the database were already
retired — that was luck, not a rule.

### And the stale rows are gone

The code fix prevents the next row; it does not remove the ones
already there, and a reader of the table cannot tell which is which.

| deleted | what |
|---|---|
| 38 | `lit.intervention_test` — the shock evaluations of non-class-A edges |
| 295 | `lit.residual` — the graded outcomes of non-class-A premises |
| 781 | `lit.activation` — the activations of non-class-A premises |
| 69 | `lit.premise_score` — the scorecards of non-class-A premises |

The 16 retired edges are **kept** — deleting them would destroy the
record of what was once promoted.

MEASURED, AFTER:

```
CLEAN  lit.activation
CLEAN  lit.causal_edge (promoted)
CLEAN  lit.premise_score
CLEAN  lit.residual
CLEAN  lit.intervention_test

the retrieval function returns 50 of 50 CITABLE_VERIFIED / ACTIVE

class-A coverage check   77 read sites, 0 without the class filter
```

### The checker also learned three things

- Its window was **12 lines** wide, so a 17-line explanatory comment
  between the FROM and the filter pushed the filter out of range and
  the check reported a gap that was not there. A false gap teaches the
  reader to ignore the check. The window is now 30 lines.
- It counted **test files** as read sites. A test's mock DB answers
  whatever the test tells it to, and a test's SQL is not a production
  query. Twenty-odd false gaps buried the real ones.
- A site that only **updates a boolean flag** derived from the
  (filtered) edge set is not a read of a reasoning number, so it is
  exempt — explicitly, with the reason stated, so the exemption is
  visible to the next reader rather than looking like a hole.

---

## 7d. A refusal that names the measurement

The spec's section 4.4 was not implemented. The code listed one
hedge's candidate edges and stopped. The spec says:

> HCID collects **every** witnessing ID-hedge pair… taking the
> **intersection** of the candidate edges across all collected hedges…
> for any point-in-time observable mediator M with
> `t_valid(U) <= t_valid(M) <= t_valid(V)` and `N_M >= 30`… If the
> expanded graph `G_e` passes ID with **zero hedges** and passes
> Adversary Review (E-value >= 1.35), the mediator expansion is
> activated.

Three things changed:

| was | now |
|---|---|
| one hedge's candidate edges | the **intersection** across every collected hedge |
| edges listed, never tested | the graph is **expanded** and **ID is re-run** on it |
| observability constraints ignored | `t_valid` ordering and `N_M >= 30` checked, with the reason reported |

MEASURED, on the spec's Case 1 confounded bow-arc:

```
the ORIGINAL graph                        fails ID
the EXPANDED graph                         identifies the effect
  PublicShare -> SharperMarketShare -> ATS_Cover   with zero hedges
```

The verdict now carries the plan — `hedge_count`, `enabling_edges`
(the intersection), and `activating_mediators` — and the reason names
the specific signal:

> …Measuring SharperMarketShare would break it: the expanded graph
> identifies the effect with zero hedges.

> …Measuring a mediator on PublicShare -> ATS_Cover could break the
> hedge (the registered mediators were tried: RareSignal ineligible:
> TOO_FEW_SAMPLES (N < 30)).

A refusal that names a measurement which does *not* work is worse
than one that names none, so `activating_mediators` is populated only
from candidates whose expansion was actually run and actually
identified the effect. Everything else appears in the reason as an
ineligible candidate — which is still information.

**The registry gap is stated, not papered over.** The spec says the
mediator comes from `signal-registry.ts`, but the registry's
`SignalDefinition` carries no `t_valid` and no sample count. So the
caller supplies them through the `mediators` option, and the module
header says why. Inventing a validity order the registry does not
have would have been a fabricated constraint.

---

## 7e. The do-calculus verifiers, audited by reading them

A082 (`reconciliation/_verify_do_calculus_math.mjs`) and A083
(`reconciliation/_verify_estimand_numerically.mjs`) are one-off scripts,
not part of the test suite. Their numbers are provisional until they
run under CI. The audit read the code, not just the output.

**A082 — structural.** It builds a canonical string for the module's
factor tree and compares it, node for node, against a hand-written
form of the published equation. The density/mean distinction is
explicit and is the whole content of the comparison: inside a
`MARGINAL_SUM`, a conditional whose TARGET is the summed node is a
density (`@d`) and every other conditional is a mean (`@m`). For the
front door it asserts exact equality:

```
Sum[M](*(P(M|X)@d * Sum[X](*(P(X|)@d * P(Y|X,M)@m))))
```

which is the published form, using the marginal `P(x')`. The
no-false-hedge sweep (18,144 queries over every 4-node DAG) and the
order-invariance check (600 comparisons) are present and are real
sweeps, not spot checks.

**A083 — numeric.** It builds linear-Gaussian SCMs, fits them from
observational samples only, and evaluates the module's tree by central
difference. The three prior harness defects are fixed **in the code**,
not just claimed:

- *Gauss-Jordan*: the pivot row is normalised before elimination
  (`M[c][k] /= p`), and the elimination loop skips only the pivot row
  itself (`if (r === c) continue`) — the wrong-row division is gone.
- *LCG NaN*: the RNG takes the top 24 bits (`(s >>> 8) / 16777216`),
  so it lands in `[0, 1)`; `Math.log` of a number above 1 was the NaN
  source.
- *density treated as mean*: the evaluator distinguishes them
  explicitly, in both scripts.

**A083 distinguishes the two front-door forms rather than just
checking one.** This matters, because the two differ numerically:

```
the module's tree gives:   5.9710     <- the spec's marginal P(x') form
the spec's equation gives: 5.9710     <- identical
variant A (P(x'|m)) gives:  8.2716     <- rejected, and rejected BY THE CHECK
the truth is:               6.0000
```

The variant that conditions on the mediator is *actively asserted to
be wrong*, so the check is discriminating rather than merely
confirming whatever the module happens to do. Two consecutive runs
produce byte-identical output.

**X20 IS STILL OPEN, and the audit confirms it by reading.** The spec
publishes Case 3 as a RATIO over `w`:

```
P(y | do(x)) = [SUM_w P(w) P(z|w) P(y|w,z,x)] / [SUM_w P(w) P(z|w) P(y'|w,z,x)]
```

The module returns a MARGINAL SUM over `Z`:

```
Sum[Z](*(P(Z|W)@d * P(Y|W,Z,X)@m))
```

A082 does not assert full tree equality for Case 3 — it checks only
partial properties (that `Z` is marginalised with `P(Z|W)`, and that
`W` is held), and it *prints* a note that the module's estimand
conditions on `W`. A083's 4-node check evaluates the module's tree and
recovers the true slope 5 (4.9942), but it never evaluates the spec's
published ratio for comparison. So the numeric evidence validates the
module's form; it does not settle whether the module's form is the
spec's form. **The two are not the same expression, and nothing in
either verifier asserts that they are.** That is X20, unchanged.

**The control arm of the G3 integration test, verified by mutation**
(`node reconciliation/_verify_control_arm.mjs`). The first run of that
suite passed for the wrong reason — the control arm was empty — and
the fixture was fixed. A claim that a fixture is fixed is a claim, so
the fixture is MUTATED and the suite is required to go red:

| mutation | result |
|---|---|
| control rows moved AT `doValue` (the original bug) | RED, 3 failed |
| both arms given identical outcome rates (rate ratio 1) | RED, 2 failed |
| restored | GREEN |

Both mutations break the suite, so the control arm is load-bearing and
the "the fix works" claim is a measurement rather than a restatement.

**The E-value gate, verified by mutation** (`node
reconciliation/_verify_e_value_gate.mjs`). Same method, because a
passing test named "a WEAK E-value does NOT activate it" is not
evidence the gate is enforced:

| mutation | result |
|---|---|
| the E-value dropped from the activation condition | RED, 4 failed |
| the threshold lowered to 0 | RED, 3 failed |
| an UNKNOWN E-value treated as a pass | RED, 1 failed |
| restored | GREEN |

All three break the suite, so the gate is load-bearing.

**The four tests that moved the suite from 192/192 to 196/196** are in
`packages/prediction-engine/src/literature/__tests__/gate-g3-integration.test.ts`,
added in `0f9a00998`:

1. `refuses a causal PASS when the effect is not identified in the graph`
2. `allows a causal verdict when the effect IS identified in the graph`
3. `refuses when NO graph is supplied (prevents an unchecked effect posing as a verified one)`
4. `still refuses an edge that is not promoted, before the gate is consulted`

Test 2 is the control arm: it drives the same fixture with a graph in
which the effect IS identified, and asserts the statistical test ran
and returned `PASS`. So test 1's refusal is attributable to the gate
and not to the fixture failing to produce a result.

---

## 8. Verified
| check | result |
|---|---|
| `node scripts/build-grounded-mind-corpus.mjs` | exit 0, referee 50/50, 5,303 records |
| the builder RE-RUN after A087 | exit 0, referee 50/50, output **byte-identical** to the committed corpus |
| the status distribution, re-measured | ACTIVE **1,098** / LINK_VERIFIED_SEMANTIC_FAIL **2,674** / UNCITED_NO_SOURCE **397** / DERIVED_TABLE **1,134**; **20.71%** admitted |
| the per-layer tallies, under the gate's own predicates | L1 3,772 / L2 1,989 / L3 1,098 / L4 2,107 / **ADMITTED 1,098**; gate-admitted == ACTIVE count |
| why the 2,674 fail | L2 only 1,009, L4 only 502, L2+L4 1,163, **neither 0** |
| `node reconciliation/_verify_control_arm.mjs` | 2/2 mutations RED, restored GREEN — the control arm is load-bearing |
| `node reconciliation/_verify_e_value_gate.mjs` | 3/3 mutations RED, restored GREEN — the E-value gate is load-bearing |
| `node reconciliation/_verify_do_calculus_math.mjs` (A082) | all checks PASS; 0 false hedges on 18,144 queries; 0 mismatches on 600 reorderings |
| `node reconciliation/_verify_estimand_numerically.mjs` (A083) | front door 5.9710 vs 6.0 (and the rejected variant 8.2716); 4-node 4.9942 vs 5.0; **byte-identical across runs** |
| `node scripts/reanchor-mind-corpus.mjs` | 79 re-anchored, 397 quarantined, 1,098 admitted |
| literature + reasoning + causal suites | **310/310** (32 files) |
| the FULL prediction-engine suite | 7,376 passed, 1 failed, 4 skipped; **4 files fail, all pre-existing** (verified identical at the pre-A087 base `5f54ee254`: `honesty-surface`, `log-loss-isotonic-debug`, `metric-birth-certificate`, `yacoe-edge-candidate` — none touched by this work) |
| mutation suite (honesty probes) | 11/11, **4/4 mutants caught** |
| FCI, on 20,000 rows per scenario | skeleton tp=9/9, colliders tp=3/3, precision and recall 1.000 |
| three-stage pipeline, clean chain | directed 0→1, 0→2, 2→1; bidirected (none) |
| three-stage pipeline, latent confounder | bidirected, residual z = 49.5 |
| L_lit gradient vs central finite difference | max error **2e-11** |
| class-A coverage check | 4 insert paths, **77 read sites**, 0 gaps |
| the delta chain, against the real database | 5 hops, **0 leaks**; retrieval returns 50/50 class-A |
| HCID + the mediator expansion | 11/11; the expanded graph identifies where the original hedges |
| schema applied to Neon | clean; filter bites; default is honest |
| every insert path against the real schema | 4/4 PASS |
| the live database's class distribution | **1,099 CITABLE_VERIFIED / ACTIVE** (19.1%) |
| retrieval completeness | k=5→5, k=20→20, k=50→50, all complete |
| `tsc` | 66 errors, down from **74 at baseline**, **zero new** signatures |
| **PRODUCTION `main`: the schema deployed** | pgvector 0.8.0, the `lit` schema, 10 tables, HNSW indexes present |
| **PRODUCTION `main`: the class-A corpus** | 1,099 rows copied with their 1,024-dim embeddings, **0 failures** |
| **PRODUCTION: Recall@20, through the function** | **100.000%** (200/200 probes); 0 non-class-A rows returned; asked for 20, got 20 |
| the schema on a CLEAN database | applied cleanly — after fixing two bugs the dev branch had masked (a guard/drop mismatch and an out-of-order FK) |
| the three frontier modules | 46/46 tests; **20 of 20** threshold constants verified COMPARED; exported from the package index |
| the full package suite | **529/529** (54 files) |

The 66 remaining tsc errors are pre-existing and live in files this work
does not touch (`index.ts`, `reasoning/*`, `scoring.ts`,
`literature-registries.ts`).

---

## 9. Production, and the three frontier modules

### 9a. The schema is deployed, and two bugs were hiding in it

The production branch `main` of `summer-brook-99380762` now carries
the literature schema. It did not, and the reason it could not is
worth recording, because **the dev branch masked both bugs**.

The measurement came first
(`reconciliation/_probe_production_state.mjs` — READ-ONLY, no DDL, no
DML):

| | production `main` | dev `dev-lit-vectors-2026-10` |
|---|---|---|
| pgvector | **ABSENT** | 0.8.0 |
| the `lit` schema | **ABSENT** | present, 10 tables |
| class-A rows | 0 | 1,099 |
| HNSW indexes | none | `corpus_item_hnsw_idx`, `premise_vector_hnsw_idx` (m=16, ef_construction=64) |

**Bug 1 — the constraint guard did not match the drop.** The block
guarded `ALTER TABLE lit.premise DROP CONSTRAINT
premise_verification_tier_chk` with a check for a constraint whose
*definition* mentions `verification_tier`. On a FRESH schema the
table is created with an inline (unnamed) CHECK, so the
definition-based guard is TRUE and the named DROP then fails with
*"constraint premise_verification_tier_chk of relation premise does
not exist"*. **The schema could not be applied to a clean database at
all.** The dev branch worked only because it already had the named
constraint from an earlier deploy.

**Bug 2 — a foreign key pointed at a later table.** `lit.discovery_hit`
REFERENCES `lit.retrieval_event`, and `discovery_hit` was declared
*before* `retrieval_event`. Same blindness, same reason.

Both were found by running the schema against a **scratch branch
created from `main`** — which is exactly the production condition. The
guard now drops by name and also handles the inline constraint; the
FK target is now created first.

### 9b. What was deployed, and what was deliberately not

The schema deployed is the EXISTING `reconciliation/schema_literature.sql`
— the one the 84 read sites already query. **Not** the plan's
proposed `literature_premises` table, which is a different shape
(different name, different columns, a different index) and would have
created a second, unread copy of the corpus beside the one the code
uses. The plan's `(m = 24, ef_construction = 200)` is likewise not
what the deployed index uses; the deployed one is `(m = 16,
ef_construction = 64)` on `lit.premise_vector` joined to
`lit.premise`, and that is what was deployed.

The rows are **copied** from the dev branch with their 1,024-dim
embeddings (`reconciliation/_copy_class_a_corpus.mjs`), not
re-embedded: the dev branch already holds those exact vectors, and
re-embedding would need an embedding provider and would produce
vectors that are not bit-equal to the ones the retrieval path was
tuned against. The class filter is not optional — only
`record_class = 'CITABLE_VERIFIED' AND status = 'ACTIVE'` rows are
copied. The operational tables (`activation`, `residual`,
`retrieval_event`) are NOT copied: they are runtime state about this
database's traffic.

```
written: 1099   failed: 0
class-A rows WITH a vector: 1099
non-class-A rows claiming MSVH_S1_EXACT: 0
```

### 9c. The recall, and why the plan's 0.992 was not the binding constraint

Measured on production, probing with each premise's own embedding and
asking for its own key back:

| `ef_search` | Recall@20 |
|---|---|
| 40 (the pgvector default) | **92.000%** |
| 100 | **100.000%** |

The 8% shortfall was the HNSW **approximation**, not the index and
not the class filter: the exact nearest-neighbour path returned the
same 92% at k=20 *and* at k=50, which is the signature of a
truncated candidate list rather than a wrong answer. The plan's
"ef_search = 64" is also below the threshold and would still have
missed.

So `lit.retrieve_premises` now sets `hnsw.ef_search = 100` itself,
via `set_config(..., is_local := true)` so it does not leak into the
caller's session. It is set **in the function** because a caller that
forgets to set it gets 92% and does not know why.

Measured **through the production function**, not a raw query:

```
Recall@20 = 100.000%  (200/200 probes)
Recall@50 = 100.000%
non-class-A rows returned by the function: 0
asked for 20, got 20
```

The plan's 0.992 target is met, and by a margin that is measured
rather than asserted.

### 9d. The three frontier modules, and the audit of them

Three modules, written by subagents, then **audited rather than
trusted** — because a passing test suite proves a module does what its
own tests say, and says nothing about whether its constants gate
anything.

`reconciliation/_audit_frontier_constants.mjs` applies the same rules
as the repo-wide sweep: a constant is GATED if it is compared
directly, via an alias that is compared, via a `Math.max/min` clamp,
via a default parameter whose parameter is compared, or as a bound
passed to a validator.

```
20 of 20 threshold constants are COMPARED.
```

The mathematics was checked against the spec, not just the tests:

| module | what was verified |
|---|---|
| `proximal-bridge-id.ts` | the three refusal conditions, each enforced where the spec puts it: the Fredholm condition number against `MIN_FREDHOLM_CONDITION_NUMBER`, the overidentification J-test against `MIN_J_TEST_P_VALUE`, the VanderWeele-Ding E-value against `MIN_BRIDGE_E_VALUE` |
| `semiparametric-estimand-solver.ts` | the influence function has the spec's **three** terms — `phiY`, `phiX`, `phiW` — and the Verma-projected weighting density is applied over the admissible z grid |
| `itcr-orca-gate.ts` | the graph-level nonconformity is `max over v of (1 - product over ancestors of r_u)`; the Shafer–Vovk rank is `ceil((n+1)(1-eps))` by a named exported function; the rank-exceeds-n case is reported as **unbounded**, not silently clamped |

All three are exported from the package index, so they are reachable
and not merely present on disk.

**What each module does NOT do, in the modules' own words.** The
subagents were asked to state fidelity gaps plainly, and the modules
state them in their own headers rather than only in a report — which
is the better place for them, because a reader of the file sees them
without having to trust a summary.

`proximal-bridge-id.ts`:
- The bridge is a **linear sieve** in (a, w, x). It cannot represent
  a nonlinear bridge, so a nonlinear DGP is *rejected* by the J-test
  rather than fitted. Deliberate: refusal is the honest answer when
  the sieve cannot carry the function.
- **Completeness** — the "for all (a, z, x)" uniqueness of the
  Fredholm solution — is **assumed, not tested**. No finite sample
  can test it. The condition number is the closest available proxy,
  and passing it is *evidence, not proof*.
- The J-test is an **out-of-sample** over-identification test, and it
  does not test the exclusion restrictions themselves. It was
  **calibrated on 400 correctly-specified synthetic datasets and
  rejects 12% of them at the 10% level**, close to nominal.
- The E-value uses VanderWeele & Ding's continuous-outcome
  conversion (RR ≈ exp(0.91·d)), which is an **approximation** for a
  continuous outcome, not an identity.

**The gap against the spec, and closing it.** G4 requires **both** a
point E-value ≥ 1.35 and a CI E-value ≥ 1.10, and this module
originally computed only the point one — so the effect it admitted
was judged on a point estimate and never on the bound a reader would
have to believe. The CI condition is now implemented and enforced,
with its own threshold (`MIN_BRIDGE_CI_E_VALUE = 1.10`), its own
refusal code (`PROXIMAL_CI_E_VALUE_TOO_LOW`), and its own reason.

Closing it surfaced **a real bug in the analytic standard error**, and
the bug is the reason this entry is worth reading. The covariance
inverted the module's **mean** Gram matrix — which is divided by `n` —
instead of its **sum**, so the variance was inflated by the sample
size: the standard error came out at **2.57 for an effect of 0.44**,
and the CI E-value at 1.0, so every well-posed problem was refused.
Three successive covariance formulations were tried and the number
barely moved, which is what said the error was not in the algebra but
in the scale. A **bootstrap of the estimator's own spread** said 0.12,
and the two disagreed by a factor of `n` — which is what identified
the cause. With the `n` factor applied, the delta-method SE is
**0.105** and the bootstrap says 0.043.

That bootstrap cross-check is now a **test**, and it is the kind of
test that catches the class rather than the instance: removing the
`n` factor from either side of the sandwich makes the suite go red.
An analytic standard error is an analytic claim, and an analytic
claim that is wrong is invisible to a test that only checks the code
runs.

The CI condition is also independently binding, which was not
obvious. The CI E-value runs at 0.80–0.95× the point value, and the
two thresholds are 1.35 and 1.10 — a ratio of 0.815 — so the band
where the CI refuses and the point passes is narrow but real. The
test that pins it uses a **small sample** (n = 130), where the
interval is wide enough that the CI E-value collapses to 1.0 while
the point estimate is unaffected, and the refusal code is
`PROXIMAL_CI_E_VALUE_TOO_LOW` with the point E-value above 1.35.

```
literature + reasoning + causal + calibration   529/529 (54 files)
tsc                                             66 errors, down from 74 at
                                                baseline, zero new signatures
```

---

## 9. Still open

1. ~~**The literature schema is on the dev branch only.**~~ RESOLVED
   (see section 9). The schema is deployed to production `main`,
   pgvector 0.8.0 is installed, 1,099 class-A rows are loaded with
   their embeddings, and `lit.retrieve_premises` measures
   **Recall@20 = 100.000%** through the production function.
2. **The corpus is 20.7% admitted, not 100%.** 2,881 records are
   `HONESTLY_UNCITED_PRIOR`. That is the honest state, and it is
   materially smaller than the legacy 67.4%. A corpus of 1,098
   falsifiable premises is a corpus of 1,098 falsifiable premises.
3. **The causal stack is reachable but not yet driven by a live model.**
   `discoverCausalStructure` and `graphForEdgeFromDiscovery` now exist
   and are exported, and the wiring is one call — but no production path
   invokes them yet, because doing so changes predictions. That is a
   human call.
4. **DYNOTEARS is contemporaneous only.** The lagged terms `A_τ` are
   out of scope, and the module header says so.
5. **FCI's R5–R7 are not implemented** and R9/R10 are replaced by a
   sound-but-weaker completion, so the PAG can carry more circles than
   a complete FCI would leave.
6. **The 26 `FOUNDATIONAL_PAPERS`** are hand-authored principles with no
   document behind them. They are preserved as structural
   edge-existence hypotheses and are excluded from the literature path
   entirely. Whether to source them or retire them is a decision, not a
   bug.
7. ~~**X20 — the Case-3 ratio-form mismatch.**~~ RESOLVED, and the
   module is RIGHT. The two forms are different FUNCTIONS — the spec's
   equation conditions on `z` and the module's on `w` — and they
   recover the SAME causal effect: measured on a linear-Gaussian SCM
   whose true total effect is 5, the module's `E[Y | W, X]` gives
   slope **5.0085** and the spec's ratio `E[Y | Z, X]` gives slope
   **5.0085 at every z**, the largest disagreement being **3e-6**. The
   patch that was proposed for it was implemented, measured, and
   REVERTED: it would have replaced a correct answer with a
   differently-conditioned one. Two tests now compute both estimands
   and assert the slopes agree. See section 7e.
8. **The builder does not persist `_failed_layers`.** The corpus says
   THAT a record failed and not WHAT failed. The per-layer breakdown
   in section 2 is re-derived by a script for that reason; persisting
   the field is the fix and it is not done.
9. **A082 and A083 are one-off scripts, not tests.** Their numbers
   reproduce, but they do not run under CI, so nothing prevents them
   from silently drifting from the module they check. Moving them into
   the suite is what turns provisional evidence into standing evidence.
10. **66 pre-existing tsc errors**, untriaged. Zero new ones from this
    work, but they are still there.
11. **The three frontier modules are not wired into a caller.** They
    are implemented, tested, audited, and exported — and nothing
    invokes them yet. `ProximalBridgeIDEngine` in particular is the
    thing that would let an unbreakable bow-arc be answered instead of
    refused, and the refusal path is still what runs. Wiring it
    changes what the engine publishes, so it is a call, not a
    default.
12. **`lit.retrieve_premises` is now `plpgsql` rather than `sql`**, to
    set `hnsw.ef_search` locally. That is a deliberate change for
    recall, and it costs the inlining the `sql` version got. If a
    caller relies on the function being inlinable, that is a
    regression to check.

## The three frontier modules, audited

Three modules were written by delegated workers: the proximal bridge
(`proximal-bridge-id.ts`), the semiparametric estimand solver
(`semiparametric-estimand-solver.ts`), and the ITCR/ORCA trace gate
(`itcr-orca-gate.ts`). Each passed its own suite — 11, 16 and 19
tests — and a test suite proves only that the code runs as written.

**The constants check.** Every threshold-named constant in the three
files is COMPARED against a value, not merely declared: 20 of 20 in
the proximal and semiparametric modules, 6 of 6 in ITCR. That is the
defect class this audit has been hunting, and these three files do not
have it.

**Two of the three had a gate that was not wired.** The semiparametric
module computed `ePoint` and `eCi` and reported them, and had **no
threshold constant at all** — so an estimand with an E-value of 1.0
(no unmeasured confounding could explain away no effect) was as
acceptable as one with an E-value of 10. A reported number that gates
nothing is a label. It now has `MIN_ESTIMAND_E_VALUE = 1.35` and
`MIN_ESTIMAND_CI_E_VALUE = 1.10` and a gate that judges the
conjunction, with the CI condition refusing on its own threshold. Five
mutations, all caught: removing either condition, raising the CI floor
to the point's 1.35, lowering the CI floor to 1.0, and collapsing the
two conditions into one.

**The ITCR trace score had a blind spot, and it is in the spec's
formula.** The spec's nonconformity is

    alpha_ITCR = max over v of ( 1 - product over u in An(v) of r_u )

— the product is over the node's **ancestors**. For a node with no
ancestors that product is empty, and the empty product is 1, so the
node's nonconformity is 0. MEASURED:

    a single root premise at validity 0.05   -> alpha_ITCR = 0
    the same root WITH a child               -> alpha_ITCR = 0.95

So a premise that is 5% reliable and has no descendants is
**invisible** to the score, and every premise in a flat trace — the
trace whose premises are least supported — scores zero. The gate
passes it.

The fix multiplies the node's **own** validity into its score, with
the weight as a named constant (`NODE_OWN_VALIDITY_WEIGHT`), so the
spec's ancestor term is preserved exactly and the root case stops
being invisible. The consequence is visible in the pruning test: with
the old formula, pruning the worst node left a residual alpha of
**0.01**, because the weak branch had scored only `1 - 0.99`. With
the fix it leaves **0.604**, which is the truth — the remaining graph
is still weak, and the old number hid it. The gate still halts,
because 0.604 is above the threshold.

An audit that only checked "does the constant get compared" would have
passed this. The constant is compared; the *formula* was wrong.

**What the workers got right, and it was not obvious.** The
semiparametric worker implemented the spec's stated weighting density
`p~ ∝ Var(Phi)^-1`, measured it, found it **increased** realized
variance by ~60% against uniform weighting, and changed it to
`p~*(z) ∝ f_Z(z)/Var(Phi(z))`, documenting the deviation. The reason
is sound: the 1/Var rule is the Hirano–Imbens weight for a weighted
average of *independent* per-z estimates, and this estimator is not
that — it reaches the grid through the density ratio `p~(Z)/f_Z(Z|W)`,
so inverse-variance without the marginal sampling density upweights
z-regions that are rarely observed. The proximal worker found that a
raw holdout J-statistic rejected **31.5% of 400 correctly specified
datasets** at the 10% level, diagnosed it as estimation error landing
in the identifying directions, and fixed it by projecting those
directions out — 12% false rejection with 100% power against a
misspecification. Both deviations are stated in the module headers.

**The honest limits, as stated.** No cross-fitting, so the EIF
standard error is optimistic under overfitting. The proximal bridge
is a **linear sieve**, not RKHS: a nonlinear bridge is *rejected* by
the J-test rather than fitted, and completeness is assumed rather
than tested. The ITCR coverage is marginal and conditional on
exchangeable calibration/gating traces and on the `r_v` being
genuinely calibrated; both are recorded in every threshold result
rather than claimed. The "alternative subgraph" is a retry target,
never re-gated on its own calibration set, and the returned reason
says so.

**The proximal bridge is now WIRED, and it changes what the engine
can do.** It was the module with the most value and the least use: it
was barrel-exported and nothing called it. The claim gate's refusal
path now runs it, which is the difference between a refusal and an
answer.

The bow-arc `X -> Y` with `X <-> Y` is refused by the ordinary path,
and correctly so — no g-formula identifies it. But if the confounder
is **proxied** (a treatment-inducing proxy `Z` and an outcome-inducing
proxy `W`), the effect IS identified, by proximal causal inference and
the proximal g-formula. The same claim, with the proxies supplied,
goes from "not identified" to a publishable CAUSAL claim, and
`formula_class` says `PROXIMAL_BRIDGE` — because a proximal estimate
and a g-formula estimate are not the same claim and a reader needs to
know which one they are looking at.

MEASURED end-to-end across 45 (seed, n, beta) combinations on the
bow-arc: **41 admitted and published, 4 refused and stayed refused.**
The gate never publishes a refusal it did not earn. The 4 that refused
kept their refusal, with the proximal refusal code and reason
reported, because "the proximal route also does not work, and here is
exactly why" is a specific finding and silence is not.

Four properties are pinned by tests rather than asserted in prose:

- the **refusal is not overridden** by a proximal attempt that did not
  earn it (the anti-overclaim test)
- a **malformed** proximal dataset is *reported*, not thrown out of the
  gate — a gate that crashes instead of returning a verdict is the
  same defect as a crash on an admission path
- a dataset with **no proxies** leaves the refusal byte-for-byte
  unchanged, so a caller without proxies sees exactly the old behaviour
- the solver's own gates are not bypassed: an admission requires the
  condition number, the J-test and **both** E-value floors

Four mutations, all caught: the attempt never made (RED 3), the
admission ignored — i.e. the wiring is dead (RED 1), the refusal not
reported (RED 2), the solver's gates bypassed (RED 2).

**The ITCR gate is now wired too, and it is the one that changes what
the engine will publish.** The claim gate scores the reasoning trace
*before* the graph is even consulted, and a trace that fails its
conformal gate refuses the claim.

The ordering is the point. A trace that halts makes the
identification question moot: there is no point deciding whether the
effect is identified when the reasoning that got us there does not
survive its own calibration. So the ITCR gate runs FIRST, and the
claim is refused with `REFUSED_G3_ITCR_TRACE_HALTED` and the numbers
that caused it.

MEASURED: a **perfectly identified** front-door claim, with a trace
whose premises are 5% reliable, is **refused**. The effect was
identified; the reasoning was not good enough to say so. That is the
distinction the spec's ITCR exists to make, and it is the one a
scalars-only conformal gate at the end of the pipeline cannot make.

The trace is **optional**. Absent a trace, the claim proceeds exactly
as before — the trace is a guard, not a licence. Present a trace with
no calibration set, the gate refuses (a conformal threshold computed
from nothing is not a threshold, and the gate can neither say ALLOW
nor say HALT). A malformed trace is *reported*, not thrown: the gate
must always return a verdict, and a crash out of a gate is the same
defect as a crash on an admission path.

The score is reported on **every** path, including the ones that
refused for a different reason, because "the trace was checked and it
passed, but the effect is unidentified" is a different finding from
"the trace was never checked".

Five mutations, all caught: the gate never run (RED 5), the HALT
ignored — i.e. the wiring is dead (RED 3), the score not reported on
the hedge-refusal path (RED 1), the score not reported on the ALLOW
path (RED 1), and the no-calibration REFUSED case turned into an
ALLOW (RED 1).

**The semiparametric solver remains unwired.** It evaluates the ratio
functionals that `do-calculus-id.ts` produces, and `do-calculus-id.ts`
emits `TIAN_C_FACTOR_RATIO` and `FRONT_DOOR` forms — so the solver is
computed on paper and never used to produce a published number. That
is the same defect one level up, and it is now the obvious next work.

**And the remaining unwired piece is the one the spec cares most
about.** `verifyRecord` / `verifyCorpus` — the L1–L4 four-layer gate
itself — have **no production caller**. They run in build-time
scripts (`build-grounded-mind-corpus.mjs`, `reanchor-mind-corpus.mjs`,
`run-l1-l4-verification.mjs`), and the runtime path trusts the
`record_class` those scripts stamp. So the four layers are enforced
when the corpus is BUILT and merely *read* when it is *used*. A
record re-classified by a later build follows the class, but no
runtime check re-verifies it against the document on disk.

## X20 was NOT fixed. The spec said it was. The code disagreed.

**The spec's claim.** The goal document states that open item X20
"closes both symbolically in A082 and numerically in A083", and gives
the exact patch: a `isMarginalizedCFactor` flag threaded through
`runShpitserPearlID`, with Line 6 dividing `activeQFactor` by its
Y-marginal when the factor was a post-Line-7 marginalized one.

**The code.** `do-calculus-id.ts` had **no `isMarginalizedCFactor`
flag and no RATIO emission at Line 6**. Line 6 built the answer out
of `observationalCond(...)` against the original graph, so it returned
the *unadjusted* functional regardless of what the distribution
actually was.

**The measurement that exposed it.** On the Napkin graph
(`W -> Z -> X -> Y`, `W <-> X`, `W <-> Y`):

    before:  class TIAN_C_FACTOR_RATIO   tree  P(Y|X)
    after:   class TIAN_C_FACTOR_RATIO   tree
             Sum_{W}[(P(W) * P(X|W,Z) * P(Y|W,Z,X))]
               / Sum_{Y}[Sum_{W}[(P(W) * P(X|W,Z) * P(Y|W,Z,X))]]

`P(Y|X)` on a graph where `W` confounds both `X` and `Y` is
**unadjusted**, and it is wrong. The formula class said RATIO while
the tree was not a ratio at all.

**Why nothing caught it.** A082 asserted **zero** `Ratio` trees --
`grep -c 'Ratio' _verify_do_calculus_math.mjs` returns **0**. The
verifier checked that Case 3 produced the class name
`TIAN_C_FACTOR_RATIO` and that its tree was
`Sum_{Z}[(P(Z|W) * P(Y|W,Z,X))]`, which is A082's *other* 4-node
graph (`W <-> X, Z <-> Y`), not the Napkin graph
(`W <-> X, W <-> Y`). **The Napkin graph was never in the verifier.**
The class-name check passed, and a class name is exactly the kind of
thing that reads like a gate while gating nothing.

**The fix, and the subtlety that took two attempts.** The flag
`isMarginalizedCFactor` distinguishes two things that look identical
at the call site:

- a **marginalized C-factor** (Line 7's kernel `Q[S']`, then Line 2
  summing the pruned nodes out of it) -- the derived joint of Tian &
  Pearl's Lemma 2, whose conditional is a **RATIO**;
- a plain **prune of the observational `P`** -- still an observational
  distribution, whose conditional is a **product of conditionals**.

Setting the flag at Line 2 alone broke the front-door graph, because
the front-door path reaches Line 6 through a Line-2 prune. The flag
has to be set at **Line 7** (where the c-factor kernel is
substituted) and merely *propagated* through Line 2. The two cases
are distinguished by where the derivation happens, not by whether a
marginalization happened.

**And the denominator is the numerator's Y-marginal.** Summing over
the whole C-component instead of over the targets would divide by a
marginal that already contains the target, and the ratio would be
`P(x,y)/P(x,y) = 1`.

**What this cost.** The A082/A083 numbers in the spec are still true
and still reproduce -- front-door 5.9710 vs 6.0000, 4-node 4.9942 vs
5.0000, 0 false hedges across 18,144 queries, 0 mismatches across 600
reorderings, A082 exit 0 and A083 exit 0. But those numbers were
never evidence about the Napkin graph, because the Napkin graph was
never tested. A verifier that covers a graph is not evidence about a
graph it does not cover, and the class-name check was the same
defect this audit has been hunting: a constant that reads as a gate
while gating nothing, one level up.

**The invariant that would have caught it** -- and is now a test:
`formulaClass === "TIAN_C_FACTOR_RATIO"` if and only if the tree
contains a ratio. The class and the tree must agree, and the bug was
precisely a disagreement between them.

## The L1–L4 harness was under-reporting by 238. A basename is not an
## identifier.

**The symptom.** The repo's independent four-layer gate
(`reconciliation/run-l1-l4-verification.mjs`) reported **860 admitted
(16.2%)** against the actual source documents, while the corpus file
carries **1,098** `CITABLE_VERIFIED` records and the production
database carries 1,099. Three numbers for one corpus, and the
independent gate — the one whose entire job is to check the corpus
against the documents on disk — was the outlier.

**The cause.** The harness builds its source library by walking
`docs/` and taking the **first file whose basename matches** a cited
name. **29 of the 68 cited basenames exist more than once on disk**,
in different directories. For those, the walk silently picked the
wrong document, and 138 class-A records had their quote in the *other*
file of the same name.

So L1 failed on quotes that **are** in the document. L3 failed for the
same reason — it slices the document the library happened to hold.
L4 failed downstream of it. 860 admitted was an artifact of a lookup
key, not a measurement of the corpus.

**This is the audit's own defect class in a different hat.** A lookup
key that does not uniquely identify the thing it claims to identify.
The key here is a basename; two documents in different directories
share it. Everywhere else in this audit the hunt has been for a
*constant* that reads as a gate without gating; here it is a *key* that
reads as an identifier without identifying.

**The fix, and the property that makes it safe.** When a basename has
several candidates, choose the one that actually **contains the quotes
of the records that cite it** — decided from the data, not from
directory order. Measured: **29 collisions resolved, 0 ties.** A tie
would be reported rather than resolved arbitrarily, because a tie means
the data does not say which document was meant.

**MEASURED, after the fix:**

    source library: 68 of 68 cited files located
    basename collisions resolved: 29 cited names exist more than once; 0 were ties

    total records              5303
    L1 verbatim provenance     3772  (71.1%)   was 3574 (67.4%)
    L2 numeric containment     1989  (37.5%)
    L3 span anchoring          1098  (20.7%)   was  860 (16.2%)
    L4 mechanism entailment    2107  (39.7%)   was 1824 (34.4%)
    ADMITTED (all four)        1098  (20.7%)   was  860 (16.2%)

**AND THE TWO INDEPENDENT GATES NOW AGREE EXACTLY:**

    the class-A subset: 1098 of 1098 admitted by the independent gate
    admitted records that are NOT class-A: 0

The corpus builder and the four-layer gate, which share no code path
for the L1–L4 decision, now agree to the record. That is the
convergence the spec asked for, and it was **not** true before: the
builder said 1,098 and the independent gate said 860, and the audit
recorded that as an open discrepancy rather than guessing which was
right.

**What the 1098 is.** It is 1098 of 5,303 corpus records (20.7%)
admitted — a real, low number, and *not* the 67.4% the retired
shape-only gate reported. The four layers are computed independently
against opened documents, so the figure is a measurement rather than a
count of rows that look right.

**The production count is 1099, and the extra row is not a corpus
record.** `lit.premise` holds one row with
`premise_key = 'test:class_a:citable'`, `source = 'test'`, left
behind by `reconciliation/apply_and_verify_class_a_schema.mjs`, which
inserts five `test:class_a:*` premises and never deletes them. It is
inert — its `lit.premise_vector` embedding is 1,024 dimensions of
**zero**, so cosine similarity is `NaN` and `retrieve_premises` can
never return it. But it is stamped `CITABLE_VERIFIED` / `ACTIVE`, so
any count taken with `count(*)` reads 1099.

**The spec's `chk_citable_verified_honesty` invariant does not exist in
production.** The goal spec requires a hard DB-level constraint
forcing `CITABLE_VERIFIED` to carry `citable = TRUE`,
`verification_tier = 'MSVH_S1_EXACT'` and non-null spans. Production
`lit.premise` has **no span columns at all** and no such constraint.
The *data* satisfies the invariant — measured over the corpus: **0 of
1,098 class-A rows violate it, and 0 of the 4,205 non-class-A rows
carry `citable = true`** — but the invariant is **checked by the
builder, not enforced by the database**. A row inserted directly with
`record_class = 'CITABLE_VERIFIED'` and no spans would be accepted.

The spec's `db/migrations/20261020_literature_hnsw_prod.sql` and its
`literature_premises` table **do not exist in this tree**, and no
`literature_premises` table exists in Neon. Production is the `lit.*`
schema. The spec describes a deployment that was never performed; the
data is in a different, working shape.

## Two of the spec's "existing" modules do not exist. Verified, not assumed.

The goal document's six-stage architecture diagram names these files
as existing components of the system:

    src/causal/causal-graph-builder.ts   -- Full FCI (R0-R10) + Lagged DYNOTEARS
    src/causal/periodic-timeseries-id.ts  -- Periodic ADMG + Jahn-Karnik-Schulman

**Neither file exists.** Verified directly:

    $ ls packages/prediction-engine/src/causal/causal-graph-builder.ts
    ls: cannot access '...': No such file or directory
    $ git log --all --oneline -- '*causal-graph-builder*'      # EMPTY
    $ git log --all --oneline -- '*periodic*'                   # EMPTY

Not "renamed", not "in another branch" — **never in this repository's
history.** The `git log --all` sweep covers every branch, so the
spec describes a deployment that was never performed.

**The FCI implementation that DOES exist is in `fci-pag.ts`, and it
documents its own gap honestly.** Its header says:

    "Orientation rules: R1, R2, R3, R4 (discriminating path) and R8
     are implemented. R5-R7 (uncovered potentially-directed-path
     rules) are NOT implemented, so this PAG can carry edges that are
     weaker than R9/R10. Net effect: the output is a valid PAG that
     may be less oriented than the true one. It never orients against
     a rule; it can fail to orient."

That is the honesty the audit has been demanding: the module says
what it cannot do, in the place a reader will look. It also means
the spec's claim of "R0-R10 including R5-R7 Selection Bias &
Possible-D-Sep" is **false for R5-R7** — and the code says so
itself.

**What `fci-pag.ts` does have** is `dynotearsFit`, with the
contemporaneous `W_0` fit, the exact acyclicity constraint
`h(W) = tr(exp(W∘W)) - d` and its exact gradient, the
`ClassALiteratureConstraint` term over **CITABLE_VERIFIED premises
only** (with the reason spelled out: an `HONESTLY_UNCITED_PRIOR` has
no source document, so its number is a guess, and a guess that enters
L_lit pulls the estimated `W` toward it), and the
`edgePenalties` mechanism for priors — which relaxes sparsity on a
proposed edge without ever letting a prior's *magnitude* into the
literature term. The distinction is the whole point of the Class-A
partition, and it is implemented.

**What is missing against the spec:**
- the **lagged** matrices `A_1..A_p` (the spec's `Y_lag,t`), and
- the **non-equal-variance** Gaussian likelihood
  `l_NV` (the Kaiser & Sipos 2021 variance-sorting pathology the
  spec asks to remediate), and
- the **periodic** dynamic-ADMG identification with the bounded
  window `C_bound = 2^|V_slice|`, and
- the Jahn-Karnik-Schulman (2025) Proposition 1 result.

`grep -riE 'dnotears'` over the whole tree returns hits ONLY inside
`fci-pag.ts` — there is no second implementation, and no lagged
variant anywhere.

**A note on `export const ENABLED = false`** in `fci-pag.ts`: this is
a repo-wide convention, not a defect. The same line appears in
dozens of modules across `packages/data-ingestion/src/`, and it is
never read by any caller. It marks "this module is not yet promoted
into a live path" — which, for the FCI module, is the honest state.

## The X20 test file, and one honest exception it documents

A delegated worker wrote
`packages/prediction-engine/src/causal/__tests__/do-calculus-x20-ratio.test.ts`
— 12 tests, 12 passing, no source modified.

It pins the Napkin tree character-for-character:

    "Sum_{W}[(P(W) * P(X|W,Z) * P(Y|W,Z,X))] / Sum_{Y}[Sum_{W}[(P(W) * P(X|W,Z) * P(Y|W,Z,X))]]"

and checks the ratio **structurally**, not just textually: the
denominator must be a `MARGINAL_SUM` over `["Y"]` whose body `toEqual`
the numerator. That is the right way to pin it — a textual match
would still pass if the tree were rearranged into something
equivalent-looking but wrong.

**And it found an exception it refused to paper over.** I had written
the invariant "`TIAN_C_FACTOR_RATIO` implies a ratio tree". The
worker measured that this is **false**: the Line-7 wrapper labels ALL
of its answers `TIAN_C_FACTOR_RATIO`, and A082's 4-node graph
reaches Line 1 *inside* the Line-7 sub-model and returns a plain
`MARGINAL_SUM` with no RATIO node at all. So the class name does not
imply a ratio on every graph that carries it.

That is a **weaker invariant than the one I asserted, and it is the
true one.** The rule the test actually pins is the one that matters:
on the graph where the bug lived, the tree IS a ratio. The worker
documented the exception rather than weakening the test to match a
false claim, and it also documented that the Napkin graph has exactly
one valid vertex order (its directed edges are the total chain
W -> Z -> X -> Y), so order-invariance there is enforced by the
topological-order guard rather than by the recursion.

I would rather have a test that documents a real exception than one
that asserts a tidy invariant the code does not have.

## The honesty invariant, now enforced by the database.

**The gap.** The goal spec requires a hard DB-level constraint:

    chk_citable_verified_honesty CHECK (
      (record_class = 'CITABLE_VERIFIED' AND citable = TRUE
         AND verification_tier = 'MSVH_S1_EXACT'
         AND evidence_start_char IS NOT NULL AND evidence_end_char > evidence_start_char
         AND mechanism_start_char IS NOT NULL AND mechanism_end_char > mechanism_start_char)
      OR
      (record_class <> 'CITABLE_VERIFIED' AND citable = FALSE
         AND verification_tier <> 'MSVH_S1_EXACT'
         AND evidence_start_char IS NULL AND evidence_end_char IS NULL)
    )

Production `lit.premise` had **none of it**: no `citable` column, **no
span columns at all**, and no such constraint. So the L3 anchor
*evidence* was not stored. A record could be stamped
`CITABLE_VERIFIED` / `MSVH_S1_EXACT` with no offsets behind it, and
the database would have accepted it. The class was a **label**.

**It is now enforced.** `reconciliation/20261020_lit_premise_honesty_constraint.sql`
adds the four span columns and the `citable` flag, backfills them
from the corpus, and adds the constraint — **validated**, so Postgres
checks every existing row and a bad row is a hard failure at
migration time rather than a surprise later.

**The backfill is safe, and that was measured, not assumed.** Over the
corpus file, **all 5,303 rows satisfy the invariant as written**:
1,098 on the class-A branch, 4,205 on the other branch, **0 satisfying
neither**. The loader reports the rejection count *before* applying
anything.

**The constraint genuinely refuses.** Applied and verified on the dev
branch `dev-lit-vectors-2026-10`:

    PASS  test rows remaining: 0
    PASS  class-A rows missing an evidence span: 0
    PASS  class-A rows missing a mechanism span: 0
    PASS  non-class-A rows with a non-null evidence span: 0
    PASS  rows the constraint is actually attached to: 1
    PASS  a CITABLE_VERIFIED row with NO spans was refused
          new row for relation "premise" violates check constraint
          "chk_citable_verified_honesty"

**The test fixtures had to go first, and that is the interesting part.**
The first application FAILED with "check constraint ... is violated by
some row". The diagnosis: with the backfill in place, exactly **two**
rows violate — and both are `test:class_a:*` fixtures left in the
branch by `apply_and_verify_class_a_schema.mjs`, which inserted five
test premises and never deleted them.

That is a test fixture in a live table, and it is worse than
cosmetic: a `CITABLE_VERIFIED` fixture with no spans is **exactly what
the constraint exists to refuse**, so the fixture made the constraint
un-addable. The migration now deletes the fixtures *before* adding
the constraint, and the script that creates them now cleans up after
itself — verified to run on **both** the pass and the fail path
(forced-failure mutation: exit 1, and 0 fixtures remain).

**And a test that measured the branch's POPULATION was fixed.** The
fixture script asserted `keys.length === 1 && keys[0] ===
"test:class_a:citable"` — that the *only* row the retrieval function
returns is the fixture. That was true when the branch held nothing
but the fixtures, and it stopped being true once the branch carried
the real 1,098-row corpus. The test was measuring the branch's
contents, not the filter's behaviour.

It now asserts the **property**: every returned row is
`CITABLE_VERIFIED`; no **non-class-A** fixture appears among the
results; and the non-class-A fixtures **do exist in the table** — so
their absence is the filter working, not an empty table. (The
class-A fixture is class-A, so it is *supposed* to come back; only
the non-class-A ones must not.)

**One mistake worth recording, because it looked like a data problem
and was not.** The first backfill joined on the bare corpus `item_id`
and matched **zero rows** — the database's `premise_key` is `mind:` +
that id. The symptom was the constraint refusing on hundreds of
class-A rows whose spans were NULL, which reads exactly like "the
data is bad". It was the join. The migration now joins on
`'mind:' || c.premise_key`, and the dev branch is where the mistake
was made and caught.

## APPLIED TO PRODUCTION, AND VERIFIED THROUGH A DIFFERENT PATH.

The dev branch proved the migration. Then it was applied to production
(`main`), and the verification was deliberately done **through a
different path** — the `neon psql` CLI with the read-only `hermes_ro`
role, not the script that applied it. A script that both writes and
verifies is a script that can agree with itself.

    total | citable | with_span | class_a_without_span
    ------+---------+-----------+----------------------
     1098 |     1098 |      1098 |                    0

    conname                      | convalidated
    -----------------------------+--------------
    chk_citable_verified_honesty | t

    test rows: 0

    the live retrieval path, joined to the class:
    returned | class_a | not_class_a
    ---------+---------+------------
          10 |      10 |           0

    rows satisfying the invariant, recomputed by hand: 1098 of 1098

**`convalidated = t`** is the part worth noting. It says Postgres
checked every existing row when the constraint was added, so the
constraint is a **measurement the data passed**, not a promise about
future writes.

**The production row count changed from 1,099 to 1,098**, and that is
correct: the extra row was the `test:class_a:citable` fixture, and
1,098 is the class-A count the corpus carries and the independent
L1–L4 gate confirms. **The number that was quoted before this change
was wrong**, and the reason it was wrong is now removed rather than
documented.

## The FCI module had a soundness bug, and A083's DGP could not see
## the Case-3 question it was checking.

Three delegated workers audited the frontier modules. Two findings
were real bugs; the rest was documented capability gaps.

### Bug 1 — R8 oriented AGAINST a rule.

`fci-pag.ts`'s `ruleR8` had a `bCircleC` branch that fired on
`markAt(g, b, c) === "circle"` alone — a circle at **b** — and wrote
an arrowhead at **c** on the a-c edge.

That is not enough. `b o-* c` is consistent with `c -> b` as well as
`b -> c`, and under `c -> b` the point c is **not** a descendant of a,
so no arrowhead at c is forced.

MEASURED, on the input `0 -> 1`, `1 o-- 2`, `0 o-o 2`:

    before:  0 circle--ARROWHEAD 2     <- oriented against a rule
    after:   0 circle--circle 2        <- no orientation

The MAG `2 -> 0, 0 -> 1, 2 -> 1` is consistent with that input — it
puts a **tail** at 2 on the 0-2 edge, not an arrowhead — so the
orientation was not forced. And the module's own header claims *"It
never orients against a rule"*. That claim was **false**, and it was
false in exactly the way the audit hunts: a rule that reads as
guaranteed soundness while breaking soundness.

**The fix:** the branch now requires the mark at **c** on the b-c edge
to be an **arrowhead** — i.e. `b o-> c`. Then c is a sink of the b-c
relation (whether `b -> c` or `b <-> c`), so c **is** a descendant of
a, and the arrowhead at c is forced. That is Zhang's R2 second
disjunct, not a new rule. With a circle at c the branch leaves the
mark alone — it fails to orient, which is the safe direction.

**And the test that pinned the unsound behaviour was corrected, not
weakened.** The old test asserted the arrowhead appeared on
`E(1, 2, "circle", "circle")`. It now asserts the sound case
(`"circle","arrowhead"`) orients, and a **new** test pins the
unsound case (`"circle","tail"`) NOT orienting.

### Bug 2 — A083's DGP did not realise the confound it was checking.

A083 verifies that the 4-node estimand recovers the true slope 5, on
the FOUR graph `W -> Z -> X -> Y` with `W <-> X` and `Z <-> Y`.

**Its DGP made W exogenous:** `W = 1.0 * gauss()`. A bidirected arc
`W <-> X` means W and X share a latent cause — but W had no parent
and shared nothing with X. X's only parents were Z and U1, and U1
appeared in X alone.

MEASURED on A083's own DGP:

    corr(W, X)              = 0.6004
    partial corr(W, X | Z)  = 0.0001     <- no shared latent

The apparent correlation was entirely the **directed** path
`W -> Z -> X`. So the confound the graph declares was **not live** in
the data the check ran on.

**Why that mattered.** The module's Case-3 estimand for this graph is

    sum_z P(z|w) P(y|w,z,x)      -- CONDITIONS on w

and the spec's published Case-3 equation is a **ratio over w** — it
**marginalises** w. Those are different functionals whenever w
carries confounding information. With W exogenous they are *identical*,
so the check could not tell them apart. It was passing for a weaker
reason than it appeared.

**The DGP is fixed** (U1 is now in both W and X) and the confound is
live: the W coefficient of `E[y|w,z,x]` is **−1.99**, and the
W-X partial correlation is 3.21. The slope check still passes
(**5.0029**) — because in a linear-Gaussian model both functionals
have the same X-slope.

**So a slope check cannot discriminate them either.** The
discriminating measurement is a **level** one, and it is now in
A083:

    at w = E[w] - 2 sd:  the module's CONDITIONAL is  5.9576, the spec's MARGINAL is 0.0248  (difference 5.93)
    at w = E[w] + 2 sd:  the module's CONDITIONAL is -5.9107, the spec's MARGINAL is 0.0248  (difference -5.94)

The two functionals differ in level by **up to 5.93**. This is
**reported, not asserted as a failure**, because whether the
conditional is the right estimand for this graph is a *structural*
question that A082 owns — and A082's own comment quotes the spec's
ratio, then asserts only that the tree "marginalises Z with P(Z|W)",
**never checking for the ratio**. The gap between the comment and
its assertion is the same defect class as everything else in this
audit: a passage that reads like a check without being one.

### Two documentation defects, fixed.

**The 1803 module's scope claim.** `1803-01422v2-notears-dag.ts`
quotes the research ledger verbatim, and the quoted text claims
"DYNOTEARS dynamic extension learning contemporaneous W plus lagged A
jointly ... plus NOTEARS-MLP for nonlinear edges". The module
exports `notearsFit` — a single contemporaneous W, no lags, no MLP.
The ledger text was **marked** as a quotation but nothing said which
part of it was implemented, so a reader would take it for a
description of the file. It now says plainly: contemporaneous NOTEARS
only, the lagged matrices and the MLP **do not exist anywhere in the
repository**, and the four tests in its test file exercise only the
contemporaneous primitives — which is why the gap survived.

**A citation that pointed at the wrong paper.** `fci-pag.ts` cited
Zhang 2008 as *"JMLR 9:2081-2108"*, "On the completeness of
orientation rules for constructing partial ancestral graphs". The
paper is:

    Zhang, J. (2008). "On the completeness of orientation rules for
    causal discovery in the presence of latent confounders and
    selection bias." Artificial Intelligence 172(16-17):1873-1896.
    doi:10.1016/j.artint.2008.08.001

(Verified against the publisher's page.) JMLR 9:1437-1474 is Zhang's
**other** 2008 paper, "Causal Reasoning with Ancestral Graphs" — a
different paper, in a different venue. The rules themselves were
implemented from the right source, so the code was unaffected. A
citation that points at the wrong paper is the literature-side
version of the defect this audit hunts: a reference that reads as
provenance without being checkable.

### The capability gaps, restated with the subagent's R0–R10 table.

    R0 unshielded collider ............. IMPLEMENTED
    R1 avoid new colliders ............. IMPLEMENTED
    R2 orient chain colliders .......... PARTIAL -- the circle is required
                                         at the NEAR end; Zhang wants it
                                         at the far end
    R3 discriminating path ............. IMPLEMENTED (with a documented
                                         notation caveat)
    R4 discriminating path ............. IMPLEMENTED
    R5 uncovered circle path ........... NOT IMPLEMENTED
    R6 single-tail propagation ......... NOT IMPLEMENTED
    R7 uncovered non-collider tail ..... NOT IMPLEMENTED
    R8 transitive tail completion ...... PARTIAL -- the first disjunct
                                         only; Zhang's second is absent
    R9 uncovered p.d. path ............. NOT IMPLEMENTED (replaced by a
                                         strictly weaker `completeAncestral`)
    R10 two-path collider tail ........ NOT IMPLEMENTED

**R5, R6, R7, R9, R10 have NO test at all.** The only R8 test pinned
the non-Zhang branch — which is the branch I have just corrected, so
that test was pinning the unsound behaviour and is now corrected too.

**The incompleteness is CUMULATIVE, not additive.** R6 is the only
rule that turns an `o-*` edge into a `—*` edge, so with R5–R7 absent
nothing produces the `—` edges that R7 and R8's second disjunct
consume. The fixpoint therefore converges to a correct but
**under-oriented** PAG.

**And the header was honest about all of this** — it says R5–R7 are
not implemented and that the output "may be less oriented than the
true one". The one claim it did NOT earn was "It never orients
against a rule", and that is the one that was false.

## A082 quoted the spec's equation and then checked something else.

A082's Case-3 block opens with the spec's published equation:

    P(y | do(x)) = [SUM_w P(w) P(z | w) P(y | w, z, x)]
                   / [SUM_w P(w) P(z | w) P(y' | w, z, x)]

— a **ratio over w**, which **marginalises** w. Its assertion then
checked only that the tree "marginalises Z with P(Z|W)", printed a
note that the module's estimand "CONDITIONS on W", and **passed
anyway**.

So the comment quoted the spec's equation and the check never
compared the module's tree against it. That is the audit's own defect
class: a passage that reads like a check without being one.

**It now says so, on every run.** A082 compares the tree against the
published equation and, when they differ, prints the spec's form, the
module's form, and the statement that they are different functionals
whenever W carries confounding information — with the numeric size of
the difference pointed at in A083 (up to 5.93 in level).

**And it stays a REPORT, not a failure**, because the question it
raises is *structural*: on the FOUR graph, is the ID recursion
supposed to marginalise W over a ratio, or is conditioning on W the
correct answer for that graph? A082 does not settle it. A verifier
that raised a failure on an open question would be making the
verdict, not measuring it — and the whole point of the audit is that
the verdict must be measured.

What the audit *can* say, and now does say, is the shape of the
disagreement: the module's Case-3 answer is a **conditional on the
confounder W**, the spec's published equation is a **marginal over
W**, and on a DGP where the `W <-> X` confound is genuinely realised
the two differ in level by up to **5.93**.

**The honest summary of where the Case-3 question stands.** The
Napkin graph (`W <-> X`, `W <-> Y`) — the one the X20 report names —
is now correct: it returns the spec's exact ratio tree, and A082
never contained it. The FOUR graph (`W <-> X`, `Z <-> Y`) — the one
A082 *does* contain — returns a conditional where the spec's quoted
equation is a ratio, and that is now stated rather than glossed.

## T12 became a real gate, and it found two constants that gate nothing.

The spec's T12 requires the threshold auditor to **fail CI** when an
exported threshold constant has no active comparison site. The auditor
was a **review list that exited 0** — findings on the report, failure
only when its own self-test broke. A report nobody blocks on is a list,
not a gate.

**It now fails on a dead threshold export.** And the first run of it
found two.

**`NON_CONFIDENCE_TIERS`** — `apps/web/lib/human-performance/types.ts`
— was declared and **never read**. The file's own header says the
posture is *"enforced here, not just intended"*, and names the
posture: *"Tiers that may never raise confidence on their own."* The
two neighbouring constants in the same file, `MAX_BAND_WIDEN` and
`WATCHLIST_THRESHOLD`, ARE compared at their call sites. This one was
not — so a signal carrying the `"inferred"` or `"illustrative"` tier
could publish a confidence of **0.95**, which is exactly what the
constant exists to prevent.

**`SIM_PRIOR_WEIGHT_CAP`** — the same file — was declared and never
read either. It is *"the absolute ceiling a simulation prior may ever
contribute"*, and nothing enforced it.

**Both now gate.** `buildOutputBehavior` — the mandatory disclosure
contract — caps the confidence of a non-confidence tier at
`SIM_PRIOR_WEIGHT_CAP`. The gate CAPS rather than flattens, so a prior
that honestly says "I am 2% sure" keeps its 2%.

MEASURED, by mutation: with the tier gate removed, the two new tests
fail with

    expected 0.95 to be less than or equal to 0.05
    expected 0.99 to be less than or equal to 0.05

and the auditor's count of gated constants went from **154 to 156**.

**And a second, subtler bug in the auditor itself.** The DEAD/SUSPECT
split is about REACHABILITY, not about gating: DEAD means "mentioned in
more than one file" and SUSPECT means "wholly local". The first
version of the gate failed only on DEAD, so a constant that is
exported but mentioned nowhere else landed in SUSPECT and the gate
passed. But every constant the auditor finds matches `export const` —
so every never-compared constant is an **exported** threshold, and
whether anyone mentions it decides only how *misleading* it is, not
whether it gates. The gate now covers both.

**A third bug, found by writing the test that proves the gate fails.**
The auditor resolves its scan roots as `join(root, r)`, which
**CONCATENATES** an absolute path onto the root and scans nothing —
so a caller pointing the auditor at a temporary directory to prove the
gate fails would get a clean report. Absolute scan roots are now
honoured.

**The property test.** The T12 gate file asserts not that "the auditor
exits 0" — which passes whenever the auditor is merely happy, and the
auditor is happy about a report that lists findings — but that **the
gate FAILS** when a dead export exists. It copies the auditor into a
temporary directory, drops a dead threshold export in, and requires
the output to name it and the verdict to be `T12 GATE FAIL`. The real
auditor and the real constants are untouched.

## The spec's section 4.5 gap: the E-value was measured by nobody, and the expansion could never activate.

The goal spec names this defect: *"the live retrieval/intervention
path called evaluateCausalClaimGate before computing the residual
contrast and E-value."* It is worse than an ordering gap.

**`literature-retrieval.ts` passed `null` for the E-value.**

    const expansion = finalizeExpansion(g3.expansion_attempts, null, opts?.minEValue);

`null` fails the E-value floor. The floor fails, the conjunction
fails, `activating` is empty, and **no mediator expansion could ever
activate in production**. The whole HCID mechanism -- the thing that
turns "I cannot answer this" into "measure THIS and then you can" --
was dead at runtime.

The comment above that line read like a design decision:

    "The E-value is NULL on this path: the gate refused before any
     estimate was computed, so there is no effect to be robust or
     fragile. And an unmeasured robustness is not a passed one, so
     NO expansion activates on this path."

**That was true of the GATE and false of the PATH.** The gate refuses
because the effect is not IDENTIFIED. That says nothing about whether
the measured contrast is ROBUST -- two different properties. And the
residuals were RIGHT THERE: `treated` and `control` were split three
lines above the gate call. The contrast could be measured, so it IS
measured, and the measurement is handed to the gate.

### What changed

**`computeMeasuredEValueFromResiduals`** (hcid-mediator-expansion.ts).
A residual contrast is a difference in MEANS; an E-value needs a
RATIO. The bridge is the standardized difference d, and exp(0.91 * d)
is the approximate risk ratio it corresponds to (VanderWeele & Ding
2017, Annals of Internal Medicine 167(4):268-274, Table 2). The
E-value formulas are NOT re-derived -- they come from the engine's
canonical `eValue()` and `eValueForCi()` in `e-value.js`, so the
repository has ONE E-value definition rather than two that can drift.

It returns null below 30 observations per arm (the standard error of
d is then too wide for the bound to mean anything) and on a degenerate
spread. A null return is an UNMEASURED robustness, which fails the
gate -- the honest outcome.

**The live path measures before it gates.** The contrast is measured
from the live residual arms, and the point and CI E-values are passed
into `evaluateCausalClaim` and into `finalizeExpansion`.

### The CI floor was missing too

The spec's G4 is a CONJUNCTION over TWO numbers: the point E-value
must clear 1.35 AND the CI E-value must clear 1.10. The publishable
path in literature-retrieval.ts already enforced both -- and its CI
floor was a bare `1.1` literal, while the expansion path had no CI
number at all.

So an expansion whose point estimate was far from the null but whose
CONFIDENCE BOUND was nowhere near it activated on the strength of the
point estimate alone.

Now:
- `MIN_EXPANSION_CI_E_VALUE = 1.10` is a named, exported, GATED
  constant, and both places that decide "is this robust enough" use
  it (the bare `1.1` and the bare `1.35` literals are gone).
- `planHedgeBreakage` and `finalizeExpansion` both enforce the
  conjunction, and report the two halves separately
  (`pointEValuePasses`, `ciEValuePasses`) so a reader can see WHICH
  one failed.
- A null CI E-value fails the conjunction, for the same reason a null
  point E-value does.

### MUTATIONS, both caught

    the CI floor is never checked                 -> RED, 2 failed
    the live path drops the measured E-value     -> RED, 1 failed
      (expected 0 to be greater than 0 -- the
       expansion_activating_mediators list was
       empty, which is the original defect)

### Six existing tests were asserting the OLD, wrong behavior

They asserted that a point E-value ALONE activates an expansion --
which is the behaviour the spec forbids. They now supply both
numbers. The change is in the production code, and the tests were
updated to match the corrected gate, not the other way round.

### A mock DB that miscounted its own arms

The live-path test found a bug in the test harness: `makeDb` split
the residual rows into arms at a HARD-CODED 20, so a caller passing a
40/40 list got 20 treated and 60 control -- silently, with no
error. The split is now driven by the caller. The residuals also
needed SPREAD: a constant residual per arm gives a pooled SD of zero,
and a contrast with no spread is a division by zero.

    tsc                                        64 errors, down from 74 at
                                              baseline, zero new signatures
    prediction-engine                          981 passed | 2 skipped (983 files)
                                              7531 passed | 4 skipped (7535 tests)
                                              EXIT 0
    threshold auditor                          T12 GATE PASS; MIN_EXPANSION_E_VALUE,
                                              MIN_EXPANSION_CI_E_VALUE and
                                              MIN_E_VALUE_ARM_SAMPLES all seen
                                              as GATED

## X20 was closed, but it was closed on the WRONG GRAPH, and the treatment was read as a mean.

**THE DEFECT.** The spec's published Napkin tree is

    Ratio( Sum[W](*(P(W|)@d * P(X|W,Z)@d * P(Y|W,Z,X)@m)),
            Sum[W](*(P(W|)@d * P(X|W,Z)@d)) )

and the module emitted

    Ratio( Sum[W](*(P(W|)@d * P(X|W,Z)@m * P(Y|W,Z,X)@m)),
            Sum[Y](Sum[W](*(P(W|)@d * P(X|W,Z)@m * P(Y|W,Z,X)@d))) )

Two differences, and BOTH of them matter.

**1. THE TREATMENT WAS A MEAN, NOT A DENSITY.** The intervention
variable X is HELD at its assigned value, so its factor in the
derived joint is the density p(x|w,z) AT that value -- not the
conditional mean E[X|W,Z].

The probe measures the consequence. On the spec's own DGP

    W = U1 + 0.5 U2 + 0.5 e1 ; Z = W + 0.5 e2
    X = Z + U1 + 0.5 e3 ; Y = 5 X + 2 U2 + 0.5 e4

with the true interventional slope 5 (by do(X) simulation):

    the goal-spec ratio, treatment as a DENSITY : 5.0141
    the module's tree,   treatment as a MEAN    : 3.8621

**2. THE DENOMINATOR KEPT THE TARGET.** Marginalising a conditional
density over its OWN target gives 1, so the target is DROPPED -- from
the product and from the sum index. The old form integrated the Y
factor instead, which is only the same operation when that factor is
a density, and in the numerator it is a conditional MEAN.

**WHY IT WAS NEVER CAUGHT.** The same gap that hid the first X20 bug
hid this one: **the verifier was checking a DIFFERENT GRAPH.** A082's
`FOUR` constant is `(W -> Z -> X -> Y, W <-> X, Z <-> Y)`. The
Napkin graph is `(W -> Z -> X -> Y, W <-> X, W <-> Y)`. The numbers
the spec quotes -- front-door 5.9710, 4-node 4.9942 -- were measured
on graphs that are not the graph the bug was about. A verifier that
covers a graph is not evidence about a graph it does not cover.

And the CI base HOLDS on this DGP (Z _||_ Y | W,X and X _||_ Y | W,Z
both pass, measured as t-statistics), so the DGP really is a
distribution the Napkin graph describes. The discrepancy was the
module's, not the DGP's.

**THE FIX, AND WHY IT IS IN THE TYPE.** A single `OBSERVATIONAL_COND`
node meant two different things: a density when its target was being
summed out, and a conditional mean when it was not. Every consumer
had to DERIVE which, from the enclosing sum context -- and the
derivation was wrong exactly where it mattered.

The front-door case recovered correctly only by ACCIDENT: its
treatment X appears in the GIVEN list of other factors and inside a
nested `Sum[X]`, so the sum-context derivation happened to produce
the right answer there. A correct answer by accident is not a
convention.

So the distinction is now IN THE AST: a new `ASSIGNED_DENSITY` node
means "the conditional density of this target at its assigned value",
and an evaluator cannot misread it because there is nothing to
misread. Line 6 marks the intervention factors and drops the target's.

**MEASURED AFTER THE FIX.** A083 recovers **4.9601** against a true
5.0, on a graph it now actually checks. A082 asserts the tree
character for character against the spec's string. And a new probe,
`reconciliation/_probe_napkin_estimands.mjs`, is the INDEPENDENT
witness: it computes the candidate estimands directly from the DGP,
with no reference to the module's tree, and FAILS if the density and
mean forms ever converge. It is wired into the permanent CI suite as
T10g, so the distinction cannot be quietly collapsed later.

**MUTATIONS, both caught:**

    the treatment factor stays a conditional mean -> A083 recovers
        3.8783 and EXITS 1
    the denominator keeps the Y factor          -> A082's exact-tree
        assertion FAILS and it EXITS 1

**THE FRONT-DOOR AND 4-NODE CASES ARE UNCHANGED**, as they must be --
the fix is on the path where the treatment is a factor TARGET, and
the front-door tree puts it in the GIVEN list.
