# [1912] Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks (arXiv:1703.03400v3)

**Citation:** Finn, C., Abbeel, P., Levine, S. (2017). *Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks*. arXiv:1703.03400v3. URL: https://arxiv.org/abs/1703.03400v3
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; version v3 per fetched HTML).
**Verdict:** ADAPT

**Why:** the anchor gradient-based meta-learner: explicitly trains parameters so that a few gradient steps on a new task's data produce good generalization. The sine-wave regression result (5 points, extrapolates periodic structure to unseen regions) is the direct template for GSE's new-regime margin adaptation; the first-order approximation's 33% speedup with no accuracy loss is the production detail.

## 1. Research question
Prior meta-learners learn an update rule (RNN optimizers, Siamese/metric nets) — adding parameters, constraining architecture, and failing to transfer across domains (classification vs regression vs RL). Can we instead meta-learn only the *initialization* θ, optimizing explicitly for post-adaptation performance: **min_θ Σ_{T_i∼p(T)} ℒ_{T_i}(f_{θ−α∇_θℒ_{T_i}(f_θ)})** (Eq. 1), so that one or a few gradient steps on K new-task examples yield fast adaptation — with no extra parameters, no architectural constraints, applicable to any gradient-trained model?

## 2. Dataset / schema
- **Few-shot regression**: sine waves, amplitude U[0.1,5.0], phase U[0,π], x∈[−5,5]; 2×40 ReLU MLP; MAML trained with K=10, one gradient step α=0.01, Adam meta-optimizer; evaluated at K∈{5,10,20}. Baselines: (a) pretraining on all tasks then fine-tuning (tuned step size), (b) oracle receiving true amplitude/phase.
- **Omniglot**: 1200 chars train; 4-module CNN (64 filters) or non-conv 256-128-64-64 net.
- **miniImageNet**: 64/12/24 split; ConvNet (32 filters/layer to reduce overfitting).
- **RL**: 2D navigation (goal positions in unit square), half-cheetah and ant locomotion (goal velocity U[0,2]/U[0,3], goal direction fwd/bwd); policy = 2×100 ReLU; REINFORCE inner updates, TRPO meta-optimizer. Baselines: pretrain+finetune, random init, oracle with task params.
Code: github.com/cbfinn/maml and github.com/cbfinn/maml_rl (stated).

## 3. Method / model
**MAML.** Inner update: **θ′_i = θ − α∇_θℒ_{T_i}(f_θ)**; outer update: **θ ← θ − β∇_θΣ_{T_i}ℒ_{T_i}(f_{θ′_i})** (Algorithm 1–3). Meta-gradient requires differentiating through the gradient operator (Hessian-vector products); the paper shows a **first-order approximation** (drop second derivatives, still evaluate meta-gradient at θ′_i) performs "nearly the same" with a ~33% compute speedup. Supervised instantiation: MSE (Eq. 2) / cross-entropy (Eq. 3); RL instantiation: policy gradient inner loop, TRPO outer (Algorithm 3). Interpretation offered: maximizes sensitivity of new-task losses to parameters (small param changes → large loss improvements) and/or learns broadly-suitable internal representations.

## 4. Equations & assumptions
- Meta-objective (Eq. 1); inner update; outer update; supervised losses (Eqs. 2–3); RL loss (Eq. 4): −E[Σ_t R_i(x_t,a_t)].
Assumptions: (i) tasks drawn from a shared distribution p(T) — new regimes must be *in-distribution* relative to historical team-seasons; (ii) loss smooth enough in θ for gradient-based adaptation; (iii) ReLU nets are "locally almost linear" (justifies first-order approx); (iv) enough tasks for meta-training; (v) RL instantiation needs fresh on-policy samples per inner step.

## 5. Features / target
Features: 1D x (regression), images (classification), state (RL). Target: sine value (MSE), class label, policy return. Horizon: point prediction / episode.

## 6. Validation design
Sine regression: qualitative (Figure 2) + learning curves (Figure 3) at K∈{5,10,20}, multiple gradient steps at test time (trained for one step); classification: 5-way 1/5-shot, 95% CIs over tasks; RL: adaptation curves up to 4 gradient updates vs pretrain/random/oracle.

## 7. Numerical results / baselines
Numbers quoted exactly:
- **Sine regression**: MAML adapts "with only 5 datapoints" where pretraining "is unable to adequately adapt with so few datapoints without catastrophic overfitting." Critically: when the K points "are all in one half of the input range, the model trained with MAML can still infer the amplitude and phase in the other half of the range" — it learned the *periodic structure*, not just local interpolation. "Continues to improve with additional gradient steps without overfitting to the extremely small dataset" despite being trained for maximal one-step performance (Figure 3).
- **Omniglot 5-way**: **98.7 ± 0.4%** (1-shot), **99.9 ± 0.1%** (5-shot); 20-way: 95.8 ± 0.3% / 98.9 ± 0.2% — "narrowly outperforming" matching nets (98.1/98.9), memory modules (98.4/99.6), MANN (89.7/97.5 non-conv). **Uses fewer overall parameters** than matching nets and meta-learner LSTM.
- **miniImageNet 5-way**: **48.70 ± 1.84%** (1-shot), **63.11 ± 0.92%** (5-shot) vs meta-learner LSTM 43.44/60.60, matching nets 43.56/55.31, fine-tune 28.86/49.79. First-order approx: 48.07 ± 1.75% / 63.15 ± 0.91% — "nearly the same" at ~33% less compute.
- **RL**: cheetah/ant "adapt to new goal velocities and directions substantially faster… achieving good performance in just two or three gradient steps"; 2D navigation adapts in a single gradient update and keeps improving. Pretraining "in some cases worse than random initialization."
*My inference:* the regression headline is qualitative; the exact scalar deltas for sine MSE aren't printed — the classification numbers carry the exactness. For GSE, the regression behavior (structure extrapolation from 5 points) is the valuable claim and needs our own quantification.

## 8. Code / data availability
Code: github.com/cbfinn/maml, github.com/cbfinn/maml_rl (stated). Data: synthetic sines, public Omniglot/miniImageNet, MuJoCo/rllab.

## 9. Leakage & limitations
- Second-order meta-gradient cost (mitigated by the validated first-order approx).
- Inner-loop gradient steps at test time need labeled data and careful step-size tuning; ALPaCA (ledger 1907) shows analytic updates can beat gradient adaptation on stability.
- Task-distribution assumption: a regime genuinely unlike any historical season (rule change) is out-of-distribution — MAML gives no uncertainty signal about this (cf. ledger 1910's σ_i weighting, 1907's posterior variance).
- No calibration analysis; MSE/cross-entropy only.
- RL instantiation is on-policy and sample-hungry per inner step — not directly portable to GSE's offline weekly setting; the supervised instantiation is the relevant one.

## 10. GSE overlap
The foundational few-shot meta-learner; every ledger in this lane either builds on it (1910 improves it; 1907 contrasts analytic vs gradient updates; 1911 defers MAML evaluation) or competes with it (1909 TNP-KR). Nothing in Garrett's map implements it. **New capability**: a league-wide initialization explicitly trained so that K∈{2,4} games of gradient adaptation produce a calibrated new-regime team-strength model — the simplest possible "rookie QB adapter": fine-tune the meta-init on the rookie's observed games, predict the rest.

## 11. GSE implementation spec
1. Model: small tabular MLP (game features → margin), meta-trained over historical team-seasons as tasks (support = first K games, query = remaining games).
2. Use the **first-order approximation** (validated: same accuracy, 33% faster) — production adaptation is then just a few gradient steps per team per week.
3. Meta-train with K∈{2,4} to match the new-regime data budget; test-time adaptation: 1–5 gradient steps on observed games.
4. Pair with ledger 1910's per-season uncertainty weighting (σ_i) and ledger 1911's fixed-support-pool episode construction as ablations.
Effort: ~2 engineering weeks; standard PyTorch, no new ops.

## 12. Reproducible test
nflverse 2015–2025; tasks = team-seasons; meta-train ≤2022, meta-test 2023–2025 new regimes (rookie QB, new HC). K∈{2,4} support games; 1–5 inner gradient steps. Baselines: (a) pretrain-on-all-seasons + fine-tune (the paper's own baseline — expected to overfit), (b) per-task XGBoost on support, (c) league-average prior. Metrics: margin RMSE, win Brier; verify the extrapolation claim: does the adapted model predict games *unlike* the support set (e.g., support all home games → predict away games) better than the baselines, mirroring the paper's "other half of the range" result?

## 13. Acceptance / rejection gate
ADOPT iff MAML beats pretrain+fine-tune by **≥0.02 Brier** on new-regime win prediction at K∈{2,4} (2023–2025) AND shows the paper's no-overfit behavior (performance non-decreasing over 1→5 inner steps). Reject if pretrain+fine-tune matches it — then explicit meta-training isn't buying GSE anything over the existing "fit on all history, recalibrate weekly" pipeline.

## 14. Improvement experiment
**MAML + ALPaCA hybrid (gradient init, analytic head)**: meta-learn the MAML initialization for the *feature extractor* φ(x;w) while using ALPaCA's (ledger 1907) recursive Bayesian last-layer update instead of gradient steps at test time. Rationale: MAML's strength is the learned representation; ALPaCA's strength is stable analytic adaptation — the hybrid gets MAML's few-shot structure-learning with ALPaCA's no-overfit, no-step-tuning online updates. Test: same protocol; success = beats both parents on NLL in weeks 1–8 with flat-or-improving curves over the season. The anchor paper of gradient-based meta-learning. Adopt for the *mechanism and the regression template*; its classification numbers are reproduced here for completeness but the sports value is all in few-shot adaptation of a regression model.
