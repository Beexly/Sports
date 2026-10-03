#!/usr/bin/env python3
"""
PILOT 2 EVALUATOR — motion-aware association on STABILIZED coordinates.

Input : stab JSONL from stabilize.py (stabilized foot points in ref frame)
Output: tracklet continuity stats + movement metrics, compared vs Pilot 1.

Association (the Pilot-2 fix): constant-velocity motion model in stabilized
coordinates. Camera motion is ~0.5px residual, so player motion dominates and
a velocity prediction is meaningful — unlike Pilot 1's greedy IoU on raw
coords under 52.5px camera motion.

Scale (honest, documented): px->yards from yard-line spacing measured in the
stabilized reference frame (frame0.png). 40L->50 = 576px/10yd at x~395;
50->40R = 392px/10yd at x~879. Perspective foreshortening is real, so scale
is modeled linear in x: scale(x) = 57.6 - 0.038*(x - 395.5) px/yd.
Speeds carry this uncertainty; continuity stats need no scale at all.

HONEST LIMITS (printed in report):
 - scale is estimated from 3 yard-line measurements, not a full calibration
 - no player identity (tracklet ids only)
 - ball not tracked (person class only, same as Pilot 1)
"""
import json, math, sys

STAB_PATH = sys.argv[1] if len(sys.argv) > 1 else "stab-rice-34yd.jsonl"
FPS = 5.0
DT = 1.0 / FPS
MAX_GAP_S = 0.6
GATE_PX = 40.0            # association gate in stabilized px
VEL_SMOOTH = 0.6          # exponential smoothing for velocity update
NGS_W3_CEILING_MPH = 21.03
MPH = 2.23694

def scale_px_per_yd(x):
    # linear perspective model from measured yard-line spacing
    return 57.6 - 0.038 * (x - 395.5)

def main():
    frames = []
    with open(STAB_PATH) as f:
        for line in f:
            line = line.strip()
            if line:
                frames.append(json.loads(line))
    frames.sort(key=lambda r: r["frameIndex"])
    n_det = sum(len(r.get("stabilized", [])) for r in frames)
    print(f"frames={len(frames)} total_detections={n_det} "
          f"avg_det_per_frame={n_det/max(1,len(frames)):.1f}")

    # --- motion-aware association: constant-velocity prediction + gated NN ---
    tracklets = []  # {id, pts:[{t,x,y}], vx, vy, last_t}
    next_id = 0
    for r in frames:
        t = r["t"]
        dets = sorted(r.get("stabilized", []),
                      key=lambda d: -d.get("confidence", 0))
        # predict
        for tr in tracklets:
            dt = t - tr["last_t"]
            tr["px"] = tr["pts"][-1]["x"] + tr["vx"] * dt
            tr["py"] = tr["pts"][-1]["y"] + tr["vy"] * dt
        used_tr, used_dt = set(), set()
        # greedy best-first on prediction distance
        cands = []
        for di, d in enumerate(dets):
            for ti, tr in enumerate(tracklets):
                if ti in used_tr:
                    continue
                if t - tr["last_t"] > MAX_GAP_S:
                    continue
                dist = math.hypot(d["xPx"] - tr["px"], d["yPx"] - tr["py"])
                if dist <= GATE_PX:
                    cands.append((dist, di, ti))
        cands.sort()
        assign = {}
        for dist, di, ti in cands:
            if di in used_dt or ti in used_tr:
                continue
            used_dt.add(di); used_tr.add(ti)
            assign[di] = ti
        for di, d in enumerate(dets):
            if di in assign:
                tr = tracklets[assign[di]]
                dt = t - tr["last_t"]
                # velocity update with smoothing
                if dt > 0:
                    nvx = (d["xPx"] - tr["pts"][-1]["x"]) / dt
                    nvy = (d["yPx"] - tr["pts"][-1]["y"]) / dt
                    tr["vx"] = VEL_SMOOTH * nvx + (1 - VEL_SMOOTH) * tr["vx"]
                    tr["vy"] = VEL_SMOOTH * nvy + (1 - VEL_SMOOTH) * tr["vy"]
                tr["pts"].append({"t": t, "x": d["xPx"], "y": d["yPx"]})
                tr["last_t"] = t
            else:
                tracklets.append({"id": next_id,
                                  "pts": [{"t": t, "x": d["xPx"], "y": d["yPx"]}],
                                  "vx": 0.0, "vy": 0.0, "last_t": t})
                next_id += 1

    tracklets = [tr for tr in tracklets if len(tr["pts"]) >= 3]
    durs = sorted(tr["pts"][-1]["t"] - tr["pts"][0]["t"] for tr in tracklets)
    med = durs[len(durs)//2] if durs else 0
    under2 = sum(1 for d in durs if d < 2.0)
    over8 = sum(1 for d in durs if d >= 8.0)
    print(f"\n--- CONTINUITY (vs Pilot 1: 98 tracklets, median 1.0s, 71/98 <2s, 0 >=8s) ---")
    print(f"tracklets(len>=3)={len(tracklets)} median_life={med:.1f}s "
          f"under_2s={under2}/{len(tracklets)} reached_8s={over8}")

    # --- movement metrics with perspective-aware scale ---
    rows = []
    for tr in tracklets:
        dist_yd = top_mph = 0.0
        ssum = cnt = 0
        pts = tr["pts"]
        for a, b in zip(pts, pts[1:]):
            dt = b["t"] - a["t"]
            if dt <= 0:
                continue
            dpx = math.hypot(b["x"] - a["x"], b["y"] - a["y"])
            xm = (a["x"] + b["x"]) / 2
            dyd = dpx / max(20.0, scale_px_per_yd(xm))  # clamp absurd scales
            dist_yd += dyd
            mph = (dyd / dt) * 0.9144 * MPH / 1.0  # yd/s -> m/s -> mph
            # yd/s * 0.9144 = m/s; * MPH = mph
            top_mph = max(top_mph, mph)
            ssum += mph; cnt += 1
        rows.append({"id": tr["id"], "n": len(pts),
                     "dur_s": pts[-1]["t"] - pts[0]["t"],
                     "dist_yd": dist_yd, "top_mph": top_mph,
                     "avg_mph": ssum / max(1, cnt)})
    rows.sort(key=lambda r: -r["top_mph"])
    print(f"\n--- PLAUSIBILITY (NGS W3 ceiling {NGS_W3_CEILING_MPH} mph; "
          f"Pilot 1: 81/98 over, phantom 100-275 mph) ---")
    over = [r for r in rows if r["top_mph"] > NGS_W3_CEILING_MPH * 1.15]
    print(f"tracklets >15% above ceiling: {len(over)}/{len(rows)}")
    print(f"top-5 phantom speeds (mph): {[round(r['top_mph'],1) for r in rows[:5]]}")
    longest = max(rows, key=lambda r: r["dist_yd"]) if rows else None
    if longest:
        print(f"longest tracklet: id={longest['id']} dist={longest['dist_yd']:.1f} yd "
              f"(known play: 34-yd reception; Pilot 1 measured 57.9 yd)")
    print(f"\n{'id':>4} {'pts':>4} {'dur_s':>6} {'dist_yd':>8} {'top_mph':>8} {'avg_mph':>8}")
    for r in rows[:12]:
        print(f"{r['id']:>4} {r['n']:>4} {r['dur_s']:>6.1f} {r['dist_yd']:>8.1f} "
              f"{r['top_mph']:>8.1f} {r['avg_mph']:>8.1f}")

if __name__ == "__main__":
    main()
