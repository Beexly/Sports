# [1908] Few-shot Learning with Meta Metric Learners (arXiv:1901.09890v1)

**Citation:** Cheng, Y., Yu, M., Guo, X., Zhou, B. (2019). *Few-shot Learning with Meta Metric Learners*. arXiv:1901.09890v1. URL: https://arxiv.org/abs/1901.09890v1
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

**Why:** task-level matching networks that *retrieve related historical tasks* from a pool before few-shot adaptation; this is a principled "which historical team-seasons should the new-regime model borrow from?" mechanism, and the two-stage task-retrieval procedure is directly portable to GSE.

## 1. Research question
Existing few-shot approaches fail in realistic multi-domain settings: meta-learners that predict weights of task-specific networks require a uniform number of classes across tasks (heterogeneous task-specific networks complicate weight prediction), while metric learners learn one task-invariant metric that fails when tasks diverge. Can a hybrid — an LSTM meta-learner that learns the *optimization algorithm* for a task-specific base learner, where the base learner is a Matching Network (non-parametric, handles flexible/unbalanced classes) — produce task-specific metrics that handle diverse domains with varying label counts?

## 2. Dataset / schema
- **Sentence Classification Service (SCS)**: real-world online service data; 12 clients as tasks; 10–28 classes per client; 50/20/30 meta-train/val/test split per client; auxiliary retrieval from a 175-task pool (top-10 related).
- **Omniglot**: 50 tasks (alphabets), 20 tasks used; 5:2:3 split; 10 examples per class evaluation.
- **Amazon Reviews**: 25 product categories as tasks; 4-class (1–5 star, 3-star removed); target task + 5 training tasks + 1 validation task; 5 sentences per class evaluation.
- CNN embeddings (Kim-style multi-filter conv for text on 100-dim GloVe; standard 4-block CNN for images); no code URL stated.

## 3. Method / model
**Meta Metric Learner.** Base learner M = Matching Network: prediction P(y|x̂,S) = Σ_i α(x̂,x_i;θ) y_i with attention **α(x̂,x_i,θ) = exp(f(x̂)·g(x_i))/Σ_j exp(f(x̂)·g(x_j))** (Eq. 1), trainable k-NN over support S — handles arbitrary class counts natively. Meta learner R = LSTM-based optimizer (Ravi & Larochelle style): LSTM cell state c_t = θ_t (learner params), candidate state c̃_{t+1} = −∇ℒ(θ_t), forget gate = 1, input gate = learning rate (Eqs. 3–4); update **c_t ← R((∇_{θ_{t−1}}ℒ_t, ℒ_t); Θ_{d−1})**, **θ_t ← c_t** (Algorithm 1). For 1-shot, the meta-test set can't supply gradients, so auxiliary set D_aux from *other tasks* feeds the base-learner update. **Auxiliary task retrieval (Sec. 3.2)**: (1) merge each task's data, train a matching network M^i per task; (2) for target task T^target, score each M^i by cross-accuracy acc_{i→target} on the target's combined data; (3) select top-s tasks as D_aux. Single-task setting: k×2-shot split per class (update vs evaluate halves), plus a 3-vs-5 class split where meta-train has *fewer* classes than meta-test (LSTM meta-learner can't even run there).

## 4. Equations & assumptions
- Matching-network classifier (Eq. 1); training objective (Eq. 2): E_{D∼T}[E_{B,S∼D}[Σ_{(x,y)∈B} log P(y|x,S;θ)]].
- LSTM-as-optimizer identification (Eqs. 3–4): θ_{t+1} = θ_t − α_{t+1}∇ℒ(θ_t) ≡ c_{t+1} = f_{t+1}⊙c_t + i_{t+1}⊙c̃_{t+1} with c_t=θ_t, c̃_{t+1}=−∇ℒ(θ_t), f_{t+1}=1, i_{t+1}=α_{t+1}.
Assumptions: (i) enough tasks exist to meta-train the LSTM (12 clients/20 alphabets sufficed); (ii) cross-accuracy of per-task matching networks is a valid relatedness proxy — authors note scores are "usually low but their relative magnitudes could reflect relatedness"; (iii) classification only; (iv) auxiliary tasks *can hurt* if unrelated ("when adding more significantly unrelated training resources, the performance may decrease") — retrieval quality matters.

## 5. Features / target
Features: text (sentence embeddings), image (Omniglot). Target: class labels, variable count. Horizon: classification.

## 6. Validation design
Multi-task: per-client/alphabet/domain meta-split, 1-shot and 5-shot, 5 samples/class eval (SCS), 10 examples/class (Omniglot), 5 sentences/class (Amazon). Single-task: 2/4-shot, 5-vs-3 and 3-vs-5 class splits, 10–15 runs. Baselines: Matching Network (basic + fully-conditional embedding), LSTM meta-learner (± additional data).

## 7. Numerical results / baselines
Numbers quoted exactly:
- **SCS multi-task, 1-shot**: Meta Metric-learner FCE **58.13%** vs Meta-learner LSTM 56.98%, Matching Network FCE (with additional data) 54.24%, basic 53.59%. **5-shot**: Meta Metric-learner FCE **74.54%** vs Meta-learner LSTM 72.54%, Matching FCE 70.28%. "Even with the help of additional sources, the performance of matching network is not better than meta-learner LSTM."
- **Omniglot, 1-shot**: Meta Metric-learner FCE 95.79% vs Matching FCE 95.84% (≈tie); **5-shot**: Meta Metric-learner FCE **98.83%** vs Matching FCE 98.65%, Meta-learner LSTM 97.22%.
- **Amazon Reviews, 1-shot**: Meta Metric-learner FCE **49.38%** vs Matching FCE 47.18% ("outperform the second-best around 2%"); **5-shot**: **60.82%** vs 54.64% ("improved matching network more than 5%"). "A little surprising that LSTM meta-learners can not work well on this dataset, with/without additional data."
- **Single-task SCS, 2-shot, 3-vs-5 split** (meta-train fewer classes than meta-test): Meta Metric-learner FCE 50.56% vs Matching FCE 48.74%; LSTM meta-learner **not applicable** ("—" in table). 5-vs-3 split: 61.27% vs 60.15% (LSTM), 59.57% (Matching FCE).
*My inference:* absolute accuracies are modest (58% 1-shot) — the value for GSE is not the numbers but the two portable mechanisms: task-specific metrics and relatedness-based auxiliary task retrieval.

## 8. Code / data availability
No code URL stated ("None stated"). Data: proprietary SCS, public Omniglot/Amazon Reviews.

## 9. Leakage & limitations
- Classification only; text/image embeddings — no tabular or regression results. GSE bridge requires porting to tabular game features and win/cover targets.
- LSTM meta-learner is a second-order-ish training burden; the meta-optimization is expensive relative to FLAT/ALPaCA's analytic updates.
- 1-shot multi-task still needs auxiliary tasks (meta-test alone can't supply gradients) — for a genuinely novel regime (rule-change season), there may BE no related task, and the paper admits unrelated auxiliary data *decreases* performance.
- Per-task matching networks trained on merged data may themselves be weak (low absolute acc); retrieval is only as good as the relative ranking.
- Two-stage (retrieve, then meta-train) rather than end-to-end — authors flag this as future work.

## 10. GSE overlap
No metric-learning or task-retrieval in Garrett's map. Related to ledger 1905 (Adaptive Deep Kernel Learning — task-conditioned kernel) and 1906 (FLAT dataset embeddings), but distinct: this is the only paper with an explicit *related-historical-task selection* procedure before few-shot adaptation. **New capability**: a "regime librarian" — given a 2–4-game sample from a new regime (rookie QB, new HC), retrieve the top-s most related historical team-seasons from the pool, then adapt a task-specific similarity metric for cover/win classification. Also complements ledger 1905: 1905's z^t embeds the regime; this paper's acc_{i→target} scores relatedness directly.

## 11. GSE implementation spec
1. Port: replace CNN embeddings with tabular game-feature encoder (tabular backbone like ledgers 1904/1906); Matching Network over support games for win/cover classification; LSTM meta-learner learns the adaptation optimizer for the task-specific metric.
2. Task pool: historical team-seasons 2015–2025 as tasks. Per-season matching network M^i on merged games; for a new regime target, compute acc_{i→target} on its K observed games; take top-s seasons as D_aux.
3. Sanity guard (from the paper's own warning): if max acc_{i→target} is below chance-level margin, fall back to league-average prior rather than borrowing from unrelated regimes.
4. Effort: ~2 engineering weeks (tabular port + retrieval pipeline); meta-learner training is the heavy part — start with a fixed optimizer ablation to justify the LSTM.

## 12. Reproducible test
nflverse 2015–2025; new-regime team-seasons as targets (rookie QB starts, new HCs). Protocol: K∈{2,4} support games → retrieve top-5 related historical team-seasons via acc_{i→target} → adapt task-specific metric → predict win/cover on remaining games. Baselines: (a) plain Matching Network without retrieval or meta-learner, (b) random-5-season auxiliary set (tests whether retrieval beats random), (c) XGBoost on support only. Metrics: accuracy/Brier, reported separately for regimes where retrieval found high-relatedness vs low-relatedness auxiliaries (the paper predicts gains concentrate in the former).

## 13. Acceptance / rejection gate
ADOPT iff the retrieval+meta-metric-learner beats plain Matching Network by **≥3pp accuracy** on new-regime win prediction at K∈{2,4} (2023–2025 test regimes), AND the random-auxiliary ablation shows no gain (proving retrieval, not just extra data, drives it). Reject if relatedness-ranked retrieval doesn't beat random — then the "regime librarian" is theater.

## 14. Improvement experiment
**End-to-end retrieval (paper's own future work) + regime embeddings**: replace the two-stage procedure with a learned retriever — train the task-level matching network jointly with the meta-metric-learner, using ledger 1905's DeepSets regime embedding z^t as the query instead of raw games. Rationale: unifies the two-stage pipeline and lets retrieval gradients flow into the meta-learner. Test: same protocol; success = ≥1pp over the two-stage version AND interpretable retrieval rankings (do the retrieved seasons look like the target regime to an analyst? — sanity-check the librarian isn't matching on noise). Classification-only paper; GSE bridge runs through win/cover classification. Absolute accuracies are modest — adopt for the *mechanism* (relatedness retrieval + task-specific metrics), not the numbers.
