# 1052 — Real-time forecasting within soccer matches through a Bayesian lens

## Citation / full-text source

- arXiv:2303.12401v2 — full text: https://arxiv.org/pdf/2303.12401
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2303.12401v2
- **Full-text URL**: https://arxiv.org/pdf/2303.12401v2
- **Authors**: Chinmay Divekar, Soudeep Deb, Rishideep Roy
- **Lane**: bayesian_statespace
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 2606.26497v1 ("Learning Probabilistic Filters with Strictly Proper Scoring Rules", PSEF ensemble data assimilation) — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, fixture congestion, and Bayesian in-play territory. From the deduped candidate pool, 2303.12401v2 was selected because (a) it is a full Bayesian in-match win-probability framework with minute-indexed Gibbs sampling, (b) it uses 3,040 real matches with starting-XI strength and live events, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2303.12401` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v2 PDF text via pdftotext: 31 pages, 1,892 lines — abstract, Bayesian ordered multinomial probit specification, 90 minute-indexed Gibbs models, starting-XI strength construction, live-event covariates, 3,040 EPL matches 2008/09–2015/16, the 90/10 train-test split, minute-by-minute sensitivity results, conclusions, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

At each minute of a soccer match, what are the win/draw/loss probabilities given the pre-match team strengths and everything that has happened so far?

## Summary

The paper builds a Bayesian **in-match** forecasting system for soccer: at each minute of the match, what are the win/draw/loss probabilities given the pre-match team strengths *and everything that has happened so far*? The model is an ordered multinomial probit fit separately for each of the 90 minutes via Gibbs sampling, with covariates for starting-XI strength and live events (goals, red cards, etc.). On 3,040 English Premier League matches (2008/09–2015/16), minute-75 sensitivity reaches **0.781 (win), 0.635 (draw), 0.632 (loss)**.

The headline methodological weakness — which GSE must fix rather than inherit — is the **90/10 train-test split that is not chronological**: a random 10% holdout in a time-series sport leaks future information into "past" training. GSE's adaptation replaces this with rolling-origin validation. Core GSE lesson: **a minute-indexed Bayesian win-probability surface, conditioned on lineup strength and live events, is the right architecture for live betting — but only under chronological evaluation.**

## Method

- 90 separate Gibbs-sampled models (one per minute index), each conditioning on the game state at that minute.

- Covariates: pre-match starting-XI strength differential, current score, red cards, and other live events.

- Sensitivity (recall) reported per outcome class at each minute; minute-75 values 0.781/0.635/0.632.

## Equations / assumptions

- Ordered multinomial probit: latent \(z = X\beta + \varepsilon\), \(\varepsilon \sim N(0,1)\); observed outcome = loss/draw/win via cutpoints \(\gamma_1 < \gamma_2\).

## Features / target

Inputs: minute index; pre-match starting-XI strength differential; current score; red cards and other live events.

Target: win/draw/loss probabilities at each of the 90 minute indexes.

## Validation

90/10 train-test split on 3,040 EPL matches (2008/09–2015/16).

Evaluation: sensitivity (recall) per outcome class at each minute.

Caveat (the paper's central evaluation flaw, flagged in the ledger): the 90/10 split is non-chronological — a random holdout in time-ordered data leaks future information into training. GSE's adaptation replaces it with rolling-origin validation.

## Exact results / baselines

Minute-75 sensitivity: 0.781 (win), 0.635 (draw), 0.632 (loss).

Baselines: a static pre-match-probability-plus-score baseline (the numeric-gate comparator the live model must beat once evaluation is chronological).

## Code / data

Not stated in the paper.

## Dataset / schema

- 3,040 EPL matches, seasons 2008/09–2015/16.
- Starting lineups (XI strength), minute-level event data.

## Implementation (GSE adaptation)

1. **Live win-probability engine (soccer first, NFL second)**: the minute-indexed ordered-probit architecture ports directly to GSE's live markets. **Implementation**: (a) replace the 90/10 random split with rolling-origin validation (train on seasons < t, test on season t); (b) build drive-/play-indexed probit models for NFL using nflverse play-by-play (down, distance, yardline, score, time replace minute index and events); (c) starting-XI strength becomes pre-game team strength + inactive/lineup adjustments.
2. **Evaluation protocol fix**: never trust the paper's 90/10 numbers as an upper bound — the random split is optimistic. Re-run everything chronologically; expect draw-class sensitivity to drop.
3. **Draw modeling**: the ordered probit naturally handles the three-outcome structure — relevant to soccer 1X2 and to NFL derivatives with push/draw possibilities.

**Implementation difficulty** (folded in from the original standalone section):

Medium. Gibbs sampling for ordered probit is textbook; the work is in the data pipeline (minute/play-indexed game states) and the rolling-origin harness. The 90-model structure should be replaced by a hierarchical model in GSE's version.

## Leakage

- **The 90/10 split is non-chronological**: random holdout in time-ordered data means the model trains on future matches to predict past ones. This is the paper's central evaluation flaw; the adaptation must not inherit it.
- Live-event covariates are genuinely known at each minute index (no within-match lookahead), so the architecture itself is clean.

## Limitations

- Non-chronological evaluation (above) — the reported sensitivities are optimistic.
- 90 separate models is computationally heavy and ignores smoothness across minutes (a hierarchical minute structure would be better — a GSE improvement).
- Draw sensitivity (0.635) lags win sensitivity substantially; draws remain hard.
- EPL-only; no odds/market comparison.

## GSE overlap

None in the tracked corpus. The map covers in-game soccer win probability (1906.05029) and conformal win probability (2208.08598) — but **neither uses a Bayesian ordered-probit with minute-indexed Gibbs models and starting-XI strength**. The Drive conformal-prediction audit covers post-hoc calibration, not the live generative model. Novel architecture for the corpus.

## Reproducible test

- Refit the minute-75 ordered probit on the EPL data under the paper's 90/10 split; verify sensitivities ≈ 0.781/0.635/0.632.
- Re-run under rolling-origin validation (train ≤2013/14, test 2014/15–2015/16); document the optimism gap — this quantifies the leakage.

## Numeric gate

**ADAPT iff the architecture survives chronological evaluation: under rolling-origin validation on EPL (or NFL play-indexed port), the minute/play-indexed Bayesian probit must beat a static pre-match-probability-plus-score baseline on log-loss;** if the live model adds nothing once the split is chronological, the adaptation fails.

## Improvement experiment

(1) Replace 90 independent models with a hierarchical Bayesian structure (minute-level coefficients shrunk toward neighbors); (2) port to NFL with play-indexed probits on nflverse (down/distance/yardline/score/time covariates); (3) add market-odds as a covariate to test whether live events add information beyond the price. Success criterion: hierarchical model matches or beats the 90-model log-loss at a fraction of the compute, and the NFL port beats the pre-match baseline on rolling-origin log-loss.

## Verdict

**ADAPT** — The right live-probability architecture (minute-indexed Bayesian ordered probit with lineup strength and events, 0.781 win sensitivity at minute 75) married to the wrong evaluation (non-chronological 90/10 split). GSE adapts the architecture, replaces the evaluation with rolling-origin validation, and ports it to NFL play-indexed win probability.
