#!/usr/bin/env python3
"""MIMO-7 Contextual underdog / moneyline turnaround harness.

Gemini directive: test whether rest + trench + backup-QB situational conditioning
flips underdog ML CLV above 52.4% (vs 14.2% all-ML baseline).

What we CAN join tonight:
  - board-export ML + clvVerdict
  - nflverse games.csv home_rest / away_rest (NFL)
  - available signals on 0826ea2f1 (names only until evaluator join exists)

Underdog definition (pre-registered):
  U1: marketFairProb present and < 0.50 (chosen side underdog by de-vig)
  U2: selection matches /\+\d{2,}/ (positive American in selection text)
  U3: book-priced ML with mfp < 0.55 (looser)
  Baseline: all ML non-push CLV
Kill line: situational filter passes only if non-push CLV >= 0.524 AND Wilson LB > 0.40 AND n>=30.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402

PLUS_RE = re.compile(r"\+(\d{2,})")
TARGET = 0.524


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def wilson(p, n, z=1.96):
    if n <= 0:
        return [None, None]
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / d
    return [max(0.0, c - h), min(1.0, c + h)]


def clv_np(rows):
    sub = [r for r in rows if r.get("clvVerdict") in ("BEAT_CLOSE", "LOST_TO_CLOSE")]
    if not sub:
        return {"n": 0, "beat": 0, "rate": None, "wilson95": [None, None], "verdict": "THIN"}
    beat = sum(1 for r in sub if r.get("clvVerdict") == "BEAT_CLOSE")
    p = beat / len(sub)
    lo, hi = wilson(p, len(sub))
    if len(sub) < 30:
        verdict = "THIN_n_lt_30"
    elif p >= TARGET and lo is not None and lo > 0.40:
        verdict = "PASSES_52.4_and_LB_gt_0.40"
    elif p >= TARGET:
        verdict = "POINT_GE_52.4_LB_not_clear"
    else:
        verdict = "FAIL_below_52.4"
    return {
        "n": len(sub),
        "beat": beat,
        "matched_close": sum(1 for r in rows if r.get("clvVerdict") == "MATCHED_CLOSE"),
        "lost_close": sum(1 for r in sub if r.get("clvVerdict") == "LOST_TO_CLOSE"),
        "rate": p,
        "wilson95": [lo, hi],
        "verdict": verdict,
    }


def norm_team(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s or "").lower()).strip()


def load_nflverse_rest(path):
    """Map (season, home_abbr or name, away) -> rest. Also team-season games for date join."""
    rows = []
    if not path.exists():
        return rows
    with path.open(encoding="utf-8") as f:
        for rec in csv.DictReader(f):
            try:
                season = int(float(rec.get("season") or 0))
            except Exception:
                continue
            rows.append(
                {
                    "season": season,
                    "gameday": rec.get("gameday"),
                    "home": rec.get("home_team"),
                    "away": rec.get("away_team"),
                    "home_rest": fnum(rec.get("home_rest")),
                    "away_rest": fnum(rec.get("away_rest")),
                    "spread_line": fnum(rec.get("spread_line")),
                    "roof": rec.get("roof"),
                    "espn": rec.get("espn"),
                    "game_type": rec.get("game_type"),
                }
            )
    return rows


def join_rest(row, nfl_rows):
    """Best-effort: match NFL home/away abbrev or full names + kickoff date."""
    sport = resolve_sport(row.get("sport"), row.get("espnEventId"), row.get("selection"))
    if sport != "NFL":
        return None
    home = norm_team(row.get("homeTeam") or row.get("homeTeamName"))
    away = norm_team(row.get("awayTeam") or row.get("awayTeamName"))
    kick = row.get("commenceTime") or ""
    day = kick[:10]
    if not home:
        return None
    # nflverse uses abbreviations MIN/ATL; board may use full names — try token overlap
    for g in nfl_rows:
        if g["season"] < 2020:
            continue
        if day and g.get("gameday") and day[:10] != str(g["gameday"])[:10]:
            continue
        gh, ga = norm_team(g["home"]), norm_team(g["away"])
        if not gh or not home:
            continue
        # abbrev match or prefix
        mh = home.startswith(gh) or gh.startswith(home[:3]) or (len(gh) <= 4 and gh in home)
        ma = away.startswith(ga) or (len(ga) <= 4 and ga in away) if away and ga else False
        if mh and (ma or not away):
            picked = str(row.get("selection") or "")
            # rest edge from perspective of picked side
            if home and home in picked.lower():
                rest_edge = (g["home_rest"] or 0) - (g["away_rest"] or 0)
                side = "home"
            elif away and away in picked.lower():
                rest_edge = (g["away_rest"] or 0) - (g["home_rest"] or 0)
                side = "away"
            else:
                rest_edge = (g["home_rest"] or 0) - (g["away_rest"] or 0)
                side = "unknown"
            return {
                "rest_edge": rest_edge,
                "rest_side": side,
                "home_rest": g["home_rest"],
                "away_rest": g["away_rest"],
                "nflverse_home": g["home"],
                "nflverse_away": g["away"],
                "spread_line": g["spread_line"],
                "roof": g["roof"],
            }
    return None


def underdog_flags(row):
    mfp = fnum(row.get("marketFairProb"))
    sel = str(row.get("selection") or "")
    m = PLUS_RE.search(sel)
    flags = []
    if mfp is not None and mfp < 0.50:
        flags.append("U1_mfp_lt_0.50")
    if m:
        flags.append(f"U2_selection_plus_{m.group(1)}")
    if mfp is not None and mfp < 0.55:
        flags.append("U3_mfp_lt_0.55")
    if "model signal" in sel.lower():
        flags.append("signal_slate")
    return flags, mfp, (int(m.group(1)) if m else None)


def situational_features(row, rest):
    """Available situational flags tonight."""
    feat = {}
    if rest:
        feat["rest_edge"] = rest["rest_edge"]
        feat["rest_ge_3"] = rest["rest_edge"] is not None and rest["rest_edge"] >= 3
        feat["rest_ge_2"] = rest["rest_edge"] is not None and rest["rest_edge"] >= 2
        feat["short_week_opp"] = rest["rest_edge"] is not None and rest["rest_edge"] >= 1  # we rest more => opp shorter
    # proxy trench/backup-QB from signal names only — NOT evaluated on export
    feat["trench_signal_available"] = True  # offensive-line-continuity.ts exists
    feat["backup_qb_signal_available"] = True  # backup-qb-target-distribution.ts exists
    feat["signals_evaluated_on_row"] = False  # no join key for 26-signal scores on export
    return feat


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--board", required=True)
    ap.add_argument("--nflverse", default=r"C:\Users\Garrett\nfl_ot\games.csv")
    ap.add_argument("--signals-dir", default="")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    board_path = Path(args.board)
    if not board_path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rows = [json.loads(l) for l in board_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    ml = [r for r in rows if str(r.get("pickType") or "").upper() == "MONEYLINE"]
    nfl = load_nflverse_rest(Path(args.nflverse))

    # annotate
    for r in ml:
        flags, mfp, plus = underdog_flags(r)
        r["_flags"] = flags
        r["_mfp"] = mfp
        r["_plus"] = plus
        r["_sport"] = resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection"))
        r["_rest"] = join_rest(r, nfl)
        r["_feat"] = situational_features(r, r["_rest"])

    # inventory
    flag_counts = defaultdict(int)
    for r in ml:
        for f in r["_flags"]:
            flag_counts[f.split("_plus_")[0] if "plus" in f else f] += 1

    baseline = clv_np(ml)
    book_ml = [r for r in ml if r.get("bookmakerCount") not in (None, "", 0) and fnum(r.get("bookmakerCount")) is not None and int(fnum(r.get("bookmakerCount")) or 0) >= 1]
    # underdog pools
    u1 = [r for r in ml if any(f.startswith("U1") for f in r["_flags"])]
    u2 = [r for r in ml if any(f.startswith("U2") for f in r["_flags"])]
    u3 = [r for r in ml if any(f.startswith("U3") for f in r["_flags"])]
    book_u1 = [r for r in book_ml if any(f.startswith("U1") for f in r["_flags"])]

    # situational filters on whatever pool we can
    def filt_rest_ge(pool, k=2):
        return [r for r in pool if r.get("_rest") and r["_rest"].get("rest_edge") is not None and r["_rest"]["rest_edge"] >= k]

    nfl_ml = [r for r in ml if r["_sport"] == "NFL"]
    nfl_ml_rest = [r for r in nfl_ml if r.get("_rest")]

    pools = {
        "ALL_ML": ml,
        "BOOK_PRICED_ML": book_ml,
        "U1_mfp_lt_0.50": u1,
        "U2_selection_plus_american": u2,
        "U3_mfp_lt_0.55": u3,
        "BOOK_AND_U1": book_u1,
        "NFL_ML_all": nfl_ml,
        "NFL_ML_rest_joined": nfl_ml_rest,
        "NFL_ML_rest_edge_ge_2": filt_rest_ge(nfl_ml, 2),
        "NFL_ML_rest_edge_ge_3": filt_rest_ge(nfl_ml, 3),
        "ALL_ML_rest_joined": [r for r in ml if r.get("_rest")],
        "ALL_ML_rest_edge_ge_2": filt_rest_ge(ml, 2),
        "signal_slate_ML": [r for r in ml if any("signal_slate" in f for f in r["_flags"])],
        "book_not_signal_ML": [r for r in ml if not any("signal_slate" in f for f in r["_flags"])],
    }

    results = {name: clv_np(pool) | {"n_pool": len(pool)} for name, pool in pools.items()}

    # Gemini named examples — search selection text
    named = [
        r
        for r in ml
        if re.search(r"panther|giant", str(r.get("selection") or "") + str(r.get("homeTeam") or "") + str(r.get("awayTeam") or ""), re.I)
    ]
    named_res = [
        {
            "selection": r.get("selection"),
            "mfp": r.get("_mfp"),
            "plus": r.get("_plus"),
            "clvVerdict": r.get("clvVerdict"),
            "rest": r.get("_rest"),
            "flags": r.get("_flags"),
        }
        for r in named[:20]
    ]

    # 26 signals inventory
    sig_dir = Path(args.signals_dir) if args.signals_dir else Path(
        r"C:\Users\Garrett\Sports\.worktrees\signal-arch-typecheck\packages\prediction-engine\src\signals"
    )
    signals = []
    if sig_dir.exists():
        signals = sorted(p.stem for p in sig_dir.glob("*.ts") if not p.stem.endswith(".test"))

    # best passing filter
    passing = {k: v for k, v in results.items() if str(v.get("verdict", "")).startswith("PASSES")}
    report = {
        "ok": True,
        "task": "MIMO-7 contextual underdog ML turnaround",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "n_ml": len(ml),
        "flag_counts": dict(flag_counts),
        "baseline_all_ml": baseline,
        "target_clv": TARGET,
        "kill_line": "Filter passes iff non-push CLV>=0.524 AND Wilson LB>0.40 AND n>=30",
        "pools": results,
        "passing_filters": passing,
        "named_2026_09_13_examples": named_res,
        "signals_dir": str(sig_dir),
        "signals_on_0826ea2f1": signals,
        "n_signals": len(signals),
        "join_status": {
            "nflverse_rest": "JOINED for subset NFL ML via team/date",
            "trench_ol_continuity": "SIGNAL MODULE EXISTS — not scored on export rows (no player-game join)",
            "backup_qb": "SIGNAL MODULE EXISTS — not scored on export rows",
            "underdog_pool": (
                "U1 empty or tiny on this export — most priced ML are favorites (mfp>=0.5) or null mfp signal-slate"
            ),
        },
        "mimo7_verdict": (
            "INSUFFICIENT_UNDERDOG_CLV_POOL"
            if not passing and (len(u1) + len(book_u1) + len(filt_rest_ge(nfl_ml, 2))) < 30
            else "SEE_passing_filters"
            if passing
            else "NO_FILTER_PASSES_52.4"
        ),
        "replacement_path": [
            "Join 26-signal evaluator scores to pickId/gameId when signal runner emits rows",
            "Add entryOdds/American + publicMlImpliedProb to export for true underdog definition",
            "Rest-edge NFL subset is the only situational axis measurable tonight",
            "Do not claim underdog turnaround without n>=30 non-push on the filtered pool",
        ],
    }
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": True,
                "out": str(args.out),
                "n_ml": len(ml),
                "baseline": baseline,
                "u1_n": len(u1),
                "u2_n": len(u2),
                "nfl_rest_n": len(nfl_ml_rest),
                "flag_counts": dict(flag_counts),
                "mimo7_verdict": report["mimo7_verdict"],
                "passing": list(passing.keys()),
            }
        )
    )
    for k, v in results.items():
        if v.get("n", 0) or v.get("n_pool"):
            print(f"  {k:32s} pool={v.get('n_pool')} np={v.get('n')} rate={v.get('rate')} {v.get('verdict')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
