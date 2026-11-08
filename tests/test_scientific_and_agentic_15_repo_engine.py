"""Comprehensive two-pass pytest suite for scientific_and_agentic_15_repo_engine.py."""

from __future__ import annotations

import numpy as np
import pytest

from intelligence.ecosystem.scientific_and_agentic_15_repo_engine import (
    AutoGptPerfCompareAndMultiExpertEngine,
    AwesomePythonStackAuditor,
    CalibreZeroBloatFts5Library,
    CsNotesStreamingAndCacheGuardEngine,
    DeerFlowSuperAgentHarness,
    HelloGitHubAutomatedRadarEngine,
    ImageAIVectorizedVisionEngine,
    PermissionDecision,
    PermissionRule,
    SchemaChangeKind,
    StatsmodelsEconometricGate,
    SystemDesignPrimerSegmentedQueryCache,
    TensorFlowZeroBloatQuantAndXlaEngine,
    TheAlgorithmsQuantAndRiskEngine,
    ToolRegistryProtocolEngine,
    TregToolRouterAndCodemapEngine,
    TwoStrikeFeedAndCitationMonitor,
    YtDlpZeroDiskTranscriptExtractor,
    run_scientific_and_agentic_15_repo_integration,
)


def test_1_tensorflow_int8_quant_and_xla_forward_plus_edge_cases() -> None:
    rng = np.random.default_rng(101)
    weights = rng.normal(0.0, 0.5, size=(12, 6)).astype(np.float32)
    q_res = TensorFlowZeroBloatQuantAndXlaEngine.asymmetric_quantize_int8(weights)
    assert q_res["compression_ratio"] == 4.0
    assert q_res["sqnr_db"] > 30.0
    assert q_res["quantized_int8"].dtype == np.int8

    # Edge case: constant zero tensor
    zero_res = TensorFlowZeroBloatQuantAndXlaEngine.asymmetric_quantize_int8(np.zeros((4, 4), dtype=np.float32))
    assert zero_res["zero_point"] == 0
    assert np.all(zero_res["quantized_int8"] == 0)

    # Edge case: empty tensor raises ValueError
    with pytest.raises(ValueError, match="empty"):
        TensorFlowZeroBloatQuantAndXlaEngine.asymmetric_quantize_int8(np.array([], dtype=np.float32))

    # Fused XLA MLP forward pass
    x = rng.normal(0.0, 1.0, size=(4, 12)).astype(np.float32)
    b = np.zeros(6, dtype=np.float32)
    mlp_res = TensorFlowZeroBloatQuantAndXlaEngine.fused_xla_int8_mlp_forward(x, weights, b)
    assert mlp_res["output_shape"] == [4, 6]
    assert mlp_res["max_abs_quant_error"] < 0.05

    # PR review idempotency & public jargon detector
    clean_pr = TensorFlowZeroBloatQuantAndXlaEngine.verify_pr_review_idempotency(
        "+ Quarterback pressure rate increased to 38% on third down."
    )
    assert clean_pr["idempotent"] is True
    assert clean_pr["public_jargon_violation"] is False

    jargon_pr = TensorFlowZeroBloatQuantAndXlaEngine.verify_pr_review_idempotency(
        "+ Evaluated 22,750,000 snap trajectories via Sinkhorn optimal transport."
    )
    assert jargon_pr["public_jargon_violation"] is True


def test_2_system_design_primer_2q_cache_scan_resistance_and_budget() -> None:
    with pytest.raises(ValueError, match="max_size"):
        SystemDesignPrimerSegmentedQueryCache(max_size=1)

    cache = SystemDesignPrimerSegmentedQueryCache(max_size=4, ttl_seconds=60.0, daily_api_budget=3)
    # 1st access inserts into probationary FIFO
    r1 = cache.process_query("<b>WSH @ SEA</b>", lambda q: {"q": q}, now=1.0)
    assert r1["source"] == "origin_fetch"
    # 2nd access with alias WAS hits probationary FIFO and promotes to protected LRU
    r2 = cache.process_query("was @ sea", lambda q: {"q": q}, now=2.0)
    assert r2["source"] == "cache"
    assert "was @ sea" in cache.protected_lru

    # Scan pollution: two one-off queries should only churn probationary FIFO, not evict protected LRU
    cache.process_query("one_off_1", lambda q: q, now=3.0)
    cache.process_query("one_off_2", lambda q: q, now=4.0)
    assert cache.get("WAS @ SEA", now=5.0) is not None

    # Additional canonical NFL aliases (JAC -> JAX, OAK -> LV)
    assert cache.parse_query("JAC @ OAK") == "jax @ lv"

    # Daily API budget circuit breaker on 4th origin miss
    blocked = cache.process_query("one_off_3", lambda q: q, now=6.0)
    assert blocked["source"] == "circuit_breaker_blocked"

    # TTL expiration
    assert cache.get("WAS @ SEA", now=100.0) is None


def test_3_awesome_python_hardware_footprint_auditor() -> None:
    res = AwesomePythonStackAuditor.audit_candidates(
        [
            {"name": "statsmodels", "category": "stats", "days_since_commit": 5, "stars": 11700, "install_size_mb": 11.3},
            {"name": "tensorflow", "category": "ml", "days_since_commit": 1, "stars": 201000, "install_size_mb": 550.0, "lightweight_replacement": "onnxruntime"},
            {"name": "dead-lib", "category": "stats", "days_since_commit": 900, "archived": True, "stars": 50, "install_size_mb": 1.0},
        ],
        c_drive_free_gb=6.3,
    )
    by_name = {r["name"]: r for r in res["results"]}
    assert by_name["statsmodels"]["verdict"] == "KEEP_SHORTLIST"
    assert by_name["tensorflow"]["verdict"] == "REPLACE_WITH_ZERO_BLOAT_ALTERNATIVE"
    assert by_name["tensorflow"]["recommended_replacement"] == "onnxruntime"
    assert by_name["dead-lib"]["verdict"] == "PRUNE_STALE"


def test_4_project_based_learning_two_strike_and_ingest_and_learn() -> None:
    mon = TwoStrikeFeedAndCitationMonitor()
    pass1 = mon.evaluate_endpoints([
        {"url": "https://untested.example/api", "tested": False},
        {"url": "https://flaky.example/api", "tested": True, "status_code": 503},
        {"url": "https://moved.example/api", "tested": True, "status_code": 301, "redirect_url": "https://new.example/api"},
        {"url": "https://commercial.example/feed", "tested": True, "status_code": 200, "license": "proprietary"},
    ])
    assert "https://untested.example/api" in pass1["untested_queued"]
    assert pass1["state"]["https://untested.example/api"]["status"] == "UNTESTED — QUEUED FOR EVALUATION"
    assert pass1["state"]["https://flaky.example/api"]["status"] == "SUSPECT_STRIKE_1"
    assert pass1["confirmed_dead"] == []
    assert pass1["state"]["https://commercial.example/feed"]["status"] == "LEARN_ONLY_NON_COMMERCIAL"

    # Second consecutive failure triggers CONFIRMED_DEAD_2_STRIKES
    pass2 = mon.evaluate_endpoints([
        {"url": "https://flaky.example/api", "tested": True, "status_code": 500},
    ])
    assert "https://flaky.example/api" in pass2["confirmed_dead"]


def test_5_the_algorithms_python_fracdiff_kelly_and_cvar() -> None:
    w = TheAlgorithmsQuantAndRiskEngine.calculate_weights(0.5, 4)
    assert w == [1.0, -0.5, -0.125, -0.0625]

    with pytest.raises(ValueError, match="window_size"):
        TheAlgorithmsQuantAndRiskEngine.fracdiff_fixedwindow([1.0, 2.0], 0.5, 5)

    with pytest.raises(ValueError, match="win_probability"):
        TheAlgorithmsQuantAndRiskEngine.kelly_criterion(1.2, 1.0)

    with pytest.raises(ValueError, match="empty"):
        TheAlgorithmsQuantAndRiskEngine.expected_shortfall([], 0.95)

    # Invalid American odds in (-100, 100) raises ValueError instead of ZeroDivisionError
    with pytest.raises(ValueError, match="american_odds"):
        TheAlgorithmsQuantAndRiskEngine.cvar_constrained_kelly(0.55, 0, [-1.0, 1.0])
    with pytest.raises(ValueError, match="american_odds"):
        TheAlgorithmsQuantAndRiskEngine.cvar_constrained_kelly(0.55, -50, [-1.0, 1.0])

    # Minimum stationary d* finds interior d* < 0.9 while preserving high memory correlation
    line_series = [44.5, 44.5, 45.0, 45.5, 46.0, 46.5, 47.0, 47.0, 47.5, 48.0, 48.5, 49.0]
    frac_opt = TheAlgorithmsQuantAndRiskEngine.find_min_stationary_d(line_series, window_size=4)
    assert frac_opt["optimal_degree_d"] < 0.9
    assert frac_opt["memory_correlation_with_level"] > 0.85

    es = TheAlgorithmsQuantAndRiskEngine.expected_shortfall([-10.0, -5.0, -2.0, 1.0, 4.0], 0.95)
    assert es == pytest.approx(10.0)

    cvar_k = TheAlgorithmsQuantAndRiskEngine.cvar_constrained_kelly(
        win_probability=0.60,
        american_odds=-110,
        simulated_return_scenarios=[-1.0, -0.9, -0.4, 0.2, 0.91, 0.91],
        max_cvar_95_bankroll_pct=0.02,
    )
    assert 0.0 < cvar_k["final_recommended_bankroll_fraction"] <= 0.021


def test_6_yt_dlp_sponsorblock_and_zero_disk_transcript_signals() -> None:
    res = YtDlpZeroDiskTranscriptExtractor.extract_zero_disk_coaching_and_gsi_signals(
        cues=[
            {"start": 0.5, "text": "Intro sponsor read"},
            {"start": 35.0, "text": "We expect heavy blitz pressure and red zone tempo adjustments."},
            {"start": 70.0, "text": "Biomechanical force plate and tendon telemetry confirmed recovery."},
        ],
        sponsor_segments=[
            {"segment": [0.0, 0.0], "category": "sponsor"},  # ignored whole-video marker
            {"segment": [0.2, 15.0], "category": "sponsor"},
            {"segment": [35.0, 36.0], "category": "poi_highlight"},
        ],
        duration=90.0,
    )
    assert res["zero_video_bytes_written_to_disk"] is True
    assert res["retained_cue_count"] == 2
    assert len(res["gse_tuesday_presser_signals"]) == 1
    assert len(res["gsi_lecture_signals"]) == 1
    assert res["sponsorblock_summary"]["poi_highlights"] == [35.0]

    # Overlapping SponsorBlock intervals are merged and clamped to duration (never double-counted)
    overlap_sb = YtDlpZeroDiskTranscriptExtractor.filter_sponsorblock_segments(
        segments=[
            {"segment": [0.0, 20.0], "category": "intro"},
            {"segment": [10.0, 30.0], "category": "sponsor"},
        ],
        duration=25.0,
    )
    assert overlap_sb["skipped_seconds"] == 25.0
    assert overlap_sb["effective_content_seconds"] == 0.0
    assert overlap_sb["merged_skip_intervals"] == [[0.0, 25.0]]


def test_7_autogpt_perf_compare_and_sentry_grant_guard() -> None:
    not_enough = AutoGptPerfCompareAndMultiExpertEngine.compare_span_distributions([1.0, 2.0], [1.0, 2.0])
    assert not_enough["exit_code"] == AutoGptPerfCompareAndMultiExpertEngine.EXIT_NOT_ENOUGH_DATA

    faster = AutoGptPerfCompareAndMultiExpertEngine.compare_span_distributions(
        baseline_ms=[200.0 + i for i in range(15)],
        candidate_ms=[110.0 + i for i in range(15)],
    )
    assert faster["verdict"] == "faster"
    assert faster["exit_code"] == AutoGptPerfCompareAndMultiExpertEngine.EXIT_FASTER

    slower = AutoGptPerfCompareAndMultiExpertEngine.compare_span_distributions(
        baseline_ms=[100.0 + i for i in range(15)],
        candidate_ms=[190.0 + i for i in range(15)],
    )
    assert slower["verdict"] == "slower"
    assert slower["exit_code"] == AutoGptPerfCompareAndMultiExpertEngine.EXIT_SLOWER

    sentry = AutoGptPerfCompareAndMultiExpertEngine.filter_and_sample_sentry_spans(
        [
            {"route": "/api/health?probe=1"},
            {"route": "/_next/static/chunks/app.js"},
            *[{"route": "/api/picks"} for _ in range(30)],
        ],
        traces_sample_rate=0.10,
    )
    assert sentry["health_pings_dropped"] == 2
    assert sentry["billable_spans_retained"] == 3

    # Multi-Expert Team quorum arbitration + hard veto override
    vetoed = AutoGptPerfCompareAndMultiExpertEngine.arbitrate_multi_expert_quorum([
        {"expert": "trench", "decision": "APPROVE", "probability": 0.62, "weight": 1.0},
        {"expert": "injury", "decision": "PASS", "probability": 0.45, "weight": 1.0, "hard_veto": True},
    ])
    assert vetoed["publish_allowed"] is False
    assert vetoed["reason"] == "hard_veto_triggered"


def test_8_cs_notes_sliding_window_and_dual_heap_median() -> None:
    eng = CsNotesStreamingAndCacheGuardEngine()
    with pytest.raises(ValueError, match="empty"):
        eng.current_median()

    assert CsNotesStreamingAndCacheGuardEngine.sliding_window_maximum([], 3) == []
    assert CsNotesStreamingAndCacheGuardEngine.sliding_window_maximum([2, 3, 4, 2, 6, 2, 5, 1], 3) == [
        4.0, 4.0, 6.0, 6.0, 6.0, 5.0
    ]

    for val in [10.0, 2.0, 8.0, 4.0, 6.0]:
        eng.insert_stream_value(val)
    assert eng.current_median() == 6.0

    # Consistent hash routing & steam spike detector
    shard = CsNotesStreamingAndCacheGuardEngine.consistent_hash_route("key1", ["n1", "n2", "n3"])
    assert shard in {"n1", "n2", "n3"}
    spike = CsNotesStreamingAndCacheGuardEngine.detect_steam_and_force_spikes(
        [1.0, 1.2, 1.1, 3.8, 1.3],
        window_k=2,
        spike_threshold_delta=1.5,
    )
    assert spike["spike_detected"] is True


def test_9_hellogithub_zero_credential_digest() -> None:
    res = HelloGitHubAutomatedRadarEngine.compile_leverage_digest(
        [
            {"full_name": "low/stars", "stars": 10},
            {"full_name": "statsmodels/statsmodels", "stars": 11747, "language": "Python", "domain": "GSE/GSI", "verdict": "PASS"},
        ],
        min_stars=50,
    )
    assert res["accepted_count"] == 1
    assert res["zero_plaintext_credentials"] is True
    assert "statsmodels/statsmodels" in res["markdown_table"]


def test_10_oaklight_toolregistry_recursive_schema_diff_and_permissions() -> None:
    old_s = {
        "type": "object",
        "properties": {
            "nested": {
                "type": "object",
                "properties": {"count": {"type": "integer"}},
                "required": ["count"],
            }
        },
    }
    # Compatible widening integer -> number + optional field + relaxed required
    new_compat = {
        "type": "object",
        "properties": {
            "nested": {
                "type": "object",
                "properties": {"count": {"type": "number"}, "extra": {"type": "string"}},
                "required": [],
            }
        },
    }
    kind_c, sum_c = ToolRegistryProtocolEngine.classify_schema_change(old_s, new_compat)
    assert kind_c == SchemaChangeKind.COMPATIBLE
    assert "nested.count: integer->number" in sum_c["type_widened_compatible"]
    assert "nested.count" in sum_c["required_relaxed_compatible"]

    # Breaking nested removal
    new_break = {
        "type": "object",
        "properties": {"nested": {"type": "object", "properties": {}}},
    }
    kind_b, sum_b = ToolRegistryProtocolEngine.classify_schema_change(old_s, new_break)
    assert kind_b == SchemaChangeKind.BREAKING
    assert "nested.count" in sum_b["removed"]

    # Breaking anyOf union narrowing and array.items type change, plus recursive $ref cycle safety
    s_union_old = {
        "$defs": {"Node": {"type": "object", "properties": {"next": {"$ref": "#/$defs/Node"}}}},
        "properties": {
            "opt_val": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
            "tags": {"type": "array", "items": {"type": "string"}},
            "tree": {"$ref": "#/$defs/Node"},
        },
    }
    s_union_new_breaking = {
        "$defs": {"Node": {"type": "object", "properties": {"next": {"$ref": "#/$defs/Node"}}}},
        "properties": {
            "opt_val": {"anyOf": [{"type": "boolean"}]},
            "tags": {"type": "array", "items": {"type": "integer"}},
            "tree": {"$ref": "#/$defs/Node"},
        },
    }
    u_kind, u_sum = ToolRegistryProtocolEngine.classify_schema_change(s_union_old, s_union_new_breaking)
    assert u_kind == SchemaChangeKind.BREAKING
    assert any("opt_val" in s for s in u_sum["type_changed_breaking"])
    assert any("tags[]" in s for s in u_sum["type_changed_breaking"])

    rules = [
        PermissionRule(
            name="block_prod_mutation",
            predicate=lambda t, p: t == "db_query" and p.get("mode") == "write",
            decision=PermissionDecision.DENY,
            reason="Read-only policy",
        ),
        PermissionRule(
            name="allow_read",
            predicate=lambda t, p: t == "db_query" and p.get("mode") == "read",
            decision=PermissionDecision.ALLOW,
        ),
    ]
    assert ToolRegistryProtocolEngine.evaluate_permission_policy("db_query", {"mode": "write"}, rules)["decision"] == "deny"
    assert ToolRegistryProtocolEngine.evaluate_permission_policy("db_query", {"mode": "read"}, rules)["decision"] == "allow"
    assert ToolRegistryProtocolEngine.evaluate_permission_policy("unknown", {}, rules)["decision"] == "deny"


def test_11_superdesigndev_treg_frontmatter_and_zero_waste_router() -> None:
    assert TregToolRouterAndCodemapEngine.parse_frontmatter("no frontmatter") is None
    fm = TregToolRouterAndCodemapEngine.parse_frontmatter("---\nname: treg\nitems:\n  - a\n  - b\n---\nbody")
    assert fm == {"name": "treg", "items": ["a", "b"]}

    drift = TregToolRouterAndCodemapEngine.verify_codemap_drift(
        "---\nsources:\n  - src/a.py\n  - src/missing.py\n---\nEvaluated 22,750,000 snaps via Sinkhorn.",
        existing_files={"src/a.py"},
    )
    assert drift["codemap_in_sync"] is False
    assert drift["missing_sources"] == ["src/missing.py"]
    assert drift["public_jargon_violation"] is True

    free_route = TregToolRouterAndCodemapEngine.route_agent_tool_call("unit_test_scaffold", False)
    assert free_route["tier"] == "ZERO_WASTE_WORKHORSE_FREE"
    assert free_route["endpoint"] == "omniroute/auto/coding:free"

    jev_route = TregToolRouterAndCodemapEngine.route_agent_tool_call("jev_snap_simulation", True)
    assert jev_route["tier"] == "FRONTIER_REASONING"
    assert jev_route["endpoint"] == "~typesafe/jev-latest"


def test_12_bytedance_deer_flow_dedupe_and_blocking_io_ast_guard() -> None:
    harness = DeerFlowSuperAgentHarness(ttl_seconds=10.0, max_entries=2)
    k1 = ("stripe", "ws1", "c1", "msg1")
    assert harness.try_record(k1, now=1.0) is False
    assert harness.try_record(k1, now=2.0) is True  # duplicate blocked!
    assert harness.try_record(k1, now=15.0) is False  # expired after TTL

    # Checkpoint save & resume
    harness.save_stage_checkpoint("run_1", 1, "stage1", {"ok": True})
    resumed = harness.resume_from_checkpoint("run_1", total_stages=5)
    assert resumed["next_stage_to_execute"] == 2
    assert resumed["completed_stages"] == [1]

    # Direct AND indirect synchronous helper blocking I/O detection inside async def
    bad_code = (
        "import time, requests\n"
        "def sync_helper():\n"
        "    time.sleep(1)\n"
        "async def bad_handler():\n"
        "    sync_helper()\n"
        "    requests.get('https://example.com')\n"
    )
    scan_bad = harness.scan_async_blocking_io(bad_code)
    assert scan_bad["clean"] is False
    assert scan_bad["violation_count"] == 2
    assert any("sync_helper->time.sleep" in v["blocking_call"] for v in scan_bad["violations"])


def test_13_kovidgoyal_calibre_zero_bloat_fts5() -> None:
    lib = CalibreZeroBloatFts5Library(":memory:")
    lib.index_document(1, "BK-01", "GSE", "Student-t Copula & Sinkhorn Optimal Transport", "Garrett", "Student-t copula and Sinkhorn matrix scaling for NFL PBP O/U 47.5")
    lib.index_document(2, "BK-02", "GSE", "Trench Pressure Survival", "Garrett", "Pass block win rate and defensive stunts")
    lib.index_document(3, "GSI-01", "GSI", "Eccentric Hamstring Strain", "GSI", "Force plate asymmetry telemetry")
    # Hyphenated and slash-containing queries do not crash SQLite FTS5 and yield non-zero BM25 rank
    hits = lib.search_fts5("Student-t Sinkhorn O/U")
    assert len(hits) == 1
    assert hits[0]["code"] == "BK-01"
    assert hits[0]["bm25_score"] != 0.0


def test_14_statsmodels_fdr_by_and_robust_huber_hac() -> None:
    assert StatsmodelsEconometricGate.filter_full_board_discoveries([])["approved_count"] == 0
    props = [
        {"prop_id": "TRUE_SIGNAL", "p_value": 0.0001, "raw_edge": 0.09},
        *[{"prop_id": f"FALSE_POS_{i}", "p_value": 0.045, "raw_edge": 0.01} for i in range(15)],
    ]
    res = StatsmodelsEconometricGate.filter_full_board_discoveries(props, alpha=0.05, method="fdr_by")
    assert res["naive_uncorrected_positives"] == 16
    assert res["approved_count"] == 1
    assert res["approved"][0]["prop_id"] == "TRUE_SIGNAL"

    reg = StatsmodelsEconometricGate.fit_robust_huber_and_hac_regression(
        x_values=[1, 2, 3, 4, 5, 6, 7],
        y_values=[2, 4, 6, 8, 10, 12, 80],  # huge outlier at x=7
    )
    assert reg["rlm_slope"] < reg["ols_slope"]
    assert reg["outlier_downweighted_min_weight"] < 0.25
    assert reg["collinear_guard_triggered"] is False

    # Constant / collinear X guard does not raise IndexError
    collinear_reg = StatsmodelsEconometricGate.fit_robust_huber_and_hac_regression(
        x_values=[5.0, 5.0, 5.0, 5.0, 5.0],
        y_values=[1.0, 2.0, 3.0, 4.0, 5.0],
    )
    assert collinear_reg["collinear_guard_triggered"] is True
    assert collinear_reg["rlm_slope"] == 0.0


def test_15_imageai_ap_iou_and_all22_box_classifier() -> None:
    assert ImageAIVectorizedVisionEngine.box_iou([0, 0, 10, 10], [20, 20, 30, 30]) == 0.0
    assert ImageAIVectorizedVisionEngine.box_iou([0, 0, 10, 10], [0, 0, 10, 10]) == pytest.approx(1.0)

    ap = ImageAIVectorizedVisionEngine.compute_ap([0.25, 0.5, 0.75, 1.0], [1.0, 0.9, 0.8, 0.7])
    assert 0.80 <= ap["average_precision"] <= 0.95
    assert ap["peak_f1"] > 0.75

    light_box = ImageAIVectorizedVisionEngine.classify_all22_trench_box_state(
        defender_detections=[
            {"bbox": [10, 5, 12, 7], "conf": 0.9, "cls": "def"},
            {"bbox": [14, 5, 16, 7], "conf": 0.9, "cls": "def"},
            {"bbox": [18, 5, 20, 7], "conf": 0.9, "cls": "def"},
            {"bbox": [22, 5, 24, 7], "conf": 0.9, "cls": "def"},
            {"bbox": [26, 5, 28, 7], "conf": 0.9, "cls": "def"},
        ],
        trench_box_region=[8, 4, 30, 10],
    )
    assert light_box["sam_hoppen_box_classification"] == "LIGHT_BOX_6_OR_FEWER"


def test_master_15_repo_two_pass_integration_receipt() -> None:
    receipt = run_scientific_and_agentic_15_repo_integration()
    assert receipt["two_pass_status"] == "PASS_ALL_15_REPOS_VERIFIED"
    assert len(receipt["repos"]) == 15
