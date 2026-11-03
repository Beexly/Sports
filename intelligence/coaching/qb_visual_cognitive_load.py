"""Quarterback visual and cognitive load, grounded in what can be measured.

The sports-vision literature (multiple-object tracking capacity, quiet eye,
coincidence anticipation) supplies real experimental findings, but they come
from controlled tasks, not from broadcast film. This module therefore separates
two things and never blurs them:

    MEASURED   inputs that come from tracking data or a model output
               (disguise rate, pocket area, closing speed, throwing window)
    ASSUMED    the mapping from those inputs to a load score

Every assumption carries a coefficient marked ASSUMED and a note on what would
falsify it. The module returns an index, never a probability, and always returns
its `assumptions` block so a consumer can see what it is standing on.

The honest headline: this is a hypothesis generator. It says "this rep looks
harder than that one", which is testable against CPOE, pressure-to-sack and
time-to-throw. It does not say "this QB will throw an interception".
"""

from __future__ import annotations

from typing import Any

# Multiple-object tracking capacity. Literature places adult capacity near four
# independently tracked objects; beyond that, performance degrades roughly
# linearly in the number of tracked targets.
MOT_CAPACITY = 4.0

# ASSUMED: each target beyond capacity costs this much attention, as a fraction
# of available capacity. Falsified by: no correlation between overload and
# time-to-throw on BDB 2025 labelled reps.
MOT_OVERLOAD_COEFF = 0.18

# ASSUMED: a fully disguised post-snap rotation costs ~120 ms of re-acquisition,
# consistent with reported saccadic re-fixation latencies for unexpected motion.
# Falsified by: no relationship between measured disguise rate and CPOE drop.
SACCADE_BASE_MS = 180.0
SACCADE_DISGUISE_MS = 120.0

# ASSUMED: quiet-eye retention decays as the pocket compresses below its
# comfortable area. Reference pocket is roughly 6 sq yd of clean space.
POCKET_REF_SQ_YDS = 6.0
QUIET_EYE_COMPRESSION_COEFF = 0.45


def compute_qb_visual_cognitive_load(
    active_mot_targets: int,
    disguise_rate: float,
    pocket_voronoi_sq_yds: float,
    target_closing_speed_ms: float,
    throwing_window_yds: float,
) -> dict[str, Any]:
    """Composite visual/cognitive load. Returns an index in [0, 1] plus its parts.

    Parameters are all observable: targets being tracked (from coverage
    assignments), measured disguise rate (post-snap minus pre-snap accuracy),
    pocket area (from defender Voronoi geometry), closing speed and window width
    (from tracking).
    """
    if active_mot_targets < 0:
        raise ValueError("active_mot_targets must be >= 0")
    if not 0.0 <= disguise_rate <= 1.0:
        raise ValueError("disguise_rate must be in [0, 1]")
    if pocket_voronoi_sq_yds < 0:
        raise ValueError("pocket_voronoi_sq_yds must be >= 0")

    overload = max(0.0, float(active_mot_targets) - MOT_CAPACITY)
    mot_penalty = min(1.0, overload * MOT_OVERLOAD_COEFF)

    saccade_ms = SACCADE_BASE_MS + SACCADE_DISGUISE_MS * float(disguise_rate)
    saccade_load = min(1.0, (saccade_ms - SACCADE_BASE_MS) / SACCADE_DISGUISE_MS)

    if POCKET_REF_SQ_YDS > 0:
        compression = max(0.0, 1.0 - float(pocket_voronoi_sq_yds) / POCKET_REF_SQ_YDS)
    else:
        compression = 0.0
    quiet_eye_retention = max(0.0, 1.0 - QUIET_EYE_COMPRESSION_COEFF * compression)

    # Coincidence anticipation: a fast closing target in a thin window demands
    # earlier commitment. Normalised so 8 m/s closing in a 1 yd window = 1.0.
    closing = min(1.0, max(0.0, float(target_closing_speed_ms)) / 8.0)
    window = max(0.05, float(throwing_window_yds))
    anticipation_load = min(1.0, closing / window)

    index = max(0.0, min(1.0, 0.35 * mot_penalty + 0.25 * saccade_load
                         + 0.20 * (1.0 - quiet_eye_retention)
                         + 0.20 * anticipation_load))

    return {
        "visual_cognitive_load_index": round(index, 4),
        "components": {
            "mot_overload_penalty": round(mot_penalty, 4),
            "targets_over_capacity": overload,
            "saccadic_read_latency_ms": round(saccade_ms, 1),
            "quiet_eye_retention_ratio": round(quiet_eye_retention, 4),
            "pocket_compression": round(compression, 4),
            "coincidence_anticipation_index": round(anticipation_load, 4),
        },
        "interpretation": ("not a probability and not an interception forecast; "
                           "a relative difficulty score for ranking reps"),
        "assumptions": {
            "mot_capacity": MOT_CAPACITY,
            "mot_overload_coeff": MOT_OVERLOAD_COEFF,
            "saccade_base_ms": SACCADE_BASE_MS,
            "saccade_disguise_ms": SACCADE_DISGUISE_MS,
            "pocket_ref_sq_yds": POCKET_REF_SQ_YDS,
            "quiet_eye_compression_coeff": QUIET_EYE_COMPRESSION_COEFF,
            "status": "ASSUMED - validated against nothing yet",
            "falsification": [
                "overload should correlate with longer time-to-throw",
                "saccade_ms should correlate with worse CPOE on disguised reps",
                "quiet_eye_retention should correlate with pressure-to-sack rate",
            ],
        },
        "provenance": "ASSUMED_MODEL - research artifact, not a published play set",
    }
