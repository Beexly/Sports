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

import re
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


class ResearchSpecialist(BaseSpecialist):
    """Opt-in research corpus specialist — UNVALIDATED gate enforced.

    Default OFF: engines and registries exclude this specialist unless
    explicitly requested (SpecialistRegistry(include_research=True) or
    AnalysisEngine(enable_research=True)), so no existing run changes.

    When enabled it retrieves research corpus records for the request
    question (ctx.tool_backend when provided, else corpus_retriever.retrieve)
    and emits claims exclusively through corpus_gate.corpus_claim():
    INFERENCE + GATE note, citation/mechanism use only. At L4+ it refuses
    to emit anything — corpus claims default to load-bearing in the gate,
    so corpus material can never become load-bearing evidence or reach a
    pick. Emitted claims are gate-validated at the run depth and dropped
    on violation (fail-closed); nothing is ever upgraded above INFERENCE,
    so the levels.py weak_link mechanism never treats corpus material as a
    load-bearing link. Non-corpus sources (e.g. legacy harness citation
    strings) are skipped, never invented or upgraded.
    """

    name = "research"

    def __init__(self, enabled: bool = False, k: int = 3):
        self.enabled = enabled
        self.k = k

    def run(self, depth, req, ctx, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        if not self.enabled:
            return out
        if depth.is_at_least(ReasoningDepth.L4):
            # Gate refusal: corpus material is never load-bearing at L4+.
            return out
        citations, texts = _research_citations(req, ctx, trace, self.k)
        from intelligence.research import corpus_gate as gate  # noqa: PLC0415  (lazy: no cycle)

        for citation in citations:
            try:
                claim = gate.corpus_claim(texts.get(citation) or f"research corpus: {citation}", citation)
            except ValueError:
                continue  # fail-closed: non-corpus source never emitted
            if gate.validate_claims([claim], depth=depth):
                continue  # fail-closed: gate violation never emitted
            out.claims.append(claim)
        return out


def _research_citations(req, ctx, trace, k: int):
    """Citations for the research specialist, also populating ctx.corpus_hits.

    Returns (citations, {citation: claim text}). Retrieval failure is
    fail-closed: no hits, no claims, never raises.
    """
    citations: list[str] = []
    seen: set[str] = set()
    texts: dict[str, str] = {}

    def _add(citation: str, text: str | None = None) -> None:
        if not citation.startswith("research_corpus/") or citation in seen:
            return
        seen.add(citation)
        citations.append(citation)
        if text:
            texts[citation] = text

    for hit in ctx.corpus_hits:
        _add(str(hit))

    query = req.question or ""
    try:
        if ctx.tool_backend is not None:
            args = {"query": query, "k": k}
            try:
                rendered = ctx.tool_backend("research_corpus", args)
            except Exception:  # noqa: BLE001 - specialist never raises
                rendered = ""
            record_tool_call(trace, "research_corpus", args, str(rendered))
            for citation in re.findall(r"cite=(research_corpus/\S+)", str(rendered)):
                _add(citation)
        else:
            from intelligence.research import corpus_retriever  # noqa: PLC0415  (lazy: no cycle)

            hits = corpus_retriever.retrieve(query, k=k)
            record_tool_call(
                trace, "research_corpus", {"query": query, "k": k},
                "; ".join(h.get("citation", "") for h in hits) or "research_corpus: no records matched")
            for h in hits:
                if h.get("gate_status") != "UNVALIDATED":
                    continue
                title = h.get("title") or "(untitled)"
                year = h.get("year")
                _add(h.get("citation", ""), f"research corpus: {title} ({year}) — {h.get('citation', '')}")
    except Exception:  # noqa: BLE001 - boundary must never raise
        pass

    for citation in citations:  # populate the dead DataContext field
        if citation not in ctx.corpus_hits:
            ctx.corpus_hits.append(citation)
    return citations, texts


DEFAULT_SPECIALISTS: list[BaseSpecialist] = [
    StatSpecialist(), SchemeSpecialist(), BehaviorSpecialist(),
    SignalSpecialist(), AdversarySpecialist(),
]


class SpecialistRegistry:
    def __init__(self, specialists: list[BaseSpecialist] | None = None,
                 include_research: bool = False):
        if specialists is not None:
            self._specialists = list(specialists)
        elif include_research:
            self._specialists = list(DEFAULT_SPECIALISTS) + [ResearchSpecialist(enabled=True)]
        else:
            self._specialists = list(DEFAULT_SPECIALISTS)

    def register(self, specialist: BaseSpecialist) -> None:
        self._specialists = [s for s in self._specialists if s.name != specialist.name]
        self._specialists.append(specialist)

    def all(self) -> list[BaseSpecialist]:
        return list(self._specialists)


# Tool-backend hook type: tool(name, args) -> str
ToolBackend = Callable[[str, dict], str]
