# Literature Coverage — post-audit state (2026-10-20)

**Measured:** 2026-10-20T07:45:29.717Z · **Branch:** `dev-lit-vectors-2026-10`
**Code:** `audit/reconciliation-2026-10-20` @ `6464b3f4a` + this cycle's fixes
**Machine-readable:** `reconciliation/literature-coverage.json`
**Reproduce:** `node scripts/literature/run-loop.cjs` then
`node scripts/literature/measure-coverage.cjs`

---

## 0. What this cycle changed

This cycle found **five real defects in the literature loop**, all of them
in the honesty machinery — the part that decides whether a premise is
allowed to influence a published number. All five are fixed, regression-
tested, and re-measured.

| # | Defect | Damage | Fix |
|---|---|---|---|
| 1 | **Category error in residual grading.** A bridge premise asserts a probability for a *specific named game* (`bridge:2025_02_CLE_BAL` = P(home wins) for 2025 CLE vs BAL). The loop graded it against whatever game the activation happened to be for. | All 72 residuals compared unrelated propositions. Every one had `actual = 1`, so `mean_signed_residual == mean_abs_residual` **exactly** — a signature no residual can take unless every residual is non-negative. The "residuals improved" trend was noise with a favorable sign. | New `literature-residual-grounding.ts`. A premise is graded against **its own game** (resolved via `historical_games."gameKey"`, 285/285 match). |
| 2 | **Support factor counted residual ROWS.** A game-scoped premise is activated once per retrieval event touching its game — **21 rows for one game** in the measured run. | One piece of evidence looked like 21 and saturated `min(n/5, 1)`, letting a premise earn full weight from a single game. | The scorecard aggregates over `DISTINCT ON (premise_id, game_id)`. |
| 3 | **Promotion was ADD-ONLY.** Edges whose premise no longer cleared the gate stayed `'promoted'`. | 16 edges marked promoted with **zero** qualifying premises behind them. An edge table that can only grow is an edge table that cannot be wrong. | `promotePremisesToCausalEdges` now **retires** non-qualifying edges and returns `retired`. |
| 4 | **`premise_score.promoted` was never cleared on demotion.** | The flag read 16 while `causal_edge` had 0 promoted / 16 retired — two tables disagreeing about the same fact. | The flag is now reconciled **from the edge set** (`promoted = EXISTS(...)`), in both directions. |
| 5 | **Retiring an edge left its intervention tests live.** | 38 tests pointed at retired edges, breaking schema LAW 4 ("tests run on PROMOTED EDGES ONLY"). The law check read 38 violations. | New `lit.intervention_test.superseded` flag; retiring an edge marks its tests superseded (the rows are kept — the test IS the evidence). The law check counts only live tests. |

Plus the **tautology** fixed in the previous cycle (`effect_estimate` was
the premise's own claim, not an observed effect) and **32 TypeScript
errors** in this work's own files.

**Verification:** 45/45 tests pass (31 → 45). `tsc --noEmit` reports **0**
errors in `src/literature/`. The run-loop's LAW CHECK reads **0**.

---

## 1. The index (unchanged, still measured)

| Layer | Count | Vectorized | Index |
|---|---|---|---|
| `lit.premise` (structured) | 5,509 | 5,509 | `premise_vector_hnsw_idx` — HNSW, `m=16`, `ef_construction=64`, cosine |
| `lit.corpus_item` (raw, discovery) | 1,268 | 1,268 | `corpus_item_hnsw_idx` — same params |

**Model:** `baai/bge-m3` via OpenRouter, 1024-dim. HNSW confirmed by
`EXPLAIN (ANALYZE, BUFFERS)` → `Index Scan using premise_vector_hnsw_idx`.

**Latency:** p50 77ms · p95 79ms · p99 136ms.

**Pillar coverage:** injury_availability 1,665 · market_microstructure
1,626 · tactical_schematic 1,317 · personnel_availability 1,161 ·
efficiency_usage 988 · physical_environment 720 · narrative_context 634 ·
cognition_decision 596 · situational 118. **1,465 premises carry no
pillar** (ResearchSynthesis 951, arXiv 270, Kaggle 65, Statrankings 91,
AcademicLiterature 13, discovered_* 75) — still retrievable, simply not
pillar-scoped.

---

## 2. Event-driven retrieval (in a live cron)

`apps/web/app/api/cron/signal-ledger-write/route.ts:313` calls
`bridgeSignalsToLiterature(...)` on every signal-ledger write, gated by
`GSE_LITERATURE_BRIDGE=1`. The non-blocking guarantee is explicit in the
code (`:297-298`): a literature failure must never fail a signal write,
and the report states what the bridge did **so a silent zero is visible**.

**Measured:** 60 real events from the `signals` table (not synthetic
keys) · 781 activations · 69 distinct premises activated · 58/60 events
with hits · 60/60 HNSW-backed.

**Why this works where the signal path does not:** the literature bridge
embeds and retrieves **directly**. It does not route through `ctx.env`, so
it never hits the sign gate or the 4-key env bridge that make
`applyContinuousSignalTilt` vote zero times. **Do not route new signal
mechanisms through `ctx.env`.**

---

## 3. Residuals — now correctly grounded

| | Before (mis-grounded) | After (grounded) |
|---|---|---|
| residuals | 72 | 295 |
| distinct (premise, game) claims | 38 | **38** |
| outcome mix | 72 × `actual=1` | **218 won / 77 lost** |
| `mean_signed_residual` | 0.447673 | **0.186183** |
| `mean_abs_residual` | 0.447673 | **0.440447** |
| signed == abs? | **yes — degenerate** | **no — real distribution** |
| MSE on distinct pairs | — | **0.220855** (uninformed baseline 0.25) |

**The signature that proved the bug:** `mean_signed_residual` equalled
`mean_abs_residual` to six decimal places. That can only happen if every
residual is non-negative — which is exactly what "all 72 samples had
`actual = 1`" produces. After the fix the two diverge, which is what a
real outcome mix looks like.

**Graded against their own games**, the bridge premises have **Brier
0.2209** against the 0.25 uninformed baseline, with a monotone
calibration curve:

| bucket | n | predicted | actual |
|---|---|---|---|
| 3 | 15 | 0.2725 | 0.3333 |
| 4 | 29 | 0.3542 | 0.2759 |
| 5 | 50 | 0.4561 | 0.4600 |
| 6 | 84 | 0.5512 | 0.4881 |
| 7 | 44 | 0.6529 | 0.6591 |
| 8 | 48 | 0.7389 | 0.6667 |
| 9 | 14 | 0.8443 | 1.0000 |

The signal was there the whole time. The grounding was wrong.

### The trend, measured honestly

`residuals_improved: true`, over **distinct (premise, game) pairs**:
first half n=19 mean |residual| 0.448330 → second half n=19 0.410965.

The measurement script now reports `residual_trend_basis` and
`residual_trend_n` alongside it, and the basis is distinct pairs — not
the 295 rows. Splitting 295 rows (38 claims) into halves of ~147 was
splitting a handful of games many times over; the "improvement" was an
ordering artefact.

**Still not a learning claim.** 19-vs-19 over 38 claims is a small
sample, and the halves are ordered by `graded_at` within a single
backfill run, not by time across a season. `residual_trend_supportable`
is reported so the number is never read alone.

---

## 4. Promotion and intervention — the honest ceiling

**0 edges promoted. 16 retired. 0 live intervention tests.**

This is the correct output, and it is worth being precise about why.

**The promotion gate is `graded >= 3` DISTINCT GAMES.** A game-scoped
premise asserts a claim about exactly one game, so its `graded` count
can never exceed 1. **The only premises that can clear the gate are
context-scoped premises that fire across many games.**

**And there are none.** Measured on the full 5,509-premise index:

| `numeric_unit` (non-bridge) | count | values in [0,1] |
|---|---|---|
| `count` | 1,724 | 128 |
| `(NULL)` | 1,711 | 0 |
| `coefficient` | 963 | 386 |
| `year` | 601 | 0 |
| `samples` | 98 | 2 |
| `multiplier_or_threshold` | 89 | 0 |
| `points` | 14 | 0 |
| ... 11 more units | 21 | 5 |

**The MIND corpus contains ZERO probability-typed premises.** The 522
general premises with values in [0,1] are typed `coefficient`, `count`,
or `samples` — a regression coefficient, a sample size, a count of
injuries. Grading "coefficient: 0.42" against a win/loss is a category
error, and the loop already guards against it (`skipped_no_probability_claim`).

**The only probability-typed premises in the entire index are the 285
bridge premises — and every one of them is game-scoped.**

So the structure is:

| premise kind | count | probability-typed? | distinct games possible | can clear the gate? |
|---|---|---|---|---|
| bridge (game-scoped) | 285 | **yes** | **1** | **no** |
| MIND / research (context-scoped) | 5,224 | **no** | many | **no — not gradeable** |

**This is a structural finding, not a bug.** The corpus as it exists
cannot produce a promoted edge, because the premises that could be
graded have only one game each, and the premises that could span many
games have no probability claim. **Closing this requires a corpus
change, not a code change** — see §6.

---

## 5. Discovery — the engine inventing premises

| | |
|---|---|
| corpus items indexed | 1,268 |
| retrieval hits on raw items | 602 |
| distinct raw items surfaced | 42 |
| **promoted to structured premises** | **75** |

Threshold: **3 distinct retrieval events**. A raw item becomes an
evaluable premise only after repeated surfacing — so structure is earned,
not assumed. 75 of 5,509 premises (1.4%) came from discovery.

**The "Reflect & refine" step of the doctrine cycle is the one doing
real work: the engine invented 75 premises from the raw corpus without a
human writing them.**

---

## 6. What would actually close the loop

The five fixes above made the machinery *honest*. They did not make it
*productive*, and the reason is now precisely located.

### 6.1 The corpus needs probability-typed premises (the blocking gap)

**285 game-scoped premises, each with one game, can never accumulate the
3 distinct games the gate requires. 5,224 context-scoped premises have
no probability claim, so they are not gradeable on a win/loss axis at
all.**

Two ways forward, and the second is the one the mandate actually wants:

**(a) Grade context-scoped premises on their own axis.** The MIND corpus
asserts things like "a rest advantage of one day is worth about a point"
or "ACWR above 1.3 precedes a load-management event." These are claims
about *magnitudes*, not win probabilities, and they are gradeable
against their own quantity — points, counts, injury-days, CPOE — not
against a binary outcome. **That requires the residual table to carry
the premise's target metric, not just a win/loss.** This is the real
"Layer 2 as living fuel" mechanism: a premise about rest is checked
against the rest-adjusted margin, not against the cover.

**(b) Split the bridge premises into reusable feature premises.** The 285
bridge records are 285 *fitted values* from one logistic model over
6,955 samples. What is reusable is not the fitted value for one game but
the **model itself** — its coefficients and their signs. The
`home_sign` block in every bridge record already carries them
(`margin_diff: 1, scored_diff: 1, allowed_diff: 1, ... dome: -1`). Those
signs are the *actual* reusable premises, and they are gradeable against
any game: "when the margin differential favours the home side, does the
home side win more than the base rate says?"

**(b) is the higher-value path and it is what the doctrine asks for** —
the reasoning engine's inputs should be reusable causal factors, not
one-off fitted numbers. Staged in
`staged_improvements/06-reusable-feature-premises.md`.

### 6.2 The remaining, in order

| # | Action | Why it blocks the rest |
|---|---|---|
| 1 | **Grade context-scoped premises on their own axis** (§6.1a) | 5,224 premises are currently ungradeable. This is the corpus's largest untapped asset. |
| 2 | **Promote the bridge model's coefficient signs into reusable premises** (§6.1b) | Turns 285 one-off fits into factor premises gradeable against any game — the only way to reach 3 distinct games. |
| 3 | **Fix the residual sample** | Now non-degenerate, but 38 claims. More games → more claims. |
| 4 | **Give activations game linkage** | 3 of 7 signal keys had zero games; activations without a game cannot be graded. |
| 5 | **Turn on `GSE_LITERATURE_BRIDGE=1`** | Nothing sets it, so the live path does not run unattended. |
| 6 | **Rename `runInterventionTest` → `runActivationContrastTest`** | It is a truncated mean difference, not do-calculus. The name overstates it. |
| 7 | **Wire `research/dml-qb-out.ts`** (DML + Rosenbaum sensitivity) | The honest "adversary challenges the estimate" tool, dead twice over. |
| 8 | **Widen the corpus loader** past 5 files | 1,268 of 23,909 records indexed (5.3%). |

---

## 7. Verification record

| Claim | How verified | Result |
|---|---|---|
| HNSW index is used | `EXPLAIN (ANALYZE, BUFFERS)` on the live branch | `Index Scan using premise_vector_hnsw_idx` |
| Tests pass | `vitest run src/literature/__tests__/literature.test.ts` | **45/45** |
| No new type errors | `tsc --noEmit -p packages/prediction-engine` | **0** in `src/literature/`; 85 pre-existing elsewhere, every one in a file this branch does not touch |
| The category error is gone | distinct-pair count + outcome mix + signed≠abs | **38 distinct pairs, 218/77 mix, 0.186183 ≠ 0.440447** |
| The tautology is gone | `effect_estimate` vs `numeric_value` | **0/8 equal** |
| The tables agree | flag vs edge set vs live tests | **0 / 0 / 0** (16 retired) |
| LAW 4 holds | run-loop law check | **0** live tests on non-promoted edges |
| The loop runs | `node scripts/literature/run-loop.cjs` | exit 0 |
| Coverage is reproducible | `node scripts/literature/measure-coverage.cjs` | `reconciliation/literature-coverage.json` |

**The numbers I will not stand behind:** the residual *trend*. n=19 vs 19
over 38 claims, split by `graded_at` within one backfill. It is reported
with its basis and its n, and `residual_trend_supportable` is emitted so
it cannot be read as a learning result.
