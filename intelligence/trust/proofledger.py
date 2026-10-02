# Provenance: implements the Wilson edge-claim floor from ENGINEERING_PRINCIPLES
# (syntheses.md S2: "Wilson 95% LB >= 52.4% to claim edge on any source",
# ENGINEERING_PRINCIPLES:24). Default 50% null; n >= 30 minimum sample.
#
# DATA BASIS: pure logic module -- no data. The 0.524 floor is the research's own
# number, not derived here.

import math

PROOF_LEDGER_FLOOR = 0.524
MIN_SAMPLE_N = 30


def proof_ledger_floor():
    """Wilson 95% lower bound must clear 52.4% before any edge claim is admitted."""
    return PROOF_LEDGER_FLOOR


def edge_claim_admissible(wilson_lb):
    """An edge claim is admissible iff its Wilson 95% lower bound CLEARS 0.524
    (strictly greater -- 0.524 itself does not clear)."""
    try:
        return float(wilson_lb) > PROOF_LEDGER_FLOOR
    except (TypeError, ValueError):
        return False


def wilson_lower_bound(wins, n, z=1.96):
    """Wilson score interval lower bound for a win rate (95% two-sided default).

    p_hat = wins/n; denom = 1 + z^2/n;
    lb = (p_hat + z^2/(2n) - z*sqrt(p_hat(1-p_hat)/n + z^2/(4n^2))) / denom.
    """
    if n <= 0:
        raise ValueError("n must be positive")
    p = wins / n
    denom = 1.0 + z * z / n
    center = p + z * z / (2 * n)
    margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (center - margin) / denom
