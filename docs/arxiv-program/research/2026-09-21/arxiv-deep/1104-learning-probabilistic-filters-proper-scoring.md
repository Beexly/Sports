# [1104] Learning Probabilistic Filters with Strictly Proper Scoring Rules (arXiv:2606.26497v1)

**Citation:** Eviatar Bach, Ricardo Baptista, Jochen Bröcker, and Bohan Chen (2026). *Learning Probabilistic Filters with Strictly Proper Scoring Rules*. arXiv:2606.26497v1. URL: https://arxiv.org/abs/2606.26497v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — train neural state-space filters with proper scoring rules (energy score) instead of log-likelihood; directly applicable to GSE's Bayesian/state-space forecasting lane.

## 1. Research question
Can a neural-network ensemble filter (for state estimation in dynamical systems) be trained with strictly proper scoring rules rather than likelihood-based losses, and does it beat classical particle/bootstrap filters?

## 2. Dataset / schema
Simulated trajectories from canonical dynamical systems; no real-world data. Training uses M=8192 trajectories of length J=60. Experiments: linear-Gaussian (state dim 20, observation dim 10, ensemble N=10); Lorenz '63 (3/1); Lorenz '96 (40/10). Reference: doubling-angle bootstrap particle filter with 10^6 particles. ML trains at N=30 and tests N∈{10,30,100,300}; classical methods run up to N=3000.

## 3. Method / model
Neural network ensemble filter: network maps an ensemble of particles to a filtered posterior ensemble. Training objective is a strictly proper scoring rule (energy score with exponent β∈(0,2)), computed over the training trajectories, rather than log-likelihood. Architecture/hyperparameters: not fully recorded in this read — "Not stated in paper" at the level of layer widths; re-derive from the paper's appendix before implementation.

## 4. Equations & assumptions
Energy score: E||x−y||^β − (1/2)E||x−x′||^β, strictly proper for β∈(0,2), where y is the observation-target and x,x′ are independent ensemble samples. Assumptions: training trajectories come from a known simulator (realizability); the system is a Markov state-space model; results shown are primarily qualitative/figure-based (exact metric tables not recorded — see section 7).

## 5. Features / target
Inputs: ensemble of prior state particles + new observation. Target: posterior ensemble approximating the true filtering distribution.

## 6. Validation design
Evaluation against classical filters (bootstrap particle filter, ensemble Kalman variants) on the same simulated systems across ensemble sizes. Baseline comparison is simulation-to-simulation (no held-out real data). Time ordering is inherent in the trajectory design.

## 7. Numerical results / baselines
Results are primarily qualitative/figure-based as read: the trained filter matches or beats classical filters at much smaller ensemble sizes (trained N=30 competitive against classical N up to 3000; particle-filter reference used 10^6 particles). Exact numeric scores (CRPS/energy-score values per system) were not recorded in this read — pull exact numbers from the paper's figures before citing as benchmarks.

## 8. Code / data availability
Code: https://github.com/wispcarey/Proper-Scoring-Ensemble-Filter. Data are simulated, reproducible from the repo.

## 9. Leakage & limitations
Realizability assumption: trained on the same simulator it is tested on — simulator mismatch is the main deployment risk. Finite-network consistency caveats. Baseline grid-search effort unstated (classical filters may be under-tuned). Dimensionality caveats: results on low-dim systems (3–40 dim); high-dimensional scaling unproven. No real-world sports data used anywhere.

## 10. GSE overlap
New capability: GSE's state-space/Bayesian lane exists (per the existing-research map), but training state-space filters with proper scoring rules on NFL tracking-like trajectories is not covered. Cite `~/workspace/arxiv-sweep/existing-research-map.md` — Bayesian/state-space area. Not duplicative.

## 11. GSE implementation spec
(a) Generate synthetic NFL trajectory data (player-tracking-like states) or use short-horizon game-state dynamics (score/timeouts/field position as the dynamical system); (b) implement the neural ensemble filter in PyTorch per the repo's training loop; (c) train with energy score (β=1) on M trajectories of length J; (d) benchmark against bootstrap particle filter and ensemble Kalman filter on held-out simulated games; (e) serve as a probabilistic game-state updater inside the live-pick engine. Effort: ~1-2 engineer-weeks including port from the repo code.

## 12. Reproducible test
Dataset: replicate the Lorenz '96 (40/10) experiment from the public code at fixed seed. Metric: energy score on held-out trajectories. Baseline to beat: the paper's bootstrap particle filter with N=3000 — a reproduction is accepted if it matches the paper's qualitative ordering (NN filter at N=30 ≥ classical at N≤300) within one standard error over 5 seeds.

## 13. Acceptance / rejection gate
ADAPT into a GSE game-state module if the energy-score-trained NN filter matches the particle filter within 5% energy-score on simulated NFL game-state trajectories with N≤100 at inference time; REJECT if it needs N≥1000 or if simulator mismatch degrades it beyond 10%.

## 14. Improvement experiment
Train on a *misspecified* simulator (train on Lorenz '96, test on a perturbed variant with 10% parameter drift) and add an online recalibration head that re-weights the ensemble by recent observation likelihoods — this directly attacks the paper's realizability assumption and measures the real-world robustness gap before any GSE deployment.
