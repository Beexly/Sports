"""NGS coordinate system utilities (improved).

Standard Next Gen Stats field frame:
- x: 0 (back of home endzone) → 120 (back of visitor endzone). 50-yard line = 60.
- y: 0 (home sideline) → 53.3 (visitor sideline).
- dir / o: degrees. 0° points toward +y (visitor sideline). Angle increases clockwise.
- Sampling rate of tracking frames is 10 Hz.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Tuple

FIELD_LENGTH = 120.0
FIELD_WIDTH = 53.3
YARD_LINE_50 = 60.0


@dataclass(frozen=True)
class Point:
    """A point on the NGS field."""
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


def normalize_angle(degrees: float) -> float:
    """Normalize any angle to the range [0, 360)."""
    return degrees % 360.0


def direction_to_vector(dir_deg: float) -> Tuple[float, float]:
    """
    Convert an NGS direction angle to a unit vector (dx, dy).

    NGS convention:
      0°   → +y (toward visitor sideline)
      90°  → +x (toward visitor endzone)
      180° → -y
      270° → -x
    """
    rad = math.radians(90.0 - dir_deg)
    return math.cos(rad), math.sin(rad)


def vector_to_direction(dx: float, dy: float) -> float:
    """Convert a vector (dx, dy) back to an NGS direction angle."""
    # Standard atan2, then convert to NGS convention
    standard_deg = math.degrees(math.atan2(dy, dx))
    ngs_deg = 90.0 - standard_deg
    return normalize_angle(ngs_deg)


def angle_between(dir1: float, dir2: float) -> float:
    """Smallest angle between two NGS directions (result in [0, 180])."""
    diff = abs(normalize_angle(dir1) - normalize_angle(dir2))
    return min(diff, 360.0 - diff)


def project_forward(
    start: Point,
    dir_deg: float,
    distance: float,
) -> Point:
    """Move `distance` yards from `start` in the given NGS direction."""
    dx, dy = direction_to_vector(dir_deg)
    return Point(start.x + dx * distance, start.y + dy * distance)


def is_behind_los(
    player: Point,
    los_x: float,
    play_direction: str,
) -> bool:
    """
    Return True if the player is on the offensive backfield side of the LOS.

    play_direction: 'left' or 'right' (matches the dataset field).
    """
    if play_direction.lower() == "right":
        return player.x < los_x
    return player.x > los_x


def separation(player: Point, defender: Point) -> float:
    """Euclidean separation in yards."""
    return player.distance_to(defender)


def closing_speed(
    player_speed: float,
    player_dir: float,
    defender_speed: float,
    defender_dir: float,
    player_pos: Point,
    defender_pos: Point,
) -> float:
    """
    Approximate closing speed (yards/sec) of the defender on the player.
    Positive = defender is closing the gap.
    """
    # Vector from defender to player
    to_player_x = player_pos.x - defender_pos.x
    to_player_y = player_pos.y - defender_pos.y
    dist = math.hypot(to_player_x, to_player_y)
    if dist < 1e-6:
        return 0.0
    # Unit vector toward player
    ux, uy = to_player_x / dist, to_player_y / dist

    # Velocity components
    p_dx, p_dy = direction_to_vector(player_dir)
    d_dx, d_dy = direction_to_vector(defender_dir)

    player_vel_toward = (p_dx * player_speed) * ux + (p_dy * player_speed) * uy
    defender_vel_toward = (d_dx * defender_speed) * ux + (d_dy * defender_speed) * uy

    return defender_vel_toward - player_vel_toward


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
def _run_tests() -> None:
    # Geometry
    midfield = Point(60.0, 26.65)
    assert abs(midfield.distance_to(Point(70.0, 26.65)) - 10.0) < 1e-6
    assert midfield.is_on_field()
    assert not Point(121, 10).is_on_field()

    # Direction convention
    dx, dy = direction_to_vector(0.0)
    assert abs(dx) < 1e-6 and dy > 0.99, "0° should be +y"

    dx, dy = direction_to_vector(90.0)
    assert dx > 0.99 and abs(dy) < 1e-6, "90° should be +x"

    dx, dy = direction_to_vector(180.0)
    assert abs(dx) < 1e-6 and dy < -0.99, "180° should be -y"

    # Round-trip
    for angle in (0, 45, 90, 135, 180, 270, 359):
        dx, dy = direction_to_vector(angle)
        recovered = vector_to_direction(dx, dy)
        assert abs(angle_between(angle, recovered)) < 0.01

    # Projection
    start = Point(50.0, 20.0)
    end = project_forward(start, 90.0, 10.0)  # 90° = +x
    assert abs(end.x - 60.0) < 1e-6 and abs(end.y - 20.0) < 1e-6

    # LOS
    assert is_behind_los(Point(55, 20), 60, "right")
    assert not is_behind_los(Point(65, 20), 60, "right")
    assert is_behind_los(Point(65, 20), 60, "left")

    # Closing speed (defender running directly at stationary player)
    player = Point(60, 26)
    defender = Point(50, 26)
    cs = closing_speed(0, 0, 5.0, 90.0, player, defender)
    assert cs > 4.5, f"Expected strong closing speed, got {cs}"

    print("All improved NGS coordinate tests passed.")


if __name__ == "__main__":
    _run_tests()

# Re-export BDB 2027 10 Hz Combine & Game Kinematic Suite + Allen ITL (arXiv:2004.04147)
from .bdb2027_kinematics import (  # noqa: E402,F401
    Interval,
    allen_relation,
    ceiling_closeness,
    combine_speed_ceiling,
    compute_biomechanical_load_hazard,
    compute_cod_curvature_retention,
    compute_decel_reaccel_asymmetry,
    compute_first_step_burst_latency,
    compute_kinematic_derivatives_10hz,
    evaluate_itl_complex_event,
    exceedance_rate,
    kinetic_translation_deficit,
)

