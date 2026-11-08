r"""Comprehensive Multi-Pass Test Suite for the 12-Repository Frontier Integration Engine.

Tests all 12 repositories across:
  - Target A: Personal Hardware & Software Optimization (C:\Users\Garrett)
  - Target B: Galaxy Sports Edge (GSE) Website & Prediction Engine
  - Target C: Galaxy Science Institute (GSI) Biomechanics, FHIR & Billion-Context Research
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from intelligence.ecosystem.twelve_repo_frontier_integration_engine import (
    REPO_ROOT,
    AccessibilityNode,
    AgentBrowserSnapshotDistiller,
    AstryxDenseProtocolAndA11yEngine,
    BillionContextCcrAndHybridSearchKernel,
    CloudflareSecurityAuditValidator,
    InProcessPrometheusTsdbAndPromQLEngine,
    NvkeNodeContractAndSpiffeAttestor,
    OpenMausBotMcpTrimAndDreamEngine,
    RuffNativeStaticAndSecurityAuditor,
    SherlockProvenanceAndInsiderVerifier,
    SkillVaultAndDeepModuleAnalyzer,
    ZedSumTreeRopeTranscriptIndex,
    run_twelve_repo_two_pass_integration,
)


def test_repo1_vercel_agent_browser_snapshot_and_iframe_invalidation() -> None:
    distiller = AgentBrowserSnapshotDistiller()
    root_v1 = AccessibilityNode(
        role="main",
        name="DraftKings Slate",
        loader_id="loader-1",
        session_id="sess-1",
        children=[
            AccessibilityNode(role="button", name="Jaxon Smith-Njigba Over 93.5"),
            AccessibilityNode(role="textbox", name="Stake", value="50"),
        ],
    )
    snap1 = distiller.build_compact_snapshot(root_v1, frame_id="dk-iframe", raw_html_char_estimate=3500)
    assert snap1["interactive_ref_count"] == 2
    assert "@e1" in snap1["refs"]
    assert snap1["token_reduction_ratio"] > 0.80

    # Simulate OOPIF / iframe navigation (loader_id changes) -> old refs must be invalidated
    still_valid = distiller.sync_frame_validity("dk-iframe", "loader-2", "sess-2")
    assert still_valid is False
    assert "@e1" not in distiller.ref_map

    # Check CVE milestone security gate
    safe_ver = distiller.check_browser_version_security("136.0.7103.48", min_safe_milestone=135)
    old_ver = distiller.check_browser_version_security("128.0.6613.120", min_safe_milestone=135)
    assert safe_ver["is_vulnerable"] is False
    assert old_ver["is_vulnerable"] is True


def test_repo2_cloudflare_security_audit_validators_execute_cleanly() -> None:
    validator = CloudflareSecurityAuditValidator()
    res = validator.validate_gse_and_gsi_security_posture()
    assert res["playbook_count"] >= 13
    assert res["validate_findings_exit_code"] == 0
    assert res["validate_ledger_exit_code"] == 0
    assert "VALIDATION PASSED" in res["validate_findings_output"]
    assert "LEDGER VALIDATION PASSED" in res["validate_ledger_output"]


def test_repo3_and_4_google_and_mattpocock_deep_module_analysis() -> None:
    res = SkillVaultAndDeepModuleAnalyzer.analyze_deep_module_ratios([
        REPO_ROOT / "intelligence" / "dfs" / "two_stage_gse_dfs_pipeline.py",
        REPO_ROOT / "intelligence" / "ecosystem" / "twelve_repo_frontier_integration_engine.py",
    ])
    assert res["modules_analyzed"] == 2
    assert res["average_depth_ratio"] >= 18.0
    for mod in res["modules"]:
        assert mod["classification"] == "DEEP_MODULE"


def test_repo5_meta_astryx_dense_compression_and_spoken_a11y_contract() -> None:
    rows = [
        {
            "game_id": "2026_09_KC_BUF",
            "matchup": "KC @ BUF",
            "category": "player_pass_yds",
            "selection": "Patrick Mahomes OVER 254.5",
            "market_price": -110,
            "model_prob": 0.58,
            "market_fair_prob": 0.50,
            "edge": 0.08,
            "confidence": "82/100",
            "publish_allowed": True,
        }
    ]
    compressed = AstryxDenseProtocolAndA11yEngine.compress_records_dense(rows)
    assert compressed["compression_savings_pct"] > 20.0
    parsed_dense = json.loads(compressed["dense_payload"])
    assert isinstance(parsed_dense, dict)
    assert parsed_dense.get("$s") == "astryx.v1"
    assert isinstance(parsed_dense.get("k"), list)
    assert isinstance(parsed_dense.get("r"), list)
    decompressed = AstryxDenseProtocolAndA11yEngine.decompress_records_dense(compressed["dense_payload"])
    assert decompressed == rows

    # Verify multi-row heterogeneous records + None preservation
    multi_rows = [
        *rows,
        {"game_id": "2026_09_SEA_WAS", "clinical_cohort": None, "publish_allowed": False},
    ]
    comp_multi = AstryxDenseProtocolAndA11yEngine.compress_records_dense(multi_rows)
    assert comp_multi["compression_savings_pct"] > 20.0
    assert AstryxDenseProtocolAndA11yEngine.decompress_records_dense(comp_multi["dense_payload"]) == multi_rows

    # Clean customer-facing spoken phrase passes
    clean_a11y = AstryxDenseProtocolAndA11yEngine.verify_spoken_a11y_contract({
        "role": "region",
        "aria_label": "Chiefs at Bills quarterback matchup analysis, rating 82 out of 100",
        "value": "Pass protection advantage on early downs",
        "state": "expanded",
    })
    assert clean_a11y["passed"] is True

    # Leaked internal math jargon or raw % confidence must fail
    bad_a11y = AstryxDenseProtocolAndA11yEngine.verify_spoken_a11y_contract({
        "role": "region",
        "aria_label": "Romano CQR tau_hat with confidence 85%",
        "value": "Sinkhorn matrix",
    })
    assert bad_a11y["passed"] is False
    assert "tau_hat" in bad_a11y["leaked_jargon"]
    assert bad_a11y["has_raw_pct_confidence"] is True


def test_repo6_prometheus_in_process_tsdb_and_promql_alerts() -> None:
    prom = InProcessPrometheusTsdbAndPromQLEngine()
    prom.set_gauge("gse_conjunction_gate_pass_ratio", 0.42, {"slate": "test"})
    prom.inc_counter("gsi_fhir_records_ingested_total", 500.0, {"source": "mimic_iv"})
    with pytest.raises(ValueError, match="cannot decrease"):
        prom.inc_counter("gsi_fhir_records_ingested_total", -1.0)

    text = prom.export_openmetrics_text()
    assert "gse_conjunction_gate_pass_ratio{slate=\"test\"} 0.42" in text
    assert "# EOF" in text

    alerts = prom.evaluate_alert_rules([
        {"alert": "GateTooLoose", "metric": "gse_conjunction_gate_pass_ratio", "op": ">", "threshold": 0.35, "severity": "critical"},
    ])
    assert len(alerts) == 1
    assert alerts[0]["state"] == "FIRING"


def test_repo7_sherlock_provenance_and_anti_impersonation_gate() -> None:
    real = SherlockProvenanceAndInsiderVerifier.verify_handle_provenance("@RapSheet", "NFL_INJURY_DESK")
    spoof = SherlockProvenanceAndInsiderVerifier.verify_handle_provenance("@RapSheet_BreakingNews2026", "NFL_INJURY_DESK")
    orcid = SherlockProvenanceAndInsiderVerifier.verify_handle_provenance("0000-0002-1825-0097", "GSI_CLINICAL")

    assert real["allow_autonomous_line_move_trigger"] is True
    assert spoof["allow_autonomous_line_move_trigger"] is False
    assert spoof["is_impersonator_or_unverified"] is True
    assert orcid["trust_tier"] == "VERIFIED_PRIMARY_SOURCE"


def test_repo8_openmausbot_mcp_trim_query_result_and_dream_consolidation() -> None:
    engine = OpenMausBotMcpTrimAndDreamEngine(budget_chars=300)
    big_output = "\n".join(f"Row {i}: player_id=P{i:03d} snap_share=0.82" for i in range(1, 50))
    trimmed = engine.trim_mcp_result(big_output)
    assert trimmed["trimmed"] is True
    assert trimmed["result_id"] == "res_1"

    queried = engine.query_result("res_1", offset=0, limit=3, search="P025")
    assert queried["total_matching_lines"] == 1
    assert "P025" in queried["lines"][0]

    assert engine.enforce_tool_policy("read_file", mode="read_only") is True
    assert engine.enforce_tool_policy("bash_exec_destructive", mode="read_only") is False

    dreams = engine.consolidate_dream_memories([
        {"topic": "turf_toe_recovery", "confidence": 0.88, "insight": "Grade 2 turf toe reduces burst by 14% in week 1 back"},
        {"topic": "turf_toe_recovery", "confidence": 0.92, "insight": "Plantar plate stiffness normalizes after 21 days"},
    ])
    assert len(dreams) == 1
    assert dreams[0]["type"] == "DREAM"


def test_repo9_astral_ruff_native_linter_and_security_check() -> None:
    res = RuffNativeStaticAndSecurityAuditor.audit_paths([
        REPO_ROOT / "intelligence" / "ecosystem" / "twelve_repo_frontier_integration_engine.py",
    ])
    assert res["ruff_version"].startswith("ruff ")
    assert res["passed"] is True
    assert res["violation_count"] == 0


def test_repo10_zed_sumtree_rope_logarithmic_line_lookup() -> None:
    rope = ZedSumTreeRopeTranscriptIndex(chunk_size=64)
    doc = "\n".join(f"Snap {i:03d}: Q{(i // 40) + 1} EPA={0.15 * (i % 7):.2f}" for i in range(120))
    summary = rope.build_from_text(doc)
    assert summary.line_count == 119
    assert summary.byte_len == len(doc.encode("utf-8"))

    loc = rope.locate_line_chunk(60)
    assert loc["tree_hops"] <= 8
    assert loc["chunk_start_line"] <= 60
    with pytest.raises(ValueError, match="non-negative"):
        rope.locate_line_chunk(-1)


def test_repo11_billion_context_ccr_simhash_and_hybrid_search() -> None:
    kernel = BillionContextCcrAndHybridSearchKernel(ccr_threshold_chars=200)
    long_payload = "A" * 450
    stored = kernel.store_ccr_or_inline("pbp_tool", long_payload)
    assert stored.startswith('[acp-stored id="ccr_pbp_tool_')
    key = stored.split('id="')[1].split('"')[0]
    assert kernel.retrieve_ccr(key) == long_payload

    # Latched view bytes remain identical even if re-requested with modified prompt text
    b1 = kernel.latch_view_bytes("turn_1", "Original historical turn")
    b2 = kernel.latch_view_bytes("turn_1", "Mutated turn that would break KV prefix cache")
    assert b1 == b2 == b"Original historical turn"

    # SimHash similarity
    sim_high = kernel.simhash_similarity(
        "Seahawks offensive line pressure rate against four-man rush",
        "Seahawks offensive line pressure rate versus four-man rush",
    )
    sim_low = kernel.simhash_similarity(
        "Seahawks offensive line pressure rate against four-man rush",
        "Mitochondrial ATP synthesis kinetic differential equation",
    )
    assert sim_high > sim_low

    # Hybrid 0.7 BM25 + 0.3 Fuzzy search
    docs = [
        {"id": "GSI-1", "domain": "GSI", "text": "Biomechanics Achilles tendon viscoelastic strain tensor"},
        {"id": "GSE-1", "domain": "GSE", "text": "Same Game Parlay Student-t copula tail correlation"},
    ]
    top = kernel.hybrid_bm25_fuzzy_search("Achilles viscoelastic strain", docs, top_k=1)
    assert top[0]["id"] == "GSI-1"
    assert top[0]["hybrid_score"] > 0.8


def test_repo12_nvke_spiffe_attestation_and_node_contract() -> None:
    nvke = NvkeNodeContractAndSpiffeAttestor()
    svid = nvke.mint_spiffe_svid("gsi.science", "genomics", "cohort-worker")
    assert nvke.verify_spiffe_svid(svid["svid_token"]) is True
    assert nvke.verify_spiffe_svid(svid["svid_token"] + "tampered") is False

    with pytest.raises(ValueError, match="Untrusted SPIFFE domain"):
        nvke.mint_spiffe_svid("evil.example.com", "default", "attacker")

    contract = nvke.validate_hybrid_node_contract()
    assert contract["native_avx2_dll_present"] is True
    assert contract["contract_ready"] is True


def test_end_to_end_twelve_repo_two_pass_integration_receipt() -> None:
    receipt = run_twelve_repo_two_pass_integration()
    assert receipt["two_pass_status"] == "PASS_ALL_12_REPOS_VERIFIED"
    assert len(receipt["repos"]) == 12
    assert (REPO_ROOT / ".zed" / "settings.json").exists()
    assert Path(r"C:\Users\Garrett\.agents\skills\cloudflare-security-audit\SKILL.md").exists()
    assert Path(r"C:\Users\Garrett\.agents\skills\vercel-agent-browser\SKILL.md").exists()
    assert Path(r"C:\Users\Garrett\.agents\skills\astryx-dense-compression-protocol\SKILL.md").exists()
