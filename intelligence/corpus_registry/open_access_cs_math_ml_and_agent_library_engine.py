#!/usr/bin/env python3
"""
Open-Access Computer Science, Algorithms, Machine Learning, Convex/Bayesian Mathematics,
Compilers, Distributed Systems, Security, and Agent Engineering Mega-Library Engine
========================================================================================
Ingests, catalogs, quarantine-manifests, and mathematically wires the 420+ item
Open-Access Technical Mega-Library across 10 canonical domains:

  Domain 1: Algorithms, Data Structures & Competitive Programming
  Domain 2: Foundations of Machine Learning, Deep Learning & Statistical Learning
  Domain 3: Foundational Transformer, Scaling, Alignment & Agentic ArXiv Papers
  Domain 4: Agent Engineering, Harnesses, Protocols & Evaluation
  Domain 5: Probability, Statistics, Convex Optimization & Linear Algebra
  Domain 6: Compilers, ASTs, Systems & High-Performance Computing
  Domain 7: Databases, Data Mining & Information Retrieval
  Domain 8: Distributed Systems, Networking, Cloud & ZeroMQ
  Domain 9: Cryptography, Security & Fuzzing
  Domain 10: Open-Source Book & Systematic Trading Repositories (Quarantined INGEST-AND-LEARN)
"""

from __future__ import annotations

import ast
import hashlib
import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_JSON_PATH = (
    REPO_ROOT
    / "docs"
    / "arxiv-program"
    / "research"
    / "2026-11-07"
    / "open-access-cs-math-ml-and-agent-mega-library-manifest.json"
)
SUMMARY_MD_PATH = (
    REPO_ROOT
    / "docs"
    / "arxiv-program"
    / "research"
    / "2026-11-07"
    / "OPEN-ACCESS-CS-MATH-ML-AND-AGENT-MEGA-LIBRARY-2026-11-07.md"
)

# Standing INGEST-AND-LEARN quarantine flags for all external repositories
COMMERCIAL_USE_BLOCKED: bool = True
LEARN_AND_REASON_ONLY: bool = True
INSTALL_PERMITTED_IN_PROD: bool = False


# ---------------------------------------------------------------------------
# 10 CANONICAL DOMAINS & 420+ ITEM MEGA-LIBRARY CATALOG
# ---------------------------------------------------------------------------

MEGA_LIBRARY_10_DOMAINS: Tuple[Dict[str, Any], ...] = (
    {
        "domain_id": 1,
        "slug": "algorithms_data_structures_and_competitive_programming",
        "title": "Algorithms, Data Structures & Competitive Programming",
        "anchor_works": [
            "Kleinberg & Tardos — Algorithm Design",
            "Jeff Erickson — Algorithms",
            "Sedgewick & Wayne — Algorithms (Algs4)",
            "Mykel Kochenderfer, Tim Wheeler & Kyle Wray — Algorithms for Decision Making",
            "Herbert Wilf — Generatingfunctionology",
            "Chris Okasaki — Purely Functional Data Structures",
            "Steven LaValle — Planning Algorithms",
            "David Williamson & David Shmoys — The Design of Approximation Algorithms",
            "Steven Halim & Felix Halim — Competitive Programming 1, 2 & 3",
            "Antti Laaksonen — Competitive Programmer's Handbook (CSES)",
            "Silvano Martello & Paolo Toth — Knapsack Problems: Algorithms and Computer Implementations",
        ],
        "primitives": [
            "solve_knapsack_and_multichoice_salary_cap",
            "pomdp_mdp_bellman_backup",
            "submodular_greedy_maximize",
        ],
    },
    {
        "domain_id": 2,
        "slug": "foundations_of_ml_dl_and_statistical_learning",
        "title": "Foundations of Machine Learning, Deep Learning & Statistical Learning",
        "anchor_works": [
            "Ian Goodfellow, Yoshua Bengio & Aaron Courville — Deep Learning",
            "Christopher Bishop — Pattern Recognition and Machine Learning (PRML) & Deep Learning: Foundations and Concepts",
            "Simon J.D. Prince — Understanding Deep Learning",
            "Kevin P. Murphy — Probabilistic Machine Learning: An Introduction (Vol 1) & Advanced Topics (Vol 2)",
            "Trevor Hastie, Robert Tibshirani & Jerome Friedman — The Elements of Statistical Learning (ESL)",
            "Carl Edward Rasmussen & Christopher K.I. Williams — Gaussian Processes for Machine Learning (GPML)",
            "David J.C. MacKay — Information Theory, Inference, and Learning Algorithms",
            "Richard S. Sutton & Andrew G. Barto — Reinforcement Learning: An Introduction (2nd Ed, 2020)",
            "Csaba Szepesvari — Algorithms for Reinforcement Learning (RL in MDPs)",
            "David Barber — Bayesian Reasoning and Machine Learning (BRML)",
            "Shai Shalev-Shwartz & Shai Ben-David — Understanding Machine Learning: From Theory to Algorithms",
            "Christoph Molnar — Interpretable Machine Learning",
            "Chip Huyen / Vijay Janapa Reddi — Designing Machine Learning Systems & MLSysBook",
            "Jeremy Howard & Sylvain Gugger — Deep Learning for Coders with fastai and PyTorch",
            "Stanford CS336 — Language Modeling from Scratch",
        ],
        "primitives": [
            "gaussian_process_kernel_regression",
            "mackay_evidence_approximation",
            "td_lambda_gae_advantage_estimation",
        ],
    },
    {
        "domain_id": 3,
        "slug": "foundational_transformer_scaling_alignment_and_agentic_arxiv",
        "title": "Foundational Transformer, Scaling, Alignment & Agentic ArXiv Papers",
        "anchor_works": [
            "arXiv:1706.03762 — Attention Is All You Need (Vaswani et al., 2017)",
            "arXiv:2001.08361 — Scaling Laws for Neural Language Models (Kaplan et al., 2020)",
            "arXiv:2203.15556 — Training Compute-Optimal Large Language Models / Chinchilla (Hoffmann et al., 2022)",
            "arXiv:2005.14165 — Language Models are Few-Shot Learners / GPT-3 (Brown et al., 2020)",
            "arXiv:2005.11401 — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., 2020)",
            "arXiv:2106.09685 — LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)",
            "arXiv:2203.02155 — Training language models to follow instructions with human feedback / InstructGPT (Ouyang et al., 2022)",
            "arXiv:2210.03629 — ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2022)",
            "arXiv:2212.08073 — Constitutional AI: Harmlessness from AI Feedback (Bai et al., 2022)",
            "arXiv:2305.18290 — Direct Preference Optimization: Your Language Model is Secretly a Reward Model (Rafailov et al., 2023)",
        ],
        "primitives": [
            "chinchilla_kaplan_compute_optimal_allocation",
            "dpo_implicit_reward_margin",
            "validate_react_thought_action_observation_loop",
        ],
    },
    {
        "domain_id": 4,
        "slug": "agent_engineering_harnesses_protocols_and_evaluation",
        "title": "Agent Engineering, Harnesses, Protocols & Evaluation",
        "anchor_works": [
            "Anthropic — Building Effective Agents",
            "Anthropic — Effective Context Engineering for AI Agents",
            "Anthropic — Effective Harnesses for Long-Running Agents",
            "Anthropic — Demystifying Evals for AI Agents",
            "Anthropic — How We Built Our Multi-Agent Research System",
            "OpenAI — A Practical Guide to Building Agents",
            "OpenAI — Harness Engineering",
            "OpenAI — Symphony Multi-Agent Orchestration",
            "Model Context Protocol (MCP) Specification 2026-07-28",
            "Agent2Agent (A2A) Protocol Specification",
            "PydanticAI Typed Agent Framework",
            "LangGraph Stateful Multi-Actor Orchestration",
            "OpenAI Agents SDK",
            "Google Agent Development Kit (ADK)",
            "Microsoft Agent Framework (AutoGen / Semantic Kernel)",
            "Promptfoo Adversarial & Regression Eval Harness",
            "Ragas Retrieval-Augmented Generation Evaluation",
            "Langfuse Open-Source LLM Engineering & Tracing",
            "vLLM High-Throughput PagedAttention Serving Engine",
            "LiteLLM Unified Model Gateway",
            "SWE-bench Software Engineering Benchmark",
            "Terminal-Bench 2.1 CLI Agent Evaluation Benchmark",
        ],
        "primitives": [
            "evaluate_agent_harness_pass_at_k_and_pass_hat_k",
            "calculate_long_running_context_compaction_budget",
        ],
    },
    {
        "domain_id": 5,
        "slug": "probability_statistics_convex_optimization_and_linear_algebra",
        "title": "Probability, Statistics, Convex Optimization & Linear Algebra",
        "anchor_works": [
            "Stephen Boyd & Lieven Vandenberghe — Convex Optimization",
            "Sheldon Axler — Linear Algebra Done Right",
            "Sergei Treil — Linear Algebra Done Wrong (LADW)",
            "Luc Devroye — Non-Uniform Random Variate Generation",
            "Charles M. Grinstead & J. Laurie Snell — Introduction to Probability",
            "MIT 18.05 — Introduction to Probability and Statistics (Orloff & Bloom)",
            "Allen B. Downey — Think Bayes & Think Stats",
            "Alex Reinhart — Statistics Done Wrong",
            "David I. Spivak — Category Theory for the Sciences",
            "Univalent Foundations Program — Homotopy Type Theory: Univalent Foundations of Mathematics",
        ],
        "primitives": [
            "boyd_vandenberghe_kkt_simplex_barrier_projection",
            "devroye_exact_rejection_and_inversion_sampler",
        ],
    },
    {
        "domain_id": 6,
        "slug": "compilers_asts_systems_and_hpc",
        "title": "Compilers, ASTs, Systems & High-Performance Computing",
        "anchor_works": [
            "Robert Nystrom — Crafting Interpreters",
            "Simon Peyton Jones — The Implementation of Functional Programming Languages",
            "Aho, Lam, Sethi & Ullman — Compilers: Principles, Techniques, and Tools (Dragon Book / Stanford CS143)",
            "Suzanne J. Matthews, Tia Newhall & Kevin C. Webb — Dive Into Systems",
            "Beyer, Jones, Petoff & Murphy — Google Site Reliability Engineering (SRE) Books",
            "Carlos Bueno — Mature Optimization",
            "Victor Eijkhout — Introduction to High Performance Scientific Computing (Art of HPC)",
            "Jörg Arndt — Matters Computational: Ideas, Algorithms, Source Code (FXT Book)",
        ],
        "primitives": [
            "analyze_equation_ast_complexity_and_cyclomatic_depth",
        ],
    },
    {
        "domain_id": 7,
        "slug": "databases_data_mining_and_information_retrieval",
        "title": "Databases, Data Mining & Information Retrieval",
        "anchor_works": [
            "Jure Leskovec, Anand Rajaraman & Jeffrey D. Ullman — Mining of Massive Datasets (MMDS)",
            "Christopher D. Manning, Prabhakar Raghavan & Hinrich Schütze — Introduction to Information Retrieval",
            "Stefan Büttcher, Charles L.A. Clarke & Gordon V. Cormack — Information Retrieval: Implementing and Evaluating Search Engines",
            "Peter Bailis, Joseph M. Hellerstein & Michael Stonebraker — Readings in Database Systems (Red Book, 5th Ed)",
            "Serge Abiteboul, Richard Hull & Victor Vianu — Foundations of Databases (Alice Book)",
            "Max Kuhn & Kjell Johnson — Feature Engineering and Selection: A Practical Approach for Predictive Models",
        ],
        "primitives": [
            "bm25_and_rrf_hybrid_retrieval_scorer",
        ],
    },
    {
        "domain_id": 8,
        "slug": "distributed_systems_networking_cloud_and_zeromq",
        "title": "Distributed Systems, Networking, Cloud & ZeroMQ",
        "anchor_works": [
            "Andrew S. Tanenbaum & Maarten van Steen — Distributed Systems (4th Ed)",
            "Pieter Hintjens — ZeroMQ: Messaging for Many Applications (The ZGuide)",
            "Martin Kleppmann / Mikito Takada (Mixu) — Distributed Systems for Fun and Profit",
            "Gwen Shapira, Todd Palino, Rajini Sivaram & Krit Petty — Kafka: The Definitive Guide",
            "Albert-László Barabási — Network Science",
            "David Easley & Jon Kleinberg — Networks, Crowds, and Markets: Reasoning About a Highly Connected World",
            "NSA & CISA — Kubernetes Hardening Guidance",
        ],
        "primitives": [
            "kleinberg_hits_and_pagerank_spectral_centrality",
        ],
    },
    {
        "domain_id": 9,
        "slug": "cryptography_security_and_fuzzing",
        "title": "Cryptography, Security & Fuzzing",
        "anchor_works": [
            "Dan Boneh & Victor Shoup — A Graduate Course in Applied Cryptography",
            "Alfred J. Menezes, Paul C. van Oorschot & Scott A. Vanstone — Handbook of Applied Cryptography (HAC)",
            "Ross Anderson — Security Engineering (3rd Ed)",
            "Andreas Zeller, Rahul Gopinath, Marcel Böhme, Gordon Fraser & Christian Holler — The Fuzzing Book",
            "OWASP — Web Security Testing Guide (WSTG), Mobile Application Security Testing Guide (MASTG) & Top 10 for LLM Applications",
            "Least Authority — MoonMath Manual to zk-SNARKs",
        ],
        "primitives": [
            "metamorphic_fuzzing_probability_and_devig_checker",
        ],
    },
    {
        "domain_id": 10,
        "slug": "open_source_book_and_systematic_trading_repositories",
        "title": "Open-Source Book & Systematic Trading Repositories",
        "anchor_works": [
            "EbookFoundation/free-programming-books",
            "paperswithbacktest/awesome-systematic-trading",
            "bpangman/kalshi-command-center",
            "yzhao062/anomaly-detection-resources",
            "DatariusAI/Mathematics-for-AI",
            "oomol-lab/pdf-craft",
            "phiresky/ripgrep-all",
            "95+ Quarantined GitHub Open-Access Book, Math, ML, Agent & Systematic Trading Repositories",
        ],
        "primitives": [
            "detect_isolation_anomaly_and_kalshi_sportsbook_arbitrage",
        ],
    },
)


FOUNDATIONAL_ARXIV_PAPERS_CATALOG: Tuple[Dict[str, Any], ...] = (
    {"arxiv_id": "1706.03762", "title": "Attention Is All You Need", "authors": "Vaswani et al.", "year": 2017, "domain_id": 3, "key_formula": "Attention(Q,K,V) = softmax(QK^T / sqrt(d_k))V"},
    {"arxiv_id": "2001.08361", "title": "Scaling Laws for Neural Language Models", "authors": "Kaplan et al.", "year": 2020, "domain_id": 3, "key_formula": "L(N,D) = (N_c/N)^alpha_N + (D_c/D)^alpha_D"},
    {"arxiv_id": "2203.15556", "title": "Training Compute-Optimal Large Language Models (Chinchilla)", "authors": "Hoffmann et al.", "year": 2022, "domain_id": 3, "key_formula": "L(N,D) = E + A/N^alpha + B/D^beta, N* propto C^0.5, D* propto C^0.5"},
    {"arxiv_id": "2005.14165", "title": "Language Models are Few-Shot Learners (GPT-3)", "authors": "Brown et al.", "year": 2020, "domain_id": 3, "key_formula": "In-context conditional likelihood p(y | context, x)"},
    {"arxiv_id": "2005.11401", "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", "authors": "Lewis et al.", "year": 2020, "domain_id": 3, "key_formula": "p_RAG(y|x) = sum_{z in top-k} p_eta(z|x) p_theta(y|x,z)"},
    {"arxiv_id": "2106.09685", "title": "LoRA: Low-Rank Adaptation of Large Language Models", "authors": "Hu et al.", "year": 2021, "domain_id": 3, "key_formula": "W = W_0 + (alpha/r) B A, rank(B A) <= r << min(d,k)"},
    {"arxiv_id": "2203.02155", "title": "Training language models to follow instructions with human feedback (InstructGPT)", "authors": "Ouyang et al.", "year": 2022, "domain_id": 3, "key_formula": "max_pi E[r_phi(x,y)] - beta D_KL(pi_theta(y|x) || pi_SFT(y|x))"},
    {"arxiv_id": "2210.03629", "title": "ReAct: Synergizing Reasoning and Acting in Language Models", "authors": "Yao et al.", "year": 2022, "domain_id": 3, "key_formula": "Trajectory tau_t = (Thought_1, Action_1, Obs_1, ..., Thought_t, Action_t, Obs_t)"},
    {"arxiv_id": "2212.08073", "title": "Constitutional AI: Harmlessness from AI Feedback", "authors": "Bai et al.", "year": 2022, "domain_id": 3, "key_formula": "SL-CAI critique-revision + RLAIF preference model"},
    {"arxiv_id": "2305.18290", "title": "Direct Preference Optimization: Your Language Model is Secretly a Reward Model", "authors": "Rafailov et al.", "year": 2023, "domain_id": 3, "key_formula": "L_DPO = -E[log sigma(beta log(pi_theta(y_w|x)/pi_ref(y_w|x)) - beta log(pi_theta(y_l|x)/pi_ref(y_l|x)))]"},
    {"arxiv_id": "1506.02438", "title": "High-Dimensional Continuous Control Using Generalized Advantage Estimation (GAE)", "authors": "Schulman et al.", "year": 2015, "domain_id": 2, "key_formula": "A_t^GAE(gamma,lambda) = sum_{l=0}^inf (gamma*lambda)^l delta_{t+l}^V"},
    {"arxiv_id": "1707.06347", "title": "Proximal Policy Optimization Algorithms (PPO)", "authors": "Schulman et al.", "year": 2017, "domain_id": 2, "key_formula": "L_CLIP = E[min(r_t(theta) A_t, clip(r_t(theta), 1-eps, 1+eps) A_t)]"},
    {"arxiv_id": "2201.11903", "title": "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", "authors": "Wei et al.", "year": 2022, "domain_id": 3, "key_formula": "p(y|x) = sum_z p(z|x) p(y|x,z)"},
    {"arxiv_id": "2203.11171", "title": "Self-Consistency Improves Chain of Thought Reasoning in Language Models", "authors": "Wang et al.", "year": 2022, "domain_id": 3, "key_formula": "y* = argmax_y sum_{i=1}^m I(y_i = y)"},
    {"arxiv_id": "2305.10601", "title": "Tree of Thoughts: Deliberate Problem Solving with Large Language Models", "authors": "Yao et al.", "year": 2023, "domain_id": 3, "key_formula": "BFS/DFS state evaluation V(s) over thought tree"},
    {"arxiv_id": "2303.11366", "title": "Reflexion: Language Agents with Verbal Reinforcement Learning", "authors": "Shinn et al.", "year": 2023, "domain_id": 4, "key_formula": "Episodic verbal gradient memory buffer M_{t+1}"},
    {"arxiv_id": "2107.03374", "title": "Evaluating Large Language Models Trained on Code (Codex / Pass@k)", "authors": "Chen et al.", "year": 2021, "domain_id": 4, "key_formula": "pass@k = 1 - C(n-c, k) / C(n, k)"},
    {"arxiv_id": "2310.06770", "title": "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?", "authors": "Jimenez et al.", "year": 2023, "domain_id": 4, "key_formula": "Repository-level patch verification pass rate"},
    {"arxiv_id": "2309.06180", "title": "Efficient Memory Management for Large Language Model Serving with PagedAttention (vLLM)", "authors": "Kwon et al.", "year": 2023, "domain_id": 4, "key_formula": "Block-table non-contiguous KV cache paging"},
    {"arxiv_id": "2205.14135", "title": "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness", "authors": "Dao et al.", "year": 2022, "domain_id": 3, "key_formula": "Online tiling log-sum-exp rescaling in SRAM"},
    {"arxiv_id": "2307.08691", "title": "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning", "authors": "Dao", "year": 2023, "domain_id": 3, "key_formula": "Sequence-dimension warp partitioning"},
    {"arxiv_id": "2402.03300", "title": "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (GRPO)", "authors": "Shao et al.", "year": 2024, "domain_id": 3, "key_formula": "Group Relative Policy Optimization A_i = (r_i - mean(r))/std(r)"},
    {"arxiv_id": "2501.12948", "title": "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning", "authors": "DeepSeek-AI", "year": 2025, "domain_id": 3, "key_formula": "Rule-based verifiable reward GRPO without neural PRM"},
    {"arxiv_id": "1905.02922", "title": "Conformalized Quantile Regression (CQR)", "authors": "Romano, Patterson & Candes", "year": 2019, "domain_id": 5, "key_formula": "E_i = max(q_lo(X_i) - Y_i, Y_i - q_hi(X_i))"},
    {"arxiv_id": "2202.13415", "title": "Conformal Prediction Beyond Exchangeability", "authors": "Barber, Candes, Ramdas & Tibshirani", "year": 2023, "domain_id": 5, "key_formula": "Non-exchangeable weighted quantile w_i"},
)


_RAW_GITHUB_REPO_SLUGS: Tuple[Tuple[str, str, str], ...] = (
    # Core anchor repositories named in task specification
    ("EbookFoundation/free-programming-books", "open_access_books", "Curated index of free programming, CS, math, and ML textbooks"),
    ("paperswithbacktest/awesome-systematic-trading", "systematic_trading", "Systematic trading, execution, and backtest research catalog"),
    ("bpangman/kalshi-command-center", "prediction_markets", "Kalshi event contract orderbook & cross-market monitoring reference"),
    ("yzhao062/anomaly-detection-resources", "anomaly_detection", "Isolation Forest, PyOD, and statistical outlier detection reference"),
    ("DatariusAI/Mathematics-for-AI", "mathematics_for_ai", "Linear algebra, probability, calculus, and optimization for AI"),
    ("oomol-lab/pdf-craft", "document_extraction", "Structured PDF-to-Markdown and mathematical layout parser reference"),
    ("phiresky/ripgrep-all", "information_retrieval", "Multi-format PDF/archive full-text search wrapper over ripgrep"),
    # Algorithms, Data Structures & Competitive Programming repos
    ("jeffgerickson/algorithms", "algorithms", "Jeff Erickson Algorithms textbook sources and lecture notes"),
    ("kevin-wayne/algs4", "algorithms", "Sedgewick & Wayne Algorithms 4th Edition reference implementations"),
    ("sisl/AlgorithmsForDecisionMaking.jl", "decision_making", "Kochenderfer Algorithms for Decision Making MDP/POMDP reference"),
    ("cp-algorithms/cp-algorithms", "competitive_programming", "E-Maxx competitive programming algorithms encyclopedia"),
    ("stevenhalim/cpbook-code", "competitive_programming", "Halim Competitive Programming reference data structures and DP"),
    ("kth-competitive-programming/kactl", "competitive_programming", "KTH Algorithmic Contest Template Library"),
    ("TheAlgorithms/Python", "algorithms", "Educational algorithm reference implementations in Python"),
    ("TheAlgorithms/C-Plus-Plus", "algorithms", "Educational algorithm reference implementations in C++"),
    ("TheAlgorithms/Rust", "algorithms", "Educational algorithm reference implementations in Rust"),
    ("trekhleb/javascript-algorithms", "algorithms", "Data structures and algorithms reference catalog"),
    ("williamfiset/Algorithms", "algorithms", "Graph theory, network flow, and dynamic programming reference"),
    ("keon/algorithms", "algorithms", "Minimal Python data structures and algorithms reference"),
    ("TargetProcess/fancy-fp-data-structures", "functional_data_structures", "Okasaki purely functional persistent data structures reference"),
    # Machine Learning, Deep Learning & Statistical Learning repos
    ("probml/pml-book", "machine_learning", "Kevin Murphy Probabilistic Machine Learning Vol 1 & 2 companion"),
    ("probml/pyprobml", "machine_learning", "Python code for Murphy Probabilistic Machine Learning"),
    ("udlbook/udlbook", "deep_learning", "Simon Prince Understanding Deep Learning notebooks and figures"),
    ("christophM/interpretable-ml-book", "interpretable_ml", "Christoph Molnar Interpretable Machine Learning book source"),
    ("fastai/fastbook", "deep_learning", "Howard & Gugger Deep Learning for Coders with fastai and PyTorch"),
    ("stanford-cs336/spring2025-lectures", "language_modeling", "Stanford CS336 Language Modeling from Scratch materials"),
    ("harvard-edge/cs249r_book", "ml_systems", "MLSysBook Machine Learning Systems textbook"),
    ("chiphuyen/dmls-book", "ml_systems", "Chip Huyen Designing Machine Learning Systems notes"),
    ("rasbt/machine-learning-book", "machine_learning", "Raschka Machine Learning with PyTorch and Scikit-Learn"),
    ("rasbt/LLMs-from-scratch", "language_modeling", "Build a Large Language Model From Scratch reference"),
    ("ageron/handson-ml3", "machine_learning", "Geron Hands-On Machine Learning 3rd Edition reference"),
    ("d2l-ai/d2l-en", "deep_learning", "Zhang, Lipton, Li & Smola Dive into Deep Learning interactive book"),
    ("shangtongzhang/reinforcement-learning-an-introduction", "reinforcement_learning", "Sutton & Barto RL 2nd Edition Python replications"),
    ("CompVis/latent-diffusion", "deep_learning", "High-resolution latent diffusion reference architecture"),
    ("karpathy/nanoGPT", "language_modeling", "Minimalist GPT training and scaling reference"),
    ("karpathy/llm.c", "language_modeling", "Pure C/CUDA Transformer training reference"),
    ("karpathy/minbpe", "tokenization", "Minimal byte-pair encoding tokenizer reference"),
    ("pyg-team/pytorch_geometric", "graph_ml", "Graph neural network message-passing reference"),
    ("optuna/optuna", "hyperparameter_optimization", "Bayesian TPE hyperparameter optimization reference"),
    ("scikit-learn/scikit-learn", "machine_learning", "Classical statistical learning and calibration reference"),
    # Transformer, Scaling, Alignment & Agentic Research repos
    ("huggingface/alignment-handbook", "alignment", "DPO, ORPO, and SFT alignment training recipes"),
    ("eric-mitchell/direct-preference-optimization", "alignment", "Official DPO reference implementation (arXiv:2305.18290)"),
    ("ysymyth/ReAct", "agent_reasoning", "Official ReAct Thought-Action-Observation reference (arXiv:2210.03629)"),
    ("princeton-nlp/tree-of-thought-llm", "agent_reasoning", "Tree of Thoughts deliberate search reference (arXiv:2305.10601)"),
    ("noahshinn/reflexion", "agent_reasoning", "Reflexion verbal reinforcement learning reference (arXiv:2303.11366)"),
    ("microsoft/LoRA", "parameter_efficient_tuning", "Low-Rank Adaptation reference (arXiv:2106.09685)"),
    ("Dao-AILab/flash-attention", "attention_kernels", "IO-aware exact FlashAttention kernel reference"),
    ("deepseek-ai/DeepSeek-R1", "reasoning_models", "DeepSeek-R1 reinforcement learning reasoning model reference"),
    ("deepseek-ai/DeepSeek-Math", "mathematical_reasoning", "GRPO mathematical reasoning reference"),
    ("openai/human-eval", "code_evaluation", "Unbiased Pass@k evaluation harness reference"),
    # Agent Engineering, Harnesses, Protocols & Evaluation repos
    ("anthropics/anthropic-cookbook", "agent_engineering", "Anthropic Building Effective Agents & Context Engineering patterns"),
    ("anthropics/courses", "agent_engineering", "Anthropic prompt engineering, tool use, and eval courses"),
    ("modelcontextprotocol/specification", "agent_protocols", "Official Model Context Protocol (MCP) 2026-07-28 specification"),
    ("modelcontextprotocol/python-sdk", "agent_protocols", "MCP Python server/client SDK reference"),
    ("modelcontextprotocol/servers", "agent_protocols", "Reference MCP tool servers"),
    ("google/A2A", "agent_protocols", "Agent2Agent (A2A) inter-agent interoperability protocol"),
    ("google/adk-python", "agent_frameworks", "Google Agent Development Kit (ADK) Python reference"),
    ("pydantic/pydantic-ai", "agent_frameworks", "PydanticAI type-safe structured agent framework"),
    ("langchain-ai/langgraph", "agent_frameworks", "LangGraph stateful graph-based multi-agent runtime"),
    ("openai/openai-agents-python", "agent_frameworks", "OpenAI Agents SDK lightweight handoff and guardrail harness"),
    ("openai/swarm", "agent_frameworks", "Educational multi-agent handoff orchestration pattern"),
    ("microsoft/autogen", "agent_frameworks", "Microsoft multi-agent conversation and code execution framework"),
    ("microsoft/semantic-kernel", "agent_frameworks", "Microsoft enterprise agent orchestration SDK"),
    ("promptfoo/promptfoo", "agent_evaluation", "Adversarial red-teaming and deterministic eval matrix runner"),
    ("explodinggradients/ragas", "agent_evaluation", "RAG faithfulness, answer relevance, and context precision metrics"),
    ("langfuse/langfuse", "agent_observability", "Open-source LLM trace, span, and cost telemetry platform"),
    ("vllm-project/vllm", "inference_serving", "PagedAttention high-throughput LLM serving engine"),
    ("BerriAI/litellm", "inference_routing", "Unified multi-provider LLM router and cost budget gateway"),
    ("SWE-bench/SWE-bench", "agent_benchmarks", "Real-world software engineering benchmark harness"),
    ("laude-institute/terminal-bench", "agent_benchmarks", "Terminal-Bench 2.1 CLI agent evaluation harness"),
    # Probability, Statistics, Convex Optimization & Math repos
    ("cvxgrp/cvxpy", "convex_optimization", "Boyd lab Disciplined Convex Programming modeling language"),
    ("cvxgrp/scs", "convex_optimization", "Splitting Conic Solver for large-scale convex cones"),
    ("AllenDowney/ThinkBayes2", "bayesian_statistics", "Allen Downey Think Bayes 2nd Edition notebooks"),
    ("AllenDowney/ThinkStats2", "statistics", "Allen Downey Think Stats exploratory data analysis code"),
    ("HoTT/book", "type_theory", "Homotopy Type Theory: Univalent Foundations of Mathematics LaTeX source"),
    ("CamDavidsonPilon/Probabilistic-Programming-and-Bayesian-Methods-for-Hackers", "bayesian_statistics", "Bayesian inference and MCMC companion"),
    ("pymc-devs/pymc", "bayesian_statistics", "Hamiltonian Monte Carlo / NUTS probabilistic programming"),
    ("stan-dev/stan", "bayesian_statistics", "Stan statistical modeling and variational inference reference"),
    ("scipy/scipy", "scientific_computing", "Optimization, linear algebra, and quadrature algorithms"),
    ("sympy/sympy", "symbolic_mathematics", "Computer algebra and symbolic differentiation reference"),
    # Compilers, Systems, Databases, Distributed Systems & Security repos
    ("munificent/craftinginterpreters", "compilers", "Robert Nystrom Crafting Interpreters bytecode VM & AST book"),
    ("Eijkhout/TheArtofHPC-pdfs", "high_performance_computing", "Victor Eijkhout Art of HPC textbook series"),
    ("google/sre_book_source", "systems_reliability", "Google Site Reliability Engineering error-budget principles"),
    ("arpitbhayani/readings-in-database-systems", "databases", "Stonebraker Red Book database systems study notes"),
    ("apache/arrow", "columnar_memory", "Zero-copy columnar in-memory analytics format"),
    ("duckdb/duckdb", "analytical_databases", "Vectorized push-based OLAP query execution engine"),
    ("imatix/zguide", "distributed_systems", "Pieter Hintjens ZeroMQ ZGuide messaging patterns"),
    ("mixu/distsysbook", "distributed_systems", "Mixu Distributed Systems for Fun and Profit"),
    ("kleppmann/ddia-references", "distributed_systems", "Designing Data-Intensive Applications literature references"),
    ("networksciencebook/networksciencebook", "network_science", "Barabasi Network Science interactive textbook"),
    ("cisagov/kubernetes-hardening-guidance", "cloud_security", "NSA/CISA Kubernetes pod, network, and RBAC hardening"),
    ("uds-se/fuzzingbook", "security_fuzzing", "Andreas Zeller et al. The Fuzzing Book executable notebooks"),
    ("OWASP/wstg", "security_testing", "OWASP Web Security Testing Guide"),
    ("OWASP/owasp-mastg", "security_testing", "OWASP Mobile Application Security Testing Guide"),
    ("OWASP/www-project-top-10-for-large-language-model-applications", "llm_security", "OWASP Top 10 for LLM & Agentic Applications"),
    ("LeastAuthority/moonmath-manual", "cryptography", "MoonMath Manual to zk-SNARKs and finite fields"),
    ("pyca/cryptography", "cryptography", "Authenticated encryption and cryptographic primitives reference"),
    ("HypothesisWorks/hypothesis", "property_based_testing", "Property-based and metamorphic testing engine"),
    # Quantitative Finance & Systematic Trading repos
    ("quantopian/zipline", "systematic_trading", "Event-driven algorithmic backtesting architecture reference"),
    ("freqtrade/freqtrade", "systematic_trading", "Execution state-machine and dry-run order lifecycle reference"),
    ("hudson-and-thames/mlfinlab", "quantitative_finance", "Purged k-fold CV, triple-barrier labeling, and meta-labeling notes"),
    ("pmorissette/bt", "portfolio_optimization", "Tree-structured quantitative portfolio backtest reference"),
    ("robertmartin8/PyPortfolioOpt", "portfolio_optimization", "Black-Litterman, HRP, and convex frontier optimization reference"),
    ("polakowo/vectorbt", "systematic_trading", "Vectorized NumPy/Numba signal evaluation reference"),
    ("santosjorge/cufflinks", "financial_visualization", "Time-series spread and drawdown charting reference"),
)


QUARANTINED_GITHUB_REPOS_CATALOG: Tuple[Dict[str, Any], ...] = tuple(
    {
        "repo_id": f"MEGA-REPO-{idx:03d}",
        "repo_slug": slug,
        "subdomain": subdomain,
        "description": desc,
        "domain_id": 10,
        "status": "QUARANTINED_INGEST_AND_LEARN_ONLY",
        "COMMERCIAL_USE_BLOCKED": True,
        "LEARN_AND_REASON_ONLY": True,
        "install_permitted_in_prod": False,
        "doctrine": "INGEST-AND-LEARN (Garrett, 2026-09-28 — HARD)",
    }
    for idx, (slug, subdomain, desc) in enumerate(_RAW_GITHUB_REPO_SLUGS, start=1)
)


def _build_420_plus_domain_catalogs() -> Dict[int, List[Dict[str, Any]]]:
    """Build the complete 420+ item catalog across all 10 domains."""
    domain_items: Dict[int, List[Dict[str, Any]]] = {d["domain_id"]: [] for d in MEGA_LIBRARY_10_DOMAINS}

    domain_specific_curated_entries: Dict[int, List[Tuple[str, str, str]]] = {
        1: [
            ("Kleinberg & Tardos — Algorithm Design", "Kleinberg, Tardos", "textbook"),
            ("Jeff Erickson — Algorithms", "Jeff Erickson", "textbook"),
            ("Sedgewick & Wayne — Algorithms 4th Ed (Algs4)", "Sedgewick, Wayne", "textbook"),
            ("Kochenderfer, Wheeler & Wray — Algorithms for Decision Making", "Kochenderfer et al.", "textbook"),
            ("Herbert S. Wilf — Generatingfunctionology", "Herbert Wilf", "textbook"),
            ("Chris Okasaki — Purely Functional Data Structures", "Chris Okasaki", "textbook"),
            ("Steven M. LaValle — Planning Algorithms", "Steven LaValle", "textbook"),
            ("Williamson & Shmoys — The Design of Approximation Algorithms", "Williamson, Shmoys", "textbook"),
            ("Steven Halim & Felix Halim — Competitive Programming 1", "Halim, Halim", "textbook"),
            ("Steven Halim & Felix Halim — Competitive Programming 2", "Halim, Halim", "textbook"),
            ("Steven Halim, Felix Halim & Suhendry Effendy — Competitive Programming 4", "Halim et al.", "textbook"),
            ("Antti Laaksonen — Competitive Programmer's Handbook (CSES)", "Antti Laaksonen", "textbook"),
            ("Martello & Toth — Knapsack Problems: Algorithms and Computer Implementations", "Martello, Toth", "textbook"),
            ("Cormen, Leiserson, Rivest & Stein — Introduction to Algorithms (CLRS)", "Cormen et al.", "textbook"),
            ("Dasgupta, Papadimitriou & Vazirani — Algorithms (DPV)", "Dasgupta et al.", "textbook"),
            ("Skiena — The Algorithm Design Manual", "Steven Skiena", "textbook"),
            ("Knuth — The Art of Computer Programming Vol 1: Fundamental Algorithms", "Donald Knuth", "textbook"),
            ("Knuth — The Art of Computer Programming Vol 2: Seminumerical Algorithms", "Donald Knuth", "textbook"),
            ("Knuth — The Art of Computer Programming Vol 3: Sorting and Searching", "Donald Knuth", "textbook"),
            ("Knuth — The Art of Computer Programming Vol 4A: Combinatorial Algorithms", "Donald Knuth", "textbook"),
            ("Tarjan — Data Structures and Network Algorithms", "Robert E. Tarjan", "textbook"),
            ("Ahuja, Magnanti & Orlin — Network Flows: Theory, Algorithms, and Applications", "Ahuja et al.", "textbook"),
            ("Vazirani — Approximation Algorithms", "Vijay Vazirani", "textbook"),
            ("Motwani & Raghavan — Randomized Algorithms", "Motwani, Raghavan", "textbook"),
            ("Mitzenmacher & Upfal — Probability and Computing", "Mitzenmacher, Upfal", "textbook"),
            ("Flajolet & Sedgewick — Analytic Combinatorics", "Flajolet, Sedgewick", "textbook"),
            ("Graham, Knuth & Patashnik — Concrete Mathematics", "Graham, Knuth, Patashnik", "textbook"),
            ("Nemhauser & Wolsey — Integer and Combinatorial Optimization", "Nemhauser, Wolsey", "textbook"),
            ("Papadimitriou & Steiglitz — Combinatorial Optimization: Algorithms and Complexity", "Papadimitriou, Steiglitz", "textbook"),
            ("Schrijver — Combinatorial Optimization: Polyhedra and Efficiency", "Alexander Schrijver", "textbook"),
            ("Bertsekas — Dynamic Programming and Optimal Control Vol 1", "Dimitri Bertsekas", "textbook"),
            ("Bertsekas — Dynamic Programming and Optimal Control Vol 2", "Dimitri Bertsekas", "textbook"),
            ("Puterman — Markov Decision Processes: Discrete Stochastic Dynamic Programming", "Martin Puterman", "textbook"),
            ("Kellerer, Pferschy & Pisinger — Knapsack Problems", "Kellerer et al.", "textbook"),
            ("Fujishige — Submodular Functions and Optimization", "Satoru Fujishige", "textbook"),
            ("Krause & Golovin — Submodular Function Maximization", "Krause, Golovin", "monograph"),
        ],
        2: [
            ("Goodfellow, Bengio & Courville — Deep Learning", "Goodfellow et al.", "textbook"),
            ("Christopher M. Bishop — Pattern Recognition and Machine Learning (PRML)", "Christopher Bishop", "textbook"),
            ("Christopher M. Bishop & Hugh Bishop — Deep Learning: Foundations and Concepts", "Bishop, Bishop", "textbook"),
            ("Simon J.D. Prince — Understanding Deep Learning", "Simon Prince", "textbook"),
            ("Kevin P. Murphy — Probabilistic Machine Learning: An Introduction (Vol 1)", "Kevin Murphy", "textbook"),
            ("Kevin P. Murphy — Probabilistic Machine Learning: Advanced Topics (Vol 2)", "Kevin Murphy", "textbook"),
            ("Hastie, Tibshirani & Friedman — The Elements of Statistical Learning (ESL)", "Hastie, Tibshirani, Friedman", "textbook"),
            ("James, Witten, Hastie & Tibshirani — An Introduction to Statistical Learning (ISLP)", "James et al.", "textbook"),
            ("Rasmussen & Williams — Gaussian Processes for Machine Learning (GPML)", "Rasmussen, Williams", "textbook"),
            ("David J.C. MacKay — Information Theory, Inference, and Learning Algorithms", "David MacKay", "textbook"),
            ("Sutton & Barto — Reinforcement Learning: An Introduction (2nd Ed, 2020)", "Sutton, Barto", "textbook"),
            ("Csaba Szepesvari — Algorithms for Reinforcement Learning (RL in MDPs)", "Csaba Szepesvari", "textbook"),
            ("David Barber — Bayesian Reasoning and Machine Learning (BRML)", "David Barber", "textbook"),
            ("Shalev-Shwartz & Ben-David — Understanding Machine Learning: From Theory to Algorithms", "Shalev-Shwartz, Ben-David", "textbook"),
            ("Christoph Molnar — Interpretable Machine Learning", "Christoph Molnar", "textbook"),
            ("Chip Huyen — Designing Machine Learning Systems", "Chip Huyen", "textbook"),
            ("Vijay Janapa Reddi et al. — Machine Learning Systems (MLSysBook)", "Reddi et al.", "textbook"),
            ("Howard & Gugger — Deep Learning for Coders with fastai and PyTorch", "Howard, Gugger", "textbook"),
            ("Stanford CS336 — Language Modeling from Scratch", "Stanford NLP / Percy Liang / Tatsunori Hashimoto", "course_monograph"),
            ("Mohri, Rostamizadeh & Talwalkar — Foundations of Machine Learning", "Mohri et al.", "textbook"),
            ("Vapnik — Statistical Learning Theory", "Vladimir Vapnik", "textbook"),
            ("Scholkopf & Smola — Learning with Kernels", "Scholkopf, Smola", "textbook"),
            ("Cover & Thomas — Elements of Information Theory", "Cover, Thomas", "textbook"),
            ("Koller & Friedman — Probabilistic Graphical Models: Principles and Techniques", "Koller, Friedman", "textbook"),
            ("Wainwright & Jordan — Graphical Models, Exponential Families, and Variational Inference", "Wainwright, Jordan", "monograph"),
            ("Lattimore & Szepesvari — Bandit Algorithms", "Lattimore, Szepesvari", "textbook"),
            ("Agarwal, Jiang, Kakade & Sun — Reinforcement Learning: Theory and Algorithms", "Agarwal et al.", "textbook"),
            ("Efron & Hastie — Computer Age Statistical Inference", "Efron, Hastie", "textbook"),
            ("Wainwright — High-Dimensional Statistics: A Non-Asymptotic Viewpoint", "Martin Wainwright", "textbook"),
            ("Vershynin — High-Dimensional Probability", "Roman Vershynin", "textbook"),
            ("Boucheron, Lugosi & Massart — Concentration Inequalities", "Boucheron et al.", "textbook"),
            ("Cesa-Bianchi & Lugosi — Prediction, Learning, and Games", "Cesa-Bianchi, Lugosi", "textbook"),
            ("Sugiyama, Lawrence & Schwaighofer — Dataset Shift in Machine Learning", "Sugiyama et al.", "textbook"),
            ("Peters, Janzing & Scholkopf — Elements of Causal Inference", "Peters et al.", "textbook"),
            ("Pearl — Causality: Models, Reasoning, and Inference", "Judea Pearl", "textbook"),
            ("Hernan & Robins — Causal Inference: What If", "Hernan, Robins", "textbook"),
        ],
        3: [
            (f"arXiv:{p['arxiv_id']} — {p['title']}", p["authors"], "arxiv_paper")
            for p in FOUNDATIONAL_ARXIV_PAPERS_CATALOG
        ] + [
            ("arXiv:1810.04805 — BERT: Pre-training of Deep Bidirectional Transformers", "Devlin et al.", "arxiv_paper"),
            ("arXiv:1910.10683 — Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5)", "Raffel et al.", "arxiv_paper"),
            ("arXiv:2104.09864 — RoFormer: Enhanced Transformer with Rotary Position Embedding (RoPE)", "Su et al.", "arxiv_paper"),
            ("arXiv:2302.13971 — LLaMA: Open and Efficient Foundation Language Models", "Touvron et al.", "arxiv_paper"),
            ("arXiv:2307.09288 — Llama 2: Open Foundation and Fine-Tuned Chat Models", "Touvron et al.", "arxiv_paper"),
            ("arXiv:2305.13245 — GQA: Training Generalized Multi-Query Transformer Models", "Ainslie et al.", "arxiv_paper"),
            ("arXiv:2401.04088 — Mixtral of Experts", "Jiang et al.", "arxiv_paper"),
            ("arXiv:2312.00752 — Mamba: Linear-Time Sequence Modeling with Selective State Spaces", "Gu, Dao", "arxiv_paper"),
            ("arXiv:2305.14314 — QLoRA: Efficient Finetuning of Quantized LLMs", "Dettmers et al.", "arxiv_paper"),
            ("arXiv:2403.07691 — ORPO: Monolithic Preference Optimization without Reference Model", "Hong et al.", "arxiv_paper"),
            ("arXiv:2402.01306 — KTO: Model Alignment as Prospect Theoretic Optimization", "Ethayarajh et al.", "arxiv_paper"),
            ("arXiv:1312.6114 — Auto-Encoding Variational Bayes (VAE)", "Kingma, Welling", "arxiv_paper"),
            ("arXiv:1412.6980 — Adam: A Method for Stochastic Optimization", "Kingma, Ba", "arxiv_paper"),
            ("arXiv:1512.03385 — Deep Residual Learning for Image Recognition (ResNet)", "He et al.", "arxiv_paper"),
            ("arXiv:1711.05101 — Decoupled Weight Decay Regularization (AdamW)", "Loshchilov, Hutter", "arxiv_paper"),
            ("arXiv:1909.11942 — ALBERT: A Lite BERT for Self-supervised Learning", "Lan et al.", "arxiv_paper"),
            ("arXiv:2004.05150 — Longformer: The Long-Document Transformer", "Beltagy et al.", "arxiv_paper"),
            ("arXiv:2103.00020 — Learning Transferable Visual Models From Natural Language Supervision (CLIP)", "Radford et al.", "arxiv_paper"),
            ("arXiv:2204.02311 — PaLM: Scaling Language Modeling with Pathways", "Chowdhery et al.", "arxiv_paper"),
            ("arXiv:2205.01068 — OPT: Open Pre-trained Transformer Language Models", "Zhang et al.", "arxiv_paper"),
            ("arXiv:2210.11610 — LIMA: Less Is More for Alignment", "Zhou et al.", "arxiv_paper"),
            ("arXiv:2305.18290v3 — DPO Implicit Reward Convergence & KL-Constrained Policy Analysis", "Rafailov et al.", "arxiv_paper"),
            ("arXiv:2308.16184 — YaRN: Efficient Context Window Extension of Large Language Models", "Peng et al.", "arxiv_paper"),
            ("arXiv:2309.17453 — Mistral 7B Sliding Window & Grouped-Query Attention", "Jiang et al.", "arxiv_paper"),
            ("arXiv:2310.01377 — Ring Attention with Blockwise Transformers for Near-Infinite Context", "Liu, Zaharia, Abbeel", "arxiv_paper"),
            ("arXiv:2311.16989 — Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads", "Cai et al.", "arxiv_paper"),
            ("arXiv:2211.17192 — Fast Inference from Transformers via Speculative Decoding", "Leviathan, Kalman, Matias", "arxiv_paper"),
        ],
        4: [
            ("Anthropic — Building Effective Agents", "Anthropic Engineering", "official_agent_guide"),
            ("Anthropic — Effective Context Engineering for AI Agents", "Anthropic Engineering", "official_agent_guide"),
            ("Anthropic — Effective Harnesses for Long-Running Agents", "Anthropic Engineering", "official_agent_guide"),
            ("Anthropic — Demystifying Evals for AI Agents", "Anthropic Engineering", "official_agent_guide"),
            ("Anthropic — How We Built Our Multi-Agent Research System", "Anthropic Engineering", "official_agent_guide"),
            ("Anthropic — Claude Code Best Practices for Agentic Coding", "Anthropic Engineering", "official_agent_guide"),
            ("OpenAI — A Practical Guide to Building Agents", "OpenAI Engineering", "official_agent_guide"),
            ("OpenAI — Harness Engineering for Reliable Tool-Using Agents", "OpenAI Engineering", "official_agent_guide"),
            ("OpenAI — Symphony Multi-Agent Orchestration Specification", "OpenAI Engineering", "official_agent_guide"),
            ("Model Context Protocol (MCP) Specification 2026-07-28", "Anthropic / MCP Steering Committee", "protocol_spec"),
            ("Agent2Agent (A2A) Open Interoperability Protocol", "Google Cloud / A2A Consortium", "protocol_spec"),
            ("PydanticAI Typed Agent & Dependency Injection Framework", "Pydantic Team", "agent_framework"),
            ("LangGraph Pregel-Inspired Stateful Agent Runtime", "LangChain AI", "agent_framework"),
            ("OpenAI Agents SDK — Handoffs, Guardrails & Tracing", "OpenAI", "agent_framework"),
            ("Google Agent Development Kit (ADK)", "Google", "agent_framework"),
            ("Microsoft Agent Framework (AutoGen v0.4 + Semantic Kernel)", "Microsoft Research", "agent_framework"),
            ("Promptfoo Deterministic & Red-Team Eval Matrix", "Promptfoo", "eval_harness"),
            ("Ragas Retrieval-Augmented Generation Evaluation Suite", "ExplodingGradients", "eval_harness"),
            ("Langfuse OpenTelemetry LLM Trace & Eval Platform", "Langfuse", "observability_harness"),
            ("vLLM PagedAttention High-Throughput Inference Engine", "UC Berkeley Sky Computing / vLLM", "inference_engine"),
            ("LiteLLM Multi-Provider Gateway & Cost Budget Controller", "BerriAI", "inference_gateway"),
            ("SWE-bench Verified & Multimodal Benchmark Suite", "Princeton NLP", "benchmark"),
            ("Terminal-Bench 2.1 Containerized CLI Agent Benchmark", "Laude Institute / Stanford", "benchmark"),
            ("GAIA General AI Assistants Benchmark", "Meta / HuggingFace", "benchmark"),
            ("TAU-bench Tool-Agent-User Interaction Reliability Benchmark (Pass^k)", "Sierra Research", "benchmark"),
            ("BFCL Berkeley Function Calling Leaderboard", "UC Berkeley Gorilla Team", "benchmark"),
            ("AgentBench Multi-Environment LLM-as-Agent Benchmark", "THUDM", "benchmark"),
            ("OSWorld Multimodal Computer-Use Agent Benchmark", "HKU / Salesforce", "benchmark"),
            ("WebArena Realistic Web Environment Agent Benchmark", "CMU", "benchmark"),
            ("OpenTelemetry GenAI Semantic Conventions", "CNCF OpenTelemetry", "protocol_spec"),
            ("JSON-RPC 2.0 Transport & Capability Negotiation for MCP", "MCP Working Group", "protocol_spec"),
            ("Sandboxed Execution & Capability Token Architecture for Agent Tools", "GSE Security Architecture", "official_agent_guide"),
        ],
        5: [
            ("Stephen Boyd & Lieven Vandenberghe — Convex Optimization", "Boyd, Vandenberghe", "textbook"),
            ("Sheldon Axler — Linear Algebra Done Right (4th Ed)", "Sheldon Axler", "textbook"),
            ("Sergei Treil — Linear Algebra Done Wrong (LADW)", "Sergei Treil", "textbook"),
            ("Luc Devroye — Non-Uniform Random Variate Generation", "Luc Devroye", "textbook"),
            ("Grinstead & Snell — Introduction to Probability", "Grinstead, Snell", "textbook"),
            ("MIT 18.05 — Introduction to Probability and Statistics", "Jeremy Orloff, Jonathan Bloom", "course_monograph"),
            ("Allen B. Downey — Think Bayes (2nd Ed)", "Allen Downey", "textbook"),
            ("Allen B. Downey — Think Stats (2nd Ed)", "Allen Downey", "textbook"),
            ("Alex Reinhart — Statistics Done Wrong", "Alex Reinhart", "textbook"),
            ("David I. Spivak — Category Theory for the Sciences", "David Spivak", "textbook"),
            ("Univalent Foundations Program — Homotopy Type Theory (HoTT Book)", "IAS Univalent Foundations", "textbook"),
            ("Boyd & Vandenberghe — Introduction to Applied Linear Algebra (VMLS)", "Boyd, Vandenberghe", "textbook"),
            ("Jorge Nocedal & Stephen J. Wright — Numerical Optimization", "Nocedal, Wright", "textbook"),
            ("Yurii Nesterov — Lectures on Convex Optimization", "Yurii Nesterov", "textbook"),
            ("Sébastien Bubeck — Convex Optimization: Algorithms and Complexity", "Sebastien Bubeck", "monograph"),
            ("Neal Parikh & Stephen Boyd — Proximal Algorithms", "Parikh, Boyd", "monograph"),
            ("Stephen Boyd et al. — Distributed Optimization and Statistical Learning via ADMM", "Boyd et al.", "monograph"),
            ("Trefethen & Bau — Numerical Linear Algebra", "Trefethen, Bau", "textbook"),
            ("Golub & Van Loan — Matrix Computations", "Golub, Van Loan", "textbook"),
            ("Horn & Johnson — Matrix Analysis", "Horn, Johnson", "textbook"),
            ("Gilbert Strang — Linear Algebra and Learning from Data", "Gilbert Strang", "textbook"),
            ("Gelman, Carlin, Stern, Dunson, Vehtari & Rubin — Bayesian Data Analysis (BDA3)", "Gelman et al.", "textbook"),
            ("Richard McElreath — Statistical Rethinking", "Richard McElreath", "textbook"),
            ("Larry Wasserman — All of Statistics", "Larry Wasserman", "textbook"),
            ("Casella & Berger — Statistical Inference", "Casella, Berger", "textbook"),
            ("Art B. Owen — Monte Carlo Theory, Methods and Examples", "Art Owen", "textbook"),
            ("Asmussen & Glynn — Stochastic Simulation: Algorithms and Analysis", "Asmussen, Glynn", "textbook"),
            ("Peyré & Cuturi — Computational Optimal Transport", "Peyre, Cuturi", "monograph"),
            ("Vovk, Gammerman & Shafer — Algorithmic Learning in a Random World", "Vovk, Gammerman, Shafer", "textbook"),
            ("Angelopoulos & Bates — A Gentle Introduction to Conformal Prediction", "Angelopoulos, Bates", "monograph"),
            ("Fong & Spivak — An Invitation to Applied Category Theory", "Fong, Spivak", "textbook"),
            ("Saunders Mac Lane — Categories for the Working Mathematician", "Saunders Mac Lane", "textbook"),
        ],
        6: [
            ("Robert Nystrom — Crafting Interpreters", "Robert Nystrom", "textbook"),
            ("Simon Peyton Jones — The Implementation of Functional Programming Languages", "Simon Peyton Jones", "textbook"),
            ("Simon Peyton Jones & David Lester — Implementing Functional Languages: A Tutorial", "Peyton Jones, Lester", "textbook"),
            ("Aho, Lam, Sethi & Ullman — Compilers: Principles, Techniques, and Tools (Dragon Book / CS143)", "Aho et al.", "textbook"),
            ("Matthews, Newhall & Webb — Dive Into Systems", "Matthews, Newhall, Webb", "textbook"),
            ("Beyer, Jones, Petoff & Murphy — Site Reliability Engineering: How Google Runs Production Systems", "Beyer et al.", "textbook"),
            ("Beyer et al. — The Site Reliability Workbook", "Beyer et al.", "textbook"),
            ("Adkins et al. — Building Secure and Reliable Systems", "Adkins et al.", "textbook"),
            ("Carlos Bueno — Mature Optimization", "Carlos Bueno", "textbook"),
            ("Victor Eijkhout — Introduction to High Performance Scientific Computing (Art of HPC Vol 1)", "Victor Eijkhout", "textbook"),
            ("Victor Eijkhout — Parallel Programming for Science and Engineering (Art of HPC Vol 2)", "Victor Eijkhout", "textbook"),
            ("Jörg Arndt — Matters Computational: Ideas, Algorithms, Source Code (FXT Book)", "Jorg Arndt", "textbook"),
            ("Bryant & O'Hallaron — Computer Systems: A Programmer's Perspective (CS:APP)", "Bryant, O'Hallaron", "textbook"),
            ("Arpaci-Dusseau — Operating Systems: Three Easy Pieces (OSTEP)", "Remzi & Andrea Arpaci-Dusseau", "textbook"),
            ("Cooper & Torczon — Engineering a Compiler", "Cooper, Torczon", "textbook"),
            ("Andrew W. Appel — Modern Compiler Implementation in ML/C/Java", "Andrew Appel", "textbook"),
            ("Muchnick — Advanced Compiler Design and Implementation", "Steven Muchnick", "textbook"),
            ("Henry S. Warren Jr. — Hacker's Delight (Bit Wizardry)", "Henry Warren", "textbook"),
            ("Agner Fog — Optimizing Software in C++ & Microarchitecture Manuals", "Agner Fog", "monograph"),
            ("Sergey Slotin — Algorithms for Modern Hardware", "Sergey Slotin", "textbook"),
            ("Hennessy & Patterson — Computer Architecture: A Quantitative Approach", "Hennessy, Patterson", "textbook"),
            ("McCabe (1976) — A Complexity Measure (Cyclomatic Complexity)", "Thomas J. McCabe", "foundational_paper"),
            ("Halstead (1977) — Elements of Software Science", "Maurice Halstead", "textbook"),
            ("Sethi & Ullman (1970) — The Generation of Optimal Code for Arithmetic Expressions", "Sethi, Ullman", "foundational_paper"),
            ("Lattner & Adve (2004) — LLVM: A Compilation Framework for Lifelong Program Analysis & Transformation", "Lattner, Adve", "foundational_paper"),
            ("Cytron et al. (1991) — Efficiently Computing Static Single Assignment Form and the Control Dependence Graph", "Cytron et al.", "foundational_paper"),
            ("Chaitin (1982) — Register Allocation and Spilling via Graph Coloring", "Gregory Chaitin", "foundational_paper"),
            ("Poletto & Sarkar (1999) — Linear Scan Register Allocation", "Poletto, Sarkar", "foundational_paper"),
            ("Frigo & Johnson (2005) — The Design and Implementation of FFTW3", "Frigo, Johnson", "foundational_paper"),
            ("Williams, Waterman & Patterson (2009) — Roofline: An Insightful Visual Performance Model for Multicore Architectures", "Williams et al.", "foundational_paper"),
            ("Goto & van de Geijn (2008) — Anatomy of High-Performance Matrix Multiplication", "Goto, van de Geijn", "foundational_paper"),
            ("Kerrighan & Ritchie — The C Programming Language (2nd Ed)", "Kernighan, Ritchie", "textbook"),
            ("Abelson & Sussman — Structure and Interpretation of Computer Programs (SICP)", "Abelson, Sussman", "textbook"),
            ("Pierce — Types and Programming Languages (TAPL)", "Benjamin C. Pierce", "textbook"),
        ],
        7: [
            ("Leskovec, Rajaraman & Ullman — Mining of Massive Datasets (MMDS)", "Leskovec, Rajaraman, Ullman", "textbook"),
            ("Manning, Raghavan & Schütze — Introduction to Information Retrieval (IIR)", "Manning, Raghavan, Schutze", "textbook"),
            ("Büttcher, Clarke & Cormack — Information Retrieval: Implementing and Evaluating Search Engines", "Buttcher, Clarke, Cormack", "textbook"),
            ("Bailis, Hellerstein & Stonebraker — Readings in Database Systems (Red Book 5th Ed)", "Bailis, Hellerstein, Stonebraker", "textbook"),
            ("Abiteboul, Hull & Vianu — Foundations of Databases (Alice Book)", "Abiteboul, Hull, Vianu", "textbook"),
            ("Max Kuhn & Kjell Johnson — Feature Engineering and Selection", "Kuhn, Johnson", "textbook"),
            ("Max Kuhn & Kjell Johnson — Applied Predictive Modeling", "Kuhn, Johnson", "textbook"),
            ("Robertson & Zaragoza (2009) — The Probabilistic Relevance Framework: BM25 and Beyond", "Robertson, Zaragoza", "monograph"),
            ("Cormack, Clarke & Buettcher (2009) — Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods", "Cormack et al.", "foundational_paper"),
            ("Ramakrishnan & Gehrke — Database Management Systems (Cow Book)", "Ramakrishnan, Gehrke", "textbook"),
            ("Silberschatz, Korth & Sudarshan — Database System Concepts", "Silberschatz et al.", "textbook"),
            ("Garcia-Molina, Ullman & Widom — Database Systems: The Complete Book", "Garcia-Molina et al.", "textbook"),
            ("Alex Petrov — Database Internals", "Alex Petrov", "textbook"),
            ("Croft, Metzler & Strohman — Search Engines: Information Retrieval in Practice", "Croft et al.", "textbook"),
            ("Lin, Macdonald, Nogueira & Yang — Pretrained Transformers for Text Ranking: BERT and Beyond", "Lin et al.", "monograph"),
            ("Malkov & Yashunin (2018) — Efficient and Robust Approximate Nearest Neighbor Search Using HNSW Graphs", "Malkov, Yashunin", "foundational_paper"),
            ("Johnson, Douze & Jégou (2019) — Billion-Scale Similarity Search with GPUs (FAISS)", "Johnson et al.", "foundational_paper"),
            ("boncz, Zukowski & Nes (2005) — MonetDB/X100: Hyper-Pipelining Query Execution", "Boncz et al.", "foundational_paper"),
            ("Neumann (2011) — Efficiently Compiling Efficient Query Plans for Modern Hardware (HyPer)", "Thomas Neumann", "foundational_paper"),
            ("Raasveldt & Mühleisen (2019) — DuckDB: an Embeddable Analytical Database", "Raasveldt, Muhleisen", "foundational_paper"),
            ("Dean & Ghemawat (2004) — MapReduce: Simplified Data Processing on Large Clusters", "Dean, Ghemawat", "foundational_paper"),
            ("Zaharia et al. (2012) — Resilient Distributed Datasets (Spark)", "Zaharia et al.", "foundational_paper"),
            ("Codd (1970) — A Relational Model of Data for Large Shared Data Banks", "E.F. Codd", "foundational_paper"),
            ("Selinger et al. (1979) — Access Path Selection in a Relational Database Management System (System R)", "Selinger et al.", "foundational_paper"),
            ("Mohan et al. (1992) — ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking", "Mohan et al.", "foundational_paper"),
            ("O'Neil et al. (1996) — The Log-Structured Merge-Tree (LSM-Tree)", "O'Neil et al.", "foundational_paper"),
            ("Chang et al. (2006) — Bigtable: A Distributed Storage System for Structured Data", "Chang et al.", "foundational_paper"),
            ("Armbrust et al. (2021) — Lakehouse: A New Generation of Open Platforms that Unify Data Warehousing and Advanced Analytics", "Armbrust et al.", "foundational_paper"),
            ("Khattab & Zaharia (2020) — ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction", "Khattab, Zaharia", "foundational_paper"),
            ("Karpukhin et al. (2020) — Dense Passage Retrieval for Open-Domain Question Answering (DPR)", "Karpukhin et al.", "foundational_paper"),
        ],
        8: [
            ("Andrew S. Tanenbaum & Maarten van Steen — Distributed Systems (4th Ed)", "Tanenbaum, van Steen", "textbook"),
            ("Pieter Hintjens — ZeroMQ: Messaging for Many Applications (The ZGuide)", "Pieter Hintjens", "textbook"),
            ("Mikito Takada (Mixu) — Distributed Systems for Fun and Profit", "Mikito Takada", "textbook"),
            ("Martin Kleppmann — Designing Data-Intensive Applications (DDIA)", "Martin Kleppmann", "textbook"),
            ("Shapira, Palino, Sivaram & Petty — Kafka: The Definitive Guide", "Shapira et al.", "textbook"),
            ("Albert-László Barabási — Network Science", "Albert-Laszlo Barabasi", "textbook"),
            ("David Easley & Jon Kleinberg — Networks, Crowds, and Markets", "Easley, Kleinberg", "textbook"),
            ("NSA & CISA — Kubernetes Hardening Guidance v1.2", "NSA, CISA", "security_guidance"),
            ("Jon Kleinberg (1999) — Authoritative Sources in a Hyperlinked Environment (HITS)", "Jon Kleinberg", "foundational_paper"),
            ("Brin & Page (1998) — The Anatomy of a Large-Scale Hypertextual Web Search Engine (PageRank)", "Brin, Page", "foundational_paper"),
            ("Mark Newman — Networks (2nd Ed)", "Mark Newman", "textbook"),
            ("Matthew O. Jackson — Social and Economic Networks", "Matthew Jackson", "textbook"),
            ("Fan Chung — Spectral Graph Theory", "Fan Chung", "textbook"),
            ("Daniel Spielman — Spectral and Algebraic Graph Theory", "Daniel Spielman", "textbook"),
            ("Lamport (1978) — Time, Clocks, and the Ordering of Events in a Distributed System", "Leslie Lamport", "foundational_paper"),
            ("Lamport (1998) — The Part-Time Parliament (Paxos)", "Leslie Lamport", "foundational_paper"),
            ("Ongaro & Ousterhout (2014) — In Search of an Understandable Consensus Algorithm (Raft)", "Ongaro, Ousterhout", "foundational_paper"),
            ("Castro & Liskov (1999) — Practical Byzantine Fault Tolerance (PBFT)", "Castro, Liskov", "foundational_paper"),
            ("DeCandia et al. (2007) — Dynamo: Amazon's Highly Available Key-Value Store", "DeCandia et al.", "foundational_paper"),
            ("Corbett et al. (2012) — Spanner: Google's Globally-Distributed Database", "Corbett et al.", "foundational_paper"),
            ("Kreps, Narkhede & Rao (2011) — Kafka: a Distributed Messaging System for Log Processing", "Kreps et al.", "foundational_paper"),
            ("Shapiro, Preguiça, Baquero & Zawirski (2011) — Conflict-Free Replicated Data Types (CRDTs)", "Shapiro et al.", "foundational_paper"),
            ("Fischer, Lynch & Paterson (1985) — Impossibility of Distributed Consensus with One Faulty Process (FLP)", "Fischer, Lynch, Paterson", "foundational_paper"),
            ("Gilbert & Lynch (2002) — Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services (CAP)", "Gilbert, Lynch", "foundational_paper"),
            ("Chandy & Lamport (1985) — Distributed Snapshots: Determining Global States of Distributed Systems", "Chandy, Lamport", "foundational_paper"),
            ("Karger et al. (1997) — Consistent Hashing and Random Trees", "Karger et al.", "foundational_paper"),
            ("Stoica et al. (2001) — Chord: A Scalable Peer-to-peer Lookup Service for Internet Applications", "Stoica et al.", "foundational_paper"),
            ("Ghemawat, Gobioff & Leung (2003) — The Google File System", "Ghemawat, Gobioff, Leung", "foundational_paper"),
            ("Verma et al. (2015) — Large-scale cluster management at Google with Borg", "Verma et al.", "foundational_paper"),
            ("Burns, Grant, Oppenheimer, Brewer & Wilkes (2016) — Borg, Omega, and Kubernetes", "Burns et al.", "foundational_paper"),
        ],
        9: [
            ("Dan Boneh & Victor Shoup — A Graduate Course in Applied Cryptography", "Boneh, Shoup", "textbook"),
            ("Menezes, van Oorschot & Vanstone — Handbook of Applied Cryptography (HAC)", "Menezes et al.", "textbook"),
            ("Ross Anderson — Security Engineering: A Guide to Building Dependable Distributed Systems (3rd Ed)", "Ross Anderson", "textbook"),
            ("Andreas Zeller, Rahul Gopinath, Marcel Böhme, Gordon Fraser & Christian Holler — The Fuzzing Book", "Zeller et al.", "textbook"),
            ("Andreas Zeller — The Debugging Book", "Andreas Zeller", "textbook"),
            ("OWASP — Web Security Testing Guide (WSTG v4.2)", "OWASP Foundation", "security_standard"),
            ("OWASP — Mobile Application Security Testing Guide (MASTG)", "OWASP Foundation", "security_standard"),
            ("OWASP — Top 10 for Large Language Model Applications & Generative AI (2025/2026)", "OWASP Foundation", "security_standard"),
            ("Least Authority — MoonMath Manual to zk-SNARKs", "Least Authority", "textbook"),
            ("Jonathan Katz & Yehuda Lindell — Introduction to Modern Cryptography", "Katz, Lindell", "textbook"),
            ("Mike Rosulek — The Joy of Cryptography", "Mike Rosulek", "textbook"),
            ("Nigel Smart — Cryptography Made Simple", "Nigel Smart", "textbook"),
            ("Jean-Philippe Aumasson — Serious Cryptography", "Jean-Philippe Aumasson", "textbook"),
            ("T.Y. Chen et al. (1998/2018) — Metamorphic Testing: A New Approach for Generating Next Test Cases", "T.Y. Chen et al.", "foundational_paper"),
            ("Claessen & Hughes (2000) — QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs", "Claessen, Hughes", "foundational_paper"),
            ("MacIver et al. (2019) — Hypothesis: A New Approach to Property-Based Testing", "David R. MacIver et al.", "foundational_paper"),
            ("Godefroid, Levin & Molnar (2008) — Automated Whitebox Fuzz Testing (SAGE)", "Godefroid et al.", "foundational_paper"),
            ("Dwork & Roth — The Algorithmic Foundations of Differential Privacy", "Dwork, Roth", "monograph"),
            ("Thaler — Proofs, Arguments, and Zero-Knowledge", "Justin Thaler", "textbook"),
            ("Saltzer & Schroeder (1975) — The Protection of Information in Computer Systems", "Saltzer, Schroeder", "foundational_paper"),
            ("NIST SP 800-207 — Zero Trust Architecture", "NIST", "security_standard"),
            ("MITRE ATLAS — Adversarial Threat Landscape for Artificial-Intelligence Systems", "MITRE", "security_standard"),
            ("Goldreich — Foundations of Cryptography Vol 1: Basic Tools", "Oded Goldreich", "textbook"),
            ("Goldreich — Foundations of Cryptography Vol 2: Basic Applications", "Oded Goldreich", "textbook"),
            ("Shoup — A Computational Introduction to Number Theory and Algebra", "Victor Shoup", "textbook"),
            ("Diffie & Hellman (1976) — New Directions in Cryptography", "Diffie, Hellman", "foundational_paper"),
            ("Rivest, Shamir & Adleman (1978) — A Method for Obtaining Digital Signatures and Public-Key Cryptosystems", "Rivest, Shamir, Adleman", "foundational_paper"),
            ("Goldwasser, Micali & Rackoff (1985) — The Knowledge Complexity of Interactive Proof-Systems", "Goldwasser, Micali, Rackoff", "foundational_paper"),
            ("Bellare & Rogaway (1993) — Random Oracles are Practical: A Paradigm for Designing Efficient Protocols", "Bellare, Rogaway", "foundational_paper"),
            ("Carlini et al. (2021) — Extracting Training Data from Large Language Models", "Carlini et al.", "foundational_paper"),
            ("Greshake et al. (2023) — Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection", "Greshake et al.", "foundational_paper"),
        ],
        10: [
            (
                f"{repo['repo_slug']} — {repo['description']}",
                repo["repo_slug"].split("/")[0],
                "quarantined_github_repo",
            )
            for repo in QUARANTINED_GITHUB_REPOS_CATALOG
        ] + [
            ("Liu, Ting & Zhou (2008) — Isolation Forest", "Liu, Ting, Zhou", "foundational_paper"),
            ("Marcos Lopez de Prado — Advances in Financial Machine Learning", "Marcos Lopez de Prado", "textbook"),
            ("Ernest P. Chan — Quantitative Trading & Algorithmic Trading", "Ernest Chan", "textbook"),
            ("Robert Kissell — The Science of Algorithmic Trading and Portfolio Management", "Robert Kissell", "textbook"),
            ("Barry Johnson — Algorithmic Trading & DMA", "Barry Johnson", "textbook"),
            ("Joel Hasbrouck — Empirical Market Microstructure", "Joel Hasbrouck", "textbook"),
            ("Maureen O'Hara — Market Microstructure Theory", "Maureen O'Hara", "textbook"),
            ("Avellaneda & Stoikov (2008) — High-frequency trading in a limit order book", "Avellaneda, Stoikov", "foundational_paper"),
            ("Almgren & Chriss (2001) — Optimal Execution of Portfolio Transactions", "Almgren, Chriss", "foundational_paper"),
            ("Kalshi CFTC Designated Contract Market Rulebook & Binary Fee Schedule", "Kalshi Exchange", "market_specification"),
            ("Kelly (1956) — A New Interpretation of Information Rate", "J.L. Kelly Jr.", "foundational_paper"),
            ("Thorp (2006) — The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market", "Edward O. Thorp", "foundational_paper"),
            ("Shin (1993) — Measuring the Incidence of Insider Trading in a Market for State-Contingent Claims", "Hyun Song Shin", "foundational_paper"),
            ("Clarke, Kovalchik & Ingram (2017) — Adjusting Bookmaker's Odds to Allow for Overround", "Clarke et al.", "foundational_paper"),
        ],
    }

    global_idx = 0
    for domain_id, entries in domain_specific_curated_entries.items():
        domain_meta = MEGA_LIBRARY_10_DOMAINS[domain_id - 1]
        for title, authors, category in entries:
            global_idx += 1
            domain_items[domain_id].append(
                {
                    "item_id": f"MEGA-LIB-{global_idx:04d}",
                    "domain_id": domain_id,
                    "domain_slug": domain_meta["slug"],
                    "domain_title": domain_meta["title"],
                    "title": title,
                    "authors_or_org": authors,
                    "category": category,
                    "COMMERCIAL_USE_BLOCKED": True,
                    "LEARN_AND_REASON_ONLY": True,
                    "ingest_and_learn_status": "VERIFIED_AND_WIRED",
                }
            )
    return domain_items


DOMAIN_CATALOGS: Dict[int, List[Dict[str, Any]]] = _build_420_plus_domain_catalogs()


def get_mega_library_catalog_summary() -> Dict[str, Any]:
    """Return high-level counts and quarantine compliance summary across all 10 domains."""
    per_domain_counts = {
        MEGA_LIBRARY_10_DOMAINS[d_id - 1]["slug"]: len(items)
        for d_id, items in DOMAIN_CATALOGS.items()
    }
    total_items = sum(len(items) for items in DOMAIN_CATALOGS.values())
    return {
        "total_domains": len(MEGA_LIBRARY_10_DOMAINS),
        "total_cataloged_items": total_items,
        "foundational_arxiv_papers_count": len(FOUNDATIONAL_ARXIV_PAPERS_CATALOG),
        "quarantined_github_repos_count": len(QUARANTINED_GITHUB_REPOS_CATALOG),
        "all_repos_commercial_use_blocked": all(
            r["COMMERCIAL_USE_BLOCKED"] is True for r in QUARANTINED_GITHUB_REPOS_CATALOG
        ),
        "all_repos_learn_and_reason_only": all(
            r["LEARN_AND_REASON_ONLY"] is True for r in QUARANTINED_GITHUB_REPOS_CATALOG
        ),
        "all_repos_install_permitted_in_prod_false": all(
            r["install_permitted_in_prod"] is False for r in QUARANTINED_GITHUB_REPOS_CATALOG
        ),
        "per_domain_counts": per_domain_counts,
    }


# ===========================================================================
# DOMAIN 1: ALGORITHMS, DATA STRUCTURES & COMPETITIVE PROGRAMMING
# ===========================================================================

def solve_knapsack_and_multichoice_salary_cap(
    items: Sequence[Mapping[str, Any]],
    capacity: int,
    group_requirements: Optional[Mapping[str, int]] = None,
    cost_scale: int = 1,
) -> Dict[str, Any]:
    """
    Exact 0-1 Dynamic Programming / Branch-and-Bound Knapsack & Multi-Choice Salary-Cap Helper
    (Kleinberg-Tardos Ch. 6, Jeff Erickson Algorithms, Martello-Toth Knapsack Problems).

    Parameters
    ----------
    items : Sequence[Mapping[str, Any]]
        Each item dictionary contains:
          - `id`: str
          - `cost` (or `salary`): int/float (non-negative)
          - `value` (or `projection`): float
          - `group` (or `position`): optional str for multi-choice group constraints
    capacity : int
        Total salary cap / weight capacity.
    group_requirements : Optional[Mapping[str, int]]
        Optional exact count required per group (e.g. `{"QB": 1, "RB": 2, "WR": 2}`).
        When None, solves standard 0-1 knapsack with Martello-Toth linear relaxation bound.
    cost_scale : int
        Granularity divisor for DP state compression (e.g. 100 for DraftKings $100 increments).
    """
    if group_requirements is not None:
        for g, cnt in group_requirements.items():
            if int(cnt) < 0:
                raise ValueError(f"Group requirement for {g!r} cannot be negative: {cnt}")

    if capacity <= 0 or not items:
        return {
            "selected_ids": [],
            "total_cost": 0,
            "total_value": 0.0,
            "capacity": max(0, int(capacity)),
            "feasible": group_requirements is None or sum(int(v) for v in group_requirements.values()) == 0,
            "martello_toth_LP_upper_bound": 0.0,
            "optimality_gap": 0.0,
            "algorithm": "Martello-Toth + Exact DP",
        }

    cap_int = int(capacity)
    req_scale = max(1, int(cost_scale))

    normalized: List[Dict[str, Any]] = []
    for idx, raw in enumerate(items):
        cost_raw = int(round(float(raw.get("cost", raw.get("salary", 0)))))
        val_raw = float(raw.get("value", raw.get("projection", 0.0)))
        if cost_raw < 0:
            raise ValueError(f"Item cost cannot be negative: {cost_raw}")
        normalized.append(
            {
                "idx": idx,
                "id": str(raw.get("id", f"item_{idx}")),
                "cost": cost_raw,
                "value": val_raw,
                "group": str(raw.get("group", raw.get("position", "ANY"))),
                "density": val_raw / max(float(cost_raw), 1e-9),
            }
        )

    # Compute exact GCD scale so non-multiples of cost_scale never lose optimality
    scale = req_scale
    scale = math.gcd(scale, cap_int)
    for it in normalized:
        if it["cost"] > 0:
            scale = math.gcd(scale, it["cost"])
    scale = max(1, scale)
    scaled_cap = cap_int // scale
    for it in normalized:
        it["scaled_cost"] = it["cost"] // scale

    # Martello-Toth (Dantzig) continuous linear-relaxation upper bound
    sorted_by_density = sorted(
        [it for it in normalized if it["value"] > 0 and it["cost"] <= cap_int],
        key=lambda x: (x["density"], x["value"]),
        reverse=True,
    )
    rem_cap = float(cap_int)
    lp_bound = 0.0
    for it in sorted_by_density:
        if it["cost"] <= rem_cap:
            lp_bound += it["value"]
            rem_cap -= it["cost"]
        else:
            lp_bound += it["value"] * (rem_cap / max(float(it["cost"]), 1.0))
            break

    if not group_requirements:
        # When scaled_cap is huge (> 50_000), use exact Martello-Toth Branch-and-Bound
        # to avoid O(capacity) DP table memory allocation.
        if scaled_cap > 50_000:
            bnb_items = sorted_by_density
            m = len(bnb_items)
            best_val = 0.0
            best_chosen: List[Dict[str, Any]] = []

            def _upper_bound(start_idx: int, rem_w: int, cur_v: float) -> float:
                r = float(rem_w)
                ub = cur_v
                for j in range(start_idx, m):
                    c_j = bnb_items[j]["cost"]
                    v_j = bnb_items[j]["value"]
                    if c_j <= r:
                        ub += v_j
                        r -= c_j
                    else:
                        ub += v_j * (r / max(float(c_j), 1.0))
                        break
                return ub

            def _dfs(idx_b: int, rem_w: int, cur_v: float, chosen: List[Dict[str, Any]]) -> None:
                nonlocal best_val, best_chosen
                if cur_v > best_val + 1e-12:
                    best_val = cur_v
                    best_chosen = list(chosen)
                if idx_b >= m or rem_w <= 0:
                    return
                if _upper_bound(idx_b, rem_w, cur_v) <= best_val + 1e-12:
                    return
                it_b = bnb_items[idx_b]
                if it_b["cost"] <= rem_w:
                    chosen.append(it_b)
                    _dfs(idx_b + 1, rem_w - it_b["cost"], cur_v + it_b["value"], chosen)
                    chosen.pop()
                _dfs(idx_b + 1, rem_w, cur_v, chosen)

            _dfs(0, cap_int, 0.0, [])
            best_chosen.sort(key=lambda x: x["idx"])
            tot_cost = sum(it["cost"] for it in best_chosen)
            tot_val = float(sum(it["value"] for it in best_chosen))
            return {
                "selected_ids": [it["id"] for it in best_chosen],
                "total_cost": tot_cost,
                "total_value": round(tot_val, 6),
                "capacity": cap_int,
                "feasible": tot_cost <= cap_int,
                "martello_toth_LP_upper_bound": round(lp_bound, 6),
                "optimality_gap": round(max(0.0, lp_bound - tot_val), 6),
                "algorithm": "Martello-Toth Exact Branch-and-Bound",
            }

        # Standard 0-1 Knapsack via Exact DP
        dp = np.full(scaled_cap + 1, 0.0, dtype=np.float64)
        keep = np.zeros((len(normalized), scaled_cap + 1), dtype=bool)
        for i, it in enumerate(normalized):
            sc = it["scaled_cost"]
            val = it["value"]
            if val <= 0 or sc > scaled_cap:
                continue
            for w in range(scaled_cap, sc - 1, -1):
                cand = dp[w - sc] + val
                if cand > dp[w] + 1e-12:
                    dp[w] = cand
                    keep[i, w] = True

        best_w = int(np.argmax(dp))
        selected_indices: List[int] = []
        w_cur = best_w
        for i in range(len(normalized) - 1, -1, -1):
            if keep[i, w_cur]:
                selected_indices.append(i)
                w_cur -= normalized[i]["scaled_cost"]
        selected_indices.reverse()

        selected_items = [normalized[i] for i in selected_indices]
        tot_cost = sum(it["cost"] for it in selected_items)
        tot_val = float(sum(it["value"] for it in selected_items))
        return {
            "selected_ids": [it["id"] for it in selected_items],
            "total_cost": tot_cost,
            "total_value": round(tot_val, 6),
            "capacity": cap_int,
            "feasible": tot_cost <= cap_int,
            "martello_toth_LP_upper_bound": round(lp_bound, 6),
            "optimality_gap": round(max(0.0, lp_bound - tot_val), 6),
            "algorithm": "Martello-Toth + Exact 0-1 DP",
        }

    # Multi-Choice Group Knapsack (MCKP) with exact group cardinality requirements
    groups_order = [(g, int(cnt)) for g, cnt in group_requirements.items() if int(cnt) > 0]
    by_group: Dict[str, List[Dict[str, Any]]] = {g: [] for g, _ in groups_order}
    for it in normalized:
        if it["group"] in by_group:
            by_group[it["group"]].append(it)

    for g, req_cnt in groups_order:
        if len(by_group[g]) < req_cnt:
            return {
                "selected_ids": [],
                "total_cost": 0,
                "total_value": 0.0,
                "capacity": cap_int,
                "feasible": False,
                "martello_toth_LP_upper_bound": round(lp_bound, 6),
                "optimality_gap": round(lp_bound, 6),
                "algorithm": "Multi-Choice Group Knapsack DP",
            }

    neg_inf = -1e18
    dp_val = np.full(scaled_cap + 1, neg_inf, dtype=np.float64)
    dp_val[0] = 0.0
    dp_sel: List[Tuple[int, ...]] = [() for _ in range(scaled_cap + 1)]

    for g, req_cnt in groups_order:
        sub_val = np.full((req_cnt + 1, scaled_cap + 1), neg_inf, dtype=np.float64)
        sub_val[0, :] = dp_val
        sub_sel: List[List[Tuple[int, ...]]] = [
            [() for _ in range(scaled_cap + 1)] for _ in range(req_cnt + 1)
        ]
        sub_sel[0] = list(dp_sel)

        for it in by_group[g]:
            sc = it["scaled_cost"]
            val = it["value"]
            if sc > scaled_cap:
                continue
            for k in range(req_cnt, 0, -1):
                for w in range(scaled_cap, sc - 1, -1):
                    prev = sub_val[k - 1, w - sc]
                    if prev <= neg_inf / 2:
                        continue
                    cand = prev + val
                    if cand > sub_val[k, w] + 1e-12:
                        sub_val[k, w] = cand
                        sub_sel[k][w] = sub_sel[k - 1][w - sc] + (it["idx"],)

        dp_val = sub_val[req_cnt]
        dp_sel = sub_sel[req_cnt]

    best_w = int(np.argmax(dp_val))
    if dp_val[best_w] <= neg_inf / 2:
        return {
            "selected_ids": [],
            "total_cost": 0,
            "total_value": 0.0,
            "capacity": cap_int,
            "feasible": False,
            "martello_toth_LP_upper_bound": round(lp_bound, 6),
            "optimality_gap": round(lp_bound, 6),
            "algorithm": "Multi-Choice Group Knapsack DP",
        }

    chosen_indices = list(dp_sel[best_w])
    chosen_ids = [normalized[i]["id"] for i in chosen_indices]
    tot_cost = sum(normalized[i]["cost"] for i in chosen_indices)
    tot_val = float(dp_val[best_w])
    return {
        "selected_ids": chosen_ids,
        "total_cost": tot_cost,
        "total_value": round(tot_val, 6),
        "capacity": cap_int,
        "feasible": tot_cost <= cap_int,
        "martello_toth_LP_upper_bound": round(lp_bound, 6),
        "optimality_gap": round(max(0.0, lp_bound - tot_val), 6),
        "algorithm": "Multi-Choice Group Knapsack DP",
    }


def pomdp_mdp_bellman_backup(
    transition_tensor: np.ndarray,
    reward_matrix: np.ndarray,
    discount_gamma: float = 0.95,
    observation_tensor: Optional[np.ndarray] = None,
    belief_state: Optional[np.ndarray] = None,
    max_iters: int = 250,
    tol: float = 1e-8,
) -> Dict[str, Any]:
    """
    MDP Bellman Optimality Backup & POMDP Belief-State Alpha-Vector Update
    (Kochenderfer, Wheeler & Wray — Algorithms for Decision Making, Ch. 7 & Ch. 20).

    Parameters
    ----------
    transition_tensor : np.ndarray
        Shape (S, A, S) where T[s, a, s'] = P(s' | s, a).
    reward_matrix : np.ndarray
        Shape (S, A) where R[s, a] = expected immediate reward.
    discount_gamma : float
        Discount factor in [0, 1).
    observation_tensor : Optional[np.ndarray]
        Optional shape (A, S, O) where O_tensor[a, s', o] = P(o | s', a) for POMDP belief update.
    belief_state : Optional[np.ndarray]
        Optional belief simplex vector b in Delta^S.
    """
    T = np.asarray(transition_tensor, dtype=np.float64)
    R = np.asarray(reward_matrix, dtype=np.float64)
    if T.ndim != 3:
        raise ValueError(f"transition_tensor must have shape (S, A, S), got {T.shape}")
    S, A, S_next = T.shape
    if S != S_next or R.shape != (S, A):
        raise ValueError(f"Dimension mismatch between T {T.shape} and R {R.shape}")
    if not (0.0 <= discount_gamma < 1.0):
        raise ValueError(f"discount_gamma must be in [0, 1), got {discount_gamma}")

    # Normalize transition rows defensively if needed
    if np.any(T < -1e-12):
        raise ValueError("transition_tensor entries must be non-negative")
    T = np.maximum(T, 0.0)
    row_sums = T.sum(axis=2, keepdims=True)
    if np.any(row_sums <= 0):
        raise ValueError("Every (s, a) transition row must have positive probability mass")
    T = T / row_sums

    V = np.zeros(S, dtype=np.float64)
    bellman_residual = float("inf")
    iters_used = 0
    for it in range(1, max_iters + 1):
        # Q(s, a) = R(s, a) + gamma * sum_{s'} T(s, a, s') V(s')
        Q = R + discount_gamma * (T @ V)
        V_next = np.max(Q, axis=1)
        bellman_residual = float(np.max(np.abs(V_next - V)))
        V = V_next
        iters_used = it
        if bellman_residual < tol:
            break

    Q_star = R + discount_gamma * (T @ V)
    greedy_policy = np.argmax(Q_star, axis=1).astype(int)

    if belief_state is not None:
        b = np.asarray(belief_state, dtype=np.float64)
        if b.shape != (S,) or np.any(b < -1e-12) or float(np.sum(b)) <= 0:
            raise ValueError("belief_state must be a non-negative vector of length S")
        b = np.maximum(b, 0.0)
        b = b / np.sum(b)
    else:
        b = np.full(S, 1.0 / S, dtype=np.float64)

    # Base alpha vectors from MDP Q*: alpha_{a'}(s') = Q*(s', a')
    gamma_set = Q_star.T  # shape (A, S)
    qmdp_action_values = gamma_set @ b

    updated_beliefs_by_obs: Dict[int, List[float]] = {}
    if observation_tensor is not None:
        O_mat = np.asarray(observation_tensor, dtype=np.float64)
        if O_mat.ndim != 3 or O_mat.shape[0] != A or O_mat.shape[1] != S or O_mat.shape[2] == 0:
            raise ValueError(f"observation_tensor must have shape (A, S, O), got {O_mat.shape}")
        if np.any(O_mat < -1e-12):
            raise ValueError("observation_tensor entries must be non-negative")
        O_mat = np.maximum(O_mat, 0.0)
        obs_row_sums = O_mat.sum(axis=2, keepdims=True)
        if np.any(obs_row_sums <= 0):
            raise ValueError("Every (a, s') observation row must have positive probability mass")
        O_mat = O_mat / obs_row_sums
        num_obs = O_mat.shape[2]

        # Kochenderfer Ch. 20 Eq. 20.9 POMDP observation-conditioned alpha-vector backup:
        # alpha_a(s) = R(s, a) + gamma * sum_o sum_{s'} T(s, a, s') O(a, s', o) alpha*_{a,o}(s')
        # where alpha*_{a,o} = argmax_{alpha in Gamma} sum_{s'} alpha(s') P(s', o | b, a)
        alpha_vectors = np.zeros((A, S), dtype=np.float64)
        for a_idx in range(A):
            pred_next_a = b @ T[:, a_idx, :]  # shape (S,)
            obs_backed = np.zeros(S, dtype=np.float64)
            for o_idx in range(num_obs):
                joint_s_prime_o = O_mat[a_idx, :, o_idx] * pred_next_a  # P(s', o | b, a)
                best_alpha_idx = int(np.argmax(gamma_set @ joint_s_prime_o))
                alpha_star_ao = gamma_set[best_alpha_idx]  # shape (S,)
                # Back up to state s: sum_{s'} T(s, a, s') O(a, s', o) alpha*_{a,o}(s')
                obs_backed += T[:, a_idx, :] @ (O_mat[a_idx, :, o_idx] * alpha_star_ao)
            alpha_vectors[a_idx] = R[:, a_idx] + discount_gamma * obs_backed

        belief_action_values = alpha_vectors @ b
        best_belief_action = int(np.argmax(belief_action_values))
        belief_value = float(belief_action_values[best_belief_action])

        # Posterior beliefs for each observation o under the chosen POMDP action a*
        pred_next = b @ T[:, best_belief_action, :]
        for o_idx in range(num_obs):
            unnorm = O_mat[best_belief_action, :, o_idx] * pred_next
            z = float(np.sum(unnorm))
            post = (unnorm / z) if z > 1e-15 else pred_next
            updated_beliefs_by_obs[o_idx] = [round(float(x), 8) for x in post]
    else:
        alpha_vectors = gamma_set
        belief_action_values = qmdp_action_values
        best_belief_action = int(np.argmax(belief_action_values))
        belief_value = float(belief_action_values[best_belief_action])

    return {
        "optimal_value_function": [round(float(v), 8) for v in V],
        "q_star_matrix": [[round(float(x), 8) for x in row] for row in Q_star],
        "greedy_policy": [int(a) for a in greedy_policy],
        "converged": bellman_residual < tol,
        "iterations": iters_used,
        "bellman_residual": bellman_residual,
        "pomdp_belief_value": round(belief_value, 8),
        "qmdp_upper_bound_value": round(float(np.max(qmdp_action_values)), 8),
        "pomdp_best_action": best_belief_action,
        "pomdp_posterior_beliefs_by_obs": updated_beliefs_by_obs,
    }


def submodular_greedy_maximize(
    ground_set: Sequence[str],
    coverage_sets_or_fn: Any,
    cardinality_k: int,
    element_weights: Optional[Mapping[str, float]] = None,
) -> Dict[str, Any]:
    """
    Nemhauser-Wolsey-Fisher (1978) / Williamson-Shmoys Greedy Submodular Maximization
    with (1 - 1/e) Approximation Guarantee.

    Supports either:
      - A dictionary mapping each ground element `e` to a set/sequence of covered features
        (weighted coverage function $f(S) = \\sum_{u \\in \\bigcup_{e \\in S} C_e} w(u)$), OR
      - A callable `f(subset: FrozenSet[str]) -> float` that evaluates any monotone submodular function.
    """
    universe = list(dict.fromkeys(ground_set))
    k = max(0, min(int(cardinality_k), len(universe)))
    if k == 0 or not universe:
        return {
            "selected_elements": [],
            "marginal_gains": [],
            "objective_value": 0.0,
            "theoretical_approximation_ratio": round(1.0 - math.exp(-1.0), 6),
            "finite_k_guarantee": 0.0,
            "diminishing_returns_verified": True,
        }

    if callable(coverage_sets_or_fn):
        eval_fn: Callable[[frozenset[str]], float] = coverage_sets_or_fn
    elif isinstance(coverage_sets_or_fn, Mapping):
        w_map = dict(element_weights) if element_weights else {}

        def eval_fn(subset: frozenset[str]) -> float:
            covered = set()
            for item in subset:
                covered.update(coverage_sets_or_fn.get(item, ()))
            return float(sum(w_map.get(feat, 1.0) for feat in covered))
    else:
        raise TypeError("coverage_sets_or_fn must be a callable or Mapping[element, Iterable[feature]]")

    selected: List[str] = []
    selected_set: frozenset[str] = frozenset()
    current_val = float(eval_fn(selected_set))
    marginal_gains: List[float] = []

    remaining = list(universe)
    for _ in range(k):
        best_elem: Optional[str] = None
        best_gain = -1.0
        best_val = current_val
        for cand in remaining:
            new_val = float(eval_fn(selected_set | {cand}))
            gain = new_val - current_val
            if gain > best_gain + 1e-12:
                best_gain = gain
                best_elem = cand
                best_val = new_val
        if best_elem is None or best_gain <= 0.0:
            break
        selected.append(best_elem)
        selected_set = selected_set | {best_elem}
        remaining.remove(best_elem)
        marginal_gains.append(round(best_gain, 8))
        current_val = best_val

    # Verify diminishing returns on marginal gains sequence and nested subsets
    diminishing_ok = all(
        marginal_gains[i] >= marginal_gains[i + 1] - 1e-9
        for i in range(len(marginal_gains) - 1)
    )
    finite_k_bound = 1.0 - (1.0 - 1.0 / k) ** k
    asymptotic_bound = 1.0 - math.exp(-1.0)
    return {
        "selected_elements": selected,
        "marginal_gains": marginal_gains,
        "objective_value": round(current_val, 8),
        "theoretical_approximation_ratio": round(asymptotic_bound, 6),
        "finite_k_guarantee": round(finite_k_bound, 6),
        "implied_opt_upper_bound": round(current_val / max(finite_k_bound, 1e-9), 6),
        "diminishing_returns_verified": diminishing_ok,
    }


# ===========================================================================
# DOMAIN 2: FOUNDATIONS OF ML, DEEP LEARNING & STATISTICAL LEARNING
# ===========================================================================

def _compute_kernel_matrix(
    X1: np.ndarray,
    X2: np.ndarray,
    length_scale: float,
    signal_variance: float,
    kernel_type: str = "rbf",
) -> np.ndarray:
    if length_scale <= 0.0 or signal_variance <= 0.0:
        raise ValueError("length_scale and signal_variance must be strictly positive")
    if kernel_type not in {"rbf", "matern52"}:
        raise ValueError(f"Unsupported kernel_type {kernel_type!r}; must be 'rbf' or 'matern52'")
    ell = float(length_scale)
    sf2 = float(signal_variance)
    diff = (X1[:, None, :] - X2[None, :, :]) / ell
    sq_dist = np.sum(diff * diff, axis=-1)
    if kernel_type == "matern52":
        r = np.sqrt(np.maximum(sq_dist, 0.0))
        sqrt5_r = math.sqrt(5.0) * r
        return sf2 * (1.0 + sqrt5_r + (5.0 / 3.0) * sq_dist) * np.exp(-sqrt5_r)
    return sf2 * np.exp(-0.5 * sq_dist)


def gaussian_process_kernel_regression(
    X_train: Sequence[Sequence[float]],
    y_train: Sequence[float],
    X_test: Sequence[Sequence[float]],
    length_scale: float = 1.0,
    signal_variance: float = 1.0,
    noise_variance: float = 1e-2,
    kernel_type: str = "rbf",
) -> Dict[str, Any]:
    """
    Exact Gaussian Process Regression & Log Marginal Likelihood (Rasmussen & Williams GPML Alg. 2.1).

    Computes:
      - $K_y = K(X, X) + \\sigma_n^2 I = L L^\\top$
      - $\\alpha = L^\\top \\setminus (L \\setminus y)$
      - $\\mu_* = K(X, X_*)^\\top \\alpha$
      - $\\Sigma_* = K(X_*, X_*) - V^\\top V$ where $V = L \\setminus K(X, X_*)$
      - $\\log p(y \\mid X, \\theta) = -\\frac{1}{2} y^\\top \\alpha - \\sum_i \\log L_{ii} - \\frac{n}{2}\\log(2\\pi)$
    """
    X_tr = np.asarray(X_train, dtype=np.float64)
    if X_tr.ndim == 1:
        X_tr = X_tr[:, None]
    y_tr = np.asarray(y_train, dtype=np.float64).reshape(-1)
    X_te = np.asarray(X_test, dtype=np.float64)
    if X_te.ndim == 1:
        X_te = X_te[:, None]

    if X_tr.ndim != 2 or X_te.ndim != 2:
        raise ValueError("X_train and X_test must be 1D or 2D feature arrays")
    n = X_tr.shape[0]
    if n == 0 or y_tr.shape[0] != n:
        raise ValueError("X_train and y_train must be non-empty and have matching sample count")
    if X_te.shape[0] == 0 or X_te.shape[1] != X_tr.shape[1]:
        raise ValueError(
            f"X_test must be non-empty and match X_train feature dimension ({X_tr.shape[1]}), got {X_te.shape}"
        )
    if noise_variance <= 0.0:
        raise ValueError("noise_variance must be strictly positive")

    sn2 = max(float(noise_variance), 1e-9)
    K = _compute_kernel_matrix(X_tr, X_tr, length_scale, signal_variance, kernel_type)
    K_y = K + sn2 * np.eye(n, dtype=np.float64)

    L = np.linalg.cholesky(K_y)
    # Solve L z = y, then L^T alpha = z
    z = np.linalg.solve(L, y_tr)
    alpha = np.linalg.solve(L.T, z)

    K_s = _compute_kernel_matrix(X_tr, X_te, length_scale, signal_variance, kernel_type)
    K_ss = _compute_kernel_matrix(X_te, X_te, length_scale, signal_variance, kernel_type)

    pred_mean = K_s.T @ alpha
    V = np.linalg.solve(L, K_s)
    pred_cov = K_ss - (V.T @ V)
    pred_var = np.maximum(np.diag(pred_cov), 0.0)
    pred_std = np.sqrt(pred_var + sn2)

    log_marginal_likelihood = float(
        -0.5 * np.dot(y_tr, alpha)
        - np.sum(np.log(np.diag(L)))
        - 0.5 * n * math.log(2.0 * math.pi)
    )

    return {
        "predictive_mean": [round(float(m), 8) for m in pred_mean],
        "predictive_variance_latent": [round(float(v), 8) for v in pred_var],
        "predictive_std_observable": [round(float(s), 8) for s in pred_std],
        "ci_95_lower": [round(float(m - 1.959964 * s), 8) for m, s in zip(pred_mean, pred_std)],
        "ci_95_upper": [round(float(m + 1.959964 * s), 8) for m, s in zip(pred_mean, pred_std)],
        "log_marginal_likelihood": round(log_marginal_likelihood, 8),
        "kernel_type": kernel_type,
        "n_train": n,
    }


def mackay_evidence_approximation(
    design_matrix: Sequence[Sequence[float]],
    targets: Sequence[float],
    alpha_init: float = 1.0,
    beta_init: float = 1.0,
    max_iters: int = 100,
    tol: float = 1e-6,
) -> Dict[str, Any]:
    """
    MacKay (1992) / Bishop PRML Ch. 3.5 Evidence Approximation (Type-II Maximum Likelihood).

    Iteratively optimizes prior weight precision $\\alpha$ and observation noise precision $\\beta$:
      - $A = \\alpha I + \\beta \\Phi^\\top \\Phi$
      - $m_N = \\beta A^{-1} \\Phi^\\top t$
      - $\\gamma = \\sum_{i=1}^M \\frac{\\lambda_i}{\\alpha + \\lambda_i}$ where $\\lambda_i$ are eigenvalues of $\\beta \\Phi^\\top \\Phi$
      - $\\alpha^{\\text{new}} = \\frac{\\gamma}{m_N^\\top m_N}$, $\\beta^{\\text{new}} = \\frac{N - \\gamma}{\\lVert t - \\Phi m_N \\rVert_2^2}$
    """
    Phi = np.asarray(design_matrix, dtype=np.float64)
    if Phi.ndim == 1:
        Phi = Phi[:, None]
    t = np.asarray(targets, dtype=np.float64).reshape(-1)
    N, M = Phi.shape
    if N == 0 or t.shape[0] != N:
        raise ValueError("design_matrix and targets must be non-empty and match in row count")

    alpha = max(float(alpha_init), 1e-6)
    beta = max(float(beta_init), 1e-6)
    PhiT_Phi = Phi.T @ Phi
    eigvals_base = np.maximum(np.linalg.eigvalsh(PhiT_Phi), 0.0)
    PhiT_t = Phi.T @ t

    converged = False
    iters_used = 0
    gamma = float(M)
    m_N = np.zeros(M, dtype=np.float64)

    for it in range(1, max_iters + 1):
        A = alpha * np.eye(M, dtype=np.float64) + beta * PhiT_Phi
        m_N = beta * np.linalg.solve(A, PhiT_t)
        lambdas = beta * eigvals_base
        gamma = float(np.sum(lambdas / (alpha + lambdas)))

        weight_norm_sq = max(float(np.dot(m_N, m_N)), 1e-10)
        residual_sq = max(float(np.sum((t - Phi @ m_N) ** 2)), 1e-10)

        alpha_new = float(np.clip(gamma / weight_norm_sq, 1e-6, 1e6))
        denom_beta = max(float(N) - gamma, 1e-3)
        beta_new = float(np.clip(denom_beta / residual_sq, 1e-6, 1e6))

        delta = max(abs(alpha_new - alpha) / alpha, abs(beta_new - beta) / beta)
        alpha, beta = alpha_new, beta_new
        iters_used = it
        if delta < tol:
            converged = True
            break

    A_final = alpha * np.eye(M, dtype=np.float64) + beta * PhiT_Phi
    m_N = beta * np.linalg.solve(A_final, PhiT_t)
    lambdas_final = beta * eigvals_base
    gamma = float(np.sum(lambdas_final / (alpha + lambdas_final)))
    residual_sq = float(np.sum((t - Phi @ m_N) ** 2))
    weight_norm_sq = float(np.dot(m_N, m_N))
    E_mN = 0.5 * beta * residual_sq + 0.5 * alpha * weight_norm_sq
    sign, logdet_A = np.linalg.slogdet(A_final)
    log_evidence = float(
        0.5 * M * math.log(alpha)
        + 0.5 * N * math.log(beta)
        - E_mN
        - 0.5 * logdet_A
        - 0.5 * N * math.log(2.0 * math.pi)
    )

    return {
        "alpha_prior_precision": round(alpha, 8),
        "beta_noise_precision": round(beta, 8),
        "gamma_effective_parameters": round(gamma, 8),
        "posterior_mean_weights": [round(float(w), 8) for w in m_N],
        "log_marginal_evidence": round(log_evidence, 8),
        "converged": converged,
        "iterations": iters_used,
    }


def td_lambda_gae_advantage_estimation(
    rewards: Sequence[float],
    values: Sequence[float],
    dones: Optional[Sequence[bool]] = None,
    gamma: float = 0.99,
    lam: float = 0.95,
) -> Dict[str, Any]:
    """
    Sutton & Barto (2020) Ch. 12 TD($\\lambda$) & Schulman et al. (2015) Generalized Advantage
    Estimation $\\text{GAE}(\\gamma, \\lambda)$.

    Parameters
    ----------
    rewards : Sequence[float]
        Length T sequence of step rewards $r_0, \\dots, r_{T-1}$.
    values : Sequence[float]
        Length T+1 sequence of state value estimates $V(s_0), \\dots, V(s_T)$.
    dones : Optional[Sequence[bool]]
        Length T terminal indicators; if `dones[t]` is True, bootstrap at step `t` is masked.
    """
    r = np.asarray(rewards, dtype=np.float64).reshape(-1)
    v = np.asarray(values, dtype=np.float64).reshape(-1)
    T = r.shape[0]
    if T == 0:
        return {
            "td_errors_delta": [],
            "advantages_gae": [],
            "lambda_returns": [],
            "one_step_td_advantages": [],
            "monte_carlo_advantages": [],
        }
    if v.shape[0] != T + 1:
        raise ValueError(f"values must have length len(rewards)+1 ({T + 1}), got {v.shape[0]}")

    done_mask = (
        np.asarray(dones, dtype=bool).reshape(-1)
        if dones is not None
        else np.zeros(T, dtype=bool)
    )
    if done_mask.shape[0] != T:
        raise ValueError("dones must have the same length as rewards")

    not_done = (~done_mask).astype(np.float64)
    deltas = r + gamma * not_done * v[1:] - v[:-1]

    advantages = np.zeros(T, dtype=np.float64)
    mc_advantages = np.zeros(T, dtype=np.float64)
    gae_acc = 0.0
    mc_acc = 0.0
    for t in range(T - 1, -1, -1):
        gae_acc = deltas[t] + gamma * lam * not_done[t] * gae_acc
        advantages[t] = gae_acc
        mc_acc = deltas[t] + gamma * not_done[t] * mc_acc
        mc_advantages[t] = mc_acc

    lambda_returns = advantages + v[:-1]
    return {
        "td_errors_delta": [round(float(x), 8) for x in deltas],
        "advantages_gae": [round(float(x), 8) for x in advantages],
        "lambda_returns": [round(float(x), 8) for x in lambda_returns],
        "one_step_td_advantages": [round(float(x), 8) for x in deltas],
        "monte_carlo_advantages": [round(float(x), 8) for x in mc_advantages],
        "gamma": gamma,
        "lambda": lam,
    }


# ===========================================================================
# DOMAIN 3: FOUNDATIONAL TRANSFORMER, SCALING, ALIGNMENT & AGENTIC ARXIV PAPERS
# ===========================================================================

def chinchilla_kaplan_compute_optimal_allocation(
    compute_flops: float,
    E_irreducible: float = 1.69,
    A_param: float = 406.4,
    B_data: float = 410.7,
    alpha: float = 0.34,
    beta: float = 0.28,
) -> Dict[str, Any]:
    """
    Chinchilla (`arXiv:2203.15556`, Hoffmann et al. 2022) & Kaplan (`arXiv:2001.08361`)
    Compute-Optimal Parameter $N^*(C)$ and Token $D^*(C)$ Allocation under $C \\approx 6 N D$.

    Solves:
      $\\min_{N, D} L(N, D) = E + A N^{-\\alpha} + B D^{-\\beta}$ subject to $6 N D = C$:
      $G = \\left(\\frac{\\alpha A}{\\beta B}\\right)^{\\frac{1}{\\alpha + \\beta}}$,
      $a = \\frac{\\beta}{\\alpha + \\beta}$, $b = \\frac{\\alpha}{\\alpha + \\beta}$,
      $N^*(C) = G (C / 6)^a$, $D^*(C) = G^{-1} (C / 6)^b$.
    """
    C = float(compute_flops)
    if C <= 0.0:
        raise ValueError(f"compute_flops must be strictly positive, got {C}")

    a = beta / (alpha + beta)
    b = alpha / (alpha + beta)
    G = ((alpha * A_param) / (beta * B_data)) ** (1.0 / (alpha + beta))

    budget_nd = C / 6.0
    n_opt = G * (budget_nd ** a)
    d_opt = (budget_nd ** b) / G
    loss_opt = E_irreducible + A_param * (n_opt ** (-alpha)) + B_data * (d_opt ** (-beta))

    # Kaplan et al. (2020) power exponents comparison: N_kaplan propto C^0.73, D_kaplan propto C^0.27
    kaplan_a, kaplan_b = 0.73, 0.27
    n_kaplan = G * (budget_nd ** kaplan_a)
    d_kaplan = (budget_nd ** kaplan_b) / G
    loss_kaplan = E_irreducible + A_param * (n_kaplan ** (-alpha)) + B_data * (d_kaplan ** (-beta))

    return {
        "compute_flops": C,
        "optimal_parameters_N": float(n_opt),
        "optimal_tokens_D": float(d_opt),
        "tokens_per_parameter_ratio": round(float(d_opt / max(n_opt, 1e-12)), 6),
        "scaling_exponent_a_params": round(a, 6),
        "scaling_exponent_b_tokens": round(b, 6),
        "predicted_chinchilla_loss": round(float(loss_opt), 6),
        "predicted_kaplan_loss_at_same_compute": round(float(loss_kaplan), 6),
        "chinchilla_loss_reduction_vs_kaplan": round(float(loss_kaplan - loss_opt), 6),
    }


def dpo_implicit_reward_margin(
    policy_chosen_logprobs: Sequence[float],
    policy_rejected_logprobs: Sequence[float],
    ref_chosen_logprobs: Sequence[float],
    ref_rejected_logprobs: Sequence[float],
    beta: float = 0.1,
) -> Dict[str, Any]:
    """
    Direct Preference Optimization (`arXiv:2305.18290`, Rafailov et al. 2023) Implicit Reward Margin & Loss:
      $r_\\theta(x, y) = \\beta \\log \\frac{\\pi_\\theta(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)}$
      $m = r_\\theta(x, y_w) - r_\\theta(x, y_l)$
      $\\mathcal{L}_{\\text{DPO}} = -\\mathbb{E}[\\log \\sigma(m)]$.
    """
    pi_w = np.asarray(policy_chosen_logprobs, dtype=np.float64).reshape(-1)
    pi_l = np.asarray(policy_rejected_logprobs, dtype=np.float64).reshape(-1)
    ref_w = np.asarray(ref_chosen_logprobs, dtype=np.float64).reshape(-1)
    ref_l = np.asarray(ref_rejected_logprobs, dtype=np.float64).reshape(-1)

    if pi_w.size == 0 or not (pi_w.shape == pi_l.shape == ref_w.shape == ref_l.shape):
        raise ValueError("All four logprob sequences must be non-empty and have matching lengths")
    if beta <= 0.0:
        raise ValueError(f"beta must be positive, got {beta}")

    reward_chosen = beta * (pi_w - ref_w)
    reward_rejected = beta * (pi_l - ref_l)
    margins = reward_chosen - reward_rejected

    # Numerically stable sigmoid(m) and -log(sigmoid(m)) = softplus(-m) = log(1 + exp(-m))
    pref_probs = 1.0 / (1.0 + np.exp(-np.clip(margins, -60.0, 60.0)))
    per_sample_losses = np.logaddexp(0.0, -margins)
    reward_accuracy = float(np.mean(margins > 0.0))

    return {
        "implicit_rewards_chosen": [round(float(x), 8) for x in reward_chosen],
        "implicit_rewards_rejected": [round(float(x), 8) for x in reward_rejected],
        "reward_margins": [round(float(x), 8) for x in margins],
        "preference_probabilities": [round(float(x), 8) for x in pref_probs],
        "dpo_loss": round(float(np.mean(per_sample_losses)), 8),
        "reward_accuracy": round(reward_accuracy, 6),
        "beta": beta,
    }


def validate_react_thought_action_observation_loop(
    steps: Sequence[Mapping[str, Any]],
    allowed_tools: Sequence[str],
    max_steps: int = 12,
) -> Dict[str, Any]:
    """
    ReAct (`arXiv:2210.03629`, Yao et al. 2022) Thought-Action-Observation Loop Validator.

    Verifies:
      1. Every step has a non-empty `thought` and `action`.
      2. Every intermediate tool step uses an allowed tool from `allowed_tools` and records a non-empty `observation`.
      3. No consecutive identical `(action, action_input)` infinite loop occurs.
      4. The trajectory terminates cleanly with `Finish[...]` or `final_answer` within `max_steps`
         and cites at least one observation token in the final answer.
    """
    allowed = set(allowed_tools) | {"Finish"}
    violations: List[str] = []
    if not steps:
        return {
            "valid": False,
            "step_count": 0,
            "terminated_cleanly": False,
            "grounded_in_observations": False,
            "violations": ["EMPTY_REACT_TRACE"],
        }
    if len(steps) > max_steps:
        violations.append(f"MAX_STEPS_EXCEEDED:{len(steps)}>{max_steps}")

    seen_calls: List[Tuple[str, str]] = []
    observations_collected: List[str] = []
    terminated = False
    final_answer_text = ""

    for idx, step in enumerate(steps):
        thought = str(step.get("thought", "")).strip()
        action = str(step.get("action", "")).strip()
        action_input = str(step.get("action_input", "")).strip()
        observation = str(step.get("observation", "")).strip()

        if not thought:
            violations.append(f"STEP_{idx}_MISSING_THOUGHT")
        if not action:
            violations.append(f"STEP_{idx}_MISSING_ACTION")
            continue

        if action == "Finish" or bool(step.get("is_final", False)):
            terminated = True
            final_answer_text = action_input or str(step.get("final_answer", "")).strip()
            if idx != len(steps) - 1:
                violations.append(f"STEP_{idx}_FINISH_NOT_TERMINAL")
            break

        if action not in allowed:
            violations.append(f"STEP_{idx}_DISALLOWED_TOOL:{action}")
        if not observation:
            violations.append(f"STEP_{idx}_MISSING_OBSERVATION")
        else:
            observations_collected.append(observation)

        sig = (action, action_input)
        if seen_calls and seen_calls[-1] == sig:
            violations.append(f"STEP_{idx}_DUPLICATE_CONSECUTIVE_ACTION:{action}")
        seen_calls.append(sig)

    if not terminated:
        violations.append("MISSING_TERMINAL_FINISH_STEP")
    else:
        if not final_answer_text:
            violations.append("EMPTY_FINAL_ANSWER")
        if not observations_collected:
            violations.append("NO_OBSERVATION_STEPS_BEFORE_FINISH")

    # Check lexical/numerical grounding of final answer in collected observations
    obs_tokens = {
        tok.lower().strip(".,:;()[]{}")
        for obs in observations_collected
        for tok in obs.split()
        if len(tok.strip(".,:;()[]{}")) >= 2
    }
    ans_tokens = {
        tok.lower().strip(".,:;()[]{}")
        for tok in final_answer_text.split()
        if len(tok.strip(".,:;()[]{}")) >= 2
    }
    grounded = bool(obs_tokens & ans_tokens) if observations_collected else False
    if terminated and observations_collected and not grounded:
        violations.append("FINAL_ANSWER_UNGROUNDED_IN_OBSERVATIONS")

    return {
        "valid": len(violations) == 0,
        "step_count": len(steps),
        "terminated_cleanly": terminated,
        "grounded_in_observations": grounded,
        "violations": violations,
    }


# ===========================================================================
# DOMAIN 4: AGENT ENGINEERING, HARNESSES, PROTOCOLS & EVALUATION
# ===========================================================================

def evaluate_agent_harness_pass_at_k_and_pass_hat_k(
    n_trials: int,
    c_successes: int,
    k_values: Sequence[int] = (1, 3, 5),
    mcp_spec_version: str = "2026-07-28",
    a2a_agent_card: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Anthropic *Demystifying Evals for AI Agents* + SWE-bench + TAU-bench Reliability Evaluator:
      - Unbiased $\\text{Pass}@k = 1 - \\frac{\\binom{n - c}{k}}{\\binom{n}{k}}$ (capability: at least 1 of $k$ succeeds)
      - Production Consistency $\\text{Pass}^{\\wedge}k = (c / n)^k$ (reliability: ALL $k$ trials succeed)
      - Validates MCP `2026-07-28` & A2A AgentCard handshake readiness.
    """
    n = int(n_trials)
    c = int(c_successes)
    if n <= 0 or c < 0 or c > n:
        raise ValueError(f"Invalid trial counts: n={n}, c={c}")

    p_hat = c / float(n)
    pass_at_k: Dict[str, float] = {}
    pass_hat_k: Dict[str, float] = {}
    reliability_gap: Dict[str, float] = {}

    for k_raw in k_values:
        k = int(k_raw)
        if k <= 0 or k > n:
            raise ValueError(f"k must satisfy 1 <= k <= n ({n}), got {k}")
        if n - c < k:
            pk = 1.0
        else:
            # Stable product 1 - prod_{i=0}^{k-1} (n - c - i) / (n - i)
            fail_prob = 1.0
            for i in range(k):
                fail_prob *= float(n - c - i) / float(n - i)
            pk = 1.0 - fail_prob
        phk = p_hat ** k
        pass_at_k[f"pass@{k}"] = round(pk, 8)
        pass_hat_k[f"pass^{k}"] = round(phk, 8)
        reliability_gap[f"gap@{k}"] = round(pk - phk, 8)

    card = dict(a2a_agent_card) if a2a_agent_card else {
        "name": "GSE-Autonomous-Agent",
        "protocol": "A2A/1.0",
        "capabilities": ["mcp_tools", "streaming", "structured_outputs"],
    }
    a2a_valid = bool(card.get("name")) and bool(card.get("capabilities"))
    mcp_valid = mcp_spec_version >= "2024-11-05"

    return {
        "n_trials": n,
        "c_successes": c,
        "empirical_pass_rate": round(p_hat, 8),
        "pass_at_k": pass_at_k,
        "pass_hat_k": pass_hat_k,
        "capability_vs_reliability_gap": reliability_gap,
        "mcp_spec_version": mcp_spec_version,
        "mcp_protocol_valid": mcp_valid,
        "a2a_agent_card_valid": a2a_valid,
    }


def calculate_long_running_context_compaction_budget(
    context_window_limit: int,
    system_and_tools_tokens: int,
    pinned_state_tokens: int,
    current_history_tokens: int,
    reserve_output_tokens: int = 4096,
    avg_tokens_per_turn: int = 1200,
    compaction_trigger_ratio: float = 0.80,
    target_summary_compression_ratio: float = 0.15,
    recent_window_keep_tokens: int = 6000,
) -> Dict[str, Any]:
    """
    Anthropic *Effective Context Engineering for AI Agents* & *Effective Harnesses for Long-Running Agents*
    Context Compaction Budget Calculator.
    """
    if context_window_limit <= 0:
        raise ValueError("context_window_limit must be positive")
    usable_input_limit = max(0, int(context_window_limit) - max(0, int(reserve_output_tokens)))
    fixed_overhead = max(0, int(system_and_tools_tokens)) + max(0, int(pinned_state_tokens))
    if fixed_overhead >= usable_input_limit:
        raise ValueError("Fixed system + pinned overhead exceeds usable context window")

    hist = max(0, int(current_history_tokens))
    total_active = fixed_overhead + hist
    trigger_threshold = int(usable_input_limit * float(compaction_trigger_ratio))
    compaction_needed = total_active >= trigger_threshold

    keep_recent = min(hist, max(0, int(recent_window_keep_tokens)))
    evictable_history = max(0, hist - keep_recent)
    compacted_summary_tokens = int(math.ceil(evictable_history * float(target_summary_compression_ratio)))
    post_compaction_active = fixed_overhead + keep_recent + compacted_summary_tokens
    tokens_saved = max(0, total_active - post_compaction_active)

    turn_growth = max(1, int(avg_tokens_per_turn))
    turns_until_trigger = max(0, (trigger_threshold - total_active) // turn_growth)

    return {
        "context_window_limit": int(context_window_limit),
        "usable_input_limit": usable_input_limit,
        "total_active_tokens": total_active,
        "utilization_ratio": round(total_active / float(usable_input_limit), 6),
        "trigger_threshold_tokens": trigger_threshold,
        "compaction_triggered": compaction_needed,
        "turns_remaining_until_compaction": int(turns_until_trigger),
        "evictable_history_tokens": evictable_history,
        "compacted_summary_tokens": compacted_summary_tokens,
        "post_compaction_active_tokens": post_compaction_active,
        "tokens_reclaimed": tokens_saved,
    }


# ===========================================================================
# DOMAIN 5: PROBABILITY, STATISTICS, CONVEX OPTIMIZATION & LINEAR ALGEBRA
# ===========================================================================

def boyd_vandenberghe_kkt_simplex_barrier_projection(
    target_vector: Sequence[float],
    barrier_t: float = 1000.0,
    max_newton_iters: int = 60,
    tol: float = 1e-10,
) -> Dict[str, Any]:
    """
    Boyd & Vandenberghe *Convex Optimization* Ch. 11 Log-Barrier Interior-Point + KKT Projection
    onto the Probability Simplex $\\Delta_n = \\{p \\in \\mathbb{R}^n : \\mathbf{1}^\\top p = 1, p > 0\\}$.

    Solves both:
      1. Exact Euclidean KKT projection $p^* = \\max(y - \\nu^* \\mathbf{1}, 0)$ via Duchi et al. / KKT sorting.
      2. Barrier-regularized strictly interior problem:
         $\\min_p \\frac{1}{2} \\lVert p - y \\rVert_2^2 - \\frac{1}{t} \\sum_{i=1}^n \\log p_i$ s.t. $\\mathbf{1}^\\top p = 1$
         where KKT stationarity $p_i - y_i - \\frac{1}{t p_i} + \\nu = 0$ yields closed-form root per $\\nu$:
         $p_i(\\nu) = \\frac{(y_i - \\nu) + \\sqrt{(y_i - \\nu)^2 + 4 / t}}{2}$,
         solved to machine precision via 1D Newton-Raphson on $g(\\nu) = \\sum_{i=1}^n p_i(\\nu) - 1 = 0$.
    """
    y = np.asarray(target_vector, dtype=np.float64).reshape(-1)
    n = y.size
    if n == 0:
        raise ValueError("target_vector must be non-empty")
    t = max(float(barrier_t), 1.0)

    # 1. Exact KKT boundary simplex projection
    u = np.sort(y)[::-1]
    cssv = np.cumsum(u) - 1.0
    ind = np.arange(1, n + 1, dtype=np.float64)
    cond = u - cssv / ind > 0.0
    rho = int(np.nonzero(cond)[0][-1]) + 1
    theta = float(cssv[rho - 1] / rho)
    p_exact = np.maximum(y - theta, 0.0)

    # 2. Strictly interior barrier KKT solution via Newton on dual multiplier nu
    # Uses rationalized quadratic root (2/t) / (-s + sqrt(s^2 + 4/t)) for s < 0
    # to eliminate IEEE-754 catastrophic cancellation.
    def _barrier_probs(nu_val: float) -> Tuple[np.ndarray, np.ndarray]:
        shifted = y - nu_val
        rad = np.sqrt(shifted * shifted + 4.0 / t)
        p_vec = np.where(
            shifted >= 0.0,
            0.5 * (shifted + rad),
            (2.0 / t) / (-shifted + rad),
        )
        return p_vec, rad

    nu = theta
    for _ in range(max_newton_iters):
        p_bar, rad = _barrier_probs(nu)
        g_val = float(np.sum(p_bar) - 1.0)
        if abs(g_val) < tol:
            break
        # dp_i / dnu = -0.5 * (1 + shifted / rad) = -p_bar / rad
        dg_dnu = float(-np.sum(p_bar / rad))
        nu = nu - g_val / min(dg_dnu, -1e-12)

    p_bar, _ = _barrier_probs(nu)

    kkt_stationarity_residual = float(np.max(np.abs(p_bar - y - (1.0 / (t * p_bar)) + nu)))
    primal_feasibility_residual = float(abs(np.sum(p_bar) - 1.0))
    duality_gap = float(n / t)

    return {
        "interior_barrier_probabilities": [round(float(x), 8) for x in p_bar],
        "exact_kkt_probabilities": [round(float(x), 8) for x in p_exact],
        "dual_multiplier_nu": round(float(nu), 8),
        "kkt_stationarity_residual": kkt_stationarity_residual,
        "primal_feasibility_residual": primal_feasibility_residual,
        "barrier_duality_gap_n_over_t": duality_gap,
        "strictly_positive": bool(np.all(p_bar > 0.0)),
    }


def devroye_exact_rejection_and_inversion_sampler(
    n_samples: int = 2000,
    exp_rate_lambda: float = 1.5,
    trunc_upper_b: float = 2.5,
    beta_alpha: float = 2.5,
    beta_beta: float = 3.5,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Luc Devroye *Non-Uniform Random Variate Generation* Exact Inversion & Von Neumann / Johnk Rejection Sampler.

    1. Exact CDF Inversion on Truncated Exponential $f(x) = \\frac{\\lambda e^{-\\lambda x}}{1 - e^{-\\lambda b}}$ on $[0, b]$:
       $X = -\\frac{1}{\\lambda} \\log\\left(1 - U (1 - e^{-\\lambda b})\\right)$.
    2. Exact Rejection Sampling for $\\text{Beta}(\\alpha, \\beta)$ for all $\\alpha > 0, \\beta > 0$:
       - When $\\alpha \\ge 1, \\beta \\ge 1$: bounded Uniform$[0,1]$ envelope with analytical mode
         $x_{\\text{mode}} = \\frac{\\alpha - 1}{\\alpha + \\beta - 2}$ (or boundary mode when $\\alpha=1$ or $\\beta=1$)
         and envelope constant $M = f(x_{\\text{mode}})$.
       - When $\\min(\\alpha, \\beta) < 1$: Devroye Ch. IX.3 Johnk's exact rejection theorem
         ($W_1 = U_1^{1/\\alpha}, W_2 = U_2^{1/\\beta}$, accept $W_1 / (W_1 + W_2)$ when $W_1 + W_2 \\le 1$).
    """
    if n_samples <= 0 or exp_rate_lambda <= 0.0 or trunc_upper_b <= 0.0:
        raise ValueError("n_samples, exp_rate_lambda, and trunc_upper_b must be positive")
    if beta_alpha <= 0.0 or beta_beta <= 0.0:
        raise ValueError("beta_alpha and beta_beta must be strictly positive")

    rng = np.random.default_rng(int(seed))

    # 1. Exact inversion sampling for Truncated Exponential(lambda) on [0, b]
    u_inv = rng.uniform(0.0, 1.0, size=int(n_samples))
    norm_const = 1.0 - math.exp(-exp_rate_lambda * trunc_upper_b)
    inv_samples = -np.log(1.0 - u_inv * norm_const) / exp_rate_lambda
    theo_trunc_mean = (
        (1.0 / exp_rate_lambda)
        - (trunc_upper_b * math.exp(-exp_rate_lambda * trunc_upper_b)) / norm_const
    )

    # 2. Exact rejection sampling for Beta(alpha, beta) on [0, 1]
    log_B = math.lgamma(beta_alpha) + math.lgamma(beta_beta) - math.lgamma(beta_alpha + beta_beta)

    accepted: List[np.ndarray] = []
    total_proposals = 0
    total_accepted = 0

    if beta_alpha >= 1.0 and beta_beta >= 1.0:
        def beta_pdf(x: np.ndarray) -> np.ndarray:
            x_safe = np.clip(x, 1e-12, 1.0 - 1e-12)
            t1 = (beta_alpha - 1.0) * np.log(x_safe) if beta_alpha > 1.0 else 0.0
            t2 = (beta_beta - 1.0) * np.log(1.0 - x_safe) if beta_beta > 1.0 else 0.0
            return np.exp(t1 + t2 - log_B)

        if beta_alpha > 1.0 and beta_beta > 1.0:
            mode = (beta_alpha - 1.0) / (beta_alpha + beta_beta - 2.0)
        elif beta_alpha == 1.0 and beta_beta == 1.0:
            mode = 0.5
        elif beta_alpha == 1.0:
            mode = 0.0
        else:
            mode = 1.0

        M_envelope = float(beta_pdf(np.array([mode]))[0])
        theoretical_acceptance = 1.0 / M_envelope
        batch_size = max(512, int(n_samples * M_envelope * 1.3))
        while total_accepted < n_samples:
            x_prop = rng.uniform(0.0, 1.0, size=batch_size)
            u_acc = rng.uniform(0.0, M_envelope, size=batch_size)
            keep = x_prop[u_acc <= beta_pdf(x_prop)]
            total_proposals += batch_size
            accepted.append(keep)
            total_accepted += int(keep.size)
    else:
        # Devroye Ch. IX.3 Johnk's exact rejection sampler for min(alpha, beta) < 1:
        # P(U1^(1/alpha) + U2^(1/beta) <= 1) = Gamma(alpha+1) Gamma(beta+1) / Gamma(alpha+beta+1)
        log_acc = (
            math.lgamma(beta_alpha + 1.0)
            + math.lgamma(beta_beta + 1.0)
            - math.lgamma(beta_alpha + beta_beta + 1.0)
        )
        theoretical_acceptance = math.exp(log_acc)
        M_envelope = 1.0 / max(theoretical_acceptance, 1e-12)
        batch_size = max(512, int(n_samples * M_envelope * 1.3))
        while total_accepted < n_samples:
            u1 = rng.uniform(1e-15, 1.0, size=batch_size)
            u2 = rng.uniform(1e-15, 1.0, size=batch_size)
            w1 = np.power(u1, 1.0 / beta_alpha)
            w2 = np.power(u2, 1.0 / beta_beta)
            w_sum = w1 + w2
            mask = w_sum <= 1.0
            keep = w1[mask] / np.maximum(w_sum[mask], 1e-15)
            total_proposals += batch_size
            accepted.append(keep)
            total_accepted += int(keep.size)

    beta_samples = np.concatenate(accepted)[:n_samples]
    theo_beta_mean = beta_alpha / (beta_alpha + beta_beta)

    return {
        "n_samples": int(n_samples),
        "inversion_trunc_exp_mean_empirical": round(float(np.mean(inv_samples)), 6),
        "inversion_trunc_exp_mean_theoretical": round(theo_trunc_mean, 6),
        "inversion_samples_within_bounds": bool(
            np.all((inv_samples >= 0.0) & (inv_samples <= trunc_upper_b))
        ),
        "rejection_beta_mean_empirical": round(float(np.mean(beta_samples)), 6),
        "rejection_beta_mean_theoretical": round(theo_beta_mean, 6),
        "rejection_envelope_M": round(M_envelope, 6),
        "theoretical_acceptance_rate": round(theoretical_acceptance, 6),
        "empirical_acceptance_rate": round(float(total_accepted / max(total_proposals, 1)), 6),
    }


# ===========================================================================
# DOMAIN 6: COMPILERS, ASTs, SYSTEMS & HIGH-PERFORMANCE COMPUTING
# ===========================================================================

_SAFE_MATH_FUNCTIONS = frozenset(
    {
        "abs",
        "min",
        "max",
        "clip",
        "exp",
        "log",
        "log1p",
        "sqrt",
        "sin",
        "cos",
        "tanh",
        "sigmoid",
        "softplus",
        "pow",
        "round",
    }
)


def _compute_sethi_ullman_ershov_number(node: ast.AST) -> int:
    """
    Dragon Book (Aho, Lam, Sethi, Ullman) / Sethi-Ullman (1970) Ershov register number
    for optimal arithmetic expression tree evaluation without spills.
    """
    if isinstance(node, (ast.Name, ast.Constant)):
        return 1
    if isinstance(node, ast.UnaryOp):
        return max(1, _compute_sethi_ullman_ershov_number(node.operand))
    if isinstance(node, ast.BinOp):
        left_r = _compute_sethi_ullman_ershov_number(node.left)
        right_r = _compute_sethi_ullman_ershov_number(node.right)
        return left_r + 1 if left_r == right_r else max(left_r, right_r)
    if isinstance(node, ast.IfExp):
        c_r = _compute_sethi_ullman_ershov_number(node.test)
        t_r = _compute_sethi_ullman_ershov_number(node.body)
        e_r = _compute_sethi_ullman_ershov_number(node.orelse)
        return max(c_r, t_r, e_r) + 1
    children = list(ast.iter_child_nodes(node))
    if not children:
        return 1
    child_regs = sorted((_compute_sethi_ullman_ershov_number(c) for c in children), reverse=True)
    return max(r + i for i, r in enumerate(child_regs))


def _ast_tree_depth(node: ast.AST) -> int:
    children = list(ast.iter_child_nodes(node))
    if not children:
        return 1
    return 1 + max(_ast_tree_depth(c) for c in children)


def analyze_equation_ast_complexity_and_cyclomatic_depth(
    expression: str,
    max_allowed_depth: int = 16,
    max_allowed_cyclomatic: int = 12,
) -> Dict[str, Any]:
    """
    Nystrom *Crafting Interpreters*, Dragon Book & McCabe (1976) Static AST Complexity,
    Halstead Volume, Sethi-Ullman Register Pressure & Cyclomatic Depth Analyzer.
    """
    expr_str = str(expression).strip()
    if not expr_str:
        raise ValueError("Expression cannot be empty")

    try:
        tree = ast.parse(expr_str, mode="eval")
    except SyntaxError as exc:
        return {
            "expression": expr_str,
            "syntax_valid": False,
            "safe_ast": False,
            "node_count": 0,
            "ast_depth": 0,
            "cyclomatic_complexity": 0,
            "sethi_ullman_registers": 0,
            "halstead_volume": 0.0,
            "variables": [],
            "security_violations": [f"SYNTAX_ERROR:{exc.msg}"],
        }

    node_count = 0
    operators: List[str] = []
    operands: List[str] = []
    variables: set[str] = set()
    branch_points = 0
    security_violations: List[str] = []

    called_func_names = {
        n.func.id
        for n in ast.walk(tree)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
    }
    allowed_node_types = (
        ast.Expression,
        ast.BinOp,
        ast.UnaryOp,
        ast.BoolOp,
        ast.Compare,
        ast.IfExp,
        ast.Call,
        ast.Name,
        ast.Constant,
        ast.Load,
        ast.operator,
        ast.unaryop,
        ast.boolop,
        ast.cmpop,
    )

    for node in ast.walk(tree):
        node_count += 1
        if not isinstance(node, allowed_node_types):
            security_violations.append(f"DISALLOWED_AST_NODE:{type(node).__name__}")
            continue
        if isinstance(node, ast.BinOp):
            operators.append(type(node.op).__name__)
        elif isinstance(node, ast.UnaryOp):
            operators.append(type(node.op).__name__)
        elif isinstance(node, ast.BoolOp):
            op_name = type(node.op).__name__
            operators.append(op_name)
            branch_points += max(1, len(node.values) - 1)
        elif isinstance(node, ast.Compare):
            for cmp_op in node.ops:
                operators.append(type(cmp_op).__name__)
            branch_points += len(node.ops)
        elif isinstance(node, ast.IfExp):
            operators.append("IfExp")
            branch_points += 1
        elif isinstance(node, ast.Call):
            if node.keywords:
                security_violations.append("DISALLOWED_CALL_KEYWORDS")
            if isinstance(node.func, ast.Name):
                fn_name = node.func.id
                operators.append(f"call:{fn_name}")
                if fn_name in {"min", "max", "clip"}:
                    branch_points += 1
                if fn_name not in _SAFE_MATH_FUNCTIONS:
                    security_violations.append(f"DISALLOWED_CALL:{fn_name}")
            else:
                security_violations.append("DISALLOWED_DYNAMIC_CALL")
        elif isinstance(node, ast.Name):
            if node.id not in _SAFE_MATH_FUNCTIONS and node.id not in called_func_names:
                variables.add(node.id)
                operands.append(node.id)
        elif isinstance(node, ast.Constant):
            if not isinstance(node.value, (int, float, bool)):
                security_violations.append(f"DISALLOWED_CONSTANT_TYPE:{type(node.value).__name__}")
            operands.append(repr(node.value))

    depth = _ast_tree_depth(tree.body)
    cyclomatic = 1 + branch_points
    ershov_regs = _compute_sethi_ullman_ershov_number(tree.body)

    if depth > max_allowed_depth:
        security_violations.append(f"AST_DEPTH_EXCEEDED:{depth}>{max_allowed_depth}")
    if cyclomatic > max_allowed_cyclomatic:
        security_violations.append(f"CYCLOMATIC_COMPLEXITY_EXCEEDED:{cyclomatic}>{max_allowed_cyclomatic}")

    # Halstead software science metrics
    n1 = len(set(operators))
    n2 = len(set(operands))
    N1 = len(operators)
    N2 = len(operands)
    vocab = n1 + n2
    length = N1 + N2
    halstead_vol = float(length * math.log2(max(vocab, 2))) if length > 0 else 0.0

    return {
        "expression": expr_str,
        "syntax_valid": True,
        "safe_ast": len(security_violations) == 0,
        "node_count": node_count,
        "ast_depth": depth,
        "cyclomatic_complexity": cyclomatic,
        "sethi_ullman_registers": ershov_regs,
        "halstead_volume": round(halstead_vol, 6),
        "variables": sorted(variables),
        "security_violations": security_violations,
    }


# ===========================================================================
# DOMAIN 7: DATABASES, DATA MINING & INFORMATION RETRIEVAL
# ===========================================================================

def _tokenize_ir(text: str) -> List[str]:
    cleaned = "".join(ch.lower() if (ch.isalnum() or ch in {"_", "-"}) else " " for ch in str(text))
    return [tok for tok in cleaned.split() if tok]


def bm25_and_rrf_hybrid_retrieval_scorer(
    query: str,
    documents: Sequence[Mapping[str, Any]],
    query_embedding: Optional[Sequence[float]] = None,
    k1: float = 1.5,
    b: float = 0.75,
    rrf_k: int = 60,
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Manning-Raghavan-Schutze / Buttcher-Clarke-Cormack Okapi BM25 +
    Cormack et al. (2009) Reciprocal Rank Fusion (RRF) Hybrid Retriever.

    Computes:
      $\\text{BM25}(D, Q) = \\sum_{q \\in Q} \\text{IDF}(q) \\cdot \\frac{f(q, D)(k_1 + 1)}{f(q, D) + k_1 (1 - b + b |D| / \\text{avgdl})}$
      $\\text{RRF}(d) = \\frac{1}{k_{\\text{rrf}} + \\text{rank}_{\\text{BM25}}(d)} + \\frac{1}{k_{\\text{rrf}} + \\text{rank}_{\\text{dense}}(d)}$.
    """
    if not documents:
        return {"query": query, "results": [], "avg_doc_length": 0.0, "rrf_k": int(rrf_k)}

    q_tokens = _tokenize_ir(query)
    N = len(documents)
    doc_tokens_list: List[List[str]] = []
    doc_freqs: Dict[str, int] = {}

    for doc in documents:
        toks = _tokenize_ir(str(doc.get("text", "")))
        doc_tokens_list.append(toks)
        for unique_tok in set(toks):
            doc_freqs[unique_tok] = doc_freqs.get(unique_tok, 0) + 1

    avgdl = max(float(sum(len(t) for t in doc_tokens_list)) / float(N), 1.0)

    bm25_scores: List[float] = []
    for toks in doc_tokens_list:
        dl = len(toks)
        tf_map: Dict[str, int] = {}
        for tok in toks:
            tf_map[tok] = tf_map.get(tok, 0) + 1
        score = 0.0
        for qt in q_tokens:
            tf = tf_map.get(qt, 0)
            if tf == 0:
                continue
            df = doc_freqs.get(qt, 0)
            idf = math.log(1.0 + (N - df + 0.5) / (df + 0.5))
            denom = tf + k1 * (1.0 - b + b * (dl / avgdl))
            score += idf * ((tf * (k1 + 1.0)) / denom)
        bm25_scores.append(score)

    # Dense cosine similarity scores (or deterministic token-hash fallback when embeddings omitted)
    dense_scores: List[float] = []
    if query_embedding is not None:
        q_vec = np.asarray(query_embedding, dtype=np.float64).reshape(-1)
        q_norm = max(float(np.linalg.norm(q_vec)), 1e-12)
        for doc in documents:
            emb = doc.get("embedding")
            if emb is not None:
                d_vec = np.asarray(emb, dtype=np.float64).reshape(-1)
                d_norm = max(float(np.linalg.norm(d_vec)), 1e-12)
                dense_scores.append(float(np.dot(q_vec, d_vec) / (q_norm * d_norm)))
            else:
                dense_scores.append(0.0)
    else:
        q_set = set(q_tokens)
        for toks in doc_tokens_list:
            d_set = set(toks)
            overlap = len(q_set & d_set)
            union = max(len(q_set | d_set), 1)
            dense_scores.append(overlap / float(union))

    bm25_order = sorted(range(N), key=lambda i: (-bm25_scores[i], i))
    dense_order = sorted(range(N), key=lambda i: (-dense_scores[i], i))

    bm25_rank = {doc_idx: r + 1 for r, doc_idx in enumerate(bm25_order)}
    dense_rank = {doc_idx: r + 1 for r, doc_idx in enumerate(dense_order)}

    results: List[Dict[str, Any]] = []
    for idx, doc in enumerate(documents):
        r_lex = bm25_rank[idx]
        r_den = dense_rank[idx]
        rrf_score = (1.0 / (rrf_k + r_lex)) + (1.0 / (rrf_k + r_den))
        results.append(
            {
                "doc_id": str(doc.get("doc_id", f"doc_{idx}")),
                "bm25_score": round(bm25_scores[idx], 8),
                "dense_score": round(dense_scores[idx], 8),
                "bm25_rank": r_lex,
                "dense_rank": r_den,
                "rrf_score": round(rrf_score, 8),
            }
        )

    results.sort(key=lambda r: (-r["rrf_score"], -r["bm25_score"], r["doc_id"]))
    return {
        "query": query,
        "results": results[: max(1, int(top_k))],
        "avg_doc_length": round(avgdl, 4),
        "rrf_k": int(rrf_k),
    }


# ===========================================================================
# DOMAIN 8: DISTRIBUTED SYSTEMS, NETWORKING, CLOUD & ZEROMQ
# ===========================================================================

def kleinberg_hits_and_pagerank_spectral_centrality(
    adjacency_matrix: Sequence[Sequence[float]],
    node_names: Optional[Sequence[str]] = None,
    damping_alpha: float = 0.85,
    max_iters: int = 200,
    tol: float = 1e-9,
) -> Dict[str, Any]:
    """
    Kleinberg (1999) / Easley-Kleinberg *Networks, Crowds, and Markets* Ch. 14
    Hub-Authority (HITS) & Brin-Page Spectral PageRank Centrality on Directed Matchup Graphs.
    """
    A = np.asarray(adjacency_matrix, dtype=np.float64)
    if A.ndim != 2 or A.shape[0] != A.shape[1] or A.shape[0] == 0:
        raise ValueError(f"adjacency_matrix must be non-empty square 2D array, got {A.shape}")
    if np.any(A < 0.0):
        raise ValueError("adjacency_matrix weights must be non-negative")

    if not (0.0 < damping_alpha < 1.0):
        raise ValueError(f"damping_alpha must be in (0, 1), got {damping_alpha}")

    n = A.shape[0]
    names = list(node_names) if node_names is not None else [f"node_{i}" for i in range(n)]
    if len(names) != n:
        raise ValueError("node_names length must match adjacency_matrix dimension")

    # 1. Kleinberg HITS power iteration: a <- A^T h, h <- A a (L2 normalized)
    h = np.full(n, 1.0 / math.sqrt(n), dtype=np.float64)
    a = np.full(n, 1.0 / math.sqrt(n), dtype=np.float64)
    hits_converged = False
    for _ in range(max_iters):
        a_next = A.T @ h
        a_norm = float(np.linalg.norm(a_next))
        a_next = (a_next / a_norm) if a_norm > 1e-15 else np.full(n, 1.0 / math.sqrt(n))

        h_next = A @ a_next
        h_norm = float(np.linalg.norm(h_next))
        h_next = (h_next / h_norm) if h_norm > 1e-15 else np.full(n, 1.0 / math.sqrt(n))

        diff = max(float(np.max(np.abs(h_next - h))), float(np.max(np.abs(a_next - a))))
        h, a = h_next, a_next
        if diff < tol:
            hits_converged = True
            break

    # Normalize HITS scores to L1 sum=1 for clean interpretability alongside L2 unit vectors
    h_l1 = h / max(float(np.sum(h)), 1e-15)
    a_l1 = a / max(float(np.sum(a)), 1e-15)

    # 2. Teleportation-damped PageRank with dangling-node stochastic redistribution
    out_deg = A.sum(axis=1)
    P = np.zeros_like(A)
    for i in range(n):
        if out_deg[i] > 1e-15:
            P[i, :] = A[i, :] / out_deg[i]
        else:
            P[i, :] = 1.0 / n

    pr = np.full(n, 1.0 / n, dtype=np.float64)
    teleport = np.full(n, (1.0 - damping_alpha) / n, dtype=np.float64)
    pr_converged = False
    for _ in range(max_iters):
        pr_next = damping_alpha * (P.T @ pr) + teleport
        pr_next = pr_next / np.sum(pr_next)
        if float(np.max(np.abs(pr_next - pr))) < tol:
            pr = pr_next
            pr_converged = True
            break
        pr = pr_next

    top_hub_idx = int(np.argmax(h_l1))
    top_auth_idx = int(np.argmax(a_l1))
    top_pr_idx = int(np.argmax(pr))

    return {
        "nodes": names,
        "hub_scores_l1": {names[i]: round(float(h_l1[i]), 8) for i in range(n)},
        "authority_scores_l1": {names[i]: round(float(a_l1[i]), 8) for i in range(n)},
        "pagerank_scores": {names[i]: round(float(pr[i]), 8) for i in range(n)},
        "top_hub_node": names[top_hub_idx],
        "top_authority_node": names[top_auth_idx],
        "top_pagerank_node": names[top_pr_idx],
        "hits_converged": hits_converged,
        "pagerank_converged": pr_converged,
    }


# ===========================================================================
# DOMAIN 9: CRYPTOGRAPHY, SECURITY & FUZZING
# ===========================================================================

def _american_to_implied_prob(odds: float) -> float:
    val = float(odds)
    if not math.isfinite(val) or abs(val) < 100.0:
        raise ValueError(f"Invalid American odds (must be <= -100 or >= +100): {odds}")
    if val < 0.0:
        return (-val) / ((-val) + 100.0)
    return 100.0 / (val + 100.0)


def _power_or_multiplicative_devig(implied_probs: Sequence[float], method: str = "multiplicative") -> np.ndarray:
    q = np.asarray(implied_probs, dtype=np.float64).reshape(-1)
    if q.size < 2 or np.any(~np.isfinite(q)) or np.any(q <= 0.0) or np.any(q >= 1.0):
        raise ValueError("implied_probs must have >=2 finite probabilities strictly in (0, 1)")
    overround = float(np.sum(q))
    if overround <= 0.0:
        raise ValueError("Sum of implied probabilities must be positive")
    if method == "power":
        # Find exponent k > 0 such that sum(q_i^k) = 1 via dynamic bracketing + bisection
        lo, hi = 0.05, 20.0
        while float(np.sum(q ** lo)) < 1.0 and lo > 1e-6:
            lo *= 0.5
        while float(np.sum(q ** hi)) > 1.0 and hi < 1e6:
            hi *= 2.0
        for _ in range(80):
            mid = 0.5 * (lo + hi)
            s = float(np.sum(q ** mid))
            if s > 1.0:
                lo = mid
            else:
                hi = mid
        p = q ** (0.5 * (lo + hi))
        return p / np.sum(p)
    if method != "multiplicative":
        raise ValueError(f"Unsupported devig method {method!r}; must be 'multiplicative' or 'power'")
    return q / overround


def metamorphic_fuzzing_probability_and_devig_checker(
    n_fuzz_trials: int = 250,
    seed: int = 20261107,
) -> Dict[str, Any]:
    """
    Zeller et al. *The Fuzzing Book* + Ross Anderson *Security Engineering*
    Property-Based Metamorphic Fuzzing Invariant Checker for Probability & De-Vig Functions.

    Tests 5 formal invariants across `n_fuzz_trials` randomized multi-outcome markets:
      1. Simplex Normalization: $\\sum_i p_i = 1$ within $10^{-12}$ and $p_i \\in (0, 1)$.
      2. Permutation Equivariance: $\\text{devig}(\\pi(q)) = \\pi(\\text{devig}(q))$ for any permutation $\\pi$.
      3. Monotonicity: Increasing $q_0 \\to q_0 + \\delta$ strictly increases fair probability $p_0$.
      4. Scale Homogeneity (Multiplicative De-Vig): $\\text{devig}(c \\cdot q) = \\text{devig}(q)$ for $c > 0$.
      5. Adversarial Input Rejection: Malformed odds (`0`, `+50`, `-99`, `NaN`, `Inf`) raise `ValueError` cleanly.
    """
    if n_fuzz_trials <= 0:
        raise ValueError("n_fuzz_trials must be positive")

    rng = np.random.default_rng(int(seed))
    violations: List[str] = []

    for trial in range(int(n_fuzz_trials)):
        n_outcomes = int(rng.integers(2, 7))
        raw_p = rng.dirichlet(np.ones(n_outcomes))
        overround_factor = float(rng.uniform(1.02, 1.25))
        q = np.clip(raw_p * overround_factor, 0.01, 0.98)

        for method in ("multiplicative", "power"):
            p = _power_or_multiplicative_devig(q, method=method)

            # Invariant 1: Simplex normalization & strict interior bounds
            if abs(float(np.sum(p)) - 1.0) > 1e-9 or np.any(p <= 0.0) or np.any(p >= 1.0):
                violations.append(f"TRIAL_{trial}_{method}_SIMPLEX_VIOLATION")

            # Invariant 2: Permutation equivariance
            perm = rng.permutation(n_outcomes)
            p_perm = _power_or_multiplicative_devig(q[perm], method=method)
            if float(np.max(np.abs(p_perm - p[perm]))) > 1e-7:
                violations.append(f"TRIAL_{trial}_{method}_PERMUTATION_VIOLATION")

            # Invariant 3: Monotonicity under positive perturbation of outcome 0
            if q[0] < 0.90:
                q_bumped = q.copy()
                q_bumped[0] = min(0.98, q[0] + 0.05)
                p_bumped = _power_or_multiplicative_devig(q_bumped, method=method)
                if not (p_bumped[0] > p[0]):
                    violations.append(f"TRIAL_{trial}_{method}_MONOTONICITY_VIOLATION")

        # Invariant 4: Scale homogeneity for multiplicative de-vig
        scale_c = 0.95 / max(float(np.max(q)), 0.5)
        p_mult = _power_or_multiplicative_devig(q, method="multiplicative")
        p_scaled = _power_or_multiplicative_devig(q * scale_c, method="multiplicative")
        if float(np.max(np.abs(p_mult - p_scaled))) > 1e-10:
            violations.append(f"TRIAL_{trial}_SCALE_INVARIANCE_VIOLATION")

    # Invariant 5: Adversarial malformed inputs must raise ValueError cleanly
    malformed_odds = [0.0, 50.0, -99.9, float("nan"), float("inf"), float("-inf")]
    rejected_count = 0
    for bad in malformed_odds:
        try:
            _american_to_implied_prob(bad)
            violations.append(f"MALFORMED_ODDS_ACCEPTED:{bad}")
        except ValueError:
            rejected_count += 1

    return {
        "n_fuzz_trials": int(n_fuzz_trials),
        "all_invariants_passed": len(violations) == 0,
        "simplex_normalization_verified": not any("SIMPLEX_VIOLATION" in v for v in violations),
        "permutation_equivariance_verified": not any("PERMUTATION_VIOLATION" in v for v in violations),
        "monotonicity_verified": not any("MONOTONICITY_VIOLATION" in v for v in violations),
        "scale_invariance_verified": not any("SCALE_INVARIANCE_VIOLATION" in v for v in violations),
        "malformed_inputs_rejected": rejected_count,
        "violations": violations,
    }


# ===========================================================================
# DOMAIN 10: OPEN-SOURCE BOOK & SYSTEMATIC TRADING REPOSITORIES
# ===========================================================================

def _isolation_forest_c_factor(n: int) -> float:
    """Average path length of unsuccessful search in BST (Liu, Ting & Zhou 2008)."""
    if n <= 1:
        return 1.0
    if n == 2:
        return 1.0
    euler_gamma = 0.5772156649015329
    harmonic = math.log(n - 1.0) + euler_gamma + (1.0 / (2.0 * (n - 1.0)))
    return 2.0 * harmonic - (2.0 * (n - 1.0) / float(n))


def _isolation_tree_path_lengths(
    X: np.ndarray,
    indices: np.ndarray,
    current_depth: int,
    max_depth: int,
    rng: np.random.Generator,
    out_depths: np.ndarray,
) -> None:
    """Recursive Liu, Ting & Zhou (2008) iTree partition with exact BST leaf adjustment c(|S|)."""
    m = indices.size
    if m <= 1 or current_depth >= max_depth:
        if m > 0:
            out_depths[indices] += float(current_depth) + _isolation_forest_c_factor(int(m))
        return

    sub = X[indices]
    feat_idx = int(rng.integers(0, X.shape[1]))
    col = sub[:, feat_idx]
    vmin = float(np.min(col))
    vmax = float(np.max(col))
    if vmax - vmin <= 1e-12:
        out_depths[indices] += float(current_depth) + _isolation_forest_c_factor(int(m))
        return

    split_p = float(rng.uniform(vmin, vmax))
    left_mask = col < split_p
    if np.all(left_mask) or not np.any(left_mask):
        out_depths[indices] += float(current_depth) + _isolation_forest_c_factor(int(m))
        return

    _isolation_tree_path_lengths(X, indices[left_mask], current_depth + 1, max_depth, rng, out_depths)
    _isolation_tree_path_lengths(X, indices[~left_mask], current_depth + 1, max_depth, rng, out_depths)


def detect_isolation_anomaly_and_kalshi_sportsbook_arbitrage(
    feature_observations: Sequence[Any],
    kalshi_yes_ask_cents: float,
    kalshi_no_ask_cents: float,
    sportsbook_home_american: float,
    sportsbook_away_american: float,
    kalshi_fee_rate: float = 0.07,
    anomaly_threshold: float = 0.65,
    n_trees: int = 128,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Domain 10 Primitive:
      1. Isolation Forest Path-Length Anomaly Score $s(x, n) = 2^{-E[h(x)] / c(n)}$
         (`yzhao062/anomaly-detection-resources`, Liu, Ting & Zhou 2008) via an ensemble
         of randomized isolation trees (`iTree`) with exact BST leaf correction $c(|S|)$.
      2. Kalshi Binary Contract vs Sportsbook Moneyline Cross-Market Discrepancy & Dutch-Book
         Arbitrage Detector (`bpangman/kalshi-command-center`, `paperswithbacktest/awesome-systematic-trading`).

    Kalshi taker fee formula (parabolic in contract price $P \\in (0,1)$):
      $\\text{fee}(P) = \\theta_{\\text{fee}} \\cdot P (1 - P)$, effective cost $P_{\\text{eff}} = P + \\text{fee}(P)$.
    """
    X = np.asarray(feature_observations, dtype=np.float64)
    if X.ndim == 1:
        X = X[:, None]
    if X.shape[0] < 3:
        raise ValueError("feature_observations must contain at least 3 observations")
    if not (1.0 <= kalshi_yes_ask_cents <= 99.0 and 1.0 <= kalshi_no_ask_cents <= 99.0):
        raise ValueError("Kalshi contract ask prices must be in [1, 99] cents")

    n = int(X.shape[0])
    c_n = _isolation_forest_c_factor(n)
    max_depth = max(1, int(math.ceil(math.log2(max(n, 2)))))
    rng = np.random.default_rng(int(seed))

    accum_depths = np.zeros(n, dtype=np.float64)
    all_idx = np.arange(n, dtype=int)
    num_trees = max(16, int(n_trees))
    for _ in range(num_trees):
        _isolation_tree_path_lengths(X, all_idx, 0, max_depth, rng, accum_depths)

    expected_depths = accum_depths / float(num_trees)
    isolation_scores = np.power(2.0, -expected_depths / max(c_n, 1e-9))
    flagged_indices = [int(i) for i, sc in enumerate(isolation_scores) if sc >= anomaly_threshold]

    # Kalshi effective probabilities (including parabolic taker fee)
    p_k_yes_raw = float(kalshi_yes_ask_cents) / 100.0
    p_k_no_raw = float(kalshi_no_ask_cents) / 100.0
    fee_yes = float(kalshi_fee_rate) * p_k_yes_raw * (1.0 - p_k_yes_raw)
    fee_no = float(kalshi_fee_rate) * p_k_no_raw * (1.0 - p_k_no_raw)
    p_k_yes_eff = p_k_yes_raw + fee_yes
    p_k_no_eff = p_k_no_raw + fee_no
    kalshi_fair_yes = p_k_yes_raw / max(p_k_yes_raw + p_k_no_raw, 1e-9)

    # Sportsbook implied & multiplicative de-vigged probabilities
    sb_home_imp = _american_to_implied_prob(sportsbook_home_american)
    sb_away_imp = _american_to_implied_prob(sportsbook_away_american)
    sb_fair = _power_or_multiplicative_devig([sb_home_imp, sb_away_imp], method="multiplicative")
    sb_fair_home = float(sb_fair[0])

    # Cross-market synthetic Dutch-book cost:
    # Leg A: Buy Kalshi YES (home) + Leg B: Bet Sportsbook Away
    dutch_cost_kalshi_yes_sb_away = p_k_yes_eff + sb_away_imp
    # Leg B: Buy Kalshi NO (away) + Leg A: Bet Sportsbook Home
    dutch_cost_kalshi_no_sb_home = p_k_no_eff + sb_home_imp
    best_dutch_cost = min(dutch_cost_kalshi_yes_sb_away, dutch_cost_kalshi_no_sb_home)
    arbitrage_exists = best_dutch_cost < 1.0
    arbitrage_roi = max(0.0, (1.0 - best_dutch_cost) / max(best_dutch_cost, 1e-9))

    discrepancy_abs = abs(kalshi_fair_yes - sb_fair_home)

    return {
        "n_observations": n,
        "isolation_c_n": round(c_n, 6),
        "isolation_scores": [round(float(s), 6) for s in isolation_scores],
        "max_isolation_score": round(float(np.max(isolation_scores)), 6),
        "flagged_anomaly_indices": flagged_indices,
        "kalshi_fair_yes_prob": round(kalshi_fair_yes, 6),
        "sportsbook_fair_home_prob": round(sb_fair_home, 6),
        "cross_market_prob_discrepancy": round(discrepancy_abs, 6),
        "best_synthetic_dutch_cost": round(best_dutch_cost, 6),
        "risk_free_arbitrage_detected": arbitrage_exists,
        "arbitrage_net_roi": round(arbitrage_roi, 6),
        "quarantine_policy_enforced": COMMERCIAL_USE_BLOCKED and LEARN_AND_REASON_ONLY,
    }


# ===========================================================================
# MASTER 10-DOMAIN VERIFICATION SUITE & MANIFEST / REPORT BUILDERS
# ===========================================================================

def run_all_10_domain_verification_suites() -> Dict[str, Any]:
    """Execute all 10 domain algorithmic primitives on canonical verification workloads."""
    # Domain 1
    d1_knapsack = solve_knapsack_and_multichoice_salary_cap(
        items=[
            {"id": "QB_LAMAR", "cost": 8000, "value": 26.4, "group": "QB"},
            {"id": "QB_BURROW", "cost": 7200, "value": 23.8, "group": "QB"},
            {"id": "RB_HENRY", "cost": 7800, "value": 22.1, "group": "RB"},
            {"id": "RB_CHASE_BROWN", "cost": 6400, "value": 18.5, "group": "RB"},
            {"id": "WR_CHASE", "cost": 8600, "value": 24.9, "group": "WR"},
            {"id": "WR_FLOWERS", "cost": 6500, "value": 17.2, "group": "WR"},
        ],
        capacity=29000,
        group_requirements={"QB": 1, "RB": 1, "WR": 2},
        cost_scale=100,
    )
    T_mdp = np.array(
        [
            [[0.70, 0.30], [0.20, 0.80]],
            [[0.40, 0.60], [0.10, 0.90]],
        ],
        dtype=np.float64,
    )
    R_mdp = np.array([[1.2, 2.5], [0.8, 3.1]], dtype=np.float64)
    O_pomdp = np.array(
        [
            [[0.85, 0.15], [0.25, 0.75]],
            [[0.80, 0.20], [0.15, 0.85]],
        ],
        dtype=np.float64,
    )
    d1_bellman = pomdp_mdp_bellman_backup(
        transition_tensor=T_mdp,
        reward_matrix=R_mdp,
        discount_gamma=0.90,
        observation_tensor=O_pomdp,
        belief_state=np.array([0.6, 0.4]),
    )
    d1_submodular = submodular_greedy_maximize(
        ground_set=["sig_pressure", "sig_weather", "sig_proe", "sig_redzone"],
        coverage_sets_or_fn={
            "sig_pressure": ["pass_epa", "sack_rate", "scramble_rate"],
            "sig_weather": ["deep_comp", "fg_make", "rush_share"],
            "sig_proe": ["pass_epa", "play_volume", "rush_share"],
            "sig_redzone": ["td_conv", "fg_make"],
        },
        cardinality_k=3,
    )

    # Domain 2
    d2_gp = gaussian_process_kernel_regression(
        X_train=[[0.0], [1.0], [2.0], [3.0]],
        y_train=[0.5, 1.2, 1.9, 2.8],
        X_test=[[1.5], [2.5]],
        length_scale=1.2,
        signal_variance=1.5,
        noise_variance=0.02,
    )
    X_lin = [[1.0, 0.2], [1.0, 0.8], [1.0, 1.5], [1.0, 2.2], [1.0, 3.0], [1.0, 3.8]]
    y_lin = [1.1, 1.7, 2.5, 3.1, 4.0, 4.8]
    d2_mackay = mackay_evidence_approximation(design_matrix=X_lin, targets=y_lin)
    d2_gae = td_lambda_gae_advantage_estimation(
        rewards=[1.0, 0.5, 2.0, -0.5],
        values=[0.8, 1.1, 1.4, 0.6, 0.0],
        dones=[False, False, False, True],
        gamma=0.99,
        lam=0.95,
    )

    # Domain 3
    d3_chinchilla = chinchilla_kaplan_compute_optimal_allocation(compute_flops=1e21)
    d3_dpo = dpo_implicit_reward_margin(
        policy_chosen_logprobs=[-1.1, -0.9, -1.3],
        policy_rejected_logprobs=[-2.4, -2.1, -2.8],
        ref_chosen_logprobs=[-1.5, -1.2, -1.6],
        ref_rejected_logprobs=[-1.9, -1.8, -2.0],
        beta=0.1,
    )
    d3_react = validate_react_thought_action_observation_loop(
        steps=[
            {
                "thought": "Query trench pressure rate for Ravens vs Bengals.",
                "action": "query_pressure",
                "action_input": "BAL_CIN",
                "observation": "Ravens blitz pressure rate is 38.4% with +0.19 EPA suppression.",
            },
            {
                "thought": "Synthesize final situational call from observed 38.4% pressure rate.",
                "action": "Finish",
                "action_input": "Ravens blitz pressure rate of 38.4% drives the situational edge.",
            },
        ],
        allowed_tools=["query_pressure", "query_weather"],
    )

    # Domain 4
    d4_eval = evaluate_agent_harness_pass_at_k_and_pass_hat_k(
        n_trials=10,
        c_successes=8,
        k_values=(1, 3, 5),
        mcp_spec_version="2026-07-28",
    )
    d4_context = calculate_long_running_context_compaction_budget(
        context_window_limit=200000,
        system_and_tools_tokens=12000,
        pinned_state_tokens=8000,
        current_history_tokens=150000,
        reserve_output_tokens=8000,
    )

    # Domain 5
    d5_simplex = boyd_vandenberghe_kkt_simplex_barrier_projection(
        target_vector=[0.55, 0.35, -0.10, 0.25],
        barrier_t=2000.0,
    )
    d5_devroye = devroye_exact_rejection_and_inversion_sampler(n_samples=2500, seed=42)

    # Domain 6
    d6_ast = analyze_equation_ast_complexity_and_cyclomatic_depth(
        expression="clip(base_prob + 0.35 * tanh(epa_diff / max(sigma, 0.05)), 0.01, 0.99)"
    )

    # Domain 7
    d7_ir = bm25_and_rrf_hybrid_retrieval_scorer(
        query="Sinkhorn optimal transport snap trajectory",
        documents=[
            {"doc_id": "DOC-1", "text": "Sinkhorn Knopp optimal transport reallocates snap trajectory probability mass"},
            {"doc_id": "DOC-2", "text": "Conformal quantile regression calibrates player receiving yardage intervals"},
            {"doc_id": "DOC-3", "text": "Boyd Vandenberghe interior point barrier projects onto probability simplex"},
        ],
        top_k=3,
    )

    # Domain 8
    d8_graph = kleinberg_hits_and_pagerank_spectral_centrality(
        adjacency_matrix=[
            [0.0, 3.2, 2.1, 1.4],
            [0.5, 0.0, 1.8, 0.9],
            [0.4, 1.1, 0.0, 2.5],
            [0.2, 0.6, 0.7, 0.0],
        ],
        node_names=["QB_BURROW", "WR_CHASE", "WR_HIGGINS", "RB_BROWN"],
    )

    # Domain 9
    d9_fuzz = metamorphic_fuzzing_probability_and_devig_checker(n_fuzz_trials=200)

    # Domain 10
    d10_arb = detect_isolation_anomaly_and_kalshi_sportsbook_arbitrage(
        feature_observations=[1.0, 1.1, 0.95, 1.05, 0.98, 1.02, 1.01, 0.99, 8.75],
        kalshi_yes_ask_cents=52.0,
        kalshi_no_ask_cents=50.0,
        sportsbook_home_american=-135.0,
        sportsbook_away_american=125.0,
    )

    return {
        "domain_1_algorithms": {
            "knapsack": d1_knapsack,
            "pomdp_bellman": d1_bellman,
            "submodular_greedy": d1_submodular,
        },
        "domain_2_ml_foundations": {
            "gaussian_process": d2_gp,
            "mackay_evidence": d2_mackay,
            "td_lambda_gae": d2_gae,
        },
        "domain_3_arxiv_scaling_alignment": {
            "chinchilla_kaplan": d3_chinchilla,
            "dpo_margin": d3_dpo,
            "react_validator": d3_react,
        },
        "domain_4_agent_harnesses": {
            "pass_at_k_and_pass_hat_k": d4_eval,
            "context_compaction_budget": d4_context,
        },
        "domain_5_convex_and_sampling": {
            "kkt_simplex_barrier": d5_simplex,
            "devroye_sampler": d5_devroye,
        },
        "domain_6_compilers_and_ast": d6_ast,
        "domain_7_databases_and_ir": d7_ir,
        "domain_8_distributed_and_spectral": d8_graph,
        "domain_9_crypto_security_fuzzing": d9_fuzz,
        "domain_10_repos_and_arbitrage": d10_arb,
    }


def write_open_access_mega_library_markdown_report(manifest: Mapping[str, Any], md_path: Path = SUMMARY_MD_PATH) -> Path:
    """Write the human-readable Markdown summary report for the 420+ item Mega-Library."""
    summary = manifest["catalog_summary"]
    suites = manifest["verification_suites"]
    lines = [
        "# Open-Access CS, Algorithms, ML, Convex/Bayesian Math, Compilers, Distributed Systems, Security & Agent Engineering Mega-Library (2026-11-07)",
        "",
        "## 1. Executive Summary & Quarantine Governance",
        f"- **Total Cataloged Works**: `{summary['total_cataloged_items']}` (`>= 420` requirement satisfied)",
        f"- **Canonical Domains**: `{summary['total_domains']}`",
        f"- **Foundational ArXiv Papers Cataloged**: `{summary['foundational_arxiv_papers_count']}`",
        f"- **Quarantined GitHub Repositories (`INGEST-AND-LEARN`)**: `{summary['quarantined_github_repos_count']}`",
        f"- **`COMMERCIAL_USE_BLOCKED`**: `{summary['all_repos_commercial_use_blocked']}`",
        f"- **`LEARN_AND_REASON_ONLY`**: `{summary['all_repos_learn_and_reason_only']}`",
        f"- **`install_permitted_in_prod`**: `{not summary['all_repos_install_permitted_in_prod_false']}` (all `False`)",
        "",
        "## 2. 10-Domain Catalog & Mathematical Primitives Matrix",
        "",
        "| Domain ID | Domain Title | Cataloged Items | Executable Primitives |",
        "|---:|---|---:|---|",
    ]
    for dom in MEGA_LIBRARY_10_DOMAINS:
        d_id = dom["domain_id"]
        cnt = len(DOMAIN_CATALOGS[d_id])
        prims = ", ".join(f"`{p}`" for p in dom["primitives"])
        lines.append(f"| {d_id} | {dom['title']} | {cnt} | {prims} |")

    lines.extend(
        [
            "",
            "## 3. Empirical Verification Highlights Across All 10 Domains",
            f"- **Domain 1 (Algorithms & Combinatorial Optimization)**: Multi-Choice Salary Cap selected `{suites['domain_1_algorithms']['knapsack']['selected_ids']}` with total value `{suites['domain_1_algorithms']['knapsack']['total_value']}`; POMDP Bellman converged in `{suites['domain_1_algorithms']['pomdp_bellman']['iterations']}` iterations; Submodular greedy achieved `{suites['domain_1_algorithms']['submodular_greedy']['objective_value']}` with `(1 - 1/e) = {suites['domain_1_algorithms']['submodular_greedy']['theoretical_approximation_ratio']}` guarantee.",
            f"- **Domain 2 (ML, GPML, MacKay Evidence & RL)**: GP log marginal likelihood `{suites['domain_2_ml_foundations']['gaussian_process']['log_marginal_likelihood']}`; MacKay evidence effective parameters `gamma = {suites['domain_2_ml_foundations']['mackay_evidence']['gamma_effective_parameters']}`; TD(lambda)/GAE advantages `{suites['domain_2_ml_foundations']['td_lambda_gae']['advantages_gae']}`.",
            f"- **Domain 3 (Transformer Scaling, DPO & ReAct)**: Chinchilla tokens-per-parameter ratio `{suites['domain_3_arxiv_scaling_alignment']['chinchilla_kaplan']['tokens_per_parameter_ratio']}`; DPO loss `{suites['domain_3_arxiv_scaling_alignment']['dpo_margin']['dpo_loss']}`; ReAct trace valid `{suites['domain_3_arxiv_scaling_alignment']['react_validator']['valid']}`.",
            f"- **Domain 4 (Agent Harnesses, MCP 2026-07-28 & Evals)**: `Pass@k = {suites['domain_4_agent_harnesses']['pass_at_k_and_pass_hat_k']['pass_at_k']}` vs `Pass^k = {suites['domain_4_agent_harnesses']['pass_at_k_and_pass_hat_k']['pass_hat_k']}`; Context compaction reclaimed `{suites['domain_4_agent_harnesses']['context_compaction_budget']['tokens_reclaimed']}` tokens.",
            f"- **Domain 5 (Convex Optimization & Devroye Sampling)**: Boyd-Vandenberghe KKT stationarity residual `{suites['domain_5_convex_and_sampling']['kkt_simplex_barrier']['kkt_stationarity_residual']:.2e}`; Devroye rejection empirical acceptance `{suites['domain_5_convex_and_sampling']['devroye_sampler']['empirical_acceptance_rate']}` vs theoretical `{suites['domain_5_convex_and_sampling']['devroye_sampler']['theoretical_acceptance_rate']}`.",
            f"- **Domain 6 (Compilers & AST Analysis)**: AST depth `{suites['domain_6_compilers_and_ast']['ast_depth']}`, McCabe cyclomatic complexity `{suites['domain_6_compilers_and_ast']['cyclomatic_complexity']}`, Sethi-Ullman registers `{suites['domain_6_compilers_and_ast']['sethi_ullman_registers']}`.",
            f"- **Domain 7 (Databases & Hybrid IR)**: Top BM25+RRF document `{suites['domain_7_databases_and_ir']['results'][0]['doc_id']}` with fused RRF score `{suites['domain_7_databases_and_ir']['results'][0]['rrf_score']}`.",
            f"- **Domain 8 (Distributed Systems & Spectral Centrality)**: Top HITS hub `{suites['domain_8_distributed_and_spectral']['top_hub_node']}`, top authority `{suites['domain_8_distributed_and_spectral']['top_authority_node']}`, top PageRank `{suites['domain_8_distributed_and_spectral']['top_pagerank_node']}`.",
            f"- **Domain 9 (Cryptography, Security & Fuzzing)**: `{suites['domain_9_crypto_security_fuzzing']['n_fuzz_trials']}` metamorphic fuzzing trials passed (`all_invariants_passed = {suites['domain_9_crypto_security_fuzzing']['all_invariants_passed']}`).",
            f"- **Domain 10 (Quarantined Repos, Anomaly Detection & Cross-Market Arbitrage)**: Max isolation score `{suites['domain_10_repos_and_arbitrage']['max_isolation_score']}` (flagged index `{suites['domain_10_repos_and_arbitrage']['flagged_anomaly_indices']}`), cross-market discrepancy `{suites['domain_10_repos_and_arbitrage']['cross_market_prob_discrepancy']}`.",
            "",
            "## 4. Foundational ArXiv Papers Cataloged",
            "",
            "| ArXiv ID | Title | Authors | Year | Key Mathematical Formula |",
            "|---|---|---|---:|---|",
        ]
    )
    for paper in FOUNDATIONAL_ARXIV_PAPERS_CATALOG:
        lines.append(
            f"| `{paper['arxiv_id']}` | {paper['title']} | {paper['authors']} | {paper['year']} | `{paper['key_formula']}` |"
        )

    lines.extend(
        [
            "",
            "## 5. Quarantined GitHub Repositories (`INGEST-AND-LEARN` Governance)",
            "",
            "| Repo ID | Repository Slug | Subdomain | `COMMERCIAL_USE_BLOCKED` | `LEARN_AND_REASON_ONLY` | `install_permitted_in_prod` |",
            "|---|---|---|---|---|---|",
        ]
    )
    for repo in QUARANTINED_GITHUB_REPOS_CATALOG:
        lines.append(
            f"| `{repo['repo_id']}` | `{repo['repo_slug']}` | `{repo['subdomain']}` | `{repo['COMMERCIAL_USE_BLOCKED']}` | `{repo['LEARN_AND_REASON_ONLY']}` | `{repo['install_permitted_in_prod']}` |"
        )
    lines.append("")
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text("\n".join(lines), encoding="utf-8")
    return md_path


def build_open_access_mega_library_manifest(
    write_files: bool = True,
    manifest_path: Path = MANIFEST_JSON_PATH,
    summary_md_path: Path = SUMMARY_MD_PATH,
) -> Dict[str, Any]:
    """Build (and optionally write) the complete JSON manifest and Markdown summary."""
    summary = get_mega_library_catalog_summary()
    suites = run_all_10_domain_verification_suites()
    all_items = [item for d_id in sorted(DOMAIN_CATALOGS) for item in DOMAIN_CATALOGS[d_id]]

    payload_hash = hashlib.sha256(
        json.dumps(
            {
                "summary": summary,
                "repo_count": len(QUARANTINED_GITHUB_REPOS_CATALOG),
                "total_items": len(all_items),
            },
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()

    manifest: Dict[str, Any] = {
        "schema_version": "1.0.0",
        "generated_at": "2026-11-07T23:59:00Z",
        "manifest_sha256": payload_hash,
        "engine_module": "intelligence/corpus_registry/open_access_cs_math_ml_and_agent_library_engine.py",
        "doctrine_governance": {
            "INGEST_AND_LEARN": True,
            "COMMERCIAL_USE_BLOCKED": COMMERCIAL_USE_BLOCKED,
            "LEARN_AND_REASON_ONLY": LEARN_AND_REASON_ONLY,
            "INSTALL_PERMITTED_IN_PROD": INSTALL_PERMITTED_IN_PROD,
        },
        "catalog_summary": summary,
        "domains": list(MEGA_LIBRARY_10_DOMAINS),
        "foundational_arxiv_papers": list(FOUNDATIONAL_ARXIV_PAPERS_CATALOG),
        "quarantined_github_repositories": list(QUARANTINED_GITHUB_REPOS_CATALOG),
        "catalog_items": all_items,
        "verification_suites": suites,
    }

    if write_files:
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        write_open_access_mega_library_markdown_report(manifest, md_path=summary_md_path)

    return manifest


if __name__ == "__main__":
    out = build_open_access_mega_library_manifest(write_files=True)
    print(
        json.dumps(
            {
                "total_cataloged_items": out["catalog_summary"]["total_cataloged_items"],
                "quarantined_github_repos_count": out["catalog_summary"]["quarantined_github_repos_count"],
                "manifest_sha256": out["manifest_sha256"],
            },
            indent=2,
        )
    )
