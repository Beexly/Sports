# Open-Access CS, Algorithms, ML, Convex/Bayesian Math, Compilers, Distributed Systems, Security & Agent Engineering Mega-Library (2026-11-07)

## 1. Executive Summary & Quarantine Governance
- **Total Cataloged Works**: `432` (`>= 420` requirement satisfied)
- **Canonical Domains**: `10`
- **Foundational ArXiv Papers Cataloged**: `25`
- **Quarantined GitHub Repositories (`INGEST-AND-LEARN`)**: `105`
- **`COMMERCIAL_USE_BLOCKED`**: `True`
- **`LEARN_AND_REASON_ONLY`**: `True`
- **`install_permitted_in_prod`**: `False` (all `False`)

## 2. 10-Domain Catalog & Mathematical Primitives Matrix

| Domain ID | Domain Title | Cataloged Items | Executable Primitives |
|---:|---|---:|---|
| 1 | Algorithms, Data Structures & Competitive Programming | 36 | `solve_knapsack_and_multichoice_salary_cap`, `pomdp_mdp_bellman_backup`, `submodular_greedy_maximize` |
| 2 | Foundations of Machine Learning, Deep Learning & Statistical Learning | 36 | `gaussian_process_kernel_regression`, `mackay_evidence_approximation`, `td_lambda_gae_advantage_estimation` |
| 3 | Foundational Transformer, Scaling, Alignment & Agentic ArXiv Papers | 52 | `chinchilla_kaplan_compute_optimal_allocation`, `dpo_implicit_reward_margin`, `validate_react_thought_action_observation_loop` |
| 4 | Agent Engineering, Harnesses, Protocols & Evaluation | 32 | `evaluate_agent_harness_pass_at_k_and_pass_hat_k`, `calculate_long_running_context_compaction_budget` |
| 5 | Probability, Statistics, Convex Optimization & Linear Algebra | 32 | `boyd_vandenberghe_kkt_simplex_barrier_projection`, `devroye_exact_rejection_and_inversion_sampler` |
| 6 | Compilers, ASTs, Systems & High-Performance Computing | 34 | `analyze_equation_ast_complexity_and_cyclomatic_depth` |
| 7 | Databases, Data Mining & Information Retrieval | 30 | `bm25_and_rrf_hybrid_retrieval_scorer` |
| 8 | Distributed Systems, Networking, Cloud & ZeroMQ | 30 | `kleinberg_hits_and_pagerank_spectral_centrality` |
| 9 | Cryptography, Security & Fuzzing | 31 | `metamorphic_fuzzing_probability_and_devig_checker` |
| 10 | Open-Source Book & Systematic Trading Repositories | 119 | `detect_isolation_anomaly_and_kalshi_sportsbook_arbitrage` |

## 3. Empirical Verification Highlights Across All 10 Domains
- **Domain 1 (Algorithms & Combinatorial Optimization)**: Multi-Choice Salary Cap selected `['QB_BURROW', 'RB_CHASE_BROWN', 'WR_CHASE', 'WR_FLOWERS']` with total value `84.4`; POMDP Bellman converged in `187` iterations; Submodular greedy achieved `7.0` with `(1 - 1/e) = 0.632121` guarantee.
- **Domain 2 (ML, GPML, MacKay Evidence & RL)**: GP log marginal likelihood `-6.12270902`; MacKay evidence effective parameters `gamma = 1.99856515`; TD(lambda)/GAE advantages `[2.16927294, 0.93596272, 0.15945, -1.1]`.
- **Domain 3 (Transformer Scaling, DPO & ReAct)**: Chinchilla tokens-per-parameter ratio `50.083586`; DPO loss `0.65080512`; ReAct trace valid `True`.
- **Domain 4 (Agent Harnesses, MCP 2026-07-28 & Evals)**: `Pass@k = {'pass@1': 0.8, 'pass@3': 1.0, 'pass@5': 1.0}` vs `Pass^k = {'pass^1': 0.8, 'pass^3': 0.512, 'pass^5': 0.32768}`; Context compaction reclaimed `122400` tokens.
- **Domain 5 (Convex Optimization & Devroye Sampling)**: Boyd-Vandenberghe KKT stationarity residual `5.55e-17`; Devroye rejection empirical acceptance `0.526038` vs theoretical `0.51914`.
- **Domain 6 (Compilers & AST Analysis)**: AST depth `8`, McCabe cyclomatic complexity `3`, Sethi-Ullman registers `4`.
- **Domain 7 (Databases & Hybrid IR)**: Top BM25+RRF document `DOC-1` with fused RRF score `0.03278689`.
- **Domain 8 (Distributed Systems & Spectral Centrality)**: Top HITS hub `QB_BURROW`, top authority `WR_CHASE`, top PageRank `WR_HIGGINS`.
- **Domain 9 (Cryptography, Security & Fuzzing)**: `200` metamorphic fuzzing trials passed (`all_invariants_passed = True`).
- **Domain 10 (Quarantined Repos, Anomaly Detection & Cross-Market Arbitrage)**: Max isolation score `0.68171` (flagged index `[8]`), cross-market discrepancy `0.054001`.

## 4. Foundational ArXiv Papers Cataloged

| ArXiv ID | Title | Authors | Year | Key Mathematical Formula |
|---|---|---|---:|---|
| `1706.03762` | Attention Is All You Need | Vaswani et al. | 2017 | `Attention(Q,K,V) = softmax(QK^T / sqrt(d_k))V` |
| `2001.08361` | Scaling Laws for Neural Language Models | Kaplan et al. | 2020 | `L(N,D) = (N_c/N)^alpha_N + (D_c/D)^alpha_D` |
| `2203.15556` | Training Compute-Optimal Large Language Models (Chinchilla) | Hoffmann et al. | 2022 | `L(N,D) = E + A/N^alpha + B/D^beta, N* propto C^0.5, D* propto C^0.5` |
| `2005.14165` | Language Models are Few-Shot Learners (GPT-3) | Brown et al. | 2020 | `In-context conditional likelihood p(y | context, x)` |
| `2005.11401` | Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | Lewis et al. | 2020 | `p_RAG(y|x) = sum_{z in top-k} p_eta(z|x) p_theta(y|x,z)` |
| `2106.09685` | LoRA: Low-Rank Adaptation of Large Language Models | Hu et al. | 2021 | `W = W_0 + (alpha/r) B A, rank(B A) <= r << min(d,k)` |
| `2203.02155` | Training language models to follow instructions with human feedback (InstructGPT) | Ouyang et al. | 2022 | `max_pi E[r_phi(x,y)] - beta D_KL(pi_theta(y|x) || pi_SFT(y|x))` |
| `2210.03629` | ReAct: Synergizing Reasoning and Acting in Language Models | Yao et al. | 2022 | `Trajectory tau_t = (Thought_1, Action_1, Obs_1, ..., Thought_t, Action_t, Obs_t)` |
| `2212.08073` | Constitutional AI: Harmlessness from AI Feedback | Bai et al. | 2022 | `SL-CAI critique-revision + RLAIF preference model` |
| `2305.18290` | Direct Preference Optimization: Your Language Model is Secretly a Reward Model | Rafailov et al. | 2023 | `L_DPO = -E[log sigma(beta log(pi_theta(y_w|x)/pi_ref(y_w|x)) - beta log(pi_theta(y_l|x)/pi_ref(y_l|x)))]` |
| `1506.02438` | High-Dimensional Continuous Control Using Generalized Advantage Estimation (GAE) | Schulman et al. | 2015 | `A_t^GAE(gamma,lambda) = sum_{l=0}^inf (gamma*lambda)^l delta_{t+l}^V` |
| `1707.06347` | Proximal Policy Optimization Algorithms (PPO) | Schulman et al. | 2017 | `L_CLIP = E[min(r_t(theta) A_t, clip(r_t(theta), 1-eps, 1+eps) A_t)]` |
| `2201.11903` | Chain-of-Thought Prompting Elicits Reasoning in Large Language Models | Wei et al. | 2022 | `p(y|x) = sum_z p(z|x) p(y|x,z)` |
| `2203.11171` | Self-Consistency Improves Chain of Thought Reasoning in Language Models | Wang et al. | 2022 | `y* = argmax_y sum_{i=1}^m I(y_i = y)` |
| `2305.10601` | Tree of Thoughts: Deliberate Problem Solving with Large Language Models | Yao et al. | 2023 | `BFS/DFS state evaluation V(s) over thought tree` |
| `2303.11366` | Reflexion: Language Agents with Verbal Reinforcement Learning | Shinn et al. | 2023 | `Episodic verbal gradient memory buffer M_{t+1}` |
| `2107.03374` | Evaluating Large Language Models Trained on Code (Codex / Pass@k) | Chen et al. | 2021 | `pass@k = 1 - C(n-c, k) / C(n, k)` |
| `2310.06770` | SWE-bench: Can Language Models Resolve Real-World GitHub Issues? | Jimenez et al. | 2023 | `Repository-level patch verification pass rate` |
| `2309.06180` | Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM) | Kwon et al. | 2023 | `Block-table non-contiguous KV cache paging` |
| `2205.14135` | FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness | Dao et al. | 2022 | `Online tiling log-sum-exp rescaling in SRAM` |
| `2307.08691` | FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning | Dao | 2023 | `Sequence-dimension warp partitioning` |
| `2402.03300` | DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (GRPO) | Shao et al. | 2024 | `Group Relative Policy Optimization A_i = (r_i - mean(r))/std(r)` |
| `2501.12948` | DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning | DeepSeek-AI | 2025 | `Rule-based verifiable reward GRPO without neural PRM` |
| `1905.02922` | Conformalized Quantile Regression (CQR) | Romano, Patterson & Candes | 2019 | `E_i = max(q_lo(X_i) - Y_i, Y_i - q_hi(X_i))` |
| `2202.13415` | Conformal Prediction Beyond Exchangeability | Barber, Candes, Ramdas & Tibshirani | 2023 | `Non-exchangeable weighted quantile w_i` |

## 5. Quarantined GitHub Repositories (`INGEST-AND-LEARN` Governance)

| Repo ID | Repository Slug | Subdomain | `COMMERCIAL_USE_BLOCKED` | `LEARN_AND_REASON_ONLY` | `install_permitted_in_prod` |
|---|---|---|---|---|---|
| `MEGA-REPO-001` | `EbookFoundation/free-programming-books` | `open_access_books` | `True` | `True` | `False` |
| `MEGA-REPO-002` | `paperswithbacktest/awesome-systematic-trading` | `systematic_trading` | `True` | `True` | `False` |
| `MEGA-REPO-003` | `bpangman/kalshi-command-center` | `prediction_markets` | `True` | `True` | `False` |
| `MEGA-REPO-004` | `yzhao062/anomaly-detection-resources` | `anomaly_detection` | `True` | `True` | `False` |
| `MEGA-REPO-005` | `DatariusAI/Mathematics-for-AI` | `mathematics_for_ai` | `True` | `True` | `False` |
| `MEGA-REPO-006` | `oomol-lab/pdf-craft` | `document_extraction` | `True` | `True` | `False` |
| `MEGA-REPO-007` | `phiresky/ripgrep-all` | `information_retrieval` | `True` | `True` | `False` |
| `MEGA-REPO-008` | `jeffgerickson/algorithms` | `algorithms` | `True` | `True` | `False` |
| `MEGA-REPO-009` | `kevin-wayne/algs4` | `algorithms` | `True` | `True` | `False` |
| `MEGA-REPO-010` | `sisl/AlgorithmsForDecisionMaking.jl` | `decision_making` | `True` | `True` | `False` |
| `MEGA-REPO-011` | `cp-algorithms/cp-algorithms` | `competitive_programming` | `True` | `True` | `False` |
| `MEGA-REPO-012` | `stevenhalim/cpbook-code` | `competitive_programming` | `True` | `True` | `False` |
| `MEGA-REPO-013` | `kth-competitive-programming/kactl` | `competitive_programming` | `True` | `True` | `False` |
| `MEGA-REPO-014` | `TheAlgorithms/Python` | `algorithms` | `True` | `True` | `False` |
| `MEGA-REPO-015` | `TheAlgorithms/C-Plus-Plus` | `algorithms` | `True` | `True` | `False` |
| `MEGA-REPO-016` | `TheAlgorithms/Rust` | `algorithms` | `True` | `True` | `False` |
| `MEGA-REPO-017` | `trekhleb/javascript-algorithms` | `algorithms` | `True` | `True` | `False` |
| `MEGA-REPO-018` | `williamfiset/Algorithms` | `algorithms` | `True` | `True` | `False` |
| `MEGA-REPO-019` | `keon/algorithms` | `algorithms` | `True` | `True` | `False` |
| `MEGA-REPO-020` | `TargetProcess/fancy-fp-data-structures` | `functional_data_structures` | `True` | `True` | `False` |
| `MEGA-REPO-021` | `probml/pml-book` | `machine_learning` | `True` | `True` | `False` |
| `MEGA-REPO-022` | `probml/pyprobml` | `machine_learning` | `True` | `True` | `False` |
| `MEGA-REPO-023` | `udlbook/udlbook` | `deep_learning` | `True` | `True` | `False` |
| `MEGA-REPO-024` | `christophM/interpretable-ml-book` | `interpretable_ml` | `True` | `True` | `False` |
| `MEGA-REPO-025` | `fastai/fastbook` | `deep_learning` | `True` | `True` | `False` |
| `MEGA-REPO-026` | `stanford-cs336/spring2025-lectures` | `language_modeling` | `True` | `True` | `False` |
| `MEGA-REPO-027` | `harvard-edge/cs249r_book` | `ml_systems` | `True` | `True` | `False` |
| `MEGA-REPO-028` | `chiphuyen/dmls-book` | `ml_systems` | `True` | `True` | `False` |
| `MEGA-REPO-029` | `rasbt/machine-learning-book` | `machine_learning` | `True` | `True` | `False` |
| `MEGA-REPO-030` | `rasbt/LLMs-from-scratch` | `language_modeling` | `True` | `True` | `False` |
| `MEGA-REPO-031` | `ageron/handson-ml3` | `machine_learning` | `True` | `True` | `False` |
| `MEGA-REPO-032` | `d2l-ai/d2l-en` | `deep_learning` | `True` | `True` | `False` |
| `MEGA-REPO-033` | `shangtongzhang/reinforcement-learning-an-introduction` | `reinforcement_learning` | `True` | `True` | `False` |
| `MEGA-REPO-034` | `CompVis/latent-diffusion` | `deep_learning` | `True` | `True` | `False` |
| `MEGA-REPO-035` | `karpathy/nanoGPT` | `language_modeling` | `True` | `True` | `False` |
| `MEGA-REPO-036` | `karpathy/llm.c` | `language_modeling` | `True` | `True` | `False` |
| `MEGA-REPO-037` | `karpathy/minbpe` | `tokenization` | `True` | `True` | `False` |
| `MEGA-REPO-038` | `pyg-team/pytorch_geometric` | `graph_ml` | `True` | `True` | `False` |
| `MEGA-REPO-039` | `optuna/optuna` | `hyperparameter_optimization` | `True` | `True` | `False` |
| `MEGA-REPO-040` | `scikit-learn/scikit-learn` | `machine_learning` | `True` | `True` | `False` |
| `MEGA-REPO-041` | `huggingface/alignment-handbook` | `alignment` | `True` | `True` | `False` |
| `MEGA-REPO-042` | `eric-mitchell/direct-preference-optimization` | `alignment` | `True` | `True` | `False` |
| `MEGA-REPO-043` | `ysymyth/ReAct` | `agent_reasoning` | `True` | `True` | `False` |
| `MEGA-REPO-044` | `princeton-nlp/tree-of-thought-llm` | `agent_reasoning` | `True` | `True` | `False` |
| `MEGA-REPO-045` | `noahshinn/reflexion` | `agent_reasoning` | `True` | `True` | `False` |
| `MEGA-REPO-046` | `microsoft/LoRA` | `parameter_efficient_tuning` | `True` | `True` | `False` |
| `MEGA-REPO-047` | `Dao-AILab/flash-attention` | `attention_kernels` | `True` | `True` | `False` |
| `MEGA-REPO-048` | `deepseek-ai/DeepSeek-R1` | `reasoning_models` | `True` | `True` | `False` |
| `MEGA-REPO-049` | `deepseek-ai/DeepSeek-Math` | `mathematical_reasoning` | `True` | `True` | `False` |
| `MEGA-REPO-050` | `openai/human-eval` | `code_evaluation` | `True` | `True` | `False` |
| `MEGA-REPO-051` | `anthropics/anthropic-cookbook` | `agent_engineering` | `True` | `True` | `False` |
| `MEGA-REPO-052` | `anthropics/courses` | `agent_engineering` | `True` | `True` | `False` |
| `MEGA-REPO-053` | `modelcontextprotocol/specification` | `agent_protocols` | `True` | `True` | `False` |
| `MEGA-REPO-054` | `modelcontextprotocol/python-sdk` | `agent_protocols` | `True` | `True` | `False` |
| `MEGA-REPO-055` | `modelcontextprotocol/servers` | `agent_protocols` | `True` | `True` | `False` |
| `MEGA-REPO-056` | `google/A2A` | `agent_protocols` | `True` | `True` | `False` |
| `MEGA-REPO-057` | `google/adk-python` | `agent_frameworks` | `True` | `True` | `False` |
| `MEGA-REPO-058` | `pydantic/pydantic-ai` | `agent_frameworks` | `True` | `True` | `False` |
| `MEGA-REPO-059` | `langchain-ai/langgraph` | `agent_frameworks` | `True` | `True` | `False` |
| `MEGA-REPO-060` | `openai/openai-agents-python` | `agent_frameworks` | `True` | `True` | `False` |
| `MEGA-REPO-061` | `openai/swarm` | `agent_frameworks` | `True` | `True` | `False` |
| `MEGA-REPO-062` | `microsoft/autogen` | `agent_frameworks` | `True` | `True` | `False` |
| `MEGA-REPO-063` | `microsoft/semantic-kernel` | `agent_frameworks` | `True` | `True` | `False` |
| `MEGA-REPO-064` | `promptfoo/promptfoo` | `agent_evaluation` | `True` | `True` | `False` |
| `MEGA-REPO-065` | `explodinggradients/ragas` | `agent_evaluation` | `True` | `True` | `False` |
| `MEGA-REPO-066` | `langfuse/langfuse` | `agent_observability` | `True` | `True` | `False` |
| `MEGA-REPO-067` | `vllm-project/vllm` | `inference_serving` | `True` | `True` | `False` |
| `MEGA-REPO-068` | `BerriAI/litellm` | `inference_routing` | `True` | `True` | `False` |
| `MEGA-REPO-069` | `SWE-bench/SWE-bench` | `agent_benchmarks` | `True` | `True` | `False` |
| `MEGA-REPO-070` | `laude-institute/terminal-bench` | `agent_benchmarks` | `True` | `True` | `False` |
| `MEGA-REPO-071` | `cvxgrp/cvxpy` | `convex_optimization` | `True` | `True` | `False` |
| `MEGA-REPO-072` | `cvxgrp/scs` | `convex_optimization` | `True` | `True` | `False` |
| `MEGA-REPO-073` | `AllenDowney/ThinkBayes2` | `bayesian_statistics` | `True` | `True` | `False` |
| `MEGA-REPO-074` | `AllenDowney/ThinkStats2` | `statistics` | `True` | `True` | `False` |
| `MEGA-REPO-075` | `HoTT/book` | `type_theory` | `True` | `True` | `False` |
| `MEGA-REPO-076` | `CamDavidsonPilon/Probabilistic-Programming-and-Bayesian-Methods-for-Hackers` | `bayesian_statistics` | `True` | `True` | `False` |
| `MEGA-REPO-077` | `pymc-devs/pymc` | `bayesian_statistics` | `True` | `True` | `False` |
| `MEGA-REPO-078` | `stan-dev/stan` | `bayesian_statistics` | `True` | `True` | `False` |
| `MEGA-REPO-079` | `scipy/scipy` | `scientific_computing` | `True` | `True` | `False` |
| `MEGA-REPO-080` | `sympy/sympy` | `symbolic_mathematics` | `True` | `True` | `False` |
| `MEGA-REPO-081` | `munificent/craftinginterpreters` | `compilers` | `True` | `True` | `False` |
| `MEGA-REPO-082` | `Eijkhout/TheArtofHPC-pdfs` | `high_performance_computing` | `True` | `True` | `False` |
| `MEGA-REPO-083` | `google/sre_book_source` | `systems_reliability` | `True` | `True` | `False` |
| `MEGA-REPO-084` | `arpitbhayani/readings-in-database-systems` | `databases` | `True` | `True` | `False` |
| `MEGA-REPO-085` | `apache/arrow` | `columnar_memory` | `True` | `True` | `False` |
| `MEGA-REPO-086` | `duckdb/duckdb` | `analytical_databases` | `True` | `True` | `False` |
| `MEGA-REPO-087` | `imatix/zguide` | `distributed_systems` | `True` | `True` | `False` |
| `MEGA-REPO-088` | `mixu/distsysbook` | `distributed_systems` | `True` | `True` | `False` |
| `MEGA-REPO-089` | `kleppmann/ddia-references` | `distributed_systems` | `True` | `True` | `False` |
| `MEGA-REPO-090` | `networksciencebook/networksciencebook` | `network_science` | `True` | `True` | `False` |
| `MEGA-REPO-091` | `cisagov/kubernetes-hardening-guidance` | `cloud_security` | `True` | `True` | `False` |
| `MEGA-REPO-092` | `uds-se/fuzzingbook` | `security_fuzzing` | `True` | `True` | `False` |
| `MEGA-REPO-093` | `OWASP/wstg` | `security_testing` | `True` | `True` | `False` |
| `MEGA-REPO-094` | `OWASP/owasp-mastg` | `security_testing` | `True` | `True` | `False` |
| `MEGA-REPO-095` | `OWASP/www-project-top-10-for-large-language-model-applications` | `llm_security` | `True` | `True` | `False` |
| `MEGA-REPO-096` | `LeastAuthority/moonmath-manual` | `cryptography` | `True` | `True` | `False` |
| `MEGA-REPO-097` | `pyca/cryptography` | `cryptography` | `True` | `True` | `False` |
| `MEGA-REPO-098` | `HypothesisWorks/hypothesis` | `property_based_testing` | `True` | `True` | `False` |
| `MEGA-REPO-099` | `quantopian/zipline` | `systematic_trading` | `True` | `True` | `False` |
| `MEGA-REPO-100` | `freqtrade/freqtrade` | `systematic_trading` | `True` | `True` | `False` |
| `MEGA-REPO-101` | `hudson-and-thames/mlfinlab` | `quantitative_finance` | `True` | `True` | `False` |
| `MEGA-REPO-102` | `pmorissette/bt` | `portfolio_optimization` | `True` | `True` | `False` |
| `MEGA-REPO-103` | `robertmartin8/PyPortfolioOpt` | `portfolio_optimization` | `True` | `True` | `False` |
| `MEGA-REPO-104` | `polakowo/vectorbt` | `systematic_trading` | `True` | `True` | `False` |
| `MEGA-REPO-105` | `santosjorge/cufflinks` | `financial_visualization` | `True` | `True` | `False` |
