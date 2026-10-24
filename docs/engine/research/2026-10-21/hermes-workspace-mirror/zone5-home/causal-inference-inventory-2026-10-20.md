# Causal Inference Inventory — Beexly/Sports

**Audited tree:** `C:/Users/Garrett/Sports-wt-audit-20261020`
**HEAD:** `0fdcdefac` on `audit/reconciliation-2026-10-20` = `origin/main 4fa5330f4` + 2 commits (`2575402f6`, `0fdcdefac`).
**Method:** every claim carries `file:line`. Absence is shown by grep, not inferred.

> ⚠️ **Provenance caveat that changes three answers below.** The task brief assumed HEAD == origin/main `4fa5330f4`. It is not. The 2 extra commits add the **entire `lit.*` literature/causal layer** (`literature-retrieval.ts`, `literature-causal.ts`, `apps/web/lib/literature/*`, `reconciliation/schema_literature.sql`) plus `packages/types` additions. `git ls-tree -r --name-only 4fa5330f4 | grep -i literature` returns only `reasoning/literature-registries.ts`. Everything below marked **[BRANCH-ONLY]** is absent from origin/main. This is the single most consequential fact in this audit: the only causal-edge machinery that touches a database is unmerged.

### Reproducible grep definitions (referenced as G1/G2/G3 below)

```bash
# G1 — production importers of a module (stem = basename without .ts)
grep -rlE --include=*.ts --include=*.tsx "(from|require\()\s*[\"'][^\"']*<stem>(\.js)?[\"']" . \
  | grep -v node_modules | grep -v '\.test\.ts$' | grep -v "<stem>.ts" | wc -l

# G2 — production references to an exported symbol
grep -rn --include=*.ts --include=*.tsx "\b<symbol>\b" . \
  | grep -v node_modules | grep -v '\.test\.' | grep -v "<defining-dir>/" | wc -l

# G3 — file-level keyword hits (code only)
grep -rliE --include=*.ts --include=*.tsx --include=*.py '<kw>' . | grep -v node_modules | wc -l
```

---

## PART A — Existing causal-method inventory

### A.1 The two causal universes

There are **two structurally separate causal stacks**, and neither is fully wired:

| Universe | Language | Representation | Edge carries effect size? | Production-reachable? |
|---|---|---|---|---|
| **L3 reasoning chains** | Python (`intelligence/`) | `CausalLink.cause/mechanism/outcome` — prose strings | **No** | **No** — no web framework, no TS bridge (see A.4) |
| **`lit.*` causal edges** | TypeScript | `lit.causal_edge` rows, `effect_estimate float` | **Yes** | **[BRANCH-ONLY]**, gated off, unmigrated |

### A.2 Inventory table

Status key: **WIRED** = has a non-test importer reachable from a route/cron · **ORPHAN** = no importer outside its own barrel export · **TEST-ONLY** = only its `.test.ts` references it · **[B]** = branch-only.

| # | Method | file:line | Exported symbols | Status | Wiring evidence (grep) |
|---|---|---|---|---|---|
| 1 | Do-calculus (L3 **and** lit.*) | `literature/literature-retrieval.ts:469` | `runInterventionTest` | **[B] ORPHAN** | G1 on `literature-retrieval` → only `apps/web/lib/literature/literature-event-bridge.ts` & `-residual-bridge.ts` (different symbols). G2 `runInterventionTest` → 4 hits, all `index.ts` barrel / own module |
| 2 | Causal promotion sweep | `literature/literature-causal.ts:126` | `runCausalPromotionSweep`, `retireFailedEdges`, `listPromotedEdges`, `PROMOTION_CRITERIA` | **[B] ORPHAN** | G2 `runCausalPromotionSweep` → `index.ts:295` only. **Zero call sites.** Same for `retireFailedEdges` (`index.ts:297`) |
| 3 | Premise→edge promotion | `literature/literature-retrieval.ts:388` | `promotePremisesToCausalEdges` | **[B] ORPHAN** | G2 → `index.ts:269`, `literature-causal.ts:28,138`. No route/cron |
| 4 | **Real** do-calculus estimands (back-door / front-door / adjustment) | `2602-23233v1-the-counterfactual-combine-a-causal.ts:22,37,50,69` | `identifyStrategy`, `adjustmentEstimand`, `frontdoorEstimand`, `requireIdentified` | **ORPHAN / TEST-ONLY** | G1 → **0**. G2 `adjustmentEstimand` → the `.test.ts` only. Header line 9: *"Not wired into any live model path"* |
| 5 | NOTEARS DAG learning | `causal/1803-01422v2-notears-dag.ts:84` | `notearsFit`, `acyclicity`, `thresholdEdges`, `pruneToGraph` | **ORPHAN**, `ENABLED=false:16` | G1 → 0. G2 `notearsFit` → 0 |
| 6 | PCMCI+ skeleton (contemporaneous **and lagged**) | `causal/2003-03685v2-pcmci-team-panel.ts:114` | `pcmciSkeletonS1`, `partialCorr`, `pcorPvalue` | **ORPHAN**, `ENABLED=false:23` | G1 → 0. G2 `pcmciSkeletonS1` → 0 |
| 7 | Regime-dependent causal discovery | `causal/2007-00267v1-regime-dependent-causal-discovery.ts:114,176,199` | `pcmciSkeletonS1`, `cusumDetect`, `bocpdLite` | **ORPHAN**, `ENABLED=false:23` | G1 → 0 |
| 8 | RCD latent-confounder quarantine | `causal/2001-04197v4-rcd-quarantine-layer.ts:26,109,118` | `residualizeOnAncestors`, `markBidirected`, `quarantinePairs` | **ORPHAN**, `ENABLED=false:23` | G1 → 0. G2 `residualizeOnAncestors` → 0 |
| 9 | ML4C supervised orientation | `causal/2110-00637v4-ml4c-supervised-orienter.ts:214` | `verticalFilter`, `paretoFrontier`, `hypothesisReject` | **ORPHAN**, `ENABLED=false:23` | G1 → 0 |
| 10 | DAG ordering / directionality audit | `causal/dag-ordering.ts:25,55,77,97,119` | `kendallTau`, `aggregateOrderings`, `constrainEdges`, `directionalityAudit` | **ORPHAN** (no `ENABLED` flag) | G1 → 0. G2 `aggregateOrderings` → 0 |
| 11 | Curl-free DAG (Hodge potentials) | `causal/dag-nocurl.ts:58,103,124,142` | `hodgePotentials`, `nocurlProject`, `isAcyclic`, `shd` | **ORPHAN** | G1 → 0. G2 `hodgePotentials` → 0 |
| 12 | IPW / doubly-robust ATT | `causal/ipw-template.ts:35,76` | `ipwAtt`, `doublyRobustAtt`, `smd`, `trimPs` | **ORPHAN** | G1 → 0. G2 `doublyRobustAtt` → 0 |
| 13 | TMLE quantile treatment effect | `causal/tmle-quantile.ts:43` | `quantileTreatmentEffect`, `weightedQuantile`, `kdeAt` | **ORPHAN** | G1 → 0. G2 `quantileTreatmentEffect` → 0 |
| 14 | Dual-likelihood total-effect CI | `causal/dual-likelihood-ci.ts:63` | `dualLikelihoodTotalEffectCI` | **ORPHAN** | G1 → 0. G2 → 0 |
| 15 | E-value (causal / confounding) | `causal/e-value.ts:21,31,42` | `eValue`, `eValueForCi`, `confoundingReport` | **ORPHAN** | G1 → 0; `confoundingReport` → 0 callers |
| 16 | E-value (conformal selective prediction) | `decision/2603-24704-evalue-screening.ts:35` | `eValue(selectionScore, calibrationMean, scale)` | **ORPHAN**, `ENABLED=false:10` | G1 → 0. Distinct signature from #15; not a duplicate |
| 17 | Multi-dataset driver selection + **lagged correlation** | `causal/multidata-drivers.ts:34,60,77` | `laggedCorrelationSelect`, `stratifiedUnion`, `driverStability` | **ORPHAN** | G1 → 0 |
| 18 | Quantitative probes / adversarial flip | `causal/quantitative-probes.ts:59,94,146` | `checkProbe`, `runProbeSuite`, `adversarialFlip` | **ORPHAN** | G1 → 0. G2 `runProbeSuite` → 0 |
| 19 | **Double-ML (DML) QB-out ATT** — the most complete estimator in the repo | `research/dml-qb-out.ts:287,296,344,352` | `estimateQbOutAtt`, `placeboAtt`, `sensitivityInterval`, `diagnoseQbOut` | **ORPHAN** | Bridge `ingestion-pipeline/src/research-causal-bridge.ts` imports it (`:40-46`), but G1 on `research-causal-bridge` → **0 importers**. Whole chain is dead |
| 20 | DML panel design | `research/dml-panel.ts` (`timeIndex`, `generateDmlPanel`, `DEFAULT_PANEL`) | — | **ORPHAN** | only `research-causal-bridge.ts` (itself orphan) |
| 21 | Mediation (stochastic interventions / medshift) | `data-ingestion/src/rf-playcall-tendencies.ts:2` | `forestRunProb`, `variableImportance`, `LANE="causal_injury"` | **ORPHAN** (no `ENABLED` const) | G1 → 0 |
| 22 | Doubly-robust HTE forest | `data-ingestion/src/forest-hte-diagnostics.ts:44,51` | `HteUnit`, `isHteUnit`, `LANE="causal_injury"` | **ORPHAN** | G1 → 0 |
| 23 | Causal-injury DID/IPW family (8 modules) | `data-ingestion/src/{1609-07480v1,1809-08016v3,1907-05326,1907-11769v4,2007-05507,2110-14632v1,2207-00585v1,2401-02919}-causal-injury.ts` | lane modules | **ORPHAN**, all `ENABLED=false as const` | G1 → 0 for all 8 |
| 24 | Causal DAG / matching (injuries) | `injuries/2009-06750-icing-causal-dag.ts`, `2011-11691-fourth-down-att-matching.ts`, `1705-03918-two-version-causal.ts`, `1710-08749v1-ppta-causal.ts`, `2205-07193v2-division-pair-hfa-causal.ts` | — | **ORPHAN**, all `ENABLED=false` | G1 → 0 |
| 25 | DID + **Synthetic Control (SCM)** | `2411-15075v1-the-effects-of-major-league.ts:7,11` | — | **ORPHAN** | Header line 9: *"Not wired into any live model path"* |
| 26 | Causal feature selection | `2409-13888v2-causal-feature-selection-method-for.ts` | — | **ORPHAN** | G1 → 0 |
| 27 | Counterfactual combine / player-out | `2602-23233v1-the-counterfactual-combine-a-causal.ts` | (see #4) | **ORPHAN** | — |
| 28 | Counterfactual pitch optimization | `2606-17345v1-counterfactual-optimization-of-baseball-pitch.ts` | — | **ORPHAN** | 20 `2606-17345` string hits are all in `docs/ops/*.json`, `reconciliation/*.json`, or its own test |
| 29 | Causal discovery via blocking | `2603-22620v2-chainreaction-causal-discovery-via-blocking.ts` | — | **ORPHAN** | — |
| 30 | Bootstrap bagging for causal discovery | `apps/web/lib/calibration/bootstrap-causal-discovery.ts:43,70,133,150` | `weightedEdgeVote`, `breakCycles`, `movingBlockIndices`, `adjacencyF1` | **ORPHAN** | G1 → 0. Header `:5-7`: *"the conditional-independence engine (tigramite PCMCI+) stays outside the repo. Not wired into any model path"* |
| 31 | Bandit / A-B model selector | `experimental/2101-10385v1-bandit-model-selector.ts` | — | **ORPHAN**, `ENABLED=false:23` | G1 → 0 |
| 32 | Anytime-valid e-process | `anytime-ledger.ts:86,241` (`eValue` field) | `anytimeValidLedger`, `initAnytimeFold`, `foldAnytimePick` | **ORPHAN (self-documented)** | `index.ts:610` exports it. `calibration-sequence.ts:5` states: *"unwired (same posture as anytime-ledger.ts)"* |
| 33 | Falsifier machinery (breaking conditions) | `intelligence/reasoning/schemas.py:47,83`; `adversary.py:190` | `BreakingCondition`, `evaluate_condition`, `_check_breaking_conditions` | **ORPHAN** (Python lib, not deployed) | see A.4 |
| 34 | L3 causal chain contract | `intelligence/reasoning/schemas.py:112,134` | `CausalLink`, `CausalChain` | **ORPHAN** | see A.4 |
| 35 | Causal edge + effect estimate store | `reconciliation/schema_literature.sql:200` (`lit.causal_edge`) | — | **[B] UNMIGRATED** | no `packages/db/prisma/migrations` entry (grep A.3) |
| 36 | d-separation | — | — | **ABSENT** | see A.5 |
| 37 | Granger causality | — | — | **ABSENT** | see A.5 |
| 38 | Residual **mining** | — | — | **ABSENT** | see B.4 |

### A.3 `ENABLED = false` census

- **Repo-wide:** `grep -rn "export const ENABLED = false" --include=*.ts . | grep -v node_modules | wc -l` → **491**.
- **`packages/prediction-engine/src/causal/`:** **5 of 13** non-test modules are gated —
  `1803-01422v2-notears-dag.ts:16`, `2001-04197v4-rcd-quarantine-layer.ts:23`, `2003-03685v2-pcmci-team-panel.ts:23`, `2007-00267v1-regime-dependent-causal-discovery.ts:23`, `2110-00637v4-ml4c-supervised-orienter.ts:23`.
- The other 8 (`dag-nocurl`, `dag-ordering`, `dual-likelihood-ci`, `e-value`, `ipw-template`, `multidata-drivers`, `quantitative-probes`, `tmle-quantile`) carry **no gate at all** — they are pure functions with zero callers, which is a different (and less honest) failure mode than gated: a gate at least records that someone thought about adoption.

**Decisive wiring fact:** the causal family is not even reachable from the package barrel. `packages/prediction-engine/src/index.ts` is a 4,629-line explicit-named-export barrel with only 2 `export *` lines; `grep -n "2602-23233\|2603-22620\|2606-17345\|2409-03940\|2409-13888\|bootstrap-causal" index.ts` → **no matches**. So all 13 `causal/*` modules and all 5 counterfactual/discovery research modules are unreachable from `@sports/prediction-engine`.

### A.4 The Python L3 layer is not deployed

- `intelligence/` has **58** `test_*.py` files and **no** `FastAPI`/`Flask`/`uvicorn` entrypoint: `grep -rln "FastAPI\|uvicorn\|Flask(" intelligence/` → **empty**.
- No TypeScript reaches it: `grep -rn "intelligence" --include=*.ts packages/` → only unrelated string matches (`source-registry.ts:1402,1454` "intelligence pack"). No subprocess spawn, no HTTP client.
- Not in `docker/` or `vercel.json` (`grep -rn "intelligence" docker/ vercel.json` → no service entry).

So `build_causal_chains` (`intelligence/integration/pipeline.py:85`) and `adversary_review` (`adversary.py:357`) are **library code with unit tests, not a live path**. Any hook proposed on them is architecturally correct but needs a deployment decision first.

### A.5 Proven false positives (checked, not assumed)

| Keyword | Hits | Verdict |
|---|---|---|
| `d-separation` | `apps/web/lib/reconstruction/separation-surface.ts:2` | **False positive** — NGS receiver *separation* (football metric), not Pearl d-separation. No causal d-separation anywhere |
| `SCM` | `2411-15075v1-...ts:7,11` | **Synthetic Control Method**, not Structural Causal Model. A legitimate quasi-experimental method, but not the SCM/d-separation family |
| `Granger` | `ensemble/2209-01697-regime-factor-glasso.ts:7` | **Bates–Granger forecast-combination weights**, not Granger causality. `ENABLED=false:23`, orphan |
| `mediation` (115 raw hits) | `apps/web/lib/settlement/root-cause-analysis.ts` etc. | Mostly **"remediation"**. The only real mediation module is #21 |
| `Pearl` | `ratings/dynamic-bradley-terry.test.ts` | Test-name only |

---

## PART B — The four missing methods, with hook points

### B.1 DO-CALCULUS INTERVENTION on the L3 causal chains

**The type.** `CausalChain` is `intelligence/reasoning/schemas.py:134`:

```python
@dataclass
class CausalChain:
    id: str
    links: list[CausalLink] = field(default_factory=list)
```

**What an edge looks like today** — `CausalLink` at `schemas.py:112`:

| Field | Type | do-semantics? |
|---|---|---|
| `id` | `str` | node identity only |
| `cause` | `str` — *prose* ("PIT pressure will overwhelm CLE's OL") | ✗ not a signal key |
| `mechanism` | `str` — prose | ✗ |
| `outcome` | `str` — prose | ✗ |
| `verification` | `Verification` enum | ✗ |
| `breaking_conditions` | `list[BreakingCondition]` | ✗ thresholds, not interventions |
| `load_bearing` | `bool` | ✗ |
| `tags` | `list[str]` (feature/mechanism tags, e.g. `"xfp_fpoe_rank"`) | partial — the only machine-joinable field |

**Three hard blockers to a `do(X=x)` query:**

1. **No effect size.** There is no coefficient, no SE, no CI on any `CausalLink`. A do-query can return *"does the thesis survive?"* but never *"by how much does P(outcome) move?"*
2. **No graph.** `cause`/`outcome` are free prose, so there is **no node set and no adjacency** — you cannot compute parents, a back-door set, or a Markov blanket. `CausalChain.links` is an ordered *list*, not a DAG.
3. **No do-operator.** `grep -rliE "do\(x\)" --include=*.ts --include=*.py .` → **0** code hits repo-wide (3 raw hits are markdown prose).

**Exact attach points:**

**(a) Primary — `intelligence/reasoning/adversary.py:190` `_check_breaking_conditions(chains, observed)`, called from `adversary_review` at `:366`.**

This is the single best hook in the repo, and it is closer to implementable than the rest of the layer, because `evaluate_condition(cond, observed)` (`schemas.py:83`) is **pure and takes the observation dict as an argument**. A `do()` evaluator is therefore literally:

```
do_observed = {**trace.observed_values, do_metric: do_value}
_check_breaking_conditions(trace.chains, do_observed)
```

That yields an under-intervention verdict (does the thesis break when TTT is forced to 2.3s?) at ~10 lines. **But** it is a *binary falsifier re-evaluation*, not a causal effect: it assumes the forced value propagates to nothing else (no downstream mechanism recompute), which is exactly the SCM assumption the repo cannot currently represent. Ship it as `do()` only with that limitation in the docstring, or it becomes a fabrication.

**(b) Secondary — the misnamed live TS test: `literature/literature-retrieval.ts:469` `runInterventionTest(db, edgeKey, doValue)`.** This is the *only* function in the repo that claims do-calculus and touches a database. It does not implement it. Lines `519-529`:

```ts
const treated = all.filter((r) => r.activation_score >= doValue);
const control = all.filter((r) => r.activation_score < doValue);
const estimate = meanT - meanC;          // truncated mean difference
```

That is a **conditional contrast on the same observed variable** (`activation_score`), with **no adjustment set, no back-door criterion, no graph, and no intervention**. `doValue` defaults to `0.001` (`:153`), i.e. the split is essentially "any activation vs none". Calling this "do-calculus" (header `:9-10`, `literature-causal.ts:119`) is an **overclaim that should be renamed** to `runActivationContrast` before it is ever surfaced to a user. It also self-contradicts: the docstring at `:459-460` says *"hold the cause at `doValue`"*, but the cause is never held — rows are filtered, not set.

**Data required to be non-fabricated:**
- L3: a signal-keyed node id on `CausalLink` (`cause_signal`/`effect_signal`, not prose), plus at least an estimated effect with CI per link. `lit.causal_edge` already has `cause_signal`, `effect_signal`, `effect_estimate`, `effect_unit` (`literature-causal.ts:37-40`) — **the lit.* schema is the model to copy back onto `CausalLink`.**
- TS: an adjustment set per edge and enough rows per treatment band (`minN=8` today at `:486`).

---

### B.2 COUNTERFACTUAL evaluation

**What is observed / recorded today:**

| Artefact | Location | Structured? | Persisted? |
|---|---|---|---|
| `ReasoningTrace.observed_values: dict[str, float]` | `schemas.py:298` | ✅ metric→float | **No** |
| `ReasoningTrace.track_evidence` / `stub_tracks` | `schemas.py:301,304` | ✅ | **No** |
| `CausalChain[]` / `CausalLink[]` | `schemas.py:134,112` | ✅ | **No** |
| `Pick.factorBreakdown Json?` | `schema.prisma:540` (model `Pick` @ `:516`) | ✅ per pick | **Yes** |
| free-text `reasoningTrace` | computed in `apps/web/app/api/picks/route.ts:578` | ❌ prose | **No column** — `grep -n "reasoningTrace" packages/db/prisma/schema.prisma` → no match |

**There is no `ReasoningTrace` table.** `grep -n "^model .*\(Reason\|Trace\|Thesis\|Claim\)" schema.prisma` → **no matches**. So the L3 structure (chains, links, breaking conditions) is **discarded at process exit**. Retrospective counterfactual evaluation of a past pick is therefore impossible today: you cannot recover which links were load-bearing, which conditions were near-missed, or what the observed metric vector was. Only `Pick.factorBreakdown` survives, and `build-calibration-history.ts:26-27` confirms it holds only `marketFairProb` / `independentEdge.trueProb`.

**Existing ablation / perturbation / LOO harnesses** (found, all orphan or audit-only):

| Harness | Location | What it does | Status |
|---|---|---|---|
| `DifferenceQuery` + `perturbationSensitivity` + `overlapPrune` | `2512-05271v1-robust-forecast-aggregation-via-additional.ts:22,30,39` | Forecast under `"qb-out"` / `"line-move-2pt"` perturbations vs base — **this is a counterfactual query shape** | ORPHAN (G1→0) |
| LOO Δⱼ audit | `intelligence/trust-signals/scoring.py:225` — `Δⱼ = μ_post − μ_post^(−j)` | Leave-one-out on trust items, explicitly *"an audit trail, not a decomposition"* (`:22`) | Python lib, not deployed |
| `placeboAtt` | `research/dml-qb-out.ts:296` | Permutation placebo for the ATT | ORPHAN (via dead bridge) |
| `sensitivityInterval(est, gamma)` | `research/dml-qb-out.ts:344` | Rosenbaum-style sensitivity to unmeasured confounding | ORPHAN |

So the *statistical* pieces of a counterfactual evaluation (placebo, sensitivity, leave-one-out) already exist and are high quality — but they are unreachable, and there is no stored structure to evaluate against.

**What a counterfactual distribution would need:** (i) persist the trace — a `reasoning_traces` table with `observed_values` JSONB, `chains` JSONB, `model_version`, `pick_id`; (ii) a link-level effect estimate to propagate a `do()` change (see B.1); (iii) a noise/uncertainty model per link, because "the counterfactual distribution" requires the structural residuals, not just the point estimate. None of the three exist today.

---

### B.3 TEMPORAL CAUSAL DISCOVERY over sequential signals

**The code exists and is decent — and is switched off.** `causal/2003-03685v2-pcmci-team-panel.ts:114`:

```ts
export function pcmciSkeletonS1(X: number[][], maxLag: number, alpha: number)
  : { from: number; to: number; lag: number; pcor: number }[]
```

It genuinely iterates `for (let lag = 1; lag <= maxLag; lag++)` (`:124`) with order-0 then order-1 conditioning (`:111-112`, `:133-140`) — a real lagged PC skeleton. `ENABLED=false:23`, G1→0. Similarly `dag-ordering.ts` and `multidata-drivers.ts:34 laggedCorrelationSelect` are orphan. The bagging wrapper `bootstrap-causal-discovery.ts` explicitly states the CI engine *"stays outside the repo"* (`:7`).

**Is there a timestamped store with enough resolution?** Three different answers, and the distinction matters:

| Store | Model:line | Time resolution | Sequence of same key over time? |
|---|---|---|---|
| `signals` | `schema.prisma:3191` | `capturedAt` (`:3208`) | **NO — overwritten.** `@@unique([entityType, entityId, key, season, week])` (`:3222`). The writer upserts on exactly that tuple (`signal-ledger-writer.ts:410-421`), so `capturedAt` and `value` are replaced in place |
| `game_signals` | `schema.prisma:810` | `fetchedAt` (`:816`), `expiresAt` (`:817`) | **NO — one row per key per game.** `@@unique([gameId, sourceName, signalKey])` (`:828`) |
| `odds_line_snapshots` | `schema.prisma:467` | `capturedAt` (`:470`), `phase` OPEN/INTERIM/CLOSE (`:471`) | **YES — append-only, one row per capture.** Indexed `[gameId, market, capturedAt]` (`:482`) |

**Line movement is fine. Everything else is not.** For `signals`, the weekly `(season, week)` dimension does give you an 18-point per-season series — enough for coarse weekly lag discovery, **not** enough for "presser language shift → line move within 48h", because every intra-week capture overwrites the last.

Note the writer's own comment at `signal-ledger-writer.ts:427-436` documents a related defect: `weight` was omitted from the update clause, so *"A key's weight could not change, ever"* — confirming these rows are mutated in place, not appended.

**The line-movement archive is inert by default.** `packages/ingestion-pipeline/src/line-archive.ts:179-180`:

```ts
export function isLineArchiveEnabled(env = process.env): boolean {
  return env["LINE_ARCHIVE_ENABLED"] === "true";
}
```

Default OFF. Schema comment `:454-459` says it is *"Purely additive and INERT by default"*. CLOSE tagging **is** now wired (`apps/web/lib/settlement/close-stamp.ts:31` → `markClosingSnapshotsIfEnabled`), which supersedes the stale schema note at `:464-466`.

**Concrete hook point for temporal discovery:** a new module consuming
`SELECT gameId, market, side, capturedAt, price, line FROM odds_line_snapshots ORDER BY gameId, market, side, capturedAt`
→ reshape to a `T × V` matrix per (game, market) → feed to `pcmciSkeletonS1(X, maxLag, alpha)` (`causal/2003-03685v2-pcmci-team-panel.ts:114`). **Preconditions, all currently unmet:** `LINE_ARCHIVE_ENABLED=true` must be set for long enough to accumulate history; the PCMCI module's `ENABLED=false` gate must be lifted through its own acceptance gate; and for the *formation-change / presser-language / injury-report* channels there is **no time series at all** until `signals` gains an append-only history table or a `signal_history` sibling — the current unique key forbids it.

---

### B.4 RESIDUAL MINING

**What exists TODAY (correcting the brief):** `lit.residual` **is on this branch**, implemented in TypeScript — not only on a dev branch.

- Table DDL: `reconciliation/schema_literature.sql:168` — `CREATE TABLE IF NOT EXISTS lit.residual (...)` with indexes `residual_premise_idx` (`:181`) and `residual_game_idx` (`:182`). Columns per the INSERT at `literature-retrieval.ts:306-314`: `activation_id, premise_id, game_id, predicted, actual, residual, outcome_correct, graded_at`.
- Writer: `applyResidualFeedback` at `literature-retrieval.ts:289`. Residual is `actual - predicted` (`:304`).
- Consumer of the residual: **aggregate only** — `:346-353` computes `n, mean_residual, mse, correct` and `:365-374` writes `lit.premise_score.activation_score`. Scoring rule documented at `:320-345` (Brier skill `0.25 - mse`, × support ramp).
- Manual mining script: `scripts/literature/run-loop.cjs:389,418` (`GROUP BY r.premise_id`).

**Critically: `lit.residual` is [BRANCH-ONLY] and unmigrated.**
- `git ls-tree -r --name-only 4fa5330f4 | grep -i literature` → only `reasoning/literature-registries.ts`. The table does not exist on origin/main.
- `grep -rln "lit\.premise\|lit\.residual\|CREATE SCHEMA IF NOT EXISTS lit" --include=*.sql .` → **only** `reconciliation/schema_literature.sql`. There is **no** `packages/db/prisma/migrations` entry, and `grep -rln "lit\." packages/db/prisma/migrations` → none. So production Postgres will reject every `lit.*` query until that SQL is applied by hand.

**Is there any other residual store?** No.
- `grep -n -i "residual" packages/db/prisma/schema.prisma` → **no matches**. No `residual` column on `Pick` or anywhere else.
- `intelligence/` residuals are *diagnostic outputs*, not stores: `physics/cylindrical_solver.py:118` (`compute_circulation_residual`), `audit/totals_efficiency_model.py:131` ("residual vs the line"), `props/prop_discrepancy_engine.py:577` (*"DIAGNOSTIC ONLY — residual-versus-close has NOT cleared"*).

**Residual MINING (as opposed to aggregation) is ABSENT.** Every existing consumer collapses residuals into one scalar per premise. Nothing asks *"which residuals are large and systematic, and what missing factor explains them?"* — no clustering, no residual-vs-covariate regression, no residual DAG. `grep -rni "residual min"` → 0 hits.

**What a mining job would consume — and what is already sufficient.** The join path is mostly there:

`lit.residual` → `lit.activation` (`premise_id, game_id, rank, similarity, activation_score, contributed_prob` — `schema_literature.sql:145-158`) → `lit.retrieval_event` (**`signal_key`, `signal_family`, `signal_value`, `game_id`** — `schema_literature.sql:124-138`) → `Pick.factorBreakdown` (`schema.prisma:540`) → `game_signals.signalKey/signalValue` (`schema.prisma:810-822`).

So a mining job **can already** answer *"which triggering signal family leaves systematic residual?"* — `retrieval_event.signal_family` is a real grouping dimension with the triggering value attached (`:130-132`). That is enough for a first-pass residual miner and it is the honest ceiling today.

What it **cannot** answer is *"what missing factor would have explained this residual?"*, because only **one** signal per retrieval event is recorded (the trigger). The full contemporaneous covariate vector — every other active `game_signals` row at kickoff — is not snapshotted, and `game_signals` is overwritten in place (`@@unique([gameId, sourceName, signalKey])`, `schema.prisma:828`), so it cannot be reconstructed retrospectively. **That** is the one schema change gating true residual mining: an append-only prediction-time covariate snapshot. Without it, mining stops at "this premise was wrong when triggered by X" and never reaches "Y explains it".

---

## PART C — The settlement → belief loop that exists today

**Answer: yes, exactly one loop exists — and it updates premise scores only. It does not touch signal weights or causal edge strength.** It is branch-only and gated off.

### C.1 The loop (the only one)

```
api/cron/settle-picks/route.ts:53
  → drainPendingSnapshotOutcomes()            free-path-snapshot.ts:122
    → recordFreePathSnapshot()                free-path-snapshot.ts:45  (called :184)
      → gradePremisesForSettledPick()         literature-residual-bridge.ts:120  (called :78)
        → applyResidualFeedback()             literature-retrieval.ts:289  (called bridge :212)
          → INSERT lit.residual + UPDATE lit.premise_score.activation_score
```

**Quoted gate** — `apps/web/lib/settlement/free-path-snapshot.ts:76-78`:

```ts
if (process.env.GSE_LITERATURE_BRIDGE === "1") {
  try {
    const residual = await gradePremisesForSettledPick(db as never, {...}, result);
```

Non-blocking by design (`:95-100` catch → `console.warn`). The retrieval half of the same loop is `api/cron/signal-ledger-write/route.ts:302` → `bridgeSignalsToLiterature` → `retrieveForEvent` (`literature-retrieval.ts:125`), same env gate.

`GSE_LITERATURE_BRIDGE` has exactly **2 code read sites** — `signal-ledger-write/route.ts:302` and `free-path-snapshot.ts:76` — plus 3 comments in the same two files (`route.ts:300,366`, `free-path-snapshot.ts:74`). **Nothing sets it:** `grep -rn "GSE_LITERATURE_BRIDGE" .env.example .env.production.example vercel.json` → **no matches**.

### C.2 The three specific questions

| Question | Verdict | Evidence |
|---|---|---|
| Does anything update a **signal weight** from a settled result? | **NO** | `Signal.weight` (`schema.prisma:3196`) is written from a **committed static table**: `signal-ledger-writer.ts:71` imports `signalScaleFor` from `packages/prediction-engine/src/signal-scale-table.ts`, applied at `:436`. No cron updates it: `grep -rn "signal\.update\|signal\.updateMany\|refit" apps/web/app/api/cron apps/web/lib/ops` → **no matches**. `signal-scale-fit.ts` is an offline fitter ("committed table … diffable between refits", `:65`) |
| Does anything update a **premise score** from a settled result? | **YES — [BRANCH-ONLY], gated** | `applyResidualFeedback` recomputes `activation_score` from all residuals (`literature-retrieval.ts:346-374`); reached from the settle cron per C.1 |
| Does anything update a **causal edge strength** from a settled result? | **NO** | `runCausalPromotionSweep` (`literature-causal.ts:126`) and `retireFailedEdges` (`:192`) have **zero call sites** — only `index.ts:295,297` re-export them. No cron route references promotion: `grep -rn "CausalPromotion\|promotePremises\|promotionSweep" apps/ packages/ workers/` returns only `index.ts` + the defining modules. The **only** executor is the manual operator script `scripts/literature/run-loop.cjs:397-466` |

### C.3 What this means

The chain is severed at the last hop. Settlement → residual → `premise_score` works (when flagged on). But **no scheduled job ever promotes a scored premise into a `lit.causal_edge`, and none ever runs an intervention test or retires a failed edge.** The "self-correcting literature loop" advertised at `literature-retrieval.ts:5-16` is therefore a two-thirds loop: it learns which premises are *accurate*, and never learns which are *causal*. `runInterventionTest` — the one function named do-calculus — is dead code in production.

Also absent: `packages/prediction-engine/src/settlement.ts` (6,332 bytes) and `packages/ingestion-pipeline/src/post-settlement-work.ts` contain **no** belief-update logic at all. `post-settlement-work.ts` exports only queue mechanics (`enqueuePostSettlementWork:125`, `markPostSettlementWorkDone:173`, `markPostSettlementWorkFailed:255`, retry/exhaust predicates `:81,:96`). Settlement is a **work-queue**, and the learning is a callback bolted on in `free-path-snapshot.ts:76`.

---

## PART D — The Kaggle dataset surface

**Verdict: the "429 Kaggle datasets structured as premises" claim does not hold. 429 is a scraped metadata count in a docs JSON. There is exactly ONE Kaggle-derived code module, and it is not a per-dataset evaluator.**

### D.1 The 429, measured

```
docs/data-sources/research/2026-10-17/KAGGLE_SPORTS_AND_BETTING_REGISTRY.json
python: type=list, len=429
record keys: ['ref','title','url','size','lastUpdated','downloadCount','voteCount','usabilityRating','query']
```

Sample record: `{"ref":"kendallgillies/nflstatistics","title":"NFL Statistics","url":"https://www.kaggle.com/datasets/kendallgillies/nflstatistics","size":12360257,"lastUpdated":"2017-06-09T...","downloadCount":22591,"voteCount":269,"usabilityRating":0.7058824,"query":"nfl"}`

That is a **download-candidate list** — popularity and size metadata. It contains **no** `claim_type`, `numeric_claim`, `influence_direction`, `evidence_quote`, or evaluator. It is not a premise registry by any definition used elsewhere in this repo (`lit.premise` at `schema_literature.sql:30`; `MIND_CORPUS_3000.jsonl` records carry all of those fields).

It is also **unreferenced by any code**: the only hit for `KAGGLE_SPORTS_AND_BETTING_REGISTRY` is its own producer, `scripts/ops/scrape_kaggle_datasets_registry.py:58`.

### D.2 Distinct Kaggle identifiers actually present

| Measure | Command | Count |
|---|---|---|
| Distinct `kaggle.com/datasets/<owner>/<slug>` repo-wide | `grep -rhoE "kaggle\.com/datasets/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+" . \| sort -u \| wc -l` | **451** |
| …of which in the 429-registry | same grep on that file | **429** |
| …in all other files combined | — | **22** |
| Files in `packages/` + `intelligence/` mentioning "kaggle" | `grep -rli kaggle packages/ intelligence/ \| wc -l` | **17** |
| Kaggle ids inside `data/gse-dataset/bridge-premises.jsonl` | `grep -c -i kaggle` on that file | **0** |

The 451 vs 429 gap is 22 stray notebook/competition URLs in `docs/` and `handoff/` — e.g. `kaggle.com/c/nfl-big-data-bowl-2021/data`, `kaggle.com/code/...`.

### D.3 Per-dataset evaluators? No — one module

`grep -rn "MOD-KAGGLE" --include=*.ts --include=*.py .` yields exactly one implementation:

- `packages/prediction-engine/src/reasoning/literature-registries.ts:222` — `extractVoronoiPocketControl(playerCoords: PlayerCoord2D[])`, documented at `:8` and `:219` as **`MOD-KAGGLE-001`** (NFL Big Data Bowl tracking → Voronoi pocket control). Tested at `reasoning/__tests__/literature-registries.test.ts:79`.

So: **1 Kaggle-derived evaluator, 0 per-dataset evaluators, 0 dataset→premise bindings.** A per-dataset evaluator registry would need `429` entries mapping a `ref` to a claim + numeric value + evidence quote; the closest real thing in the repo is `MIND_CORPUS_3000.jsonl` (**5,148** premise-shaped records with `claim_type`, `numeric_claim`, `evidence_quote`, `mechanism_quote`, `verification_tier`), whose sources are arXiv, not Kaggle.

**Corroboration inside the repo:** `reconciliation/_integrate_recon.py:48` already flags this exact overclaim — *"FINAL_DELIVERY_AUTONOS_MIND.md claims the registered mathematical models (EQ-BETTING-003/004, MOD-BETTING-002, MOD-KAGGLE-001) are WIRED & TESTED"* — listing it as a reconciliation defect rather than accepting it.

**`bridge-premises.jsonl` is misnamed.** `data/gse-dataset/bridge-premises.jsonl` has **285** lines and its records are `{game_id, signal_id, outcome, probability, sample_count, method, home_sign}` — model **predictions**, zero Kaggle references, no premise fields. Anyone citing "the premise corpus" against this filename is citing predictions.

---

## Appendix — Summary of the four gaps

| Missing method | Blocking artefact | Cheapest real attach point |
|---|---|---|
| **do-calculus** | `CausalLink` has prose `cause`/`outcome` and **no effect size** (`schemas.py:112-130`); `grep -E "do\(x\)"` → 0 | `adversary.py:190` (perturbed `observed_values`) for a falsifier-only `do()`; rename `runInterventionTest` (`literature-retrieval.ts:469`) — it is a mean-difference, not do-calculus |
| **counterfactual** | Trace never persisted — no `ReasoningTrace` table, only `Pick.factorBreakdown` (`schema.prisma:540`) | persist trace first; then `2512-05271v1-...ts:22` `DifferenceQuery` is the right query shape, already written and orphaned |
| **temporal discovery** | `signals`/`game_signals` unique keys **overwrite** `capturedAt` (`schema.prisma:3222`, `:828`); only `odds_line_snapshots` (`:467`) is append-only and it is behind `LINE_ARCHIVE_ENABLED` (`line-archive.ts:180`) | `odds_line_snapshots` → `pcmciSkeletonS1` (`causal/2003-03685v2-pcmci-team-panel.ts:114`) |
| **residual mining** | `lit.residual` exists but is branch-only + unmigrated (`schema_literature.sql:168`); all consumers collapse to one scalar per premise; only the *triggering* signal is captured (`schema_literature.sql:129-132`), and `game_signals` is overwritten in place (`schema.prisma:828`) so the full prediction-time covariate vector is unrecoverable | `applyResidualFeedback` (`literature-retrieval.ts:289`) is the write seam; mining can start immediately on `retrieval_event.signal_family`, but "what explains it" needs an append-only covariate snapshot |
