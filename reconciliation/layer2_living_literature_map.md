# Layer 2 Living Literature Map

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Machine-readable:** `reconciliation/layer2_living_literature_map.json`
**Companions:** `literature_integration_map.md` (the claim corrections and
the corpus scale), `event_driven_retrieval_spec.md` (the retrieval law),
`causal_inference_methods.md` (where the output lands).

---

## 1. The three Layer-2 surfaces, measured

| Surface | File | Size | Evaluable? | Reachable? |
|---|---|---|---|---|
| **Arxiv bridge** | `packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts` | 358 lines | **13 premises** with `evaluateContext` | **NO** — zero importers outside its own test |
| **Corpus evaluator** | `packages/prediction-engine/src/reasoning/corpus-evaluator.ts` | 25 `LiteratureDomain`s | reads raw JSON corpora at runtime | **PARTIAL** — on the publish path, but returns 0 items on Vercel |
| **Mind corpus** | `packages/prediction-engine/data/MIND_CORPUS_3000.jsonl` + `mind-reasoning.ts` | **5,149 records** | per-record, via `loadMindCorpus` | **PARTIAL** — same path; throws if the path does not resolve |

**Plus the fourth, new surface:** the pgvector index built in the prior
phase — 5,509 vectorized premises with top-k retrieval, activation records,
residuals, and causal-edge promotion. It lives on the audit branch and on
Neon branch `dev-lit-vectors-2026-10`, schema `lit`.

---

## 2. The pillars

### 2.1 Three taxonomies that do not map to each other

**Bridge** — 14 pillars
(`packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts:14-28`):

```
MARKET_GRAVITY_AND_BIAS · NETWORK_AND_STYLE_MATCHUPS · FATIGUE_INJURY_WORKLOAD
VISION_AND_FIELD_CONTROL · TACTICS_AND_GAME_THEORY · DYNAMIC_MOMENTUM_TRANSITION
ENVIRONMENT_AND_CONTEXT · ATMOSPHERE_AND_REFEREE_BIAS · CIRCADIAN_TRAVEL_DYSRHYTHMIA
FLUID_DYNAMICS_BALL_FLIGHT · TRENCH_OL_CONTINUITY · COACHING_FOURTH_DOWN_DRAG
TURNOVER_LUCK_REGRESSION · SGP_CORRELATION_COPULA
```

**Corpus evaluator** — 25 domains
(`packages/prediction-engine/src/reasoning/corpus-evaluator.ts`,
`export type LiteratureDomain`):

```
trench_bipartite_matching · spatial_kinematics_imm · coverage_shell_factorization
pathwise_win_probability · fourth_down_game_theory · bye_rest_differential
circadian_travel_dysrhythmia · snap_timing_acoustic_variance · referee_crew_officiating
qb_kinetic_chain_decay · acwr_workload_injury_hazard · defensive_snap_endurance
navier_stokes_aerodynamics · magnus_lift_ballistics · cold_thermal_friction
altitude_hypoxia_expansion · shin_informed_devig · reverse_line_capital_flow
favorite_longshot_curvature · archimedean_copula_sgp · conformal_risk_uncertainty
supermartingale_drift_audit · kaggle_multi_era_historical · fandom_sentiment_arcs
unstructured_theory
```

**Mind corpus** — 17 domains, measured from the 5,149 records:

| records | domain |
|---|---|
| 3,274 | `sports_analytics_metrics` |
| 408 | `workload_and_injuries` |
| 351 | `tracking_and_kinematics` |
| 330 | `fantasy_and_dfs` |
| 154 | `secondary_coverage` |
| 120 | `market_microstructure` |
| 88 | `team_ratings` |
| 86 | `in_game_calibration` |
| 85 | `trench_warfare` |
| 82 | `coaching_tendencies` |
| 79 | `rest_and_schedule` |
| 60 | `home_field_dynamics` |
| 18 | `weather_and_aerodynamics` |
| 10 | `sgp_copula` |
| 2 | `player_valuation` |
| 1 | `quarterback_evaluation` |
| 1 | `workload_and_fatigue` |

**Plus the 9-pillar canonical set** in the new index
(`packages/prediction-engine/src/literature/literature-pillars.ts`),
derived by a pure function of the premise text so it cannot drift.

**Consequence.** You cannot ask "which premises bear on this signal?"
across these layers. `MARKET_GRAVITY_AND_BIAS` and `market_microstructure`
are the same pillar under two names.

### 2.2 The canonical 9, and the mapping

The full mapping is in `layer2_living_literature_map.json` under
`pillar_canonical_map`. Summary:

| # | Canonical pillar | Bridge | Corpus evaluator | Mind | Signal families | Records |
|---|---|---|---|---|---|---|
| 1 | `market_microstructure` | MARKET_GRAVITY_AND_BIAS | shin_informed_devig, reverse_line_capital_flow, favorite_longshot_curvature | market_microstructure | market.*, odds.*, line_* | 120 |
| 2 | `physical_environment` | ENVIRONMENT_AND_CONTEXT, FLUID_DYNAMICS_BALL_FLIGHT, ATMOSPHERE_AND_REFEREE_BIAS | navier_stokes_aerodynamics, magnus_lift_ballistics, cold_thermal_friction, altitude_hypoxia_expansion | weather_and_aerodynamics | vision.*, weather.* | 18 |
| 3 | `tactical_schematic` | TACTICS_AND_GAME_THEORY, COACHING_FOURTH_DOWN_DRAG | coverage_shell_factorization, qb_kinetic_chain_decay, fourth_down_game_theory | secondary_coverage, trench_warfare | ftn.*, qbr.* | 239 |
| 4 | `situational` | DYNAMIC_MOMENTUM_TRANSITION, CIRCADIAN_TRAVEL_DYSRHYTHMIA, TURNOVER_LUCK_REGRESSION | bye_rest_differential, circadian_travel_dysrhythmia, supermartingale_drift_audit | rest_and_schedule, home_field_dynamics | rest.*, schedule.* | 139 |
| 5 | `personnel_availability` | TRENCH_OL_CONTINUITY | trench_bipartite_matching, defensive_snap_endurance | trench_warfare | snaps.*, depth_chart.* | 85 |
| 6 | `efficiency_usage` | NETWORK_AND_STYLE_MATCHUPS | spatial_kinematics_imm, pathwise_win_probability | sports_analytics_metrics, team_ratings | ngs.*, qbr.*, snaps.* | 3,362 |
| 7 | `narrative_context` | *(none)* | fandom_sentiment_arcs | secondary_coverage | cognitive.*, coach.*, press.* | 154 |
| 8 | `injury_availability` | FATIGUE_INJURY_WORKLOAD | acwr_workload_injury_hazard, snap_timing_acoustic_variance | workload_and_injuries | injury.* | 409 |
| 9 | `cognition_decision` | *(none)* | unstructured_theory | in_game_calibration, quarterback_evaluation | cognitive.*, market.* | 87 |

**Two bridge pillars have no canonical home** — `COACHING_FOURTH_DOWN_DRAG`
(→ tactical_schematic) and `SGP_CORRELATION_COPULA` (→
market_microstructure/situational). Two canonical pillars
(`narrative_context`, `cognition_decision`) have **no bridge equivalent at
all** — which is itself a finding: the bridge's 14 pillars do not cover
the cognitive/narrative families that the live signal set does carry
(`cognitive.coach_speak_delta`, `cognitive.presser_sentiment`,
`cognitive.scheme_shift`, `cognitive.tendency_break` — 32 rows each, and
the most-retrieved family in the measured run).

**Measured pillar coverage of the indexed premises** (from
`reconciliation/literature-coverage.json`):

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
| **(no pillar)** | **1,465** |

**1,465 of 5,509 premises (27%) carry no pillar.** They are still
retrievable (a pillar is a scoping filter, not a gate), but a signal whose
pillar is never derived will not scope them in.

---

## 3. The evaluability ladder — the honest measure

From `layer2_living_literature_map.json` → `evaluability_ladder`:

| Level | What | Count |
|---|---|---|
| L0 | raw citable records | **23,909** |
| L1 | distinct resolvable identifiers | **8,077** |
| L2 | arXiv ids also present as markdown ledgers | **2,121** |
| L3 | **structured premises with an `evaluateContext` function** | **13** |
| L4 | mind corpus records | **5,149** |
| L5 | premises promoted to causal edges (measured) | **8** |
| L6 | premises that moved `trueProb` | **0** |
| L7 | premises that survived a **conclusive** intervention test | **0** |

**L3 → L4 is the discontinuity.** The mind corpus (5,149 records) is 400×
larger than the structured premise set (13), and the two are not connected
by any retrieval mechanism that the repo ships. The new index connects
them — which is why it holds 5,509 vectorized premises.

**L5 → L6 → L7 are zero, and that is the honest state.** 8 premises were
promoted on 72 residuals over 2 games; all 8 intervention tests were
INCONCLUSIVE; and the corpus shift that could move `trueProb` has weight
**0** because the promotion gate (N≥500 settled games, ΔBrier≥0.002) has
not been run.

---

## 4. Where live context fails to re-query the literature

Five measured failure modes, all recorded in
`layer2_living_literature_map.json` → `retrieval_failure_inventory`:

| id | Failure | File:line | Production effect |
|---|---|---|---|
| RF-1 | corpus evaluator is a hardcoded-path **full scan** | `corpus-evaluator.ts:835-850` | `findCorpusDirectories()` returns `[]` on Vercel → 0 items evaluated → `corpusSituationalShift` = 0 |
| RF-2 | mind corpus path is hardcoded to one developer machine, and `loadMindCorpus` **throws** when missing | `mind-reasoning.ts:130-139`, `:150` | `evaluateMindReasoning` throws; `situational-engine.ts:161` calls it unguarded |
| RF-3 | corpus output never enters `trueProb` | `ranking-prob.ts:56-58` | `corpusWeight` defaults to 0.0; no production caller until the audit branch |
| RF-4 | **no index over the raw corpus** — every evaluation is a full scan | `corpus-evaluator.ts:855-895` (`loadCorpusArtifacts`) | cost grows linearly with corpus; no top-k |
| RF-5 | **no event-driven trigger** — evaluation happens only inside a slate read | `situational-engine.ts:155-161` | a mid-week signal cannot force re-reason |

**RF-1 through RF-4 are fixed by the new index** (HNSW top-k, env-var
resolution, the `corpusAdjustment` seam). **RF-5 is fixed by the bridge**
(built) and **partially** by the per-signal trigger (STAGED-IMPROVEMENT 1).

---

## 5. What the index measured

`reconciliation/literature-coverage.json`:

| | |
|---|---|
| Premises indexed + vectorized | **5,509** |
| Raw corpus items vectorized | **1,268** |
| Live events → literature evaluation | **200** (7 signal keys, 15 games) |
| Activations | **5,650** across 257 distinct premises |
| Latency | p50 **78 ms** / p95 79 / p99 84 |
| **HNSW index used** | **yes** — `Index Scan using premise_vector_hnsw_idx … Order By: (embedding <=> …)` |
| Residuals from real settled outcomes | **72** (43 correct) |
| Premises promoted to causal edges | **8** |
| Intervention tests | **8**, all INCONCLUSIVE |
| Raw items promoted after ≥3 distinct events | **75** |

**The per-signal family distribution** of the 200 measured events:
`cognitive` 128 events (avg 12.95 hits), `ftn` 72 (avg 12.94). **The most
-retrieved family is `cognitive` — the one the bridge's 14 pillars do not
cover.** That is a direct, measured argument for the canonical 9.

---

## 6. The gap that remains, stated precisely

| Gap | Size | Status |
|---|---|---|
| Corpus coverage | 1,268 of **8,077** identifiers vectorized | expansion specified (`event_driven_retrieval_spec.md` §5) — `corpus-index.jsonl` (1,251 structured) and the `arxiv-deep` ledgers (2,121 ids) are the next targets |
| Premises with no pillar | **1,465 of 5,509** (27%) | the pillar derivation is keyword-based; these need either a better derivation or an explicit "unscoped" class |
| Brain vs structured | 5,149 mind records vs 13 bridge premises | **connected by the new index** — but the bridge's own 13 remain unwired and are now a strict subset of what the index holds |
| `trueProb` contribution | **0** | the seam is closed; the weight is 0; the gate has not been run |
| Conclusive intervention tests | **0** | 8 ran, all INCONCLUSIVE — no premise has 8+ graded residuals |
| Re-query on a mid-week signal | hourly, not per-signal | STAGED-IMPROVEMENT 1 |
