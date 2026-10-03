"""Stated ML calibration identity: temperature scaling (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not restore HOLD deletes.
Does not copy epa_success / red_zone / two_minute.

Source (non-sports ML paper, local research cite):
- C:\\Users\\Garrett\\_research\\agent-bus\\inbox\\from-motif\\repo-intel\\models\\gpleiss-temperature_scaling.md
  (gpleiss/temperature_scaling; Guo et al. "On Calibration of Modern Neural
  Networks", arXiv 1706.04599): post-hoc calibration divides logits by a
  positive scalar temperature T before the sigmoid/softmax.

Maps onto existing logit columns already produced in-repo (equations.logit).
Temperature T is caller-supplied — no fitted coefficient is hard-coded here.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def temperature_scale(logit: float | None, temperature: float | None) -> float | None:
    """Scaled logit = logit / T. Missing inputs or non-positive T → null."""
    if logit is None or temperature is None:
        return None
    t = float(temperature)
    if t <= 0.0:
        return None
    return float(logit) / t


COLUMN_BACKED_FUNCS: Sequence[str] = ("temperature_scale",)
