"""
test_bridge.py — reasoning-bridge v1 contract tests (pytest).

Run: python3 -m pytest intelligence/situational-graph/bridge/tests/test_bridge.py

The four contract families, matching the build's hard fences:
  1. traceability — every emitted premise cites >= 1 evidence edge that
     exists in the source graph, and every premise's as_of is the latest
     stamp among its evidence.
  2. PIT enforcement — an edge stamped after read_at is excluded AND named
     in pit_excluded; the premise constructor refuses a future-stamped
     evidence edge outright.
  3. fence validation — probability/pick/crps/emission keys are rejected at
     any depth, in inputs and in outputs; no premise field carries one.
  4. determinism — two builds over the same input are byte-identical.
Plus: honest-empty propagation (the graph's injury_burden honest_empty
produces a not_consumed record and NO injury premise), and the audit's
trace rule at selection (untraceable premises are refused, not passed).
"""

import copy
import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
BRIDGE_DIR = HERE.parent
sys.path.insert(0, str(BRIDGE_DIR))

import bridge as bridge_mod  # noqa: E402

GRAPH_PATH = BRIDGE_DIR / "inputs" / "2026-week06-sea-at-den.graph.json"
RULES_PATH = BRIDGE_DIR / "rules.json"
READ_AT = "2026-10-15"
GAME = "2026_06_SEA_DEN"

# graph.py @ motif/situational-graph-v1-2026-10-15 (db0ef37) — the fence set
# the bridge mirrors when the graph package is not in the tree.
GRAPH_FORBIDDEN_KEYS = {
    "crps", "pick", "picks", "parlay", "parlays", "emission",
    "win_probability", "probability", "ev", "expected_value", "bet",
}


def load_graph():
    with open(GRAPH_PATH) as f:
        return json.load(f)


def load_rules():
    return bridge_mod.load_rules(RULES_PATH)


def build(graph=None, read_at=READ_AT):
    return bridge_mod.build_premises(
        graph if graph is not None else load_graph(),
        load_rules(), read_at,
        {"kind": "situational_graph_instance", "ref": str(GRAPH_PATH)})


@pytest.fixture(scope="module")
def doc():
    return build()


# --------------------------------------------------------- worked example

def test_worked_example_shape(doc):
    assert doc["game"] == GAME
    assert doc["emission_state"] == "ZERO_OBJECT"
    ids = [p["premise_id"] for p in doc["premises"]]
    assert ids == sorted(ids)
    assert len(doc["premises"]) == 5, ids


def test_worked_example_premises(doc):
    by_rule = {p["trace"]["rule_id"]: p for p in doc["premises"]}

    rest = by_rule["rest_differential"]
    assert rest["direction"] == "NEUTRAL"
    assert rest["magnitude_band"] == "NEUTRAL"
    assert rest["as_of"] == "2026-10-11"

    altitude = by_rule["altitude_exposure"]
    assert altitude["subject"] == "team:SEA"
    assert altitude["direction"] == "AGAINST_AWAY"
    assert altitude["magnitude_band"] == "STRONG"  # 5280 - 4000 = 1280 >= 1250
    assert altitude["as_of"] is None  # timeless venue facts only

    composite = by_rule["altitude_short_week_composite"]
    assert composite["direction"] == "FRICTION"
    assert composite["magnitude_band"] == "STRONG"  # 5280 ft, 4 days rest
    assert "mean shift" in composite["statement"]

    context = by_rule["short_week_game_context"]
    assert context["direction"] == "NEUTRAL"
    assert context["magnitude_band"] == "MODERATE"

    coaching = by_rule["coaching_continuity"]
    assert coaching["subject"] == "team:DEN"
    assert coaching["direction"] == "FAVORS_HOME"
    assert coaching["magnitude_band"] == "WEAK"


# ----------------------------------------------------------- traceability

def test_every_premise_cites_real_edges(doc):
    graph = load_graph()
    edge_ids = {e["id"] for e in graph["edges"]}
    for premise in doc["premises"]:
        assert premise["evidence"], premise["premise_id"]
        for link in premise["evidence"]:
            assert link["edge_id"] in edge_ids
            assert link["source"]["kind"] and link["source"]["ref"]


def test_premise_as_of_is_latest_evidence_stamp(doc):
    for premise in doc["premises"]:
        stamped = [e["as_of"] for e in premise["evidence"] if e["as_of"] is not None]
        assert premise["as_of"] == (max(stamped) if stamped else None)


def test_confidence_classes(doc):
    by_rule = {p["trace"]["rule_id"]: p for p in doc["premises"]}
    # altitude premise rests only on timeless venue facts + state edges
    assert by_rule["altitude_exposure"]["confidence_class"] == "CORROBORATED"
    # coaching premise rests on one stamped edge of one type
    assert by_rule["coaching_continuity"]["confidence_class"] == "STAMPED"


def test_selection_refuses_untraceable_premises():
    graph = load_graph()
    orphan = {"premise_id": "premise:fake", "evidence": []}
    ghost = {"premise_id": "premise:ghost",
             "evidence": [{"edge_id": "edge:does-not-exist", "edge_type": "altitude",
                           "as_of": None, "source": {"kind": "x", "ref": "y"}}]}
    real = build()["premises"][0]
    selected, refused = bridge_mod.select_premises([orphan, ghost, real], graph)
    assert selected == [real]
    assert {r["premise_id"] for r in refused} == {"premise:fake", "premise:ghost"}


# -------------------------------------------------------------------- PIT

def _future_injury_graph():
    graph = load_graph()
    graph["nodes"].append({"id": "player:00-0039913", "kind": "player",
                            "name": "Future Stamped", "position": "CB", "team": "DEN"})
    graph["edges"].append({
        "id": "injury_burden:2026_06_SEA_DEN:team:DEN->game:2026_06_SEA_DEN",
        "type": "injury_burden", "from": "team:DEN", "to": "game:2026_06_SEA_DEN",
        "game": GAME,
        "value": {"burden": 3.5, "contributors": [], "weight_table": "v1"},
        "source": {"kind": "injury_feed", "ref": "test fixture"},
        "as_of": "2026-10-16",  # the day AFTER the read: unknowable at read_at
    })
    return graph


def test_pit_future_stamped_edge_is_named_and_unconsumed():
    doc = build(graph=_future_injury_graph())
    assert [e["edge_id"] for e in doc["pit_excluded"]] == [
        "injury_burden:2026_06_SEA_DEN:team:DEN->game:2026_06_SEA_DEN"]
    # and no premise cites it
    for premise in doc["premises"]:
        assert all(link["edge_id"] != "injury_burden:2026_06_SEA_DEN:team:DEN->game:2026_06_SEA_DEN"
                   for link in premise["evidence"])


def test_pit_constructor_refuses_future_stamped_evidence():
    graph = _future_injury_graph()
    edge = [e for e in graph["edges"] if e["type"] == "injury_burden"][0]
    rule = load_rules()["rest_differential"]
    with pytest.raises(bridge_mod.BridgeRefusal):
        bridge_mod.make_premise(
            premise_id="premise:test", game=GAME, subject="game:%s" % GAME,
            kind="rest_context", direction="NEUTRAL", magnitude_band="NEUTRAL",
            statement="x", evidence_edges=[edge], rule=rule, read_at=READ_AT)


def test_pit_read_before_stamps_sees_less():
    early = build(read_at="2026-10-05")
    rules_seen = {p["trace"]["rule_id"] for p in early["premises"]}
    # rest + composite + short-week context are stamped 2026-10-11: invisible
    assert "rest_differential" not in rules_seen
    assert "altitude_short_week_composite" not in rules_seen
    # the timeless altitude fact is visible at any read time
    assert "altitude_exposure" in rules_seen
    assert {e["edge_type"] for e in early["pit_excluded"]} >= {"rest_differential"}


# ------------------------------------------------------------------ fence

def test_fence_rejects_probability_key_in_input():
    graph = load_graph()
    graph["edges"][0]["value"]["probability"] = 0.61
    with pytest.raises(bridge_mod.BridgeRefusal):
        build(graph=graph)


def test_fence_rejects_nested_pick_key_in_input():
    graph = load_graph()
    graph["edges"][0]["value"]["nested"] = {"deeper": [{"pick": "SEA"}]}
    with pytest.raises(bridge_mod.BridgeRefusal):
        build(graph=graph)


def test_fence_output_carries_no_forbidden_keys(doc):
    def keys(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                yield k
                yield from keys(v)
        elif isinstance(obj, list):
            for item in obj:
                yield from keys(item)

    assert not (set(keys(doc)) & GRAPH_FORBIDDEN_KEYS)


def test_fence_set_matches_graph_package():
    assert bridge_mod.FORBIDDEN_VALUE_KEYS == GRAPH_FORBIDDEN_KEYS


# ------------------------------------------------------------- determinism

def test_determinism_byte_identical():
    first = json.dumps(build(), indent=2, sort_keys=True)
    second = json.dumps(build(), indent=2, sort_keys=True)
    assert first == second


# ------------------------------------------------------------ honest-empty

def test_honest_empty_propagates_to_not_consumed(doc):
    not_consumed = {(n["edge_type"], n["team"]) for n in doc["not_consumed"]}
    assert ("injury_burden", None) in not_consumed
    assert ("weather_extreme", None) in not_consumed
    # and no premise pretends to cover the missing injury facts
    statements = " ".join(p["statement"] for p in doc["premises"]).lower()
    assert "injur" not in statements


def test_input_graph_unmodified():
    graph = load_graph()
    snapshot = copy.deepcopy(graph)
    build(graph=graph)
    assert graph == snapshot
