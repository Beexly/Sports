# 0628 The Market for English Premier League Odds (arXiv:1604.03614v5)

**Citation:** Polson, N. G., & Stern, H. S. *The market for English Premier League (EPL) odds* (arXiv:1604.03614v5; first draft April 2016). URL: https://arxiv.org/abs/1604.03614
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — market-implied Poisson scoring rates and the implied-volatility path are a portable live win-probability feature family for GSE's in-game models; port the calibration machinery (odds matrix → Skellam rates), not the soccer specifics.

## 1. Research question
Can a parsimonious two-parameter Skellam (Poisson-difference) process, calibrated to the full matrix of bookmaker correct-score odds, represent the market's real-time expectation of a soccer game's outcome — and can its "implied volatility" diagnose how the market updates on goals, red cards, and corners as the game evolves?

## 2. Dataset / schema
- **1,520 EPL games, 2012–2016** (380 per season): market win/lose/draw odds for the calibration/efficiency study (paper's Figure 4).
- **18 EPL games, October 15–22, 2016**: ladbrokes.com correct-score odds matrices for the calibration diagnostic (238 score-difference outcomes, ~13 per game; paper's Figure 3).
- **Everton vs. West Ham, March 5, 2016**: ladbrokes.com real-time odds scraped every 10 minutes for the dynamic case study (5 goals: 13' Everton, 56' Everton, 78'/81'/90' West Ham; Everton red card 34').
- Access: scraped from ladbrokes.com by the authors; not re-released.

## 3. Method / model
- Model the score difference **N(t) = N_A(t) − N_B(t)** as a Skellam process: N(t) ~ Skellam(λ^A t, λ^B t), the difference of two independent Poisson processes (a shared W(t) component induces score correlation but cancels in the difference).
- **Calibration:** convert the bookmaker's correct-score odds matrix to implied probabilities (p = 1/(1+odds)), rescale to remove vig, aggregate to score-difference probabilities, then estimate (λ^A_t, λ^B_t) by matching the first two moments — minimizing **D_E² + D_V²** (mean/variance residuals) subject to λ ≥ 0 (paper's equation 16).
- **Draw correction:** the plain Skellam underestimates draw probabilities (a known Poisson-model phenomenon — Karlis & Ntzoufras 2009), so the paper fits two **zero-inflated** variants; type 2 (heavier vig on draws) fits best.
- **Dynamics:** re-calibrate at each 10-minute mark on the odds adjusted for the current score (odds*(x,y) = odds(x+N_A(t), y+N_B(t))); the **implied volatility σ_IV,t = √(λ^A_t + λ^B_t)** traces the market's evolving uncertainty — the Black-Scholes analogy is explicit.
- Extension sketched: time-varying log-linear Skellam regression **log(λ^A_t) = α_A + β_A X_{A,t−1}** on in-game stats (possession, shots, corners, cards).

## 4. Equations & assumptions
- **N(t) = N_A(t) − N_B(t) ~ Skellam(λ^A t, λ^B t)**; team scores decomposed as N_A(t) = W_A(t) + W(t), N_B(t) = W_B(t) + W(t) with W_A ~ Poisson(λ^A t), W_B ~ Poisson(λ^B t). (Paper equations 1–2.)
- Skellam PMF: **P(N(1)=x | λ^A, λ^B) = Σ_k P(W_B=k−x | λ^B)·P(W_A=k | λ^A)**, with the Bessel-I_r series representation. (Paper equation 5.)
- Win probability: **P(N(1) > 0 | λ^A, λ^B) = Σ_{x=1}^∞ P(N(1)=x)**. (Paper equation 6.)
- Draw for evenly matched teams: **P(N(1)=0 | λ,λ) = e^{−2λ} I_0(2λ)**, monotone decreasing in λ. (Paper equation 7.)
- Conditional on lead ℓ at time t: **N(1) = ℓ + Skellam(λ^A_t, λ^B_t)**. (Paper equation 8.)
- Moments: **E[N(1)] = λ^A − λ^B**, **V[N(1)] = λ^A + λ^B**; conditional: E[N(1)|N(t)=ℓ] = ℓ + (λ^A_t − λ^B_t), V = λ^A_t + λ^B_t. (Paper equation 13.)
- Calibration: **(λ̂^A_t, λ̂^B_t) = argmin {D_E² + D_V²}** s.t. λ ≥ 0. (Paper equation 16.)
- Implied volatility: **σ_IV,t = √(λ^A_t + λ^B_t)**. (Paper §3.2.)
- Zero-inflated draw variants (17)/(18) and the log-linear extension (19) as stated in the paper.
- Assumptions: Poisson scoring with piecewise-constant rates; the odds matrix (vig removed) reflects the market's true beliefs; score correlation enters only through the shared W(t) which the difference model doesn't need to specify.

## 5. Features / target
- Inputs: the bookmaker's full correct-score odds matrix at time t, current score (N_A(t), N_B(t)).
- Target: the market-implied (λ^A_t, λ^B_t) and the derived win/draw/loss probabilities and implied-volatility path.
- This is a *calibration* paper: the "features" are market prices, the "target" is the market's latent belief state.

## 6. Validation design
- Calibration diagnostic: 18 games / 238 score-difference outcomes — Skellam-implied vs. market-implied probabilities (diagonal plot) and log-odds Q-Q plot.
- Out-of-sample efficiency: 1,520 EPL games — home-win frequency within implied-probability bins vs. the 45° line ("the market is efficient" on this data).
- Dynamic case study: Everton–West Ham 10-minute odds path — the implied-volatility trajectory around goals and the red card.

## 7. Numerical results / baselines
- Calibration: Skellam-implied probabilities track market-implied probabilities closely **except for underestimating draws** (fixed by the type-2 zero-inflated variant); Skellam log-odds have a **heavier right tail** than market log-odds (overestimation of extreme outcomes — attributed to market microstructure/vig effects).
- 1,520-game efficiency: binned home-win frequency ≈ market-implied probability — **the market looks efficient**; the Skellam curve with λ^A λ^B = 1.8 (from λ̂^A=1.5, λ̂^B=1.2) traces the win/draw probability relationship.
- Everton–West Ham: pre-game **λ̂^A = 2.33, λ̂^B = 1.44**; the 34' red card jumps implied volatility (penalized team's scoring intensity drops, opponent's rises — consistent with Vecer et al. 2009); Everton's win probability hit **~90%** before West Ham's 78' goal; the draw probability spiked to **~90%** before the 90' winner. Whole-game-normalized intensity (λ̂^A_t+λ̂^B_t)/(1−t) rose through the game — the market saw it getting more intense.

## 8. Code / data availability
None stated. Odds scraped from ladbrokes.com by the authors; no repository or data download.

## 9. Leakage & limitations
- The calibration is *to the market*, not to outcomes: the model reproduces bookmaker beliefs by construction. The 1,520-game "efficiency" finding means the beliefs were right on average — it does not mean the Skellam adds predictive power over the raw odds.
- Draw underestimation is structural to the Poisson difference (not a small-sample artifact); the zero-inflation fix is a patch with its own free parameter.
- Heavy right tail: the model overprices extreme scorelines relative to the market — a direct consequence of fitting moments rather than the full distribution, plus vig distortions.
- The dynamic case study is **one game** (n=1 showcase); the implied-volatility path's "diagnostic" value is illustrated, not validated.
- 10-minute odds snapshots with no stoppage-time accounting; in-play odds staleness is not modeled.
- For the NFL: scoring is not Poisson (drives have memory, 3/7-point chunks, clock effects), so the Skellam is the wrong likelihood — but the *calibration architecture* (odds matrix → latent rates → implied volatility path) ports cleanly to a drive-based point process (the paper itself cites Baker & McHale 2013 for NFL).

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. The map's markets-adjacent holdings: props-consensus work (Bills–Lions TNF), market captures, the prediction-market ecosystem triage (Polymarket/Kalshi tooling). **No implied-volatility / market-belief-dynamics machinery exists** — GSE has static market snapshots, not a belief-state model. This is a **new capability** (live market-implied win probability with an uncertainty path) extending the markets lane.

## 11. GSE implementation spec
- Data: in-play odds feeds (the odds APIs Garrett already holds: OddsPapi, APIVault, etc.) for NFL games — moneyline/spread/total time series, not correct-score matrices (which don't exist for NFL).
- Build: replace the Skellam with an NFL-appropriate likelihood — a drive-outcome point process (Baker & McHale 2013, cited by the paper) or a simple two-Poisson *scoring-play* model — and replicate the calibration loop: at each in-play snapshot, invert the market odds to implied scoring rates, then publish the implied win probability and the implied-volatility path σ_IV,t.
- Use σ_IV,t as a *feature* in GSE's live models (high implied vol = market expects chaos = live-betting opportunity screen) and as a diagnostic (does GSE's win prob move with or against the market's implied vol?).
- Effort: ~1–2 weeks (feed plumbing + calibration optimizer + path visualizer).

## 12. Reproducible test
Dataset: 2024 NFL season in-play moneylines (5-minute snapshots) for ~50 games + realized outcomes. Build the implied-rate calibration; baseline: the raw normalized moneyline-implied win probability. Metric: Brier score of the calibrated model-implied win probability vs. baseline at each snapshot, plus calibration-in-the-small (binned). Success: calibrated probabilities beat raw moneyline-implied by ≥ 0.003 mean Brier — the Skellam structure must add something beyond vig removal.

## 13. Acceptance / rejection gate
ADOPT the implied-volatility feature iff the calibrated model beats raw moneyline-implied win probability by ≥ 0.003 mean Brier on the 50-game 2024 sample AND the implied-vol path visibly reacts to major in-game events (turnovers, injuries) in the case-study plots. If it ties the raw line, reject — the machinery is decorative. Gate set before running the test.

## 14. Improvement experiment
Calibrate to **two** markets jointly (moneyline + spread-implied margin distribution) instead of one odds matrix, estimating a shared latent rate pair. Why it might win: the paper uses only the correct-score matrix; the spread market carries independent information about the *margin* distribution that the moneyline alone doesn't identify — joint calibration overidentifies the rates, which both stabilizes estimation and exposes cross-market inconsistencies (the actual trading signal).
