"""Printed next-goal home price (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Divos, del Bano Rollin, Bihari, and Aste, Risk-Neutral Pricing and
Hedging of In-Play Football Bets, arXiv:1811.03931v1, equation (A1),
PDF page 20. Also noted in
docs/arxiv-program/research/2026-09-21/arxiv-deep/0097-riskneutral-pricing-and-hedging-of-inplay.md.

    X = (lambda_1 / (lambda_1 + lambda_2)) * (1 - exp(-(lambda_1 + lambda_2) * (T - t)))

Not equation (A2), and not the Skellam winning-margin row in Table A1.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def next_goal_home_value(
    lam_home: float | None,
    lam_away: float | None,
    remaining: float | None,
) -> float | None:
    """Equation (A1), arXiv:1811.03931v1 PDF page 20. remaining is T-t."""
    if lam_home is None or lam_away is None or remaining is None:
        return None
    home = float(lam_home)
    away = float(lam_away)
    tau = float(remaining)
    if not all(math.isfinite(v) for v in (home, away, tau)):
        return None
    if home < 0.0 or away < 0.0 or tau < 0.0:
        return None
    total = home + away
    if total <= 0.0:
        return None
    return (home / total) * (1.0 - math.exp(-total * tau))


COLUMN_BACKED_FUNCS = ("next_goal_home_value",)