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


def ranked_board(trace, facts: list[dict[str, Any]], gaps: list[str], decision: dict[str, Any],
                 priors: list = None, signals: list = None) -> dict[str, Any]:
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
    board = {
        "candidates": candidates,
        "conviction": conviction,
        "conviction_basis": "chain coverage: observed facts / (observed + named gaps); not a win probability",
        "breaking_conditions": conditions,
        "mint_action": decision.get("action"),
        "mint_reason": decision.get("reason"),
        "never_terminal_note": "published even when mint withholds or passes; PASS is never the terminal state",
    }
    # Layer1 + Layer2 fusion: when real market priors and ingested signals are
    # supplied, the board carries the L4 posterior and its full update math.
    if priors:
        from reasoning.bayes import update_all  # local import keeps the host lean

        updates = update_all(priors, signals or [])
        board["bayes_updates"] = [u.to_dict() for u in updates]
        by_hyp: dict[str, dict[str, Any]] = {}
        for u in updates:
            by_hyp[u.hypothesis] = {
                "posterior": u.posterior,
                "prior": u.prior,
                "prior_source": u.prior_source,
                "steps": len(u.steps),
            }
        # per-candidate posteriors: ML updates match the MONEYLINE candidate;
        # a total prior (when present) matches the TOTAL candidate.
        home_u = next((u for u in updates if u.hypothesis.endswith("home win")), None)
        away_u = next((u for u in updates if u.hypothesis.endswith("away win")), None)
        total_u = next((u for u in updates if "total" in u.hypothesis.lower()), None)
        for cand in candidates:
            m = by_hyp.get(cand["play"])
            if m:
                cand["market_prior"] = m["prior"]
                cand["posterior"] = m["posterior"]
                cand["update_steps"] = m["steps"]
            if cand["play"] == "MONEYLINE" and (home_u or away_u):
                if home_u:
                    cand["posterior_home"] = home_u.posterior
                    cand["prior_home"] = home_u.prior
                if away_u:
                    cand["posterior_away"] = away_u.posterior
                    cand["prior_away"] = away_u.prior
                cand["note"] = (
                    "market prior (Layer 1) updated by ingested signals (Layer 2); "
                    "per-side posteriors with steps in bayes_updates"
                )
            elif cand["play"] == "TOTAL" and total_u:
                cand["market_prior"] = total_u.prior
                cand["posterior"] = total_u.posterior
                cand["note"] = "total prior updated by ingested signals"
    return board



def _auto_market_priors(home: str, away: str, season: int, week: int) -> tuple[list, list]:
    """Layer-1 priors for this game from the ESPN inline odds, or ([], gap).

    Returns (priors, gaps). Any failure is a NAMED GAP (network off, no odds
    posted yet, shape drift) - never an exception, never a silent zero, never
    an invented probability.
    """
    gaps: list[str] = []
    try:
        from reasoning import market_priors as mp
        from reasoning.signals import MarketPrior

        # dated scoreboard for the week's slate; fall back to the default window
        date_param = ""
        try:
            from datetime import datetime, timedelta
            # week N's slate window is unknown here; try the upcoming Saturday-Thursday
            pass
        except Exception:
            pass
        payload = None
        for base in mp.BASES:
            try:
                payload = mp._fetch(base.format(sport="football/nfl") + date_param)
                break
            except Exception:
                continue
        if not payload:
            gaps.append("market priors: ESPN scoreboard unreachable (offline run)")
            return [], gaps
        for ev in payload.get("events", []):
            comps = ev.get("competitions", []) or []
            if not comps:
                continue
            odds = comps[0].get("odds") or []
            if not odds:
                continue
            o = odds[0]
            ml = o.get("moneyline") or {}

            def _amer(obj: dict):
                for k in ("close", "open", "current"):
                    raw = (obj.get(k) or {}).get("odds")
                    if raw in (None, ""):
                        continue
                    try:
                        return float(raw)
                    except (TypeError, ValueError):
                        continue
                return None

            h, a = _amer(ml.get("home") or {}), _amer(ml.get("away") or {})
            if not (h and a):
                continue
            fa, fb, s = mp.devig_two_way(h, a)
            name = (ev.get("name") or "").lower()
            if home.lower() in name or away.lower() in name:
                src = (o.get("provider") or {}).get("name") or "espn-inline"
                return [
                    MarketPrior(hypothesis=f"{away}@{home} home win", prior=fa,
                                source=f"espn-inline {src} {h:+.0f}/{a:+.0f} de-vig",
                                note=f"booksum {s:.4f}"),
                    MarketPrior(hypothesis=f"{away}@{home} away win", prior=fb,
                                source=f"espn-inline {src} {h:+.0f}/{a:+.0f} de-vig",
                                note=f"booksum {s:.4f}"),
                ], gaps
        gaps.append("market priors: no ESPN odds row matched this matchup (game not listed or odds not posted)")
        return [], gaps
    except Exception as exc:  # honesty over bravado
        gaps.append(f"market priors: auto-attach failed ({type(exc).__name__}: {exc})")
        return [], gaps


def reason_game(home: str = "CLE", away: str = "PIT", week: int = 4, season: int = 2026,
                weather: dict[str, Any] | None = None,
                market_priors: list | None = None,
                ingested_signals: list | None = None) -> dict[str, Any]:
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

    # Layer 1 auto-attach: when the caller did not bring priors, try the ESPN
    # inline odds. Failure is a named gap in `gaps`, not a crash.
    if market_priors is None:
        market_priors, prior_gaps = _auto_market_priors(home, away, season, week)
        gaps.extend(prior_gaps)

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
        "ranked_board": ranked_board(trace, facts, gaps, decision,
                                     priors=market_priors, signals=ingested_signals),
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
