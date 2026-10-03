"""Stated physical-chemistry identity: Beer–Lambert absorbance (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- Beer, A. \"Bestimmung der Absorption des rothen Lichts in farbigen
  Flüssigkeiten,\" Annalen der Physik und Chemie 86, 1852
  (https://doi.org/10.1002/andp.18520820518). The 1852 paper states
  absorption proportional to concentration and path; it does not print the
  modern product symbol A = εℓc. Modern stated form used here:
  A = ε * ℓ * c, with ε (molar absorptivity), ℓ (path length), and c
  (concentration) caller-supplied — none hard-coded.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def beer_lambert(
    epsilon: float | None,
    path_length: float | None,
    concentration: float | None,
) -> float | None:
    """A = epsilon * path_length * concentration.

    Missing → null. Non-positive epsilon or path_length → null.
    Negative concentration → null.
    """
    if epsilon is None or path_length is None or concentration is None:
        return None
    ee = float(epsilon)
    ell = float(path_length)
    cc = float(concentration)
    if ee <= 0.0 or ell <= 0.0:
        return None
    if cc < 0.0:
        return None
    return ee * ell * cc


COLUMN_BACKED_FUNCS: Sequence[str] = ("beer_lambert",)
