# [0889] Modelling rankings in R: the PlackettLuce package (arXiv:1810.12068v2)

**Citation:** Heather L. Turner, Jacob van Etten, David Firth, Ioannis Kosmidis (2019). *Modelling rankings in R: the PlackettLuce package*. arXiv:1810.12068v2 [stat.CO] — version dated 2024-12-15; Journal of Statistical Software.
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-1810.12068v2.pdf, read in full from the introduction through the final references (extraction tail verified to end in references; no unread sections remain).
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the generalized Plackett–Luce machinery the paper ships (subset rankings, arbitrary-order ties via Davidson–Luce, pseudo-comparison regularization for disconnected networks, quasi-standard errors, Plackett–Luce trees for subgroup splits) is a production-grade toolkit for GSE's ranking problems; the NASCAR example (36 races, 87 drivers) and the 5,000-sub-ranking benchmark (18.1s fit / 14.8s covariance) give honest performance bounds.
**Replacement context:** Fresh-search replacement (backup candidate from the 2026-09-21 web search; query family: Plackett–Luce sports) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Authors: Heather L. Turner, Jacob van Etten, David Firth, Ioannis Kosmidis. Published in the Journal of Statistical Software; arXiv v2 2019-09-19 with a December 2024 update. Software paper for the R PlackettLuce package.

## Research question
How do you fit Plackett–Luce models to real ranking data — with ties of arbitrary order, subset rankings, disconnected comparison networks — and get honest uncertainty and subgroup structure out?

## Dataset / schema
- NASCAR example: 36 races, 87 drivers, 42–43 drivers per race (subset rankings with ties).
- Benchmark: 5,000 sub-rankings of 10 items drawn from 100 total, ties through order 4 — fit 18.1s, covariance estimation 14.8s on a 2.10 GHz i7 / 16 GB machine.
- Schema: ranking id, item id, rank (with ties allowed), ranking-level covariates (for trees).

## Method
- Generalized Plackett–Luce for subset rankings and ties of arbitrary order; Davidson–Luce tie model (tie probability proportional to a function of the tied items' worths).
- **Pseudo-comparisons**: each item gets pseudo-comparisons against a hypothetical average item (default weight 0.5) — guarantees finite MLEs in disconnected networks and shrinks worth estimates toward equality (regularization with a clean interpretation).
- **Quasi-standard errors**: reference-free uncertainty for worth contrasts, invariant to the choice of reference item.
- **Plackett–Luce trees**: recursive partitioning on ranking-level covariates testing for parameter instability — finds subgroups with different worth structures.

## Equations / math / assumptions
- PL likelihood over (possibly tied, subset) rankings with Davidson–Luce tie handling: tie probability among a set proportional to δ·(geometric mean of worths)-type terms (exact form in the paper).
- Pseudo-comparison: augmented likelihood adds weight-0.5 pseudo-wins/losses vs a hypothetical item of average worth → finite estimates even when the comparison graph is disconnected.
- Quasi-variances: qvar_i such that Var(log ŵ_i − log ŵ_j) ≈ qvar_i + qvar_j, reference-free.
- Assumptions: Luce choice within each ranking; independence across rankings; tree splits assume the instability test's asymptotics.

## Features / target
- Features: item identities, ranking-level covariates (for trees).
- Target: worth parameters (log-worth scale), rankings, tie probabilities.

## Validation
- NASCAR: sensible driver worths with quasi-SEs; trees find era/subgroup structure.
- Benchmark: 5,000 × 10-from-100 rankings with order-4 ties — 18.1s model fit, 14.8s covariance on modest hardware.
- Explicit warnings: trees can be unstable; high-order ties cause combinatorial/memory growth.

## Exact results with baselines
- NASCAR: 36 races, 87 drivers; worth estimates with quasi-standard errors (paper's tables).
- Timing benchmark: 18.1s (fit) / 14.8s (covariance) for the 5,000-ranking simulation.
- No predictive baseline comparison (software paper; the validation is correctness + performance).

## Code / data availability
R package PlackettLuce (CRAN); NASCAR data included in the package.

## Leakage
Not applicable (descriptive/inferential software paper). Transfer note: the NASCAR application is retrodictive ranking, not forecasting.

## Limitations
- Plackett–Luce trees can be unstable (paper's own warning) — subgroup findings need validation.
- High-order ties blow up combinatorially in memory/time.
- Online/streaming estimation and spatiotemporal extensions are listed as future work, not implemented.
- R-only; GSE's stack would need a port.

## GSE overlap vs existing-research-map
Existing-research-map.md mentions Plackett–Luce only in the metric catalog ("mentioned, not deeply researched"). No PL software/methods paper is in the corpus. The pseudo-comparison regularization and quasi-SE ideas are absent from the map. Novel toolkit vs the corpus; complements 0888 (PL loss) and 0890 (multi-outcome BT).

## Implementation spec (GSE adaptation)
- **What to build:** (a) port the pseudo-comparison trick into GSE's pairwise rating models: add weight-0.5 pseudo-games vs a league-average team to stabilize early-season/disconnected ratings (expansion teams, new coaches); (b) port quasi-standard errors for publishing rating uncertainty without reference-team arbitrariness; (c) prototype PL trees on GSE's pick history with market/regime covariates to find segments where the rating model behaves differently.
- **Effort:** 1 week for (a)+(b); (c) is a 2-week prototype.

## Reproducible test
- Install the R PlackettLuce package; replicate the NASCAR fit; then apply pseudo-comparisons to GSE's 2024 NFL early-season ratings (first 4 weeks) and test whether regularized ratings beat unregularized on weeks 5–8 log-likelihood.

## Numeric gate
- ADAPT confirmed if pseudo-regularized early-season NFL ratings beat unregularized on weeks 5–8 held-out log-likelihood (any positive margin with p<0.1), OR if quasi-SEs change at least one published pick-confidence tier vs naive SEs. The trees are exploratory (no gate).

## Improvement experiment
- **Streaming PL:** implement the paper's flagged future work — an online (per-game) PL update with pseudo-comparison decay; test whether streaming worths beat batch-refit worths on rolling log-likelihood. Success: streaming wins on ≥60% of rolling 4-week windows.

## Verdict
**ADAPT** — A software paper that ships genuinely reusable machinery: pseudo-comparisons solve the disconnected-network problem GSE hits every September, quasi-SEs fix reference-arbitrariness in published uncertainties, and PL trees are a principled regime-split finder. The warnings (tree instability, tie-order blowup) are stated, not hidden.
