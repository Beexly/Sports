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
