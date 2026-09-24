# [0642] Online Gambling of Pure Chance: Wager Distribution, Risk Attitude, and Anomalous Diffusion (arXiv:1909.02343)

**Citation:** Xiangwen Wang, Michel Pleimling (2019). *Online Gambling of Pure Chance: Wager Distribution, Risk Attitude, and Anomalous Diffusion*. arXiv:1909.02343. URL: https://arxiv.org/abs/1909.02343
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/1909.02343.txt`).
**Verdict:** REJECT — empirically interesting behavioral-finance paper with no predictive value for GSE's sports prediction/betting stack; fails the numeric acceptance gate on any actionable application.

## 1. Research question
How do online gamblers behave in pure-chance games (Roulette, Crash, Satoshi Dice, Jackpot)? The paper asks three things: (1) what distribution describes wager sizes at the aggregate level; (2) what odds (risk levels) players choose when free to choose, i.e. their risk attitude; (3) what diffusive behavior gambler net-income random walks exhibit (mean-squared displacement, ergodicity breaking, non-Gaussianity, first-passage time).

## 2. Dataset / schema
8 datasets from 4 online gambling websites (CSGOFAST, CSGOSpeed, ethCrash, SatoshiDice, Coinroll), covering skin gambling and crypto-currency gambling. Number of bet logs per dataset: 0.3 million to 19.2 million. All wagers converted to US cents at daily market prices (CoinDesk for BTC, CoinMetrics for ETH/BCH). Game datasets labeled A–H: csgofast-Double (A, Roulette, odds 2/2/14), csgofast-X50 (B, Roulette, odds 2/3/5/50), csgofast-Crash (C), ethCrash (D), satoshidice (E), Coinroll (F), csgospeed-Jackpot (G), csgofast-Jackpot (H). Individual gamblers distinguishable except Satoshi Dice (E). Gamblers with >500,000 bets excluded from Coinroll analysis (money-laundering suspicion; top player placed >11 million bets). Access: "available from the authors on reasonable request" — not public/open.

## 3. Method / model
Descriptive statistical physics, not a predictive model. Pipeline: (1) fit wager distributions via MLE over candidate models (exponential, power-law, log-normal, power-law with sharp truncation, power-law with exponential cutoff, pairwise power-law), select via AIC Akaike weights; tail start x_min chosen to minimize Kolmogorov–Smirnov distance while keeping good CCDF fit; (2) rank correlations (Kendall tau, Spearman rho) of consecutive wagers (b_i, b_{i+1}), plus log-ratio statistics; (3) fit player-selected odds distributions (Crash game on CSGOFAST, Coinroll) with truncated shifted power-law; (4) random-walk analysis of net income: ensemble-averaged MSD, time-averaged MSD, ergodicity-breaking parameter EB, non-Gaussian parameter NGP, first-passage time distribution; (5) Monte Carlo simulation (10 billion individual simulations) of Martingale-style gamblers to reproduce superdiffusion-to-normal-diffusion crossover.

## 4. Equations & assumptions
- Payoff of one round: o_p = −b with probability p = 1 − 1/m + f_m; o_p = (1−η)(m−1)b with probability q = 1 − p = 1/m − f_m, where b>0 is wager, m>1 odds, η∈[0,1) site cut, f_m ≥ 0 player's statistical disadvantage. (Eq. 1)
- Expected payoff: E(o_p|m,b) = −((1−η)m f_m + (1−1/m+f_m)η) b ≡ −ξb, where ξ is the house edge. Always negative. House edge 1%–8% across games. (Eq. 2)
- Wager CCDF fit (log-normal): P(x) = [Φ((ln(x+1)−μ)/σ) − Φ((ln(x)−μ)/σ)] / [1 − Φ((ln(x_min)−μ)/σ)], x ≥ x_min, σ>0. (Eq. 3)
- Game (H) wager distribution (pairwise power-law with exponential transition), 6-parameter form, Eq. 4.
- Truncated shifted power-law for odds: P(m) = (m−δ)^(−α)/ζ(α, m_min−δ) for m_min ≤ m < m_max; jump mass ζ(α, m_max−δ)/ζ(α, m_min−δ) at m_max (incomplete zeta normalization). (Eq. 5)
- Multiplicative-process hypothesis: X_{i+1} = exp(ν_i)X_i, ln X_{i+1} = ln X_i + ν_i, with ν_i iid finite mean/variance → log-normal by CLT.
- Ensemble MSD: ⟨Δw²(t)⟩ = ⟨(w(t)−w_0)²⟩ = ⟨(Σ_{i=1}^t o_p(i))²⟩. (Eq. 6)
- IID model prediction: ⟨Δw²(t)⟩ = (⟨m⟩−1)⟨b²⟩ t (linear, Eq. 7). Anomalous diffusion = departure from this.
- Time-averaged MSD: δ²̅(t) = 1/(T−t) Σ_{k=1}^{T−t} (w(k+t)−w(k))². (Eq. 8)
- Ergodicity-breaking parameter: EB(t) = ⟨(δ²̅(t))²⟩/⟨δ²̅(t)⟩² − 1. (Eq. 9)
- First-passage time t_FP defined as first exit of [w−V_FP, w+V_FP], V_FP=200 US cents (5000 for game H); estimator via Heaviside step function. (Eq. 10)
- Non-Gaussian parameter: NGP(t) = ⟨Δw⁴(t)⟩/(3⟨Δw²(t)⟩²) − 1. (Eq. 11)
- Assumptions: gambler sequences treat "time" as bet index; ensemble averages over gamblers; net income is a one-dimensional discrete-time random walk; wealth/house cut parameters known; no player interaction in fixed-odds games; crypto wagers valued in USD at daily prices.

## 5. Features / target
Descriptive analysis; no prediction target. "Features" examined: wager size, player-selected odds, bet counts, win/loss sequences; derived quantities: log-ratios ln(b_{i+1}/b_i), net income w(t), MSD, EB, NGP, first-passage time.

## 6. Validation design
No train/test splits — this is empirical characterization, not a predictive model. Goodness-of-fit judged by CCDF overlays and K–S distances; model selection via AIC Akaike weights among 6 candidate distributions. Robustness check: resampled heavy gamblers (500 bets each from those with ≥500 bets) to remove bet-count inequality; distributions unchanged. Individual-level analysis of top gamblers' wager distributions as a further check.

## 7. Numerical results / baselines
- Wager distributions: games A,B,C,E,F,G best fit by log-normal. Representative parameters (μ, σ, x_min): A1 Red μ=3.689, σ=1.952, x_min=21; A1 Black μ=3.807, σ=1.922; A1 Green μ=3.972, σ=1.647; B Blue μ=2.734, σ=1.930; B Gold μ=3.416, σ=1.548; C1 μ=1.647, σ=2.226, x_min=15; D (truncated log-normal) μ=−7.186, σ=6.356; E μ=5.910, σ=2.691; F μ=1.930, σ=2.638; G μ=5.167, σ=1.301. Game H (in-game skins as wagers): power-law–exponential–power-law with α=0.802, δ=2.457×10², β=7.080×10⁻³, η=3.783, λ=8.625×10⁻⁵, x_min=250.
- Consecutive-bet correlations (Kendall τ, Spearman ρ, all > 0.5; Spearman up to 0.949 for D): A (0.596, 0.737); B (0.692, 0.803); C (0.858, 0.909); D (0.866, 0.949); F (0.826, 0.925); G (0.522, 0.675); H (0.591, 0.759). P(b_{i+1}=b_i): up to 0.802 for C (Crash).
- Mean/var of log10(b_{i+1}/b_i) all small (means 0.000–0.010; variances 0.038–0.288) → gradual multiplicative changes.
- After-loss: most likely action after losing is increase wager (e.g., A: 0.432 increase vs 0.249 decrease; F: 0.560 vs 0.061); after-win: more likely to decrease wager (A: 0.388 decrease vs 0.228 increase). Negative-progression (Martingale-like) strategies dominate.
- Odds (player-selected): truncated shifted power-law; CSGOFAST Crash α=1.881, δ=0.849, m_min=1.15; Coinroll α=1.423, δ=2.217, m_min=2.58. Both exponents < 2 (true crash-point exponent ≈ 2) → gamblers overweight low-probability win chances (probability weighting / prospect-theory-like behavior).
- Wealth tail (Coinroll): pairwise power-law from 5660 cents; exponents 1.585 then 3.258, crossover at 1.221×10⁵ cents.
- MSD: game C superdiffusive; games A, D, G, H superdiffusive→normal crossover; B, F linear/sublinear with convex regimes. Martingale simulation (min bet 1, multiply by γ on loss, reset on win, cap 10000, 10 billion sims, odds power-law exponent α, m_max=50) reproduces exponential-like initial growth → linear crossover; higher γ / lower α → larger huge-loss risk.
- EB(t) much larger than 0 for all games except G and H (non-ergodic). NGP decreases in most games but never falls below ~1 (coinroll F shows no decrease; game G plateaus ≈1.5).
- First-passage time tails: games A, H exponent ≈3/2 (normal); G exponent >3/2 (super); B, C, D, F exponents <3/2 (sub). Paper notes MSD-based and first-passage-based conclusions sometimes differ.

## 8. Code / data availability
None stated. "Datasets generated and/or analysed during the current study are available from the authors on reasonable request." No code link.

## 9. Leakage & limitations
- Descriptive only; no predictive model, no holdout evaluation, no reproducible pipeline to port.
- Data are from specific crypto/skin gambling sites with possible bot/money-laundering contamination (excluded heuristically at >500k bets).
- Wagering interface design (quick double/halve buttons) artificially induces multiplicative patterns — observed "multiplicative process" may be UI artifact, not human cognition.
- Wagers converted to USD at daily crypto prices; results sensitive to that normalization.
- Individual-level wager distributions are highly heterogeneous (many are NOT log-normal) — the headline log-normal result is purely an aggregate artifact.
- Anomalous-diffusion conclusions are qualitative (chart-read MSD regimes), not parameter estimates with tests.
- Zero external validity to NFL sports betting: pure-chance games with no skill component; NFL markets have informed participants, line movement, CLV dynamics this paper doesn't touch.
- Selection bias: only games/sites with publicly scrapable logs.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md, Garrett's corpus covers market-efficiency, odds-modeling, and betting-market microstructure topics, but nothing on pure-chance gambler behavioral distributions or diffusion physics. This paper adds no metric, no edge, and no model — it describes gambler behavior in games GSE will never touch. Not a duplicate, but a null in value terms.

## 11. GSE implementation spec
No implementation recommended (verdict REJECT). If GSE ever wanted a gambler-behavior module (e.g., modeling recreational money flow into books): replicate the descriptive pipeline on NFL sportsbook handle data — but NFL sportsbook handle is proprietary; public data (e.g., Unabated, VSiN ticket splits) lack per-gambler wager trajectories, so the log-normal wager fit could not be replicated. Estimated effort: not justified.

## 12. Reproducible test
Gate below is specified so the rejection is checkable: attempt to fit the paper's log-normal wager model (Eq. 3, MLE via Clauset et al. procedure) on any publicly available per-wager sportsbook dataset (e.g., a stateside published handle breakdown) and test whether the fitted (μ, σ) predict anything about subsequent line movement. No such public dataset exists → test is inoperable → REJECT stands.

## 13. Acceptance / rejection gate
ACCEPT would have required: a concrete, replicable statistical regularity with a quantified, statistically significant effect that transfers to sports betting markets (e.g., wager-distribution parameters that predict line movement with out-of-sample R² or hit-rate improvement vs closing-line baseline on NFL data). The paper delivers none: it is descriptive physics with no predictive experiment, no holdout, no transferable parameter, and the underlying data are not accessible. Numeric gate: FAIL.

## 14. Improvement experiment
N/A under rejection. If the direction were ever pursued: link per-gambler wager trajectories (as in the paper's logs) to line movement and CLV on a real sportsbook feed, and test whether the population log-normal wager model or the multiplicative-progression evidence predicts steam moves or recreational-sharp decomposition — that would convert this descriptive physics into an actionable market-microstructure signal.
