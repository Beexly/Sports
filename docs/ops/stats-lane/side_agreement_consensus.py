#!/usr/bin/env python3
"""Side-agreement consensus replacement instrument (stats-lane V2).

Ports the IDEA of GSE2 consensus.ts (weighted mean + dispersion + agreement)
WITHOUT inventing multi-book odds. board-export.jsonl carries no per-book
prices — only bookmakerCount, marketFairProb, confidence, rankingP.

Measured proxies on decided PRE-GAME non-bootstrap rows:
  bookmakerCount, marketFairProb, rankingP, confidence/100

Each score is binned; Spearman(rank of score-bin center, bin hit rate) is the
ordering metric. Kill line (pre-registered):
  if spearman(bookmakerCount) is NOT better than spearman(marketFairProb),
  book depth stays DISPLAY-ONLY and is never an ordering key.

MLB SPREAD replacement metric: document that consensusPct is structurally
pinned at 1.0 on run lines (AGENTS.md); the only available depth proxy is
bookmakerCount, which this instrument tests against marketFairProb.

Attribution: board-export = product export; GSE2 consensus.ts idea only.
Data laws: no DB, no fabricated per-book odds, no gate flips.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report  # noqa: E402
from opponent_adjusted_epa import opponent_adjusted, sigmoid  # noqa: E402  (helpers on path)

EXPORT = Path("docs/ops/stats-lane/incoming/board-export.jsonl")
DEFAULT_OUT = Path("docs/ops/stats-lane/out/side_agreement_consensus.json")

KILL_LINE = (
    "if spearman(bookmakerCount) is NOT better than spearman(marketFairProb) "
    "on decided pre-game rows, book depth stays DISPLAY-ONLY (never an ordering key)"
)

SCORES = ("bookmakerCount", "marketFairProb", "rankingP", "confidence100")


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def average_ranks(vals: list[float]) -> list[float]:
    n = len(vals)
    order = sorted(range(n), key=lambda i: vals[i])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and vals[order[j + 1]] == vals[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def spearman(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 3 or len(xs) != len(ys):
        return None
    rx, ry = average_ranks(xs), average_ranks(ys)
    mx, my = mean(rx), mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    dx = math.sqrt(sum((a - mx) ** 2 for a in rx))
    dy = math.sqrt(sum((b - my) ** 2 for b in ry))
    if dx <= 0 or dy <= 0:
        return None
    return num / (dx * dy)


def bin_ordering(score_hit_pairs: list[tuple[float, float]], n_bins: int = 5):
    """Bin by score quantiles; return spearman(bin_score_mean, bin_hit_rate) + bin table."""
    pairs = [(s, y) for s, y in score_hit_pairs if s is not None]
    if len(pairs) < n_bins * 3:
        return None, []
    pairs.sort(key=lambda t: t[0])
    n = len(pairs)
    # quantile bins by rank
    bins = []
    for b in range(n_bins):
        lo = (b * n) // n_bins
        hi = ((b + 1) * n) // n_bins
        if hi <= lo:
            continue
        chunk = pairs[lo:hi]
        sc = mean(s for s, _ in chunk)
        hr = mean(y for _, y in chunk)
        bins.append({"bin": b, "n": len(chunk), "score_mean": sc, "hit_rate": hr})
    if len(bins) < 3:
        return None, bins
    rho = spearman([b["score_mean"] for b in bins], [b["hit_rate"] for b in bins])
    return rho, bins


def is_pre_game(row: dict) -> bool:
    """True if generatedAt is strictly before commenceTime (or commence missing → keep)."""
    ga = row.get("generatedAt")
    ct = row.get("commenceTime")
    if not ga or not ct:
        return True  # cannot tell → keep (honest silence rule)
    try:
        g = datetime.fromisoformat(ga.replace("Z", "+00:00"))
        c = datetime.fromisoformat(ct.replace("Z", "+00:00"))
        return g < c
    except Exception:
        return True


def load_decided_pregame(path: Path) -> list[dict]:
    rows = []
    for line in path.open(encoding="utf-8"):
        line = line.strip()
        if not line:
            continue
        o = json.loads(line)
        if o.get("isBootstrap"):
            continue
        if o.get("result") not in ("WIN", "LOSS"):
            continue
        if not is_pre_game(o):
            continue
        conf = fnum(o.get("confidence"))
        rp = fnum(o.get("rankingP"))
        mfp = fnum(o.get("marketFairProb"))
        books = fnum(o.get("bookmakerCount"))
        y = 1.0 if o.get("result") == "WIN" else 0.0
        rows.append(
            {
                "sport": o.get("sport"),
                "pickType": o.get("pickType"),
                "modelVersion": o.get("modelVersion"),
                "y": y,
                "bookmakerCount": books,
                "marketFairProb": mfp,
                "rankingP": rp,
                "confidence100": (conf / 100.0) if conf is not None else None,
            }
        )
    return rows


def score_report(rows: list[dict], score_key: str) -> dict:
    pairs = [(r[score_key], r["y"]) for r in rows if r.get(score_key) is not None]
    n = len(pairs)
    if n < 20:
        return {"score": score_key, "n": n, "spearman_bin_hit": None, "bins": [], "status": "thin"}
    rho, bins = bin_ordering(pairs, n_bins=5)
    return {
        "score": score_key,
        "n": n,
        "spearman_bin_hit": rho,
        "bins": bins,
        "status": "ok" if rho is not None else "bins_insufficient",
    }


def cell_reports(rows: list[dict]) -> list[dict]:
    cells: dict[tuple, list[dict]] = defaultdict(list)
    for r in rows:
        cells[(r["sport"], r["pickType"])].append(r)
    out = []
    for (sport, ptype), cell in sorted(cells.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        if len(cell) < 30:
            out.append(
                {
                    "sport": sport,
                    "pickType": ptype,
                    "n": len(cell),
                    "status": "thin",
                    "best_proxy": None,
                    "spearman": {k: None for k in SCORES},
                }
            )
            continue
        sp = {}
        for k in SCORES:
            pairs = [(r[k], r["y"]) for r in cell if r.get(k) is not None]
            if len(pairs) < 20:
                sp[k] = None
                continue
            rho, _ = bin_ordering(pairs, n_bins=min(5, max(3, len(pairs) // 8)))
            sp[k] = rho
        ranked = sorted(
            ((k, v) for k, v in sp.items() if v is not None),
            key=lambda kv: kv[1],
            reverse=True,
        )
        out.append(
            {
                "sport": sport,
                "pickType": ptype,
                "n": len(cell),
                "status": "ok",
                "spearman": sp,
                "best_proxy": ranked[0][0] if ranked else None,
                "best_spearman": ranked[0][1] if ranked else None,
            }
        )
    return out


def mlb_spread_defect_block(rows: list[dict]) -> dict:
    """MLB SPREAD: consensusPct is structurally pinned on run lines (AGENTS.md).

    Replacement metric proposal (measured, not fabricated):
      rank MLB SPREAD decided pre-game by marketFairProb (and rankingP) vs
      bookmakerCount; report each Spearman + the spread of bookmakerCount.
    """
    cell = [r for r in rows if r["sport"] == "MLB" and r["pickType"] == "SPREAD"]
    books = [r["bookmakerCount"] for r in cell if r["bookmakerCount"] is not None]
    report = score_report(cell, "bookmakerCount")
    mfp = score_report(cell, "marketFairProb")
    rp = score_report(cell, "rankingP")
    conf = score_report(cell, "confidence100")
    uniq_books = sorted(set(int(b) for b in books)) if books else []
    return {
        "defect": (
            "consensusPct pinned at 1.0000 on MLB run lines — every book posts line 1.5, "
            "so 'agreement on the number' is true by construction and says nothing about "
            "which side books favour. AGENTS.md: do not suppress the number; recompute as "
            "side-agreement OR stop claiming consensus on a structurally-constant input."
        ),
        "available_proxy_in_export": "bookmakerCount only (no per-book side prices)",
        "n_mlb_spread": len(cell),
        "bookmakerCount_unique": uniq_books,
        "bookmakerCount_spearman": report.get("spearman_bin_hit"),
        "marketFairProb_spearman": mfp.get("spearman_bin_hit"),
        "rankingP_spearman": rp.get("spearman_bin_hit"),
        "confidence100_spearman": conf.get("spearman_bin_hit"),
        "replacement_path": (
            "Order MLB SPREAD on marketFairProb / rankingP (or independentEdge "
            "expectedClv when present). Treat bookmakerCount as display-only unless "
            "its Spearman exceeds marketFairProb — which this instrument tests."
        ),
        "note": (
            "True side-agreement consensus needs per-book prices; export lacks them. "
            "This is a proxy test, not a consensus rebuild."
        ),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--export", type=Path, default=EXPORT)
    args = ap.parse_args()

    if not args.export.exists():
        payload = {
            "instrument": "side_agreement_consensus",
            "status": "DATA_BLOCKED",
            "need": str(args.export),
            "kill_line": KILL_LINE,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
        write_report(args.out, payload)
        print(json.dumps({"status": "DATA_BLOCKED", "out": str(args.out)}))
        return 1

    rows = load_decided_pregame(args.export)
    pooled = {k: score_report(rows, k) for k in SCORES}
    cells = cell_reports(rows)
    mlb = mlb_spread_defect_block(rows)

    books_rho = pooled["bookmakerCount"].get("spearman_bin_hit")
    mfp_rho = pooled["marketFairProb"].get("spearman_bin_hit")
    if books_rho is None or mfp_rho is None:
        kill_triggered = None
        verdict = "INSUFFICIENT_N_FOR_KILL"
    else:
        kill_triggered = not (books_rho > mfp_rho)
        verdict = "DEPTH_DISPLAY_ONLY" if kill_triggered else "DEPTH_ORDERS_BETTER_THAN_MFP"

    # Positive path regardless of kill: which proxy orders best pooled?
    candidates = [
        (k, pooled[k].get("spearman_bin_hit"))
        for k in SCORES
        if pooled[k].get("spearman_bin_hit") is not None
    ]
    candidates.sort(key=lambda kv: kv[1], reverse=True)
    best_proxy = candidates[0][0] if candidates else None
    best_rho = candidates[0][1] if candidates else None

    payload = {
        "instrument": "side_agreement_consensus",
        "status": "ok",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "export": str(args.export),
        "n_decided_pregame_nonbootstrap": len(rows),
        "scores_available_in_export": list(SCORES),
        "per_book_prices_present": False,
        "method": (
            "Spearman(bin score mean, bin hit rate) on decided pre-game non-bootstrap rows; "
            "5 quantile bins. No multi-book odds fabricated. Helpers on path: "
            "stats_json.write_report, opponent_adjusted_epa.{opponent_adjusted,sigmoid}."
        ),
        "kill_line": KILL_LINE,
        "pooled": pooled,
        "kill_triggered": kill_triggered,
        "verdict": verdict,
        "pooled_best_ordering_proxy": best_proxy,
        "pooled_best_spearman": best_rho,
        "positive_path_replacement": (
            f"Order public boards on {best_proxy or 'marketFairProb (fallback)'} "
            f"(pooled Spearman {best_rho}); bookmakerCount is display-only under this kill "
            "unless a future export carries per-book side prices for true consensus."
        ),
        "mlb_spread_consensus_pinned_defect": mlb,
        "by_sport_pickType": cells,
        "consensus_ts_note": (
            "GSE2 consensus.ts computes weighted mean/dispersion over IndependentMarketFairValue "
            "sources (Kalshi, Elo, Poisson). board-export has none of those source probs — "
            "this instrument measures WHICH AVAILABLE SCORE orders hits, not a source-field consensus."
        ),
    }
    write_report(args.out, payload)
    print(
        json.dumps(
            {
                "instrument": "side_agreement_consensus",
                "status": "ok",
                "n": len(rows),
                "books_rho": books_rho,
                "mfp_rho": mfp_rho,
                "kill_triggered": kill_triggered,
                "best_proxy": best_proxy,
                "out": str(args.out),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
