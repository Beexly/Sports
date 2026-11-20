"""Unit tests for intelligence/matchups/matchup_engine.py."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

from intelligence.matchups.matchup_engine import (
    _render_chains_section,
    _render_gaps_section,
    _render_pairings_section,
    _render_signals_section,
    _render_trench_section,
    emit_matchup_md,
)


def test_render_pairings_section():
    sample_pairings = [
        {
            "side": "AWAY-OFF vs HOME-DEF",
            "usage_title": "WR1",
            "receiver": "CeeDee Lamb",
            "receiver_form": {
                "targets": 12,
                "separation_yds": 3.12,
                "yac_over_expected": 1.25,
                "catch_pct": 75.0,
                "air_yard_share": 35.5,
                "usage_basis": "targets",
                "team_vision_soe_yd": 0.25,
                "team_ftn_motion_rate": 45.0,
            },
            "matched_cornerbacks": ["Darius Slay (CB, slot-1, active)"],
            "opposing_coverage_status": {
                "out_or_limited": ["James Bradberry (CB, OUT)"],
                "questionable": [],
            },
            "source_receiver": "ngs/rec.json",
        },
        {
            "side": "AWAY-OFF vs HOME-DEF",
            "usage_title": "RB1",
            "receiver": "Rico Dowdle",
            "receiver_form": {
                "usage_basis": "rush att 15, RYOE +12.3",
            },
            "matched_cornerbacks": [],
            "opposing_coverage_status": {
                "out_or_limited": [],
                "questionable": [],
            },
            "source_receiver": "ngs/rush.json",
        },
    ]

    lines = _render_pairings_section(sample_pairings)
    assert lines[0] == "## Receiver vs coverage pairings"
    text = "\n".join(lines)
    assert "### AWAY-OFF vs HOME-DEF - WR1: CeeDee Lamb" in text
    assert "- targets 12 | separation 3.12 yds | air-yd share 35.5%" in text
    assert "- matched slot-1 corners: Darius Slay (CB, slot-1, active)" in text
    assert "- opposing coverage OUT/limited: James Bradberry (CB, OUT)" in text
    assert "- opposing coverage QUESTIONABLE: (none)" in text
    assert "### AWAY-OFF vs HOME-DEF - RB1: Rico Dowdle" in text
    assert "- rush att 15, RYOE +12.3 [ngs/rush.json]" in text


def test_render_trench_section():
    sample_trench = [
        {
            "side": "AWAY-OL vs HOME-FRONT",
            "ol_starters": ["Tyler Guyton (LT)", "Tyler Smith (LG)"],
            "ol_down": ["Zack Martin (RG, OUT)"],
            "qb_name": "Dak Prescott",
            "qb_ttt": 2.75,
            "vision_pocket_depth_yd": 4.10,
            "qbr_total_qbr": 62.0,
            "snaps_starter_snap_share": 85.0,
            "rb_name": "Rico Dowdle",
            "rb_tlos": 2.70,
            "rb_ryoe": 5.2,
            "front_starters": ["Jalen Carter (DT)", "Josh Sweat (DE)"],
            "vision_art_mean": 0.082,
            "ftn_def_blitz_rate": 18.0,
            "front_active_on_report": ["Bryce Huff (DE)"],
            "front_down": [],
            "front_questionable": ["Jordan Davis (DT, Questionable)"],
            "source_passing": "ngs/pass.json",
            "source_rushing": "ngs/rush.json",
        }
    ]

    lines = _render_trench_section(sample_trench)
    assert lines[0] == "## OL vs pass-rush"
    text = "\n".join(lines)
    assert "### AWAY-OL vs HOME-FRONT" in text
    assert "- offensive line starters: Tyler Guyton (LT), Tyler Smith (LG)" in text
    assert "- OL DOWN/limited: Zack Martin (RG, OUT)" in text
    assert "QB protection anchor: Dak Prescott (2026 NGS time-to-throw: 2.75s" in text
    assert "RB downhill leverage: Rico Dowdle" in text
    assert "defensive front starters: Jalen Carter (DT), Josh Sweat (DE)" in text
    assert "- front ACTIVE (on report): Bryce Huff (DE)" in text
    assert "- front DOWN: (none)" in text
    assert "- front QUESTIONABLE: Jordan Davis (DT, Questionable)" in text


def test_render_signals_section():
    sample_signals = {
        "home": {
            "vision.soe_yd": 0.231,
            "vision.art_mean": 0.077,
            "vision.pocket_depth_yd": 4.27,
            "ftn.play_action_rate": 11.2,
            "ftn.motion_rate": 44.4,
            "ftn.screen_rate": 8.5,
            "ftn.rpo_rate": 6.1,
            "ftn.def_blitz_rate": 15.2,
            "qbr.total_qbr": 55.0,
            "snaps.starter_snap_share": 78.0,
            "cognitive.presser_sentiment": 0.15,
            "cognitive.coach_speak_delta": -0.05,
            "cognitive.scheme_shift": 0.10,
            "cognitive.tendency_break": 0.02,
        },
        "away": {
            "vision.soe_yd": -0.100,
            "vision.art_mean": 0.060,
        },
    }

    lines = _render_signals_section(sample_signals)
    assert lines[0] == "## Sovereign Signal Plane (Vision + FTN + QBR + Snaps + Cognitive)"
    text = "\n".join(lines)
    assert "**HOME**:" in text
    assert "`vision.soe_yd=+0.231 yd`" in text
    assert "`cognitive.tendency_break=+0.02`" in text
    assert "**AWAY**:" in text
    assert "`vision.soe_yd=-0.100 yd`" in text


def test_render_chains_section():
    sample_chains = [
        "First chain explanation with [file.json]",
        "Second chain explanation with [other.json]",
    ]
    lines = _render_chains_section(sample_chains)
    assert lines[0] == "## Matchup chains (each cites its file)"
    assert lines[2] == "1. First chain explanation with [file.json]"
    assert lines[3] == "2. Second chain explanation with [other.json]"


def test_render_gaps_section():
    assert _render_gaps_section([]) == []

    sample_gaps = ["Gap 1: missing data", "Gap 2: unreadable file"]
    lines = _render_gaps_section(sample_gaps)
    assert lines[0] == "## Honest gaps"
    assert lines[2] == "- Gap 1: missing data"
    assert lines[3] == "- Gap 2: unreadable file"


def test_emit_matchup_md_unit(tmp_path: Path):
    mock_report = {
        "game": "DAL@PHI",
        "generated_utc": "2026-10-18T12:00:00+00:00",
        "gaps": ["Sample gap"],
        "pairings": [],
        "ol_vs_rush": None,
        "trench_matchups": [],
        "sovereign_signals": {"home": {}, "away": {}},
        "chains": ["Chain 1"],
    }

    with patch("intelligence.matchups.matchup_engine.build_matchups", return_value=mock_report):
        with patch("intelligence.matchups.matchup_engine.OUTROOT", tmp_path):
            out_path, rep = emit_matchup_md("PHI", "DAL", date="2026-10-18")
            assert out_path.exists()
            assert out_path.name == "DAL@PHI-matchups.md"
            assert rep["game"] == "DAL@PHI"
            assert rep["path"] == str(out_path)
            content = out_path.read_text(encoding="utf-8")
            assert "# DAL@PHI - Matchup Report" in content
            assert "## Receiver vs coverage pairings" in content
            assert "## OL vs pass-rush" in content
            assert "## Sovereign Signal Plane" in content
            assert "## Matchup chains" in content
            assert "1. Chain 1" in content
            assert "## Honest gaps" in content
            assert "- Sample gap" in content
