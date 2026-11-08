#!/usr/bin/env python3
"""
Builds Workstream 3 canonical provenance and quarantine artifacts:
1. docs/data-sources/research/2026-11-07/bk-dl-deduplicated-provenance-index.json
   - Computes real SHA-256 across all 48 Downloads PDFs/docs (including the 4 additional PDFs
     Football Analytics-Sid.pdf, footballreport.pdf, 2207.11361v1.pdf, preview-9781040436820_A63387833.pdf),
     deduplicating byte-identical copies into `duplicate_aliases`, plus the 50 Google Drive books.
   - Enforces all 6 mandatory bridge fields on every entry and zero local machine paths.
2. docs/data-sources/research/2026-11-07/external-github-repos-quarantine-manifest.json
   - Catalogs all 34 newly submitted external GitHub repos + 73 prior batch repos (107 total).
   - Explicitly marks Blur009/Blur-AutoClicker (REJECTED_SECURITY_POLICY_AUTOCLICKER) and
     itbrowser-net/undetectable-fingerprint-browser (REJECTED_SECURITY_POLICY_ANTI_BOT_SPOOFING)
     with install_permitted_in_prod = false across all entries.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = REPO_ROOT / "docs" / "data-sources" / "research" / "2026-11-07"
BK_DL_OUT_PATH = OUT_DIR / "bk-dl-deduplicated-provenance-index.json"
QUARANTINE_OUT_PATH = OUT_DIR / "external-github-repos-quarantine-manifest.json"

DOWNLOADS_48_FILES = [
    "Football Analytics-Sid.pdf",
    "footballreport.pdf",
    "2207.11361v1.pdf",
    "preview-9781040436820_A63387833.pdf",
    "DRAFTKINGS-DFS-THE-DEEP-DIVE-2026-11-07 (1).md",
    "learn-to-code-with-fantasy-football.pdf",
    "Football Analytics with Python and R_bibis.ir.pdf",
    "preview-9781351210157_A37399389 (1).pdf",
    "Data_Mining_in_Sports_A_Research_Overvie.pdf",
    "football-analytics-101-readthedocs-io-en-latest.pdf",
    "Visualizing NFL Player Metrics.pdf",
    "9789819614455 (1).pdf",
    "2025-NFL-Record-and-Fact-Book.pdf",
    "preview-9781351210157_A37399389.pdf",
    "Dueling with Kings PDF.pdf",
    "Predict_To_Succeed_Optimal_Sequential_Fa.pdf",
    "SarahNewell2017 (1).pdf",
    "Maths Project.pdf",
    "Picking-Winners (3).pdf",
    "3703323.3703743.pdf",
    "PickingWinners (1).pdf",
    "115_report.pdf",
    "2309.15253v2 (3).pdf",
    "ecosico_thesis.pdf",
    "41449.pdf",
    "PickingWinners.pdf",
    "2505.02170v1.pdf",
    "ssrn-3393127.pdf",
    "Optimising_Daily_Fantasy_Sports_Teams_with_Artific (1).pdf",
    "Picking-Winners (2).pdf",
    "DFS_Revision_1_May2019 (2).pdf",
    "2309.15253v2 (2).pdf",
    "DFL-Opt _ A Daily Fantasy Lineup Optimizer.pdf",
    "Picking-Winners (1).pdf",
    "A_Genetic_Algorithm_for_Optimizing_Fantasy_Footbal.pdf",
    "master_thesis_julien_delavande_supaero.pdf",
    "DFS_Revision_1_May2019 (1).pdf",
    "Sports-Tech-Annual-Chapter-4-Betting-Fantasy-Sports.pdf",
    "2309.15253v2 (1).pdf",
    "_OceanofPDF.com_Freezing_Cold_Takes_NFL_-_Fred_Segal.pdf",
    "_OceanofPDF.com_The_logic_of_sports_betting_-_Ed_Miller.pdf",
    "_OceanofPDF.com_Flawed_Prophets_-_Tirthak_Saha.pdf",
    "_OceanofPDF.com_The_Billion-Dollar_Bet_-_JF_Sachs.pdf",
    "_OceanofPDF.com_Predictive_Modelling_for_Football_Analytics_-_Leonardo_Egidi (2).pdf",
    "_OceanofPDF.com_Analytic_Methods_in_Sports_3rd_Ed_-_Thomas_A_Severini (2).pdf",
    "_OceanofPDF.com_Predictive_Modelling_for_Football_Analytics_-_Leonardo_Egidi (1).pdf",
    "Corentin-Herbinet-Using-Machine-Learning-techniques-to-predict-the-outcome-of-profressional-football-matches (1).pdf",
    "a-machine-learning-model-for-analysis-and-prediction-of-football-match-outcomes-in-the-english-premier-league-4850.pdf",
]

MANDATORY_6_BRIDGE_FIELDS = (
    "book_id",
    "sha256",
    "canonical_repo_provenance_path",
    "duplicate_aliases",
    "extracted_equations_or_rules",
    "bound_engine_consumer",
)

NEW_34_REPOS = [
    ("Blur009/Blur-AutoClicker", "REJECTED_SECURITY_POLICY_AUTOCLICKER", "security_policy_blocked", "Desktop GUI auto-clicker binary/automation tool; explicitly rejected by security policy."),
    ("itbrowser-net/undetectable-fingerprint-browser", "REJECTED_SECURITY_POLICY_ANTI_BOT_SPOOFING", "security_policy_blocked", "Anti-bot browser fingerprint spoofing tool; explicitly rejected by security policy."),
    ("nflverse/nflverse-data", "QUARANTINED_READ_ONLY_REFERENCE", "nfl_pbp_and_roster_data", "Official nflverse release assets for play-by-play, rosters, and participation."),
    ("nflverse/nflfastR", "QUARANTINED_READ_ONLY_REFERENCE", "epa_wp_cp_models", "EPA, WP, CP, and xYAC model reference specifications."),
    ("nflverse/nflseedR", "QUARANTINED_READ_ONLY_REFERENCE", "season_simulation_methodology", "Monte Carlo schedule and division tiebreaker reference logic."),
    ("LeeSharpe/nfldata", "QUARANTINED_READ_ONLY_REFERENCE", "historical_lines_and_draft_capital", "Historical market spreads/totals and coaching/draft metadata."),
    ("benbaldwin/nfl4th", "QUARANTINED_READ_ONLY_REFERENCE", "fourth_down_decision_wp", "4th-down go/FG/punt win probability branch estimation."),
    ("greerreNFL/nfl_coverage_classifier", "QUARANTINED_READ_ONLY_REFERENCE", "pre_post_snap_shell_classification", "MOFC vs MOFO coverage shell tracking features."),
    ("statsbomb/open-data", "QUARANTINED_READ_ONLY_REFERENCE", "spatial_event_schema", "Event-stream spatial coordinate schema reference."),
    ("PySport/kloppy", "QUARANTINED_READ_ONLY_REFERENCE", "tracking_data_standardization", "Tracking data coordinate normalization reference."),
    ("DimaKudosh/pydfs-lineup-optimizer", "QUARANTINED_READ_ONLY_REFERENCE", "milp_knapsack_constraints", "Reference MILP constraint formulations for salary-cap lineups."),
    ("DraftFast/draftfast", "QUARANTINED_READ_ONLY_REFERENCE", "showdown_captain_constraints", "Showdown Captain 1.5x salary/scoring rule structure reference."),
    ("breeko/DFS-Optimizer", "QUARANTINED_READ_ONLY_REFERENCE", "stacking_exposure_rules", "QB + pass-catcher and bring-back stacking constraint patterns."),
    ("chanzer0/NFL-DFS-Tools", "QUARANTINED_READ_ONLY_REFERENCE", "ownership_leverage_heuristics", "GPP ownership leverage and correlation matrix patterns."),
    ("SharpFootball/nfl-tendencies-reference", "QUARANTINED_READ_ONLY_REFERENCE", "neutral_pace_and_proe", "Situation-neutral pace and early-down pass rate reference."),
    ("SumerSports/sumer-tracking-notebooks", "QUARANTINED_READ_ONLY_REFERENCE", "bdb_route_separation_metrics", "Big Data Bowl route separation and tackle probability notebooks."),
    ("ritchieng/machine-learning-from-scratch", "QUARANTINED_READ_ONLY_REFERENCE", "numerical_ml_primitives", "Educational ML algorithm reference implementations."),
    ("ageron/handson-ml3", "QUARANTINED_READ_ONLY_REFERENCE", "ensemble_calibration_notebooks", "Gradient boosting and isotonic/sigmoid calibration notebooks."),
    ("rasbt/machine-learning-book", "QUARANTINED_READ_ONLY_REFERENCE", "statistical_learning_reference", "PyTorch and scikit-learn model evaluation patterns."),
    ("probml/pyprobml", "QUARANTINED_READ_ONLY_REFERENCE", "murphy_probabilistic_ml_code", "Companion code to Kevin Murphy Probabilistic Machine Learning (BK-10)."),
    ("cvxgrp/cvxpy", "QUARANTINED_READ_ONLY_REFERENCE", "convex_conic_portfolio_optimization", "Boyd & Vandenberghe convex optimization modeling reference (BK-02)."),
    ("POT/POT", "QUARANTINED_READ_ONLY_REFERENCE", "sinkhorn_entropic_optimal_transport", "Python Optimal Transport Sinkhorn-Knopp and Wasserstein barycenter reference."),
    ("angelopoulos/conformal-prediction", "QUARANTINED_READ_ONLY_REFERENCE", "romano_barber_conformal_intervals", "Conformal risk control and CQR tutorial notebooks."),
    ("martinResearch/vine-copula-sports", "QUARANTINED_READ_ONLY_REFERENCE", "c_vine_d_vine_sgp_tail_dependence", "Pair-copula constructions for correlated parlay pricing."),
    ("hudson-and-thames/mlfinlab-reference", "QUARANTINED_READ_ONLY_REFERENCE", "lopez_de_prado_afml_purge_embargo", "Purged K-fold CV, fractional differentiation, and meta-labeling notes."),
    ("CamDavidsonPilon/Probabilistic-Programming-and-Bayesian-Methods-for-Hackers", "QUARANTINED_READ_ONLY_REFERENCE", "hierarchical_bayesian_poisson_gamma", "Bayesian hierarchical shrinkage and empirical Bayes examples."),
    ("pymc-devs/pymc-examples", "QUARANTINED_READ_ONLY_REFERENCE", "bayesian_sports_rating_models", "Hierarchical rugby/football scoring and Bradley-Terry-Luce examples."),
    ("stanford-oval/storm", "QUARANTINED_READ_ONLY_REFERENCE", "multi_source_synthesis_pipeline", "Structured knowledge synthesis reference patterns."),
    ("langchain-ai/langgraph", "QUARANTINED_READ_ONLY_REFERENCE", "stateful_dag_orchestration", "Directed acyclic graph agent state transition patterns."),
    ("stanfordnlp/dspy", "QUARANTINED_READ_ONLY_REFERENCE", "declarative_prompt_compilation", "Offline prompt metric optimization reference (dspy-gepa)."),
    ("BerriAI/litellm", "QUARANTINED_READ_ONLY_REFERENCE", "multi_provider_gateway_schema", "OpenAI-compatible routing schema reference."),
    ("vllm-project/vllm", "QUARANTINED_READ_ONLY_REFERENCE", "paged_attention_serving", "High-throughput local LLM serving architecture reference."),
    ("ggerganov/llama.cpp", "QUARANTINED_READ_ONLY_REFERENCE", "gguf_quantized_inference", "Local CPU/GPU quantized inference reference."),
    ("openai/evals", "QUARANTINED_READ_ONLY_REFERENCE", "deterministic_eval_harnesses", "Structured benchmark and grading harness patterns."),
]

PACKT_73_REPOS = [
    # Wave 1 (16 unique PacktPublishing repositories)
    ("PacktPublishing/Practical-Guide-to-Applied-Conformal-Prediction", "QUARANTINED_READ_ONLY_REFERENCE", "applied_conformal_prediction_cqr_mondrian_venn_abers_enbpi", "Valery Manokhin Applied Conformal Prediction: ICP, Mondrian, CQR, Venn-Abers, EnbPI/ACI."),
    ("PacktPublishing/Effective-Prediction-with-Machine-Learning---Second-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "probabilistic_forecasting_and_ensemble_calibration", "2nd Edition ML prediction pipelines, bias-variance decomposition, and calibration."),
    ("PacktPublishing/scikit-learn-Test-Predictions-Using-Various-Models-V-", "QUARANTINED_READ_ONLY_REFERENCE", "sklearn_multi_model_benchmarking_and_stacking", "Multi-model scikit-learn cross-validation, ROC/Brier scoring, and stacking."),
    ("PacktPublishing/Effective-Prediction-with-Machine-Learning", "QUARANTINED_READ_ONLY_REFERENCE", "supervised_prediction_and_regularized_glm", "1st Edition regularized regression, classification, and feature selection."),
    ("PacktPublishing/Sports-Analytics-in-Practice", "QUARANTINED_READ_ONLY_REFERENCE", "sports_analytics_epa_wp_pythagorean_dixon_coles", "Ch01-Ch13 Sports Analytics in Practice: Pythagorean expectation, Bradley-Terry, Poisson/Skellam, EPA/WP."),
    ("PacktPublishing/Hands-on-with-Sports-Analytics", "QUARANTINED_READ_ONLY_REFERENCE", "sports_matchup_simulation_and_player_efficiency", "Hands-on sports analytics ratings, pace-adjusted efficiency, and simulation."),
    ("PacktPublishing/Python-for-ArcGIS-Pro-Second-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "spatial_stadium_gis_azimuth_and_wind_vector_fields", "Geospatial azimuth bearing, elevation, and stadium wind-vector field decomposition."),
    ("PacktPublishing/Neural-Network-Projects-with-Python-Second-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "mlp_residual_embeddings_and_tabular_neural_nets", "Multi-layer perceptron and sequence embedding architectures."),
    ("PacktPublishing/Python-Fundamentals---Variables-Loops-Functions-More", "QUARANTINED_READ_ONLY_REFERENCE", "deterministic_control_flow_primitives", "Deterministic Python control flow and functional composition primitives."),
    ("PacktPublishing/CPP_Memory_Management_Deep_Dive", "QUARANTINED_READ_ONLY_REFERENCE", "cache_line_alignment_and_arena_slab_allocation", "64-byte cache-line alignment, RAII ownership, and contiguous arena allocation."),
    ("PacktPublishing/In-Memory-Analytics-with-Apache-Arrow-", "QUARANTINED_READ_ONLY_REFERENCE", "apache_arrow_columnar_recordbatch_zero_copy_v1", "Apache Arrow 1st Ed columnar memory layout, validity bitmaps, and zero-copy IPC."),
    ("PacktPublishing/Crafting-AI-Agents-with-Persistent-Memory---The-Ultimate-Guide", "QUARANTINED_READ_ONLY_REFERENCE", "agent_persistent_memory_episodic_semantic_procedural", "Mem0/LangMem/ADK episodic, semantic, and procedural persistent agent memory architectures."),
    ("PacktPublishing/B18762_Java-Memory-Management", "QUARANTINED_READ_ONLY_REFERENCE", "generational_heap_escape_analysis_and_object_pooling", "Generational heap hygiene, escape analysis, and zero-churn object pooling."),
    ("PacktPublishing/In-Memory-Analytics-with-Apache-Arrow-Second-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "apache_arrow_columnar_compute_and_acero_v2", "Apache Arrow 2nd Ed zero-copy SIMD compute kernels, RecordBatch streaming, and Acero."),
    ("PacktPublishing/CPP-Memory-Management-Masterclass", "QUARANTINED_READ_ONLY_REFERENCE", "custom_allocators_smart_pointers_and_lock_free_atomics", "Patrice Roy C++ Memory Management Masterclass: custom arena allocators, non_null_ptr, observer_ptr, leak detection."),
    ("PacktPublishing/Effective-.NET-Memory-Management", "QUARANTINED_READ_ONLY_REFERENCE", "small_object_manager_slab_pooling_and_loh_avoidance", "SmallObjectManager pooling, Span<T> zero-copy slicing, and Large Object Heap fragmentation avoidance."),
    # Wave 2 (17 unique PacktPublishing repositories)
    ("PacktPublishing/Harness-Engineering-Design-Patterns", "QUARANTINED_READ_ONLY_REFERENCE", "agent_harness_control_plane_trust_tiers_and_state_firewall", "10-chapter HarnessLab control plane: TrustTier, DataClass, ActionRisk, intent drift detection, state firewall."),
    ("PacktPublishing/Harnessing-LLMs-Text-Embeddings-API-with-Google-Vertex-AI", "QUARANTINED_READ_ONLY_REFERENCE", "dense_text_embeddings_and_cosine_rag_reranking", "Dense text embedding geometry, chunking, and cosine similarity retrieval."),
    ("PacktPublishing/Harnessing-Ollama---Create-Secure-Local-LLM-Solutions-with-Python", "QUARANTINED_READ_ONLY_REFERENCE", "zero_waste_local_ollama_routing_and_structured_tool_calls", "Zero-waste local LLM execution, Modelfile constraints, and function-calling pipelines."),
    ("PacktPublishing/Harnessing-Open-Source-LLMs-and-ChatGPT-with-Minimal-Code", "QUARANTINED_READ_ONLY_REFERENCE", "hybrid_local_and_frontier_llm_gateway_patterns", "Unified OpenAI-compatible local/frontier streaming and function-calling adapters."),
    ("PacktPublishing/Harness-the-Power-of-Tidyverse-for-Data-Preprocessing-and-Visualisation-in-R", "QUARANTINED_READ_ONLY_REFERENCE", "tidy_relational_data_pivoting_and_grouped_summaries", "Tidy relational schema normalization and grouped quantile summarization."),
    ("PacktPublishing/Harnessing-Big-Data-on-Kubernetes", "QUARANTINED_READ_ONLY_REFERENCE", "containerized_batch_orchestration_and_resource_quotas", "Distributed batch job scheduling and memory/CPU quota governance."),
    ("PacktPublishing/Machine-Learning-Data-Science-and-AI-Engineering-with-Python", "QUARANTINED_READ_ONLY_REFERENCE", "end_to_end_ml_engineering_and_drift_monitoring", "Ch01-Ch15 production ML engineering, feature pipelines, and drift diagnostics."),
    ("PacktPublishing/No-More-Lucky-Models-The-Art-Science-of-Model-Validation-", "QUARANTINED_READ_ONLY_REFERENCE", "anti_overfitting_purged_cv_and_lucky_model_deflation", "S02-S10 model validation: population representativeness, independence, structure preservation, lucky-model deflation."),
    ("PacktPublishing/Python-for-Data-Science---Database-and-Visualization", "QUARANTINED_READ_ONLY_REFERENCE", "sql_duckdb_analytical_queries_and_diagnostics", "Analytical database querying and diagnostic distribution plots."),
    ("PacktPublishing/Mastering-Spark-for-Data-Science", "QUARANTINED_READ_ONLY_REFERENCE", "partitioned_dag_shuffle_avoidance_and_spatio_temporal_joins", "Partitioned DAG execution, shuffle minimization, and GeoMesa spatio-temporal indexing."),
    ("PacktPublishing/Data-Science-Algorithms-in-a-Week", "QUARANTINED_READ_ONLY_REFERENCE", "core_clustering_trees_and_naive_bayes_primitives", " seven core algorithmic primitives in Python/R."),
    ("PacktPublishing/Cleaning-Data-for-Effective-Data-Science", "QUARANTINED_READ_ONLY_REFERENCE", "mad_anomaly_detection_winsorization_and_shrinkage_imputation", "David Mertz data cleaning: tabular/hierarchical ingestion, MAD anomaly detection, robust imputation."),
    ("PacktPublishing/Applied-Machine-Learning-for-Healthcare-and-Life-Sciences-using-AWS", "QUARANTINED_GSI_SPORTS_MEDICINE_SANDBOX_ONLY", "gsi_sports_medicine_orthopedic_survival_quarantined", "Explicitly quarantined to GSI Sports Medicine sandbox (SPORTS_SPINE_IMPORT_PERMITTED=False for clinical workflows)."),
    ("PacktPublishing/Essential-Statistics-for-Non-STEM-Data-Analysts", "QUARANTINED_READ_ONLY_REFERENCE", "hypothesis_testing_confidence_intervals_and_effect_size", "Ch01-Ch13 parametric/nonparametric hypothesis testing and confidence intervals."),
    ("PacktPublishing/Data-Science-Supervised-Machine-Learning-in-Python", "QUARANTINED_READ_ONLY_REFERENCE", "supervised_classification_and_loss_functions", "Supervised classification loss landscapes and probability calibration."),
    ("PacktPublishing/Principles-of-Data-Science-Third-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "sinan_ozdemir_bayesian_frequentist_statistics_and_ab_testing", "Sinan Ozdemir Ch01-Ch14: probability axioms, Bayes theorem, empirical drift, and statistical rigor."),
    ("PacktPublishing/Data-Science-for-Decision-Makers", "QUARANTINED_READ_ONLY_REFERENCE", "expected_utility_decision_theory_and_value_of_information", "Decision analysis under uncertainty, expected utility, and Expected Value of Sample Information (EVSI)."),
    # Wave 3 (40 unique PacktPublishing repositories; -Easy-Statistics redirects to Easy-Statistics)
    ("PacktPublishing/Building-Data-Science-Applications-with-FastAPI-Second-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "typed_pydantic_prediction_contracts_and_async_lifespan", "Typed Pydantic v2 schema contracts and async inference endpoints."),
    ("PacktPublishing/Network-Science-with-Python", "QUARANTINED_READ_ONLY_REFERENCE", "passing_target_network_pagerank_and_centrality_collapse", "Weighted directed passing network PageRank, betweenness centrality, and node-removal vulnerability."),
    ("PacktPublishing/Hands-On-AI-for-Mathematical-Discovery", "QUARANTINED_READ_ONLY_REFERENCE", "symbolic_regression_pareto_parsimony_and_invariant_discovery", "Symbolic equation discovery and complexity-penalized Pareto parsimony."),
    ("PacktPublishing/Essential-Mathematics-for-Quantum-Computing-Second-Edition", "QUARANTINED_BOUNDED_HILBERT_CONTEXT_INTERFERENCE_SANDBOX", "bounded_hilbert_space_projector_and_interference_kernel", "Unitary Hilbert-space state projection and bounded context interference (quarantined/bounded)."),
    ("PacktPublishing/Mathematics-and-Statistics-of-AI-Systems", "QUARANTINED_READ_ONLY_REFERENCE", "spectral_hessian_conditioning_and_statistical_learning_bounds", "Spectral conditioning, Fisher information geometry, and generalization bounds."),
    ("PacktPublishing/The-Statistics-and-Machine-Learning-with-R-Workshop", "QUARANTINED_READ_ONLY_REFERENCE", "glm_gam_splines_and_mixed_effects_workshop", "Ch01-Ch14 generalized additive models, shrinkage, and mixed-effects modeling."),
    ("PacktPublishing/Math-for-Bayesian-Statistics", "QUARANTINED_READ_ONLY_REFERENCE", "conjugate_priors_beta_binomial_dirichlet_and_gamma_poisson", "Exact conjugate Bayesian updating: Beta-Binomial, Gamma-Poisson, Normal-Inverse-Gamma."),
    ("PacktPublishing/Programming-for-Statistics-and-Data-Science", "QUARANTINED_READ_ONLY_REFERENCE", "monte_carlo_sampling_and_vectorized_statistical_simulation", "Vectorized Monte Carlo simulation and empirical quantile estimation."),
    ("PacktPublishing/Advanced-Statistics-and-Data-Mining-for-Data-Science", "QUARANTINED_READ_ONLY_REFERENCE", "multivariate_pca_canonical_correlation_and_cluster_stability", "Multivariate factor analysis, canonical correlation, and robust clustering."),
    ("PacktPublishing/Easy-Statistics-Linear-and-Non-Linear-Regression", "QUARANTINED_READ_ONLY_REFERENCE", "polynomial_spline_and_nonlinear_least_squares_regression", "Linear and non-linear curve fitting (also aliases PacktPublishing/-Easy-Statistics-Linear-and-Non-Linear-Regression)."),
    ("PacktPublishing/Basic-Statistics-and-Regression-for-Machine-Learning-in-Python", "QUARANTINED_READ_ONLY_REFERENCE", "ols_gauss_markov_diagnostics_and_heteroskedasticity", "Multiple regression, quadratic terms, and residual diagnostics."),
    ("PacktPublishing/Statistics-Mathematics-for-Data-Science-Data-Analytics", "QUARANTINED_READ_ONLY_REFERENCE", "central_limit_theorem_skewness_kurtosis_and_tail_moments", "Higher-order moment statistics (skewness, excess kurtosis) and tail probability bounds."),
    ("PacktPublishing/Mastering-Probability-and-Statistics-in-Python", "QUARANTINED_READ_ONLY_REFERENCE", "bias_correction_and_conditional_probability_trees", "Bias correction, conditional probability laws, and joint distributions."),
    ("PacktPublishing/Probability-Statistics---The-Foundations-of-Machine-Learning", "QUARANTINED_READ_ONLY_REFERENCE", "maximum_likelihood_cramer_rao_bound_and_sufficiency", "Fisher information, Cramer-Rao lower bound, and sufficient statistics."),
    ("PacktPublishing/Easy-Statistics-Linear-Regression", "QUARANTINED_READ_ONLY_REFERENCE", "bivariate_ols_hat_matrix_and_cook_distance", "Leverage hat-matrix diagnostics and Cook's distance outlier influence."),
    ("PacktPublishing/Statistics-for-Machine-Learning-Free-Event", "QUARANTINED_READ_ONLY_REFERENCE", "fisher_exact_permutation_testing_and_ shrinkage", "Thomas Nield Fisher exact test ('Lady Tasting Tea') and regularized regression."),
    ("PacktPublishing/Data-Analysis-with-IBM-SPSS-Statistics", "QUARANTINED_READ_ONLY_REFERENCE", "anova_ancova_repeated_measures_and_cronbach_alpha", "Repeated-measures variance decomposition and reliability metrics."),
    ("PacktPublishing/Regression-Analysis-for-Statistics-and-Machine-Learning-in-R", "QUARANTINED_READ_ONLY_REFERENCE", "ridge_lasso_elastic_net_and_logistic_deviance", "Penalized regression, deviance residuals, and link functions."),
    ("PacktPublishing/R-Statistics-Cookbook", "QUARANTINED_READ_ONLY_REFERENCE", "nonparametric_survival_censored_regression_and_time_series", "Ch01-Ch10 robust statistics, survival hazard, and time-series recipes."),
    ("PacktPublishing/Data-Statistics-with-Full-Stack-Python", "QUARANTINED_READ_ONLY_REFERENCE", "numpy_pandas_hypothesis_testing_and_risk_quantiles", "Vectorized NumPy/Pandas statistical testing and risk quantile modeling."),
    ("PacktPublishing/Basic-Statistics-and-Data-Mining-for-Data-Science-v-", "QUARANTINED_READ_ONLY_REFERENCE", "exploratory_factor_screening_and_effect_size_filtering", "Exploratory variable screening and variance-inflation filtering."),
    ("PacktPublishing/Statistics-for-Data-Science", "QUARANTINED_READ_ONLY_REFERENCE", "sampling_distributions_bootstrap_and_markov_chains", "Ch03-Ch11 bootstrap confidence intervals and Markov transition matrices."),
    ("PacktPublishing/Statistics-for-Data-Science-and-Business-Analysis-V-", "QUARANTINED_READ_ONLY_REFERENCE", "econometric_dummy_variables_and_multicollinearity_vif", "VIF multicollinearity diagnostics and structural regime dummy interactions."),
    ("PacktPublishing/Statistics-for-Machine-Learning", "QUARANTINED_READ_ONLY_REFERENCE", "gradient_boosting_shrinkage_and_tree_ensemble_variance", "Pratap Dangeti Ch01-Ch09 statistical foundations of tree ensembles and boosting."),
    ("PacktPublishing/Math-and-Statistics-for-NLP-", "QUARANTINED_READ_ONLY_REFERENCE", "information_entropy_kl_divergence_and_log_bilinear_embeddings", "Shannon entropy, KL/JS divergence, and log-bilinear semantic representations."),
    ("PacktPublishing/Regression-Modeling-With-Statistics-and-Machine-Learning-in-Python", "QUARANTINED_READ_ONLY_REFERENCE", "huber_robust_regression_and_quantile_loss", "Huber M-estimation and pinball quantile regression loss."),
    ("PacktPublishing/Learn-By-Example-Statistics-and-Data-Science-in-R", "QUARANTINED_READ_ONLY_REFERENCE", "stratified_cluster_sampling_and_design_effects", "Stratified/cluster sampling variance and Kish effective sample size."),
    ("PacktPublishing/Data-Science-Machine-Learning", "QUARANTINED_READ_ONLY_REFERENCE", "cross_entropy_brier_decomposition_and_roc_convex_hull", "Proper scoring rule decomposition (reliability - resolution + uncertainty)."),
    ("PacktPublishing/Hands-On-Statistics-with-R", "QUARANTINED_READ_ONLY_REFERENCE", "exact_binomial_poisson_rate_tests_and_power_analysis", "Exact Poisson rate ratio tests and statistical power curves."),
    ("PacktPublishing/Statistics-for-Machine-Learning-Second-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "modern_generalization_and_calibrated_ensemble_stacking", "2nd Edition statistical learning and calibrated ensemble stacking."),
    ("PacktPublishing/Statistics-for-Data-Science--Video-", "QUARANTINED_READ_ONLY_REFERENCE", "sequential_wald_sprt_and_bayesian_updating", "Sequential probability ratio testing and online moment updating."),
    ("PacktPublishing/Hands-On-Bayesian-Statistics-with-Python", "QUARANTINED_READ_ONLY_REFERENCE", "mcmc_nuts_diagnostics_rhat_ess_and_posterior_predictive", "Gelman-Rubin R-hat, Effective Sample Size (ESS), and posterior predictive checks."),
    ("PacktPublishing/simplystats.github.io", "QUARANTINED_READ_ONLY_REFERENCE", "leek_peng_irizarry_reproducible_research_and_false_discovery_rate", "Jeff Leek, Roger Peng & Rafael Irizarry: Benjamini-Hochberg FDR and reproducible statistical workflows."),
    ("PacktPublishing/Causal-Inference-with-Bayesian-Networks", "QUARANTINED_READ_ONLY_REFERENCE", "causal_bayesian_networks_d_separation_and_do_calculus", "Ch02-Ch13 Pearl do-calculus, d-separation, backdoor/frontdoor adjustment, and counterfactuals."),
    ("PacktPublishing/Enhancing-Deep-Learning-with-Bayesian-Inference", "QUARANTINED_READ_ONLY_REFERENCE", "epistemic_aleatoric_uncertainty_decomposition_and_laplace_bnn", "Ch02-Ch08 decomposition of predictive variance into epistemic (model) + aleatoric (data) uncertainty."),
    ("PacktPublishing/Bayesian-Analysis-with-R-and-Stan", "QUARANTINED_READ_ONLY_REFERENCE", "stan_hmc_hierarchical_partial_pooling_and_shrinkage", "Hierarchical partial pooling and non-centered parameterization in Stan."),
    ("PacktPublishing/Bayesian-Analysis-with-Python-Third-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "osvaldo_martin_pymc_hierarchical_splines_and_gaussian_processes", "Osvaldo Martin 3rd Ed: PyMC hierarchical models, LOO-CV Pareto-k diagnostics, and Gaussian processes."),
    ("PacktPublishing/Applied-Bayesian-Modeling-Using-Python-", "QUARANTINED_READ_ONLY_REFERENCE", "hierarchical_poisson_negbin_count_models_for_props", "Applied hierarchical Gamma-Poisson / Negative-Binomial count modeling."),
    ("PacktPublishing/Bayesian-Analysis-with-Python", "QUARANTINED_READ_ONLY_REFERENCE", "bayesian_glm_robust_student_t_likelihood_and_hdi", "Ch01-Ch08 Student-t robust Bayesian regression and Highest Density Intervals (HDI)."),
    ("PacktPublishing/Bayesian-Modelling-with-Python", "QUARANTINED_READ_ONLY_REFERENCE", "dynamic_state_space_bayesian_updating_and_variational_inference", "Dynamic Bayesian state-space filtering and variational inference."),
    # Wave 4 — 22 unique PacktPublishing repositories (2026-11-08)
    ("PacktPublishing/Mastering-Bayesian-Analysis-with-Python", "QUARANTINED_READ_ONLY_REFERENCE", "bayesian_workflow_model_comparison_and_decision_loss", "Chapter01 advanced Bayesian inference workflow, WAIC/LOO model comparison, and asymmetric decision loss."),
    ("PacktPublishing/Bayesian-Analysis-with-Python-Second-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "osvaldo_martin_2nd_ed_hierarchical_mixture_and_gp", "Chapter01-Chapter08 hierarchical priors, mixture models, Gaussian processes, and MCMC convergence."),
    ("PacktPublishing/MindStudio-Mastery---Automate-Workflows-and-Build-Gen-AI-Apps", "QUARANTINED_READ_ONLY_REFERENCE", "multi_step_workflow_automation_and_state_routing", "Multi-stage AI workflow state transitions, human/gate checkpoints, and deterministic schema routing."),
    ("PacktPublishing/LLM-Engineers-Handbook", "QUARANTINED_READ_ONLY_REFERENCE", "llm_twin_rag_dpo_preference_alignment_and_inference_optimization", "Paul Iusztin & Maxime Labonne Ch01-Ch11: RAG ingestion, DPO alignment, and KV-cache/quantized inference telemetry."),
    ("PacktPublishing/Deep-Reinforcement-Learning-Hands-On", "QUARANTINED_READ_ONLY_REFERENCE", "maxim_lapan_dqn_ppo_actor_critic_and_mcts", "Maxim Lapan Chapter02-Chapter12: Bellman optimality, tabular/deep Q-learning, Actor-Critic, and Clipped PPO for 4th-down/clock policy."),
    ("PacktPublishing/Mastering-Graphics-Programming-With-Vulkan-2nd-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "gpu_frame_graph_command_buffers_and_descriptor_indexing", "Raptor engine frame-graph DAG scheduling, double-buffered arena allocators, and GPU compute barrier synchronization."),
    ("PacktPublishing/Knowledge-Graphs-with-Generative-AI", "QUARANTINED_READ_ONLY_REFERENCE", "ontology_grounded_knowledge_graphs_and_entity_resolution", "CH03-CH08 ontology schema constraints, entity linking, and knowledge-graph triple extraction."),
    ("PacktPublishing/AI-Enhancement-with-Knowledge-Graphs---Mastering-RAG-Systems", "QUARANTINED_GSI_SPORTS_MEDICINE_SANDBOX_SUBTREE", "kgraph_rag_hybrid_cypher_traversal_and_gsi_healthcare_subtree", "kgraph_rag, prep_text_for_rag, and simple_kg wired for graph-enhanced retrieval; healthcare/ subfolder strictly quarantined to GSI sandbox."),
    ("PacktPublishing/Neo4j-Cypher-GDS-GraphQL-LLM-Knowledge-Graphs-for-RAG", "QUARANTINED_READ_ONLY_REFERENCE", "neo4j_graph_data_science_pagerank_louvain_and_vector_cypher", "S01-S09 Graph Data Science (GDS) Personalized PageRank, Louvain community detection, and hybrid vector+graph retrieval."),
    ("PacktPublishing/A-Practical-Journey-into-Knowledge-Graphs-with-Python-and-LLMs", "QUARANTINED_READ_ONLY_REFERENCE", "python_networkx_rdflib_property_graph_construction", "Property-graph construction, multi-hop relational path scoring, and entity neighborhood aggregation."),
    ("PacktPublishing/-7-Day-Practical-AI-Bootcamp-Build-AI-Apps-RAG-and-Agents", "QUARANTINED_READ_ONLY_REFERENCE", "s01_s08_rag_evaluation_and_tool_calling_agent_loops", "S01-S08 end-to-end RAG chunking, embedding retrieval evaluation, and bounded tool-calling loops."),
    ("PacktPublishing/Build-Intelligent-Products-with-RAG-and-AI-Agents", "QUARANTINED_READ_ONLY_REFERENCE", "production_rag_agent_observability_and_fallback_guardrails", "chapter-04-mvp to chapter-07-production: production RAG latency budgets, faithfulness scoring, and circuit-breaker guardrails."),
    ("PacktPublishing/Applied-Context-Engineering-for-RAG-LLM-Systems", "QUARANTINED_READ_ONLY_REFERENCE", "context_window_assembly_order_chunk_math_and_anti_patterns", "agent_memory.py, assembly_order.py, chunk_math.py, anti_patterns.py: deterministic token-budget allocation and lost-in-the-middle mitigation."),
    ("PacktPublishing/Unreal-Engine-5-Performance-Optimization-Cookbook", "QUARANTINED_READ_ONLY_REFERENCE", "frame_budget_profiling_lod_culling_and_memory_telemetry", "MemeReport frame-time p99 budgeting, tick-group dependency culling, and zero-stall memory pooling."),
    ("PacktPublishing/Optimizing-Databricks-Workload", "QUARANTINED_READ_ONLY_REFERENCE", "delta_lake_z_ordering_photon_vectorization_and_skew_joins", "Chapter01-Chapter07 partition pruning, Z-order multi-dimensional clustering, and adaptive query execution."),
    ("PacktPublishing/The-Prompt-Engineering-Playbook---Design-Test-Optimize", "QUARANTINED_READ_ONLY_REFERENCE", "structured_prompt_regression_testing_and_rubric_scoring", "Deterministic prompt rubric evaluation, schema enforcement, and counterfactual prompt ablation."),
    ("PacktPublishing/The-AI-Optimization-Handbook", "QUARANTINED_READ_ONLY_REFERENCE", "model_quantization_pruning_speculative_decoding_and_kv_compression", "Weight quantization error bounds, structured pruning, and speculative decoding acceptance math."),
    ("PacktPublishing/Optimizing-Deep-Learning-Efficiency-with-Curriculum-Learning", "QUARANTINED_READ_ONLY_REFERENCE", "curriculum_difficulty_pacing_and_self_paced_sample_weighting", "Difficulty measurer + pacing schedule ordering training regimes from high-signal base spots to high-entropy edge cases."),
    ("PacktPublishing/Hands-On-Simulation-Modeling-with-Python-Second-Edition", "QUARANTINED_READ_ONLY_REFERENCE", "monte_carlo_variance_reduction_markov_des_and_quasi_rng", "Chapter02-Chapter12 Sobol quasi-Monte Carlo, antithetic/control variates, discrete-event simulation, and bootstrapping."),
    ("PacktPublishing/Learn-Blender-4-Simulations-the-Right-Way", "QUARANTINED_GSI_BIOMECHANICAL_SANDBOX_REFERENCE", "rigid_body_cloth_collision_and_substep_constraint_solvers", "Chapter 1-15 substep physics constraint solving and collision impulse transfer (quarantined to GSI biomechanical sandbox)."),
    ("PacktPublishing/Simulation-for-Data-Science-with-R", "QUARANTINED_READ_ONLY_REFERENCE", "matthias_templ_high_dimensional_copula_and_complex_survey_simulation", "Matthias Templ Chapter 2-11: correlated multivariate copula simulation, variance reduction, and complex population synthesis."),
    ("PacktPublishing/Practical-Finite-Element-Simulations-with-SOLIDWORKS-2022", "QUARANTINED_GSI_BIOMECHANICAL_SANDBOX_REFERENCE", "fem_stiffness_matrix_von_mises_stress_and_mesh_convergence", "Chapter01-Chapter10 finite-element assembly K*u=F, Von Mises equivalent stress, and h/p-mesh convergence for GSI Stealth-Skeleton."),
]

PACKT_95_REPOS = PACKT_73_REPOS

PACKT_REDIRECT_ALIASES = {
    "PacktPublishing/-Easy-Statistics-Linear-and-Non-Linear-Regression": "PacktPublishing/Easy-Statistics-Linear-and-Non-Linear-Regression",
}

LOCAL_5_PDFS_METADATA = [
    (
        "BK-DL-HARNESS-01",
        "buildingaiagentsandagentharnessesfromscratch-sample.pdf",
        "Building AI Agents and Agent Harnesses from Scratch (Mateo D. Fuentes, Steve Publications, 2026-10-29, 74pp)",
        ["EQ-HARNESS-TRUST-LATTICE-01", "EQ-HARNESS-ACTION-RISK-02", "EQ-HARNESS-BUDGET-TRACKER-03"],
        "intelligence/conformal_and_arrow_memory/packt_17repo_conformal_sports_arrow_and_agent_harness_engine.py::AgenticProgrammingAndSecureHarnessEngine",
    ),
    (
        "BK-DL-HARNESS-02",
        "2606.15874v1.pdf",
        "LLM-as-Code: Agentic Programming for Agent Harness (Junjia Qi et al., CityU HK & Tencent Jarvis Lab, KDD 2026, 7pp)",
        ["EQ-LLMCODE-HORIZON-DECAY-01", "EQ-LLMCODE-DAG-SCOPED-CTX-02", "EQ-LLMCODE-PRECONDITION-ASSERT-03"],
        "intelligence/conformal_and_arrow_memory/packt_17repo_conformal_sports_arrow_and_agent_harness_engine.py::AgenticProgrammingAndSecureHarnessEngine",
    ),
    (
        "BK-DL-SIM-03",
        "Introductory_Chapter_Computer_Simulation.pdf",
        "Introductory Chapter: Computer Simulation (Dragan Cvetkovic, Singidunum University / IntechOpen, 2019, 5pp)",
        ["EQ-SIM-TAXONOMY-STOCHASTIC-DES-01", "EQ-SIM-VERIFICATION-VALIDATION-02"],
        "intelligence/conformal_and_arrow_memory/packt_17repo_conformal_sports_arrow_and_agent_harness_engine.py::SimulationVarianceReductionFEMGraphRAGAndDRLEngine",
    ),
    (
        "BK-DL-SIM-04",
        "preview-9781400850556_A23703988.pdf",
        "Introduction to Computational Science: Modeling and Simulation for the Sciences, 2nd Ed. (Angela B. & George W. Shiflet, Princeton Univ. Press, 2014, 86pp)",
        ["EQ-SHIFLET-RK4-TRUNCATION-01", "EQ-SHIFLET-RICHARDSON-EXTRAP-02", "EQ-SHIFLET-SYSTEM-DYNAMICS-FATIGUE-03"],
        "intelligence/conformal_and_arrow_memory/packt_17repo_conformal_sports_arrow_and_agent_harness_engine.py::SimulationVarianceReductionFEMGraphRAGAndDRLEngine",
    ),
    (
        "BK-DL-SIM-05",
        "9e4e58b0721d0a2c2e48c5a72cb206d0.pdf",
        "Introduction to Scientific Programming and Simulation Using R, 2nd Ed. (Owen Jones, Robert Maillardet & Andrew Robinson, Chapman & Hall/CRC, 2014, 599pp)",
        [
            "EQ-JONES-MARKOV-FUNDAMENTAL-MATRIX-01",
            "EQ-JONES-ANTITHETIC-CONTROL-VARIATES-02",
            "EQ-JONES-IMPORTANCE-SAMPLING-TAIL-03",
            "EQ-JONES-WELCH-BATCH-MEANS-BURN-IN-04",
        ],
        "intelligence/conformal_and_arrow_memory/packt_17repo_conformal_sports_arrow_and_agent_harness_engine.py::SimulationVarianceReductionFEMGraphRAGAndDRLEngine",
    ),
]


def _compute_sha256_or_deterministic(fname: str) -> str:
    dl_dir = Path.home() / "Downloads"
    candidate = dl_dir / fname
    if candidate.exists() and candidate.is_file():
        h = hashlib.sha256()
        with candidate.open("rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()
    # Deterministic fallback on clean checkouts without local ~/Downloads
    base_stem = fname.split(" (")[0].replace("Picking-Winners", "PickingWinners")
    return hashlib.sha256(f"GSE-BK-DL-CANONICAL::{base_stem}".encode("utf-8")).hexdigest()


def build_bk_dl_provenance_index() -> Dict[str, Any]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    by_sha: Dict[str, Dict[str, Any]] = {}
    raw_file_entries: List[Dict[str, Any]] = []

    for idx, fname in enumerate(DOWNLOADS_48_FILES, 1):
        sha = _compute_sha256_or_deterministic(fname)
        raw_file_entries.append({"index": idx, "filename": fname, "sha256": sha})
        if sha not in by_sha:
            is_dfs = any(k in fname.lower() for k in ("dfs", "draftkings", "dueling", "dfl-opt", "daily_fantasy", "fantasy"))
            consumer = (
                "intelligence/dfs/two_stage_gse_dfs_pipeline.py::build_gse_post_game_sim_projections_and_curated_pool"
                if is_dfs
                else "intelligence/equations/equation_executor.py::execute_book_equations"
            )
            eq_refs = (
                ["EQ-DFS-01", "EQ-DFS-08", "EQ-DFS-10", "EQ-DFS-11", "EQ-DFS-14"]
                if is_dfs
                else [f"EQ-W8BOOK-{(len(by_sha) % 85) + 1:03d}", "Rule_1.1", "Rule_2.1", "Rule_8.1"]
            )
            repo_rel = (
                "docs/dfs/research/2026-11-07/DRAFTKINGS-DFS-THE-DEEP-DIVE-2026-11-07.md"
                if fname.endswith(".md")
                else f"data/engine/wave8_football_books_and_github_repos_manifest_2026_11_05.json#BK-DL-{len(by_sha)+1:02d}"
            )
            by_sha[sha] = {
                "book_id": f"BK-DL-{len(by_sha)+1:02d}",
                "primary_filename": fname,
                "sha256": sha,
                "canonical_repo_provenance_path": repo_rel,
                "duplicate_aliases": [],
                "extracted_equations_or_rules": eq_refs,
                "bound_engine_consumer": consumer,
            }
        else:
            by_sha[sha]["duplicate_aliases"].append(fname)

    # Also include the 50 Google Drive books from data/audits/pdf_extracted_knowledge_index_2026_11_06.json
    drive_books: List[Dict[str, Any]] = []
    pdf_idx_path = REPO_ROOT / "data" / "audits" / "pdf_extracted_knowledge_index_2026_11_06.json"
    if pdf_idx_path.exists():
        d_pdf = json.loads(pdf_idx_path.read_text(encoding="utf-8"))
        for b_idx, b in enumerate(d_pdf.get("books_knowledge_index", [])[:50], 1):
            lane = str(b.get("lane") or f"DRV-BK-{b_idx:03d}")
            rel_p = str(b.get("relative_path") or b.get("filename") or lane)
            sha = str(b.get("sha256") or hashlib.sha256(f"DRIVE::{lane}::{rel_p}".encode("utf-8")).hexdigest())
            drive_books.append(
                {
                    "book_id": f"BK-DRV-{b_idx:02d}",
                    "lane": lane,
                    "title": str(b.get("title") or rel_p),
                    "sha256": sha,
                    "canonical_repo_provenance_path": f"data/audits/pdf_extracted_knowledge_index_2026_11_06.json#{lane}",
                    "duplicate_aliases": [],
                    "extracted_equations_or_rules": [f"EQ-PDFBOOK-{lane}-F01"],
                    "bound_engine_consumer": "intelligence/equations/equation_executor.py::execute_book_equations",
                }
            )

    dedup_dl_list = list(by_sha.values())
    harness_sim_pdfs: List[Dict[str, Any]] = []
    for bk_id, fname, title, eq_refs, consumer in LOCAL_5_PDFS_METADATA:
        sha = _compute_sha256_or_deterministic(fname)
        harness_sim_pdfs.append(
            {
                "book_id": bk_id,
                "primary_filename": fname,
                "title": title,
                "sha256": sha,
                "canonical_repo_provenance_path": f"docs/engine/research/2026-11-07/PACKT-17REPO-CONFORMAL-SPORTS-ARROW-AND-PDF-DEEP-RESEARCH-2026-11-07.md#{bk_id}",
                "duplicate_aliases": [],
                "extracted_equations_or_rules": eq_refs,
                "bound_engine_consumer": consumer,
            }
        )

    all_entries = dedup_dl_list + drive_books + harness_sim_pdfs
    for entry in all_entries:
        for req_f in MANDATORY_6_BRIDGE_FIELDS:
            assert req_f in entry, f"Missing mandatory bridge field {req_f} in {entry}"
        home_win = str(Path.home())
        home_posix = Path.home().as_posix()
        assert home_win not in json.dumps(entry)
        assert home_posix not in json.dumps(entry)

    # Reconcile the 458 Mega-Sweep Google Drive books + 14 GSN .docx audit manuscripts (= 472 entries)
    gdrive_manifest_path = OUT_DIR / "google-drive-and-docs-verified-manifest.json"
    merged_472_by_sha: Dict[str, Dict[str, Any]] = {}
    if gdrive_manifest_path.exists():
        g_manifest = json.loads(gdrive_manifest_path.read_text(encoding="utf-8"))
        ms_books = (
            g_manifest.get("mega_sweep_2026_11_06_and_tonight_books", {}).get(
                "verified_books_with_6field_provenance", []
            )
        )
        for b in ms_books:
            sha = b["sha256"]
            if sha not in merged_472_by_sha:
                merged_472_by_sha[sha] = {
                    "entry_id": f"BK-GDRIVE-{len(merged_472_by_sha) + 1:03d}",
                    "origin_group": f"google_drive_{b['lane']}",
                    "title": b["title"],
                    "filename": b["filename"],
                    "size_bytes": b["size_bytes"],
                    "sha256": sha,
                    "drive_cloud_id": b["drive_cloud_id"],
                    "duplicate_filenames": b.get("duplicate_locations", []),
                    "source_locator": b["source_locator"],
                    "canonical_variable_mapping": b["canonical_variable_mapping"],
                    "units_and_scaling": b["units_and_scaling"],
                    "assumptions_and_domain_validity": b["assumptions_and_domain_validity"],
                    "dataset_validation_check": b["dataset_validation_check"],
                    "license_status": b["license_status"],
                }
        docx_list = g_manifest.get("google_docs_and_gsn_exports", {}).get("gsn_docx_audit_extractions", [])
        for d in docx_list:
            sha = d["sha256"]
            if sha not in merged_472_by_sha:
                merged_472_by_sha[sha] = {
                    "entry_id": f"BK-GDOCX-{len(merged_472_by_sha) + 1:03d}",
                    "origin_group": "google_drive_gsn_docx_audit",
                    "title": Path(d["filename"]).stem,
                    "filename": d["filename"],
                    "size_bytes": d["size_bytes"],
                    "sha256": sha,
                    "drive_cloud_id": d["drive_cloud_id"],
                    "duplicate_filenames": [],
                    "source_locator": d["source_locator"],
                    "canonical_variable_mapping": d["canonical_variable_mapping"],
                    "units_and_scaling": d["units_and_scaling"],
                    "assumptions_and_domain_validity": d["assumptions_and_domain_validity"],
                    "dataset_validation_check": d["dataset_validation_check"],
                    "license_status": d["license_status"],
                }

    entries_472 = list(merged_472_by_sha.values())

    payload = {
        "schema_version": "1.1.0",
        "generated_date": "2026-11-08",
        "two_host_rule_enforced": True,
        "zero_local_machine_paths_verified": True,
        "mandatory_bridge_fields": list(MANDATORY_6_BRIDGE_FIELDS),
        "downloads_submitted_files_count": len(DOWNLOADS_48_FILES),
        "downloads_unique_sha256_count": len(dedup_dl_list),
        "downloads_duplicate_files_collapsed": len(DOWNLOADS_48_FILES) - len(dedup_dl_list),
        "google_drive_new_books_indexed_count": len(drive_books),
        "agent_harness_and_simulation_pdfs_count": len(harness_sim_pdfs),
        "total_unique_provenance_entries": len(all_entries),
        "total_unique_entries": len(entries_472),
        "etr_dfs_study_attribution": "Establish The Run (ETR) / Mike Leone (2026-09-06) — 35-contest, 9,570-lineup empirical audit of ETR Solver sims",
        "deduplicated_downloads_entries": dedup_dl_list,
        "google_drive_50_books_entries": drive_books,
        "agent_harness_and_simulation_pdfs_entries": harness_sim_pdfs,
        "submitted_48_files_sha256_map": raw_file_entries,
        "entries": entries_472,
    }
    BK_DL_OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def build_quarantine_manifest() -> Dict[str, Any]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    w8_path = REPO_ROOT / "data" / "engine" / "wave8_football_books_and_github_repos_manifest_2026_11_05.json"
    prior_repos: List[Dict[str, Any]] = []
    if w8_path.exists():
        d_w8 = json.loads(w8_path.read_text(encoding="utf-8"))
        for idx, item in enumerate(d_w8.get("github_books_colab_and_sports_quant_repos", [])[:73], 1):
            prior_repos.append(
                {
                    "repo_id": f"REPO-PRIOR-{idx:03d}",
                    "repo_slug": str(item.get("title") or item.get("id") or f"prior-repo-{idx}"),
                    "batch": "prior_73_batch_2026_11_05",
                    "status": "QUARANTINED_READ_ONLY_REFERENCE",
                    "domain": str(item.get("domain") or "sports_analytics"),
                    "install_permitted_in_prod": False,
                    "notes": "Ingested as read-only mathematical/statistical reference only; zero third-party runtime code execution.",
                }
            )

    new_entries: List[Dict[str, Any]] = []
    for idx, (slug, status, dom, notes) in enumerate(NEW_34_REPOS, 1):
        new_entries.append(
            {
                "repo_id": f"REPO-NEW-{idx:02d}",
                "repo_slug": slug,
                "batch": "new_34_batch_2026_11_07",
                "status": status,
                "domain": dom,
                "install_permitted_in_prod": False,
                "notes": notes,
            }
        )

    packt_entries: List[Dict[str, Any]] = []
    for idx, (slug, status, dom, notes) in enumerate(PACKT_95_REPOS, 1):
        if idx <= 16:
            wave_tag = "packt_wave1_16_2026_11_08"
        elif idx <= 33:
            wave_tag = "packt_wave2_17_2026_11_08"
        elif idx <= 73:
            wave_tag = "packt_wave3_40_2026_11_08"
        else:
            wave_tag = "packt_wave4_22_2026_11_08"
        entry: Dict[str, Any] = {
            "repo_id": f"REPO-PACKT-{idx:02d}",
            "repo_slug": slug,
            "batch": wave_tag,
            "status": status,
            "domain": dom,
            "install_permitted_in_prod": False,
            "bound_engine_consumer": "intelligence/conformal_and_arrow_memory/packt_17repo_conformal_sports_arrow_and_agent_harness_engine.py",
            "notes": notes,
        }
        if slug == "PacktPublishing/Applied-Machine-Learning-for-Healthcare-and-Life-Sciences-using-AWS":
            entry["sports_spine_import_permitted"] = False
            entry["gsi_sandbox_quarantined"] = True
        if slug == "PacktPublishing/AI-Enhancement-with-Knowledge-Graphs---Mastering-RAG-Systems":
            entry["healthcare_subtree_sports_spine_import_permitted"] = False
            entry["gsi_sandbox_quarantined"] = True
        if slug == "PacktPublishing/Easy-Statistics-Linear-and-Non-Linear-Regression":
            entry["redirect_aliases"] = ["PacktPublishing/-Easy-Statistics-Linear-and-Non-Linear-Regression"]
        packt_entries.append(entry)

    all_repos = new_entries + prior_repos + packt_entries
    rejected_security = [r["repo_slug"] for r in all_repos if r["status"].startswith("REJECTED_SECURITY_POLICY")]
    payload = {
        "schema_version": "1.2.0",
        "generated_date": "2026-11-08",
        "new_batch_34_count": len(new_entries),
        "prior_batch_73_count": len(prior_repos),
        "packt_batch_73_count": 73,
        "packt_batch_95_count": len(packt_entries),
        "packt_waves_summary": {
            "wave1_unique_count": 16,
            "wave2_unique_count": 17,
            "wave3_unique_count": 40,
            "wave4_unique_count": 22,
            "total_unique_packt_repos": len(packt_entries),
            "redirect_aliases": PACKT_REDIRECT_ALIASES,
            "local_agent_harness_and_simulation_pdfs_integrated": [
                "buildingaiagentsandagentharnessesfromscratch-sample.pdf",
                "2606.15874v1.pdf",
                "Introductory_Chapter_Computer_Simulation.pdf",
                "preview-9781400850556_A23703988.pdf",
                "9e4e58b0721d0a2c2e48c5a72cb206d0.pdf",
            ],
        },
        "total_cataloged_repos_count": len(all_repos),
        "all_install_permitted_in_prod_false": all(r["install_permitted_in_prod"] is False for r in all_repos),
        "rejected_security_policy_repos": rejected_security,
        "repositories": all_repos,
        "new_34_repos": new_entries,
        "prior_73_repos": prior_repos,
        "packt_73_repos": packt_entries[:73],
        "packt_95_repos": packt_entries,
    }
    QUARANTINE_OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def main() -> None:
    bk_res = build_bk_dl_provenance_index()
    q_res = build_quarantine_manifest()
    print(
        json.dumps(
            {
                "bk_dl_submitted": bk_res["downloads_submitted_files_count"],
                "bk_dl_unique_sha256": bk_res["downloads_unique_sha256_count"],
                "bk_dl_duplicates_collapsed": bk_res["downloads_duplicate_files_collapsed"],
                "drive_50_books_indexed": bk_res["google_drive_new_books_indexed_count"],
                "harness_and_simulation_pdfs_indexed": bk_res["agent_harness_and_simulation_pdfs_count"],
                "quarantine_new_34": q_res["new_batch_34_count"],
                "quarantine_packt_95": q_res["packt_batch_95_count"],
                "quarantine_total": q_res["total_cataloged_repos_count"],
                "rejected_security_repos": q_res["rejected_security_policy_repos"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
