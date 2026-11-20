from __future__ import annotations

import pytest

from scripts.ops.verify_t75_qb1_and_actives_gate import verify_prelock_roster_and_qb1_truth


def test_premature_weekday_injury_creates_dual_branch_instead_of_hard_deletion():
    allowlist = {
        "away": "WSH",
        "home": "NYG",
        "confirmed_qb1": {"WSH": "Jayden Daniels", "NYG": "J.J. McCarthy"},
        "excluded_players": [],
        "verified_board_athletes": {
            "Cam Skattebo": {
                "athlete": "Cam Skattebo",
                "team": "NYG",
                "position": "RB",
                "injury_status": {"report_status": "Out", "practice_status": "Did Not Participate"},
            },
            "Tyler Warren": {
                "athlete": "Tyler Warren",
                "team": "WSH",
                "position": "TE",
                "injury_status": {"report_status": "IR", "practice_status": ""},
            },
        },
    }
    board_props = [
        {"athlete": "Cam Skattebo", "team": "NYG", "position": "RB", "market": "Total Rushing Yards (incl. overtime)", "line": 64.5},
        {"athlete": "J.J. McCarthy", "team": "NYG", "position": "QB", "market": "Total Passing Yards (incl. overtime)", "line": 225.5},
    ]
    res = verify_prelock_roster_and_qb1_truth(
        stage0_allowlist=allowlist,
        board_props=board_props,
        hours_to_kickoff=6.0,
        official_inactives_confirmed=False,
    )
    watch_names = {w["athlete"] for w in res["conditional_branch_watch"]}
    assert "Cam Skattebo" in watch_names
    assert "Cam Skattebo" in res["active_eligible_athletes"]
    assert "Tyler Warren" in res["hard_excluded_athletes"]


def test_t75_qb1_book_cross_check_fails_closed_on_starter_mismatch():
    allowlist = {
        "away": "LAC",
        "home": "BAL",
        "confirmed_qb1": {"LAC": "Justin Herbert", "BAL": "Lamar Jackson"},
        "verified_board_athletes": {},
    }
    board_props = [
        {"athlete": "Justin Herbert", "team": "LAC", "position": "QB", "market": "Total Passing Yards (incl. overtime)", "line": 200.5},
        {"athlete": "Tyler Huntley", "team": "BAL", "position": "QB", "market": "Total Passing Yards (incl. overtime)", "line": 185.5},
    ]
    with pytest.raises(RuntimeError, match="STAGE0_QB1_MISMATCH_WITH_BOOK"):
        verify_prelock_roster_and_qb1_truth(
            stage0_allowlist=allowlist,
            board_props=board_props,
            hours_to_kickoff=1.0,
            official_inactives_confirmed=True,
        )
