# [0047] Simulating MLB Seasons using Bayesian Inference and Random Walks (arXiv:2505.05120v1)

**Citation:** Simon Cha (2025). *Simulating MLB Seasons using Bayesian Inference and Random Walks*. arXiv:2505.05120v1 [stat.AP]. URL: https://arxiv.org/abs/2505.05120v1. 8 May 2025 (v1; only version as of read date).
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML v1) on 2026-09-21 (220 lines, §§1–5). Built on Yang & Swartz (2004), "A Two-Stage Bayesian Model for Predicting Winners in Major League Baseball," Journal of Data Science 2(1):61–73.
**Verdict:** REJECT — an unvalidated single-author MLB season simulator: no backtesting, no calibration, implausibly extreme playoff probabilities by the author's own admission, and no transferable, tested improvement over the 2004 Yang & Swartz framework it reimplements.

## 1. Research question
Forecast end-of-season MLB win totals (162-game season) and each team's postseason probability from a 20-game burn-in of initial team strength. The challenge addressed is forecasting matchups whose input features are unobserved at prediction time: the paper couples a Bayesian game-outcome model with synthetic future inputs (random-walk batting averages, Kalman-filtered ERA), then Monte-Carlo-simulates full seasons.

## 2. Dataset / schema
- **Training data:** 2022, 2023, 2024 MLB seasons, filtered to games between **May 20 and August 20** ("early-season batting and win percentage data are highly volatile due to small sample sizes").
- **Three input variables:** team win percentage, team batting average, and the **starting pitcher's ERA on the day of the game** (finer than team pitching stats). These enter as home-relative ratios α, β, γ (per Yang & Swartz).
- Access: no data released; scraped with BeautifulSoup/Selenium from Baseball Reference, TeamRankings.com, SportsbookReview, MLB.com. Author is independent; first-person hobby project ("As a dedicated follower of sports statistics").

## 3. Method / model
- **Bayesian inference (§3.1):** relative strength λ_s = α_s^{r_1} · β_s^{r_2} · γ_s^{r_3}, exponents learned from data with independent uniform priors (**prior bounds: Not stated in paper**). Two-stage structure: p_s ~ Beta(m·λ_s, m), m > 0 controls concentration; X_s ~ Bernoulli(p_s). Posteriors for r_1, r_2, r_3 estimated by MCMC (Figure 1 trace plots/marginal densities — **no numerical posterior values stated in text**).
- **Random walks (§3.2):** normalized team batting-average deviations from the mean "resembled those of a Gaussian random walk"; future averages simulated as Gaussian random walk with innovations **Normal(0, 0.0015)** (Figure 2 caption).
- **Kalman filters (§3.3):** pitcher ERA via local-level state-space model: x_{t+1} = x_t + w_t, w_t ~ N(0, σ²_process); y_t = x_t + v_t, v_t ~ N(0, σ²_obs). σ_obs, σ_process estimated per team with 30-game sliding windows (statsmodels UnobservedComponents); teams grouped into low/medium/high terciles by first-20-game average ERA; future simulations sample noise from the group's observed distributions. Finding: "observation noise is generally much larger than process noise" (Figure 3).
- **Simulation (§3.4):** after the 20-game burn-in, team win % tracked and updated as simulated games complete; each game draws a posterior win probability and a Bernoulli outcome; repeated **1,000 times** → win-total distributions and playoff probabilities.

## 4. Equations & assumptions
- λ_s = α_s^{r_1} · β_s^{r_2} · γ_s^{r_3}; p_s ~ Beta(m·λ_s, m); X_s ~ Bernoulli(p_s). **NUMBER UNCERTAINTY: neither the uniform-prior bounds nor the fitted r-values nor m are reported numerically — the fitted model cannot be reconstructed from the paper.**
- BA innovations: Normal(0, 0.0015).
- ERA state-space: x_{t+1} = x_t + w_t, w_t ~ N(0, σ²_process); y_t = x_t + v_t, v_t ~ N(0, σ²_obs); noise terms estimated per team via 30-game sliding windows, teams tercile-grouped by first-20-game ERA.
- Assumptions (stated): batting average and ERA are independent stochastic processes (author admits this ignores "slumps, injuries, and lineup changes"); training restricted to game 50+ onward.

## 5. Features / target
- **Features (3):** team win percentage, team batting average, starting pitcher's ERA on game day — as home-relative ratios α, β, γ.
- **Targets:** end-of-season win totals (162-game season) and postseason probability per team, via 1,000 simulated seasons.

## 6. Validation design
**None.** Critical: the paper never compares its 2025 projections against actual 2025 outcomes, against any baseline, or against betting markets. Zero out-of-sample validation — no backtest, no calibration check, no market comparison. The author himself flags (§5) that "the playoff probabilities appeared disproportionately extreme, with some teams exceeding a 90% chance and others nearing 0%," attributing this to overconfidence from the 20-game burn-in compounding early trends.

## 7. Numerical results / baselines
Quoted exactly (Table 1, 2025-season projection; no baseline, no outcome comparison):
| Team | Mean wins | 90% CI | Playoff % | Team | Mean wins | 90% CI | Playoff % |
|---|---|---|---|---|---|---|---|
| SDP | 99.4 | (85.6, 112.4) | 90.9 | LAA | 82.2 | (65.4, 98.0) | 42.9 |
| NYM | 96.1 | (80.5, 112.9) | 80.3 | CLE | 82.1 | (65.8, 98.0) | 40.2 |
| PHI | 95.6 | (80.0, 112.8) | 78.6 | MIL | 81.3 | (66.4, 95.8) | 26.3 |
| CHC | 93.3 | (78.0, 107.0) | 75.4 | SEA | 79.9 | (63.8, 95.2) | 33.7 |
| DET | 93.1 | (78.4, 106.7) | 84.7 | ATH | 77.8 | (62.0, 93.0) | 0.0 |
| TOR | 92.9 | (75.9, 110.5) | 79.5 | KCR | 77.7 | (59.8, 94.9) | 25.3 |
| TBR | 90.3 | (72.4, 107.7) | 72.0 | WSN | 76.6 | (58.4, 95.5) | 15.8 |
| SFG | 90.0 | (74.0, 104.9) | 62.2 | BAL | 72.9 | (56.0, 88.6) | 14.4 |
| LAD | 88.1 | (74.0, 102.0) | 51.5 | MIA | 72.7 | (55.7, 89.1) | 7.3 |
| NYY | 87.4 | (72.4, 101.6) | 62.6 | ATL | 71.5 | (53.3, 89.4) | 7.3 |
| ARI | 85.5 | (70.0, 100.0) | 40.4 | PIT | 61.4 | (44.3, 79.4) | 1.0 |
| TEX | 85.2 | (69.3, 100.6) | 52.4 | MIN | 60.7 | (42.3, 77.4) | 1.2 |
| BOS | 83.6 | (67.8, 98.8) | 45.7 | CHW | 57.8 | (35.0, 79.4) | 2.3 |
| HOU | 82.7 | (66.0, 98.8) | 43.1 | COL | 50.2 | (26.3, 73.4) | 0.2 |
| STL | 82.6 | (66.4, 98.0) | 31.7 | | | | |
| CIN | 82.5 | (65.0, 101.2) | 31.1 | | | | |

## 8. Code / data availability
None: no code or data released. Data scraped (BeautifulSoup/Selenium) from Baseball Reference, TeamRankings.com, SportsbookReview, MLB.com.

## 9. Leakage & limitations
- Author's stated (§3.5): BA and ERA treated as independent stochastic processes, ignoring "slumps, injuries, and lineup changes"; training restricted to game 50+ onward limits early-season applicability; only three covariates.
- Reviewer: (a) zero out-of-sample validation — no backtest, calibration check, or market comparison; (b) fitted parameters (r_1–r_3 posteriors, m, prior bounds) not reported — nothing is reproducible; (c) single-author hobby project, not peer-reviewed; (d) win% updating inside the simulation loop double-counts simulated results as if observed — likely one source of the extreme playoff probabilities the author himself flags.
- Author's future direction (§5.1): using sports-betting data as a prior — directionally aligned with GSE's market-aware philosophy, but acknowledged as infeasible for long-horizon forecasting (lines only exist days ahead).

## 10. GSE overlap
No overlap — no duplication. The two-stage Beta–Bernoulli structure (Yang & Swartz) is a known, legitimate pattern for win-probability modeling, and the random-walk/Kalman trick for simulating unobserved future covariates is a reasonable long-horizon season-simulation approach — but these are generic textbook techniques; the paper adds no novel, tested improvement GSE could adopt. GSE's NFL simulation needs would be better served by the peer-reviewed Yang & Swartz (2004) source than by this unvalidated reimplementation. Classification: **not duplicate, not extension — superseded by the primary source.**

## 11. GSE implementation spec
Not recommended — rejected. MLB-only, unvalidated, implausibly extreme probabilities by the author's own admission. Do not build.

## 12. Reproducible test
N/A (rejected). There is no fitted model to reproduce (parameters unreported) and no validated result to check against. Gate closed.

## 13. Acceptance / rejection gate
Reject unconditionally: zero out-of-sample validation, unreported parameters, extreme playoff probabilities conceded by the author. No test window could resurrect it.

## 14. Improvement experiment
None from this paper. If season-simulation methodology is ever revisited, go to the primary source (Yang & Swartz 2004), not this paper.
