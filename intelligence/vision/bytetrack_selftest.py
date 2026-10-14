"""ByteTrack associator self-test — the three claims, measured:

  1. OCCLUSION RECOVERY (the reason ByteTrack exists): a player crossed by a
     teammate drops below tau for several frames. Classic single-stage
     matching loses the track; the second stage recovers it. Measured as:
     same track_id before and after the occlusion, recovered via stage 2.
  2. BACKGROUND REJECTION: low-confidence noise boxes far from any track do
     NOT get attached by the relaxed second gate (the diagram-review point:
     background never matches a predicted location).
  3. BALL SEPARATION: the ball bank's filter state stays distinct from
     player tracks; its tuned dynamics (higher process noise) track a
     thrown ball's acceleration better than player tuning would.

Shadow rows appended at weight 0. Exit 0 iff all claims hold.
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
from bytetrack_associator import ByteTrackConfig, KalmanByteTracker, TrackedDetection  # noqa: E402

FPS = 30.0
N = 150  # 5 s


def main() -> int:
    rng = random.Random(88)
    cfg = ByteTrackConfig()
    tracker = KalmanByteTracker(cfg)
    results = {}

    # ---------------------------------------------------------------
    # Scenario 1: crossing occlusion — player A crosses player B;
    # A's confidence drops below tau for frames 60-75 while crossed.
    # ---------------------------------------------------------------
    tracker = KalmanByteTracker(cfg)
    a_ids = []
    recovered_stage2 = False
    lost_track = False
    for i in range(N):
        t = i / FPS
        dets = []
        # player A: straight line downfield, occluded 60-75 (conf 0.2)
        ax, ay = 4.0 + 1.0 * t, 8.0 * t
        a_conf = 0.2 if 60 <= i <= 75 else 0.9
        dets.append(TrackedDetection(ax + rng.gauss(0, .3), ay + rng.gauss(0, .3), a_conf))
        # player B: crossing route, always high conf
        bx, by = 10.0 - 2.0 * t, 6.0
        dets.append(TrackedDetection(bx + rng.gauss(0, .3), by + rng.gauss(0, .3), 0.9))
        # low-conf background noise, far from everyone
        dets.append(TrackedDetection(40.0 + rng.gauss(0, 2), 40.0 + rng.gauss(0, 2), 0.3))
        out = tracker.associate([d for d in dets if True], None, t)
        tracker.write_shadow(out)
        # which track did A's detection get?
        if a_conf >= cfg.high_conf_threshold:
            a_ids.append(dets[0].track_id)
        if out.stage2_matches:
            recovered_stage2 = True
    # A's identity: same track before/after occlusion?
    pre = a_ids[55] if len(a_ids) > 55 else None
    post = a_ids[-1] if a_ids else None
    results["scenario1"] = {
        "track_before_occlusion": pre,
        "track_after_occlusion": post,
        "identity_preserved": pre is not None and pre == post,
        "stage2_recovery_used": recovered_stage2,
    }

    # ---------------------------------------------------------------
    # Scenario 2: background rejection — noise boxes never join a track.
    # ---------------------------------------------------------------
    # From scenario 1's ledger: count noise detections that became track IDs.
    # Rerun compactly: check that no NEW track was born from the noise box
    # (it stays below the stage-1 gate for every existing track, and new
    # tracks only birth from HIGH-confidence detections; noise is 0.3 < tau
    # so it can only enter via stage 2, and it's far from every gate).
    tracker2 = KalmanByteTracker(cfg)
    noise_became_track = 0
    for i in range(60):
        t = i / FPS
        dets = [
            TrackedDetection(5.0 + 1.0 * t + rng.gauss(0, .3), 5.0 + rng.gauss(0, .3), 0.9),
            TrackedDetection(40.0 + rng.gauss(0, 2), 40.0 + rng.gauss(0, 2), 0.3),
        ]
        out = tracker2.associate(dets, None, t)
        # noise has index 1; if it ever got a track_id, count it
        if dets[1].track_id is not None:
            noise_became_track += 1
    results["scenario2"] = {
        "noise_frames_joined_a_track": noise_became_track,
        "background_rejected": noise_became_track == 0,
    }

    # ---------------------------------------------------------------
    # Scenario 3: ball bank separation — thrown ball decelerating;
    # ball-bank tuning should beat player-bank tuning on a throw.
    # ---------------------------------------------------------------
    # Throw: launch (12, 2) toward (24, 8), flight 1.2s, decel via drag.
    def ball_pos(tt: float) -> tuple[float, float]:
        # simple param: parabola in x-y plane, speed decay
        s = min(tt / 1.2, 1.0)
        x = 12.0 + 12.0 * (1 - (1 - s) ** 2) * 0.85  # decelerating
        y = 2.0 + 6.0 * s * s
        return x, y

    tracker3a = KalmanByteTracker(cfg)  # ball bank (tuned)
    tracker3b = KalmanByteTracker(cfg, ball_cfg=None)
    from kalman_track import KalmanConfig
    tracker3b = KalmanByteTracker(cfg, ball_cfg=KalmanConfig())  # player tuning on ball
    errs_tuned, errs_player = [], []
    for i in range(40):
        t = i / FPS
        if t > 1.3:
            break
        bx, by = ball_pos(t)
        det = TrackedDetection(bx + rng.gauss(0, .5), by + rng.gauss(0, .5), 0.8)
        tracker3a.associate([], det, t)
        tracker3b.associate([], det, t)
        ba = tracker3a.ball.tracks.get("BALL")
        bb = tracker3b.ball.tracks.get("BALL")
        if ba and i > 10:
            errs_tuned.append(math.hypot(ba.x - bx, ba.y - by))
        if bb and i > 10:
            errs_player.append(math.hypot(bb.x - bx, bb.y - by))
    rmse = lambda e: math.sqrt(sum(x * x for x in e) / len(e)) if e else None
    results["scenario3"] = {
        "ball_bank_rmse_m": round(rmse(errs_tuned), 4),
        "player_tuned_bank_rmse_m": round(rmse(errs_player), 4),
        "ball_tuning_better": (rmse(errs_tuned) or 9) <= (rmse(errs_player) or 0),
    }

    # ---------------------------------------------------------------
    print(json.dumps(results, indent=1))
    checks = [
        ("S1: identity preserved through crossing occlusion",
         results["scenario1"]["identity_preserved"]),
        ("S1: stage-2 recovery actually used", results["scenario1"]["stage2_recovery_used"]),
        ("S2: background never joins a track", results["scenario2"]["background_rejected"]),
        ("S3: ball tuning >= player tuning on a throw", results["scenario3"]["ball_tuning_better"]),
    ]
    ok = True
    for name, passed in checks:
        ok &= passed
        print(("PASS" if passed else "FAIL"), "-", name)

    summary = {"ts": datetime.now(timezone.utc).isoformat(),
               "signal_family": "bytetrack_kalman_association",
               "self_test": results,
               "weight": 0.0, "validation_spec_met": False,
               "honesty": "synthetic_self_test"}
    ledger = REPO / "intelligence" / "vision" / "shadow" / "bytetrack_shadow.jsonl"
    with open(ledger, "a", encoding="utf-8") as f:
        f.write(json.dumps(summary) + "\n")
    print("summary row -> bytetrack_shadow.jsonl (weight 0)")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
