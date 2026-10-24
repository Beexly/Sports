"""
Vision Tracklet adapter behind VISION-CONTRACT.md.
Shadow-only, weight 0, until identity loop validation.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime
import json
from pathlib import Path

@dataclass
class Tracklet:
    track_id: str
    class_name: str
    positions: List[tuple]
    confidence: float = 0.0
    weight: float = 0.0

class VisionAdapter:
    def __init__(self, ledger: str = "artifacts/shadow_ledger/vision.jsonl"):
        self.ledger = Path(ledger)
        self.ledger.parent.mkdir(parents=True, exist_ok=True)

    def ingest_frame(self, detections: List[dict]) -> List[Tracklet]:
        tracklets = []
        for i, d in enumerate(detections):
            t = Tracklet(
                track_id=f"T-{i:02d}",
                class_name=d.get("class_name", "player"),
                positions=[(d.get("x", 0), d.get("y", 0))],
                confidence=d.get("confidence", 0.0),
                weight=0.0,
            )
            tracklets.append(t)
        self._log(tracklets)
        return tracklets

    def _log(self, tracklets: List[Tracklet]):
        entry = {
            "ts": datetime.utcnow().isoformat() + "Z",
            "count": len(tracklets),
            "weight": 0.0,
            "honesty": "shadow_only_until_identity_validation",
            "falsifier": "90pct_intervals_contain_85_95_and_narrower_than_market",
        }
        with self.ledger.open("a") as f:
            f.write(json.dumps(entry) + "\n")
