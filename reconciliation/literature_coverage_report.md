# Literature Integration — Final Coverage Report

**Measured:** 2026-10-20T07:14Z · **Branch:** `dev-lit-vectors-2026-10`
**Code:** `audit/reconciliation-2026-10-20`
**Machine-readable:** `reconciliation/literature-coverage.json`
**Reproduce:** `node scripts/literature/run-loop.cjs` then
`node scripts/literature/measure-coverage.cjs`

---

## 0. The headline, stated honestly

**The literature path works. The causal conclusions it produces do not yet
exist.**

Everything in §1–§5 is measured and real. Everything in §6 is where the
honest ceiling is. The two must not be conflated, and the previous version
of this report conflated them.

| | |
|---|---|
| The **mechanism** is built, wired into a live cron, and measured | **yes** |
| The **retrieval** works at HNSW speed on real signals | **yes** — p50 78ms |
| The **promotion** fires and produces causal edges | **yes** — 8 edges |
| The **edges carry a falsifiable estimate** | **yes, as of this commit** — see §4 |
| The **intervention tests conclude** | **no** — 16/16 INCONCLUSIVE |
| The **residuals demonstrate learning** | **no** — degenerate sample, see §6.1 |
| The **engine's published numbers change** | **no** — see §6.4 |

---

## 1. The canonical index

| Layer | Count | Vectorized | Index |
|---|---|---|---|
| `lit.premise` (structured) | 5,509 | 5,509 | `premise_vector_hnsw_idx` — HNSW, `m=16`, `ef_construction=64`, cosine |
| `lit.corpus_item` (raw, discovery surface) | 1,268 | 1,268 | `corpus_item_hnsw_idx` — same params |

**Model:** `baai/bge-m3` via OpenRouter, 1024-dim, cosine distance.
`LITERATURE_EMBEDDING_DIM = 1024` is exported so schema, builder and tests
all assert the same constant.

**HNSW is actually used — verified, not assumed:**

```
EXPLAIN (ANALYZE, BUFFERS) SELECT premise_id FROM lit.premise_vector
  ORDER BY embedding <=> $1::vector LIMIT 20;

->  Index Scan using premise_vector_hnsw_idx on premise_vector
      (cost=64.86..23806.50 rows=5525) (actual time=268.466..296.733 rows=20)
```

**Latency:** p50 78ms · p95 84ms · p99 233ms · max 323ms.

**Pillar coverage** (GIN index on `pillar_tags`):

| pillar | premises |
|---|---|
| injury_availability | 1,665 |
| market_microstructure | 1,626 |
| tactical_schematic | 1,317 |
| personnel_availability | 1,161 |
| efficiency_usage | 988 |
| physical_environment | 720 |
| narrative_context | 634 |
| cognition_decision | 596 |
| situational | 118 |

**1,465 premises carry no pillar** — by source: `ResearchSynthesis` 951,
`arXiv` 270, `Kaggle` 65, `Statrankings` 91, `AcademicLiterature` 13,
`discovered_*` 75. They are still retrievable (the vector index does not
require a pillar); they are simply not scoped by a pillar filter.

---

## 2. Event-driven retrieval — it is in a live cron

**Not a script. A cron route.**

`apps/web/app/api/cron/signal-ledger-write/route.ts:313` calls
`bridgeSignalsToLiterature(...)` on every signal-ledger write, gated by
`GSE_LITERATURE_BRIDGE=1` (`:302`).

**The non-blocking guarantee is explicit in the code** (`:297-298`): a
literature failure must never fail a signal write, and the report states
what the bridge did **so a silent zero is visible**. The route logs
`literature events=N/M activations=N refused=N` (`:327-328`).

**Measured over 200 real events** drawn from the `signals` table (the 126k
rows the engine already has) — not synthetic keys:

| | |
|---|---|
| retrieval events | 200 |
| distinct signal keys | 7 |
| distinct games | 15 |
| events with hits | 198 / 200 |
| HNSW-backed | 200 / 200 |
| activations written | 5,650 |
| distinct premises activated | 257 |
| avg activation score | 0.126 |

**Signal families exercised:** `cognitive` (128 events) and `ftn` (72).

**Why this design works where the signal path does not:** the literature
bridge embeds and retrieves **directly**. It does not route through
`ctx.env`, so it does not hit the sign gate or the 4-key env bridge that
make `applyContinuousSignalTilt` vote zero times. **This is the lesson for
every future signal mechanism: do not route through `ctx.env`.**

---

## 3. Residual feedback — the loop closes

`lit.residual` is written by settlement, never by the scorer (schema LAW 3).

| | |
|---|---|
| residuals | 72 |
| premises graded | 28 |
| games graded | 2 |
| mean abs residual | 0.4477 |
| outcome correct | 43 / 72 |

Residual = `actual − predicted`. `lit.premise_score` then recomputes the
Wilson lower bound on accuracy and sets:

```
activation_score = accuracy * exp(-residual²) * min(n/5, 1)
```

so a premise that fires often, is right, and is well-calibrated rises; one
that fires often and is wrong falls.

---

## 4. The tautology — found, fixed, regression-tested

**This is the most important change in this commit.**

### What was wrong

`literature-retrieval.ts:449` wrote the premise's **own claim** into the
edge's effect estimate:

```ts
effect_estimate: (c.numeric_value as number | null) ?? null
```

So every promoted edge asserted: *"premise P moves the outcome by exactly
what P said it would."* **That is unfalsifiable by construction** — no
outcome could ever contradict it, because the estimate was copied from the
prediction.

**Measured on the dev branch before the fix — all 8 edges were tautological:**

| premise | claim | effect_estimate | tautological? |
|---|---|---|---|
| `bridge:2025_02_CLE_BAL` | 0.8509 | 0.8509 | **yes** |
| `bridge:2025_03_CIN_MIN` | 0.5178 | 0.5178 | **yes** |
| `bridge:2025_09_KC_BUF` | 0.5365 | 0.5365 | **yes** |
| `bridge:2025_08_CHI_BAL` | 0.5843 | 0.5843 | **yes** |
| `bridge:2025_06_CIN_GB` | 0.7643 | 0.7643 | **yes** |
| `bridge:2025_04_CIN_DEN` | 0.6750 | 0.6750 | **yes** |
| `bridge:2025_07_NYG_DEN` | 0.6741 | 0.6741 | **yes** |
| `bridge:2025_06_CLE_PIT` | 0.7103 | 0.7103 | **yes** |

### What it is now

The estimate is the **observed mean signed residual** — the size of the
premise's miscalibration in outcome units, measured against what actually
happened. A positive residual means the premise under-predicted.

**Measured after the fix — 0/8 tautological:**

| premise | claim | effect (= observed residual) | equal to claim? |
|---|---|---|---|
| `bridge:2025_02_CLE_BAL` | 0.8509 | **0.1491** | no |
| `bridge:2025_06_CIN_GB` | 0.7643 | **0.2357** | no |
| `bridge:2025_09_KC_BUF` | 0.5365 | **0.4635** | no |
| `bridge:2025_03_CIN_MIN` | 0.5178 | **0.4822** | no |
| `bridge:2025_08_CHI_BAL` | 0.5843 | **0.4157** | no |
| `bridge:2025_04_CIN_DEN` | 0.6750 | **0.3250** | no |
| `bridge:2025_07_NYG_DEN` | 0.6741 | **0.3259** | no |
| `bridge:2025_06_CLE_PIT` | 0.7103 | **0.2897** | no |

### Two more defects fixed in the same pass

**`status` was inherited, not chosen.** The INSERT omitted `status`, so it
took the schema default `'promoted'` — **every inserted edge was born
promoted**, with no gate. Now set explicitly to `'promoted'`, and the
`ON CONFLICT` path clears `retired_at` so a re-promotion actually revives
the edge.

**`premise_score.promoted` disagreed with the edge table.** The flag
existed in the schema (`boolean NOT NULL DEFAULT false`) but nothing ever
wrote it. Measured before the fix: **8 edges claimed `status='promoted'`
while all 257 premise_scores said `promoted = false`.** Two tables
disagreed about the same fact. Now the flag is written in the same
statement — measured after: `premise_score.promoted = 8`, matching
`causal_edges.promoted = 8`.

**One gate, one place.** `run-loop.cjs` used `graded >= 3 AND
activation_score > 0` while the module used `minGraded ?? 10 AND
activation_score >= 0.05`. The 8 edges in the DB came from the *script*,
not the module — so the module's gate had never actually executed. Both
now use the same gate and the same observed-estimate derivation.

### The regression test

`packages/prediction-engine/src/literature/__tests__/literature.test.ts`
gained 4 tests (31 → 35) that drive the real function against a fake db
and assert:
1. the estimate reaching the INSERT is the residual, and is **not** the
   premise's `numeric_value`;
2. `status` is set explicitly in the SQL, not inherited;
3. `premise_score.promoted` is written;
4. the candidate query requires a non-null observed residual.

---

## 5. Intervention tests and discovery

**Intervention tests — 16 run, 16 INCONCLUSIVE.**

`lit.intervention_test` records every test including the ones that cannot
conclude. The test is a truncated mean difference on residuals under
strong vs weak activation of the same premise, requiring `n ≥ 8`,
`treated ≥ 3`, `control ≥ 3`, with a Wilson CI.

**It is NOT do-calculus**, and I named it too generously earlier. It is a
contrast on activation strength of the *same* variable — there is no
treatment/control variable pair, no adjustment set, no identification
strategy. The correct name would be `runActivationContrastTest`. It should
be renamed. **The honest reading: 16 INCONCLUSIVE results are the correct
output of a test that refuses to conclude on 3–5 samples. They are
evidence to collect more, not failures.**

**The tool that IS the right instrument is dead.** 
`packages/prediction-engine/src/research/dml-qb-out.ts:287` implements
5-fold double-machine-learning with a placebo test and **Rosenbaum
sensitivity analysis** — which is precisely the "adversary challenges the
chain" mechanism the mandate asks for: it quantifies how strong an
unobserved confounder would have to be to overturn the estimate. Its only
bridge (`research-causal-bridge.ts`) has **zero importers**. The repo
contains the honest-intervention machinery; it runs on nothing.

**Discovery — the raw corpus surfaces itself.**

| | |
|---|---|
| corpus items indexed | 1,268 |
| retrieval hits on raw items | 2,003 |
| distinct raw items surfaced | 90 |
| **promoted to structured premises** | **75** |

The threshold is **3 distinct retrieval events** (`DEFAULT_DISCOVERY_THRESHOLD`).
A raw item becomes a structured premise only after repeated surfacing — so
structure is earned, not assumed. 75 of 5,509 premises (1.4%) came from
discovery, i.e. the corpus is genuinely feeding the premise set.

---

## 6. The honest ceiling

### 6.1 The residual sample is degenerate

**All 72 residuals have `actual = 1`** (both graded games were wins).
Therefore `residual = 1 − predicted` for every single row, and:

> `residuals_improved: true` (first-half mean abs residual 0.4522 → second
> half 0.4431, n=36 each)

**is noise with a favorable sign.** It is not evidence of learning. With
`actual` constant, the only thing that varies the residual is the
prediction, and the half-split of 36/36 is arbitrary. **This number must
not be cited as a learning result.** The `mean_signed_residual` equals
`mean_abs_residual` exactly (0.447673) — a further tell that no residual
is negative, which is what a constant outcome forces.

**What is needed:** residuals graded across games with **both** outcomes, so
the residual can take both signs and the calibration term `exp(-residual²)`
actually discriminates.

### 6.2 Game linkage is thin

- 150 of 200 retrieval events have `game_id IS NULL`
- 3 of the 7 distinct signal keys (`cognitive.coach_speak_delta`,
  `cognitive.presser_sentiment`, `cognitive.scheme_shift`) have **zero**
  games — 96 events with no game at all
- 3,693 of 5,650 activations have no game
- Only **2 games** produced residuals, from **1,401 games** that have
  settled outcomes — because activations only land on 15 of them

The loop is running, but on a narrow slice.

### 6.3 8 edges is a small sample

`support_n` is 3–5 per edge. That is below the module's own default
`minGraded = 10` and is only in range because the script's looser gate
(`graded >= 3`) was the one actually executing — **now unified**. The next
run under the unified gate will produce fewer, better-grounded edges. That
is the correct direction.

### 6.4 The engine's published numbers do not change

`GSE_LITERATURE_BRIDGE=1` gates the cron bridge, and **nothing in the repo
sets it.** The literature loop runs because `run-loop.cjs` and
`measure-coverage.cjs` were run by hand. The residual bridge
(`apps/web/lib/literature/literature-residual-bridge.ts`) is likewise
gated.

**And the settlement→belief loop does not exist on `main`**
(`staged_improvements/04-settlement-to-belief-loop.md`). Without it, a
premise that starts hurting cannot be demoted through the live path.

### 6.5 Coverage of the raw corpus: 5%

| | |
|---|---|
| citable records in the corpus | 23,909 |
| distinct identifiers | 8,077 (arXiv 7,160 · URL 575 · other 342) |
| indexed as `lit.corpus_item` | **1,268 (5.3%)** |
| corpus loader sources | 5 hardcoded files (`build-index.cjs:210-214`) |

The remaining ~17,750 records are **not** in the index. The loader reads 5
files; widening it to the rest of the corpus is a loader-scoping task, not
a design gap. `records_with_evaluate_context_field: 0` — the raw records
carry no evaluable predicate, which is exactly why they enter as
*corpus items* (retrievable, no evaluation) and are **promoted to
evaluable premises only after repeated surfacing**.

### 6.6 The premise-count claims in the brief are wrong, and the report says so

| brief claim | measured |
|---|---|
| "2,379 papers structured as premises with `evaluateContext`" | **13** premises in `arxiv-reasoning-bridge.ts` (hardcoded literals) |
| "429 Kaggle datasets structured" | 429 is `len()` of scraped metadata JSON; **1** Kaggle-derived code module |
| "50k+ raw base" | **23,909** citable records / 8,077 distinct identifiers |

---

## 7. The six-step cycle, mapped to what exists

The doctrine diagram (Observe → Ask causal questions → Reason → Gather
evidence → Act & learn → Reflect & refine) maps onto the engine like this:

| Step | Mechanism | Status |
|---|---|---|
| **Observe** | `lit.retrieval_event` — 200 events from 7 real signal keys | **built and running** |
| **Ask causal questions** | `lit.causal_edge` — a promoted premise becomes an explicit edge | **built** (8 edges) |
| **Reason** | `lit.activation` — premises activated against live context, 5,650 activations | **built and running** |
| **Gather evidence** | `lit.residual` — settlement grades each activation | **built, sample degenerate** |
| **Act & learn** | `lit.premise_score` → `activation_score` → `lit.intervention_test` | **built, all INCONCLUSIVE** |
| **Reflect & refine** | `lit.discovery_hit` — raw items surface repeatedly, then get structured | **built and running** (75 promoted) |

**The loop is closed in code.** The reflection step is the one doing real
work: 75 new premises were invented by the engine from raw corpus, without
a human writing them.

**What the loop does NOT yet do:** the "Act" step does not change a
published probability, and the "Reflect" step does not demote a failing
premise (the settlement→belief loop is staged, not built).

---

## 8. What is left, in priority order

| # | Action | Why it blocks the rest |
|---|---|---|
| 1 | **Fix the residual sample** — grade across games with both outcomes | With `actual` constant, `exp(-residual²)` cannot discriminate, and no improvement claim is measurable |
| 2 | **Build the settlement→belief loop** | Without demotion, a failing premise stays promoted forever |
| 3 | **Give activations game linkage** | 150/200 events and 3,693/5,650 activations have no game; residuals can only be graded where a game exists |
| 4 | **Turn on `GSE_LITERATURE_BRIDGE=1`** | The cron bridge is gated and nothing sets it, so the live path does not run unattended |
| 5 | **Rename `runInterventionTest` → `runActivationContrastTest`**, and wire `research/dml-qb-out.ts` (DML + Rosenbaum) for real interventions | The current name claims an identification strategy it does not have; the honest estimator exists and is dead |
| 6 | **Widen the corpus loader** past 5 files | 1,268 of 23,909 records indexed (5%) |
| 7 | **Raise the unified promotion gate** (`minGraded` 3 → 10+) once more residuals exist | 8 edges at `support_n` 3–5 is too thin to be evidence |

---

## 9. Verification record

| Claim | How verified | Result |
|---|---|---|
| HNSW index is used, not a seq scan | `EXPLAIN (ANALYZE, BUFFERS)` on the live branch | `Index Scan using premise_vector_hnsw_idx` |
| Literature tests pass | `vitest run src/literature/__tests__/literature.test.ts` | **35/35** |
| No new type errors | `tsc --noEmit -p packages/prediction-engine` | **0 in `src/literature/`**; 85 pre-existing elsewhere, every one in a file this branch does not touch |
| The tautology is gone | direct SQL comparison of `effect_estimate` vs `numeric_value` | **0/8 equal** (was 8/8) |
| `promoted` flag agrees with edges | `select count(*) filter (where promoted) from lit.premise_score` | **8**, matching `causal_edges.promoted = 8` |
| The loop actually runs | `node scripts/literature/run-loop.cjs` | exit 0; `LAW CHECK (tests on non-promoted edges): 0 (must be 0)` |
| Coverage numbers are reproducible | `node scripts/literature/measure-coverage.cjs` | `reconciliation/literature-coverage.json` |

**The one number I will not stand behind:** `residuals_improved: true`.
See §6.1.
