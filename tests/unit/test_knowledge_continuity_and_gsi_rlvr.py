"""Tests for Simulation Hold Gate, Zero-Loss Continuity, Theorem AST & GSE->GSI RLVR."""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

from gse_engine.governance import (
    OperatorSimulationHoldError,
    assert_operator_simulation_week_approved,
    is_simulation_week_approved,
)
from gse_engine.memory import (
    DIMENSIONLESS,
    WAVE20_CORPUS_ENTRIES,
    WAVE20B_CORPUS_ENTRIES,
    StudyEffect,
    TheoremDependencyNode,
    ZeroLossContinuityError,
    analyze_understand_anything_blast_radius,
    build_neo4j_and_obsidian_knowledge_graph,
    classify_neovalues_coaching_archetype,
    compile_and_query_tddlog_wmc,
    compile_gse_to_gsi_rlvr_training_batch,
    compute_catboost_ordered_boosting_shift,
    compute_litstudy_bibliometric_authority,
    compute_woodelf_banzhaf_interactions,
    compute_xformers_online_lse_attention,
    enforce_nexus_field_entitlement_and_source_rights,
    evaluate_frontier_reasoning_benchmark_suite,
    evaluate_g_fire_gate,
    evaluate_pico_pairwise_cascade,
    evaluate_ragas_retrieval_faithfulness,
    evaluate_soft_oblique_decision_tree,
    evaluate_wave20_corpus_rag_and_bayesian_bridge,
    fit_em_and_fisher_lda_regime_posterior,
    fit_pymc_noncentered_hierarchical_pooling,
    load_openviking_tiered_context,
    normalize_docling_layout_ast,
    pool_pet_peese_meta_regression,
    propagate_vue_reactive_dirty_flags,
    prune_dtrbench_subforest,
    run_defensive_dork_and_katana_self_audit,
    run_openmythos_recurrent_depth_refinement,
    schedule_camoverride_lit_curriculum,
    search_and_execute_aci_intent_tool,
    search_qdrant_quantized_hybrid_rrf,
    should_xfetch_early_refresh,
    synthesize_openscholar_verified_claims,
    verify_buckingham_pi_homogeneity,
    verify_regulex_redos_safety,
    verify_zero_loss_knowledge_continuity,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_future_week_simulation_hold_gate_blocks_week11_without_approval() -> None:
    """Week >= 11 simulations must fail closed unless explicitly approved."""
    assert is_simulation_week_approved(10, env_override="") is True
    assert is_simulation_week_approved(11, env_override="") is False
    assert is_simulation_week_approved(12, env_override="11") is False
    assert is_simulation_week_approved(11, env_override="11") is True
    assert is_simulation_week_approved(11, env_override="ALL") is True

    with pytest.raises(OperatorSimulationHoldError, match="OPERATOR_SIM_HOLD"):
        assert_operator_simulation_week_approved(11, caller="test_gate", env_override="")

    approved = assert_operator_simulation_week_approved(
        11, caller="test_gate", env_override="11"
    )
    assert approved["approved"] is True
    assert approved["week"] == 11

    proc = subprocess.run(
        [
            sys.executable,
            "scripts/ops/gse_t_minus_lock_orchestrator.py",
            "--week",
            "11",
            "--matchup",
            "IND@HOU",
            "--live",
        ],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        env={**dict(__import__("os").environ), "GSE_OPERATOR_APPROVED_SIM_WEEKS": ""},
        check=False,
    )
    assert proc.returncode != 0
    assert "OPERATOR_SIM_HOLD" in proc.stderr


def test_zero_loss_knowledge_continuity_and_fail_closed_floor() -> None:
    """All 7 canonical knowledge stores pass floors and raise if breached."""
    res = verify_zero_loss_knowledge_continuity(REPO_ROOT)
    assert res["verified"] is True
    assert len(res["continuity_sha256"]) == 64
    assert res["total_indexed_knowledge_units"] >= 81707
    assert res["stores"]["pdfs_count"] >= 877
    assert res["stores"]["foundry_files"] >= 12469
    assert res["stores"]["foundry_primitives"] >= 47645
    assert res["stores"]["sovereign_primitives"] >= 58486
    assert res["stores"]["equations_count"] >= 9875
    assert res["stores"]["lessons_count"] >= 37
    assert res["stores"]["gsi_compounds"] == 81

    with pytest.raises(ZeroLossContinuityError, match="ZERO_LOSS_CONTINUITY_BREACH"):
        verify_zero_loss_knowledge_continuity(REPO_ROOT, min_lessons=999999)


def test_buckingham_pi_g_fire_and_pet_peese_theorem_primitives() -> None:
    """Buckingham Pi rank, G_fire retraction blocking, and PET-PEESE clamping hold."""
    aero = verify_buckingham_pi_homogeneity(
        lhs_dim=(1, 1, -2, 0, 0, 0),
        rhs_dim=(1, 1, -2, 0, 0, 0),
        transcendental_arg_dims=(DIMENSIONLESS,),
        variable_dims=(
            (1, 1, -2, 0, 0, 0),
            (1, -3, 0, 0, 0, 0),
            (0, 1, -1, 0, 0, 0),
            (0, 2, 0, 0, 0, 0),
            (0, 0, -1, 0, 0, 0),
            (0, 1, 0, 0, 0, 0),
        ),
    )
    assert aero["passed"] is True
    assert aero["dimensional_rank"] == 3
    assert aero["num_pi_groups"] == 3
    assert aero["quarantine_weight"] == 1.0

    bad = verify_buckingham_pi_homogeneity(
        lhs_dim=(1, 1, -2, 0, 0, 0),
        rhs_dim=(0, 1, -1, 0, 0, 0),
        transcendental_arg_dims=((0, 1, 0, 0, 0, 0),),
    )
    assert bad["passed"] is False
    assert bad["quarantine_weight"] == 0.0

    retracted = evaluate_g_fire_gate(
        TheoremDependencyNode("arxiv:2312.11067", "arxiv:2312.11067", "game", 4),
        query_scale="game",
        n_obs=500,
        games_played=10,
    )
    assert retracted["fires"] is False
    assert retracted["quarantine_weight"] == 0.0

    low_deff = evaluate_g_fire_gate(
        TheoremDependencyNode("eq_long_run", "textbook_1", "game", 20),
        query_scale="game",
        n_obs=30,
        deff_cluster=2.0,
        games_played=10,
    )
    assert low_deff["fires"] is False
    assert low_deff["n_eff"] == 15.0

    pooled = pool_pet_peese_meta_regression(
        [
            StudyEffect("s1", 2.5, 0.2, 1.0, 200),
            StudyEffect("s2", 2.2, 0.15, 1.0, 250),
            StudyEffect("s3", 2.1, 0.25, 1.0, 180),
            StudyEffect("s4", 2.4, 0.18, 1.0, 220),
            StudyEffect("s5", 2.3, 0.19, 1.0, 210),
        ]
    )
    assert -1.20 <= pooled["pooled_g"] <= 1.20
    assert pooled["m_studies"] == 5


def test_gse_to_gsi_rlvr_compiler_verifiers_and_frontier_benchmarks(tmp_path: Path) -> None:
    """RLVR compiler refuses mind.jsonl, strips odds, self-verifies, and passes 5 axes."""
    with pytest.raises(ValueError, match="SINGLE_WRITER_VIOLATION"):
        compile_gse_to_gsi_rlvr_training_batch(
            REPO_ROOT, output_path=REPO_ROOT / "brain" / "mind.jsonl"
        )

    out_jsonl = tmp_path / "gse_to_gsi_rlvr.jsonl"
    res = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT, output_path=out_jsonl)
    assert res["all_verifiers_passed"] is True
    assert res["zero_odds_contamination"] is True
    assert res["records_compiled"] >= 12
    assert out_jsonl.is_file()

    lines = [ln for ln in out_jsonl.read_text(encoding="ascii").splitlines() if ln.strip()]
    assert len(lines) == res["records_compiled"]
    for raw in lines:
        rec = json.loads(raw)
        assert rec["model_target"] == "gse-gsi-reasoner-v1"
        ns: dict[str, Any] = {}
        exec(rec["reward_verifier"], ns, ns)
        assert ns["verify"](rec["ground_truth"]) is True
        assert ns["verify"]({}) is False

    bench = evaluate_frontier_reasoning_benchmark_suite(REPO_ROOT)
    assert bench["all_axes_passed"] is True
    assert bench["composite_score"] == 100.0


def test_wave20_registry_and_rag_bayesian_hygiene_kernels() -> None:
    """Verify all 119 WIRED_V3 registry entries and Wave 20 RAG/Bayesian/Defensive kernels."""
    reg_path = (
        REPO_ROOT
        / "docs"
        / "data-sources"
        / "research"
        / "2026-11-15"
        / "oss-corpus-registry.json"
    )
    reg = json.loads(reg_path.read_text(encoding="utf-8"))
    entries = reg["entries"]
    assert reg["total_submitted_urls"] == 141
    assert reg["total_entries"] == 131
    assert reg["total_unique_entries"] == 131
    assert len(WAVE20_CORPUS_ENTRIES) == 26
    assert len(WAVE20B_CORPUS_ENTRIES) == 8
    urls = [str(e["url"]) for e in entries]
    assert len(set(urls)) == 131
    by_url = {str(e["url"]): e for e in entries}
    for req_url in (
        "https://github.com/facebookresearch/xformers",
        "https://github.com/sohutv/cachecloud",
        "https://github.com/zjunlp/DeepKE",
        *[str(item["url"]) for item in WAVE20_CORPUS_ENTRIES],
        *[str(item["url"]) for item in WAVE20B_CORPUS_ENTRIES],
    ):
        assert req_url in by_url
        assert by_url[req_url]["status"] == "WIRED_V3"

    ast_res = normalize_docling_layout_ast(
        [
            {"kind": "table", "section": "trench", "text": "COL1 COL2 | 0.25 0.75"},
            {"kind": "formula", "section": "bayes", "text": "theta = mu + tau * z"},
        ],
        child_max_chars=40,
    )
    assert ast_res["table_count"] == 1 and ast_res["formula_count"] == 1
    assert ast_res["child_count"] >= 2

    viking = load_openviking_tiered_context(
        [
            {
                "node_id": "n1",
                "score": 0.9,
                "l0_abstract": "trench pressure",
                "l1_overview": "trench pressure cox survival curve",
                "l2_detail": " ".join(["token"] * 12),
            },
            {
                "node_id": "n2",
                "score": 0.5,
                "l0_abstract": "wind",
                "l1_overview": "crosswind passing drag physics",
                "l2_detail": " ".join(["wind"] * 20),
            },
        ],
        token_budget=18,
    )
    assert viking["tokens_used"] <= 18
    assert viking["highest_tier_loaded"] == "L2"

    qdrant_hits = search_qdrant_quantized_hybrid_rrf(
        [1.0, 0.2, 0.0],
        ["pressure", "cox"],
        [
            {
                "doc_id": "good",
                "vector": [0.95, 0.2, 0.0],
                "text": "pressure cox survival",
                "payload": {"retracted": False, "sport": "NFL"},
            },
            {
                "doc_id": "bad_ret",
                "vector": [1.0, 0.2, 0.0],
                "text": "pressure cox retracted",
                "payload": {"retracted": True, "sport": "NFL"},
            },
        ],
        required_payload={"retracted": False, "sport": "NFL"},
    )
    assert [h["doc_id"] for h in qdrant_hits] == ["good"]

    kg = build_neo4j_and_obsidian_knowledge_graph(
        [{"chunk_id": "c1", "entities": ["E1", "E2"]}],
        {"MOC": "Links [[NoteA]]", "NoteA": "Back to [[MOC]]"},
    )
    assert kg["edge_count"] == 2 and kg["zero_orphans"] is True

    ragas_bad = evaluate_ragas_retrieval_faithfulness(
        supported_claims=2,
        total_claims=10,
        relevant_retrieved=3,
        total_retrieved=4,
        relevant_ground_truth=4,
    )
    assert ragas_bad["gate_multiplier"] == 0.0
    ragas_ok = evaluate_ragas_retrieval_faithfulness(
        supported_claims=9,
        total_claims=10,
        relevant_retrieved=4,
        total_retrieved=4,
        relevant_ground_truth=5,
    )
    assert ragas_ok["gate_multiplier"] > 0.7

    pymc = fit_pymc_noncentered_hierarchical_pooling([0.20, -0.10], [0.05, 0.02])
    assert abs(pymc["posterior_means"][0]) < 0.20  # shrunk toward hyper-mean

    cat = compute_catboost_ordered_boosting_shift([0.1, 0.2, 0.9], prior_mean=0.0, prior_weight=4.0)
    assert cat["ordered_target_stats"][0] == 0.0
    assert cat["ordered_target_stats"][2] < 0.1  # index 2 cannot see y_2=0.9

    attn = compute_xformers_online_lse_attention(
        [100.0, 100.0], [[10.0, 10.0], [1.0, 1.0]], [[1.0, 0.0], [0.0, 1.0]]
    )
    assert attn[0] > 0.99 and math.isfinite(attn[1])

    dirty = propagate_vue_reactive_dirty_flags(
        {"stage0": ["stage1"], "stage1": ["stage2"], "other": ["other2"]}, ["stage0"]
    )
    assert dirty == {"stage0", "stage1", "stage2"}
    assert should_xfetch_early_refresh(remaining_ttl_sec=1.0, compute_delta_sec=3.0, uniform_u=0.5)
    blast = analyze_understand_anything_blast_radius(
        [("workflow", "integrator"), ("integrator", "wave20")], "wave20"
    )
    assert blast["impacted_modules"] == ["integrator", "workflow"]

    redacted = enforce_nexus_field_entitlement_and_source_rights(
        field_name="pick_selection", raw_value="BAL -3.5", user_entitled=False, source_cleared=True
    )
    assert redacted["allowed"] is False and redacted["value"] == "REDACTED_UPGRADE_REQUIRED"
    uncleared = enforce_nexus_field_entitlement_and_source_rights(
        field_name="public_metric", raw_value=1.0, user_entitled=True, source_cleared=False
    )
    assert uncleared["allowed"] is False

    assert verify_regulex_redos_safety(r"(a+)+")["safe"] is False
    assert verify_regulex_redos_safety(r"^[a-z0-9_-]{3,32}$")["safe"] is True

    with pytest.raises(PermissionError, match="EXTERNAL_SCAN_REFUSED"):
        run_defensive_dork_and_katana_self_audit(
            target_host="example.com", candidate_paths=["/sitemap.xml"]
        )
    audit = run_defensive_dork_and_katana_self_audit(
        target_host="galaxysportsedge.com", candidate_paths=["/packages", "/.env", "/id_rsa"]
    )
    assert audit["clean"] is False and len(audit["exposures_flagged"]) == 2

    bridge = evaluate_wave20_corpus_rag_and_bayesian_bridge(
        away_team="LAC",
        home_team="BAL",
        away_sched_epa=0.05,
        home_sched_epa=0.09,
        away_clean_epa=0.07,
        home_clean_epa=0.11,
        rrf_citations=[{"id": "c1", "title": "trench survival", "rrf_score": 0.9}],
    )
    assert bridge["wave20_wired"] is True and bridge["oss_registry_unique_entries"] == 131
    assert bridge["tddlog_exact_conjunction_prob"] == 1.0

    aci_ok = search_and_execute_aci_intent_tool(
        intent_query="search nfl injury feed",
        catalog=[
            {"name": "injury_search", "description": "search nfl injury feed", "scope": "read"},
            {"name": "bank_wire", "description": "send payment", "scope": "write_pay"},
        ],
        allowed_scopes=["read"],
    )
    assert aci_ok["selected_tool"] == "injury_search" and aci_ok["allowed"] is True
    aci_deny = search_and_execute_aci_intent_tool(
        intent_query="send payment bank",
        catalog=[{"name": "bank_wire", "description": "send payment bank", "scope": "write_pay"}],
        allowed_scopes=["read"],
    )
    assert aci_deny["allowed"] is False and aci_deny["reason"] == "ACI_SCOPE_DENIED:write_pay"

    mythos = run_openmythos_recurrent_depth_refinement(
        [0.4, -0.3], [0.1, 0.05], max_loops=24, halt_tol=1e-4
    )
    assert mythos["loops_executed"] <= 24 and mythos["converged"] is True

    lit = compute_litstudy_bibliometric_authority(
        {
            "echo_1": ["ref_a", "ref_b"],
            "echo_2": ["ref_a", "ref_b"],
            "indep": ["ref_z"],
        }
    )
    assert lit["weights"]["indep"] > lit["weights"]["echo_1"]
    assert 1.5 <= lit["effective_independent_sources"] <= 3.0

    sched = schedule_camoverride_lit_curriculum(
        [
            {"item_id": "behemoth", "text": "stochastic manifold theorem pde", "prereq_count": 2},
            {"item_id": "intro", "text": "intro guide overview", "prereq_count": 0},
            {"item_id": "prac", "text": "applied markov pipelines", "prereq_count": 1},
        ]
    )
    assert [row["tier"] for row in sched] == [
        "TIER_1_FOUNDATION",
        "TIER_2_PRACTITIONER",
        "TIER_3_BEHEMOTH",
    ]


def test_wave20b_openscholar_tddlog_woodelf_and_tree_kernels() -> None:
    """Verify all 8 Wave 20B literature, EM/LDA, exact WMC, and WOODELF Banzhaf kernels."""
    scholar = synthesize_openscholar_verified_claims(
        [
            {"claim_id": "ok", "statement": "Valid pressure curve", "citations": ["c1"]},
            {"claim_id": "bad", "statement": "Hallucinated claim", "citations": ["c_missing"]},
        ],
        ["c1", "c2"],
    )
    assert len(scholar["verified_claims"]) == 1
    assert scholar["rejected_claim_ids"] == ["bad"]

    pico_ok = evaluate_pico_pairwise_cascade([0.9, 0.4, 0.2], [(0, 1, 0.3), (1, 2, 0.1)])
    pico_no = evaluate_pico_pairwise_cascade([0.2, 0.4, 0.2], [(0, 1, 0.3), (1, 2, 0.1)])
    assert pico_ok["accepted"] is True and pico_no["accepted"] is False
    assert pico_no["rejected_at_stage"] == 1

    oblique = evaluate_soft_oblique_decision_tree([1.0, 0.5], [1.0, 1.0], 1.5, -1.0, 1.0)
    assert abs(oblique["p_right"] - 0.5) < 1e-7 and oblique["gradient_norm"] > 0.0

    lda = fit_em_and_fisher_lda_regime_posterior(
        [[0.1, 0.1], [0.2, 0.0], [2.0, 2.1], [2.2, 1.9]],
        [0, 0, 1, 1],
        [2.1, 2.0],
    )
    assert lda["posterior_competitive_regime"] > 0.99

    tdd = compile_and_query_tddlog_wmc(
        {"A": 0.6, "B": 0.5},
        [[("A", True)], [("B", True)]],
    )
    assert abs(tdd["exact_probability"] - (0.6 + 0.5 - 0.6 * 0.5)) < 1e-12

    arch = classify_neovalues_coaching_archetype(
        proe=0.05, blitz_rate=0.18, two_high_rate=0.52, motion_rate=0.50
    )
    assert arch["archetype"] == "TWO_HIGH_SHELL_ERASER"

    pruned = prune_dtrbench_subforest([[1.0, 2.0], [3.0, 4.0], [1.9, 3.1], [2.1, 2.9]], max_trees=2)
    assert pruned["subforest_size"] == 2 and pruned["approximation_rmse"] < 0.2

    woodelf = compute_woodelf_banzhaf_interactions(lambda bits: float(bits[0] * bits[1]), 2)
    assert woodelf["main_effects"] == [0.5, 0.5]
    assert woodelf["pairwise_interactions"][(0, 1)] == 0.5
