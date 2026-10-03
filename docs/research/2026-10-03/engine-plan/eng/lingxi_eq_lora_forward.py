"""Printed non-sports identity: LoRA forward (lingxi lane).

One function. Not sports. No I/O. Does not score or mint.

Source (printed in-repo):
docs/research/2026-10-03/engine-plan/GEMINI_PAGE_HUNT_2026-10-03.md
  "3. LoRA. arXiv 2106.09685 section 4.1 equation (3). h = Wx + BAx."

Same product form in
docs/research/2026-10-03/engine-plan/GEMINI_DEEP_RESEARCH_CLOSED_2026-10-03.md
item 7: h = W0 x + B A x.
W, x, B, and A are caller-supplied. No extra constant. Scalars only.
"""
from __future__ import annotations

import math
from collections.abc import Sequence

IDENTITY = "lingxi"


def lora_forward(
    w: float | None,
    x: float | None,
    b: float | None,
    a: float | None,
) -> float | None:
    """h = W x + B A x."""
    if w is None or x is None or b is None or a is None:
        return None
    ww = float(w)
    xx = float(x)
    bb = float(b)
    aa = float(a)
    if not all(math.isfinite(v) for v in (ww, xx, bb, aa)):
        return None
    return ww * xx + (bb * aa) * xx


COLUMN_BACKED_FUNCS: Sequence[str] = ("lora_forward",)