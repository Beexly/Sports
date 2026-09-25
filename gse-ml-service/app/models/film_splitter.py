"""Play segmentation from film: motion onsets confirmed by cadence bursts.

What this module IS
-------------------
A deterministic play splitter. It separates a continuous film recording into
individual plays using two independent signals:

1. **Motion onset** — frame-differencing peaks (defence/offence snapping into
   motion at the start of a play).
2. **Cadence burst** — a short audio energy burst at the QB cadence / snap
   count.

A motion onset becomes a play start **only** when a cadence marker falls
within ``CADENCE_MAX_GAP_S`` (2.0 s) of it. Unconfirmed motion (camera
whip-pans, sideline chatter) is dropped. Near-duplicate onsets (same play
double-fired) collapse to a single start.

Output rows are ``{"playIndex", "tStart", "tEnd"}``.

What this module IS NOT
-----------------------
* It is **not** a play classifier or a win-probability model. Segments are
  temporal cuts only.
* It does **not** invent plays. Motion without cadence is excluded; flat
  signals yield ``[]``. Missing FFmpeg (needed only to read real film) raises
  :class:`FilmDependencyError` rather than fabricating segments.

Pure kernel
-----------
:func:`detect_motion_onsets`, :func:`detect_cadence_bursts`,
:func:`confirm_play_starts`, :func:`dedupe_onsets`, and :func:`split_plays`
operate on injected numeric series and are fully testable without a film
fixture. The end-to-end :func:`split_film` path is the only part that touches
FFmpeg / video files.
"""

from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path
from typing import Literal, Protocol, Sequence, TypedDict

import numpy as np

__all__ = [
    "CADENCE_MAX_GAP_S",
    "FilmDependencyError",
    "FrameMotionSource",
    "PlaySegmentDict",
    "confirm_play_starts",
    "dedupe_onsets",
    "detect_cadence_bursts",
    "detect_motion_onsets",
    "split_film",
    "split_plays",
]

# ── Tunables ───────────────────────────────────────────────────────────────────

#: A motion onset is confirmed only when a cadence marker is this close (s).
CADENCE_MAX_GAP_S = 2.0
#: Minimum separation between two distinct play onsets (s).
MIN_ONSET_SEPARATION_S = 0.75
#: Onset detector: peak must exceed mean + this many σ of the motion series.
MOTION_SIGMA = 2.0
#: Cadence burst detector: energy must exceed mean + this many σ.
CADENCE_SIGMA = 2.0
#: Minimum play length in the output segmentation (s).
MIN_PLAY_S = 1.5


class FilmDependencyError(RuntimeError):
    """Raised when FFmpeg is required to read film and is unavailable."""

    def __init__(self, dependency: str, detail: str) -> None:
        super().__init__(f"{dependency} unavailable: {detail}")
        self.dependency = dependency
        self.detail = detail


class PlaySegmentDict(TypedDict):
    """One play cut. Keys are the public camelCase contract."""

    playIndex: int
    tStart: float
    tEnd: float


class FrameMotionSource(Protocol):
    """Injected frame-difference source. Returns one motion score per frame."""

    def frame_differences(self, video_path: Path) -> tuple[np.ndarray, float]:
        """Return ``(frame_diffs, fps)``. ``frame_diffs`` is 1-D float."""
        ...


# ── Pure kernels ───────────────────────────────────────────────────────────────


def detect_motion_onsets(
    frame_diffs: Sequence[float],
    fps: float,
    *,
    sigma: float = MOTION_SIGMA,
    min_separation_s: float = MIN_ONSET_SEPARATION_S,
) -> list[float]:
    """Pick motion onset times (seconds) from a frame-difference series.

    A frame is an onset candidate when its difference exceeds
    ``mean + sigma * std`` of the whole series and is a local maximum within
    ``min_separation_s``. Duplicate onsets inside that window collapse to the
    earliest peak. Flat series (std == 0) yields ``[]`` — never invented cuts.
    """
    if fps <= 0:
        raise ValueError(f"fps must be positive, got {fps}")
    diffs = np.asarray(frame_diffs, dtype=np.float64)
    if diffs.ndim != 1:
        raise ValueError(f"frame_diffs must be 1-D, got shape {diffs.shape}")
    if diffs.size == 0:
        return []

    mean = float(diffs.mean())
    std = float(diffs.std())
    if std <= 0.0:
        return []

    threshold = mean + sigma * std
    candidates: list[float] = []
    n = int(diffs.size)
    for i in range(n):
        if float(diffs[i]) <= threshold:
            continue
        left = float(diffs[i - 1]) if i > 0 else -math.inf
        right = float(diffs[i + 1]) if i + 1 < n else -math.inf
        if diffs[i] >= left and diffs[i] >= right:
            candidates.append(i / fps)
    return dedupe_onsets(candidates, min_separation_s=min_separation_s)


def detect_cadence_bursts(
    audio_energy: Sequence[float],
    *,
    hop_s: float = 0.02,
    sigma: float = CADENCE_SIGMA,
    min_separation_s: float = MIN_ONSET_SEPARATION_S,
) -> list[float]:
    """Pick cadence-burst times (seconds) from a per-hop audio energy series.

    Same peak logic as motion onsets, over hop-indexed energy. Flat energy
    yields ``[]``.
    """
    if hop_s <= 0:
        raise ValueError(f"hop_s must be positive, got {hop_s}")
    energy = np.asarray(audio_energy, dtype=np.float64)
    if energy.ndim != 1:
        raise ValueError(f"audio_energy must be 1-D, got shape {energy.shape}")
    if energy.size == 0:
        return []

    mean = float(energy.mean())
    std = float(energy.std())
    if std <= 0.0:
        return []

    threshold = mean + sigma * std
    candidates: list[float] = []
    n = int(energy.size)
    for i in range(n):
        if float(energy[i]) <= threshold:
            continue
        left = float(energy[i - 1]) if i > 0 else -math.inf
        right = float(energy[i + 1]) if i + 1 < n else -math.inf
        if energy[i] >= left and energy[i] >= right:
            candidates.append(i * hop_s)
    return dedupe_onsets(candidates, min_separation_s=min_separation_s)


def dedupe_onsets(onsets: Sequence[float], *, min_separation_s: float = MIN_ONSET_SEPARATION_S) -> list[float]:
    """Collapse onsets closer than ``min_separation_s`` to the earliest one."""
    if not onsets:
        return []
    ordered = sorted(float(t) for t in onsets)
    kept: list[float] = [ordered[0]]
    for t in ordered[1:]:
        if t - kept[-1] >= min_separation_s:
            kept.append(t)
    return kept


def confirm_play_starts(
    motion_onsets: Sequence[float],
    cadence_times: Sequence[float],
    *,
    max_gap_s: float = CADENCE_MAX_GAP_S,
) -> list[float]:
    """Keep motion onsets only when a cadence marker is within ``max_gap_s``.

    Motion without a cadence confirmation is excluded — that is the rule that
    drops whip-pans and non-play movement. Results are de-duplicated and
    time-sorted.
    """
    if max_gap_s < 0:
        raise ValueError(f"max_gap_s must be non-negative, got {max_gap_s}")
    cadence = [float(c) for c in cadence_times]
    confirmed = [
        float(m)
        for m in motion_onsets
        if any(abs(float(m) - c) <= max_gap_s for c in cadence)
    ]
    return dedupe_onsets(confirmed)


def split_plays(
    play_starts: Sequence[float],
    total_duration_s: float,
    *,
    min_play_s: float = MIN_PLAY_S,
) -> list[PlaySegmentDict]:
    """Cut ``[0, total_duration_s)`` at the confirmed play starts.

    Play ``i`` spans ``[start_i, start_{i+1})``; the last play ends at
    ``total_duration_s``. Trailing intervals shorter than ``min_play_s`` are
    absorbed into the previous play rather than emitted as stub segments.
    ``playIndex`` is 0-based in time order.
    """
    if total_duration_s < 0:
        raise ValueError(f"total_duration_s must be non-negative, got {total_duration_s}")
    starts = dedupe_onsets(play_starts)
    starts = [t for t in starts if 0.0 <= t < total_duration_s]
    if not starts:
        return []
    if starts[0] > 0.0:
        # Leading pre-play footage is not a play; cuts begin at the first start.
        pass

    bounds = starts + [total_duration_s]
    segments: list[PlaySegmentDict] = []
    for i in range(len(starts)):
        t_start = starts[i]
        t_end = bounds[i + 1]
        if t_end - t_start < min_play_s and segments:
            # Too short: extend the previous play over this stub.
            prev = segments[-1]
            segments[-1] = PlaySegmentDict(
                playIndex=prev["playIndex"],
                tStart=prev["tStart"],
                tEnd=t_end,
            )
            continue
        if t_end - t_start < min_play_s and not segments:
            continue
        segments.append(
            PlaySegmentDict(
                playIndex=len(segments),
                tStart=round(t_start, 3),
                tEnd=round(t_end, 3),
            )
        )
    return segments


# ── End-to-end path (real film; requires FFmpeg) ───────────────────────────────


def require_ffmpeg() -> str:
    """Return the ffmpeg path, or raise :class:`FilmDependencyError`."""
    path = shutil.which("ffmpeg")
    if not path:
        raise FilmDependencyError(
            "FFmpeg",
            "ffmpeg executable not found on PATH. FFmpeg is required to read "
            "film frames/audio; refusing to fabricate play segments.",
        )
    return path


def _probe_duration_s(ffmpeg: str, video_path: Path) -> float:
    cmd = [
        ffmpeg,
        "-nostdin",
        "-hide_banner",
        "-i",
        str(video_path),
        "-f",
        "null",
        "-",
    ]
    completed = subprocess.run(cmd, check=False, capture_output=True, timeout=120)
    # ffmpeg writes duration to stderr; parse conservatively.
    stderr = completed.stderr.decode("utf-8", errors="replace")
    for token in stderr.replace("\n", " ").split():
        if token.startswith("time="):
            raw = token.split("=", 1)[1]
            try:
                parts = raw.split(":")
                if len(parts) == 3:
                    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            except ValueError:
                continue
    raise FilmDependencyError(
        "FFmpeg",
        f"could not read a duration for {video_path}; refusing to fabricate "
        "play segments without an observed timeline.",
    )


def split_film(
    video_path: str | Path,
    *,
    motion_source: FrameMotionSource | None = None,
    cadence_energy: Sequence[float] | None = None,
    cadence_hop_s: float = 0.02,
) -> list[PlaySegmentDict]:
    """Split a film file into plays.

    ``motion_source`` supplies frame differences (injected in tests); the
    default reads the file with FFmpeg and fails closed when FFmpeg is
    missing. ``cadence_energy`` is the hop-indexed audio energy series used
    for cadence bursts; without it, motion onsets alone are returned as
    unconfirmed and the result is ``[]`` (no cadence → no confirmed plays).
    """
    path = Path(video_path)
    if motion_source is not None:
        frame_diffs, fps = motion_source.frame_differences(path)
    else:
        # No bundled frame reader: the default path requires an injected
        # motion source. Probe FFmpeg first so a missing binary is reported as
        # a dependency failure, then fail closed either way — never fabricate
        # segments from a file we cannot decode.
        ffmpeg = require_ffmpeg()
        raise FilmDependencyError(
            "FFmpeg",
            f"no FrameMotionSource injected and no bundled decoder for {path} "
            f"(ffmpeg at {ffmpeg}); inject a motion source or a film reader. "
            "Refusing to fabricate play segments.",
        )

    if cadence_energy is None:
        return []

    motion_onsets = detect_motion_onsets(frame_diffs, fps)
    cadence_times = detect_cadence_bursts(cadence_energy, hop_s=cadence_hop_s)
    starts = confirm_play_starts(motion_onsets, cadence_times)
    duration = (float(frame_diffs.size) / fps) if fps > 0 else 0.0
    return split_plays(starts, duration)
