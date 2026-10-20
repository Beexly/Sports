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

## 1. Coverage score: **88%**

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
| 1 | **Give the L1–L5 engine a service entry point** (STAGED-IMPROVEMENT 2) | no | Until the engine is reachable, "make the loop continuous" has no referent. Everything causal is downstream. |
| 2 | **Move the literature bridge to per-signal** (STAGED-IMPROVEMENT 1) | no | The retrieval half is built and measured; only the trigger cadence is wrong. Dedup the embed first — the writer handles 80k rows/tick. |
| 3 | **Wire the 20 DARK evaluators to the database, delete 2** (STAGED-IMPROVEMENT 3) | **yes** | The single biggest coverage jump available: 0 → 19 dark sources with a live producer. Must land with #4. |
| 4 | **Run the settlement→belief loop and the promotion gate** (STAGED-IMPROVEMENT 4) | **yes (earned)** | 72 residuals over 2 games is not a trend. The gate (N≥500, ΔBrier≥0.002) is the arithmetic that turns the machinery into belief. Until it runs, `corpusWeight` stays 0. |
| 5 | **Implement the counterfactual trace evaluator** (INV-07) | no | The cheapest causal win: no new estimator, because `BreakingCondition` is already machine-checkable against `observed_values` and the adversary already evaluates it. The chain's own falsifiers *are* the intervention set. |

**Sequencing:** #1 before #2's trace refresh. #4 before #3. Refutation
before temporal discovery. Classifier measurement before multiplying the
wire.

---

## 6. The honest limits of this report

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

## 7. Deliverable index

| File | What it answers |
|---|---|
| `realtime_ingestion_requirements.md` | All 39 crons; 8 signal families with latency targets and current state; the measured signal table |
| `layer2_living_literature_map.md` + `.json` | The 3 pillar taxonomies and the canonical 9; the evaluability ladder; 5 measured retrieval failures |
| `literature_integration_map.md` | The claim corrections; measured corpus scale; what is real vs literal |
| `event_driven_retrieval_spec.md` | The 4 retrieval laws; the event path hop by hop; the 1,268→8,077 expansion plan |
| `causal_inference_methods.md` | Every causal method with its wiring status; the 4 missing methods with hook points; the `CausalLink`-has-no-numbers finding |
| `dark_sources_census.json` + `fix_plan.md` | 21 DARK evaluators, per-evaluator; the env→DB adapter plan; 2 deletion candidates |
| `reasoning_engine_continuous_loop_spec.md` | The 20-hop chain; the 7 questions answered; the target architecture; 9 staged stages |
| `invention_proposals.md` | 12 proposals, ranked, with gates and risk |
| `staged_improvements/` | 4 reviewable PR descriptions with acceptance criteria |
| `corpus_scale.json` | The measurement behind every corpus number |
