# 0174 Beating the market with a bad predictive model (arXiv:2010.12508v1)

**Citation:** Hubáček, O., & Šír, G. (2020). *Beating the market with a bad predictive model*. arXiv:2010.12508v1. URL: https://arxiv.org/abs/2010.12508v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 3,292 extracted lines, read 0–3,292).
**Verdict:** ADOPT — the decorrelation training objective (penalize agreement with the market alongside prediction error) is directly implementable in GSE's model training and complements the Kelly/bet-sizing findings of paper 0171: train the probability model with an MSE* loss that explicitly trades accuracy against market correlation, then stake with fractional Kelly.

## 1. Research question
Is superior predictive accuracy really necessary to profit as a market taker, or can a strictly *inferior* price-predicting model generate systematic profits by being trained to **decorrelate its estimation errors from the market maker's** — exploiting the inherent advantage of the market taker (who may cherry-pick opportunities) over the market maker (who must quote both sides)? The paper formalizes this as a two-player stochastic pricing game across stock trading and sports betting, proves the desirability of decorrelation across common market distributions, translates it into an ML loss function, and tests it on real NBA betting data. (Abstract, Sections 3–5.)

## 2. Dataset / schema
- **NBA box-score data, seasons 2000–2014** (Section 5.2): official NBA box scores; features = aggregated basic player statistics (shots, passes, steals, etc.) for home and away teams from all preceding matches since season start, plus seasonal aggregates from preceding seasons. Deliberately "clearly inferior data sources" to demonstrate the concept.
- **Odds:** Pinnacle **closing** odds for 2010–2014 (harder to beat — already market-adjusted; margin ≈ 2.5%); multiple bookmakers for 2000–2010 (higher margins ≈ 4.5%, aggregate of many makers makes decorrelation harder). Figure 7: odds histograms (long-tail, home-win base rate higher).
- **Evaluation window:** seasons 2006–2014, **9,093 games**; chronological protocol — train on all preceding seasons (2000–2005 → predict 2006, …, 2000–2013 → predict 2014).
- **Simulated data (Appendix A.1):** triples (R,T,M) from a multivariate Beta distribution; means 1/2; Var(M) = 0.054 (from real bookmaker data), Var(T) same, Var(R) = 0.08 ("glass ceiling" thesis: ≤ 75% predictability); correlations over {0.85, 0.90, 0.95}; n = 30 bets/round, 10,000 rounds; odds o_i = 1/m_i.
- Access: public (NBA stats, Pinnacle); no download URL stated in paper. No code link stated ("None stated").

## 3. Method / model
- **Predictive model (5.4):** variant of a convolutional network from the author's thesis [28] / IJF 2019 [29]. Input: two matrices (home, away) with players in rows (sorted by time-in-play, top 10 only) × player features in columns. Convolutional layer = a vector of 10 tunable real weights (learnable aggregation into latent team-level features); fully connected layers → binary home/away prediction.
- **Loss — the core contribution (4.5):** standard error measures extended with a decorrelation term. Ideal form (Eq. 59): MSE*_Ω(R,M,T) = (1/|Ω|) Σ_i (t_i − r_i)² + γ·(t_i − r_i)(m_i − r_i), γ > 0. Adapted for betting where true probabilities r_i are unobservable (5.4): MSE*_Ω(R,M,T) = E[(T − R)² − γ·(T − M)²], penalizing estimates too close to market price; γ trades accuracy vs decorrelation. Odds optionally included/excluded as an input feature (inclusion raises accuracy but raises market correlation — the tradeoff under test).
- **Investment strategies (5.4):** (i) **unif** — uniform unit stakes on positive-expected-return opportunities (Section 2.7.1); (ii) **sharpe** — Markowitz MPT portfolio maximizing the Sharpe ratio (Eqs. 20–21) with expected profit E_R[w_i] = (r_i/m_i − 1)·f_i (Eq. 61) and Bernoulli profit variance Var_R[w_i] = (1−r_i)r_i f_i²/m_i² (Eq. 62), using model estimates t_i for unknown r_i, assuming independent matches, solved by sequential quadratic programming. Only opportunities with positive estimated expected return are bet (one side per game).
- **Theory (Sections 3–4):** market taker vs maker formalized via joint distribution P_Ω(R,M,T) (Definition 2.1); market taker's advantage — must only estimate the *direction* of the market's error, not the price (3.3); under uniform PU the taker identifies 2/3 of profitable opportunities with zero information (Eqs. 38–39); decorrelation defined as decreasing partial Corr[T,M|R] (Definition 4.1); Theorem 4.1: for unbiased estimators, Corr[T,M|R] = −1 maximizes essential profitability; fractional Kelly benefits from decorrelation while full Kelly is blind to it (4.4–4.4.1, Examples 4.1–4.2).

## 4. Equations & assumptions
Key equations quoted (several renderings garbled in extraction — marked [UNCERTAIN]):

- Kelly wealth growth decomposition (Eq. 32): W_G = D_KL(R||M) − D_KL(R||T) — "the growth of wealth of the trader is directly equal to the difference in quality of her estimates T over the market prices M in terms of KL divergence." Positive Kelly returns ⟺ XENT_Ω(R,T) < XENT_Ω(R,M) (Section 3.1).
- Ideal decorrelation loss (Eq. 59): MSE*_Ω(R,M,T) = (1/|Ω|) Σ_{ω_i ∈ Ω} (t_i − r_i)² + γ·(t_i − r_i)(m_i − r_i), γ > 0.
- Betting-adapted loss (5.4): MSE*_Ω(R,M,T) = E[(T − R)² − γ·(T − M)²], m_i = bookmaker probabilities from odds o_i.
- Essential profitability (Definition 3.1): opportunities exist with (m_i < r_i ∧ t_i > m_i) or (m_i > r_i ∧ t_i < m_i).
- Buy-low-sell-high rule (Eq. 33): m_i < t_i ⟹ α = buy (bet home); m_i > t_i ⟹ β = sell (bet away).
- True expected returns, stocks (Eq. 34): E_R[ρ_i] = (r_i − m_i)/m_i if m_i < t_i; (m_i − r_i)/m_i if m_i > t_i. Betting (Eq. 35): E_R[ρ_i] = r_i/m_i − 1 if m_i < t_i; (1 − r_i)/(1 − m_i) − 1 if m_i > t_i [rendering UNCERTAIN in extraction].
- Unbiasedness (Eqs. 40–41): E_P(M) − R = 0; E_{P(M|R=r)}(M) = r. Verified empirically: "∀r ∈ [0,1]: E_{P(M|r)}(M) = r" (5.3.1).
- Variance/covariance identities (Eqs. 42–43): Var[T] = E_R[Var[T|R]] + Var_R(E[T|R]); Cov[M,R] = Var[M|R] under pointwise unbiasedness.
- Market taker advantage under PU (Eqs. 38–39): m_i < r_i ⟹ P_U(m_i < t_i) > P_U(t_i < m_i), and vice versa.
- Expected ROI definitions (Eqs. 12–13) [UNCERTAIN — extraction garbled]: E_t[ρ_i^α] = (t_i − m_i)/m_i for stocks; t_i/m_i − 1 and (1−t_i)/(1−m_i) − 1 for betting sides α, β.
- **Assumptions:** partially (in)efficient market (market price good but imperfect estimate); two-player zero-sum game, roles never switch; spread/margin omitted from theory (present in experiments); short selling available for stock-market correspondence; both estimators unbiased (else trivially exploitable); opportunities treated as independent trading units; Kelly analysis assumes true distribution known; MSE* is, by the authors' own admission (7.1), "rooted merely in an intuition rather than formal mathematical derivation."

## 5. Features / target
**Features:** per-team matrices of aggregated basic player statistics (shots, passes, steals, …) from all preceding matches of the current season + preceding-season aggregates; rows = top 10 players by time-in-play; optionally the bookmaker's odds o_i as an extra feature (tested both ways). **Target:** binary match outcome (home win = α / away win = β); models regress the underlying probability from {0,1} labels. **Horizon:** single-match outcome; bankroll compounded across the 9,093-game evaluation window.

## 6. Validation design
Chronological train/test by season (train ≤ season k−1, test season k; first test season 2006). Baselines: the model at γ = 0 (pure accuracy) vs γ ∈ {0.2, 0.4, 0.6, 0.8, 1.0}; odds-as-feature vs not; bookmaker itself (predict shorter-odds team: accuracy 69 ± 2.5); strategies unif vs sharpe. Metrics: total profit W (mean ± SE over 10 runs), classification accuracy. No cross-validation beyond the chronological protocol; time-ordered, no shuffling. Simulation appendix sweeps Corr(T,M) ∈ {0.85, 0.90, 0.95} × Corr(T,R) ∈ {0.85, 0.90, 0.95}.

## 7. Numerical results / baselines
Exact from Table 3 (means ± SE over 10 runs, seasons 2006–2014; profit units are bankroll units as wagered — paper does not normalize to % here, unlike Table 4):

- **Without odds as feature** (γ | W_sharpe | W_unif | Accuracy): 0.0 | 0.38 ± 0.10 | −5.12 ± 0.11 | 67.62 ± 0.03; 0.2 | 1.05 ± 0.12 | −3.31 ± 0.13 | 67.47 ± 0.03; **0.4 | 1.74 ± 0.14 | −1.73 ± 0.18 | 67.15 ± 0.10**; 0.6 | 1.32 ± 0.14 | −0.61 ± 0.28 | 66.19 ± 0.09; 0.8 | 1.10 ± 0.29 | −0.39 ± 0.22 | 64.93 ± 0.35; 1.0 | −1.92 ± 0.81 | −2.59 ± 0.57 | 61.30 ± 0.48.
- **With odds as feature:** 0.0 | −0.12 ± 0.24 | −3.83 ± 0.22 | 68.80 ± 0.06; 0.2 | 0.72 ± 0.13 | −2.50 ± 0.14 | 68.37 ± 0.04; **0.4 | 1.49 ± 0.10 | −1.30 ± 0.12 | 67.48 ± 0.10**; 0.6 | 1.02 ± 0.20 | −1.15 ± 0.22 | 66.55 ± 0.10; 0.8 | 1.00 ± 0.35 | −0.45 ± 0.28 | 65.19 ± 0.27; 1.0 | −1.22 ± 0.51 | −2.25 ± 0.30 | 61.77 ± 0.44.
- Paper's reading (5.5): decorrelation term "generally helps both the basic unif as well as the standard sharpe strategies to generate more profits, while there is a sweet spot in tuning the tradeoff parameter γ"; sharpe "consistently dominates" unif; "with the sharpe strategy, we were consistently able to generate statistically significant positive returns, despite the clearly inferior accuracy of the predictive model" (model ≤ 68.80 vs bookmaker 69 ± 2.5).
- Model–market Pearson correlation: 0.87 (no-odds models) vs 0.95 (with-odds models) — confirming the odds feature raises correlation.
- **Table 4 (simulation, profits in %):** at Corr(T,R) = 0.85: Corr(T,M) = 0.85 → W_sharpe 11.15%, W_unif 3.14%, accuracy 70.11%; Corr(T,M) = 0.90 → 6.14%, 0.52%, 70.05%; Corr(T,M) = 0.95 → −1.73%, −5.46%, 70.08%. Profits decay monotonically as Corr(T,M) rises at fixed accuracy — the cleanest demonstration of the thesis. "Spotted" (bettor right, bookmaker wrong) proportion is higher at lower Corr(T,M) in all cases (e.g., 8.12% at 0.85/0.85).
- Example 4.2: half-Kelly on decorrelated estimates yields W_G = 0.038 > 0 vs 0 on coincident estimates — decorrelation rescues fractional Kelly where full Kelly is inert.

## 8. Code / data availability
None stated. Model architecture from the author's master's thesis [28] and Hubáček et al., IJF 2019 [29] (both cited, not linked). Data sources named (NBA official box scores 2000–2014, Pinnacle closing odds 2010–2014); no URLs given beyond pinnacle.com.

## 9. Leakage & limitations
- **unif never profitable** on real data (best −0.39 ± 0.22): the "bad model wins" claim rests entirely on the sharpe/MPT strategy, which uses the model's own t_i in the variance terms — estimation-error feedback the paper under-discusses.
- **Closing odds** (2010–2014) are the hardest benchmark (market-adjusted); pre-2010 odds mix bookmakers with 4.5% margins — inconsistent market definition across the sample.
- Including odds as a feature **hurts** decorrelation (0.95 vs 0.87 correlation) yet is the realistic choice for a production model — the paper's best no-odds result leans on an artificial handicap.
- Theory assumes unbiased estimators and omits the spread; MSE* admitted as intuition, not derivation (7.1); correlation is "certainly not suited to convey the problem insights in full" (authors' words).
- Decorrelation can *hurt* if the trader's model is actually superior (4.3, Figure 5) — the technique is only for the inferior-model regime; the paper gives no online test for which regime you're in.
- Profit units in Table 3 are not normalized (unlike Table 4's %); stake sizing for unif (unit d) is a free hyperparameter, making cross-setting profit comparisons fragile.
- External validity to NFL: NBA two-way (no draw) maps cleanly; NFL moneylines similar, but spreads/totals are the liquid NFL markets and need the n-way extension (claimed "directly applicable," not demonstrated).

## 10. GSE overlap
Per existing-research-map: fills **gap #1-adjacent territory** — paper 0171 established fractional-Kelly/drawdown-constrained staking as the ruin-avoidance layer; this paper supplies the missing *training* layer (decorrelate from the market during model fitting). The map already lists the "bookmaker-rigging critique" (1710.02824) as absorbed, which argues markets are adversarially priced — consistent with, not duplicative of, this paper's program (this one tells you what to *do* about it: change the loss). No decorrelation-objective or market-taker-advantage formalization exists in Garrett's corpus. **Extension** of the Kelly/bet-sizing lane into model training.

## 11. GSE implementation spec
1. **Loss change:** add a decorrelation penalty to GSE's win-probability model training: L = XENT (or MSE on probabilities) − γ·(t_i − m_i)² (betting-adapted MSE* from 5.4), where m_i = consensus market probability (de-vigged, multi-book average from the Odds API account). Tune γ ∈ {0.1, …, 1.0} on a validation window.
2. **Feature audit:** train with and without market-odds features; expect the with-odds model to need larger γ (paper: 0.95 vs 0.87 correlation).
3. **Staking:** keep the paper-0171 fractional-Kelly/drawdown-constrained layer — this paper shows fractional Kelly is exactly the strategy class that benefits from decorrelation (Example 4.2, W_G = 0.038).
4. **Regime check:** before deploying γ > 0, verify the model is *not* already superior to the market on XENT (paper 4.3: decorrelation hurts superior models). If GSE's model beats consensus XENT, use γ = 0.
5. **Serving:** no serving change — same probability outputs; only training loss and γ change. Effort: 1–2 days to add the loss term; 1 week for the γ sweep on 2023–2024 holdout.

## 12. Reproducible test
Dataset: NFL games 2015–2024 with Pinnacle/consensus closing moneylines (existing Odds API + historical odds archive). Protocol: chronological — train on seasons ≤ k−1, test season k, for k = 2020…2024. Model: GSE's current win-probability model (or logistic baseline on nflverse features) trained with (a) plain XENT (γ = 0) and (b) MSE* with γ ∈ {0.2, 0.4, 0.6}. Metric: realized ROI of the sharpe-style (MPT/Sharpe) staking on positive-EV sides only, plus model–market Pearson correlation and accuracy. Baselines to beat: γ = 0 model profit and the bookmaker (shorter-odds accuracy).

## 13. Acceptance / rejection gate
**Adopt** the decorrelation loss (γ > 0) if, on the 2020–2024 chronological test: (i) some γ ∈ {0.2, 0.4, 0.6} yields total ROI ≥ 2 percentage points above the γ = 0 model under identical sharpe staking, AND (ii) the γ = 0 model does not already beat market consensus on XENT (confirming the inferior-model regime), AND (iii) model–market correlation decreases monotonically in γ. **Reject** (keep pure-accuracy training) if no γ beats γ = 0 by ≥ 2 pp ROI, or if the model is already XENT-superior to the market. Gate set before running.

## 14. Improvement experiment
Go beyond the paper: the authors note (7.1) the right target is an integral over the profitability vector field (Figure 1), not correlation, and that end-to-end profit optimization would remove the surrogate loss entirely. Run it: train the probability model with a **differentiable backtest loss** — expected log-growth of a fractional-Kelly bankroll over the training window, computed directly from (t_i, m_i, outcomes) — instead of MSE*. Compare its out-of-sample ROI against the best MSE* γ from Section 12. Hypothesis: direct profit optimization dominates the two-stage accuracy+decorrelation proxy, especially because it automatically handles the superior/inferior regime switch the paper leaves to the practitioner. Second axis: replace the correlation penalty with a penalty on the *residual* correlation Corr[(T−R), (M−R)] (the Wunderlich & Memmert [77] variant the paper discusses but doesn't test), which targets shared error structure rather than shared predictions.
