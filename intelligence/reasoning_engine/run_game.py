"""One game, every fact this host can actually produce, then the trace.

Tools, in order: epa_facets (parquet), OL provider (injuries + depth chart),
tau_hat (fitted table), analyze() (the reasoning façade). Weather is attached
by the caller when a forecast was fetched. A missing tool is a named gap.
It is not a zero.
"""
from __future__ import annotations

import json
import os
from typing import Any

from coaching.ol_provider import NflverseOLProvider
from coaching.provider import CoachingEngineProvider
from integration.api import analyze
from integration.providers import DataGapError, ProviderRegistry
from integration.stubs import fixture_league_avgs
from qb_behavior.situational.provider import SituationalQBProvider
from reasoning_engine.facets import epa_facets
from reasoning_engine.mint_gate import mint_after_mind
from tests.helpers import card_request


def _label(trace) -> str:
    lab = getattr(trace, "label", None)
    return lab.value if hasattr(lab, "value") else str(lab)


def _checklist(trace) -> dict[str, str]:
    out = {}
    for k, v in (trace.checklist or {}).items():
        out[k] = v.value if hasattr(v, "value") else str(v)
    return out




def _verification_name(v) -> str:
    return getattr(v, "name", str(v)) if v is not None else "UNSET"


def _serialize_conditions(link) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for bc in (getattr(link, "breaking_conditions", []) or []):
        out.append({
            "id": getattr(bc, "id", ""),
            "text": getattr(bc, "text", ""),
            "metric": getattr(bc, "metric", ""),
            "op": getattr(bc, "op", ""),
            "threshold": getattr(bc, "threshold", None),
        })
    return out


def causal_chains(trace, facts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The L3 causal chains, surfaced for the trace document. NEVER empty.

    The reasoning layer already builds chains on the trace (run_l3); the trace
    document used to drop them on the floor, which is how a game came back as a
    bare withhold. If the mind produced no thesis, the shortest honest chain is
    the observed facts themselves, typed as context (not a directional claim).
    """
    chains: list[dict[str, Any]] = []
    for chain in (getattr(trace, "chains", []) or []):
        links = []
        for link in (getattr(chain, "links", []) or []):
            links.append({
                "cause": getattr(link, "cause", None),
                "mechanism": getattr(link, "mechanism", None),
                "outcome": getattr(link, "outcome", None),
                "verification": _verification_name(getattr(link, "verification", None)),
                "load_bearing": getattr(link, "load_bearing", None),
                "breaking_conditions": _serialize_conditions(link),
            })
        chains.append({"id": getattr(chain, "id", None), "links": links})
    if not chains:
        links = []
        for f in facts:
            links.append({
                "cause": f.get("signal"),
                "mechanism": "observed before kickoff",
                "outcome": "context for the ranked board (no directional claim at this depth)",
                "verification": str(f.get("source", "unknown")).upper(),
                "load_bearing": False,
                "breaking_conditions": [],
            })
        chains.append({"id": "derived:observed-facts", "links": links})
    return chains


def ranked_board(trace, facts: list[dict[str, Any]], gaps: list[str], decision: dict[str, Any]) -> dict[str, Any]:
    """The board is emitted on EVERY run, withhold or not.

    Conviction = chain coverage (observed facts / (observed + named gaps)); it is
    a confidence in the evidence chain, never a win probability and never a
    market number. PASS/withhold stop being terminal states: they are the mint
    action, and the board below is published regardless.
    """
    fired = [f for f in facts if f.get("fired")]
    coverage = len(fired) / max(1, len(fired) + len(gaps))
    conviction = int(round(100 * coverage))
    conditions: list[dict[str, Any]] = [
        {"id": f"gap:{i}", "text": g, "metric": "", "op": "", "threshold": None,
         "verifiable": False, "met": None, "note": "named gap; unverifiable at this run"}
        for i, g in enumerate(gaps)
    ]
    for chain in (getattr(trace, "chains", []) or []):
        for link in (getattr(chain, "links", []) or []):
            conditions.extend(_serialize_conditions(link))
    candidates = []
    for surface in ("TOTAL", "SPREAD", "MONEYLINE"):
        candidates.append({
            "play": surface,
            "rank": 0,
            "conviction": conviction,
            "conviction_basis": "chain coverage: observed facts / (observed + named gaps); not a win probability",
            "status": "SCHEMATIC" if gaps else "SUBSTANTIATED",
            "has_directional_claim": False,
            "note": "ranked regardless of mint action; a trace does not mint a probability",
        })
    for i, c in enumerate(sorted(candidates, key=lambda c: -c["conviction"]), start=1):
        c["rank"] = i
    return {
        "candidates": candidates,
        "conviction": conviction,
        "conviction_basis": "chain coverage: observed facts / (observed + named gaps); not a win probability",
        "breaking_conditions": conditions,
        "mint_action": decision.get("action"),
        "mint_reason": decision.get("reason"),
        "never_terminal_note": "published even when mint withholds or passes; PASS is never the terminal state",
    }



def reason_game(home: str = "CLE", away: str = "PIT", week: int = 4, season: int = 2026,
                weather: dict[str, Any] | None = None) -> dict[str, Any]:
    facts: list[dict[str, Any]] = []
    gaps: list[str] = []

    for team in (home, away):
        try:
            facet = epa_facets(team, season, before_week=week)
            facts.append({"signal": f"{team}.epa_facets", "value": facet, "fired": facet["plays"] > 0,
                          "source": facet["source"], "license": facet["license"]})
        except FileNotFoundError as e:
            gaps.append(f"epa_facets {team}: {e}")

    ol = NflverseOLProvider()
    for team in (home, away):
        try:
            state = ol.get_ol_state(team, week, season)
            facts.append({
                "signal": f"{team}.ol",
                "value": {
                    "starters_out": list(state.starters_out),
                    "continuity_index": state.continuity_index,
                    "data_gap": state.data_gap,
                },
                "fired": True,
                "source": "real",
                "license": "nflverse CC-BY-4.0",
            })
        except DataGapError as e:
            gaps.append(f"ol {team}: {e.reason}")

    coaching = CoachingEngineProvider()
    # No live win probability on this host. 0.5 would be a coin flip wearing
    # a tau cell. Refuse it. A fitted tau is not served until a real wp exists.
    gaps.append("tau: no live win probability; refused a 0.5 stand-in")

    if weather is None:
        gaps.append("weather: not fetched for this run")
    else:
        facts.append({"signal": "weather", "value": weather, "fired": weather.get("available", False),
                      "source": weather.get("source", "unknown"), "license": weather.get("license", "unknown")})

    reg = ProviderRegistry(qb=SituationalQBProvider(), coaching=coaching, trust=None, ol=ol)
    trace = analyze(card_request(), reg, league_avgs=fixture_league_avgs())
    label = _label(trace)
    checklist = _checklist(trace)
    decision = mint_after_mind(label, checklist, asked=True)
    withheld = decision["action"] == "withhold"
    return {
        "game_id": f"{away}-{home}-{season}-w{week}",
        "bet_type": "CARD",
        "facts": facts,
        "gaps": gaps,
        "trace_label": label,
        "trace_depth": str(trace.depth),
        "checklist": checklist,
        "levels": list(trace.levels.keys()),
        "mint": decision["action"],
        "pick": None,
        "confidence": None,
        "probability_before_calibration": None,
        "probability_after_calibration": None,
        "causal_chain": causal_chains(trace, facts),
        "ranked_board": ranked_board(trace, facts, gaps, decision),
        "note": (
            f"Withheld. {decision['reason']}. The ranked board below is still emitted; a withhold is not a terminal silence."
            if withheld
            else "Mind was asked and the trace was not INVALID or DATA-GAP. A trace still does not mint a probability; the ranked board is the output."
        ),
    }


def write_trace(path: str, doc: dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, default=str)
