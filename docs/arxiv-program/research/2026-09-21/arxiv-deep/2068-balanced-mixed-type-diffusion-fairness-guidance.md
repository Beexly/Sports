# [2068] Fair Tab Diffusion: Multivariate Guidance + Balanced Sampling for Rare-Regime Synthesis (arXiv:2404.08254)

**Citation:** Zeyu Yang, Han Yu, Peikun Guo, Khadija Zanna, Xiaoxue Yang, Akane Sano (2024). *Balanced Mixed-Type Tabular Data Synthesis with Diffusion Models*. arXiv:2404.08254 (Rice / Imperial). URL: https://arxiv.org/abs/2404.08254. Code: https://github.com/comp-well-org/fair-tab-diffusion
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2404.08254, §§1–7 + references; all equations, Tables 1–4, Figures 2–4 verified).
**Verdict:** ADAPT — the fairness framing is irrelevant to GSE, but the *machinery* is exactly the rare-regime synthesis toolkit this lane needs: multivariate classifier-free guidance (label + regime attributes), a security-gated sensitive-guidance term, and a tunable balancing dial (Eq. 8) that rebalances the joint distribution of outcome × regime from empirical (level 0) to uniform (level 10). That dial is the controlled way to oversample tail NFL regimes without distorting the primary outcome distribution.

## 1. Research question
Tabular diffusion models inherit training-set bias (e.g., demographic imbalance), which propagates into synthetic data and downstream classifiers. Can a diffusion model be conditioned on the target label *and* multiple sensitive attributes simultaneously, and can sampling be rebalanced so the synthetic joint distribution of label × sensitive attributes is uniform — while preserving fidelity, diversity, and MLE utility? Fairness application aside, the technical question is multivariate conditional control of tabular diffusion.

## 2. Dataset / schema
Three binary-classification tabular datasets (Table 1), 50/25/25 train/val/test: Adult (48,842 rows, 14 attrs; sensitive = sex, race; target = income>50K; train 22,611), Bank Marketing (45,211 rows, 16 features; sensitive = age group young/old; target = term-deposit subscription; train 22,605), COMPAS (train 8,322; sensitive = sex, race; target = recidivism). Numericals via quantile transform (per Kotelnikov et al. 2023); categoricals one-hot + concatenated. Sensitive attributes specified in advance (a stated limitation).

## 3. Method / model
Latent diffusion (Rombach-style): tabular rows → MLP encoder → latent z; U-Net + Transformer posterior estimator. **Multivariate classifier-free guidance** (Eqs. 5–6): ε̄(z_t,c,s) = ε̂(z_t) + w_g(γ(z_t,c) + γ(z_t,c,s)), extended to N sensitive attributes by summation. **Security gate** μ(c,s;w_s,λ): sensitive guidance γ(z_t,c,s) = μ·(ε̂(z_t,s) − ε̂(z_t)) is element-wise deactivated where |ε̂(z_t,c) − ε̂(z_t,s)| ≥ λ (prevents sensitive guidance from distorting the label distribution), plus warm-up (γ:=0 for t<δ) and momentum ν_{t+1} = βν_t + (1−β)γ_t (weight w_m). Discrete features: guided x̂_0 estimate (Eq. 7). **Balanced sampling** (§4.3): at generation time, keep the empirical label distribution but sample sensitive attributes from a *uniform* distribution → balanced joint distribution. **Balancing dial** (Eq. 8, §5.4.4): y_k^balanced = y_k + d_k·(i/10), i ∈ [0,10], where d_k = ȳ − y_k is the deviation of joint cell k from uniform — i=0 replicates real, i=10 fully uniform; composite score (0.5·AUC + 0.25·DPR + 0.25·EOR) peaked at i=10 (Adult, Bank) / i=9 (COMPAS).

## 4. Equations & assumptions
Multivariate guidance (Eq. 6): ε̄(z_t,c,S) = ε̂(z_t) + w_g(γ(z_t,c) + Σ_i μ(c,s^{(i)};w_s,λ)(ε̂(z_t,s^{(i)}) − ε̂(z_t))), with warm-up γ:=0 if t<δ, momentum ν.
Security gate: μ = φ where ε̂(z_t,c)⊖ε̂(z_t,s) < λ else 0; φ = max(1, w_s|ε̂(z_t,c) − ε̂(z_t,s)|).
Balancing (Eq. 8): y_k^balanced = y_k + d_k·i/10, d_k = ȳ − y_k.
Fairness metrics: DPR = min/max selection rates across groups; EOR = min of TPR/FPR ratios across groups; both ∈ [0,1], higher = fairer.
Loss: ℒ_T = ℒ_G + (1/C)Σ_i ℒ^{(i)} (Gaussian + mean multinomial VLB terms).
Assumptions: (1) sensitive attributes known in advance; (2) uniform joint distribution is the right target (questionable in general — for NFL tail regimes it is exactly what we want for augmentation); (3) element-wise gating with threshold λ keeps guidance "minimal" (λ, δ, w_s, w_m, β all need tuning; more hyperparameters per added attribute).

## 5. Features / target
Per-dataset; targets binary (income, subscription, recidivism). NFL translation (my inference): target label c = cover/outcome class; "sensitive" attributes s = regime variables — weather severity bin, rest category, prime-time flag, division-game flag, altitude/dome. Balanced sampling then synthesizes a *uniform* joint distribution over outcome × regime: the tail-regime oversampler.

## 6. Validation design
Baselines: FairCB (SMOTE-based), TabFairGAN, CoDi, GReaT, SMOTE, STaSy, TabDDPM, TabSyn. Metrics: (1) column density + pair correlation errors (Table 2); (2) MLE AUC with CatBoost + DCR (Table 3); (3) DPR/EOR fairness of classifiers trained on synthetic (Table 4); (4) sensitive-attribute distribution plots; (5) balancing-level sweep i=0..10 (Figure 4). 3 random seeds.

## 7. Numerical results / baselines
Table 2 (density/correlation error, lower better; means): TabSyn 1.5%/4.1% (best); Ours 11.9%/18.3% — worse than TabSyn/TabDDPM (4.1%/6.6%) but competitive with STaSy (13.1%/17.4%); SMOTE 2.2%/4.8% but DCR shows copying.
Table 3 (MLE AUC mean / DCR): Real 89.1%; TabSyn 86.0%; TabDDPM 85.6%; Ours 84.7% (only 1.3% below TabSyn despite rebalanced sensitive distribution); DCR Ours 35.5% (same band as all deep methods; SMOTE 28.8%, FairCB 3.2% = near-copies).
Table 4 (DPR/EOR, higher better; means): Ours 68.4%/71.4% vs Real 46.2%/40.2%, FairCB 56.0%/54.4%, all SOTA diffusion <50% (TabSyn 43.8%/38.6%, TabDDPM 38.5%/34.3%) — the paper's ">10% improvement" claim holds vs every baseline.
Figure 4: composite (0.5 AUC + 0.25 DPR + 0.25 EOR) optimal at balancing level 10 (Adult, Bank), 9 (COMPAS).
All numbers are the paper's claims. Caveat (my inference): fidelity cost of rebalancing is real (density error 11.9% vs TabSyn 1.5%) — the fairness/quality trade-off is the price of the dial; for NFL tail augmentation we pay it deliberately on a *slice*, not the whole distribution.

## 8. Code / data availability
Code: https://github.com/comp-well-org/fair-tab-diffusion. Data: Adult/Bank/COMPAS via OpenML (links in Appendix A). Reproducible.

## 9. Leakage & limitations
Adversarial notes: (1) Fidelity degrades vs TabSyn (11.9% vs 1.5% density error) — rebalancing is not free; the paper underplays this. (2) Hyperparameter sprawl: w_g, w_s, λ, δ, β, w_m per sensitive attribute — tuning burden grows with each added regime variable; the NFL use case (4–5 regime vars) compounds this. (3) Requires attributes specified in advance; no discovery of underrepresented regimes. (4) U-Net+Transformer backbone is slower than TabSyn — and the appendix quantifies how bad: sampling a training-size synthetic set takes 1213.9s for Ours vs 2.7s TabSyn, 25.1s STaSy, 118.9s TabDDPM (Table 7); the paper suggests Flow-DPM-Solver/linear attention as fixes but doesn't implement them. For NFL use this argues for porting the guidance+balancing machinery onto TabSyn/TabRep (fast samplers), not using the paper's backbone. (5) Uniform joint distribution is asserted, not derived — for fairness it's normative; for NFL tail augmentation it's instrumental and should be validated by the downstream gate, not assumed. (6) DCR ~35% for all deep methods suggests the DCR metric itself is saturated/uninformative here. External validity to NFL: high for the *conditioning machinery* — the fairness metrics don't transfer, but multivariate guidance + the balancing dial transfer directly to regime-conditional synthesis.

## 10. GSE overlap
Checked /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no overlap — new capability. Within-lane position: this is the *control* paper of the lane — every other ledger (2062–2067) generates from the empirical distribution; this one provides the dial to reshape the sampling distribution deliberately (Eq. 8). Pairs naturally with any backbone: train TabSyn/TabRep unconditionally, then add this paper's multivariate guidance + balancing for regime-targeted oversampling. Note the paper's own backbone is one-hot+U-Net (weaker than our lane's best) — ADAPT the guidance/balancing, not the backbone.

## 11. GSE implementation spec
Build plan (effort: ~3 engineer-days; regime-oversampling module on top of the chosen backbone):
1. Train the backbone generator (TabSyn or TabRep from ledgers 2066/2067) with regime attributes included as columns: weather severity, rest days bin, prime-time, division game, dome/altitude.
2. Add multivariate classifier-free guidance head: condition on (outcome class c, regime attrs S) with the security gate (tune λ, δ, w_s on a validation slice; start from paper's settings).
3. Balanced sampling: empirical outcome distribution × uniform regime distribution; balancing dial i ∈ {0, 5, 10} — i=0 replicates history, i=10 uniform over regimes.
4. Generate tail-regime synthetic seasons at i=10 (e.g., 2× historical rate of severe-weather and short-rest games); mix with empirical synthetic seasons at low weight.

## 12. Reproducible test
Dataset: nflverse 2018–2023 train, 2024 held-out. Backbone: TabSyn (2066). Three synthetic sets: (a) empirical sampling (i=0), (b) balanced i=10 over weather×rest×outcome, (c) real-only baseline. Downstream: GBDT spread model; evaluate log-loss overall AND on the 2024 tail slice (severe weather + short rest games, n≈30–40). Metrics: overall log-loss, tail-slice log-loss, tail-slice calibration (ECE).

## 13. Acceptance / rejection gate
ADOPT the balancing module if: (a) tail-slice log-loss improves by ≥0.01 at i=10 vs i=0 (tail regimes are where the model is weakest, so the bar is higher than the overall 0.003), AND (b) overall 2024 log-loss does not degrade by more than 0.001 vs i=0 (the rebalancing must not poison the bulk), AND (c) the security gate keeps outcome-marginal drift ≤2% TVD between i=0 and i=10 samples (the paper's "don't distort the primary label" property). REJECT if any gate fails or if tuning (λ, δ, w_s) proves unstable across 3 seeds (std of tail log-loss > 0.005). Gate set before running; 3 seeds.

## 14. Improvement experiment
Learned balancing schedule: instead of a fixed i, make the balancing level a function of downstream need — i(s) per regime cell, set proportional to the current model's tail-slice calibration error on that cell (worse-calibrated cells get more synthetic mass). I.e., close the loop: validation ECE per regime cell → balancing weights → regenerate → retrain. This turns Eq. 8's static dial into an active-learning loop for synthetic data. Test: does ECE-proportional balancing beat fixed i=10 on tail-slice log-loss/ECE with the same total synthetic budget — if yes, the balancing module becomes self-tuning and the hyperparameter sprawl (§9.2) matters less.

**Verdict:** ADAPT
