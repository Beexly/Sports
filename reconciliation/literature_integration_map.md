# Literature Integration Map — measured reality vs the brief

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Method:** every count below is produced by a script in `reconciliation/` and
is reproducible. `reconciliation/_measure_corpus_scale.py` walks every
`.json`/`.jsonl` under the corpus roots; `reconciliation/corpus_scale.json` is
its output.

---

## 0. The premise the brief starts from is not true as stated

The brief says:

> "arxiv-reasoning-bridge.ts contains 2,379 papers (arXiv + OpenAlex) + 429
> Kaggle datasets structured as premises, each with an evaluateContext
> function."

**Measured, it does not.**

| Claim in the brief | Measured | Evidence |
|---|---|---|
| 2,379 papers structured as premises | **13 premises** | `packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts:70` — `ARXIV_REASONING_PREMISES` contains 13 object literals (10 arXiv ids + 3 `EQ-*` equation ids). The array block is 14,033 characters. |
| 429 Kaggle datasets structured as premises | **0 Kaggle premises** | No Kaggle identifier appears in the file. `Kaggle` appears in the MIND corpus source labels (269 records) and nowhere in the bridge. |
| "each with an evaluateContext function" | **13 of 13** — true, but 13 not 2,379 | `arxiv-reasoning-bridge.ts:32` declares `readonly evaluateContext: (ctx: ArxivContextQuery) => ArxivSignalEvaluation;` |
| The corpus was "ingested directly into the Layer 2 Situational Reasoning Layer" | **the file has ZERO importers** | `grep -rn 'arxiv-reasoning-bridge' packages/ apps/ scripts/ intelligence/` → only its own definition and its own test file. The earlier reconciliation (`reconciliation/gaps.json` GAP-18) found the same. |
| "the raw research base is far larger (the 50k+ figure)" | **no 50k literature base exists** | `grep -rn '50,000\|50000+\|50k+' --include='*.md' --include='*.ts' --include='*.py'` → every hit is about NFL plays per season (`apps/web/lib/nflverse/pbp.ts:8` "50k rows"), fantasy caps, or sims. **Zero hits for a 50k-paper corpus.** |

The `2,379` and `429` are **hardcoded literals in a return object**, not
measurements:

```ts
// arxiv-reasoning-bridge.ts, evaluateArxivCorpus()
return {
  totalCorpusPapersIndexed: 2379,      // <-- literal
  totalKaggleDatasetsIndexed: 429,     // <-- literal
  activePremisesCount: evaluations.length,   // <-- measured, and correct
  ...
};
```

and the synthesis string says *"corpus consulted (2,379 papers, 429
datasets)"* even when zero premises are applicable. A reader of that trace
would conclude 2,379 papers were consulted.

**What IS true, and substantial.** The research is real. It is stored as
1,511 markdown ledgers (`docs/arxiv-program/research/2026-09-21/arxiv-deep/`,
one per paper, with verdict + numeric gate) and a 1,251-row structured index
(`docs/arxiv-program/research/2026-09-21/arxiv-program/index/corpus-index.jsonl`).
The 5,149-record MIND corpus is committed and machine-readable
(`packages/prediction-engine/data/MIND_CORPUS_3000.jsonl`). The gap is not
imaginary research — it is that the *structured, evaluable* layer is 13
premises wide while the *research* layer is thousands of records wide, and the
two are not connected by any retrieval mechanism.

---

## 1. Measured corpus scale

`reconciliation/corpus_scale.json`:

| Metric | Measured |
|---|---|
| JSON/JSONL files scanned under corpus roots | 396 |
| JSONL line records parsed | 1,130,486 |
| Markdown `arxiv-deep` ledgers | 1,513 |
| **Total citable records (title or abstract present)** | **23,909** |
| **Distinct resolvable identifiers** | **8,077** |
| — arXiv ids | 7,160 |
| — URLs | 575 |
| — other (DOIs, dataset ids) | 342 |
| Records with an `evaluateContext` field in the raw data | **0** |
| Distinct arXiv ids recoverable from markdown ledgers | 2,121 |

Top source labels among citable records:
`unlabeled 17,763 · ResearchSynthesis 2,314 · Pinnacle 911 · arXiv 905 ·
player-prior 440 · Statrankings 407 · AcademicLiterature 343 · Kaggle 269 ·
position-prior 202 · pdf 102 · prior-only 99 · Crossref 50 · ar5iv 26`.

**So the true ladder is:**

```
23,909 citable records  (research exists, machine-readable)
  └─ 8,077 distinct ids (resolvable, de-duplicable)
       └─ 2,121 arXiv ids also present as markdown ledgers
            └─ 13 structured premises with an evaluateContext   <-- the only evaluable layer
                 └─ 5,149 MIND corpus records (separate path, not in the bridge)
```

**The gap that matters: 8,077 → 13.** That is the integration task, and it is
a real, bounded, well-specified one.

---

## 2. Three incompatible pillar taxonomies

The brief says "structured as evaluable premises across ~14 pillars". There
are three pillar systems, and they do not map to each other:

| System | File:line | Count | Shape |
|---|---|---|---|
| Bridge pillars | `packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts:14-28` | **14** | `MARKET_GRAVITY_AND_BIAS`, `NETWORK_AND_STYLE_MATCHUPS`, `FATIGUE_INJURY_WORKLOAD`, `VISION_AND_FIELD_CONTROL`, `TACTICS_AND_GAME_THEORY`, `DYNAMIC_MOMENTUM_TRANSITION`, `ENVIRONMENT_AND_CONTEXT`, `ATMOSPHERE_AND_REFEREE_BIAS`, `CIRCADIAN_TRAVEL_DYSRHYTHMIA`, `FLUID_DYNAMICS_BALL_FLIGHT`, `TRENCH_OL_CONTINUITY`, `COACHING_FOURTH_DOWN_DRAG`, `TURNOVER_LUCK_REGRESSION`, `SGP_CORRELATION_COPULA` |
| Corpus-evaluator domains | `packages/prediction-engine/src/reasoning/corpus-evaluator.ts` (`export type LiteratureDomain`) | **25** | `trench_bipartite_matching`, `spatial_kinematics_imm`, `coverage_shell_factorization`, `pathwise_win_probability`, `fourth_down_game_theory`, `bye_rest_differential`, … `kaggle_multi_era_historical`, `fandom_sentiment_arcs`, `unstructured_theory` |
| MIND corpus domains | `packages/prediction-engine/data/MIND_CORPUS_3000.jsonl` (`domain` field) | **17** | `sports_analytics_metrics` (3,274), `workload_and_injuries` (408), `tracking_and_kinematics` (351), `fantasy_and_dfs` (330), `secondary_coverage` (154), `market_microstructure` (120), … |

A fourth taxonomy exists in the new literature index built in this session
(`packages/prediction-engine/src/literature/literature-pillars.ts`, **9**
pillars, derived by a pure function of the premise text so it cannot drift).

**Consequence.** You cannot ask "which premises are relevant to this signal?"
across these layers. `MARKET_GRAVITY_AND_BIAS` and `market_microstructure`
are the same pillar wearing two names; `FATIGUE_INJURY_WORKLOAD` and
`workload_and_injuries` likewise. A retrieval layer needs ONE vocabulary.

**Proposed canonical set** — 9 pillars, from the index already built and
measured, chosen because each maps to at least one existing signal family and
at least one existing corpus domain:

| # | Pillar | Bridge equivalent | Corpus-evaluator equivalent | MIND equivalent | Signal families |
|---|---|---|---|---|---|
| 1 | `market_microstructure` | MARKET_GRAVITY_AND_BIAS | shin_informed_devig, reverse_line_capital_flow, favorite_longshot_curvature | market_microstructure | market.*, odds.*, line_* |
| 2 | `physical_environment` | ENVIRONMENT_AND_CONTEXT, FLUID_DYNAMICS_BALL_FLIGHT, ATMOSPHERE_AND_REFEREE_BIAS | navier_stokes_aerodynamics, magnus_lift_ballistics, cold_thermal_friction, altitude_hypoxia_expansion | weather_and_aerodynamics | vision.*, weather.* |
| 3 | `tactical_schematic` | TACTICS_AND_GAME_THEORY | coverage_shell_factorization, qb_kinetic_chain_decay | secondary_coverage, trench_warfare | ftn.*, qbr.* |
| 4 | `situational` | DYNAMIC_MOMENTUM_TRANSITION, CIRCADIAN_TRAVEL_DYSRHYTHMIA | bye_rest_differential, circadian_travel_dysrhythmia, supermartingale_drift_audit | rest_and_schedule, home_field_dynamics | rest.*, schedule.* |
| 5 | `personnel_availability` | TRENCH_OL_CONTINUITY | trench_bipartite_matching, defensive_snap_endurance, acwr_workload_injury_hazard | workload_and_injuries | snaps.*, injury.*, depth_chart.* |
| 6 | `efficiency_usage` | NETWORK_AND_STYLE_MATCHUPS | spatial_kinematics_imm, pathwise_win_probability | sports_analytics_metrics, team_ratings | ngs.*, qbr.*, snaps.* |
| 7 | `narrative_context` | — (no bridge equivalent) | fandom_sentiment_arcs | secondary_coverage | cognitive.*, coach.*, press.* |
| 8 | `injury_availability` | FATIGUE_INJURY_WORKLOAD | acwr_workload_injury_hazard | workload_and_injuries | injury.*, injury.availability |
| 9 | `cognition_decision` | — (no bridge equivalent) | — | in_game_calibration | cognitive.*, market.* |

Two bridge pillars (`COACHING_FOURTH_DOWN_DRAG`, `TURNOVER_LUCK_REGRESSION`,
`SGP_CORRELATION_COPULA`) have no clean 1:1 home in the 9 — they map to
`tactical_schematic` and `market_microstructure`/`situational` respectively.
The mapping is in `reconciliation/layer2_living_literature_map.json` as
`pillar_canonical_map`.

---

## 3. Where live context fails to re-query the literature

Three distinct failure modes, all measured:

### 3.1 The corpus evaluator is a hardcoded-path batch scan

`packages/prediction-engine/src/reasoning/corpus-evaluator.ts:835-850`:

```ts
export function findCorpusDirectories(): string[] {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), ".."),
    "C:/Users/Garrett/Sports",        // <-- a developer's machine
  ];
  for (const base of candidates) {
    const d1 = path.join(base, "docs/arxiv-program/research/2026-10-17");
    const d2 = path.join(base, "docs/data-sources/research/2026-10-17");
    if (fs.existsSync(d1) && fs.existsSync(d2)) return [d1, d2];
  }
  return [];                          // <-- on Vercel: ZERO items
}
```

It also requires BOTH directories to exist before returning either, and it
walks **every** `.json` file in them, parsing all of it, on **every** call.
There is no index, no embedding, no top-k. It is a full scan.

**Consequence on production:** `loadCorpusArtifacts` gets `[]`, so
`evaluateFullCorpus` evaluates 0 items, so `corpusSituationalShift` is 0, so
the Layer-2 literature contributes nothing to any published number.

### 3.2 The mind corpus is a hardcoded-path THROW

`packages/prediction-engine/src/reasoning/mind-reasoning.ts:130-139`:

```ts
export function findMindCorpusPaths(): string[] {
  const candidates = [
    path.resolve(process.cwd(), "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl"),
    path.resolve(process.cwd(), "docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl"),
    path.resolve(process.cwd(), "../prediction-engine/data/MIND_CORPUS_3000.jsonl"),
    "C:/Users/Garrett/Sports/packages/prediction-engine/data/MIND_CORPUS_3000.jsonl",
    "C:/Users/Garrett/Sports/docs/engine/research/2026-10-17/MIND_CORPUS_3000.jsonl",
  ];
  return candidates.filter(p => fs.existsSync(p));
}
```

and `loadMindCorpus` **throws** when the file is missing
(`mind-reasoning.ts:150`): `throw new Error("Mind corpus file not found...")`.

**Consequence:** on Vercel, `evaluateMindReasoning` throws. Since
`situational-engine.ts:161` calls it unguarded, the whole situational read
throws — unless the repo-relative path happens to resolve, which depends on
the cwd of the serverless function.

### 3.3 The output never reaches trueProb anyway

Even where the corpus DOES evaluate, its output is decorative:

| Step | File:line | State |
|---|---|---|
| `evaluateFullCorpus` runs | `corpus-evaluator.ts:937` | measured |
| → `corpusSituationalShift` | `situational-engine.ts:158` | measured |
| → written to `pick.factorBreakdown` | `packages/ingestion-pipeline/src/process-sport.ts:1454` | measured |
| → exposed on an internal ops route | `apps/web/app/api/ops/ranked-picks/route.ts:179` | measured |
| → **enters `trueProb`?** | — | **NO** |
| `corpusAdjustment` / `corpusWeight` seam | `packages/prediction-engine/src/ranking-prob.ts:56-58` | declared, `corpusWeight` defaults to 0.0, **no production caller** until the change shipped on the audit branch |

**The seam is now closed on the audit branch** (`audit/reconciliation-2026-10-20`,
commit `2575402f6`): `GameContextInput.corpusAdjustment` / `.corpusWeight` added
(`packages/types/src/index.ts`), passed at `scoring.ts:848` and `:1534`, and
populated at `process-sport.ts`. **The weight is still 0 by design** — the
corpus evaluator's own promotion gate (`corpus-evaluator.ts:26-29`: "N >= 500
settled games and delta Brier >= 0.002 on a pre-registered holdout") has not
been run. Carrying the shift is not the same as believing it.

---

## 4. The integration that is needed (and partly built)

The brief's own design is correct: index the whole raw corpus, retrieve
top-k on every event, evaluate only what is retrieved, promote what survives
settlement, demote what does not.

**That index was built and measured on the audit branch** (Neon branch
`dev-lit-vectors-2026-10`, schema `lit`):

| | Measured |
|---|---|
| Premises indexed + vectorized | **5,509** (5,149 MIND + 285 bridge + 75 promoted-from-raw) |
| Raw corpus items vectorized for discovery | **1,268** |
| Live events → literature evaluation | **200** (7 signal keys, 15 games) |
| Activations recorded | **5,650** across 257 distinct premises |
| Retrieval latency | p50 78 ms, p95 79 ms, p99 84 ms |
| HNSW index used | **yes** — `Index Scan using premise_vector_hnsw_idx … Order By: (embedding <=> …)` |
| Residuals from real settled outcomes | **72** (43 correct) |
| Premises promoted to causal edges | **8** |
| Intervention tests (promoted edges only) | **8**, all INCONCLUSIVE |
| Raw items surfaced by ≥3 distinct events → structured | **75** |

**What is still missing to reach the full 8,077:** the raw corpus in this
build was 1,268 items (the `docs/arxiv-program/research/2026-10-17` dumps).
The remaining ~6,800 identifiers live in the 1,511 markdown ledgers (which are
prose, not JSON) and in the 1,251-row `corpus-index.jsonl`. The pipeline
exists; the corpus coverage does not. See
`reconciliation/event_driven_retrieval_spec.md` §"Corpus expansion".

---

## 5. Layer 2 living-literature map (machine-readable)

`reconciliation/layer2_living_literature_map.json` carries:
- the three pillar taxonomies and their canonical mapping
- the per-source record census
- the retrieval-failure inventory (3.1/3.2/3.3) with file:line
- the premise counts per pillar, measured
- the bridge premise list with its 13 ids and pillar
- the MIND corpus domain distribution
- the measured `trueProb` seam state

**Honest bottom line.** The research is real and large. The *evaluable* layer
is 13 premises wide, hardcoded to one developer's machine, and its output
reaches no published number. The index that fixes all three exists, is
measured, and is on the audit branch. What remains is corpus coverage
(1,268 of 8,077 identifiers indexed) and running the promotion gate that
would let a premise move a probability.
