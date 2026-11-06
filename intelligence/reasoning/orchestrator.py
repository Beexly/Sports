"""Orchestrator and Corpus/Equation Validation Gate for the Reasoning Engine (PY-3A).

Wires automatic population of ``context.corpus_hits`` via
``intelligence.research.corpus_retriever.as_corpus_hits()`` when empty, and
enforces ``validate_corpus_and_equation_gate(context)`` so that any equation
lacking ``gate_status == "VALIDATED"`` is filtered/flagged and validated corpus
hits are exposed to specialists.
"""
from __future__ import annotations

import functools
from typing import Any

from .interfaces import AnalysisRequest, DataContext
from .schemas import ReasoningTrace
try:
    from intelligence.research.corpus_retriever import as_corpus_hits
except ImportError:
    from research.corpus_retriever import as_corpus_hits


@functools.lru_cache(maxsize=256)
def _cached_corpus_hits(query: str, k: int) -> tuple[str, ...]:
    return tuple(as_corpus_hits(query, k=k))


def validate_corpus_and_equation_gate(
    context: DataContext,
    query: str = "",
    k: int = 5,
) -> dict[str, Any]:
    """Populate ``context.corpus_hits`` when empty and filter/flag unvalidated equations.

    - Calls ``as_corpus_hits(query, k=k)`` when ``context.corpus_hits`` is empty.
    - Inspects equations in ``context.equations`` (and ``context.profiles.get("equations")``
      or ``context.market.get("equations")`` if present):
      * Equations with ``gate_status == "VALIDATED"`` are placed in ``context.validated_equations``.
      * Any equation without ``gate_status == "VALIDATED"`` is filtered out and recorded in
        ``context.flagged_equations`` with ``flag_reason``.
    - Exposes validated corpus hits in ``context.validated_corpus_hits`` (and mirrors into
      ``context.profiles["validated_corpus_hits"]`` and ``context.profiles["validated_equations"]``
      so all specialist modules have direct access).
    """
    effective_query = (query or "").strip()
    if not effective_query:
        matchup_terms = []
        if isinstance(context.market, dict):
            for key in ("home_team", "away_team", "sport", "market_type", "selection"):
                val = context.market.get(key)
                if val:
                    matchup_terms.append(str(val))
        effective_query = " ".join(matchup_terms) if matchup_terms else "nfl situational reasoning"

    if not context.corpus_hits:
        try:
            context.corpus_hits = list(_cached_corpus_hits(effective_query, k))
        except Exception:
            context.corpus_hits = []

    validated_hits = [str(hit) for hit in context.corpus_hits if str(hit).strip()]
    context.validated_corpus_hits = list(validated_hits)

    raw_equations: list[dict[str, Any]] = []
    if getattr(context, "equations", None):
        raw_equations.extend(eq for eq in context.equations if isinstance(eq, dict))
    if isinstance(context.profiles, dict) and isinstance(context.profiles.get("equations"), list):
        for eq in context.profiles["equations"]:
            if isinstance(eq, dict) and eq not in raw_equations:
                raw_equations.append(eq)
    if isinstance(context.market, dict) and isinstance(context.market.get("equations"), list):
        for eq in context.market["equations"]:
            if isinstance(eq, dict) and eq not in raw_equations:
                raw_equations.append(eq)

    validated_equations: list[dict[str, Any]] = []
    flagged_equations: list[dict[str, Any]] = []

    for eq in raw_equations:
        status = str(eq.get("gate_status") or "").strip().upper()
        if status == "VALIDATED":
            validated_equations.append(dict(eq))
        else:
            flagged = dict(eq)
            flagged["flagged"] = True
            flagged["flag_reason"] = (
                f"equation gate_status is '{eq.get('gate_status', 'MISSING')}' != 'VALIDATED'"
            )
            flagged_equations.append(flagged)

    context.validated_equations = validated_equations
    context.flagged_equations = flagged_equations

    if isinstance(context.profiles, dict):
        context.profiles["validated_corpus_hits"] = list(validated_hits)
        context.profiles["validated_equations"] = list(validated_equations)
        context.profiles["flagged_equations"] = list(flagged_equations)

    gate_summary: dict[str, Any] = {
        "query": effective_query,
        "corpus_hit_count": len(context.corpus_hits),
        "validated_corpus_hit_count": len(validated_hits),
        "validated_corpus_hits": list(validated_hits),
        "total_equation_count": len(raw_equations),
        "validated_equation_count": len(validated_equations),
        "flagged_equation_count": len(flagged_equations),
        "validated_equations": validated_equations,
        "flagged_equations": flagged_equations,
        "gate_passed": len(flagged_equations) == 0,
    }
    context.corpus_gate_status = gate_summary
    return gate_summary


class ReasoningOrchestrator:
    """High-level orchestrator that enforces the corpus/equation gate before analysis."""

    def __init__(self, engine: Any | None = None) -> None:
        if engine is None:
            from .engine import AnalysisEngine

            engine = AnalysisEngine()
        self.engine = engine

    def analyze(self, req: AnalysisRequest, ctx: DataContext | None = None) -> ReasoningTrace:
        context = ctx if ctx is not None else DataContext()
        validate_corpus_and_equation_gate(context, query=req.question)
        return self.engine.analyze(req, context)
