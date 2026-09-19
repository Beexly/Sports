#!/usr/bin/env python3
"""Adj-EPA vs market fair — Brier duel on board-export NFL rows (kill-line instrument).

Pre-registered kill: wire adj-EPA to mint only if Brier_adjEPA < Brier_market - 0.002
on n>=272 settled NFL rows. This script measures what it CAN on the current export
(NFL ML/spread rows); thin cells report NOT_RUN / UNDERPOWERED honestly.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402

NFL_ABBR = {
    "cardinals": "ARI", "falcons": "ATL", "ravens": "BAL", "bills": "BUF", "panthers": "CAR",
    "bears": "CHI", "bengals": "CIN", "browns": "CLE", "cowboys": "DAL", "broncos": "DEN",
    "lions": "DET", "packers": "GB", "texans": "HOU", "colts": "IND", "jaguars": "JAX",
    "chiefs": "KC", "chargers": "LAC", "rams": "LA", "dolphins": "MIA", "vikings": "MIN",
    "patriots": "NE", "saints": "NO", "giants": "NYG", "jets": "NYJ", "eagles": "PHI",
    "steelers": "PIT", "seahawks": "SEA", "49ers": "SF", "buccaneers": "TB", "titans": "TEN",
    "commanders": "WAS", "washington": "WAS", "chargers": "LAC",
}


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def abbr_from_name(s):
    t = re.sub(r"[^a-z0-9]+", " ", str(s or "").lower()).strip()
    for k, v in NFL_ABBR.items():
        if k in t:
            return v
    return None


def sigmoid(margin, scale=0.12):
    return 1 / (1 + math.exp(-margin / scale))


def brier(pairs):
    if not pairs:
        return None
    return sum((p - y) ** 2 for p, y in pairs) / len(pairs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--export", required=True)
    ap.add_argument("--ratings", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    export = Path(args.export)
    ratings_path = Path(args.ratings)
    if not export.exists() or not ratings_path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    rat = json.loads(ratings_path.read_text(encoding="utf-8"))
    R = {r["team"]: r["overall"] for r in rat.get("ratings_overall") or []}
    rows = [json.loads(l) for l in export.read_text(encoding="utf-8").splitlines() if l.strip()]

    # MVP: NFL ML where we can name home+away abbr and have mfp + result
    market_pairs, adj_pairs = [], []
    detail = []
    for r in rows:
        if str(r.get("pickType") or "").upper() != "MONEYLINE":
            continue
        if resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection")) != "NFL":
            continue
        if r.get("result") not in ("WIN", "LOSS"):
            continue
        home = abbr_from_name(r.get("homeTeam") or r.get("homeTeamName") or "")
        away = abbr_from_name(r.get("awayTeam") or r.get("awayTeamName") or "")
        if not home or not away or home not in R or away not in R:
            continue
        y = 1 if r["result"] == "WIN" else 0
        mfp = fnum(r.get("marketFairProb"))
        # adj-EPA p for PICKED side
        sel = str(r.get("selection") or "").lower()
        if home.lower().split()[0] in sel or any(k in sel for k in home.lower().split() if len(k) > 3):
            p_adj_home = sigmoid(R[home] - R[away] + 0.025)
            p_adj = p_adj_home
            side = "home"
        else:
            p_adj_home = sigmoid(R[home] - R[away] + 0.025)
            p_adj = 1 - p_adj_home
            side = "away"
        if mfp is not None and 0 < mfp < 1:
            market_pairs.append((mfp, y))
        adj_pairs.append((min(1 - 1e-6, max(1e-6, p_adj)), y))
        detail.append({"selection": r.get("selection"), "home": home, "away": away, "side": side, "y": y, "mfp": mfp, "p_adj": p_adj, "result": r["result"]})

    n = len(adj_pairs)
    report = {
        "ok": True,
        "ratings_source": rat.get("source"),
        "n_nfl_ml_joined": n,
        "n_with_market_p": len(market_pairs),
        "brier_adj_epa": brier(adj_pairs),
        "brier_market": brier(market_pairs),
        "kill_line": "Wire adj-EPA iff Brier_adjEPA < Brier_market - 0.002 on n>=272",
        "verdict": (
            "UNDERPOWERED_n_lt_272"
            if n < 272
            else "ADJ_EPA_WIRES"
            if brier(adj_pairs) is not None
            and brier(market_pairs) is not None
            and brier(adj_pairs) < brier(market_pairs) - 0.002
            else "ADJ_EPA_RESEARCH_ONLY"
            if brier(adj_pairs) is not None and brier(market_pairs) is not None
            else "INCOMPLETE"
        ),
        "detail_sample": detail[:20],
        "note": "Export season mix vs 2024/2025 ratings — join year mismatch possible; document when export years known",
    }
    write_report(Path(args.out), report)
    print(dumps_report({"ok": True, "out": str(args.out), "n": n, "brier_adj": report["brier_adj_epa"], "brier_mkt": report["brier_market"], "verdict": report["verdict"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
