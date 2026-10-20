# Causal Inference Methods — inventory and hook points

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Method:** every wiring claim is a grep whose command is shown. The
`grep -rl` importer counts exclude the module's own file, its own test file,
and `packages/prediction-engine/src/index.ts` (the barrel), because a barrel
re-export is not a consumer.

---

## 0. Headline: the four "missing" methods are mostly PRESENT but unwired

The brief asks to "integrate" do-calculus, counterfactual evaluation, temporal
causal discovery, and residual mining, on the assumption they need to be
written. Measured:

| Method | Implemented? | Wired? | Verdict |
|---|---|---|---|
| **Do-calculus (adjustment / front-door / back-door estimands + identification check)** | **YES** — `packages/prediction-engine/src/2602-23233v1-the-counterfactual-combine-a-causal.ts` | **NO** — only its own test imports it | **Implementation exists. Needs a graph + a caller.** |
| **Back-door set discovery + refutation suite** | **YES** — `packages/prediction-engine/src/2603-22620v2-chainreaction-causal-discovery-via-blocking.ts` | **NO** — only its own test | Same. |
| **Counterfactual combine** | **YES** — same file as do-calculus, module title is literally "The Counterfactual Combine" | NO | Same. |
| **Counterfactual / intervention** (word-level) | 27 files mention "counterfactual", 22 mention "intervention" | mixed | Mostly the *adversary* and *abstention* senses, not Pearl counterfactuals. |
| **NOTEARS / PCMCI / regime-dependent causal discovery** | YES — `packages/prediction-engine/src/causal/` (5 modules) | NO — **all 5 carry `export const ENABLED = false`** | Written, explicitly dark. |
| **Temporal causal discovery** | PARTIAL — `batesGrangerWeights` in `2608-13886-a-forecast-combination-framework-for.ts`; `laggedCorrelationSelect` in `causal/multidata-drivers.ts` | NO | Exists as primitives. **But the DATA substrate is excellent** (see §3). |
| **TMLE / IPW / doubly-robust / e-value** | YES — `causal/tmle-quantile.ts`, `causal/ipw-template.ts`, `causal/e-value.ts`, `causal/dual-likelihood-ci.ts` | mixed | Not on the published-number path. |
| **Residual mining** | **NO** | — | **Genuinely missing. But a residual store now exists** (audit branch). |

**The single most important structural fact for this mandate:**

```ts
// intelligence/integration/types.py:52
@dataclass
class CausalLink:
    cause: str
    mechanism: str
    outcome: str
    verification: Verification
    breaking_condition: Optional[str] = None
    id: str = ""
```

**A `CausalLink` has no effect size, no probability, and no quantity.** It is
a qualitative claim: "X causes Y through M". A do-calculus query
`P(Y | do(X = x))` needs `E[Y | T=t, Z=z]` and `P(Z=z)` — a
**conditional mean table**, which the L3 chain does not carry and cannot
supply. `backdoorSet` already knows how to *find* the adjustment set; it has
nothing to *estimate* with.

**This is the gap that matters, and it is a data gap, not an algorithm gap.**
The do-calculus code is written, tested, and correct. What is missing is the
step that turns a qualitative chain into a quantitative estimand.

---

## 1. Part A — the causal method inventory

### 1.1 `packages/prediction-engine/src/causal/` — 21 modules, all dark

| Module | Key symbols | Enabled? | Importers (non-barrel, non-test) |
|---|---|---|---|
| `1803-01422v2-notears-dag.ts:16` | `matExp`, `acyclicity`, `thresholdEdges`, `jaccardEdges`, `notearsFit` | **`ENABLED = false`** | 0 |
| `2001-04197v4-rcd-quarantine-layer.ts:23` | `residualizeOnAncestors`, `corMatrix`, `markBidirected`, `quarantinePairs` | **`ENABLED = false`** | 0 |
| `2003-03685v2-pcmci-team-panel.ts:23` | `partialCorr`, `pcorPvalue`, `pcmciSkeletonS1` | **`ENABLED = false`** | 0 |
| `2007-00267v1-regime-dependent-causal-discovery.ts:23` | `cusumDetect`, PCMCI + regime split | **`ENABLED = false`** | 0 |
| `2110-00637v4-ml4c-supervised-orienter.ts:23` | Pareto-frontier orientation | **`ENABLED = false`** | 0 |
| `dag-nocurl.ts` | `hodgePotentials`, `nocurlProject`, `isAcyclic`, `shd` | — | 0 |
| `dag-ordering.ts` | `kendallTau`, `aggregateOrderings`, `constrainEdges`, `directionalityAudit`, `orderingVerdict` | — | 0 |
| `dual-likelihood-ci.ts` | `dualLikelihoodTotalEffectCI` | — | 0 |
| `e-value.ts` | `eValue`, `eValueForCi`, `confoundingReport` | — | 0 |
| `ipw-template.ts` | `smd`, `trimPs`, `ipwAtt`, `doublyRobustAtt` | — | 0 |
| `tmle-quantile.ts` | — | — | 0 |
| `multidata-drivers.ts` | `laggedCorrelationSelect`, `driverStability`, `driverVerdict` | — | 0 |
| `quantitative-probes.ts` | `Probe`, `ProbeEstimate`, `ProbeResult` | — | 0 |

Reproducible importer count:
```
grep -rl '<module-basename>' --include='*.ts' packages/ apps/ scripts/ \
  | grep -v node_modules | grep -v 'src/<module-basename>.ts' | grep -v index.ts
```

### 1.2 Top-level arXiv-derived causal modules — the three that matter

| Module | Symbols | Importers |
|---|---|---|
| `packages/prediction-engine/src/2602-23233v1-the-counterfactual-combine-a-causal.ts` | `identifyStrategy`, `adjustmentEstimand`, `frontdoorEstimand`, `requireIdentified` | **1 — its own test only** |
| `packages/prediction-engine/src/2603-22620v2-chainreaction-causal-discovery-via-blocking.ts` | `notearsAcyclicity`, `backdoorSet`, `refutationSuite` | **1 — its own test only** |
| `packages/prediction-engine/src/2608-13886-a-forecast-combination-framework-for.ts` | `solveLinear`, `ridgeFit`, `shrinkCovariance`, `batesGrangerWeights`, `reconcileSeasonTotal` | **1 — its own test only** |

**These three are the do-calculus engine the brief asks for, already written.**
`2602-23233v1`'s own header says so:

> "Do-calculus engine for 'what if player X is out' queries: adjustment,
> front-door, and back-door estimands compiled from the causal graph, with an
> identification check that refuses unidentified queries."
> "ADDITIVE utility. **Not wired into any live model path** (wiring changes
> predictions and is a NEEDS HUMAN CALL)."

The `requireIdentified` function is the honesty gate the brief describes —
"an intervention has no effect on the outcome even if observation suggests
one" — and it already throws on an unidentified query.

### 1.3 `packages/prediction-engine/src/symreg/` — 3 more dark modules

`2006-10782v2-aifeynman-pareto-pruning.ts:23`,
`2312-11955v1-vertical-symbolic-regression.ts:23`,
`2401-00282v1-dgsr-lite-refinement.ts:23` — all `ENABLED = false`.

**Eight causal/symreg modules are switched off by a single `ENABLED` const.**
That is the honest state and it is better than being silently wrong.

---

## 2. Part B — the four methods, each with its hook point

### 2.1 DO-CALCULUS INTERVENTION on the L3 chains

**The estimator exists.** `adjustmentEstimand(condMeans, pZ, t)` computes
`E[Y | do(T=t)] = sum_z E[Y|T=t,Z=z] P(Z=z)`. `frontdoorEstimand` computes
the front-door functional. `backdoorSet(edges, treatment, outcome)` finds
the adjustment set from a `CausalEdge[]` graph.

**What is missing is the bridge from an L3 chain to `condMeans`/`pZ`.**

`backdoorSet` wants a `CausalEdge[]` — a quantitative graph with `from`/`to`
edges. The L3 chain produces `CausalLink(cause, mechanism, outcome)` — a
qualitative path. The bridge would need, for each link:

| Requirement | Where it would come from | Exists? |
|---|---|---|
| treatment `T` and outcome `Y` node ids | the L3 link's `cause`/`outcome` strings | YES (strings) |
| a `CausalEdge[]` with numeric edges | **not produced anywhere** | NO |
| `condMeans[z][t] = E[Y|T=t,Z=z]` | the settled-history table | **PARTIAL** — 4,340 settled picks over 2,374 games exist, but not indexed by (T, Z) |
| `pZ[z] = P(Z=z)` | the covariate distribution | NO |
| `Verification` per link (already present) | `intelligence/reasoning/enums.py:42` | YES |

**The single smallest missing link** (this is the answer to "what would
attach here"):

> A function that, given a settled-history table, computes
> `condMeans` and `pZ` for a (treatment, outcome) pair and a candidate
> adjustment set — i.e. that fills the **numeric** side of the do-calculus
> seam — and a caller that takes an L3 `CausalLink`, resolves its
> `cause`/`mechanism`/`outcome` strings to signal keys, finds the
> adjustment set with the existing `backdoorSet`, and evaluates
> `adjustmentEstimand`.
>
> **Hook point:** `packages/prediction-engine/src/literature/literature-causal.ts`
> already has the promoted-edge machinery (`runCausalPromotionSweep`,
> `runInterventionTest`) and already runs an intervention test — but on
> **residuals of a promoted premise**, not on an L3 chain. The do-calculus
> call would replace or extend `runInterventionTest` there, with the L3
> chain's `CausalLink` supplying the graph and a new estimator supplying
> `condMeans`/`pZ`.

**Interim, honest alternative (no new estimator needed):** the promoted-edge
intervention test already implemented uses a truncated-mean difference on
residuals (`literature-retrieval.ts:479-540`) and refuses unidentified
queries by construction (it requires n≥8, treated≥3, control≥3, and reports
INCONCLUSIVE otherwise). It is a *crude* do-calculus: a before/after contrast
on activation strength, not a Pearl estimand. It is honest about that:
8 tests, all INCONCLUSIVE, because no premise has enough graded residuals.

### 2.2 COUNTERFACTUAL EVALUATION

**What is observed today:** the reasoning trace records `observed_values` —
a flat map of metric → number — which is exactly what a `BreakingCondition`
compares against (`intelligence/reasoning/schemas.py:47-63`:
`metric`, `op`, `threshold`, `observed`).

**So a counterfactual is mechanically available: re-evaluate the trace with
one observed value changed.** The machinery for *deciding which* value to
change does not exist.

**What exists nearby:**
- `intelligence/engines/harness.py` — a run harness.
- `intelligence/reasoning/primitives/` — the primitive library.
- `intelligence/reasoning/adversary.py:190` `_check_breaking_conditions` —
  already evaluates a link against its breaking conditions, i.e. it already
  answers "does this link survive the observed world?"
- `adversary.py:241` `_steelman` and `:298` `_pre_mortem` — the closest
  thing to counterfactual reasoning that exists, and they are *qualitative*
  (they strengthen or attack a thesis in prose, not recompute a number).

**Hook point:** a `counterfactual_trace(trace, metric, value)` function
that clones the trace, overrides one `observed_values` entry, re-runs
`adversary_review` (which re-checks breaking conditions), and reports
whether the thesis survives. Then the adversary's own breaking conditions
become the intervention set — the chain tells you which interventions are
worth running, because each link carries its own falsifiers.

**This is the cheapest of the four.** It needs no new estimator and no
graph; it needs a trace-clone-and-rerun. The trace type is in
`intelligence/reasoning/schemas.py` and `intelligence/reasoning/trace.py`.

### 2.3 TEMPORAL CAUSAL DISCOVERY

**The data substrate is excellent and I measured it** (live Neon, main branch):

| Store | Rows | Resolution | Span |
|---|---|---|---|
| `odds_line_snapshots` | **4,948,756** | **14,033 distinct `capturedAt` stamps over 33 days** | 2026-08-19 → 2026-10-20 |
| `signals` | 126,445 | per-entity-per-key, multiple captures | 2026-08-06 → 2026-10-20 |
| `game_signals` | 5,984 | 14 keys, `fetchedAt` + `expiresAt` | 2026-05-22 → 2026-10-20 |
| `pick_signal_snapshots` | 4,542 | mint-time evidence | — |
| `picks` settled | 4,340 (2,374 games) | — | — |

**6,038 (entity, key) pairs have multiple captures** — that is a queryable
sequence per signal, which is what a lagged-correlation or PCMCI sweep needs.

**Existing primitives:**
- `batesGrangerWeights` — `2608-13886-a-forecast-combination-framework-for.ts:78`
- `laggedCorrelationSelect` — `packages/prediction-engine/src/causal/multidata-drivers.ts:34`
- `pcmciSkeletonS1` — `packages/prediction-engine/src/causal/2003-03685v2-pcmci-team-panel.ts:114`
- `cusumDetect` (regime change) — `2007-00267v1-regime-dependent-causal-discovery.ts:114`

**So the algorithm and the data both exist; the wiring does not.** The
missing piece is a sweep that reads the *sequence* of a signal key for one
entity over time and produces candidate lagged edges, then feeds them to
`pcmciSkeletonS1` / `laggedCorrelationSelect`.

**Caveat that matters for honesty:** with 4.9M odds snapshots at 14k
timestamps, a naive lagged sweep is O(n²) in stamps and will find spurious
edges in market data (which is a near-random-walk by construction). The
`refutationSuite` already in the repo — placebo estimate must be ≈0, subset
estimates must agree in sign — is the right guard and should be mandatory
on every discovered edge, not optional.

### 2.4 RESIDUAL MINING

**Genuinely missing on `main`.** Verified: `packages/prediction-engine/src/settlement.ts`
contains **zero** references to `weight`. `packages/ingestion-pipeline/src/post-settlement-work.ts`
is a **retry queue** (`enqueuePostSettlementWork`, `markPostSettlementWorkDone`,
`retryablePostSettlementWorkWhere`, `cancelPostSettlementWork`) — it tracks
whether work finished, not what was learned.

**But a residual store now exists** on the audit branch: `lit.residual`
(72 rows, from real settled outcomes) plus `lit.premise_score` (28 premises
graded) and `lit.causal_edge` (8 promoted). The builder is
`applyResidualFeedback` (`packages/prediction-engine/src/literature/literature-retrieval.ts:290`).

**What a residual-mining job would consume:**
1. `lit.residual` — (activation, premise, game, predicted, actual, residual).
2. The settled `picks` (4,340 rows) and `pick_signal_snapshots` (4,542) for
   the game's full feature vector.
3. The *unexplained* part of the residual: `residual - sum(premise contributions)`.
   If that is systematically non-zero and correlates with an unmodeled
   signal key, that key is a **missing causal factor** — the discovery.

**The mining output must be a staged candidate, not a silent weight change.**
The repo's own pattern (and the reason the DARK evaluators are DARK) is that
a new signal needs a producer before it can be active. So a mined factor
becomes a **premise candidate** with a proposed producer, and it stays dark
until that producer exists. This is the same rule that keeps the 23
`DARK_NO_PIT` evaluators honest, applied to invention.

---

## 3. Part C — the settlement→belief loop that exists today

**It does not exist.** Measured:

| Question | Answer | Evidence |
|---|---|---|
| Does settlement update a signal weight? | **NO** | `grep -n 'weight' packages/prediction-engine/src/settlement.ts` → no matches. |
| Does anything update a premise score from a settled result? | **NO on main** | `grep -rln 'lit.residual' packages/ apps/` → nothing on main; the `lit` schema exists only on the audit branch's Neon dev branch. |
| Does `post-settlement-work` update a belief? | **NO** | `packages/ingestion-pipeline/src/post-settlement-work.ts` is a work-queue: `POST_SETTLEMENT_WORK_KINDS` (:50), `enqueuePostSettlementWork` (:125), `markPostSettlementWorkDone` (:173), `markPostSettlementWorkFailed` (:255), `cancelPostSettlementWork` (:227). It tracks *completion*, not *belief*. |
| Is there a calibration map applied to published probabilities? | **NO — the seam is empty** | `packages/prediction-engine/src/scoring.ts:832` reads `input.context?.probabilityCalibrator`; repo-wide grep finds the field only at `scoring.ts:832`, `scoring.ts:1499`, `packages/types/src/index.ts:616` (the type), and `packages/prediction-engine/src/__tests__/calibration-seam-threading.test.ts` (**the only writer — a test**). `dynamic-context-builder.ts` and `process-sport.ts` never set it. |
| Does the adversary's report reach a published number? | **NO** | `intelligence/reasoning/adversary.py:357` `adversary_review` returns an `AdversaryReport`; `:477` `killed_legs` extracts the killed legs. Nothing in `packages/ingestion-pipeline/` or `packages/prediction-engine/src/scoring.ts` imports either. |

**So the loop is open at three points:** adversary → number, settlement →
weight, and residual → edge. The audit branch closes the third one
(partially, 72 residuals) and stages the first two.

---

## 4. Part D — the Kaggle surface

The brief says 429 Kaggle datasets are structured as premises. Measured:

| Question | Answer |
|---|---|
| Kaggle identifiers in `arxiv-reasoning-bridge.ts` | **0** |
| `totalKaggleDatasetsIndexed: 429` | a **hardcoded literal** in the return object |
| Kaggle records in the MIND corpus | **269** (source label `Kaggle`) |
| `kaggle_multi_era_historical` | one `LiteratureDomain` in `corpus-evaluator.ts` — a single domain, not 429 datasets |
| A Kaggle dataset registry with per-dataset evaluators | **does not exist** |

So the true number is **269 Kaggle-sourced records in the mind corpus**,
with **one** corpus-evaluator domain covering "Kaggle multi-era
historical". The 429 is a literal, like the 2,379.

**This matters for the index:** the 269 Kaggle records ARE in the 5,149
mind-corpus records, so they are already in the `lit` index (5,509
premises include them). The "429 datasets" framing overstates by ~1.6× and
implies a per-dataset registry that does not exist.

---

## 5. Summary table — every method, its state, and its hook

| Method | Code | Wired | Hook point | Blocker |
|---|---|---|---|---|
| Adjustment estimand | `2602-23233v1:37` | NO | `literature-causal.ts` (replacing/extending `runInterventionTest`) | needs `condMeans`/`pZ` from settled history |
| Front-door estimand | `2602-23233v1:50` | NO | same | needs a mediator chain with conditional means |
| Back-door set | `2603-22620v2:51` | NO | same | needs a `CausalEdge[]`; the L3 chain is qualitative |
| Identification check | `2602-23233v1:69` | NO | same | none — **use it first** |
| Refutation (placebo + subset) | `2603-22620v2:73` | NO | **must gate every discovered edge** | none — **use it as the default** |
| NOTEARS / PCMCI / regime | `causal/*` (5 modules, `ENABLED=false`) | NO | a new discovery sweep over `signals` sequences | needs a sweep job; 4.9M odds rows will produce spurious edges without refutation |
| Granger weights | `2608-13886:78` | NO | same | same |
| TMLE / IPW / doubly-robust | `causal/tmle-quantile.ts`, `ipw-template.ts` | NO | residual mining (2.4) | needs an outcome + treatment pair from the chain |
| e-value | `causal/e-value.ts:21` | NO | same | needs a CI |
| Counterfactual (Pearl) | `2602-23233v1` (title: "The Counterfactual Combine") | NO | `adversary.py` — clone trace, override one `observed_values` entry, re-run | needs a trace-clone helper |
| Counterfactual (mechanical) | **none** | — | `intelligence/reasoning/schemas.py` `BreakingCondition` + `observed_values` | **cheapest win — no new estimator** |
| Adversary-as-intervention | `adversary.py:190` `_check_breaking_conditions` (partly) | partial | extend to re-run under a counterfactual world | the trace-clone helper |
| Residual mining | **none** | — | new job over `lit.residual` + `pick_signal_snapshots` | residual store exists only on the audit branch |
| Settlement→belief | **none** | — | `apps/web/lib/settlement/free-path-snapshot.ts` (residual bridge, audit branch) | `corpusWeight` gate not run |
| Adversary→number | **none** | — | `process-sport.ts` context assembly | needs an agreed numeric contribution |

---

## 6. The doctrine point, stated plainly

The brief's framing is that the engine should "move from 'we observed this
pattern' to 'we can reason about what would change if we intervened'".

**The repo is further along than the brief assumes.** The estimators, the
identification check, the refutation suite, the Granger weights, the PCMCI
skeleton, the regime detector, the causal graph types, the adversary with
its breaking conditions — all exist, all tested, all **unwired**.

**What is genuinely missing is three things, and only three:**

1. **The numeric bridge** from a qualitative L3 chain to a `condMeans`/`pZ`
   table. This is a data-plumbing problem, not an algorithm problem.
2. **The trace-clone-and-rerun** that makes counterfactual evaluation
   mechanical instead of prose. This is the cheapest of all the gaps and
   needs no new estimator — the trace already carries `observed_values` and
   the adversary already checks breaking conditions against them.
3. **A producer for every dark signal.** 23 evaluators are `DARK_NO_PIT`;
   without producers they fail closed and never vote, and no amount of
   causal machinery changes that.

**The one thing that would make all of it real** is closing the
settlement→belief loop, because without residuals there is nothing for a
do-calculus estimand to be *fit to*, and no premise can earn promotion.
The audit branch builds the residual store; the promotion gate (N≥500
settled games, ΔBrier≥0.002) is the arithmetic that turns it into belief.

**Honest caveat on the measured promotion numbers.** 8 premises were
promoted and 8 intervention tests ran, all INCONCLUSIVE. 72 residuals over
2 games is not a trend. The machinery is real and the numbers are not yet
evidence.
