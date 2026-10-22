"""
NGS / Big Data Bowl coordinate and feature engine.

Purpose
-------
Provide correct field-frame primitives and higher-order kinematic /
relative features that can be used to link Combine tracking
(combine_tracking.csv) to in-game outcomes (player_play.csv +
game_tracking_*.csv).

Coordinate system (standard Next Gen Stats)
-------------------------------------------
- x: 0 (back of home endzone) → 120 (back of visitor endzone).
  50-yard line at x = 60.
- y: 0 (home sideline) → 53.3 (visitor sideline).
- dir / o: degrees. 0° points toward +y (visitor sideline).
  Angle increases clockwise.
- Tracking is 10 Hz.

This module is intentionally self-contained so it can be dropped
into a Kaggle notebook or an internal scouting pipeline.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Tuple

# Constants
# ---------------------------------------------------------------------------
FIELD_LENGTH = 120.0
FIELD_WIDTH = 53.3
YARD_LINE_50 = 60.0
FPS = 10  # tracking sample rate


# ---------------------------------------------------------------------------
# Core types
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Point:
    """A location on the NGS field."""
    x: float
    y: float

    def distance_to(self, other: "Point") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

    def is_on_field(self, margin: float = 0.0) -> bool:
        return (
            -margin <= self.x <= FIELD_LENGTH + margin
            and -margin <= self.y <= FIELD_WIDTH + margin
        )

    def to_tuple(self) -> Tuple[float, float]:
        return (self.x, self.y)


@dataclass
class TrackingFrame:
    """One 10 Hz tracking sample for a single entity."""
    time: float          # seconds from an arbitrary zero (or absolute)
    point: Point
    speed: float         # yards / second
    accel: float         # yards / second²
    direction: float     # NGS dir (degrees)
    orientation: Optional[float] = None  # NGS o (degrees)
    event: Optional[str] = None          # ball_snap, pass_forward, etc.


# ---------------------------------------------------------------------------
# Angle / vector helpers
# ---------------------------------------------------------------------------
def normalize_angle(degrees: float) -> float:
    """Wrap any angle into [0, 360)."""
    return degrees % 360.0


def direction_to_vector(dir_deg: float) -> Tuple[float, float]:
    """
    NGS direction → unit vector (dx, dy).

    0°   → +y
    90°  → +x
    180° → -y
    270° → -x
    """
    rad = math.radians(90.0 - dir_deg)
    return math.cos(rad), math.sin(rad)


def vector_to_direction(dx: float, dy: float) -> float:
    """Unit-vector → NGS direction angle."""
    standard = math.degrees(math.atan2(dy, dx))
    return normalize_angle(90.0 - standard)


def angle_between(a: float, b: float) -> float:
    """Smallest angle between two NGS directions, in [0, 180]."""
    diff = abs(normalize_angle(a) - normalize_angle(b))
    return min(diff, 360.0 - diff)


# ---------------------------------------------------------------------------
# Field / LOS helpers
# ---------------------------------------------------------------------------
def is_behind_los(player: Point, los_x: float, play_direction: str) -> bool:
    """
    True if the player is on the offensive backfield side of the line of scrimmage.
    play_direction matches the dataset field ('left' or 'right').
    """
    if play_direction.lower() == "right":
        return player.x < los_x
    return player.x > los_x


def project_forward(start: Point, dir_deg: float, distance: float) -> Point:
    """Move `distance` yards from start in the given NGS direction."""
    dx, dy = direction_to_vector(dir_deg)
    return Point(start.x + dx * distance, start.y + dy * distance)


# ---------------------------------------------------------------------------
# Kinematic feature extraction (Combine drills or in-game bursts)
# ---------------------------------------------------------------------------
def peak_speed(frames: Sequence[TrackingFrame]) -> float:
    """Maximum instantaneous speed in the window."""
    return max((f.speed for f in frames), default=0.0)


def time_to_peak_speed(frames: Sequence[TrackingFrame]) -> Optional[float]:
    """Seconds from the first frame to the frame of peak speed."""
    if not frames:
        return None
    peak = peak_speed(frames)
    for f in frames:
        if f.speed >= peak - 1e-6:
            return f.time - frames[0].time
    return None


def max_acceleration(frames: Sequence[TrackingFrame]) -> float:
    """Largest positive acceleration in the window."""
    return max((f.accel for f in frames), default=0.0)


def change_of_direction_cost(
    frames: Sequence[TrackingFrame],
    window: int = 5,
) -> float:
    """
    Rough measure of how much direction changes while speed is high.
    Higher = more inefficient change of direction (relevant for shuttle / 3-cone).
    """
    if len(frames) < window + 1:
        return 0.0
    cost = 0.0
    for i in range(len(frames) - window):
        d_angle = angle_between(frames[i].direction, frames[i + window].direction)
        avg_speed = (frames[i].speed + frames[i + window].speed) / 2.0
        cost += d_angle * avg_speed
    return cost / max(1, len(frames) - window)


# ---------------------------------------------------------------------------
# Relative / interaction features
# ---------------------------------------------------------------------------
def separation(a: Point, b: Point) -> float:
    return a.distance_to(b)


def closing_speed(
    player_speed: float,
    player_dir: float,
    defender_speed: float,
    defender_dir: float,
    player_pos: Point,
    defender_pos: Point,
) -> float:
    """
    Positive value means the defender is closing the gap on the player
    (yards per second).
    """
    vx = player_pos.x - defender_pos.x
    vy = player_pos.y - defender_pos.y
    dist = math.hypot(vx, vy)
    if dist < 1e-6:
        return 0.0
    ux, uy = vx / dist, vy / dist

    p_dx, p_dy = direction_to_vector(player_dir)
    d_dx, d_dy = direction_to_vector(defender_dir)

    p_toward = player_speed * (p_dx * ux + p_dy * uy)
    d_toward = defender_speed * (d_dx * ux + d_dy * uy)
    return d_toward - p_toward


# ---------------------------------------------------------------------------
# Linkage scaffold
# ---------------------------------------------------------------------------
@dataclass
class ProspectKinematics:
    """
    Summary of a prospect's Combine (or practice) tracking that can be
    joined to later in-game outcomes.
    """
    nfl_id: int
    drill_type: str
    peak_speed: float
    time_to_peak_speed: Optional[float]
    max_acceleration: float
    cod_cost: float
    n_frames: int


def summarize_drill(frames: Sequence[TrackingFrame], nfl_id: int, drill_type: str) -> ProspectKinematics:
    """Turn a sequence of tracking frames from one drill attempt into a feature row."""
    return ProspectKinematics(
        nfl_id=nfl_id,
        drill_type=drill_type,
        peak_speed=peak_speed(frames),
        time_to_peak_speed=time_to_peak_speed(frames),
        max_acceleration=max_acceleration(frames),
        cod_cost=change_of_direction_cost(frames),
        n_frames=len(frames),
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def _run_tests() -> None:
    # Coordinate convention
    assert abs(Point(60, 26.65).distance_to(Point(70, 26.65)) - 10) < 1e-6

    dx, dy = direction_to_vector(0)
    assert abs(dx) < 1e-6 and dy > 0.99
    dx, dy = direction_to_vector(90)
    assert dx > 0.99 and abs(dy) < 1e-6

    # Round-trip
    for ang in (0, 45, 90, 180, 270):
        dx, dy = direction_to_vector(ang)
        assert angle_between(ang, vector_to_direction(dx, dy)) < 0.1

    # LOS
    assert is_behind_los(Point(50, 20), 60, "right")
    assert not is_behind_los(Point(70, 20), 60, "right")

    # Kinematics on a synthetic burst
    frames = [
        TrackingFrame(0.0, Point(0, 0), 0.0, 2.0, 90),
        TrackingFrame(0.1, Point(0.1, 0), 2.0, 3.0, 90),
        TrackingFrame(0.2, Point(0.4, 0), 4.0, 1.0, 90),
        TrackingFrame(0.3, Point(0.9, 0), 5.5, 0.0, 90),
    ]
    assert peak_speed(frames) == 5.5
    assert time_to_peak_speed(frames) == 0.3
    assert max_acceleration(frames) == 3.0

    # Closing speed
    cs = closing_speed(0, 0, 5.0, 90, Point(60, 26), Point(50, 26))
    assert cs > 4.5

    print("All competition-grade NGS tests passed.")


if __name__ == "__main__":
    _run_tests()
