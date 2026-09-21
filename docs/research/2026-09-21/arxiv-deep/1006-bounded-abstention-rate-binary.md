# [1006] Binary Classification with Bounded Abstention Rate (arXiv:1905.09561)

## Citation / full-text source

- arXiv:1905.09561 — full text: https://arxiv.org/pdf/1905.09561
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Shubhanshu Shekhar, Mohammad Ghavamzadeh, Tara Javidi (2019; v1). *Binary Classification with Bounded Abstention Rate*. arXiv:1905.09561v1. URL: https://arxiv.org/abs/1905.09561
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/1905.09561.txt` (arXiv conversion; single-line file read in full via chunked extraction — abstract, §§1–6, experiments on PIMA, Appendices A–D proofs; Figure 1 described in text).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — the bounded-rate (abstain on ≤δ, no per-abstention cost) formulation is the exact model of GSE's weekly board volume constraint; the semi-supervised plug-in (threshold from UNLABELED upcoming-slate games) gives a principled publish/skip cutoff at exactly the desired volume.

## 1. Research question
In the bounded-rate abstention setting (abstain on at most a fraction δ of inputs, no cost per abstention — the bottleneck is processing capacity, not a known cost λ), what is the Bayes-optimal classifier for arbitrary P_XY (no continuity assumptions), and can a plug-in rule achieve minimax-near-optimal excess risk while satisfying the rate constraint with high probability?

## 2. Dataset / schema
Theory + UCI benchmarks; the main-text experiment uses the PIMA (Pima Indians Diabetes) dataset, δ varied from 0.1 to 0.6, plotting rejection rate vs classification accuracy (Fig. 1); additional experiments in Appendix D.1. Implementations in CVXPY. No sample sizes stated in the extracted text beyond standard UCI PIMA (768×8).

## 3. Method / model
Bayes optimal (Theorem 1): partition by ambiguity |η(x)−1/2| with threshold γ_δ = sup{γ>0 : P_X(|η(X)−1/2|≤γ) ≤ δ} (Eq. 1) — predict ±1 outside, abstain inside; on the boundary shells ∂G where the cdf jumps, randomize with c_0=(δ−δ_1)/(δ_2−δ_1) (Eq. 2). Reduces to Chow 1957 / Denis & Hebiri 2015 when the cdf of |η−1/2| is continuous, but holds for arbitrary distributions. Plug-in classifier (§4): (i) estimate η with an adaptive histogram (partition [0,1]^D into ⌈1/h⌉^D cubes, cell means; Lepski-type data-driven bandwidth selection balancing stochastic error ∝(nh^D)^{−1/2} against Hölder bias ∝h^β, optimal h≈n^{−1/(2β+D)}); (ii) set the abstention threshold from m UNLABELED samples via the empirical cdf of |η̂−1/2| — semi-supervised, satisfies the δ constraint w.h.p. and handles cdf discontinuities. Excess-risk upper bound (Theorem 2) under Hölder (L,β) + margin assumptions; minimax lower bound (Theorem 3) — near-optimal. §5: tractable convex-surrogate algorithm for high dimensions (fixed-cost machinery reused), with excess-risk bounds in the realizable case. Experiments compare Algorithm 1 (plug-in, tight rate control) vs Algorithm 2 (convex surrogate baseline, searches a smaller set → conservative).

## 4. Equations & assumptions
- γ_δ = sup{γ>0 : P_X(|η(X)−1/2| ≤ γ) ≤ δ} (Eq. 1); randomized boundary rule with c_0 (Eq. 2).
- Histogram estimator η̂_h(x) = cell mean (or global mean if empty); error split |η−η̂| ≤ stochastic + bias (Eq. 3); e_S(h,x)=√(32 log(nμ_min)/(n μ_min h^D)), e_D = sup-cell variation of η.
- Assumptions: P_X has density bounded in [μ_min, μ_max] (A.4/A.5); η Hölder (L,β); margin (Tsybakov-type) assumption for rates. No continuity of the ambiguity cdf required.

## 5. Features / target
Features: input x ∈ [0,1]^D (generic); target: binary label Y. Abstention region = {x : |η(x)−1/2| < γ_δ}.

## 6. Validation design
PIMA dataset; sweep δ ∈ {0.1,…,0.6}; report achieved rejection rate vs accuracy for both algorithms. Goal stated as demonstrative (abstention helps; tight rate control), not SOTA-chasing. No train/test split details or significance tests in extracted text.

## 7. Numerical results / baselines
Figure 1 (PIMA, chart-read): accuracy rises monotonically with δ (more abstention → higher accuracy on decided points); Algorithm 1's achieved rejection rate tracks δ tightly, Algorithm 2 is conservative (achieves less than δ). No numeric table extracted. Theory: minimax-near-optimal rates (Theorems 2–3) — the paper's main contribution is the bound, not the empirical margin.

## 8. Code / data availability
None stated (CVXPY used for implementation). Data: UCI PIMA (public).

## 9. Leakage
N/A (benchmark demo). The threshold is set from unlabeled data — by construction no label leakage.

## Limitations
- Single small dataset in the main text; results are one curve, no tables, no significance tests.
- Histogram plug-in is a theoretical device — intractable in high dimensions (the authors' own motivation for §5).
- Bounded-rate assumes the δ budget is the right primitive; in betting the cost of a skip is economic, not a hard rate.
- No calibration discussion: the rule needs accurate |η̂−1/2|, i.e., calibrated probabilities.

## 10. GSE overlap
Complements 1003/1005 (which pick subsets to maximize metrics): this paper justifies the VOLUME DIAL itself — "publish at most δ of the slate" — with the Bayes-optimal threshold form and a semi-supervised way to hit the rate exactly using the upcoming slate's games as unlabeled data. Nothing in the repo implements rate-constrained abstention; gap #4 again. The randomization-at-the-boundary detail is a nice touch for tie-breaking when many games sit near the cutoff. Extension.

## 11. GSE implementation spec
**Board volume governor**: fix the weekly publish budget δ (e.g., δ=0.25 skip-rate → publish 75% of slate). Each week: (1) compute calibrated |p_cover − 0.5| (ambiguity) for all slate games using the engine (existing calibration stack); (2) set γ̂_δ as the δ-quantile of ambiguity over the slate itself (unlabeled — exactly the paper's semi-supervised step); (3) skip games with ambiguity < γ̂_δ (plus randomized tie-break at the boundary). No labels needed — deployable before kickoff. Tune δ on 2024 season by grid search on profit. Effort: <1 day.

## 12. Reproducible test
2024 season weekly slates: apply the governor at δ∈{0.1,0.2,0.3}; verify achieved skip rate ≈ δ (tight control check); metric: hit rate and profit of published set vs publish-all; time-ordered.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if at δ=0.2 the published set beats publish-all by ≥2.0 pp hit rate (Wilcoxon p<0.05 over 18 weeks) AND the achieved skip rate is within ±3 pp of δ every week (rate-control check); otherwise REJECT. The single decisive number: **hit-rate delta ≥ +2.0 pp at achieved skip rate δ±0.03**.

## 14. Improvement experiment
Replace the ambiguity threshold |p−1/2| with an edge-based threshold: skip games where |expected value| < γ̂_δ instead of where |p−1/2| < γ̂_δ — i.e., apply the paper's exact machinery (quantile of a score on unlabeled slate data) but with the score = calibrated edge rather than ambiguity. Theory says the form is optimal for error-rate; test whether the edge-score variant dominates on profit while keeping the tight rate control.
