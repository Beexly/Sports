"""
Detector adapter sketch for the existing GSE CV contract.

Fits behind tracking/cv-detector-contract.
Default: pass-through / mock.
Optional: Roboflow sports model when the package and weights are present.

Shadow-only. Does not replace the current YOLO adapter.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class Detection:
    x: float
    y: float
    w: float
    h: float
    confidence: float
    class_name: str  # "player" | "ball" | other


class DetectorAdapter(Protocol):
    def detect(self, frame: Any) -> list[Detection]:
        ...


class MockDetector:
    """Deterministic stand-in for tests and shadow comparison."""

    def detect(self, frame: Any) -> list[Detection]:
        # 22 player boxes + 1 ball, fixed for fixture stability
        dets = [
            Detection(100 + i * 30, 200, 26, 40, 0.9, "player")
            for i in range(22)
        ]
        dets.append(Detection(400, 300, 12, 12, 0.85, "ball"))
        return dets


class RoboflowSportsDetector:
    """
    Optional. Requires `inference` or `roboflow` package + model id.
    Falls back to MockDetector if unavailable.
    """

    def __init__(self, model_id: str = "sports-player-ball", api_key: str | None = None):
        self.model_id = model_id
        self.api_key = api_key
        self._model = None
        self._try_load()

    def _try_load(self) -> None:
        try:
            # Placeholder for real load:
            # from inference import get_model
            # self._model = get_model(model_id=self.model_id, api_key=self.api_key)
            self._model = None  # not installed in this environment
        except Exception:
            self._model = None

    def detect(self, frame: Any) -> list[Detection]:
        if self._model is None:
            return MockDetector().detect(frame)
        # Real path would call self._model.infer(frame) and map to Detection
        return MockDetector().detect(frame)


def get_detector(prefer_roboflow: bool = False) -> DetectorAdapter:
    if prefer_roboflow:
        return RoboflowSportsDetector()
    return MockDetector()


if __name__ == "__main__":
    det = get_detector(prefer_roboflow=True)
    print(f"detections={len(det.detect(None))}")
    print("ball present:", any(d.class_name == "ball" for d in det.detect(None)))
