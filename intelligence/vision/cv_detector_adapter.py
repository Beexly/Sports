"""CV detector adapter — Python mirror of packages/prediction-engine/src/tracking/cv-detector-contract.ts

Fulfils the external agent's cv_detector_adapter.py spec:
  - DetectorAdapter protocol matching the TS Detector contract
    (detect(frame) -> [Detection], Detection = bbox/confidence/classId/teamHint).
  - MockDetector: deterministic 22 players + 1 ball for tests.
  - RoboflowSportsDetector stub: falls back to Mock when the package/weights
    are absent, and SAYS SO on every frame it mocks.
  - get_detector(prefer_roboflow=True) entry point.

Shadow-only discipline (VISION-CONTRACT.md): nothing this module emits may
feed a published distribution. weight forced 0.0 until the contract falsifier
(held-out calibration 85-95% AND uncertainty narrower than market) is met.

This module deliberately does NOT import the TS contract at runtime; the TS
side remains the canonical contract and this file mirrors its shape so a
detector can be swapped across the boundary without touching either side.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Protocol

REPO = Path(__file__).resolve().parents[2]

DetectionClass = Literal["player", "ball", "ref", "other"]


@dataclass(frozen=True)
class BoundingBox:
    x: float
    y: float
    width: float
    height: float


@dataclass(frozen=True)
class Detection:
    bbox: BoundingBox
    confidence: float
    class_id: DetectionClass
    team_hint: str | None = None


@dataclass(frozen=True)
class VideoFrame:
    index: int
    t: float
    width: int
    height: int
    pixels: tuple = field(default=())  # production frames arrive decoded upstream


class DetectorAdapter(Protocol):
    name: str
    is_mock: bool

    def detect(self, frame: VideoFrame) -> list[Detection]: ...


class MockDetector:
    """Deterministic 22 players + 1 ball. Identity is ALWAYS mock — flagged."""

    name = "mock"
    is_mock = True

    def detect(self, frame: VideoFrame) -> list[Detection]:
        out: list[Detection] = []
        w, h = frame.width or 1920, frame.height or 1080
        # 22 players in two 11-wide rows, deterministic jitter by frame index
        for i in range(22):
            row, col = divmod(i, 11)
            jx = ((frame.index * 7 + i * 13) % 40) - 20
            jy = ((frame.index * 5 + i * 11) % 24) - 12
            bx = w * (0.12 + 0.076 * col) + jx
            by = h * (0.42 + 0.22 * row) + jy
            out.append(Detection(
                bbox=BoundingBox(bx, by, 36, 78),
                confidence=0.9,
                class_id="player",
                team_hint="HOME" if row == 0 else "AWAY",
            ))
        # 1 ball mid-pitch, drifting with the frame
        bx = w * 0.5 + ((frame.index * 11) % 60) - 30
        out.append(Detection(bbox=BoundingBox(bx, h * 0.53, 12, 12),
                             confidence=0.85, class_id="ball"))
        return out


class RoboflowSportsDetector:
    """Stub for roboflow/sports (MIT). Falls back to Mock when unavailable —
    and every mocked frame is labelled as such so shadow logs cannot mistake
    a mock for a real detection."""

    name = "roboflow-sports"
    is_mock = False  # intent; flips to True in practice when fallback engages

    def __init__(self) -> None:
        self._reason: str | None = None
        try:
            import roboflow  # noqa: F401
            self._backend = "roboflow"
            # Real weight-loading is deliberately NOT attempted here: no weights
            # ship in this repo (same rule as the TS contract), and the shadow
            # path must not pretend to run a model it did not load.
            self._reason = "roboflow package present; weights not loaded by design (shadow-only)"
        except Exception as exc:
            self._backend = None
            self._reason = f"roboflow package absent ({type(exc).__name__}); falling back to Mock"
        self._mock = MockDetector()

    @property
    def fallback_reason(self) -> str | None:
        return self._reason

    def detect(self, frame: VideoFrame) -> list[Detection]:
        if self._backend is None:
            self.is_mock = True
            return self._mock.detect(frame)
        # A real implementation lands here when weights + rights path exist.
        # Until then the honest output is the mock, flagged.
        self.is_mock = True
        return self._mock.detect(frame)


def get_detector(prefer_roboflow: bool = True) -> DetectorAdapter:
    if prefer_roboflow:
        return RoboflowSportsDetector()
    return MockDetector()


def _shadow_log(frame_index: int, detections: list[Detection], meta: dict) -> Path:
    """Append one line to intelligence/vision/shadow/vision_shadow.jsonl.

    Shadow discipline: weight is FORCED to 0.0 and validation_spec_met is
    FORCED to false on every row — the contract falsifier has not been run
    (no held-out plays), so these detections must never reach a published
    distribution.
    """
    shadow_dir = REPO / "intelligence" / "vision" / "shadow"
    shadow_dir.mkdir(parents=True, exist_ok=True)
    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "detector": meta.get("detector"),
        "is_mock": meta.get("is_mock"),
        "frame_index": frame_index,
        "n_detections": len(detections),
        "players": sum(1 for d in detections if d.class_id == "player"),
        "balls": sum(1 for d in detections if d.class_id == "ball"),
        "weight": 0.0,                    # forced: contract falsifier not run
        "validation_spec_met": False,     # forced: no held-out play set exists
        "note": meta.get("note"),
    }
    p = shadow_dir / "vision_shadow.jsonl"
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")
    return p


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--frames", type=int, default=3)
    ap.add_argument("--prefer-mock", action="store_true", help="skip the roboflow probe")
    ap.add_argument("--no-write", action="store_true")
    args = ap.parse_args()

    det = get_detector(prefer_roboflow=not args.prefer_mock)
    reason = getattr(det, "fallback_reason", None)
    print(f"detector={det.name} is_mock={getattr(det, 'is_mock', '?')}"
          + (f" | {reason}" if reason else ""))

    last_path = None
    for i in range(args.frames):
        frame = VideoFrame(index=i, t=i / 30.0, width=1920, height=1080)
        dets = det.detect(frame)
        players = sum(1 for d in dets if d.class_id == "player")
        balls = sum(1 for d in dets if d.class_id == "ball")
        print(f"  frame {i}: {len(dets)} detections ({players} players, {balls} ball)")
        assert players == 22 and balls == 1, "contract check failed: 22+1 expected"
        if not args.no_write:
            last_path = _shadow_log(
                i, dets,
                {"detector": det.name, "is_mock": det.is_mock,
                 "note": reason or "mock contract check"})
    print("CONTRACT CHECK OK: 22 players + 1 ball on every frame; shadow rows"
          + (f" -> {last_path}" if last_path else " NOT written (--no-write)"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
