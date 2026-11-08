#!/usr/bin/env python3
"""
Unit tests for Workstream 1:
1. All 279 canonical equation families (0..278) accounted for and bound to the 5 standing
   domain tracks in ReasoningTrace (`family_consumption_census.accounted_families == 279`).
2. Per-family perturbation proof: overriding a single canonical family weight changes that
   family's FamilyConsumptionReceipt.post_gate_shrunk_delta.
3. Deterministic L4 adversary sign-flip & L5 checklist verification in build_track_l1_to_l5_hierarchy.
4. Reconciled situational rule counts: 80 Situational Catalog Rules + 7 Emission-Firewall Rules = 87 total
   (and 80 + 5 = 85 situational + misleading-stat rules).
"""
from __future__ import annotations

from intelligence.coaching.full_repo_279_family_situational_reasoning_matrix import (
    X_EMISSION_FIREWALL_7_RULES,
    X_RECONCILED_87_RULES_CATALOG,
    X_SITUATIONAL_80_CATALOG_RULES,
    evaluate_all_80_x_situational_rules,
)
from intelligence.equations.equation_executor import execute_all_279_equation_families
from intelligence.reasoning.layers.layer_registry import build_context_packet
from intelligence.reasoning.reasoning_workflow_assembler import (
    build_track_l1_to_l5_hierarchy,
    execute_reasoning_workflow,
)


def test_reasoning_trace_binds_all_279_families_across_5_standing_tracks() -> None:
    pkt = build_context_packet(
        {
            "game_id": "2024_10_CIN_BAL",
            "home_team": "BAL",
            "away_team": "CIN",
            "kickoff_utc": "2024-11-08T01:15:00Z",
            "as_of": "2024-11-07T18:00:00Z",
        },
        write_to_disk=True,
    )
    trace = execute_reasoning_workflow(pkt, write_to_disk=True)
    census = trace["family_consumption_census"]
    assert census["total_families"] == 279
    assert census["accounted_families"] == 279
    assert census["active_bound_families"] + census["dormant_logged_families"] == 279
    assert census["equations_evaluated_total"] == 21419
    assert census["equations_held_below_min_sample"] == 1400

    by_track = census["by_canonical_domain_track"]
    assert set(by_track.keys()) == {
        "1_qb_behavior",
        "2_coaching_and_scheme",
        "3_offensive_line",
        "4_trust_signals",
        "5_scheme_matchup",
    }
    assert sum(by_track.values()) == 279

    total_track_receipts = sum(
        len(t_obj["family_consumption_receipts"])
        for t_obj in trace["tracks"].values()
    )
    assert total_track_receipts == 279


def test_single_family_weight_perturbation_changes_receipt() -> None:
    vec = {"epa_per_play": 0.15, "proe": 0.04, "pressure_rate": 0.30}
    base_res = execute_all_279_equation_families(vec)
    fam0_base = base_res["family_receipts"][0]
    fam_code = fam0_base["family_code"]

    pert_res = execute_all_279_equation_families(vec, family_weight_overrides={fam_code: 2.5})
    fam0_pert = pert_res["family_receipts"][0]
    assert fam0_pert["post_gate_shrunk_delta"] != fam0_base["post_gate_shrunk_delta"]


def test_l4_adversary_challenge_and_l5_sign_flip_determinism() -> None:
    no_flip = build_track_l1_to_l5_hierarchy(
        track_key="qb_behavior",
        base_l3_delta=0.12,
        family_receipts=[],
        adversary_counter_delta=-0.03,
    )
    assert no_flip["L5_final_track_synthesis"]["sign_flipped_by_adversary"] is False
    assert no_flip["L5_final_track_synthesis"]["final_delta"] == 0.09
    assert no_flip["L5_final_track_synthesis"]["checklist_complete"] is True

    flipped = build_track_l1_to_l5_hierarchy(
        track_key="qb_behavior",
        base_l3_delta=0.12,
        family_receipts=[],
        adversary_counter_delta=-0.20,
    )
    assert flipped["L5_final_track_synthesis"]["sign_flipped_by_adversary"] is True
    assert flipped["L5_final_track_synthesis"]["final_delta"] == -0.08
    assert flipped["L5_final_track_synthesis"]["checklist_complete"] is True


def test_situational_rules_80_85_87_reconciliation() -> None:
    assert len(X_SITUATIONAL_80_CATALOG_RULES) == 80
    assert len(X_EMISSION_FIREWALL_7_RULES) == 7
    assert len(X_RECONCILED_87_RULES_CATALOG) == 87

    eval_out = evaluate_all_80_x_situational_rules({"home_qb_tier": "QB1", "wind_mph": 9.0})
    assert eval_out["evaluated_count"] == 80
    assert eval_out["firewall_rules_evaluated_count"] == 7
    assert eval_out["total_rules_evaluated"] == 87
    assert eval_out["situational_catalog_80_rules_count"] == 80
    assert eval_out["emission_firewall_7_rules_count"] == 7
    assert eval_out["situational_plus_misleading_85_rules_count"] == 85
    assert eval_out["total_reconciled_rules_count"] == 87
    assert eval_out["misleading_stat_firewall_rules_count"] == 15
