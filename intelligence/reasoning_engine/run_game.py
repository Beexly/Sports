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
from reasoning_engine.publish_gate import reasoning_publish_allowed
from tests.helpers import card_request


def _label(trace) -> str:
    lab = getattr(trace, "label", None)
    return lab.value if hasattr(lab, "value") else str(lab)


def _checklist(trace) -> dict[str, str]:
    out = {}
    for k, v in (trace.checklist or {}).items():
        out[k] = v.value if hasattr(v, "value") else str(v)
    return out


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
    for team in (home, away):
        try:
            tau = coaching.get_tau_hat(team, season, "opp", 0.50)
            facts.append({
                "signal": f"{team}.tau_hat",
                "value": tau,
                "fired": True,
                "source": "real",
                "license": "nflverse CC-BY-4.0 derivative",
                "point_in_time": False,
            })
        except DataGapError as e:
            gaps.append(f"tau {team}: {e.reason}")

    if weather is None:
        gaps.append("weather: not fetched for this run")
    else:
        facts.append({"signal": "weather", "value": weather, "fired": weather.get("available", False),
                      "source": weather.get("source", "unknown"), "license": weather.get("license", "unknown")})

    reg = ProviderRegistry(qb=SituationalQBProvider(), coaching=coaching, trust=None, ol=ol)
    trace = analyze(card_request(), reg, league_avgs=fixture_league_avgs())
    label = _label(trace)
    checklist = _checklist(trace)
    return {
        "game_id": f"{away}-{home}-{season}-w{week}",
        "bet_type": "CARD",
        "facts": facts,
        "gaps": gaps,
        "trace_label": label,
        "trace_depth": str(trace.depth),
        "checklist": checklist,
        "levels": list(trace.levels.keys()),
        "publish": reasoning_publish_allowed(label, checklist),
        "pick": None,
        "confidence": None,
        "probability_before_calibration": None,
        "probability_after_calibration": None,
        "note": "No pick was emitted. The founder gate is shut unless PUBLISH_REASONING_TRACE=true and the trace is not INVALID. A trace is not a probability.",
    }


def write_trace(path: str, doc: dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, default=str)
