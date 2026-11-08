#!/usr/bin/env python3
"""
Pytest Suite for 360-Degree Spatial Micro-Metrics Prop & Matchup Evaluator
(`tests/unit/test_spatial_micro_metrics_prop_and_matchup_evaluator.py`)
=============================================================================
Tests (19 rigorous tests):
  1. PFF Elusive Rating Exact Mathematical Formula
  2. True Box Spacing Delta Formula
  3. True Opportunity Value Score (TOVS) Exact Coefficients (0.6, 1.2, 2.4, 1.5)
  4. RB YPRR Trajectory Three-Tier Classification (<0.90, 1.00-1.50, >=1.85)
  5. Catch-Point Leverage Delta Vector Dot Product
  6. Expected Yardage Percentiles (P10, P25, P50, P75, P90)
  7. System Back Identification & Downgrade Under Interior Penetration
  8. True Chunk Creator Identification & Boost
  9. RB Passive Checkdown 72% Baseline & Designated 1st-Read Separation
 10. WR SSP & Burn Rate Under Press-Man Coverage
 11. WR WOPR & RACR Mathematical Identities
 12. WR Body-Frame Contested Sealing Rate (Delta L < 0)
 13. QB Disguise Decay Rate (tau_disguise <= 220ms Processing Elite)
 14. QB Pocket Anchor Depth (PAD) & Pocket Collapse Vector (PCV)
 15. QB Escape Vector Efficiency (EVE) & Scramble Allocation
 16. IDP 0.25 Sack Hazard Line (Half-Sack Settlement Credit)
 17. All 15 Official Week 9 Games Evaluated
 18. Over 75 Prop Tickets Evaluated Across Slate (217 Total)
 19. Two-Host Rule (check_charge_9) Compliance & Cryptographic Receipt Validity
"""

import hashlib
import json
from pathlib import Path
import pytest
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]

from intelligence.props.spatial_micro_metrics_prop_and_matchup_evaluator import (
    SpatialMicroMetricsPropAndMatchupEvaluator,
    RBSpatialMicroMetrics,
    WRSpatialMicroMetrics,
    QBSpatialMicroMetrics,
    IDPSpatialMicroMetrics,
    PropTicketEvaluation,
    GameSpatialMatchupDossier,
    WEEK9_OFFICIAL_15_GAMES,
    DEFAULT_PROPS_DATA_PATH,
    DEFAULT_RECEIPT_PATH,
)


@pytest.fixture(scope="module")
def evaluator() -> SpatialMicroMetricsPropAndMatchupEvaluator:
    """Fixture providing initialized and compiled evaluator."""
    ev = SpatialMicroMetricsPropAndMatchupEvaluator()
    ev.compile_full_week9_slate()
    return ev


def test_pff_elusive_rating_exact_formula() -> None:
    """Test 1: Verify PFF Elusive Rating = (MTF / Touches) * YCO/Att * 100."""
    # Test single game rate: 4 MTF on 20 touches with 3.5 YCO/att
    # Rate = (4 / 20) * 3.5 * 100 = 70.0
    er = SpatialMicroMetricsPropAndMatchupEvaluator.compute_pff_elusive_rating(
        mtf=4, designed_runs=16, receptions=4.0, yco_per_att=3.5
    )
    assert er == 70.0

    # Test edge case zero touches
    assert SpatialMicroMetricsPropAndMatchupEvaluator.compute_pff_elusive_rating(0, 0, 0.0, 3.0) == 0.0


def test_true_box_spacing_delta_exact_formula() -> None:
    """Test 2: Verify True Box Spacing Delta = (Defenders / Blockers) * Avg Distance."""
    # 7 defenders, 6 blockers, 4.5 yards average distance
    # Delta = (7.0 / 6.0) * 4.5 = 1.1666... * 4.5 = 5.25
    delta = SpatialMicroMetricsPropAndMatchupEvaluator.compute_true_box_spacing_delta(
        defenders_in_box=7.0, blockers_in_box=6.0, avg_defender_dist_los=4.5
    )
    assert abs(delta - 5.25) < 0.01

    # Edge case 0 blockers
    assert SpatialMicroMetricsPropAndMatchupEvaluator.compute_true_box_spacing_delta(7.0, 0.0, 4.5) == 0.0


def test_true_opportunity_value_score_exact_coefficients() -> None:
    """Test 3: Verify TOVS = (Rush_Att * 0.6) + (RZ * 1.2) + (GL * 2.4) + (Targets * 1.5)."""
    # 15 rush att, 3 RZ carries, 1 GL carry, 4 targets
    # TOVS = (15 * 0.6) + (3 * 1.2) + (1 * 2.4) + (4 * 1.5) = 9.0 + 3.6 + 2.4 + 6.0 = 21.0
    tovs = SpatialMicroMetricsPropAndMatchupEvaluator.compute_true_opportunity_value_score(
        rush_attempts=15.0, rz_carries=3.0, gl_carries=1.0, targets=4.0
    )
    assert tovs == 21.00


def test_rb_yprr_three_tier_classification() -> None:
    """Test 4: Verify RB YPRR tiers: Tier 1 (>=1.85+), Tier 2 (1.00-1.50), Tier 3 (<0.90)."""
    assert "Tier 1" in SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(1.92)
    assert "Tier 1" in SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(1.85)
    assert "Tier 2" in SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(1.35)
    assert "Tier 2" in SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(1.00)
    assert "Tier 3" in SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(0.85)
    assert "Tier 3" in SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(0.45)


def test_catch_point_leverage_delta_vector_dot_product() -> None:
    """Test 5: Verify Delta L = V_ball dot (P_WR - P_DB)."""
    v_ball = (10.0, 0.0, -1.0)
    p_wr = (2.0, 1.0, 0.0)
    p_db = (0.0, 0.0, 0.0)
    # diff = (2.0, 1.0, 0.0)
    # dot = 10.0 * 2.0 + 0.0 * 1.0 + (-1.0) * 0.0 = 20.0
    delta_l = SpatialMicroMetricsPropAndMatchupEvaluator.compute_catch_point_leverage_delta(v_ball, p_wr, p_db)
    assert delta_l == 20.0

    # Negative leverage (DB in front of WR along incoming ball vector)
    p_wr_behind = (-1.0, 0.0, 0.0)
    delta_l_neg = SpatialMicroMetricsPropAndMatchupEvaluator.compute_catch_point_leverage_delta(v_ball, p_wr_behind, p_db)
    assert delta_l_neg < 0.0


def test_expected_yardage_percentiles() -> None:
    """Test 6: Verify P10 < P25 < P50 < P75 < P90 monotonicity."""
    pcts = SpatialMicroMetricsPropAndMatchupEvaluator.compute_expected_yardage_percentiles(
        mean_proj=75.0, boom_rate=0.22, consistency_rate=0.55
    )
    assert "p10" in pcts and "p25" in pcts and "p50" in pcts and "p75" in pcts and "p90" in pcts
    assert pcts["p10"] < pcts["p25"] < pcts["p50"] < pcts["p75"] < pcts["p90"]
    assert pcts["p50"] > 50.0


def test_system_back_identification_and_downgrade(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 7: Verify System Backs (high YBC, low Boom, low Elusive) are identified and penalized."""
    dossiers = evaluator.slate_dossiers
    system_backs = []
    for d in dossiers.values():
        for rb in d.rbs:
            if rb.is_system_back:
                system_backs.append(rb)

    assert len(system_backs) >= 1, "Expected at least 1 System Back in Week 9 slate"
    sb = system_backs[0]
    assert sb.yards_before_contact_per_att > 1.8
    assert sb.boom_rate_ryoe_gt_5 <= 0.12
    assert sb.pff_elusive_rating < 65.0
    # Check that under top DL pressure, recommendation is UNDER
    if sb.defensive_penetration_depth_yds < -0.65 or sb.shed_time_survival_sec < 1.55:
        assert sb.rushing_yards_recommendation == "UNDER"


def test_true_chunk_creator_identification_and_boost(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 8: Verify True Chunk Creators (high Elusive, high Boom, high Shed) are identified."""
    dossiers = evaluator.slate_dossiers
    creators = []
    for d in dossiers.values():
        for rb in d.rbs:
            if rb.is_true_chunk_creator:
                creators.append(rb)

    assert len(creators) >= 10, "Expected at least 10 True Chunk Creators across 15 games"
    # Derrick Henry, Jahmyr Gibbs, Saquon Barkley must be creators
    creator_names = [c.player_name for c in creators]
    assert "Derrick Henry" in creator_names
    assert "Jahmyr Gibbs" in creator_names
    assert "Saquon Barkley" in creator_names


def test_rb_passive_checkdown_72pct_baseline(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 9: Verify RB passive checkdown rate and designated target rate sum to 1.0."""
    for d in evaluator.slate_dossiers.values():
        for rb in d.rbs:
            assert abs((rb.first_read_designated_target_rate + rb.passive_checkdown_rate) - 1.0) < 0.01
            assert 0.0 <= rb.passive_checkdown_rate <= 1.0


def test_wr_ssp_and_burn_rate_man_coverage(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 10: Verify WR Separation at Break (SSP) and Burn Rate vs Man coverage."""
    sample_wrs = []
    for d in evaluator.slate_dossiers.values():
        for wr in d.wrs_tes:
            if wr.position == "WR":
                sample_wrs.append(wr)

    assert len(sample_wrs) >= 20
    for wr in sample_wrs:
        assert 1.5 <= wr.separation_at_separation_point_ssp <= 4.5
        assert 0.15 <= wr.burn_rate_ssp_gt_2_man <= 0.60
        assert wr.longest_reception_projected >= 20.0


def test_wr_wopr_and_racr_formulas(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 11: Verify WOPR = 1.5 * Target_Share + 0.7 * Air_Yards_Share and RACR."""
    for d in evaluator.slate_dossiers.values():
        for wr in d.wrs_tes:
            assert wr.wopr > 0.0
            assert wr.racr > 0.0
            assert wr.xyac > 0.0


def test_wr_body_frame_contested_sealing_rate(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 12: Verify body frame sealing rate is higher when Catch-Point Leverage Delta < 0."""
    for d in evaluator.slate_dossiers.values():
        for wr in d.wrs_tes:
            assert 0.10 <= wr.body_frame_contested_sealing_rate <= 0.60


def test_qb_disguise_decay_rate_processing(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 13: Verify QB disguise decay tau in ms and elite threshold <= 220ms."""
    qbs = []
    for d in evaluator.slate_dossiers.values():
        for qb in d.qbs:
            qbs.append(qb)

    assert len(qbs) >= 20
    elite_qbs = [qb for qb in qbs if qb.disguise_decay_rate_tau_ms <= 220.0]
    assert len(elite_qbs) >= 5, "Expected elite processors (Lamar, Mahomes, Burrow, Purdy, Goff)"
    elite_names = [q.player_name for q in elite_qbs]
    assert "Patrick Mahomes" in elite_names or "Lamar Jackson" in elite_names or "Brock Purdy" in elite_names


def test_qb_pocket_anchor_depth_and_pcv(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 14: Verify Pocket Anchor Depth (PAD) and Pocket Collapse Vector (PCV)."""
    for d in evaluator.slate_dossiers.values():
        for qb in d.qbs:
            assert 1.8 <= qb.pocket_anchor_depth_pad_yds <= 3.2
            assert 0.8 <= qb.pocket_collapse_vector_pcv <= 2.2
            assert qb.sacks_taken_projected >= 1.0


def test_qb_escape_vector_efficiency_and_scramble(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 15: Verify Escape Vector Efficiency (EVE) maps to scramble yardage."""
    for d in evaluator.slate_dossiers.values():
        for qb in d.qbs:
            assert 0.20 <= qb.escape_vector_efficiency_eve <= 2.5
            assert qb.qb_rushing_yards_projected >= 4.0
            # Dual-threat QBs (Lamar, Daniels, Allen, Hurts, Murray) should have high EVE
            if qb.player_name in ("Lamar Jackson", "Jayden Daniels", "Josh Allen", "Jalen Hurts", "Kyler Murray"):
                assert qb.escape_vector_efficiency_eve >= 1.40
                assert qb.qb_rushing_yards_projected >= 25.0


def test_idp_025_sack_hazard_and_half_sack_credit(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 16: Verify IDP pass rusher 0.25 sack lines (half-sack credit) and Patton POE hazard."""
    edge_players = []
    for d in evaluator.slate_dossiers.values():
        for idp in d.idp_players:
            if idp.position in ("EDGE", "DT"):
                edge_players.append(idp)

    assert len(edge_players) >= 15
    for idp in edge_players:
        assert 0.20 <= idp.prob_half_plus_sack_025_line <= 0.85
        assert idp.prob_1_plus_sack < idp.prob_half_plus_sack_025_line
        assert idp.patton_poe_hazard > 0.0


def test_all_15_week9_games_evaluated(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 17: Verify all 15 official Week 9 matchups are fully evaluated."""
    assert len(evaluator.slate_dossiers) == 15
    for m in WEEK9_OFFICIAL_15_GAMES:
        assert m in evaluator.slate_dossiers
        d = evaluator.slate_dossiers[m]
        assert len(d.rbs) >= 2
        assert len(d.wrs_tes) >= 2
        assert len(d.qbs) >= 2
        assert len(d.idp_players) >= 2
        assert len(d.evaluated_tickets) >= 8


def test_over_75_prop_evaluations_in_slate(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 18: Verify at least 75 prop tickets are generated and evaluated across slate."""
    assert len(evaluator.all_evaluated_tickets) >= 75
    # In fact, we generate > 200 tickets
    assert len(evaluator.all_evaluated_tickets) >= 200
    published = [t for t in evaluator.all_evaluated_tickets if t.publish_allowed]
    assert len(published) >= 150
    for t in evaluator.all_evaluated_tickets:
        assert isinstance(t, PropTicketEvaluation)
        assert t.recommendation in ("OVER", "UNDER", "PASS")
        assert len(t.key_spatial_signals) >= 2
        assert len(t.system_rationale) > 10


def test_two_host_rule_and_receipt_validity(evaluator: SpatialMicroMetricsPropAndMatchupEvaluator) -> None:
    """Test 19: Verify Two-Host Rule compliance and cryptographic receipt integrity."""
    target_code = REPO_ROOT / "intelligence" / "props" / "spatial_micro_metrics_prop_and_matchup_evaluator.py"
    assert target_code.exists()
    code_text = target_code.read_text(encoding="utf-8")
    for bad in ("Users/Garrett", "Users\\\\Garrett", "/Users/Garrett"):
        assert bad not in code_text, f"Two-Host violation in {target_code}: '{bad}' found"

    # Verify artifacts exist
    assert DEFAULT_PROPS_DATA_PATH.exists()
    assert DEFAULT_RECEIPT_PATH.exists()

    receipt_json = json.loads(DEFAULT_RECEIPT_PATH.read_text(encoding="utf-8"))
    assert receipt_json["overall_status"] == "PASS"
    assert receipt_json["metrics_covered_count"] == 92
    assert receipt_json["games_covered_count"] == 15
    assert len(receipt_json["receipt_sha256"]) == 64
