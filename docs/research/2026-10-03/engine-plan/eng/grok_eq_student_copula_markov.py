"""Student copula Markov condition as printed in Mamane Seck, arXiv:2610.19135 eq (2).

X_i \perp X_j | X_{V\\{i,j}} \Leftrightarrow c(u) * c_{-{i,j}}(u_{-{i,j}}) = c_{-{i}}(u_{-{i}}) * c_{-{j}}(u_{-{j}}).
Missing inputs or math failure -> null.
Does not score, mint, or write mind.jsonl.
"""
from __future__ import annotations


def student_copula_markov_condition(
    c: float | None,
    c_ij: float | None,
    c_i: float | None,
    c_j: float | None,
    tol: float = 1e-9,
) -> bool | None:
    if any(v is None for v in (c, c_ij, c_i, c_j)):
        return None
    try:
        left = float(c) * float(c_ij)
        right = float(c_i) * float(c_j)
        return abs(left - right) <= tol
    except (ValueError, OverflowError, TypeError, ZeroDivisionError):
        return None
