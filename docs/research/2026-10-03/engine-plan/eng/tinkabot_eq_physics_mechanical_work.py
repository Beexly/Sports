"""Stated physics identity: mechanical work, parallel case (tinkabot lane).

Stated identity: tinkabot.
One function. Not sports. Does not edit equations.py, gse_eq_corpus.py,
or Lingxi files. Does not score or mint. Does not touch mind.jsonl or trainers.

Source:
- OpenStax College Physics 2e, §7.1 Work: The Scientific Definition,
  https://openstax.org/books/college-physics-2e/pages/7-1-work-the-scientific-definition
  prints W = F d when force is parallel to the displacement.
  Missing force or displacement → null.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"


def mechanical_work(
    force: float | None,
    displacement: float | None,
) -> float | None:
    """W = F d (force parallel to displacement).

    Missing any argument → null.
    """
    if force is None or displacement is None:
        return None
    return float(force) * float(displacement)


COLUMN_BACKED_FUNCS: Sequence[str] = ("mechanical_work",)
