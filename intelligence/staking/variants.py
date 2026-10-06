# PROVENANCE — gse-intelligence-build / staking / variants.py
# Staking-variant selection by mean ignorance (r21/1083). 1083 establishes the
# scoring-rule hierarchy ignorance > Brier > RPS at low imperfection
# (delta = 0.01, 0.025; 95% intervals exclude zero): variants are compared on
# mean ignorance (log2), and a challenger is promoted only if it beats the
# champion by >= PROMOTION_GATE_BITS bits of mean ignorance.
# promotion_gate_bits() returns the gate constant: 0.05 bits, exactly.
# Source docs:
#   ~/workspace/corpus-intelligence/deep/c10/syntheses.md (S1: variant selection
#     by mean ignorance (1083); S2)
#   ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md (SYS-02 note:
#     re-score estimators under ignorance before adopting)
#   gate test docstring: "1083: mean ignorance (log2) selects staking variants;
#     >= 0.05-bit promotion gate."

"""1083 variant selection: mean ignorance (log2) with a 0.05-bit promotion gate."""

import numpy as np

PROMOTION_GATE_BITS = 0.05  # 1083 promotion gate: challenger must clear the
                            # champion by >= 0.05 bits of mean ignorance.


def promotion_gate_bits():
    """The 1083 promotion gate in bits of mean ignorance: exactly 0.05."""
    return PROMOTION_GATE_BITS


def mean_ignorance(p_forecast, outcomes):
    """Mean ignorance (log2) of a probability forecast series.

    IGN = mean(-log2(p_assigned_to_the_realized_outcome)); lower is better.
    A perfect forecaster scores 0 bits; a uniform binary forecaster scores 1.
    """
    p = np.asarray(p_forecast, dtype=float)
    y = np.asarray(outcomes, dtype=float)
    p_win = np.clip(np.where(y == 1.0, p, 1.0 - p), 1e-12, 1.0)
    return float(np.mean(-np.log2(p_win)))


def select_staking_variant(champion_ign, challenger_ign,
                           gate_bits=PROMOTION_GATE_BITS):
    """Promote the challenger iff it beats the champion by >= gate bits.

    Returns {"promote": bool, "improvement_bits": float, "gate_bits": float}.
    Implements the 1083 hierarchy: ignorance (not Brier/RPS) decides.
    """
    improvement = float(champion_ign - challenger_ign)
    return {
        "promote": bool(improvement >= gate_bits),
        "improvement_bits": improvement,
        "gate_bits": float(gate_bits),
        "rule": "ignorance > Brier > RPS at low imperfection (1083)",
    }
