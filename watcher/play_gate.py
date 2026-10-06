"""
Adaptive frame-rate gating for the GSE watch client.

The watcher does NOT stream 5 fps blindly. Two-tier capture:

  IDLE  1 fps — always sampling; keeps the pipeline warm, costs ~nothing.
  BURST 5 fps — only during live play.

Play detection v1 (this module): frame-difference motion energy above a
threshold, boosted by score-bug region presence. Rationale: between plays the
broadcast is mostly static (huddle, booth shots); live play has sustained
high motion energy across the field region. High motion alone triggers the
burst; moderate motion plus a static score-bug overlay also counts (the
overlay heuristic is fragile under JPEG recompression, so it is a boost,
not a hard gate).

  motion_energy(frame) = mean absolute difference vs the previous frame,
                        over the field ROI (center 80% of frame), normalized.

  score_bug_present(frame) = the broadcast score bug is a small,
    high-contrast, near-static overlay in a corner. v1 heuristic: the
    top-left corner region has above-median edge density AND low
    frame-to-frame change (static overlay on a moving broadcast).

v2 hook: score-bug clock OCR. When the clock is running, the play is live —
strictly more reliable than motion energy. The interface is defined here
(ClockOcr.read_seconds) and left unimplemented; the gate prefers it when
available, with zero changes to the watcher loop.

Efficiency: at 1 fps idle / 5 fps burst with ~40% of a broadcast in live
play, mean fps ≈ 2.6 — roughly half the compute of blind 5 fps, and idle
periods (halftime, between games) drop to 1 fps. Combined with 720p/q60
frames (~50 KB), a full game is on the order of ~1 GB upstream and
~25k Space inferences worst-case.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass
class PlayGateConfig:
    motion_threshold: float = 6.0      # mean abs diff (0-255) to count as motion
    burst_min_frames: int = 3          # consecutive live frames before bursting
    idle_cooldown_frames: int = 10     # consecutive quiet frames before idling
    bug_edge_quantile: float = 0.7     # edge-density quantile for bug presence
    bug_static_threshold: float = 2.0  # max mean diff for a "static" overlay


class ClockOcr(Protocol):
    """v2 hook: read the game clock from the score-bug region.

    Returns seconds remaining, or None when the clock isn't visible/legible.
    When implemented, the gate uses clock-running (delta < 0 between reads)
    as the live-play signal instead of motion energy.
    """

    def read_seconds(self, frame_bgr) -> Optional[int]: ...


def motion_energy(prev_gray, curr_gray) -> float:
    """Mean absolute frame difference over the field ROI (center 80%).

    Accepts numpy arrays (H, W) uint8. Pure function — unit-testable.
    """
    h, w = curr_gray.shape[:2]
    y0, y1 = int(h * 0.1), int(h * 0.9)
    x0, x1 = int(w * 0.1), int(w * 0.9)
    prev_roi = prev_gray[y0:y1, x0:x1].astype("float32")
    curr_roi = curr_gray[y0:y1, x0:x1].astype("float32")
    return float(abs(curr_roi - prev_roi).mean())


def score_bug_present(gray, prev_gray) -> bool:
    """v1 heuristic: top-left corner has high edge density but low change.

    The score bug is a small static overlay. We approximate "static" by low
    mean abs diff in the corner ROI and "overlay-like" by above-median
    gradient energy. Conservative: returns False when unsure.
    """
    try:
        import numpy as np
    except ImportError:
        return False
    h, w = gray.shape[:2]
    corner = gray[0 : int(h * 0.15), 0 : int(w * 0.25)].astype("float32")
    prev_corner = prev_gray[0 : int(h * 0.15), 0 : int(w * 0.25)].astype("float32")
    change = float(abs(corner - prev_corner).mean())
    if change > PlayGateConfig.bug_static_threshold:
        return False
    gy, gx = np.gradient(corner)
    edge = float(np.sqrt(gx * gx + gy * gy).mean())
    full_gy, full_gx = np.gradient(gray.astype("float32"))
    full_edge = float(np.sqrt(full_gx * full_gx + full_gy * full_gy).mean())
    return edge > full_edge * PlayGateConfig.bug_edge_quantile and edge > 1.0


class PlayGate:
    """Stateful 1fps/5fps gate with hysteresis."""

    def __init__(self, config: PlayGateConfig, clock_ocr: Optional[ClockOcr] = None):
        self.config = config
        self.clock_ocr = clock_ocr
        self._prev_gray = None
        self._live_streak = 0
        self._quiet_streak = 0
        self._bursting = False
        self._last_clock: Optional[int] = None

    def _to_gray(self, jpeg: bytes):
        import cv2
        import numpy as np

        arr = np.frombuffer(jpeg, dtype=np.uint8)
        bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    def observe_idle(self, jpeg: bytes) -> None:
        """Between games: keep the reference frame fresh, stay idle."""
        try:
            self._prev_gray = self._to_gray(jpeg)
        except Exception:
            pass
        self._bursting = False
        self._live_streak = 0

    def observe(self, jpeg: bytes) -> bool:
        """Feed one captured frame. Returns True when the gate says BURST."""
        try:
            gray = self._to_gray(jpeg)
        except Exception:
            return self._bursting

        live = self._bursting  # default: hold current state
        if self.clock_ocr is not None:
            secs = self.clock_ocr.read_seconds(jpeg)
            if secs is not None and self._last_clock is not None:
                live = secs < self._last_clock  # clock running => live play
            if secs is not None:
                self._last_clock = secs
        elif self._prev_gray is not None and self._prev_gray.shape == gray.shape:
            energy = motion_energy(self._prev_gray, gray)
            bug = score_bug_present(gray, self._prev_gray)
            # High motion alone means live play. Moderate motion plus a
            # static score-bug overlay also counts (broadcast is rarely
            # half-moving without a bug on screen). The bug is a boost,
            # not a hard gate — the overlay heuristic is fragile under
            # JPEG recompression.
            is_live = energy > self.config.motion_threshold or (
                energy > self.config.motion_threshold * 0.5 and bug
            )
            if is_live:
                self._live_streak += 1
                self._quiet_streak = 0
            else:
                self._quiet_streak += 1
                self._live_streak = 0
            if self._live_streak >= self.config.burst_min_frames:
                live = True
            elif self._quiet_streak >= self.config.idle_cooldown_frames:
                live = False
        self._prev_gray = gray
        self._bursting = live
        return live

    @property
    def bursting(self) -> bool:
        return self._bursting
