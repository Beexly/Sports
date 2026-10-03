# PROVENANCE — qb-behavior / situational / cells.py
# Implements: corpus-intelligence/deep/c02/buildable-systems.md (Systems 1–3 cell
#   definitions), syntheses.md S1 (rights tiers: T1 nflverse-pbp only), verified-claims.md
#   SIT-6 (engine-eligible cells), TRUST-7 (trust situations), PRESS-1..4 (floor guards).
# Research basis: docs/models/qb-pressure-indices-proposal.md (sensitivity/stress formulas
#   + null guards); docs/props/research/2026-09-17/props-consensus/projection_methods.md
#   (INT recipe, veto list); docs/architecture/2026-09-18-signal-architecture.md
#   (FTN L7 share-alike model-ineligibility — engine cells are T1 only).
# Runtime deps: Python stdlib ONLY. Shared by the build-time table generator
# (qb-behavior/build/build_tables.py, via map_elements) and the runtime server,
# so offline and live cell assignment can never disagree.
"""Situation-cell definitions for the c02 situational layer.

Every pressure metric carries its definition in the name (challenges.md CH-X-1):
`pressure_floor` = (qb_hit == 1 OR sack == 1). Hurries exist in no nflverse
source, so the clean cell is contaminated and every clean-vs-pressured
contrast is attenuated toward zero (conservative, never overstated).

INT cells use a coarse 288-cell grid (2 x 4 x 4... see below). The corpus has
zero measured INT-by-situation numbers (verified-claims.md SIT-1); a coarse
honest grid beats a fine noisy one — leaves refuse below n=30 (back off).
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Pressure floor (CH-X-1: the definition is in the name)
# ---------------------------------------------------------------------------

def pressure_floor(qb_hit: int | None, sack: int | None) -> int:
    """1 if the dropback was pressured ON THE FLOOR DEFINITION
    (qb_hit == 1 OR sack == 1), else 0. Hurries are absent from every
    nflverse source, so this is a floor — never call it 'pressure' bare."""
    return 1 if (qb_hit == 1 or sack == 1) else 0


# ---------------------------------------------------------------------------
# INT-by-situation cells: 2 x 4 x 3 x 3 x 4 = 288 cells
# ---------------------------------------------------------------------------

def qtr_group(qtr: int | None) -> int:
    """1, 2, 3, 4 (4 includes OT/5th). None -> 4 (garbage-time-removed frame
    rarely has null qtr; fail toward the pooled bucket, never crash)."""
    if qtr in (1, 2, 3):
        return int(qtr)
    return 4


def script3(score_differential: int | None) -> int:
    """0 = trailing, 1 = tied, 2 = leading."""
    if score_differential is None:
        return 1
    if score_differential < 0:
        return 0
    if score_differential > 0:
        return 2
    return 1


def zone3(yardline_100: int | None) -> int:
    """0 = own territory (yardline_100 > 50), 1 = midfield (21-50),
    2 = scoring zone (<= 20, includes red zone)."""
    if yardline_100 is None:
        return 1
    if yardline_100 <= 20:
        return 2
    if yardline_100 <= 50:
        return 1
    return 0


def downdist4(down: int | None, ydstogo: int | None) -> int:
    """0 = early (1st/2nd), 1 = late+short (3rd/4th, <=3), 2 = late+mid (4-7),
    3 = late+long (8+)."""
    if down is None:
        return 0
    if down <= 2:
        return 0
    if ydstogo is None:
        return 1
    if ydstogo <= 3:
        return 1
    if ydstogo <= 7:
        return 2
    return 3


def int_cell_key(p: int, q: int, s: int, z: int, d: int) -> str:
    """Compact cell key, e.g. 'p1_q4_s0_z2_d3'."""
    return f"p{p}_q{q}_s{s}_z{z}_d{d}"


def int_cell_from_play(play: dict) -> str:
    """Cell key for one play-dict. Never raises on missing keys."""
    return int_cell_key(
        pressure_floor(play.get("qb_hit"), play.get("sack")),
        qtr_group(play.get("qtr")),
        script3(play.get("score_differential")),
        zone3(play.get("yardline_100")),
        downdist4(play.get("down"), play.get("ydstogo")),
    )


# ---------------------------------------------------------------------------
# Trust-target situations (verified-claims.md TRUST-7)
# ---------------------------------------------------------------------------

TRUST_SITUATIONS: tuple[str, ...] = ("all", "rz", "third", "twomin", "trailing", "press")


def trust_situation(situation: str, play: dict) -> bool:
    """Whether a play belongs to a trust-target situation. Multi-label: a
    play can belong to several (e.g. rz + third + trailing)."""
    if situation == "all":
        return True
    if situation == "rz":
        yl = play.get("yardline_100")
        return yl is not None and yl <= 20
    if situation == "third":
        return play.get("down") == 3
    if situation == "twomin":
        qtr = play.get("qtr")
        gsr = play.get("game_seconds_remaining")
        return (qtr == 4 and gsr is not None and gsr <= 120) or qtr == 5
    if situation == "trailing":
        sd = play.get("score_differential")
        return sd is not None and sd < 0
    if situation == "press":
        return pressure_floor(play.get("qb_hit"), play.get("sack")) == 1
    raise ValueError(f"unknown trust situation: {situation}")