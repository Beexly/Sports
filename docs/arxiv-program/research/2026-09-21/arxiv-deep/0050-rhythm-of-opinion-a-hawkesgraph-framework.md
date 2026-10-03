# [0050] Rhythm of Opinion: A Hawkes-Graph Framework for Dynamic Propagation Analysis (arXiv:2504.15072v1)

**Citation:** Yulong Li, Zhixiang Lu, Feilong Tang, Simin Lai, Ming Hu, Yuxuan Zhang, Haochen Xue, Zhaodong Wu, Imran Razzak, Qingxia Li, Jionglong Su (2025). *Rhythm of Opinion: A Hawkes-Graph Framework for Dynamic Propagation Analysis*. arXiv:2504.15072v1 [cs.SI]. URL: https://arxiv.org/abs/2504.15072v1. 21 Apr 2025.
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF v1) on 2026-09-21 (2,440 extracted lines; §§1–8 plus Appendix §9 gradient derivations). PDF math extraction is garbled in places (subscripts dropped, summation symbols lost); core equations reconstructed and cross-checked — see flags in §4.
**Verdict:** REJECT — a social-media opinion-propagation paper evaluated only against itself on Weibo comment data, with no sports-prediction content, no baselines, and no published code or data; nothing for GSE to adopt or adapt from the paper itself.

## 1. Research question
Can opinion propagation on social media be modeled by coupling a high-dimensional (multi-dimensional) Hawkes process (for temporal dynamics) with a GNN (for hierarchical comment structure and sentiment classification)? Each comment event e_i = (h_i, l_i, p_i, t_i) (topic, hierarchy level, parent, timestamp) is mapped to a dimension ω = (l, c) ∈ Ω = {levels} × {11 sentiment classes}, L = 3. Task: given comment history E_{≤T}, predict comment counts, sentiment mix, and comment-tree structure in (T, T+Δ].

## 2. Dataset / schema
- **VISTA (new dataset, introduced by the paper):** 159 Weibo trending topics (2024–early 2025), 47,207 posts, 327,015 second-level comments, 29,578 third-level comments (Table 1); max comment depth 3; 11 sentiment classes (Angry, Anxious, Sad, Frustrated, Consoling, Neutral, Calm, Optimistic, Happy, Excited, Elated); emotion annotation via GLM-4-plus with prompt-engineering on manually labeled seed comments; mean Cohen's κ = 0.85 on spot checks. Domains include politics, entertainment, sports, health, medicine — sports is one domain among several. Train/validation/test split: 127 / 16 / 16 topics.
- Access: no download URL is printed anywhere in the paper; code is only promised as "publicly available" (§8). Effectively unreplicable from the paper alone.

## 3. Method / model
- **High-dimensional Hawkes process:** intensity λ_ω(t) = μ_ω + Σ_{ω'∈Ω} Σ_{j: t_j^{ω'} < t} α_{ω,ω'} φ_{ω,ω'}(t − t_j^{ω'}) (Eq. 1), exponential decay kernel φ_{ω,ω'}(τ) = e^{−β_{ω,ω'}τ}·1{τ≥0}; μ_ω = baseline rate, α_{ω,ω'} = excitation strength, β_{ω,ω'} = decay. Estimated by maximum likelihood on the point-process log-likelihood L = Σ_{ω∈Ω} Σ_{i=1}^{Nω} ln λ_ω(t_i^ω) − Σ_{ω∈Ω} ∫_0^T λ_ω(t)dt (Eq. 2), trained with stochastic gradients; full gradient derivations for μ_ω, α_{ω,ω'}, β_{ω,ω'} in §5 and Appendix §9.2–9.4. Prediction: expected counts N̂_ω(T,T+Δ) = ∫_T^{T+Δ} λ_ω(t)dt (Eq. 10).
- **GNN component:** opinion-propagation graph G = (V, E) built from Hawkes-predicted comments; node features = Hawkes intensity λ_{(l,c)}(t) plus normalized sentiment distribution q_c(v) = λ_{(l,c)}(t)/Σ_{c'} λ_{(l,c')}(t) (Eq. 11). Message passing: h_v^{(t+1)} = σ(W_1 h_v^{(t)} + Σ_{u∈N(v)} W_2 e_{uv} h_u^{(t)}) (Eq. 12); edge features e_{uv} = (Δt, α_{ω,ω'}). Sentiment classification P(c|v) = softmax(W_c h_v^{(t+1)}) (Eq. 13). Losses: L_sentiment = −Σ_v Σ_c q_c(v)·ln P(c|v) (Eq. 14, cross-entropy); L_struct = Σ_{(u,v)∈E} |e_uv^{pred} − e_uv^{true}| (Eq. 15); L_total = λ_1 L_sentiment + λ_2 L_struct (Eq. 16). **FLAG:** λ_1, λ_2 hyperparameter values are not stated in the paper.

## 4. Equations & assumptions
- λ_ω(t) = μ_ω + Σ_{ω'∈Ω} Σ_{j: t_j^{ω'} < t} α_{ω,ω'} e^{−β_{ω,ω'}(t−t_j^{ω'})}·1{t ≥ t_j^{ω'}} (Eq. 1, exponential kernel).
- Log-likelihood (Eq. 2): L = Σ_{ω∈Ω} Σ_{i=1}^{N_ω} ln λ_ω(t_i^ω) − Σ_{ω∈Ω} ∫_0^T λ_ω(t) dt.
- **Stability condition** (Eq. 9): Σ_{ω'} α_{ω,ω'}/β_{ω,ω'} < 1 for every ω — otherwise exponential comment growth / loss of stationarity.
- Prediction (Eq. 10): N̂_ω(T,T+Δ) = ∫_T^{T+Δ} λ_ω(t) dt.
- GNN (Eqs. 11–16) as in §3 above.
- Assumptions (stated): comment events conditionally independent given history; exponential decay of excitation; environmental/task structure captured by the (level, sentiment) Cartesian dimensions; data collection noise-free.

## 5. Features / target
- **Hawkes inputs:** per-dimension event timestamps {t_j^ω}; parameters μ_ω, α_{ω,ω'}, β_{ω,ω'} estimated by MLE.
- **GNN inputs:** node features (Hawkes intensities λ_{(l,c)}(t) + normalized sentiment distribution q_c(v)); edge features (Δt, α_{ω,ω'}).
- **Targets:** (a) expected comment counts per (level, sentiment) dimension in (T, T+Δ]; (b) sentiment class per comment node (11 classes); (c) comment-tree structure (parent–child edges).

## 6. Validation design
- Split: 127 train / 16 validation / 16 test topics (by topic, not time-ordered within topic — stated as topic-level split).
- Metrics: Sentiment Prediction Accuracy (SA) = fraction of comment nodes with correct sentiment label; Structural Consistency Prediction Accuracy (SCA) = fraction of parent nodes whose predicted child set matches the true child set.
- **Baselines compared: none.** The paper explicitly positions its own model as "a robust baseline for future research." No ablation of Hawkes vs. GNN components anywhere in the paper. The only variation reported is training-data proportion (15% / 20% / 25%).

## 7. Numerical results / baselines
Quoted exactly as in the paper (Table 3):
- 15% data: SA val 19.75% / test 18.31%; SCA val 23.41% / test 21.22%.
- 20% data: SA val 24.12% / test 22.19%; SCA val 29.34% / test 26.98%.
- 25% data: SA val 29.31% / test 26.99%; SCA val 37.29% / test 35.76%.
- Results scale with data volume. No baseline numbers exist to compare against. Test sentiment accuracy ≈ 27% at best is weak evidence for the framework.

## 8. Code / data availability
None verifiable: no GitHub or download URL printed in the paper; code only promised as "publicly available" (§8 Limitations). VISTA dataset not downloadable from the paper.

## 9. Leakage & limitations
- Paper's own (§8): Weibo-only data (generalizability to other platforms/cultures unknown); events assumed independent though fan-community interactions induce correlations; data collection assumed noise-free; interpretable model may limit predictive performance; Weibo-specific sensitivity.
- Reviewer (adversarial): evaluation is self-referential (their model at three data fractions, zero baselines, zero ablations); no printed code/dataset URL despite the release promise; test SA ≈ 27% is weak; the sports angle is cosmetic (one dataset domain among several) — the task is comment-volume/sentiment forecasting on Chinese social media, not outcome prediction. External validity to NFL: none — no games, no players, no markets.

## 10. GSE overlap
No overlap — and the gap it superficially touches stays open. The existing-research map (read 2026-09-21) flags **Hawkes processes as a GSE gap**, but this paper is the wrong entry point: its data (Weibo comments), task (sentiment propagation), and evaluation (no baselines) transfer nothing. Plausible sports-relevant Hawkes applications remain unexplored by this paper: (a) in-game scoring-event cascades (self-exciting momentum models for live win probability), (b) betting line-movement cascades (bet arrivals exciting further bets / line moves), (c) injury/substitution cascades. A dedicated sports Hawkes paper (scoring-run or market-microstructure modeling) would be the ADAPT candidate — not this one. Classification: **not duplicate, not extension — irrelevant to the corpus.**

## 11. GSE implementation spec
Not recommended — rejected. There is no NFL data source mapping to the paper's task (no comment hierarchies, no sentiment labels in GSE's pipeline), and the VISTA/code release is unverifiable. Do not build.

## 12. Reproducible test
N/A (rejected). A fair test would require the VISTA dataset (unpublished) plus a baseline method (none compared). Gate closed.

## 13. Acceptance / rejection gate
Reject unconditionally: no sports-prediction content, self-referential evaluation with no baselines, no published code or data. Nothing in the paper clears any adoption bar.

## 14. Improvement experiment
None from this paper. If a Hawkes lane is opened later, the right seed is in-game event or line-movement data with the standard intensity form λ(t) = μ + Σ α·e^{−β(t−t_j)} and the stability condition Σ α/β < 1 (Eq. 9) — this paper's equations are usable as a machinery reference, but a sports-specific paper with calibrated parameters would be needed before implementation.
