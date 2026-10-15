"""
Tests for the Adjustment Layer v1 grammar (intelligence/adjustment-layer).

Run:  python3 -m pytest intelligence/adjustment-layer/tests -q

Coverage intent:
- every family fires on its spec trigger and does NOT fire on the nearest
  boundary inputs (designations, positions, thresholds the spec or the
  fleet's formalized registry actually state);
- PIT isolation: inputs stamped at/after kickoff or after the read time
  can never fire a pregame adjustment;
- the shadow ledger is append-only (hash chain), tamper-evident, and
  idempotent under replay;
- the emission fence: no record carries a probability/pick/emission-shaped
  key at any depth, weight is 0, magnitude is null, calibrated is false;
- the application seam refuses, unconditionally;
- a golden test pins the real SEA@DEN worked instance (13 records).
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, PKG)

import grammar  # noqa: E402
import ledger as ledger_mod  # noqa: E402
import apply_seam  # noqa: E402
import pytest  # noqa: E402

SRC = {"kind": "test", "ref": "synthetic test input"}
AS_OF = "2026-10-15T15:00:00Z"
READ_AT = "2026-10-15T17:00:00Z"
KICKOFF = "2026-10-16T00:15:00Z"


def bundle(templates=None, edges=None, read_at=READ_AT):
    return {
        "game": {"game_id": "TEST_GAME", "home_team": "HOM", "away_team": "AWY",
                 "kickoff_utc": KICKOFF, "gameday": "2026-10-15"},
        "read_at": read_at,
        "graph_edges": edges or [],
        "templates": templates or [],
    }


def injury(player="Player A", position="LT", team="HOM", status="OUT",
           starter=True, depth_role=None, as_of=AS_OF):
    return {"kind": "injury_report", "player": player, "position": position,
            "team": team, "status": status, "starter": starter,
            "depth_role": depth_role, "detail": "test", "replacement": None,
            "as_of": as_of, "source": SRC}


def by_family(result, family):
    return [r for r in result["records"] if r["family"] == family]


# --------------------------------------------------------------------------
# Family 1 — OL injuries (spec rule 1)
# --------------------------------------------------------------------------

def test_f1_fires_on_starting_lt_out():
    res = grammar.evaluate(bundle([injury(position="LT")]))
    recs = by_family(res, "OL_INJURY")
    assert len(recs) == 4
    got = {(r["affected"]["target"]): (r["direction"], r["magnitude_band"]) for r in recs}
    assert got["qb_passing_efficiency"] == ("DOWN", "SLIGHT")
    assert got["rb_yards_before_contact"] == ("DOWN", "PLAIN")
    assert got["rb_checkdown_target_share"] == ("UP", "SLIGHT")
    assert got["team_pass_rate"] == ("DOWN", "TICK")
    assert all(r["affected"]["team"] == "HOM" for r in recs)


def test_f1_fires_on_center_doubtful():
    res = grammar.evaluate(bundle([injury(position="C", status="DOUBTFUL")]))
    assert len(by_family(res, "OL_INJURY")) == 4


def test_f1_no_fire_on_lt_questionable():
    res = grammar.evaluate(bundle([injury(position="LT", status="QUESTIONABLE")]))
    assert by_family(res, "OL_INJURY") == []


def test_f1_no_fire_on_guard_or_nonstarter():
    res = grammar.evaluate(bundle([injury(position="LG")]))
    assert by_family(res, "OL_INJURY") == []
    res = grammar.evaluate(bundle([injury(position="LT", starter=False)]))
    assert by_family(res, "OL_INJURY") == []


# --------------------------------------------------------------------------
# Family 2 — secondary injuries (spec rule 2)
# --------------------------------------------------------------------------

def test_f2_fires_on_cb1_out():
    res = grammar.evaluate(bundle([injury(position="CB", depth_role="CB1")]))
    recs = by_family(res, "SECONDARY_INJURY")
    assert len(recs) == 5
    got = {r["affected"]["target"]: r for r in recs}
    assert got["opp_qb_passing_yards"]["direction"] == "UP"
    assert got["opp_qb_passing_yards"]["affected"]["team"] == "AWY"
    assert got["opp_qb_passing_tds"]["direction"] == "UP"
    assert got["opp_receiver_production"]["direction"] == "UP"
    assert got["opp_implied_total"]["magnitude_band"] == "SLIGHT"
    assert got["dst_output"]["direction"] == "DOWN"
    assert got["dst_output"]["affected"]["team"] == "HOM"  # the depleted defense itself


def test_f2_fires_on_starting_safety_out():
    res = grammar.evaluate(bundle([injury(position="S", depth_role="S")]))
    assert len(by_family(res, "SECONDARY_INJURY")) == 5


def test_f2_no_fire_on_questionable_or_doubtful():
    # The spec's trigger word is "out" — the Riley Moss boundary.
    for status in ("QUESTIONABLE", "DOUBTFUL"):
        res = grammar.evaluate(bundle([injury(position="CB", depth_role="CB2", status=status)]))
        assert by_family(res, "SECONDARY_INJURY") == [], status


# --------------------------------------------------------------------------
# Family 3 — pass-rush injuries (spec rule 3)
# --------------------------------------------------------------------------

def test_f3_fires_on_edge_out():
    res = grammar.evaluate(bundle([injury(position="EDGE")]))
    recs = by_family(res, "PASS_RUSH_INJURY")
    assert len(recs) == 3
    got = {r["affected"]["target"]: (r["direction"], r["magnitude_band"]) for r in recs}
    assert got["opp_qb_time_to_throw"] == ("UP", "PLAIN")
    assert got["opp_qb_production"] == ("UP", "SLIGHT")
    assert got["opp_wr_production"] == ("UP", "SLIGHT")


def test_f3_no_fire_on_edge_questionable():
    res = grammar.evaluate(bundle([injury(position="EDGE", status="QUESTIONABLE")]))
    assert by_family(res, "PASS_RUSH_INJURY") == []


def test_f3_no_fire_on_off_ball_lb():
    res = grammar.evaluate(bundle([injury(position="LB")]))
    assert by_family(res, "PASS_RUSH_INJURY") == []


# --------------------------------------------------------------------------
# Family 4 — depth chart movement (spec rule 4)
# --------------------------------------------------------------------------

def _depth(event="elevation", team="HOM"):
    return {"kind": "depth_chart", "team": team, "position": "RB", "event": event,
            "beneficiary": {"slot": "RB1", "player": "Back Up"},
            "cause": {"player": "Starter", "role": "RB1", "status": "OUT"},
            "as_of": AS_OF, "source": SRC}


def test_f4_fires_on_elevation():
    res = grammar.evaluate(bundle([_depth()]))
    recs = by_family(res, "DEPTH_CHART")
    assert len(recs) == 2
    got = {r["affected"]["target"]: r["direction"] for r in recs}
    assert got["player_volume"] == "UP"
    assert got["teammates_target_share"] == "DOWN"


def test_f4_no_fire_without_movement():
    res = grammar.evaluate(bundle([injury(position="RB", starter=False)]))
    assert by_family(res, "DEPTH_CHART") == []


# --------------------------------------------------------------------------
# Family 5 — weather (spec rule 5; thresholds from the graph registry)
# --------------------------------------------------------------------------

def _weather(wind=None, gust=None, temp=54, precip=None):
    return {"kind": "weather", "sustained_wind_mph": wind, "wind_gust_mph": gust,
            "temp_f": temp, "precip_probability": precip,
            "as_of": AS_OF, "source": SRC}


def test_f5_fires_at_wind_boundary_20():
    res = grammar.evaluate(bundle([_weather(wind=20)]))
    recs = by_family(res, "WEATHER")
    assert len(recs) == 4
    got = {r["affected"]["target"]: r["direction"] for r in recs}
    assert got["pass_yards"] == "DOWN" and got["pass_attempts"] == "DOWN"
    assert got["kick_distance"] == "DOWN" and got["run_rate"] == "UP"


def test_f5_no_fire_below_wind_or_gusts_only():
    assert by_family(grammar.evaluate(bundle([_weather(wind=19)])), "WEATHER") == []
    # Gusts are not sustained wind: a gusts-only row cannot fire the family.
    assert by_family(grammar.evaluate(bundle([_weather(wind=None, gust=30)])), "WEATHER") == []


def test_f5_fires_at_extreme_cold_boundary_20f():
    res = grammar.evaluate(bundle([_weather(wind=5, temp=20)]))
    assert len(by_family(res, "WEATHER")) == 4


def test_f5_precip_alone_never_fires():
    res = grammar.evaluate(bundle([_weather(wind=5, temp=60, precip=1.0)]))
    assert by_family(res, "WEATHER") == []


# --------------------------------------------------------------------------
# Family 6 — game script / Vegas (spec rule 6)
# --------------------------------------------------------------------------

def _line(spread_home, total=44.5):
    return {"kind": "market_line", "spread_home": spread_home, "total": total,
            "as_of": AS_OF, "source": SRC}


def test_f6_fires_at_large_spread_boundary():
    res = grammar.evaluate(bundle([_line(-7.0)]))
    recs = by_family(res, "GAME_SCRIPT")
    assert len(recs) == 2
    got = {r["affected"]["target"]: r for r in recs}
    trailing = got["trailing_team_pass_volume"]
    assert trailing["direction"] == "UP"
    assert trailing["affected"]["team"] == "AWY"  # home favored by 7
    assert trailing["flags"]["garbage_time_discount"] is True
    assert trailing["flags"]["role_change"] is False  # spec: NOT role change
    assert got["leading_team_run_rate"]["affected"]["team"] == "HOM"


def test_f6_no_fire_on_small_spread():
    assert by_family(grammar.evaluate(bundle([_line(2.5)])), "GAME_SCRIPT") == []
    assert by_family(grammar.evaluate(bundle([_line(-6.9)])), "GAME_SCRIPT") == []


# --------------------------------------------------------------------------
# Family 7 — off-field intake (spec rule 7)
# --------------------------------------------------------------------------

def _edge(etype, value, as_of="2026-10-11", frm="team:AWY", to="game:TEST_GAME"):
    return {"id": "%s:test" % etype, "type": etype, "from": frm, "to": to,
            "game": "TEST_GAME", "value": value, "source": SRC, "as_of": as_of}


def test_f7_altitude_short_week_composite_fires_variance():
    edge = _edge("altitude_short_week",
                 {"venue_elevation_ft": 5280, "visitor_rest_days": 4,
                  "home_rest_days": 4, "basis": "visitor at altitude on a short week"})
    res = grammar.evaluate(bundle(edges=[edge]))
    recs = by_family(res, "OFF_FIELD")
    assert len(recs) == 1
    rec = recs[0]
    assert rec["direction"] == "VARIANCE"          # friction, NOT a mean shift
    assert rec["magnitude_band"] == "UNSPECIFIED"  # rule 7 states no magnitude
    assert rec["affected"]["team"] == "AWY"        # the visitor


def test_f7_rest_differential_fires_only_when_asymmetric():
    even = _edge("rest_differential",
                 {"rest_away_days": 4, "rest_home_days": 4, "rest_diff_home_minus_away": 0,
                  "away_prev_gameday": "2026-10-11", "home_prev_gameday": "2026-10-11"},
                 frm="team:HOM", to="team:AWY")
    assert by_family(grammar.evaluate(bundle(edges=[even])), "OFF_FIELD") == []
    uneven = _edge("rest_differential",
                   {"rest_away_days": 7, "rest_home_days": 4, "rest_diff_home_minus_away": -3,
                    "away_prev_gameday": "2026-10-08", "home_prev_gameday": "2026-10-11"},
                   frm="team:HOM", to="team:AWY")
    recs = by_family(grammar.evaluate(bundle(edges=[uneven])), "OFF_FIELD")
    assert len(recs) == 1 and recs[0]["affected"]["team"] == "HOM"  # shorter-rest team


# --------------------------------------------------------------------------
# PIT isolation
# --------------------------------------------------------------------------

def test_pit_injury_stamped_after_kickoff_is_refused():
    late = injury(position="CB", depth_role="CB1", as_of="2026-10-16T01:00:00Z")
    res = grammar.evaluate(bundle([late]))
    assert res["records"] == []
    assert len(res["refused"]) == 1
    assert "kickoff" in res["refused"][0]["reason"]


def test_pit_input_stamped_after_read_time_is_invisible():
    future = injury(position="LT", as_of="2026-10-15T18:00:00Z")  # read at 17:00Z
    res = grammar.evaluate(bundle([future]))
    assert res["records"] == []
    assert len(res["refused"]) == 1


def test_pit_edge_stamped_after_read_time_is_invisible():
    edge = _edge("altitude_short_week",
                 {"venue_elevation_ft": 5280, "visitor_rest_days": 4,
                  "home_rest_days": 4, "basis": "x"}, as_of="2026-10-15T19:00:00Z")
    res = grammar.evaluate(bundle(edges=[edge]))
    assert by_family(res, "OFF_FIELD") == []
    assert len(res["refused"]) == 1


# --------------------------------------------------------------------------
# Ledger — append-only integrity
# --------------------------------------------------------------------------

def _golden_records():
    inputs_path = os.path.join(PKG, "inputs", "2026-week06-sea-at-den.json")
    graph_path = os.path.join(PKG, "inputs", "2026-week06-sea-at-den.graph.json")
    with open(inputs_path) as f:
        b = json.load(f)
    with open(graph_path) as f:
        b["graph_edges"] = json.load(f)["edges"]
    return grammar.evaluate(b)


def test_ledger_append_and_verify(tmp_path):
    path = str(tmp_path / "ledger.jsonl")
    records = _golden_records()["records"]
    appended, skipped = ledger_mod.append_records(path, records)
    assert appended == len(records) and skipped == 0
    assert ledger_mod.verify(path) == []
    assert len(ledger_mod.read_lines(path)) == len(records)


def test_ledger_replay_is_idempotent(tmp_path):
    path = str(tmp_path / "ledger.jsonl")
    records = _golden_records()["records"]
    ledger_mod.append_records(path, records)
    appended, skipped = ledger_mod.append_records(path, records)
    assert appended == 0 and skipped == len(records)
    assert ledger_mod.verify(path) == []


def test_ledger_tamper_is_detected_and_blocks_append(tmp_path):
    path = str(tmp_path / "ledger.jsonl")
    records = _golden_records()["records"]
    ledger_mod.append_records(path, records[:3])
    with open(path) as f:
        lines = f.readlines()
    entry = json.loads(lines[1])
    entry["record"]["direction"] = "DOWN" if entry["record"]["direction"] != "DOWN" else "UP"
    lines[1] = json.dumps(entry, sort_keys=True) + "\n"
    with open(path, "w") as f:
        f.writelines(lines)
    assert ledger_mod.verify(path) != []
    with pytest.raises(ValueError):
        ledger_mod.append_records(path, records[3:])


# --------------------------------------------------------------------------
# Fence + seam
# --------------------------------------------------------------------------

def test_fence_records_are_clean_and_weightless():
    records = _golden_records()["records"]
    assert records
    for rec in records:
        assert grammar.fence_problems(rec) == []
        assert rec["weight"] == 0
        assert rec["magnitude"] is None
        assert rec["calibrated"] is False


def test_fence_detects_emission_shaped_keys_at_any_depth():
    bad = {"record_id": "adj:x", "weight": 0, "magnitude": None, "calibrated": False,
           "direction": "UP", "magnitude_band": "PLAIN",
           "nested": {"deeper": [{"win_probability": 0.5}]}}
    problems = grammar.fence_problems(bad)
    assert any("win_probability" in p for p in problems)


def test_seam_refuses_unconditionally():
    seam = apply_seam.AdjustmentApplicationSeam()
    with pytest.raises(apply_seam.SeamNotConnected):
        seam.apply([], candidate={"weights": [0.5, 0.5]}, gate_clearance="anything")
    assert apply_seam.AdjustmentApplicationSeam.describe()["connected"] is False


def test_grammar_never_imports_the_seam():
    with open(os.path.join(PKG, "grammar.py")) as f:
        src = f.read()
    assert "apply_seam" not in src.replace("apply_seam.py", "")  # docstring mention only
    assert "import apply_seam" not in src
    assert "from apply_seam" not in src


# --------------------------------------------------------------------------
# Golden — the real SEA@DEN worked instance
# --------------------------------------------------------------------------

def test_golden_sea_den_instance():
    result = _golden_records()
    counts = {}
    for rec in result["records"]:
        counts[rec["family"]] = counts.get(rec["family"], 0) + 1
    # Injury asymmetry (2 starting DEN DBs OUT) + Charbonnet consolidation
    # + the altitude/short-week composite. Nothing else fires; nothing is forced.
    assert counts == {"SECONDARY_INJURY": 10, "DEPTH_CHART": 2, "OFF_FIELD": 1}
    assert result["refused"] == []
    diags = {(d["family"], d["detail"][:40]) for d in result["diagnostics"]}
    # Riley Moss (QUESTIONABLE) is the standing boundary: evaluated, not fired.
    assert any(fam == "SECONDARY_INJURY" and "Moss" in detail for fam, detail in diags)
    # Weather and game script were evaluated against stamped rows, not skipped.
    assert any(fam == "WEATHER" for fam, _ in diags)
    assert any(fam == "GAME_SCRIPT" for fam, _ in diags)


def test_determinism_same_inputs_same_record_ids():
    a = _golden_records()["records"]
    b = _golden_records()["records"]
    assert [r["record_id"] for r in a] == [r["record_id"] for r in b]
