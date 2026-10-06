# Provenance: reasoning-depth-spec.md §2.2 (five specialist agents; the adversary
# specialist is a separate context with the explicit job of falsification), §2.4
# (specialists invoke data tools, not vibes; tool calls recorded), §7 (API shape).
# Shared types from schemas.py (canonical contract).

"""Specialist agents.

The five specialists run in parallel at each level (spec §2.2). They are
data-driven: every claim they emit must come from the DataContext (profiles,
market, observations, tool backend) — never invented. The registry lets callers
replace or extend specialists without touching the engine.
"""

from __future__ import annotations

from typing import Callable, Protocol

from .enums import ReasoningDepth, Verification
from .interfaces import AnalysisRequest, DataContext, SpecialistOutput
from .schemas import Claim
from .trace import record_tool_call


class BaseSpecialist:
    name = "base"

    def claim(self, text, verification, source="", value=None, note=""):  # noqa: ANN001, ANN202
        return Claim(text=text, verification=verification, source=source, value=value, note=note)

    def run(self, depth, req, ctx, trace) -> SpecialistOutput:  # noqa: ANN001, ANN202
        return SpecialistOutput(agent=self.name)


class Specialist(Protocol):
    name: str

    def run(self, depth: ReasoningDepth, req: AnalysisRequest,  # noqa: ANN202
            ctx: DataContext, trace) -> SpecialistOutput: ...


class StatSpecialist(BaseSpecialist):
    """Numbers: lines, splits, rates, market data."""

    name = "stat"

    def run(self, depth, req, ctx, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        for key, val in ctx.market.items():
            out.claims.append(self.claim(
                f"market {key} = {val}", Verification.CORPUS, source="market feed", value=val))
            record_tool_call(trace, "market_lookup", {"key": key}, str(val))
        for key, val in ctx.observations.items():
            if key.startswith("stat."):
                out.claims.append(self.claim(
                    f"{key} = {val}", Verification.CORPUS, source="observations", value=val))
        if depth.is_at_least(ReasoningDepth.L2):
            out.triggers.add("matchup")
        return out


class SchemeSpecialist(BaseSpecialist):
    """Coaching/scheme layer: tendencies, adjustments, YoY deltas."""

    name = "scheme"

    def run(self, depth, req, ctx, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        for key, val in ctx.profiles.items():
            if key.startswith("coach."):
                out.claims.append(self.claim(
                    f"coaching profile {key}: {val}", Verification.CORPUS,
                    source=f"profile:{key}", value=val))
                record_tool_call(trace, "profile_lookup", {"coach": key}, str(val))
        for key, val in ctx.observations.items():
            if key.startswith("scheme."):
                out.claims.append(self.claim(
                    f"{key} = {val}", Verification.COMPUTED,
                    source="coaching-tendencies pipeline", value=val,
                    note="computed from nflverse play data"))
        return out


class BehaviorSpecialist(BaseSpecialist):
    """QB behavioral profiles: pressure splits, trust targets, scramble triggers."""

    name = "behavior"

    def run(self, depth, req, ctx, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        for key, val in ctx.profiles.items():
            if key.startswith("qb."):
                out.claims.append(self.claim(
                    f"QB profile {key}: {val}", Verification.CORPUS,
                    source=f"profile:{key}", value=val))
                record_tool_call(trace, "profile_lookup", {"qb": key}, str(val))
        return out


class SignalSpecialist(BaseSpecialist):
    """Trust signals / news intake: social, video, injury reports."""

    name = "signal"

    def run(self, depth, req, ctx, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        for sig in ctx.live_signals:
            out.claims.append(self.claim(
                f"live signal: {sig}", Verification.SINGLE_SOURCE,
                source="trust-signal intake", note="single-source until corroborated"))
        if any("injur" in s.lower() for s in ctx.live_signals):
            out.triggers.add("injury_flag")
        return out


class AdversarySpecialist(BaseSpecialist):
    """Falsification-oriented claims at L3+.

    This specialist *emits* adversarial claims during level runs. The full L4
    adversary *review* is the c08 adversarial layer (adversary.py).
    """

    name = "adversary"

    def run(self, depth, req, ctx, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        if depth.is_at_least(ReasoningDepth.L3):
            for chain in trace.chains:
                for link in chain.links:
                    for cond in link.breaking_conditions:
                        out.claims.append(self.claim(
                            f"falsifier for link {link.id}: {cond.text}",
                            Verification.INFERENCE, source="adversary specialist",
                            note="breaking condition checked against observed_values"))
        return out


DEFAULT_SPECIALISTS: list[BaseSpecialist] = [
    StatSpecialist(), SchemeSpecialist(), BehaviorSpecialist(),
    SignalSpecialist(), AdversarySpecialist(),
]


class SpecialistRegistry:
    def __init__(self, specialists: list[BaseSpecialist] | None = None):
        self._specialists = list(specialists) if specialists else list(DEFAULT_SPECIALISTS)

    def register(self, specialist: BaseSpecialist) -> None:
        self._specialists = [s for s in self._specialists if s.name != specialist.name]
        self._specialists.append(specialist)

    def all(self) -> list[BaseSpecialist]:
        return list(self._specialists)


# Tool-backend hook type: tool(name, args) -> str
ToolBackend = Callable[[str, dict], str]
