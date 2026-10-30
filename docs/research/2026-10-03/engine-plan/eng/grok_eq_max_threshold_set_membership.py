"""Max-threshold conformal prediction set membership as printed in Doula & Mühlhäuser arXiv:2610.28937.

Printed eq: \hat{S}_{\max}(x) = \{ y \in \mathcal{Y}(x) : A(\pi, y) \leq \hat{q}_{\max} \}
Fail-closed on bad inputs. Does not score or write mind. Lin held.
"""
from __future__ import annotations

import math


def max_threshold_set_membership(score: float | None, q_max: float | None) -> bool | None:
    """Return True if score <= q_max (membership in MaxThr set), None on invalid inputs.

    Source: Doula & Mühlhäuser, Auditing Conformal Prediction for Language Models
    Under Inference-Time Model Shift, arXiv:2610.28937v1, printed eq for \hat{S}_{\max}.
    https://arxiv.org/html/2610.28937v1
    """
    if score is None or q_max is None:
        return None
    try:
        s = float(score)
        q = float(q_max)
        if not (math.isfinite(s) and math.isfinite(q)):
            return None
        return s <= q
    except (TypeError, ValueError, OverflowError):
        return None


FUNCTIONS = {"max_threshold_set_membership": max_threshold_set_membership}
