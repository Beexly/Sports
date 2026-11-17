"""Regression & Harmony Test Suite for Week 10 Pre-Game & Post-Window Engine Workflows.

Covers Tracks A, B, C, and D:
1. Track D: Sequenced Pipeline Orchestrator (noon-lock & t90m-adjust modes,
   <180s T-90m SLA badge, unified summary packet emission).
2. Track D: Post-Window Settlement & Autopsy (free-path ESPN scoreboard grading,
   trainer feed emission to brain/feeds/<date>/, and HARD safety check forbidding
   direct writes to brain/mind.jsonl).
3. Track A: Stage 0 Truth & Single-QB1 Integrity (CANONICAL_HEALTHY_QB1,
   CLE QB1 Winston resolution without Watson collision).
4. Track B: 360-Degree Board Market Classification & Coverage (market types,
   classification suites: 1Q/1H props, halves/quarters, QB, skill, IDP, kicking).
5. Track C: DFS Classic 2-TE FLEX Lineup Formatting & GSE Lineup Doctor.
6. Conservation: PBP Conservation invariant checking & conserved box score allocation.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

# Track D / Track C imports
from scripts.dfs.build_week10_all_slates_dfs_packets import _format_classic_lineup
from scripts.dfs.build_weekly_dfs_packets import optimize_showdown_portfolio
from scripts.dfs.gse_lineup_doctor import GSELineupDoctor

# Track B imports
from scripts.ops.build_game_boards_360 import (
    BOARD_MARKETS,
    DEFAULT_REMAINING_GAMES,
    classify_market_suite,
)

# Track A imports
from scripts.ops.build_live_stage0_truth import (
    CANONICAL_HEALTHY_QB1,
    resolve_single_qb1_truth,
)
from scripts.ops.run_permanent_sequenced_weekly_pipeline import (
    WEEK10_WINDOW_MAP,
    resolve_target_window_games,
    run_permanent_sequenced_pipeline,
)
from scripts.ops.run_post_window_settlement_and_autopsy import (
    grade_completed_game,
    run_post_window_settlement_and_autopsy,
)

# Forensic / Conservation imports
from scripts.ops.week8_forensic_kernels import (
    allocate_conserved_box_score,
    assert_pbp_conservation,
)

REPO_ROOT = Path(__file__).resolve().parents[2]

# =============================================================================
# TRACK D: SEQUENCED PIPELINE ORCHESTRATOR REGRESSIONS
# =============================================================================

def test_pipeline_window_mapping_and_resolution():
    """Verify target window resolution for Week 10 remaining games."""
    # Ensure window map covers canonical windows
    for window in ("tnf", "sun_intl", "sun_early", "sun_late", "snf", "mnf"):
        assert window in WEEK10_WINDOW_MAP

    # Target all-remaining must return all 5 unstarted Week 10 games
    all_rem = resolve_target_window_games(target="all-remaining")
    assert all_rem == ["SEA@LV", "LAR@ARI", "SF@DAL", "PIT@CIN", "LAC@BAL"]

    # Target sunday must return remaining Sunday games (sun_late + snf)
    sunday_rem = resolve_target_window_games(target="sunday")
    assert sunday_rem == ["SEA@LV", "LAR@ARI", "SF@DAL", "PIT@CIN"]

    # Target mnf must return LAC@BAL
    mnf_rem = resolve_target_window_games(target="mnf")
    assert mnf_rem == ["LAC@BAL"]

    # Window sun_late must return the 3 4:05/4:25 PM ET games
    late_games = resolve_target_window_games(window="sun_late")
    assert late_games == ["SEA@LV", "LAR@ARI", "SF@DAL"]

    # Window snf must return PIT@CIN
    snf_games = resolve_target_window_games(window="snf")
    assert snf_games == ["PIT@CIN"]


def test_pipeline_noon_lock_execution_and_packet_emission(tmp_path: Path):
    """Verify noon-lock mode runs smoothly and writes master packet json and md."""
    res = run_permanent_sequenced_pipeline(
        season=2026,
        week=10,
        mode="noon-lock",
        target="all-remaining",
        dry_run=True,
        fetch_live_espn=False,
        run_js_guards=False,
    )
    assert res.get("all_gates_passed") is True
    assert res.get("mode") == "noon-lock"
    
    orch = res.get("remaining_slate_orchestration")
    assert orch is not None
    assert orch.get("mode") == "noon-lock"
    assert orch.get("orchestrated_games") == ["SEA@LV", "LAR@ARI", "SF@DAL", "PIT@CIN", "LAC@BAL"]

    # Verify summary files were created
    summary_json_path = orch.get("summary_json_path")
    summary_md_path = orch.get("summary_md_path")
    assert summary_json_path is not None and Path(summary_json_path).is_file()
    assert summary_md_path is not None and Path(summary_md_path).is_file()

    # Verify packet json content structure
    with open(summary_json_path, encoding="utf-8") as f:
        packet = json.load(f)
    assert packet.get("season") == 2026
    assert packet.get("week") == 10
    assert packet.get("mode") == "noon-lock"
    assert len(packet.get("orchestrated_games", [])) == 5
    assert "stage_statuses" in packet


def test_pipeline_t90m_adjust_fast_diff_sla():
    """Verify t90m-adjust mode detects 0 inactive changes and clears <180s SLA."""
    res = run_permanent_sequenced_pipeline(
        season=2026,
        week=10,
        mode="t90m-adjust",
        window="sun_late",
        dry_run=True,
        fetch_live_espn=False,
        run_js_guards=False,
    )
    assert res.get("all_gates_passed") is True
    assert res.get("mode") == "t90m-adjust"

    orch = res.get("remaining_slate_orchestration")
    assert orch is not None
    assert orch.get("mode") == "t90m-adjust"
    assert orch.get("sla_badge_180s") is True
    assert orch.get("elapsed_seconds", 999.0) < 180.0

    # Verify summary markdown contains the SLA achievement badge
    summary_md_path = orch.get("summary_md_path")
    assert summary_md_path is not None and Path(summary_md_path).is_file()
    md_content = Path(summary_md_path).read_text(encoding="utf-8")
    assert "<180s T-90m SLA ACHIEVED" in md_content


# =============================================================================
# TRACK D: POST-WINDOW SETTLEMENT & AUTOPSY REGRESSIONS
# =============================================================================

def test_post_window_settlement_grading_logic():
    """Verify game grading logic for spreads, totals, and moneylines."""
    # Test Home Cover & Over
    game1 = {
        "home_score": 27,
        "away_score": 20,
        "spread": -3.5,
        "over_under": 44.5,
        "is_completed": True,
    }
    grade1 = grade_completed_game(game1)
    assert grade1["margin"] == 7
    assert grade1["total_points"] == 47
    assert grade1["spread_result"] == "HOME_COVER"
    assert grade1["total_result"] == "OVER"
    assert grade1["ml_result"] == "HOME_WIN"

    # Test Away Cover & Under
    game2 = {
        "home_score": 17,
        "away_score": 24,
        "spread": -3.5,
        "over_under": 44.5,
        "is_completed": True,
    }
    grade2 = grade_completed_game(game2)
    assert grade2["margin"] == -7
    assert grade2["total_points"] == 41
    assert grade2["spread_result"] == "AWAY_COVER"
    assert grade2["total_result"] == "UNDER"
    assert grade2["ml_result"] == "AWAY_WIN"

    # Test Push on spread and total
    game3 = {
        "home_score": 24,
        "away_score": 21,
        "spread": -3.0,
        "over_under": 45.0,
        "is_completed": True,
    }
    grade3 = grade_completed_game(game3)
    assert grade3["spread_result"] == "PUSH"
    assert grade3["total_result"] == "PUSH"


def test_post_window_settlement_trainer_feed_schema():
    """Verify settlement generates trainer-ready jsonl feeds under brain/feeds/<date>/."""
    result = run_post_window_settlement_and_autopsy(
        season=2026,
        week=10,
        window="sun_early",
    )
    assert result.get("records_written", 0) >= 1
    feed_path = Path(result["feed_output_path"])
    assert feed_path.is_file()
    assert "brain" in feed_path.parts and "feeds" in feed_path.parts

    # Validate JSONL records
    with open(feed_path, encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    assert len(lines) >= 1

    first_record = json.loads(lines[0])
    for required_field in (
        "schema",
        "season",
        "week",
        "window",
        "matchup",
        "event_id",
        "is_completed",
        "game_summary",
        "grading",
        "trainer_prompt",
        "trainer_completion",
        "generated_utc",
    ):
        assert required_field in first_record


def test_post_window_direct_to_mind_safety_violation():
    """Verify HARD DIRECT-TO-MIND DOCTRINE: writing to brain/mind.jsonl is strictly blocked."""
    forbidden_path = REPO_ROOT / "brain" / "mind.jsonl"
    with pytest.raises(RuntimeError) as exc_info:
        run_post_window_settlement_and_autopsy(
            season=2026,
            week=10,
            window="sun_early",
            output_feed_path=forbidden_path,
        )
    assert "HARD SAFETY VIOLATION" in str(exc_info.value)
    assert "brain/mind.jsonl" in str(exc_info.value)


# =============================================================================
# TRACK A HARMONY: STAGE 0 TRUTH & SINGLE-QB1 INTEGRITY
# =============================================================================

def test_stage0_qb1_truth_resolution():
    """Verify canonical healthy QB1 mapping and single QB1 resolution for CLE Winston."""
    # 1. Canonical healthy QB1 table must designate Winston for CLE (never Watson)
    assert CANONICAL_HEALTHY_QB1.get("CLE") == "Jameis Winston"
    assert len(CANONICAL_HEALTHY_QB1) == 32

    # 2. Test resolve_single_qb1_truth with CLE depth chart having Watson excluded
    mock_depth_charts = {
        "CLE": {
            "QB": [
                {"player_id": "watson_1", "athlete": "Deshaun Watson", "rank": 1},
                {"player_id": "winston_2", "athlete": "Jameis Winston", "rank": 2},
                {"player_id": "thompson_3", "athlete": "Dorian Thompson-Robinson", "rank": 3},
            ]
        }
    }
    mock_excluded = [
        {"player_id": "watson_1", "name": "Deshaun Watson", "team": "CLE", "status": "OUT_IR"}
    ]
    resolved = resolve_single_qb1_truth(mock_depth_charts, mock_excluded)
    assert resolved.get("CLE") == "Jameis Winston"


# =============================================================================
# TRACK B HARMONY: 360-DEGREE BOARD MARKET CLASSIFICATION & COVERAGE
# =============================================================================

def test_360_board_market_classification_and_coverage():
    """Verify classify_market_suite categorizes all 7 market families correctly."""
    # 1. Quarters & Halves
    assert classify_market_suite("1st Quarter Moneyline", period="1Q") == "quarters_halves"
    assert classify_market_suite("1st Half Total Points", period="1H") == "quarters_halves"

    # 2. 1Q / 1H Player Props
    assert classify_market_suite("1st Quarter Passing Yards", period="1Q") == "1q_1h_player_props"
    assert classify_market_suite("1st Half Rushing Yards", period="1H") == "1q_1h_player_props"

    # 3. Touchdown Scorers
    assert (
        classify_market_suite("Anytime Touchdown Scorer", period="FULL_GAME")
        == "touchdown_scorers"
    )
    assert classify_market_suite("First TD Scorer", period="FULL_GAME") == "touchdown_scorers"

    # 4. QB Full Game Suite
    assert classify_market_suite("Passing Yards", period="FULL_GAME") == "qb_full_game"
    assert classify_market_suite("Interceptions", period="FULL_GAME") == "qb_full_game"
    assert classify_market_suite("Pass Completions", period="FULL_GAME") == "qb_full_game"

    # 5. Skill Player Full Game Suite
    assert classify_market_suite("Rushing Yards", period="FULL_GAME") == "skill_full_game"
    assert classify_market_suite("Receiving Yards", period="FULL_GAME") == "skill_full_game"
    assert classify_market_suite("Receptions", period="FULL_GAME") == "skill_full_game"

    # 6. Kicking Suite
    assert classify_market_suite("Field Goals Made", period="FULL_GAME") == "kicking"
    assert classify_market_suite("Total Kicking Points", period="FULL_GAME") == "kicking"

    # 7. Defense / IDP Suite
    assert classify_market_suite("Total Sacks", period="FULL_GAME") == "defense_idp"
    assert classify_market_suite("Tackles + Assists", period="FULL_GAME") == "defense_idp"

    # Verify board coverage
    assert len(BOARD_MARKETS) >= 14
    assert DEFAULT_REMAINING_GAMES == ["SEA@LV", "LAR@ARI", "SF@DAL", "PIT@CIN", "LAC@BAL"]


# =============================================================================
# TRACK C HARMONY: DFS CLASSIC 2-TE FLEX & LINEUP DOCTOR
# =============================================================================

def test_dfs_format_classic_lineup_2te_flex_support():
    """Verify _format_classic_lineup cleanly supports 2-TE Classic builds via FLEX."""
    # Build a valid 9-man classic roster with 2 TEs:
    # 1 QB, 2 RB, 3 WR, 2 TE (one in TE, one in FLEX), 1 DST
    players = [
        {
            "player_id": "1", "name": "Josh Allen", "position": "QB", "team": "BUF",
            "opponent": "NYJ", "salary": 8000, "median_fpts": 24.5,
            "p25_floor_fpts": 18.0, "p90_ceiling_fpts": 32.0, "kickoff_epoch": 1000,
        },
        {
            "player_id": "2", "name": "James Cook", "position": "RB", "team": "BUF",
            "opponent": "NYJ", "salary": 6500, "median_fpts": 16.2,
            "p25_floor_fpts": 10.0, "p90_ceiling_fpts": 22.0, "kickoff_epoch": 1000,
        },
        {
            "player_id": "3", "name": "Breece Hall", "position": "RB", "team": "NYJ",
            "opponent": "BUF", "salary": 7200, "median_fpts": 17.8,
            "p25_floor_fpts": 11.0, "p90_ceiling_fpts": 25.0, "kickoff_epoch": 1000,
        },
        {
            "player_id": "4", "name": "Khalil Shakir", "position": "WR", "team": "BUF",
            "opponent": "NYJ", "salary": 5400, "median_fpts": 13.1,
            "p25_floor_fpts": 7.0, "p90_ceiling_fpts": 19.0, "kickoff_epoch": 1000,
        },
        {
            "player_id": "5", "name": "Garrett Wilson", "position": "WR", "team": "NYJ",
            "opponent": "BUF", "salary": 6800, "median_fpts": 15.5,
            "p25_floor_fpts": 9.0, "p90_ceiling_fpts": 23.0, "kickoff_epoch": 1000,
        },
        {
            "player_id": "6", "name": "Davante Adams", "position": "WR", "team": "NYJ",
            "opponent": "BUF", "salary": 7000, "median_fpts": 14.8,
            "p25_floor_fpts": 8.0, "p90_ceiling_fpts": 21.0, "kickoff_epoch": 1000,
        },
        {
            "player_id": "7", "name": "Brock Bowers", "position": "TE", "team": "LV",
            "opponent": "SEA", "salary": 5800, "median_fpts": 14.0,
            "p25_floor_fpts": 8.0, "p90_ceiling_fpts": 20.0, "kickoff_epoch": 2000,
        },
        {
            "player_id": "8", "name": "George Kittle", "position": "TE", "team": "SF",
            "opponent": "DAL", "salary": 6000, "median_fpts": 15.0,
            "p25_floor_fpts": 9.0, "p90_ceiling_fpts": 22.0, "kickoff_epoch": 3000,
        },
        {
            "player_id": "9", "name": "Bills DST", "position": "DST", "team": "BUF",
            "opponent": "NYJ", "salary": 3000, "median_fpts": 7.5,
            "p25_floor_fpts": 3.0, "p90_ceiling_fpts": 14.0, "kickoff_epoch": 1000,
        },
    ]
    df = pd.DataFrame(players)
    formatted = _format_classic_lineup(df, mode="gpp", lineup_index=1, salary_cap=56000)

    roster = formatted.get("roster", [])
    assert len(roster) == 9

    slots = [r["slot"] for r in roster]
    assert slots == ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"]

    # Verify TE is in TE slot and the second TE is in FLEX
    te_slot = next(r for r in roster if r["slot"] == "TE")
    flex_slot = next(r for r in roster if r["slot"] == "FLEX")
    assert te_slot["pos"] == "TE"
    assert flex_slot["pos"] == "TE"
    # Latest kickoff placed in FLEX for recourse optionality
    assert flex_slot["name"] == "George Kittle"


def test_dfs_lineup_doctor_self_test():
    """Verify GSELineupDoctor runs ADR-0009 self-test and passes with zero crashes in <1s."""
    doctor = GSELineupDoctor()
    passed = doctor.run_self_test()
    assert passed is True


# =============================================================================
# FORENSIC & CONSERVATION INVARIANTS
# =============================================================================

def test_pbp_conservation_invariant():
    """Verify assert_pbp_conservation enforces exact yardage and touchdown balance."""
    # Conservation holds exactly: 2 worlds, 2 players
    player_rec_yds = [[100.0, 150.0], [100.0, 100.0]]
    team_pass_yds = [200.0, 250.0]
    player_rec_tds = [[1.0, 2.0], [1.0, 1.0]]
    team_pass_tds = [2.0, 3.0]

    assert_pbp_conservation(
        player_rec_yds=player_rec_yds,
        team_pass_yds=team_pass_yds,
        player_rec_tds=player_rec_tds,
        team_pass_tds=team_pass_tds,
    )

    # Discrepancy beyond tolerance raises AssertionError
    bad_player_rec_yds = [[90.0, 150.0], [100.0, 100.0]]  # 190 != 200 in world 0
    with pytest.raises(AssertionError):
        assert_pbp_conservation(
            player_rec_yds=bad_player_rec_yds,
            team_pass_yds=team_pass_yds,
            player_rec_tds=player_rec_tds,
            team_pass_tds=team_pass_tds,
        )


def test_allocate_conserved_box_score():
    """Verify allocate_conserved_box_score preserves totals without leak or distortion."""
    team_stat = [150.0, 250.0]
    shares = {"RB1": 0.60, "RB2": 0.30, "RB3": 0.10}
    allocated = allocate_conserved_box_score(
        team_stat=team_stat,
        shares=shares,
    )
    for world_idx, total in enumerate(team_stat):
        world_sum = sum(allocated[k][world_idx] for k in shares)
        assert world_sum == pytest.approx(total, rel=1e-4)


def test_optimize_showdown_portfolio_enforces_salary_cap():
    """Verify optimize_showdown_portfolio enforces <= $50,000 cap and >= 2 teams."""
    pool = pd.DataFrame([
        {
            "name": "Star QB A", "team": "PIT", "position": "QB",
            "salary": 10600, "cpt_salary": 15900, "median_fpts": 22.0,
        },
        {
            "name": "Star WR A", "team": "PIT", "position": "WR",
            "salary": 11000, "cpt_salary": 16500, "median_fpts": 20.5,
        },
        {
            "name": "Star QB B", "team": "CIN", "position": "QB",
            "salary": 10200, "cpt_salary": 15300, "median_fpts": 21.0,
        },
        {
            "name": "Star RB B", "team": "CIN", "position": "RB",
            "salary": 9600, "cpt_salary": 14400, "median_fpts": 18.0,
        },
        {
            "name": "WR2 A", "team": "PIT", "position": "WR",
            "salary": 7000, "cpt_salary": 10500, "median_fpts": 13.0,
        },
        {
            "name": "TE1 B", "team": "CIN", "position": "TE",
            "salary": 5400, "cpt_salary": 8100, "median_fpts": 10.5,
        },
        {
            "name": "Kicker A", "team": "PIT", "position": "K",
            "salary": 5000, "cpt_salary": 7500, "median_fpts": 8.0,
        },
        {
            "name": "DST B", "team": "CIN", "position": "DST",
            "salary": 4200, "cpt_salary": 6300, "median_fpts": 7.0,
        },
        {
            "name": "WR3 A", "team": "PIT", "position": "WR",
            "salary": 3200, "cpt_salary": 4800, "median_fpts": 6.5,
        },
        {
            "name": "RB3 B", "team": "CIN", "position": "RB",
            "salary": 2400, "cpt_salary": 3600, "median_fpts": 5.0,
        },
    ])
    lineups = optimize_showdown_portfolio(
        pool,
        score_col="median_fpts",
        num_lineups=3,
        salary_cap=50000,
        max_overlap=4,
        mode="se_3max",
    )
    assert len(lineups) == 3
    name_sets = []
    for lu in lineups:
        assert lu["total_salary"] <= 50000
        assert lu["salary_remaining"] == 50000 - lu["total_salary"] >= 0
        roster = lu["roster"]
        assert len(roster) == 6
        assert roster[0]["slot"] == "CPT (1.5x)"
        assert len({r["team"] for r in roster}) >= 2
        name_sets.append({r["player"] for r in roster})
    for i in range(len(name_sets)):
        for j in range(i + 1, len(name_sets)):
            assert len(name_sets[i] & name_sets[j]) <= 4


def test_all_week10_slate_packets_enforce_50k_salary_cap():
    """Verify all 4 Week 10 slate packets obey $50,000 salary cap across every archetype."""
    w10_dir = REPO_ROOT / "docs" / "dfs" / "research" / "2026-11-15"
    packet_files = [
        w10_dir / "week10_afternoon_classic_packet.json",
        w10_dir / "week10_main_lateswap_classic_packet.json",
        w10_dir / "week10_snf_pit_cin_showdown_packet.json",
        w10_dir / "week10_mnf_lac_bal_showdown_packet.json",
    ]
    for path in packet_files:
        assert path.is_file(), f"Missing DFS packet JSON: {path}"
        packet = json.loads(path.read_text(encoding="utf-8"))
        archetypes = packet["archetypes"]
        for single_key in ("cash_optimal", "chalk_benchmark"):
            lu = archetypes[single_key]
            assert lu["total_salary"] <= 50000, (
                f"{path.name} {single_key} exceeded cap: {lu['total_salary']}"
            )
            assert lu["salary_remaining"] >= 0
        for multi_key in ("se_3max_optimal", "mme_20max_portfolio"):
            lus = archetypes[multi_key]
            assert len(lus) >= 1, f"{path.name} {multi_key} empty"
            for lu in lus:
                assert lu["total_salary"] <= 50000, (
                    f"{path.name} {multi_key} #{lu.get('lineup_index')} exceeded cap: "
                    f"{lu['total_salary']}"
                )
                assert lu["salary_remaining"] >= 0
