"""Unit test: live_board abstains by default on any residual row lacking an RVC clearance.

Run: python3 -m pytest -q docs/research/2026-10-09/rating-atlas/minis/test_live_board_abstain.py
Synthetic fixtures only (temp files); nothing is read from or written to the branch data.
"""
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from live_board import live_board, ABSTAIN_LABEL  # noqa: E402
from doctrine import HonestyGate  # noqa: E402

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
GAMES = [{"id": "g1", "home": "HHH", "away": "AAA", "start": NOW},
         {"id": "g2", "home": "XXX", "away": "YYY", "start": NOW}]


def _warehouse(tmp):
    lines = {"observed_at": NOW, "games": [{"id": "g1", "spread": -3.0, "total": 44.5},
                                           {"id": "g2", "spread": 1.5, "total": 41.0}]}
    overlay = {"observed_at": NOW, "g1": 0.42}      # g1 gets a residual, g2 does not
    lp, op = os.path.join(tmp, "lines.json"), os.path.join(tmp, "sg.json")
    json.dump(lines, open(lp, "w"))
    json.dump(overlay, open(op, "w"))
    return {"closing_lines": lp, "situational_graph": op}


class _Cand:
    """Synthetic candidate that beats the close on a synthetic frozen list (test fixture only)."""
    name = "synthetic_sg"
    def predict(self, fold):
        return fold["outcome"], fold["close_sigma"]
    def identity(self):
        return {"name": self.name}


def _verdict():
    folds = [{"fold_id": f"f{i}", "decision_t": 0, "outcome": float(i), "close_mu": 0.0,
              "close_sigma": 10.0} for i in range(1, 6)]
    gate = HonestyGate(folds, "test_gate")
    return gate, gate.evaluate(_Cand())


def test_uncleared_residual_rows_abstain_by_default():
    with tempfile.TemporaryDirectory() as tmp:
        b = live_board(GAMES, _warehouse(tmp))
    r1, r2 = b["rows"]
    assert r1["status"] == "diagnostic overlay" and r1["residual"] == 0.42
    assert r1["abstain"] is True and r1["rvc_cleared"] is False and r1["render"] == ABSTAIN_LABEL
    assert r2["status"] == "baseline" and r2["abstain"] is False and "render" not in r2
    assert b["n_abstain"] == 1


def test_refused_or_forged_clearance_still_abstains():
    gate, v = _verdict()
    with tempfile.TemporaryDirectory() as tmp:
        wh = _warehouse(tmp)
        wh["rvc_clearances"] = {"situational_graph": (HonestyGate([], "other_gate"), v)}  # wrong gate
        b = live_board(GAMES, wh)
        assert b["rows"][0]["abstain"] is True
        wh["rvc_clearances"] = {"situational_graph": (gate, "PROMOTED")}  # string, not a Verdict
        b = live_board(GAMES, wh)
        assert b["rows"][0]["abstain"] is True


def test_valid_promoted_verdict_clears_row():
    gate, v = _verdict()
    assert v.verdict == "PROMOTED"
    with tempfile.TemporaryDirectory() as tmp:
        wh = _warehouse(tmp)
        wh["rvc_clearances"] = {"situational_graph": (gate, v)}
        b = live_board(GAMES, wh)
    assert b["rows"][0]["abstain"] is False and b["rows"][0]["rvc_cleared"] is True
    assert b["n_abstain"] == 0
