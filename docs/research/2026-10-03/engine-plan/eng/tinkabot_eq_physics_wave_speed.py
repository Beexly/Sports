"""Stated physics identity: wave speed (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax, College Physics 2e, §16.2 Speed of Sound, Frequency, and Wavelength,
  https://openstax.org/books/college-physics-2e/pages/16-2-speed-of-sound-frequency-and-wavelength
  prints v = f λ. Frequency and wavelength form used here:
  v = f * λ, with f, λ caller-supplied (f>0, λ>0).
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def wave_speed(
    f: float | None,
    wavelength: float | None,
) -> float | None:
    """v = f * λ.

    Missing → null. Non-positive f or wavelength → null.
    """
    if f is None or wavelength is None:
        return None
    ff = float(f)
    ll = float(wavelength)
    if ff <= 0.0 or ll <= 0.0:
        return None
    return ff * ll


COLUMN_BACKED_FUNCS: Sequence[str] = ("wave_speed",)
