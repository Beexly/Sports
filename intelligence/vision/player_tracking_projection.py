"""
player_tracking_projection.py
==============================
NFL Computer Vision Player Tracking & Metric Field Projection Engine.
Bridges 2D Broadcast / All-22 Video Bounding Boxes to 2D Canonical Field (X, Y) Coordinates.

Mathematical Formulations:
1. Foot Contact Homography Projection:
   Given player bounding box (x1, y1, x2, y2), the foot contact point is:
   u_foot = (x1 + x2) / 2.0,  v_foot = y2 (bottom-center)
   [X_yard, Y_yard, 1]^T ~ H^-1 * [u_foot, v_foot, 1]^T

2. Spatiotemporal Kinematic Velocity:
   v(t) = (p(t) - p(t - dt)) / dt
   speed = ||v(t)||_2 (yards/sec)

3. Receiver-Defender Separation & Closing Speed:
   s(t) = p_rec(t) - p_def(t),  d(t) = ||s(t)||_2
   d_dot(t) = (s(t) . (v_rec(t) - v_def(t))) / d(t)

4. Continuous Pass-Rush STRAIN Physics:
   STRAIN(t) = - d_dot(t) / (d(t)^alpha)
"""

from __future__ import annotations
import math
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional


@dataclass(frozen=True)
class PlayerDetection:
    track_id: int
    team: str                 # 'OFF', 'DEF', or team abbreviation
    role: str                 # 'QB', 'REC', 'DEF', 'RUSHER', etc.
    bbox_xyxy: Tuple[float, float, float, float] # (x1, y1, x2, y2) in pixels
    confidence: float


class HorizonSingularityError(ValueError):
    """Raised when pixel coordinate lies within singularity threshold of the vanishing line."""
    pass


# Physiological human sprint ceiling in NFL metric yards: 12.5 yd/s (~25.56 mph)
MAX_PHYSICAL_SPEED_YPS: float = 12.5


@dataclass(frozen=True)
class FieldTrackedPlayer:
    track_id: int
    team: str
    role: str
    pixel_foot: Tuple[float, float]     # (u, v)
    field_xy: Tuple[float, float]       # (X, Y) in yards
    velocity_xy: Tuple[float, float]    # (v_x, v_y) in yards/sec
    speed_yards_per_sec: float          # scalar speed


@dataclass(frozen=True)
class PassRushStrainResult:
    rusher_id: int
    distance_yards: float
    closing_speed_yds_per_sec: float
    strain_rate: float
    pocket_collapse_hazard: float


class PlayerTrackingProjectionEngine:
    """
    Projects 2D image detections into canonical NFL field metric coordinates
    and computes player kinematics, separation, and pass-rush strain.
    """

    def __init__(self, H: np.ndarray, fps: float = 30.0, strain_alpha: float = 1.0):
        """
        H: 3x3 homography matrix mapping field (X, Y) -> screen (u, v).
        fps: Video frame rate (typically 29.97 or 59.94 for broadcast).
        strain_alpha: Distance decay exponent for STRAIN physics.
        """
        self.H = H
        self.H_inv = np.linalg.inv(H)
        self.fps = fps
        self.dt = 1.0 / fps
        self.strain_alpha = strain_alpha
        self.history: Dict[int, List[Tuple[float, float]]] = {} # track_id -> [(x, y), ...]

    def distance_to_horizon_pixels(self, u: float, v: float) -> float:
        """Computes Euclidean distance from (u, v) to the vanishing/horizon line in image space."""
        h_line = self.H_inv[2, :]  # [a, b, c] where a*u + b*v + c = 0
        denom = math.sqrt(h_line[0]**2 + h_line[1]**2)
        if denom < 1e-12:
            return 9999.0
        return abs(h_line[0] * u + h_line[1] * v + h_line[2]) / denom

    def project_pixel_to_field(self, u: float, v: float) -> Tuple[float, float]:
        """
        Projects screen pixel coordinates (u, v) to metric field coordinates (X, Y) in yards.
        Rejects pixels within 2px of vanishing line or behind camera.
        """
        dist_horizon = self.distance_to_horizon_pixels(u, v)
        if dist_horizon < 2.0:
            raise HorizonSingularityError(
                f"Pixel ({u:.1f}, {v:.1f}) is within {dist_horizon:.2f} px of vanishing line (threshold 2 px)"
            )

        p_screen = np.array([u, v, 1.0], dtype=float)
        p_field_h = self.H_inv @ p_screen
        if abs(p_field_h[2]) < 1e-6 or p_field_h[2] <= 0:
            raise HorizonSingularityError(f"Projective singularity at pixel ({u}, {v}) (w={p_field_h[2]:.6e})")

        return float(p_field_h[0] / p_field_h[2]), float(p_field_h[1] / p_field_h[2])

    def process_frame_detections(self, detections: List[PlayerDetection]) -> List[FieldTrackedPlayer]:
        """
        Converts bounding box detections into field-space kinematics.
        Drops singular horizon detections and caps anomalous velocity spikes (> 12.5 yd/s).
        """
        tracked_players: List[FieldTrackedPlayer] = []

        for det in detections:
            x1, y1, x2, y2 = det.bbox_xyxy
            # Foot contact point: bottom-center of bounding box
            u_foot = (x1 + x2) / 2.0
            v_foot = y2

            try:
                x_yard, y_yard = self.project_pixel_to_field(u_foot, v_foot)
            except HorizonSingularityError:
                # Reject singularity: do not score, drop detection from metric field
                continue

            # Compute velocity if history exists
            if det.track_id in self.history and len(self.history[det.track_id]) > 0:
                prev_x, prev_y = self.history[det.track_id][-1]
                raw_vx = (x_yard - prev_x) / self.dt
                raw_vy = (y_yard - prev_y) / self.dt
                raw_speed = math.sqrt(raw_vx**2 + raw_vy**2)

                # Cap at physiological max (12.5 yd/s ~ 25.56 mph) to mitigate single-frame teleportation
                if raw_speed > MAX_PHYSICAL_SPEED_YPS:
                    scale = MAX_PHYSICAL_SPEED_YPS / raw_speed
                    v_x = raw_vx * scale
                    v_y = raw_vy * scale
                    speed = MAX_PHYSICAL_SPEED_YPS
                    # Drop teleportation from mutating tracking history
                else:
                    v_x, v_y, speed = raw_vx, raw_vy, raw_speed
                    self.history[det.track_id].append((x_yard, y_yard))
            else:
                v_x, v_y, speed = 0.0, 0.0, 0.0
                if det.track_id not in self.history:
                    self.history[det.track_id] = []
                self.history[det.track_id].append((x_yard, y_yard))

            if len(self.history.get(det.track_id, [])) > 30: # 1 second history
                self.history[det.track_id].pop(0)

            tracked_players.append(FieldTrackedPlayer(
                track_id=det.track_id,
                team=det.team,
                role=det.role,
                pixel_foot=(u_foot, v_foot),
                field_xy=(x_yard, y_yard),
                velocity_xy=(v_x, v_y),
                speed_yards_per_sec=speed
            ))

        return tracked_players

    @staticmethod
    def compute_receiver_separation(rec: FieldTrackedPlayer, primary_def: FieldTrackedPlayer) -> Dict[str, float]:
        """
        Computes instantaneous separation distance and closing rate.
        """
        dx = rec.field_xy[0] - primary_def.field_xy[0]
        dy = rec.field_xy[1] - primary_def.field_xy[1]
        distance = math.sqrt(dx**2 + dy**2)

        # Relative velocity
        dv_x = rec.velocity_xy[0] - primary_def.velocity_xy[0]
        dv_y = rec.velocity_xy[1] - primary_def.velocity_xy[1]

        # Rate of separation change d_dot = (s . dv) / ||s||
        if distance > 1e-4:
            separation_rate = (dx * dv_x + dy * dv_y) / distance
        else:
            separation_rate = 0.0

        return {
            "separation_yards": round(distance, 2),
            "separation_velocity_yds_per_sec": round(separation_rate, 2),
            "is_opening": separation_rate > 0.5,
            "is_contested": distance < 1.5
        }

    def compute_pass_rush_strain(self, qb: FieldTrackedPlayer, rusher: FieldTrackedPlayer) -> PassRushStrainResult:
        """
        Computes pass-rush STRAIN rate physics on the quarterback:
        STRAIN(t) = - d_dot(t) / (d(t)^alpha)
        """
        dx = qb.field_xy[0] - rusher.field_xy[0]
        dy = qb.field_xy[1] - rusher.field_xy[1]
        distance = math.sqrt(dx**2 + dy**2)

        # Closing velocity of rusher toward QB
        # Positive closing speed means rusher is approaching QB
        rel_vx = rusher.velocity_xy[0] - qb.velocity_xy[0]
        rel_vy = rusher.velocity_xy[1] - qb.velocity_xy[1]

        if distance > 1e-4:
            # closing speed = - d(dist)/dt
            closing_speed = (dx * rel_vx + dy * rel_vy) / distance
        else:
            closing_speed = 0.0

        denom = max(0.5, distance)**self.strain_alpha
        strain_rate = max(0.0, closing_speed) / denom

        # Hazard pocket collapse probability: logistic sigmoid over strain (clipped to [-60, 60])
        z_strain = max(-60.0, min(60.0, -1.5 * (strain_rate - 1.2)))
        hazard = 1.0 / (1.0 + math.exp(z_strain))

        return PassRushStrainResult(
            rusher_id=rusher.track_id,
            distance_yards=round(distance, 2),
            closing_speed_yds_per_sec=round(closing_speed, 2),
            strain_rate=round(strain_rate, 3),
            pocket_collapse_hazard=round(hazard, 3)
        )
