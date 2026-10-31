"""The facet split is a measurement. The runner's trace changes when OL is present."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "qb-behavior", "src"))

from reasoning_engine.facets import epa_facets
from reasoning_engine.run_game import reason_game


def test_cle_facets_split_pass_from_rush_and_turnovers():
    facet = epa_facets("CLE", 2026, before_week=4)
    assert facet["plays"] == 237
    assert facet["pass_epa"] == 11.91
    assert facet["rush_epa"] == -21.279
    assert facet["turnover_n"] == 3
    assert facet["turnover_epa"] == -16.008
    assert facet["point_in_time"] is True


def test_runner_records_facts_and_does_not_invent_a_pick():
    doc = reason_game()
    assert doc["pick"] is None
    assert doc["probability_before_calibration"] is None
    assert doc["probability_after_calibration"] is None
    assert doc["mint"] in ("withhold", "pass")
    assert "0.5" not in str(doc["probability_before_calibration"])
    ids = [f["signal"] for f in doc["facts"]]
    assert "CLE.epa_facets" in ids
    assert "CLE.ol" in ids
    assert not any(s.endswith(".tau_hat") for s in ids)
    assert not any(s.endswith(".tau_hat_decision") for s in ids)
    assert any("refused a 0.5 stand-in" in g for g in doc["gaps"])
    assert doc["checklist"].get("offensive_line") != "UNCHECKED"
    assert doc["trace_label"] != "FINAL"


def test_runner_serves_tau_decision_in_simulation_and_post_hoc_contexts():
    sim_state = {
        "wp": 0.54,
        "yardline_100": 38,
        "ydstogo": 2,
        "score_diff": -3,
        "qtr": 3,
        "game_seconds_remaining": 720,
        "context": "simulation",
    }
    doc = reason_game(home="CLE", away="PIT", week=4, season=2026, live_game_state=sim_state)
    # Never replaces game probability (emit_three.py constraint preserved)
    assert doc["pick"] is None
    assert doc["probability_before_calibration"] is None
    assert doc["probability_after_calibration"] is None
    assert not any("refused a 0.5 stand-in" in g for g in doc["gaps"])

    by_sig = {f["signal"]: f for f in doc["facts"]}
    for team in ("CLE", "PIT"):
        key = f"coaching.{team}.tau_hat_decision"
        assert key in by_sig, f"missing {key} in {list(by_sig)}"
        val = by_sig[key]["value"]
        assert isinstance(val["wp_gap"], float)
        assert val["action_predicted"] in ("GO", "FGA", "PUNT")
        assert isinstance(val["tau_val"], float)
        assert val["point_in_time"] is True
        assert val["sha256"] == "17656fdf6981c55dfbbfff99aae5f039e35c1e6172357cd6c9cb9f94dcd4594f"
        assert "walk-forward" in val["fit_window"]


def test_runner_consumes_seven_signal_pack_observations():
    doc = reason_game(home="CLE", away="PIT", week=4, season=2026)
    expected_signals = (
        "signal_pack.redzone_proe",
        "signal_pack.st_hidden_yards",
        "signal_pack.qb_pressure_escape",
        "signal_pack.neutral_pace",
        "signal_pack.penalty_discipline",
        "signal_pack.wr_cb_archetype",
        "signal_pack.def_havoc_rate",
    )
    by_sig = {f["signal"]: f for f in doc["facts"]}
    for sig in expected_signals:
        assert sig in by_sig, f"missing {sig} in facts"
        assert by_sig[sig]["fired"] is True
        assert by_sig[sig]["value"] is not None
        assert sig in doc["observations"], f"missing {sig} in observations"

