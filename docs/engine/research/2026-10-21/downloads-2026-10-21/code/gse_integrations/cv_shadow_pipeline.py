"""
GSE CV Shadow Pipeline — Practical Sequence (polished)

1. Roboflow sports detector as second adapter (shadow-logged).
2. Ball class -> Tracklet for homography / movement stages.
3. nflverse join only when jersey OCR present.
4. Shadow ledger weight forced to 0.
5. Published distributions updated only after validation_spec_met=True.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cv_detector_adapter import Detection, get_detector, MockDetector

SHADOW = Path("artifacts/gse_integrations/shadow_ledger")
SHADOW.mkdir(parents=True, exist_ok=True)
LEDGER = SHADOW / "film_shadow_ledger.jsonl"


@dataclass
class Tracklet:
    track_id: str
    class_name: str
    positions: list[tuple[float, float]] = field(default_factory=list)
    confidence: float = 0.0


@dataclass
class ShadowRow:
    signal_name: str
    value: Any
    weight: float = 0.0
    source: str = ""
    honesty: str = "uncalibrated"
    validation_spec_met: bool = False
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def append_shadow(row: ShadowRow) -> None:
    if not row.validation_spec_met:
        row.weight = 0.0
        row.honesty = "uncalibrated_weight_0"
    try:
        with LEDGER.open("a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(row), default=str) + "\n")
    except OSError:
        pass


def run_shadow_detectors(frame: Any) -> dict[str, list[Detection]]:
    primary = MockDetector().detect(frame)
    roboflow = get_detector(prefer_roboflow=True).detect(frame)
    append_shadow(ShadowRow("detector_primary_count", len(primary), source="primary"))
    append_shadow(ShadowRow("detector_roboflow_count", len(roboflow), source="roboflow"))
    append_shadow(ShadowRow("detector_roboflow_ball_present", any(d.class_name == "ball" for d in roboflow), source="roboflow"))
    return {"primary": primary, "roboflow": roboflow}


def extract_ball_tracklet(detections: list[Detection], track_id: str = "BALL-01") -> Tracklet | None:
    balls = [d for d in detections if d.class_name == "ball"]
    if not balls:
        append_shadow(ShadowRow("ball_tracklet", None, source="ball_extract", honesty="no_ball"))
        return None
    b = max(balls, key=lambda d: d.confidence)
    track = Tracklet(track_id, "ball", [(round(b.x * 0.1, 2), round(b.y * 0.1, 2))], b.confidence)
    append_shadow(ShadowRow("ball_tracklet_confidence", track.confidence, source="ball_extract"))
    return track


def join_nflverse_when_identity(tracklet_id: str, jersey_number: int | None, game_id: str, play_id: int) -> dict[str, Any] | None:
    if jersey_number is None:
        append_shadow(ShadowRow("nflverse_join", None, source="nflverse", honesty="skipped_no_jersey_ocr"))
        return None
    joined = {"tracklet_id": tracklet_id, "jersey": jersey_number, "game_id": game_id, "play_id": play_id, "epa": None}
    append_shadow(ShadowRow("nflverse_join_ready", joined, source="nflverse"))
    return joined


def film_feature_to_decision(feature_name: str, feature_value: Any, validation_spec_met: bool = False) -> dict[str, Any]:
    row = ShadowRow(feature_name, feature_value, validation_spec_met=validation_spec_met, source="film_features")
    append_shadow(row)
    return {"feature": feature_name, "value": feature_value, "applied_weight": row.weight, "affects_published_distribution": validation_spec_met, "honesty": row.honesty}


def process_frame(frame: Any, frame_idx: int, jersey: int | None = None) -> dict[str, Any]:
    dets = run_shadow_detectors(frame)
    ball = extract_ball_tracklet(dets["roboflow"], track_id=f"BALL-{frame_idx:03d}")
    joined = join_nflverse_when_identity(f"T-{frame_idx:02d}", jersey, "2026_01_EXAMPLE", 1000 + frame_idx)
    film = film_feature_to_decision("sep_at_break_yd", round(2.3 + frame_idx * 0.1, 2), validation_spec_met=False)
    return {"frame": frame_idx, "primary": len(dets["primary"]), "roboflow": len(dets["roboflow"]), "ball": ball.track_id if ball else None, "nflverse_joined": joined is not None, "film": film}


def run_video_sequence(n_frames: int = 8, jersey: int | None = None) -> list[dict[str, Any]]:
    return [process_frame(f"frame_{i}", i, jersey) for i in range(n_frames)]


def run_sequence(jersey: int | None = None) -> dict[str, Any]:
    frames = run_video_sequence(1, jersey)
    return frames[0] if frames else {}


if __name__ == "__main__":
    print("=== Single frame (no jersey) ===")
    print(json.dumps(run_sequence(None), indent=2))
    print("\n=== Video sequence (8 frames, jersey=11) ===")
    seq = run_video_sequence(8, 11)
    print(json.dumps(seq, indent=2))
    print(f"\nLedger exists: {LEDGER.exists()}")
    if LEDGER.exists():
        lines = [ln for ln in LEDGER.read_text(encoding="utf-8").splitlines() if ln.strip()]
        print(f"Ledger rows: {len(lines)}")
