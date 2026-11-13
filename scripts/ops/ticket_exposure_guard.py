#!/usr/bin/env python3
"""
scripts/ops/ticket_exposure_guard.py

Ticket-exposure caps (antigravity workspace review 2026-11-13, item 4):
  1. Max 1 Anchor + 1 SGP per game leg (no stacking multiple tickets on one leg).
  2. Ban ML + (-1.5) double-staking on the same team when |spread| <= 2.5
     (near-pick'em games: the two bets are the same outcome, doubled exposure).
  3. No sub-20.5-yard props in parlays (micro-line variance trap).

Pure functions, fail-closed: validate_ticket_exposure() returns the list of
violations; callers MUST drop/refuse any ticket with violations before
publication. Wired into Stage 5's correlated_sgp_constructions output path.
"""
from __future__ import annotations

from typing import Any

MAX_ANCHOR_PER_LEG = 1
MAX_SGP_PER_LEG = 1
DOUBLE_STAKE_SPREAD_BAND = 2.5
PARLAY_MIN_YARD_LINE = 20.5


def _leg_key(ticket: dict[str, Any]) -> str:
    return str(ticket.get("game_id") or ticket.get("matchup") or ticket.get("leg") or "unknown")


def _ticket_kind(ticket: dict[str, Any]) -> str:
    k = str(ticket.get("kind") or ticket.get("type") or "").upper()
    if "SGP" in k or "PARLAY" in k or len(ticket.get("legs", [])) > 1:
        return "SGP"
    if "ANCHOR" in k:
        return "ANCHOR"
    return k or "SINGLE"


def validate_ticket_exposure(tickets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return one violation record per breach. Empty list = all caps respected."""
    violations: list[dict[str, Any]] = []

    # Cap 1: per-leg ticket counts by kind.
    per_leg: dict[str, dict[str, int]] = {}
    for t in tickets:
        leg = _leg_key(t)
        kind = _ticket_kind(t)
        bucket = per_leg.setdefault(leg, {})
        bucket[kind] = bucket.get(kind, 0) + 1
    for leg, bucket in per_leg.items():
        if bucket.get("ANCHOR", 0) > MAX_ANCHOR_PER_LEG:
            violations.append({
                "cap": "max_1_anchor_per_leg", "leg": leg,
                "count": bucket["ANCHOR"],
                "reason": f"{bucket['ANCHOR']} Anchor tickets on leg {leg} (max {MAX_ANCHOR_PER_LEG})",
            })
        if bucket.get("SGP", 0) > MAX_SGP_PER_LEG:
            violations.append({
                "cap": "max_1_sgp_per_leg", "leg": leg,
                "count": bucket["SGP"],
                "reason": f"{bucket['SGP']} SGP/parlay tickets on leg {leg} (max {MAX_SGP_PER_LEG})",
            })

    for t in tickets:
        tid = str(t.get("id") or t.get("name") or _leg_key(t))
        legs = t.get("legs") or []
        # Cap 2: ML + (-1.5) double-stake within |spread| <= 2.5.
        spread = t.get("spread")
        if spread is None and legs:
            spread = legs[0].get("spread")
        if spread is not None and abs(float(spread)) <= DOUBLE_STAKE_SPREAD_BAND:
            selections = [str(l.get("selection") or l.get("market") or "").upper() for l in legs] if legs else [str(t.get("selection") or "").upper()]
            has_ml = any("MONEYLINE" in s or s.endswith(" ML") or s == "ML" for s in selections)
            has_alt_spread = any("-1.5" in s for s in selections)
            same_team = len({str(l.get("team") or "") for l in legs if l.get("team")}) <= 1 if legs else True
            if has_ml and has_alt_spread and same_team:
                violations.append({
                    "cap": "ban_ml_plus_alt_spread_double_stake", "ticket": tid,
                    "reason": f"ML + (-1.5) on same team with |spread|={abs(float(spread))} <= {DOUBLE_STAKE_SPREAD_BAND}",
                })
        # Cap 3: sub-20.5-yard props inside parlays.
        if _ticket_kind(t) == "SGP":
            for l in legs:
                market = str(l.get("market") or "").lower()
                line = l.get("line")
                if line is not None and ("yard" in market or "yds" in market) and float(line) < PARLAY_MIN_YARD_LINE:
                    violations.append({
                        "cap": "no_sub_20_5_yard_props_in_parlays", "ticket": tid,
                        "athlete": l.get("athlete"), "line": float(line),
                        "reason": f"parlay leg {l.get('athlete')} {market} line {line} < {PARLAY_MIN_YARD_LINE}",
                    })
    return violations


def enforce_ticket_exposure(tickets: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Split tickets into (kept, refused). Fail-closed: any ticket implicated
    in a violation is refused with its reasons attached."""
    violations = validate_ticket_exposure(tickets)
    if not violations:
        return list(tickets), []
    bad_legs = {v["leg"] for v in violations if "leg" in v}
    bad_tickets = {v["ticket"] for v in violations if "ticket" in v}
    kept, refused = [], []
    for t in tickets:
        tid = str(t.get("id") or t.get("name") or _leg_key(t))
        implicated = _leg_key(t) in bad_legs or tid in bad_tickets
        if implicated:
            reasons = [v["reason"] for v in violations if v.get("leg") == _leg_key(t) or v.get("ticket") == tid]
            refused.append({**t, "refused_reasons": reasons})
        else:
            kept.append(t)
    return kept, refused