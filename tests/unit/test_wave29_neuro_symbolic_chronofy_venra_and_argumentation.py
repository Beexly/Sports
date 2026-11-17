"""Unit tests for Wave 29 39-paper Neuro-Symbolic Chronofy, VeNRA, NARS & RUO suite."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from gse_engine.governance.simulation_hold_gate import (
    OperatorSimulationHoldError,
    assert_operator_simulation_week_approved,
)
from gse_engine.memory import (
    WAVE29_ARXIV_ENTRIES,
    aggregate_potre_heterogeneous_ensemble_and_compile_solver,
    assert_prediction_market_compliance_hold,
    compile_gse_to_gsi_rlvr_training_batch,
    compute_chronofy_temporal_logical_decay,
    detect_nesy_rag_symbolic_knowledge_gaps,
    enforce_protomed_k_anonymity_l_diversity_and_sat_conflict_gate,
    evaluate_wave29_neuro_symbolic_corpus_bridge,
    propagate_bipolar_gradual_argumentation,
    route_symrag_adaptive_query_pathway,
    verify_leancat_functor_compositionality,
    verify_venra_double_lock_fact_ledger,
)

REPO_ROOT = Path(__file__).resolve().parents[2]

EXPECTED_39_ARXIV_IDS: tuple[str, ...] = (
    "2607.20268",
    "2605.05485",
    "2603.13372",
    "2602.09774",
    "1611.01855",
    "2610.15091",
    "2609.00604",
    "2608.26836",
    "2608.07955",
    "2608.06292",
    "2607.20560",
    "2606.15656",
    "2605.29168",
    "2605.14113",
    "2605.11516",
    "2604.17340",
    "2604.10114",
    "2603.17208",
    "2603.06290",
    "2603.04663",
    "2603.04560",
    "2602.18916",
    "2602.17999",
    "2602.17826",
    "2512.24796",
    "2512.18177",
    "2508.19271",
    "2508.18880",
    "2506.12981",
    "2505.02763",
    "2504.06943",
    "2504.04578",
    "2503.11989",
    "2503.07306",
    "2502.11269",
    "2502.03671",
    "2502.01630",
    "2406.17987",
    "2402.01748",
)


def test_chronofy_decay_and_venra_double_lock_grounding() -> None:
    """Chronofy weakest-link STL triggers reacquisition; VeNRA catches hallucination."""
    fresh = compute_chronofy_temporal_logical_decay(
        [
            {
                "fact_id": "qb_inj",
                "reliability": 0.96,
                "kappa": 0.05,
                "age_hours": 1.0,
                "max_valid_age_hours": 8.0,
            },
            {
                "fact_id": "wind",
                "reliability": 0.92,
                "kappa": 0.04,
                "age_hours": 0.5,
                "max_valid_age_hours": 6.0,
            },
        ]
    )
    assert fresh["reacquisition_triggered"] is False
    assert fresh["stl_min_robustness"] == 5.5
    assert 0.5 < fresh["weakest_link_validity"] < 0.95

    stale = compute_chronofy_temporal_logical_decay(
        [
            {
                "fact_id": "qb_inj",
                "reliability": 0.95,
                "kappa": 0.05,
                "age_hours": 14.0,
                "max_valid_age_hours": 12.0,
            },
        ]
    )
    assert stale["reacquisition_triggered"] is True
    assert stale["stl_min_robustness"] == -2.0
    assert stale["reacquire_ids"] == ["qb_inj"]

    ledger = {("DET", "epa", "W10"): 0.16, ("NE", "epa", "W10"): -0.02}
    ok = verify_venra_double_lock_fact_ledger(
        ledger,
        [("DET", "epa", "W10"), ("NE", "epa", "W10")],
        "diff",
        0.18,
        schema_bounds=(-0.5, 0.5),
    )
    assert ok["double_lock_passed"] is True
    assert ok["hallucination_detected"] is False

    bad_math = verify_venra_double_lock_fact_ledger(
        ledger,
        [("DET", "epa", "W10"), ("NE", "epa", "W10")],
        "diff",
        0.29,
    )
    assert bad_math["double_lock_passed"] is False
    assert bad_math["hallucination_detected"] is True

    unbound = verify_venra_double_lock_fact_ledger(
        ledger,
        [("DET", "epa", "W10"), ("MISSING", "epa", "W10")],
        "sum",
        0.16,
    )
    assert unbound["double_lock_passed"] is False
    assert unbound["unbound_keys"] == [("MISSING", "epa", "W10")]


def test_bipolar_argumentation_nesy_gaps_symrag_and_potre() -> None:
    """Test NARS/ACAL clashes, NeSy-RAG pivotal unknowns, SymRAG routing, and PoTRE."""
    arg_clash = propagate_bipolar_gradual_argumentation(
        {"supp": 0.80, "att": 0.80, "claim": 0.50},
        [("supp", "claim", 0.50)],
        [("att", "claim", 0.50)],
        target_node="claim",
    )
    assert arg_clash["converged"] is True
    assert arg_clash["clash_detected"] is True
    assert arg_clash["escalate_hitl"] is True
    assert abs(arg_clash["target_score"] - 0.5) < 1e-4

    gap_open = detect_nesy_rag_symbolic_knowledge_gaps(
        [{"requires": {"ol_healthy": True, "qb_active": True}, "conclusion": True}],
        {"ol_healthy": True},
        ["qb_active", "irrelevant_flag"],
    )
    assert gap_open["determined_without_gaps"] is False
    assert gap_open["pivotal_unknowns"] == ["qb_active"]
    assert gap_open["non_pivotal_unknowns"] == ["irrelevant_flag"]

    sym = route_symrag_adaptive_query_pathway(
        hop_count=3,
        has_symbolic_aggregation=True,
        constraint_count=3,
        system_load=0.4,
        wfa_raw_transitions=[[4.0, 1.0], [0.0, 0.0]],
    )
    assert sym["selected_pathway"] == "HYBRID"
    assert sym["row_stochastic_verified"] is True

    potre = aggregate_potre_heterogeneous_ensemble_and_compile_solver(
        [
            {
                "agent_id": "a1",
                "topology": "adversarial",
                "prob": 0.65,
                "symbolically_verified": True,
            },
            {
                "agent_id": "a2",
                "topology": "spectrum",
                "prob": 0.72,
                "symbolically_verified": True,
            },
            {
                "agent_id": "a3",
                "topology": "direct",
                "prob": 0.05,
                "symbolically_verified": False,
            },
        ],
        [
            {"rule_id": "compiled_dsl_1", "pass_rate": 0.90},
            {"rule_id": "pruned_dsl_2", "pass_rate": 0.60},
        ],
        min_pass_rate=0.85,
    )
    assert potre["accepted_count"] == 2
    assert potre["rejected_agent_ids"] == ["a3"]
    assert potre["verified_consensus_prob"] > 0.60
    assert potre["compiled_rule_count"] == 1
    assert potre["pruned_rule_count"] == 1
    assert potre["zero_runtime_llm_tokens"] is True


def test_leancat_functor_protomed_privacy_sat_and_holds() -> None:
    """Verify LeanCat functor laws, ProtoMed k/l + SAT conflict + RUO=0.0, and hard holds."""
    valid_fc = verify_leancat_functor_compositionality(
        objects=["A", "B"],
        morphisms={"id_A": ("A", "A"), "id_B": ("B", "B"), "f": ("A", "B")},
        composition_table={("f", "id_A"): "f", ("id_B", "f"): "f"},
        functor_obj_map={"A": "X", "B": "Y"},
        functor_morph_map={"id_A": "id_X", "id_B": "id_Y", "f": "g"},
        target_identities={"X": "id_X", "Y": "id_Y"},
        target_composition_table={("g", "id_X"): "g", ("id_Y", "g"): "g"},
    )
    assert valid_fc["functor_valid"] is True

    broken_fc = verify_leancat_functor_compositionality(
        objects=["A", "B"],
        morphisms={"id_A": ("A", "A"), "id_B": ("B", "B"), "f": ("A", "B")},
        composition_table={("f", "id_A"): "f"},
        functor_obj_map={"A": "X", "B": "Y"},
        functor_morph_map={"id_A": "bad_id", "id_B": "id_Y", "f": "g"},
        target_identities={"X": "id_X", "Y": "id_Y"},
        target_composition_table={("g", "id_X"): "g"},
    )
    assert broken_fc["functor_valid"] is False
    assert broken_fc["identity_violations"]
    assert broken_fc["composition_violations"]

    pm = enforce_protomed_k_anonymity_l_diversity_and_sat_conflict_gate(
        [{"class_id": "c1", "records_count": 2, "sensitive_values": ["dx1"]}],
        [
            {
                "rule_id": "r_t2d",
                "conditions": ["diabetes"],
                "target_action": "sglt2",
                "polarity": 1,
            },
            {
                "rule_id": "r_ckd",
                "conditions": ["ckd_stage4"],
                "target_action": "sglt2",
                "polarity": -1,
            },
        ],
        k_min=3,
        l_min=2,
    )
    assert pm["k_anonymity_satisfied"] is False
    assert pm["l_diversity_satisfied"] is False
    assert pm["sat_conflict_count"] == 1
    assert pm["clinical_ruo_sports_weight"] == 0.0
    assert pm["sports_promotion_allowed"] is False

    with pytest.raises(OperatorSimulationHoldError, match="OPERATOR_SIM_HOLD"):
        assert_operator_simulation_week_approved(11, caller="test_wave29", env_override="")
    with pytest.raises(PermissionError, match="POLYMARKET_COMPLIANCE_HOLD"):
        assert_prediction_market_compliance_hold(live_execution_requested=True)
    hold_ok = assert_prediction_market_compliance_hold(live_execution_requested=False)
    assert hold_ok["cleared"] is False


def test_wave29_39arxiv_registry_265_dossier_and_rlvr_196() -> None:
    """Verify all 39 submitted arXiv IDs in code, dossier, registry 265, and RLVR >= 196."""
    bridge = evaluate_wave29_neuro_symbolic_corpus_bridge(
        away_clean_epa=0.04,
        home_clean_epa=0.12,
        effective_wind_mph=14.5,
        is_short_week=True,
    )
    assert bridge["wave29_wired"] is True
    assert bridge["arxiv_entries_count"] == 39
    assert bridge["all_scalars_finite"] is True
    assert bridge["live_stage2_weight"] == 0.0
    assert bridge["clinical_ruo_sports_weight"] == 0.0

    entry_ids = [e["url"].rsplit("/", 1)[-1] for e in WAVE29_ARXIV_ENTRIES]
    assert entry_ids == list(EXPECTED_39_ARXIV_IDS)

    reg = json.loads(
        (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-15"
            / "oss-corpus-registry.json"
        ).read_text(encoding="utf-8")
    )
    assert reg["total_entries"] >= 265
    assert reg["total_unique_entries"] == reg["total_entries"]
    assert reg["total_submitted_urls"] >= 289
    reg_urls = {str(e["url"]) for e in reg["entries"]}
    for aid in EXPECTED_39_ARXIV_IDS:
        assert f"https://arxiv.org/abs/{aid}" in reg_urls

    dossier_path = (
        REPO_ROOT
        / "docs"
        / "arxiv-program"
        / "research"
        / "2026-11-17"
        / "wave29-39-arxiv-neuro-symbolic-rag-argumentation-and-ledgers.md"
    )
    dossier = dossier_path.read_text(encoding="utf-8")
    assert max(ord(ch) for ch in dossier) <= 127
    assert re.search(r"\bblock(?:ed|er|ers|ing|s)?\b", dossier, re.IGNORECASE) is None
    for aid in EXPECTED_39_ARXIV_IDS:
        assert aid in dossier

    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT)
    assert rlvr["records_compiled"] >= 196
    assert rlvr["zero_odds_contamination"] is True
    assert rlvr["monotone_curriculum_verified"] is True
