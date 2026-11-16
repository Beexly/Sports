"""Unit tests for Wave 8 Weeks 1-10 projection autopsy mathematical fixes."""

from __future__ import annotations

import numpy as np
from scripts.ops.enforce_stage0_roster_and_board_allowlist import _strip_name_suffix
from scripts.ops.gse_connected_game_workflow import redistribute_vacated_team_volume
from scripts.ops.run_post_window_settlement_and_autopsy import grade_completed_game
from scripts.ops.week8_forensic_kernels import allocate_stochastic_conserved_box_score

from gse_engine.compute.volume_conservation import (
    anchor_team_priors_to_market_stack,
    conserve_non_qb_rushing_and_prune_zero_carry_wrs,
)


def test_conserve_non_qb_rushing_prunes_zero_carry_wrs_and_excludes_qb() -> None:
    """QBs and zero-carry WRs must not steal rushing shares from active RBs."""
    weights = {
        "Drake Maye": 5.02,
        "Corey Kiner": 9.80,
        "Antonio Gibson": 4.20,
        "A.J. Brown": 0.15,
        "Mack Hollins": 0.15,
        "DeMario Douglas": 0.42,  # legitimate gadget runner >= 0.35 car/pg
    }
    positions = {
        "Drake Maye": "QB",
        "Corey Kiner": "RB",
        "Antonio Gibson": "RB",
        "A.J. Brown": "WR",
        "Mack Hollins": "WR",
        "DeMario Douglas": "WR",
    }
    cpg = {
        "Drake Maye": 5.02,
        "Corey Kiner": 9.80,
        "Antonio Gibson": 4.20,
        "A.J. Brown": 0.0,
        "Mack Hollins": 0.0,
        "DeMario Douglas": 0.42,
    }
    conserved = conserve_non_qb_rushing_and_prune_zero_carry_wrs(weights, positions, cpg)

    assert "Drake Maye" not in conserved
    assert "A.J. Brown" not in conserved
    assert "Mack Hollins" not in conserved
    assert "DeMario Douglas" in conserved
    assert conserved["Corey Kiner"] > 0.65
    assert abs(sum(conserved.values()) - 1.0) < 1e-4


def test_anchor_team_priors_removes_285_wall_and_scales_backups() -> None:
    """High-volume offenses exceed 285.0 naturally while low-total/backup spots drop below."""
    _, det_pass, _ = anchor_team_priors_to_market_stack(
        posted_total=52.5,
        posted_home_spread=-6.5,
        pbp_team_pass_pg=312.0,
        pbp_team_rush_pg=120.0,
        side="home",
        qb_tier="QB1",
        epa_mod=1.08,
        pass_rate=0.61,
    )
    _, lv_backup_pass, _ = anchor_team_priors_to_market_stack(
        posted_total=40.5,
        posted_home_spread=6.5,
        pbp_team_pass_pg=250.0,
        pbp_team_rush_pg=90.0,
        side="home",
        qb_tier="QB2_BACKUP",
        epa_mod=0.95,
        pass_rate=0.55,
    )
    assert det_pass > 285.0
    assert lv_backup_pass < 185.0


def test_allocate_stochastic_box_score_no_tiny_role_noise_inflation() -> None:
    """Tiny-role players (<5% share) keep small std and worlds remain non-negative & conserved."""
    noise = np.random.default_rng(7).normal(0.0, 22.0, 400)
    team_rush = np.maximum(30.0, np.full(400, 110.0, dtype=np.float64) + noise)
    shares = {
        "RB1": 0.72,
        "RB2": 0.24,
        "WR_GADGET": 0.02,
        "OTHER_TEAM_RUSH": 0.02,
    }
    alloc = allocate_stochastic_conserved_box_score(
        team_total_vec=team_rush,
        baseline_shares=shares,
        stat_family="rushing_yds",
        concentration_kappa=20.0,
        seed=44,
    )
    total_reconstructed = sum(alloc[k] for k in shares)
    np.testing.assert_allclose(total_reconstructed, team_rush, atol=1e-6)
    for k, vec in alloc.items():
        assert np.all(vec >= 0.0), f"Negative world yards generated for {k}"
    assert float(np.std(alloc["WR_GADGET"])) < 5.5
    assert float(np.mean(alloc["RB1"])) > 70.0


def test_grade_completed_game_returns_pending_for_unplayed_fixture() -> None:
    """Unplayed 0-0 fixtures must return PENDING instead of fake HOME_COVER/UNDER/TIE grades."""
    pending_game = {
        "event_id": "401873065",
        "away_team": "LAC",
        "home_team": "BAL",
        "away_score": 0,
        "home_score": 0,
        "is_completed": False,
        "spread": -4.5,
        "details": "BAL -4.5",
        "over_under": 38.5,
    }
    res = grade_completed_game(pending_game)
    assert res["is_graded"] is False
    assert res["spread_result"] == "PENDING"
    assert res["total_result"] == "PENDING"
    assert res["ml_result"] == "PENDING"
    assert res["margin"] is None
    assert res["total_points"] is None


def test_alpha_wr1_share_cap_046_and_suffix_dedup_key() -> None:
    """Alpha WR1s retain up to 46% receiving yardage share; Sr/Jr variants normalize cleanly."""
    assert _strip_name_suffix("aaron jones sr.") == _strip_name_suffix("aaron jones")
    rec_weights = {
        "Ja'Marr Chase": 115.0,
        "Tee Higgins": 58.0,
        "Mike Gesicki": 32.0,
        "Chase Brown": 22.0,
    }
    rush_weights = {"Chase Brown": 65.0}
    athletes = {
        "Ja'Marr Chase": {"team": "CIN", "position": "WR"},
        "Tee Higgins": {"team": "CIN", "position": "WR"},
        "Mike Gesicki": {"team": "CIN", "position": "TE"},
        "Chase Brown": {"team": "CIN", "position": "RB"},
    }
    rw, _ = redistribute_vacated_team_volume(
        rec_weights=rec_weights,
        rush_weights=rush_weights,
        athletes=athletes,
        team="CIN",
        max_wr_share=0.46,
        max_rb_target_share=0.20,
    )
    chase_share = rw["Ja'Marr Chase"] / sum(rw.values())
    assert chase_share >= 0.42
    assert chase_share <= 0.465
