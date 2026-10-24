
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
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
    class_name: str
    source: str = "primary"

@dataclass
class Tracklet:
    id: str
    class_name: str
    positions: List[tuple]
    is_ball: bool = False

class ShadowLedger:
    def __init__(self, path: str = "artifacts/shadow_ledger/film_shadow_ledger.jsonl"):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, entry: Dict[str, Any]):
        entry = dict(entry)
        entry["ts"] = datetime.utcnow().isoformat() + "Z"
        entry["weight"] = 0.0
        entry["affects_published_distribution"] = False
        with self.path.open("a") as f:
            f.write(json.dumps(entry) + "\n")

class RoboflowAdapter:
    def detect(self, frame=None) -> List[Detection]:
        return [
            Detection(612, 388, 26, 40, 0.93, "player", "roboflow"),
            Detection(500, 300, 12, 12, 0.81, "ball", "roboflow"),
        ]

class PrimaryDetector:
    def detect(self, frame=None) -> List[Detection]:
        return [Detection(600, 380, 28, 42, 0.90, "player", "primary")]

def run_shadow_detectors(frame=None) -> Dict[str, Any]:
    primary = PrimaryDetector().detect(frame)
    robo = RoboflowAdapter().detect(frame)
    ledger = ShadowLedger()
    ledger.append({
        "event": "dual_detect",
        "primary_count": len(primary),
        "roboflow_count": len(robo),
        "ball_present": any(d.class_name == "ball" for d in robo),
        "honesty": "shadow_only",
    })
    return {"primary": primary, "roboflow": robo}

def extract_ball_tracklet(detections: List[Detection]) -> Optional[Tracklet]:
    balls = [d for d in detections if d.class_name == "ball"]
    if not balls:
        return None
    b = balls[0]
    return Tracklet(id="BALL-01", class_name="ball", positions=[(b.x, b.y)], is_ball=True)

def film_feature_to_decision(feature: Dict[str, Any], validation_spec_met: bool = False) -> Dict[str, Any]:
    ledger = ShadowLedger()
    out = {
        "feature": feature.get("name"),
        "value": feature.get("value"),
        "applied_weight": 0.0 if not validation_spec_met else feature.get("weight", 0.0),
        "affects_published_distribution": validation_spec_met,
        "honesty": "uncalibrated_weight_0" if not validation_spec_met else "validated",
    }
    ledger.append(out)
    return out

def run_pipeline(frame=None, jersey: Optional[str] = None) -> Dict[str, Any]:
    dets = run_shadow_detectors(frame)
    ball = extract_ball_tracklet(dets["roboflow"])
    feature = film_feature_to_decision({"name": "sep_at_break_yd", "value": 2.3})
    return {
        "primary_detections": len(dets["primary"]),
        "roboflow_detections": len(dets["roboflow"]),
        "ball_tracklet": ball.id if ball else None,
        "nflverse_joined": jersey is not None,
        "film_feature": feature,
    }
