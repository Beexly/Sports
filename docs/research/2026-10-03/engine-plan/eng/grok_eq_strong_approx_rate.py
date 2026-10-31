"""Strong approximation error exponent as printed in Bonnerjee Karmakar, arXiv:2610.38202.

O_a.s.( n^{max{d/p, (d-1)/2}} ) rate term.
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations


def strong_approx_error_exponent(d: int | float | None, p: int | float | None) -> float | None:
    if d is None or p is None:
        return None
    try:
        d = float(d)
        p = float(p)
        if d < 1 or p <= 2 or not (d.is_integer() if hasattr(d, 'is_integer') else True):
            return None
        d = int(d)
        if p <= 0:
            return None
        return max(d / p, (d - 1) / 2.0)
    except (TypeError, ValueError, ZeroDivisionError):
        return None
