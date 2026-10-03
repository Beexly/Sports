"""Stated physics identity: photon energy (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §29.3 Photon Energies and the Electromagnetic Spectrum,
  https://openstax.org/books/college-physics-2e/pages/29-3-photon-energies-and-the-electromagnetic-spectrum
  prints E = hf (also E = hc/λ). Frequency form used here:
  E = h * f, with h, f caller-supplied (h>0, f>0).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def photon_energy(
    h: float | None,
    f: float | None,
) -> float | None:
    """E = h * f.

    Missing → null. Non-positive h or f → null.
    """
    if h is None or f is None:
        return None
    hh = float(h)
    ff = float(f)
    if hh <= 0.0 or ff <= 0.0:
        return None
    return hh * ff


COLUMN_BACKED_FUNCS: Sequence[str] = ("photon_energy",)
