"""Printed Translation Edit Rate (lingxi lane).

One function. No I/O. Does not score a slate or mint.

Matthew Snover, Bonnie Dorr, Richard Schwartz, Linnea Micciulla,
John Makhoul, A Study of Translation Edit Rate with Targeted Human
Annotation, AMTA 2006, anthology 2006.amta-papers.25, Section 3,
PDF page 3:

    TER = (# of edits) / (average # of reference words)

Edits are insertions, deletions, substitutions, and shifts to the
closest reference. Not BLEU, not BLEU BP, not ROUGE-N/L/S.
"""
from __future__ import annotations

import math

IDENTITY = "lingxi"


def translation_edit_rate(
    num_edits: float | None, avg_reference_words: float | None
) -> float | None:
    """Section 3, Snover et al. AMTA 2006 PDF page 3."""
    if num_edits is None or avg_reference_words is None:
        return None
    edits = float(num_edits)
    denom = float(avg_reference_words)
    if not math.isfinite(edits) or not math.isfinite(denom):
        return None
    if edits < 0.0 or denom <= 0.0:
        return None
    return edits / denom


COLUMN_BACKED_FUNCS = ("translation_edit_rate",)