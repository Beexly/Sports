# [1638] Strategic Play and Home Advantage: Coaches' Tactical Impact in Serie A (arXiv:2509.22683)

**Citation:** Francesco Angelini, Massimiliano Castellani, Gery A. Díaz Rubio, Simone Giannerini, Greta Goracci (Univ. of Bologna / Univ. of Udine / Univ. of Bozen–Bolzano, 2025). *Strategic Play and Home Advantage: Coaches' Tactical Impact in Serie A*. arXiv:2509.22683v1 [stat.AP], submitted 17 Sep 2025. URL: https://arxiv.org/abs/2509.22683
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv HTML; main body, results tables, model averaging, bootstrap CIs, conclusions; appendix tables scanned).
**Verdict:** ADAPT

a rigorous econometric coaching-decision evaluation framework (hand-coded tactical panel + offensiveness index + triple-outcome GLMs + AIC/BIC subset search + Akaike-weight model averaging + BCa bootstrap inference) that quantifies the causal-adjacent effect of aggressive coaching tactics on win probability with unusual honesty about endogeneity; directly portable to GSE's NFL coaching-decision and home-advantage modeling.

## 1. Research question
Do coaches' tactical decisions (formation aggressiveness, in-game adjustments) measurably affect match outcomes, and how do they interact with home advantage? Can hand-coded match commentary provide a cost-effective tactical panel cheaper than video tracking?

## 2. Dataset / schema
Hand-collected, cross-checked panel: 157,985 event observations from 1,140 Serie A matches (2011/12–2013/14), sourced from Virgilio/legaseriea.it/ESPN non-lemmatized commentary, aggregated to minute-level balanced panel (90 min/match), 146 variables. Coach scheme inferred per minute from on-pitch player roles → offensiveness index (defenders×1 + midfielders×2 + forwards×3, range 10–30; three versions: all-players, active-players, normalized; initial vs final scheme). Team actions: crosses, corners, shots, goal kicks, offsides (8 vars). Referee actions: yellows, reds, free kicks, penalties, fouls (5 vars). Controls: stadium filling index, extra time, pre-match ranking-points difference; fixed effects: season, league day, extreme scorelines, 26 team dummies. N=1,139 in models (one penalized match excluded).

## 3. Method / model
Three outcome models: (1) OLS on home–away goal difference; (2) logit on home win; (3) ordered logit on home points (0/1/3) with proportional-odds testing via bootstrap-augmented Brant test. Inference: HC3 sandwich SEs (Models 1–2), nonparametric bootstrap B=1000 (Model 3), BCa confidence intervals. Selection: full subset search over block-nested candidates with AIC/BIC; Akaike-weight model averaging over top 2.5%/5% candidates (393/317/107 specs) with shrinkage estimator θ̃=Σw_l θ̂_l and Burnham–Anderson variance. Interaction screening (coach×referee, team×referee) in top-1% model sets.

## 4. Equations & assumptions
E[y^(1)|X]=Xθ (OLS); P(y^(2)=1)=e^{Xβ}/(1+e^{Xβ}) (logit); P(y^(3)≤h)=g(π_h−Xθ^(3)) (ordered logit); intensity weight ω_it=n_it/n_i+1; offensiveness index s^H_{i,t,3}=(s^H_{i,t,2}/active)×(10/30). Assumptions: formation ≈ coach decision; commentary coding is consistent; team FE absorbs persistent heterogeneity; proportional odds holds (tested); coach assignment treated as exogenous conditional on controls (authors flag this as the key unaddressed endogeneity).

## 5. Features / target
Features: initial/final offensiveness indices (home–away and home/away-separated), 8 team-action variables (± intensity weights), 5 referee variables, stadium filling (linear/quadratic/cubic), extra time, ranking difference, season/day/extreme/team fixed effects. Targets: goal difference (integer −7..6), home win (binary, 46.58% base rate), home points (ordinal 0/1/3).

## 6. Validation design
No holdout prediction — this is an inference paper: triple-outcome triangulation, AIC vs BIC selection agreement, Akaike-weight averaging stability, residual diagnostics (Shapiro–Wilk, KS, Jarque–Bera, Breusch–Pagan, Ramsey RESET, Hosmer–Lemeshow, Lipsitz), Brant proportional-odds test (p=0.76), interaction robustness screens, classical vs BCa vs model-averaged CI agreement.

## 7. Numerical results / baselines
Initial scheme s2: +0.30 goal diff (p<0.001), logit coeff 0.54 (p<0.001), ordered-logit 0.53 (p<0.001); final scheme −0.25/−0.50/−0.49 (all p<0.001). Marginal effect: aggressive home opening strategy raises win probability ≈9.44–16.17% (BCa, at the mean). Crosses −0.01/goal-diff unit (p<0.001; "cross paradox"); shots +0.04 (p<0.001); goal kicks +0.03 (p<0.001); red cards −1.06 goal diff (p<0.001); penalties +0.33 (p<0.001); yellow cards −0.06 (p=0.013); ranking difference +1.47 (p<0.001). Stadium filling insignificant (all powers p>0.85). Model fit: adj. R² 0.44–0.45; Model 2 accuracy 0.75, sensitivity 0.77, specificity 0.73, F1 0.77; McFadden R² 0.44. Model averaging confirms all main effects; coach–referee interactions never alter main-effect signs/significance.

## 8. Code / data availability
No code/data link in the paper; dataset is hand-collected from public commentary (reconstructable in principle).

## 9. Leakage & limitations
Authors explicitly flag the central weakness: coach selection is endogenous (coaches aren't randomly assigned; hiring correlates with expectations/resources) — IV or panel methods left to future work. Commentary-derived tactics are coarser than tracking data; free kicks carry little signal; stadium occupancy insignificant (fan composition unmeasured). No out-of-sample prediction test. All stated plainly in the conclusions.

## 10. GSE overlap
The lane's best template for observational coaching-decision evaluation: the offensiveness-index construction (role-weighted formation aggressiveness) ports to NFL play-calling aggressiveness indices (pass rate over expected, fourth-down go-rate vs model); the triple-outcome + model-averaging + BCa pipeline is the right methodology for GSE's home-advantage decomposition and coach-effect studies (e.g., quantifying a new HC's tactical impact, 2026 kickoff-rule effects). Complements 1579 (MCPS counterfactual rollouts) as the econometric sibling: 1579 evaluates single decisions via simulation, this one estimates average tactical effects via panel inference.

## 11. GSE implementation spec
Build `gse_coaching_decisions.py`: (1) construct per-game NFL coaching aggressiveness indices from play-by-play (early-down pass rate vs expectation, fourth-down go-rate vs WP model, blitz rate) as the analog of the offensiveness index, initial (game plan, Q1) vs final (Q4 adjustments); (2) fit the triple-outcome panel — OLS on point differential, logit on win, ordered logit on cover/margin buckets — with team and season fixed effects, referee-crew variables (flags/penalties as exogenous shocks), stadium/dome controls; (3) run AIC/BIC subset search + Akaike-weight model averaging + BCa bootstrap CIs; (4) report marginal effects (e.g., "+x% win probability from top-quartile opening aggressiveness") as content-ready coaching insights and as features in GSE's game-prediction models. Include the authors' honesty requirement: report the coach-selection endogeneity caveat and prefer within-coach variation (before/after coordinator changes) for causal claims.

## 12. Reproducible test
Reproduce Table 1 on the paper's specification: initial scheme coefficient ≈0.30 (Model 1), ≈0.54 (Model 2), all p<0.001; Brant p≈0.76; Model 2 accuracy ≈0.75. Then port: on 2020–2024 NFL play-by-play, the aggressiveness index must show a stable positive sign across all three outcome models with BCa CIs excluding zero; if the sign flips between OLS and logit, the effect is outcome-definition fragile — report it as descriptive only.

## 13. Acceptance / rejection gate
Accepted: real hand-built dataset (157,985 events), fully specified triple-model econometrics, exhaustive model averaging (393/317/107 specs), bootstrap-validated inference, strong stable headline effects with exact numbers, and explicit acknowledgment of the endogeneity limitation — the methodological integrity this lane needs. The coaching-tactics → win-probability pipeline is directly adaptable to NFL decision analysis.

## 14. Improvement experiment
The authors' own prescription: instrument coach assignment (e.g., coaching-carousel timing as IV) or use within-coach panel variation. For GSE, the sharper experiment is dynamic: replace initial-vs-final scheme snapshots with drive-level aggressiveness trajectories (the paper's static t=0/t=90 design upgraded to the 1572 VTCS temporal framework), testing whether the 9–16% win-probability effect concentrates in specific game states (e.g., aggressive openings matter more for underdogs) — a genuinely new coaching-analytics product.
