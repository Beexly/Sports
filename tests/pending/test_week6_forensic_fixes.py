#!/usr/bin/env python3
"""
tests/test_week6_forensic_fixes.py
Unit and acceptance tests replaying the five largest NFL Week 6 (October 18, 2026)
failures against the upgraded GSE engine modules, plus the 50-feature player x
situational state interaction vector and standardized Ridge model.
"""

from __future__ import annotations
import sys
from pathlib import Path
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.sync_week6_db import (
    SOVEREIGN_SIGNAL_LEAGUE_BASELINES,
    evaluate_total_steam_exhaustion_gate,
    compute_pick_probability_from_db_signals,
)
from intelligence.props.target_conservation import (
    shrink_rate,
    enforce_conservation,
    enforce_target_conservation,
    check_te_committee_gate,
    reproject_team_receiving_stack,
    project_qb_pass_yards_with_conservation,
)
from intelligence.props.projection_bus import (
    apply_vacated_target,
    gate_wr_under,
    get_canonical_week6_prop_projections,
)
from intelligence.props.regime_mixture import (
    project_rb_rush,
    project_rb_rush_yards,
    apply_pocket_penalty,
    apply_pocket_catch_penalty,
    evaluate_rb_prop_with_regime_mixture,
    evaluate_wr_prop_with_pocket_penalty,
)
from intelligence.optimizer.dfs_optimizer_suite import (
    overlap,
    compute_correlation_penalty,
    score_lineup_with_correlation,
)
from intelligence.props.player_feature_vector import build_player_feature_vector
from intelligence.models.player_linear_model import (
    FEATURE_NAMES,
    build_design_matrix,
    train_player_model,
    predict_player,
)


def _sample_week6_team_signals() -> dict[str, dict[str, float]]:
    return {
        "ARI": {
            "vision.soe_yd": 0.142,
            "vision.art_mean": 0.785,
            "vision.pocket_depth_yd": 0.422,
            "ftn.play_action_rate": 0.235,
            "ftn.motion_rate": 0.510,
            "ftn.screen_rate": 0.088,
            "ftn.rpo_rate": 0.095,
            "ftn.def_blitz_rate": 0.275,
            "qbr.total_qbr": 0.542,
            "snaps.starter_snap_share": 0.918,
            "cognitive.presser_sentiment": 0.55,
            "cognitive.coach_speak_delta": 0.52,
            "cognitive.scheme_shift": 0.50,
            "cognitive.tendency_break": 0.48,
        },
        "LAR": {
            "vision.soe_yd": 0.183,
            "vision.art_mean": 0.768,
            "vision.pocket_depth_yd": 0.448,
            "ftn.play_action_rate": 0.285,
            "ftn.motion_rate": 0.625,
            "ftn.screen_rate": 0.092,
            "ftn.rpo_rate": 0.075,
            "ftn.def_blitz_rate": 0.245,
            "qbr.total_qbr": 0.618,
            "snaps.starter_snap_share": 0.942,
            "cognitive.presser_sentiment": 0.60,
            "cognitive.coach_speak_delta": 0.58,
            "cognitive.scheme_shift": 0.54,
            "cognitive.tendency_break": 0.52,
        },
        "DAL": {
            "vision.soe_yd": 0.215,
            "vision.art_mean": 0.772,
            "vision.pocket_depth_yd": 0.435,
            "ftn.play_action_rate": 0.228,
            "ftn.motion_rate": 0.495,
            "ftn.screen_rate": 0.082,
            "ftn.rpo_rate": 0.084,
            "ftn.def_blitz_rate": 0.268,
            "qbr.total_qbr": 0.584,
            "snaps.starter_snap_share": 0.925,
            "cognitive.presser_sentiment": 0.54,
            "cognitive.coach_speak_delta": 0.51,
            "cognitive.scheme_shift": 0.49,
            "cognitive.tendency_break": 0.50,
        },
        "GB": {
            "vision.soe_yd": 0.248,
            "vision.art_mean": 0.760,
            "vision.pocket_depth_yd": 0.455,
            "ftn.play_action_rate": 0.270,
            "ftn.motion_rate": 0.565,
            "ftn.screen_rate": 0.094,
            "ftn.rpo_rate": 0.112,
            "ftn.def_blitz_rate": 0.240,
            "qbr.total_qbr": 0.632,
            "snaps.starter_snap_share": 0.934,
            "cognitive.presser_sentiment": 0.58,
            "cognitive.coach_speak_delta": 0.55,
            "cognitive.scheme_shift": 0.52,
            "cognitive.tendency_break": 0.51,
        },
    }


def test_item1_signal_centering_and_steam_exhaustion_gate():
    """
    Acceptance 1:
    - Mean-center level features against 2026 league baselines and use PROB_SCALE = 0.10 on totals.
    - Re-score ARI @ LAR OVER 51.5 (opened 46.5, current 51.5, structural 52.8) -> flips to PASS.
    - Re-score DAL @ GB OVER 53.5 (opened 51.5, current 53.5, two-high 63.5%) -> flips to PASS.
    """
    assert SOVEREIGN_SIGNAL_LEAGUE_BASELINES["qbr.total_qbr"] == 0.550
    assert SOVEREIGN_SIGNAL_LEAGUE_BASELINES["snaps.starter_snap_share"] == 0.915
    assert SOVEREIGN_SIGNAL_LEAGUE_BASELINES["ftn.motion_rate"] == 0.480

    team_signals = _sample_week6_team_signals()
    cont = {"olContinuityDelta": 0.0, "dlContinuityDelta": 0.0, "dbContinuityDelta": 0.0}

    ari_lar = compute_pick_probability_from_db_signals(
        team_signals=team_signals,
        game_signals_by_gid={},
        gid="gid_ari_lar",
        home_abbr="LAR",
        away_abbr="ARI",
        pick_type="TOTAL",
        side_dir="OVER",
        market_fair_prob=0.5022,
        structural_delta_prob=0.0440,
        cont_deltas=cont,
        opening_total=46.5,
        current_total=51.5,
        structural_model_total=52.8,
        two_high_shell_rate=0.612,
    )
    assert ari_lar["probScale"] == 0.10
    assert ari_lar["meanCenteredOnTotals"] is True
    assert ari_lar["decision"] == "PASS"
    assert ari_lar["steamExhaustionGate"]["gated"] is True

    dal_gb = compute_pick_probability_from_db_signals(
        team_signals=team_signals,
        game_signals_by_gid={},
        gid="gid_dal_gb",
        home_abbr="GB",
        away_abbr="DAL",
        pick_type="TOTAL",
        side_dir="OVER",
        market_fair_prob=0.4978,
        structural_delta_prob=0.0420,
        cont_deltas=cont,
        opening_total=51.5,
        current_total=53.5,
        structural_model_total=55.2,
        two_high_shell_rate=0.635,
    )
    assert dal_gb["probScale"] == 0.10
    assert dal_gb["decision"] == "PASS"
    assert dal_gb["steamExhaustionGate"]["gated"] is True


def test_item2_target_conservation_and_james_stein_shrinkage():
    """
    Acceptance 2:
    - James-Stein shrinkage (k=6) pulls Nacua's 3-game 15.0 tgts/G toward WR1 prior (8.4).
    - Dirichlet-Multinomial conservation caps sum of team targets <= 33 * 0.96 = 31.68.
    - TE Committee Gate blocks Tyler Higbee OVER 31.5 (TE2+TE3 route share 52.8% > 45%).
    - Matthew Stafford 279.5 moves to PASS / UNDER (conserved projection < 279.5).
    """
    nacua_shrunk = shrink_rate(observed_rate=15.0, n_games=3, prior=8.4, k=6.0)
    assert nacua_shrunk == 10.6  # (3/9)*15.0 + (6/9)*8.4 = 5.0 + 5.6 = 10.6

    lar_receivers = [
        {"player": "Puka Nacua", "position": "WR", "role": "WR1", "n_games": 3, "observed_targets_pg": 15.0, "observed_yards_pg": 112.3, "line": 94.5, "side": "OVER"},
        {"player": "Davante Adams", "position": "WR", "role": "WR2", "n_games": 5, "observed_targets_pg": 9.0, "observed_yards_pg": 88.2, "line": 66.5, "side": "OVER"},
        {"player": "Tyler Higbee", "position": "TE", "role": "TE", "n_games": 2, "observed_targets_pg": 5.5, "observed_yards_pg": 56.0, "line": 31.5, "side": "OVER", "te2_te3_route_share": 0.528},
        {"player": "Kyren Williams", "position": "RB", "role": "RB1", "n_games": 5, "observed_targets_pg": 3.6, "observed_yards_pg": 25.0, "line": 19.5, "side": "OVER"},
        {"player": "Tutu Atwell", "position": "WR", "role": "WR3", "n_games": 5, "observed_targets_pg": 4.8, "observed_yards_pg": 38.0, "line": 28.5, "side": "OVER"},
    ]
    conserved = reproject_team_receiving_stack(lar_receivers, team_pass_attempts=33.0, k=6.0, cap=0.96)
    total_targets = sum(r["projected_targets"] for r in conserved)
    assert total_targets <= 33.0 * 0.96 + 0.05

    by_name = {r["player"]: r for r in conserved}
    # Nacua + Adams + Higbee subset sum is well below 31.7
    trio_targets = (
        by_name["Puka Nacua"]["projected_targets"]
        + by_name["Davante Adams"]["projected_targets"]
        + by_name["Tyler Higbee"]["projected_targets"]
    )
    assert trio_targets <= 31.7

    # Higbee OVER 31.5 is blocked by TE Committee Gate
    assert by_name["Tyler Higbee"]["decision"] == "PASS"
    assert by_name["Tyler Higbee"]["is_published"] is False
    assert "TE_COMMITTEE_GATE" in (by_name["Tyler Higbee"]["gate_reason"] or "")

    # Stafford 279.5 moves to PASS / UNDER
    stafford = project_qb_pass_yards_with_conservation(
        qb_observed_yards_pg=301.4,
        n_games=5,
        team_pass_attempts=33.0,
        conserved_receivers=conserved,
        line=279.5,
    )
    assert stafford["coupled_projected_yards"] < 279.5
    assert stafford["decision"] == "PASS"
    assert stafford["recommended_side"] == "UNDER"


def test_item3_vacated_target_multiplier_and_canonical_bus():
    """
    Acceptance 3:
    - Rashee Rice (24.5% share >= 20%) OUT boosts Xavier Worthy by x1.28 targets and flips Worthy to OVER 48.5.
    - WR Under Gate blocks Germie Bernard UNDER 44.5 and Colston Loveland UNDER 39.5.
    - Canonical bus emits identical mu and side across Packet, SGP, and JEV.
    """
    bus = get_canonical_week6_prop_projections()
    worthy = bus["Xavier Worthy"]
    assert worthy["side"] == "OVER"
    assert worthy["mu"] > 48.5
    assert worthy["decision"] == "PLAY"

    bernard = bus["Germie Bernard"]
    assert bernard["decision"] == "PASS"
    assert bernard["is_published"] is False
    assert "WR_UNDER_GATE_BLOCKED" in (bernard["gate_reason"] or "")

    loveland = bus["Colston Loveland"]
    assert loveland["decision"] == "PASS"
    assert loveland["is_published"] is False


def test_item4_regime_mixture_and_pocket_depth_penalty():
    """
    Acceptance 4:
    - Bijan Robinson 2-state regime mixture drops projected rushing yards below 93.5 (and sets script_risk_flag=True).
    - Drake London receives -8% catch-rate haircut under pocket_depth_yd=3.45 (<3.60) vs top-12 pressure front,
      dropping projected receiving yards below 89.5.
    """
    bijan = evaluate_rb_prop_with_regime_mixture(
        base_carries=16.8,
        ypc=6.50,
        p_trail=0.42,
        line=93.5,
        player_name="Bijan Robinson",
    )
    assert bijan["projected_yards"] < 93.5
    assert bijan["script_risk_flag"] is True
    assert bijan["decision"] == "PASS"

    london = evaluate_wr_prop_with_pocket_penalty(
        projected_targets=9.6,
        base_catch_rate=0.660,
        yards_per_reception=14.85,
        pocket_depth=3.45,
        pressure_rank=9,
        line=89.5,
        player_name="Drake London",
    )
    assert london["penalty_applied"] is True
    assert london["adjusted_catch_rate"] == round(0.660 * 0.92, 4)
    assert london["projected_yards"] < 89.5
    assert london["decision"] == "PASS"


def test_item5_dfs_correlation_penalty_and_diversity():
    """
    Acceptance 5:
    - Unhedged Dad's Stack (Stafford + Kyren + Higbee + Bijan + London) is penalized for:
      (a) same-team RB+WR without QB on ATL (Bijan + London, Bijan target share 11.5% < 15%),
      (b) same-team RB+TE on LAR (Kyren + Higbee, Kyren target share 10.2% < 15%),
      (c) >= 3 LAR players without an ARI bring-back,
      scoring lower than Garrett's 3-RB volume build under identical salary cap.
    - Overlap helper accurately enforces <= 5 shared players.
    """
    dads_lineup = [
        {"pid": "stafford", "name": "Matthew Stafford", "pos": "QB", "team": "LAR", "opp": "ARI", "mu": 20.8},
        {"pid": "kyren", "name": "Kyren Williams", "pos": "RB", "team": "LAR", "opp": "ARI", "mu": 19.4, "target_share": 0.102},
        {"pid": "bijan", "name": "Bijan Robinson", "pos": "RB", "team": "ATL", "opp": "CHI", "mu": 21.2, "target_share": 0.115},
        {"pid": "london", "name": "Drake London", "pos": "WR", "team": "ATL", "opp": "CHI", "mu": 18.9},
        {"pid": "adams", "name": "Davante Adams", "pos": "WR", "team": "LAR", "opp": "ARI", "mu": 16.5},
        {"pid": "shakir", "name": "Khalil Shakir", "pos": "WR", "team": "BUF", "opp": "LV", "mu": 13.8},
        {"pid": "higbee", "name": "Tyler Higbee", "pos": "TE", "team": "LAR", "opp": "ARI", "mu": 10.6},
        {"pid": "worthy", "name": "Xavier Worthy", "pos": "WR", "team": "KC", "opp": "LAC", "mu": 13.2},
        {"pid": "browns_dst", "name": "Browns", "pos": "DST", "team": "CLE", "opp": "BAL", "mu": 8.2},
    ]
    garretts_3rb_lineup = [
        {"pid": "allen", "name": "Josh Allen", "pos": "QB", "team": "BUF", "opp": "LV", "mu": 24.6},
        {"pid": "walker", "name": "Kenneth Walker III", "pos": "RB", "team": "KC", "opp": "LAC", "mu": 20.5},
        {"pid": "cook", "name": "James Cook", "pos": "RB", "team": "BUF", "opp": "LV", "mu": 19.2, "target_share": 0.155},
        {"pid": "shakir", "name": "Khalil Shakir", "pos": "WR", "team": "BUF", "opp": "LV", "mu": 13.8},
        {"pid": "tucker", "name": "Tre Tucker", "pos": "WR", "team": "LV", "opp": "BUF", "mu": 12.1},
        {"pid": "worthy", "name": "Xavier Worthy", "pos": "WR", "team": "KC", "opp": "LAC", "mu": 13.2},
        {"pid": "goedert", "name": "Dallas Goedert", "pos": "TE", "team": "PHI", "opp": "CAR", "mu": 12.4},
        {"pid": "hubbard", "name": "Chuba Hubbard", "pos": "RB", "team": "CAR", "opp": "PHI", "mu": 17.8},
        {"pid": "jets_dst", "name": "Jets", "pos": "DST", "team": "NYJ", "opp": "NE", "mu": 7.8},
    ]
    mu_map = {p["pid"]: p["mu"] for p in dads_lineup + garretts_3rb_lineup}
    opp_map = {"LAR": "ARI", "ATL": "CHI", "BUF": "LV", "KC": "LAC"}

    dads_corr_score = score_lineup_with_correlation(dads_lineup, mu_map, opponent_map=opp_map)
    garretts_corr_score = score_lineup_with_correlation(garretts_3rb_lineup, mu_map, opponent_map=opp_map)

    assert compute_correlation_penalty(dads_lineup, mu_map, opponent_map=opp_map) > 15.0
    assert dads_corr_score < garretts_corr_score
    assert overlap(dads_lineup, garretts_3rb_lineup) <= 5


def test_50_feature_player_interaction_vector_and_ridge_model():
    """
    Verifies that `build_player_feature_vector` produces all 50 named interaction features
    and `train_player_model` / `predict_player` fits and predicts cleanly.
    """
    base = {
        "soe_yd": 0.312,
        "avg_separation": 3.24,
        "adot": 10.8,
        "target_share": 0.265,
        "targets_per_route_run": 0.258,
        "air_yard_share": 0.342,
        "ryoe": 0.0,
        "snap_share": 0.88,
        "route_participation": 0.91,
    }
    state = {
        "two_high_rate": 0.44,
        "man_coverage_rate": 0.31,
        "pressure_rate": 0.29,
        "primary_defender_out": True,
        "wr1_out": False,
        "trailing_prob": 0.28,
        "short_week": False,
        "is_home": True,
    }
    fvec = build_player_feature_vector(base, state)
    assert len(FEATURE_NAMES) == 50
    for name in FEATURE_NAMES:
        assert name in fvec

    # Fit synthetic sample to verify standardized Ridge pipeline
    rng = np.random.default_rng(42)
    sample_dicts = []
    y_vals = []
    for _ in range(32):
        b = {k: float(v * rng.uniform(0.8, 1.2)) for k, v in base.items()}
        s = {
            "two_high_rate": float(rng.uniform(0.35, 0.65)),
            "man_coverage_rate": float(rng.uniform(0.20, 0.45)),
            "pressure_rate": float(rng.uniform(0.22, 0.42)),
            "primary_defender_out": bool(rng.integers(0, 2)),
            "wr1_out": bool(rng.integers(0, 2)),
            "trailing_prob": float(rng.uniform(0.20, 0.60)),
            "short_week": False,
            "is_home": True,
        }
        fv = build_player_feature_vector(b, s)
        sample_dicts.append(fv)
        y_vals.append(55.0 + 40.0 * fv["soe_residual_two_high"] + 80.0 * fv["target_share"] - 25.0 * fv["soe_x_two_high"])

    X = build_design_matrix(sample_dicts)
    assert X.shape == (32, 50)
    model = train_player_model(X, np.array(y_vals), alpha=1.0)
    pred = predict_player(model, fvec)
    assert 40.0 <= pred <= 120.0


def test_213_equation_engine_and_physics_completion_prob():
    """
    Verifies the complete 213-equation engine:
    - 204 features from `build_full_feature_vector` (12 bases + 192 interaction/residual crossings)
    - `physics_completion_prob` (Eq. 8: P_c = P_ca * (1 - d_p / d_max) / (1 + n_d))
    - `matchup_cross_entropy_loss` (Eq. 11) and `gat_attention` (Eq. 13)
    - `student_t_copula_cdf` (Eq. 16) and `student_t_tail_dependence` (Eq. 17)
    - Live WSH @ SF 6:30 PM CDT Steam Exhaustion Gate on Total 52.0 (open 49.0 -> close 52.0, structural 53.8 -> PASS)
    """
    from intelligence.models.gse_213_equation_engine import (
        BASES,
        STATES,
        build_full_feature_vector,
        physics_completion_prob,
        student_t_tail_dependence,
        win_prob_from_spread,
        points_from_epa,
    )
    from intelligence.matchups.coverage_matchup import matchup_cross_entropy_loss, gat_attention
    from intelligence.sgp.copula_sgp import student_t_copula_cdf

    player_kittle = {
        "soe_yd": 0.312,
        "avg_separation": 3.41,
        "adot": 9.31,
        "target_share": 0.242,  # Boosted with Deebo Samuel Sr. OUT
        "tprr": 0.268,
        "air_yard_share": 0.264,
        "ryoe": 0.0,
        "snap_share": 0.90,
        "route_participation": 0.86,
        "pocket_depth": 4.21,
        "cpoe": 0.048,
        "qbr": 68.4,
    }
    ctx_sf = {
        "two_high_rate": 0.420,
        "man_coverage_rate": 0.340,
        "pressure_rate": 0.258,
        "wr1_out": 1.0,  # Deebo Samuel Sr. OUT
        "def_out": 1.0,  # Charles Omenihu OUT
        "trailing_prob": 0.220,
        "short_week": 0.0,
        "is_home": 1.0,
    }
    fv_204 = build_full_feature_vector(player_kittle, ctx_sf)
    assert len(BASES) == 12
    assert len(STATES) == 8
    assert len(fv_204) == 12 + (12 * 8 * 2) == 204
    assert np.isclose(fv_204["target_share_x_wr1_out"], 0.242 * 1.0)
    assert np.isclose(fv_204["soe_yd_res_two_high_rate"], 0.312 * (1.0 - 0.420))

    # Eq. 8: Physics completion probability
    # Terry McLaurin (deep perimeter aDOT 12.54 vs SF 56.5% two-high bracket: n_d=1, d_p/d_max=0.42)
    p_c_mclaurin = physics_completion_prob(p_ca=0.82, d_p=4.2, d_max=10.0, n_defenders=1)
    # George Kittle (seam route vs vacated WSH middle with Omenihu OUT: n_d=0, d_p/d_max=0.14)
    p_c_kittle = physics_completion_prob(p_ca=0.86, d_p=1.4, d_max=10.0, n_defenders=0)
    assert np.isclose(p_c_mclaurin, 0.82 * (0.58 / 2.0))  # 0.2378 in tight 2-man bracket window
    assert np.isclose(p_c_kittle, 0.86 * 0.86)  # 0.7396 in open seam window
    assert p_c_kittle > p_c_mclaurin

    # Eq. 11 & 13: Coverage Assignment Cross-Entropy & GAT Attention
    logits = np.array([[2.2, 0.3, -0.5], [0.1, 1.9, 0.2]])
    targets = np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]])
    ce_loss = matchup_cross_entropy_loss(logits, targets)
    assert 0.10 < ce_loss < 0.50

    W = np.eye(4)
    a = np.ones(8) * 0.25
    e_ij = gat_attention(np.array([1.0, 0.5, 0.2, 0.1]), np.array([0.8, 0.4, 0.3, 0.2]), W, a)
    assert e_ij > 0.0

    # Eq. 16 & 17: Student-t Copula (nu=4) & tail dependence
    tail_dep = student_t_tail_dependence(rho=0.48, nu=4.0)
    assert tail_dep > 0.20
    joint_p = student_t_copula_cdf(0.60, 0.58, rho=0.48, nu=4, n_sim=50000, seed=42)
    assert joint_p > (0.60 * 0.58)

    # Eq. 18 & 19: Points from EPA and Win Prob from Spread
    assert np.isclose(points_from_epa(8.5, st_edge=0.4), 23.0 + 0.74 * 8.5 + 0.4)
    assert 0.74 < win_prob_from_spread(7.5, k=0.145) < 0.76


def test_full_market_scanner_roster_grounding_and_two_high_script_deconflation():
    """
    Verifies the 3 structural fixes from tonight's MNF (WSH @ SF, game_id 401873008) audit:
    1. Hard Roster & Injury Grounding Gate:
       - Blocks stale-roster hallucinations (`Zach Ertz`, `Jake Moody`) with `RosterGroundingError`.
       - Blocks ruled-OUT/Suspended players (`Deebo Samuel Sr.`, `Nick Bosa`, `Dre Greenlaw`,
         `Charles Omenihu`, `Jacory Croskey-Merritt`) with `RosterGroundingError`.
       - Validates active 2026 players (`Chig Okonkwo`, `Eddy Pineiro`, `Drew Stevens`, `Terry McLaurin`).
    2. Two-High vs. Trailing Script De-Conflation Law:
       - `Terry McLaurin` (`route_participation=0.89`, `trailing_prob=0.68`) is scored OVER 49.5 Rec Yds
         and OVER 3.5 Receptions (with `wr_under_gate_blocked=True`), while `Longest Reception 19.5`
         is scored UNDER via Gumbel two-high tail compression.
       - `Chig Okonkwo` is scored OVER 24.5 Rec Yds and OVER 2.5 Receptions.
    3. Derivative Pricing Models:
       - `Jayden Daniels` OVER 0.5 Passing Interceptions & `Brock Purdy` UNDER 0.5 Passing Interceptions.
       - `Eddy Pineiro` OVER 1.5 FGs / OVER 8.5 Kicking Pts & `Drew Stevens` OVER 1.5 FGs / UNDER 1.5 PATs.
    """
    import pytest
    from intelligence.props.full_market_scanner import (
        RosterGroundingError,
        load_verified_game_entities,
        validate_player_grounding,
        scan_wsh_sf_full_board,
    )

    verified = load_verified_game_entities(
        game_id="401873008",
        away_team="WSH",
        home_team="SF",
        away_full_name="Washington Commanders",
        home_full_name="San Francisco 49ers",
    )

    # 1. Hallucinated / wrong-team players MUST raise RosterGroundingError
    for wrong_team_player in ("Zach Ertz", "Jake Moody"):
        with pytest.raises(RosterGroundingError, match="UNGROUNDED_ROSTER_HALLUCINATION"):
            validate_player_grounding(wrong_team_player, verified)

    # 2. Ruled-OUT / Suspended players MUST raise RosterGroundingError
    for inactive_player in (
        "Deebo Samuel Sr.",
        "Nick Bosa",
        "Dre Greenlaw",
        "Charles Omenihu",
        "Jacory Croskey-Merritt",
    ):
        with pytest.raises(RosterGroundingError, match="BLOCKED_INACTIVE_PLAYER"):
            validate_player_grounding(inactive_player, verified)

    # 3. Full board scan produces verified OVER on McLaurin & Okonkwo, UNDER on McLaurin Longest Rec,
    #    OVER on Daniels INT, UNDER on Purdy INT, and OVER on Pineiro/Stevens FGs
    board = scan_wsh_sf_full_board()

    mclaurin = board["mclaurin"]
    assert mclaurin["wr_under_gate_blocked"] is True
    assert mclaurin["rec_yds_side"] == "OVER"
    assert mclaurin["projected_receiving_yards"] > 49.5
    assert mclaurin["receptions_side"] == "OVER"
    assert mclaurin["longest_rec_side"] == "UNDER"

    okonkwo = board["okonkwo"]
    assert okonkwo["rec_yds_side"] == "OVER"
    assert okonkwo["projected_receiving_yards"] > 24.5
    assert okonkwo["receptions_side"] == "OVER"

    assert board["daniels_int"]["recommended_side"] == "OVER"
    assert board["purdy_int"]["recommended_side"] == "UNDER"
    assert board["pineiro_kick"]["fg_side"] == "OVER"
    assert board["pineiro_kick"]["pts_side"] == "OVER"
    assert board["stevens_kick"]["fg_side"] == "OVER"
    assert board["stevens_kick"]["pat_side"] == "UNDER"


