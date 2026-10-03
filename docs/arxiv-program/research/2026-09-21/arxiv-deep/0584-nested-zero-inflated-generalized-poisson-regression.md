# [0584] Nested Zero Inflated Generalized Poisson Regression for FIFA World Cup 2022 (arXiv:2205.04173v3)

**Citation:** Gilch, L. A. (2022/2026). *Nested Zero Inflated Generalized Poisson Regression for FIFA World Cup 2022*. arXiv:2205.04173v3. URL: https://arxiv.org/abs/2205.04173v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3918 lines, incl. appendices/tables).
**Verdict:** ADAPT — port the *nested regression + overdispersion/zero-inflation + date/importance-weighted fitting + Elo-update Monte Carlo tournament simulation* machinery to GSE's NFL playoff/Super Bowl probability engine; the zero-inflated Poisson per se is soccer-specific (NFL scores are high enough for normal approximations), but the nested attack-vs-defense regression, weighted-history fitting, and within-simulation Elo updating are directly transferable to team-strength-driven postseason simulation.

## 1. Research question
How do you forecast a whole international football tournament (exact scores, stage-by-stage advancement probabilities) from historical match data when scores are low-count, overdispersed, and zero-inflated? The paper proposes a *nested* zero-inflated generalized Poisson (ZIGP) regression that models the stronger team's goals from both attack and defense perspectives (averaged), then models the weaker team's goals *conditional on* the stronger team's realized score — and validates it against classical Poisson models on five past tournaments.

## 2. Dataset / schema
All matches of the 32 World Cup 2022 participants from 2016-01-01 to 2022-10-30 (eloratings.net data + World Football Elo ratings), weighted by date (half-life 3 years) and FIFA importance weights (4/3/2.5/1). Covariates: Elo points (top-6 on 2022-10-30: Brazil 2169, Argentina 2141, Spain 2045, Netherlands 2040, Belgium 2025, France 2005), match location (home/neutral/away coded 1/0/−1), and (for the weaker team) the stronger team's realized goals. Validation: back-simulation of World Cups 2010/2014/2018 and EURO 2016/2020. Access: public (eloratings.net; Elo formula published in-paper).

## 3. Method / model
Per match (A = stronger by Elo): (1a) ZIGP regression of A's goals on B's Elo + location: log μ_A(Elo_B) = α₀⁽¹⁾+α₁⁽¹⁾Elo_B+α₂⁽¹⁾loc; φ_A = 1+e^{β⁽¹⁾}; ω_A = γ⁽¹⁾/(1+γ⁽¹⁾). (1b) ZIGP regression of B's *goals against* on A's Elo + location: log ν_B(Elo_A) = α₀⁽²⁾+α₁⁽²⁾Elo_A+α₂⁽²⁾loc; ψ_B, δ_B analogous. (1c) Average the two parameter sets → (μ_{A|B}, φ_{A|B}, ω_{A|B}). (2) ZIGP regression of B's goals on A's Elo + location + **realized G_A**: log μ̄_{B|A} = α₀⁽³⁾+α₁⁽³⁾Elo_A+α₂⁽³⁾loc+α₃⁽³⁾G_A (the "nested" dependence — defense relaxes when ahead). (3) Simulate G_A then G_B|G_A. Tournament: 100,000 Monte Carlo replications; **Elo ratings updated after each simulated match within each replication** (form-over-tournament effect). Compared against independent Poisson and bivariate Poisson (Karlis & Ntzoufras, bivpois R package) baselines. Fitted in R 4.0.3 with the ZIGP package.

## 4. Equations & assumptions
- Elo update: Elo_after = Elo_before + K·G·(W−W_e); W_e = 1/(10^{−D/400}+1), D = Elo diff; G = 1 (draw/1-goal win), 1.5 (2-goal win), (11+N)/8 otherwise; K=60 (WC), 50 (continental), etc.
- Date weight: w_date(m) = (1/2)^{D(m)/H}, H = 3 years; importance weight: 4 (WC), 3 (continental), 2.5 (qualifier/Nations League), 1 (other); w(m) = product.
- ZIGP pmf: P(X=0) = ω+(1−ω)e^{−μ/φ}; P(X=k) = (1−ω)·μ(μ+(φ−1)k)^{k−1}/k!·φ^{−k}·e^{−(μ+(φ−1)k)/φ}, k≥1; reduces to Poisson at ω=0, φ=1. E(X) = (1−ω)μ; Var(X) = (1−ω)μ(φ²+ωμ).
- Nested likelihood factorisation: P(G_A=i, G_B=j) = P(G_A=i)·P(G_B=j|G_A=i).
- Worked example (France 2005 vs Denmark 1971, neutral): μ_France(1971) = exp(2.472632−0.0010679575·1971+0.2724600768·0) = 1.444391; ω_France = e^{−4.058738}/(1+e^{−4.058738}) = 0.0169776; mean goals = 1.419869. ν_Denmark(2005) = exp(−4.205890+0.0021582919·2005−0.371076439·0) = 1.129173; δ = 0.0000143. Averaged: μ_{France|Denmark} = 1.27585, φ = 1.000005, ω = 0.008495965. Denmark's μ̄ = exp(3.118465−0.0013932201·2005−0.03989474·G_A+0.051954905·0) = 1.32998 at G_A=1.
- Goodness of fit: χ²_T = Σ_i (x_i−μ̂_i)²/μ̂_i per team.
- Scoring functions: Brier BS = Σ_T Σ_{j=1}^6 (p_j(T)−1[result(T)=j])²; RPS = Σ_T (1/5)Σ_{i=1}^5 (Σ_{j=1}^i p_j(T)−1[result=j])², result ∈ {1=champion … 6=group exit}.
- Assumptions stated: stronger team dominates tactics (ordering A/B by Elo); independence across matches; Elo captures all team quality (no lineup/Champions-League-player covariates — unavailable pre-tournament); retrospective-only (no bookmaker odds); 3-year half-life is fixed, not tuned.

## 5. Features / target
Input features: opponent Elo, match location (1/0/−1), and (weaker team only) stronger team's realized goals. Target: exact goals G_A, G_B (count regression); downstream target: stage-advancement probabilities (champion/final/semifinal/quarterfinal/last-16/group-exit). Prediction horizon: single match → whole tournament bracket.

## 6. Validation design
Retrospective tournament backtests: fit on history up to each tournament, simulate 100k replications, score predicted stage-probability distributions against actual stage outcomes with Brier and RPS. Five tournaments: WC 2010/2014/2018, EURO 2016/2020. Baselines: independent Poisson regression, bivariate Poisson regression (same covariates). No ablation of the weighting scheme or of the nested structure separately.

## 7. Numerical results / baselines
- WC 2010: BS 17.79 (ZIGP) vs 17.97 (BV) vs 17.97 (IP); RPS 4.93 vs 4.99 vs 5.05.
- WC 2014: BS 20.18 vs 22.33 vs 22.10; RPS 5.06 vs 5.52 vs 5.48.
- WC 2018: BS 18.51 vs 18.00 vs 18.39; RPS 5.54 vs 5.51 vs 5.51 (ZIGP worse; author blames Germany's group-stage collapse after 10/10 qualifying wins).
- EURO 2016: BS 17.52 vs 23.27 vs 23.25; RPS 5.28 vs 5.97 vs 5.98 (ZIGP clearly best).
- EURO 2020: BS 14.54 vs 14.36 vs 16.37; RPS 5.06 vs 5.07 vs 5.19 (tie).
- GoF: most teams p≥0.14 on (2.1); exceptions Ghana, Costa Rica (attack), Argentina (p=0.005), Canada, Uruguay (defense), Qatar/US (weaker-team model) — mostly weak teams with few observations.
- WC 2022 forecast (100k sims): Brazil champion 17.3%, Argentina 13.1%, Belgium 10.8%, Spain 10.2%, Netherlands 10.0%, France 8.4%; England 3.5%, Germany 3.6%. (Actual 2022: Argentina won — inside the model's top-2.)
- All numbers are the paper's claims on its retrospective sims.

## 8. Code / data availability
Fitted in R with the ZIGP package (public); data from eloratings.net (public). No model-code repository is stated — "Not stated in paper" for a public code repo. Reproducible in principle from the fully specified equations.

## 9. Leakage & limitations
- No leakage (retrospective fits precede each tournament). Limitations: the 3-year half-life and FIFA importance weights are fixed by convention (Ley et al. 2019), not tuned — the author admits non-weighting sometimes performs no worse; 2018 failure shows heavy recency weighting can lock in stale form (Germany 10/10 qualifiers → group exit); the nested ordering (A=stronger by Elo) breaks down when Elo misranks (the exact upset cases that matter); no uncertainty on regression parameters (plug-in); only Qatar gets home advantage, so the location coefficient is estimated almost entirely from historical home games of other teams; GoF failures concentrated in weak teams with few matches (high-variance estimates exactly where upsets come from); no comparison against bookmaker-implied probabilities (the honest baseline — deliberately excluded as "prospective"); Elo is the *only* quality covariate (no squad/market values).
- NFL transfer caveat: ZIGP is a low-count distribution — NFL game scores (~20–30 points) are better served by normal/negative-binomial models; the transferable components are the *nesting*, the *weighting*, and the *within-simulation rating update*, not the ZIGP likelihood.

## 10. GSE overlap
Extension with a clear home. Existing-research-map: GSE already simulates seasons/playoffs (Monte Carlo engine), uses Elo variants, and the 26-metric catalog covers Poisson-based soccer models only as background. **No existing GSE component does all three of: (a) nested offense-vs-defense score regression (attack strength averaged with opponent's defensive weakness — the "both points of view" averaging), (b) date+importance-weighted historical fitting with an explicit half-life, (c) updating team ratings *inside* each Monte Carlo replication to capture form/momentum.** The in-simulation Elo update is the most novel transferable idea vs GSE's current static-strength playoff sims. Verdict: **extension** — upgrades the existing simulation lane, doesn't duplicate it.

## 11. GSE implementation spec
1. Replace goals with NFL points: per-game team points ~ Normal (or negative binomial) with mean from nested regression — μ_A(offense of A vs defense of B, averaged both-ways) then μ_B|A conditional on realized points_A (garbage-time/defense-relaxation effect is real in NFL too).
2. Covariates: GSE team-strength ratings (Elo/nested AR(1)) instead of Elo points; home/neutral; rest differential; keep the paper's log-link structure.
3. Fit on 2009–present game data with the paper's weighting: w(m) = (1/2)^{days/1095} × importance (playoff games weighted 2–4×, mirroring FIFA weights) — tune the half-life H on backtests rather than fixing at 3 years (the paper's admitted weakness).
4. Playoff simulation: 100k replications of the bracket; **update team strength inside each replication after each simulated game** (the paper's form effect); emit stage probabilities (wild card/divisional/championship/Super Bowl).
5. Effort: ~2 weeks for one engineer (regression + simulation harness; GSE already has the sim infrastructure).

## 12. Reproducible test
Dataset: nflverse 2016–2024 regular seasons + playoffs. Fit nested regression on regular seasons 2016–Y (H tuned on 2016–2019), simulate each postseason Y+1 (2020–2024) 100k times with in-simulation strength updates. Metric: Brier score and RPS on stage-advancement probabilities (wild-card/divisional/championship/Super Bowl/win) vs actual outcomes. Baselines: (a) GSE's current static-strength playoff sim; (b) market (closing Super Bowl futures-implied probabilities renormalised per stage). Time window: strictly retrospective — fit through each regular season, predict that season's playoffs.

## 13. Acceptance / rejection gate
ADOPT the nested + in-simulation-update playoff engine if, across postseasons 2020–2024: mean Brier score beats GSE's current static-strength sim by ≥5% AND beats or ties the futures-implied baseline on RPS in ≥4 of 5 postseasons. REJECT if the in-simulation update adds nothing over the static sim (then keep the nested regression only as a score model) or if tuning H collapses to "no weighting" with equal performance (then drop the weighting as the paper's own results suggest is possible).

## 14. Improvement experiment
Beyond the paper: replace the fixed half-life with **team-specific, regime-aware decay** — weight each team's historical games by a learned recency kernel whose half-life shortens after coaching/QB changes (structural breaks), estimated by maximizing backtest log-likelihood on 2016–2019. Test on the §12 protocol whether adaptive decay beats the fixed 3-year half-life — directly attacking the paper's stated weakness (Germany 2018: stale form locked in by heavy recency weights that still weren't adaptive to regime change).
