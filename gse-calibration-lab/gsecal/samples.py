"""
Strict loader for operator-supplied settled rows.

DESIGN RULE: this module will not invent a single row. There is no demo mode,
no seeded fixture dataset, no "example" file, and no synthetic fallback when a
file is missing or empty — it raises instead. AGENTS.md law 8 forbids fabricated
product data anywhere, and a calibration tool that can quietly show you numbers
from data it made up is worse than no tool, because those numbers look exactly
like real ones.

Accepts CSV or JSON exported by the operator from any read-only query. Nothing
here connects to a database (AGENTS.md law 7) or the network.
"""

from __future__ import annotations

import csv
import io
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

from gsecal.metrics import Sample

__all__ = [
    "LoadedRow",
    "LoadResult",
    "DECIDED",
    "EXCLUDED",
    "load_rows",
    "load_path",
    "to_samples",
    "group_by",
]

# Only decided outcomes enter calibration. PUSH/VOID are population, not signal;
# PENDING has no outcome at all.
DECIDED = {"WIN": 1, "LOSS": 0, "W": 1, "L": 0, "1": 1, "0": 0, "TRUE": 1, "FALSE": 0}
EXCLUDED = {"PUSH", "VOID", "PENDING", "CANCELLED", "CANCELED", "REFUNDED"}


@dataclass(frozen=True, slots=True)
class LoadedRow:
    p: float
    y: int
    strata: dict[str, str]


@dataclass(frozen=True, slots=True)
class LoadResult:
    rows: tuple[LoadedRow, ...]
    total_seen: int
    excluded_undecided: int
    rejected: tuple[str, ...]
    strata_fields: tuple[str, ...]

    @property
    def n(self) -> int:
        return len(self.rows)

    def samples(self) -> list[Sample]:
        return [Sample(p=r.p, y=r.y) for r in self.rows]

    def summary(self) -> str:
        parts = [
            f"{self.n} decided rows loaded",
            f"{self.total_seen} rows seen",
            f"{self.excluded_undecided} excluded as undecided (PUSH/VOID/PENDING)",
        ]
        if self.rejected:
            parts.append(f"{len(self.rejected)} rejected")
        return " · ".join(parts)


def _normalise_outcome(raw: str) -> int | None:
    """Returns 1/0 for decided, None for legitimately undecided. Raises otherwise."""
    key = str(raw).strip().upper()
    if key in EXCLUDED:
        return None
    if key in DECIDED:
        return DECIDED[key]
    raise ValueError(f"unrecognised outcome {raw!r}")


def _normalise_probability(raw: object, scale_100: bool) -> float:
    value = float(str(raw).strip())
    if scale_100:
        value = value / 100.0
    if not math.isfinite(value):
        raise ValueError(f"non-finite probability {raw!r}")
    if value < 0.0 or value > 1.0:
        raise ValueError(
            f"probability {value!r} outside [0,1]"
            + (" (is the source 0-100? set probability_is_percent)" if not scale_100 else "")
        )
    return value


def load_rows(
    records: Iterable[dict],
    *,
    probability_field: str,
    outcome_field: str,
    strata_fields: Sequence[str] = (),
    probability_is_percent: bool = False,
    strict: bool = True,
) -> LoadResult:
    """Validate raw dict records into decided samples.

    `strict=True` (default) raises on the first malformed row. `strict=False`
    collects rejects and reports them — it never silently drops one, because a
    silently dropped row changes every metric downstream.
    """
    rows: list[LoadedRow] = []
    rejected: list[str] = []
    total = 0
    undecided = 0
    # A stratum field that exists in NO record must be an error, never a silent
    # single "(unset)" bucket: that would report "cancellation 0.0000" for a
    # mistyped column name, which reads exactly like a real finding of no
    # cancellation. Absent-everywhere is a typo; absent-sometimes is real data.
    strata_seen: set[str] = set()

    for i, rec in enumerate(records):
        total += 1
        try:
            if probability_field not in rec:
                raise ValueError(f"missing field {probability_field!r}")
            if outcome_field not in rec:
                raise ValueError(f"missing field {outcome_field!r}")
            y = _normalise_outcome(rec[outcome_field])
            if y is None:
                undecided += 1
                continue
            p = _normalise_probability(rec[probability_field], probability_is_percent)
            strata_seen.update(f for f in strata_fields if f in rec)
            strata = {f: str(rec.get(f, "") or "(unset)") for f in strata_fields}
            rows.append(LoadedRow(p=p, y=y, strata=strata))
        except (ValueError, TypeError) as exc:
            message = f"row {i + 1}: {exc}"
            if strict:
                raise ValueError(message) from exc
            rejected.append(message)

    if total == 0:
        raise ValueError(
            "No rows found. This tool does not generate sample data — export real "
            "settled rows and supply them (AGENTS.md law 8)."
        )
    if not rows:
        raise ValueError(
            f"{total} rows seen but none were decided WIN/LOSS. "
            "Calibration needs settled outcomes."
        )

    missing_strata = [f for f in strata_fields if f not in strata_seen]
    if missing_strata:
        raise ValueError(
            f"stratum field(s) {missing_strata} appear in no row — check the column "
            f"name. Refusing to report a single '(unset)' stratum, because a "
            f"cancellation of 0.0000 from a mistyped column is indistinguishable "
            f"from a real finding of no cancellation."
        )

    return LoadResult(
        rows=tuple(rows),
        total_seen=total,
        excluded_undecided=undecided,
        rejected=tuple(rejected),
        strata_fields=tuple(strata_fields),
    )


def _parse_text(text: str) -> list[dict]:
    stripped = text.lstrip()
    if stripped.startswith("[") or stripped.startswith("{"):
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            for key in ("rows", "data", "picks", "samples", "results"):
                if isinstance(parsed.get(key), list):
                    return list(parsed[key])
            raise ValueError(
                "JSON object supplied but no array found under rows/data/picks/samples/results"
            )
        if not isinstance(parsed, list):
            raise ValueError("JSON must be an array of row objects")
        return list(parsed)
    return list(csv.DictReader(io.StringIO(text)))


def load_path(path: str | Path, **kwargs) -> LoadResult:
    """Load a CSV or JSON export from disk. Format detected from content."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"{p} does not exist")
    text = p.read_text(encoding="utf-8-sig")
    if not text.strip():
        raise ValueError(f"{p} is empty — this tool will not substitute sample data")
    return load_rows(_parse_text(text), **kwargs)


def load_text(text: str, **kwargs) -> LoadResult:
    if not text or not text.strip():
        raise ValueError("No content supplied — this tool will not substitute sample data")
    return load_rows(_parse_text(text), **kwargs)


def to_samples(rows: Sequence[LoadedRow]) -> list[Sample]:
    return [Sample(p=r.p, y=r.y) for r in rows]


def group_by(result: LoadResult, field: str) -> dict[str, list[Sample]]:
    """Partition decided rows into disjoint strata by one field.

    Disjointness matters: the ECE decomposition identity assumes every row
    belongs to exactly one stratum.
    """
    if field not in result.strata_fields:
        raise ValueError(
            f"{field!r} was not captured. Load with strata_fields including it. "
            f"Available: {list(result.strata_fields)}"
        )
    out: dict[str, list[Sample]] = {}
    for row in result.rows:
        out.setdefault(row.strata[field], []).append(Sample(p=row.p, y=row.y))
    return out
