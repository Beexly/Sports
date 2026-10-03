"""Stated ML identity: NT-Xent (normalized temperature-scaled CE) (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Chen, Kornblith, Norouzi & Hinton, "A Simple Framework for Contrastive
  Learning of Visual Representations," ICML 2020 / arXiv:2002.05709, Eq. (1):
  ℓ_{i,j} = −log( exp(sim(z_i,z_j)/τ) / Σ_{k≠i} exp(sim(z_i,z_k)/τ) ),
  with temperature τ > 0. Caller supplies the positive similarity sim(z_i,z_j)
  and the similarities to the other keys k≠i (batch mates excluding self).
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def nt_xent_loss(
    sim_pos: float | None,
    sim_others: Sequence[float] | None,
    temperature: float | None,
) -> float | None:
    """ℓ = −log( exp(s⁺/τ) / (exp(s⁺/τ) + Σ exp(s_k/τ)) ) (SimCLR Eq. 1).

    Missing → null. τ ≤ 0 → null. Empty others → null.
    """
    if sim_pos is None or sim_others is None or temperature is None:
        return None
    tau = float(temperature)
    if tau <= 0.0:
        return None
    if len(sim_others) == 0:
        return None
    sp = float(sim_pos)
    # log-sum-exp style for stability: ℓ = −s⁺/τ + log(exp(s⁺/τ)+Σexp(s_k/τ))
    # = −s⁺/τ + logsumexp([s⁺/τ] + [s_k/τ])
    logits = [sp / tau]
    for raw in sim_others:
        if raw is None:
            return None
        logits.append(float(raw) / tau)
    m = max(logits)
    denom = 0.0
    for z in logits:
        denom += math.exp(z - m)
    return -(sp / tau) + (m + math.log(denom))


COLUMN_BACKED_FUNCS: Sequence[str] = ("nt_xent_loss",)
