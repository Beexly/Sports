# [0583] Athlete rating in multi-competitor games with scored outcomes via monotone transformations (arXiv:2205.10746v3)

**Citation:** Che, J., & Glickman, M. (2022). *Athlete rating in multi-competitor games with scored outcomes via monotone transformations*. arXiv:2205.10746v3. URL: https://arxiv.org/abs/2205.10746v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4387 lines).
**Verdict:** ADAPT — adopt the monotone-spline outcome transformation inside a dynamic linear model (Kalman filter) for GSE's team/player strength tracking: learn the transform of margin-of-victory / EPA-like scores from data instead of hand-capping blowouts, then run the standard Kalman update; keep the game-centering and two-stage (MAP transform + Kalman filter) fitting design.

## 1. Research question
How do you estimate time-varying latent athlete strengths from *scored* (not just win/loss or rank-order) outcomes in multi-competitor games, when scores are heavy-tailed/skewed (blowouts, penalty-driven race times) and violate the normality assumption of standard dynamic linear models (DLMs)? The paper proposes a Bayesian DLM with a *learned* monotone spline transformation of scores (Ramsay 1988 I-splines), fit via a two-stage procedure (MAP/MCMC for transform + innovation variance, Kalman filter for abilities).

## 2. Dataset / schema
US Olympic & Paralympic Committee data, ~2004–2019, five datasets: Biathlon (703 athletes, T=31 biannual periods, 56 events, ~106 athletes/event); Biathlon Relay (30 teams, 31 periods, 80 events, 18.6/event); Diving women's 3m springboard (459 athletes, 32 periods, 218 events, 15/event); Fencing women's sabre (489 athletes, 35 quarterly periods, 5806 bouts, score differences); Rugby men's sevens (90 national teams, 71 quarterly periods, 6639 games, score differences). Scores: race times (biathlon), final-round points (diving), point differences to 15 (fencing), score differences (rugby). Access: proprietary USOPC data (not public). Simulation study: p=100, T=20, Yeo-Johnson data-generating transforms (λ=0.7,1,1.3), 50 replicates.

## 3. Method / model
Bayesian DLM on *transformed, game-centered* scores. Pipeline: (1) game-center scores (subtract game mean) to remove game effects instead of fitting intercepts; optionally log-transform/scale first. (2) Apply learned monotone spline τ_λ^MS(y) = λ_0 + Σ_b λ_b I_b(y|d,k) (I-splines, degree 3, 3 interior knots at 25th/50th/75th percentiles, λ_b ≥ 0 for monotonicity). (3) DLM: ψ_t ~ N(X̄_t θ_t, σ²I) (X̄_t = game-centered design matrix), θ_{t+1} ~ N(θ_t, σ²wI_p) (normal random walk; variance capped at v_0). Priors: θ_1 ~ N(0, σ²v_0 I), σ² ~ Inv-Gamma(a_0,b_0) (0.1,0.1), w ~ Half-Normal(s_w²) (s_w=1), λ ~ c·Dirichlet(α) (or truncated-normal unconstrained in practice). Head-to-head variant models score *differences* with design matrix Z_t (1/−1 entries). Fitting (two-stage): Stage 1 — MAP (Nelder-Mead/L-BFGS) or full MCMC (Stan, 4 chains, 1000+1000) on the marginal posterior of (w,λ) with (θ,σ²) integrated out, on first 2/3 of rating periods; Stage 2 — standard Kalman filter (+ Rauch-Tung-Striebel smoother) on full data with (ŵ,λ̂) fixed, enabling fast rating updates after each new game. Implemented in the `dlmt` R package (https://github.com/jche/dlmt).

## 4. Equations & assumptions
- Observation: p(y_t|θ_t,σ²) = N(y_t|θ_t,σ²); innovation: p(θ_{t+1}|θ_t,σ²,w) = N(θ_{t+1}|θ_t,σ²w).
- Game-centered: p(ỹ_{tg}|θ_t,σ²) = N(ỹ_{tg}|θ_t−θ̄_{tg},σ²); multivariate p(ỹ_t|θ_t,σ²) = N(ỹ_t|X̄_tθ_t,σ²I_{n_t}), X̄_t stacks H_{n_{tg}}X_{tg}, H_k = I_k − 1_k 1_k^T (note: as printed; standard centering divides by k).
- Transform: τ_λ^MS(y) = λ_0 + Σ_{b=1}^B λ_b I_b(y|d,k), λ_b ≥ 0; Jacobian J^MS(ψ→y) = Σ_b λ_b M_b(y|d,k) (M-splines); included in the joint density — "vital to appropriately account for how the transformation rescales the data."
- Kalman updates: V_t = ((V_{t−1}+wI_p)^{−1}+X̄_t^T X̄_t)^{−1}; m_t = V_t((V_{t−1}+wI_p)^{−1}m_{t−1}+X̄_t^T ψ_t); a_t = a_{t−1}+n_t/2; b_t = b_{t−1}+½[(ψ_t−X̄_t m_{t−1})^T(I+X̄_t(V_{t−1}+wI_p)X̄_t^T)^{−1}(ψ_t−X̄_t m_{t−1})].
- Posterior predictive for (w,λ) marginal: p(ψ_t|ψ_{1:t−1},w,λ) = t_{2a_{t−1}}(ψ_t|X̄_t m_{t−1}, (b_{t−1}/a_{t−1})[I+X̄_t(V_{t−1}+wI_p)X̄_t^T]).
- RTS smoother: m_t^s = m_t+S_t(m_{t+1}^s−m_t); V_t^s = V_t+S_t(V_{t+1}^s−V_t−wI)S_t^T; S_t = V_t(V_t+wI)^{−1}.
- Head-to-head: p(τ_λ(z_t)|θ_t,σ²,λ) = N(τ_λ(z_t)|Z_tθ_t,σ²I).
- Test metric: game-size-weighted Spearman ρ = Σ_{t,g}(n_{tg}−1)ρ_{gt}/Σ_{t,g}(n_{tg}−1).
- Assumptions stated: abilities constant within a rating period; normal random walk (deliberately non-mean-reverting); constant observation variance σ² across athletes/games; off-diagonal of V_t cleared between periods (approximation, validated by simulation); monotone transform sufficient for normality (fails for very low scores like soccer/hockey — stated).

## 5. Features / target
Input features: none beyond identity/design matrices — the "features" are the game-centered scores themselves matched to athlete parameters via X̄_t. Target: transformed score ψ (multi-competitor) or transformed score difference (head-to-head); evaluation targets are within-game rank predictions (Spearman) and winner predictions (accuracy). Rating periods: biannual (biathlon/diving) or quarterly (fencing/rugby) — a bias-variance choice studied in Appendix A.2.

## 6. Validation design
Forward-time split: first 2/3 of rating periods = training (learn w, λ), last 1/3 = test. Residual normality checked via Q-Q plots on test-set one-step prediction residuals. Baselines: DLM without transform (LM), dynamic rank-order logit (ROL, Glickman & Hennessy 2015) for multi-competitor; Glicko (GLO) for head-to-head. Simulation study (Appendix B): parameter recovery of λ (Yeo-Johnson), w, σ across data regimes. Sensitivity: rating-period length varied (annual→monthly); transformations and σ stable, w scales with period length as expected.

## 7. Numerical results / baselines
- Weighted Spearman (test): Biathlon — LM-T .64 vs LM .61 vs ROL .61 (18 events); Biathlon Relay — .77 vs .75 vs .75 (27 events); Diving — .64 vs .62 vs .61 (83 events).
- Winner accuracy (test): Fencing — LM-T .70 vs LM .67 vs GLO .68 (1,785 bouts); Rugby — LM-T .71 vs LM .72 vs GLO .70 (2,503 games). Rugby learns ~identity transform, so no gain — the paper's own honesty about when the method adds nothing.
- Posterior means: √(w), σ = Biathlon (0.28, 98.5), Relay (0.22, 71.6), Diving (0.40, 49.7), Fencing (0.06, 3.2), Rugby (0.18, 14.5) — σ on transformed scale. Diving most skill-driven; fencing most chance-driven (consistent with Zappalà et al. 2022).
- Fit cost: biathlon (~6000 obs, ~700 athletes) — full MCMC ~8h vs Nelder-Mead 30 min vs L-BFGS <1 min (i7-8550U laptop); MAP ≈ MCMC for the transform.
- Simulation: λ recovery within 0.01 of truth even with 2 ten-player games/period; w underestimated with few games (appropriate conservatism); σ inflated with few games.
- Case studies: Bjørndalen dominance early-2000s, Fourcade's rise from 2009 (never exceeding Bjørndalen's 2005 peak); Fiji vs NZ rugby strength with 90% intervals. All numbers are the paper's claims on its test splits.

## 8. Code / data availability
Model implemented in the `dlmt` R package: https://github.com/jche/dlmt (stated in paper). Data: proprietary USOPC, not available.

## 9. Leakage & limitations
- Train/test split is forward-time by rating period — good — but hyperparameters (knot count/placement, rating-period length) were chosen with knowledge of the full data (Appendix A.2 sensitivity uses test-set performance); mild data snooping on design choices.
- No uncertainty on w, λ in the MAP two-stage procedure (plug-in); only the MCMC variant propagates it, at 8h cost.
- Constant σ² across athletes is restrictive (acknowledged; heteroskedastic extension left as future work) — in NFL, bad teams are genuinely more variable.
- Off-diagonal V_t clearing and variance capping are unvalidated approximations outside their simulation (which used the model's own data-generating process — circular validation).
- Test sets are small (18 biathlon events); gains of .61→.64 Spearman are modest and no significance tests are reported.
- Assumes transform-to-normality is achievable; stated to fail for low-scoring sports.
- NFL transfer: margin-of-victory in NFL is already near-normal-ish; the transform's value is in handling blowout tails — but the game-centering trick (subtract game mean) is designed for multi-competitor fields and doesn't directly apply to head-to-head; the Z_t score-difference variant is the NFL-relevant one.

## 10. GSE overlap
Extension, strongly complementary. Existing-research-map: state-space team strength is covered (Lopez/Baumer 1701.05976 nested AR(1), Kalman/particle filters, dynamic Elo in the ML brief) and Massey/Elo/Glicko are inventoried — but **no DLM in Garrett's corpus learns a monotone outcome transformation from data**, and none game-centers multi-competitor scores. The closest existing pieces are Harville-style margin models (mentioned in the 26-metric catalog lineage) and the "EPA forward-validity" gap. The learned-transform idea ports directly to GSE's margin-of-victory / EPA-differential team-strength tracking and to taming blowout distortion without arbitrary caps (Harville 2003's capping, cited in-paper, is exactly the kind of hand-tuning GSE should replace). Verdict: **extension** — upgrades the existing state-space lane.

## 11. GSE implementation spec
1. Data: nflverse 2009–2025, game-level: score differential (home−away) + home-field indicator. Weekly rating periods (shorter than the paper's quarterly — Appendix A.2 recommends shortest reasonable period for prediction).
2. Model: head-to-head variant — τ_λ(margin_t) ~ N(Z_t θ_t + h_t·hfa, σ²I); learn monotone I-spline transform (3 knots at 25/50/75th percentiles of historical margins) + w via MAP (L-BFGS) on 2009–2019; Kalman filter for weekly θ_t (team strengths) with RTS smoothing for historical analysis.
3. Game-centering analogue: include explicit home-field and rest-day covariates rather than the multi-competitor centering.
4. Serve weekly θ_t as a GSE team-strength feature (and publishable power rating); update after each week's games with Stage-2 Kalman step only (seconds).
5. Second application: transform EPA differentials — learn τ_λ on per-game net EPA margin, which is heavier-tailed than score margin; compare predictive value.
6. Effort: ~2 weeks for one engineer (numpy/scipy Kalman + spline via `scipy.interpolate` PPoly or `splines2` equivalent; no Stan needed for the MAP path).

## 12. Reproducible test
Dataset: nflverse 2009–2024 regular seasons. Fit (w, λ) via MAP on 2009–2019; run Kalman filter through 2020–2024 producing pre-game θ_t each week. Metric: log-loss of implied win probabilities (from θ differences through a logistic link fit on training data) on 2020–2024 games; secondary: ATS hit rate vs closing lines. Baselines: (a) plain Kalman DLM without transform (λ = identity), (b) Elo (nflverse elo), (c) market (closing moneyline-implied probability — the honest ceiling). Time window: strictly forward — no refitting of (w,λ) on test years.

## 13. Acceptance / rejection gate
ADOPT the transformed DLM as a GSE strength feature if, on 2020–2024: log-loss beats the no-transform Kalman DLM by ≥1% AND beats Elo by ≥0.5%, with the learned transform visibly non-identity (shrinkage of |margin|>21 tails). REJECT if the transform collapses to ~identity (like the paper's rugby case) with no log-loss gain — then the plain DLM suffices and the spline is dead weight. Either way, report the learned transform shape; a blowout-shrinking transform is itself evidence about NFL margin information content.

## 14. Improvement experiment
Beyond the paper: learn **team-specific** observation variances (the paper's stated future work) — σ²_u per team, since bad NFL teams are more volatile — while keeping closed-form Kalman updates via a variational/EM M-step for the variances. Test on the §12 protocol whether heteroskedastic-transform DLM beats the homoskedastic version; hypothesis: the biggest gains come in games involving high-variance teams (young QBs, backup QBs), which is also where the market is softest.
