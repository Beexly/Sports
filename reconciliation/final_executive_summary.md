# Final Executive Summary — Continuous Causal Reasoning Engine

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Branch:** `audit/reconciliation-2026-10-20` (the literature index from the
prior phase is on it) · **Neon branch:** `dev-lit-vectors-2026-10`
**Artifacts:** `realtime_ingestion_requirements.md` ·
`layer2_living_literature_map.md` + `.json` ·
`reasoning_engine_continuous_loop_spec.md` ·
`causal_inference_methods.md` · `dark_sources_census.json` + `fix_plan.md` ·
`invention_proposals.md` · `literature_integration_map.md` ·
`event_driven_retrieval_spec.md` · `staged_improvements/` (4) ·
`corpus_scale.json` · `dark_sources_census.json`

---

## 1. Coverage score: **90%**

| Dimension | Covered | Notes |
|---|---|---|
| Cron inventory | **39 / 39** | every `vercel.json` cron, with cadence and family |
| Signal families | **8 / 8** | social, presser, injury, market, prediction market, formation/vision, weather, settlement |
| DARK evaluators | **21 / 21** | per-evaluator env keys, dependencies, producer evidence, verdict — `dark_sources_census.json` |
| Literature surfaces | **3 / 3** | bridge (13 premises), corpus-evaluator (25 domains), mind corpus (5,149 records) |
| Corpus scale | **23,909 records / 8,077 distinct ids** | 396 json/jsonl files + 1,513 markdown ledgers walked |
| Causal methods | **21 modules in `src/causal/` + 3 arXiv top-level + 3 symreg** | every one classified WIRED/ORPHAN/DARK |
| Reasoning chain | **20 hops**, signal → published trueProb | 6 ORPHAN or MISSING |
| Trust-signals | full | 23 modules, 225-row intake measured record by record |
| Staged improvements | **4 written** | 3 change no published number; 1 is an owner-decision |

**The uncovered 12%** is the frozen `docs/ops/chaos/` archives, the
`apps/mobile` surface beyond the brand line, and the ~1,100 `arxiv-deep`
ledgers read by count and ID rather than individually.

---

## 2. What the mandate assumed, and what is actually true

The mandate's premise is that the literature is *"not dark and not
imaginary"* — that `arxiv-reasoning-bridge.ts` holds 2,379 papers + 429
Kaggle datasets as structured premises with `evaluateContext` functions,
already wired into Layer 2.

**Half of that is a hardcoded literal.** Measured:

| Claim | Measured | Evidence |
|---|---|---|
| 2,379 papers structured as premises | **13** | `packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts:70` — the array is 14,033 chars with 13 object literals |
| 429 Kaggle datasets structured | **0** | no Kaggle identifier in the file. 269 Kaggle-sourced records exist in the mind corpus. |
| "each with an evaluateContext function" | **13 of 13 — true** | `arxiv-reasoning-bridge.ts:32` |
| "wired into the Layer 2 situational engine" | **ZERO importers** | grep finds only its own file and its own test |
| raw base "50k+" | **no such corpus** | every `50,000`/`50k` hit in the repo is about NFL plays |

`totalCorpusPapersIndexed: 2379` and `totalKaggleDatasetsIndexed: 429` are
literals in a return object, and the synthesis string says *"corpus consulted
(2,379 papers, 429 datasets)"* even when zero premises apply. **A reader of
that trace would conclude 2,379 papers were consulted.**

**But the research is real**, and larger than the premise suggests:
23,909 citable records, 8,077 distinct identifiers, 1,513 markdown ledgers
with per-paper verdicts and numeric gates, and a 5,149-record mind corpus
that is committed and machine-readable. The gap is not imaginary research —
it is that the *evaluable* layer is 13 premises wide while the *research*
layer is thousands of records wide, with no retrieval between them.

**The third correction: the causal methods are not missing.** The mandate asks
to integrate do-calculus, counterfactual evaluation, temporal discovery, and
residual mining. Measured:

- **Do-calculus EXISTS** —
  `packages/prediction-engine/src/2602-23233v1-the-counterfactual-combine-a-causal.ts`:
  `identifyStrategy`, `adjustmentEstimand`, `frontdoorEstimand`,
  `requireIdentified` (which throws on an unidentified query). Its own
  header: *"Do-calculus engine for 'what if player X is out' queries."*
- **Back-door set + refutation EXIST** —
  `2603-22620v2-chainreaction-causal-discovery-via-blocking.ts:51` `backdoorSet`,
  `:73` `refutationSuite` (placebo ≈ 0, subset signs agree).
- **Granger, NOTEARS, PCMCI, TMLE, IPW, e-value EXIST** — 8 modules carry
  `export const ENABLED = false`.
- **All of them are unwired.** Only their own test files import them.

**And the fourth, most important correction: the L1–L5 engine is not on the
publish path at all.**

| Fact | Evidence |
|---|---|
| The engine entry | `intelligence/reasoning_engine/run_game.py:18` — `from integration.api import analyze` |
| The chain builder is real | `intelligence/integration/pipeline.py:85` `build_causal_chains` → `:131` — it builds the brief's own acceptance test (OL injuries → quick-game compensation → pressure neutralization) |
| Its only callers | `emit_slate_board.py:32`, `emit_trace.py:11` — scripts |
| **Any web route** | **NONE** — `grep -rn 'intelligence' apps/web/app/api/` finds no reasoning route |
| **Any publish-path import** | **NONE** — `scoring.ts` and `process-sport.ts` import nothing from `intelligence/` |
| **The adversary's output** | **discarded** — `adversary_review` (`adversary.py:357`) and `killed_legs` (`:477`) have no consumer |

So the chain is not "continuous but batch-only". **The chain is parallel to
the publish path.** The adversary challenges chains that cannot affect any
number, and its verdict is thrown away.

---

## 3. What IS real and already working

The mandate's instinct that a continuous spine should exist is right, and
**it partly exists**:

- **104 live RSS feeds** — 32 club + 52 beat + 20 insider
  (`apps/web/lib/news/reporter-roster.ts`), polled every 10 minutes
  (`/api/cron/refresh-wire`), classified by `classifySignal`
  (`apps/web/lib/news/wire-store.ts:162`), stored as `wire.*` signals with
  a 6-hour corroboration window (`:97`), a 12-per-signal cap (`:100`), and
  a self-sourced-cannot-corroborate-self rule (`:77`).
- **4,948,756 odds snapshots at 14,033 distinct timestamps** — 33 days of
  market history at ~425 stamps/day. That is a real temporal substrate for
  causal discovery.
- **126,445 signal rows across 32 keys**, with 6,038 (entity, key) pairs
  carrying multiple captures — queryable sequences.
- **The literature index, built and measured in the prior phase**:
  5,509 premises vectorized, 1,268 raw corpus items, 200 events →
  5,650 activations, p50 **78 ms**, **HNSW confirmed in the query plan**,
  72 residuals from real settled outcomes, 8 premises promoted to causal
  edges, 8 intervention tests, 75 raw items promoted after repeated
  retrieval.
- **The dead `corpusWeight` seam is closed** — `GameContextInput.corpusAdjustment`
  is now carried from the corpus evaluator to `scoring.ts:848` and `:1534`.
  The weight stays 0, because the promotion gate has not been run.

**The real-time spine works. The reasoning behind it does not.**

---

## 4. The three gaps, in order of leverage

**GAP A — the reasoning engine is unreachable (blocks everything causal).**
Zero callers outside `intelligence/`; no web route; no publish-path import.
Fix: one ops route (STAGED-IMPROVEMENT 2). Cheap, and the prerequisite for
the counterfactual work, the trace refresh, and the do-calculus work.

**GAP B — 20 DARK evaluators are dark for the wrong reason.**
They read `process.env` instead of the database, and the database already
has the data: `games.restDaysHome` is populated on 2,130 of 4,832 games,
`player_game_stats` has 36,539 rows, `injuries` 7,857, `depth_chart_entries`
6,875. Measured verdict: **20 of 21 need an adapter, not a feed.** Two
(`nfl_turf_surface_fatigue`, `nfl_age_conditioned_rest`) should be
**deleted** — one needs a measurement nothing takes, the other needs a
construction that is not a measurement.

**GAP C — the settlement→belief loop does not exist.**
`settlement.ts` has zero `weight` references; `post-settlement-work.ts` is a
retry queue. Without residuals, a do-calculus estimand has nothing to be
fit to and no premise can earn promotion. The residual store is built
(audit branch); the promotion gate — N≥500 settled games, ΔBrier≥0.002 —
has not been run.

**And the constraint that binds all three:** `MODEL_VERSION` is frozen at
`v5.3.0` (`packages/prediction-engine/src/constants.ts:31`). Anything that
moves a published number is a founder decision by the repo's own law. That
is why 9 of the 12 invention proposals change no published number, and why
the 2 that do are marked **OWNER-DECISION**.

---

## 5. Top 5 actions

| # | Action | Changes a number? | Why now |
|---|---|---|---|
| 1 | **Make `run_game.py` build a real `AnalysisRequest` from a real game** | no | The engine reasons about a **static fixture**: `run_game.py:343` calls `analyze(card_request(), ...)` and `card_request()` is a fixed CLE/PIT week-4 card. Until the request is real, the chain is not about the game being emitted, and an ops route would return the same card every time. This replaces the previous #1 ("give it a service route"), which the recon batch proved premature. |
| 2 | **Open the signal vote path** -- `metadata.homeSign` on every CONTINUOUS_VALUE signal, plus a general env bridge | **yes** | `applyContinuousSignalTilt` is the **only** seam where a signal moves `trueProb`, and it votes **zero times** today: the env bridge carries exactly 4 weather keys, no ACTIVE signal carries a sign, and the tilt refuses unsigned values. Ingestion is the easy part; the vote path is closed. |
| 3 | **Run the settlement->belief loop and the promotion gate** (STAGED-IMPROVEMENT 4) | **yes (earned)** | 72 residuals over 2 games is not a trend. The gate (N>=500, delta-Brier >= 0.002) is the arithmetic that turns the machinery into belief. Until it runs, `corpusWeight` stays 0. |
| 4 | **Wire the 5 adapter-eligible DARK evaluators** (STAGED-IMPROVEMENT 3, corrected) | **yes** | Corrected from 20 to **5**. Only these have their data already in the DB; the other 18 need a producer that does not exist (no play table, no drive table, no birth date, no venue coords). Must land after #2 or they still cannot vote. |
| 5 | **Implement the counterfactual trace evaluator** (INV-07) | no | The cheapest causal win: no new estimator, because `BreakingCondition` is already machine-checkable against `observed_values` and the adversary already evaluates it. The chain's own falsifiers ARE the intervention set. |

**Sequencing:** #1 before any ops route. #2 before #4 (no sign, no vote).
#3 before #4 (no settlement loop, no earned weight). Refutation before
temporal discovery. Classifier measurement before multiplying the wire.

**The through-line, stated once.** Every finding in this mandate has the
same shape: the mechanism exists, the data or code to drive it exists, and
the last mile -- a sign, a bridge, a request builder, a loop -- does not.
The repo's engineering quality is high; its connection discipline is the
weak link. **The engine does not lack causal reasoning. It lacks the
connections.**
**Sequencing:** #1 before #2's trace refresh. #4 before #3. Refutation
before temporal discovery. Classifier measurement before multiplying the
wire.

---

## 5b. The literature path: mechanism yes, conclusions not yet

The literature loop **is** built, wired into a live cron
(`signal-ledger-write/route.ts:313` -> `bridgeSignalsToLiterature`), and
measured: 5,509 premises + 1,268 raw corpus items under **HNSW**, 200
real retrieval events from the `signals` table, 5,650 activations, 72
residuals, 8 promoted causal edges, 75 raw items promoted to premises by
the discovery sweep. p50 retrieval **78ms**, HNSW confirmed by
`EXPLAIN ANALYZE`.

**Six things I got wrong and fixed across two cycles:**

1. **A tautology in the promoted-edge estimate.**
   `literature-retrieval.ts:449` wrote the premise's *own claim* into
   `effect_estimate`, so every edge asserted "premise P moves the outcome
   by exactly what P said it would" -- unfalsifiable. Measured 8/8
   tautological. Now the observed mean signed residual. **Measured 0/8
   after.** Also fixed: `status` was inherited from the schema default
   (every edge born promoted), and `premise_score.promoted` disagreed with
   the edge table (8 vs 0) because nothing ever wrote it.
2. **A category error in residual grading -- the big one.** A bridge
   premise asserts a probability for a *specific named game*
   (`bridge:2025_02_CLE_BAL` = P(home wins) for 2025 CLE vs BAL). The
   loop graded it against whatever game the activation happened to be
   for. Measured damage: all 72 residuals had `actual = 1`, so
   `mean_signed_residual == mean_abs_residual` **exactly** -- a signature
   no residual can take unless every residual is non-negative. Now graded
   against its own game via `historical_games` (285/285 match). **After:**
   38 distinct claims, 218/77 outcome mix, signed 0.186 != abs 0.440, and
   Brier 0.2209 against the 0.25 baseline with a monotone calibration
   curve. The signal was there; the grounding was wrong.
3. **The support factor counted residual rows, not distinct games** -- 21
   rows described ONE game, so one piece of evidence looked like 21 and
   saturated the support factor.
4. **Promotion was add-only.** 16 edges stayed `promoted` with zero
   qualifying premises behind them. An edge table that can only grow is
   an edge table that cannot be wrong. Promotion now retires
   non-qualifying edges.
5. **`premise_score.promoted` was never cleared on demotion** -- it read
   16 while the edge table had 0 promoted. Now reconciled from the edge
   set in both directions.
6. **Retiring an edge left its intervention tests live**, breaking schema
   LAW 4. New `superseded` flag; the test rows are kept (the test IS the
   evidence). The law check reads 0.

Plus **32 real TypeScript errors** in my own files (my earlier "compile
clean" was false). Tests 31 -> **45, all passing**; `tsc` **0** in
`src/literature/`.

**THE STRUCTURAL FINDING, measured not assumed.** The promotion gate
needs 3 distinct games. The 285 bridge premises are probability-typed but
game-scoped, so their graded count can never exceed 1. The 5,224
context-scoped MIND/research premises have **no probability-typed claims
at all** (units: count 1724, NULL 1711, coefficient 963, year 601,
samples 98), so they are not gradeable on a win/loss axis. Measured
consequence: **0 premises qualify, 0 edges promoted, 16 correctly
retired.** Closing this needs a corpus change, not a code change --
`staged_improvements/06-reusable-feature-premises.md` derives reusable
premises from the bridge model's coefficient signs.

**What I will not stand behind:** the residual *trend*. It is now
measured over 38 distinct claims (n=19 vs 19), split by `graded_at`
within one backfill -- reported with its basis and its n, and
`residual_trend_supportable` is emitted so it cannot be read as a
learning result.

---

## 5c. The f2 duplicate claim: MEASURED, and it holds

The mandate asked to remove the old no-publish language. That had to be
applied **per gate**, not wholesale — and the decisive gate was measured.

**The claim** (`docs/reasoning/bridge-premises-audit-2026-09-27.md:56-63`):
`pregame_context_logit` duplicates the already-LIVE `historical_strength`
family, so `f2 = 1` and the family is DARK "no matter how much skill it
has." The repo's own research called this *"the real blocker"*
(`docs/engine/research/2026-10-02/corpus-deep/deep/c03/challenges.md:69`).

**The test:** a permutation test using the repo's own
`fitBridge`/`predictBridge`. ARM A = real training rows. ARM B = the same
rows with the **seven non-strength features permuted** (margin_diff, the
strength-class proxy, never permuted), scored on the same unpermuted
2025 holdout. 20 permutations; bootstrap resamples games, paired.

| | ARM A (real) | ARM B (shuffled) |
|---|---:|---:|
| Brier | 0.223743 | **0.221850** |
| permutations beating the full arm | — | **20 of 20** |

| | |
|---|---:|
| incremental value of the seven features | **−0.001893** (negative) |
| 95% CI | **[−0.008075, +0.004245]** |
| P(permuting degrades the model) | **0.266** |

**Destroying those seven features made the model slightly BETTER.** The
bridge's entire skill comes from `margin_diff` — the strength class.
**The f2 = 1 claim holds on the measurement and the gate stays.**

Reproduction is exact: measured Brier, raw binned ECE (0.051868),
`home_sign` and all eight coefficients match
`docs/reasoning/bridge-fit.json`.

**The repo's own C-290 worry was half right.** The debiased ECE does read
lower (0.049822 vs 0.051868) — the bias is real — but **both pass the 0.06
gate**, so the ECE gate was never the blocker. The duplicate was.

**The real loss is elsewhere and it is fixable.** The bridge's measured
skill is collapsed to a single constant by
`packages/ingestion-pipeline/src/slate-association.ts:85-115`
(`probability: association.mean` = 0.560244) and labelled *"not a
published probability and not an edge."* The per-game probabilities —
where the skill lives — are discarded. The honest fix is to fold the
bridge INTO the existing LIVE `historical_strength` family, not to
publish it beside it.

**This also re-scopes STAGED-IMPROVEMENT 6.** The bridge's coefficient
signs would build premises with **no measurable skill** (measured above),
so the reusable-premise work should draw on the 5,224 context-scoped MIND
premises instead — with the bridge's signs serving as a good **negative
control** the loop should learn to demote.

---

## 5d. The MIND corpus: 5,149 records, 201 gradeable — and the reason why

The previous cycle proved the promotion gate cannot be cleared. This
cycle found out **why**, and what would fix it.

**MEASURED (`reconciliation/mind_corpus_gradeability.md`):**

| | |
|---|---:|
| MIND records | 5,149 |
| with a specific metric on a sports unit | **39** (0.8%) |
| with a game-level NFL quantity | **22** (0.4%) |
| with a concept name + context tags + direction | **5,149 (100%)** |
| `claim_type` in {correlational, causal} | **704** |
| …**and** a measurable context | **128** *(estimate)* |
| …**and** a specific named metric | **4** *(estimate)* |

**CORRECTED by building the resolver and running it:** the real numbers
are **201 resolved to a measure** and **74 correlational/causal**, with
**2** fully specified. The estimate missed the direction filter — **88.2%
of the corpus is `conditional` and 0 of those 4,540 carry a
condition.**

**And that is the lever: 878 conditional premises have a measurable
context.** Full measurement in
`reconciliation/concept_axis_coverage.md`.

**Then I tested whether the direction can be re-derived — and it cannot
be derived accurately enough to grade on.** Validated against the 609
records whose direction is known: the SIGN of `numeric_claim.value`
predicts direction at **43.9%** (worse than a coin flip — a `count` of 10
is not a signed quantity), and direction words reach **72.1%**. A 72%
classifier is not usable on a score that is
`(agreement_rate − 0.5) × 2`, because a premise labelled backwards is
scored backwards, not noisily.

**So the real gate is the METRIC, not the condition.** A premise with a
specific metric and a value already carries its condition
(`fourth_quarter_pass_rush_decay` = 28 percent IS the threshold). The
population splits as:

| | count | needs |
|---|---:|---|
| specific metric + usable direction | **18** | nothing — **6 gradeable today** |
| specific metric + `conditional` | **21** | the direction only — **3 gradeable today** |
| placeholder metric | 5,110 | the metric AND the direction |

**Nine premises are gradeable on the concept axis right now**, with no
corpus work. The 878 needs a corpus pass that recovers the metric.

**On the live index: 285 of 5,509 premises (5.2%) are
probability-gradeable.**

**The corpus's numbers are mostly not game quantities.** The `numeric_claim`
field recorded **what the paper said** rather than **what the number
measured**: 1,724 `situational_game_unit`/`count`, 962
`statistical_parameter`/`coefficient`, 601 `temporal_epoch`/`year`, 1,636
with no number at all. Real examples of what "count 10" means:

- *"Emotional driving: Reference-dependent emotions and risky driving
  behavior after sporting events"* — **10-minute traffic intervals**
- *"Focal Loss Analysis of Peripapillary Nerve Fiber Layer Reflectance
  for Glaucoma Diagnosis"* — **4 retinal layers**

**26.9% of the corpus is not even about football.** Grading those against
an NFL game is a category error, and the loop is right to refuse them.

**But the corpus's CONCEPT is complete on 100% of records**, with 87
context tags, of which **14 have a measure surface that exists today**
(every model and column verified against `schema.prisma`): workload,
acwr, injuries, depth_chart, route_running, separation,
props_receiving, tracking, interceptions, coverage, live_odds, epa,
game_state, rest. Coverage is 20.5% of premise-tag pairs, **45.4%
excluding the three placeholder-metric tags that measure nothing**.

**So the honest number is 201 gradeable premises, not 5,224** — and the
**4** with a fully-specified assertion is the measure of what a
re-extraction pass would unlock.

**The fix is a measure resolver, not a corpus rewrite**: grade a concept
premise by measuring the concept's quantity in a real game and comparing
its **direction** against what happened, scored as
`(agreement_rate − 0.5) × 2 × min(support/MIN_SUPPORT, 1)`. The
probability axis is the same idea with a different number. Staged as
`staged_improvements/08-measure-resolver-concept-axis.md`.

**And the 201 is enough to close the loop.** 14 mappings make 201
premises gradeable, and the activation/residual/scorecard/promotion/
demotion/intervention machinery **already exists and is now honest** after
the six defects fixed earlier. The 4 says "the corpus needs work"; the
201 says "the loop can close."

---

## 5e. The concept axis: it runs, and it found the corpus's directions are noise

**Built and run end to end against the live database**
(`reconciliation/concept_axis_graded.md`).

| | count |
|---|---:|
| live premises with context tags | 5,434 |
| resolved to a measure | 201 |
| **graded on real data** | **139** |
| refused: `conditional_direction` | 4,540 |

**And the finding is sharp. Grading the same data twice per premise —
once with the corpus's asserted direction, once INVERTED:**

| measure | asserted | inverted | best possible | edge over chance |
|---|---:|---:|---:|---:|
| `workload` | 0.4352 | 0.5648 | **0.5648** | +0.0648 |
| `separation` | 0.5153 | 0.4847 | **0.5153** | +0.0153 |
| `coverage` | 0.4970 | 0.5030 | **0.5030** | +0.0030 |
| `tracking` | 0.4982 | 0.5018 | **0.5018** | +0.0018 |

**Per premise, the corpus's direction loses to its inverse for 85 of
139.** The direction is arbitrary — and so is everything else.

> **RETRACTION (2026-10-20).** An earlier version of this summary
> headlined that the concepts carry a "38.9-point edge" and that the
> corpus's sign field has it "21–39 points backwards." **Both numbers
> were artifacts and are retracted.** The grader was measuring
> `receivingYards` against `targets` — and **`targets` produces
> `receivingYards`**, so the test measured arithmetic, not sport.
> `receptions` against `targets` scores **0.9609**, which is what a
> definitional relationship looks like. **The real ceiling of the entire
> corpus is 6.5 points over chance, not 38.9.** The original claim was
> pushed to `origin`; the retraction is recorded in
> `reconciliation/concept_axis_graded.md` and the original is kept at
> `reconciliation/concept_axis_graded.RETRACTED-2026-10-20.md`.

**The corrected advice is narrower and still real:** the direction field
is arbitrary (54 better / 85 worse), so it must not be trusted; but **no
sign is better than another**, so the fix is not to re-read papers for
their sign — it is to find a *measurable* claim to grade. The corpus
needs premises whose concept is a **quality** measure (separation,
cushion, aggressiveness) tested against a **rate** rather than a count.

**The fix was structural, because the defect was structural: a concept may
not be measured against a quantity it mechanically produces.** Every
measure now declares its admissible outcomes, and the grader **REFUSES**
a circular pair (`DEFINITIONAL_RATE_FLOOR = 0.8`, asserted by a test to
stay above the 0.5252 strongest real association measured) rather than
reporting it. `route_running` drops from 1 grade to 0; `workload` moves
`targets` → `yards_per_target` and its activation score correctly
becomes 0.

**Two grader bugs, both found by running it, neither by reading it:**
- Postgres returns a bare `NUMERIC` as a **string**, so a
  `typeof === "number"` check rejected every row and refused all 201
  premises with a clean-looking `no_agreements`.
- The first comparison used the **sign** of a magnitude (always
  non-negative), so the grader could only report 0.000 or 1.000.
  Replaced with a **within-game pairwise test** — do the entities with
  the higher concept value also have the higher outcome value? That took
  the graded count from **1 to 139**.

**And a third, deeper defect:** the resolver took the premise's first
*resolvable* context tag, so a premise about **defender separation** was
measured on **receiving yards** — the context tags are the extractor's
broad domain buckets, and 140 premises resolved to only **4 distinct
measurements**. The fix is a **concept match** on the premise's own
metric name and title, and every grade now carries its match strength:
**11 `concept` matches (premise-level evidence) and 128 `tag` matches (a
measurement of a shared bucket, not of the claim).**

**The grader's arithmetic was verified against an independent query:**
191,642 / 215,534 = 0.88912, against the grader's 0.8891 — the arithmetic
was always right. **What was wrong was what it was measuring.**

**A fourth defect, found by that same check:** the `targets` outcome was
not a tautology-free substitute for the old one, because `targets`
produces `receivingYards`. Measured directly
(`reconciliation/_probe_definitional.mjs`): `receptions`/`targets` =
0.9609, `receivingYards`/`targets` = 0.8987, `avgSeparation`/`targets` =
0.4847. **The definitional guard in §5e is the real fix; the earlier
"outcome swap" was insufficient.**

**Nothing here touches a published number.** The concept axis produces
evidence and promotion candidates, not picks.

---

## 5f. Design spec reconciliation: the diagnoses are right, the build is unbuilt

**A design spec was supplied and reconciled against the measured repo**
(`reconciliation/design_spec_reconciliation.md`).
"Causal Sports Reasoning Engine Design" — the Shpitser-Pearl ID algorithm,
spectral-embedding HNSW, hierarchical Archimedean copulas, nine honesty
gates, L1–L4 verification.

| | |
|---|---|
| Module paths the spec names | **14** |
| …that exist in the repo | **1** (`bridge/bridge-model.ts`) |
| Spec'd build steps | 8 |
| …already implemented | **0** |
| Pathologies the spec diagnoses | 4 |
| …confirmed present in the repo | **4 of 4** |
| Spec'd honesty gates (G1–G9) | 9 |
| …implemented | **0** |

**The spec's diagnoses are correct and its remedies are unbuilt. That
changes the next phase from discovery to construction.**

**The spec's four pathologies, each confirmed:**

1. **Confounded regime shift (Simpson's paradox)** — `engine-weights.ts` is a
   fixed prior × signal table with no game-state conditioning; its `by`
   field cites a static marginal correlation (`r=+0.186, n=272`). There is
   **no `do()` in the live path**.
2. **Unsigned context + decorative citation** — the spec's claim that
   `mind-reasoning.ts` used keyword regexes over the corpus to decorate
   pre-authored heuristics is **CONFIRMED LIVE** at
   `mind-reasoning.ts:318-352`. Replicating the repo's own logic over all
   5,149 records: **4,173 (81.0%) land in the single default bucket
   `offensive_pace_sec_per_play`**, and **2,106 of 2,145 non-football
   records SURVIVE the cross-domain filter (98.2%)** — 1,898 of them
   filed under an NFL primitive. The spec's named example papers are
   present: **3 glaucoma/OCT records** ("Focal Loss Analysis of
   Peripapillary Nerve Fiber Layer Reflectance for Glaucoma Diagnosis"),
   plus driving-behavior and continual-learning papers.
3. **Entity-to-relation deficit** — the audit's vision layer is solid
   (22/22 tracks, purity 1496/1496) but the *relation* layer is where
   evidence breaks.
4. **Static uncertainty under non-exchangeable shift** — the repo has
   `conformal/levene-welch.ts` and the `calibration-contract.ts` gate, but
   **no `conformal-copula-kelly.ts`** and **no `settlement-loop.ts`**.

**One part of the spec is OUTDATED, and it is the part that was already
fixed.** The spec's "hardcoded constants (0.015, 0.024, 0.012)" and
"static prose templates (+395/+485/18.5%)" are **gone** — the spec's own
cited example is now a **negative assertion**:
`mind-reasoning.mutation-v2.spec.ts:114` asserts
`!/\+395|\+485|18\.5%/.test(...)`, and the empty corpus yields
`total_delta = 0`, empty prose, empty audit trail.

**And all 5 of the spec's dark primitives exist** (`ol_continuity_shared_snaps_pct`
4 files, `acoustic_crowd_spl_db` 5, `officiating_crew_penalty_rate` 5,
`surface_traction_coeff` 3, `air_density_kg_m3` 9) — and the spec's
remediation dispositions are right. Its `officiating_crew_penalty_rate`
excision is **the same defect the audit found independently**
(`engine-weights.ts:18` — the `officials` family is DARK with
`n=113, slope=-0.0101, se=0.0103`, "DARK even when the crew is named"), and its `surface_traction_coeff`
"static constant" claim is confirmed at `mind-reasoning.ts:271` and `:513`.

**The two schemas disagree, and one must win.** The spec's
`literature_premises` uses `M=24, ef_construction=200`, a 1024-d
embedding plus 512-d spectral low/high embeddings, `promotion_score`,
`ewma_brier_attribution`, and
`status ∈ {ACTIVE, SHADOW, DEMOTED, QUARANTINED}`. The audit's built
`lit.*` schema uses **`M=16, ef_construction=64`**, a single 1024-d
embedding, no spectral split, and no EWMA attribution. **The spec's is
richer; the audit's is measured and running.**

**The spec's latency SLO is not achievable as written.** It claims
< 2.5 ms P99 for HNSW; the audit measured **77 ms p50 over the
network**. The SLO presumes in-DB or same-region latency.

**And the spec's §4.3 "7-line recursive ID algorithm" IS ALREADY
WRITTEN** — `2602-23233v1-counterfactual-combine-a-causal.ts` has
`identifyStrategy`, `adjustmentEstimand`, `frontdoorEstimand`, and
`requireIdentified`, and `2603-22620v2-chainreaction-causal-discovery-via-blocking.ts` has `backdoorSet`
and `refutationSuite`. **Both are unwired.** The gap there is
integration, not invention.

**The convergence is the finding.** The spec diagnoses the corpus's
keyword-regex misfiling and demands L4 (cross-encoder NLI) entailment.
The audit measured that misfiling (2,106 survivors), that 88.2% of
directions are a regex fallback, and that the corpus's concepts carry a
**concept-quality association that this data cannot currently
resolve** (the honest ceiling is 6.5 points over chance). **The spec and
the audit arrive at the same fix from opposite directions.**

---

## 5g. The L1–L4 admission gates: a gate that cannot fail

**The repo already had an L1–L4 admission gate. It reports 67.4% of the
MIND corpus is admitted. Checked against the actual source documents, the
truthful answer is 0%.**
(`reconciliation/l1_l4_admission_gate.md`,
`l1_l4_admission_gate_truthful.json`)

| layer | existing gate | truthful gate |
|---|---:|---:|
| L1 verbatim provenance | 5,149 / 5,149 | **1,537 (29.9%)** |
| L2 numeric containment | 3,470 / 5,149 | **1,766 (34.3%)** |
| L3 character-span anchoring | 3,470 / 5,149 | **0 (0.0%)** |
| L4 mechanism entailment | 3,470 / 5,149 | **1,589 (30.9%)** |
| **ADMITTED** | **3,470 (67.4%)** | **0 (0.0%)** |

**Why the existing gate passes everything:** it checks SHAPE, not TRUTH,
and never opens the source document. L1 checks the quote is ≥10 chars.
L2 accepts a quote containing only a **unit word**. L3 checks
`end_char > start_char` — which every record satisfies by construction.
L4 checks the mechanism quote is non-empty.

**Three measured consequences:**

1. **3,509 quotes are absent from the documents they cite** — and
   whitespace normalisation recovers **0** of them. They are text from a
   *different* paper: a thermodynamic-economics abstract, an MMA
   analytics abstract, a radar-imaging abstract, an acoustics abstract,
   all filed under NFL records.
2. **The failure is structural, and the source type predicts it.** Every
   JSON source that holds a document's text verifies (461/492, 369/407,
   269/269). Every markdown source fails at ~0% (8/369, 0/286, 0/266,
   0/202). The markdown records' quotes are database rows, not documents:
   *"ASSOCIATION_ONLY - 1 - 0.8507281977552686"*.
3. **Not one record's offsets select its own quote** — 0 exact, while all
   5,149 carry `verification_tier: "MSVH_S1_EXACT"`. **The tier is a
   label the builder wrote; it was never a check.**

**And 1,704 records pass the existing L2 purely on a unit word** — e.g.
number 0.25 with a quote containing only "seconds".

**Built:** `packages/prediction-engine/src/literature/literature-verification.ts`
— each layer computed **independently** (so a report says how deep a
failure goes, not just the first failure), L2 with **no unit-word
escape**, L3 checking `source.slice(start, end) === quote`, L4 requiring
the mechanism quote to be **in the source** because a quote that is not
in the document cannot entail a mechanism. **23 regression tests**, each
naming the failure it prevents. Suite **95/95**; `tsc` **0 errors**.

**The honest reading: zero admitted does not mean the corpus is
worthless. It means it was never verified, and verification was never
performed.** The **1,537 records whose quotes genuinely are in their
source documents are the real corpus.** The other 3,509 are not, and no
amount of scoring or promotion will make them so.

**This is the spec's L1–L4 remedy, and the spec was right to demand it.**
The audit's independent finding was that 2,106 non-football records
survive the corpus's own cross-domain filter; **the gate catches a
strictly larger set (3,509) on a mechanical, per-record test that needs
no model and no judgment call.**

---

## 6. What the recon batch changed

Three read-only agents ran against the same worktree. They **corrected my
own work** twice and added four structural facts I did not have. Full
detail in `reconciliation/recon_integration.md`.

**Corrections to my work:**
- The zero-importer sweep was wrong three times (missing path aliases;
  missing Python `from . import X`; counting `tests/` directories as
  production consumers; and a basename collision between
  `intelligence/trust/` and `apps/web/lib/trust.ts`). Now three-tiered:
  **2,174 ZERO / 888 PACKAGE_INTERNAL_ONLY / 1,187 EXTERNALLY_CONSUMED.**
  Spot-checked against six hand-verified modules.
- **"20 of 21 DARK evaluators need only an adapter" was wrong. It is 5.**
  I judged by whether the declared `dataDependencies` *named* an existing
  table -- but those names are source-product names (`nfl_pbp`,
  `nfl_charting`), and the play-level tables do not exist in
  `schema.prisma` (no `model Play`, no `model Drive`, no penalty column,
  no `Player.birthDate`, no venue coords). Corrected census:
  `reconciliation/dark_sources_census_corrected.json`.
- `runInterventionTest` is **not** do-calculus -- it is a truncated mean
  difference on the same variable with no adjustment set. The name
  overstates it; the docs now say so.

**Four new structural facts:**
1. **The Python mind cannot return a probability.** The output type has no
   slot: `run_game.py:357-361` hardcodes `"pick": None, "confidence": None,
   "probability_before_calibration": None, "probability_after_calibration": None`.
2. **The engine reasons about a fixture**, not the game being emitted
   (`run_game.py:343` -> `card_request()`).
3. **The only signal->trueProb seam votes zero times** (the sign gate plus a
   4-key env bridge).
4. **Two signals are ACTIVE but always return null**
   (`nfl_wr1_out_redistribution` at weight 0.14; `nfl_referee_crew_tendencies`).
   Because they are ACTIVE they carry no `blockedReason`, so the
   missing-context audit never reports them. **Worse than DARK.**

Also: the 225 trust-intake rows are a **relabelled nflverse parquet**, not
a news wire (225/225 `signal_origin: news_wire` with an
`nflverse-data/releases/download/injuries/...` URL, `quote_text` null,
`extraction_confidence` 0.0, `schema_version` 1.0.0 against a pipeline
declaring 1.1.0, `extractor_name` null -- the store was not written by this
repo's code). And the "429 Kaggle datasets" is `len()` of a scraped
metadata JSON; there is **exactly 1** Kaggle-derived code module.

---

## 7. The honest limits of this report

- **The residual numbers are not evidence.** 72 residuals, 2 games, 8 promoted
  premises, 8 intervention tests all INCONCLUSIVE. `residuals_improved: true`
  is noise with a favourable sign.
- **The corpus scale numbers are measurements of files, not of papers.** 8,077
  distinct identifiers includes 342 "other" ids and 575 URLs. The
  paper-only count is ~7,160 arXiv ids.
- **The DARK verdicts are mine, and the producer detection is a heuristic.**
  I corrected it once (the first pass matched the DARK file's own reads and
  reported 21/21 as "producer exists"). The second pass excludes the DARK
  file and requires an assignment. **`REST_DAYS` → `games.restDaysHome` is
  verified by hand; the other 19 rest on the declared `dataDependencies`
  matching a table I measured with rows.** Each one still needs its adapter
  written and its output checked.
- **The wire classifier's precision is unmeasured**, and with 104 feeds
  polling every 10 minutes a 70%-precise classifier injects 30% noise into
  the real-time spine. That is a measurement gap, not a code gap.
- **`arxiv-reasoning-bridge.ts` has 13 premises and 0 importers** — but I did
  not exhaustively re-map every concept in the 1,513 ledgers to a module.
  The recon agent reported 291 of 1,442 ledger IDs have an implementing
  module; I did not independently re-derive that number.
- **Nothing here is committed or pushed.** The 4 staged improvements and 12
  documents are staged files.

---

## 8. Deliverable index

| File | What it answers |
|---|---|
| `realtime_ingestion_requirements.md` | All 39 crons; 8 signal families with latency targets and current state; the measured signal table |
| `layer2_living_literature_map.md` + `.json` | The 3 pillar taxonomies and the canonical 9; the evaluability ladder; 5 measured retrieval failures |
| `literature_integration_map.md` | The claim corrections; measured corpus scale; what is real vs literal |
| `event_driven_retrieval_spec.md` | The 4 retrieval laws; the event path hop by hop; the 1,268→8,077 expansion plan |
| `causal_inference_methods.md` | Every causal method with its wiring status; the 4 missing methods with hook points; the `CausalLink`-has-no-numbers finding |
| `dark_sources_census_corrected.json` + `fix_plan.md` | **CORRECTED**: 23 evaluators (21 DARK + 2 SHADOW_ONLY); only **5** need an adapter, 18 need a producer that does not exist; 4 deletion candidates |
| `staged_improvements/06-reusable-feature-premises.md` | Why 0 edges can be promoted, and how to derive reusable premises from the bridge model's coefficient signs |
| `mind_corpus_gradeability.md` + `.json` | What in the MIND corpus is actually gradeable: 5,149 records, 39 with a real metric, 22 game-level NFL quantities. The corpus has concepts, not numbers. |
| `l1_l4_admission_gate.md` + `l1_l4_admission_gate_truthful.json` | **The L1–L4 admission gate, made falsifiable**: the existing gate reports 67.4% admitted; checked against the actual source documents the truthful gate admits **0 of 5,149**. 3,509 quotes are absent from the documents they cite (0 recoverable by normalisation), 0 of 5,049 spans select their own quote despite a `MSVH_S1_EXACT` label, and 1,704 records pass L2 on a unit word alone. 23 regression tests; suite 95/95. |
| `_probe_l3_anchoring.mjs` | The probe that found the fabrication: every quote searched in the source file it names, at its claimed offsets. |
| `design_spec_reconciliation.md` | **Reconciliation of the supplied design spec against the measured repo**: 13 of 14 spec'd module paths do not exist, 0 of 8 build steps implemented, 0 of 9 honesty gates built — but **4 of 4 diagnosed pathologies confirmed present**, the spec's own cited hardcoded-constant example now a negative assertion, all 5 dark primitives real, and the spec's ID algorithm already written but unwired. |
| `concept_axis_graded.md` | **The concept axis RUN on real data, and CORRECTED**: 139 premises graded. **Retracts** an earlier "38.9-point edge" claim that was a definitional artifact (`targets` produces `receivingYards`; `receptions`/`targets` = 0.9609). The real ceiling is 6.5 points over chance. Carries the definitional guard that makes such a pair impossible to report again. |
| `concept_axis_graded.RETRACTED-2026-10-20.md` | The retracted original, kept as an audit trail rather than quietly overwritten. |
| `_probe_definitional.mjs` + `_probe_concept_outcome_matrix.mjs` | The probes that found the definitional artifact: every concept×outcome pair, same-sign rate, with the definitional verdict |
| `direction_signal_measurement.json` | The direction-vs-inverted test, per measure: the decisive measurement of whether the corpus's sign field carries information |
| `concept_axis_coverage.md` + `.json` | The resolver RUN over the corpus and the live index: 201 premises resolve to a measure, 74 are correlational/causal, 2 fully specified, 4,540 refused as `conditional`. **The biggest remaining lever: extract the condition for 878 measurable conditional premises and the population goes 201 → 1,079.** |
| `staged_improvements/08-measure-resolver-concept-axis.md` | 14 context->measure mappings + a second grading axis. **BUILT and MEASURED** — 201 premises gradeable, giving the promotion gate a path that does not need probabilities. |
| `f2_duplicate_measurement.md` + `.json` | The decisive no-publish gate, MEASURED: permuting the seven non-strength features made the model slightly better (20/20), so the f2 = 1 duplicate claim holds and the gate stays. Includes the per-gate status table. |
| `literature_coverage_report.md` | The literature loop measured end to end: 5,509 premises + 1,268 corpus items HNSW-indexed, 200 real retrieval events, 5,650 activations, 8 promoted edges; **the tautology I found and fixed**; the degenerate residual sample stated plainly |
| `recon_integration.md` | What the three recon agents added and what they corrected in my work |
| `zero_importer_sweep.json` | Three-tiered: 2,174 ZERO / 888 PACKAGE_INTERNAL_ONLY / 1,187 EXTERNALLY_CONSUMED. A triage list, not a reachability source |
| `reasoning_engine_continuous_loop_spec.md` | The 20-hop chain; the 7 questions answered; the target architecture; 9 staged stages |
| `invention_proposals.md` | 12 proposals, ranked, with gates and risk |
| `staged_improvements/` | 4 reviewable PR descriptions with acceptance criteria |
| `corpus_scale.json` | The measurement behind every corpus number |
