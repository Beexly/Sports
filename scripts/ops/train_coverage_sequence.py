"""Train the sequence coverage model and compare horizons.

Builds one sequence set at the longest horizon, then truncates it to pre-snap and
through-throw. Same model, same features, different amount of the play visible -
which is the only way the horizon comparison means anything.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.vision import coverage_sequence_model as csm


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", default="1")
    ap.add_argument("--out", default="coverage_sequence_results.json")
    ap.add_argument("--folds", type=int, default=3)
    ap.add_argument("--epochs", type=int, default=6)
    args = ap.parse_args(argv)

    weeks = [int(w) for w in args.weeks.split(",") if w.strip()]
    labels = csm.load_labels()
    keys = set(zip(labels["gameId"], labels["playId"]))
    print(f"labels: {len(labels)} | loading weeks {weeks}")
    tr = csm.load_tracking(weeks, keys=keys)
    print(f"tracking rows: {len(tr):,}")

    print("building sequences (through_arrival)...")
    data = csm.build_sequences(tr, labels, horizon="through_arrival")
    print(f"sequences: {data['X'].shape} | classes: {len(data['classes'])}")

    results = {"weeks": weeks, "shape": list(data["X"].shape),
               "classes": data["classes"], "horizons": {}}
    for h in ("pre_snap", "through_throw", "through_arrival"):
        print(f"\n=== {h} ===")
        d = csm.truncate(data, h)
        r = csm.train_sequence(d, folds=args.folds, epochs=args.epochs)
        results["horizons"][h] = r
        print(f"  accuracy={r['accuracy']}  macro_f1={r['macro_f1']}  "
              f"majority={r['majority_baseline']}  n={r['n']}")

    pre = results["horizons"]["pre_snap"]["accuracy"]
    thr = results["horizons"]["through_throw"]["accuracy"]
    results["post_snap_gain"] = round(thr - pre, 4)
    print(f"\npost-snap gain: {thr - pre:+.4f}")

    Path(args.out).write_text(json.dumps(results, indent=1), encoding="utf-8")
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
