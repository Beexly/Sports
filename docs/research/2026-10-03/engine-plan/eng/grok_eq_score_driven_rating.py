"""Guarded function from printed equation (2) of Holý & Černý, Score-Driven Rating System for Sports, arXiv:2604.09143.

Classic Elo rating update for player A.
"""

from typing import Tuple

def score_driven_elo_update(
    r_a: float,
    r_b: float,
    y_a: float,
    k: float = 16.0,
) -> float:
    """Update rating for player A after game vs B.

    Printed: r_{t+1}^{(A)} = r_t^{(A)} + 16 ( y_t^{(A)} - 1/(1 + 10^{-(r_A - r_B)/400}) )

    Fail-closed: rejects non-numeric or out-of-range y_a (must be 0 or 1 for binary outcome).
    """
    if not isinstance(r_a, (int, float)) or not isinstance(r_b, (int, float)):
        raise ValueError("ratings must be numeric")
    if y_a not in (0.0, 1.0, 0, 1):
        raise ValueError("y_a must be 0 or 1 for this Elo form")
    expected = 1.0 / (1.0 + 10.0 ** (-(r_a - r_b) / 400.0))
    return r_a + k * (float(y_a) - expected)
