"""Tests for the defensive coverage classifier.

The load-bearing property is the **geometry → label rule**, not shape validity.
Three behavioural pins:

1. Deep safeties + off corners must read **Cover 3** (the three-deep structure
   the rule table encodes for that picture).
2. Single-high + press must read **1-Man** (man-free with one deep middle).
3. Pre-snap ≠ post-snap must set ``disguised`` — otherwise the pre/post pair
   is decorative and disguises are invisible.

Detector injection is exercised too: a missing YOLO/OpenCV detector must fail
closed, never invent an empty field (which would classify as Cover 0).
"""

from __future__ import annotations

import pytest

from app.models.coverage_classifier import (
    DEEP_YARDS,
    OFF_YARDS,
    CoverageDependencyError,
    PlayerDetector,
    PlayerGeometry,
    aggregate_coverages,
    classify_coverage,
    derive_features,
    normalize_geometry,
    play_result_to_dict,
    require_detector,
    split_play,
)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------


def defender(player_id: str, x: float, y: float) -> PlayerGeometry:
    return PlayerGeometry(player_id=player_id, team="defense", x=x, y=y)


def offensive_line() -> list[PlayerGeometry]:
    """A minimal offense so the field is non-empty; classifier ignores them."""
    return [
        PlayerGeometry(player_id=f"o{i}", team="offense", x=20.0 + i * 2.5, y=0.5)
        for i in range(5)
    ]


def cover3_look() -> list[PlayerGeometry]:
    """Two deep safeties + off (but not deep) corners + a box."""
    return offensive_line() + [
        defender("cbL", 5.0, 7.0),   # off corner, not deep
        defender("cbR", 48.0, 7.0),  # off corner, not deep
        defender("fs", 21.0, 15.0),  # deep safety
        defender("ss", 32.0, 15.0),  # deep safety
        defender("mlb", 26.5, 2.5),  # box
        defender("olbL", 14.0, 2.0),  # box
        defender("olbR", 39.0, 2.0),  # box
        defender("dl", 24.0, 1.0),  # box
    ]


def cover1man_look() -> list[PlayerGeometry]:
    """Single-high safety + press corners + a loaded box."""
    return offensive_line() + [
        defender("cbL", 5.0, 1.5),   # press corner
        defender("cbR", 48.0, 1.5),  # press corner
        defender("fs", 26.5, 14.0),  # single deep middle
        defender("ss", 20.0, 6.0),   # underneath, not deep
        defender("mlb", 26.5, 2.5),  # box
        defender("olbL", 14.0, 2.0),  # box
        defender("olbR", 39.0, 2.0),  # box
        defender("dl", 24.0, 1.0),  # box
    ]


def cover2_look() -> list[PlayerGeometry]:
    """Two deep halves + corners in the flat (low, not off)."""
    return offensive_line() + [
        defender("cbL", 5.0, 2.0),
        defender("cbR", 48.0, 2.0),
        defender("fsL", 16.0, 14.0),
        defender("fsR", 37.0, 14.0),
        defender("mlb", 26.5, 3.0),
        defender("olbL", 12.0, 1.5),
        defender("olbR", 41.0, 1.5),
    ]


# ---------------------------------------------------------------------------
# 1. Deep safeties + off corners -> Cover 3
# ---------------------------------------------------------------------------


def test_deep_safeties_and_off_corners_classify_as_cover3() -> None:
    features = derive_features(cover3_look())
    assert features.n_deep == 2
    assert features.n_deep_corners == 0
    assert features.corners_off is True
    assert features.corners_press is False
    assert len(features.safety_depths) == 2
    assert all(depth >= DEEP_YARDS for depth in features.safety_depths)
    assert all(OFF_YARDS <= cushion < DEEP_YARDS for cushion in features.corner_cushions)
    assert classify_coverage(features) == "Cover 3"


def test_single_high_and_press_classify_as_one_man() -> None:
    features = derive_features(cover1man_look())
    assert features.n_deep == 1
    assert features.corners_press is True
    assert features.corners_off is False
    assert classify_coverage(features) == "1-Man"


def test_single_high_with_off_corners_is_cover1_not_one_man() -> None:
    """Same single-high shell, but off corners → Cover 1 (zone-free, not man)."""
    look = [
        defender("cbL", 5.0, 6.5),
        defender("cbR", 48.0, 6.5),
        defender("fs", 26.5, 14.0),
        defender("ss", 20.0, 6.0),
        defender("mlb", 26.5, 2.5),
    ]
    features = derive_features(look)
    assert features.n_deep == 1
    assert features.corners_press is False
    assert classify_coverage(features) == "Cover 1"


def test_two_deep_flat_corners_is_cover2() -> None:
    features = derive_features(cover2_look())
    assert features.n_deep == 2
    assert classify_coverage(features) == "Cover 2"


def test_zero_deep_press_is_cover0() -> None:
    look = [
        defender("cbL", 5.0, 1.0),
        defender("cbR", 48.0, 1.0),
        defender("s", 26.5, 6.0),
        defender("mlb", 26.5, 2.0),
        defender("blitzer", 18.0, 1.5),
    ]
    features = derive_features(look)
    assert features.n_deep == 0
    assert classify_coverage(features) == "Cover 0"


def test_four_deep_is_cover4_quarters() -> None:
    look = [
        defender("cbL", 6.0, 13.0),
        defender("cbR", 47.0, 13.0),
        defender("fsL", 18.0, 14.0),
        defender("fsR", 35.0, 14.0),
        defender("mlb", 26.5, 3.0),
    ]
    features = derive_features(look)
    assert features.n_deep == 4
    assert classify_coverage(features) == "Cover 4-Quarters"


def test_asymmetric_three_deep_is_cover6() -> None:
    """Two deep to the left, one to the right → quarters/half hybrid."""
    look = [
        defender("cbL", 6.0, 13.0),
        defender("sL", 16.0, 14.0),
        defender("sR", 36.0, 14.0),
        defender("cbR", 47.0, 4.0),
        defender("mlb", 26.5, 3.0),
    ]
    features = derive_features(look)
    assert features.n_deep == 3
    assert features.deep_left >= 2
    assert features.deep_right <= 1
    assert classify_coverage(features) == "Cover 6"


# ---------------------------------------------------------------------------
# 2. Pre-snap ≠ post-snap -> disguised
# ---------------------------------------------------------------------------


def test_pre_not_equal_post_is_disguised() -> None:
    """Pre shows Cover 1 Man, post rotates to Cover 3 → disguised."""
    result = split_play(cover1man_look(), cover3_look())
    assert result.pre_snap == "1-Man"
    assert result.post_snap == "Cover 3"
    assert result.disguised is True


def test_matching_pre_and_post_is_not_disguised() -> None:
    result = split_play(cover3_look(), cover3_look())
    assert result.pre_snap == "Cover 3"
    assert result.post_snap == "Cover 3"
    assert result.disguised is False


def test_play_result_public_shape() -> None:
    """Public serialisation uses the camelCase contract."""
    row = play_result_to_dict(split_play(cover1man_look(), cover3_look()))
    assert set(row) == {
        "preSnap",
        "postSnap",
        "disguised",
        "safetyDepth",
        "cornerLeverage",
        "boxCount",
    }
    assert row["preSnap"] == "1-Man"
    assert row["postSnap"] == "Cover 3"
    assert row["disguised"] is True
    assert row["boxCount"] >= 1
    assert len(row["cornerLeverage"]) == 2
    for lv in row["cornerLeverage"]:
        assert set(lv) == {"side", "technique", "leverage"}
        assert lv["side"] in ("left", "right")
        assert lv["technique"] in ("press", "off", "bail")
        assert lv["leverage"] in ("inside", "outside", "head_up")


# ---------------------------------------------------------------------------
# Derived features
# ---------------------------------------------------------------------------


def test_derive_features_reports_safety_depth_corner_leverage_box_count() -> None:
    features = derive_features(cover3_look())
    assert len(features.safety_depths) == 2
    assert all(d >= DEEP_YARDS for d in features.safety_depths)
    assert len(features.corner_cushions) == 2
    assert len(features.corner_leverage) == 2
    # mlb (x=26.5, y=2.5) + dl (x=24, y=1) are in the box; the OLBs sit
    # outside the TE-to-TE half-width and the corners are at y=7.
    assert features.box_count == 2


def test_box_count_counts_only_near_los_between_tackles() -> None:
    look = [
        defender("box1", 22.0, 1.0),
        defender("box2", 30.0, 2.0),
        defender("wide", 2.0, 1.0),      # near LOS but outside TE width
        defender("deep", 26.5, 15.0),    # deep, not in box
    ]
    features = derive_features(look)
    assert features.box_count == 2


def test_normalize_geometry_rebases_los_and_rejects_nonfinite() -> None:
    players = [defender("d1", 10.0, 5.0)]
    norm = normalize_geometry(players, view="all22", line_of_scrimmage_y=5.0)
    assert norm[0].y == pytest.approx(0.0)

    bad = [PlayerGeometry(player_id="x", team="defense", x=float("nan"), y=1.0)]
    with pytest.raises(ValueError):
        normalize_geometry(bad, view="all22")

    with pytest.raises(ValueError):
        normalize_geometry(players, view="sideline")  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# 3. Aggregation
# ---------------------------------------------------------------------------


def test_aggregate_distribution_disguise_rate_and_tendency() -> None:
    plays = [
        (split_play(cover1man_look(), cover3_look()), 1, 10),  # disguised
        (split_play(cover3_look(), cover3_look()), 1, 10),
        (split_play(cover2_look(), cover2_look()), 3, 2),
        (split_play(cover1man_look(), cover1man_look()), 3, 2),
    ]
    agg = aggregate_coverages(plays)

    assert agg["disguiseRate"] == pytest.approx(0.25)
    assert agg["coverageDistribution"]["Cover 3"] == pytest.approx(0.5)
    assert agg["coverageDistribution"]["Cover 2"] == pytest.approx(0.25)
    assert agg["coverageDistribution"]["1-Man"] == pytest.approx(0.25)
    assert sum(agg["coverageDistribution"].values()) == pytest.approx(1.0)

    tendency = agg["downDistanceTendency"]
    assert all("down" in row and "distanceBand" in row and "coverage" in row and "rate" in row for row in tendency)
    # down=1 distance=10 → "long" band; down=3 distance=2 → "short" band.
    long_band = [row for row in tendency if row["down"] == 1 and row["distanceBand"] == "long"]
    assert long_band
    assert sum(row["rate"] for row in long_band) == pytest.approx(1.0)
    short_band = [row for row in tendency if row["down"] == 3 and row["distanceBand"] == "short"]
    assert short_band
    assert sum(row["rate"] for row in short_band) == pytest.approx(1.0)


def test_aggregate_empty_is_zero_not_fabricated() -> None:
    agg = aggregate_coverages([])
    assert agg["coverageDistribution"] == {}
    assert agg["disguiseRate"] == 0.0
    assert agg["downDistanceTendency"] == []


# ---------------------------------------------------------------------------
# 4. Missing detector -> clear failure
# ---------------------------------------------------------------------------


def test_missing_detector_fails_closed() -> None:
    with pytest.raises(CoverageDependencyError) as excinfo:
        require_detector(None)
    assert excinfo.value.dependency == "YOLO/OpenCV"
    assert "refusing to fabricate" in str(excinfo.value)


class StubDetector:
    """Injected detector returning a fixed geometry list."""

    def __init__(self, players: list[PlayerGeometry]) -> None:
        self._players = players
        self.calls = 0

    def detect(self, frame: object) -> list[PlayerGeometry]:
        self.calls += 1
        return list(self._players)


def test_injected_detector_is_used_and_missing_detector_is_not_silently_ok() -> None:
    stub: PlayerDetector = StubDetector(cover3_look())
    resolved = require_detector(stub)
    detected = resolved.detect(object())
    assert len(detected) == len(cover3_look())
    assert classify_coverage(derive_features(detected)) == "Cover 3"
