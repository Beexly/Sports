# Implementation-claim verification — pickle partition

**Scope:** the 29 files listed in `arxiv-IMPL.txt`, every implementation assertion in them checked against real files in `C:\Users\Garrett\Sports-wt-intel`. Read-only; no repo modified; no git commands run.

## 0. Scope caveat — the prompt file is truncated on disk

`prompt-impl-verify-pickle.md` is **217 bytes** and ends mid-sentence: `arxiv-IMPL.txt — 29 relati...[truncated]`. The report format, disposition vocabulary, and the name of the report file the prompt says to write were all lost. This report therefore uses the format conventions of the sibling prompts in this scratch dir (`prompt-claims-*.md`, `prompt-ledger-nemo.md`) and picks its own filename. **If the prompt named a different output path, this file needs to be renamed.**

## 1. Resolution — the 29 paths are relative to `docs/arxiv-program/research/`, not `docs/research/`

`arxiv-IMPL.txt` lists bare relative paths (`2026-09-21/arxiv-deep/...`). All 28 non-index entries resolve **only** under:

```
C:\Users\Garrett\Sports-wt-intel\docs\arxiv-program\research\<path>
```

All 28/28 exist there. `C:\Users\Garrett\Sports\docs\arxiv-program\research\` also carries all 28. They do **not** resolve under `Sports-wt-intel/docs/research/`, under `docs/arxiv-program/research/` in the `calib-boundary` worktree, or anywhere on `G:`. This matters because several notes cite sibling paths as `docs/research/2026-09-21/...` — that prefix is wrong for this repo layout and is the root cause of findings F-3 and F-4 below.

Two sibling paths in `arxiv-IMPL.txt` do not exist as written: `MASTER-PAPER-INDEX.md` is at `docs/arxiv-program/research/MASTER-PAPER-INDEX.md` (not under `2026-09-21/`), and the 0349 note's real filename is `0349-totnet-...`, not `0349-dotnet-...`.

## 2. VERIFIED claims — file exists as named

Every path below was confirmed present in `Sports-wt-intel` at HEAD.

### 2a. Wave 0 (IMPLEMENTED.md:10-14, WIRING-PLAN.md:34-38)

| Claimed path | Verdict |
|---|---|
| `apps/web/lib/calibration/quantile-isotonize.ts` + `.test.ts` | VERIFIED — exports `sortQuantiles`, `pavaIsotonic`, `isNonCrossing` |
| `apps/web/lib/calibration/scrps.ts` + `.test.ts` | VERIFIED — exports `ensembleSpread`, `crpsFromSamples`, `scrpsFromSamples` (matches the W-2 spec's `CRPS / E|X−X′|`) |
| `apps/web/lib/calibration/practical-scoring.ts` + `.test.ts` | VERIFIED — `PRACTICAL_SCORE_MIN = -57.27`, the exact floor WIRING-PLAN.md:36 quotes |
| `apps/web/lib/calibration/cqr.ts` | VERIFIED — the claimed fail-closed repair is real and exact: `Math.ceil((1-alpha)*(n+1)) - 1`, `if (rank >= n) return Number.POSITIVE_INFINITY`. Unclamped rank, +∞ when undefined, as WIRING-PLAN.md:24 describes. |

### 2b. Wave 4 / Wave 5 (IMPLEMENTED.md:165-197) — all 12 + 8 build paths

All 20 VERIFIED present: `eval/model-submission-schema.ts`, `nfl/generalized-poisson.ts`, `eval/feature-construction-recipe.ts`, `nfl/ats-ablation-harness.ts`, `props/anytime-td-mit.ts`, `nfl/luck-neutralized-epa.ts`, `backtest/wp-event-replay.ts`, `data-ingestion/{propline,weather-vintage,sleeper,cfbfastr}-intake.ts`, `nfl/coverage-db-metrics.ts`, `nfl/ngs-adjacent-metrics.ts`, and the six `engine/*-adapters.ts` modules.

**One path is wrong.** IMPLEMENTED.md:168 lists V8 as `docs/research/2026-09-25/model-process-checklist.md`. **That file does not exist at that path.** `docs/research/2026-09-25/` does not exist at all in this checkout. The file is at `docs/dfs/research/2026-09-25/model-process-checklist.md`. The build is real; the recorded path is wrong.

### 2c. Wave 3 scaffolds (IMPLEMENTED.md:152-157)

All 6 VERIFIED present **and** genuinely disabled: each of `2410-21484v1-markets`, `2412-10298v1-viewership`, `2504-04186v1-data-infra`, `2504-08764-nlp`, `2507-17844v1-tracking`, `2508-11711v2-data-infra` carries a literal `ENABLED = false`. The `ENABLED=false scaffold` claim is honest.

### 2d. Wave 6 / 6B–6G live-path claims (IMPLEMENTED.md:203-283)

All 21 named paths VERIFIED present, including `signal-registry-extensions.ts`, `continuous-signal-tilt.ts`, `apps/web/lib/picks/intelligence-enrichment.ts`, `props-slate.ts`, `leakage-gate.ts`, `walk-forward-eval.ts`, `props-hb-bridge.ts`, `ensemble-bridge.ts`, `continual-learning-bridge.ts`, `monitoring-bridge.ts`, `inplay-bridge.ts`, `edge-lab-bridge.ts`, `edge-lab-honesty-bridge.ts`, `dfs-bridge.ts`, `nfl-batch-bridge.ts`, plus the two live routes `apps/web/app/api/models/submission/route.ts` and `apps/web/app/api/cron/feature-recipe-backtest/route.ts`.

**"23 signal evaluators into SIGNAL_REGISTRY" (IMPLEMENTED.md:203) — VERIFIED.** `signal-registry-definitions.ts:915` spreads `...EXTENDED_SIGNALS` into `SIGNAL_REGISTRY`, and `signal-registry-extensions.ts:895` exports exactly **23** entries. The count and the wiring are both real.

**"Not wired into a live publish path" for Wave 0 quantile-isotonize — VERIFIED.** Grepping the whole tree for `quantile-isotonize` / `sortQuantiles` outside the module and its own test returns **zero** hits. The NEEDS-HUMAN-CALL status IMPLEMENTED.md:20 records is accurate, not stale.

## 3. VERIFIED claims — numeric/counting claims

| Claim | Source | Verdict |
|---|---|---|
| "1,251 / 1,251 tracker papers indexed, each in ≥1 engine bucket" | WIRE-IN-PLAN.md:3 | **VERIFIED EXACTLY.** `corpus-index.jsonl` = 1,251 records, 0 with empty buckets. |
| Bucket counts MODEL 1083 / INGEST 566 / CALIBRATE 494 / DECIDE 274 / MONITOR 219 / INVENT 185 | WIRE-IN-PLAN.md:43-48 | **VERIFIED EXACTLY** — recount from `corpus-index.jsonl` returns identical numbers for all six. |
| Doctrine split 881 PROPRIETARY_EDGE / 152 SITUATIONAL / 118 INFRA / 100 BASELINE | WIRE-IN-PLAN.md:51-52 | **VERIFIED EXACTLY** — recount returns the same four numbers, summing to 1,251. |
| `IMPROVEMENT-LEDGER.jsonl` covers all 1,251 papers | IMPROVEMENT-LEDGER.md:3 | **VERIFIED** — 1,251 lines. Bucket counts in the ledger header (INGEST 506 / MODEL 531 / CALIBRATE 88 / DECIDE 107 / INVENT 19 / MONITOR 0) are a *different* partition from WIRE-IN-PLAN's buckets; they are consistent as effort-lane splits, not a contradiction. |
| "Dual CLV reporting merged as #872" (`computeClvPushDoctrineRates`) | WIRING-PLAN.md:22 | **VERIFIED** — `packages/types/src/index.ts:973`, with a pinning test at `packages/types/src/__tests__/clv-push-doctrine.test.ts`. |
| Wave 3 "18 tests passed, 6 co-located test files" | IMPLEMENTED.md:148 | Consistent with 6 modules × 3; not independently re-run (read-only, no test execution claimed). |

## 4. REFUTED / WRONG claims — do not re-use without correction

### F-1. `RESCUE-2026-09-26` claims four modules that do not exist in this checkout

RESCUE-2026-09-26-3-papers-into-scorecard.md claims PR #916 landed `calibration.ts` (Murphy decomposition), `clusterBootstrap`, `relabelingNull` + `survivesRelabeling`, `exact.ts` (BigInt Wilson), and `Scorecard.clusterVerdict` into `packages/verifier`.

**VERDICT: ABSENT at this checkout's HEAD.** There is no `packages/verifier/` directory. `clusterVerdict` has zero repo hits. `relabelingNull` / `clusterBootstrap` / `survivesRelabeling` hit only one unrelated pair of files (`packages/prediction-engine/src/2409-04889-*.ts`), which is a different paper's module and not the scorecard surface described.

This is **consistent with the note's own text**, not a lie: it says the PR is a *draft stacked on #914* and that "`packages/verifier` does not exist on `main` yet." The correct disposition is **CLAIMED, NOT-MERGED-AT-HEAD** — the escape hatch is stated in the same file. But any downstream agent treating "four papers wired into the scorecard, status: done" as a repo fact at HEAD would be wrong. The 1,251-index and the Wave-6 LIVE claims do not have this problem.

### F-2. `MASTER-PAPER-INDEX.md` code-module counts are stale

The index claims (lines 10-19) **308** numbered modules, **308** unique IDs, **181** family-scoped, **127** at engine root, and that "**exactly one** code module has no arxiv-deep ledger: `1602.00542` → `experimental/1602-00542-cluster-seeking-js.ts`."

Recount at HEAD (`packages/prediction-engine/src/**/*.ts`, `*.test.ts` excluded, filename matching `NNNN-NNNNN(vN)?-*.ts`):

- numbered modules found: **306** (claimed 308) — **2 fewer**
- unique arXiv IDs: **306** (claimed 308), 0 duplicates ✓
- family-scoped: **179** (claimed 181) — **2 fewer**
- engine root: **127** (claimed 127) ✓ — this one is exact

The index itself flags this class of drift ("the family-module count moved 179 → 180 → 181 during the run… Re-run the glob before relying on any total here"), so the *method* warning is sound and honest. The published totals are simply not current. **Anyone quoting "308" or "181" from this file is quoting a stale number.**

`1602.00542` is now **entirely absent** — not just the ledger, but the code module too: a repo-wide filename search for `*1602-00542*` returns nothing, and the ID appears 0 times in `corpus-index.jsonl`. The index's "exactly one module has no ledger" claim no longer resolves at all.

The index's ledger-side counts also do not reproduce: it claims **1,485 of 1,511** ledgers resolve to a primary arXiv ID and **26 do not**. Recount of `docs/arxiv-program/research/2026-09-21/arxiv-deep/**/*.md` confirms **1,511** files total ✓, but resolution yields **1,471** by heading-then-`arXiv:`-fallback, or **1,447** heading-only — i.e. **40 or 64 unresolved, not 26**. The exact resolution rule the index describes ("from their `#` heading, or failing that from an `arXiv:` citation in their first 12 lines") reproduces 1,471, which is 14 short of the claimed 1,485. I did not find a rule that yields 1,485/26.

### F-3. `0002-prices-probabilities-parlays.md` cites a document that does not exist

The note says the existing-research map inventories "prediction-market ecosystem triage (`docs/research/prediction-market-ecosystem-triage-2026-08-09.md`)". **That path is ABSENT.** The real research tree is `docs/arxiv-program/research/`, and no file of that name exists anywhere in the checkout. This is the `docs/research/` vs `docs/arxiv-program/research/` path error — the note's citation is unverifiable as written.

### F-4. `1548-wired-weighted-adaptive-prediction.md` cites `docs/research/cept/` — absent

The note anchors its "no overlap" argument on "`docs/research/cept/` (Baxley Causal E-Process Theory, v2.2)". **`docs/research/cept/` does not exist.** The no-overlap *conclusion* may still be right; the cited artifact backing it is not present at HEAD.

### F-5. `1552` cites `docs/research/2026-09-21/arxiv-program/state/existing-research-map.md` — wrong prefix, right file

The file is real but at `docs/arxiv-program/research/2026-09-21/arxiv-program/state/existing-research-map.md`. Same prefix defect as F-3.

### F-6. The "31 hierarchical-Bayes prop models" count is wrong

WIRING-PLAN.md:71 states "**31** hierarchical-Bayes prop models already exist in `packages/prediction-engine/src/edge-lab/`."

Actual count of `props-hb*.ts` (non-test) in that directory: **27**. Total `props-*` files of any kind: 32 (which includes `props-context-bind.ts`, `props-fire-gate.ts`, `props-juice-floor.ts`, `props-line-shop.ts`, `props-priced-edge.ts` — gates and binders, not models). Neither 27 nor 32 is 31. The 31 figure does not correspond to any obvious counting rule I could reproduce. Correct number is **27 models**.

## 5. Claims that are stale-but-true (notes understating what the repo now has)

Several 2026-09-21 paper notes assert an absence that has since been filled. The notes were honest when written; they are now wrong, in the repo's favour.

| Note | Note's claim | HEAD reality |
|---|---|---|
| `1550-angular-combining` | "no method for pooling full predictive distributions across models" | **REFUTED.** `packages/prediction-engine/src/ensemble/angular-combining.ts` + `.test.ts` exist. |
| `1548-wired` / `1552` | "no existing CRPS-weighted multi-model mixture or dependence layer" | **REFUTED.** `packages/prediction-engine/src/ensemble/` holds 20+ combination modules including `2202-11834-beta-linear-pool.ts`, `2012-01643-diversity-weighted-combiner.ts`, `2104-04918v2-weighted-quantile-combination.ts`, `2108-02082v3-regime-blender-febama.ts`, `2408-00785v4-kairosis-forecast-aggregation.ts`. |
| `0276-kellybench` | "New capability — no existing coverage" for a walk-forward full-season log-wealth sim | **REFUTED.** `packages/prediction-engine/src/2604-27865v1-kellybench-a-benchmark-for-longhorizon.ts` implements exactly "GSEBench: a KellyBench-style walk-forward season simulator … settle → log-wealth." Its own header is honest: "**Not wired into any live model path**." |
| `2022-managed-geo-distributed-feature-store` | "GSE's pipeline has no centralized feature layer" | **PARTIALLY REFUTED.** `packages/prediction-engine/src/edge-lab/asof-store.ts` exists (`AsOfFeatureStore`), wrapped live per IMPLEMENTED.md:256. Still no *distributed* store, so the note's actual subject (geo-distributed feature store) is correctly scoped as unbuilt. |

Note the recurring pattern: the modules carry explicit `Not wired into any live model path` headers. Existence ≠ adoption, and the repo says so on the file face. That is good doctrine and it held up.

## 6. Claims I could NOT verify (honest limits)

- **Every test count** in IMPLEMENTED.md (354/354, 209/209, 5837/5837, 5951/5951, 170/170, 168 passed, etc.) — I confirmed the test *files* exist but did not execute any suite. Task was read-only; running the suites is out of scope. These remain **CLAIMED**.
- **Every commit SHA** in IMPLEMENTED.md (85f2b37, 62ff528, 00e2826, 97c33e7, …) and the PR numbers (#872, #870, #914, #916) — verifying these requires git, which the task forbade. **CLAIMED.**
- **Numeric gates** in BUILD-QUEUE.md and the arxiv-deep notes are paper/ledger acceptance criteria, not repo state. I quoted them but did not attempt to evaluate them — no build was executed.
- **NGS playbook gates** (Brier skill ≥ 0.9, ≥5pp, ≥80% recall at 20% FPR, etc.) — these are proposals in a 2026-09-21 spec. NGS-11/12 were later built (Wave 5), but no gate results file exists in the checkout, so the gates are **UNEVALUATED**.

## 7. What this means for the ledger

1. **`IMPLEMENTED.md` Waves 0–6G is the trustworthy document.** 55 of 56 named paths verified present; the one miss (V8) is a path typo, not a missing build. Its "not wired / needs human call" markers are accurate, not stale.
2. **`WIRE-IN-PLAN.md` is exact.** Every count it publishes (1,251; all six bucket counts; all four doctrine counts) reproduces at HEAD with zero drift. It also self-documents how to re-verify.
3. **`RESCUE-2026-09-26` is a branch claim, not a HEAD claim.** Do not cite `packages/verifier` at HEAD.
4. **`MASTER-PAPER-INDEX.md` totals are stale** (306 not 308; 179 not 181; 40–64 unresolved ledgers not 26) and its `1602.00542` example is fully gone. Re-run its glob before quoting any number.
5. **The `docs/research/` vs `docs/arxiv-program/research/` prefix error is systemic**, affecting at least F-3, F-4, F-5 and the `arxiv-IMPL.txt` path list itself. Any note citing `docs/research/2026-09-21/...` should be treated as an unverified citation until the prefix is checked.
6. **The paper notes' "gap" claims decay fast.** Three of the twenty already name capabilities the repo has since built. Absence-claims in dated research notes have a short half-life; presence-claims from `IMPLEMENTED.md` have held.

## 8. Method and honesty notes

- Verification was by real filesystem check (`ls` / `find` / `python` glob+regex) against `Sports-wt-intel` at HEAD. No memory, no guessing, no repo writes.
- Where a count could be reproduced by more than one rule (e.g. `props-hb` models, ledger resolution), I tried the rules the source document itself named and reported the rule that reproduced or failed to reproduce the number.
- I did not resolve F-2's 1,485/26 ledger-resolution claim in a direction that indicts the index author; I found a named rule giving 1,471 and could not find one giving 1,485. The claim is reported as not-reproducible, not as fabricated.
- Two entries in `arxiv-IMPL.txt` have wrong names (`0349-dotnet-` prefix, `MASTER-PAPER-INDEX.md` location). I resolved both to the real files rather than dropping them.