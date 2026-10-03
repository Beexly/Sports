"""
motif_sweep_wire.py — Wire functions for the 2026-10-03 AM X sweep metrics.

These are REGISTERED functions for the trainer/integrator, not a second
writer. Import and call; do not copy. Ownership: Motif.

Priority order (complex equations first):
  1. epa_pressure_opponent_delta  (innovation candidate: EPA x pressure-rate
     pairing with opponent-pressure delta)
  2. personnel_shift_epa          (11/12 personnel usage-share x EPA deltas)
  3. blitz_epa_split              (QB EPA/dropback vs blitz, home-minus-away)
  4. Simple table metrics below (aggressiveness, penalties, PFF grades).

Point-in-time: every input must be the latest row with season*100+week
strictly before the game, lag at most 2 seasons. Ratios and shrinkage
BEFORE any home-minus-away diff. Null if either side misses the floor.
A league constant is not a feature. Inputs that do not exist in the
engine are returned as missing:<field> — never invented.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


MISSING = "missing:{}"


# ---------------------------------------------------------------------------
# 1. EPA x pressure-rate with opponent-pressure delta (innovation candidate)
# ---------------------------------------------------------------------------
# Source: @Data_Over_Degen 7-post EPA/pressure thread, 2026-10-03 AM sweep.
# Idea: a QB's EPA/dropback means something different depending on the
# pressure rate he faced AND the delta vs the pressure his opponent
# typically generates. Pair the two instead of using raw EPA alone.

@dataclass(frozen=True)
class PressureInputs:
    qb_epa_per_dropback: Optional[float]   # prior-season shrunk
    qb_pressure_rate_faced: Optional[float]
    opp_pressure_rate_generated: Optional[float]  # opponent's typical rate
    league_pressure_rate: Optional[float]
    dropbacks: Optional[int]


PRESSURE_FLOOR_DROPBACKS = 100


def epa_pressure_opponent_delta(inp: PressureInputs) -> Dict[str, object]:
    """
    Returns the pressure-contextualized EPA features, or missing:<field>.
    All three rates must clear the dropback floor; else null (not zero).
    """
    for f in ("qb_epa_per_dropback", "qb_pressure_rate_faced",
              "opp_pressure_rate_generated", "league_pressure_rate", "dropbacks"):
        if getattr(inp, f) is None:
            return {"ok": False, "reason": MISSING.format(f)}
    assert inp.dropbacks is not None  # narrowed by the loop above
    if inp.dropbacks < PRESSURE_FLOOR_DROPBACKS:
        return {"ok": False, "reason": "below dropback floor", "value": None}

    # Shrinkage on the rates before any diff (simple empirical-Bayes-ish
    # pull toward league rate; weight by dropbacks).
    w = inp.dropbacks / (inp.dropbacks + PRESSURE_FLOOR_DROPBACKS)
    assert inp.qb_pressure_rate_faced is not None
    assert inp.opp_pressure_rate_generated is not None
    assert inp.league_pressure_rate is not None
    qb_pr = w * inp.qb_pressure_rate_faced + (1 - w) * inp.league_pressure_rate
    opp_pr = w * inp.opp_pressure_rate_generated + (1 - w) * inp.league_pressure_rate

    return {
        "ok": True,
        # pressure the QB faced, relative to what this opponent generates
        "pressure_delta_vs_opp": qb_pr - opp_pr,
        # raw pressure burden, league-centered
        "pressure_burden": qb_pr - inp.league_pressure_rate,
        # EPA/dropback carried through for the trainer to interact
        "epa_per_dropback": inp.qb_epa_per_dropback,
    }


# ---------------------------------------------------------------------------
# 2. Personnel-shift EPA (11 / 12 personnel usage-share x EPA deltas)
# ---------------------------------------------------------------------------
# Source: @corbin_young21 via @FantasyPtsData, 2026-10-03 AM sweep.
# 6 teams x 11-personnel and 6 x 12-personnel: usage-share change paired
# with EPA delta. Feature = share change * EPA delta (the interaction),
# not either marginal alone.

@dataclass(frozen=True)
class PersonnelInputs:
    personnel: str                      # "11" or "12"
    usage_share_change: Optional[float]  # delta in share (pp)
    epa_delta: Optional[float]           # delta in EPA/play


def personnel_shift_epa(inp: PersonnelInputs) -> Dict[str, object]:
    if inp.usage_share_change is None:
        return {"ok": False, "reason": MISSING.format("usage_share_change")}
    if inp.epa_delta is None:
        return {"ok": False, "reason": MISSING.format("epa_delta")}
    return {
        "ok": True,
        "personnel": inp.personnel,
        # the interaction: are they shifting toward what works?
        "shift_x_epa": inp.usage_share_change * inp.epa_delta,
        "usage_share_change": inp.usage_share_change,
        "epa_delta": inp.epa_delta,
    }


# ---------------------------------------------------------------------------
# 3. Blitz EPA split (home-minus-away)
# ---------------------------------------------------------------------------
# Source: @statyxio via sweep (Caleb Williams vs Jordan Love EPA/dropback
# blitz splits). Feature = team's blitz EPA/dropback minus opponent's
# blitz EPA/dropback allowed, both prior-season shrunk.

@dataclass(frozen=True)
class BlitzInputs:
    team_blitz_epa_db: Optional[float]
    opp_blitz_epa_allowed_db: Optional[float]
    team_dropbacks_vs_blitz: Optional[int]
    opp_dropbacks_vs_blitz: Optional[int]


BLITZ_FLOOR = 40


def blitz_epa_split(home: BlitzInputs, away: BlitzInputs) -> Dict[str, object]:
    def side(s: BlitzInputs, tag: str) -> Optional[float]:
        if s.team_blitz_epa_db is None:
            return None
        if s.team_dropbacks_vs_blitz is None or s.team_dropbacks_vs_blitz < BLITZ_FLOOR:
            return None
        return s.team_blitz_epa_db

    hv = side(home, "home")
    av = side(away, "away")
    if hv is None or av is None:
        return {"ok": False, "reason": "floor missed", "value": None}
    # home-minus-away AFTER shrinkage (shrinkage is the caller's job;
    # these inputs are prior-season shrunk by contract).
    return {"ok": True, "value": hv - av}


# ---------------------------------------------------------------------------
# 4. Table metrics (simple, attributed)
# ---------------------------------------------------------------------------

def nflverse_aggressiveness_note() -> Dict[str, object]:
    """
    @GridironInfo_ 2026-10-03: 31-QB aggressiveness leaderboard.
    ATTRIBUTION FLAG: header says NGS, footer credits nflverse (nflreadpy).
    Do not wire as NGS until the source is resolved. Returns the flag,
    not the table.
    """
    return {
        "ok": False,
        "reason": "source unresolved: header=NGS footer=nflverse",
        "action": "await source resolution before wiring",
    }


def defensive_penalties_per_game(value: Optional[float]) -> Dict[str, object]:
    # @sfdata9ers 2026-10-03: new column, 32-team table weeks 1-3.
    if value is None:
        return {"ok": False, "reason": MISSING.format("def_penalties_per_game")}
    return {"ok": True, "value": value}


def pff_lb_pass_rush_grade(value: Optional[float]) -> Dict[str, object]:
    # @PFF via sweep: LB pass rush grades (e.g. Dean 83.0). PFF grades are
    # proprietary; treat as third-party input, never a target.
    if value is None:
        return {"ok": False, "reason": MISSING.format("pff_lb_pass_rush")}
    return {"ok": True, "value": value, "third_party": True}
