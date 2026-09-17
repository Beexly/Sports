# Research audit — partial, not complete

## Scope and provenance

User requested independent research of every topic in spreadsheet `1Gv3hFGPEdgez1uK87jNmsnGLwXyJVodhurYa9qle1AU`, including all four exported tabs, and repository improvements backed by tests. Direct anonymous export returned HTTP 401. Opening the authenticated XLSX export in existing Chrome succeeded; fresh download `gse_research_analysis (1).xlsx` yielded SHA-256 `a418ffb72c8d1db341da1b062758028584eae0759aa537a23af75cc909df1e5b`. Parsed snapshot: `live-export.json`. The earlier local exports omitted two tabs and were not sufficient on their own.

Ranked and triage tabs contain the same 1,343 distinct literal IDs. Original tiers (not independently validated relevance judgments): High 58, Medium 402, Low 882, Unresolved 1. All 58 High IDs match the dossier tab. Build Plan has 24 nonempty rows after its heading, including context/headings rather than 24 independently actionable recommendations. Its mention of approximately 50 additional Pass-3 IDs is NOT an inventory of those IDs; their absent referenced separate document remains a reconciliation gap. Never claim those citations are reviewed.

## Completed layer: metadata, not research completion

`coverage.json` resolves 1,343/1,343 IDs against the official arXiv API. Raw XML is retained under `arxiv-metadata/`, with hashes in each metadata record. One HTTP429 batch succeeded on a later retry. The initially unresolved source row `cs/0210021` resolved; missing source title caused a reproducible KeyError, repaired without changing the literal ID. Metadata flags: 40 normalized-title mismatches needing contextual review; 3 withdrawal notices needing source-level disposition; 1 source claim of unresolved metadata contradicted by retrieval. A title change alone does not establish fabrication.

Confirmed withdrawal comments: 2312.11067, 2503.08883, 2412.18204. FightTracker's short-window profit result is explicitly disclaimed by its author after longer evaluation. The build-plan tab already warned about this; do not portray every correction as newly discovered by us.

## Deep source/code reviews delivered

Six reports exist: 1701.05976, 2208.08598, 2608.12291, 2311.03490, 1710.02824, 2008.01485. They contain source citations, exact equations/results, availability checks, existing-code mapping and new-build deltas. They are NOT six reproduced experiments or independently checked mathematical proofs. The per-row machine registry deliberately still says NOT_REVIEWED until review acceptance is recorded, rather than silently inferring completion from file presence.

Material findings needing implementation judgment:

- 1701.05976 models Gaussian observations of normalized-moneyline LOGITS, not normal score margins. Main sampler settings are 40k draws after 4k burn-in, not the dossier's 20k/2k. Public driver references missing/restricted dependencies. Existing GSE outcome-likelihood particle filter is related but not the paper model.
- 2208.08598 uses augmented-refit signed-residual full conformal predictive distributions, not a frozen generic calibration wrapper. The dossier omits the candidate's own residual/tie term. Conformal coverage is not calibrated point probability or proof of predictive edge.
- 2608.12291 is originally Low tier, not a High dossier. Optimal stopping assumes a true posterior martingale and specified costs; it does not establish a useful pregame lock policy or CLV uplift.
- 2311.03490's grouped/full-model bootstrap and decision stability are not equivalent to resampling already-fitted calibration predictions. Existing bootstrap-calib-ci.ts is IID; a separate stationary bootstrap module exists.
- 1710.02824 studies cross-book price discrepancies, not a CLV-versus-Brier relationship. Its reported monetary totals and live ROI require careful reconciliation, not unconditional endorsement.
- 2008.01485 studies economic crowd forecasts, not sports-market efficiency; it does not support the build plan's cited inference.

`deep/clv-local-diagnostic.py` and JSON document no usable joined local rows for CLV + locked model probability + settled outcome within the inspected artifacts. That diagnostic is NOT_RUN, not a null association. No production DB export was performed.

## Real tests and branch distinction

Audit branch starts from `origin/main` at `2676759b0`; first audit commit `449434a76`. Original workspace was `hermes/last-plan-2026-09-15` at `992424b2c`; its test failures must NOT be automatically attributed to main. Fresh audit-branch targeted runs after dependency installation: ingestion publication/series tests 11/11 pass; metric-source-payload-rights 8/8 pass. Earlier no-deps invocations and an invalid reporter invocation were startup failures, not test outcomes. An initial npm-ci run failed ENOSPC; piping to tail masked its exit code. npm cache verify garbage-collected unused cache, and a subsequent unpiped npm ci succeeded (821 packages). Full `npm test` is running with exact command/head/exit recorded in `test-suite.result.json` when finished; do not claim full green from targeted tests.

## Remaining acceptance criteria

Every ID needs independent relevance reassessment, primary-source claim review, limitations/data-rights checks, repo mapping, and an explicit disposition. Low-ranked and unresolved inputs are not excluded. Every actionable build-plan row needs its own falsifiable recommendation and dependency disposition. Empirical claims need executable artifacts and real available data; absent inputs produce NOT_RUN, never synthesized results. Any production change requires focused regression tests, repo guards, and preserved frozen model/gates. No betting, publishing, deployment, DB mutation, pricing, environment flags or frozen paths changed by this audit.

This file is a checkpoint, not an assertion that the exhaustive user request is finished.
