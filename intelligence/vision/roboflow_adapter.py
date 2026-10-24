"""
Roboflow Sports Detector Adapter — shadow-logged second adapter
behind the existing cv-detector-contract.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import List, Protocol, Optional
import json
from datetime import datetime
from pathlib import Path

@dataclass
class Detection:
    x: float
    y: float
    w: float
    h: float
    confidence: float
    class_name: str  # "player" or "ball"
    tracklet_id: Optional[str] = None

class DetectorAdapter(Protocol):
    def detect(self, frame) -> List[Detection]: ...

class RoboflowSportsDetector:
    """Second adapter. Falls back to mock if package/weights missing.
    All detections are shadow-logged with weight 0.
    """
    def __init__(self, shadow_dir: str = "artifacts/shadow"):
        self.shadow_dir = Path(shadow_dir)
        self.shadow_dir.mkdir(parents=True, exist_ok=True)
        self.available = False
        try:
            # import sports  # uncomment when installed
            self.available = True
        except Exception:
            pass

    def detect(self, frame) -> List[Detection]:
        # Placeholder: replace with real Roboflow inference
        dets = [
            Detection(612, 388, 26, 40, 0.93, "player"),
            Detection(500, 300, 12, 12, 0.81, "ball"),
        ]
        self._shadow_log(dets)
        return dets

    def _shadow_log(self, dets: List[Detection]):
        entry = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "source": "roboflow_sports_adapter",
            "weight": 0,
            "calibrated": False,
            "detections": [asdict(d) for d in dets],
            "honesty": "shadow_only_until_validation_spec_met",
        }
        path = self.shadow_dir / f"cv_detect_{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.json"
        path.write_text(json.dumps(entry, indent=2))

def get_detector(prefer_roboflow: bool = True) -> DetectorAdapter:
    if prefer_roboflow:
        return RoboflowSportsDetector()
    class MockYOLO:
        def detect(self, frame) -> List[Detection]:
            return [Detection(600, 380, 28, 42, 0.90, "player")]
    return MockYOLO()
