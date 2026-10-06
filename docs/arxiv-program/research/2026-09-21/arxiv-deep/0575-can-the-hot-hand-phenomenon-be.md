# [0575] A Bayesian hidden Markov model for assessing the hot hand phenomenon in basketball shooting performance (arXiv:2303.17863v2)

**Citation:** Gabriel Calvo, Carmen Armero, Luigi Spezia (2023). *A Bayesian hidden Markov model for assessing the hot hand phenomenon in basketball shooting performance*. arXiv:2303.17863v2. URL: https://arxiv.org/abs/2303.17863v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3948 lines).
**Verdict:** ADAPT — the Bayesian longitudinal HMM machinery (logistic mixed-regression transition model + Bernoulli observation model, with posterior occupancy/sojourn/streak distributions) is portable to NFL play/drive-level streak analysis, but the paper's basketball application is one team, one season, with a degenerate hot-state estimate; do not port the shooting-distance model, port the streak-quantification framework.

## 1. Research question
Can a Bayesian longitudinal hidden Markov model (BLHMM) with two latent states (cold/hot), where both the hidden transitions and the observed make/miss probabilities are logistic mixed regressions, detect and quantify the hot-hand phenomenon in basketball shooting — and serve as a general tool for team performance/streak analysis?

## 2. Dataset / schema
- Miami Heat, NBA 2005-06 season (championship season): all field goals + free throws, N=105 matches, 11,042 shots total, 5,922 made.
- Per shot: make/miss (binary), distance to basket in feet, match id, sequential shot order within match, free-throw indicator.
- Source: NBA play-by-play via nbastuffer.com (accessed 2022-05-03). Data + R code in supplement: https://github.com/gcalvobayarri/hot_hand_model.git.

## 3. Method / model
- Joint model f(Y,Z,θ,ψ) = f(Y|Z,θ,ψ)·f(Z|θ,ψ)·f(ψ|θ)·π(θ) (Eq. 1–2), factorized per match (conditional i.i.d. across matches).
- Hidden process: 2-state Markov chain {C,H} per match; transition matrix P_i (Eq. 3) with logit(p_i^(CH))=β_CH+b_i^(CH), logit(p_i^(HC))=β_HC+b_i^(HC); random effects b_i ~ N(0,Σ_b) (independent components with sd σ_CH, σ_HC); initial distribution δ=(δ_C,δ_H).
- Observed process: Y_in|Z_in=j ~ Bern(γ_in^(j)); logit(γ_in^C)=α_C+α_d·X_in+α_FT·I_FT(in)+a_i; logit(γ_in^H)=α_H+α_d·X_in+α_FT·I_FT(in)+a_i; a_i ~ N(0,σ_a²). Covariates shared across states; only intercepts differ by state.
- Priors: δ_C ~ Be(1,1); σ_a,σ_CH,σ_HC ~ U(0,10); β_CH,β_HC,α_d,α_FT ~ N(0,10²); α_C,α_H ~ N(0,10²) with constraint α_C ≤ α_H (identifiability/label-switching).
- Inference: JAGS MCMC, 3 chains × 30,000 iterations after 30,000 burn-in, thinning every 30 (R 4.0.5).
- Posterior functionals: match-specific and marginal transition probabilities (Eq. 4–7), n-step transitions and stationary distribution Δ_i^(C)=p_i^(HC)/(p_i^(CH)+p_i^(HC)) (Eq. 8), occupancy times (Eq. 9), sojourn times (geometric, Eq. 10), state-dependent and state-marginalized make probabilities.

## 4. Equations & assumptions
- Transition: logit(p_i^(CH))=β_CH+b_i^(CH); logit(p_i^(HC))=β_HC+b_i^(HC).
- Observation: logit(γ_in^C)=α_C+α_d X_in+α_FT I_FT(in)+a_i; logit(γ_in^H)=α_H+α_d X_in+α_FT I_FT(in)+a_i.
- Stationary: Δ_i^(C)=p_i^(HC)/(p_i^(CH)+p_i^(HC)); Δ_i^(H)=p_i^(CH)/(p_i^(CH)+p_i^(HC)).
- Sojourn: P(τ_i^(j)=n)=[p_i^(jj)]^n(1−p_i^(jj)), n=0,1,… (geometric).
- Occupancy: closed-form expected visit counts m_i^(jk)(n) from Kulkarni 2016 (Eq. 9).
- Assumptions: matches conditionally independent; Markov (memoryless) latent dynamics within a match; distance/free-throw effects identical in hot and cold states (only intercepts differ); label switching handled by α_C≤α_H constraint; uniform U(0,10) priors on sds assumed "minimally informative".

## 5. Features / target
- Features: shot distance (feet), free-throw indicator; match random effects.
- Target: per-shot make/miss; derived targets: latent state sequence, transition probabilities, occupancy/sojourn distributions, streak probabilities (>3 consecutive shots in one state).

## 6. Validation design
- No train/test split, no cross-validation, no predictive checks reported — purely inferential: MCMC posterior summaries with R̂ convergence diagnostics (all ≈1.000–1.048).
- Streak definition (>3 shots in one state) is explicitly "arbitrary" ("can only be justified in order to illustrate the potential").

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Table 1 posterior means (95% CI): β_CH=−0.49 (−0.58,−0.39); β_HC=0.38 (0.27,0.49); δ_C=0.55 (0.43,0.68); σ_CH=0.07 (0.00,0.18); σ_HC=0.10 (0.00,0.25); α_C=−0.15 (−0.29,−0.01); α_H=12.59 (10.52,14.97); α_d=−0.42 (−0.51,−0.33); α_FT=6.37 (5.16,7.75); σ_a=0.15 (0.00,0.31).
- Generic-match transition probabilities: P(C→H)=0.38, P(H→C)=0.59 — "remaining in the cold state in one transition is more likely than switching to the hot, or than remaining in the hot state."
- Stationary distribution (Table 2): Δ^(C)=0.61 (0.57,0.65), Δ^(H)=0.39 (0.35,0.43).
- Occupancy in a 120-shot match: posterior mean 74.05 shots in cold vs 46.85 in hot; initial state "practically irrelevant".
- Streak probability (Fig. 4): cold streak ≈0.25, "nearly three times higher than the probability of a hot streak (less than 0.1)."
- Make probability: cold state ≈0.5 at 0 feet, "almost impossible" beyond 10 feet; hot state "very likely" to score up to 15 feet; state-unknown: ≈0.7 near basket, ≈0.5 mid-range, 0.4 from three.
- Author conclusion: "we noticed something more like a cold hand instead of a hot hand."

## 8. Code / data availability
Data + R/JAGS code: https://github.com/gcalvobayarri/hot_hand_model.git. NBA play-by-play source: nbastuffer.com.

## 9. Leakage & limitations
- The hot-state intercept α_H=12.59 (logit) is degenerate: it implies make probability ≈1.00000 at any distance, i.e., the latent "hot" state is effectively a fitted artifact absorbing easy makes (free throws at α_FT=6.37 already saturate). The two-state distinction collapses into "normal vs automatic" — the constraint α_C≤α_H plus free-throw covariate likely created a separated regime, not a real hot hand.
- One team, one season: no out-of-sample validation, no comparison across teams, no predictive evaluation at all. The model is descriptive, not tested.
- Streak threshold (>3 shots) admitted as arbitrary; results (0.25 vs <0.1) are conditional on that choice with no sensitivity analysis.
- Within-match independence of random effects across 105 matches ignores opponent strength entirely — a "cold" stretch against a good defense is indistinguishable from a real cold hand.
- Text/table inconsistency: the text reports SD(α_d|D)=0.03 while Table 1 reports sd=0.05 — sloppy, undermines confidence in the reported numbers.
- Shot distance effect forced identical across states (α_d shared) — if hot/cold changed shot selection rather than efficiency, the model misattributes it.

## 10. GSE overlap
New capability, no duplication. Per existing-research-map.md: GSE has no hidden-Markov regime-switching work for in-game or play-level streaks; existing momentum work (Koopman/DMD) was REJECTED in the machine-discovery lane. A Bayesian HMM for latent hot/cold offensive states with posterior streak/occupancy/sojourn quantification does not exist in the repo. Closest conceptual neighbor: the ARROBART improvement experiment (paper 0573) proposing regime-switching latent dynamics — this paper provides the exact Bayesian machinery (logistic transition regressions + occupancy/sojourn posteriors) that experiment would need.

## 11. GSE implementation spec
- Port BLHMM to NFL drive/play sequences: latent states {cold, hot} for offensive efficiency; observation = per-play success (EPA>0 or first-down conversion) with covariates (down, distance, field position, QB injury flag, weather) — the analogue of distance/free-throw; random effects per game.
- Transitions: logit(p^(CH)), logit(p^(HC)) with game-level covariates (opponent defensive strength, rest) to fix the paper's missing-opponent flaw.
- Output: posterior streak probabilities (team "hot" on a drive sequence) feeding live in-game win-probability adjustments and a "momentum flag" for the content lane (never as a primary pick input).
- Effort: ~3–4 days (JAGS/Stan model + nflverse play-by-play harness).

## 12. Reproducible test
- Dataset: nflverse 2020–2025 play-by-play; fit per team-season; hold out last 4 games of each season.
- Metric: log-loss of play-success probability vs a no-HMM logistic baseline with the same covariates; plus calibration of the posterior "hot-state probability" against actual next-drive scoring.
- Baseline: plain logistic mixed model (no latent states) — the HMM must beat it to justify the complexity.

## 13. Acceptance / rejection gate
- ADOPT as a live-momentum module if the HMM beats the no-HMM baseline by ≥0.005 mean log-loss on held-out games AND the posterior hot-state probability is calibrated (slope of observed vs predicted next-drive TD rate within 0.85–1.15).
- ADAPT if only the streak-quantification outputs are useful — keep occupancy/sojourn posteriors as a descriptive content feature ("the offense has a 22% chance of being in a hot streak right now") without touching pick probabilities.
- REJECT if the latent states degenerate as in the paper (one state's intercept saturating, as α_H=12.59 did) on NFL data — same failure mode, no value.

## 14. Improvement experiment
- Three-state HMM (cold/neutral/hot) — the paper's own suggested future work — with the middle state absorbing routine plays, preventing the degenerate "hot = automatic" collapse seen in α_H. Add opponent defensive strength as a transition covariate (the paper's biggest omitted variable). Test whether the 3-state + opponent model beats the paper's 2-state spec on the §13 gate — directly addressing both the degeneracy and the missing-opponent limitations.
