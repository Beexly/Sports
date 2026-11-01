"""Guarded ease from difficulty under input transformations from arXiv:2511.11472.

Printed: E(x) = 1 - D(x) where D(x) in [0,1] is difficulty estimated by prediction variability under small input perturbations.

Fail-closed: raises on invalid inputs.
"""

import math

def input_transform_ease(difficulty: float) -> float:
    """Return ease E(x) = 1 - D(x) per the printed definition.

    Parameters
    ----------
    difficulty : float
        D(x) estimated in [0, 1].

    Returns
    -------
    float
        Ease in [0, 1].
    """
    if not math.isfinite(difficulty):
        raise ValueError("difficulty must be finite")
    if not (0.0 <= difficulty <= 1.0):
        raise ValueError("difficulty must be in [0, 1]")
    return 1.0 - difficulty
