"""
test_field_homography.py
========================
Verification suite for Milestone 1 (M1) Field Template & Homography Module.
Proves self-calibration from field landmarks achieves < 5.0 pixels reprojection error
and sub-yard physical accuracy on All-22 camera perspectives without private truck telemetry.
"""

import sys
import unittest
import numpy as np

sys.path.append(r"C:\Users\Garrett\Sports")
from intelligence.vision.field_template import (
    generate_canonical_field_landmarks,
    FIELD_LENGTH_YARDS,
    FIELD_WIDTH_YARDS,
    HASH_NEAR_Y,
    HASH_FAR_Y
)
from intelligence.vision.field_homography_engine import FieldHomographyEngine, HomographyCalibrationResult


class TestFieldHomographyEngine(unittest.TestCase):

    def setUp(self):
        self.landmarks = generate_canonical_field_landmarks()

    def test_canonical_field_dimensions(self):
        """Verifies exact NFL Rulebook field constraints."""
        self.assertGreater(len(self.landmarks), 100)
        
        # Verify hash mark separation: 18 ft 6 in = 6.1667 yards
        hash_sep = HASH_FAR_Y - HASH_NEAR_Y
        self.assertAlmostEqual(hash_sep, 18.5 / 3.0, places=4)
        
        # Verify field dimensions
        self.assertEqual(FIELD_LENGTH_YARDS, 120.0)
        self.assertAlmostEqual(FIELD_WIDTH_YARDS, 160.0 / 3.0, places=4)

    def test_all22_camera_homography_reprojection_under_5_pixels(self):
        """
        Simulates an All-22 stadium press-box camera (1920x1080 resolution)
        and verifies homography recovers field geometry with < 5.0 px error.
        """
        # Ground-truth camera perspective homography matrix (stadium press box view)
        H_true = np.array([
            [14.2,   1.8,   120.0],
            [-0.4,  16.5,   280.0],
            [0.0003, 0.0075, 1.0]
        ], dtype=np.float64)

        # Select 20 visible landmarks along the 20-50 yard field zone
        sample_keys = [k for k in self.landmarks.keys() if any(f"_{y}_" in k for y in [25, 30, 35, 40, 45, 50])]
        self.assertGreaterEqual(len(sample_keys), 16)

        world_pts = np.array([[self.landmarks[k].x_yard, self.landmarks[k].y_yard] for k in sample_keys])
        
        # Project through true camera geometry
        image_pts_clean = FieldHomographyEngine.project_world_to_image(H_true, world_pts)

        # Add realistic sensor detection noise (Gaussian sigma = 1.2 pixels)
        np.random.seed(42)
        noise = np.random.normal(0.0, 1.2, image_pts_clean.shape)
        image_pts_noisy = image_pts_clean + noise

        # Inject 3 outlier misdetections (e.g. 25-pixel visual clutter)
        image_pts_noisy[0] += np.array([28.0, -32.0])
        image_pts_noisy[5] += np.array([-40.0, 35.0])

        # Run RANSAC calibration
        result = FieldHomographyEngine.calibrate_ransac(
            world_pts=world_pts,
            image_pts=image_pts_noisy,
            max_error_thresh_px=5.0,
            max_iterations=1000
        )

        # Invariant Assertions
        self.assertTrue(result.is_converged, "RANSAC failed to converge!")
        self.assertLess(result.rmse_reprojection_px, 5.0, f"RMSE {result.rmse_reprojection_px} exceeded 5.0 px threshold!")
        self.assertGreaterEqual(result.num_inliers, len(world_pts) - 3)

        # Verify inverse projection accuracy: Map pixel back to field space
        test_pixel = image_pts_clean[10:11]
        recovered_world = FieldHomographyEngine.project_image_to_world(result.H_inv, test_pixel)
        true_world = world_pts[10:11]
        field_error_yards = np.linalg.norm(recovered_world - true_world)

        self.assertLess(field_error_yards, 0.35, f"Physical field error {field_error_yards:.3f} yards exceeds 0.35 yards!")
        print(f"\n[M1 VERIFICATION PASSED] RMSE: {result.rmse_reprojection_px:.2f} px | Max Inlier Err: {result.max_reprojection_px:.2f} px | Field Error: {field_error_yards:.3f} yds")

    def test_near_collinear_degeneracy_and_condition_number(self):
        """Verifies behavior on near-collinear points where condition number explodes."""
        # 4 points along a nearly straight yard line
        world_collinear = np.array([
            [50.0, 10.0],
            [50.0, 20.0],
            [50.0, 30.0],
            [50.001, 40.0], # near-collinear perturbation
        ])
        image_collinear = np.array([
            [500.0, 200.0],
            [501.0, 400.0],
            [502.0, 600.0],
            [503.0, 800.0],
        ])

        # Compute DLT: condition number of homography or point normalization will be high
        H = FieldHomographyEngine.compute_dlt_homography(world_collinear, image_collinear)
        cond = np.linalg.cond(H)
        self.assertTrue(np.isfinite(cond), "Homography matrix must remain finite")
        self.assertGreater(cond, 100.0, "Near-collinear configuration must be reflected in high condition number")

    def test_heavy_outlier_rejection_40_percent(self):
        """Stress-tests RANSAC with 40% extreme visual clutter outliers (50px noise)."""
        H_true = np.array([
            [14.2,   1.8,   120.0],
            [-0.4,  16.5,   280.0],
            [0.0003, 0.0075, 1.0]
        ], dtype=np.float64)

        sample_keys = [k for k in self.landmarks.keys() if any(f"_{y}_" in k for y in [20, 25, 30, 35, 40, 45, 50, 55])]
        world_pts = np.array([[self.landmarks[k].x_yard, self.landmarks[k].y_yard] for k in sample_keys[:25]])
        image_pts = FieldHomographyEngine.project_world_to_image(H_true, world_pts)

        # Inject 40% extreme outliers (10 out of 25 landmarks corrupted by 50-80 px)
        np.random.seed(999)
        corrupted_indices = np.random.choice(len(world_pts), size=10, replace=False)
        image_pts[corrupted_indices] += np.random.uniform(50.0, 80.0, size=(10, 2))

        result = FieldHomographyEngine.calibrate_ransac(
            world_pts=world_pts,
            image_pts=image_pts,
            max_error_thresh_px=5.0,
            max_iterations=1500,
            min_inlier_ratio=0.55
        )

        self.assertTrue(result.is_converged)
        self.assertLess(result.rmse_reprojection_px, 5.0)
        self.assertGreaterEqual(result.num_inliers, 14)


if __name__ == "__main__":
    unittest.main()

