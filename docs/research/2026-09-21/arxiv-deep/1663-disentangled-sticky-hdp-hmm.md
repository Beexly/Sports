# 1663 Disentangled Sticky Hierarchical Dirichlet Process Hidden Markov Model (arXiv:2004.03019)

**Citation:** Zhang, et al. *Disentangled Sticky Hierarchical Dirichlet Process Hidden Markov Model*. arXiv:2004.03019 (2020). Code: https://github.com/zhd96/ds-hdp-hmm
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text; Sections 1–6 including the disentangled stickiness construction, Gibbs samplers, synthetic experiments, rat/mouse neural applications, and complexity analysis read in full). Not an abstract-only read.
**Verdict:** ADAPT — the disentangled stickiness (separating transition similarity, mean self-persistence, and state-specific persistence variation) is the right nonparametric regime model for GSE's unknown-number-of-game-states problem, but the O(TK²) cost and neural-data-only validation demand an NFL-scale pilot before commitment.

## 1. Research question

Can the sticky HDP-HMM be fixed by disentangling three confounded quantities — similarity of transition rows, average self-persistence, and state-to-state variation in self-persistence — so that the model learns an unknown number of states with heterogeneous durations without the sticky HDP-HMM's tendency to over- or under-segment?

## 2. Method/model

Disentangled sticky HDP-HMM (DS-HDP-HMM): keeps the HDP prior over transition rows (shared sparsity pattern) but models self-persistence separately per state via a Beta prior on the self-transition probability, disentangled from the shared transition component. Two Gibbs samplers: direct-assignment and weak-limit (truncated) versions. Evaluated on: (a) synthetic multinomial and Gaussian emissions, 10 datasets per setup, vs HDP-HMM and sticky HDP-HMM on held-out negative log-likelihood and normalized Hamming distance; (b) rat hippocampal data — 100 neurons, 10 Hz, ~36k frames, first 8k split 4k train/4k test, Poisson emissions, L=200 truncation, 7 chains × 15,000 iterations (11,000 burn-in); (c) mouse decision-making data — 1,126 trials × 189 frames at 30 Hz, 99-dim autoencoder representation, 100 trials train (~20k frames), 30 trials test (~6k), L=40, 7 chains × 10,000 (9,000 burn-in).

## 3. Mathematics/equations/assumptions

- HDP prior: β ~ GEM(γ); π_j ~ DP(α, β) (shared transition sparsity).
- Disentangled stickiness: self-transition probability κ_j ~ Beta(a, b) per state j, separate from the DP-distributed off-diagonal transitions; the full row is a mixture of the sticky self-component and the shared π_j.
- Weak-limit truncation at L states with symmetric Dirichlet(α/L) approximating the DP.
- Gibbs updates: state sequence by forward-backward; κ_j by Beta–Binomial conjugacy on self-transition counts; β, π by standard HDP auxiliary-variable updates.
- Complexity: O(TK²) per sweep vs O(T²K + TK²) for a general HSMM — the disentanglement buys explicit-duration-like flexibility at HMM cost.
- Assumptions: Markov latent chain; emissions conditionally independent given state; truncation L adequate; label-switching handled by post-hoc alignment.

## 4. Dataset/schema

- Synthetic: multinomial and Gaussian emissions, 10 datasets per configuration.
- Rat: 100 simultaneously recorded neurons, 10 Hz calcium/spike data, ~36,000 frames; analysis on first 8,000 (4,000 train / 4,000 test); Poisson emissions.
- Mouse: 1,126 trials × 189 frames at 30 Hz; 99-dimensional autoencoder latent representation of video; 100 trials (~20k frames) train, 30 trials (~6k frames) test.

## 5. Features and target

- Synthetic: discrete/continuous emissions with known true state sequences.
- Rat: 100-dim neural count vectors; target = held-out likelihood + state recovery.
- Mouse: 99-dim behavioral latents; target = held-out likelihood + interpretable state count.

## 6. Validation design

- Synthetic: 10 datasets per setup; held-out negative log-likelihood and normalized Hamming distance vs true states; comparison vs HDP-HMM and sticky HDP-HMM.
- Neural: train/test splits (4k/4k frames rat; 100/30 trials mouse); 7 chains; test NLL; significance of improvement over sticky HDP-HMM.

## 7. Exact results and baselines with numbers

- Synthetic: DS-HDP-HMM beats both HDP-HMM and sticky HDP-HMM on held-out NLL and Hamming distance across multinomial and Gaussian setups (exact per-setup numbers in paper tables; consistent wins).
- Rat data: test NLL advantage over the sticky HDP-HMM significant at p < 0.05; DS model recovers cleaner spatial/temporal state structure.
- Mouse data: DS-HDP-HMM infers 22 states vs 16 for the parametric ARHMM baseline, with lower test NLL — captures finer behavioral segmentation.
- Complexity: O(TK²) per Gibbs sweep — feasible for T ~ tens of thousands with moderate K.

## 8. Code/data availability

Code: https://github.com/zhd96/ds-hdp-hmm. Neural datasets are lab-collected (not public); synthetic generation described.

## 9. Leakage and limitations

- No sports or non-neural real data — generalization to NFL observables unproven.
- Gibbs sampling with 7 chains × 10–15k iterations is expensive; convergence diagnostics for HDP models are weak.
- Truncation L=200/40 is a tuning choice; label switching complicates state interpretation across chains.
- Heterogeneous-duration modeling is implicit (via κ_j), not explicit like HSMM — very long regimes may still be mis-split.
- Normalized Hamming distance on synthetics depends on the simulation favoring the model's assumptions.

## 10. GSE overlap

GSE's regime work (ledger 1654's fixed-K copula HMM; Kalman/particle filters) either fixes K or uses continuous states. DS-HDP-HMM is the nonparametric complement: unknown number of game/team regimes with state-specific persistence — e.g., how many distinct offensive "modes" a team has, with some modes sticky (ball-control) and others transient (2-minute drill). New territory for GSE's regime modeling.

## 11. Implementation specification

- Build `gse.regimes.DSHDPHMM` (port the authors' Gibbs code or reimplement in numpyro): inputs = per-drive or per-game team observables (EPA/play, pass rate, explosiveness, pace); Poisson/Gaussian emissions; weak-limit L=50.
- Fit per team-season on 2018–2024; extract state sequences; characterize states by emission means and κ_j (persistence).
- Feed inferred state indicators + κ_j into GSE's matchup and live models as regime features.

## 12. Reproducible test

- nflverse 2018–2024 drive-level data: fit DS-HDP-HMM per team-season (train 2018–2022, test 2023–2024).
- Test A: held-out NLL vs sticky HDP-HMM and fixed-K HMM — require DS best in ≥60% of team-seasons.
- Test B: state-count sanity — median inferred K across team-seasons in [3, 12]; κ_j spread (max−min) > 0.3 in ≥50% of fits (heterogeneous persistence actually used).
- Test C: predictive — next-drive points regression on state dummies; jointly significant (p<0.05) in pooled test.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** DS-HDP-HMM wins held-out NLL vs sticky HDP-HMM in ≥60% of team-seasons AND inferred κ_j shows real heterogeneity (spread > 0.3 in ≥50% of fits). Fail → REJECT (fixed-K HMM from 1654 suffices).
- **Improvement experiment:** (i) runtime pilot: one full Gibbs fit must finish in < 2 hours on a team-season — else explore variational alternatives; (ii) hierarchical extension sharing states across teams (HDP over teams) — expect better small-sample state estimates; (iii) compare regime features' lift in GSE's live WP model — target ≥ 0.002 Brier improvement.

**Verdict:** ADAPT — disentangled sticky HDP-HMM is the principled nonparametric regime model for GSE's game-state discovery, but it must prove itself on NFL drive data (held-out NLL wins + heterogeneous persistence + tractable runtime) before replacing fixed-K approaches.
