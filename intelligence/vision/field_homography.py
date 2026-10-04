"""
field_homography.py
===================
Canonical alias and wrapper for field_homography_engine.py.
Ensures backwards-compatibility for external agents, benchmarks, and test suites.
"""

from intelligence.vision.field_homography_engine import (
    FieldHomographyEngine,
    HomographyCalibrationResult
)

__all__ = ["FieldHomographyEngine", "HomographyCalibrationResult"]
