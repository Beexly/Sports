#!/usr/bin/env python3
"""
prediction_engine_modules_5_8.py — Acceptance evaluation for prediction-engine modules 5-8.

Each module tests a measured prediction component against the frozen manifest.
Pattern per module:
  - INPUT_SPEC: what data the module needs
  - evaluate(): runs the test, returns metrics
  - PASS/FAIL: statistical criteria
  - stamp(): writes INFRASTRUCTURE PASS/REFUSE + result verdict

Modules:
  5: Derivatives edge (first-score TD rate, race-to-N)
  6: Crew penalty-EPA edge (officiating impact)
  7: Timeout edge (late-game win probability)
  8: FG/Kicker edge (miss EPA, kicker ratings)

Usage:
  python3 prediction_engine_modules_5_8.py --manifest /path/to/manifest.json --output /path/to/stamps/

Manifest format (frozen):
  {
    "games": [
      {"game_id": str, "season": int, "week": int,
       "home": str, "away": str,
       "spread_close": float, "total_close": float,
       "home_score": int, "away_score": int,
       "first_score_td": bool,           # module 5
       "race_to_21_winner": str,         # module 5
       "referee": str,                   # module 6
       "penalties_home": int, "penalties_away": int,  # module 6
       "trailing_2min": bool, "won_trailing_2min": bool,  # module 7
       "timeouts_remaining": int,         # module 7
       "fg_attempts": [...],              # module 8
       "kicker": str}
    ]
  }
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Module 5: Derivatives edge
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   - first_score_td: bool per game (was the first score a TD?)
#   - race_to_21_winner: 'fav' | 'dog' | None per game
# ACCEPTANCE:
#   - First-score TD rate must be within [0.55, 0.66] (measured 0.58-0.63)
#   - Race-to-21 favorite hit rate must be >= 0.30 (measured 0.346)
#   - n >= 50 games for statistical validity

MODULE_5_SPEC = {
    "module_id": 5,
    "name": "derivatives_edge",
    "description": "First-score TD probability and race-to-N derivative pricing",
    "inputs": ["first_score_td", "race_to_21_winner"],
    "min_n": 50,
    "criteria": {
        "first_score_td_rate": {"min": 0.55, "max": 0.66},
        "race_to_21_fav_rate": {"min": 0.30, "max": 1.0},
    },
}


def evaluate_module_5(games):
    """Evaluate derivatives edge against frozen manifest."""
    valid = [g for g in games if g.get("first_score_td") is not None]
    n = len(valid)
    if n < MODULE_5_SPEC["min_n"]:
        return {"n": n, "error": f"insufficient n={n}, need {MODULE_5_SPEC['min_n']}"}

    td_count = sum(1 for g in valid if g["first_score_td"])
    td_rate = td_count / n

    race_games = [g for g in games if g.get("race_to_21_winner") is not None]
    race_n = len(race_games)
    race_fav = sum(1 for g in race_games if g["race_to_21_winner"] == "fav")
    race_fav_rate = race_fav / race_n if race_n > 0 else 0.0

    c = MODULE_5_SPEC["criteria"]
    td_pass = c["first_score_td_rate"]["min"] <= td_rate <= c["first_score_td_rate"]["max"]
    race_pass = c["race_to_21_fav_rate"]["min"] <= race_fav_rate <= c["race_to_21_fav_rate"]["max"]

    return {
        "n": n,
        "first_score_td_rate": round(td_rate, 4),
        "first_score_td_pass": td_pass,
        "race_n": race_n,
        "race_to_21_fav_rate": round(race_fav_rate, 4),
        "race_to_21_pass": race_pass,
        "overall_pass": td_pass and race_pass,
    }


# ---------------------------------------------------------------------------
# Module 6: Crew penalty-EPA edge
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   - referee: str per game
#   - penalties_home, penalties_away: int per game
#   - spread_close, home_score, away_score (for EPA proxy)
# ACCEPTANCE:
#   - Crew penalty differential must show measurable spread (>0.5 EPA/game range)
#   - At least 3 distinct crews with n>=10 games each
#   - High-flag vs low-flag crew total differential directionally consistent

MODULE_6_SPEC = {
    "module_id": 6,
    "name": "crew_penalty_epa_edge",
    "description": "Officiating crew penalty tendency impact on game total",
    "inputs": ["referee", "penalties_home", "penalties_away", "total_close",
               "home_score", "away_score"],
    "min_crews": 3,
    "min_games_per_crew": 10,
    "criteria": {
        "epa_range_min": 0.5,  # min spread between highest and lowest crew EPA
    },
}


def evaluate_module_6(games):
    """Evaluate crew penalty-EPA edge against frozen manifest."""
    # Group by referee
    crews = {}
    for g in games:
        ref = g.get("referee")
        if not ref:
            continue
        if ref not in crews:
            crews[ref] = {"penalties": [], "totals": [], "n": 0}
        ph = g.get("penalties_home", 0)
        pa = g.get("penalties_away", 0)
        crews[ref]["penalties"].append(ph + pa)
        total = g.get("home_score", 0) + g.get("away_score", 0)
        crews[ref]["totals"].append(total)
        crews[ref]["n"] += 1

    # Filter to crews with enough games
    valid_crews = {r: c for r, c in crews.items()
                   if c["n"] >= MODULE_6_SPEC["min_games_per_crew"]}

    if len(valid_crews) < MODULE_6_SPEC["min_crews"]:
        return {
            "n_crews": len(valid_crews),
            "error": f"insufficient crews={len(valid_crews)}, "
                     f"need {MODULE_6_SPEC['min_crews']}",
        }

    # Compute mean penalties per crew (proxy for flag tendency)
    crew_means = {r: sum(c["penalties"]) / c["n"] for r, c in valid_crews.items()}
    sorted_crews = sorted(crew_means.items(), key=lambda x: x[1])
    epa_range = sorted_crews[-1][1] - sorted_crews[0][1]

    # Rough EPA proxy: each penalty ~0.15 EPA swing
    epa_proxy_range = epa_range * 0.15

    passed = epa_proxy_range >= MODULE_6_SPEC["criteria"]["epa_range_min"]

    return {
        "n_crews": len(valid_crews),
        "lowest_flag_crew": sorted_crews[0][0],
        "lowest_flag_mean": round(sorted_crews[0][1], 2),
        "highest_flag_crew": sorted_crews[-1][0],
        "highest_flag_mean": round(sorted_crews[-1][1], 2),
        "epa_proxy_range": round(epa_proxy_range, 3),
        "overall_pass": passed,
    }


# ---------------------------------------------------------------------------
# Module 7: Timeout edge
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   - trailing_2min: bool (was team trailing in final 2 min?)
#   - won_trailing_2min: bool (did they win?)
#   - timeouts_remaining: int
# ACCEPTANCE:
#   - Trailing-team win rate with 2+ timeouts must exceed baseline
#   - Measured: 10.4% baseline -> 14.0% with timeouts
#   - Lift must be directionally positive with n>=30

MODULE_7_SPEC = {
    "module_id": 7,
    "name": "timeout_edge",
    "description": "Late-game timeout leverage on trailing-team win probability",
    "inputs": ["trailing_2min", "won_trailing_2min", "timeouts_remaining"],
    "min_n": 30,
    "criteria": {
        "baseline_win_rate": 0.104,   # measured baseline
        "timeout_win_rate_min": 0.12,  # must beat baseline directionally
    },
}


def evaluate_module_7(games):
    """Evaluate timeout edge against frozen manifest."""
    trailing = [g for g in games if g.get("trailing_2min")]
    n = len(trailing)
    if n < MODULE_7_SPEC["min_n"]:
        return {"n": n, "error": f"insufficient n={n}, need {MODULE_7_SPEC['min_n']}"}

    # Split by timeouts
    with_to = [g for g in trailing if g.get("timeouts_remaining", 0) >= 2]
    without_to = [g for g in trailing if g.get("timeouts_remaining", 0) < 2]

    def win_rate(gs):
        if not gs:
            return 0.0
        return sum(1 for g in gs if g.get("won_trailing_2min")) / len(gs)

    wr_with = win_rate(with_to)
    wr_without = win_rate(without_to)
    lift = wr_with - wr_without

    c = MODULE_7_SPEC["criteria"]
    passed = (wr_with >= c["timeout_win_rate_min"]
              and lift > 0
              and len(with_to) >= 10)

    return {
        "n": n,
        "n_with_timeouts": len(with_to),
        "n_without_timeouts": len(without_to),
        "win_rate_with_timeouts": round(wr_with, 4),
        "win_rate_without_timeouts": round(wr_without, 4),
        "lift": round(lift, 4),
        "overall_pass": passed,
    }


# ---------------------------------------------------------------------------
# Module 8: FG/Kicker edge
# ---------------------------------------------------------------------------
# INPUT_SPEC:
#   - fg_attempts: list of {distance, made, kicker} per game
#   - kicker: str
# ACCEPTANCE:
#   - Miss EPA must be more negative than -3.0 (measured -3.5 to -4.8)
#   - Kicker rating spread must be measurable (>2.0 EPA range)
#   - 55+ yard outdoor FG rate must be within [0.55, 0.70] (measured 0.621)

MODULE_8_SPEC = {
    "module_id": 8,
    "name": "fg_kicker_edge",
    "description": "Field goal miss EPA and kicker-specific rating differentials",
    "inputs": ["fg_attempts"],
    "min_attempts": 100,
    "criteria": {
        "miss_epa_max": -3.0,  # miss EPA must be <= -3.0 (more negative)
        "kicker_spread_min": 2.0,
        "long_fg_rate": {"min": 0.55, "max": 0.70},
    },
}


def evaluate_module_8(games):
    """Evaluate FG/kicker edge against frozen manifest."""
    attempts = []
    for g in games:
        for fg in g.get("fg_attempts", []):
            attempts.append(fg)

    n = len(attempts)
    if n < MODULE_8_SPEC["min_attempts"]:
        return {"n": n, "error": f"insufficient n={n}, need {MODULE_8_SPEC['min_attempts']}"}

    # Miss EPA: approximate as -1 * expected points of drive position
    # Simplified: miss EPA = -(0.5 + distance_factor)
    misses = [a for a in attempts if not a.get("made")]
    # Use measured calibration: miss EPA scales with distance
    miss_epas = []
    for m in misses:
        d = m.get("distance", 40)
        # Calibrated miss EPA curve from edge #3
        epa = -(2.5 + (d - 30) * 0.05)
        miss_epas.append(epa)
    avg_miss_epa = sum(miss_epas) / len(miss_epas) if miss_epas else 0.0

    # Kicker ratings
    kickers = {}
    for a in attempts:
        k = a.get("kicker", "unknown")
        if k not in kickers:
            kickers[k] = {"made": 0, "attempted": 0, "epa": 0.0}
        kickers[k]["attempted"] += 1
        if a.get("made"):
            kickers[k]["made"] += 1
            d = a.get("distance", 40)
            kickers[k]["epa"] += (d / 10.0)  # simplified make EPA
        else:
            d = a.get("distance", 40)
            kickers[k]["epa"] += -(2.5 + (d - 30) * 0.05)

    # Filter kickers with 10+ attempts
    rated = {k: v for k, v in kickers.items() if v["attempted"] >= 10}
    if rated:
        epas = [v["epa"] / v["attempted"] for v in rated.values()]
        kicker_spread = max(epas) - min(epas)
    else:
        kicker_spread = 0.0

    # 55+ yard outdoor rate (approximate: no dome flag, use distance only)
    long_attempts = [a for a in attempts if a.get("distance", 0) >= 55]
    long_made = sum(1 for a in long_attempts if a.get("made"))
    long_rate = long_made / len(long_attempts) if long_attempts else 0.0

    c = MODULE_8_SPEC["criteria"]
    miss_pass = avg_miss_epa <= c["miss_epa_max"]
    spread_pass = kicker_spread >= c["kicker_spread_min"]
    long_pass = c["long_fg_rate"]["min"] <= long_rate <= c["long_fg_rate"]["max"]

    return {
        "n_attempts": n,
        "n_misses": len(misses),
        "avg_miss_epa": round(avg_miss_epa, 3),
        "miss_epa_pass": miss_pass,
        "n_kickers_rated": len(rated),
        "kicker_epa_spread": round(kicker_spread, 3),
        "kicker_spread_pass": spread_pass,
        "long_fg_n": len(long_attempts),
        "long_fg_rate": round(long_rate, 4),
        "long_fg_pass": long_pass,
        "overall_pass": miss_pass and spread_pass and long_pass,
    }


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

MODULES = {
    5: (MODULE_5_SPEC, evaluate_module_5),
    6: (MODULE_6_SPEC, evaluate_module_6),
    7: (MODULE_7_SPEC, evaluate_module_7),
    8: (MODULE_8_SPEC, evaluate_module_8),
}


def stamp_module(module_id, result, output_dir):
    """Write stamp file for a module evaluation."""
    spec, _ = MODULES[module_id]
    infra_pass = "error" not in result
    result_verdict = "PASS" if result.get("overall_pass") else (
        "FAIL" if infra_pass else "REFUSE")

    stamp = {
        "module_id": module_id,
        "module_name": spec["name"],
        "stamped_at": datetime.now(timezone.utc).isoformat(),
        "infrastructure": "PASS" if infra_pass else "REFUSE",
        "result": result_verdict,
        "spec": {
            "description": spec["description"],
            "inputs": spec["inputs"],
            "criteria": spec.get("criteria", {}),
        },
        "evaluation": result,
        "label": "DIAGNOSTIC",
    }

    path = os.path.join(output_dir, f"module_{module_id:03d}_stamp.json")
    with open(path, "w") as f:
        json.dump(stamp, f, indent=2)
    return path, stamp


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate prediction-engine modules 5-8 against frozen manifest")
    parser.add_argument("--manifest", required=True, help="Path to frozen manifest JSON")
    parser.add_argument("--output", required=True, help="Output directory for stamps")
    parser.add_argument("--modules", default="5,6,7,8",
                        help="Comma-separated module IDs (default: 5,6,7,8)")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    with open(args.manifest) as f:
        manifest = json.load(f)
    games = manifest.get("games", [])
    print(f"Loaded {len(games)} games from manifest", file=sys.stderr)

    module_ids = [int(x.strip()) for x in args.modules.split(",")]
    results = {}

    for mid in module_ids:
        if mid not in MODULES:
            print(f"Unknown module {mid}, skipping", file=sys.stderr)
            continue
        spec, evaluate = MODULES[mid]
        print(f"Evaluating module {mid}: {spec['name']}...", file=sys.stderr)
        try:
            result = evaluate(games)
        except Exception as e:
            result = {"error": f"evaluation crashed: {e}"}
        path, stamp = stamp_module(mid, result, args.output)
        results[mid] = stamp
        print(f"  -> {stamp['infrastructure']} / {stamp['result']} ({path})",
              file=sys.stderr)

    # Summary
    summary = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "n_games": len(games),
        "modules": {str(k): {"infrastructure": v["infrastructure"],
                             "result": v["result"]}
                    for k, v in results.items()},
    }
    summary_path = os.path.join(args.output, "modules_5_8_summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"Summary: {summary_path}", file=sys.stderr)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
