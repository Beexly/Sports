from __future__ import annotations

from app.models.film_splitter import segment_from_features


def test_three_motion_bursts_with_cadence_markers_make_three_segments() -> None:
    result = segment_from_features([1.0, 10.0, 19.0], [1.1, 10.2, 19.1], 25.0)
    assert result == [
        {"playIndex": 0, "tStart": 1.0, "tEnd": 10.0},
        {"playIndex": 1, "tStart": 10.0, "tEnd": 19.0},
        {"playIndex": 2, "tStart": 19.0, "tEnd": 25.0},
    ]


def test_motion_without_cadence_does_not_make_a_segment() -> None:
    assert segment_from_features([5.0], [], 20.0) == []


def test_duplicate_onsets_collapse() -> None:
    result = segment_from_features([5.0, 5.1, 12.0], [5.05, 12.1], 20.0)
    assert [row["playIndex"] for row in result] == [0, 1]
