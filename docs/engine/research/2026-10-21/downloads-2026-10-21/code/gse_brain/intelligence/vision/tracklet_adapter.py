"""
Vision Tracklet adapter behind VISION-CONTRACT.md.

Inputs: frame or detection list.
Outputs: Tracklets (player + ball) in field meters (stand-in until homography wired).
Verification: weight 0 until identity-loop validation_spec_met.
Falsifier (from contract): 90% intervals contain 85-95% of outcomes AND
uncertainty narrower than market on at least one margin — not yet claimed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SHADOW = Path("artifacts/gse_brain/intelligence/vision/shadow")
SHADOW.mkdir(parents=True, exist_ok=True)


@dataclass
class Tracklet:
    track_id: str
    class_name: str          # "player" | "ball"
    positions_m: list[tuple[float, float]] = field(default_factory=list)
    confidence: float = 0.0
    jersey: int | None = None
    gsis_id: str | None = None


@dataclass
class VisionOutput:
    frame_id: str
    tracklets: list[Tracklet]
    ball: Tracklet | None
    weight: float = 0.0
    validation_spec_met: bool = False
    honesty: str = "uncalibrated_shadow"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def detections_to_tracklets(detections: list[dict[str, Any]], frame_id: str) -> VisionOutput:
    """
    Map detector output to Tracklets.
    Ball is separated. Jersey/gsis_id left None until OCR + roster join.
    """
    tracklets: list[Tracklet] = []
    ball: Tracklet | None = None
    for i, d in enumerate(detections):
        cls = d.get("class_name", "player")
        tid = d.get("track_id", f"T-{i:03d}")
        pos = (float(d.get("x", 0)) * 0.1, float(d.get("y", 0)) * 0.1)
        conf = float(d.get("confidence", 0))
        t = Tracklet(tid, cls, [pos], conf, d.get("jersey"), d.get("gsis_id"))
        if cls == "ball" and ball is None:
            ball = t
        tracklets.append(t)
    out = VisionOutput(frame_id=frame_id, tracklets=tracklets, ball=ball)
    # force weight 0
    out.weight = 0.0
    out.validation_spec_met = False
    _log(out)
    return out


def _log(out: VisionOutput) -> None:
    path = SHADOW / "vision_shadow.jsonl"
    try:
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(out), default=str) + "\n")
    except OSError:
        pass


def falsifier_check_stub() -> dict[str, Any]:
    """
    Placeholder for the contract falsifier.
    Returns not-yet-measured until real held-out plays exist.
    """
    return {
        "interval_coverage": None,
        "narrower_than_market": None,
        "spec_met": False,
        "honesty": "not_measured",
    }


if __name__ == "__main__":
    demo = [
        {"class_name": "player", "x": 100, "y": 200, "confidence": 0.92, "track_id": "T-07"},
        {"class_name": "ball", "x": 400, "y": 300, "confidence": 0.88, "track_id": "BALL"},
    ]
    result = detections_to_tracklets(demo, frame_id="demo_001")
    print(json.dumps(asdict(result), indent=2, default=str))
    print("falsifier:", falsifier_check_stub())
