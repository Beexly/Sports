"""Clayton Archimedean generator as printed in arXiv:2602.15319 eq (33).

phi_theta(t) = (t^{-theta} - 1) / theta , theta > 0.
Missing inputs, t not in (0, 1], theta <= 0, or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def clayton_generator(t: float | None, theta: float | None) -> float | None:
    if t is None or theta is None:
        return None
    try:
        tt = float(t)
        th = float(theta)
    except (TypeError, ValueError):
        return None
    if not (0.0 < tt <= 1.0):
        return None
    if th <= 0.0:
        return None
    try:
        return (tt ** (-th) - 1.0) / th
    except (ValueError, OverflowError, ZeroDivisionError):
        return None
