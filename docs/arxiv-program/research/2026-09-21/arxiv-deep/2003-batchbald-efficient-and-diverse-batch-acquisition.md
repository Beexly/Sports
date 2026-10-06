# [2003] BatchBALD: Efficient and Diverse Batch Acquisition for Deep Bayesian Active Learning (arXiv:1906.08158)

**Citation:** Kirsch, A., van Amersfoort, J., Gal, Y. (2019). *BatchBALD: Efficient and Diverse Batch Acquisition for Deep Bayesian Active Learning*. arXiv:1906.08158. URL: https://arxiv.org/abs/1906.08158
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** joint mutual-information batch scoring with a greedy (1-1/e) submodular guarantee; the right formalism for acquiring diverse, non-redundant charting batches, but needs adaptation from Bayesian classification with MC dropout to GSE's regression/pick-probability models and to per-item acquisition costs.

## 1. Research question
How to select batches of points for deep Bayesian active learning such that points are scored jointly (not independently) — fixing the pathology where naively taking the top-b individually-high BALD scores acquires redundant near-replicas, sometimes performing worse than random — while keeping acquisition tractable.

## 2. Dataset / schema
- MNIST (standard 60k train / 10k test, 28×28 digits, 10 classes) plus a "Repeated MNIST" variant: every training point replicated twice (3× training set), isotropic Gaussian noise σ=0.1 added, to simulate near-duplicates.
- EMNIST Balanced (Cohen et al. 2017): 47 classes (digits + letters); 112,800 training images of which the last 18,800 are the validation set; 28×28.
- CINIC-10 (Darlow et al. 2018): 270k images from two sources (CIFAR-10 + downscaled ImageNet); split used: 160k unlabeled pool, 20k validation, 90k test; used in a transfer-learning setting (ImageNet-pretrained VGG-16 fine-tuned).
- All public benchmarks (standard vision splits as of 2019).

## 3. Method / model
BatchBALD acquisition function: mutual information between the JOINT of a batch's labels and the model parameters:
a_BatchBALD({x₁..x_b}, p(ω|D_train)) = I(y₁..y_b; ω | x₁..x_b, D_train) = H(y_{1:b} | x_{1:b}, D_train) − E_{p(ω|D_train)}[H(y_{1:b} | x_{1:b}, ω, D_train)].
BALD sums individual intersections Σᵢ μ*(yᵢ ∩ ω) (I-diagrams, Yeung 1991), double-counting overlaps; BatchBALD computes μ*((∪ᵢ yᵢ) ∩ ω) — the overlap-aware union. Proven: a_BatchBALD ≤ a_BALD (App. B.1); equivalent to BALD at acquisition size 1.
Greedy selection (Algorithm 1): iteratively add xₙ = argmax_{x ∈ pool \ A_{n−1}} a_BatchBALD(A_{n−1} ∪ {x}). The acquisition function is submodular (App. A), so greedy is a (1−1/e)-approximation (Nemhauser et al. 1978; Krause et al. 2008). Under idealized conditions the whole AL loop with BatchBALD is itself a greedy (1−1/e) approximation bounded by single-point acquisition (App. B.2).
Estimation: Bayesian model = MC dropout (Gal & Ghahramani 2016). Conditional term decomposes (yᵢ independent given ω): E[H(y_{1:n}|ω)] ≈ (1/k)ΣᵢΣⱼH(yᵢ|ω̂ⱼ) with k posterior samples. Joint entropy H(y_{1:n}) estimated by enumerating all cⁿ label configurations (exact for ~first 4 points) then MC sampling m configurations: −Σ_{ŷ_{1:n}} ((1/k)Σⱼp(ŷ_{1:n}|ω̂ⱼ)) log((1/k)Σⱼp(ŷ_{1:n}|ω̂ⱼ)). Efficient implementation: factorize p(y_{1:n}|ω) = p(y_{1:n−1}|ω)p(yₙ|ω), cache matrix P̂_{1:n−1} (c^{n−1}×k), recursive update, sample each pool point once with consistent dropout masks (required to capture between-input dependencies; masks NOT kept fixed for plain BALD since its scores benefit from the noise). Batch matrix multiplication across candidate xₙ.
Complexity: O(b·c·min{c^b, m}·|D_pool|·k) vs O(c^b·|D_pool|^b·k) for exact-optimal batch, vs O((b+k)·|D_pool|) for BALD (b = acquisition size, c = classes, k = MC samples, m = sampled label configurations).

## 4. Equations & assumptions
- (2) BALD: I(y;ω|x,D_train) = H(y|x,D_train) − E_{p(ω|D_train)}[H(y|x,ω,D_train)].
- (3) Naive batch BALD: a_BALD = Σᵢ I(yᵢ;ω|xᵢ,D_train).
- (4)–(7) BatchBALD as in §3; I-diagram identity I(y_{1:b};ω) = μ*(∪ᵢyᵢ) − μ*(∪ᵢyᵢ\ω) = μ*(∪ᵢyᵢ ∩ ω).
- (8)–(12) Estimator decomposition (joint entropy via double expectation, MC estimators).
- (13) Matrix-product caching identity: (1/k)Σⱼp(ŷ_{1:n}|ω̂ⱼ) = ((1/k)P̂_{1:n−1}P̂ₙᵀ)_{ŷ_{1:n−1},ŷₙ}.
- t-test for comparisons: median of 6 trials with lower/upper quartiles (no formal significance tests stated for the headline numbers).
- Assumptions: Bayesian model with tractable posterior sampling (MC dropout); discrete classification outputs (entropy over c classes); pool-based setting; i.i.d. data.

## 5. Features / target
Features: raw pixels (28×28 MNIST/EMNIST; CINIC-10 images); model = CNN blocks [conv, dropout, max-pool, relu] + MLP head. Target: class label; acquisition maximizes joint information about parameters. GSE-relevant note: the "features" that matter for acquisition are the model's predictive distributions under posterior draws — directly analogous to the engine's pick-probability uncertainty.

## 6. Validation design
- Protocol: repeated AL loops (train → acquire → retrain); models reinitialized after each acquisition (per Gal et al. 2017; decorrelates acquisitions, helps small batches); early stopping after 3 epochs of declining validation accuracy, keep best-validation model; Adam lr 0.001, betas 0.9/0.999.
- Experiments: (a) Repeated MNIST, acquisition size 10, 10 MC dropout samples, initial set = balanced 20 points (2/class, selected as median of 6 BALD runs then fixed); model: 2 conv blocks (32, 64 5×5 filters), 2-layer MLP (128, 10), dropout 0.5 (99% full-data accuracy). (b) MNIST standard setup of Gal et al. 2017 with 100 MC dropout samples; acquisition sizes 1, 5, 10, 40. (c) EMNIST Balanced, acquisition size 5, 10 MC dropout; 3 conv blocks (32/64/128 3×3) + MLP (512, 47), dropout 0.5; no initial set — first acquisition from randomly initialized model. (d) CINIC-10 transfer learning: pretrained VGG-16 + dropout + 512-unit FC, 50 MC dropout samples, acquisition size 10, 6 trials.
- Baselines: BALD (top-b individual scores), BALD reimplementation, Gal et al. 2017 numbers, random acquisition, Variation Ratios, Mean STD (App. E).
- Metric: test accuracy vs. number of acquired labels; results = median of 6 trials with quartile bars. No time-ordered splits (i.i.d. benchmarks).

## 7. Numerical results / baselines
- Repeated MNIST (acq size 10): BALD performs worse than random acquisition; BatchBALD "copes with the replication perfectly" (Figure 2). Increasing replication count makes BALD gradually worse (App. D); Variation Ratios and Mean STD perform on par with random (App. E).
- MNIST (Table 1, labels needed — quartiles 25/50/75%): to 90% accuracy — BatchBALD 70/90/110; BALD (their reimplementation) 120/120/170; BALD [Gal 2017] 145. To 95% — BatchBALD 190/200/230; BALD reimpl 250/250/>300; BALD [Gal 2017] 335. Roughly 1.6–1.7× label savings at both thresholds.
- Increasing acquisition size on MNIST: BALD's performance "drops drastically" from size 1 to 40; BatchBALD maintains performance doubling 5→10 and drops only slightly at 40 (attributed to estimator noise). BatchBALD acq-10 performs "close to the ideal with acquisition size 1."
- Runtime to 95% on MNIST (Figure 6): BatchBALD acq-10 much faster than BALD acq-1, only marginally slower than BALD acq-10 (i.e., joint scoring pays for itself via fewer retrains).
- EMNIST (acq 5): BatchBALD consistently beats both random and BALD; BALD unable to beat random. BatchBALD acquires a more diverse class distribution — entropy of acquired class-label histogram consistently higher; BALD undersamples classes, BatchBALD is "more consistent" (Figures 7–8, 15).
- CINIC-10 (transfer, acq 10): 59% accuracy mark reached at 1170 acquired (BatchBALD) vs 1330 (BALD), median — ~12% label savings; BatchBALD beats BALD from 500 acquired samples onward.

## 8. Code / data availability
Code: https://github.com/BlackHC/BatchBALD (stated in paper). Datasets: public benchmarks.

## 9. Leakage & limitations
- Paper's own scope/limitations (§6): (1) BALD/BatchBALD aim to learn well about all classes and do not follow dataset density — poor on unbalanced test sets (a sports slate is inherently unbalanced across bet types/teams; acquisition should be weighted by slate importance, not class balance). (2) Ignores unlabeled-data structure — no semi-supervised component (relevant: nflverse gives us a huge unlabeled pool whose structure could sharpen uncertainty). (3) MC-dropout noise + joint-entropy sampling noise degrade larger batches; estimator noise is the binding constraint at acq-40.
- Classification-only; GSE spread/total heads are binary classification (applies directly) but margin/EPA-style regression targets need a differential-entropy variant.
- Requires a Bayesian model with posterior samples (MC dropout); a deterministic GSE engine would need dropout-at-inference or a deep ensemble to produce the posterior draws — extra engineering.
- Joint-entropy enumeration scales as c^b; fine for binary heads (c=2), explosive for many-class settings (mitigated by MC sampling of configurations).
- i.i.d. benchmarks; no temporal/drift validation.

## 10. GSE overlap
Existing-research-map shows calibration work (CQR, stats export) and charting catalogs but no Bayesian joint-acquisition machinery. Overlaps conceptually with paper 2002 (BADGE) — both solve batch diversity+uncertainty — but BatchBALD is the Bayesian/information-theoretic counterpart: principled where BADGE is heuristic, with a (1−1/e) guarantee, and explicitly built for the retrain-costly regime (fewer retrains = exactly GSE's weekly charting cycle). New capability, not a duplicate.

## 11. GSE implementation spec
- Setting: weekly charting batch = b games/plays; model = engine pick-probability head (binary: cover / over) with MC dropout enabled at inference (k=50 forward passes) or a 5-model deep ensemble for posterior draws.
- Acquisition: compute BatchBALD score greedily — candidate games x, joint entropy over 2^b label configurations (binary ⇒ cheap; for b=10, 1024 configs, exact enumeration fine). Select b games maximizing joint I with parameters.
- Slate-weighting fix for limitation (1): weight the joint-entropy term by expected handle/edge importance per game (e.g., primetime × weight) so acquisition follows GSE's economic density, not class balance.
- Cost extension (limitation: paper is cost-blind): divide the greedy marginal gain by √cost(x) (cost = charting minutes or feed price) for a cost-aware greedy variant — still near-submodular in practice.
- Serving: run acquisition Sunday night for the coming week's charting queue; cache posterior-draw prediction matrices per pool game (one pass per game, per §3.4); greedy selection is O(b·|pool|·k·2^b) — trivial for |pool| ≈ 300 games.
- Effort: ~2 weeks (dropout-at-inference or ensemble plumbing, greedy scorer, queue integration).

## 12. Reproducible test
Dataset: nflverse 2023–2024; simulate charting acquisition for spread-pick charting labels (charted features). Model: binary cover classifier with MC dropout (k=50). Start: 2023 weeks 1–4 labeled; batches b=10 selected by BatchBALD vs. BALD-top-10 vs. random; retrain per round; evaluate held-out log-loss on 2024 season picks. Baseline to beat: BALD-top-10 at equal budget. Metric: 2024 held-out log-loss; also count retrains saved.

## 13. Acceptance / rejection gate
ADOPT iff BatchBALD at 20% charting budget achieves 2024 held-out log-loss ≤ random at 40% budget (the lane's standard efficiency bar), AND beats BALD-top-10 at equal budget by ≥ 0.005 log-loss, in the 2024 holdout. REJECT if BatchBALD underperforms BALD-top-10 at equal budget, or estimator noise makes acq-10 results unstable across 3 seeds (std > 0.01 log-loss), or MC-dropout plumbing degrades the engine's own calibration (ECE increase > 0.01).

## 14. Improvement experiment
Slate-weighted BatchBALD with cost-aware greedy: maximize Σ-gain/√cost with game weights = expected edge × handle proxy. Run the same charting-budget simulation with and without economic weighting; hypothesis: economically-weighted acquisition improves realized ROI-per-charting-dollar (not just log-loss) because it stops spending budget on low-handle games where even perfect information has no betting value — a gap the paper's accuracy-only objective never sees.
