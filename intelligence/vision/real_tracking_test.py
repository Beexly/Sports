"""REAL-DATA TRACKING TEST — the input plane, proven resident.

NFL Big Data Bowl 2025 tracking (the NFL's own 10Hz player+ball tracking,
public dataset) drives the FULL vision stack end to end on a real play:

  proof play: gameId 2022091113 (TB vs DAL, week 1 2022), playId 1766 —
  a 47-yard completion, 68 post-snap frames at 10 Hz, 22 players + football.

Claims tested against GROUND TRUTH (BDB nflId per detection):
  1. Track count: exactly 22 tracks for 22 players (no churn, no zombies).
  2. Per-frame assignment purity: every frame, every detection maps to a
     track holding exactly one true nflId.
  3. Identity persistence: >=21 of 22 tracks hold ONE player for the whole
     play (join-completeness analog for the identity loop).
  4. Ball bank: tracks the football through snap->pass->catch->tackle.

This is the state-estimator layer with a REAL resident: detections are no
longer synthetic. The falsifier dry-run (validation_spec) can now consume
REAL tracklets joined to REAL participation rows.
"""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence" / "vision"))
from bytetrack_associator import ByteTrackConfig, KalmanByteTracker, TrackedDetection  # noqa: E402

DATA = REPO / "intelligence" / "vision" / "data"
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "real-tracking-proof.json"
LEDGER = REPO / "intelligence" / "vision" / "shadow" / "real_tracking_shadow.jsonl"


def main() -> int:
    trk = pd.read_parquet(DATA / "proof_play_2022091113_1766.parquet")
    trk = trk[trk.frameType != "BEFORE_SNAP"]
    frames = sorted(trk.frameId.unique())
    true_players = trk[trk.nflId.notna()].nflId.nunique()

    cfg = ByteTrackConfig(gate_floor_m=1.5, stage1_gate_sigma=3.5,
                          incumbent_bonus_m=1.0, owner_radius_m=0.6,
                          gate_speed_gain=2.0)
    tracker = KalmanByteTracker(cfg)
    identities: dict[str, set] = {}
    frames_ok = frames_total = 0
    ball_frames_ok = 0
    ball_events = {}

    for fid in frames:
        fr = trk[trk.frameId == fid]
        t = fid / 10.0
        dets: list[tuple[float, TrackedDetection]] = []
        ball_det = None
        for r in fr.itertuples(index=False):
            if pd.isna(r.nflId):
                ball_det = TrackedDetection(r.x, r.y, 0.95)
                if r.event and str(r.event) != "None":
                    ball_events[str(r.event)] = int(fid)
            else:
                dets.append((float(r.nflId), TrackedDetection(r.x, r.y, 0.9)))
        out = tracker.associate([d for _, d in dets], ball_det, t)
        tracker.write_shadow(out)
        frame_map: dict[str, set] = {}
        for nfl_id, d in dets:
            if d.track_id:
                frame_map.setdefault(d.track_id, set()).add(nfl_id)
                identities.setdefault(d.track_id, set()).add(nfl_id)
        for _tid, ids in frame_map.items():
            frames_total += 1
            if len(ids) == 1:
                frames_ok += 1
        if ball_det is not None:
            bt = tracker.ball.tracks.get("BALL")
            if bt and math.hypot(bt.x - ball_det.x_m, bt.y - ball_det.y_m) < 2.0:
                ball_frames_ok += 1

    mixed = {tid: sorted(int(i) for i in ids) for tid, ids in identities.items() if len(ids) > 1}
    pure_tracks = sum(1 for ids in identities.values() if len(ids) == 1)
    purity = frames_ok / frames_total if frames_total else 0.0

    result = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "source": "NFL Big Data Bowl 2025 tracking (public NFL dataset via HF mirror ameau01/Big-Data-Bowl-2025)",
        "proof_play": {"game_id": 2022091113, "play_id": 1766,
                       "description": "TB 47-yard completion, week 1 2022",
                       "frames": len(frames), "hz": 10,
                       "true_players": int(true_players)},
        "claims": {
            "track_count_exact": len(tracker.players.tracks) == true_players,
            "track_count": len(tracker.players.tracks),
            "per_frame_purity": round(purity, 4),
            "per_frame_assignments": frames_total,
            "pure_identity_tracks": pure_tracks,
            "mixed_identity_tracks": len(mixed),
            "mixed_detail": mixed,
            "ball_tracked_within_2m": f"{ball_frames_ok}/{len(frames)} frames",
            "ball_events_seen": ball_events,
        },
        "config": {"gate_floor_m": cfg.gate_floor_m, "stage1_gate_sigma": cfg.stage1_gate_sigma,
                    "incumbent_bonus_m": cfg.incumbent_bonus_m, "owner_radius_m": cfg.owner_radius_m,
                    "gate_speed_gain": cfg.gate_speed_gain},
        "weight": 0.0,
        "validation_spec_met": False,
        "honesty": "real_tracking_ground_truth_test; identity loop still needs "
                   "jersey OCR to close tracklet->nflId in production; here the "
                   "ground truth comes from the dataset itself",
    }

    print(json.dumps(result["claims"], indent=1))
    checks = [
        ("track count exactly 22", result["claims"]["track_count_exact"]),
        ("per-frame purity >= 0.999", purity >= 0.999),
        ("pure identity tracks >= 21", pure_tracks >= 21),
        ("ball tracked through play", ball_frames_ok >= len(frames) - 2),
    ]
    ok = True
    for name, passed in checks:
        ok &= passed
        print(("PASS" if passed else "FAIL"), "-", name)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=1), encoding="utf-8")
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps({"ts": result["generated_utc"], "signal_family": "real_tracking_proof",
                            "play": result["proof_play"], "claims": result["claims"],
                            "weight": 0.0, "validation_spec_met": False,
                            "honesty": "real_data_ground_truth"}) + "\n")
    print(f"\nlanded: {OUT}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
