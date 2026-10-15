"""
test_bridge_injury.py — bridge v1.1 injury_burden_differential rule tests.

Run: python3 -m pytest intelligence/situational-graph/bridge/tests/test_bridge_injury.py

The rule exists because the injury feed got stamps (intelligence/providers/
injury_stamps.py, branch motif/injury-feed-stamps-2026-10-15): before that
fix the graph honest-emptied injury_burden and the bridge could mint no
injury premise. These tests pin the v1.1 contract:

  * on the stamped SEA@DEN graph the injury premise is minted, traceable
    to BOTH teams' injury_burden edges, stamped as_of = the pull stamp;
  * the five v1 premises are unchanged by the new rule;
  * a one-sided burden (other team honest-empty) mints NO premise — a
    differential against an honest-empty is not a differential;
  * direction/band follow the differential on the RIL scale;
  * PIT: read before the pull, the injury edges are excluded and named,
    and no injury premise is minted.
"""

import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BRIDGE_DIR = HERE.parent
sys.path.insert(0, str(BRIDGE_DIR))

import bridge as bridge_mod  # noqa: E402

RULES = bridge_mod.load_rules(BRIDGE_DIR / "rules.json")
STAMPED_GRAPH = json.loads(
    (BRIDGE_DIR / "inputs" / "2026-week06-sea-at-den-stamped.graph.json").read_text())
READ_AT = "2026-10-15T23:59:00+00:00"  # gameday evening, pre-kickoff (00:15Z)
GAME = "2026_06_SEA_DEN"


def _injury_premises(doc):
    return [p for p in doc["premises"] if p["trace"]["rule_id"] == "injury_burden_differential"]


def test_injury_premise_minted_and_traceable():
    doc = bridge_mod.build_premises(STAMPED_GRAPH, RULES, READ_AT, {"kind": "test", "ref": "stamped"})
    found = _injury_premises(doc)
    assert len(found) == 1
    p = found[0]
    # both burdens are 3.00 on the fixture: the scalar is level, and the
    # premise says so instead of importing the narrative
    assert p["direction"] == "NEUTRAL" and p["magnitude_band"] == "NEUTRAL"
    assert p["confidence_class"] == "STAMPED"
    assert p["trace"]["rule_version"] == "1.1"
    assert p["trace"]["registered_signals"] == ["nfl_injury_trajectory"]
    # traceability: both cited edges exist in the source graph, premise
    # as_of is the pull stamp both edges carry
    edge_ids = {e["id"] for e in STAMPED_GRAPH["edges"]}
    assert len(p["evidence"]) == 2
    assert all(e["edge_id"] in edge_ids for e in p["evidence"])
    assert p["as_of"] == "2026-10-15T11:36:00-04:00"
    # selection accepts it (non-empty, in-graph evidence)
    selected, refused = bridge_mod.select_premises([p], STAMPED_GRAPH)
    assert selected == [p] and refused == []


def test_v1_premises_unchanged_by_the_new_rule():
    doc = bridge_mod.build_premises(STAMPED_GRAPH, RULES, READ_AT, {"kind": "test", "ref": "stamped"})
    v1 = [p for p in doc["premises"] if p["trace"]["rule_id"] != "injury_burden_differential"]
    assert len(v1) == 5
    # the injury family is consumed now: it left the not_consumed list
    assert not [n for n in doc["not_consumed"] if n["edge_type"] == "injury_burden"]


def test_one_sided_burden_mints_no_premise():
    g = copy.deepcopy(STAMPED_GRAPH)
    g["edges"] = [e for e in g["edges"]
                  if not (e["type"] == "injury_burden" and e["from"] == "team:SEA")]
    g["honest_empty"].append({
        "edge_type": "injury_burden", "game_id": GAME, "team": "team:SEA",
        "missing": ["designated injury rows for SEA week 6"],
        "reason": "stamped report in hand; no designated rows for this team"})
    doc = bridge_mod.build_premises(g, RULES, READ_AT, {"kind": "test", "ref": "one-sided"})
    assert _injury_premises(doc) == []
    assert [n for n in doc["not_consumed"] if n["edge_type"] == "injury_burden"]


def test_direction_and_bands_follow_the_differential():
    g = copy.deepcopy(STAMPED_GRAPH)
    den = next(e for e in g["edges"] if e["type"] == "injury_burden" and e["from"] == "team:DEN")
    sea = next(e for e in g["edges"] if e["type"] == "injury_burden" and e["from"] == "team:SEA")

    den["value"]["burden"], sea["value"]["burden"] = 3.5, 3.0  # +0.50 -> WEAK, AGAINST_HOME
    p = _injury_premises(bridge_mod.build_premises(g, RULES, READ_AT, {"kind": "t", "ref": "x"}))[0]
    assert (p["direction"], p["magnitude_band"]) == ("AGAINST_HOME", "WEAK")

    den["value"]["burden"], sea["value"]["burden"] = 1.0, 3.0  # -2.00 -> MODERATE, AGAINST_AWAY
    p = _injury_premises(bridge_mod.build_premises(g, RULES, READ_AT, {"kind": "t", "ref": "x"}))[0]
    assert (p["direction"], p["magnitude_band"]) == ("AGAINST_AWAY", "MODERATE")

    den["value"]["burden"], sea["value"]["burden"] = 5.5, 1.0  # +4.50 -> STRONG
    p = _injury_premises(bridge_mod.build_premises(g, RULES, READ_AT, {"kind": "t", "ref": "x"}))[0]
    assert (p["direction"], p["magnitude_band"]) == ("AGAINST_HOME", "STRONG")


def test_pit_read_before_the_pull_mints_no_injury_premise():
    early = "2026-10-15T10:00:00-04:00"  # before the 11:36 ET pull
    doc = bridge_mod.build_premises(STAMPED_GRAPH, RULES, early, {"kind": "test", "ref": "early"})
    assert _injury_premises(doc) == []
    excluded = {e["edge_id"] for e in doc["pit_excluded"]}
    assert any("injury_burden" in eid for eid in excluded)
