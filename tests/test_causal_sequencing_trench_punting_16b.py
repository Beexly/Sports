"""
Tests for Stream 16B: Causal Sequencing, Opponent-Adjusted Trench Bradley-Terry & Punting Engine.
"""

from __future__ import annotations

from intelligence.coaching.causal_sequencing_trench_punting_engine import (
    audit_pfr_2026_punting_alignment,
    compute_causal_16b_seq_trench_punt_profiles,
    evaluate_causal_16b_seq_trench_punt_matchup,
    evaluate_causal_16b_walkforward_oos,
)


def test_stream_16b_causality_and_profiles() -> None:
    p_w4 = compute_causal_16b_seq_trench_punt_profiles(as_of_week=4)
    p_w10 = compute_causal_16b_seq_trench_punt_profiles(as_of_week=10)
    assert p_w4["as_of_week"] == 4
    assert p_w10["as_of_week"] == 10
    assert p_w4["teams_count"] == 32
    assert p_w10["teams_count"] == 32
    assert p_w4["teams"]["KC"] != p_w10["teams"]["KC"]
    assert 0.15 <= float(p_w10["w_hit_weight"]) <= 0.75


def test_stream_16b_swap_symmetry_antisymmetry_and_null_holds() -> None:
    fwd = evaluate_causal_16b_seq_trench_punt_matchup("IND", "HOU")
    rev = evaluate_causal_16b_seq_trench_punt_matchup("HOU", "IND")

    assert fwd["stream_16b_away_null_hold_edge"] == 0.0
    assert fwd["stream_16b_home_null_hold_edge"] == 0.0
    assert rev["stream_16b_away_null_hold_edge"] == 0.0
    assert rev["stream_16b_home_null_hold_edge"] == 0.0

    for aw_k, hm_k in (
        ("stream_16b_away_sequencing_edge", "stream_16b_home_sequencing_edge"),
        ("stream_16b_away_trench_bt_edge", "stream_16b_home_trench_bt_edge"),
        ("stream_16b_away_punt_fp_edge", "stream_16b_home_punt_fp_edge"),
    ):
        assert abs(float(fwd[aw_k]) - float(rev[hm_k])) < 1e-6
        assert abs(float(fwd[hm_k]) - float(rev[aw_k])) < 1e-6

    assert abs(float(fwd["stream_16b_net_seq_trench_punt_diff"]) + float(rev["stream_16b_net_seq_trench_punt_diff"])) < 1e-6


def test_stream_16b_walkforward_oos_gate_and_honest_nulls() -> None:
    oos = evaluate_causal_16b_walkforward_oos(eval_weeks=range(4, 11))
    assert oos["n_team_games"] >= 180
    assert oos["all_promoted_components_beat_baseline"] is True

    comps = oos["components"]
    promoted_expected = (
        "off_2nd10_pass_after_inc",
        "off_behind_los_share",
        "def_behind_los_allowed",
        "off_clean_pocket_epa",
        "def_clean_pocket_epa",
        "trench_bt_disruption",
        "def_punt_ret_epa",
    )
    for name in promoted_expected:
        assert comps[name]["beats_baseline"] is True
        assert comps[name]["production_weight"] == 1.0

    for null_name in ("off_punt_epa", "off_2nd10_pass_after_run", "off_punt_net_yds", "off_punt_in20_rate"):
        assert comps[null_name]["production_weight"] == 0.0


def test_stream_16b_pfr_2026_punting_alignment_audit() -> None:
    audit = audit_pfr_2026_punting_alignment()
    assert audit["pfr_teams_count"] == 32
    assert audit["used_in_walkforward_oos"] is False
    assert float(audit["pbp_vs_pfr_net_corr"]) > 0.50
