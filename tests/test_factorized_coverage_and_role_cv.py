"""Tests for role-label detection and factorized coverage features.

Two regressions are locked in here:

1. `detect_players` used to filter `label != "player"`. The gridiron-ai detector
   emits role classes (defense/oline/qb/...), so every box it produced was
   silently discarded - a 100% detection loss that no exception surfaced.

2. The snap frame comes from `frameType == "SNAP"`, while the `event` column
   names it `ball_snap`. Keying off event values alone finds no snap at all.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from intelligence.vision import broadcast_cv as bc
from intelligence.vision import factorized_coverage_bdb25 as fc


# ---------------------------------------------------------------------------
# stub ultralytics model
# ---------------------------------------------------------------------------
class _Box:
    def __init__(self, cls, conf, xyxy):
        self.cls = cls
        self.conf = conf
        self.xyxy = [np.array(xyxy, dtype=float)]


class _Boxes(list):
    pass


class _Result:
    def __init__(self, boxes):
        self.boxes = boxes
        self.masks = None


class _StubModel:
    def __init__(self, names, boxes):
        self.names = names
        self._boxes = boxes
        self.calls = []

    def predict(self, image_path, conf=0.25, imgsz=960, verbose=False):
        self.calls.append({"imgsz": imgsz, "conf": conf})
        return [_Result(_Boxes(self._boxes))]


GRIDIRON_NAMES = {0: "defense", 1: "oline", 2: "qb", 3: "ref",
                  4: "running_back", 5: "tight_end", 6: "wide_receiver"}


def test_detect_players_keeps_role_labels():
    boxes = [
        _Box(0, 0.9, [10, 10, 30, 50]),   # defense
        _Box(1, 0.9, [40, 10, 60, 50]),   # oline
        _Box(2, 0.9, [70, 10, 90, 50]),   # qb
        _Box(6, 0.9, [100, 10, 120, 50]),  # wide_receiver
    ]
    model = _StubModel(GRIDIRON_NAMES, boxes)
    out = bc.detect_players(model, "frame.jpg")
    assert len(out) == 4, "role-labelled boxes must not be dropped"
    roles = {p["role"] for p in out}
    assert roles == {"defense", "oline", "qb", "wide_receiver"}


def test_detect_players_drops_referee():
    boxes = [_Box(3, 0.9, [10, 10, 30, 50]), _Box(0, 0.9, [40, 10, 60, 50])]
    model = _StubModel(GRIDIRON_NAMES, boxes)
    out = bc.detect_players(model, "frame.jpg")
    assert len(out) == 1
    assert out[0]["role"] == "defense"


def test_detect_players_tags_offense_vs_defense_side():
    boxes = [_Box(0, 0.9, [10, 10, 30, 50]),   # defense
             _Box(4, 0.9, [40, 10, 60, 50]),   # running_back -> offense
             _Box(1, 0.9, [70, 10, 90, 50])]   # oline -> offense
    model = _StubModel(GRIDIRON_NAMES, boxes)
    out = bc.detect_players(model, "frame.jpg")
    sides = [p["role_side"] for p in out]
    assert sides == ["defense", "offense", "offense"]


def test_detect_players_accepts_generic_player_class():
    names = {0: "player", 1: "referee"}
    model = _StubModel(names, [_Box(0, 0.9, [10, 10, 30, 50]),
                               _Box(1, 0.9, [40, 10, 60, 50])])
    out = bc.detect_players(model, "frame.jpg")
    assert len(out) == 1
    assert out[0]["role"] == "player"
    assert out[0]["role_side"] == "unknown"


def test_detect_players_passes_imgsz():
    model = _StubModel(GRIDIRON_NAMES, [_Box(0, 0.9, [10, 10, 30, 50])])
    bc.detect_players(model, "frame.jpg", imgsz=960)
    assert model.calls[0]["imgsz"] == 960


# ---------------------------------------------------------------------------
# factorized coverage: snap index must use frameType
# ---------------------------------------------------------------------------
def _toy_tracking():
    """One play, one defender: 4 pre-snap frames, snap, 4 post-snap frames."""
    rows = []
    gid, pid, nid = 1, 10, 500
    # ball
    for f in range(1, 10):
        rows.append({"gameId": gid, "playId": pid, "nflId": 0, "frameId": f,
                     "frameType": "SNAP" if f == 5 else ("BEFORE_SNAP" if f < 5 else "AFTER_SNAP"),
                     "x": 50.0, "y": 26.65, "s": 0.0, "a": 0.0, "dir": 0.0, "o": 0.0,
                     "event": "ball_snap" if f == 5 else ("pass_forward" if f == 8 else None),
                     "club": "football", "playDirection": "right"})
    # defender drifting backwards
    for f in range(1, 10):
        rows.append({"gameId": gid, "playId": pid, "nflId": nid, "frameId": f,
                     "frameType": "SNAP" if f == 5 else ("BEFORE_SNAP" if f < 5 else "AFTER_SNAP"),
                     "x": 50.0 - 0.5 * f, "y": 20.0 + 0.2 * f, "s": 4.0 + f,
                     "a": 0.5, "dir": 180.0, "o": 180.0,
                     "event": "ball_snap" if f == 5 else None,
                     "club": "away", "playDirection": "right"})
    return pd.DataFrame(rows)


def test_snap_index_uses_frame_type_not_event_name():
    tr = _toy_tracking()
    ev = fc._snap_index(tr)
    assert (1, 10) in ev.index
    assert ev.loc[(1, 10), "snap"] == 5
    assert ev.loc[(1, 10), "pass_forward"] == 8


def test_build_features_produces_horizon_columns():
    tr = _toy_tracking()
    labels = pd.DataFrame([{"gameId": 1, "playId": 10, "nflId": 500,
                            "pff_defensiveCoverageAssignment": "MAN"}])
    feat = fc.build_features(tr, labels, horizon="through_throw")
    assert len(feat) == 1
    row = feat.iloc[0]
    # Sign convention: (x - ball_x) * play_direction, so a defender behind the
    # LOS on a right-moving play is negative. Assert magnitude, not sign.
    assert abs(row["pre_depth"]) == pytest.approx(2.0, abs=0.6)
    assert row["post_max_speed"] > 4.0
    assert row["pff_defensiveCoverageAssignment"] == "MAN"
    for c in ("disp_d05", "disp_d10", "disp_d15", "post_turn"):
        assert c in feat.columns


def test_build_features_rejects_unknown_horizon():
    with pytest.raises(ValueError):
        fc.build_features(_toy_tracking(),
                          pd.DataFrame([{"gameId": 1, "playId": 10, "nflId": 500,
                                         "pff_defensiveCoverageAssignment": "MAN"}]),
                          horizon="after_the_game")
