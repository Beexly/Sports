"""
auto_field_registration.py
===========================
Automated NFL Football Field Line Detection & Keypoint Homography Registration.
Extracts white line markings from broadcast and All-22 video frames, finds intersections,
and registers them against canonical Rulebook landmarks using RANSAC.
"""

from __future__ import annotations
import math
import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
from intelligence.vision.field_template import generate_canonical_field_landmarks, FieldLandmark
from intelligence.vision.field_homography_engine import FieldHomographyEngine, HomographyCalibrationResult


class AutoFieldRegistrationEngine:
    """
    Automates extraction of field landmarks from image frames:
    1. HSV field turf masking (isolates grass/turf).
    2. White line morphological extraction.
    3. Hough Line Transform & orientation clustering (yard lines vs sidelines/hashes).
    4. Intersection extraction.
    5. RANSAC registration against canonical NFL field geometry.
    """

    @staticmethod
    def extract_field_mask(image_bgr: np.ndarray) -> np.ndarray:
        """
        Extracts binary mask of the playing surface using green turf HSV bounds.
        """
        hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
        # Standard green turf range in HSV
        lower_green = np.array([28, 40, 40], dtype=np.uint8)
        upper_green = np.array([88, 255, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower_green, upper_green)
        
        # Morphological clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        return mask

    @staticmethod
    def detect_field_lines(image_bgr: np.ndarray, field_mask: Optional[np.ndarray] = None) -> List[Tuple[float, float, float, float]]:
        """
        Detects straight line segments corresponding to yard lines and sidelines.
        Returns list of (x1, y1, x2, y2).
        """
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        
        if field_mask is not None:
            gray = cv2.bitwise_and(gray, gray, mask=field_mask)

        # White line enhancement: high brightness threshold
        _, white_thresh = cv2.threshold(gray, 185, 255, cv2.THRESH_BINARY)
        
        # Edge detection
        edges = cv2.Canny(white_thresh, 50, 150, apertureSize=3)
        
        # Probabilistic Hough Line Transform
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=80,
            minLineLength=60,
            maxLineGap=20
        )

        if lines is None:
            return []

        segments = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            segments.append((float(x1), float(y1), float(x2), float(y2)))
        return segments

    @staticmethod
    def classify_line_orientations(
        lines: List[Tuple[float, float, float, float]]
    ) -> Tuple[List[Tuple[float, float, float, float]], List[Tuple[float, float, float, float]]]:
        """
        Separates lines into:
        - Transverse (yard lines: steep angles, roughly vertical in All-22)
        - Longitudinal (sidelines and hash trails: shallow angles, roughly horizontal in All-22)
        """
        transverse: List[Tuple[float, float, float, float]] = []
        longitudinal: List[Tuple[float, float, float, float]] = []

        for x1, y1, x2, y2 in lines:
            dx = x2 - x1
            dy = y2 - y1
            angle_deg = abs(math.degrees(math.atan2(dy, dx)))
            
            # Angle in [0, 180]
            if angle_deg > 90:
                angle_deg = 180 - angle_deg

            # Shallow angle (< 35 deg) = sideline / longitudinal
            # Steep angle (> 55 deg) = yard line / transverse
            if angle_deg < 35:
                longitudinal.append((x1, y1, x2, y2))
            elif angle_deg > 50:
                transverse.append((x1, y1, x2, y2))

        return transverse, longitudinal

    @staticmethod
    def line_intersection(
        line1: Tuple[float, float, float, float],
        line2: Tuple[float, float, float, float]
    ) -> Optional[Tuple[float, float]]:
        """Computes geometric intersection of two infinite lines defined by segments."""
        x1, y1, x2, y2 = line1
        x3, y3, x4, y4 = line2

        denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        if abs(denom) < 1e-6:
            return None

        px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom
        py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom
        return float(px), float(py)

    @classmethod
    def extract_candidate_intersections(
        cls,
        image_bgr: np.ndarray
    ) -> List[Tuple[float, float]]:
        """
        Finds candidate landmark points (yard line × sideline / hash mark intersections).
        """
        h, w = image_bgr.shape[:2]
        field_mask = cls.extract_field_mask(image_bgr)
        lines = cls.detect_field_lines(image_bgr, field_mask)
        transverse, longitudinal = cls.classify_line_orientations(lines)

        intersections = []
        for t_line in transverse:
            for l_line in longitudinal:
                pt = cls.line_intersection(t_line, l_line)
                if pt is not None:
                    px, py = pt
                    # Filter points inside image boundaries with a margin
                    if 0 <= px < w and 0 <= py < h:
                        intersections.append((px, py))

        # Cluster nearby intersections
        if not intersections:
            return []

        pts_array = np.array(intersections)
        clustered = []
        visited = set()
        for i, pt in enumerate(pts_array):
            if i in visited:
                continue
            dists = np.linalg.norm(pts_array - pt, axis=1)
            neighbors = np.where(dists < 15.0)[0] # within 15 pixels
            for n_idx in neighbors:
                visited.add(n_idx)
            centroid = np.mean(pts_array[neighbors], axis=0)
            clustered.append((float(centroid[0]), float(centroid[1])))

        return clustered

    @classmethod
    def register_field(
        cls,
        matched_pairs: List[Tuple[Tuple[float, float], Tuple[float, float]]]
    ) -> HomographyCalibrationResult:
        """
        Estimates the metric homography H from matched pairs: [((u, v), (X_yd, Y_yd)), ...]
        """
        engine = FieldHomographyEngine()
        for screen_pt, field_pt in matched_pairs:
            engine.add_point_pair(
                screen_x=screen_pt[0],
                screen_y=screen_pt[1],
                field_x=field_pt[0],
                field_y=field_pt[1]
            )
        return engine.solve_homography_ransac(inlier_threshold_pixels=4.0)
