"""Regression tests for coverage_sequence_model.build_sequences.

The locked-in bug
-----------------
`nearest_opp` was computed as `opp_cache.get((gameId, playId, my_club))`. That key
holds the positions of the DEFENDER'S OWN CLUB, so the nearest "opponent" was
always a teammate standing on top of him - the feature was a constant 0.0 for
every defender on every play. A zero-valued feature cannot carry signal, so the
headline coverage accuracy was produced by a model that never saw an opponent.

The fix builds the opponent set as every tracked club except `my_club`. This test
fails against the old lookup (returns 0.0) and passes against the fix (returns
the true 10-yard separation).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from intelligence.vision import coverage_sequence_model as csm


def _frame(game, play, nid, fid, club, x, y, frame_type="", event="",
           direction="right"):
    return {
        "gameId": game, "playId": play, "nflId": nid, "frameId": fid,
        "frameType": frame_type, "x": x, "y": y, "s": 1.0, "a": 0.0,
        "dir": 90.0, "o": 90.0, "event": event, "club": club,
        "playDirection": direction,
    }


def _synthetic_play():
    """One play, one defender, one teammate, one opponent 10 yards away."""
    snap = 10
    rows = []
    for f in range(5, 16):
        # ball sits on the line of scrimmage at the snap frame only
        if f == snap:
            rows.append(_frame(1, 1, 999, f, "football", 0.0, 0.0,
                               frame_type="SNAP", event="ball_snap"))
        # defender: on the LOS, stationary
        rows.append(_frame(1, 1, 1, f, "home", 0.0, 0.0))
        # teammate: half a yard away - the old bug measured this as "opponent"
        rows.append(_frame(1, 1, 2, f, "home", 0.5, 0.0))
        # opponent: ten yards away
        rows.append(_frame(1, 1, 3, f, "away", 10.0, 0.0))
    tr = pd.DataFrame(rows)
    labels = pd.DataFrame([{
        "gameId": 1, "playId": 1, "nflId": 1,
        "pff_defensiveCoverageAssignment": "COVER_1",
    }])
    return tr, labels


def _nearest_opp_series(data):
    i = csm.FEATURES.index("nearest_opp")
    return data["X"][0, :, i]


def test_nearest_opp_measures_opponent_not_teammate():
    tr, labels = _synthetic_play()
    data = csm.build_sequences(tr, labels, horizon="pre_snap")

    assert data["X"].shape[0] == 1, "synthetic play should build one sequence"

    nearest = _nearest_opp_series(data)
    masked = nearest[data["mask"][0] > 0]

    assert masked.size >= 5, "expected at least five unmasked frames"
    # The bug produced 0.0 (teammate on top of the defender). The opponent is
    # at 10.0 yards, so every frame must read 10.0 - not 0.0, not 0.5.
    assert np.allclose(masked, 10.0, atol=1e-6), (
        f"nearest_opp should be 10.0 (distance to the opposing club), got "
        f"{masked.min():.3f}..{masked.max():.3f} - a 0.0 or 0.5 reading means "
        f"the own-club cache bug is back"
    )


def test_nearest_opp_is_not_constant_zero():
    """Explicit anti-regression: the feature must vary with real geometry."""
    tr, labels = _synthetic_play()
    data = csm.build_sequences(tr, labels, horizon="pre_snap")
    nearest = _nearest_opp_series(data)
    masked = nearest[data["mask"][0] > 0]
    assert not np.allclose(masked, 0.0), "nearest_opp collapsed to a constant 0.0"


def test_teammate_excluded_from_opponent_set():
    """A teammate closer than the opponent must not become 'nearest_opp'."""
    tr, labels = _synthetic_play()
    # move the teammate to 1 yard: still closer than the 10-yard opponent
    tr.loc[(tr["nflId"] == 2), "x"] = 1.0
    data = csm.build_sequences(tr, labels, horizon="pre_snap")
    masked = _nearest_opp_series(data)[data["mask"][0] > 0]
    assert masked.size >= 5
    assert masked.min() > 5.0, (
        f"teammate at 1 yard leaked into nearest_opp (min={masked.min():.2f}); "
        f"opponents must exclude the defender's own club"
    )
