# [0890] Retrodictive Modelling of Modern Rugby Union: Extension of Bradley-Terry to Multiple Outcomes (arXiv:2112.11262v1)

**Citation:** Ian Hamilton, David Firth (2021). *Retrodictive Modelling of Modern Rugby Union: Extension of Bradley-Terry to Multiple Outcomes*. arXiv:2112.11262v1 [stat.AP] — University of Warwick.
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2112.11262v1.pdf, read in full.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the maximum-entropy BT extension to arbitrary finite outcome sets (p^{ij}_{a,b} ∝ π_i^a π_j^b) with the rugby implementation (wide/narrow wins, draws, losing/try bonuses, home advantage; notional-game prior of weight 4 via R gnm) is the principled template for GSE's ordinal markets (margins bands, totals bands); the 8-place mean ranking disagreement with the incumbent method shows the modeling choices actually matter.
**Replacement context:** Fresh-search replacement (corrected fielded arXiv API search, 2026-09-21: Bradley–Terry + sports) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Authors: Ian Hamilton, David Firth (University of Warwick). arXiv v1 dated 2021-12-21. Method + application paper: MaxEnt generalization of Bradley–Terry to scored outcomes, applied to English schoolboy rugby (Daily Mail Trophy).

## Research question
How do you extend Bradley–Terry — a binary-outcome model — to sports with rich scored outcome sets (rugby's try bonuses, losing bonuses, wide vs narrow wins) without losing the model's principled foundation?

## Dataset / schema
- Daily Mail Trophy (English schools rugby): 2015/16–2017/18 seasons; 2017/18 had 102 teams and 436 matches.
- Schema: date, home/away teams, points scored, outcome category (wide win / narrow win / draw / narrow loss / wide loss), try bonus (yes/no), home indicator.
- Access: competition-published results.

## Method
- **Maximum-entropy extension**: for teams i, j with strength parameters π and outcome scores a, b: p^{ij}_{a,b} ∝ π_i^a π_j^b — the MaxEnt distribution over outcome pairs consistent with the BT binary special case.
- Rugby implementation: outcome categories (wide/narrow win, draw, narrow/wide loss) × try-bonus outcomes; preferred model separates result and try-bonus while sharing team strengths; home advantage as an additive term.
- Estimation: log-linear models via R package **gnm**.
- **Symmetric prior**: notional wins/losses against a dummy team, prior weight 4 (selected for the analysis) — regularization toward parity.

## Equations / math / assumptions
- Multi-outcome BT: p^{ij}_{a,b} ∝ π_i^a π_j^b, normalized over the finite outcome set.
- Log-linear form: log p^{ij}_{a,b} = a·θ_i + b·θ_j − log Z_{ij} (+ home effect), θ = log π.
- Prior: each team gets notional results vs a dummy team with total weight 4 (shrinkage to equality).
- Assumptions: outcome categories are correctly ordered/scored; try-bonus and result processes share strengths (preferred model) — tested against the separated alternative; home advantage is constant across teams.

## Features / target
- Features: team identities, home indicator.
- Target: joint outcome category (result band × try bonus).

## Validation
- Retrodictive fit on three seasons; model comparison (shared vs separate strengths for result/try-bonus) favors the shared-strength preferred model.
- Comparison with the competition's incumbent ranking method: mean absolute ranking disagreement ~8 places, max 28 places, ~0.4 league points per match — the modeling choice materially changes published rankings.

## Exact results with baselines
- 2017/18: 102 teams, 436 matches.
- Preferred model: shared team strengths across result and try-bonus outcomes.
- Prior weight 4 (notional games vs dummy team).
- Ranking disagreement vs incumbent: mean ~8 places, max 28, ~0.4 league points/match.

## Code / data availability
R package gnm (public); rugby data as described in the paper (competition records).

## Leakage
- Explicitly retrodictive: the paper fits and compares within the observed seasons; no out-of-sample forecasting or odds test is claimed. Any forecasting use needs walk-forward validation.

## Limitations
- Retrodictive, not predictive — no walk-forward, no odds comparison, no calibration.
- Schoolboy rugby; transfer to professional leagues untested.
- The MaxEnt derivation assumes the outcome scoring (a, b) is given; choosing the scores is a modeling decision the paper does not fully automate.

## GSE overlap vs existing-research-map
Existing-research-map.md has no multi-outcome BT paper; ordinal/margin-band modeling is absent from the corpus. The map's gap list includes spread/total probability surfaces. This paper is the corpus's only principled ordinal-rating construction — novel, and the natural companion to 0885 (spread CDF) and 0884 (Elo theory).

## Implementation spec (GSE adaptation)
- **What to build:** a GSE ordinal rating model for NFL: outcome bands (e.g., win by 10+, win by 1–9, draw-equivalent, loss bands) + totals bands, using the p ∝ π_i^a π_j^b MaxEnt form with shared team strengths and a notional-games prior (weight tuned, start at 4); home advantage term; estimated via Poisson log-linear GLM (the gnm equivalent in Python/statsmodels).
- **First application:** alternative-spread/total fair pricing — the ordinal model gives coherent probabilities across all bands, unlike independent per-line models.
- **Effort:** 2 weeks for the NFL ordinal model + walk-forward harness.

## Reproducible test
- Reimplement the multi-outcome BT on the paper's rugby data structure using a public analog (e.g., English Premiership rugby results); verify the shared-strength model beats separate-strength on held-out log-likelihood; then fit the NFL band version on 2023–2024 and test walk-forward 2025.

## Numeric gate
- ADAPT confirmed if the NFL ordinal model's held-out (2025 walk-forward) log-likelihood beats a plain binary-BT baseline by ≥0.01 per game AND the band probabilities are calibrated (reliability slope 0.9–1.1). If it only matches binary BT, the coherent-band property still justifies the build for alt-line pricing.

## Improvement experiment
- **Score-informed bands:** replace the fixed band scores (a, b) with learned scores (estimate the outcome values jointly with strengths); test whether learned scores beat the paper's fixed scoring on held-out log-likelihood. Success: ≥0.005/game gain — effectively learning the "value" of a wide win vs a narrow win from data.

## Verdict
**ADAPT** — The MaxEnt multi-outcome BT is the right mathematical foundation for every ordinal market GSE prices (alt spreads, alt totals, margin bands), and the paper shows the full implementation path including the prior. Retrodictive-only is the honest limit; the walk-forward test is GSE's job.
