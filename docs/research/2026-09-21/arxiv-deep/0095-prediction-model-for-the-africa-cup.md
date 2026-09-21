# [0095] Prediction Model for the Africa Cup of Nations 2019 via Nested Poisson Regression (arXiv:1905.03628)

**Citation:** Lorenz A. Gilch (2019). *Prediction Model for the Africa Cup of Nations 2019 via Nested Poisson Regression*. arXiv:1905.03628v1. URL: https://arxiv.org/abs/1905.03628
**Ledger completed:** 2026-09-21. **Read:** full text (PDF extract, 631 lines; ar5iv HTML did not render).
**Verdict:** ADAPT — the nested conditional-dependence structure (weaker team's rate depends on the stronger team's *realized* goals) is a portable idea for correlated in-play scoring models; the AFCON-specific Elo-Poisson fit itself is not an engine candidate.

## 1. Research question
Can a "nested" Poisson regression — where the weaker team's goal rate depends on the stronger team's realized goals — produce well-fitting, quantitative stage-by-stage tournament probabilities for AFCON 2019 (24 teams, including the then-new best-third-place qualifier rule), using only World Football Elo ratings and neutral-ground matches since 2010? (Abstract; Sec. 1)

## 2. Dataset / schema
- All matches on **neutral ground** of the 24 AFCON 2019 participants, **1.1.2010 – 12.04.2019**; average ~29 matches per team (more for top teams). Home matches deliberately excluded to remove home drift.
- Covariates: World Football Elo ratings (eloratings.net) as of 12 April 2019 — top 5: Senegal 1764, Nigeria 1717, Morocco 1706, Tunisia 1642, Ghana 1634.
- **Access:** public in principle (Elo ratings + public match records); no direct download link stated.

## 3. Method / model
- **Nested Poisson regression (Sec. 2.2):** match A vs B modeled as G_A : G_B. Assume A has the higher Elo ("the better team dominates the weaker team's tactics").
  1. Stronger team's attack vs opponent Elo: `log μ_A(Elo_O) = α_0 + α_1 · Elo_O` (2.1), α via Poisson regression.
  2. Weaker team's defense vs opponent Elo: `log ν_B(Elo_O) = β_0 + β_1 · Elo_O` (2.2), β via Poisson regression.
  3. Combined rate: `λ_{A|B} = (μ_A(Elo_B) + ν_B(Elo_A)) / 2` — averages "what A scores against Elo_B" with "what B concedes against Elo_A".
  4. Weaker team's goals depend on stronger team's Elo *and realized goals*: `log λ_B(E_A, G_A) = γ_0 + γ_1 · E_A + γ_2 · G_A` (2.3), γ via Poisson regression.
  5. Simulation order: realize G_A ~ Poisson(λ_{A|B}) first, then G_B ~ Poisson(λ_B(E_A, G_A)). Justified as `P[G_A = i, G_B = j] = P[G_A = i] · P[G_B = j | G_A = i]`.
- Intuition (paper's): if A scores 5, A's defense relaxes → B more likely to score 1–2; if A scores only 1, A protects the lead → B likely 0–1.
- **Tournament Monte Carlo (Sec. 3):** 100,000 full-tournament simulations; **Elo updated after each simulated match** ("honours teams in a good shape"); Elo reset at the start of each tournament sim.
- Alternatives checked and discarded (Sec. 4): generalized Poisson (Consul 1989) — dispersion φ ≈ 1 for top teams, "no additional gain"; negative binomial — collapses to near-Poisson. Model claimed to outperform (inflated) bivariate Poisson models on World Cups 2010/2014/2018 (Gilch & Müller 2018 technical report — external claim, not reproduced here).

## 4. Equations & assumptions
- (2.1): `log μ_A(Elo_O) = α_0 + α_1 · Elo_O`
- (2.2): `log ν_B(Elo_O) = β_0 + β_1 · Elo_O`
- Combination: `λ_{A|B} = (μ_A(Elo_B) + ν_B(Elo_A)) / 2` (reconstructed from text + worked example; PDF layout garbled but the example confirms: (1.48 + 1.31)/2 = 1.395)
- (2.3): `log λ_B(E_A, G_A) = γ_0 + γ_1 · E_A + γ_2 · G_A`
- Worked example — Senegal (1764) vs Ivory Coast (1612): `μ_Senegal(1612) = exp(2.73 − 0.00145·1612) = 1.48`; `ν_IvoryCoast(1764) = exp(−4.0158 + 0.00243·1764) = 1.31`; `λ_Senegal|IvoryCoast = 1.395`; `λ_IvoryCoast|Senegal = exp(1.431 − 0.000728·1764 + 0.137·G_A)`; e.g. G_A = 1 → 1.33.
- Goodness-of-fit: `χ_T = Σ_{i=1}^{n_T} (x_i − μ̂_i)² / μ̂_i`, n_T matches of team T, x_i goals scored, μ̂_i fitted mean.
- Assumptions: higher-Elo team "dominates the weaker team's tactics"; neutral-ground filtering removes home effects; Elo differences capture attack/defense skill separably; within-tournament Elo updating is a valid form proxy.

## 5. Features / target
- **Inputs:** team Elo ratings (A and B); in simulation, the realized G_A.
- **Target:** exact scoreline G_A : G_B per match (score-based, not outcome-based — needed because third-place qualification turns on goal difference); then tournament-stage probabilities via Monte Carlo.

## 6. Validation design
- **No train/test split and no out-of-sample scoring-rule comparison in this paper.** Validation = in-sample goodness-of-fit: χ² tests per team for (2.1)/(2.2)/(2.3) + null-vs-residual deviance analysis (Tables 4–6). The model *selection* (nested vs bivariate Poisson) is delegated to the companion technical report (Gilch & Müller 2018) — not verified here.
- Tournament probabilities from 100K Monte Carlo sims; no post-tournament verification reported (paper dated May 10, 2019, pre-tournament).

## 7. Numerical results / baselines
- GoF (2.1), p-values (Table 1): average 0.476; Senegal 0.74, Nigeria 0.10, Egypt 0.60, Ivory Coast 0.94, South Africa 0.72; **Namibia 0.048** (only poor fit).
- GoF (2.2) (Table 2): average 0.67; Senegal 0.99, Nigeria 0.79, Egypt 0.38, Ivory Coast 0.51, South Africa 0.76.
- GoF (2.3) (Table 3): average 0.33; Senegal 0.99, Nigeria 0.38, Egypt 0.27, Ivory Coast 0.78, South Africa 0.74.
- Deviance (Tables 4–6): mostly non-significant; exception **Nigeria (2.1): null 71.36, residual 66.39, p = 0.03** — significant lack of fit ("level of significance of the covariates is also of fluctuating quality").
- **Champion probabilities (Table 13, 100K sims):** Senegal 15.40, Nigeria 12.10, Ivory Coast 10.20, Egypt 10.10, Ghana 8.60, South Africa 8.40, Morocco 8.30, Tunisia 5.80, Algeria 5.10, Guinea 3.40, Cameroon 3.00, DR Congo 3.00, Mali 1.60, Madagascar 1.60 … Guinea-Bissau 0.00. Senegal: final 25.20, semifinal 41.20, quarterfinal 67.70, last-16 92.90.
- **Without third-place qualifiers (Table 14):** Senegal 15.80, Nigeria 14.50, Egypt 11.70, Ivory Coast 9.90…; differences (Table 15) "rather marginal" — favorites gain slightly (Senegal +0.40, Nigeria +2.40, Egypt +1.60 on the title), "neither harder nor easier for top ranked teams."
## 8. Code / data availability
None stated (no code link; data reconstructable from eloratings.net + public match records).

## 9. Leakage & limitations
- **No out-of-sample validation in this paper** — all fit statistics are in-sample; the key comparative claim (beats bivariate Poisson on 2010/2014/2018 World Cups) lives in an external technical report.
- Neutral-ground filtering discards most data (avg 29 matches/team over 9 years) — thin for per-team regressions; Nigeria's deviance flags underfit/misspecification.
- Within-tournament Elo updating in the sim is a modeling choice that compounds simulation noise; sensitivity not tested.
- The γ_2 term (dependence on realized G_A) is the paper's novelty, but its incremental predictive value over a plain bivariate Poisson is asserted, not measured, here.
- **External validity to NFL:** low-scoring Poisson goals don't map to football scoring; but the *conditional dependence* idea does (see §14).

## 10. GSE overlap
Poisson / Dixon-Coles / Skellam are already inventoried in the repo's metric catalog, and bivariate-Poisson goal modeling is standard. What is **not** in the repo: the **nested** structure — modeling the underdog's scoring rate as conditional on the favorite's *realized* score (a directed dependence, distinct from Dixon-Coles' symmetric correlation correction). No duplicate; a narrow extension.

## 11. GSE implementation spec
1. **Port the nesting idea to in-play NFL totals:** model second-half/underdog scoring rate as conditional on the favorite's realized first-half points — i.e., `log λ_underdog2H = γ_0 + γ_1·(favorite strength) + γ_2·(favorite 1H points)`, the direct analogue of (2.3). This captures garbage-time/protect-the-lead effects that symmetric models miss.
2. Data: nflverse play-by-play 2006–2025; half-level scoring aggregates; favorite defined by pregame spread.
3. Fit via Poisson/negative-binomial regression; test whether γ_2 ≠ 0 and whether it beats a Dixon-Coles-style symmetric correlation on 2H totals.
4. Effort: ~1 week; feeds the live-totals lane (existing-research-map gap #7: in-play spread/total modeling is thin).

## 12. Reproducible test
Dataset: nflverse 2006–2025 halves (favorite = pregame favorite by closing spread). Fit nested model vs baseline independent-Poisson 2H model; evaluate on time-ordered 2023–2025 holdout: log-loss on 2H total-points buckets and RMSE of 2H total. Success = nested model improves holdout log-loss by ≥0.005 AND γ_2 significant at p < 0.05 with the paper's sign (more favorite 1H points → higher underdog 2H rate).

## 13. Acceptance / rejection gate
**Adopt** the nested conditional structure for the in-play totals model if it beats the independent-Poisson baseline on holdout log-loss by ≥0.005 with γ_2 significant (p < 0.05); **reject** if γ_2 is insignificant or the gain is < 0.005 — the dependence is then not worth the complexity.

## 14. Improvement experiment
The paper conditions on goals but not on *game state at the time*. Extend to a **state-conditional nesting**: λ_B also depends on the score differential when the goals were scored (early blowout vs late consolation). For NFL 2H totals, condition underdog 2H rate on (favorite 1H points × 1H point differential) interaction — tests whether the garbage-time effect is really about the favorite's score level or about the lead size, which the paper's single γ_2 term cannot distinguish.
