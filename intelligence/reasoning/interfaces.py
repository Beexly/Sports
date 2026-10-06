# Provenance: reasoning-depth-spec.md §7 (API shape: analyze/adversaryReview/
# validateChecklist/correlatedTheses). Shared types from schemas.py (canonical
# contract). The adversarial layer is c08's adversary.py + checklist.py; this module
# defines the request/context/protocols the engine and specialists share.

"""Request, data context, and protocols shared by the reasoning engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from .enums import Exposure, ReasoningDepth
from .schemas import BetLeg, CausalChain, Claim


@dataclass
class GameRequest:
    away: str
    home: str
    week: int
    season: int


@dataclass
class AnalysisRequest:
    game: GameRequest
    question: str
    exposure: Exposure = Exposure.NONE
    requested_depth: ReasoningDepth | None = None  # floor; engine may escalate, never de-escalate
    resume_trace_id: str | None = None
    market_edge_pct: float = 0.0
    legs: list[BetLeg] = field(default_factory=list)


@dataclass
class DataContext:
    """Everything a specialist may need. The reasoning layer never invents data.

    observations → copied to trace.observed_values (breaking conditions evaluate
    against these). chains → trace.chains (L3 causal structure the adversary attacks).
    checklist_hints → trace.checklist verdicts.
    """

    profiles: dict[str, Any] = field(default_factory=dict)
    market: dict[str, Any] = field(default_factory=dict)
    observations: dict[str, float] = field(default_factory=dict)
    chains: list[CausalChain] = field(default_factory=list)
    checklist_hints: dict[str, str] = field(default_factory=dict)
    corpus_hits: list[str] = field(default_factory=list)
    live_signals: list[str] = field(default_factory=list)
    track_evidence: dict[str, list[tuple[str, str]]] = field(default_factory=dict)
    tool_backend: Callable[[str, dict], str] | None = None


@dataclass
class SpecialistOutput:
    agent: str  # "stat" | "scheme" | "behavior" | "signal" | "adversary"
    claims: list[Claim] = field(default_factory=list)
    correlations: list[dict] = field(default_factory=list)
    chains: list[CausalChain] = field(default_factory=list)
    conflicts_with: list[str] = field(default_factory=list)
    triggers: set[str] = field(default_factory=set)
