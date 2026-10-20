# GSE Research-to-Code Reconciliation

**Audited ref:** `origin/main` @ `4fa5330f4` ("analytics sweep: 2026-10-19 21:08 evening run (lane A addendum 3)")
**Worktree:** `C:/Users/Garrett/Sports-wt-audit-20261020` (isolated; the main tree's uncommitted work was not touched)
**Method:** static ESM import-graph walk over `packages/prediction-engine/src` (1,014 non-test modules) from production entry points, cross-package symbol-import scan of `packages/ingestion-pipeline` and `apps/web`, and grep-verified call-site tracing for every claim below.

Every row cites a real file path and line. Where a row says "not called", it means the symbol was found by repo-wide grep at its definition site plus re-export sites only — no invocation.

---

## 1. Headline numbers

| Metric | Value | Evidence |
|---|---|---|
| `packages/prediction-engine/src` non-test modules | **1,014** | `reconciliation/reachability.json` |
| Reachable from `scoring.ts` alone | **11** | `scoring.ts` import block, lines 14–34 |
| Reachable from all production PE entries (incl. `index.ts` barrel) | **454** | import-graph walk |
| Unreachable from any production entry | **560** | 437 of them have a sibling `.test.ts` |
| arXiv-derived modules unreachable | **255** | e.g. `packages/prediction-engine/src/2501-18606v1-temporal-dynamics-of-goal-scoring.ts` |
| arXiv-derived modules reachable only via `index.ts` barrel (exported, never consumed by a live path) | **43** | e.g. `continual/1612-00796v2-ewc-feature-anchoring` |
| Research docs (`.md` + `.json`) in research dirs | **3,234** | `docs/arxiv-program` 1,608; `docs/ops` 519; `docs/research` 337; `docs/predictions` 295; `docs/engine` 234 |
| MIND corpus records | **5,148** | `packages/prediction-engine/data/MIND_CORPUS_3000.jsonl` (7,999,749 bytes, committed) |
| Remote branches (non-dependabot) | **789**, 248 since 2026-10-01 | `reconciliation/inventory.json` |

---

## 2. The Sovereign Signal Plane — implemented twice, called once (never)

The pasted brief states the plane is "wired into the Neon signals / game_signals tables, vision parquet artifacts, Week 6 matchup and publishing paths, and the live board that shipped sides, totals, MLs, props, and copula SGPs on 18 October."

That claim is **half true**. There are two independent implementations of the same equation, and the TypeScript one has no caller.

| # | Artifact | Status | Evidence |
|---|---|---|---|
| 1 | `computeSovereignSignalPlaneContribution` (TS) | **DEAD — never called** | Defined `packages/prediction-engine/src/game-context.ts:1065`. Repo-wide grep returns exactly 4 hits: definition (`game-context.ts:1065`), import (`scoring.ts:26`), re-export (`scoring.ts:37`), barrel export (`index.ts:36`). **Zero invocation sites.** The import at `scoring.ts:26` is used only for the re-export block at `scoring.ts:36-41`. |
| 2 | `compute_pick_probability_from_db_signals` (Python) | **LIVE — the real scorer** | `scripts/sync_week6_db.py:181-274`. This is what actually produced the Week 6 `trueProb`. Implements the same equation with `PROB_SCALE = 0.25` (`sync_week6_db.py:203`) and its own 14-key list (`sync_week6_db.py:116-131`). |
| 3 | TS weight table `SOVEREIGN_SIGNAL_PLANE_WEIGHTS` (17 keys) | **PARTIAL** | `packages/prediction-engine/src/game-context.ts:1026-1027` region, 17 entries including `ngs.avg_separation`, `ngs.ryoe_per_att`, `ngs.cpoe`. |
| 4 | Python key list `SOVEREIGN_SIGNAL_KEYS` (14 keys) | **LIVE — narrower** | `scripts/sync_week6_db.py:116-131`. **The 3 NGS keys are absent from the live list.** `grep -n 'ngs\.' scripts/sync_week6_db.py` → no hits. |
| 5 | Weight source divergence | **CONTRADICTION** | TS uses the frozen constant; Python reads `signals.weight` from Neon (`sync_week6_db.py:212`: `weight = h_row["weight"] if h_row else ...`). The DB weights are seeded by `scripts/ingest_week6_signals_db.py:236` with the same literals (e.g. `vision.soe_yd` → `0.085`), so they agree today — but the frozen TS constant is not what ships. Two sources of truth for one equation. |
| 6 | `signalPlaneDeltaProb` in `trueProb` | **LIVE (Python only)** | `scripts/sync_week6_db.py:198`, `:250-252`. The TS equation at `game-context.ts:1118-1124` is never executed. |
| 7 | TS→Python equation string parity | **MATCH** | `game-context.ts:1132` and `sync_week6_db.py:261` carry the identical equation literal. |

**Consequence.** The brief's phrase "The plane is wired into … the live board" is true *only* because a Python re-implementation shipped. The TypeScript Sovereign Signal Plane — the thing `packages/prediction-engine/src/index.ts` advertises — is a display-only artifact. Any future change to `SOVEREIGN_SIGNAL_PLANE_WEIGHTS` in TypeScript will **not** change published probabilities.

**Contradiction with the brief's own weight list.** The pasted brief lists 17 keys with weights and says the plane "operates on 17 keys." The live Python path operates on 14. The three NGS keys (`ngs.avg_separation` 0.085, `ngs.ryoe_per_att` 0.095, `ngs.cpoe` 0.105 — the three highest-weighted NGS entries) do not contribute to any published Week 6 `trueProb`, even though `scripts/ingest_week6_signals_db.py:321-332` explicitly activates them in the `signals` table (`SET weight = CASE ... WHERE key IN ('ngs.avg_separation', 'ngs.ryoe_per_att', 'ngs.cpoe') AND weight = 0`).

---

## 3. The Oct-18 published picks — hardcoded output windows

`scripts/publish_late_sun_mon_live_free.py` is the script that wrote the Week 6 late-window free picks (15 picks: totals, spreads, moneylines, props, SGPs) to Neon on 2026-10-18. It is not referenced by any cron, workflow, or script (`grep -rn 'publish_late_sun_mon_live_free' --include='*.yml' --include='*.yaml' --include='*.json' --include='*.sh'` → no hits).

| Line | Code | Meaning |
|---|---|---|
| `publish_late_sun_mon_live_free.py:498` | `true_prob = max(0.6020, min(0.6160, sig_attr["trueProb"]))` | Published `trueProb` is clamped to a **1.4-point window**, discarding the model's actual output. |
| `:502` | `edge_score = min(71.2, max(68.4, sig_attr["edgeScore"]))` | Published edge score clamped to a 2.8-point window. |
| `:503` | `confidence = max(66, min(69, sig_attr["confidence"]))` | Published confidence clamped to a 3-point window. |
| `:504` | `tier = "FREE"` | Hardcoded. |
| `:505` | `pick_grade = "STRONG_PLAY"` | **Hardcoded** — not derived from any threshold, unlike `sync_week6_db.py:760-761` which derives it (`"STRONG_PLAY" if (confidence >= 68 and edge_score >= 67.0) else "SOLID_PLAY"`). |
| `:127`, `:150`, `:171`, `:194`, `:214`, `:235`, `:257`, `:279`, `:300` | `"market_fair_prob": 0.5000` | Most plays carry a **round-number placeholder** market fair probability (0.5000), not a de-vigged consensus. Two plays carry non-round values (`:106` = 0.5022, `:300` = 0.4978). |
| `:104`, `:127`, … | `"structural_delta_prob": 0.0666` … `0.1020` | Hardcoded per-play structural deltas with no derivation shown in the script. |

**Integrity assessment.** `edgeScore` and `confidence` as published are **not** the engine's numbers — they are the model's numbers squeezed into a fixed marketing band, with `pickGrade` hardcoded to the strongest grade. The public board (`apps/web/lib/board/state.ts:495`, `load-gate-slate.ts:580`, `passes.ts:154`) reads exactly these rows with `isPublished: true`. `sync_week6_db.py` (the earlier Week 6 writer) does **not** clamp this way — it derives `edge_score`, `confidence`, `tier`, and `pick_grade` from `raw_edge` (`sync_week6_db.py:257-261`, `:758-761`).

This is the single highest-severity finding in the audit: the shipped Oct-18 board is not a faithful rendering of the GSE engine's output.

---

## 4. The Reasoning Engine loop — research is computed, then discarded

The pasted brief's central claim: "The product is the Reasoning Engine that takes every available signal — field, social, cognitive, physical, environmental, coaching, literature, market, live — reasons over it, updates beliefs, and gets smarter every day."

The doctrine exists in the repo. The loop does not close. Concretely:

| # | Artifact | Status | Evidence |
|---|---|---|---|
| 1 | Layer-2 corpus evaluator (2,179 arXiv papers claimed) | **COMPUTED, NOT APPLIED** | `packages/prediction-engine/src/reasoning/corpus-evaluator.ts:937` `evaluateFullCorpus`. Called from `reasoning/situational-engine.ts:155`. Its output `corpusSituationalShift` is stored on the pick's `factorBreakdown` (`packages/ingestion-pipeline/src/process-sport.ts:1454`) and surfaced on an internal ops route (`apps/web/app/api/ops/ranked-picks/route.ts:179`) — **but never enters `trueProb`, `rawEdge`, `shrunkEdge`, or `confidence`.** |
| 2 | `corpusAdjustment` / `corpusWeight` in the ranking path | **DEAD PARAMETERS** | `packages/prediction-engine/src/ranking-prob.ts:56-58` declares both, defaulting `corpusWeight` to **0.0 unpromoted** (`:57` comment). Repo-wide grep for `corpusAdjustment` outside `ranking-prob.ts` → **no production caller**. The two parameters are the designed seam where the corpus would enter ranking; nothing is connected. |
| 3 | Corpus evaluator weight | **0.05 default** | `packages/prediction-engine/src/reasoning/corpus-evaluator.ts:121` `export const CORPUS_EVALUATOR_DEFAULT_WEIGHT = 0.05;` |
| 4 | Promotion gate for the corpus | **DOCUMENTED, NOT ENFORCED** | `corpus-evaluator.ts:27-29`: "Base production weight is frozen at 0.0 until verified on a pre-registered holdout with N >= 500 settled games and delta Brier >= 0.002." No code enforces the N>=500 / delta-Brier pre-registration; `corpusWeight` is simply never passed. |
| 5 | Mind Reasoning (5,148 records) | **COMPUTED, NOT APPLIED** | `packages/prediction-engine/src/reasoning/mind-reasoning.ts:1059` `evaluateMindReasoning` → `situation-engine.ts:161`. Its `situationalPick` (a model fair probability) and `sameGameParlay` reach `process-sport.ts:1455-1458` as `factorBreakdown` metadata and into `reasoningShort` copy (`process-sport.ts:1495`), but never into the probability. |
| 6 | Corpus file discovery | **HOST-PATH DEPENDENT** | `corpus-evaluator.ts:835-850` `findCorpusDirectories()` probes `process.cwd()`, `../..`, `..`, and the **hardcoded absolute path `C:/Users/Garrett/Sports`**. On Vercel (Linux, read-only, different layout) it returns `[]` → `loadCorpusArtifacts` returns empty → the corpus evaluator evaluates 0 items in production. |
| 7 | Mind corpus file discovery | **HOST-PATH DEPENDENT** | `reasoning/mind-reasoning.ts:130-139` `findMindCorpusPaths()` probes two repo-relative paths plus two hardcoded `C:/Users/Garrett/Sports/...` paths. The repo-relative candidates resolve correctly from a repo-root `cwd` but not from a Vercel build output dir; `loadMindCorpus` **throws** when the file is missing (`mind-reasoning.ts:150`). |
| 8 | `publishablePick` invariant | **ALWAYS FALSE — BY DESIGN** | `packages/prediction-engine/src/reasoning/aggregation-trace.ts:229`, `packages/ingestion-pipeline/src/reasoning-trace.ts:202`, `packages/ingestion-pipeline/src/gse-score-bridge.ts:297`. `gse-score-bridge.ts:37`: "GSE action score is an internal gate, not a pick. publishablePick is false for every kernel decision, including PLAY and LEAN." |
| 9 | `divergenceIsEdge` invariant | **ALWAYS FALSE — BY DESIGN** | `reasoning/situational-engine.ts:169` `divergenceIsEdge: false`; `reasoning-trace.ts:139`: "A reasoning trace is not a pick. publishablePick is false. beatsBookClaim is false." |

**Verdict on the gap named in the brief.** The brief is right that "not everything is yet continuously ingested and fed into a single daily self-improving Reasoning Engine loop." The sharper finding is that the *reasoning* half is not merely un-ingested — it is **computed and then thrown away at the last step**. `evaluateFullCorpus` runs (loading 2,000+ paper records from disk, per its own header) and its output is written to `factorBreakdown` for display, while `trueProb` is computed from market fair value + a hardcoded structural delta + a continuity delta + the signal plane. The Reasoning Engine's output is **decorative**.

---

## 5. Self-improvement / continual learning modules — implemented, never connected

| Artifact | Status | Evidence |
|---|---|---|
| `continual/1612-00796v2-ewc-feature-anchoring` | **ORPHAN (barrel only)** | `ewcPenalty`, `ewcGradient`, `anchoredStep`, `importanceOverlap` defined at `packages/prediction-engine/src/continual/1612-00796v2-ewc-feature-anchoring.ts:35,51,62,78`. Reachable only through `src/index.ts`. No production consumer. |
| `continual/1904-10644v1-certainty-weighted-continual-updates` | **ORPHAN (barrel only)** | `naturalGradLogistic` (`:26`), `steinCoresetGreedy` (`:104`), `mmdCoreset` (`:132`) — the Stein coreset / MMD machinery the brief mentions. No production consumer. |
| `continual/2304-01239v1-teacher-student-continual` | **ORPHAN (barrel only)** | `teacherEmaUpdate` (`:26`), `forgettingAudit` (`:84`). No production consumer. |
| `continual/adaer-replay` | **ORPHAN** | `interferenceScores` (`:2`), `adaErBufferSelect` (`:43`). No production consumer. |
| `continual/online-metric-suite` | **ORPHAN** | `brierScore` (`:2`), `onlineMetricSuite` (`:33`). No production consumer. |
| `calibration/*` (22 modules: `isotonic-calibration`, `pav`, `spline-calibration`, `temporal-conformal`, `weighted-conformal-shift`, `teacher-calibration`, `mmce-selective`, …) | **ALL ORPHAN** | Every module under `packages/prediction-engine/src/calibration/` except `build-calibration-history` and `pathwise-defect` is unreachable from production entries. `calibration-apply.ts` (`buildCalibrator`, `:73`) is imported only by `apps/web/lib/calibration/calibration-audit-harness.ts:26` — an audit harness, not the scoring path. |
| `calibration-apply.ts` activation | **SELF-SUPPRESSING BY DESIGN** | `packages/prediction-engine/src/calibration-apply.ts:9-17`: "Wiring this into the live scoring/display path is a deliberate, audited MODEL_VERSION step… Until there is a settled canonical sample to fit against AND that audited step is taken, `buildCalibrator` returns an inactive calibrator that is a no-op identity map." `DEFAULT_MIN_CALIBRATION_SAMPLE = 100` (`:31`). |
| `online-beta-recalibration.ts` | **ORPHAN** | `applyOnlineBeta` (`:107`), `runOnlineBetaRecalibration` (`:116`), `fitResAwareBeta` (`:279`). No production consumer. |
| `calibration-ladder.ts` | **ORPHAN** | `plattScaling` (`:62`), `binnedEmpiricalCalibration` (`:142`), `buildCalibrationLadder` (`:228`). No production consumer. |

**Net effect: there is no self-improvement loop.** There is a large library of self-improvement *algorithms* — EWC anchoring, Stein coreset, teacher-student EMA, online beta recalibration, isotonic/PAVA/spline/temporal-conformal calibration, adversarial replay buffers — none of which is invoked by any path that produces a published number. The only calibration effect in production is a **withhold**: `calibrationHistoryWithholds` (`packages/prediction-engine/src/calibration/pathwise-defect.ts:201`), imported by `scoring.ts:14`, which can only *block* a pick, never adjust one.

---

## 6. Calibration status — the honest picture

The brief says "Calibration maps are built offline from settled history and can be applied optionally." Correct as stated, and the corpus's own status is honest: `reconciliation` found the shipped board's published `confidence` is **clamped**, not calibrated.

For the record, the memory note "Brier 0.2484 vs coin 0.25 — score only; RANKING monotone but INFLATED ~5.2pt" is consistent with what the code says: the ranking path (`ranking-prob.ts`) is monotone in `trueProb` but blends at `independentWeight = 0.7` default (`:93`), and the calibration map that would correct the inflation is not applied to it.

---

## 7. Live publish path — two parallel engines, one closed

| Hop | Component | Status | Evidence |
|---|---|---|---|
| 1 | Vercel cron `refresh-odds` (`*/15 * * * *`) | LIVE | `vercel.json` |
| 2 | Vercel cron `board-fill` (`2,17,32,47 * * * *`) | LIVE | `vercel.json` |
| 3 | Vercel cron `settle-picks` (`20 * * * *`) | LIVE | `vercel.json` |
| 4 | Vercel cron `generate-signal-slate` (`5,20,35,50 * * * *`) | LIVE | `vercel.json` |
| 5 | `runBoardFillPipeline` | LIVE | `packages/ingestion-pipeline/src/board-fill.ts:28`; route `apps/web/app/api/cron/board-fill/route.ts:20` |
| 6 | → `seedGamesFromEspn` → `refreshOdds` → `generateSignalSlate` | LIVE | `board-fill.ts:39,42,50` |
| 7 | `generateSignalSlate` | **BLOCKED — EMISSION CLOSED** | `packages/ingestion-pipeline/src/generate-signal-slate.ts:265` → `emissionBlocked()` → `packages/ingestion-pipeline/src/walk-forward-emission-gate.ts:29`. Gate file `packages/ingestion-pipeline/walk-forward-gate.json` has `"passed": false`, `"crps": null`, `gaussian_close_crps: 7.154021` vs the gate's own stated requirement of `CRPS <= 7.099`. `readEmissionGate` returns `{passed:false}` on missing file too (`:19-26`) — **fail-closed**. Result: `note: "emission gate closed: 0 picks, 0 parlays, 0 DFS."` |
| 8 | `processSport` → `scoreGames` → `scoreGame` | LIVE (paid-odds path) | `packages/ingestion-pipeline/src/process-sport.ts:1418`; reached from `apps/web/app/api/cron/refresh-odds/route.ts` and `apps/web/app/api/admin/trigger-refresh/route.ts:91` |
| 9 | `scoreGame` → `computeGameContext` | LIVE | `packages/prediction-engine/src/scoring.ts:736` (spread), `:1161` (total), `:1457` (moneyline) |
| 10 | `scoreGame` → `assessIndependentEdge` → `edge-engine.ts` | LIVE | `scoring.ts:15`, `packages/prediction-engine/src/edge-engine.ts:223` |
| 11 | `scoreGame` → `deriveRankingProbability` | LIVE | `scoring.ts:31`, `packages/prediction-engine/src/ranking-prob.ts:42` |
| 12 | **Week 6 publishing** | **OFF-CRON MANUAL SCRIPT** | `scripts/publish_late_sun_mon_live_free.py` — no cron, no workflow reference. Imports `compute_pick_probability_from_db_signals` from `scripts/sync_week6_db.py:20-28`. |

**The contradiction.** The TS board-fill slate path is **closed by its own walk-forward gate** (`passed: false`), so it emits 0 picks. The Week 6 content that shipped on Oct 18 came from a **manual Python script that bypasses that gate entirely** — it calls `compute_pick_probability_from_db_signals` directly and writes `isPublished = true` rows (`publish_late_sun_mon_live_free.py:589`, `:603`). Two independent problems follow:

- **(a)** The gate that says "do not emit until the walk-forward CRPS is demonstrated" does not apply to the path that actually emitted. The gate is enforced on the path that produces nothing.
- **(b)** The manual path has **no** adverse-edge withhold, **no** minimum-confidence gate, **no** line-integrity snap, **no** bookmaker-count floor, **no** fixture confirmation, and **no** proof-of-record / pick-proof-receipt — the entire `packages/prediction-engine/src/guards/` + `honesty/` + `promotion/` stack is bypassed.

`walk-forward-gate.json` also self-documents the honest failure: `"rerun": { "crps": null, "reason": "Gaussian line reproduced with crps_gaussian from intelligence/ratings/engine_math.py. Laplace CRPS 7.1597 was not recomputed: no Laplace margin module on this branch, and none was written." }` — a second concrete instance of a documented-but-unimplemented research path.

---

## 8. High-value orphan research modules (barrel-exported, zero consumers)

43 arXiv-derived modules are exported from `packages/prediction-engine/src/index.ts` but consumed by nothing in production. Representative high-leverage examples:

| Module | Subject | Note |
|---|---|---|
| `continual/1904-10644v1-certainty-weighted-continual-updates` | certainty-weighted continual updates, Stein coreset, MMD | The brief's "Stein-Belief work" |
| `continual/1612-00796v2-ewc-feature-anchoring` | EWC feature anchoring, forgetting regimes | continual-learning machinery |
| `continual/2304-01239v1-teacher-student-continual` | teacher EMA, consistency loss, diag Fisher | self-improvement machinery |
| `bayesian/2002-01193-copula-hmm-momentum` | copula HMM momentum | copula SGPs ship; this does not feed them |
| `bayesian/2304-01538-doubly-self-exciting-scores` | doubly self-exciting score model | |
| `markets/2112-13001v3-dcp-prop-framework` | DCP prop framework | props ship on a different path |
| `markets/1802-08848v1-odds-history-fusion` | odds history fusion | |
| `markets/2401-06086v1-imitation-inplay-betting` | imitation in-play betting | |
| `metalearning/1703-03400v3-maml-rookie-adapter` | MAML meta-learning | "gets smarter every day" machinery |
| `metalearning/1807-08912v2-alpaca-online-regression` | online regression | |
| `metalearning/2208-08135v1-uncertainty-weighted-metalearning` | uncertainty-weighted meta-learning | |
| `invention/1905-11481v2-ai-feynman-separability` | symbolic regression / AI Feynman | the `symreg/` work |
| `props-dfs/1505-01147v2-local-matrix-completion` | matrix completion | props surface |
| `experimental/1804-04226v1-cfov-decomposition` | CFOV decomposition | |
| `experimental/1805-01271v1-its-break-harness` | ITS break harness | |

Full list of all 255 unreachable arXiv-derived modules and all 305 unreachable named modules is in `reconciliation/reachability.json` (`arxiv_unreachable_list`, `named_unreachable_list`).

---

## 9. Status legend

| Status | Meaning |
|---|---|
| **IMPLEMENTED** | Code exists, is invoked by a path that produces a published number. |
| **PARTIAL** | Code exists and is invoked, but a documented part is missing or a param is dead. |
| **SHADOW** | Registered and computed, but its output does not affect any published number. |
| **DEAD** | Exists and is exported, but has zero invocation sites. |
| **MISSING** | Research documented; no code. |
| **CONTRADICTION** | Two implementations of the same thing disagree, or the shipped value disagrees with the computed value. |
