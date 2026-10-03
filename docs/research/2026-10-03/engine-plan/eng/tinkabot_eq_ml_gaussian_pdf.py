"""Stated probability identity: univariate Gaussian PDF (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Gauss, C. F. Theoria Motus Corporum Coelestium in Sectionibus Conicis
  Solem Ambientium, 1809 (English: Theory of the Motion of the Heavenly
  Bodies, 1857), book II §3 art. 177 — normal/error density of the form
  (h/√π) e^{-h²Δ²}; modern μ,σ parameterization:
  φ(x) = (1/(σ√(2π))) exp(−(x−μ)²/(2σ²)).
  Online scan (Cambridge/IA): https://archive.org/details/theoryofmotiono00gausrich
  Also stated in standard form in later reprints; μ and σ are caller-supplied.

σ is not hard-coded.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "tinkabot"


def gaussian_pdf(
    x: float | None,
    mu: float | None,
    sigma: float | None,
) -> float | None:
    """φ(x;μ,σ) = (1/(σ√(2π))) exp(-(x-μ)²/(2σ²)).

    Missing → null. Non-positive sigma → null.
    """
    if x is None or mu is None or sigma is None:
        return None
    xx = float(x)
    mm = float(mu)
    ss = float(sigma)
    if ss <= 0.0:
        return None
    z = (xx - mm) / ss
    return math.exp(-0.5 * z * z) / (ss * math.sqrt(2.0 * math.pi))


COLUMN_BACKED_FUNCS: Sequence[str] = ("gaussian_pdf",)
