"""Guarded function for contemporaneous conditional independence in HMM copula context.
Printed eq from Ötting et al. 2020 arXiv:2002.01193 eq (1).
"""
from typing import Callable, Sequence

def contemporaneous_conditional_independence(
    marginal_pmfs: Sequence[Callable[[int], float]],
    observations: Sequence[int],
) -> float:
    """Compute joint under contemporaneous conditional independence.
    
    f(y | s) = prod_k f_k(y_k | s)
    
    Fail-closed: raises on empty, mismatch length, or non-positive result.
    """
    if not marginal_pmfs or not observations:
        raise ValueError("empty inputs")
    if len(marginal_pmfs) != len(observations):
        raise ValueError("length mismatch")
    joint = 1.0
    for pmf, y in zip(marginal_pmfs, observations):
        p = pmf(y)
        if p < 0:
            raise ValueError("negative probability")
        joint *= p
    if joint <= 0:
        raise ValueError("non-positive joint")
    return joint
