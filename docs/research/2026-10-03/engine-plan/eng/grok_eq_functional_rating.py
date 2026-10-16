"""Guarded function from printed equation (1) of Lowery et al., Functional Ratings in Sports, arXiv:1908.00939.

Basic model: β_i(t) - β_j(t) = d(t), where d(t) is point differential.
"""

def functional_rating_difference(
    beta_i: float,
    beta_j: float,
) -> float:
    """Expected point differential from functional ratings.

    Printed: β_i(t) - β_j(t) = d(t).

    Fail-closed: rejects non-numeric inputs.
    """
    if not isinstance(beta_i, (int, float)) or not isinstance(beta_j, (int, float)):
        raise ValueError("ratings must be numeric")
    return float(beta_i) - float(beta_j)
