"""Stakeholder artifacts for the calibration findings.

Produces (a) a reliability chart by market and (b) the counterfactual economics
at a flat -110 price. The economics are explicitly a MODEL, not observed P&L:
the evidence file carries no posted prices, no stake sizes and no line shopping.

    python scripts/ops/calibration_story.py --out docs/engine/research/2026-11-04
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CSV_PATH = (REPO / "apps" / "web" / "__tests__" / "calibration-audit"
            / "evidence" / "prod-settled-sample-full.csv")

BREAK_EVEN = 110 / 210  # 0.5238: win rate needed to break even at -110
PAYOUT = 100 / 110      # net return per winning unit stake

MARKETS = ["MONEYLINE", "SPREAD", "TOTAL"]
COLORS = {"MONEYLINE": "#2E86AB", "SPREAD": "#E63946", "TOTAL": "#F4A261"}


def load() -> list[dict]:
    with CSV_PATH.open("r", encoding="utf-8") as fh:
        return [{"p": float(r["p"]), "y": int(r["y"]), "t": r["pick_type"]}
                for r in csv.DictReader(fh)]


def economics(rows: list[dict]) -> dict:
    out = {}
    for t in MARKETS + ["ALL"]:
        s = rows if t == "ALL" else [r for r in rows if r["t"] == t]
        n = len(s)
        if not n:
            continue
        wins = sum(r["y"] for r in s)
        losses = n - wins
        # Net units at a flat 1-unit stake on every pick at -110.
        net = wins * PAYOUT - losses
        out[t] = {
            "n": n, "wins": wins, "losses": losses,
            "win_rate": round(wins / n, 4),
            "break_even": round(BREAK_EVEN, 4),
            "edge_pts": round(wins / n - BREAK_EVEN, 4),
            "roi_per_unit": round(net / n, 4),
            "net_units": round(net, 1),
        }
    return out


def high_confidence(rows: list[dict], threshold: float = 0.80) -> dict:
    """Where the stake lands if it is sized by the confidence score."""
    out = {}
    for t in MARKETS:
        s = [r for r in rows if r["t"] == t]
        hi = [r for r in s if r["p"] >= threshold]
        if not hi:
            continue
        out[t] = {
            "n": len(hi),
            "share_of_market": round(len(hi) / len(s), 4),
            "claimed": round(sum(r["p"] for r in hi) / len(hi), 4),
            "realized": round(sum(r["y"] for r in hi) / len(hi), 4),
        }
    return out


def bands(rows: list[dict]) -> dict:
    edges = [(0.50, 0.60), (0.60, 0.70), (0.70, 0.80), (0.80, 0.90), (0.90, 1.01)]
    out = defaultdict(list)
    for t in MARKETS:
        s = [r for r in rows if r["t"] == t]
        for lo, hi in edges:
            b = [r for r in s if lo <= r["p"] < hi]
            if not b:
                continue
            out[t].append({
                "band": f"{int(lo*100)}-{min(int(hi*100),100)}",
                "n": len(b),
                "claimed": round(sum(r["p"] for r in b) / len(b), 4),
                "realized": round(sum(r["y"] for r in b) / len(b), 4),
            })
    return dict(out)


def chart(rows: list[dict], out_png: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    band_data = bands(rows)
    fig, axes = plt.subplots(1, 3, figsize=(15, 5.2), sharey=True)

    for ax, t in zip(axes, MARKETS):
        d = band_data.get(t, [])
        if not d:
            continue
        claimed = [b["claimed"] for b in d]
        realized = [b["realized"] for b in d]
        sizes = [b["n"] for b in d]

        ax.plot([0.5, 1.0], [0.5, 1.0], "--", color="#999999", linewidth=1.2,
                label="Perfect calibration", zorder=1)
        # plot() rejects a per-point markersize list; draw the line, then a
        # scatter whose AREA encodes band population.
        ax.plot(claimed, realized, "-", color=COLORS[t], linewidth=2.4,
                zorder=3, label=t)
        ax.scatter(claimed, realized, s=[8 + (x / 4) for x in sizes],
                   color=COLORS[t], zorder=4, edgecolors="white", linewidths=0.8)
        ax.axhline(BREAK_EVEN, color="#444444", linestyle=":", linewidth=1.1,
                   label=f"Break-even at -110 ({BREAK_EVEN:.1%})", zorder=2)

        for b in d:
            ax.annotate(f"n={b['n']}", (b["claimed"], b["realized"]),
                        textcoords="offset points", xytext=(0, 10),
                        fontsize=7, color="#555555", ha="center")

        ax.set_title(f"{t}\nrealized vs claimed win rate", fontsize=11,
                     fontweight="bold")
        ax.set_xlabel("Claimed probability (p)", fontsize=9)
        ax.set_xlim(0.48, 1.0)
        ax.set_ylim(0.2, 1.05)
        ax.grid(alpha=0.25)
        ax.legend(fontsize=7, loc="lower right")

    axes[0].set_ylabel("Realized win rate", fontsize=9)
    fig.suptitle("Confidence means different things in different markets\n"
                 "2,662 settled picks — points below the dashed line are overconfident",
                 fontsize=13, fontweight="bold")
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    out_png.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_png, dpi=150, bbox_inches="tight")
    plt.close(fig)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path,
                    default=REPO / "docs" / "engine" / "research" / "2026-11-04")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    rows = load()
    econ = economics(rows)
    hi = high_confidence(rows)
    band_data = bands(rows)

    png = args.out / "calibration-reliability-by-market.png"
    chart(rows, png)

    payload = {"n": len(rows), "economics": econ,
               "high_confidence": hi, "bands": band_data, "chart": str(png)}
    (args.out / "calibration-story-data.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8")

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"chart -> {png}")
        print(f"data  -> {args.out / 'calibration-story-data.json'}")
        print()
        print(f"{'market':<11}{'n':>6}{'win%':>8}{'edge':>9}{'ROI/u':>9}{'net_u':>9}")
        for t in MARKETS + ["ALL"]:
            e = econ[t]
            print(f"{t:<11}{e['n']:>6}{e['win_rate']:>7.1%}{e['edge_pts']:>+9.4f}"
                  f"{e['roi_per_unit']:>+8.1%}{e['net_units']:>+9.1f}")
        print()
        print("If stakes were sized by confidence (p >= 0.80):")
        for t, h in hi.items():
            print(f"  {t:<10} n={h['n']:>4} ({h['share_of_market']:>5.1%} of market) "
                  f"claims {h['claimed']:>6.1%} realizes {h['realized']:>6.1%}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
