# [0304] Combining historical data and bookmakers'odds in modelling football scores (arXiv:1802.08848)

**Citation:** Leonardo Egidi, Francesco Pauli, Nicola Torelli (2018). *Combining historical data and bookmakers'odds in modelling football scores*. arXiv:1802.08848v1. URL: https://arxiv.org/abs/1802.08848
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2168 lines).
**Verdict:** ADAPT — the odds→implicit-scoring-intensity→Poisson-rate pipeline is the right way to fuse market consensus with historical models, but GSE should run it on de-vigged NFL point-total markets (not 3-way soccer odds) and replace the static season-level dynamics.

## 1. Research question
Can bookmakers' betting odds — the most accurate available probability forecasts — be folded directly into a direct-score Poisson model (rather than only serving as a benchmark), so that team scoring rates are convex combinations of historically-estimated parameters and odds-implied intensities, improving fit and predictive accuracy for match outcomes? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Scores:** exact scores for Italian Serie A, English Premier League, German Bundesliga, Spanish La Liga, seasons 2007/2008–2016/2017.
- **Odds:** all three-way (Win/Draw/Loss) odds from 7 bookmakers: Bet365, Bet&Win, Interwetten, Ladbrokes, Sportingbet, VC Bet, William Hill; public source football-data.co.uk.
- **Train/test:** Tr = 2007/2008–2015/2016 (9 seasons), Ts = 2016/2017 (10th season, the out-of-sample set).
- **Access:** public (football-data.co.uk).

## 3. Method / model
- **Odds→probability:** two de-vigging procedures — basic normalization `π_i = o_i/β` (2.1), and Shin's procedure (2.2): `π(z)_i = [z + √(z² + 4(1−z)(Σ_i o_i²/Σ_i o_i) − z)] / [2(1−z)]`, with insider-trading rate z estimated by nonlinear least squares (`Argmin_z Σ_i π(z)_i − 1`).
- **Odds→implicit scoring intensities:** for each match m and bookmaker s, solve the nonlinear system (3.2): `π^s_Win,m + π^s_Draw,m = P(y_m1 ≥ y_m2 | θ^s_m1, θ^s_m2)`, `π^s_Loss,m = P(y_m1 < y_m2 | θ^s_m1, θ^s_m2)` — the win/draw/loss probabilities expressed through Skellam (Poisson-difference) goal distributions with mean θ^s_m1 − θ^s_m2. Solution gives implicit rates θ̂^s_m1, θ̂^s_m2: the scoring intensities "implicit in the three-way bookmakers' odds".
- **Score model (3.3):** `y_m1 | θ_m1, λ_m1 ~ Poisson(p_m1 θ_m1 + (1 − p_m1) λ_m1)`, `y_m2 | θ_m2, λ_m2 ~ Poisson(p_m2 θ_m2 + (1 − p_m2) λ_m2)` — Poisson rates are **convex combinations** of historical parameters θ and bookmaker parameters λ, with match-specific mixture weights `p_m· ~ Beta(a, b)` (non-informative prior).
- **Rate structure (3.4):** `log(θ_m1) = μ + att_{t[m]1} + def_{t[m]2}`, `log(θ_m2) = att_{t[m]2} + def_{t[m]1}` — μ = home effect; seasonal AR(1)-style dynamics (3.5): `att_{t,τ} ~ N(μ_att + att_{t,τ−1}, σ²_att)`, `def_{t,τ} ~ N(μ_def + def_{t,τ−1}, σ²_def)`, with zero-sum identifiability per season; weakly informative priors μ, μ_att, μ_def ~ N(0,10), σ_att, σ_def ~ half-Cauchy(0,2.5).
- **Bookmaker level (3.7)–(3.8):** `θ̂^1_m1 ... θ̂^S_m1 ~ truncN(λ_m1, τ²_1, 0, ∞)` (truncated normal across the S=7 bookmakers), `λ_m1 ~ truncN(α_1, 10, 0, ∞)`.
- **Conditional independence** of the two teams' goals assumed (Baio & Blangiardo 2010 rationale: hierarchy induces correlation).
- **Implementation:** WinBUGS + Stan; MCMC H=5000 iterations, 1000 burn-in; Gelman et al. (2014) diagnostics.
- **Posterior predictions:** `ỹ_m1 − ỹ_m2 ~ Skellam(γ̂_m1, γ̂_m2)` with `γ̂_m1 = p̂_m1 θ̂_m1 + (1 − p̂_m1) λ̂_m1`.

## 4. Equations & assumptions
- `π_i = o_i / β`, `β = Σ_i o_i` (2.1, basic normalization)
- Shin's `π(z)_i = [z + √(z² + 4(1−z)(Σ o_i²/Σ o_i) − z)] / [2(1−z)]` (2.2)
- Implicit-intensity system: `π^s_Win,m + π^s_Draw,m = P(y_m1 ≥ y_m2 | θ^s_m1, θ^s_m2)`, `π^s_Loss,m = P(y_m1 < y_m2 | θ^s_m1, θ^s_m2)` (3.2); `y_m1 − y_m2 ~ Poisson-Difference(θ^s_m1, θ^s_m2)` (Skellam).
- `y_m1 | θ_m1, λ_m1 ~ Poisson(p_m1 θ_m1 + (1 − p_m1) λ_m1)`, `y_m2 | θ_m2, λ_m2 ~ Poisson(p_m2 θ_m2 + (1 − p_m2) λ_m2)` (3.3)
- `log(θ_m1) = μ + att_{t[m]1} + def_{t[m]2}`, `log(θ_m2) = att_{t[m]2} + def_{t[m]1}` (3.4)
- `att_{t,τ} ~ N(μ_att + att_{t,τ−1}, σ²_att)`, `def_{t,τ} ~ N(μ_def + def_{t,τ−1}, σ²_def)` (3.5); season-1 initialization (3.6); zero-sum constraints; `μ, μ_att, μ_def ~ N(0,10)`, `σ_att, σ_def ~ Cauchy+(0,2.5)`.
- `θ̂^1_m1 ... θ̂^S_m1 ~ truncN(λ_m1, τ²_1, 0, ∞)`, `λ_m1 ~ truncN(α_1, 10, 0, ∞)` (3.7)–(3.8)
- Average correct probability: `p̄ = (1/M) Σ_m Σ_{i∈Δ_m} p_{i,m} δ_im` (5.1)
- Assumptions: bookmaker odds are the most accurate forecast source (Štrumbelj 2014); home advantage constant across teams and seasons; no relegation/promotion structure (fewer observations for newly promoted teams — acknowledged); transfer markets unmodeled (Chelsea 2016/17 title miss on preseason odds is the authors' own example of failure).

## 5. Features / target
- **Inputs:** historical scores (9 seasons) + per-match 3-way odds from 7 bookmakers.
- **Target:** posterior three-way probabilities `p_Win, p_Draw, p_Loss` per match; posterior team-strength effects; posterior league-rank/relegation probabilities.

## 6. Validation design
- Posterior predictive checks: replicated goal-difference distributions vs observed (Fig. 4); Bayesian p-values framework (4.1) described.
- Out-of-sample test on the 10th season (2016/2017): average correct probability p̄ (5.1) compared against Shin probabilities and basic normalization probabilities (Table 3).
- Betting experiment (Sec. 5): Strategy A = bet 1 unit on the three-way outcome with highest expected return per model probabilities; Strategy B = size bets by match profit variability (Rue & Salvesen 2000); expected profits ± SE reported per league per bookmaker (Fig. 7).

## 7. Numerical results / baselines
- **Average correct probability p̄ (Table 3):** Bundesliga — model 0.4010 vs Shin 0.4100 vs basic 0.4072; Premier League — 0.4349 vs 0.4516 vs 0.4480; La Liga — 0.4553 vs 0.4584 vs 0.4549; Serie A — 0.4430 vs 0.4554 vs 0.4507. **The model is slightly worse than raw bookmaker probabilities on average correct prediction** — authors acknowledge p̄ "does not take into account the possible profits for the single matches."
- **Posterior title probabilities at start of 2016/17 (Table 1):** Bayern Munich P(1st)=0.8168 (won, 82 pts); Man City P(1st)=0.3904 but Chelsea won (P=0.1396 — Chelsea's miss attributed to the prior-season slump and the unmodeled Conte hiring); Barcelona P(1st)=0.5652 but Real Madrid won (P=0.3868); Juventus P(1st)=0.592 (won, 91 pts).
- **Relegation (Table 2):** correctly identified worst teams (e.g., Pescara P(20th)=0.46, actual 20th).
- **Mixture weights (Fig. 3, Bundesliga 2754 matches):** ordered posterior 50% bars for p_·1, p_·2 center around ~0.5 — "the amount of information that stems from the bookmakers is comparable with that arising from historical information."
- **Betting (Fig. 7, per authors):** "betting with our posterior model probabilities yields high positive returns for each league and each bookmaker," while betting with raw odds probabilities "would always incur a sure loss."

## 8. Code / data availability
None stated (WinBUGS/Stan implementations not shared). Data public via football-data.co.uk (scores + historical odds).

## 9. Leakage & limitations
- **The headline betting profits are the weakest link:** strategies A/B are chosen post hoc; no walk-forward, no stated test-train discipline for the betting rules themselves; the "sure loss" baseline is a strawman (raw vigged odds always lose — that proves nothing about the model). Profit magnitudes are shown only in a chart, not tabulated.
- **p̄ shows no average-probability gain** over simple de-vigged odds — the model's informational contribution per match is marginal on the proper scoring metric.
- Season-level dynamics only (yearly AR terms); no within-season updating; no transfer/relagation handling; Chelsea/Conte example shows the prior-season-only conditioning can miss regime changes.
- Soccer 3-way only — NFL has no draw market; the implicit-intensity inversion must be re-derived for spreads/totals (Skellam on margin still works for moneyline, but NFL scoring isn't goals-Poisson).
- Booksum normalization ≈ "basic"; no favorite-longshot bias correction comparison beyond Shin.

## 10. GSE overlap
Existing-research map: Dixon-Coles, Skellam, and de-vigged consensus are all inventoried (Section 1 — metrics inventoried; market microstructure: "de-vigged consensus"). **No repo work fuses odds-implied scoring intensities INTO the score model** — the map's odds lane treats consensus as a benchmark/label (CLV), not as a Bayesian data level. This paper's hierarchical convex-combination construction is a **new capability** (a formal fusion operator), directly relevant to the gap-list market-microstructure item (#3).

## 11. GSE implementation spec
1. **Port the fusion architecture to NFL:** historical team-strength model (GSE's existing nflverse-based team ratings) as θ; odds-implied scoring rates λ derived by inverting de-vigged spread/total markets through a margin Skellam (NFL margins are discrete — solve for implied team scoring rates from spread/total the way the paper solves for θ from 3-way odds).
2. Replace the paper's seasonal AR with GSE's existing dynamic Elo/state-space (nested AR(1) team strength, already in repo per 1701.05976) — the convex combination `p·θ + (1−p)·λ` stays as the fusion level, with per-match weights learned (Beta prior as in the paper).
3. Fit in Stan/PyMC (WinBUGS obsolete); the paper's full spec (3.3)–(3.8) ports nearly verbatim with Skellam on point margins.
4. Data: nflverse 2009–2025 + historical odds (Odds API archive / GSE backtest data). Effort: ~2–3 weeks for the Stan prototype.

## 12. Reproducible test
Dataset: NFL 2019–2025. Train on seasons through 2022; predict 2023–2025 game outcomes. Baseline 1: GSE's existing team-strength model alone (θ only). Baseline 2: pure de-vigged consensus odds (λ only). Metric: log-loss on moneyline probabilities + CLV beat rate. Success = fused model (learned p) beats BOTH baselines on log-loss by ≥0.005 on the 2023–2025 holdout, with posterior p_· weights stable across seasons (the paper's ~0.5 balance is the sanity check, not the target).

## 13. Acceptance / rejection gate
**Adopt** the odds-fusion level if the 2023–2025 holdout shows the fused model beats both the history-only and odds-only baselines on moneyline log-loss by ≥0.005 with 95% posterior CI excluding zero; **reject** if the learned mixture weight collapses to p≈0 (pure market model) — then the honest conclusion is the market already prices everything the history model knows, and GSE should just use de-vigged consensus directly.

## 14. Improvement experiment
Make the mixture weight **state-dependent**: `p_m = logistic(β₀ + β₁·line_age + β₂·handle_proxy + β₃·injury_news_flag)` — the paper's constant p_· throws away the key fact that the market's informational weight varies (fresh consensus after injury news ≈ pure market; stale opening lines ≈ mostly history). Estimating when the market knows more than the model is a genuine advance over the paper's static Beta prior and directly feeds GSE's market-relative learning lane.
