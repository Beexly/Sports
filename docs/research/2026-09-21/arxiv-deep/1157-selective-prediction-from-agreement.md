# [1157] Selective Prediction from Agreement: A Lipschitz-Consistent Version Space Approach (arXiv:2605.02611)

**Citation:** Mohamadsadegh Khosravani (2026). *Selective Prediction from Agreement: A Lipschitz-Consistent Version Space Approach*. arXiv:2605.02611v1 [cs.LG], University of Regina. URL: https://arxiv.org/abs/2605.02611
**Ledger completed:** 2026-09-21. **Read:** full text (16 pages).
**Verdict:** ADAPT
The certified version of 1153's disagreement idea: instead of an empirical committee vote, define the version space of Lipschitz-consistent heads in embedding space and post only when *every* consistent head agrees (two-sided margin envelopes make this computable). Gives a stability certificate for each posted pick. Conservative by design — the paper is honest that certified coverage saturates below heuristic methods.

## 1. Research question
In fixed-pool (transductive) selective classification — the unlabeled pool is known in advance, only a budgeted subset can be labeled — can abstention be grounded in *identifiability* rather than confidence? I.e., predict at a pool point only if the label is forced (all hypotheses consistent with the data and explicit Lipschitz constraints agree), and abstain otherwise, with computable certificates.

## 2. Dataset / schema
Transductive CIFAR-10 (N=10,000 test pool) and SVHN (N=26,032 test pool), C=10 classes. ResNet-18 encoder trained on train split; ℓ2-normalized penultimate-layer features (d=512) as the embedding space. Label budgets b ∈ {0.5%, 1%, 2%, 5%} (k=⌈bN⌉). Acquisition strategies: greedy ball-coverage, farthest-first k-center, uniform random.

## 3. Method / model
**Representation–head decomposition:** fixed g: X→R^m, head f: R^m→R^C. One-vs-rest margins M_c(z) = f_c(z) − max_{k≠c} f_k(z), assumed L_{M,c}-Lipschitz (Assumption 1); for linear heads L_{M,c} = max_{k≠c} ‖w_c−w_k‖_2, deeper heads via spectral/norm bounds.
**Version space** F(S): heads with L_{M,c}-Lipschitz margins satisfying center constraints M̃_{y_i}(z_i) ≥ m_i at labeled points.
**Two-sided envelopes:** LB_c(u) = sup_{i∈S:y_i=c}(m_i − L_{M,c}‖z_u−z_i‖) (positive evidence); UB_c(u) = inf_{i∈S:y_i≠c}(−m_i + L_{M,c}‖z_u−z_i‖) (negative evidence; Lemma 1: non-target margins ≤ −m_i at centers).
**Forcing rules:** (i) singleton — feasible set Γ(u) = {c: UB_c(u) ≥ 0} is a singleton (τ-relaxed: Γ_τ(u) = {c: UB_c(u) ≥ −τ}); (ii) gap forcing — LB_{c*}(u) ≥ κ and LB_{c*}(u) > max_{c≠c*}UB_c(u) + τ (Theorem 4: sound — every consistent head predicts c*).
**Closure (Theorem 5):** adding forced pseudo-labels as anchors leaves F(S) unchanged — safe iterative certified expansion.
**Budgeted querying:** label-free geometric proxy F_ρ(S) = |{u: ∃i∈S, ‖z_u−z_i‖<ρ_acq}| is monotone submodular → greedy (1−1/e) (Theorem 6, Nemhauser-Wolzey-Fisher).

## 4. Equations & assumptions
- Margin: M_c(z) := f_c(z) − max_{k≠c} f_k(z) (Def. 3).
- Lipschitz: M_c(z) − M_c(z′) ≤ L_{M,c}‖z−z′‖ (Assumption 1).
- Lower envelope (Def. 6): LB_c(u) := sup_{i∈S:y_i=c}(m_i − L_{M,c}‖z_u−z_i‖).
- Upper envelope (Def. 7): UB_c(u) := inf_{i∈S:y_i≠c}(−m_i + L_{M,c}‖z_u−z_i‖).
- Feasible set (Def. 8): Γ(u) := {c: UB_c(u) ≥ 0}; relaxed Γ_τ(u) := {c: UB_c(u) ≥ −τ} (Def. 9).
- Gap forcing (Def. 10): LB_{c*}(u) ≥ κ ∧ LB_{c*}(u) > max_{c≠c*} UB_c(u) + τ.
- Certified radius: ρ_cert = γ/L_max under margin floor m_i ≥ γ (Assumption 2, Lemma 2).
- Coverage/Risk (Def. 1): Cov(π) = (1/N)Σ1{π(u)≠⊥}; Risk(π) = Σ1{π(u)≠⊥,π(u)≠y*(u)}/Σ1{π(u)≠⊥}.
- **Assumptions:** fixed representation g (certificates must be recomputed if g changes); computable Lipschitz upper bounds; center margin lower bounds {m_i}; agreement ⇒ correctness only under extra separation assumptions (supplementary).

## 5. Features / target
Features: ℓ2-normalized ResNet-18 embeddings (d=512). Target: class label; the selective decision is post (forced label) vs abstain.

## 6. Validation design
Fixed-pool transductive protocol; RC curves by sweeping each method's control parameter; truncated AURC over [0, covmax_cert] for matched-coverage comparison. Baselines: softmax thresholding, margin (top-1/top-2 gap) thresholding, APS conformal singletons, selectivenet_gate — all post-hoc on the same head.

## 7. Numerical results / baselines
- Max certified coverage (Table 1): CIFAR-10 greedy — 0.8042 (0.5%), 0.8250 (1%), 0.8079 (2%), 0.8527 (5%); random — 0.5145/0.6922/0.7490/0.8534; k-center — 0.1385/0.2130/0.2968/0.4213. SVHN greedy — 0.7787/0.7207/0.6818/0.6076; random — 0.6820/0.6263/0.7792/0.8437.
- Findings: (1) cert_full competitive with or better than post-hoc baselines *on the certified domain*; (2) certified coverage strongly acquisition-sensitive (greedy ≫ k-center); (3) conservative by design — low selective risk on certified domain but saturates at lower max coverage than heuristic thresholding. Non-monotone in budget (changing S changes head, margins, Lipschitz constants).

## 8. Code / data availability
None stated in the main text (details deferred to supplementary material, not extracted).

## 9. Leakage & limitations
- **Certifies agreement, not correctness** — the paper states this explicitly; a forced label means "robust to head choice," not "right." The correctness link needs extra separation assumptions.
- Conservative: saturates below heuristic coverage; the certified domain may be too small to be useful if the embedding space is poorly structured.
- Certificates live in the embedding space — if GSE's representation changes (engine retrain), all envelopes must be recomputed (Remark 1).
- Lipschitz upper bounds from spectral norms can be loose, shrinking the certified region; the paper controls them during training but looseness bounds are not quantified.
- Single author, vision-only evaluation; no tabular/structured-data validation.

## 10. GSE overlap
Formalizes and strengthens 1153's disagreement rule. Where 1153 says "abstain where near-optimal policies disagree" (empirical committee), this paper says "post only where *every* Lipschitz-consistent head agrees" (certified version space). Same idea, stronger claim: per-pick stability certificates instead of a vote count. The budgeted-querying machinery is less relevant (GSE doesn't buy labels under budget), but the closure property (Theorem 5) enables iterative certified expansion of the posted set. Extension, not duplicate.

## 11. GSE implementation spec
1. **Embedding space:** use GSE's game feature vectors (engine features or a fixed encoder) as z; freeze for the slate (the week's slate is the fixed pool — a natural transductive fit).
2. **Lipschitz-constrained selection heads:** train K post/don't-post heads with spectral normalization (bounding L_M, cf. their Remark 2); labeled centers = historically graded games with oracle post/don't-post labels (post-hoc ROI-positive ⇒ "post" was correct).
3. **Envelope computation per slate game:** compute LB/UB over classes {post, don't-post} from labeled centers; apply singleton forcing (Γ_τ) then gap forcing (κ, τ tuned on validation); post only forced games.
4. **Iterative expansion:** add forced games as pseudo-labeled anchors (Theorem 5 — version space unchanged) and re-run to expand the certified posted set within the slate.
5. **Effort:** ~4 days (spectral-norm head training + envelope/force pipeline).

## 12. Reproducible test
Dataset: GSE graded picks; slate-by-slate transductive evaluation. Baseline: 1153-style empirical disagreement (K unconstrained heads, abstain on any disagreement). Metric: selective ROI on forced/posted picks at matched coverage. Success = Lipschitz-forced picks achieve selective ROI ≥ empirical-disagreement picks at equal coverage, with the certificate (agreement over the *entire* Lipschitz ball, not just K samples) holding by construction.

## 13. Acceptance / rejection gate
ADAPT the forcing rule iff forced picks beat the empirical-disagreement baseline by ≥1 selective-ROI point at matched coverage on chronological slate evaluation. REJECT if certified coverage collapses (<20% of slate) — the paper's conservativeness warning; in that case the Lipschitz ball is too loose to be useful and the empirical 1153 rule stands. REJECT the submodular acquisition machinery (no label-budget problem at GSE).

## 14. Improvement experiment
Tighten the Lipschitz bounds with **local** (per-region) rather than global constants: estimate L_{M,c} on neighborhoods of the slate embedding manifold instead of one global spectral bound — looser global bounds are the main coverage killer. Test: local-Lipschitz envelopes vs global on certified coverage at fixed selective risk. Second: replace the fixed representation with the engine's own calibrated uncertainty embedding and test whether a better-structured space expands the certified region (their Table 1 shows acquisition/geometry dominates — the same should hold for representation quality).
