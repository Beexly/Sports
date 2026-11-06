"""
field_template.py
=================
NFL Rulebook 2022-2026 Canonical 2D Field Metric Template.
Defines ground-truth world coordinates (in yards) for an NFL football field.

Coordinate Reference Frame:
- Origin (0, 0): Back-left corner of the south/home endzone.
- X-axis (Length): 0.0 to 120.0 yards.
  * 0.0 to 10.0: Endzone 1
  * 10.0: Goal Line 1 (0-yard line)
  * 15.0 to 105.0: 5-yard lines up to opposite 0-yard line
  * 110.0: Goal Line 2
  * 110.0 to 120.0: Endzone 2
  * 120.0: Back of Endzone 2
- Y-axis (Width): 0.0 to 53.333 yards (160 feet).
  * 0.0: Left / Home Sideline
  * 23.583 yards (70 ft 9 in): Left / Near Hash Mark line
  * 29.750 yards: Right / Far Hash Mark line (Hash width = 18 ft 6 in = 6.167 yards)
  * 53.333 yards (160 ft): Right / Away Sideline
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Tuple
import numpy as np


FIELD_LENGTH_YARDS = 120.0
FIELD_WIDTH_YARDS = 53.33333333
GOAL_LINE_1 = 10.0
GOAL_LINE_2 = 110.0
HASH_NEAR_Y = 23.58333333   # 70 ft 9 in from near sideline
HASH_FAR_Y = 29.75000000    # 70 ft 9 in from far sideline (6.1667 yards apart)
SIDELINE_NEAR_Y = 0.0
SIDELINE_FAR_Y = FIELD_WIDTH_YARDS


@dataclass(frozen=True)
class FieldLandmark:
    name: str
    x_yard: float
    y_yard: float
    feature_type: str  # 'intersection', 'hash', 'number', 'goal_post'


def generate_canonical_field_landmarks() -> Dict[str, FieldLandmark]:
    """
    Generates all canonical physical landmarks defined by the NFL Rulebook.
    Returns a dictionary of named 2D world points (X, Y) in yards.
    """
    landmarks: Dict[str, FieldLandmark] = {}

    # 1. Endlines and Goal lines corners
    key_x_lines = [
        ("ENDLINE_1", 0.0),
        ("GOAL_1", 10.0),
        ("GOAL_2", 110.0),
        ("ENDLINE_2", 120.0)
    ]
    for x_name, x_val in key_x_lines:
        landmarks[f"{x_name}_NEAR_SIDELINE"] = FieldLandmark(f"{x_name}_NEAR_SIDELINE", x_val, SIDELINE_NEAR_Y, "intersection")
        landmarks[f"{x_name}_FAR_SIDELINE"] = FieldLandmark(f"{x_name}_FAR_SIDELINE", x_val, SIDELINE_FAR_Y, "intersection")
        landmarks[f"{x_name}_NEAR_HASH"] = FieldLandmark(f"{x_name}_NEAR_HASH", x_val, HASH_NEAR_Y, "hash")
        landmarks[f"{x_name}_FAR_HASH"] = FieldLandmark(f"{x_name}_FAR_HASH", x_val, HASH_FAR_Y, "hash")

    # 2. Every 5-yard line between goal lines (15.0 to 105.0)
    for x_yard in range(15, 110, 5):
        actual_field_yard = x_yard - 10 if x_yard <= 60 else 110 - x_yard
        prefix = f"YD_{actual_field_yard}_{'H' if x_yard <= 60 else 'A'}_{x_yard}"
        
        # Sideline intersections
        landmarks[f"{prefix}_NEAR_SIDELINE"] = FieldLandmark(f"{prefix}_NEAR_SIDELINE", float(x_yard), SIDELINE_NEAR_Y, "intersection")
        landmarks[f"{prefix}_FAR_SIDELINE"] = FieldLandmark(f"{prefix}_FAR_SIDELINE", float(x_yard), SIDELINE_FAR_Y, "intersection")
        
        # Hash mark intersections
        landmarks[f"{prefix}_NEAR_HASH"] = FieldLandmark(f"{prefix}_NEAR_HASH", float(x_yard), HASH_NEAR_Y, "hash")
        landmarks[f"{prefix}_FAR_HASH"] = FieldLandmark(f"{prefix}_FAR_HASH", float(x_yard), HASH_FAR_Y, "hash")

    # 3. 1-yard inbound hash ticks along key zones (e.g. 20-50 yard territory)
    for x_yard in range(20, 101, 1):
        if x_yard % 5 != 0:
            landmarks[f"TICK_{x_yard}_NEAR_HASH"] = FieldLandmark(f"TICK_{x_yard}_NEAR_HASH", float(x_yard), HASH_NEAR_Y, "hash")
            landmarks[f"TICK_{x_yard}_FAR_HASH"] = FieldLandmark(f"TICK_{x_yard}_FAR_HASH", float(x_yard), HASH_FAR_Y, "hash")

    return landmarks


def get_field_matrix() -> np.ndarray:
    """Returns an N x 2 numpy array of all landmark coordinates."""
    lms = generate_canonical_field_landmarks()
    return np.array([[lm.x_yard, lm.y_yard] for lm in lms.values()], dtype=np.float64)
