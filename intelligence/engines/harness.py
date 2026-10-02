# Provenance: Garrett 2026-10-02 directive — "put our brain in another engine."
# Harness: run the T1 scenario through LLM-backed specialists, then dispose
# with the DETERMINISTIC contract (adversary_review, correlated_theses,
# validate_checklist). The LLM proposes; the contract disposes. If the backend
# is unavailable, fall back to the deterministic engine and SAY SO in the trace.

"""Harness: LLM-backed T1 runs with grounding audit and graceful fallback."""

from __future__ import annotations

import time
from dataclasses import dataclass, field

from reasoning import (
    BetLeg,
    ChecklistVerdict,
    Exposure,
    ReasoningDepth,
    ReasoningTrace,
    TRACKS,
    Verification,
    adversary_review,
    correlated_theses,
    killed_legs,
    validate_checklist,
)
from reasoning.engine import AnalysisEngine
from reasoning.interfaces import AnalysisRequest, DataContext, GameRequest
from reasoning.specialists import SpecialistRegistry

from .backends import BackendError, LLMBackend, QuotaExhausted
from .llm_specialists import (
    LLMAdversarySpecialist,
    LLMChainSpecialist,
    LLMSynthesisSpecialist,
    NUMBER_RE,
    audit_grounding,
)


# --- T1 fixture (mirrors tests/e2e/test_reasoning_trace_e2e.py) ------------

T1_QUESTION = ("Should we bet the 4-leg Steelers–Browns Week 4 pressure-funnel "
               "stack (Flacco, CLE missing 2 interior OL starters)?")

T1_OBSERVATIONS = {
    "ttt_seconds": 2.1,          # breaking condition: < 2.3 kills the thesis
    "quick_game_rate": 0.639,    # Monken 2026 quick-game vs 0.508 league avg
    "air_yards": 6.12,           # down from 8.33
}

T1_LEGS = [
    ("leg_mixon_anytime_td", "Mixon anytime TD"),
    ("leg_pit_ml", "PIT moneyline"),
    ("leg_under_41_5", "Under 41.5"),
    ("leg_pit_minus2_5", "PIT -2.5"),
]

T1_PROFILES = {
    "coach.todd-monken": "2026 CLE HC; quick-game rate 0.639 (league avg 0.508); air yards 6.12",
    "qb.joe-flacco": "pressure splits per qb-behavioral-profiles",
}

T1_MARKET = {"spread": "PIT -2.5", "total": 41.5}


def build_t1_request() -> AnalysisRequest:
    return AnalysisRequest(
        game=GameRequest(away="PIT", home="CLE", week=4, season=2026),
        question=T1_QUESTION,
        exposure=Exposure.CARD,
        requested_depth=ReasoningDepth.L5,
        legs=[BetLeg(id=i, description=d, causal_link_ids=["pit_pressure_lands"],
                     exposure=1.0) for i, d in T1_LEGS],
    )


def build_t1_context() -> DataContext:
    return DataContext(
        profiles=dict(T1_PROFILES),
        market=dict(T1_MARKET),
        observations=dict(T1_OBSERVATIONS),
        checklist_hints={t: "CLEAR" for t in TRACKS},
        corpus_hits=["coaching-tendencies/profiles/todd-monken.md"],
    )


@dataclass
class T1Result:
    backend: str
    funnel_killed: bool = False
    legs_bundled: bool = False
    recommendation: str = "UNKNOWN"
    llm_recommendation: str = "UNKNOWN"
    latency_s: dict = field(default_factory=dict)
    hallucinated_numbers: list = field(default_factory=list)
    grounded_numbers: list = field(default_factory=list)
    fallback_used: bool = False
    fallback_reason: str = ""
    error: str = ""


class LLMEngine:
    """Run analysis with LLM specialists; deterministic contract disposes."""

    def __init__(self, backend: LLMBackend):
        self.backend = backend

    def run_t1(self) -> T1Result:
        res = T1Result(backend=self.backend.name)
        req = build_t1_request()
        ctx = build_t1_context()
        t0 = time.time()
        try:
            # L3 via the engine: the LLM chain specialist is the ONLY chain
            # source, so the L4 kill (or survival) is the model's doing.
            # L1/L2 run empty (our specialists no-op below L3).
            registry = SpecialistRegistry([
                LLMChainSpecialist(self.backend),
            ])
            engine = AnalysisEngine(registry=registry)
            trace = engine.analyze(req, ctx)
            res.latency_s["total"] = round(time.time() - t0, 1)
            for call in getattr(trace, "llm_calls", []):
                res.latency_s[call["tool"]] = call["latency_s"]

            # L4/L5 qualitative layers: the engine's L4/L5 are deterministic
            # (checklist, adversary_review, run_l5_synthesis). The LLM's
            # adversary + synthesis run explicitly here; the deterministic
            # contract still disposes.
            LLMAdversarySpecialist(self.backend).run(
                ReasoningDepth.L4, req, ctx, trace)
            LLMSynthesisSpecialist(self.backend).run(
                ReasoningDepth.L5, req, ctx, trace)
            for call in getattr(trace, "llm_calls", []):
                res.latency_s.setdefault(call["tool"], call["latency_s"])
            res.llm_recommendation = getattr(trace, "llm_recommendation", "UNKNOWN")
            res.latency_s["total"] = round(time.time() - t0, 1)

            # Deterministic disposal: the contract evaluates the LLM's chains.
            report = adversary_review(trace)
            res.funnel_killed = bool(report.breaking_conditions_met) and bool(
                killed_legs(report))
            bundles = correlated_theses(trace.legs, trace)
            res.legs_bundled = (len(bundles) == 1
                                and bundles[0].shared_link_ids == ["pit_pressure_lands"])
            killed = report.thesis_verdicts and all(
                v == "KILL" for v in report.thesis_verdicts.values())
            rec = res.llm_recommendation
            res.recommendation = ("REJECT" if (res.funnel_killed or killed
                                               or "REJECT" in rec) else rec)

            # Grounding audit over MODEL-GENERATED text only (chain text the
            # model produced). Harness metadata (latencies) is not a claim.
            # Grounded values = observations + numbers stated in the question
            # (e.g. "2 starters", "4 legs") + market numbers (spread/total).
            grounded_vals = [float(v) for v in T1_OBSERVATIONS.values()]
            for src in [T1_QUESTION] + [str(v) for v in T1_MARKET.values()]:
                for m in NUMBER_RE.finditer(src):
                    try:
                        grounded_vals.append(float(m.group(0)))
                    except ValueError:
                        pass
            chain_text = " ".join(
                f"{l.cause} {l.mechanism} {l.outcome}" for c in trace.chains for l in c.links)
            audit = audit_grounding(chain_text, grounded_vals)
            res.hallucinated_numbers = audit["ungrounded"]
            res.grounded_numbers = audit["grounded"]
        except QuotaExhausted as exc:
            res.fallback_used = True
            res.fallback_reason = f"quota exhausted: {exc}"
            res.error = str(exc)
        except BackendError as exc:
            res.fallback_used = True
            res.fallback_reason = f"backend unavailable: {exc}"
            res.error = str(exc)
        except Exception as exc:  # noqa: BLE001
            res.error = f"harness failure (not backend): {exc}"
        return res

    def run_t1_deterministic_fallback(self) -> ReasoningTrace:
        """The deterministic engine, annotated that the LLM was unavailable."""
        engine = AnalysisEngine()  # default deterministic specialists
        req = build_t1_request()
        ctx = build_t1_context()
        trace = engine.analyze(req, ctx)
        trace.llm_fallback = True
        trace.llm_fallback_reason = getattr(self, "_fallback_reason", "backend unavailable")
        return trace
