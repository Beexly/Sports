"""
motif_trace.py — The audited forecast trace (GSE-X exam).

Every number a forecast asserts must map to a feed row. A trace that
cannot prove its numbers REFUSES instead of publishing. This is the
capability no host model has: a forecast whose every claim is auditable
against feeds, and whose own history can falsify it.

Ownership: Motif. Additive to the engine — import, don't modify.
Point-in-time: a feed row is admissible only if row.asof is strictly
before the game's kickoff (season*100+week strictly before the game).
Ratios and shrinkage happen before any home-minus-away diff.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Feed rows
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class FeedRow:
    """One observed fact from a feed, pinned to a point in time."""
    source: str        # e.g. "nflverse_pbp", "nws_weather", "injury_report", "sportsbook"
    row_id: str        # stable id of the row in the source
    field: str         # the field read
    value: Any         # the value asserted
    asof: int          # season*100+week the row was known (strictly before game)


@dataclass
class FeedRegistry:
    """The set of feed rows a trace may cite. Lookup is exact — no fuzzy match."""
    rows: Dict[Tuple[str, str, str], FeedRow] = field(default_factory=dict)

    def add(self, row: FeedRow) -> None:
        self.rows[(row.source, row.row_id, row.field)] = row

    def get(self, source: str, row_id: str, field_name: str) -> Optional[FeedRow]:
        return self.rows.get((source, row_id, field_name))


# ---------------------------------------------------------------------------
# Trace
# ---------------------------------------------------------------------------

@dataclass
class CitedNumber:
    """One number inside a forecast, with its claimed provenance."""
    label: str
    value: float
    source: str
    row_id: str
    field: str


@dataclass
class ForecastTrace:
    game_id: str
    game_asof: int            # season*100+week of the game; every cited row must be < this
    p_home: float             # the published probability
    numbers: List[CitedNumber] = field(default_factory=list)
    rejected: List[str] = field(default_factory=list)  # what was considered and refused
    factors: List[str] = field(default_factory=list)   # shared factors (for parlays)


REFUSAL_NO_ROW = "REFUSE: cited number has no feed row"
REFUSAL_STALE = "REFUSE: feed row not strictly before the game (lookahead)"
REFUSAL_VALUE_MISMATCH = "REFUSE: cited value != feed row value"
REFUSAL_NO_REJECTIONS = "REFUSE: no rejected alternatives named"
REFUSAL_LEDGER_CONTRADICTION = "REFUSE: ledger falsifies this probability"


@dataclass
class TraceVerdict:
    ok: bool
    reasons: List[str] = field(default_factory=list)


def audit_trace(
    trace: ForecastTrace,
    feeds: FeedRegistry,
    ledger_contradicts: bool = False,
) -> TraceVerdict:
    """
    The exam. Returns ok=True only if:
      - every cited number resolves to a real feed row,
      - the cited value equals the feed value,
      - every cited row is strictly before the game (no lookahead),
      - at least one rejected alternative is named,
      - the sealed ledger does not contradict the published probability.
    """
    reasons: List[str] = []

    for n in trace.numbers:
        row = feeds.get(n.source, n.row_id, n.field)
        if row is None:
            reasons.append(f"{REFUSAL_NO_ROW}: {n.label} -> {n.source}/{n.row_id}/{n.field}")
            continue
        if row.asof >= trace.game_asof:
            reasons.append(
                f"{REFUSAL_STALE}: {n.label} asof={row.asof} game={trace.game_asof}"
            )
        if row.value != n.value:
            reasons.append(
                f"{REFUSAL_VALUE_MISMATCH}: {n.label} cited={n.value} feed={row.value}"
            )

    if not trace.rejected:
        reasons.append(REFUSAL_NO_REJECTIONS)

    if ledger_contradicts:
        reasons.append(f"{REFUSAL_LEDGER_CONTRADICTION}: p_home={trace.p_home}")

    return TraceVerdict(ok=not reasons, reasons=reasons)


# ---------------------------------------------------------------------------
# Provenance on publication (abyssal contract 2)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PublishProvenance:
    """Why a pick published. Fail-closed: null provenance never publishes."""
    signal_ages_min: Dict[str, float]   # signal -> age in minutes at mint
    sources: List[str]                  # feeds that contributed
    gate_decisions: List[str]           # which gates passed, in order
    rejected_alternatives: List[str]    # what was considered and refused


@dataclass
class PublishRecord:
    game_id: str
    p_home: float
    provenance: Optional[PublishProvenance] = None


def may_publish(rec: PublishRecord, max_solo_source_age_min: float = 90.0) -> Tuple[bool, str]:
    """
    Fail-closed publication check.
      - No provenance -> cannot publish.
      - Any solo-source signal older than the bound -> stale, cannot publish.
    """
    if rec.provenance is None:
        return False, "null provenance: fail-closed"
    for sig, age in rec.provenance.signal_ages_min.items():
        if age > max_solo_source_age_min and len(rec.provenance.sources) < 2:
            return False, f"stale solo-source signal: {sig} age={age}min"
    return True, "ok"
