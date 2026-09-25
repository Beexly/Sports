"""Split broadcast film into play segments from motion/audio boundaries.

The dependency-free ``segment_from_features`` kernel is deterministic and is
what tests use. The file-level path uses OpenCV/FFmpeg only when a real video
is supplied; a missing optional dependency raises a clear runtime error.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from typing import Sequence

CADENCE_CONFIRMATION_SECONDS = 2.0


@dataclass(frozen=True)
class PlaySegment:
    playIndex: int
    tStart: float
    tEnd: float


def segment_from_features(
    motion_onsets: Sequence[float],
    cadence_markers: Sequence[float],
    duration: float,
    confirmation_seconds: float = CADENCE_CONFIRMATION_SECONDS,
) -> list[dict[str, float | int]]:
    if duration < 0:
        raise ValueError("duration must be non-negative")
    starts = sorted(
        onset
        for onset in motion_onsets
        if any(abs(onset - marker) <= confirmation_seconds for marker in cadence_markers)
        and 0 <= onset <= duration
    )
    # Collapse duplicate detections for the same play onset.
    deduped: list[float] = []
    for start in starts:
        if not deduped or start - deduped[-1] > 0.25:
            deduped.append(start)
    return [
        {
            "playIndex": index,
            "tStart": start,
            "tEnd": deduped[index + 1] if index + 1 < len(deduped) else duration,
        }
        for index, start in enumerate(deduped)
    ]


def _motion_onsets(video_path: str) -> list[float]:
    try:
        import cv2  # type: ignore
    except ImportError as exc:  # pragma: no cover - optional deployment dependency
        raise RuntimeError("opencv-python is required for film splitting") from exc
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise ValueError("unable to open video")
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    previous = None
    onsets: list[float] = []
    frame_index = 0
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, (160, 90))
        motion = float(cv2.absdiff(small, previous).mean()) if previous is not None else 0.0
        previous = small
        if motion > 8.0:
            time = frame_index / fps if fps > 0 else 0.0
            if not onsets or time - onsets[-1] > 0.25:
                onsets.append(time)
        frame_index += 1
    capture.release()
    return onsets


def _cadence_markers(video_path: str) -> list[float]:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required for cadence confirmation")
    command = ["ffmpeg", "-i", video_path, "-af", "astats=metadata=1:reset=1", "-f", "null", "-"]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode not in (0, 1):
        raise RuntimeError("ffmpeg audio analysis failed")
    markers: list[float] = []
    for line in result.stderr.splitlines():
        if "lavfi.astats.Overall.RMS_level" in line:
            try:
                markers.append(float(line.split(":")[-1].strip()))
            except ValueError:
                continue
    return markers


def split_film(video_path: str) -> list[dict[str, float | int]]:
    if not video_path:
        return []
    # OpenCV provides the duration; feature extraction is injectable in tests via
    # segment_from_features so no synthetic video fixture is needed.
    import cv2  # type: ignore
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise ValueError("unable to open video")
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = frame_count / fps if fps > 0 else 0.0
    capture.release()
    return segment_from_features(_motion_onsets(video_path), _cadence_markers(video_path), duration)


__all__ = ["PlaySegment", "segment_from_features", "split_film"]
