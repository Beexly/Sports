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
    WAVE21_CORPUS_ENTRIES,
    OmnibusVaultContinuityError,
    StudyEffect,
    TheoremDependencyNode,
    ZeroLossContinuityError,
    analyze_understand_anything_blast_radius,
    assert_prediction_market_compliance_hold,
    audit_all_25_monorepo_knowledge_vaults,
    audit_cross_branch_knowledge_radar,
    build_neo4j_and_obsidian_knowledge_graph,
    calibrate_ensemble_weather_stadium_priors,
    classify_neovalues_coaching_archetype,
    compile_and_query_tddlog_wmc,
    compile_gse_to_gsi_rlvr_training_batch,
    compute_bert_bidirectional_salience_and_contrastive_align,
    compute_catboost_ordered_boosting_shift,
    compute_litstudy_bibliometric_authority,
    compute_lmsr_bregman_projection_and_flb_debias,
    compute_metrica_skillcorner_pitch_control,
    compute_multisport_pybaseball_hockeyr_and_vorp_metrics,
    compute_nhl_spatiotemporal_shot_xg,
    compute_sumer_permutation_invariant_tracking_attention,
    compute_trl_grpo_group_advantages,
    compute_woodelf_banzhaf_interactions,
    compute_xformers_online_lse_attention,
    compute_xgboost_newton_hessian_split_gain,
    enforce_nexus_field_entitlement_and_source_rights,
    evaluate_bivariate_weibull_count_calibration,
    evaluate_frontier_reasoning_benchmark_suite,
    evaluate_g_fire_gate,
    evaluate_nfl4th_and_nflwin_decision_wp,
    evaluate_openbiomechanics_kinematic_and_injury_hazard,
    evaluate_pico_pairwise_cascade,
    evaluate_ragas_retrieval_faithfulness,
    evaluate_soft_oblique_decision_tree,
    evaluate_wave20_corpus_rag_and_bayesian_bridge,
    evaluate_wave21_tracking_biomech_and_rlvr_bridge,
    fit_em_and_fisher_lda_regime_posterior,
    fit_pymc_noncentered_hierarchical_pooling,
    load_openviking_tiered_context,
    manage_letta_tiered_working_memory,
    normalize_docling_layout_ast,
    optimize_fpl_multiweek_squad_and_captaincy,
    pack_axolotl_multipack_rlvr_sequences,
    pool_pet_peese_meta_regression,
    propagate_vue_reactive_dirty_flags,
    prune_dtrbench_subforest,
    retrieve_omnibus_theorems_and_coach_priors,
    run_defensive_dork_and_katana_self_audit,
    run_openmythos_recurrent_depth_refinement,
    schedule_camoverride_lit_curriculum,
    score_lm_eval_harness_calibration,
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
    assert res["stores"]["foundry_files"] >= 12558
    assert res["stores"]["foundry_primitives"] >= 50656
    assert res["stores"]["sovereign_primitives"] >= 58486
    assert res["stores"]["equations_count"] >= 9875
    assert res["stores"]["lessons_count"] >= 38
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
    assert res["records_compiled"] >= 26
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
    assert bench["axes"]["external_frontier_and_forecastbench_suite"] == 100.0
    assert len(bench["axes"]) == 6
    assert bench["composite_score"] == 100.0


def test_wave20_registry_and_rag_bayesian_hygiene_kernels() -> None:
    """Verify all 169 WIRED_V3 registry entries and Wave 20 RAG/Bayesian/Defensive kernels."""
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
    assert reg["total_submitted_urls"] == 183
    assert reg["total_entries"] == 169
    assert reg["total_unique_entries"] == 169
    assert len(WAVE20_CORPUS_ENTRIES) == 26
    assert len(WAVE20B_CORPUS_ENTRIES) == 12
    assert len(WAVE21_CORPUS_ENTRIES) == 34
    urls = [str(e["url"]) for e in entries]
    assert len(set(urls)) == 169
    by_url = {str(e["url"]): e for e in entries}
    for req_url in (
        "https://github.com/facebookresearch/xformers",
        "https://github.com/sohutv/cachecloud",
        "https://github.com/zjunlp/DeepKE",
        "https://github.com/ag-ui-protocol/ag-ui",
        *[str(item["url"]) for item in WAVE20_CORPUS_ENTRIES],
        *[str(item["url"]) for item in WAVE20B_CORPUS_ENTRIES],
        *[str(item["url"]) for item in WAVE21_CORPUS_ENTRIES],
    ):
        assert req_url in by_url
        assert by_url[req_url]["status"] == "WIRED_V3"

    pm_hold_entries = [
        e for e in entries if "compliance_hold" in str(e.get("license_posture") or "")
    ]
    assert len(pm_hold_entries) == 8
    assert all(e.get("cleared") is False for e in pm_hold_entries)

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
    assert bridge["wave20_wired"] is True and bridge["oss_registry_unique_entries"] == 169
    assert bridge["tddlog_exact_conjunction_prob"] == 1.0
    assert bridge["xgboost_newton_split_gain"] > 0.0

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

    fpl_cands = [
        {"player_id": f"p{i}", "cost": 6.0, "xpts": [7.5 - 0.3 * i, 6.0, 5.5]}
        for i in range(13)
    ]
    fpl = optimize_fpl_multiweek_squad_and_captaincy(
        fpl_cands,
        horizon_weeks=3,
        free_transfers=1,
        current_squad_ids=[f"p{i}" for i in range(11)],
    )
    assert len(fpl["selected_xi_ids"]) == 11
    assert fpl["captain_id"] == "p0"
    assert fpl["transfer_penalty"] == 0.0

    xg_close = compute_nhl_spatiotemporal_shot_xg(
        rink_x_ft=82.0, rink_y_ft=3.0, is_rebound=True, skater_diff=1, shot_type="tip"
    )
    xg_point = compute_nhl_spatiotemporal_shot_xg(
        rink_x_ft=40.0, rink_y_ft=25.0, is_rebound=False, skater_diff=0, shot_type="slap"
    )
    assert xg_close["xg_prob"] > xg_point["xg_prob"]

    xgb_ok = compute_xgboost_newton_hessian_split_gain(
        [-2.0], [1.0], [2.0], [1.0], monotone_constraint=-1
    )
    xgb_bad = compute_xgboost_newton_hessian_split_gain(
        [-2.0], [1.0], [2.0], [1.0], monotone_constraint=1
    )
    assert xgb_ok["accepted"] is True and xgb_ok["gain"] > 0.0
    assert xgb_bad["monotone_satisfied"] is False and xgb_bad["accepted"] is False

    cal = evaluate_bivariate_weibull_count_calibration([0.8, 0.2, 0.7, 0.3], [1, 0, 1, 0])
    assert cal["weibull_unit_hazard"] > 0.0
    assert 0.0 <= cal["brier_score"] < 0.1
    assert cal["ece"] < 0.3


def test_monorepo_25_vault_omnibus_census_and_dormancy_contracts(tmp_path: Path) -> None:
    """Verify all 46 monorepo vaults, 46/46 data subdirs, radar harvest, and firewalls."""
    omnibus = audit_all_25_monorepo_knowledge_vaults(REPO_ROOT)
    assert omnibus["verified"] is True
    assert omnibus["vaults_verified"] == 46
    assert omnibus["data_subdirs_verified_count"] == 46
    for top_key in (
        "foundry_primitives_dir",
        "engine_root",
        "eval_suites",
        "formal_heartbeat",
        "ml_service_mirror",
        "autonomous_workflows",
        "edge_workers",
    ):
        assert omnibus["vaults"][top_key]["ok"] is True
    assert omnibus["vaults"]["foundry_primitives_dir"]["files"] >= 12558

    radar = audit_cross_branch_knowledge_radar(REPO_ROOT)
    assert radar["branches_tracked"] >= 10
    assert radar["foundry_tierb_harvested_files"] == 89
    assert omnibus["cross_branch_radar"]["foundry_total_primitive_files_on_disk"] >= 12558
    assert omnibus["complete_corpus_books"] == 503
    assert omnibus["zero_skip_theorems"] == 2949
    assert omnibus["coach_brain_records"] >= 41792
    assert omnibus["gse_dataset_records"] >= 1110000
    assert omnibus["film_room_2026_files"] >= 36337
    assert omnibus["total_jsonl_records"] >= 1230000

    # Dormant gse_brain proofs must keep effective_live_weight=0.0 while spec unmet
    dormant = omnibus["dormant_contracts"]
    assert dormant["kalman_proof_play_baseline_latest.json"]["effective_live_weight"] == 0.0
    assert dormant["espnanalytics_4th_down_latest.json"]["effective_live_weight"] == 0.0

    # Medical RUO, Step-N Zone-2, and Q52-Q54 shadow firewalls
    fw = omnibus["quarantine_firewalls"]
    assert fw["mimic_iv_medical_ruo"]["sports_spine_import_permitted"] is False
    assert fw["mimic_iv_medical_ruo"]["sports_spine_weight"] == 0.0
    assert fw["step_n_market_zone2"]["stage1_to_3_import_permitted"] is False
    assert fw["q52_q54_shadow_metrics"]["effective_live_weight"] == 0.0
    assert fw["q52_q54_shadow_metrics"]["Q52"] == "SHADOW"

    # Research-only & quarantined captures never falsely marked cleared for live production
    for key in (
        "artifacts_gapbreak",
        "artifacts_crawl",
        "artifacts_api_captures",
        "firecrawl_snapshots",
        "data_mimic_iv_medical_quarantine",
        "data_step_n_market_firewall",
    ):
        assert omnibus["vaults"][key]["live_production_cleared"] is False

    continuity = verify_zero_loss_knowledge_continuity(REPO_ROOT)
    assert continuity["total_indexed_knowledge_units"] >= 1350000
    assert continuity["stores"]["monorepo_vaults_verified"] == 46
    assert continuity["stores"]["all_46_data_subdirs_verified"] == 46
    assert continuity["stores"]["cross_branch_radar_tracked"] >= 10

    with pytest.raises(OmnibusVaultContinuityError, match="MONOREPO_VAULT_BREACH"):
        audit_all_25_monorepo_knowledge_vaults(tmp_path, use_cache=False)

    ret = retrieve_omnibus_theorems_and_coach_priors(
        "LAC", "BAL", ["fourth", "pressure", "wind", "cumulative"], REPO_ROOT
    )
    assert ret["sealed_center_tau"] == 0.42
    assert ret["equation_catalog_12304_count"] == 12304
    assert ret["statking_active_metrics_count"] == 90
    assert ret["firstandthirty_pass_yds_rows"] == 1435
    assert ret["q52_q54_shadow_registered"] is True
    assert len(ret["matched_theorems"]) >= 3
    assert -0.003 <= float(ret["omnibus_epa_prior_adj"]) <= 0.003


def test_wave21_tracking_biomech_rlvr_multisport_and_polymarket_hold_kernels() -> None:
    """Verify Wave 21 tracking permutation invariance, biomech/ACWR, RLVR & compliance hold."""
    with pytest.raises(PermissionError, match="POLYMARKET_COMPLIANCE_HOLD"):
        assert_prediction_market_compliance_hold(live_execution_requested=True)
    with pytest.raises(PermissionError, match="POLYMARKET_COMPLIANCE_HOLD"):
        assert_prediction_market_compliance_hold(gamma_cron_requested=True)

    hold_ok = assert_prediction_market_compliance_hold(live_execution_requested=False)
    assert hold_ok["cleared"] is False and hold_ok["live_execution_enabled"] is False

    lmsr = compute_lmsr_bregman_projection_and_flb_debias([0.70, 0.30], flb_gamma=1.10)
    assert lmsr["cleared"] is False
    assert abs(sum(lmsr["debiased_probs"]) - 1.0) < 1e-6

    wx = calibrate_ensemble_weather_stadium_priors(
        [10.0, 16.0, 20.0, 12.0], [34.0, 31.0, 29.0, 35.0], [0.0, 2.0, 3.0, 0.5]
    )
    assert abs(wx["p_high_wind_exceedance"] - 0.5) < 1e-6
    assert abs(wx["p_freeze_exceedance"] - 0.5) < 1e-6
    assert wx["completion_weather_drag"] > 0.0

    pack = pack_axolotl_multipack_rlvr_sequences([2048, 1500, 1800, 500], max_seq_len=4096)
    assert pack["bins_used"] == 2 and pack["packing_efficiency"] > 0.70

    grpo = compute_trl_grpo_group_advantages(
        [1.0, 0.0, 1.0, 0.0], [-1.0, -1.2, -0.9, -1.1], [-1.05, -1.18, -0.95, -1.12]
    )
    assert abs(sum(grpo["advantages"])) < 1e-5
    assert grpo["mean_kl_divergence"] >= 0.0

    lm_eval = score_lm_eval_harness_calibration([-12.0, -10.0], [12, 5], gold_index=0)
    assert lm_eval["acc"] is False and lm_eval["acc_norm"] is True

    letta = manage_letta_tiered_working_memory(
        {"persona": "gse_reasoner"},
        [("Injury fact one", 0.9), ("Very long archival " + "x" * 200, 0.5)],
        core_char_limit=64,
    )
    assert letta["promoted_to_core_count"] == 1 and letta["archival_paged_count"] == 1

    bert = compute_bert_bidirectional_salience_and_contrastive_align(
        [[1.0, 0.0], [0.0, 1.0]], [1.0, 0.0], temperature=0.1
    )
    assert bert["max_cosine_alignment"] == 1.0
    assert bert["salience_weights"][0] > bert["salience_weights"][1]

    off = [(10.0, 20.0, 3.0, 0.0), (15.0, 25.0, 1.0, 2.0), (22.0, 18.0, 0.0, -1.0)]
    dfn = [(12.0, 21.0, -2.0, 0.0), (20.0, 26.0, 0.5, -1.0), (24.0, 19.0, -1.0, 0.5)]
    sumer_a = compute_sumer_permutation_invariant_tracking_attention(off, dfn)
    sumer_b = compute_sumer_permutation_invariant_tracking_attention(
        [off[2], off[0], off[1]], [dfn[1], dfn[2], dfn[0]]
    )
    assert sumer_a == sumer_b and sumer_a["min_separation_yds"] > 0.0

    pitch = compute_metrica_skillcorner_pitch_control(
        (50.0, 34.0), [(48.0, 34.0, 5.0, 0.0)], [(60.0, 34.0, 0.0, 0.0)]
    )
    assert pitch["attacker_pitch_control"] > 0.75

    bio = evaluate_openbiomechanics_kinematic_and_injury_hazard(
        peak_pelvis_deg_s=550.0,
        peak_torso_deg_s=880.0,
        peak_shoulder_deg_s=1600.0,
        peak_hand_deg_s=2150.0,
        acute_load_7d=1.45,
        chronic_load_28d=1.0,
        tissue_type="soft_tissue",
        weeks_since_return=1,
        prior_recurrences=1,
    )
    assert bio["kinematic_sequence_valid"] is True
    assert bio["acwr_in_sweet_spot"] is False
    assert bio["reinjury_hazard_prob"] > 0.25

    nfl4 = evaluate_nfl4th_and_nflwin_decision_wp(
        yardline_100=12, ydstogo=8, score_diff=-2, seconds_remaining=10
    )
    assert nfl4["optimal_action"] in {"GO", "FG", "PUNT"} and nfl4["wp_edge"] >= 0.0

    ms = compute_multisport_pybaseball_hockeyr_and_vorp_metrics(
        bb=50,
        hbp=5,
        singles=90,
        doubles=30,
        triples=3,
        hr=28,
        ab=500,
        sf=4,
        fenwick_for=44,
        fenwick_against=36,
        xgf=3.1,
        xga=2.2,
        player_proj_pts=245.0,
        replacement_baseline_pts=180.0,
    )
    assert 0.300 <= ms["mlb_woba"] <= 0.450
    assert abs(ms["nhl_fenwick_pct"] - 0.55) < 1e-6 and ms["nfl_vorp"] == 65.0

    bridge21 = evaluate_wave21_tracking_biomech_and_rlvr_bridge(
        away_team="LAC",
        home_team="BAL",
        effective_wind_mph=16.0,
        away_clean_epa=0.07,
        home_clean_epa=0.11,
        is_short_week=True,
    )
    assert bridge21["wave21_wired"] is True
    assert bridge21["oss_registry_unique_entries"] == 169
    assert bridge21["polymarket_cleared"] is False
    assert -0.003 <= float(bridge21["wave21_weather_epa_adj"]) <= 0.003
