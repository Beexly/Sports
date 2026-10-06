# [0527] Beyond Pairwise Feedback: Listwise Vision-Language Supervision for Preference-Based Reward Learning (arXiv:2608.25350v1)

**Citation:** Katkuri, S., Kawada, M., and Wachs, J. (2026). *Beyond Pairwise Feedback: Listwise Vision-Language Supervision for Preference-Based Reward Learning*. Submitted to IEEE. arXiv:2608.25350v1. URL: https://arxiv.org/abs/2608.25350v1
**Ledger completed:** 2026-09-21. **Read:** full text (2,866 lines; all sections including methods, experiments, ablations, significance tests, appendices read in full).
**Verdict:** REJECT — robotic manipulation (VLM-generated preference rankings for Sawyer-arm tasks); no sports-relevant claim, data, or transfer path.

## 1. Research question
Can vision-language models (VLMs) provide *listwise* preference rankings (K ∈ {3,4,5}) to train a Plackett-Luce reward model for reinforcement learning, replacing human pairwise feedback, and does preserving the joint ranking likelihood beat rank-broken pairwise (K-wise BT) or pairwise baselines on robotic manipulation tasks?

## 2. Dataset / schema
- Meta-World simulation benchmark (Sawyer robotic arm), 3 tasks: Drawer Open, Door Close, Button Press. Each configuration: 5 independent seeds (0–4), 100,000 environment steps (200 iterations × 500 steps; first 18 warm-up with PEBBLE-style entropy exploration), replay buffer of 100,000 images, VLM = GPT-5.6 Luna ranking K images per query. No sports data.

## 3. Method / model
- Framework: per iteration, uniformly sample M feedback groups of K observations from replay buffer → VLM returns full ranking by visual task progress → train reward model (PL joint likelihood or BT-Kwise rank-broken pairwise or BT-Pairwise or RL-VLM-F) → relabel buffer rewards → update Soft Actor-Critic policy. Methods: PL (K=3,4,5), BT-Kwise (K=3,4,5; rank-broken into C(K,2) implied pairs), BT-Pairwise (K=2), RL-VLM-F (two-stage VLM analysis + labeling, 2M=8 VLM requests). Budgets: primary M=4 groups/iteration (PL/BT-Kwise: 1 VLM request/group; BT-Pairwise: 1/pair; RL-VLM-F: 2/pair); equal-query-budget comparison (PL: 1 request/iteration, BT-Pairwise: 4, RL-VLM-F: 8); ablation over M.

## 4. Equations & assumptions
- Plackett-Luce likelihood (Eq. 3): P_ψ[σ^(1)≻…≻σ^(K)] = ∏_{k=1}^{K} exp(r̂_ψ(σ^(k))) / Σ_{j=k}^{K} exp(r̂_ψ(σ^(j))), with segment reward r̂_ψ(σ) = Σ_t r̂_ψ(s_t, a_t); training minimizes negative log-likelihood. Reduces exactly to BT for K=2.
- K-wise BT: same K-wise rankings decomposed into all C(K,2) implied pairwise comparisons, fit with BT loss.
- Oracle baseline: SAC trained on ground-truth environment rewards.
- Stated assumptions: uniform sampling of feedback groups (no active acquisition); VLM rankings reflect visual task progress; warm-up entropy exploration sufficient before preference collection; ranking group sizes K ≤ 5 (VLM joint visual reasoning degrades with longer rankings — the paper reports a tradeoff, not an assumption violation).

## 5. Features / target
- Targets: final success rate (%) on each Meta-World task (mean ± SEM across 5 seeds); secondary: reward-model ranking accuracy on held-out VLM labels.

## 6. Validation design
- Primary comparison at M=4 groups/iteration across all methods and K sizes; equal-VLM-query-budget protocol; ablation over M; statistical significance testing (§"Statistical Significance of Results"); per-seed success rates in appendix; 5 seeds per configuration.

## 7. Numerical results / baselines
- Final success rates (mean ± SEM, 5 seeds; Table II): best PL config K=4 achieves 86% mean final success rate (Drawer Open 86±3.7, Door Close 48±19.3, Button Press 41±18.4) and matches the Oracle baseline on Drawer Open. Either PL or BT-Kwise achieves the highest mean success rate among preference-based methods in 2 of 3 environments (Drawer Open: BT-Kwise K=5 89±7.1; Door Close: PL K=5 54±13.2; Button Press: BT-Kwise K=4 45±8.2). Per-environment, at least one PL ranking size K∈{3,4,5} performs in strong contention or best. Neither ranking size nor formulation gives a universal advantage; PL likelihood preserves a nominally significant improvement over BT-Kwise only for Button Press at K=5.

## 8. Code / data availability
None stated; uses public Meta-World benchmark and GPT-5.6 Luna.

## 9. Leakage & limitations
- Findings are confined to 3 simulated manipulation tasks with visually unambiguous progress markers; generalization to real-world robotics (stated future work) and to any other domain is untested.
- The "best configuration" selection is per-environment (no single K dominates) — the paper is explicit that no universal advantage exists, limiting prescriptiveness.
- VLM ranking quality depends on task-specific goal descriptions; longer rankings introduce VLM reasoning noise (the reported K tradeoff).
- Statistical significance claims are described as "nominal" by the authors.
- External validity to NFL: zero. The method learns *reward functions for robotic control policies from VLM image rankings*; it contains no prediction, rating, or calibration component applicable to team sports. Plackett-Luce as a ranking model is the only shared mathematical object with sports rating literature, and the paper's contribution is about VLM supervision efficiency in robotics, not about the ranking model itself.

## 10. GSE overlap
- None. Existing research map has no robotic-control, VLM-preference, or reward-model-learning entries; the nearest neighbor (BT/PL ranking models) is methodological context the paper explicitly does not advance (PL is a baseline vehicle, and its theory is cited, not developed). Rated REJECT — the Plackett-Luce equation (3) is already in the standard toolkit; the paper adds no sports-actionable insight around it.

## 11. GSE implementation spec
- Not recommended (REJECT). No build.

## 12. Reproducible test
- Not applicable. The claims are robotics claims (success rates on Meta-World tasks with GPT-5.6 Luna supervision); there is no NFL analogue to test. A faithful reproduction would require Meta-World + SAC + VLM query infrastructure and would answer nothing about sports prediction.

## 13. Acceptance / rejection gate
- REJECT stands. Would only reconsider if a future version targeted *human* preference aggregation over rankings (e.g., expert power rankings as listwise data for team ratings) — the current version's VLM-robotics setting provides no gate to satisfy.

## 14. Improvement experiment
- None sports-applicable. The paper's own directions: adaptive ranking sizes, active query selection (non-uniform group sampling), real-world robot evaluation.
