"""
NGS / Big Data Bowl coordinate and feature engine.

Imports directly from root ngs_coordinates.py to provide access under
intelligence.physics.ngs_coordinates as well as root.
"""

from ngs_coordinates import (
    FIELD_LENGTH,
    FIELD_WIDTH,
    YARD_LINE_50,
    FPS,
    Point,
    TrackingFrame,
    ProspectKinematics,
    normalize_angle,
    direction_to_vector,
    vector_to_direction,
    angle_between,
    is_behind_los,
    project_forward,
    peak_speed,
    time_to_peak_speed,
    max_acceleration,
    change_of_direction_cost,
    separation,
    closing_speed,
    summarize_drill,
)

__all__ = [
    "FIELD_LENGTH",
    "FIELD_WIDTH",
    "YARD_LINE_50",
    "FPS",
    "Point",
    "TrackingFrame",
    "ProspectKinematics",
    "normalize_angle",
    "direction_to_vector",
    "vector_to_direction",
    "angle_between",
    "is_behind_los",
    "project_forward",
    "peak_speed",
    "time_to_peak_speed",
    "max_acceleration",
    "change_of_direction_cost",
    "separation",
    "closing_speed",
    "summarize_drill",
]
