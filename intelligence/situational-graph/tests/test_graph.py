"""Tests for the GSE Situational Graph v1.

Proves: PIT/stamp visibility, the no-emission guard, honest-empty paths,
fail-closed refusal of post-kickoff injury stamps, the altitude +
short-week composite, reads requiring stamps, registry completeness, and
that the shipped Week 6 SEA@DEN instance validates and carries no
emission-shaped content anywhere.

Run from the repo root:  python3 -m pytest intelligence/situational-graph/tests/ -q
"""

import json
import sys
from pathlib import Path

import pytest

PKG = Path(__file__).resolve().parents[1]
REPO = PKG.parents[1]
sys.path.insert(0, str(PKG))

import graph as graph_mod  # noqa: E402
import builder as builder_mod  # noqa: E402

REGISTRY = graph_mod.load_registry(PKG / "edge_types.json")

GAMES_FIXTURE = [
    {"game_id": "2026_05_SF_SEA", "season": 2026, "game_type": "REG", "week": 5,
     "gameday": "2026-10-11", "away_team": "SF", "home_team": "SEA",
     "rest_away": 7, "rest_home": 7, "rest_diff": 0, "roof": "outdoors", "surface": "fieldturf"},
    {"game_id": "2026_05_DEN_LAC", "season": 2026, "game_type": "REG", "week": 5,
     "gameday": "2026-10-11", "away_team": "DEN", "home_team": "LAC",
     "rest_away": 7, "rest_home": 7, "rest_diff": 0, "roof": "dome", "surface": "fieldturf"},
    {"game_id": "2026_06_SEA_DEN", "season": 2026, "game_type": "REG", "week": 6,
     "gameday": "2026-10-15", "away_team": "SEA", "home_team": "DEN",
     "rest_away": 4, "rest_home": 4, "rest_diff": 0, "roof": "outdoors", "surface": "grass"},
]

UNSTAMPED_INJURIES = (
    "season,season_type,game_type,team,week,gsis_id,position,full_name,"
    "report_primary_injury,report_status,practice_status\n"
    "2026,REG,REG,SEA,6,00-0000001,QB,Test Passer,,Out,\n"
)

STAMPED_INJURIES = (
    "team,week,gsis_id,position,full_name,report_status,as_of\n"
    "SEA,6,00-0000001,QB,Test Passer,Out,2026-10-14\n"
    "SEA,6,00-0000002,WR,Test Catcher,Questionable,2026-10-14\n"
    "DEN,6,00-0000003,CB,Test Corner,Out,2026-10-16\n"  # after gameday: refused
)


def _write(path, text):
    path.write_text(text)
    return str(path)


def _build(tmp_path, extra_args=(), games=GAMES_FIXTURE, week=6):
    games_path = _write(tmp_path / "games.jsonl",
                        "\n".join(json.dumps(g) for g in games) + "\n")
    out = tmp_path / "graph.json"
    rc = builder_mod.main([
        "--season", "2026", "--week", str(week), "--games", games_path,
        "--venues", str(PKG / "inputs" / "venues.json"),
        "--out", str(out), *extra_args,
    ])
    assert rc == 0
    return json.loads(out.read_text())


def _edges(graph, etype, game=None):
    return [e for e in graph["edges"]
            if e["type"] == etype and (game is None or e["game"] == game)]


# ---------------------------------------------------------------- PIT core

def _mini_graph():
    return {
        "graph": "gse-situational-graph", "version": "1.0",
        "season": 2026, "week": 6,
        "nodes": [
            {"id": "team:SEA", "kind": "team"}, {"id": "team:DEN", "kind": "team"},
            {"id": "game:2026_06_SEA_DEN", "kind": "game"},
            {"id": "venue:DEN", "kind": "venue"}, {"id": "week:2026-06", "kind": "week"},
        ],
        "edges": [
            {"id": "rest:1", "type": "rest_differential", "from": "team:DEN",
             "to": "team:SEA", "game": "2026_06_SEA_DEN",
             "value": {"rest_away_days": 4, "rest_home_days": 4,
                       "rest_diff_home_minus_away": 0,
                       "away_prev_gameday": "2026-10-11", "home_prev_gameday": "2026-10-11"},
             "source": {"kind": "schedule", "ref": "games.jsonl"}, "as_of": "2026-10-11"},
            {"id": "alt:1", "type": "altitude", "from": "team:SEA",
             "to": "venue:DEN", "game": "2026_06_SEA_DEN",
             "value": {"venue_elevation_ft": 5280, "at_altitude": True, "threshold_ft": 4000},
             "source": {"kind": "venue_static", "ref": "venues.json"}, "as_of": None},
        ],
        "honest_empty": [],
    }


def test_pit_visibility():
    g = _mini_graph()
    before = graph_mod.visible_at(g, "2026-10-10")
    assert [e["type"] for e in before["edges"]] == ["altitude"]  # stamped edge hidden
    at = graph_mod.visible_at(g, "2026-10-11")
    assert {e["type"] for e in at["edges"]} == {"altitude", "rest_differential"}
    after = graph_mod.visible_at(g, "2026-12-31")
    assert len(after["edges"]) == 2  # timeless edge visible at every read time


def test_no_emission_guard():
    g = _mini_graph()
    g["edges"][0]["value"]["crps"] = 7.099
    problems = graph_mod.validate_graph(g, REGISTRY)
    assert any("forbidden emission key" in p for p in problems)
    g2 = _mini_graph()
    g2["edges"][0]["value"]["nested"] = {"pick": "SEA"}
    assert any("forbidden emission key" in p for p in graph_mod.validate_graph(g2, REGISTRY))
    assert graph_mod.validate_graph(_mini_graph(), REGISTRY) == []


def test_registry_completeness():
    required = {
        # measured edges named in the construction order
        "injury_burden", "rest_differential", "altitude", "coaching_change",
        "weather_extreme",
        # the six MENTIONED-ONCE situational rows, formalized
        "atmosphere", "layered_revenge", "logistical_disruption",
        "altitude_short_week", "coaching_honesty", "injury_context_identity",
        # the measured families from docs/reasoning/situational-edges.md
        "pressure_matchup", "fourth_down_go_rate", "special_teams_epa",
    }
    assert required <= set(REGISTRY)


# ---------------------------------------------------------------- builder

def test_builder_rest_altitude_composite_and_states(tmp_path):
    g = _build(tmp_path)
    rest = _edges(g, "rest_differential", "2026_06_SEA_DEN")
    assert len(rest) == 1
    assert rest[0]["value"]["rest_away_days"] == 4
    assert rest[0]["value"]["rest_diff_home_minus_away"] == 0
    assert rest[0]["as_of"] == "2026-10-11"  # knowable once both prev games are played

    alt = _edges(g, "altitude", "2026_06_SEA_DEN")
    assert alt and alt[0]["value"]["venue_elevation_ft"] == 5280
    assert alt[0]["as_of"] is None  # static reference: timeless

    comp = _edges(g, "altitude_short_week", "2026_06_SEA_DEN")
    assert len(comp) == 1 and comp[0]["value"]["visitor_rest_days"] == 4

    states = {(e["from"], e["to"]) for e in _edges(g, "has_state", "2026_06_SEA_DEN")}
    assert ("team:SEA", "state:SHORT_WEEK") in states
    assert ("team:DEN", "state:SHORT_WEEK") in states
    assert ("team:SEA", "state:ALTITUDE_VISIT") in states
    assert ("team:SEA", "state:THURSDAY_GAME") in states  # 2026-10-15 is a Thursday

    assert graph_mod.validate_graph(g, REGISTRY) == []


def test_honest_empty_unstamped_injuries(tmp_path):
    csv_path = _write(tmp_path / "injuries.csv", UNSTAMPED_INJURIES)
    g = _build(tmp_path, ["--injuries-csv", csv_path])
    assert _edges(g, "injury_burden") == []
    empties = [h for h in g["honest_empty"] if h["edge_type"] == "injury_burden"]
    assert empties and "no stamp column" in empties[0]["reason"]


def test_injury_burden_stamped_and_fail_closed(tmp_path):
    csv_path = _write(tmp_path / "injuries.csv", STAMPED_INJURIES)
    g = _build(tmp_path, ["--injuries-csv", csv_path])
    sea = [e for e in _edges(g, "injury_burden", "2026_06_SEA_DEN") if e["from"] == "team:SEA"]
    assert len(sea) == 1
    # QB Out = 2.5 x 1.0 ; WR Questionable = 0.7 x 0.25 -> 2.675 (RIL weights)
    assert sea[0]["value"]["burden"] == pytest.approx(2.675)
    assert sea[0]["as_of"] == "2026-10-14"
    assert any(n["kind"] == "player" for n in g["nodes"])
    # the DEN row was stamped after the gameday: refused, counted, no edge
    assert g["diagnostics"]["failed_closed"].get("injury_after_kickoff") == 1
    assert [e for e in _edges(g, "injury_burden") if e["from"] == "team:DEN"] == []


def test_reads_require_stamps(tmp_path):
    reads = {"reads": [
        {"type": "atmosphere", "game_id": "2026_06_SEA_DEN", "team": "SEA",
         "value": {"read": "fixture read", "factors": ["noise"]},
         "source": {"kind": "manual_read", "ref": "test fixture"}, "as_of": "2026-10-14"},
        {"type": "layered_revenge", "game_id": "2026_06_SEA_DEN", "team": "SEA",
         "value": {"read": "unstamped", "layers": []},
         "source": {"kind": "manual_read", "ref": "test fixture"}},  # no as_of -> refused
    ]}
    reads_path = _write(tmp_path / "reads.json", json.dumps(reads))
    g = _build(tmp_path, ["--reads", reads_path])
    assert len(_edges(g, "atmosphere", "2026_06_SEA_DEN")) == 1
    assert _edges(g, "layered_revenge") == []
    assert g["diagnostics"]["failed_closed"].get("read_unstamped") == 1
    # the refused read did not count as supplied: honest-empty still records it
    assert any(h["edge_type"] == "layered_revenge" and h.get("team") == "SEA"
               for h in g["honest_empty"])
    # DEN supplied nothing at all
    assert any(h["edge_type"] == "atmosphere" and h.get("team") == "DEN"
               for h in g["honest_empty"])
    assert graph_mod.validate_graph(g, REGISTRY) == []


# ---------------------------------------------------------------- shipped instance

def test_shipped_instance():
    path = PKG / "instances" / "2026-week06-sea-at-den.json"
    if not path.exists():
        pytest.skip("instance not built yet")
    g = json.loads(path.read_text())
    assert graph_mod.validate_graph(g, REGISTRY) == []
    assert g["week"] == 6  # games.jsonl numbering for 2026-10-15 (see SCHEMA.md note)
    rest = _edges(g, "rest_differential", "2026_06_SEA_DEN")[0]
    assert rest["value"]["rest_away_days"] == 4 and rest["value"]["rest_home_days"] == 4
    assert _edges(g, "altitude_short_week", "2026_06_SEA_DEN")
    assert any(h["edge_type"] == "injury_burden" for h in g["honest_empty"])
    # no emission-shaped key anywhere in the document, at any depth
    def keys(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                yield k
                yield from keys(v)
        elif isinstance(obj, list):
            for item in obj:
                yield from keys(item)
    assert not (set(keys(g)) & graph_mod.FORBIDDEN_VALUE_KEYS)


def test_instance_matches_json_schema():
    jsonschema = pytest.importorskip("jsonschema")
    path = PKG / "instances" / "2026-week06-sea-at-den.json"
    if not path.exists():
        pytest.skip("instance not built yet")
    schema = json.loads((PKG / "schema.json").read_text())
    jsonschema.validate(json.loads(path.read_text()), schema)


# ---------------------------------------------------------------- real-data integration

def test_week3_real_dataset():
    games = REPO / "data" / "gse-dataset" / "games.jsonl"
    situ = REPO / "data" / "gse-dataset" / "current" / "week3-situational.jsonl"
    if not (games.exists() and situ.exists()):
        pytest.skip("repo dataset not present")
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "w3.json"
        rc = builder_mod.main([
            "--season", "2026", "--week", "3", "--games", str(games),
            "--venues", str(PKG / "inputs" / "venues.json"),
            "--situational", str(situ),
            "--out", str(out),
        ])
        assert rc == 0
        g = json.loads(out.read_text())
    pm = [e for e in _edges(g, "pressure_matchup", "2026_03_SEA_WAS")]
    assert len(pm) == 1
    # values carried verbatim from week3-situational.jsonl
    assert pm[0]["value"]["signed_home_minus_away"] == -0.021049882749485854
    assert pm[0]["value"]["family_status"] == "admitted"
    gr = [e for e in _edges(g, "fourth_down_go_rate", "2026_03_SEA_WAS")]
    assert gr and gr[0]["value"]["signed_home_minus_away"] == 0.03487916695463861
    assert gr[0]["value"]["family_status"] == "dark"  # recorded, never relabeled
    assert graph_mod.validate_graph(g, REGISTRY) == []
