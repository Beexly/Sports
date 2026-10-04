"""
test_player_tracking_projection.py
===================================
Unit Tests for NFL Computer Vision Player Tracking & Kinematic Projection Engine.
Verifies foot-point homography projection, velocity, receiver separation, and STRAIN physics.
"""

import math
import unittest
import numpy as np
from intelligence.vision.field_template import generate_canonical_field_landmarks
from intelligence.vision.field_homography_engine import FieldHomographyEngine
from intelligence.vision.player_tracking_projection import (
    PlayerTrackingProjectionEngine,
    PlayerDetection,
    FieldTrackedPlayer
)


class TestPlayerTrackingProjection(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Construct synthetic ground-truth camera homography H
        # Maps field yards (X, Y) -> screen pixels (u, v)
        # All-22 high sideline view (1920x1080)
        K = np.array([
            [1400.0, 0.0, 960.0],
            [0.0, 1400.0, 540.0],
            [0.0, 0.0, 1.0]
        ])
        # Camera elevated at Y = -25.0, Z = 30.0 yards looking down at midfield (60, 26.67)
        pitch = np.radians(40.0)
        R_pitch = np.array([
            [1.0, 0.0, 0.0],
            [0.0, np.cos(pitch), -np.sin(pitch)],
            [0.0, np.sin(pitch), np.cos(pitch)]
        ])
        t = np.array([[0.0], [10.0], [40.0]])
        Rt_3x3 = np.column_stack([R_pitch[:, 0], R_pitch[:, 1], t])
        cls.H_true = K @ Rt_3x3
        cls.H_true /= cls.H_true[2, 2]

        cls.engine = PlayerTrackingProjectionEngine(H=cls.H_true, fps=30.0, strain_alpha=1.0)

    def test_foot_contact_projection(self):
        """Verifies that bounding box bottom-center projects accurately to field coordinates."""
        # Player at 50-yard line (X = 60.0), near hash (Y = 23.58)
        field_target = np.array([60.0, 23.5833, 1.0])
        p_screen = self.H_true @ field_target
        u = p_screen[0] / p_screen[2]
        v = p_screen[1] / p_screen[2]

        # Bounding box centered at (u, v - 30), width=20, height=60
        bbox = (u - 10.0, v - 60.0, u + 10.0, v)
        det = PlayerDetection(track_id=1, team="OFF", role="WR", bbox_xyxy=bbox, confidence=0.95)

        tracked = self.engine.process_frame_detections([det])[0]
        x_proj, y_proj = tracked.field_xy

        self.assertAlmostEqual(x_proj, 60.0, delta=0.05)
        self.assertAlmostEqual(y_proj, 23.5833, delta=0.05)

    def test_velocity_and_speed_estimation(self):
        """Verifies player velocity and speed across successive frames."""
        # Frame 1: Player at (50.0, 20.0)
        p1 = self.H_true @ np.array([50.0, 20.0, 1.0])
        u1, v1 = p1[0] / p1[2], p1[1] / p1[2]
        det1 = PlayerDetection(track_id=2, team="OFF", role="WR", bbox_xyxy=(u1-5, v1-40, u1+5, v1), confidence=0.9)
        self.engine.process_frame_detections([det1])

        # Frame 2 (dt = 1/30s): Player sprints downfield +0.3 yards (9.0 yards/sec = 18.4 mph)
        p2 = self.H_true @ np.array([50.30, 20.0, 1.0])
        u2, v2 = p2[0] / p2[2], p2[1] / p2[2]
        det2 = PlayerDetection(track_id=2, team="OFF", role="WR", bbox_xyxy=(u2-5, v2-40, u2+5, v2), confidence=0.9)
        tracked2 = self.engine.process_frame_detections([det2])[0]

        speed = tracked2.speed_yards_per_sec
        # Speed should be ~9.0 yards/sec
        self.assertAlmostEqual(speed, 9.0, delta=0.2)

    def test_receiver_separation_dynamics(self):
        """Verifies separation distance and closing rate between receiver and cornerback."""
        rec = FieldTrackedPlayer(
            track_id=10, team="OFF", role="WR",
            pixel_foot=(500, 500),
            field_xy=(65.0, 15.0),
            velocity_xy=(8.5, 0.0),   # Receiver moving downfield at 8.5 yd/s
            speed_yards_per_sec=8.5
        )
        cb = FieldTrackedPlayer(
            track_id=20, team="DEF", role="CB",
            pixel_foot=(500, 480),
            field_xy=(62.5, 15.0),
            velocity_xy=(7.0, 0.0),   # CB trailing at 7.0 yd/s
            speed_yards_per_sec=7.0
        )

        sep = PlayerTrackingProjectionEngine.compute_receiver_separation(rec, cb)
        self.assertEqual(sep["separation_yards"], 2.5)
        # Receiver gaining separation (+1.5 yd/s)
        self.assertEqual(sep["separation_velocity_yds_per_sec"], 1.5)
        self.assertTrue(sep["is_opening"])
        self.assertFalse(sep["is_contested"])

    def test_pass_rush_strain_physics(self):
        """Verifies pass-rush STRAIN rate and pocket collapse hazard calculation."""
        qb = FieldTrackedPlayer(
            track_id=1, team="OFF", role="QB",
            pixel_foot=(960, 540),
            field_xy=(50.0, 26.67),
            velocity_xy=(0.0, 0.0),
            speed_yards_per_sec=0.0
        )
        # Edge rusher 3.0 yards away closing at 6.0 yd/s
        rusher = FieldTrackedPlayer(
            track_id=99, team="DEF", role="RUSHER",
            pixel_foot=(980, 550),
            field_xy=(53.0, 26.67),
            velocity_xy=(-6.0, 0.0),  # moving directly toward QB
            speed_yards_per_sec=6.0
        )

        strain_res = self.engine.compute_pass_rush_strain(qb, rusher)
        self.assertEqual(strain_res.distance_yards, 3.0)
        self.assertEqual(strain_res.closing_speed_yds_per_sec, 6.0)
        # STRAIN = closing_speed / distance^1.0 = 6.0 / 3.0 = 2.0
        self.assertAlmostEqual(strain_res.strain_rate, 2.0, delta=0.05)
        # High pocket collapse hazard (> 0.70)
        self.assertGreater(strain_res.pocket_collapse_hazard, 0.70)

    def test_horizon_singularity_rejection(self):
        """Verifies that detections near or above the vanishing line are rejected and dropped."""
        # Find vanishing line u, v where H_inv[2,:] * [u, v, 1] = 0
        h_line = self.engine.H_inv[2, :]
        # A point with very high or negative vertical position near the horizon
        u_horizon = 960.0
        # solve h_line[0]*u + h_line[1]*v + h_line[2] = 0 -> v = -(h_line[0]*u + h_line[2]) / h_line[1]
        v_horizon = -(h_line[0] * u_horizon + h_line[2]) / h_line[1]

        # Place detection exactly within 1 px of vanishing line
        det_horizon = PlayerDetection(
            track_id=999, team="DEF", role="CB",
            bbox_xyxy=(u_horizon - 10, v_horizon - 50, u_horizon + 10, v_horizon + 0.5),
            confidence=0.9
        )
        # Should be dropped cleanly without throwing unhandled exception
        tracked = self.engine.process_frame_detections([det_horizon])
        self.assertEqual(len(tracked), 0, "Singular horizon detection must be dropped from tracking output")

    def test_teleportation_speed_cap(self):
        """Verifies that a 10-yard one-frame detector jump is capped at 12.5 yd/s."""
        # Frame 1: player at (50.0, 20.0)
        p1 = self.H_true @ np.array([50.0, 20.0, 1.0])
        u1, v1 = p1[0] / p1[2], p1[1] / p1[2]
        det1 = PlayerDetection(track_id=55, team="OFF", role="WR", bbox_xyxy=(u1-5, v1-40, u1+5, v1), confidence=0.9)
        self.engine.process_frame_detections([det1])

        # Frame 2: detector glitches and jumps 10 yards downfield in 1 frame (30 fps = 300 yd/s = 613.6 mph!)
        p2 = self.H_true @ np.array([60.0, 20.0, 1.0])
        u2, v2 = p2[0] / p2[2], p2[1] / p2[2]
        det2 = PlayerDetection(track_id=55, team="OFF", role="WR", bbox_xyxy=(u2-5, v2-40, u2+5, v2), confidence=0.9)
        tracked2 = self.engine.process_frame_detections([det2])[0]

        # Speed must be capped at 12.5 yards/sec
        self.assertAlmostEqual(tracked2.speed_yards_per_sec, 12.5, delta=0.01)


if __name__ == "__main__":
    unittest.main()

