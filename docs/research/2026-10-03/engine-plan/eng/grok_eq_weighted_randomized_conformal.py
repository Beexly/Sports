"""Guarded function for weighted randomized conformal rule from arXiv:2610.37866 eq (5).
Fail-closed: raises on invalid inputs."""

from typing import Callable, Sequence
import math

def weighted_randomized_conformal_membership(
    scores: Sequence[float],
    weights: Sequence[float],
    candidate_score: float,
    candidate_weight: float,
    alpha: float,
    u: float,
) -> bool:
    """Return True if candidate y is in the prediction set per eq (5).

    C_s(T, x, U) = {y : (A_s + U * B_s) / W_x > alpha}
    A_s = sum w_i * 1{s_i > s(x,y)}
    B_s = w(x) + sum w_i * 1{s_i == s(x,y)}
    W_x = sum w_i + w(x)
    """
    if not (0 <= alpha < 1):
        raise ValueError("alpha must be in [0, 1)")
    if not (0 <= u <= 1):
        raise ValueError("u must be in [0, 1]")
    if len(scores) != len(weights):
        raise ValueError("scores and weights length mismatch")
    if candidate_weight <= 0:
        raise ValueError("candidate_weight must be positive")
    if any(w < 0 for w in weights):
        raise ValueError("weights must be non-negative")
    if any(not math.isfinite(s) for s in scores) or not math.isfinite(candidate_score):
        raise ValueError("scores must be finite")

    m = len(scores)
    A = sum(w for s, w in zip(scores, weights) if s > candidate_score)
    B = candidate_weight + sum(w for s, w in zip(scores, weights) if s == candidate_score)
    W_x = sum(weights) + candidate_weight
    if W_x <= 0:
        raise ValueError("W_x must be positive")

    threshold = (A + u * B) / W_x
    return threshold > alpha
