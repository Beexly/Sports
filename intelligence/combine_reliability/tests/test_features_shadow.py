import json

import numpy as np
import pytest

from ..features import bend_attempt_peak, bend_scores, cut_primitives
from ..shadow import append_ledger, gate_evaluation_record
from ..gate import FeatureEvidence, evaluate


def _arc_track(v=6.0, radius=9.0, dur=1.5, hz=10.0):
    # Constant-speed circular arc: a_c = v^2 / R = 4.0 yd/s^2.
    omega = v / radius
    t = np.arange(0, dur + 1e-9, 1.0 / hz)
    x = radius * np.sin(omega * t)
    y = radius * (1 - np.cos(omega * t))
    return t, x, y


def test_bend_peak_recovers_centripetal_acceleration():
    t, x, y = _arc_track()
    peak = bend_attempt_peak(t, x, y)
    assert peak == pytest.approx(4.0, abs=0.8)


def test_bend_scores_rank_cohort():
    cohort = {
        "fast_tight": {"RUN_THE_HOOP": 8.0, "RUN_AND_CLUB": 7.0},
        "mid": {"RUN_THE_HOOP": 6.0, "RUN_AND_CLUB": 5.5},
        "slow_wide": {"RUN_THE_HOOP": 4.0, "RUN_AND_CLUB": 4.0},
    }
    scores = bend_scores(cohort)
    assert scores["fast_tight"] > scores["mid"] > scores["slow_wide"]
    assert scores["mid"] == pytest.approx(50.0, abs=6.0)


def test_cut_primitives_on_synthetic_cut():
    # Straight at ~7 yd/s, 90-degree turn with a dip to ~3.5 yd/s at the apex.
    hz = 10.0
    t1 = np.arange(0, 1.0, 1.0 / hz)
    x1, y1 = 7.0 * t1, np.zeros_like(t1)
    t2 = np.arange(0.1, 1.0, 1.0 / hz)
    # decelerate into the turn, then run the new direction
    speeds = 7.0 - 3.5 * np.sin(np.pi * t2 / 0.9)
    steps = speeds / hz
    y2 = np.cumsum(steps)
    x2 = np.full_like(t2, 7.0)
    t = np.concatenate([t1, t1[-1] + t2])
    x = np.concatenate([x1, x2])
    y = np.concatenate([y1, y2])
    out = cut_primitives(t, x, y)
    assert out["s_max"] == pytest.approx(7.0, abs=0.8)
    assert out["delta_s"] > 2.0
    assert 0.3 < out["retention"] < 0.75


def test_shadow_ledger_enforces_weight_zero(tmp_path):
    path = tmp_path / "ledger.jsonl"
    verdict = evaluate(FeatureEvidence(name="x", reliability=None))
    row = append_ledger(path, gate_evaluation_record("x", {"reliability": None}, verdict))
    assert row["weight"] == 0 and row["status"] == "SHADOW"
    parsed = [json.loads(line) for line in path.read_text().splitlines()]
    assert parsed[0]["gate_verdict"] == "UNDERPOWERED"
    with pytest.raises(ValueError):
        append_ledger(path, {"status": "SHADOW", "weight": 1})
    with pytest.raises(ValueError):
        append_ledger(path, {"status": "LIVE", "weight": 0})
