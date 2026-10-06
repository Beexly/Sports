# Provenance: the c02 interface contract (see README.md).
# SplitSpec is the protocol c02 implements for situational splits
# (down x distance x field position x game script) and trust-target splits
# (WR-absence conditionalization, receiver-conditional TD priors).
# This engine runs them against its filtered frames via apply_split().
"""Split protocol for the c02 situational/trust-target layer."""
from __future__ import annotations

from typing import Protocol

import polars as pl


class SplitSpec(Protocol):
    """A named split c02 defines; the engine executes it on its frames."""
    name: str
    dimensions: tuple[str, ...]

    def compute(self, frame: pl.DataFrame) -> dict:
        """Return {dimension_tuple: {metric: value}} from a dropback/target frame."""
        ...


def apply_split(engine, qb_id: str, season: int, spec: SplitSpec,
                frame_kind: str = "dropback") -> dict:
    """Run a c02 SplitSpec against the engine's filtered frame."""
    if frame_kind == "target":
        frame = engine.get_target_frame(qb_id, season)
    else:
        frame = engine.get_dropback_frame(qb_id, season)
    return {"split": spec.name, "dimensions": list(spec.dimensions),
            "qb_id": qb_id, "season": season, "n": len(frame),
            "result": spec.compute(frame)}
