#!/usr/bin/env python3
"""Shin vs proportional de-vig on nflverse moneylines (stats-lane V2).

board-export has only marketFairProb — NO per-book American odds. Do NOT
fabricate books. Instead construct 2-way implied from nflverse games.csv
home_moneyline + away_moneyline when both present.

Methods:
  proportional: p_home = q_h / (q_h + q_a)
  Shin: fair probs from bookmaker proportions with insider parameter z,
        p_i(z) = (sqrt(z^2 + 4*(1-z)*q_i^2 / Q) - z) / (2*(1-z))
        z solved by bisection so sum_i p_i(z) = 1.
        If overround Q < 1 (no vig / bad line) → skip row.
  Brier vs realized home-win on REG games.

Kill line (pre-registered):
  Adopt Shin product path ONLY if
    ΔBrier = Brier_proportional − Brier_Shin > 0.002  AND  n >= 272
  (i.e. Shin is better by more than 0.002). Otherwise proportional stays.

Attribution: nflverse / Lee Sharpe schedules, CC BY 4.0. Formula: Shin (1993)
insider-trading de-vig as commonly implemented; documented in payload.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report  # noqa: E402
from opponent_adjusted_epa import opponent_adjusted, sigmoid  # noqa: E402  (helpers on path)

GAMES = Path(r"C:\Users\Garrett\nfl_ot\games.csv")
GAMES_FALLBACK = Path("docs/ops/stats-lane/incoming/nflverse-games.csv")
DEFAULT_OUT = Path("docs/ops/stats-lane/out/shin_vs_proportional_devig.json")

KILL_DELTA = 0.002
KILL_N = 272
KILL_LINE = (
    f"Shin product path only if Brier_prop - Brier_shin > {KILL_DELTA} on n>={KILL_N} "
    f"(Shin better); else proportional stays"
)


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def american_to_prob(ml) -> float | None:
    ml = fnum(ml)
    if ml is None:
        return None
    if ml > 0:
        return 100.0 / (ml + 100.0)
    return (-ml) / ((-ml) + 100.0)


def shin_pair(q_home: float, q_away: float) -> tuple[float, float] | None:
    """Return (p_home, p_away) via Shin; None if overround < 1 or z-solve fails."""
    Q = q_home + q_away
    if Q < 1.0 or q_home <= 0 or q_away <= 0:
        return None
    if Q > 2.5:  # absurd overround → skip rather than invent
        return None

    def shin_sum(z: float) -> float:
        s = 0.0
        for q in (q_home, q_away):
            s += (math.sqrt(z * z + 4.0 * (1.0 - z) * q * q / Q) - z) / (2.0 * (1.0 - z))
        return s

    # shin_sum(z→0) = q_h/sqrt(Q)+q_a/sqrt(Q) = sqrt(Q) >= 1
    # shin_sum increases? At z=0 sum=sqrt(Q)>1; need sum=1 so z must move the
    # terms DOWN. Empirical check: for Q slightly >1, z small; bisect [1e-12, 0.49].
    lo, hi = 1e-12, 0.499999
    s_lo, s_hi = shin_sum(lo), shin_sum(hi)
    # If both sides already below 1 or both above, clamp direction
    if s_lo < 1.0 and s_hi < 1.0:
        # degenerate: return proportional as fallback? NO — skip (do not invent)
        return None
    if s_lo >= 1.0 and s_hi >= 1.0:
        # need higher z — extend conceptually; formula breaks near z=1
        return None
    # Ensure root in (lo, hi): shin_sum should be monotone decreasing in z
    if s_lo < s_hi:
        # unexpected order — swap bounds if root still exists
        if s_hi < 1.0 or s_lo > 1.0:
            return None
        lo, hi = hi, lo
        s_lo, s_hi = s_hi, s_lo
    if not ((s_lo >= 1.0 and s_hi <= 1.0)):
        return None
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        s_mid = shin_sum(mid)
        if abs(s_mid - 1.0) < 1e-10:
            lo = hi = mid
            break
        if s_mid >= 1.0:
            lo = mid
        else:
            hi = mid
    z = 0.5 * (lo + hi)
    if not (0.0 < z < 1.0):
        return None
    try:
        ph = (math.sqrt(z * z + 4.0 * (1.0 - z) * q_home * q_home / Q) - z) / (2.0 * (1.0 - z))
        pa = (math.sqrt(z * z + 4.0 * (1.0 - z) * q_away * q_away / Q) - z) / (2.0 * (1.0 - z))
    except Exception:
        return None
    if not (math.isfinite(ph) and math.isfinite(pa)):
        return None
    if ph <= 0 or pa <= 0:
        return None
    s = ph + pa
    return ph / s, pa / s


def brier(ps: list[float], ys: list[float]) -> float | None:
    if not ps:
        return None
    return sum((p - y) ** 2 for p, y in zip(ps, ys)) / len(ps)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--games", type=Path, default=None)
    args = ap.parse_args()

    games_path = args.games or (GAMES if GAMES.exists() else GAMES_FALLBACK)
    if not games_path.exists():
        payload = {
            "instrument": "shin_vs_proportional_devig",
            "status": "DATA_BLOCKED",
            "need": "nflverse games.csv with home_moneyline and away_moneyline",
            "kill_line": KILL_LINE,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
        write_report(args.out, payload)
        print(json.dumps({"status": "DATA_BLOCKED", "out": str(args.out)}))
        return 1

    n_reg = 0
    n_both_ml = 0
    n_q_lt_1 = 0
    n_q_gt_25 = 0
    n_shin_fail = 0
    n_scored = 0
    p_prop: list[float] = []
    p_shin: list[float] = []
    y_home: list[float] = []
    # paired subset where BOTH methods succeed
    p_prop_pair: list[float] = []
    p_shin_pair: list[float] = []
    y_pair: list[float] = []
    seasons: dict[int, dict] = {}

    with games_path.open(encoding="utf-8") as f:
        for rec in csv.DictReader(f):
            if (rec.get("game_type") or "REG") != "REG":
                continue
            n_reg += 1
            hs, aw = fnum(rec.get("home_score")), fnum(rec.get("away_score"))
            qh = american_to_prob(rec.get("home_moneyline"))
            qa = american_to_prob(rec.get("away_moneyline"))
            if qh is None or qa is None:
                continue
            n_both_ml += 1
            Q = qh + qa
            if Q < 1.0:
                n_q_lt_1 += 1
                continue
            if Q > 2.5:
                n_q_gt_25 += 1
                continue
            if hs is None or aw is None:
                continue
            y = 1.0 if hs > aw else 0.0
            if hs == aw:
                continue  # push — skip
            # proportional always defined when Q>0
            ph_prop = qh / Q
            shin = shin_pair(qh, qa)
            if shin is None:
                n_shin_fail += 1
                # still record proportional-only rows for the prop Brier if we want
                # full-prop sample; paired sample is the duel of record
                p_prop.append(ph_prop)
                y_home.append(y)
                n_scored += 1
                continue
            ph_shin, _pa_shin = shin
            p_prop.append(ph_prop)
            p_shin.append(ph_shin)
            y_home.append(y)
            n_scored += 1
            p_prop_pair.append(ph_prop)
            p_shin_pair.append(ph_shin)
            y_pair.append(y)
            sea = int(fnum(rec.get("season")) or 0)
            slot = seasons.setdefault(sea, {"prop": [], "shin": [], "y": []})
            slot["prop"].append(ph_prop)
            slot["shin"].append(ph_shin)
            slot["y"].append(y)

    brier_prop_all = brier(p_prop, y_home)
    brier_prop_pair = brier(p_prop_pair, y_pair)
    brier_shin_pair = brier(p_shin_pair, y_pair)
    delta = None
    if brier_prop_pair is not None and brier_shin_pair is not None:
        delta = brier_prop_pair - brier_shin_pair

    n_pair = len(y_pair)
    kill_triggered = (
        delta is not None and n_pair >= KILL_N and delta > KILL_DELTA
    )
    if delta is None or n_pair < KILL_N:
        verdict = "INSUFFICIENT_N_OR_SOLVE"
    elif kill_triggered:
        verdict = "ADOPT_SHIN_PRODUCT_PATH"
    else:
        verdict = "PROPORTIONAL_STAYS"

    season_duel = []
    for sea in sorted(seasons):
        slot = seasons[sea]
        if len(slot["y"]) < 30:
            continue
        bp = brier(slot["prop"], slot["y"])
        bs = brier(slot["shin"], slot["y"])
        season_duel.append(
            {
                "season": sea,
                "n": len(slot["y"]),
                "brier_prop": bp,
                "brier_shin": bs,
                "delta_prop_minus_shin": None if bp is None or bs is None else bp - bs,
            }
        )

    payload = {
        "instrument": "shin_vs_proportional_devig",
        "status": "ok",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "games_csv": str(games_path),
        "board_export_per_book_odds": False,
        "note_no_fabrication": (
            "board-export lacks per-book American odds; 2-way implied built only from "
            "nflverse home_moneyline/away_moneyline when both present."
        ),
        "formula_shin": (
            "p_i(z) = (sqrt(z^2 + 4*(1-z)*q_i^2/Q) - z) / (2*(1-z)); "
            "z bisected so sum p_i = 1; skip if Q < 1 or Q > 2.5 or z-solve fails; "
            "pair-normalize only after solve (not proportional reinjection)."
        ),
        "formula_prop": "p_home = q_h / (q_h + q_away)",
        "population": "nflverse REG games, both MLs present, scores present, no ties",
        "n_reg": n_reg,
        "n_both_ml": n_both_ml,
        "n_overround_lt_1_skipped": n_q_lt_1,
        "n_overround_gt_2_5_skipped": n_q_gt_25,
        "n_shin_solve_fail_skipped": n_shin_fail,
        "n_scored_any": n_scored,
        "n_paired_duel": n_pair,
        "brier_proportional_all_scored": brier_prop_all,
        "brier_proportional_paired": brier_prop_pair,
        "brier_shin_paired": brier_shin_pair,
        "delta_brier_prop_minus_shin": delta,
        "home_win_rate_paired": (sum(y_pair) / n_pair) if n_pair else None,
        "kill_line": KILL_LINE,
        "kill_triggered": kill_triggered,
        "verdict": verdict,
        "season_duel": season_duel,
        "replacement_path": (
            "Keep proportional de-vig as the product default unless ADOPT_SHIN. "
            "MarketFairProb on the board remains the engine-facing de-vigged p; "
            "this duel only chooses the de-vig FORMULA when recomputing from raw MLs."
        ),
        "helpers_on_path": [
            "stats_json.write_report",
            "opponent_adjusted_epa.opponent_adjusted",
            "opponent_adjusted_epa.sigmoid",
        ],
    }
    write_report(args.out, payload)
    print(
        json.dumps(
            {
                "instrument": "shin_vs_proportional_devig",
                "status": "ok",
                "n_pair": n_pair,
                "brier_prop": brier_prop_pair,
                "brier_shin": brier_shin_pair,
                "delta": delta,
                "kill_triggered": kill_triggered,
                "verdict": verdict,
                "out": str(args.out),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
