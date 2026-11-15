#!/usr/bin/env python3
"""
tests/test_week10_dfs_zero_inactive_gate.py

Phase-3 / Phase-4 fail-closed DFS launch gate for NFL Week 10 (2026-11-15).

Asserts ZERO inactive / IR / wrong-team players across every lineup in the
Week-10 DFS suite, driven by the Stage-0 live roster config (as_of 2026-11-13)
and the week-10 injury report. Covers:
  - data/dfs/week10_munich_showdown_ne_det_2026_11_15.json
  - data/dfs/week10_sunday_main_slate_pool_and_lineups_2026_11_15.json
  - data/dfs/week10_snf_pit_cin_and_mnf_lac_bal_showdown_2026_11_15.json

Checks per player:
  1. Not on the Stage-0 excluded_players list (IR / out / ruled-off).
  2. Not listed with a week-10 report_status of Out / Doubtful / IR.
  3. Not rostered on a pre-trade team (traded_players from-team).
  4. Team agrees with the week-10 injury-report team (wrong-team guard).
  5. Showdown packets only contain players from the two matchup teams.

The extractor is schema-robust: it walks any nested lineup / pool / core
structure and collects records that carry a player name plus a team.
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

ROSTER_CFG_PATH = (
    REPO_ROOT / "data" / "nflverse" / "week10_live_roster_transactions_and_starters_2026.json"
)
INJURIES_CSV = REPO_ROOT / "data" / "nflverse" / "injuries_2026.csv"

WEEK10_DFS_FILES = {
    "munich_showdown": (
        REPO_ROOT / "data" / "dfs" / "week10_munich_showdown_ne_det_2026_11_15.json",
        {"NE", "DET"},
    ),
    "sunday_main": (
        REPO_ROOT / "data" / "dfs" / "week10_sunday_main_slate_pool_and_lineups_2026_11_15.json",
        None,  # full main slate: no two-team restriction
    ),
    "primetime_showdowns": (
        REPO_ROOT / "data" / "dfs" / "week10_snf_pit_cin_and_mnf_lac_bal_showdown_2026_11_15.json",
        {"PIT", "CIN", "LAC", "BAL"},
    ),
}

_NAME_KEYS = ("player", "name", "full_name", "athlete", "player_name")
_TEAM_KEYS = ("team", "team_abbr", "teamAbbrev", "nfl_team")
_POS_KEYS = ("position", "pos", "roster_position")
_INACTIVE_STATUSES = {"OUT", "IR", "INJURED RESERVE", "DOUBTFUL", "PUP", "NFI", "SUSPENDED"}


def _norm_name(s: str) -> str:
    parts = [
        w
        for w in str(s).lower().replace(".", "").replace(",", "").split()
        if w not in ("jr", "sr", "ii", "iii", "iv")
    ]
    return " ".join(parts)


def extract_dfs_players(obj, _depth: int = 0) -> list[dict]:
    """Recursively collect every record that carries a player name and a team."""
    found: list[dict] = []
    if _depth > 12:
        return found
    if isinstance(obj, dict):
        name = next((obj[k] for k in _NAME_KEYS if isinstance(obj.get(k), str) and obj[k].strip()), None)
        team = next((obj[k] for k in _TEAM_KEYS if isinstance(obj.get(k), str) and obj[k].strip()), None)
        if name and team:
            pos = next((obj[k] for k in _POS_KEYS if isinstance(obj.get(k), str)), "")
            found.append({"name": name.strip(), "team": team.strip().upper(), "position": pos.strip().upper()})
        for v in obj.values():
            found.extend(extract_dfs_players(v, _depth + 1))
    elif isinstance(obj, list):
        for v in obj:
            found.extend(extract_dfs_players(v, _depth + 1))
    return found


def load_roster_cfg() -> dict:
    return json.loads(ROSTER_CFG_PATH.read_text(encoding="utf-8"))


def load_week10_injuries() -> dict:
    """normalized name -> {team, report_status} for week 10."""
    out: dict = {}
    if not INJURIES_CSV.is_file():
        return out
    with INJURIES_CSV.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            try:
                if int(row.get("week", 0)) != 10:
                    continue
            except (TypeError, ValueError):
                continue
            nm = _norm_name(row.get("full_name", ""))
            if not nm:
                continue
            out[nm] = {
                "team": str(row.get("team", "")).upper(),
                "report_status": str(row.get("report_status", "") or "").strip().upper(),
            }
    return out


def validate_players(players: list[dict], cfg: dict, injuries: dict, allowed_teams=None) -> list[str]:
    excluded = {_norm_name(p["name"]) for p in cfg.get("excluded_players", [])}
    traded = {_norm_name(p["name"]): p for p in cfg.get("traded_players", [])}
    violations: list[str] = []
    seen = set()
    for p in players:
        nm = _norm_name(p["name"])
        team = p["team"]
        key = (nm, team)
        if key in seen:
            continue
        seen.add(key)
        if nm in excluded:
            violations.append(f"EXCLUDED/IR: {p['name']} ({team}) on Stage-0 excluded list")
        if nm in traded and team == str(traded[nm].get("from", "")).upper():
            violations.append(f"WRONG-TEAM(traded): {p['name']} rostered on pre-trade team {team}")
        inj = injuries.get(nm)
        if inj:
            if inj["report_status"] in _INACTIVE_STATUSES:
                violations.append(f"INACTIVE({inj['report_status']}): {p['name']} ({team})")
            if inj["team"] and team and inj["team"] != team:
                violations.append(f"WRONG-TEAM: {p['name']} listed {team} but week-10 report team {inj['team']}")
        if allowed_teams is not None and team not in allowed_teams:
            violations.append(f"SHOWDOWN-OFF-SLATE: {p['name']} ({team}) not in {sorted(allowed_teams)}")
    return violations


# --- Logic self-tests (run now, independent of antigravity's DFS generation) ---

def test_extractor_finds_players_in_week9_reference_pool():
    ref = REPO_ROOT / "data" / "dfs" / "gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json"
    if not ref.is_file():
        pytest.skip("week9 reference pool not present")
    players = extract_dfs_players(json.loads(ref.read_text(encoding="utf-8")))
    assert len(players) >= 20, f"extractor found too few players: {len(players)}"
    assert all(p["name"] and p["team"] for p in players)


def test_validator_catches_synthetic_violations():
    cfg = {
        "excluded_players": [{"name": "Some IR Guy"}],
        "traded_players": [{"name": "Traded Star", "from": "AAA", "to": "BBB"}],
    }
    injuries = {
        _norm_name("Hurt Starter"): {"team": "CCC", "report_status": "OUT"},
        _norm_name("Moved Player"): {"team": "DDD", "report_status": ""},
    }
    players = [
        {"name": "Some IR Guy", "team": "XXX", "position": "RB"},
        {"name": "Traded Star", "team": "AAA", "position": "WR"},
        {"name": "Hurt Starter", "team": "CCC", "position": "QB"},
        {"name": "Moved Player", "team": "EEE", "position": "TE"},
        {"name": "Clean Player", "team": "FFF", "position": "WR"},
    ]
    v = validate_players(players, cfg, injuries, allowed_teams={"CCC", "FFF", "XXX", "AAA", "EEE"})
    assert any("EXCLUDED/IR" in x for x in v)
    assert any("WRONG-TEAM(traded)" in x for x in v)
    assert any("INACTIVE(OUT)" in x for x in v)
    assert any("WRONG-TEAM" in x for x in v)
    assert not any("Clean Player" in x for x in v)


# --- Fail-closed Week-10 launch gate (passes once DFS suite is generated) ---

@pytest.mark.parametrize("label", list(WEEK10_DFS_FILES.keys()))
def test_week10_dfs_zero_inactive(label):
    path, allowed_teams = WEEK10_DFS_FILES[label]
    assert path.is_file(), f"MISSING Week-10 DFS file (fail-closed): {path.name}"
    cfg = load_roster_cfg()
    assert int(cfg["week"]) == 10, "roster config is not week 10"
    injuries = load_week10_injuries()
    players = extract_dfs_players(json.loads(path.read_text(encoding="utf-8")))
    assert players, f"No players extracted from {path.name}"
    violations = validate_players(players, cfg, injuries, allowed_teams)
    assert not violations, f"{label}: {len(violations)} inactive/IR/wrong-team violations:\n" + "\n".join(violations[:40])