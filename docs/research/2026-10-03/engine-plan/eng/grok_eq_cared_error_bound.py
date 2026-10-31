"""CARED annotation error bound as printed in Zhang Huang Jin, arXiv:2610.40252.

1{y_hat_t(x) != y(x)} <= 1{y(x) notin C_hat_t(x)} whenever I_t(x)=1.
Fail-closed on bad inputs. Does not score or write mind.
"""
from __future__ import annotations


def cared_error_bound_indicator(
    y_hat_neq_y: bool | None,
    y_notin_set: bool | None,
    automated: bool | None,
) -> bool | None:
    if y_hat_neq_y is None or y_notin_set is None or automated is None:
        return None
    try:
        if not isinstance(y_hat_neq_y, bool) or not isinstance(y_notin_set, bool) or not isinstance(automated, bool):
            return None
        if not automated:
            return None  # bound only holds when automated
        return (not y_hat_neq_y) or y_notin_set  # implication: error implies notin set, i.e. not error or notin
    except (TypeError, ValueError):
        return None
