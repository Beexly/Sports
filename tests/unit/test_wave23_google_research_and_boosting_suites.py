"""Wave 23 Google Research pillar and boosting/literature/quarantine suite tests."""

from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from gse_engine.memory.wave22_google_research_sde_tabfm_rliable_suite import (
    WAVE23_GOOGLE_RESEARCH_ENTRIES,
    artemis_action_trace_reliability,
    assert_google_health_medical_quarantine,
    augmix_jensen_shannon_consistency,
    brownian_increments,
    compute_rliable_aggregate_metrics,
    dreamer_lambda_returns,
    era_flat_ucb_select,
    evaluate_wave23_google_research_bridge,
    fedavg_aggregate_clipped,
    find_repeated_substrings,
    interquartile_mean,
    lottery_ticket_magnitude_mask,
    monotone_validation_promotion_law,
    morphnet_ista_l1_prune,
    multi_resolution_decompose_and_forecast,
    noisy_student_select_pseudo_labels,
    normalize_latex_macros,
    orthogonalize_latent_factors_mi,
    pool_multi_agent_proof_critiques,
    potential_based_field_shaping,
    reference_agreement_proxy,
    sample_episode_and_prototype_classify,
    solve_ou_sde,
    solve_ou_sde_and_exact_adjoint,
    tabular_small_sample_prior_shrinkage,
    tapas_select_and_aggregate,
    vmoe_top_k_capacity_route,
)
from gse_engine.memory.wave23_boosting_graph_literature_and_spoof_quarantine_suite import (
    WAVE23_BOOSTING_LITERATURE_ENTRIES,
    assert_social_stream_p_spoof_quarantine,
    bm25_rank_local_library,
    dspy_mipro_bootstrap_fewshot_compile,
    elo_update,
    evaluate_wave23_boosting_literature_bridge,
    gcn_symmetric_propagate,
    h2o_nonnegative_stacking_weights,
    lightgbm_histogram_best_split,
    llm_d_prefix_kv_cache_aware_route,
    ngboost_normal_natural_gradient,
    normalize_and_dedup_citations,
    paperspine_section_skeleton,
    rank_auc_mann_whitney,
    sana_relu_linear_attention_and_flow_step,
    stylegan2_weight_demodulation,
    tcnn_multiresolution_spatial_hash_encode,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def _fd(f: object, x: float, h: float = 1e-6) -> float:
    assert callable(f)
    return float((f(x + h) - f(x - h)) / (2 * h))


def test_ou_adjoint_matches_finite_differences() -> None:
    dt = 0.02
    dw = brownian_increments(80, dt, seed=7)
    base = {"x0": 0.1, "kappa": 1.3, "m": 0.4, "sigma": 0.25}
    res = solve_ou_sde_and_exact_adjoint(dt=dt, dw=dw, target=0.2, **base)

    def loss(**kw: float) -> float:
        p = dict(base)
        p.update(kw)
        out = solve_ou_sde_and_exact_adjoint(dt=dt, dw=dw, target=0.2, **p)
        return float(out["loss"])

    for name, key in (
        ("kappa", "grad_kappa"),
        ("m", "grad_m"),
        ("sigma", "grad_sigma"),
        ("x0", "grad_x0"),
    ):
        fd = _fd(lambda v, n=name: loss(**{n: v}), base[name])
        assert math.isclose(res[key], fd, rel_tol=1e-5, abs_tol=1e-9), name


def test_ou_ito_and_stratonovich_agree_for_additive_noise() -> None:
    dt = 0.001
    dw = brownian_increments(2000, dt, seed=3)
    ito = solve_ou_sde(x0=0.0, kappa=1.0, m=1.0, sigma=0.1, dt=dt, dw=dw, scheme="ito")
    strat = solve_ou_sde(x0=0.0, kappa=1.0, m=1.0, sigma=0.1, dt=dt, dw=dw, scheme="stratonovich")
    assert abs(ito[-1] - strat[-1]) < 2e-3
    with pytest.raises(ValueError):
        solve_ou_sde(x0=0.0, kappa=1.0, m=1.0, sigma=0.1, dt=dt, dw=dw, scheme="x")


def test_multi_resolution_decomposition_is_exact() -> None:
    series = [3.0, 5.0, 4.0, 8.0, 7.0, 9.0, 12.0, 10.0, 11.0]
    out = multi_resolution_decompose_and_forecast(series, levels=3, horizon=2, patch=3)
    assert out["levels"] == 3
    assert out["max_reconstruction_error"] < 1e-12
    assert len(out["forecast"]) == 2


def test_tabular_shrinkage_weights() -> None:
    out = tabular_small_sample_prior_shrinkage(
        {"a": [10.0, 12.0], "b": []}, prior_mean=0.0, noise_var=4.0, prior_var=1.0
    )
    assert math.isclose(out["data_weights"]["a"], 2.0 / 6.0)
    assert math.isclose(out["posterior_means"]["a"], 11.0 / 3.0)
    assert out["posterior_means"]["b"] == 0.0


def test_iqm_and_rliable_metrics() -> None:
    assert math.isclose(interquartile_mean([1, 2, 3, 4, 5, 6, 7, 8]), 4.5)
    assert math.isclose(interquartile_mean([1, 2, 3, 100]), 2.5)
    res = compute_rliable_aggregate_metrics(
        {"t1": [0.2, 0.4, 0.6], "t2": [0.5, 0.7, 0.9]}, gamma=1.0, taus=[0.5], n_boot=200
    )
    assert res["iqm_ci_low"] <= res["iqm"] <= res["iqm_ci_high"]
    assert math.isclose(res["optimality_gap"], 1.0 - (3.3 / 6.0))
    assert math.isclose(res["performance_profile"][0.5], 3.0 / 6.0)


def test_promotion_law_is_monotone_ratchet() -> None:
    ok = monotone_validation_promotion_law(
        incumbent_loss=7.09, candidate_loss=7.05, floor_loss=7.0944, fwl_residual_skill=0.01,
        paired_ci_high=-0.001,
    )
    assert ok["promote"] is True and ok["live_weight_multiplier"] == 1.0
    bad = monotone_validation_promotion_law(
        incumbent_loss=7.09, candidate_loss=7.10, floor_loss=7.0944, fwl_residual_skill=0.01
    )
    assert bad["promote"] is False
    assert bad["accepted_loss"] == 7.09
    assert set(bad["rejection_reasons"]) == {"regresses_incumbent", "violates_floor"}


def test_disentanglement_collapses_pairwise_mi() -> None:
    t = [0.1, 0.3, -0.2, 0.5, 0.0]
    w = [1.0, 0.2, 0.4, 0.9, 0.1]
    s = [0.5 * a + 0.5 * b + 0.01 * i for i, (a, b) in enumerate(zip(t, w, strict=True))]
    out = orthogonalize_latent_factors_mi({"t": t, "w": w, "s": s}, order=("t", "w", "s"))
    assert out["pairwise_mi_before"] > 0.5
    assert out["pairwise_mi_after"] < 1e-8


def test_augmix_js_zero_for_identical_and_positive_otherwise() -> None:
    assert augmix_jensen_shannon_consistency([[0.5, 0.5], [0.5, 0.5]]) < 1e-12
    assert augmix_jensen_shannon_consistency([[0.9, 0.1], [0.1, 0.9]]) > 0.3


def test_tapas_aggregations() -> None:
    rows = [{"team": "KC", "epa": 0.1}, {"team": "BUF", "epa": 0.3}, {"team": "KC", "epa": 0.2}]
    out = tapas_select_and_aggregate(
        rows, column="epa", op="SUM", where=lambda r: r["team"] == "KC"
    )
    assert math.isclose(out["value"], 0.3)
    assert tapas_select_and_aggregate(rows, column="epa", op="COUNT")["value"] == 3
    with pytest.raises(ValueError):
        tapas_select_and_aggregate(rows, column="epa", op="MEDIAN")


def test_vmoe_capacity_and_balance() -> None:
    logits = [[5.0, 0.0], [5.0, 0.0], [5.0, 0.0], [0.0, 5.0]]
    out = vmoe_top_k_capacity_route(logits, k=1, capacity_factor=1.0)
    assert out["capacity"] == 2
    assert out["expert_load"] == [2, 1]
    assert out["dropped"] == 1
    balanced = vmoe_top_k_capacity_route([[5.0, 0.0], [0.0, 5.0]], k=1)
    assert abs(balanced["load_balance_aux_loss"] - 1.0) < 0.02


def test_morphnet_ista_prunes_irrelevant_feature() -> None:
    x = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0], [2.0, -1.0], [-1.0, 0.5]]
    y = [2.0 * r[0] for r in x]
    out = morphnet_ista_l1_prune(x, y, lam=0.05, n_iter=3000)
    assert out["kept_features"] == [0]
    assert 1.6 < out["coefficients"][0] < 2.0


def test_latex_normalization() -> None:
    src = "\\newcommand{\\epa}{\\mathrm{EPA}}\nValue \\epa{} 50\\% % hidden\n\\todo{fix}"
    out = normalize_latex_macros(src)
    assert out["macros_expanded"] == ["epa"]
    assert "\\mathrm{EPA}" in out["normalized"]
    assert "hidden" not in out["normalized"]
    assert "50\\%" in out["normalized"]
    assert "todo" not in out["normalized"]


def test_critique_pooling_and_dedup() -> None:
    pooled = pool_multi_agent_proof_critiques([(0.9, 1.0), (0.2, 0.1)])
    assert pooled["accept"] is True
    assert pool_multi_agent_proof_critiques([(0.9, 0.0)])["posterior_accept"] == 0.5
    rep = find_repeated_substrings(["abcdefgh-xyz", "zz abcdefgh"], min_len=8)
    assert rep["docs_with_duplicates"] == [1]
    assert find_repeated_substrings(["unique one", "other two"], min_len=8)[
        "duplicate_kgram_hits"
    ] == 0


def test_potential_shaping_telescopes() -> None:
    out = potential_based_field_shaping([75, 60, 42, 30, 8], gamma=0.97)
    assert math.isclose(out["discounted_sum"], out["telescoped"], rel_tol=1e-12)


def test_reference_agreement_proxy_bounds() -> None:
    same = reference_agreement_proxy("pressure drives sacks", "pressure drives sacks")
    assert math.isclose(same["agreement"], 1.0)
    assert reference_agreement_proxy("abc", "xyz")["agreement"] == 0.0


def test_meta_dataset_episode_prototypes() -> None:
    data = {
        "a": [[0.0, 0.0], [0.1, 0.0], [0.0, 0.1], [0.1, 0.1]],
        "b": [[5.0, 5.0], [5.1, 5.0], [5.0, 5.1], [5.1, 5.1]],
        "c": [[0.0, 9.0], [0.1, 9.0], [0.0, 9.1], [0.1, 9.1]],
    }
    out = sample_episode_and_prototype_classify(data, n_way=2, k_shot=2, n_query=2, seed=1)
    assert out["accuracy"] == 1.0
    again = sample_episode_and_prototype_classify(data, n_way=2, k_shot=2, n_query=2, seed=1)
    assert again["classes"] == out["classes"]


def test_noisy_student_dreamer_lth_fedavg() -> None:
    sel = noisy_student_select_pseudo_labels(
        [[0.9, 0.1], [0.95, 0.05], [0.3, 0.7], [0.1, 0.9]], tau=0.8, per_class_cap=1
    )
    assert sel["selected"] == [(1, 0), (3, 1)]
    lr = dreamer_lambda_returns([1.0, 0.0], [0.0, 0.5, 2.0], gamma=1.0, lam=1.0)
    assert lr == [3.0, 2.0]
    lr0 = dreamer_lambda_returns([1.0, 0.0], [0.0, 0.5, 2.0], gamma=1.0, lam=0.0)
    assert lr0 == [1.5, 2.0]
    m = lottery_ticket_magnitude_mask(
        [0.1, -2.0, 0.5, 3.0, -0.05], prune_frac_per_round=0.4, rounds=1
    )
    assert m["mask"] == [False, True, True, True, False]
    agg = fedavg_aggregate_clipped([[3.0, 4.0], [0.0, 1.0]], [1, 3], clip_norm=1.0)
    assert math.isclose(agg[0], 0.25 * 0.6)
    assert math.isclose(agg[1], 0.25 * 0.8 + 0.75 * 1.0)


def test_era_ucb_artemis_and_health_quarantine() -> None:
    out = era_flat_ucb_select({"good": [0.9] * 20, "bad": [0.1] * 20}, budget=20)
    assert out["best_arm"] == "good"
    assert out["counts"]["good"] > out["counts"]["bad"]
    w = artemis_action_trace_reliability(99, 100)
    assert w["wilson_low"] < 0.99 < w["wilson_high"] <= 1.0
    assert assert_google_health_medical_quarantine()["sports_weight"] == 0.0
    with pytest.raises(PermissionError):
        assert_google_health_medical_quarantine(requested_sports_weight=0.1)


def test_ngboost_natural_gradient_matches_fd_and_fisher() -> None:
    y, mu, ls = 4.5, 1.0, math.log(2.0)
    g = ngboost_normal_natural_gradient(y, mu, ls)
    fd_mu = _fd(lambda v: ngboost_normal_natural_gradient(y, v, ls)["nll"], mu)
    fd_ls = _fd(lambda v: ngboost_normal_natural_gradient(y, mu, v)["nll"], ls)
    assert math.isclose(g["grad_mu"], fd_mu, rel_tol=1e-6)
    assert math.isclose(g["grad_log_sigma"], fd_ls, rel_tol=1e-6)
    assert math.isclose(g["nat_grad_mu"], -(y - mu))


def test_lightgbm_split_and_h2o_stacking() -> None:
    bins = [0, 0, 1, 1, 2, 2]
    grads = [-1.0, -1.0, -1.0, 1.0, 1.0, 1.0]
    hess = [1.0] * 6
    sp = lightgbm_histogram_best_split(bins, grads, hess, lam=0.0)
    assert sp["best_bin_threshold"] in (0, 1)
    assert sp["gain"] > 0.0
    y = [1.0, 2.0, 3.0, 4.0]
    preds = [[1.0, 2.0, 3.0, 4.0], [4.0, 3.0, 2.0, 1.0]]
    st = h2o_nonnegative_stacking_weights(preds, y)
    assert st["weights"][1] < 1e-6
    assert abs(st["weights"][0] - 1.0) < 1e-3


def test_literature_tooling() -> None:
    sk = paperspine_section_skeleton("1 Introduction\ntext\n2.1 Pressure Model\nmore")
    assert [s["number"] for s in sk] == ["1", "2.1"]
    assert sk[1]["depth"] == 2
    dd = normalize_and_dedup_citations(["Kleppmann, M. (2017).", "kleppmann m 2017", "Other"])
    assert dd["duplicates_removed"] == 1
    adj = [[0.0, 1.0], [1.0, 0.0]]
    h = gcn_symmetric_propagate(adj, [[1.0], [3.0]])
    assert math.isclose(h[0][0], 2.0) and math.isclose(h[1][0], 2.0)
    rk = bm25_rank_local_library({"d1": "pressure sack rate", "d2": "weather wind"}, "sack")
    assert rk[0][0] == "d1"
    assert math.isclose(rank_auc_mann_whitney([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]), 0.75)
    e = elo_update(1500.0, 1500.0, 1.0, hfa=0.0)
    assert math.isclose(e["home_new"] - 1500.0, 10.0)


def test_p_spoof_quarantine_zero_gradient() -> None:
    q = assert_social_stream_p_spoof_quarantine([1.0, -3.0])
    assert q["grad_hype_norm"] == 0.0
    with pytest.raises(PermissionError):
        assert_social_stream_p_spoof_quarantine([1.0], requested_weight=0.2)


def test_bridges_are_shadow_weight() -> None:
    g = evaluate_wave23_google_research_bridge(
        away_clean_epa=0.05, home_clean_epa=0.1, effective_wind_mph=12.0, is_short_week=True
    )
    assert g["wave23_google_research_wired"] is True
    assert g["live_stage2_weight"] == 0.0 and g["wave23_epa_adj"] == 0.0
    assert g["disentangle_mi_after"] < 1e-6
    b = evaluate_wave23_boosting_literature_bridge(away_clean_epa=0.05, home_clean_epa=0.1)
    assert b["p_spoof_grad_hype_norm"] == 0.0 and b["live_stage2_weight"] == 0.0
    assert b["llm_d_selected_worker"] == 0 and b["tcnn_feature_norm"] > 0.0


def test_llm_d_dspy_and_nvlabs_kernels() -> None:
    route = llm_d_prefix_kv_cache_aware_route([0.2, 0.95, 0.80], [0, 1, 10])
    assert route["selected_worker"] == 1
    demos = dspy_mipro_bootstrap_fewshot_compile(
        [
            {"prompt": "p1", "score": 0.90},
            {"prompt": "p1", "score": 0.99},
            {"prompt": "p2", "score": 0.70},
            {"prompt": "p3", "score": 0.85},
        ],
        k_demos=3,
        min_score=0.80,
    )
    assert demos["selected_count"] == 2
    assert math.isclose(demos["mean_validation_score"], 0.875)
    sg = stylegan2_weight_demodulation([[1.0, 2.0], [3.0, -4.0]], [0.5, 1.5])
    assert all(abs(norm - 1.0) < 1e-5 for norm in sg["row_l2_norms"])
    sana = sana_relu_linear_attention_and_flow_step(
        [[1.0, 0.0], [0.0, 2.0]],
        [[1.0, 0.0], [0.0, 2.0]],
        [[10.0, 0.0], [0.0, 20.0]],
        [1.0, -1.0],
        [0.5, 1.0],
        dt=0.2,
    )
    assert sana["attended"][0][0] > 9.9 and sana["attended"][1][1] > 19.9
    assert [round(x, 6) for x in sana["x_next"]] == [1.1, -0.8]
    tcnn = tcnn_multiresolution_spatial_hash_encode((0.25, 0.75), n_levels=4)
    assert tcnn["feature_dim"] == 8 and tcnn["feature_norm"] > 0.0


def test_registry_contains_all_wave23_entries() -> None:
    reg = json.loads(
        (REPO_ROOT / "docs/data-sources/research/2026-11-15/oss-corpus-registry.json").read_text(
            encoding="utf-8"
        )
    )
    urls = {e["url"].lower().rstrip("/") for e in reg["entries"]}
    for e in WAVE23_GOOGLE_RESEARCH_ENTRIES + WAVE23_BOOSTING_LITERATURE_ENTRIES:
        assert e["url"].lower().rstrip("/") in urls
    ids = [e["id"] for e in reg["entries"]]
    assert len(ids) == len(set(ids)) == reg["total_unique_entries"]
    assert reg["total_unique_entries"] >= 221
    assert reg["total_submitted_urls"] >= 241
    assert all(e["status"] == "WIRED_V3" for e in reg["entries"])
