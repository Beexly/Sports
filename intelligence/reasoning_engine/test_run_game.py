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
    ids = [f["signal"] for f in doc["facts"]]
    assert "CLE.epa_facets" in ids
    assert "CLE.ol" in ids
    assert doc["checklist"].get("offensive_line") != "UNCHECKED"
    assert doc["trace_label"] != "FINAL"
