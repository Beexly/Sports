# [0892] Dynamic Ranking with the BTL Model: A Nearest Neighbor based Rank Centrality Method (arXiv:2109.13743v2)

**Citation:** Eglantine Karlé, Hemant Tyagi (2023). *Dynamic Ranking with the BTL Model: A Nearest Neighbor based Rank Centrality Method*. arXiv:2109.13743v2 [math.ST] — Inria / Univ. Lille.
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2109.13743v2.pdf; substantive full read of abstract, setup, Algorithm 1, Theorems 1–2 and main results, all experiments (synthetic + NFL), and related-work discussion (proof appendices read at statement level).
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — Dynamic Rank Centrality (time-windowed union graph → Rank Centrality transition matrix → leading left eigenvector) is the cheapest principled dynamic rating method in the corpus: same accuracy as the kernel-MLE competitor (Bong et al.) at a fraction of the compute (e.g., n=100/T=150: 13.2s vs 66.0s), theoretically optimal window δ* ≃ T^{2/3}, and on NFL 2009–2015 its strengths correlate with Elo ratings far better than MLE's (0.284–0.518 vs −0.337–0.092). Directly portable to GSE's in-season rating engine.
**Replacement context:** Fresh-search replacement (corrected fielded arXiv API search, 2026-09-21: paired comparison + sports) for fresh candidate 2512.15269v1, which at finalization was found to already have an ADAPT ledger (1051, wave2-reader-19) — duplicate discovered at ledger time, replaced rather than double-counted. Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Authors: Eglantine Karlé, Hemant Tyagi (Inria, Univ. Lille, CNRS). arXiv v2 dated 2023-07-12. Theory + experiments paper; code at github.com/karle-eglantine/Dynamic_Rank_Centrality.

## Research question
How do you recover time-varying latent strengths w*_t in a Bradley–Terry–Luce model when each time slice's comparison graph is too sparse (possibly disconnected) to identify strengths on its own — with non-asymptotic guarantees?

## Dataset / schema
- Synthetic: GP-generated strengths (n=100/400, T=10–150 grid, Erdős–Rényi comparison graphs, L=5 comparisons per edge), 60 Monte Carlo runs.
- Real: NFL 2009–2015 from the nflWAR package — n=32 teams, T=16 rounds/season, binary outcomes y_ij(t).
- Schema: (round t, team i, team j, outcome).

## Method
- **Dynamic Rank Centrality (Algorithm 1)**: (1) form the time-neighborhood N_δ(t) = {t′ : |t−t′| ≤ δ/T}; (2) build the union graph G_δ(t) over the neighborhood; (3) compute locally averaged win fractions ȳ_ij(t); (4) form the Rank Centrality transition matrix P̂(t) (eq. 2.5) with normalization d_δ(t) ≥ d_max; (5) output the leading left eigenvector π̂(t) as the strength estimate.
- Bias–variance trade-off in δ: variance shrinks as δ grows (more averaging), bias grows as O(δ/T) via the Lipschitz smoothness assumption (Assumption 1: |y*_ij(t) − y*_ij(t′)| ≤ M|t−t′|).
- Theoretically optimal window: δ* ≃ T^{2/3}, giving ℓ_2 rate O(T^{−1/3}).

## Equations / math / assumptions
- BTL: P(j beats i at t′) = w*_{t′,j}/(w*_{t′,i}+w*_{t′,j}); L comparisons per edge.
- Local average: ȳ_ij(t) = |N_ij,δ(t)|^{−1} Σ_{t′∈N_ij,δ(t)} y_ij(t′).
- Transition matrix P̂(t) from ȳ (eq. 2.5); true strengths π*(t) = w*_t/‖w*_t‖_1 are the stationary distribution of the population matrix P̄(t) (detailed balance).
- Theorem 1 (ℓ_2): ‖π̂(t)−π*(t)‖_2/‖π*(t)‖_2 ≤ bias O(Mδ|E|/T·…) + variance O(√(N_max d_max/(L N²_min))), w.p. ≥ 1−O(n^{−10}).
- Theorem 2 (Erdős–Rényi case): explicit δ* ≃ T^{2/3} → O(T^{−1/3}) ℓ_2 rate; static case recovers the Negahban/Chen et al. O(1/√(Lnp)) rate.
- ℓ_∞ bounds in §3.2/§5 (same T^{−1/3} pointwise rate, matching Bong et al.).
- Assumptions: Lipschitz-smooth outcome probabilities; union graph G_δ(t) connected; L fixed per edge (uniform grid for simplicity, extendable).

## Features / target
- Features: pairwise outcomes in the time neighborhood.
- Target: normalized strength vector π*(t) / ranking at time t.

## Validation
- Synthetic: DRC ≈ MLE (Bong et al. kernel-smoothing + proximal gradient) on ℓ_2, ranking error D_π*, and ℓ_∞ across T=10–150; Borda-count baseline slightly worse.
- Speed: DRC dramatically faster — n=100, T=150: DRC 13.2±0.19s vs MLE 65.99±5.97s; n=400, T=100: DRC 59.58±2.28s vs MLE 551.54±56.71s (eigenvector vs optimization).
- NFL 2009–2015: LOOCV tuning of δ per season (prediction error ‖y_ij(t) − π̃_j/(π̃_j+π̃_i)‖²); top-10 vs Elo similar for all methods; DRC strengths correlate with Elo ratings 0.284–0.518 across 2011–2015 vs MLE −0.337–0.092; Kendall rank correlations with Elo ranks similar and low for all methods (−0.201 to 0.245).

## Exact results with baselines
- Optimal-δ check: numerically optimal δ coincides with theoretical δ* ≃ T^{2/3} (paper's Fig. 4).
- Runtime table (seconds): see above — roughly 5–10× faster than MLE.
- NFL strength–Elo correlations: DRC 0.425/0.518/0.284/0.478/0.414 (2011–2015) vs MLE 0.092/−0.237/−0.337/−0.026/0.002.
- Competitor: Bong et al. [2] kernel-MLE (the only other theoretically analyzed dynamic-BTL method).

## Code / data availability
Code: https://github.com/karle-eglantine/Dynamic_Rank_Centrality. NFL data via the nflWAR R package (public).

## Leakage
- δ tuned by LOOCV on the same season evaluated (honest model selection, but the reported correlations are post-selection).
- Elo used as "ground truth" for the NFL evaluation — Elo is itself a model, so the correlation comparison favors methods structurally similar to Elo.

## Limitations
- Lipschitz smoothness is a strong assumption — breaks at regime changes (injuries, coaching changes mid-season).
- Theory needs the union graph connected; sparse early-season data may violate it.
- L fixed per edge and uniform grid are simplifications (authors note extensions are straightforward but unproven).
- Proof appendices (Sections 4–5, D, E) read at statement level; line-by-line verification of every inequality not performed — the theorems are reported as stated.

## GSE overlap vs existing-research-map
Existing-research-map.md has no dynamic-rating paper with theoretical guarantees; in-play/live modeling is listed as thin (gap #7). GSE's ratings are updated sequentially but without a principled window/forgetting analysis. This is the corpus's only spectral dynamic-ranking method — novel, and cheaper than any optimization-based dynamic rating in the corpus.

## Implementation spec (GSE adaptation)
- **What to build:** a GSE dynamic rating service: per-week union graph over a trailing window, Rank Centrality eigenvector for team strengths, δ chosen by the paper's T^{2/3} rule (tuned by LOOCV on GSE data); serve weekly strength + rank with the ℓ_∞ bound as a published uncertainty envelope.
- **Why spectral:** the 5–10× speed advantage over MLE matters for GSE's rebuild-every-week pipeline and for Monte Carlo over rating uncertainty.
- **Effort:** 1 week to port (numpy/scipy eigenvector); 1 more week for the LOOCV δ tuner.

## Reproducible test
- Clone the authors' repo; reproduce the NFL 2011–2015 strength–Elo correlation table; then run DRC on GSE's 2024 NFL weekly data with LOOCV δ and compare week-ahead log-likelihood vs GSE's current rating.

## Numeric gate
- ADAPT confirmed if DRC's week-ahead log-likelihood on 2024 NFL is within 0.005/game of GSE's current rating AND DRC rebuild time is ≥3× faster. Speed parity alone justifies the port given the theory.

## Improvement experiment
- **Adaptive δ:** let the window shrink after detected regime changes (blowout losses, QB injury) and expand in stable periods — a change-point-aware δ(t). Success: adaptive-δ beats fixed-δ* on rolling week-ahead log-likelihood over a season.

## Verdict
**ADAPT** — The rare combination of non-asymptotic theory, a 5–10× speed win over the only competitor, and a real NFL demonstration where its strengths track Elo far better than MLE's. The δ* ≃ T^{2/3} rule gives GSE a principled forgetting window instead of a hand-tuned K-factor schedule.
