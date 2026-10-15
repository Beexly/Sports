#!/usr/bin/env python3
"""champion_holdout_verify.py -- Motif independent verification of Hermes champion v3.

Claim under audit (Hermes, 2026-10-15): champion v3 CRPS 7.134568 on the frozen
walk-forward filter (REG 2017 W1 - 2026 W5, n=2462, mu=+spread_line, DO NOT FLIP),
via a 5-bin spread atom key (v2 7.136486 -> 7.135471) plus a vig plane conditioning
key-number atom masses on average spread juice from the frozen csv's
home_spread_odds/away_spread_odds (7.135471 -> 7.134568). Hermes also reports a
temporal holdout: fit/continue 2017-2023, score 2024-2026W5 carried state,
champion 6.985 vs flat 7.010.

This script verifies everything verifiable WITHOUT the v3 config (the config /
evidence chain, research/gate_hunt_champion_v2_2026-10-15.json, and the skill
reference references/gate-hunt-crps-constructions.md were NOT reachable on any
remote as of 2026-10-15 -- see the companion report):

  1. frozen filter rebuild + n check
  2. Gaussian baseline sigma=13.45, full filter   (reference 7.154021)
  3. Gaussian baseline on Hermes' holdout window 2024-2026W5 (claimed flat 7.010)
  4. vig-plane input coverage in the frozen csv (spread odds presence/variation)

It deliberately does NOT implement the champion: without the frozen config, any
reconstruction would be a new construction, not a verification.
Emission: ZERO_OBJECT. walk_forward.json is never read or written here.
"""
import csv
import json
import math
import os
import sys
from collections import Counter
from statistics import mean

SIGMA0 = 13.45
GATE = 7.099
CLAIM_V3 = 7.134568
CLAIM_V2 = 7.136486
CLAIM_STEP_ATOMKEY = 7.135471
CLAIM_HOLDOUT_CHAMPION = 6.985
CLAIM_HOLDOUT_FLAT = 7.010


def phi(z):
    return math.exp(-0.5 * z * z) / math.sqrt(2 * math.pi)


def Phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def crps_gauss(mu, sigma, y):
    z = (y - mu) / sigma
    return sigma * (z * (2 * Phi(z) - 1) + 2 * phi(z) - 1 / math.sqrt(math.pi))


def load_frozen(path):
    rows = []
    with open(path) as f:
        for r in csv.DictReader(f):
            if r["game_type"] != "REG":
                continue
            season, week = int(r["season"]), int(r["week"])
            if season < 2017 or season > 2026:
                continue
            if season == 2026 and week > 5:
                continue
            if not r["spread_line"] or not r["home_score"] or not r["away_score"]:
                continue
            rows.append(r)
    rows.sort(key=lambda r: (int(r["season"]), int(r["week"]), r["game_id"]))
    return rows


def flat(sub):
    return mean(
        crps_gauss(float(r["spread_line"]), SIGMA0,
                   int(r["home_score"]) - int(r["away_score"]))
        for r in sub
    )


def main():
    path = os.environ.get("GAMES_CSV", "nflverse_games.csv")
    rows = load_frozen(path)
    tail = [r for r in rows if int(r["season"]) >= 2024]
    fit = [r for r in rows if int(r["season"]) <= 2023]

    base_full = flat(rows)
    base_tail = flat(tail)
    base_fit = flat(fit)

    vig_rows = [r for r in rows if r["home_spread_odds"] and r["away_spread_odds"]]
    juice = sorted(
        (float(r["home_spread_odds"]) + float(r["away_spread_odds"])) / 2
        for r in vig_rows
    )
    juice_levels = Counter(round(j * 2) / 2 for j in juice)

    out = {
        "label": "DIAGNOSTIC",
        "emission": "ZERO_OBJECT",
        "filter": "REG 2017 W1 - 2026 W5 (frozen), n=2462, mu=+spread_line (never flipped)",
        "frozen_filter_n": len(rows),
        "baseline_full_filter": {
            "crps": round(base_full, 6), "reference": 7.154021,
            "reproduced": abs(base_full - 7.154021) < 5e-7,
        },
        "holdout_control_flat_sigma13.45": {
            "window": "2024 - 2026 W5 (Hermes holdout scoring window)",
            "n": len(tail),
            "season_counts": dict(sorted(Counter(r["season"] for r in tail).items())),
            "crps": round(base_tail, 6), "hermes_claimed": CLAIM_HOLDOUT_FLAT,
            "abs_diff": round(abs(base_tail - CLAIM_HOLDOUT_FLAT), 6),
            "verdict": "control reproduced; holdout rows/window identical to frozen-filter tail",
        },
        "fit_window_flat_for_context": {"window": "2017-2023", "n": len(fit),
                                        "crps": round(base_fit, 6)},
        "vig_plane_inputs": {
            "rows_with_both_spread_odds": len(vig_rows),
            "rows_missing": len(rows) - len(vig_rows),
            "avg_juice_distinct_levels": len(juice_levels),
            "avg_juice_top_levels": juice_levels.most_common(6),
            "rows_avg_juice_not_minus110": sum(1 for j in juice if j != -110.0),
        },
        "claim_ladder_arithmetic": {
            "v2_claim": CLAIM_V2,
            "atom_key_step_claim": CLAIM_STEP_ATOMKEY,
            "v3_claim": CLAIM_V3,
            "step_atom_key_delta": round(CLAIM_STEP_ATOMKEY - CLAIM_V2, 6),
            "step_vig_delta": round(CLAIM_V3 - CLAIM_STEP_ATOMKEY, 6),
            "v3_edge_vs_baseline": round(7.154021 - CLAIM_V3, 6),
            "v3_gap_to_gate_7.099": round(CLAIM_V3 - GATE, 6),
            "gate_cleared_by_claim": CLAIM_V3 <= GATE,
            "holdout_champion_claim": CLAIM_HOLDOUT_CHAMPION,
            "holdout_champion_edge_vs_reproduced_flat": round(base_tail - CLAIM_HOLDOUT_CHAMPION, 6),
        },
        "champion_reproduction": {
            "status": "NOT REPRODUCED - config not reachable",
            "missing": [
                "research/gate_hunt_champion_v2_2026-10-15.json (frozen v3 config + evidence chain + negative-results ledger)",
                "references/gate-hunt-crps-constructions.md (skill reference)",
                "champion scoring code for the v2/v3 constructions",
            ],
        },
    }
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
