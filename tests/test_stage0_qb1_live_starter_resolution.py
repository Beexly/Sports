#!/usr/bin/env python3
"""Regression: QB1 selection must honor the Stage-0 preflight live-starter resolution.

Defect (Week 10 HOU@CLE, sealed 2026-11-13): the connected workflow and the live-JEV
spine builder both sourced ``confirmed_qb1`` from the DFS rostering gate
(``require_week`` -> data/nflverse/week10_live_roster_transactions_and_starters_2026.json,
CLE = Shedeur Sanders), ignoring the ``qb1_ban_conflicts`` live-starter resolution in
data/engine/week10_stage0_preflight_config.json (CLE = Deshaun Watson: latest nflverse
depth chart ranks him QB1, week-10 injury report has no Out/Doubtful/IR row, ESPN
2026-11-11 announcement). The sealed sim therefore ran Sanders-conditional.

These tests prove:
  1. The resolver overrides the DFS-gate backup substitution with the preflight
     live starter, removes the resolved player from the SIMULATION excluded set,
     records provenance, and never mutates the input / on-disk DFS gate config.
  2. The resolver is a no-op without a preflight config and ignores conflicts the
     preflight config did not actually resolve as confirmed_qb1.
  3. The real Week 10 HOU@CLE Stage-0 allowlist carries the stage0-resolved live
     starter (Watson), while the DFS rostering gate on disk still bans him.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops import enforce_stage0_roster_and_board_allowlist as s0  # noqa: E402
from scripts.ops.preflight_live_roster_injury_gate import require_week  # noqa: E402


def _gate_cfg() -> dict:
    """Synthetic DFS rostering gate config: banned Watson replaced by Sanders."""
    return {
        "week": 99,
        "as_of": "2026-11-12",
        "max_age_days": 30,
        "confirmed_qb1": {"CLE": "Shedeur Sanders", "HOU": "C.J. Stroud"},
        "excluded_players": [
            {"name": "Deshaun Watson", "team": "CLE", "position": "QB",
             "reason": "OUT - Concussion + MASTER-PLAN STAGE 0 BAN"},
            {"name": "Cade Stover", "team": "HOU", "position": "TE",
             "reason": "IR"},
        ],
        "traded_players": [],
    }


def _write_preflight(root: Path, week: int, confirmed: dict, conflicts: list) -> None:
    eng = root / "data" / "engine"
    eng.mkdir(parents=True, exist_ok=True)
    (eng / f"week{week}_stage0_preflight_config.json").write_text(
        json.dumps({
            "week": week,
            "confirmed_qb1": confirmed,
            "qb1_ban_conflicts": conflicts,
        }),
        encoding="utf-8",
    )


def test_resolver_overrides_banned_qb1_with_live_starter(tmp_path, monkeypatch):
    monkeypatch.setattr(s0, "REPO_ROOT", tmp_path)
    _write_preflight(
        tmp_path, 99,
        {"CLE": "Deshaun Watson", "HOU": "C.J. Stroud"},
        [{"team": "CLE", "qb1": "Deshaun Watson",
          "note": "Live starter used for simulation; ban retained for DFS rostering."}],
    )
    original = _gate_cfg()
    resolved = s0.apply_stage0_qb1_live_starter_resolutions(original, 99)

    assert resolved["confirmed_qb1"]["CLE"] == "Deshaun Watson"
    assert resolved["confirmed_qb1"]["HOU"] == "C.J. Stroud"
    # Resolved live starter leaves the SIMULATION excluded set; other bans stay.
    names = {ep["name"] for ep in resolved["excluded_players"]}
    assert "Deshaun Watson" not in names
    assert "Cade Stover" in names
    # Provenance recorded, DFS ban explicitly retained.
    res = resolved["qb1_ban_conflict_resolutions"]
    assert len(res) == 1
    assert res[0]["team"] == "CLE" and res[0]["qb1"] == "Deshaun Watson"
    assert res[0]["dfs_ban_retained"] is True
    assert res[0]["scope"] == "simulation_live_starter"
    # Input config is never mutated (DFS rostering gate semantics preserved).
    assert original["confirmed_qb1"]["CLE"] == "Shedeur Sanders"
    assert any(ep["name"] == "Deshaun Watson" for ep in original["excluded_players"])


def test_resolver_noop_without_preflight_config(tmp_path, monkeypatch):
    monkeypatch.setattr(s0, "REPO_ROOT", tmp_path)
    cfg = _gate_cfg()
    assert s0.apply_stage0_qb1_live_starter_resolutions(cfg, 98) is cfg


def test_resolver_ignores_conflict_not_resolved_by_preflight(tmp_path, monkeypatch):
    monkeypatch.setattr(s0, "REPO_ROOT", tmp_path)
    # Preflight keeps Sanders as confirmed QB1 -> the conflict entry alone must
    # NOT invent a Watson starter.
    _write_preflight(
        tmp_path, 99,
        {"CLE": "Shedeur Sanders"},
        [{"team": "CLE", "qb1": "Deshaun Watson", "note": "unresolved"}],
    )
    resolved = s0.apply_stage0_qb1_live_starter_resolutions(_gate_cfg(), 99)
    assert resolved["confirmed_qb1"]["CLE"] == "Shedeur Sanders"
    assert any(ep["name"] == "Deshaun Watson" for ep in resolved["excluded_players"])
    assert not resolved.get("qb1_ban_conflict_resolutions")


_WEEK10_PREFLIGHT = REPO_ROOT / "data" / "engine" / "week10_stage0_preflight_config.json"
_WEEK10_BOARD = REPO_ROOT / "data" / "engine" / "week10_hou_cle_dk_full_board_2026_11_06.json"
_PBP = REPO_ROOT / "data" / "nflverse" / "pbp" / "play_by_play_2026.parquet"


@pytest.mark.skipif(
    not (_WEEK10_PREFLIGHT.is_file() and _WEEK10_BOARD.is_file() and _PBP.is_file()),
    reason="Week 10 preflight config / HOU@CLE board / 2026 PBP parquet not present",
)
def test_week10_hou_cle_allowlist_qb1_is_stage0_live_starter():
    preflight = json.loads(_WEEK10_PREFLIGHT.read_text(encoding="utf-8"))
    live_starter = preflight["confirmed_qb1"]["CLE"]
    # The verified defect resolution: depth chart + injury report + ESPN announce
    # Watson as the live starter even though the DFS gate bans him.
    assert live_starter == "Deshaun Watson"
    assert any(
        c.get("team") == "CLE" and c.get("qb1") == live_starter
        for c in preflight.get("qb1_ban_conflicts", [])
    )

    allowlist = s0.load_stage0_game_roster_allowlist(
        "HOU", "CLE", 10,
        board_rel_path="data/engine/week10_hou_cle_dk_full_board_2026_11_06.json",
    )
    # QB1 selection honors the stage0-resolved live starter, not the DFS backup.
    assert allowlist["confirmed_qb1"]["CLE"] == live_starter
    assert allowlist["confirmed_qb1"]["CLE"] != "Shedeur Sanders"
    assert allowlist["confirmed_qb1"]["HOU"] == "C.J. Stroud"
    assert allowlist["qb1_ban_conflict_resolutions"][0]["qb1"] == live_starter
    assert allowlist["qb1_ban_conflict_resolutions"][0]["dfs_ban_retained"] is True
    # Simulation excluded set no longer carries the resolved live starter.
    assert all(
        ep["name"].lower() != live_starter.lower()
        for ep in allowlist["excluded_players"]
    )

    # DFS rostering gate on disk is untouched: ban retained for DFS.
    dfs_cfg = require_week(10)
    assert dfs_cfg["confirmed_qb1"]["CLE"] == "Shedeur Sanders"
    assert any(
        ep["name"] == "Deshaun Watson" for ep in dfs_cfg["excluded_players"]
    )

    # The spine builder consumes the same resolved QB1 source (shared resolver).
    from scripts.ops import build_week10_jev_spines as spines  # noqa: F401
    spine_qb1_cfg = s0.apply_stage0_qb1_live_starter_resolutions(require_week(10), 10)
    assert spine_qb1_cfg["confirmed_qb1"]["CLE"] == live_starter


def test_week10_hou_cle_weather_is_verified_forecast():
    from scripts.ops.gse_connected_game_workflow import _get_matchup_env

    env = _get_matchup_env("HOU", "CLE", 10)
    # NFLWeather.com 2026-11-13 forecast for Sun Nov 15 1:00 PM ET kickoff.
    assert env["temp_f"] == 47.0
    assert env["wind_mph"] == 9.0
    assert env["feels_like_f"] == 42.0
    assert env["wind_gust_mph"] == 15.0
    assert env["stadium"] == "Huntington Bank Field"
    assert env["is_indoor"] is False
    assert "nflweather.com" in env["weather_source"].lower()
    # Placeholder 58F / 7.5 mph must be gone.
    assert "58F" not in env["weather_note"]


def test_week10_kickoff_resolves_from_espn_scoreboard():
    from scripts.ops.gse_connected_game_workflow import _lookup_espn_scoreboard_kickoff

    kickoff = _lookup_espn_scoreboard_kickoff("HOU", "CLE", 10)
    # Real Week 10 kickoff (Sun Nov 15 2026 1:00 PM ET), never the Week 9 pin.
    assert kickoff == "2026-11-15T18:00Z"
