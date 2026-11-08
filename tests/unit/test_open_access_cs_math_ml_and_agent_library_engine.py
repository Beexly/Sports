#!/usr/bin/env python3
"""
Unit & Integration Tests for `open_access_cs_math_ml_and_agent_library_engine.py`
=================================================================================
Verifies all 10 domains of the 420+ Open-Access CS, Algorithms, ML, Convex/Bayesian
Mathematics, Compilers, Distributed Systems, Security, and Agent Engineering Mega-Library,
the structured JSON manifest, the Markdown summary, and path hygiene (`check_charge_9`).
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import numpy as np
import pytest

from intelligence.corpus_registry import (
    DOMAIN_CATALOGS,
    FOUNDATIONAL_ARXIV_PAPERS_CATALOG,
    MEGA_LIBRARY_10_DOMAINS,
    QUARANTINED_GITHUB_REPOS_CATALOG,
    analyze_equation_ast_complexity_and_cyclomatic_depth,
    bm25_and_rrf_hybrid_retrieval_scorer,
    boyd_vandenberghe_kkt_simplex_barrier_projection,
    build_open_access_mega_library_manifest,
    calculate_long_running_context_compaction_budget,
    chinchilla_kaplan_compute_optimal_allocation,
    detect_isolation_anomaly_and_kalshi_sportsbook_arbitrage,
    devroye_exact_rejection_and_inversion_sampler,
    dpo_implicit_reward_margin,
    evaluate_agent_harness_pass_at_k_and_pass_hat_k,
    gaussian_process_kernel_regression,
    get_mega_library_catalog_summary,
    kleinberg_hits_and_pagerank_spectral_centrality,
    mackay_evidence_approximation,
    metamorphic_fuzzing_probability_and_devig_checker,
    pomdp_mdp_bellman_backup,
    run_all_10_domain_verification_suites,
    solve_knapsack_and_multichoice_salary_cap,
    submodular_greedy_maximize,
    td_lambda_gae_advantage_estimation,
    validate_react_thought_action_observation_loop,
)
from intelligence.corpus_registry.open_access_cs_math_ml_and_agent_library_engine import (
    MANIFEST_JSON_PATH,
    REPO_ROOT,
    SUMMARY_MD_PATH,
    _power_or_multiplicative_devig,
)


@pytest.fixture(scope="module")
def generated_manifest() -> dict:
    return build_open_access_mega_library_manifest(write_files=True)


def test_mega_library_catalog_and_quarantine_governance(generated_manifest: dict) -> None:
    summary = get_mega_library_catalog_summary()
    assert summary["total_domains"] == 10
    assert len(MEGA_LIBRARY_10_DOMAINS) == 10
    assert summary["total_cataloged_items"] >= 420
    assert summary["quarantined_github_repos_count"] >= 95
    assert summary["all_repos_commercial_use_blocked"] is True
    assert summary["all_repos_learn_and_reason_only"] is True
    assert summary["all_repos_install_permitted_in_prod_false"] is True

    # Verify all required anchor GitHub repos are quarantine-cataloged
    repo_slugs = {r["repo_slug"] for r in QUARANTINED_GITHUB_REPOS_CATALOG}
    required_repos = {
        "EbookFoundation/free-programming-books",
        "paperswithbacktest/awesome-systematic-trading",
        "bpangman/kalshi-command-center",
        "yzhao062/anomaly-detection-resources",
        "DatariusAI/Mathematics-for-AI",
        "oomol-lab/pdf-craft",
        "phiresky/ripgrep-all",
    }
    assert required_repos.issubset(repo_slugs)
    for repo in QUARANTINED_GITHUB_REPOS_CATALOG:
        assert repo["COMMERCIAL_USE_BLOCKED"] is True
        assert repo["LEARN_AND_REASON_ONLY"] is True
        assert repo["install_permitted_in_prod"] is False

    # Verify all 10 required foundational ArXiv papers are cataloged
    arxiv_ids = {p["arxiv_id"] for p in FOUNDATIONAL_ARXIV_PAPERS_CATALOG}
    required_arxiv = {
        "1706.03762",
        "2001.08361",
        "2203.15556",
        "2005.14165",
        "2005.11401",
        "2106.09685",
        "2203.02155",
        "2210.03629",
        "2212.08073",
        "2305.18290",
    }
    assert required_arxiv.issubset(arxiv_ids)

    # Verify manifest and markdown files exist on disk
    assert MANIFEST_JSON_PATH.exists()
    assert SUMMARY_MD_PATH.exists()
    disk_manifest = json.loads(MANIFEST_JSON_PATH.read_text(encoding="utf-8"))
    assert disk_manifest["catalog_summary"]["total_cataloged_items"] == summary["total_cataloged_items"]
    md_text = SUMMARY_MD_PATH.read_text(encoding="utf-8")
    assert "INGEST-AND-LEARN" in md_text
    assert "EbookFoundation/free-programming-books" in md_text


def test_domain_1_algorithms_knapsack_pomdp_and_submodular() -> None:
    # 1. Standard 0-1 knapsack & multi-choice salary-cap helper
    items = [
        {"id": "A", "cost": 10, "value": 60.0, "group": "G1"},
        {"id": "B", "cost": 20, "value": 100.0, "group": "G1"},
        {"id": "C", "cost": 30, "value": 120.0, "group": "G2"},
        {"id": "D", "cost": 15, "value": 70.0, "group": "G2"},
    ]
    res_01 = solve_knapsack_and_multichoice_salary_cap(items, capacity=50)
    assert res_01["feasible"] is True
    assert res_01["total_cost"] <= 50
    assert res_01["total_value"] == pytest.approx(230.0)  # A(60)+B(100)+D(70) = 230 at cost 45
    assert res_01["martello_toth_LP_upper_bound"] >= res_01["total_value"]

    res_mc = solve_knapsack_and_multichoice_salary_cap(
        items, capacity=45, group_requirements={"G1": 1, "G2": 1}
    )
    assert res_mc["feasible"] is True
    assert set(res_mc["selected_ids"]) == {"A", "C"}
    assert res_mc["total_value"] == pytest.approx(180.0)

    res_mc_tight = solve_knapsack_and_multichoice_salary_cap(
        items, capacity=35, group_requirements={"G1": 1, "G2": 1}
    )
    assert res_mc_tight["feasible"] is True
    assert set(res_mc_tight["selected_ids"]) == {"B", "D"}
    assert res_mc_tight["total_value"] == pytest.approx(170.0)

    # Edge cases: zero capacity, infeasible group requirement, negative cost, negative group req
    empty_res = solve_knapsack_and_multichoice_salary_cap(items, capacity=0, group_requirements={"G1": 1})
    assert empty_res["feasible"] is False
    infeasible_res = solve_knapsack_and_multichoice_salary_cap(
        items, capacity=100, group_requirements={"G1": 5}
    )
    assert infeasible_res["feasible"] is False
    with pytest.raises(ValueError):
        solve_knapsack_and_multichoice_salary_cap([{"id": "X", "cost": -5, "value": 10}], capacity=20)
    with pytest.raises(ValueError):
        solve_knapsack_and_multichoice_salary_cap(items, capacity=50, group_requirements={"G1": -1})

    # Non-divisible item costs with cost_scale > 1 must preserve exact optimality via GCD scaling
    non_div_items = [
        {"id": "A", "cost": 48, "value": 50.0},
        {"id": "B", "cost": 48, "value": 50.0},
        {"id": "C", "cost": 4, "value": 10.0},
    ]
    res_non_div = solve_knapsack_and_multichoice_salary_cap(non_div_items, capacity=100, cost_scale=10)
    assert res_non_div["feasible"] is True
    assert res_non_div["total_cost"] == 100
    assert res_non_div["total_value"] == pytest.approx(110.0)
    assert res_non_div["selected_ids"] == ["A", "B", "C"]

    # Large unscaled capacity (> 50_000) solved exactly via Martello-Toth Branch-and-Bound
    large_cap_items = [
        {"id": "P1", "cost": 1_250_001, "value": 45.0},
        {"id": "P2", "cost": 1_250_002, "value": 48.0},
        {"id": "P3", "cost": 2_499_997, "value": 90.0},
    ]
    res_bnb = solve_knapsack_and_multichoice_salary_cap(large_cap_items, capacity=3_750_000, cost_scale=1)
    assert res_bnb["algorithm"] == "Martello-Toth Exact Branch-and-Bound"
    assert res_bnb["total_cost"] <= 3_750_000
    assert res_bnb["total_value"] == pytest.approx(138.0)  # P2(48) + P3(90) at cost 3,749,999

    # 2. POMDP/MDP Bellman backup
    T = np.array(
        [
            [[0.8, 0.2], [0.1, 0.9]],
            [[0.3, 0.7], [0.05, 0.95]],
        ],
        dtype=np.float64,
    )
    R = np.array([[1.0, 2.0], [1.5, 3.0]], dtype=np.float64)
    O_mat = np.array(
        [
            [[0.9, 0.1], [0.2, 0.8]],
            [[0.85, 0.15], [0.1, 0.9]],
        ],
        dtype=np.float64,
    )
    bellman = pomdp_mdp_bellman_backup(
        transition_tensor=T,
        reward_matrix=R,
        discount_gamma=0.9,
        observation_tensor=O_mat,
        belief_state=np.array([0.5, 0.5]),
    )
    assert bellman["converged"] is True
    assert bellman["bellman_residual"] < 1e-8
    assert bellman["greedy_policy"] == [1, 1]
    for obs_post in bellman["pomdp_posterior_beliefs_by_obs"].values():
        assert sum(obs_post) == pytest.approx(1.0, abs=1e-6)

    # Tiger-style POMDP where observation informativeness changes backed-up belief value
    T_tiger = np.array(
        [
            [[1.0, 0.0], [0.5, 0.5], [0.5, 0.5]],
            [[0.0, 1.0], [0.5, 0.5], [0.5, 0.5]],
        ],
        dtype=np.float64,
    )
    R_tiger = np.array(
        [
            [-1.0, -100.0, 10.0],
            [-1.0, 10.0, -100.0],
        ],
        dtype=np.float64,
    )
    O_informative = np.array(
        [
            [[0.95, 0.05], [0.05, 0.95]],
            [[0.50, 0.50], [0.50, 0.50]],
            [[0.50, 0.50], [0.50, 0.50]],
        ],
        dtype=np.float64,
    )
    O_uninformative = np.full((3, 2, 2), 0.5, dtype=np.float64)
    pomdp_inf = pomdp_mdp_bellman_backup(
        T_tiger, R_tiger, discount_gamma=0.95, observation_tensor=O_informative, belief_state=np.array([0.5, 0.5])
    )
    pomdp_uninf = pomdp_mdp_bellman_backup(
        T_tiger, R_tiger, discount_gamma=0.95, observation_tensor=O_uninformative, belief_state=np.array([0.5, 0.5])
    )
    assert pomdp_inf["pomdp_best_action"] == 0
    assert pomdp_inf["pomdp_belief_value"] > pomdp_uninf["pomdp_belief_value"]

    with pytest.raises(ValueError):
        pomdp_mdp_bellman_backup(T, R, discount_gamma=1.05)

    # 3. Submodular greedy maximization with (1 - 1/e) guarantee
    cov = {
        "S1": {"f1", "f2", "f3"},
        "S2": {"f2", "f4", "f5"},
        "S3": {"f1", "f5", "f6"},
        "S4": {"f3"},
    }
    submod = submodular_greedy_maximize(
        ground_set=["S1", "S2", "S3", "S4"],
        coverage_sets_or_fn=cov,
        cardinality_k=3,
    )
    assert len(submod["selected_elements"]) == 3
    assert submod["objective_value"] == pytest.approx(6.0)
    assert submod["diminishing_returns_verified"] is True
    assert submod["theoretical_approximation_ratio"] == pytest.approx(1.0 - math.exp(-1.0), abs=1e-5)
    assert submod["finite_k_guarantee"] >= submod["theoretical_approximation_ratio"]


def test_domain_2_ml_gpml_mackay_and_td_lambda_gae() -> None:
    # 1. Gaussian Process Kernel Regression (RBF & Matern 5/2)
    X_tr = [[0.0], [1.0], [2.0], [3.0]]
    y_tr = [0.0, 1.0, 2.0, 3.0]
    for k_type in ("rbf", "matern52"):
        gp = gaussian_process_kernel_regression(
            X_train=X_tr,
            y_train=y_tr,
            X_test=[[1.0], [2.0], [1.5]],
            length_scale=1.5,
            signal_variance=2.0,
            noise_variance=1e-4,
            kernel_type=k_type,
        )
        assert gp["predictive_mean"][0] == pytest.approx(1.0, abs=0.05)
        assert gp["predictive_mean"][1] == pytest.approx(2.0, abs=0.05)
        assert 1.3 < gp["predictive_mean"][2] < 1.7
        assert all(s > 0.0 for s in gp["predictive_std_observable"])
        assert math.isfinite(gp["log_marginal_likelihood"])

    # Feature dimension mismatch & invalid kernel must raise ValueError (no silent broadcasting)
    with pytest.raises(ValueError):
        gaussian_process_kernel_regression(
            X_train=[[0.0, 1.0], [1.0, 2.0]],
            y_train=[1.0, 2.0],
            X_test=[[0.5]],
        )
    with pytest.raises(ValueError):
        gaussian_process_kernel_regression(X_train=X_tr, y_train=y_tr, X_test=[[1.0]], kernel_type="bogus")

    # 2. MacKay Type-II ML Evidence Approximation
    xs = np.linspace(0.0, 4.0, 12)
    Phi = np.column_stack([np.ones_like(xs), xs])
    targets = 1.5 + 2.2 * xs
    ev = mackay_evidence_approximation(Phi, targets)
    assert ev["alpha_prior_precision"] > 0.0
    assert ev["beta_noise_precision"] > 10.0
    assert 1.0 < ev["gamma_effective_parameters"] <= 2.0
    assert ev["posterior_mean_weights"][0] == pytest.approx(1.5, abs=0.05)
    assert ev["posterior_mean_weights"][1] == pytest.approx(2.2, abs=0.05)
    assert math.isfinite(ev["log_marginal_evidence"])

    # 3. TD(lambda) / GAE advantage estimation
    rewards = [1.0, 2.0, 3.0]
    values = [0.5, 1.0, 1.5, 0.0]
    gae_0 = td_lambda_gae_advantage_estimation(rewards, values, gamma=0.9, lam=0.0)
    assert gae_0["advantages_gae"] == pytest.approx(gae_0["one_step_td_advantages"])

    gae_1 = td_lambda_gae_advantage_estimation(rewards, values, gamma=0.9, lam=1.0)
    assert gae_1["advantages_gae"] == pytest.approx(gae_1["monte_carlo_advantages"])

    # Terminal episode boundary masking
    gae_done = td_lambda_gae_advantage_estimation(
        rewards=[1.0, 2.0],
        values=[0.5, 100.0, 50.0],
        dones=[True, False],
        gamma=0.99,
        lam=0.95,
    )
    # Since step 0 has done=True, V(s_1)=100.0 is masked out: delta_0 = 1.0 - 0.5 = 0.5
    assert gae_done["advantages_gae"][0] == pytest.approx(0.5)


def test_domain_3_chinchilla_dpo_and_react_validator() -> None:
    # 1. Chinchilla/Kaplan compute-optimal allocation
    flops = 6e20
    alloc = chinchilla_kaplan_compute_optimal_allocation(compute_flops=flops)
    assert 6.0 * alloc["optimal_parameters_N"] * alloc["optimal_tokens_D"] == pytest.approx(flops, rel=1e-6)
    assert alloc["predicted_chinchilla_loss"] < alloc["predicted_kaplan_loss_at_same_compute"]
    assert alloc["chinchilla_loss_reduction_vs_kaplan"] > 0.0
    with pytest.raises(ValueError):
        chinchilla_kaplan_compute_optimal_allocation(0.0)

    # 2. DPO implicit reward margin
    # Identical policy and reference -> 0 margin, log(2) loss
    dpo_zero = dpo_implicit_reward_margin(
        policy_chosen_logprobs=[-1.0, -2.0],
        policy_rejected_logprobs=[-1.5, -2.5],
        ref_chosen_logprobs=[-1.0, -2.0],
        ref_rejected_logprobs=[-1.5, -2.5],
        beta=0.1,
    )
    assert dpo_zero["reward_margins"] == [0.0, 0.0]
    assert dpo_zero["dpo_loss"] == pytest.approx(math.log(2.0), abs=1e-7)

    dpo_pos = dpo_implicit_reward_margin(
        policy_chosen_logprobs=[-0.5, -0.6],
        policy_rejected_logprobs=[-3.0, -3.2],
        ref_chosen_logprobs=[-1.5, -1.6],
        ref_rejected_logprobs=[-1.5, -1.6],
        beta=0.2,
    )
    assert all(m > 0.0 for m in dpo_pos["reward_margins"])
    assert dpo_pos["dpo_loss"] < math.log(2.0)
    assert dpo_pos["reward_accuracy"] == 1.0

    # 3. ReAct Thought-Action-Observation Validator
    valid_trace = [
        {
            "thought": "Check weather wind speed in Buffalo.",
            "action": "fetch_weather",
            "action_input": "BUF",
            "observation": "Sustained wind is 24mph with gusts to 33mph.",
        },
        {
            "thought": "Conclude pass suppression due to 24mph wind.",
            "action": "Finish",
            "action_input": "24mph wind triggers deep-pass penalty.",
        },
    ]
    v_ok = validate_react_thought_action_observation_loop(valid_trace, allowed_tools=["fetch_weather"])
    assert v_ok["valid"] is True
    assert v_ok["grounded_in_observations"] is True

    # Invalid trace with duplicate loop and disallowed tool
    bad_trace = [
        {"thought": "Try hack", "action": "shell_exec", "action_input": "rm", "observation": "denied"},
        {"thought": "Try hack", "action": "shell_exec", "action_input": "rm", "observation": "denied"},
    ]
    v_bad = validate_react_thought_action_observation_loop(bad_trace, allowed_tools=["fetch_weather"])
    assert v_bad["valid"] is False
    assert any("DISALLOWED_TOOL" in msg for msg in v_bad["violations"])
    assert any("DUPLICATE_CONSECUTIVE_ACTION" in msg for msg in v_bad["violations"])
    assert "MISSING_TERMINAL_FINISH_STEP" in v_bad["violations"]

    # Zero-observation trace with empty Finish answer must be rejected
    v_empty_finish = validate_react_thought_action_observation_loop(
        [{"thought": "Skip tools", "action": "Finish", "action_input": ""}],
        allowed_tools=["fetch_weather"],
    )
    assert v_empty_finish["valid"] is False
    assert "EMPTY_FINAL_ANSWER" in v_empty_finish["violations"]
    assert "NO_OBSERVATION_STEPS_BEFORE_FINISH" in v_empty_finish["violations"]


def test_domain_4_agent_harness_pass_at_k_and_context_compaction() -> None:
    # 1. Pass@k and Pass^k
    eval_res = evaluate_agent_harness_pass_at_k_and_pass_hat_k(
        n_trials=10,
        c_successes=7,
        k_values=(1, 2, 4),
    )
    assert eval_res["pass_at_k"]["pass@1"] == pytest.approx(0.7)
    assert eval_res["pass_hat_k"]["pass^1"] == pytest.approx(0.7)
    assert eval_res["pass_at_k"]["pass@4"] == pytest.approx(1.0)  # 10 - 7 = 3 failures < k=4
    assert eval_res["pass_hat_k"]["pass^4"] == pytest.approx(0.7 ** 4)
    assert eval_res["capability_vs_reliability_gap"]["gap@4"] > 0.7

    # Edge cases: c = 0 and c = n
    zero_res = evaluate_agent_harness_pass_at_k_and_pass_hat_k(n_trials=5, c_successes=0, k_values=(1, 3))
    assert zero_res["pass_at_k"]["pass@3"] == 0.0
    assert zero_res["pass_hat_k"]["pass^3"] == 0.0
    full_res = evaluate_agent_harness_pass_at_k_and_pass_hat_k(n_trials=5, c_successes=5, k_values=(1, 3))
    assert full_res["pass_at_k"]["pass@3"] == 1.0
    assert full_res["pass_hat_k"]["pass^3"] == 1.0

    # 2. Long-running context compaction budget calculator
    budget = calculate_long_running_context_compaction_budget(
        context_window_limit=128000,
        system_and_tools_tokens=10000,
        pinned_state_tokens=6000,
        current_history_tokens=90000,
        reserve_output_tokens=8000,
    )
    assert budget["compaction_triggered"] is True
    assert budget["tokens_reclaimed"] > 60000
    assert budget["post_compaction_active_tokens"] < budget["trigger_threshold_tokens"]


def test_domain_5_convex_kkt_simplex_and_devroye_sampler() -> None:
    # 1. Boyd-Vandenberghe KKT interior-point barrier simplex projection
    proj = boyd_vandenberghe_kkt_simplex_barrier_projection(
        target_vector=[1.2, -0.5, 0.3, -0.2],
        barrier_t=5000.0,
    )
    p_bar = np.array(proj["interior_barrier_probabilities"])
    p_kkt = np.array(proj["exact_kkt_probabilities"])
    assert proj["strictly_positive"] is True
    assert np.all(p_bar > 0.0)
    assert float(np.sum(p_bar)) == pytest.approx(1.0, abs=1e-7)
    assert float(np.sum(p_kkt)) == pytest.approx(1.0, abs=1e-7)
    assert proj["kkt_stationarity_residual"] < 1e-8
    assert np.max(np.abs(p_bar - p_kkt)) < 0.01

    # Extreme spread vector must not suffer catastrophic cancellation in log-barrier KKT root
    proj_extreme = boyd_vandenberghe_kkt_simplex_barrier_projection(
        target_vector=[1000.0, -1000.0, -500.0],
        barrier_t=1e5,
    )
    assert proj_extreme["strictly_positive"] is True
    assert math.isfinite(proj_extreme["kkt_stationarity_residual"])
    assert proj_extreme["kkt_stationarity_residual"] < 1e-8

    # 2. Devroye exact inversion & rejection sampling (both alpha,beta > 1 and min(alpha,beta) <= 1)
    samp = devroye_exact_rejection_and_inversion_sampler(
        n_samples=4000,
        exp_rate_lambda=1.2,
        trunc_upper_b=3.0,
        beta_alpha=3.0,
        beta_beta=2.0,
        seed=123,
    )
    assert samp["inversion_samples_within_bounds"] is True
    assert samp["inversion_trunc_exp_mean_empirical"] == pytest.approx(
        samp["inversion_trunc_exp_mean_theoretical"], abs=0.04
    )
    assert samp["rejection_beta_mean_empirical"] == pytest.approx(
        samp["rejection_beta_mean_theoretical"], abs=0.03
    )
    assert samp["empirical_acceptance_rate"] == pytest.approx(
        samp["theoretical_acceptance_rate"], abs=0.04
    )

    samp_johnk = devroye_exact_rejection_and_inversion_sampler(
        n_samples=4000,
        beta_alpha=0.5,
        beta_beta=0.5,
        seed=456,
    )
    assert samp_johnk["rejection_beta_mean_empirical"] == pytest.approx(0.5, abs=0.03)
    assert samp_johnk["empirical_acceptance_rate"] == pytest.approx(
        samp_johnk["theoretical_acceptance_rate"], abs=0.04
    )


def test_domain_6_ast_complexity_and_cyclomatic_depth() -> None:
    safe_expr = "clip(p0 + 0.25 * (epa_off - epa_def) if wind_mph < 20 else p0 - 0.05, 0.02, 0.98)"
    res = analyze_equation_ast_complexity_and_cyclomatic_depth(safe_expr)
    assert res["syntax_valid"] is True
    assert res["safe_ast"] is True
    assert res["cyclomatic_complexity"] >= 3
    assert res["sethi_ullman_registers"] >= 2
    assert res["halstead_volume"] > 0.0
    assert set(res["variables"]) == {"epa_def", "epa_off", "p0", "wind_mph"}

    # Unsafe AST expressions (dynamic import, generator expression, disallowed call) must be blocked
    unsafe_expr = "__import__('os').system('echo bad')"
    bad = analyze_equation_ast_complexity_and_cyclomatic_depth(unsafe_expr)
    assert bad["safe_ast"] is False
    assert len(bad["security_violations"]) > 0

    gen_expr = "(x for x in (1, 2))"
    bad_gen = analyze_equation_ast_complexity_and_cyclomatic_depth(gen_expr)
    assert bad_gen["safe_ast"] is False
    assert any("DISALLOWED_AST_NODE" in v for v in bad_gen["security_violations"])

    bad_call = analyze_equation_ast_complexity_and_cyclomatic_depth("evil_fn(x + y)")
    assert bad_call["safe_ast"] is False
    assert bad_call["variables"] == ["x", "y"]

    # Syntax error handled cleanly without crashing
    syn = analyze_equation_ast_complexity_and_cyclomatic_depth("a + * b")
    assert syn["syntax_valid"] is False
    assert syn["safe_ast"] is False


def test_domain_7_bm25_and_rrf_hybrid_retrieval() -> None:
    docs = [
        {
            "doc_id": "D1",
            "text": "Boyd Vandenberghe convex optimization KKT interior point barrier projection",
            "embedding": [0.9, 0.1, 0.0],
        },
        {
            "doc_id": "D2",
            "text": "Rasmussen Williams Gaussian processes kernel regression marginal likelihood",
            "embedding": [0.1, 0.9, 0.0],
        },
        {
            "doc_id": "D3",
            "text": "Kleinberg Tardos dynamic programming knapsack approximation algorithms",
            "embedding": [0.0, 0.1, 0.9],
        },
    ]
    scored = bm25_and_rrf_hybrid_retrieval_scorer(
        query="convex optimization KKT barrier",
        documents=docs,
        query_embedding=[0.95, 0.05, 0.0],
        top_k=2,
    )
    assert len(scored["results"]) == 2
    assert scored["results"][0]["doc_id"] == "D1"
    assert scored["results"][0]["bm25_rank"] == 1
    assert scored["results"][0]["dense_rank"] == 1
    assert scored["results"][0]["rrf_score"] == pytest.approx(2.0 / 61.0, abs=1e-7)


def test_domain_8_kleinberg_hits_and_pagerank_centrality() -> None:
    # Star/hub directed graph: QB passes heavily to WR1 and WR2; Dangling node at index 3
    adj = [
        [0.0, 5.0, 3.0, 1.0],
        [0.0, 0.0, 1.0, 0.0],
        [0.0, 2.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0],
    ]
    cent = kleinberg_hits_and_pagerank_spectral_centrality(
        adjacency_matrix=adj,
        node_names=["QB", "WR1", "WR2", "TE_DANGLING"],
    )
    assert cent["hits_converged"] is True
    assert cent["pagerank_converged"] is True
    assert cent["top_hub_node"] == "QB"
    assert cent["top_authority_node"] == "WR1"
    assert sum(cent["hub_scores_l1"].values()) == pytest.approx(1.0, abs=1e-6)
    assert sum(cent["authority_scores_l1"].values()) == pytest.approx(1.0, abs=1e-6)
    assert sum(cent["pagerank_scores"].values()) == pytest.approx(1.0, abs=1e-6)

    # Disconnected multi-component graph with all-zero rows
    adj_disc = [
        [0.0, 2.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 1.0],
        [0.0, 0.0, 0.0, 0.0],
    ]
    cent_disc = kleinberg_hits_and_pagerank_spectral_centrality(
        adjacency_matrix=adj_disc,
        node_names=["C1_HUB", "C1_SINK", "C2_HUB", "C2_SINK"],
    )
    assert cent_disc["hits_converged"] is True
    assert cent_disc["pagerank_converged"] is True
    assert cent_disc["top_hub_node"] == "C1_HUB"
    assert cent_disc["top_authority_node"] == "C1_SINK"
    assert sum(cent_disc["pagerank_scores"].values()) == pytest.approx(1.0, abs=1e-6)


def test_domain_9_metamorphic_fuzzing_probability_and_devig_checker() -> None:
    fuzz = metamorphic_fuzzing_probability_and_devig_checker(n_fuzz_trials=250, seed=99)
    assert fuzz["all_invariants_passed"] is True
    assert fuzz["violations"] == []
    assert fuzz["malformed_inputs_rejected"] == 6

    # High-overround power de-vig where true exponent k* > 20.0 (k* ~ 27.62)
    p_pow = _power_or_multiplicative_devig([0.98, 0.97], method="power")
    assert float(np.sum(p_pow)) == pytest.approx(1.0, abs=1e-9)
    # Verify exact power relation: log(p_0)/log(0.98) == log(p_1)/log(0.97) = k*
    k_est_0 = math.log(float(p_pow[0])) / math.log(0.98)
    k_est_1 = math.log(float(p_pow[1])) / math.log(0.97)
    assert k_est_0 > 25.0
    assert k_est_0 == pytest.approx(k_est_1, rel=1e-6)


def test_domain_10_isolation_anomaly_and_kalshi_sportsbook_arbitrage() -> None:
    # Case 1: Normal market without risk-free arbitrage + clear feature outlier at index 8
    obs = [1.00, 1.02, 0.98, 1.01, 0.99, 1.03, 0.97, 1.00, 9.50]
    res_no_arb = detect_isolation_anomaly_and_kalshi_sportsbook_arbitrage(
        feature_observations=obs,
        kalshi_yes_ask_cents=55.0,
        kalshi_no_ask_cents=48.0,
        sportsbook_home_american=-120.0,
        sportsbook_away_american=105.0,
    )
    assert 8 in res_no_arb["flagged_anomaly_indices"]
    assert res_no_arb["isolation_scores"][8] == res_no_arb["max_isolation_score"]
    assert res_no_arb["risk_free_arbitrage_detected"] is False
    assert res_no_arb["quarantine_policy_enforced"] is True

    # Case 2: Dislocated cross-market pricing with synthetic Dutch-book arbitrage
    # Kalshi YES ask = 42c (eff ~43.7c), Sportsbook Away = +115 (implied = 46.51%) -> total cost ~ 0.902 < 1.0
    res_arb = detect_isolation_anomaly_and_kalshi_sportsbook_arbitrage(
        feature_observations=obs,
        kalshi_yes_ask_cents=42.0,
        kalshi_no_ask_cents=60.0,
        sportsbook_home_american=-135.0,
        sportsbook_away_american=115.0,
    )
    assert res_arb["risk_free_arbitrage_detected"] is True
    assert res_arb["best_synthetic_dutch_cost"] < 1.0
    assert res_arb["arbitrage_net_roi"] > 0.08


def test_all_10_domain_suites_and_zero_forbidden_host_paths() -> None:
    suites = run_all_10_domain_verification_suites()
    assert len(suites) == 10

    forbidden_re = re.compile(
        r"(?:C:\\Users\\Garrett|C:/Users/Garrett|C:\\c\\wt-week8-forensic|C:/c/wt-week8-forensic|G:\\My Drive|G:/My Drive)",
        re.IGNORECASE,
    )
    registry_dir = REPO_ROOT / "intelligence" / "corpus_registry"
    py_files = list(registry_dir.glob("*.py"))
    assert len(py_files) >= 2
    for py_file in py_files:
        content = py_file.read_text(encoding="utf-8")
        assert forbidden_re.search(content) is None, f"Forbidden host path found in {py_file}"
