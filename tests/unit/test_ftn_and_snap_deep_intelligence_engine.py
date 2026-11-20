"""
Unit, cleared-nflverse integration, snap-weighted injury, and swap-symmetry
tests for `ftn_and_snap_deep_intelligence_engine.py` (Stream 15N).
"""

from __future__ import annotations

from intelligence.coaching import ftn_and_snap_deep_intelligence_engine as ftn_snap
from intelligence.coaching.footballxos_16_category_playbook_engine import (
    evaluate_footballxos_matchup_intelligence,
)
from intelligence.coaching.whitefield_and_nflverse_metrics_engine import (
    evaluate_whitefield_and_nflverse_matchup_profile,
)


def test_ftn_pbp_32team_charting_and_snap_profiles_complete() -> None:
    ftn = ftn_snap.load_ftn_pbp_32team_charting_profiles()
    assert ftn["available"] is True
    assert ftn["joined_rows"] >= 25000
    assert ftn["max_week"] >= 10
    assert len(ftn["teams"]) == 32
    assert "LA" in ftn["teams"]
    assert "WAS" in ftn["teams"]
    assert "JAX" in ftn["teams"]

    snap = ftn_snap.load_snap_and_player_week_32team_profiles()
    assert snap["available"] is True
    assert snap["snap_rows"] >= 14000
    assert len(snap["team_skill"]) == 32


def test_team_normalization_handles_espn_aliases() -> None:
    assert ftn_snap.normalize_nfl_team("lar") == "LA"
    assert ftn_snap.normalize_nfl_team("wsh") == "WAS"
    assert ftn_snap.normalize_nfl_team("jac") == "JAX"
    m_espn = evaluate_whitefield_and_nflverse_matchup_profile("LAR", "WSH")
    m_nflv = evaluate_whitefield_and_nflverse_matchup_profile("LA", "WAS")
    assert m_espn["away_team"] == "LA"
    assert m_espn["home_team"] == "WAS"
    assert m_espn["stream_15m_away_trench_pressure_delta"] == m_nflv["stream_15m_away_trench_pressure_delta"]
    assert m_espn["stream_15m_home_bellcow_ass_breakout"] == m_nflv["stream_15m_home_bellcow_ass_breakout"]


def test_snap_weighted_injuries_recency_and_asymmetric_questionable_sigma() -> None:
    m_ind_hou = ftn_snap.evaluate_ftn_and_snap_deep_matchup("IND", "HOU")
    ind_inj = m_ind_hou["away_snap_injuries"]
    hou_inj = m_ind_hou["home_snap_injuries"]

    # Charvarius Ward (CB Out, ~87%) + Sauce Gardner (CB Q, ~87%) -> real CB stacking cliff
    assert ind_inj["active_cb_cliff"] is True
    assert ind_inj["cb_out"] > 1.10
    # Jalen Travis (OT Out, ~93%) + Charlie Heck (OT Q, 0 snaps) -> NO false 2-starter OT cliff
    assert ind_inj["active_ol_cliff"] is False
    assert 0.85 <= ind_inj["ol_out"] <= 1.00
    # Jaylin Smith (HOU CB IR, last_week_played=4) -> already priced in, NOT doubled into cb_out
    assert hou_inj["ir_already_priced_in"] >= 1
    assert hou_inj["cb_out"] == 0.0
    # Danielle Hunter (HOU DE1 Out, ~76%) captured via real snap share
    assert 0.70 <= hou_inj["edge_out"] <= 0.82

    # Asymmetric Questionable sigma: IND has Sauce Gardner CB1 Q (0.872), whereas IND offense
    # vs HOU defense has only low/0-snap Qs -> home_questionable_sigma > away_questionable_sigma
    wf = evaluate_whitefield_and_nflverse_matchup_profile("IND", "HOU")
    assert wf["stream_15m_away_questionable_sigma"] > 0.0
    assert wf["stream_15m_home_questionable_sigma"] > wf["stream_15m_away_questionable_sigma"]

    # Recency IR test: fresh Week 9 starter moved to IR MUST count (surprise=1.0),
    # whereas Week 4 IR must NOT count (surprise=0.0).
    fresh_ir = ftn_snap.evaluate_snap_weighted_injury_impact(
        "HOU",
        [{"player": "Danielle Hunter", "position": "DE", "status": "Injured Reserve"}],
    )
    stale_ir = ftn_snap.evaluate_snap_weighted_injury_impact(
        "HOU",
        [{"player": "Jaylin Smith", "position": "CB", "status": "Injured Reserve"}],
    )
    assert fresh_ir["edge_out"] > 0.70
    assert stale_ir["ir_already_priced_in"] == 1
    assert stale_ir["cb_out"] == 0.0


def test_streams_15l_15m_15n_exact_swap_symmetry_on_ind_hou() -> None:
    xos_a = evaluate_footballxos_matchup_intelligence("IND", "HOU", {"is_indoor": True, "wind_mph": 0.0})
    xos_b = evaluate_footballxos_matchup_intelligence("HOU", "IND", {"is_indoor": True, "wind_mph": 0.0})
    assert abs(xos_a["stream_15l_away_scheme_epa_delta"] - xos_b["stream_15l_home_scheme_epa_delta"]) < 1e-6
    assert abs(xos_a["stream_15l_home_scheme_epa_delta"] - xos_b["stream_15l_away_scheme_epa_delta"]) < 1e-6
    assert xos_a["stream_15l_away_kickoff_start_yl100"] == xos_b["stream_15l_home_kickoff_start_yl100"]

    deep_a = ftn_snap.evaluate_ftn_and_snap_deep_matchup("IND", "HOU")
    deep_b = ftn_snap.evaluate_ftn_and_snap_deep_matchup("HOU", "IND")
    assert abs(deep_a["stream_15n_away_ftn_twp_regression_epa"] - deep_b["stream_15n_home_ftn_twp_regression_epa"]) < 1e-6
    assert abs(deep_a["stream_15n_away_rb_wr_creation_epa"] - deep_b["stream_15n_home_rb_wr_creation_epa"]) < 1e-6
    assert abs(deep_a["stream_15n_kickoff_yl_differential"] + deep_b["stream_15n_kickoff_yl_differential"]) < 1e-6
    for ka, kh in (
        ("stream_15n_away_fg_short_mid_delta", "stream_15n_home_fg_short_mid_delta"),
        ("stream_15n_away_fg_50plus_delta", "stream_15n_home_fg_50plus_delta"),
        ("stream_15n_away_punt_net_mu", "stream_15n_home_punt_net_mu"),
        ("stream_15n_away_third_down_epa_resid", "stream_15n_home_third_down_epa_resid"),
        ("stream_15n_away_redzone_epa_resid", "stream_15n_home_redzone_epa_resid"),
        ("stream_15n_away_vs_opp_yac_tfl_epa", "stream_15n_home_vs_opp_yac_tfl_epa"),
    ):
        assert abs(deep_a[ka] - deep_b[kh]) < 1e-6
        assert abs(deep_a[kh] - deep_b[ka]) < 1e-6

    # Clean-room ST, OLS defense, and YAC resistance signals grounded in real nflverse data
    assert deep_a["stream_15n_away_punt_net_mu"] > deep_a["stream_15n_home_punt_net_mu"]
    assert deep_a["away_ftn_profile"]["def_xyac_over_expected"] > deep_a["home_ftn_profile"]["def_xyac_over_expected"]
    assert deep_a["stream_15n_home_vs_opp_yac_tfl_epa"] > deep_a["stream_15n_away_vs_opp_yac_tfl_epa"]
