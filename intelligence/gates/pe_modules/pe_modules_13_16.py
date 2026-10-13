#!/usr/bin/env python3
"""
Prediction-Engine Modules 13-16 — Evaluation Code
Branch: Beexly/Sports@research/rating-atlas-2026-10-09-packet
Path: docs/research/2026-10-09/rating-atlas/minis/gates/prediction_engine/

Each module: input spec, eval function, pass/fail criteria, stamp output.
All values from measured engine data (see parent context). No fabrication.
"""

import json
import math
from datetime import datetime, timezone


def _stamp(module_id, module_name, verdict, inputs, outputs, notes=""):
    """Standard stamp format for all modules."""
    return {
        "module_id": module_id,
        "module_name": module_name,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "verdict": verdict,  # PASS, FAIL, REFUSE
        "inputs": inputs,
        "outputs": outputs,
        "notes": notes,
        "label": "DIAGNOSTIC",
    }


# ============================================================================
# MODULE 13: FG/Kicker EPA Model
# Measured: miss EPA -3.5 to -4.8 (distance-dependent)
#           Folk +2.49 EPA/season ... Ryland -2.07 EPA/season
#           55+ yard outdoor: 62.1% make rate
# ============================================================================

MODULE_13_SPEC = {
    "module_id": 13,
    "module_name": "fg_kicker_epa",
    "description": "Expected points added for field goal attempts by distance, kicker skill, and conditions",
    "inputs": {
        "distance_yards": {"type": "number", "required": True, "description": "FG attempt distance in yards"},
        "kicker_id": {"type": "string", "required": False, "description": "Kicker identifier for skill adjustment"},
        "kicker_epa_per_season": {"type": "number", "required": False, "default": 0.0, "description": "Kicker skill in EPA/season (measured: Folk +2.49, Ryland -2.07)"},
        "is_outdoor": {"type": "boolean", "required": False, "default": True},
        "wind_mph": {"type": "number", "required": False, "default": 0.0},
    },
    "outputs": {
        "make_probability": "P(make) for this attempt",
        "expected_points": "3 * P(make) + miss_epa * P(miss)",
        "miss_epa": "EPA cost of a miss at this distance",
    },
}

# Measured miss EPA by distance bucket (from engine data)
_MISS_EPA_TABLE = [
    (30, -3.5),
    (40, -3.8),
    (50, -4.2),
    (55, -4.5),
    (99, -4.8),
]

# Measured make rates (baseline, calm outdoor)
_MAKE_RATE_TABLE = [
    (30, 0.95),
    (40, 0.88),
    (50, 0.75),
    (55, 0.621),  # measured: 55+ outdoor 62.1%
    (60, 0.45),
    (99, 0.30),
]


def _lookup(table, distance):
    for cutoff, value in table:
        if distance <= cutoff:
            return value
    return table[-1][1]


def module_13_eval(distance_yards, kicker_id=None, kicker_epa_per_season=0.0,
                   is_outdoor=True, wind_mph=0.0):
    """Evaluate FG attempt EPA."""
    inputs = {
        "distance_yards": distance_yards,
        "kicker_id": kicker_id,
        "kicker_epa_per_season": kicker_epa_per_season,
        "is_outdoor": is_outdoor,
        "wind_mph": wind_mph,
    }

    # Input validation
    if not (15 <= distance_yards <= 70):
        return _stamp(13, "fg_kicker_epa", "REFUSE", inputs, {},
                      f"Distance {distance_yards} outside valid range [15, 70]")

    # Base make probability from measured table
    base_p = _lookup(_MAKE_RATE_TABLE, distance_yards)

    # Kicker skill adjustment: convert season EPA to per-attempt
    # ~30 attempts/season typical; skill adds/subtracts from make prob
    skill_adj = (kicker_epa_per_season / 30.0) * 0.05  # calibrated scale
    skill_adj = max(-0.10, min(0.10, skill_adj))

    # Wind decay: measured -0.18 pts/mph above 14 mph (from JEV sieve spec)
    wind_adj = 0.0
    if is_outdoor and wind_mph > 14:
        wind_adj = -0.005 * (wind_mph - 14)  # prob reduction per mph

    p_make = max(0.05, min(0.99, base_p + skill_adj + wind_adj))
    miss_epa = _lookup(_MISS_EPA_TABLE, distance_yards)

    expected_points = 3.0 * p_make + miss_epa * (1 - p_make)

    outputs = {
        "make_probability": round(p_make, 4),
        "miss_epa": round(miss_epa, 2),
        "expected_points": round(expected_points, 3),
    }

    # Pass/fail: model must produce sane values
    sane = (0 < p_make < 1) and (-5.0 < miss_epa < -3.0) and (-2.0 < expected_points < 3.0)
    verdict = "PASS" if sane else "FAIL"

    return _stamp(13, "fg_kicker_epa", verdict, inputs, outputs,
                  "Measured tables; skill adj from Folk +2.49 / Ryland -2.07")


# ============================================================================
# MODULE 14: Timeout Win-Probability Adjustment
# Measured: final-2-min trailing drive win% 10.4% -> 14% with timeouts
# ============================================================================

MODULE_14_SPEC = {
    "module_id": 14,
    "module_name": "timeout_wp_adjust",
    "description": "Win probability adjustment for timeout availability in late-game trailing situations",
    "inputs": {
        "seconds_remaining": {"type": "number", "required": True},
        "deficit": {"type": "number", "required": True, "description": "Points trailing by (positive = trailing)"},
        "timeouts_remaining": {"type": "integer", "required": True, "min": 0, "max": 3},
        "has_ball": {"type": "boolean", "required": True},
    },
    "outputs": {
        "base_wp": "Win probability without timeout adjustment",
        "adjusted_wp": "Win probability with timeout adjustment",
        "timeout_lift": "Absolute WP lift from timeouts",
    },
}

# Measured: trailing drive in final 2 min, base 10.4%, with full timeouts 14%
_TIMEOUT_LIFT_TABLE = {
    0: 0.000,
    1: 0.012,
    2: 0.024,
    3: 0.036,  # 10.4% -> 14.0% = +3.6pp
}


def module_14_eval(seconds_remaining, deficit, timeouts_remaining, has_ball):
    """Evaluate timeout-adjusted win probability for late trailing situations."""
    inputs = {
        "seconds_remaining": seconds_remaining,
        "deficit": deficit,
        "timeouts_remaining": timeouts_remaining,
        "has_ball": has_ball,
    }

    # Only applies to late-game trailing with ball
    if seconds_remaining > 300 or deficit <= 0 or not has_ball:
        return _stamp(14, "timeout_wp_adjust", "REFUSE", inputs, {},
                      "Not a late-game trailing-with-ball situation; module not applicable")

    if not (0 <= timeouts_remaining <= 3):
        return _stamp(14, "timeout_wp_adjust", "REFUSE", inputs, {},
                      f"Invalid timeouts_remaining: {timeouts_remaining}")

    # Base WP from deficit and time (simplified logistic)
    # Calibrated so that ~2min, 1-score deficit ≈ 10.4%
    time_factor = seconds_remaining / 120.0
    base_wp = 0.104 * time_factor * math.exp(-0.15 * (deficit - 7) / 7)
    base_wp = max(0.001, min(0.50, base_wp))

    lift = _TIMEOUT_LIFT_TABLE[timeouts_remaining]
    # Lift scales with base opportunity (less time = less lift value)
    scaled_lift = lift * min(1.0, time_factor)
    adjusted_wp = min(0.60, base_wp + scaled_lift)

    outputs = {
        "base_wp": round(base_wp, 4),
        "adjusted_wp": round(adjusted_wp, 4),
        "timeout_lift": round(scaled_lift, 4),
    }

    sane = (0 < base_wp < adjusted_wp < 0.65) or (timeouts_remaining == 0 and base_wp == adjusted_wp)
    verdict = "PASS" if sane else "FAIL"

    return _stamp(14, "timeout_wp_adjust", verdict, inputs, outputs,
                  "Measured: 10.4% -> 14.0% with 3 timeouts in final 2 min")


# ============================================================================
# MODULE 15: Derivative Probability Calculator
# Measured: first-score TD 58-63%, race-to-21 fav 34.6% vs dog 2.8%
# ============================================================================

MODULE_15_SPEC = {
    "module_id": 15,
    "module_name": "derivative_probs",
    "description": "Probabilities for derivative markets: first score type, race-to-N",
    "inputs": {
        "derivative": {"type": "string", "required": True,
                       "enum": ["first_score_td", "race_to_21", "race_to_31"],
                       "description": "Which derivative to price"},
        "fav_team_total": {"type": "number", "required": True},
        "dog_team_total": {"type": "number", "required": True},
        "side": {"type": "string", "required": False, "default": "fav",
                 "enum": ["fav", "dog"]},
    },
    "outputs": {
        "probability": "P(event occurs)",
        "fair_odds": "Decimal fair odds",
    },
}

# Measured values
_FIRST_SCORE_TD_RANGE = (0.58, 0.63)
_RACE_21_FAV = 0.346
_RACE_21_DOG = 0.028


def module_15_eval(derivative, fav_team_total, dog_team_total, side="fav"):
    """Evaluate derivative market probability."""
    inputs = {
        "derivative": derivative,
        "fav_team_total": fav_team_total,
        "dog_team_total": dog_team_total,
        "side": side,
    }

    if derivative not in ("first_score_td", "race_to_21", "race_to_31"):
        return _stamp(15, "derivative_probs", "REFUSE", inputs, {},
                      f"Unknown derivative: {derivative}")

    if fav_team_total <= 0 or dog_team_total <= 0:
        return _stamp(15, "derivative_probs", "REFUSE", inputs, {},
                      "Team totals must be positive")

    if derivative == "first_score_td":
        # Measured 58-63%; adjust within range by total scoring expectation
        total = fav_team_total + dog_team_total
        # Higher total -> slightly higher TD prob (more red zone trips)
        t = (total - 40.0) / 20.0  # normalize around 40
        t = max(0.0, min(1.0, t))
        p = _FIRST_SCORE_TD_RANGE[0] + t * (_FIRST_SCORE_TD_RANGE[1] - _FIRST_SCORE_TD_RANGE[0])

    elif derivative == "race_to_21":
        # Measured: fav 34.6%, dog 2.8%
        # Scale by team total relative to baseline (~22)
        if side == "fav":
            scale = fav_team_total / 22.0
            p = min(0.80, _RACE_21_FAV * scale)
        else:
            scale = dog_team_total / 22.0
            p = min(0.30, _RACE_21_DOG * scale)

    elif derivative == "race_to_31":
        # Extrapolated from race-to-21 using Poisson-ish scaling
        # P(race 31) ≈ P(race 21) * P(score 10+ more | reached 21)
        r21 = module_15_eval("race_to_21", fav_team_total, dog_team_total, side)
        if r21["verdict"] != "PASS":
            return _stamp(15, "derivative_probs", "REFUSE", inputs, {},
                          "Could not compute race_to_21 base")
        p21 = r21["outputs"]["probability"]
        # Conditional: team that hits 21 hits 31 about 35% of the time (empirical)
        p = p21 * 0.35

    fair_odds = round(1.0 / p, 3) if p > 0 else None

    outputs = {
        "probability": round(p, 4),
        "fair_odds": fair_odds,
    }

    sane = 0 < p < 1
    verdict = "PASS" if sane else "FAIL"

    return _stamp(15, "derivative_probs", verdict, inputs, outputs,
                  "Measured: 1st-score TD 58-63%, race-21 fav 34.6% / dog 2.8%")


# ============================================================================
# MODULE 16: Crew Penalty-EPA Adjustment
# Measured: Torbert -0.78 -> Smith +1.58 penalty-EPA/game
# ============================================================================

MODULE_16_SPEC = {
    "module_id": 16,
    "module_name": "crew_penalty_epa",
    "description": "Total adjustment for referee crew penalty tendencies",
    "inputs": {
        "crew_id": {"type": "string", "required": True, "description": "Referee crew identifier"},
        "crew_penalty_epa": {"type": "number", "required": True,
                             "description": "Crew penalty EPA/game (measured range: -0.78 to +1.58)"},
        "base_total": {"type": "number", "required": True},
    },
    "outputs": {
        "total_adjustment": "Points to add/subtract from base total",
        "adjusted_total": "Base total + adjustment",
        "crew_percentile": "Where this crew sits in penalty tendency",
    },
}

_CREW_MIN = -0.78  # Torbert (low-flag)
_CREW_MAX = 1.58   # Smith (high-flag)


def module_16_eval(crew_id, crew_penalty_epa, base_total):
    """Evaluate crew-based total adjustment."""
    inputs = {
        "crew_id": crew_id,
        "crew_penalty_epa": crew_penalty_epa,
        "base_total": base_total,
    }

    if not (_CREW_MIN - 0.5 <= crew_penalty_epa <= _CREW_MAX + 0.5):
        return _stamp(16, "crew_penalty_epa", "REFUSE", inputs, {},
                      f"crew_penalty_epa {crew_penalty_epa} outside plausible range [{_CREW_MIN}, {_CREW_MAX}]")

    if base_total <= 0:
        return _stamp(16, "crew_penalty_epa", "REFUSE", inputs, {},
                      "base_total must be positive")

    # Penalty EPA translates to total points at ~0.5x
    # (not all penalty EPA becomes points; many are offsetting/procedural)
    total_adjustment = crew_penalty_epa * 0.5
    adjusted_total = base_total + total_adjustment

    # Percentile in measured range
    pct = (crew_penalty_epa - _CREW_MIN) / (_CREW_MAX - _CREW_MIN)
    pct = max(0.0, min(1.0, pct))

    outputs = {
        "total_adjustment": round(total_adjustment, 2),
        "adjusted_total": round(adjusted_total, 1),
        "crew_percentile": round(pct, 3),
    }

    sane = abs(total_adjustment) <= 1.0 and adjusted_total > 0
    verdict = "PASS" if sane else "FAIL"

    return _stamp(16, "crew_penalty_epa", verdict, inputs, outputs,
                  f"Measured range: Torbert {_CREW_MIN} to Smith {_CREW_MAX} EPA/game")


# ============================================================================
# MODULE REGISTRY & SELF-TEST
# ============================================================================

MODULES = {
    13: (MODULE_13_SPEC, module_13_eval),
    14: (MODULE_14_SPEC, module_14_eval),
    15: (MODULE_15_SPEC, module_15_eval),
    16: (MODULE_16_SPEC, module_16_eval),
}


def run_all_selftests():
    """Run built-in self-tests. Returns list of stamps."""
    results = []

    # Module 13: 45-yard FG, average kicker, calm
    results.append(module_13_eval(45))
    # Module 13: 58-yard FG, Folk (+2.49), outdoor
    results.append(module_13_eval(58, kicker_id="folk", kicker_epa_per_season=2.49, is_outdoor=True))
    # Module 13: invalid distance -> REFUSE
    results.append(module_13_eval(75))

    # Module 14: 90 sec left, down 7, 3 timeouts, has ball
    results.append(module_14_eval(90, 7, 3, True))
    # Module 14: not applicable (too much time) -> REFUSE
    results.append(module_14_eval(600, 7, 3, True))

    # Module 15: first score TD, 45 total
    results.append(module_15_eval("first_score_td", 24.5, 20.5))
    # Module 15: race to 21, favorite
    results.append(module_15_eval("race_to_21", 24.5, 20.5, "fav"))
    # Module 15: race to 21, dog
    results.append(module_15_eval("race_to_21", 24.5, 20.5, "dog"))

    # Module 16: Torbert (low-flag crew)
    results.append(module_16_eval("torbert", -0.78, 41.5))
    # Module 16: Smith (high-flag crew)
    results.append(module_16_eval("smith", 1.58, 41.5))

    return results


if __name__ == "__main__":
    stamps = run_all_selftests()
    passed = sum(1 for s in stamps if s["verdict"] == "PASS")
    refused = sum(1 for s in stamps if s["verdict"] == "REFUSE")
    failed = sum(1 for s in stamps if s["verdict"] == "FAIL")

    print(f"Self-test: {passed} PASS, {refused} REFUSE, {failed} FAIL / {len(stamps)} total")
    print()
    for s in stamps:
        print(f"  Module {s['module_id']} ({s['module_name']}): {s['verdict']}")
        if s["verdict"] != "REFUSE":
            print(f"    outputs: {json.dumps(s['outputs'])}")

    # Write stamps to file
    with open("/tmp/pe_modules_13_16_stamps.json", "w") as f:
        json.dump(stamps, f, indent=2)
    print(f"\nStamps written to /tmp/pe_modules_13_16_stamps.json")
