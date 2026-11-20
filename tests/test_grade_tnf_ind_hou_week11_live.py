from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scripts.ops.grade_tnf_ind_hou_week11_live import (
    OFFICIAL_24_PROPS,
    compute_dk_showdown_player_points,
    grade_espn_summary,
    render_markdown_ledger,
)


def _mock_summary(
    *,
    completed: bool,
    period: int,
    status_name: str,
    ind_q: list[int],
    hou_q: list[int],
    plays: list[dict[str, Any]],
    hou_passing: list[list[Any]] | None = None,
    hou_receiving: list[list[Any]] | None = None,
    hou_rushing: list[list[Any]] | None = None,
    hou_kicking: list[list[Any]] | None = None,
    hou_def: list[list[Any]] | None = None,
    ind_passing: list[list[Any]] | None = None,
    ind_receiving: list[list[Any]] | None = None,
    ind_def: list[list[Any]] | None = None,
) -> dict[str, Any]:
    return {
        "header": {
            "competitions": [
                {
                    "status": {
                        "period": period,
                        "displayClock": "0:00" if completed else "4:12",
                        "type": {
                            "name": status_name,
                            "state": "post" if completed else "in",
                            "completed": completed,
                            "detail": "Final" if completed else f"Q{period} 4:12",
                        },
                    },
                    "competitors": [
                        {
                            "homeAway": "away",
                            "team": {"abbreviation": "IND"},
                            "score": str(sum(ind_q)),
                            "linescores": [{"displayValue": str(x)} for x in ind_q],
                        },
                        {
                            "homeAway": "home",
                            "team": {"abbreviation": "HOU"},
                            "score": str(sum(hou_q)),
                            "linescores": [{"displayValue": str(x)} for x in hou_q],
                        },
                    ],
                }
            ]
        },
        "drives": {
            "previous": [{"id": "drv_1", "plays": plays}],
            "current": {},
        },
        "boxscore": {
            "players": [
                {
                    "team": {"abbreviation": "IND"},
                    "statistics": [
                        {
                            "name": "passing",
                            "keys": [
                                "completions/passingAttempts",
                                "passingYards",
                                "yardsPerPassAttempt",
                                "passingTouchdowns",
                                "interceptions",
                            ],
                            "athletes": ind_passing or [],
                        },
                        {
                            "name": "receiving",
                            "keys": [
                                "receptions",
                                "receivingYards",
                                "yardsPerReception",
                                "receivingTouchdowns",
                                "longReception",
                                "receivingTargets",
                            ],
                            "athletes": ind_receiving or [],
                        },
                        {
                            "name": "defensive",
                            "keys": ["totalTackles", "soloTackles", "sacks"],
                            "athletes": ind_def or [],
                        },
                    ],
                },
                {
                    "team": {"abbreviation": "HOU"},
                    "statistics": [
                        {
                            "name": "passing",
                            "keys": [
                                "completions/passingAttempts",
                                "passingYards",
                                "yardsPerPassAttempt",
                                "passingTouchdowns",
                                "interceptions",
                            ],
                            "athletes": hou_passing or [],
                        },
                        {
                            "name": "rushing",
                            "keys": [
                                "rushingAttempts",
                                "rushingYards",
                                "yardsPerRushAttempt",
                                "rushingTouchdowns",
                                "longRushing",
                            ],
                            "athletes": hou_rushing or [],
                        },
                        {
                            "name": "receiving",
                            "keys": [
                                "receptions",
                                "receivingYards",
                                "yardsPerReception",
                                "receivingTouchdowns",
                                "longReception",
                                "receivingTargets",
                            ],
                            "athletes": hou_receiving or [],
                        },
                        {
                            "name": "kicking",
                            "keys": [
                                "fieldGoalsMade/fieldGoalAttempts",
                                "fieldGoalPct",
                                "longFieldGoalMade",
                                "extraPointsMade/extraPointAttempts",
                                "totalKickingPoints",
                            ],
                            "athletes": hou_kicking or [],
                        },
                        {
                            "name": "defensive",
                            "keys": ["totalTackles", "soloTackles", "sacks"],
                            "athletes": hou_def or [],
                        },
                    ],
                },
            ]
        },
    }


def _ath(name: str, stats: list[Any]) -> dict[str, Any]:
    return {"athlete": {"displayName": name}, "stats": [str(x) for x in stats]}


def test_early_cash_detection_q2_in_progress():
    plays = [
        {
            "id": "p1",
            "period": {"number": 1},
            "type": {"text": "Pass Reception"},
            "text": "(11:10 - 1st) C.Stroud pass short right to X.Hutchinson to HOU 45 for 12 yards.",
        },
        {
            "id": "p2",
            "period": {"number": 1},
            "type": {"text": "Pass Reception"},
            "text": "(08:05 - 1st) D.Jones pass short middle to T.Warren to IND 39 for 14 yards.",
        },
        {
            "id": "p3",
            "period": {"number": 1},
            "type": {"text": "Pass Reception"},
            "text": "(06:00 - 1st) PENALTY No Play C.Stroud pass short right to X.Hutchinson for 20 yards.",
        },
    ]
    summary = _mock_summary(
        completed=False,
        period=2,
        status_name="STATUS_IN_PROGRESS",
        ind_q=[3, 0],
        hou_q=[7, 7],
        plays=plays,
        hou_passing=[_ath("C.J. Stroud", ["23/31", "268", "8.6", "2", "0"])],
        hou_receiving=[
            _ath("Xavier Hutchinson", ["2", "25", "12.5", "0", "13", "3"]),
            _ath("Dalton Schultz", ["3", "34", "11.3", "1", "16", "4"]),
        ],
        hou_rushing=[_ath("David Montgomery", ["12", "44", "3.7", "1", "11"])],
    )
    report = grade_espn_summary(summary)
    by_rank = {p["rank"]: p for p in report["props_24"]}

    assert len(report["props_24"]) == 24
    # 1Q finished (period=2), 1Q total = 10 > 7.5 -> settled WIN
    assert by_rank[14]["status"] == "WIN"
    # Hutchinson 1Q rec yds = 12 (No Play ignored) > 4.5 -> WIN
    assert by_rank[9]["actual"] == 12.0
    assert by_rank[9]["status"] == "WIN"
    # Stroud Over 1.5 Pass TDs & 253.5 Pass Yds already passed line while Q2 live -> CASHED_EARLY
    assert by_rank[1]["status"] == "CASHED_EARLY"
    assert by_rank[2]["status"] == "CASHED_EARLY"
    # CJ Allen Under 4.5 Solo Tackles remains PENDING until final whistle
    assert by_rank[19]["status"] == "PENDING"


def test_final_settlement_and_dk_showdown_scoring():
    plays = [
        {
            "id": "p1",
            "period": {"number": 1},
            "type": {"text": "Pass Reception"},
            "text": "C.Stroud pass short left to X.Hutchinson to HOU 48 for 9 yards.",
        },
        {
            "id": "p2",
            "period": {"number": 1},
            "type": {"text": "Pass Reception"},
            "text": "D.Jones pass short right to T.Warren to IND 38 for 8 yards.",
        },
        {
            "id": "p2b",
            "period": {"number": 2},
            "type": {"text": "Pass Reception"},
            "text": "D.Jones pass short middle to T.Warren to IND 49 for 11 yards.",
        },
        {
            "id": "p3",
            "period": {"number": 2},
            "type": {"text": "Pass Reception"},
            "text": "C.Stroud pass short middle to D.Schultz to IND 22 for 18 yards.",
        },
        {
            "id": "p4",
            "period": {"number": 2},
            "type": {"text": "Field Goal Good"},
            "text": "K.Fairbairn 51 yard field goal is GOOD.",
        },
    ]
    summary = _mock_summary(
        completed=True,
        period=4,
        status_name="STATUS_FINAL",
        ind_q=[3, 7, 3, 0],
        hou_q=[7, 10, 7, 7],
        plays=plays,
        ind_passing=[_ath("Daniel Jones", ["20/34", "195", "5.7", "1", "1"])],
        ind_receiving=[_ath("Tyler Warren", ["6", "58", "9.7", "0", "15", "8"])],
        ind_def=[
            _ath("CJ Allen", ["9", "3", "0"]),
            _ath("Cam Bynum", ["5", "3", "0"]),
        ],
        hou_passing=[_ath("C.J. Stroud", ["25/34", "310", "9.1", "3", "0"])],
        hou_rushing=[_ath("David Montgomery", ["18", "72", "4.0", "1", "11"])],
        hou_receiving=[
            _ath("Nico Collins", ["6", "105", "17.5", "1", "32", "9"]),
            _ath("Dalton Schultz", ["4", "42", "10.5", "1", "18", "5"]),
            _ath("Xavier Hutchinson", ["4", "49", "12.3", "0", "19", "5"]),
            _ath("Tank Dell", ["3", "44", "14.7", "1", "26", "4"]),
        ],
        hou_kicking=[_ath("Ka'imi Fairbairn", ["1/1", "100.0", "51", "4/4", "7"])],
        hou_def=[_ath("Will Anderson Jr.", ["4", "3", "1.5"])],
    )
    report = grade_espn_summary(summary)
    assert len(OFFICIAL_24_PROPS) == 24
    # In this fixture every one of the 24 props wins (12 + 12 = 24)
    assert report["summary_record"]["wins_or_cashed_early"] == 24
    assert report["summary_record"]["losses"] == 0
    assert report["summary_record"]["record_str"] == "24-0-0"

    # DK Showdown scoring check: Stroud 310 pass yds (12.4 + 3 bonus) + 3 TD (12) = 27.4 * 1.5 CPT = 41.10
    stroud_cpt = compute_dk_showdown_player_points(
        {"passingYards": 310.0, "passingTouchdowns": 3.0}, is_captain=True
    )
    assert stroud_cpt == 41.10
    assert report["dk_showdown"]["cash_optimal"]["actual_points"] > 100.0

    # Pure 7-bit ASCII check and no % confidence leak in Markdown output
    md = render_markdown_ledger(report)
    assert md.isascii()
    assert json.dumps(report, ensure_ascii=True).isascii()
    assert "/100" in md
