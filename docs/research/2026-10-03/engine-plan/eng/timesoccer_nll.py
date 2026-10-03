"""TimeSoccer arXiv:2504.17365v3 equation (2). Prefix token is in the conditioning.

Printed: L = -sum_{i=1}^{M_a} log P(Q_a^{(i)} | Q_a^{(<i)}, Q_v, Q_t)
Caller supplies the token log-probabilities. This does not write mind.jsonl.
"""
import math


def timesoccer_nll(log_probs):
    if log_probs is None:
        return None
    if len(log_probs) == 0:
        return None
    total = 0.0
    for x in log_probs:
        try:
            v = float(x)
        except (TypeError, ValueError):
            return None
        if not math.isfinite(v) or v > 0:
            return None
        total += v
    return -total


def source():
    return {
        "paper": "arXiv:2504.17365v3",
        "equation_number": "2",
        "display": "L=-sum_i log P(Q_a^{(i)} | Q_a^{(<i)}, Q_v, Q_t)",
    }
