"""Market-stratified calibration analysis of the settled-picks evidence sample.

THE QUESTION. Two cycles ago I recorded a "~5.2pt calibration inflation" as an
open question and could not explain it. compute.ts documents a much larger
defect: over 2,385 settled picks, the 80+ confidence band claims ~0.8663 and
realizes ~0.5191 (z = -10.7), with realized win rate peaking at 75-79 and
falling again by 90-94. This script asks whether that is a genuine miscalibration
of the score or an artifact of pooling three markets that do not mean the same
thing by `p`.

WHY POOLING IS THE SUSPECT. compute.ts:74-90 states it directly: Brier and
per-bucket delta assume `confidence/100` is a win probability. That holds for
moneyline, where confidence is derived from the vig-free fair probability, but
NOT for spread/total, which are priced to ~50% by construction. If that is true,
the pooled gap should be large while the moneyline-only gap is near zero.

STATISTICAL METHOD. Per-pick probabilities differ, so a single binomial with a
constant p would be wrong. The null "the score is calibrated" implies
    W = sum(y_i) ~ Poisson-binomial(sum(p_i), sum(p_i(1-p_i)))
and the z statistic is (W - sum(p)) / sqrt(sum(p(1-p))). That is the correct
test for varying p and it is what this script uses. Intervals on observed win
rates are Wilson score intervals, which behave sensibly near 0 and 1.

CAVEATS, stated because a calibration table invites over-reading:
  * The sample is a production snapshot, not a designed experiment. Model
    versions are mixed (v5.1.0 through v5.3.0) and 151 picks are in_play.
  * The sample is not the same 2,385-pick cut compute.ts cites; results are
    reported for THIS sample and the two should not be quoted interchangeably.
  * A calibration gap is a statement about the past sample. It is not a
    forecast, and it is not investment advice.

USAGE
    python scripts/ops/calibration_analysis.py
    python scripts/ops/calibration_analysis.py --csv <path> --json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_CSV = (REPO / "apps" / "web" / "__tests__" / "calibration-audit"
               / "evidence" / "prod-settled-sample-full.csv")

# Confidence bands used by compute.ts's BUCKETS, expressed on p in [0,1].
BANDS = [(0.50, 0.60), (0.60, 0.70), (0.70, 0.80), (0.80, 0.90), (0.90, 1.001)]


@dataclass
class Group:
    label: str
    p: list[float] = field(default_factory=list)
    y: list[int] = field(default_factory=list)

    @property
    def n(self) -> int:
        return len(self.y)

    @property
    def wins(self) -> int:
        return sum(self.y)

    @property
    def mean_p(self) -> float:
        return sum(self.p) / self.n if self.n else 0.0

    @property
    def mean_y(self) -> float:
        return self.wins / self.n if self.n else 0.0

    @property
    def gap(self) -> float:
        """Positive = the score claims more than it delivers."""
        return self.mean_p - self.mean_y

    def brier(self) -> float:
        return sum((a - b) ** 2 for a, b in zip(self.p, self.y)) / self.n if self.n else 0.0

    def baseline_brier(self, rate: float | None = None) -> float:
        """Brier of always predicting the group's own base rate (climatology)."""
        r = self.mean_y if rate is None else rate
        return sum((r - b) ** 2 for b in self.y) / self.n if self.n else 0.0

    def poisson_binomial_z(self) -> tuple[float, float]:
        """z and two-sided p for H0: sum(y) ~ Poisson-binomial(sum p, sum p(1-p))."""
        expected = sum(self.p)
        var = sum(pi * (1 - pi) for pi in self.p)
        if var <= 0:
            return 0.0, 1.0
        z = (self.wins - expected) / math.sqrt(var)
        # Two-sided normal p-value via erfc, no scipy dependency for this path.
        pval = math.erfc(abs(z) / math.sqrt(2))
        return z, pval

    def wilson(self, z: float = 1.959963985) -> tuple[float, float]:
        """Wilson score interval on the OBSERVED win rate."""
        if self.n == 0:
            return (0.0, 0.0)
        n, k = self.n, self.wins
        centre = (k + z * z / 2) / (n + z * z)
        half = z * math.sqrt(k * (n - k) / n + z * z / 4) / (n + z * z)
        return (max(0.0, centre - half), min(1.0, centre + half))

    def ece(self) -> float:
        """Expected calibration error over the BANDS, sample-weighted."""
        total = 0.0
        for lo, hi in BANDS:
            idx = [i for i, pi in enumerate(self.p) if lo <= pi < hi]
            if not idx:
                continue
            mp = sum(self.p[i] for i in idx) / len(idx)
            my = sum(self.y[i] for i in idx) / len(idx)
            total += (len(idx) / self.n) * abs(mp - my)
        return total


def load(path: Path) -> tuple[list[dict], list[str]]:
    rows, bad = [], []
    with path.open("r", encoding="utf-8") as fh:
        for lineno, rec in enumerate(csv.DictReader(fh), 2):
            try:
                p = float(rec["p"])
                y = int(rec["y"])
            except (KeyError, TypeError, ValueError):
                bad.append(f"line {lineno}: bad p/y")
                continue
            if not (0.0 <= p <= 1.0) or y not in (0, 1):
                bad.append(f"line {lineno}: p={p} y={y} out of range")
                continue
            rows.append({**rec, "p": p, "y": y})
    return rows, bad


def band_table(g: Group) -> list[dict]:
    out = []
    for lo, hi in BANDS:
        idx = [i for i, pi in enumerate(g.p) if lo <= pi < hi]
        if not idx:
            continue
        n = len(idx)
        mp = sum(g.p[i] for i in idx) / n
        my = sum(g.y[i] for i in idx) / n
        sub = Group(__import__("builtins").str((lo, hi)), [g.p[i] for i in idx],
                    [g.y[i] for i in idx])
        z, pval = sub.poisson_binomial_z()
        lo_ci, hi_ci = sub.wilson()
        out.append({
            "band": f"{int(lo*100)}-{int(hi*100) if hi <= 1 else 100}",
            "n": n, "mean_p": round(mp, 4), "mean_y": round(my, 4),
            "gap": round(mp - my, 4), "z": round(z, 2), "p_value": round(pval, 6),
            "ci_low": round(lo_ci, 4), "ci_high": round(hi_ci, 4),
        })
    return out


def summarise(g: Group) -> dict:
    z, pval = g.poisson_binomial_z()
    lo, hi = g.wilson()
    return {
        "label": g.label, "n": g.n, "wins": g.wins,
        "mean_p": round(g.mean_p, 4), "mean_y": round(g.mean_y, 4),
        "gap": round(g.gap, 4), "z": round(z, 2), "p_value": round(pval, 8),
        "ci_low": round(lo, 4), "ci_high": round(hi, 4),
        "brier": round(g.brier(), 4),
        "climatology_brier": round(g.baseline_brier(), 4),
        "brier_skill_vs_climatology": round(
            1 - g.brier() / g.baseline_brier(), 4) if g.baseline_brier() else None,
        "ece": round(g.ece(), 4),
        "calibrated_at_95": pval >= 0.05,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Market-stratified calibration analysis")
    ap.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--by-version", action="store_true",
                    help="also stratify by model_version")
    args = ap.parse_args(argv)

    if not args.csv.exists():
        print(f"missing evidence file: {args.csv}", file=sys.stderr)
        return 2

    rows, bad = load(args.csv)
    if not rows:
        print("no usable rows", file=sys.stderr)
        return 2

    pooled = Group("ALL")
    by_type: dict[str, Group] = defaultdict(lambda: Group(""))
    by_type_in: dict[str, Group] = defaultdict(lambda: Group(""))
    for r in rows:
        t = r.get("pick_type") or "UNKNOWN"
        for g in (pooled, by_type[t]):
            g.p.append(r["p"])
            g.y.append(r["y"])
        by_type[t].label = t
        if r.get("in_play") == "f":
            gi = by_type_in[t]
            gi.label = t
            gi.p.append(r["p"])
            gi.y.append(r["y"])

    report = {
        "csv": str(args.csv),
        "rows_used": len(rows),
        "rows_rejected": bad,
        "pooled": summarise(pooled),
        "by_pick_type": {t: summarise(g) for t, g in sorted(by_type.items())},
        "by_pick_type_pregame_only": {
            t: summarise(g) for t, g in sorted(by_type_in.items()) if g.n
        },
        "band_table_by_type": {t: band_table(g) for t, g in sorted(by_type.items())},
    }

    if args.by_version:
        by_ver: dict[str, Group] = defaultdict(lambda: Group(""))
        for r in rows:
            v = r.get("model_version") or "UNKNOWN"
            by_ver[v].label = v
            by_ver[v].p.append(r["p"])
            by_ver[v].y.append(r["y"])
        report["by_model_version"] = {v: summarise(g) for v, g in sorted(by_ver.items())}

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        def line(s: dict) -> str:
            sig = "*" if not s["calibrated_at_95"] else " "
            return (f"{s['label']:<12} {s['n']:>5} {s['mean_p']:>8.4f} {s['mean_y']:>8.4f} "
                    f"{s['gap']:>+8.4f}{sig} {s['z']:>7.2f} {s['p_value']:>10.2e} "
                    f"{s['brier']:>7.4f} {s['climatology_brier']:>7.4f} {s['ece']:>7.4f}")

        print(f"{'group':<12} {'n':>5} {'mean_p':>8} {'mean_y':>8} {'gap':>8} "
              f"{'z':>7} {'p':>10} {'brier':>7} {'clim':>7} {'ece':>7}")
        print("-" * 88)
        print(line(report["pooled"]))
        for s in report["by_pick_type"].values():
            print(line(s))
        print()
        print("* = 95% CI on observed rate excludes the claimed probability "
              "(p < 0.05, Poisson-binomial)")
        print()
        print("pre-game only (in_play=false):")
        print(f"{'group':<12} {'n':>5} {'mean_p':>8} {'mean_y':>8} {'gap':>8} "
              f"{'z':>7} {'p':>10}")
        for s in report["by_pick_type_pregame_only"].values():
            print(f"{s['label']:<12} {s['n']:>5} {s['mean_p']:>8.4f} {s['mean_y']:>8.4f} "
                  f"{s['gap']:>+8.4f} {s['z']:>7.2f} {s['p_value']:>10.2e}")
        print()
        for t, bands in report["band_table_by_type"].items():
            print(f"{t} band table:")
            print(f"  {'band':<8} {'n':>5} {'mean_p':>8} {'mean_y':>8} {'gap':>8} {'z':>7} {'p':>9}")
            for b in bands:
                print(f"  {b['band']:<8} {b['n']:>5} {b['mean_p']:>8.4f} {b['mean_y']:>8.4f} "
                      f"{b['gap']:>+8.4f} {b['z']:>7.2f} {b['p_value']:>9.2e}")
            print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
