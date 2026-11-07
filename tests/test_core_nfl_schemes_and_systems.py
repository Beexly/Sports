"""Tests for intelligence.coaching.core_nfl_schemes_and_systems."""

from __future__ import annotations

from intelligence.coaching.core_nfl_schemes_and_systems import (
    CORE_OFFENSIVE_SCHEMES,
    DOWN_AND_DISTANCE_PRIORS,
    GRUDEN_AND_FOURTH_FILM_FORMATIONS,
    GSI_CTE_AND_HEAD_TRAUMA_PRIORS,
    ROUTE_CONCEPTS_MATRIX,
    evaluate_pass_protection_vs_blitz,
    evaluate_secondary_coverage_match,
    lookup_down_and_distance_prior,
)


def test_core_offensive_schemes_completeness():
    assert len(CORE_OFFENSIVE_SCHEMES) == 8
    assert "WEST_COAST" in CORE_OFFENSIVE_SCHEMES
    assert "AIR_CORYELL" in CORE_OFFENSIVE_SCHEMES
    assert "AIR_RAID" in CORE_OFFENSIVE_SCHEMES
    assert "ERHARDT_PERKINS" in CORE_OFFENSIVE_SCHEMES
    assert "SHANAHAN_MCVAY_OUTSIDE_ZONE" in CORE_OFFENSIVE_SCHEMES
    assert "POWER_GAP_SMASHMOUTH" in CORE_OFFENSIVE_SCHEMES
    assert "RPO_SPREAD_OPTION" in CORE_OFFENSIVE_SCHEMES
    assert "HEAVY_12_13_PERSONNEL_MODERN" in CORE_OFFENSIVE_SCHEMES
    assert "989 All Go" in CORE_OFFENSIVE_SCHEMES["AIR_CORYELL"].signature_concepts
    assert "Ghost" in CORE_OFFENSIVE_SCHEMES["ERHARDT_PERKINS"].signature_concepts


def test_route_concepts_matrix_completeness():
    assert len(ROUTE_CONCEPTS_MATRIX) == 11
    for code in ("MESH", "LEVELS", "FLOOD", "SMASH", "FOUR_VERTICALS", "STICK", "DAGGER", "Y_CROSS", "DOUBLE_CHINA", "GHOST", "MILLS"):
        assert code in ROUTE_CONCEPTS_MATRIX
        assert ROUTE_CONCEPTS_MATRIX[code].epa_delta_when_unmatched > 0
        assert ROUTE_CONCEPTS_MATRIX[code].epa_delta_when_matched < 0


def test_pass_protection_one_you_two_me_and_overload_counters():
    balanced = evaluate_pass_protection_vs_blitz("HALF_SLIDE_2_JET", 2, 2, "NONE")
    assert not balanced.unblocked_rusher_remaining
    assert balanced.pressure_disruption_prob_delta < 0

    unadj_weak = evaluate_pass_protection_vs_blitz("HALF_SLIDE_2_JET", 4, 2, "NONE")
    assert unadj_weak.unblocked_rusher_remaining
    assert unadj_weak.hot_throw_required
    assert unadj_weak.pressure_disruption_prob_delta > 0.15

    tom_weak = evaluate_pass_protection_vs_blitz("HALF_SLIDE_2_JET", 4, 2, "TOM")
    assert not tom_weak.unblocked_rusher_remaining
    assert tom_weak.pressure_disruption_prob_delta < unadj_weak.pressure_disruption_prob_delta

    joker_strong = evaluate_pass_protection_vs_blitz("HALF_SLIDE_2_JET", 2, 4, "JOKER_OPPOSITE")
    assert not joker_strong.unblocked_rusher_remaining
    assert joker_strong.qb_or_ol_adjustment == "JOKER_OPPOSITE"


def test_secondary_coverage_match_rules_box_triangle_and_plug():
    c1_rat = evaluate_secondary_coverage_match(
        coverage_shell="COVER_1_PLUG",
        offensive_formation="2X2",
        pre_snap_motion=True,
        rb_release_weak_away_from_plug=True,
    )
    assert "BANJO" in c1_rat.trips_or_motion_rule
    assert "RAT" in c1_rat.rb_release_rule

    c4_trips = evaluate_secondary_coverage_match(
        coverage_shell="COVER_4_QUARTERS",
        offensive_formation="3X1_TRIPS",
        rb_release_fast_to_flat=True,
        is_counter_or_gap_run=True,
    )
    assert "BOX" in c4_trips.trips_or_motion_rule
    assert "TRIANGLE" in c4_trips.trips_or_motion_rule
    assert "PUSH" in c4_trips.rb_release_rule
    assert c4_trips.counter_run_vulnerability_epa_delta > 0.05


def test_gruden_and_fourth_film_formations_and_down_distance_priors():
    assert len(GRUDEN_AND_FOURTH_FILM_FORMATIONS) == 20
    assert "12_SNUG" in GRUDEN_AND_FOURTH_FILM_FORMATIONS
    assert "11_TROUGH" in GRUDEN_AND_FOURTH_FILM_FORMATIONS
    assert "11_1X4_SPLIT" in GRUDEN_AND_FOURTH_FILM_FORMATIONS

    p1 = lookup_down_and_distance_prior(1, 10)
    assert p1.bucket_id == "1ST_AND_10"
    assert p1.series_conversion_prob == 0.750

    p3 = lookup_down_and_distance_prior(3, 1)
    assert p3.bucket_id == "3RD_AND_SHORT"
    assert p3.expected_run_rate == 0.700

    p4 = lookup_down_and_distance_prior(4, 1)
    assert p4.bucket_id == "4TH_AND_INCHES"
    assert p4.immediate_conversion_prob == 0.825


def test_gsi_cte_and_head_trauma_priors():
    assert GSI_CTE_AND_HEAD_TRAUMA_PRIORS["deceased_former_nfl_players_total"] == 878
    assert GSI_CTE_AND_HEAD_TRAUMA_PRIORS["brains_donated_for_autopsy"] == 235
    assert GSI_CTE_AND_HEAD_TRAUMA_PRIORS["cte_positive_donated_brains"] == 215
    assert GSI_CTE_AND_HEAD_TRAUMA_PRIORS["unconditioned_cohort_lower_bound_rate"] == 0.2449
    assert GSI_CTE_AND_HEAD_TRAUMA_PRIORS["dynamic_kickoff_concussion_reduction_pct"] == -43.0
