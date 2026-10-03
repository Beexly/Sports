"""Bayes binomial term. No score. No mint. Never main.

The probability the event happens p times and fails q times in p+q trials is E a^p b^q.
Source: Bayes, communicated by Price, An Essay towards solving a Problem in the
Doctrine of Chances, 1763, https://bayes.wustl.edu/Manual/an.essay.pdf printed p. 8
of that open retypeset. a and b are supplied probabilities. This returns the term
a^p * b^q, not a posterior and not a pick.
"""
from __future__ import annotations

import math
from typing import Any


def _finite(x: Any) -> float | None:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v):
        return None
    return v


def bayes_binomial_term(a: Any, b: Any, p: Any, q: Any) -> float | None:
    vals = [_finite(x) for x in (a, b, p, q)]
    if any(x is None for x in vals):
        return None
    a_f, b_f, p_f, q_f = vals
    if not (0.0 <= a_f <= 1.0 and 0.0 <= b_f <= 1.0):
        return None
    if p_f < 0.0 or q_f < 0.0:
        return None
    if (a_f == 0.0 and p_f > 0.0) or (b_f == 0.0 and q_f > 0.0):
        return 0.0
    return math.pow(a_f, p_f) * math.pow(b_f, q_f)


FUNCTIONS = {"bayes_binomial_term": bayes_binomial_term}
