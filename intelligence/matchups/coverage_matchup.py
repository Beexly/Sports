"""
Equations 11-15: Coverage Assignment Cross-Entropy Loss & GAT Attention (arXiv:2603.25901).
"""

from __future__ import annotations

import numpy as np


def matchup_cross_entropy_loss(logits: np.ndarray, targets: np.ndarray) -> float:
    """
    Equation 11: Factorized Cross-Entropy Loss for Defender -> Receiver Assignment.
    logits: shape (D, R)
    targets: shape (D, R) one-hot ground truth
    """
    exp_z = np.exp(logits - np.max(logits, axis=1, keepdims=True))
    probs = exp_z / np.sum(exp_z, axis=1, keepdims=True)
    D = logits.shape[0]
    loss = -np.sum(targets * np.log(probs + 1e-12)) / D
    return float(loss)


def gat_attention(
    h_i: np.ndarray,
    h_j: np.ndarray,
    W: np.ndarray,
    a: np.ndarray,
    negative_slope: float = 0.2,
) -> float:
    """
    Equation 13: Graph Attention Network (GAT) Edge Score e_ij.
    """
    Wh_i = W @ h_i
    Wh_j = W @ h_j
    concat = np.concatenate([Wh_i, Wh_j])
    raw = float(a.T @ concat)
    return raw if raw > 0 else negative_slope * raw
