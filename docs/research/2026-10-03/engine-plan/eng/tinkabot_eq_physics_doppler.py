"""Stated physics identity: Doppler effect, stationary observer (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §17.4 Doppler Effect and Sonic Booms,
  https://openstax.org/books/college-physics-2e/pages/17-4-doppler-effect-and-sonic-booms
  prints f_obs = f_s (v / (v − v_s)) for a source moving toward a
  stationary observer (v = speed of sound, v_s = source speed).
  Missing args, non-positive sound speed, or v == v_s → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def doppler_frequency_stationary_observer(
    f_source: float | None,
    v_sound: float | None,
    v_source: float | None,
) -> float | None:
    """f_obs = f_s * v / (v − v_s) (source toward stationary observer).

    Missing any argument → null. v_sound ≤ 0 or v_sound == v_source → null.
    """
    if f_source is None or v_sound is None or v_source is None:
        return None
    fs = float(f_source)
    v = float(v_sound)
    vs = float(v_source)
    if v <= 0.0 or v == vs:
        return None
    return fs * (v / (v - vs))


COLUMN_BACKED_FUNCS: Sequence[str] = ("doppler_frequency_stationary_observer",)
