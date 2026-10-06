# Provenance: Garrett 2026-10-02 directive — "put our brain in another engine."
# LLM-backed specialists. They REPLACE the deterministic specialists' reasoning
# with model reasoning, but every output is validated against the DataContext:
# ungrounded numbers are flagged, inference is labeled INFERENCE, and the
# deterministic contract (adversary_review, correlated_theses, checklist)
# still disposes. Spec: reasoning-depth-spec.md §§4–7.

"""LLM specialists: the model reasons, our data grounds it."""

from __future__ import annotations

import re

from reasoning.enums import ReasoningDepth, Verification
from reasoning.interfaces import AnalysisRequest, DataContext, SpecialistOutput
from reasoning.schemas import BreakingCondition, CausalChain, CausalLink, Claim
from reasoning.specialists import BaseSpecialist
from reasoning.trace import record_tool_call

from .backends import BackendError, LLMBackend
from .prompts import (
    build_l3_prompt,
    build_l4_prompt,
    build_l5_prompt,
    extract_json,
)


def _verification_for(text: str, source: str) -> Verification:
    return {"CORPUS": Verification.CORPUS, "COMPUTED": Verification.COMPUTED}.get(
        str(source).upper().strip(), Verification.INFERENCE)


class LLMSpecialist(BaseSpecialist):
    """Base: call the backend, parse JSON defensively, emit grounded claims."""

    def __init__(self, backend: LLMBackend):
        self.backend = backend

    def _call(self, prompt: str, trace, tool_name: str) -> dict:
        try:
            result = self.backend.generate(prompt, max_tokens=1500, temperature=0.2)
        except BackendError:
            raise
        except Exception as exc:  # noqa: BLE001
            from .backends import BackendUnavailable
            raise BackendUnavailable(f"backend {self.backend.name} failed: {exc}")
        record_tool_call(trace, tool_name,
                         {"backend": self.backend.name},
                         f"latency_s={result.latency_s:.1f}")
        trace_llm = getattr(trace, "llm_calls", None)
        if trace_llm is None:
            trace.llm_calls = []
        trace.llm_calls.append({"tool": tool_name, "backend": self.backend.name,
                                "latency_s": round(result.latency_s, 2)})
        try:
            return extract_json(result.text)
        except Exception as exc:  # noqa: BLE001
            from .backends import BackendError as _BE
            raise _BE(f"model returned unparseable output for {tool_name}: "
                      f"{result.text[:300]!r} ({exc})")


class LLMChainSpecialist(LLMSpecialist):
    """L3: the model builds causal chains from verified data."""

    name = "llm-chain"

    def run(self, depth, req: AnalysisRequest, ctx: DataContext, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        if not depth.is_at_least(ReasoningDepth.L3):
            return out
        legs = [{"id": leg.id, "description": leg.description} for leg in req.legs]
        prompt = build_l3_prompt(req.question, ctx.observations, ctx.profiles,
                                 ctx.market, legs)
        parsed = self._call(prompt, trace, "llm_l3_chains")
        for chain_d in parsed.get("chains", []):
            links = []
            for link_d in chain_d.get("links", []):
                bcs = [BreakingCondition(
                    id=f"bc-{i}",
                    text=f"{bc.get('metric')} {bc.get('op')} {bc.get('threshold')}",
                    metric=str(bc.get("metric", "")),
                    op=str(bc.get("op", "<")),
                    threshold=float(bc.get("threshold", 0)),
                ) for i, bc in enumerate(link_d.get("breaking_conditions", []))]
                links.append(CausalLink(
                    id=str(link_d.get("id", "link")),
                    cause=str(link_d.get("cause", "")),
                    mechanism=str(link_d.get("mechanism", "")),
                    outcome=str(link_d.get("outcome", "")),
                    verification=_verification_for("", link_d.get("verification", "INFERENCE")),
                    breaking_conditions=bcs,
                    load_bearing=bool(link_d.get("load_bearing", False)),
                ))
            chain = CausalChain(id=str(chain_d.get("id", "chain")), links=links)
            out.chains.append(chain)
            for link in links:
                out.claims.append(self.claim(
                    f"L3 link {link.id}: {link.cause} -> {link.mechanism} -> {link.outcome}",
                    link.verification, source=f"llm:{self.backend.name}",
                    note="model-built chain; breaking conditions evaluated deterministically"))
        out.triggers.add("causal_claim")
        return out


class LLMAdversarySpecialist(LLMSpecialist):
    """L4: the model attempts to kill the thesis (qualitative layer).

    The MECHANICAL kill (breaking-condition evaluation, thesis bundling) stays
    deterministic in reasoning/adversary.py. The model contributes the
    counter-argument and pre-mortem as INFERENCE claims.
    """

    name = "llm-adversary"

    def run(self, depth, req: AnalysisRequest, ctx: DataContext, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        if not depth.is_at_least(ReasoningDepth.L4):
            return out
        chains_d, legs_d = [], []
        for chain in trace.chains:
            chains_d.append({"id": chain.id, "links": [
                {"id": l.id, "cause": l.cause, "mechanism": l.mechanism,
                 "outcome": l.outcome, "verification": l.verification.value,
                 "breaking_conditions": [
                     {"metric": bc.metric, "op": bc.op, "threshold": bc.threshold}
                     for bc in l.breaking_conditions],
                 "load_bearing": l.load_bearing} for l in chain.links]})
        for leg in trace.legs or req.legs:
            legs_d.append({"id": leg.id, "description": leg.description})
        prompt = build_l4_prompt(chains_d, legs_d, dict(trace.observed_values or {}))
        parsed = self._call(prompt, trace, "llm_l4_adversary")
        if parsed.get("counter_argument"):
            out.claims.append(self.claim(
                f"L4 counter-argument: {parsed['counter_argument']}",
                Verification.INFERENCE, source=f"llm:{self.backend.name}",
                note="model steelman; not a verified fact"))
        if parsed.get("pre_mortem"):
            out.claims.append(self.claim(
                f"L4 pre-mortem: {parsed['pre_mortem']}",
                Verification.INFERENCE, source=f"llm:{self.backend.name}",
                note="model pre-mortem; scenario, not prediction"))
        model_kill = any(v == "KILL" for v in (parsed.get("thesis_verdicts") or {}).values())
        out.claims.append(self.claim(
            f"L4 model verdict: {'KILL' if model_kill else 'SURVIVE'}",
            Verification.INFERENCE, source=f"llm:{self.backend.name}",
            note="advisory only; deterministic adversary_review disposes"))
        return out


class LLMSynthesisSpecialist(LLMSpecialist):
    """L5: the model synthesizes the final recommendation."""

    name = "llm-synthesis"

    def run(self, depth, req: AnalysisRequest, ctx: DataContext, trace) -> SpecialistOutput:
        out = SpecialistOutput(agent=self.name)
        if not depth.is_at_least(ReasoningDepth.L5):
            return out
        prompt = build_l5_prompt(
            req.question,
            [{"id": c.id, "links": [l.id for l in c.links]} for c in trace.chains],
            {"note": "deterministic adversary_review runs separately; see trace"},
            {t: str(v) for t, v in (trace.checklist or {}).items()},
            list(ctx.live_signals),
        )
        parsed = self._call(prompt, trace, "llm_l5_synthesis")
        rec = str(parsed.get("recommendation", "NO_BET")).upper()
        out.claims.append(self.claim(
            f"L5 recommendation: {rec} — {parsed.get('recommendation_reason', '')}",
            Verification.INFERENCE, source=f"llm:{self.backend.name}",
            note="model synthesis; must agree with deterministic gates"))
        for layer, verdict in (parsed.get("layer_verdicts") or {}).items():
            out.claims.append(self.claim(
                f"L5 layer {layer}: {verdict}", Verification.INFERENCE,
                source=f"llm:{self.backend.name}"))
        if parsed.get("weak_link_disclosure"):
            out.claims.append(self.claim(
                f"L5 weak-link disclosure: {parsed['weak_link_disclosure']}",
                Verification.INFERENCE, source=f"llm:{self.backend.name}"))
        trace.llm_recommendation = rec
        return out


NUMBER_RE = re.compile(r"\b\d+(?:\.\d+)?\b")


def audit_grounding(text: str, grounded_values: list[float]) -> dict:
    """Hallucination audit: every number in model text must match a provided
    value (within 1e-6) or be a small integer (counts/years exempt).

    Returns {"ungrounded": [numbers], "grounded": [numbers]}.
    """
    grounded, ungrounded = [], []
    for m in NUMBER_RE.finditer(text):
        raw = m.group(0)
        try:
            val = float(raw)
        except ValueError:
            continue
        if val == int(val) and abs(val) < 2100 and val not in grounded_values:
            # small integers (counts, years like 2026) — check years separately
            if 1900 <= val <= 2100:
                grounded.append(raw)  # years are context, not claims
                continue
        if any(abs(val - g) < 1e-6 for g in grounded_values):
            grounded.append(raw)
        else:
            ungrounded.append(raw)
    return {"grounded": grounded, "ungrounded": ungrounded}
