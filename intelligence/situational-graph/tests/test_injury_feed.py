"""Tests for the stamped injury feed -> situational graph loader wiring.

Proves:
  * stamped rows (pulled_at = the feed's stamp of record) produce
    injury_burden edges stamped as_of = the latest contributing pulled_at;
  * unstamped rows keep honest-emptying BYTE-FOR-BYTE as before the fix
    (the shipped v1 instance's injury entry is the pinned expectation);
  * reported_at alone never stamps a row for the graph;
  * rows pulled after the gameday fail closed (injury_after_kickoff);
  * PIT: a read before the pull does not see the injury edges
    (graph.visible_at semantics on the stamped instance).

Run from the repo root:  python3 -m pytest intelligence/situational-graph/tests/test_injury_feed.py -q
"""

import json
import sys
from pathlib import Path

PKG = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PKG))

import graph as graph_mod  # noqa: E402
import builder as builder_mod  # noqa: E402

REGISTRY = graph_mod.load_registry(PKG / "edge_types.json")
GAMES = [
    {"game_id": "2026_06_SEA_DEN", "season": 2026, "game_type": "REG", "week": 6,
     "gameday": "2026-10-15", "away_team": "SEA", "home_team": "DEN",
     "rest_away": 4, "rest_home": 4, "rest_diff": 0, "roof": "outdoors", "surface": "grass"},
]
PULLED = "2026-10-15T11:36:00-04:00"

PULLED_STAMPED = (
    "season,season_type,game_type,team,week,gsis_id,position,full_name,"
    "report_primary_injury,report_status,report_status_raw,reported_at,pulled_at,source\n"
    "2026,REG,REG,DEN,6,,CB,Test Corner,Ankle,Out,Out,2026-10-15,%s,espn-nfl-injuries\n"
    "2026,REG,REG,SEA,6,,RB,Test Runner,Knee,Out,Out,2026-10-15,%s,espn-nfl-injuries\n"
    % (PULLED, PULLED)
)

UNSTAMPED = (
    "season,season_type,game_type,team,week,gsis_id,position,full_name,"
    "report_primary_injury,report_status,practice_status\n"
    "2026,REG,REG,DEN,6,,CB,Test Corner,Ankle,Out,\n"
)

REPORTED_ONLY = (
    "team,week,gsis_id,position,full_name,report_status,reported_at,source\n"
    "DEN,6,,CB,Test Corner,Out,2026-10-14,espn-nfl-injuries\n"
)

AFTER_GAMEDAY = (
    "team,week,gsis_id,position,full_name,report_status,pulled_at,source\n"
    "DEN,6,,CB,Test Corner,Out,2026-10-16T09:00:00-04:00,espn-nfl-injuries\n"
)


def _build(tmp_path, csv_text, name="injuries.csv"):
    p = tmp_path / name
    p.write_text(csv_text)
    b = builder_mod.Builder(REGISTRY, 2026, 6)
    b.build_structure(GAMES)
    b.build_injuries(GAMES, str(p))
    return b.finish()


def _injury_edges(g):
    return [e for e in g["edges"] if e["type"] == "injury_burden"]


def test_pulled_at_stamps_injury_edges(tmp_path):
    g = _build(tmp_path, PULLED_STAMPED)
    edges = _injury_edges(g)
    assert len(edges) == 2
    for e in edges:
        # the edge is knowable from the pull, not from the report date
        assert e["as_of"] == PULLED
        assert e["source"]["kind"] == "injury_report"
    burdens = {e["from"]: e["value"]["burden"] for e in edges}
    assert burdens == {"team:DEN": 0.8, "team:SEA": 0.5}  # CB Out 0.8; RB Out 0.5
    assert not [h for h in g["honest_empty"] if h["edge_type"] == "injury_burden"]


def test_unstamped_honest_empty_byte_for_byte(tmp_path):
    # named as the shipped instance's input was: the reason string carries
    # the input basename, so byte-for-byte means the same basename too
    g = _build(tmp_path, UNSTAMPED, name="injuries_2026.csv")
    assert _injury_edges(g) == []
    entries = [h for h in g["honest_empty"] if h["edge_type"] == "injury_burden"]
    assert len(entries) == 1
    shipped = json.loads((PKG / "instances" / "2026-week06-sea-at-den.json").read_text())
    shipped_entries = [h for h in shipped["honest_empty"] if h["edge_type"] == "injury_burden"]
    assert entries == shipped_entries  # identical entry, identical reason


def test_reported_at_alone_does_not_stamp(tmp_path):
    g = _build(tmp_path, REPORTED_ONLY)
    assert _injury_edges(g) == []
    assert [h for h in g["honest_empty"] if h["edge_type"] == "injury_burden"]


def test_pull_after_gameday_fails_closed(tmp_path):
    g = _build(tmp_path, AFTER_GAMEDAY)
    assert _injury_edges(g) == []
    assert g["diagnostics"]["failed_closed"].get("injury_after_kickoff") == 1


def test_pit_read_before_the_pull_sees_no_injury_edges():
    g = json.loads((PKG / "instances" / "2026-week06-sea-at-den-stamped.json").read_text())
    before = graph_mod.visible_at(g, "2026-10-15T10:00:00-04:00")  # before the 11:36 ET pull
    after = graph_mod.visible_at(g, "2026-10-15T12:00:00-04:00")
    assert _injury_edges(before) == []
    assert len(_injury_edges(after)) == 2
    # and the shipped stamped instance is the fixture game's real shape
    dens = [e for e in _injury_edges(g) if e["from"] == "team:DEN"][0]
    assert dens["value"]["burden"] == 3.0
    players = {c["player"] for c in dens["value"]["contributors"]}
    assert "player:Pat-Surtain-II" in players and "player:Riley-Moss" in players
