# [0503] Exploring the Difficulty of Estimating Win Probability: A Simulation Study (arXiv:2406.16171v5)

**Citation:** Ryan S. Brill, Ronald Yurko, and Abraham J. Wyner (2024). *Exploring the Difficulty of Estimating Win Probability: A Simulation Study*. arXiv:2406.16171v5. URL: https://arxiv.org/abs/2406.16171v5
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3,127 lines).
**Verdict:** ADOPT — game-clustered bootstrap/validation with explicitly reported interval coverage belongs in GSE's WP pipeline immediately; do not blindly copy φ = 0.35 since true real-world WP is unobservable.

## 1. Research question
Why do nominal confidence/credible intervals for win probability (WP) models undercover so badly, and can resampling schemes that respect the within-game correlation of plays restore coverage? The paper builds a "random-walk football" simulator with known ground-truth WP, fits XGBoost WP models, and benchmarks standard, cluster, randomized-cluster, and fractional randomized-cluster bootstraps.

## 2. Dataset / schema
Fully simulated (no real NFL data in the estimation experiments):
- Random-walk football: T = 56 plays per game, L = 4 (state-space granularity parameter as stated).
- K = number of correlated plays retained per game (swept); M = 100 simulation replicates.
- Independent test sets: G = 10,000 games with K = 1.
- Historical-mimic setting: G = 4,101 games, T = 56, K = T.
- Code: https://github.com/snoopryan123/fourth_down, folder `1_simulation/sim_v3` (as stated).

## 3. Method / model
- Ground-truth WP is known analytically in the simulator.
- Estimation model: XGBoost on (time, field position, score differential) → final win indicator.
- Bootstrap variants (B = 101 resamples, nominal 90% intervals): standard (i.i.d. play resampling), cluster (resample whole games), randomized cluster (resample random subsets of plays within games), fractional randomized cluster (keep each play with probability φ ∈ {1, 0.75, 0.5, 0.35}).
- Coverage and width evaluated against known truth, including conditional coverage across the WP range.

## 4. Equations & assumptions
No closed-form equations printed in the extract; the simulator and bootstrap schemes are described algorithmically. Effective-sample-size results are reported numerically (see §7). Assumptions: (a) random-walk football with T = 56, L = 4 captures the essential within-game correlation structure of real football; (b) XGBoost on three state variables is a representative WP estimator; (c) coverage measured against simulator truth generalizes to real-world WP uncertainty; (d) B = 101 resamples suffices for interval estimation.

## 5. Features / target
- Inputs: time remaining, field position, score differential.
- Target: binary final win/loss. Horizon: rest of game from the current state.

## 6. Validation design
- M = 100 simulation replicates; independent test sets of G = 10,000 games.
- Metric: empirical coverage of nominal 90% bootstrap intervals + mean interval width; conditional coverage binned by true WP.
- Comparison is across bootstrap schemes at fixed B = 101 — a clean ablation of the resampling design.

## 7. Numerical results / baselines
Effective sample size (plays → independent-play equivalents):
- 4,101 games → 2,291 (56%).
- 2,050 games → 645 (31%).
- 8,202 games → 6,911 (84%).

Nominal 90% bootstrap intervals (coverage ± SE, width ± SE):
- Standard: coverage 0.60 ± 0.01, width 0.027 ± 0.0005.
- Cluster: 0.71 ± 0.01, width 0.036 ± 0.0004.
- Randomized cluster: 0.76 ± 0.01, width 0.042 ± 0.0003.

Fractional randomized-cluster:
- φ = 1: 0.76 ± 0.01, width 0.042 ± 0.0003.
- φ = 0.75: 0.80 ± 0.01, width 0.047 ± 0.0003.
- φ = 0.5: 0.85 ± 0.01, width 0.055 ± 0.0004.
- φ = 0.35: 0.90 ± 0.01, width 0.063 ± 0.0004.

Key caveat (paper's own): even φ = 0.35 achieves only ~85% conditional coverage near WP 0.3 and 0.7 — the tails remain hard.

## 8. Code / data availability
Code: https://github.com/snoopryan123/fourth_down (`1_simulation/sim_v3`). Data: simulated; no real-data files.

## 9. Leakage & limitations
- **Simulator realism.** Random-walk football is a toy; real NFL play correlation (drives, game script, personnel) is richer, so the exact φ needed for real coverage is unknown — and unknowable, since true WP is unobservable outside simulation.
- **Only three state variables.** Real WP models use down, distance, timeouts, etc.; coverage behavior could differ with richer features.
- **B = 101 is small** for tail-quantile estimation; wider B might shift widths.
- **The φ = 0.35 "solution" buys coverage with width**: intervals widen 2.3× vs standard (0.063 vs 0.027) — at some point the interval is honest but useless.
- Conditional undercoverage persists at WP 0.3/0.7 even in the best scheme — the paper does not resolve it.
- External validity: directionally the message (plays are correlated; i.i.d. resampling lies) surely holds for NFL, but no numeric φ transfers.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE already covers EP/WP dependence critique (2409.04889, Brill et al.), fourth-down humility (2311.03490), calibration stack (CQR, grouping loss, temperature scaling, LRD/ECE), and clustering concerns in the ML brief. This paper is an **extension**, not a duplicate: it is the only source that *quantifies* the effective-sample-size collapse (56%/31%/84%) and gives a concrete resampling recipe with coverage numbers. It directly operationalizes the map's "cluster uncertainty themes." No repo file currently implements game-clustered bootstraps for WP intervals — that is the adoption target.

## 11. GSE implementation spec
- Replace any play-level i.i.d. bootstrap/subsampling in GSE's WP calibration with **game-clustered resampling**: resample games (not plays) with replacement; within resampled games keep plays with probability φ.
- Do NOT hard-code φ = 0.35. Instead: implement φ as a tuning knob; select φ on a calibration objective (e.g., empirical coverage of held-out game outcomes binned by predicted WP, targeting nominal 80/90% with minimum width) using 2020–2024 nflverse seasons.
- Report WP with intervals everywhere the engine surfaces probabilities (pick cards, edge sheets): point estimate ± cluster-bootstrap interval, with the interval method documented.
- Effective-sample-size diagnostic: compute the paper's ESS ratio on GSE's training corpus and publish it in the model card — it sets honest expectations for how much data the WP model really has.
- Effort: ~1 week (resampling utility + calibration harness + model-card updates). Serving: intervals precomputed per game state; negligible runtime cost.

## 12. Reproducible test
- Dataset: nflverse 2021–2024 regular seasons; GSE's current WP model (or nflfastR WP as reference implementation).
- Protocol: for each held-out season, build B = 200 game-clustered bootstrap replicates at φ ∈ {1.0, 0.75, 0.5, 0.35}; compute empirical coverage of nominal 90% intervals on play-level outcomes binned by predicted WP decile; record mean width.
- Baseline: standard play-level bootstrap at the same B.

## 13. Acceptance / rejection gate
ADOPT game-clustered resampling if, pre-registered: at the chosen φ, pooled empirical coverage ≥ 0.85 (nominal 90%) with mean width ≤ 1.8× the standard-bootstrap width, on at least 3 of 4 held-out seasons. REJECT φ-tuning (keep simple game-cluster bootstrap, φ = 1) if no φ clears 0.85 coverage or the width penalty exceeds 2× — honest-but-useless intervals do not ship. Never adopt a φ value justified only by the paper's simulator.

## 14. Improvement experiment
Go beyond the paper: hierarchical bootstrap — resample *drives* within resampled *games* (two-level clustering), since the paper's own EP/WP dependence critique (2409.04889) shows drive-level structure matters. Compare drive-nested vs game-only clustering on the coverage/width frontier; the drive level may recover coverage with less width inflation than pushing φ down to 0.35.
