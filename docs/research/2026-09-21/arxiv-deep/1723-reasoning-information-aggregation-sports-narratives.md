# 1723 When reasoning meets information aggregation: a case study with sports narratives (arXiv:2406.12084v2)

**Citation:** Yebowen Hu, Kaiqiang Song, Sangwoo Cho, Xiaoyang Wang, Wenlin Yao, Hassan Foroosh, Dong Yu, Fei Liu (2026). *When Reasoning Meets Information Aggregation: A Case Study with Sports Narratives*. UCF / Tencent AI Lab / Emory. arXiv:2406.12084v2. URL: https://arxiv.org/abs/2406.12084v2
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, 16 pages, all sections, tables 1–4, figures, appendices).
**Verdict:** ADAPT — the divide-and-conquer batch-10 aggregation protocol and the Discounted Cumulative Accuracy tolerance metric are directly reusable for evaluating GSE's narrative stat-extraction, and SportsGen's controllable synthetic-stress framework is the right way to audit hallucination; but even GPT-4o fails exact aggregation on real narratives, so adapt the evaluation methodology, never the expectation that LLMs can do this unaided.

## 1. Research question

Is LLM "reasoning" over longitudinal sports data actually information aggregation done right? The paper tests whether LLMs can compute team scores from NBA play-by-play narratives — a task requiring inferring points from actions, attributing them to the right team, and summing over hundreds of events. It asks how performance varies with narrative complexity (scoring density), information density, batching strategy, and symbolic vs natural presentation — and introduces SportsGen, a controllable synthetic narrative generator, to stress-test reasoning beyond what real data covers.

## 2. Dataset / schema

- Real data: 28,492 NBA games (2002–2023) from ESPN play-by-play; subsampled to D_H = 400 human-written narrative quarters for evaluation.
- SportsGen synthetic data: D_S = 480 generated quarters per setting; turn-by-turn Markov action graph over 16 actions (make, miss, block, …); team efficiency scores E ∈ [0,100] (points per 100 possessions, from ESPN); action templates expanded by GPT-4o for lexical diversity; timestamps sampled from per-action Gaussians fit to real data; scoring-to-non-scoring ratios S:NS ∈ {1:2, 1:3, 1:4, 1:5}; average game 466 plays / 6,229 tokens.
- Models: GPT-4o, GPT-3.5-Turbo, Claude-3-Opus/Sonnet/Haiku, Gemini-Pro-1.5, Llama-3-8B/70B-Instruct.

## 3. Method / model

- Task: given a narrative quarter, output each team's total points.
- Strategies: monolithic (whole narrative at once) vs divide-and-conquer — split into batches of 1, 3, 10, 30 plays (DnC-{1,3,10,30}) or by player (DnC-P), aggregate partial sums.
- Metric: Discounted Cumulative Accuracy, DCA = Σ_{t=0}^{T} p_t(1 − t/T), with p_t = (1/N)Σ_n 1{|s_n − s*_n| = t} — exact accuracy at T=0, forgiving near-misses with linear discount as tolerance T grows (inspired by DCG from IR).
- SportsGen ablations: varying S:NS ratios, action counts per turn, and four symbolicness levels (Original → Scrambled teams → Fictional FIFA names → Symbolic "Player 1, 2, 3…").

## 4. Equations & assumptions

- DCA as above; tolerance levels tested T ∈ {0, 1, 3, 5, 10}. Rankings are stable across T (relative order preserved; gaps narrow).
- SportsGen sampling: per-turn scoring sampled as Bernoulli from team efficiency; action paths sampled from the Markov graph conditioned on length/scoring criteria; templates uniform per action.
- Assumptions: play-by-play text contains all scoring information (no missing events); team attribution is unambiguous in the text; synthetic narratives' Markov dynamics approximate real game flow well enough to stress reasoning rather than test realism (human/GPT-4 preference: SportsGen preferred 39%, tie 7–9%, NBA narratives 52–54% — close but not identical).

## 5. Features / target

- Input: narrative quarter (human or synthetic), optionally batched.
- Target: (team A points, team B points).
- Analysis dimensions: batch size, S:NS ratio, narrative length, symbolicness level, model.

## 6. Validation design

- Table 2: accuracy and DCA across models × strategies on human narratives (the headline comparison).
- Table 3: tolerance sweep T ∈ {0,…,10} — checks metric robustness.
- Table 4: human vs SportsGen vs few-shot-prompted synthetic narratives — validates SportsGen realism.
- Figures 3–4: DCA vs scoring density and vs symbolicness level.

## 7. Numerical results / baselines

- Monolithic: Claude-3-Opus 67.20% accuracy / 93.56 DCA (T=10) — best; GPT-4o 45.54% / 86.70; Llama-3-70B 17.45% / 74.18; Llama-3-8B 4.43% / 41.50 (severe score hallucination); Gemini-Pro-1.5 4.58% / 18.56 (weakest analytical reasoning).
- Divide-and-conquer: GPT-4o peaks at DnC-10 — 88.61% accuracy / 98.41 DCA; Claude-3-Opus DnC-10 84.16% / 98.28; Llama-3-70B DnC-3 80.45% / 96.12. Batch-10 is optimal for strong models; weaker models prefer batch-3; batch-1 underperforms everywhere (system messages drown single plays).
- Scoring density: denser scoring (higher S:NS) degrades all models — frequent scoring is the hard case.
- Symbolic substitution degrades performance (GPT-4o, Llama-3-70B decline); Claude-3-Opus most resilient — models lean on natural-language context, not pure symbolic manipulation.
- DCA tolerance sweep preserves model rankings; near-miss tolerance mostly helps weak models look less bad.

## 8. Code / data availability

- SportsGen described in full detail (graph, templates, sampling); the ledger found no repository link in the text. The 28,492-game ESPN corpus is public in principle; the subsampled eval sets and generation code are not released.

## 9. Leakage & limitations

- Basketball-only: frequent-scoring dynamics may not generalize to low-scoring sports (soccer) or set-piece sports (football) — acknowledged.
- Synthetic narratives, while preference-competitive (39% vs 52%), still differ from real commentary; stress-test findings may not transfer quantitatively.
- The task (sum the points) is the easiest possible aggregation — real GSE aggregation (attribute EPA, assign coverage responsibility) is strictly harder, so these accuracies are an upper bound on LLM aggregation ability.
- No cost analysis of DnC-10 (10× the calls of monolithic); the accuracy gain has a price the paper does not quote.

## 10. GSE overlap

- GSE's narrative-extraction evals need exactly this: a tolerance-aware metric (DCA) for numeric aggregation tasks and a batching protocol (DnC-10) that the paper shows nearly doubles GPT-4o's accuracy (45.54% → 88.61%).
- SportsGen's controllable-stress methodology is the template for GSE's hallucination auditing: generate adversarial narratives (dense scoring, scrambled entities) and measure where extraction breaks.
- Pairs with ledger 1722 (SporTabSet): 1722 gives the tuple-extraction recipe, 1723 gives the evaluation metric + batching + stress-testing. Together they are GSE's narrative-to-numbers playbook.
- Dedup clean against the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/nlp/eval/aggregation_eval.py`: (1) implement DCA with T configurable (default T=3 for point totals, T=0.5 for EPA-style continuous metrics via binning) as a standard metric on all numeric-extraction evals; (2) implement DnC batching (batch=10 plays) as the default inference strategy for any narrative-aggregation task, with monolithic as the ablation baseline; (3) build SportsGen-NFL: a controllable synthetic play-by-play generator (drive-level Markov graph over run/pass/penalty/turnover/score actions, team efficiency priors) for stress-testing GSE's extractors on dense-scoring, no-huddle, and penalty-heavy scenarios.
- Gate: no numeric-extraction model ships unless DnC-10 DCA(T=3) ≥ 0.90 on both real and synthetic eval sets.

## 12. Reproducible test

- Replicate Table 2's core comparison on NFL play-by-play: 200 real game-quarters, task = team points per quarter, models = GSE's current LLM stack; compare monolithic vs DnC-{3,10,30} with DCA; success criteria: DnC-10 beats monolithic by ≥ 10 pp accuracy for the primary model (replicating the paper's qualitative finding in a new sport), and DCA rankings match exact-accuracy rankings (metric sanity check).

## 13. Acceptance / rejection gate

ADAPT the methodology (DCA metric, DnC-10 batching, SportsGen-style stress testing), not the paper's model rankings or absolute numbers — those are NBA- and model-specific. ADAPT proceeds if the NFL replication shows the same qualitative pattern (batching helps, dense scoring hurts, symbolic substitution hurts); REJECT monolithic inference for any GSE aggregation task if DnC-10 wins on the replication (the paper's 45.54% → 88.61% gap is too large to ignore); REJECT DCA as a primary metric if the tolerance sweep changes model rankings on GSE data (the paper's ranking-stability claim must be re-verified, not assumed).

## 14. Improvement experiment

Extend the paper where it stops. (1) Attribution, not just summation: the paper's task is total points — run the harder GSE task (per-player stat attribution: who scored, who assisted) under the same DnC/DCA protocol and quantify the accuracy drop from team-level to player-level aggregation; this measures the attribution gap the paper never touches. (2) Cost-aware batching: the paper ignores the 10× call cost of DnC-10 — measure accuracy-per-dollar across batch sizes and find the Pareto frontier; if DnC-3 gets 90% of the gain at 30% of the cost, that is the production choice and a result the paper leaves on the table. (3) Adversarial SportsGen-NFL: generate the scenarios real data under-samples (scoring on every drive, 15-penalty quarters, overtime) and report where each model breaks — a robustness profile no static benchmark provides, and the direct input to GSE's extractor acceptance gates.
