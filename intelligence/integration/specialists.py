# PROVENANCE: implements reasoning-depth-spec.md §2.2 (multi-agent parallel reasoning with
# debate: stat/scheme/behavior/signal specialists + synthesizer), §2.4 (parallel tool use),
# §7 (SpecialistOutput, "specialists run in parallel; the synthesizer is sequential after them").
# Research basis: tnf-intelligence-program-2026-10-01.md Tracks 1–3 (what each specialist reads).
"""Specialist agents. Each reads its own provider lane; the adversary is separate."""
from __future__ import annotations

import concurrent.futures
from abc import ABC, abstractmethod
from typing import Any, Optional

from .providers import DataGapError, ProviderRegistry
from .types import AnalysisRequest, Claim, SpecialistOutput, Verification


class Specialist(ABC):
    """One reasoning specialist. Runs against the provider registry, never module internals."""
    name: str = "base"

    @abstractmethod
    def run(self, req: AnalysisRequest, providers: ProviderRegistry) -> SpecialistOutput: ...

    def _tool(self, trace_tools: Optional[list], tool: str, args: dict, returned: str) -> None:
        # The trace records which tool returned what (spec §2.4); wiring done by api.py.
        if trace_tools is not None:
            trace_tools.append({"tool": tool, "args": args, "returned": returned})


class StatSpecialist(Specialist):
    """Numbers: lines, splits, rates (spec §2.2 table). Reads market + OL pressure data."""
    name = "stat"

    def run(self, req: AnalysisRequest, providers: ProviderRegistry) -> SpecialistOutput:
        claims: list[Claim] = []
        status: dict[str, str] = {}
        game = req.game
        if providers.ol is not None:
            for team in (game.get("away"), game.get("home")):
                if not team:
                    continue
                try:
                    ol = providers.ol.get_ol_state(team, game.get("week", 0), game.get("season", 0))
                    if ol.starters_out:
                        claims.append(Claim(
                            text=f"{team} OL: {len(ol.starters_out)} starter(s) out "
                                 f"({', '.join(ol.starters_out)})",
                            source="ol_provider/get_ol_state", verification=ol.verification,
                            value=float(len(ol.starters_out))))
                    if ol.pressure_rate_allowed is not None:
                        claims.append(Claim(
                            text=f"{team} pressure rate allowed: {ol.pressure_rate_allowed:.3f}",
                            source="ol_provider/get_ol_state", verification=ol.verification,
                            value=ol.pressure_rate_allowed))
                except DataGapError as e:
                    claims.append(Claim(text=f"{team} OL data unavailable: {e.reason}",
                                        source="ol_provider", verification=Verification.INFERENCE,
                                        breaking_condition="treat as DATA-GAP in checklist"))
                    status["offensive_line"] = "DATA-GAP"
            if "offensive_line" not in status:
                status["offensive_line"] = "CLEAR" if claims else "DATA-GAP"
        else:
            status["offensive_line"] = "UNCHECKED"
        if req.question:
            claims.append(Claim(text=f"Question under analysis: {req.question}",
                                source="analysis_request", verification=Verification.CORPUS))
        return SpecialistOutput(agent=self.name, claims=tuple(claims), track_status=status)


class SchemeSpecialist(Specialist):
    """Coaching/scheme layer: fingerprints, adjustments, YoY deltas."""
    name = "scheme"

    def run(self, req: AnalysisRequest, providers: ProviderRegistry) -> SpecialistOutput:
        claims: list[Claim] = []
        status: dict[str, str] = {}
        game = req.game
        if providers.coaching is not None:
            for team in (game.get("away"), game.get("home")):
                if not team:
                    continue
                try:
                    fp = providers.coaching.get_scheme_fingerprint(
                        team, game.get("week", 0), game.get("season", 0))
                    if fp.quickgame_rate is not None:
                        claims.append(Claim(
                            text=f"{team} quick-game rate: {fp.quickgame_rate:.3f}",
                            source="coaching_provider/get_scheme_fingerprint",
                            verification=fp.verification, value=fp.quickgame_rate))
                    if fp.avg_air_yards is not None:
                        claims.append(Claim(
                            text=f"{team} avg air yards: {fp.avg_air_yards:.2f}",
                            source="coaching_provider/get_scheme_fingerprint",
                            verification=fp.verification, value=fp.avg_air_yards))
                    if fp.motion_rate is not None:
                        claims.append(Claim(
                            text=f"{team} motion rate: {fp.motion_rate:.3f}",
                            source="coaching_provider/get_scheme_fingerprint",
                            verification=fp.verification, value=fp.motion_rate))
                except DataGapError as e:
                    claims.append(Claim(text=f"{team} scheme data unavailable: {e.reason}",
                                        source="coaching_provider", verification=Verification.INFERENCE,
                                        breaking_condition="treat as DATA-GAP in checklist"))
                    status["coaching_scheme"] = "DATA-GAP"
            if "coaching_scheme" not in status:
                status["coaching_scheme"] = "CLEAR" if claims else "DATA-GAP"
        else:
            status["coaching_scheme"] = "UNCHECKED"
        return SpecialistOutput(agent=self.name, claims=tuple(claims), track_status=status)


class BehaviorSpecialist(Specialist):
    """QB behavioral profile: pressure splits, trust-target concentration, scramble triggers."""
    name = "behavior"

    def run(self, req: AnalysisRequest, providers: ProviderRegistry) -> SpecialistOutput:
        claims: list[Claim] = []
        status: dict[str, str] = {}
        if providers.qb is None:
            return SpecialistOutput(agent=self.name, claims=(), track_status={"qb_behavior": "UNCHECKED"})
        # QB ids come from the request's extra context; degrade gracefully without them.
        qbs = req.game.get("qbs") or {}
        qb_ids: tuple[str, ...] = tuple(qbs.values()) if isinstance(qbs, dict) else ()
        for qb_id in qb_ids:
            try:
                p = providers.qb.get_qb_profile(qb_id, req.game.get("week", 0), req.game.get("season", 0))
                if p.target_hhi is not None:
                    claims.append(Claim(
                        text=f"{p.name} target HHI: {p.target_hhi:.3f}",
                        source="qb_provider/get_qb_profile", verification=p.verification,
                        value=p.target_hhi))
                if p.pressure_to_sack_rate is not None:
                    claims.append(Claim(
                        text=f"{p.name} pressure-to-sack: {p.pressure_to_sack_rate:.3f}",
                        source="qb_provider/get_qb_profile", verification=p.verification,
                        value=p.pressure_to_sack_rate))
                try:
                    ps = providers.qb.get_pressure_splits(qb_id, req.game.get("week", 0),
                                                          req.game.get("season", 0))
                    if ps.int_rate_clean is not None and ps.int_rate_pressure is not None:
                        claims.append(Claim(
                            text=f"{p.name} INT rate: clean {ps.int_rate_clean:.3f} vs "
                                 f"pressure {ps.int_rate_pressure:.3f}",
                            source="qb_provider/get_pressure_splits",
                            verification=ps.verification))
                except DataGapError:
                    pass  # pressure splits PARKED (map #8); profile claims still stand
            except DataGapError as e:
                claims.append(Claim(text=f"QB {qb_id} data unavailable: {e.reason}",
                                    source="qb_provider", verification=Verification.INFERENCE,
                                    breaking_condition="treat as DATA-GAP in checklist"))
                status["qb_behavior"] = "DATA-GAP"
        if "qb_behavior" not in status:
            status["qb_behavior"] = "CLEAR" if claims else ("DATA-GAP" if qb_ids else "NOTHING-MATERIAL")
        return SpecialistOutput(agent=self.name, claims=tuple(claims), track_status=status)


class SignalSpecialist(Specialist):
    """Trust signals / news: the intake lane (x-intake-registry.md)."""
    name = "signal"

    def run(self, req: AnalysisRequest, providers: ProviderRegistry) -> SpecialistOutput:
        claims: list[Claim] = []
        status: dict[str, str] = {}
        game = req.game
        if providers.trust is not None:
            for team in (game.get("away"), game.get("home")):
                if not team:
                    continue
                try:
                    signals = providers.trust.get_trust_signals(
                        team, game.get("week", 0), game.get("season", 0))
                    for s in signals:
                        src = s.source_url or "PROVENANCE-GAP"
                        claims.append(Claim(
                            text=f"[{s.signal_type}] {s.player_id}: {s.text[:160]}",
                            source=f"trust_provider/{src}", verification=s.verification))
                except DataGapError as e:
                    claims.append(Claim(text=f"{team} trust signals unavailable: {e.reason}",
                                        source="trust_provider", verification=Verification.INFERENCE,
                                        breaking_condition="treat as DATA-GAP in checklist"))
                    status["trust_signals"] = "DATA-GAP"
            if "trust_signals" not in status:
                status["trust_signals"] = "CLEAR" if claims else "NOTHING-MATERIAL"
        else:
            status["trust_signals"] = "UNCHECKED"
        return SpecialistOutput(agent=self.name, claims=tuple(claims), track_status=status)


class AdversarySpecialist(Specialist):
    """Not a tone — a separate pass with the explicit job of falsification (spec §7),
    given the same data access as the others."""
    name = "adversary"

    def run(self, req: AnalysisRequest, providers: ProviderRegistry) -> SpecialistOutput:
        claims = [Claim(
            text="Adversary pass: every causal link below L3 is a suspect; "
                 "breaking conditions will be evaluated against observed values.",
            source="adversary_specialist", verification=Verification.INFERENCE,
            breaking_condition="adversary must cite observed values, not vibes")]
        return SpecialistOutput(agent=self.name, claims=tuple(claims))


DEFAULT_SPECIALISTS: tuple[Specialist, ...] = (
    StatSpecialist(), SchemeSpecialist(), BehaviorSpecialist(), SignalSpecialist(),
)


def run_specialists_parallel(req: AnalysisRequest, providers: ProviderRegistry,
                             specialists: tuple[Specialist, ...] = DEFAULT_SPECIALISTS,
                             tool_log: Optional[list] = None
                             ) -> dict[str, SpecialistOutput]:
    """Run specialists concurrently (spec §2.4); the synthesizer runs after (spec §7)."""
    outputs: dict[str, SpecialistOutput] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(specialists)) as pool:
        future_to = {pool.submit(s.run, req, providers): s for s in specialists}
        for fut in concurrent.futures.as_completed(future_to):
            spec = future_to[fut]
            outputs[spec.name] = fut.result()
            if tool_log is not None:
                tool_log.append({"tool": f"specialist/{spec.name}",
                                 "args": {"game": req.game},
                                 "returned": f"{len(outputs[spec.name].claims)} claims"})
    return outputs
