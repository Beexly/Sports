"""Tests for the film splitter pure kernel.

No real film fixture is used or needed. The kernel takes injected motion and
cadence series; the tests construct those series so the expected cuts are
known by construction.

Load-bearing properties:
1. Three confirmed motion bursts + matching cadence → **exactly** three play
   segments (not two from over-merging, not four from a double-fire).
2. Motion without a cadence marker inside 2 s is **excluded**.
3. Duplicate onsets (same play, two peaks) collapse to one start.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.models.film_splitter import (
    CADENCE_MAX_GAP_S,
    FilmDependencyError,
    FrameMotionSource,
    confirm_play_starts,
    dedupe_onsets,
    detect_cadence_bursts,
    detect_motion_onsets,
    require_ffmpeg,
    split_film,
    split_plays,
)

FPS = 30.0
HOP_S = 0.02


# ---------------------------------------------------------------------------
# Synthetic series helpers
# ---------------------------------------------------------------------------


def motion_series(
    duration_s: float,
    burst_times_s: tuple[float, ...],
    fps: float = FPS,
    base: float = 0.05,
    peak: float = 5.0,
) -> np.ndarray:
    """Flat motion with narrow peaks at ``burst_times_s`` (by construction)."""
    n = int(duration_s * fps)
    series = np.full(n, base, dtype=np.float64)
    for t in burst_times_s:
        idx = int(round(t * fps))
        if 0 <= idx < n:
            series[idx] = peak
            if idx + 1 < n:
                series[idx + 1] = peak * 0.4
    return series


def cadence_series(
    duration_s: float,
    burst_times_s: tuple[float, ...],
    hop_s: float = HOP_S,
    base: float = 0.02,
    peak: float = 1.0,
) -> np.ndarray:
    """Flat audio energy with narrow peaks at ``burst_times_s``."""
    n = int(duration_s / hop_s)
    series = np.full(n, base, dtype=np.float64)
    for t in burst_times_s:
        idx = int(round(t / hop_s))
        if 0 <= idx < n:
            series[idx] = peak
    return series


class StubMotionSource:
    """Injected FrameMotionSource returning a prepared series."""

    def __init__(self, diffs: np.ndarray, fps: float = FPS) -> None:
        self._diffs = diffs
        self._fps = fps

    def frame_differences(self, video_path: object) -> tuple[np.ndarray, float]:
        return self._diffs, self._fps


# ---------------------------------------------------------------------------
# 1. Three motion bursts + cadence -> exactly 3 segments
# ---------------------------------------------------------------------------


def test_three_motion_bursts_with_cadence_yield_exactly_three_segments() -> None:
    """3 confirmed onsets at 10/20/30s over 40s → plays [10,20), [20,30), [30,40)."""
    play_starts = (10.0, 20.0, 30.0)
    duration = 40.0
    diffs = motion_series(duration, play_starts)
    cadence = cadence_series(duration, play_starts)

    motion_onsets = detect_motion_onsets(diffs, FPS)
    assert len(motion_onsets) == 3

    cadence_times = detect_cadence_bursts(cadence, hop_s=HOP_S)
    assert len(cadence_times) == 3

    confirmed = confirm_play_starts(motion_onsets, cadence_times)
    assert confirmed == pytest.approx(list(play_starts), abs=0.05)

    segments = split_plays(confirmed, duration)
    assert len(segments) == 3
    assert [s["playIndex"] for s in segments] == [0, 1, 2]
    assert segments[0]["tStart"] == pytest.approx(10.0, abs=0.05)
    assert segments[0]["tEnd"] == pytest.approx(20.0, abs=0.05)
    assert segments[1]["tStart"] == pytest.approx(20.0, abs=0.05)
    assert segments[1]["tEnd"] == pytest.approx(30.0, abs=0.05)
    assert segments[2]["tStart"] == pytest.approx(30.0, abs=0.05)
    assert segments[2]["tEnd"] == pytest.approx(40.0, abs=0.05)
    for s in segments:
        assert s["tEnd"] > s["tStart"]


def test_end_to_end_split_film_with_injected_motion_source() -> None:
    """split_film with an injected motion source + cadence energy → 3 segments."""
    play_starts = (5.0, 15.0, 25.0)
    duration = 35.0
    diffs = motion_series(duration, play_starts)
    cadence = cadence_series(duration, play_starts)

    segments = split_film(
        "film.mp4",
        motion_source=StubMotionSource(diffs),
        cadence_energy=cadence,
        cadence_hop_s=HOP_S,
    )
    assert len(segments) == 3
    assert [s["playIndex"] for s in segments] == [0, 1, 2]
    assert segments[2]["tEnd"] == pytest.approx(duration, abs=0.05)


# ---------------------------------------------------------------------------
# 2. Unconfirmed motion is excluded
# ---------------------------------------------------------------------------


def test_motion_without_cadence_is_excluded() -> None:
    """A whip-pan motion burst with no cadence inside the gap must not become a play."""
    motion_only = 12.0
    cadence_at = 25.0
    diffs = motion_series(40.0, (motion_only, cadence_at))
    # Cadence only near the second motion; the first has no cadence partner.
    cadence = cadence_series(40.0, (cadence_at,))

    motion_onsets = detect_motion_onsets(diffs, FPS)
    assert len(motion_onsets) == 2

    cadence_times = detect_cadence_bursts(cadence, hop_s=HOP_S)
    confirmed = confirm_play_starts(motion_onsets, cadence_times)
    assert len(confirmed) == 1
    assert confirmed[0] == pytest.approx(cadence_at, abs=0.05)

    segments = split_plays(confirmed, 40.0)
    assert len(segments) == 1
    assert segments[0]["tStart"] == pytest.approx(cadence_at, abs=0.05)


def test_motion_beyond_cadence_gap_is_excluded() -> None:
    """Motion more than CADENCE_MAX_GAP_S away from any cadence marker is dropped."""
    motion_on = 10.0
    cadence_on = 10.0 + CADENCE_MAX_GAP_S + 0.5
    confirmed = confirm_play_starts([motion_on], [cadence_on])
    assert confirmed == []

    # Inside the gap it confirms.
    assert confirm_play_starts([motion_on], [motion_on + CADENCE_MAX_GAP_S]) == [
        pytest.approx(motion_on)
    ]


def test_flat_motion_and_flat_cadence_yield_empty() -> None:
    """Flat signals produce no onsets, no bursts, no segments — never invented cuts."""
    flat_motion = np.full(int(10.0 * FPS), 0.1, dtype=np.float64)
    flat_cadence = np.full(int(10.0 / HOP_S), 0.1, dtype=np.float64)
    assert detect_motion_onsets(flat_motion, FPS) == []
    assert detect_cadence_bursts(flat_cadence, hop_s=HOP_S) == []
    assert split_plays([], 10.0) == []


def test_split_film_without_cadence_energy_is_empty() -> None:
    """No cadence series → no confirmed starts → []. Fail-closed, not fabricated."""
    diffs = motion_series(20.0, (5.0, 12.0))
    segments = split_film("film.mp4", motion_source=StubMotionSource(diffs), cadence_energy=None)
    assert segments == []


# ---------------------------------------------------------------------------
# 3. Duplicate onsets are handled
# ---------------------------------------------------------------------------


def test_duplicate_onsets_collapse_to_one_play() -> None:
    """Two motion peaks 0.2s apart (double-fire) become a single start."""
    diffs = motion_series(30.0, (10.0, 10.2))
    onsets = detect_motion_onsets(diffs, FPS)
    assert len(onsets) == 1

    collapsed = dedupe_onsets([10.0, 10.15, 10.25, 15.0])
    assert collapsed == pytest.approx([10.0, 15.0])

    confirmed = confirm_play_starts([10.0, 10.1], [10.0])
    assert len(confirmed) == 1
    assert confirmed[0] == pytest.approx(10.0)

    segments = split_plays([10.0, 10.05, 10.1], 25.0)
    assert len(segments) == 1
    assert segments[0]["playIndex"] == 0
    assert segments[0]["tStart"] == pytest.approx(10.0)


def test_two_plays_with_duplicate_cadence_still_split_twice() -> None:
    """Duplicate handling must not over-merge genuinely separate plays."""
    starts = [8.0, 22.0]
    confirmed = confirm_play_starts([8.0, 8.1, 22.0, 22.1], [8.0, 22.0])
    assert confirmed == pytest.approx(starts, abs=0.05)
    segments = split_plays(confirmed, 35.0)
    assert len(segments) == 2
    assert segments[0]["tEnd"] == pytest.approx(22.0, abs=0.05)
    assert segments[1]["tEnd"] == pytest.approx(35.0, abs=0.05)


# ---------------------------------------------------------------------------
# Kernel guards and dependency fail-closed
# ---------------------------------------------------------------------------


def test_kernel_rejects_bad_arguments() -> None:
    with pytest.raises(ValueError):
        detect_motion_onsets([1.0, 2.0], 0.0)
    with pytest.raises(ValueError):
        detect_motion_onsets(np.zeros((2, 2)), 30.0)
    with pytest.raises(ValueError):
        detect_cadence_bursts([1.0, 2.0], hop_s=0.0)
    with pytest.raises(ValueError):
        confirm_play_starts([1.0], [1.0], max_gap_s=-1.0)
    with pytest.raises(ValueError):
        split_plays([1.0], -5.0)


def test_missing_ffmpeg_fails_clearly(monkeypatch: pytest.MonkeyPatch) -> None:
    """No ffmpeg on PATH → FilmDependencyError naming the dependency."""
    import shutil

    monkeypatch.setattr(shutil, "which", lambda name: None)
    with pytest.raises(FilmDependencyError) as excinfo:
        require_ffmpeg()
    assert excinfo.value.dependency == "FFmpeg"
    assert "refusing to fabricate" in str(excinfo.value)


def test_split_film_default_path_fails_closed_without_motion_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Default path (no injected motion source) must not invent segments."""
    import shutil

    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/ffmpeg")
    with pytest.raises(FilmDependencyError) as excinfo:
        split_film("film.mp4")
    assert "efusing to fabricate" in str(excinfo.value)


def test_split_film_default_path_fails_closed_without_ffmpeg(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import shutil

    monkeypatch.setattr(shutil, "which", lambda name: None)
    with pytest.raises(FilmDependencyError) as excinfo:
        split_film("film.mp4")
    assert excinfo.value.dependency == "FFmpeg"
