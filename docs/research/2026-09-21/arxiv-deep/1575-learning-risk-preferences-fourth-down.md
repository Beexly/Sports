# [1575] Learning Risk Preferences in Markov Decision Processes: an Application to the Fourth Down Decision in the National Football League (arXiv:2309.00756) — replacement for 1567

**Citation:** Nathan Sandholtz, Lucas Wu, Martin Puterman, Timothy C.Y. Chan (2023). *Learning Risk Preferences in Markov Decision Processes: an Application to the Fourth Down Decision in the National Football League*. arXiv:2309.00756. URL: https://arxiv.org/abs/2309.00756
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

inverse optimization that recovers NFL coaches' implicit risk preferences as a quantile parameter τ from 9 seasons of 4th-down decisions; directly upgrades GSE's 4th-down behavior model, win-probability edge detection, and opponent-tendency content.
**Replaces:** ledger 1567 (2502.08430, REJECT).

## 1. Research question
NFL coaches' 4th-down decisions persistently deviate from risk-neutral/win-probability prescriptions. Instead of prescribing what coaches *should* do, assume their observed decisions are optimal under some unknown risk measure, and estimate that risk measure — parametrized as the quantile τ of the next-state value distribution — via inverse optimization of a quantile MDP. How conservative are coaches, in quantified quantile terms, and how does τ vary by field position, win probability, quarter, season, and coach?

## 2. Dataset / schema
nflfastR NFL play-by-play, 9 seasons (2014–2022), accessed via the nflfastR R package (Carl and Baldwin 2024). Fields: down, yards to go, yardline, play type, time remaining, score differential, plus derived features (drive length) and model outputs (estimated win probability). State space: S^play = {A,B} × {1,2,3,4} × {yardline bins of 10} × {1,…,9,10+} plus scoring states {A,B}×{TD,FG,SAF}; S^4 ⊂ S^play are 4th-down states σ. Action set A = {GO, FGA, PUNT}. Win-probability estimates from Carl and Baldwin 2024 (tree-based, includes score differential, time remaining, Vegas pregame spread). Coach-team plots restrict to coaches with ≥25 observed 4th-down decisions per field region per win-probability range. 200 bootstrap samples (game-level resampling). Reproduction code: https://github.com/nsandholtz/fourth_down_risk.

## 3. Method / model
Forward model: one-period MDP for the 4th-down decision; future play after t+1 follows fixed league-average stationary policy π̄ (a Markov reward process). The novel candidate objective class: τ-quantiles of the next-state value distribution V^π̄(σ,a) = r(S_{t+1}(σ,a)) + E_π̄[Σ_{n≥t+2} r(S_n) | S_{t+1}], i.e. coach maximizes Q_τ[V^π̄(σ,a)] rather than E[V^π̄(σ,a)]. Using the next-state value (immediate reward + expected remainder) instead of the full return distribution deliberately avoids assuming coaches use the same quantile in all future situations. Inverse problem: min_{τ∈[0,1]} (1/N)Σ_j 1(a_j ≠ a*_j(σ_j, q^π̄_τ)), average Hamming loss between observed decisions and τ-optimal decisions (Eq. 4.11). Partition extension: L=2 subsets (own half vs opponent half of field, split at the 50-yardline — L≥3 is underidentified given |A|=3); estimate (τ_1, τ_2) jointly (Eq. 5.5). Inference: transition probabilities by empirical proportions; value function via infinite-horizon approximation of Chan, Fernandes and Puterman 2021; quantiles from empirical next-state value distribution, then regularized with bivariate monotonic smoothing (SCAM, Pya & Wood 2015 tensor-product penalized B-splines, k=4 knots, monotonic-decreasing in yardline and yards-to-go) and GO-transition augmentation with 3rd-down plays à la Romer 2006 to counter Daly-Grafstein 2023 selection bias. Uncertainty: 200 game-level bootstrap samples; point estimates = medians of the optimal-τ sets; inference restricted to τ∈[0.2,0.8] because τ-optimal policies plateau at extremes. 4th Down Bot (Baldwin 2024, nfl4th) run through the same inverse pipeline as a risk-neutral reference "translation".

## 4. Equations & assumptions
- Rewards: r(s) = 6.95 for (A,TD) (6 + league-average conversion value), 3 for FG, −2 for safety; negated for team B (Eq. 3.3).
- Forward: max_{a∈A} q^{π_{t+1}}_t(σ,a) (Eq. 3.4), π_{t+1} fixed at league-average π̄.
- Next-state value: V^π̄_t(σ,a) := r(S_{t+1}(σ,a)) + E_π̄[Σ_{n=t+2}^{T} r(S_n) | S_{t+1}(σ,a)] (Eq. 4.3); value function v^π̄_t(s) := E_π̄[Σ_{n=t+1}^{T} r(S_n) | S_t = s] (Eq. 4.4).
- Quantile objective: q^π̄_τ(σ,a) = Q_τ[V^π̄(σ,a)] = inf{x : τ ≤ F_{V^π̄}(x|σ,a)} (Eq. 4.6); class Q^π̄ = {q^π̄_τ : τ∈[0,1]} (Eq. 4.7).
- Inverse: min_τ (1/N)Σ_j 1(a_j ≠ a*_j(σ_j, q^π̄_τ)) (Eq. 4.11); two-region version (Eq. 4.12); estimator τ̂ = argmin over [0,1]² (Eq. 5.5).
- Transitions: empirical proportions p̂(s′|σ,a) (Eq. 5.1), p̂(s′|s,π̄) (Eq. 5.2).
- Quantile estimate: q̂^π̄_τ(σ,a) = inf{x : τ ≤ F̂_{V^π̄}(x)} (Eq. 5.4).
- Performance regression: AvgPointsGained_{ijkℓ} = β_0 + β_1 τ̂_{ijkℓ} + β_2 Elo_{ij} + β_3 1(ℓ=Own) + ε (Eq. 6.2).
- Assumptions: coaches' decisions optimal under *some* quantile (admitted as fiction — true objective mixes WP, conformity, experience); stationary league-average π̄; score differential/time/timeouts excluded from state space (stratified later by WP as proxy); transition probabilities league-wide (not team-specific); finite-support next-state value.

## 5. Features / target
Features: 4th-down state σ = (yardline bin, yards to go), field region (own/opponent half), win-probability bin, quarter, season, coach-team. Target: the observed decision a_j ∈ {GO, FGA, PUNT} (fitted, not predicted) and the estimand τ̂ — the quantile that makes observed decisions minimally suboptimal. Secondary target: Avg Points Gained per 4th-down play (Eq. 6.1: Σ(v̂(s_{t+1})−v̂(s_t))/N) for the performance regression.

## 6. Validation design
No train/test split — this is inverse inference, not prediction. Validation logic: (i) fitted quantile policies reproduce observed decision maps; (ii) 200 game-level bootstrap samples (preserving within/across-drive dependence) give 95% CIs on τ̂ and on all contrasts (τ̂_1−τ̂_2, Bot−League); (iii) 4th Down Bot and a risk-neutral policy passed through the identical inverse pipeline as reference "translations"; (iv) robustness cuts: by WP bin (20 bins), by quarter (Q4 vs Q1–Q3), by season, by coach-team (≥25 decisions), by score differential × 4th-quarter minutes. Q4 decisions excluded only in the low-WP group after Figure 8 showed Q4≈Q1–Q3 elsewhere. Identifiability analysis: L≥3 partitions underidentified (loss equal at minimum); inference restricted to τ∈[0.2,0.8] where policies still vary.

## 7. Numerical results / baselines
- League aggregate: coaches' behavior consistent with optimizing *low quantiles* of next-state value — conservative risk preferences — in both field regions and nearly every WP range, vs. the 4th Down Bot.
- τ̂_1 − τ̂_2 (opponent half minus own half) > 0 with 95% CIs excluding 0 until WP ≥ 0.8: coaches clearly more risk-tolerant in the opponent's half at low-to-mid WP; gap dissipates as WP→1.
- Bot−League gaps largest in own half at low WP; only exception: opponent half at WP<0.05, where league τ̂ matches the Bot (desperation aligns behavior with WP).
- Time trend: league risk tolerance increased over 2014–2022 in every WP×region cell, more pronounced in the opponent's half.
- Quarter: Q4 vs Q1–Q3 indistinguishable except WP<0.2, where Q4 is much more risk-tolerant.
- Coaches: no coach's median τ̂_2 (own half) exceeds the risk-neutral reference in any WP range; in the opponent half at low WP, ~half of coaches are risk-seeking vs risk-neutral, with Matt Nagy, Jay Gruden, Mike McCarthy, Doug Pederson medians even exceeding the 4th Down Bot. Own-half behavior uniform across coaches; opponent-half shows wide variation.
- Performance regression (N=622 coach-season-WP-region cells): β_1(τ̂) = 0.769*** (0.138), partial R² 0.048; β_2(Elo) = 0.036***; β_3(own-half indicator) = 0.079***; R² = 0.059, adj. R² = 0.054, F = 12.860***. Higher τ̂ → more average points gained: excessive risk aversion is negatively associated with 4th-down performance (consistent with Yam & Lopez 2019's ~0.4 wins/year cost estimate).

## 8. Code / data availability
R reproduction code public at https://github.com/nsandholtz/fourth_down_risk; data via nflfastR; references nfl4th (Baldwin 2024), scam, FiveThirtyEight Elo (archived, CSV still public). All reproducible from public sources.

## 9. Leakage & limitations
State space omits score differential, time remaining, timeouts (mitigated via WP stratification, which itself uses a tree model including the Vegas spread — mild circularity since markets price in coaching tendencies, but WP is only a stratifier here). League-wide transitions ignore team strength (acknowledged; data sparsity). Daly-Grafstein 2023 selection bias: teams that go for it are better at it; authors counter with 3rd-down augmentation + monotonic smoothing, and show the Bot's "translated" τ also differs by region — a fingerprint of residual selection bias, so region gaps are partly inflated. Rounding of yards-to-go (Lopez 2020) unaddressed. τ-optimal policies plateau outside [0.2,0.8] (underidentified extremes); multiple τ minimize loss per bootstrap sample (median-of-set point estimates). Low R² (0.059) on the performance regression — τ̂ explains ~5% of 4th-down points variance. 2014–2022 data; the aggression trend means 2023–2026 τ̂ would be higher — refit on current data before using.

## 10. GSE overlap
Directly fills GSE's opponent-behavior-modeling gap: GSE's WP/EP models are risk-neutral, but opposing *coaches* are not — predicting 4th-down decisions (GO vs FGA vs PUNT) by team requires a risk-preference parameter, and this paper supplies the exact estimand (τ per coach-team × field region × WP bin) plus the league trend showing the parameter is non-stationary. Complements 2402.12400 (player treatment effects) and 2412.08840 (2-for-1 value) as the third leg of GSE's in-game decision/causal stack. No duplication of existing corpus work: GSE has no inverse-preference machinery.

## 11. GSE implementation spec
Build `gse_coach_risk.py`: (1) pull nflverse play-by-play 2014–2025; (2) construct 4th-down state grid (yardline bin × yards-to-go) and empirical transitions p̂(s′|σ,a), augmenting GO with 3rd-down plays; (3) value function via Chan-Fernandes-Puterman infinite-horizon approximation; (4) next-state value distributions and τ-quantile decision maps for τ∈{0.2,…,0.8}, SCAM-style monotonic smoothing; (5) per-team-season-region τ̂ via the Hamming-loss inverse problem (Eq. 5.5), 200 game-level bootstraps for CIs; (6) serve τ̂(team, region, WP bin) as a feature into GSE's 4th-down decision classifier and WP model — predicted GO probability becomes a calibrated input to drive-outcome and live-WP edges; (7) weekly "coach risk report": τ̂ movement vs league trend for @GalaxySportsHQ content (e.g., "Coach X is the most risk-seeking on 4th down in opponent territory since 2023"). Refit each offseason; the 2014–2022→2026 trend shift means stale τ̂ systematically underrates aggression.

## 12. Reproducible test
Backtest: for 2024–2025 4th downs, compare three decision predictors — (a) risk-neutral WP-max rule, (b) league-average τ̂ rule, (c) team-specific τ̂ rule — on Hamming accuracy of actual GO/FGA/PUNT calls, stratified by field region. Pass gate: (c) beats (a) by ≥3 percentage points of accuracy in the opponent half (where coach variation is largest). Second gate: simulate expected-points gained by betting-team-agnostic "follow τ̂-optimal vs follow Bot" on the 2024 season; τ̂-optimal must not underperform the Bot by more than the bootstrap CI width (sanity check that the fitted preferences aren't pure noise).

## 13. Acceptance / rejection gate
Accepted: full NFL paper, public data + code, quantified estimand (τ̂) with bootstrapped uncertainty, coach-level heterogeneity, significant performance association (β_1=0.769***), and a direct GSE application (opponent 4th-down prediction + content). Passes the value bar comfortably.

## 14. Improvement experiment
Extend the inverse problem to team-specific transition probabilities via hierarchical partial pooling (team effects shrunk to league), which the authors skipped for sparsity reasons — GSE's 12-season nflverse pull plus pooling makes this feasible and would separate "coach is conservative" from "team is bad at converting." Second: add a third region (red zone / FG range boundary) with identifiability regularized by a fused-lasso penalty on adjacent τ's instead of hard L=2, recovering the L≥3 identification the authors abandoned.
