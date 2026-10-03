# [0522] When Agents Slow Down: Understanding LLM Agents' Test-Time Strategies via Elo-per-token Analysis (arXiv:2609.15309v1)

**Citation:** Liu, K., Mang, Q., Peng, B., Chai, W., Li, H., Pimpalgaonkar, S., Zettlemoyer, L., Dimakis, A., and Cheung, A. (2026). *When Agents Slow Down: Understanding LLM Agents' Test-Time Strategies via Elo-per-token Analysis*. arXiv:2609.15309v1. URL: https://arxiv.org/abs/2609.15309v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~140,742 chars).
**Verdict:** ADAPT — the Bradley-Terry Elo-per-token framework (distribution-free 400-Elo-per-decade sampling reference + inflection-point allocation) ports to GSE as a cross-scale way to rate model versions/lineup builds against a sampling baseline and to allocate parallel Monte-Carlo/model-seed compute; the agent-scaling conclusions themselves are not sports-relevant.

## 1. Research question
How does LLM agent performance scale with test-time compute? The authors build Elo-per-token: track each system's best-so-far submission score at each token budget, rate (system, budget) checkpoints pairwise within tasks via a Bradley-Terry model, and aggregate across tasks with different score scales into Elo curves. This yields (a) a proven distribution-free reference — independent sampling gains exactly 400 Elo per decade of compute — against which to judge agents' marginal gains, (b) evidence that general agents start faster than sampling but eventually fall below it while expert humans scale superlinearly, and (c) a scaling inflection point that prescribes how to split a fixed token budget across parallel sessions.

## 2. Dataset / schema
- Four open-ended benchmarks, 14 tasks total (no LLM-as-judge; deterministic evaluators with continuous scores): FrontierCS (4 algorithm/CS problems), ALE-Bench (AHC031/038/040 rehosted heuristic contests), MLS-Bench (clustering design + neural-architecture search), FlashInfer-Bench (5 GPU kernels: GEMM, paged GQA/MLA attention, MoE, RMSNorm). Each task scored per submission; best-so-far trajectory recorded with cumulative tokens.
- Agents: Kimi Code (K2.7), Codex (GPT-5.5), Claude Code (Opus 4.8), Gemini CLI (Gemini 3.5 Flash); 5 independent sessions × (system, task) cell, up to 100M cache-inclusive tokens per task.
- Humans: complete submission histories of top-50 finishers from AtCoder Heuristic Contests (7 long contests pooled; AHC014/038/040/031 rejudged with local evaluator; score-validity filter: prefix-max scores must reproduce official top-50 standings ≥90% pairwise).
- Intervention arms: AdaEvolve + GEPA (5 runs × 4M uncached tokens on Polyomino Packing, Kimi K2.7), TTT-Discover test-time RL (gpt-oss-20b, 5 runs, 6.6M generated tokens), Qwen3.5 size sweep (27B, 35B-A3B, 122B-A10B, 397B-A17B).

## 3. Method / model
- Session → best-so-far trajectory S_τ(b) = max{score_i : tokens_i ≤ b} (Eq. 2). Checkpoint players p_{a,b} = (system a, budget b). Within each task, every pair of observations from distinct players forms a game with outcome y ∈ {1, ½, 0} (Eq. 3); cross-task aggregation by fitting Bradley-Terry: E[y_pq] = 1/(1 + 10^(−(r_p−r_q)/400)) (Eq. 4), one player anchored at 1000, MLE via minorization–maximization (Hunter 2004), λ=21 symmetric pseudo-games per pair. Joint-Elo keeps all pairs; self-Elo keeps only cross-session games of the same system (same-session games dropped as predetermined by prefix-max monotonicity). Session-level bootstrap (500 replicates) for 95% CIs.
- Inflection point: b_inf = sup{b : dr/d log10 b > 400}; allocation rule K = max(1, ⌊B/b_inf⌉) parallel sessions.
- Nested allocation experiment: 5 disjoint groups of 10 Kimi Code sessions on Polyomino Packing (budgets 100M/50M/33.3M/25M/20M/10M layers, paired comparison, 20,000 random session-to-group assignments averaged); MLS-Bench MoE replication with dedicated budget arms.

## 4. Equations & assumptions
- τ = {(s_i, b_i)}_i (Eq. 1); S_τ^(d)(b) = max s_i over (s_i,b_i) ∈ τ, b_i ≤ b (Eq. 2).
- Pairwise outcome y (Eq. 3) as above.
- E[y_pq] = 1/(1 + 10^(−(r_p − r_q)/400)) (Eq. 4).
- Theorem 3.1 (sampling reference): for i.i.d. continuous scores, population Elo(best-of-n) − Elo(best-of-m) = 400 log10(n/m) ⇒ s_ref = 400 Elo/decade (proof: Pr(M_n > M_m) = n/(n+m), matched to the Elo link, App. A.1).
- b_inf = sup{b : dr(b)/d log10 b > s_ref}, s_ref = 400 (Eq. 6).
- Theorem 6.1: if post-inflection slope < s_ref, frozen-state repeated sampling from the b_inf state asymptotically outgains continuing the session (App. A.2).
- Theorem 6.2: K sessions to b_inf, best-of-K ⇒ +400 log10 K Elo over one session (App. A.3).
- Theorem 7.1 (sticky-basin): basin means drawn i.i.d. from π, within-basin i.i.d. N(μ,σ²) draws; for fixed c>1, lim_{T→∞} Pr(M_{cT} > M_T) = 1/2 (best score within basin ~ μ + σ√(2 log T); basin choice dominates depth, App. A.4).
- Stated assumptions: i.i.d. continuous attempt scores (reference theorems); best-so-far monotonicity; equal token cost per attempt; cache-inclusive vs uncached counts asymptotically proportional (constant-bound window ⇒ pure horizontal shift on log axis); tasks' within-task games never cross tasks/contests; no anchor needed for gain comparisons on the common scale.

## 5. Features / target
- Features: per-session trajectory of (score, cumulative tokens) pairs on each task.
- Target: not a prediction target — the method estimates Elo rating as a function of budget r(b) for each system; the operational outputs are the self-Elo slope curve, the inflection point b_inf, and the depth-vs-breadth allocation K.

## 6. Validation design
- No train/test split (scaling-law measurement, not prediction); validation via (a) cross-benchmark replication (4 benchmarks, pooled all-domain fit), (b) controlled interventions (AdaEvolve, GEPA, TTT-Discover on one task), (c) independent replication task (MLS-Bench MoE Load Balancing), (d) human baselines on 4 AHC contests + pooled 7-contest self-Elo, (e) session-level bootstrap CIs on every curve. Allocation rule tested against the two extremes (K=1, K=10) at fixed 100M tokens in a paired nested design averaged over 20,000 assignments.

## 7. Numerical results / baselines
- Agents: all four systems improve with tokens 100K→100M on all benchmarks, but local self-Elo slopes exceed 400 Elo/decade only early; pooled, every system falls below 400 by the largest budgets (concave in log compute).
- Humans: top-10 and top-50 cohorts convex in log contest time across 7 pooled AHCs (superlinear); on AHC014 joint-Elo, both agents flatten within their 72h runs while top-10 humans overtake them over days.
- Interventions: AdaEvolve leads Kimi Code by >300 Elo near 100K tokens, all three within ~20 Elo at 1M+ (early gain, same diminishing shape); TTT-Discover brief superlinear then decays to reference; no strategy sustains superlinear self-Elo.
- Allocation (Polyomino Packing, Kimi K2.7): b_inf = 38M ⇒ predicted K=3 at 100M; 3 sessions gain +264 joint-Elo over 1×100M and +355 over 10×10M; session-bootstrap 90% intervals [+135, +412] vs 1 session, [+226, +618] vs 10; 3-way highest in 79% of replicates. MLS-Bench replication: b_inf = 58M; 1/2/3-session allocations statistically indistinguishable, two-session gain over ten sessions spans [−56, +326].
- Size sweep (Qwen3.5, Polyomino, 50M budget): 397B-A17B starts 525 Elo above dense-27B at 500K but gains least after (+278 vs +552 for 27B over two decades); best-raw scores cluster 0.67–0.71 regardless of size; best-per-trial spread falls 0.184 (27B) → 0.024 (397B).

## 8. Code / data availability
- Code: github.com/agent-tts/Agent-TTS-Code (per §1 header). AHC task statements and agent prompts reproduced in Appendix G. Benchmarks are public (FrontierCS, ALE-Bench, MLS-Bench, FlashInfer-Bench, AtCoder submissions crawled).

## 9. Leakage & limitations
- Benchmarks are coding/optimization tasks with deterministic automated judges — no stated connection to noisy real-world prediction; transfer to sports is analogical only.
- Human-agent comparison uses rehosted local evaluators (AHC014/031/038/040); rejudged objectives pass/fail their own validity filter (AHC031 fails pooled inclusion at 0.69) — the alignment is imperfect by the authors' own check.
- Cache-inclusive vs uncached accounting shifts curves horizontally; the authors argue shape invariance, but comparisons across harness classes (AdaEvolve 84% uncached vs agent 3–5% uncached) required axis switching, which they flag as confounded.
- Allocation CIs are wide (79% of replicates, intervals spanning hundreds of Elo) and the MLS replication is inconclusive — the rule is directionally right but noisy.
- Model-size sweep confounds serving stacks/providers; 256K context vs 100M-token budgets means most runs are dominated by cached re-reads.
- Qwen3.5/GPT-5.6/Opus 4.8/Kimi K2.7 are 2026 releases — recency risk, but the theorems (sampling reference, allocation) are math, not model-dependent.

## 10. GSE overlap
- Partial overlap, extension not duplicate. Existing research map: Bradley-Terry/Plackett-Luce/Elo are inventoried as team-rating families (benchmark drop, existing-research-map §1), and the repo has nfelo/Elo work. But no existing work uses Bradley-Terry to rate *model versions, checkpoints, or allocation strategies* against an independent-sampling reference with a budget-allocation rule. The transferable machinery is: (a) the 400-Elo-per-decade law as a compute-efficiency null for any randomized improvement loop (e.g., Monte Carlo lineup search, stochastic optimizer restarts), and (b) Elo-based model selection across tasks with incompatible score scales.

## 11. GSE implementation spec
- Build a "GSE model arena": rate engine model versions (or feature-set variants, optimizer seeds) pairwise across weekly-slate evaluation tasks using the paper's joint-Elo (within-week games, cross-week aggregation), anchoring production baseline at 1000. This solves the real GSE problem that ROI on a 13-game slate and log-loss on prop calibration live on different scales.
- Compute-allocation rule for expensive loops: measure the Elo-vs-compute slope of the Monte Carlo/optimizer pipeline; while slope > sampling reference (adapt to GSE: expected-improvement-per-restart), extend one run; once below, stop and restart (breadth). Implement as a stopping/restart policy in the DFS optimizer and backtest runner.
- Serving/ops design: a nightly script reruns the arena tournament on the week's slate results (nflverse + odds APIs already in the stack); ratings feed the model-approval gate. Effort: ~2–3 days (Bradley-Terry MM fit + bootstrap CIs + arena harness).

## 12. Reproducible test
- Dataset: GSE's existing optimizer/Monte-Carlo artifacts (weekly DFS lineups or model backtest runs with fixed compute logs) — or, lacking compute logs, nflverse 2023–2024 weekly slates: run K ∈ {1, 5, 20} independent stochastic lineup-search restarts with equal total simulations, take best-of-K per week, and pairwise-rate (best-of-1, best-of-5, best-of-20) within weeks via Eq. 4, anchoring best-of-1 at 1000.
- Metric: fitted rating gap best-of-20 vs best-of-1 (expect ≈ 400·log10(20) ≈ 520 Elo under the sampling law) vs the same gap achieved by a single 20×-longer search.
- Baseline: the paper's sampling reference (400/decade) as the null.

## 13. Acceptance / rejection gate
- ADAPT-accept if the GSE arena yields stable cross-week model rankings (bootstrap 95% CI width < 150 Elo on version gaps) AND the sampling-reference check matches within ±20% on the restart experiment; then adopt the restart-allocation rule into the optimizer. REJECT for GSE use if pairwise model ratings are unstable across weeks (CIs spanning >300 Elo) — the arena adds noise, not signal.

## 14. Improvement experiment
- Sticky-basin test for the GSE optimizer: label each search trajectory's "basin" (e.g., stack archetype / core group) and measure whether late-compute improvements are within-basin vs basin-switching; if the paper's Theorem 7.1 holds for DFS search, the winning change is forced basin diversification (structured multi-start with basin coverage constraints) rather than longer single searches — directly testable by comparing basin-constrained best-of-K against vanilla best-of-K on one season of slates.
