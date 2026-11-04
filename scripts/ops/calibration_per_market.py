"""Per-market calibration, computed by the repo's own reference implementation.

WHY THIS IS A WRAPPER AND NOT A REIMPLEMENTATION

The first version of this script implemented isotonic regression and ECE in pure
Python. Run against the same settled picks it disagreed with
`scripts/calibration-offline/run.mjs` on the RAW ECE of every market:

    market      python eceRaw     runner eceRaw
    MONEYLINE   0.1483            0.0911
    SPREAD      0.2126            0.3314
    TOTAL       0.2138            0.1512

Same rows, same 70/30 split, same n. Two implementations of one metric, and no
way to say which is right. A calibration verdict sourced from a disputed metric
is not a verdict, so this module no longer computes ECE at all: it splits the
settled picks by market, writes one fixture per market, and calls the reference
runner. One implementation, four inputs, no ambiguity about the numbers.

(The first version also binned ECE on the raw probability while substituting the
calibrated value, which is wrong for a step function -- several raw bins collapse
onto one calibrated value and the error averages away. That is precisely the
class of bug that makes a metric agree with whoever wrote it.)

WHAT IT MEASURES

The reference runner fits ONE calibration map over whatever it is given. Fed the
synthetic 300-row fixture it reports ECE 0.134 -> 0.069 and looks healthy. Fed
all settled picks as one pool it reports 0.192 -> 0.424. Both are the same
mistake at different scales: the three markets do not mean the same thing by a
probability.

    MONEYLINE is already close to calibrated    -> a map has little to correct
    SPREAD    confidence is inverted            -> a map is essential
    TOTAL     overconfident                     -> a map is essential

One map across all three averages a correction that must go one way against one
that must go the other.

CAVEAT: the SPREAD/TOTAL improvements are large enough to distrust. CIR with ~20
distinct blocks fit on ~550 rows can chase noise even when scored on a hold-out.
Treat the improvement as an upper bound and re-measure on a second window before
wiring anything into live scoring.

USAGE
    python scripts/ops/calibration_per_market.py
    python scripts/ops/calibration_per_market.py --json

Requires node on PATH. Exit 0 on success, 2 if the CSV or runner is missing.
"""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_CSV = REPO / "apps" / "web" / "__tests__" / "calibration-audit" / "evidence" / "prod-settled-sample-full.csv"
RUNNER = REPO / "scripts" / "calibration-offline" / "run.mjs"
FIXTURE_DIR = REPO / "scripts" / "calibration-offline" / "data"
MARKETS = ("MONEYLINE", "SPREAD", "TOTAL")


def split_by_market(csv_path: Path) -> dict[str, list[dict]]:
    """Group settled picks by market.

    File order is preserved so the runner's 70/30 split stays a TIME hold-out.
    A random shuffle would leak later information into training.
    """
    by: dict[str, list[dict]] = {m: [] for m in MARKETS}
    with csv_path.open(encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            try:
                p = float(row["p"])
                y = int(float(row["y"]))
            except (TypeError, ValueError, KeyError):
                continue
            market = (row.get("pick_type") or "").strip().upper()
            if market in by and 0.0 <= p <= 1.0 and y in (0, 1):
                by[market].append({"p": p, "y": y})
    return by


def write_fixture(name: str, rows: list[dict]) -> Path:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    path = FIXTURE_DIR / f"real-{name.lower()}.jsonl"
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row) + "\n")
    return path


def run_reference(fixture: Path) -> dict:
    """Invoke the repo's runner and parse its JSON report."""
    proc = subprocess.run(
        ["node", str(RUNNER), str(fixture)],
        capture_output=True, text=True, cwd=str(REPO), timeout=300,
    )
    start = proc.stdout.find("{")
    if start < 0:
        raise RuntimeError(f"no JSON for {fixture.name}: {(proc.stderr or proc.stdout)[:200]}")
    return json.loads(proc.stdout[start:])


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Per-market calibration via the reference runner")
    ap.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    if not args.csv.is_file():
        print(f"ERROR: no settled picks at {args.csv}", file=sys.stderr)
        return 2
    if not RUNNER.is_file():
        print(f"ERROR: no reference runner at {RUNNER}", file=sys.stderr)
        return 2

    by_market = split_by_market(args.csv)
    pooled = [r for m in MARKETS for r in by_market[m]]

    results: dict[str, dict] = {}
    plan = [(m, by_market[m]) for m in MARKETS] + [("POOLED_FOR_REFERENCE_ONLY", pooled)]
    for name, rows in plan:
        if len(rows) < 50:
            results[name] = {"n": len(rows), "skipped": "insufficient sample"}
            continue
        try:
            r = run_reference(write_fixture(name, rows))
        except Exception as exc:  # noqa: BLE001
            results[name] = {"n": len(rows), "error": str(exc)[:160]}
            continue

        raw_ece, cal_ece = r.get("eceRaw"), r.get("eceCir")
        delta = verdict = None
        if isinstance(raw_ece, (int, float)) and isinstance(cal_ece, (int, float)):
            delta = round(cal_ece - raw_ece, 4)
            if name.startswith("POOLED"):
                verdict = "MUST NOT BE USED - fit per market"
            elif delta < -0.01:
                verdict = "calibration helps"
            elif delta > 0.01:
                verdict = "calibration HURTS - leave raw"
            else:
                verdict = "no material change"

        results[name] = {
            "n": r.get("n"), "train": r.get("train"), "test": r.get("test"),
            "blocks": r.get("distinctCir"),
            "ece_raw": raw_ece, "ece_cal": cal_ece,
            "delta": delta, "verdict": verdict,
        }

    if args.json:
        print(json.dumps(results, indent=2))
        return 0

    print(f"{'market':26} {'n':>6} {'eceRaw':>8} {'eceCir':>8} {'delta':>8}  verdict")
    for name, r in results.items():
        if "skipped" in r:
            print(f"{name:26} {r['n']:>6}  {r['skipped']}")
            continue
        if "error" in r:
            print(f"{name:26} {r['n']:>6}  ERROR {r['error'][:70]}")
            continue
        print(f"{name:26} {str(r['n']):>6} {str(r['ece_raw']):>8} {str(r['ece_cal']):>8} "
              f"{str(r['delta']):>8}  {r['verdict']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
