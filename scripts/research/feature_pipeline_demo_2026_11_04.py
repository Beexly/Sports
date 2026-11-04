"""End-to-end demo of the research-mindset feature pipeline.

The film room is 360x640, so pose-derived trajectories are not available.
This script proves the feature pipeline and the BH-FDR gate work together
on synthetic tracking data with a known signal, so the machinery is
validated before real tracking arrives.

Two groups:
  * "disguised" plays: defenders start clustered and collapse late
    (small pre-snap spread, large post-snap displacement).
  * "static" plays: defenders start spread and move little.

Features computed per play:
  - disguise_collapse_hazard (composite hazard score)
  - trajectory_irreversibility (mean over defender paths)
  - qb_cognitive_load (MOT load)
  - route_em_clusters (cluster count / purity proxy)

Then falsify_feature_matrix runs a Welch t-test per feature and BH-FDR
across features at q=0.10. The demo passes when the disguise feature is
rejected (i.e. survives the gate) and the noise feature is not.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from intelligence.vision import research_mindset_features as rmf


def _play(rng: np.random.Generator, disguised: bool) -> dict:
    n_def = 11
    if disguised:
        pre = rng.normal(0.0, 6.0, (n_def, 2))
        post = pre + rng.normal(0.0, 18.0, (n_def, 2))
    else:
        pre = rng.normal(0.0, 18.0, (n_def, 2))
        post = pre + rng.normal(0.0, 4.0, (n_def, 2))

    # Trajectories: disguised plays have a strong directional break.
    trajs = []
    for _ in range(n_def):
        steps = 12
        if disguised:
            drift = rng.normal(0.0, 3.0, 2)
        else:
            drift = rng.normal(0.0, 0.4, 2)
        t = np.arange(steps)[:, None]
        trajs.append(pre[0] + drift * t + rng.normal(0.0, 0.5, (steps, 2)))

    qb = np.array([0.0, 0.0])
    return {"pre": pre, "post": post, "trajs": trajs, "qb": qb}


def main() -> int:
    rng = np.random.default_rng(20261104)
    n_per_group = 40
    plays = [(_play(rng, True), 1) for _ in range(n_per_group)]
    plays += [(_play(rng, False), 0) for _ in range(n_per_group)]

    cal = rng.normal(0.0, 1.0, 200)
    rows = []
    for play, label in plays:
        haz = rmf.disguise_collapse_hazard(play["pre"], play["post"], cal)
        irr = float(np.mean([rmf.trajectory_irreversibility(t) for t in play["trajs"]]))
        load = rmf.qb_cognitive_load(play["qb"], play["post"])
        rows.append({
            "label": label,
            "hazard": haz["composite_hazard_score"],
            "irreversibility": irr,
            "mot_load": load["mot_load"],
            "noise": float(rng.normal(0.0, 1.0)),
        })

    X = np.array([[r["hazard"], r["irreversibility"], r["mot_load"], r["noise"]]
                  for r in rows])
    y = np.array([r["label"] for r in rows])
    names = ["hazard", "irreversibility", "mot_load", "noise"]
    gate = rmf.falsify_feature_matrix(X, y, names, q=0.10)

    print("=== feature pipeline demo ===")
    print(f"plays: {len(rows)} ({n_per_group} disguised, {n_per_group} static)")
    print()
    print(f"{'feature':<18} {'t':>8} {'p':>10} {'adj_p':>10} {'reject':>7}")
    for i, name in enumerate(names):
        print(f"{name:<18} {gate['t_stat'][i]:>8.3f} {gate['p_value'][i]:>10.4f} "
              f"{gate['adjusted_p'][i]:>10.4f} {str(gate['reject'][i]):>7}")
    print()
    print(f"features surviving BH-FDR q={gate['q']}: {gate['n_reject']}/{len(names)}")

    out = Path(r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch\feature_demo_2026_11_04.json")
    out.write_text(json.dumps({"gate": gate, "n_plays": len(rows)}, indent=1),
                   encoding="utf-8")
    print(f"wrote {out}")

    # The demo passes when the disguise signal survives and noise does not.
    ok = gate["reject"][0] and not gate["reject"][3]
    print("DEMO:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
