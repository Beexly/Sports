# [0812] Deep Generative Models for Synthetic Financial Data: Applications to Portfolio and Risk Modeling (arXiv:2512.21798)

**Citation:** Christophe D. Hounwanou, Yaé Ulrich Gaba (2025). *Deep Generative Models for Synthetic Financial Data: Applications to Portfolio and Risk Modeling*. arXiv:2512.21798. URL: https://arxiv.org/abs/2512.21798
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; LateXML conversion).
**Verdict:** ADAPT — TimeGAN is the strongest of the three generators tested (best KS/Wasserstein/DTW, tail-risk metrics within ~4% of real, Sharpe 0.84 vs 0.89 real-trained) and the paper's fidelity→utility→robustness evaluation scaffold transfers directly to synthetic sports-season augmentation for GSE backtests; but the paper's own multi-asset tables contradict its single-index dataset claim and hyperparameters are internally inconsistent, so treat the architecture as the takeaway, not the exact numbers, and validate on GSE's own downstream metric (ROI/Brier) rather than Sharpe.

## 1. Research question
Can synthetic financial time series from TimeGAN and VAEs faithfully reproduce the statistical/temporal properties of real market data AND support downstream decision tasks (portfolio optimization, risk estimation, backtesting)? Evaluated on S&P 500 daily log-returns (Jan 2000–Jun 2024) across three dimensions the paper formalizes: fidelity (moments, autocorrelation, volatility clustering, distributional shape), utility (do synthetic-trained portfolios match real-trained Sharpe/VaR/allocations), robustness (stability across seeds/regimes).

## 2. Dataset / schema
S&P 500 daily closing prices, January 2000 to June 2024 (~6,150 trading days), transformed to log-returns r_t = ln(P_t/P_{t-1}), ADF-tested for stationarity, standardized to zero mean/unit variance. 80/10/10 train/val/test split. Rolling windows T = 10/20/60 days checked. Real-data summary stats (Table 1, exact): mean 0.00041, std 0.0127, skewness −0.45, kurtosis 7.88. CONTRADICTION: §3.1 states "The dataset contains only the index" yet Tables 2/6 report portfolio weights for individual assets (AAPL 0.12/0.11, MSFT 0.10/0.09, GOOGL 0.08/0.08, AMZN 0.09/0.10, TSLA 0.07/0.06, SPY 0.54/0.56, real vs synthetic) — a multi-asset dataset whose construction is never described. Flagged as an integrity gap; the single-index results (Tables 1, 3, 4, 5) are the trustworthy core. Hardware: single NVIDIA RTX 3090, 64 GB RAM; training ~4.5 h TimeGAN, ~2 h VAE.

## 3. Method / model
TimeGAN (Yoon et al. 2019: RNN + adversarial training with supervised + unsupervised losses for temporal dynamics) and standard VAE (Kingma & Welling; probabilistic latent representation), benchmarked against ARIMA-GARCH. Hyperparameters (CONTRADICTION: §3.2.1 says TimeGAN 200 epochs/batch 64, VAE 150 epochs/batch 128; Appendix Table 7 says TimeGAN 100 epochs/batch 128/hidden 24/latent 8, VAE 150 epochs/batch 128/hidden 32/latent 16 — quoted both, neither verifiable): lr 0.001, Adam, fixed seeds. Pipeline: preprocess → generate same-length synthetic sequences → downstream tasks → evaluate fidelity/utility/robustness. Portfolio: classical Markowitz min_w w'Σw s.t. w'μ=μp, w'1=1, w_i≥0, solved via Lagrangian closed form w* = Σ^{−1}(λμ/2 + γ1/2). Risk: GARCH(1,1) σ²_t = ω + α1·ε²_{t−1} + β1·σ²_{t−1}; VaR_α = μ_t + z_α·σ_t; ES_α = μ_t − σ_t·φ(z_α)/α. Backtest: rolling — train on 5-year synthetic window, test on subsequent 6 real months; metrics Sharpe, Sortino, Max Drawdown.

## 4. Equations & assumptions
Log-returns r_t = ln(P_t/P_{t−1}); standardized r̃_t = (r_t − μ_r)/σ_r. Portfolio: R_t = w'r_t; μ_p = E[R_t]; σ²_p = w'Σw. Markowitz: min_w w'Σw s.t. w'1=1, w'μ=μ*_p. Lagrangian L(w,λ,γ) = w'Σw − λ(w'μ−μ_p) − γ(w'1−1); w* = Σ^{−1}(λμ/2 + γ1/2) with the 2×2 system for (λ/2, γ/2). Generative framing: synthetic r̃_{1:T} = G_θ(z), z~p(z), minimizing divergence (KL/Wasserstein) to p(r_{1:T}). GARCH(1,1), VaR, ES as above. DTW(X_real,X_syn) = min_π Σ_{(i,j)∈π} |x_i − x̂_j|. Sharpe = E[R_p−R_f]/σ_p; Sortino = E[R_p−R_f]/σ_d; MaxDD = (max P_t − min P_t)/max P_t.
Assumptions (stated): log-returns stationary (ADF-verified); budget + no-short-sale constraints; synthetic ≈ real in distribution suffices for decision equivalence (μ̃_p≈μ_p, σ̃²_p≈σ²_p, w̃≈w).

## 5. Features / target
Inputs: univariate daily log-return series (plus the undescribed multi-asset panel). Targets: (a) synthetic return sequences matching real distribution; (b) downstream: portfolio weights w*, risk metrics (volatility, VaR_0.95, ES_0.95), backtest performance (Sharpe/Sortino/MaxDD). Horizons: daily returns; 5-yr train / 6-mo test rolling backtest.

## 6. Validation design
80/10/10 split on 2000–2024 (time-ordered). Three evaluation axes: distributional fidelity (KS statistic, Wasserstein distance, KDE overlays), temporal coherence (ACF, mean DTW distance), downstream utility (portfolio weights, GARCH risk metrics, rolling backtest). Baselines: ARIMA-GARCH statistical baseline vs VAE vs TimeGAN. Robustness: multiple random seeds for weight stability. No statistical tests on metric differences (point estimates only).

## 7. Numerical results / baselines
All values quoted exactly as in the paper:
- Real S&P stats: mean 0.00041, std 0.0127, skew −0.45, kurtosis 7.88.
- Table 5 (distributional fidelity): KS / Wasserstein — ARIMA-GARCH 0.128/0.0047; VAE 0.095/0.0031; TimeGAN 0.062/0.0018 (best).
- Mean DTW: TimeGAN 0.132, VAE 0.187, ARIMA-GARCH 0.243.
- Table 3 (risk, exact): Real — vol 1.27%, VaR_0.95 −2.11%, ES_0.95 −2.88%; TimeGAN — 1.30%, −2.05%, −2.79%; VAE — 1.19%, −1.92%, −2.63%. (VAE underestimates tails — paper's key caveat.)
- Table 4 (backtest, train-on-synthetic → test-on-real): Real-trained Sharpe 0.89 / Sortino 1.31 / MaxDD 23.4%; TimeGAN-trained 0.84 / 1.26 / 25.1%; VAE-trained 0.78 / 1.14 / 27.6%.
- Table 2/6 portfolio weights (multi-asset; dataset contradiction noted above): real vs synthetic within ±0.02 per asset (e.g., AAPL 0.12 vs 0.11, SPY 0.54 vs 0.56).
- Paper's claims: TimeGAN best replicates heavy tails/volatility clustering; VAE smoother, stable training, tail-blind; synthetic-trained portfolios "closely aligned" with real-trained. My read: deltas are small but the paper never tests whether they are significant, and the multi-asset weight table is unsupported by the described dataset.

## 8. Code / data availability
"All code and preprocessing steps are documented and available at the accompanying GitHub repository" — no URL given in text (None usable stated). S&P 500 data public via any market-data vendor. Companion paper cited: arXiv:2512.21791 ("While the first paper focused on the generation and statistical validation... the present work examines downstream tasks" — this paper is the second of a pair).

## 9. Leakage & limitations
- Integrity flags: (1) hyperparameter contradiction (§3.2.1 vs Appendix A.3 — epochs and batch sizes differ); (2) "dataset contains only the index" vs multi-asset portfolio tables with no described multi-asset data; (3) table numbering scrambled (text refers to Table 6 then shows Table 2). These don't invalidate the method but mean the numbers deserve independent replication, not citation.
- Adversarial: no significance tests; seed-robustness claimed qualitatively ("weights remained stable" — no variance reported); TimeGAN mode-collapse risk acknowledged but "not systematically investigated"; diffusion/WGAN baselines excluded "due to computational costs or scope limitations".
- External validity to sports: finance series are long (~6k points) and stationary-ish; an NFL season is 17 games × 32 teams — the data regime is opposite (tiny samples, structural breaks every offseason). TimeGAN on 6k daily points ≠ TimeGAN on 272 games/season. Synthetic augmentation is most defensible at the play/drive level (nflverse play-by-play, ~45k plays/season) rather than game level.

## 10. GSE overlap
Existing-research map: synthetic data / augmentation not listed as an absorbed capability; backtesting infrastructure exists (GSE engine, nflverse 2020–2025 work in the MOVE-37 lane). No duplication — this would be a new capability: synthetic season/play-stream generation for stress-testing the engine and the Kelly sizing lane. Complements ledger 0810's bandit work (synthetic environments are the standard way to pre-train bandit policies before live traffic).

## 11. GSE implementation spec
Adaptation: TimeGAN (or a modern diffusion alternative — the paper excludes them without good reason) trained on nflverse play-by-play sequences 2020–2025 to generate synthetic game/drive scripts for engine stress-testing: (1) feature frame per play (down, distance, yardline, score diff, time, EPA); (2) TimeGAN with conditional inputs (team strength embeddings); (3) validate with the paper's three axes translated: fidelity = KS/Wasserstein on EPA distributions, score-differential marginals, ACF of drive outcomes; utility = engine ROI/Brier on synthetic seasons vs real seasons (the analog of Table 4 — train calibration on synthetic, test on real); robustness = seed stability of engine metrics. Use case 1: augment the tiny 17-game season for calibration training. Use case 2: tail-scenario generation (upset-heavy synthetic seasons) for Kelly drawdown stress tests (links ledgers 0815–0819). Effort: ~1–2 weeks for a play-level prototype; game-level is too coarse to be useful.

## 12. Reproducible test
Dataset: nflverse play-by-play 2020–2024 (train), 2025 (test). Protocol: train TimeGAN on 2020–2023 play sequences; generate 50 synthetic seasons; (a) fidelity: KS statistic on per-game score-differential distribution, synthetic vs real 2024 (target: KS < 0.10, the paper's TimeGAN bar was 0.062); (b) utility: train GSE's calibration layer on synthetic 2024-like seasons, evaluate Brier on real 2025 Weeks 1–2+ (baseline: calibration trained on real 2020–2023); success = Brier within 0.005 of the real-trained calibrator. Baseline to beat: a naive bootstrap-resample of historical games (if TimeGAN can't beat bootstrap on fidelity+utility, it's not worth the GPU).

## 13. Acceptance / rejection gate
ADAPT if on the nflverse test (a) TimeGAN synthetic seasons achieve KS < 0.10 vs real on score-differential marginals AND beat game-level bootstrap resampling on that metric, AND (b) a calibrator trained on synthetic data is within 0.005 Brier of the real-trained calibrator on the 2025 holdout. REJECT if either fails — the paper's finance numbers do not transfer to a 272-game season without this proof. (Paper's own numbers are not adopted as gates due to the internal inconsistencies noted.)

## 14. Improvement experiment
Conditional diffusion model (the baseline the paper excluded) conditioned on team-strength embeddings and week number, trained at play level — test head-to-head vs TimeGAN on the §12 gate; hypothesis: diffusion captures multi-modal game scripts (blowouts vs close games) better than GANs without mode collapse. Second experiment: use the validated generator as a bandit pre-training environment — train the ledger-0810 AMS policy and ledger-0811 LinUCB selector on 1,000 synthetic seasons before any live traffic, measuring how much synthetic pre-training reduces live regret in the §12 replay of ledger 0810.
