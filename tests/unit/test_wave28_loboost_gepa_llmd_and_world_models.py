"""Wave 28 unit tests: LoBoost, GEPA, llm-d EPP, ERA/Harness2, Sana & registry/RLVR."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pytest

from gse_engine.memory import (
    WAVE28_NEW_OSS_ENTRIES,
    compile_gse_to_gsi_rlvr_training_batch,
    compute_loboost_leaf_path_conformal_interval,
    compute_sana_relu_linear_attention,
    encode_multiresolution_spatial_hash_2d,
    evaluate_harness2_propose_probe_compose,
    evaluate_wave28_deep_research_bridge,
    evolve_gepa_pareto_prompt_frontier,
    schedule_llmd_disaggregated_prefill_decode,
    select_era_futs_ucb_candidate,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_loboost_local_conformal_and_global_fallback() -> None:
    """LoBoost adapts to local tree-leaf buckets and falls back safely on low support."""
    calib_paths = [
        [1, 2, 3, 4],
        [1, 2, 3, 5],
        [1, 2, 8, 4],
        [1, 2, 3, 4],
        [1, 9, 3, 4],
        [7, 7, 7, 7],
        [8, 8, 8, 8],
    ]
    calib_res = [1.0, -1.2, 1.5, -1.8, 2.0, 12.0, 14.0]
    local = compute_loboost_leaf_path_conformal_interval(
        calib_paths, calib_res, [1, 2, 3, 4], 3.5, alpha=0.10, min_local_support=5
    )
    assert local["fallback_to_global"] is False
    assert local["local_support"] == 5
    assert math.isclose(local["q_radius"], 2.0, abs_tol=1e-9)
    assert local["lower"] < 3.5 < local["upper"]

    sparse = compute_loboost_leaf_path_conformal_interval(
        calib_paths, calib_res, [9, 9, 9, 9], 3.5, alpha=0.10, min_local_support=5
    )
    assert sparse["fallback_to_global"] is True
    assert sparse["local_support"] == 0
    assert sparse["q_radius"] >= 12.0


def test_gepa_pareto_frontier_llmd_era_and_harness2_guards() -> None:
    """Verify GEPA Pareto non-domination, llm-d EPP routing, ERA UCB, and Harness2 freeze."""
    gepa = evolve_gepa_pareto_prompt_frontier(
        [
            {
                "candidate_id": "dom",
                "verifier_pass_rate": 0.80,
                "neg_brier_score": -0.25,
                "conciseness_score": 0.50,
                "failure_modes": ["bad"],
            },
            {
                "candidate_id": "front_acc",
                "verifier_pass_rate": 0.97,
                "neg_brier_score": -0.14,
                "conciseness_score": 0.70,
                "failure_modes": ["wind"],
            },
            {
                "candidate_id": "front_short",
                "verifier_pass_rate": 0.91,
                "neg_brier_score": -0.11,
                "conciseness_score": 0.95,
                "failure_modes": ["rest"],
            },
        ]
    )
    assert gepa["frontier_size"] == 2
    assert gepa["dominated_count"] == 1
    assert "dom" not in gepa["pareto_frontier_ids"]

    routed = schedule_llmd_disaggregated_prefill_decode(
        prefill_pods=[
            {"pod_id": "p_hit", "kv_utilization": 0.4, "queue_ms": 2.0, "cached_prefixes": ["k1"]},
            {"pod_id": "p_miss", "kv_utilization": 0.4, "queue_ms": 2.0, "cached_prefixes": []},
        ],
        decode_pods=[
            {"pod_id": "d_sat", "kv_utilization": 0.95, "nixl_rdma_ms": 0.5, "itl_ms": 5.0},
            {"pod_id": "d_ok", "kv_utilization": 0.50, "nixl_rdma_ms": 1.5, "itl_ms": 9.0},
        ],
        prefix_hash="k1",
        prompt_tokens=2000,
        max_kv_utilization=0.90,
    )
    assert routed["admitted"] is True
    assert routed["prefill_pod_id"] == "p_hit"
    assert routed["decode_pod_id"] == "d_ok"
    assert routed["prefix_cache_hit"] is True

    sat = schedule_llmd_disaggregated_prefill_decode(
        prefill_pods=[{"pod_id": "p_full", "kv_utilization": 0.95}],
        decode_pods=[{"pod_id": "d_ok", "kv_utilization": 0.50}],
        prefix_hash="k1",
        prompt_tokens=100,
    )
    assert sat["admitted"] is False

    era = select_era_futs_ucb_candidate(
        [
            {"node_id": "visited_hi", "visits": 10, "value_sum": 9.2, "prior": 0.5},
            {"node_id": "unvisited", "visits": 0, "value_sum": 0.0, "prior": 0.5},
        ],
        c_puct=1.25,
    )
    assert era["selected_node_id"] in {"visited_hi", "unvisited"}
    assert era["ucb_score"] > 0.0

    with pytest.raises(ValueError, match="HARNESS2_FROZEN_WEIGHT_VIOLATION"):
        evaluate_harness2_propose_probe_compose(0.7, 0.9, weights_mutated=True)
    ok_h2 = evaluate_harness2_propose_probe_compose(0.7, 0.8)
    assert ok_h2["weights_frozen"] is True and ok_h2["composed"] is True


def test_sana_associative_attention_and_tcnn_spatial_hash() -> None:
    """Verify O(N) associative Sana ReLU linear attention equals explicit matrix form."""
    rng = np.random.default_rng(20261117)
    q = rng.normal(size=(6, 4))
    k = rng.normal(size=(5, 4))
    v = rng.normal(size=(5, 3))
    res = compute_sana_relu_linear_attention(q.tolist(), k.tolist(), v.tolist(), eps=1e-6)
    out = np.asarray(res["output"], dtype=np.float64)

    q_p = np.maximum(0.0, q)
    k_p = np.maximum(0.0, k)
    explicit = (q_p @ k_p.T) @ v / np.maximum(np.sum(q_p @ k_p.T, axis=1), 1e-6)[:, None]
    assert np.allclose(out, explicit, atol=1e-6)

    h = encode_multiresolution_spatial_hash_2d(0.37, 0.64, n_levels=4)
    assert h["n_levels"] == 4
    assert len(h["features"]) == 4
    assert all(math.isfinite(val) for val in h["features"])


def test_wave28_bridge_registry_226_and_rlvr_182() -> None:
    """Verify cached Wave 28 bridge, 226/226 OSS registry, and 182 deduped RLVR trajectories."""
    bridge = evaluate_wave28_deep_research_bridge(
        away_clean_epa=0.05,
        home_clean_epa=0.11,
        effective_wind_mph=14.0,
        is_short_week=True,
    )
    assert bridge["wave28_wired"] is True
    assert bridge["all_scalars_finite"] is True
    assert bridge["scalars_verified_count"] == 8
    assert bridge["live_stage2_weight"] == 0.0
    assert bridge["google_health_ruo_weight"] == 0.0

    reg_path = (
        REPO_ROOT
        / "docs"
        / "data-sources"
        / "research"
        / "2026-11-15"
        / "oss-corpus-registry.json"
    )
    reg = json.loads(reg_path.read_text(encoding="utf-8"))
    assert reg["total_entries"] == 226
    assert reg["total_unique_entries"] == 226
    assert len(reg["entries"]) == 226
    assert len(WAVE28_NEW_OSS_ENTRIES) == 5

    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert rlvr["records_compiled"] >= 180
    assert rlvr["zero_odds_contamination"] is True
    assert rlvr["monotone_curriculum_verified"] is True
