"""Train and score per-defender coverage assignment at three horizons.

Answers one question: does post-snap trajectory information beat pre-snap
information for coverage assignment? If the horizon gap is small, the disguise
problem is overstated and the 35.1% context ceiling is not the binding
constraint. If it is large, it justifies the trajectory/attention programme.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.vision import factorized_coverage_bdb25 as fc


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", default="1", help="comma-separated tracking weeks")
    ap.add_argument("--out", default="factorized_coverage_bdb25_results.json")
    args = ap.parse_args(argv)

    weeks = [int(w) for w in args.weeks.split(",") if w.strip()]
    labels = fc.load_assignment_labels()
    print(f"labeled defender rows: {len(labels)}")
    print(labels["pff_defensiveCoverageAssignment"].value_counts().head(8).to_string())

    keys = set(zip(labels["gameId"], labels["playId"]))
    print(f"\nloading tracking weeks {weeks} ...")
    tr = fc.load_tracking(weeks, keys=keys)
    print(f"tracking rows: {len(tr):,} | plays matched: {tr[['gameId','playId']].drop_duplicates().shape[0]}")

    results = {"weeks": weeks, "labeled_rows_available": int(len(labels)), "horizons": {}}
    for h in fc.HORIZONS:
        feat = fc.build_features(tr, labels, horizon=h)
        if feat.empty:
            print(f"\n{h}: no feature rows")
            continue
        print(f"\n{h}: {len(feat)} defender rows, {feat.shape[1]} columns")
        r = fc.train(feat)
        results["horizons"][h] = r
        print(f"  accuracy={r['accuracy']}  macro_f1={r['macro_f1']}  "
              f"majority={r['majority_baseline']}  n={r['n']}")

    if "pre_snap" in results["horizons"] and "through_throw" in results["horizons"]:
        gap = (results["horizons"]["through_throw"]["accuracy"]
               - results["horizons"]["pre_snap"]["accuracy"])
        results["post_snap_gain"] = round(gap, 4)
        print(f"\npost-snap gain (through_throw - pre_snap): {gap:+.4f}")

    Path(args.out).write_text(json.dumps(results, indent=1), encoding="utf-8")
    print(f"\nwrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
