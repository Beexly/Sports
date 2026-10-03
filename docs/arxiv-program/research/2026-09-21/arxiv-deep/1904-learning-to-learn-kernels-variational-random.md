# [1904] Learning to Learn Kernels with Variational Random Features (arXiv:2006.06707v2)

**Citation:** Zhen, X., Sun, H., Du, Y., Xu, J., Yin, Y., Shao, L., Snoek, C. (2020). *Learning to Learn Kernels with Variational Random Features*. arXiv:2006.06707v2. URL: https://arxiv.org/abs/2006.06707v2
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

**Why:** learns task-adaptive RFF kernels with far fewer bases than vanilla RFFs, and the closed-form kernel-ridge base-learner is exactly the shape GSE needs for fast weekly re-fits on new regimes.

## 1. Research question
Kernels are strong base-learners but unused in meta/few-shot learning because a fixed kernel (RBF with bandwidth from a 5-sample support set) is uninformative, while data-driven kernel learning needs data few-shot tasks lack. Can treating the random Fourier basis ω as a latent variable — inferred variationally from the task support set plus LSTM-accumulated cross-task context — produce adaptive kernels with high representational power at low spectral sampling rates that adapt fast to new few-shot tasks?

## 2. Dataset / schema
- **Few-shot regression**: sine y = A·sin(wx+b), A∈[0.1,5], w∈[0.8,1.2], b∈[0,π]; x∈[−5,5]; k∈{3,5,10} shots; 2-hidden-layer MLP(40) embedding, MAML settings.
- **Classification**: Omniglot (5-way/20-way, 1/5-shot), miniImageNet (5-way 1/5-shot), CIFAR-FS (5-way 1/5-shot); shallow ConvNet (256-d features); 3,000 test episodes (vs standard 600), 95% CIs; plus WRN-28-10 pre-trained embeddings (640-d) for deep-embedding comparison.
- Hyperparameters: D=780 RFF bases (vs 2048 for regular RFFs; typical RFF use is 5–10× input dim); inference network = 3-layer MLP(256); λ (ridge) is meta-learned.
- Code/data: datasets public; no code URL stated in the paper.

## 3. Method / model
**MetaVRF.** Base-learner = kernel ridge regression with closed form α = Y(λI+K)⁻¹, Ŷ = αK̃. The kernel is built from random Fourier features z(x) = D^-1/2[cos(ω₁ᵀx+b₁),…,cos(ω_Dᵀx+b_D)] where the bases ω are latent variables: q_φ(ω|S) (support-conditioned variational posterior, diagonal Gaussian via 3-layer MLP) approximates p(ω|y,x,S). **Context inference**: q_φ(ω^t|h^t) where h^t is the LSTM output combining the current task's averaged support embedding S̄^t with the cell state c^{t−1} carrying distilled meta-knowledge across tasks (vanilla and bidirectional LSTM variants). Prior p(ω^t|x,S^t) = cross-attention network. ELBO objective over T tasks: (1/T)Σ_t[Σ_{(x,y)∈Q^t} E_{q(ω^t|h^t)} log p(y|x,S^t,ω^t) − D_KL[q_φ(ω^t|h^t) || p(ω^t|x,S^t)]]. Reparameterization trick on ω. At meta-test: feed-forward pass through the trained LSTM + sampled bases → closed-form ridge solution, no gradient steps.

## 4. Equations & assumptions
- KRR: **Λ = argmin_α Tr[(Y−αK)(Y−αK)ᵀ] + λ·Tr[αKαᵀ]**, closed form **α = Y(λI+K)⁻¹**, **Ŷ = f_α(X̃) = αK̃** (Eqs. 3–5).
- Bochner: **k(x,x′) = ∫ e^{iωᵀ(x−x′)} dp(ω) = E_ω[ζ_ω(x)ζ_ω(x′)⁎]** (Eq. 6).
- RFF map: **z(x) = D^-1/2[cos(ω₁ᵀx+b₁),…,cos(ω_Dᵀx+b_D)]** (Eq. 7).
- ELBO: **log p(y|x,S) ≥ E_{q_φ(ω|S)} log p(y|x,S,ω) − D_KL[q_φ(ω|S) || p(ω|x,S)]** (Eq. 11); task objective (Eq. 12).
- Context ELBO (Eq. 13) with q_φ(ω|S^t,C); LSTM: **[h^t, c^t] = g_LSTM(S̄^t, h^{t−1}, c^{t−1})** (Eq. 14); ω = ω_μ + ω_σ ⊙ ε, ε∼N(0,I).
Assumptions: (i) translation-invariant kernels (Bochner) suffice; (ii) ω can be amortized by support-set averages S̄^t; (iii) sequential task ordering carries transferable structure for the LSTM; (iv) diagonal-Gaussian q over ω is expressive enough; (v) the conditional prior from cross-attention approximates the true spectral density.

## 5. Features / target
Regression: scalar x → sine value. Classification: 256-d (shallow CNN) or 640-d (WRN-28-10) image embeddings → class one-hot. Target: continuous scalar or C-way label. Horizon: single query prediction.

## 6. Validation design
Episodic meta-train/test with disjoint classes. Regression vs MAML only (Figure 3, MSE curves for k=3,5,10). Classification: 5-way 1/5-shot on 3 datasets, 3,000 episodes, 95% CIs. Baselines: MatchingNet, MAML, Meta-LSTM, ProtoNet, RelationNet, SNAIL, GNN, PLATIPUS, VERSA, R2-D2, CAVIA, iMAML, RBF kernel, plain RFFs(2048d), MetaVRF w/o LSTM (Eq. 12 baseline), plus Meta-SGD/LEO/TADAM under deep embeddings. Inconsistent-way/shot robustness test (train 20-way-5-shot → test up to 100-way, retains 94% — Figure 5). Not time-ordered.

## 7. Numerical results / baselines
Numbers quoted exactly:
- **miniImageNet 5-way 1-shot (shallow net)**: MAML 48.7 ± 1.8, ProtoNet 47.4 ± 0.6, RelationNet 50.4 ± 0.8, VERSA 53.3 ± 1.8, RFFs(2048d) 52.8 ± 0.9, MetaVRF w/o LSTM 51.3 ± 0.8, vanilla LSTM 53.1 ± 0.9, **bi-LSTM 54.2 ± 0.8** (best; +1% over next best).
- **miniImageNet 5-way 5-shot**: RFFs 65.4 ± 0.9 vs **MetaVRF bi-LSTM 67.8 ± 0.7**.
- **miniImageNet 5-way 1-shot (WRN-28-10 embeddings)**: LEO 61.76 ± 0.08, Meta-SGD 54.24, **MetaVRF bi-LSTM 63.80 ± 0.05** (clear SOTA); 5-shot: TADAM 76.70 ± 0.30 vs **MetaVRF bi-LSTM 77.97 ± 0.28**.
- **CIFAR-FS 5-way 5-shot**: R2-D2 77.4 ± 0.2 vs MetaVRF bi-LSTM 76.5 ± 0.9 (competitive).
- **Omniglot 5-way 1-shot**: VERSA 99.7 ± 0.2 vs MetaVRF bi-LSTM 99.8 ± 0.1; 20-way 5-shot: MetaVRF 99.2 ± 0.2 vs best baselines ≈99.4 (within noise).
- **Regression**: MetaVRF fits the sine "well with only three shots" and beats MAML at k=3,5,10 (Figure 3, curves; no tabular MSE given).
- Ablation: bi-LSTM > vanilla LSTM > w/o LSTM consistently; MetaVRF(780d) beats plain RFFs(2048d) at every sampling rate tested (Figure 4).
*My inference:* the "adaptive kernel at low sampling rate" property is the GSE-relevant one — fewer bases = cheaper weekly inference.

## 8. Code / data availability
No code URL stated ("None stated" for code). Datasets: Omniglot, miniImageNet, CIFAR-FS (public). Supplementary material referenced for extra regression results and prior-network details.

## 9. Leakage & limitations
- Classification evidence dominates; regression evidence is a single synthetic family with no tabular numbers — the GSE-relevant claim (few-shot numeric prediction) rests on Figure 3 curves only.
- LSTM task-ordering: meta-training tasks are sequenced; if task order is arbitrary, the "context" is order-dependent — sports has a natural order (seasons), which actually suits this, but the paper doesn't test order sensitivity.
- ω posterior is diagonal Gaussian — may underfit multi-modal spectral densities; the learned kernel could collapse toward RBF-like shapes.
- No calibration metrics (accuracy only for classification; no NLL) — contrasts with ledgers 1902/1903 where probabilistic quality is the point.
- λ meta-learned globally; per-task noise levels (the NGGP problem) are not modeled.
- External validity: vision only; tabular sports data untested.

## 10. GSE overlap
No RFF/kernel meta-learning in Garrett's map or the GSE codebase (XGBoost/state-space stack; kernels appear nowhere). The closed-form KRR base-learner is a genuine alternative to gradient-based fine-tuning for weekly adaptation. **New capability**: meta-learned similarity metric over team-game contexts, usable as a fast, gradient-free few-shot head — complements ledgers 1902/1903 (both GP-based; this one replaces the GP with a learned-kernel KRR, which is O(n³)-free at inference once bases are sampled... in fact KRR is still O(n³) in support size, but support sets are 2–4 games so it's trivial).

## 11. GSE implementation spec
1. Data: nflverse team-game feature vectors (same task construction as ledgers 1902/1903: tasks = team-seasons; sequential order by season gives the LSTM a meaningful order).
2. Replace image CNN with a tabular embedding ψ(·) (small MLP on team-game stats); D=780 RFF bases; base-learner = KRR predicting next-game margin (closed form, λ meta-learned).
3. LSTM context inference over seasons: cell state accumulates "league meta-knowledge" across seasons; per-regime (rookie QB, new HC) support sets produce task-adaptive spectral distributions.
4. Serving: meta-test = feed-forward through LSTM + sampled ω + closed-form ridge solve per team each week — no gradient steps, fast enough for the full 32-team weekly slate.
5. Classification variant: cover/no-cover as C-way task for spread prediction (compare against the engine's existing classifier head).
Effort: ~2–3 engineering weeks; no public code, so a from-scratch implementation guided by the ELBO derivation is needed.

## 12. Reproducible test
Same meta-protocol as ledgers 1902/1903 (nflverse, LOSO, support = first K∈{2,4} games of new-regime teams). Baselines: (a) fixed RBF-KRR with bandwidth = mean pairwise distance (paper's own RBF baseline — expected to fail on 2-sample supports), (b) plain RFFs at D=2048, (c) league-average prior. Metrics: Brier + RMSE on margin. The RBF-vs-MetaVRF contrast tests whether adaptive spectral inference earns its keep on tiny sports support sets.

## 13. Acceptance / rejection gate
ADOPT iff MetaVRF beats the league-average prior by **≥0.01 Brier** on new-regime first-4-game predictions (2023–2025 LOSO) AND beats fixed-bandwidth RBF-KRR by ≥0.005 Brier (proves adaptation, not just the kernel, does the work). Reject if the LSTM context adds nothing over MetaVRF w/o LSTM — then use the simpler Eq. 12 variant or drop the lane.

## 14. Improvement experiment
**Heteroscedastic MetaVRF**: combine with ledger 1902 — put the NGGP per-observation flow on top of the MetaVRF kernel, i.e., adaptive spectral kernel (handles task similarity) + conditional flow (handles per-game noise geometry). Rationale: rookie-QB regimes differ from veteran regimes in BOTH similarity structure and noise shape; the two papers attack orthogonal halves. Test on the same meta-protocol; expect the hybrid's NLL to beat each component alone, especially on high-variance regimes (rookie QBs, backup-QB spot starts). This paper's closed-form base-learner + the LSTM "distilled league knowledge" cell state is the most operationally deployable of the four read so far — weekly inference is a forward pass plus a 4×4 matrix solve.
