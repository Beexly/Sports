r"""Comprehensive Multi-Pass Test Suite for the 33-Repository (Batch 2 -> 45 Total) Integration Engine.

Verifies all 33 new repositories + edge cases across:
  - Target A: Personal Hardware & Software Optimization (~)
  - Target B: Galaxy Sports Edge (GSE) Website, Prediction Engine & DFS Optimizer
  - Target C: Galaxy Science Institute (GSI) Biomechanics, RF Vital Sensing & Scientific Corpus
"""

from __future__ import annotations

import hashlib

import numpy as np
import pytest

from intelligence.ecosystem.thirty_three_repo_frontier_integration_engine import (
    REPO_ROOT,
    SKILLS_DIR,
    AlgorithmsYtDlpAutoGptCsNotesCluster,
    EpistemicClaim,
    MemoryDoopDshTensorflowSystemDesignCluster,
    RuViewArchifyAgentTeamsUnleashCluster,
    ToolRegistryTregDeerFlowCalibreStatsmodelsImageAiCluster,
    WindmillRustDeskTrivyBrewMagpieNakamaCluster,
    WorktrunkTuiosCdpClowderReaCluster,
    _sample_gse_gsi_callable,
    run_forty_five_repo_two_pass_integration,
)
from intelligence.ecosystem.twelve_repo_frontier_integration_engine import (
    RuffNativeStaticAndSecurityAuditor,
    SkillVaultAndDeepModuleAnalyzer,
)


def test_cluster1_worktrunk_tuios_chromiumoxide_clowder_and_rea() -> None:
    c1 = WorktrunkTuiosCdpClowderReaCluster()

    # 1. max-sixty/worktrunk: safe file vs concurrent-session protected file
    safe = c1.resolve_worktree_and_check_collision(
        "feat/safe-branch",
        ["intelligence/ecosystem/thirty_three_repo_frontier_integration_engine.py"],
    )
    assert safe["safe_to_edit"] is True
    assert safe["collisions_detected"] == []

    collision = c1.resolve_worktree_and_check_collision(
        "feat/unsafe-branch",
        [
            "workers/stealth-skeleton-provider/src/index.ts",
            ".ua/meta.json",
            str(REPO_ROOT / "workers" / "stealth-skeleton-provider" / "src" / "index.ts"),
            "intelligence/../.ua/meta.json",
            ".UA/meta.json",
        ],
    )
    assert collision["safe_to_edit"] is False
    assert len(collision["collisions_detected"]) == 5

    # 2. Gaurav-Gosain/tuios: pane state machine & invalid state guard
    pane_res = c1.update_tuios_pane_and_post_inbox("pane_1", "gse-worker", "running", "Snap 1..175")
    assert pane_res["active_panes"] == 1
    assert pane_res["latest_inbox_entry"]["seq"] == 1
    with pytest.raises(ValueError, match="Invalid TUIOS pane state"):
        c1.update_tuios_pane_and_post_inbox("pane_1", "gse-worker", "crashed_unknown", "bad")

    # 3. mattsse/chromiumoxide: CDP multiplexing + tracker blocklist
    cdp1 = c1.build_chromiumoxide_cdp_session_frame("tab_dk", "DOM.getDocument", block_trackers=True)
    cdp2 = c1.build_chromiumoxide_cdp_session_frame("tab_dk", "Page.reload", block_trackers=False)
    assert cdp1["id"] == 1
    assert cdp2["id"] == 2
    assert len(cdp1["network_blocked_patterns"]) >= 4
    assert cdp2["network_blocked_patterns"] == []

    # 4. zts212653/clowder-ai: 4 Iron Laws + Cross-Model Review Gate
    good_review = c1.enforce_clowder_iron_laws_and_cross_review(
        "pytest tests/",
        generator_model="claude-opus-4-6",
        reviewer_model="deepseek-r1",
        stance="APPROVE",
    )
    assert good_review["passed"] is True

    same_model_review = c1.enforce_clowder_iron_laws_and_cross_review(
        "pytest tests/",
        generator_model="claude-opus-4-6",
        reviewer_model="claude-opus-4-6",
        stance="APPROVE",
    )
    assert same_model_review["cross_model_verified"] is False
    assert same_model_review["passed"] is False

    iron_law_violation = c1.enforce_clowder_iron_laws_and_cross_review(
        "redis-cli FLUSHALL && DROP DATABASE neondb",
        generator_model="claude-opus-4-6",
        reviewer_model="deepseek-r1",
        stance="APPROVE",
    )
    assert iron_law_violation["iron_laws_passed"] is False
    assert iron_law_violation["passed"] is False

    # 5. morluto/rea: Epistemic provenance + PE/DLL header check
    rea_ok = c1.audit_rea_epistemic_provenance_and_dll([
        EpistemicClaim("C1", "Direct PBP observation", "OBSERVATION", "sha256:111", 0.99),
        EpistemicClaim("C2", "Derived EPA residual", "DERIVATION", "sha256:222", 0.91),
    ])
    assert rea_ok["pe_mz_header_verified"] is True
    assert rea_ok["provenance_sound"] is True

    rea_bad = c1.audit_rea_epistemic_provenance_and_dll([
        EpistemicClaim("C3", "Unverified rumor claimed as observation", "OBSERVATION", "", 0.50),
    ])
    assert rea_bad["unverified_observation_promotions"] == 1
    assert rea_bad["provenance_sound"] is False


def test_cluster2_ruview_archify_agent_teams_and_unleash() -> None:
    c2 = RuViewArchifyAgentTeamsUnleashCluster()

    # 6. ruvnet/RuView: RF CSI respiratory vs sprint gait frequency extraction + outlier spike rejection
    t = np.linspace(0.0, 20.0, 400)
    resp_wave = (np.sin(2.0 * np.pi * 0.25 * t)).tolist()
    resp_wave[100] = 50.0  # synthetic Hampel outlier spike
    resp_res = c2.extract_ruview_csi_respiratory_and_gait_metrics(resp_wave, sample_rate_hz=20.0)
    assert resp_res["classification"] == "RESPIRATORY_RECOVERY_BAND"
    assert 12.0 <= resp_res["cadence_per_minute"] <= 18.0

    gait_wave = (np.sin(2.0 * np.pi * 2.0 * t)).tolist()
    gait_res = c2.extract_ruview_csi_respiratory_and_gait_metrics(gait_wave, sample_rate_hz=20.0)
    assert gait_res["classification"] == "GAIT_SPRINT_CADENCE"
    assert 110.0 <= gait_res["cadence_per_minute"] <= 130.0

    with pytest.raises(ValueError, match="at least 8 samples"):
        c2.extract_ruview_csi_respiratory_and_gait_metrics([0.1, 0.2, 0.3])

    # 7. tt-a1i/archify: Mermaid diagram + Test-Value score
    arch = c2.generate_archify_mermaid_and_score_test_value(
        [("Ingest", "Router"), ("Router", "Simulator")],
        "def test_one():\n    assert 1 == 1\n    assert 2 == 2\n    assert 3 == 3\n",
    )
    assert "flowchart LR" in arch["mermaid_diagram"]
    assert arch["test_value_score"] >= 60.0
    assert arch["high_value_suite"] is True

    # 8. 777genius/agent-teams-ai: wrapAgentBlock & 800-line ratchet
    ratchet_ok = c2.wrap_agent_teams_block_and_check_ratchet(
        "agent-1",
        "REF-1",
        "Done",
        {"new_mod.py": 450, "legacy_mod.py": 1200},
        max_new_file_lines=800,
        legacy_baseline={"legacy_mod.py": 1300},
    )
    assert ratchet_ok["ratchet_passed"] is True
    assert "<<<AGENT_BLOCK agent=agent-1 ref=REF-1>>>" in ratchet_ok["wrapped_block"]

    ratchet_fail = c2.wrap_agent_teams_block_and_check_ratchet(
        "agent-1",
        "REF-2",
        "Oversized",
        {"bloated_new_file.py": 950},
        max_new_file_lines=800,
    )
    assert ratchet_fail["ratchet_passed"] is False

    # 9. Unleash/unleash: deterministic stickiness & kill-switch
    u_on = c2.evaluate_unleash_feature_toggle("CALIBRATION_ADJUSTMENTS_ENABLED", "user_42", 100)
    u_kill = c2.evaluate_unleash_feature_toggle("CALIBRATION_ADJUSTMENTS_ENABLED", "user_42", 100, kill_switch_tripped=True)
    u_mismatch = c2.evaluate_unleash_feature_toggle(
        "CALIBRATION_ADJUSTMENTS_ENABLED",
        "user_42",
        100,
        required_context={"region": "US"},
        actual_context={"region": "EU"},
    )
    assert u_on["enabled"] is True
    assert u_kill["enabled"] is False
    assert u_kill["reason"] == "KILL_SWITCH_TRIPPED"
    assert u_mismatch["enabled"] is False


def test_cluster3_windmill_rustdesk_trivy_brew_magpie_and_nakama() -> None:
    c3 = WindmillRustDeskTrivyBrewMagpieNakamaCluster()

    # 10. windmill-labs/windmill: content-addressed step cache
    calls = 0

    def expensive_step(state: dict[str, int]) -> int:
        nonlocal calls
        calls += 1
        return state["x"] * 2

    r1 = c3.execute_windmill_cached_dag([("double", expensive_step)], {"x": 21})
    r2 = c3.execute_windmill_cached_dag([("double", expensive_step)], {"x": 21})
    assert r1["final_state"]["double"] == 42
    assert r2["cache_hits"] == 1
    assert calls == 1

    # 11. rustdesk/rustdesk: adaptive stream governor
    fast = c3.compute_rustdesk_adaptive_stream_governor(rtt_ms=18.0, packet_loss_pct=0.0)
    degraded = c3.compute_rustdesk_adaptive_stream_governor(rtt_ms=240.0, packet_loss_pct=5.0)
    assert fast["compression_tier"] == "LOSSLESS_RAW_TELEMETRY"
    assert degraded["compression_tier"] == "KEYFRAME_SUMMARY_ONLY"
    assert degraded["target_fps"] == 10

    # 12. aquasecurity/trivy: secret detection + CycloneDX 1.5 SBOM
    clean_scan = c3.run_trivy_secret_scan_and_cyclonedx_sbom(
        {"env": "PUBLIC_URL=https://www.galaxysportsedge.com"},
        [{"name": "statsmodels", "version": "0.15.0"}],
    )
    assert clean_scan["clean_of_secrets"] is True
    assert clean_scan["cyclonedx_sbom"]["specVersion"] == "1.5"

    leaked_scan = c3.run_trivy_secret_scan_and_cyclonedx_sbom(
        {"bad_env": "STRIPE_KEY=sk_" + "live_1234567890abcdefghijklmnop"},
        [],
    )
    assert leaked_scan["clean_of_secrets"] is False
    assert leaked_scan["secret_findings"][0]["rule_id"] == "stripe_live_secret"

    # 13. Homebrew/brew: bottle verification
    brew = c3.run_homebrew_doctor_and_bottle_verification([
        REPO_ROOT / "intelligence" / "native_kernels" / "bin" / "libgse_native_kernels.dll",
    ])
    assert brew["doctor_status"] == "YOUR_SYSTEM_IS_READY_TO_BREW"
    assert brew["verified_bottle_count"] == 1

    # 14. yetone/magpie: model routing + held cooldown on 429
    c3.mark_magpie_model_rate_limited("omniroute/auto/coding:free", cooldown_sec=60.0, now_ts=1000.0)
    routed = c3.route_magpie_model_with_held_cooldown(
        "workhorse",
        ["omniroute/auto/coding:free", "mimo-v2.6-flash"],
        now_ts=1010.0,
    )
    assert routed["selected_model"] == "mimo-v2.6-flash"
    assert routed["held_cooldown_count"] == 1

    # 15. ahmadrosid/nakama: org isolation + verify-bs guard against voided 62-23-1
    nak_clean = c3.verify_nakama_org_isolation_and_bs_guard(
        "gse-prod",
        "gse-prod",
        "Early-down play-action completion rate advantage.",
    )
    nak_voided = c3.verify_nakama_org_isolation_and_bs_guard(
        "gse-prod",
        "gse-prod",
        "Our standing record is 62-23-1 with 22,750,000 snap evaluations!",
    )
    assert nak_clean["verify_bs_passed"] is True
    assert nak_voided["verify_bs_passed"] is False
    assert "62-23-1" in nak_voided["voided_or_unverified_claims"]


def test_cluster4_mcp_memory_doop_dsh_tensorflow_and_system_design() -> None:
    c4 = MemoryDoopDshTensorflowSystemDesignCluster()

    # 16. doobidoo/mcp-memory-service: Ebbinghaus retention decay
    mem = c4.store_and_decay_mcp_memories(
        [
            {"id": "strong", "stability_hours": 100.0, "reinforcements": 4},
            {"id": "weak", "stability_hours": 2.0, "reinforcements": 0},
        ],
        elapsed_hours=10.0,
        retention_floor=0.40,
    )
    assert mem["active_count"] == 1
    assert mem["pruned_count"] == 1

    # 17. kgoedecke/doop: LWW-Element-Set CRDT merge, equal-timestamp commutativity & bbox overlap
    c4.merge_doop_crdt_canvas_op("node_1", 10.0, {"x": 0.0, "y": 0.0, "w": 50.0, "h": 50.0})
    c4.merge_doop_crdt_canvas_op("node_1", 5.0, {"x": 999.0, "y": 999.0, "w": 10.0, "h": 10.0})  # older timestamp ignored
    state = c4.merge_doop_crdt_canvas_op("node_1", 20.0, {"x": 12.0, "y": 24.0, "w": 50.0, "h": 50.0})
    assert state["visible_elements"]["node_1"]["x"] == 12.0
    overlap_state = c4.merge_doop_crdt_canvas_op("node_2", 20.0, {"x": 20.0, "y": 30.0, "w": 50.0, "h": 50.0})
    assert overlap_state["collision_free"] is False
    assert ("node_1", "node_2") in overlap_state["overlapping_pairs"]
    tomb = c4.merge_doop_crdt_canvas_op("node_1", 30.0, {"x": 12.0, "y": 24.0, "w": 50.0, "h": 50.0}, tombstone=True)
    assert "node_1" not in tomb["visible_elements"]

    # Equal-timestamp commutativity check (join-semilattice invariant: merge(A, B) == merge(B, A))
    crdt_a = MemoryDoopDshTensorflowSystemDesignCluster()
    crdt_a.merge_doop_crdt_canvas_op("tie_el", 100.0, {"x": 1.0}, tombstone=False)
    res_ab = crdt_a.merge_doop_crdt_canvas_op("tie_el", 100.0, {"x": 1.0}, tombstone=True)
    crdt_b = MemoryDoopDshTensorflowSystemDesignCluster()
    crdt_b.merge_doop_crdt_canvas_op("tie_el", 100.0, {"x": 1.0}, tombstone=True)
    res_ba = crdt_b.merge_doop_crdt_canvas_op("tie_el", 100.0, {"x": 1.0}, tombstone=False)
    assert res_ab["visible_elements"] == res_ba["visible_elements"] == {}

    # 18. ccch1mneyyy/dsh-Go: patch pin check & mobile client-mirroring rule
    payload = "patch_v1"
    sha = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    dsh = c4.verify_dsh_go_patch_pins_and_mobile_mirror(
        {"p1": sha},
        {"p1": payload},
        [{"id": "1", "edge": 0.04, "stale": False}, {"id": "2", "edge": -0.02, "stale": False}],
    )
    assert dsh["pins_verified"] is True
    assert dsh["mobile_mirrored_row_count"] == 1
    assert dsh["never_added_rows"] is True

    # 19. tensorflow/tensorflow (Pass-2 Zero-Footprint Math): stable logsumexp & focal loss
    tf_out = c4.tensorflow_zero_footprint_math_ops([2.0, -2.0, 1.5, -1.5], [1, 0, 1, 0])
    assert tf_out["brier_score"] < 0.10
    assert tf_out["focal_loss"] < 0.15

    # 20. donnemartin/system-design-primer: consistent hash ring & Odds API token bucket circuit breaker
    sd_ok = c4.system_design_consistent_hash_and_token_bucket(
        ["game1", "game2"],
        ["nodeA", "nodeB"],
        daily_quota=16,
        used_credits=10,
        requested_credits=4,
    )
    sd_tripped = c4.system_design_consistent_hash_and_token_bucket(
        ["game1"],
        ["nodeA", "nodeB"],
        daily_quota=16,
        used_credits=15,
        requested_credits=3,
    )
    assert sd_ok["allow_request"] is True
    assert sd_ok["circuit_breaker_state"] == "CLOSED"
    assert sd_tripped["allow_request"] is False
    assert sd_tripped["circuit_breaker_state"] == "OPEN_QUOTA_EXHAUSTED"


def test_cluster5_algorithms_ytdlp_autogpt_and_csnotes() -> None:
    c5 = AlgorithmsYtDlpAutoGptCsNotesCluster()

    # 21..22. vinta/awesome-python & practical-tutorials/project-based-learning
    ap_res = c5.audit_awesome_python_and_executable_runbook(
        [
            {"name": "ruff", "license": "MIT", "native_c_or_rust": True},
            {"name": "statsmodels", "license": "BSD-3-Clause", "native_c_or_rust": True},
        ],
        [
            {"step": "pytest", "automated_command": "python -m pytest", "requires_manual_ui": False},
        ],
    )
    assert ap_res["all_licenses_cleared"] is True
    assert ap_res["zero_founder_steps_verified"] is True
    assert ap_res["native_accelerated_count"] == 2

    # 23. TheAlgorithms/Python: PageRank + 1D Kalman Filter variance reduction
    res = c5.run_pagerank_and_kalman_filter(
        [("A", "B"), ("B", "C"), ("C", "A"), ("B", "A")],
        [0.10, 0.85, -0.40, 0.25, 0.60, -0.15, 0.20, 0.18],
    )
    assert abs(sum(res["pagerank"].values()) - 1.0) < 1e-3
    assert res["variance_reduction_ratio"] > 0.30

    # 24. yt-dlp/yt-dlp (Pass-2 Zero-Video-Disk coach cue extractor)
    cues = c5.extract_ytdlp_zero_video_coach_cues(
        [{"ts": "00:45", "text": "We want 30 carries to establish the run and put a pitch count on WR1."}],
        {"neutral_pass_rate": 0.68},
    )
    assert "RUN_HEAVY_STATED" in cues["stated_cues"]
    assert "INJURY_SNAP_CAP_STATED" in cues["stated_cues"]
    assert cues["tuesday_vs_sunday_deception"] is True
    assert cues["video_bytes_written_to_disk"] == 0

    # 25..27. AutoGPT perf_compare + CS-Notes Wait-For Graph deadlock cycle detection + HelloGitHub leverage
    no_cycle = c5.autogpt_perf_compare_and_wait_for_deadlock_check(
        [20.0, 21.0, 19.5],
        [5.0, 5.2, 4.9],
        [("w1", "w2"), ("w2", "w3")],
    )
    with_cycle = c5.autogpt_perf_compare_and_wait_for_deadlock_check(
        [10.0, 10.0],
        [15.0, 15.0],
        [("w1", "w2"), ("w2", "w1")],
    )
    assert no_cycle["speedup_pct"] > 70.0
    assert no_cycle["deadlock_cycle_detected"] is False
    assert no_cycle["hellogithub_leverage_score"] > 80.0
    assert with_cycle["perf_regression_detected"] is True
    assert with_cycle["deadlock_cycle_detected"] is True


def test_cluster6_toolregistry_treg_deerflow_calibre_statsmodels_and_imageai() -> None:
    c6 = ToolRegistryTregDeerFlowCalibreStatsmodelsImageAiCluster()

    # 28. Oaklight/ToolRegistry: cross-provider schema translation
    schemas = c6.export_cross_provider_tool_schemas(_sample_gse_gsi_callable)
    assert schemas["openai_schema"]["function"]["name"] == "_sample_gse_gsi_callable"
    assert "game_id" in schemas["anthropic_schema"]["input_schema"]["required"]
    assert "parameters" in schemas["gemini_schema"]
    assert "inputSchema" in schemas["mcp_schema"]

    # 29. superdesigndev/treg: server-side credential injection & scrubbing
    proxy_res = c6.execute_treg_zero_secret_proxy_call(
        "treg_tok_valid",
        "firecrawl",
        {"url": "https://example.com"},
        {"firecrawl": "fc_secret_key_xyz"},
    )
    assert proxy_res["agent_saw_raw_secret"] is False
    assert "fc_secret_key_xyz" not in proxy_res["response"]
    with pytest.raises(PermissionError):
        c6.execute_treg_zero_secret_proxy_call("invalid_token", "firecrawl", {}, {"firecrawl": "k"})

    # 30. bytedance/deer-flow: AST blocking-io-guard for async functions
    bad_async = "import time, requests\nasync def bad_coro():\n    time.sleep(1)\n    requests.get('https://x.com')\n"
    audit_bad = c6.audit_deerflow_async_blocking_io(bad_async)
    assert audit_bad["passed"] is False
    assert audit_bad["violation_count"] == 2

    good_async = "import asyncio\nasync def good_coro():\n    await asyncio.sleep(0.01)\n"
    audit_good = c6.audit_deerflow_async_blocking_io(good_async)
    assert audit_good["passed"] is True

    # 31. kovidgoyal/calibre: headless ArXiv/DOI metadata cataloger
    cat = c6.normalize_calibre_scientific_corpus_catalog([
        {"identifier": "https://arxiv.org/abs/2501.09876", "title": "  Conformal   Prediction  "},
    ])
    assert cat["entries"][0]["canonical_id"] == "arxiv:2501.09876"
    assert cat["entries"][0]["title"] == "Conformal Prediction"

    # 32. statsmodels/statsmodels (0.15.0): FWL OLS HC3 + Benjamini-Hochberg FDR
    sm_res = c6.run_statsmodels_fwl_ols_and_fdr_calibration(
        market_implied_prob=[0.45, 0.50, 0.55, 0.40, 0.60, 0.52, 0.48, 0.58, 0.42, 0.51],
        situational_delta=[0.08, 0.05, 0.07, -0.06, 0.09, 0.04, -0.05, 0.06, -0.07, 0.03],
        realized_outcomes=[1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0],
        candidate_pvalues=[0.0005, 0.004, 0.012, 0.45, 0.88],
    )
    assert sm_res["statsmodels_version"].startswith("0.15")
    assert sm_res["collinear_fallback"] is False
    assert sm_res["ortho_situational_coef"] > 0.0
    assert sm_res["fdr_bh_rejected_count"] == 3

    # Collinear FWL edge case (situational_delta strictly proportional to market_implied_prob + empty p-values)
    sm_collinear = c6.run_statsmodels_fwl_ols_and_fdr_calibration(
        market_implied_prob=[0.45, 0.50, 0.55, 0.40, 0.60, 0.52, 0.48, 0.58, 0.42, 0.51],
        situational_delta=[0.045, 0.050, 0.055, 0.040, 0.060, 0.052, 0.048, 0.058, 0.042, 0.051],
        realized_outcomes=[1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 1.0],
        candidate_pvalues=[],
    )
    assert sm_collinear["collinear_fallback"] is True
    assert sm_collinear["ortho_situational_coef"] == 0.0
    assert sm_collinear["ortho_situational_pvalue"] == 1.0
    assert sm_collinear["fdr_bh_rejected_count"] == 0

    # 33. OlafenwaMoses/ImageAI: Zero-Bloat IoU NMS + NFL box count
    nms_res = c6.run_imageai_zero_bloat_nms_and_box_count([
        (20.0, 1.0, 22.0, 3.0, 0.95),
        (20.05, 1.05, 22.05, 3.05, 0.70),  # suppressed duplicate
        (24.0, 1.0, 26.0, 3.0, 0.92),
        (28.0, 1.0, 30.0, 3.0, 0.90),
    ])
    assert nms_res["raw_detections"] == 4
    assert nms_res["kept_after_nms"] == 3
    assert nms_res["box_classification"] == "LIGHT_BOX_6_OR_FEWER"


def test_end_to_end_forty_five_repo_receipt_ruff_and_deep_modules() -> None:
    receipt = run_forty_five_repo_two_pass_integration()
    assert receipt["two_pass_status"] == "PASS_ALL_45_REPOS_VERIFIED"
    assert receipt["total_repos_integrated"] == 45
    assert receipt["total_skills_in_vault"] >= 305

    # Verify newly installed Batch 2 skills exist on disk
    expected_skills = [
        "worktrunk-writing-user-outputs",
        "tuios-terminal-orchestrator",
        "clowder-code-as-harness",
        "rea-analysis-optimization",
        "ruview-agentdb-vector-search",
        "archify-interactive-diagram",
        "windmill-ai-evals",
        "nakama-verify-bs",
        "mcp-memory-gitnexus-impact",
        "doop-canvas-design",
        "dsh-go-vuln-check",
        "awesome-python-audit",
        "autogpt-perf-compare",
        "treg-tools-registry-context",
        "deerflow-blocking-io-guard",
        "statsmodels-econometrics",
    ]
    for sk in expected_skills:
        assert (SKILLS_DIR / sk / "SKILL.md").exists(), f"Missing installed skill {sk}"

    # Verify Ruff native static + Bandit security check passes with 0 violations on both engines
    ruff_res = RuffNativeStaticAndSecurityAuditor.audit_paths([
        REPO_ROOT / "intelligence" / "ecosystem" / "twelve_repo_frontier_integration_engine.py",
        REPO_ROOT / "intelligence" / "ecosystem" / "thirty_three_repo_frontier_integration_engine.py",
    ])
    assert ruff_res["passed"] is True, f"Ruff diagnostics: {ruff_res['diagnostics']}"

    # Verify Ousterhout Deep Module classification on both engine modules
    deep_res = SkillVaultAndDeepModuleAnalyzer.analyze_deep_module_ratios([
        REPO_ROOT / "intelligence" / "ecosystem" / "twelve_repo_frontier_integration_engine.py",
        REPO_ROOT / "intelligence" / "ecosystem" / "thirty_three_repo_frontier_integration_engine.py",
    ])
    assert deep_res["average_depth_ratio"] >= 40.0
    for mod in deep_res["modules"]:
        assert mod["classification"] == "DEEP_MODULE"
