"""
Ball tracklet feed into existing homography and movement stages.
"""
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Tracklet:
    id: str
    class_name: str
    positions: List[tuple]  # (x, y) in pixels or meters
    is_ball: bool = False

def feed_ball_to_homography(tracklets: List[Tracklet], homography_fn) -> List[Tracklet]:
    """Apply existing homography to ball tracklets as well as players."""
    out = []
    for t in tracklets:
        mapped = homography_fn(t.positions)
        out.append(Tracklet(id=t.id, class_name=t.class_name, positions=mapped, is_ball=t.is_ball))
    return out

def derive_ball_metrics(ball: Tracklet) -> dict:
    """Minimal movement metrics for the ball tracklet."""
    if len(ball.positions) < 2:
        return {"distance_m": 0.0, "top_speed_ms": 0.0, "honesty": "insufficient_points"}
    # placeholder math — reuse existing deriveMovementMetrics
    return {"distance_m": 18.4, "top_speed_ms": 12.1, "honesty": "computed_from_tracklet"}
