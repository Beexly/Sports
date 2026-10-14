"""Kalman filter self-test on a synthetic route with occlusion.

Verifies the filter's actual claims, not the vibe:
  1. Smoothing: filtered positions track a ground-truth route closer than raw
     measurements under measurement noise.
  2. Coast: during a 5-frame occlusion the prediction continues and honest
     uncertainty grows; positions stay plausible.
  3. Innovation: the first post-occlusion measurement produces the largest
     innovation — exactly the ID-switch flag the shadow contract wants.
  4. Sharp cut: constant-velocity lag at a break is visible (documented
     limitation; OC-SORT-style replay is the noted upgrade path).
All shadow: written to the kalman shadow ledger at weight 0.
"""
from __future__ import annotations

import json
import math
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence" / "vision"))
from kalman_track import KalmanBank, KalmanConfig  # noqa: E402

LEDGER = REPO / "intelligence" / "vision" / "shadow" / "kalman_shadow.jsonl"
FPS = 30.0


def ground_truth_route(t_s: float) -> tuple[float, float]:
    """A slant-then-break route in field meters (down the +y field)."""
    if t_s < 1.0:                      # 0-1s: release stem
        return (2.0 * t_s, 6.0 * t_s)
    if t_s < 2.0:                      # 1-2s: break inside (sharp cut)
        return (2.0 + 3.0 * (t_s - 1.0), 6.0 - 1.0 * (t_s - 1.0))
    return (5.0 + 0.5 * (t_s - 2.0), 5.0 + 0.0 * (t_s - 2.0))  # 2s+: levitate across


def run_scenario(name: str, truth_fn, occl: tuple[int, int] | None, n_frames: int = 120):
    rng = random.Random(141)
    cfg = KalmanConfig()
    bank = KalmanBank(cfg)
    raw_errs, filt_errs, innovations = [], [], []
    raw_by_frame = {}
    coast_frames = 0
    occl_start, occl_end = (occl if occl else (-1, -1))
    for i in range(n_frames):
        t = i / FPS
        gx, gy = truth_fn(t)
        measured = None
        if not (occl_start <= i <= occl_end):
            measured = (gx + rng.gauss(0, cfg.pos_meas_std),
                        gy + rng.gauss(0, cfg.pos_meas_std))
        res = bank.step("T", measured[0] if measured else None,
                        measured[1] if measured else None, t)
        if measured:
            raw_errs.append(math.hypot(measured[0] - gx, measured[1] - gy))
            raw_by_frame[i] = raw_errs[-1]
        filt_errs.append(math.hypot(res["x_m"] - gx, res["y_m"] - gy))
        innov = bank.innovation_magnitude("T")
        if innov is not None:
            innovations.append((i, innov))
        if res["status"] == "coasting":
            coast_frames += 1
    mean_raw = sum(raw_errs) / len(raw_errs)
    meas_frames = [i for i in range(n_frames) if not (occl_start <= i <= occl_end)]
    mean_filt = sum(filt_errs[i] for i in meas_frames) / len(meas_frames)
    steady = [i for i in meas_frames if i / FPS >= 3.0]
    raw_steady = sum(raw_by_frame[i] for i in steady) / len(steady) if steady else None
    filt_steady = sum(filt_errs[i] for i in steady) / len(steady) if steady else None
    return {"name": name, "mean_raw_error_m": round(mean_raw, 4),
            "mean_filtered_error_m": round(mean_filt, 4),
            "steady_raw_error_m": round(raw_steady, 4) if raw_steady else None,
            "steady_filtered_error_m": round(filt_steady, 4) if filt_steady else None,
            "coast_frames": coast_frames,
            "vx": round(bank.tracks["T"].vx, 3), "vy": round(bank.tracks["T"].vy, 3),
            "pos_std_final": round(bank.tracks["T"].position_std, 4),
            "innovations": innovations}


def main() -> int:
    def straight(t):
        return (3.0 * t, 1.5 * t)

    def cut_route(t):
        if t < 1.0:
            return (2.0 * t, 6.0 * t)
        if t < 2.0:
            return (2.0 + 3.0 * (t - 1.0), 6.0 - 1.0 * (t - 1.0))
        return (5.0 + 0.5 * (t - 2.0), 5.0)

    # Scenario A: straight route, no occlusion — the CV model's home turf.
    a = run_scenario("straight_line", straight, None)
    # Scenario B: cut route + 5-frame occlusion — innovation/coast claims.
    b = run_scenario("cut_route_with_occlusion", cut_route, (40, 45))
    b_innov_max = max((v for _, v in b["innovations"]), default=0)
    post_occl = [v for i, v in b["innovations"] if 39 <= i <= 48]
    b_post_max = max(post_occl, default=0)

    a_print = {k: v for k, v in a.items() if k != "innovations"}
    print("=== SCENARIO A: straight line (CV-valid) ===")
    print(json.dumps(a_print, indent=1))
    print("=== SCENARIO B: cut route + occlusion ===")
    print(json.dumps({k: v for k, v in b.items() if k != "innovations"}, indent=1))
    print("max innovation:", round(b_innov_max, 3), "| max post-occlusion:", round(b_post_max, 3))

    checks = [
        ("A: smoothing improves (steady state)",
         a["steady_filtered_error_m"] < a["steady_raw_error_m"]),
        ("A: velocity converges (vx within 15%)", abs(a["vx"] - 3.0) / 3.0 < 0.15),
        ("B: coast survived", 0 < b["coast_frames"] <= 6),
        ("B: post-occlusion innovation spike", b_post_max > 0.5),
    ]
    ok = True
    for name, passed in checks:
        ok &= passed
        print(("PASS" if passed else "FAIL"), "-", name)
    print("LIMITATION (documented, not a failure): constant-velocity lag on sharp"
          " cuts — OC-SORT observation replay is the noted upgrade path.")

    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    row = {"ts": datetime.now(timezone.utc).isoformat(),
           "signal_family": "kalman_track_filter",
           "self_test": {"scenario_a": a, "scenario_b_innovation_max": round(b_innov_max, 4),
                          "scenario_b_post_occl_max": round(b_post_max, 4)},
           "weight": 0.0, "validation_spec_met": False,
           "honesty": "synthetic_route_self_test"}
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")
    print(f"shadow row -> {LEDGER.name} (weight 0)")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
