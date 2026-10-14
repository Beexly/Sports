"""Vision Tracklet Adapter — wired behind VISION-CONTRACT.md.

Implements Target 3:
  - Constant-velocity Kalman filter on [x_m, y_m, vx, vy] in field meters after homography
  - Optional ByteTrack-style second association for low-confidence detections
  - Separate 4-state Kalman filter bank for the ball (never mixed with player tracks)
  - Logs filtered position, trace(P), and innovation norm to intelligence/vision/shadow/vision_shadow.jsonl
  - Do not introduce DeepSORT until jersey OCR + roster join is reliable
  - Weight forced to 0.0, validation_spec_met=False until VISION-CONTRACT falsifier and Identity Loop spec are met
"""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
if str(REPO / "intelligence" / "vision") not in sys.path:
    sys.path.insert(0, str(REPO / "intelligence" / "vision"))

from bytetrack_associator import ByteTrackConfig, KalmanByteTracker, TrackedDetection  # noqa: E402
from kalman_track import KalmanBank, KalmanConfig  # noqa: E402

VISION_SHADOW_LEDGER = REPO / "intelligence" / "vision" / "shadow" / "vision_shadow.jsonl"
BYTETRACK_SHADOW_LEDGER = REPO / "intelligence" / "vision" / "shadow" / "bytetrack_shadow.jsonl"
BRAIN_DIR = REPO / "artifacts" / "gse_brain"

VALIDATION_SPEC_MET = False
FORCED_WEIGHT = 0.0


class VisionTrackletAdapter:
    """Contract-enforced Tracklet + Ball state estimator in field meters (post-homography).

    Separates player tracks (4-state CV Kalman + ByteTrack 2-stage association)
    from the ball track (dedicated 4-state CV Kalman filter). No DeepSORT visual
    embedding association is enabled while jersey OCR + roster join is below spec.
    """

    def __init__(self, enable_bytetrack_stage2: bool = True) -> None:
        self.enable_bytetrack_stage2 = enable_bytetrack_stage2
        cfg = ByteTrackConfig(
            high_conf_threshold=0.60,
            low_conf_floor=0.15 if enable_bytetrack_stage2 else 0.60,
            gate_floor_m=1.5,
            stage1_gate_sigma=3.5,
            incumbent_bonus_m=1.0,
            owner_radius_m=0.6,
            gate_speed_gain=2.0,
        )
        self.tracker = KalmanByteTracker(cfg)
        # Dedicated 4-state ball filter with tuned measurement noise
        self.ball_bank = KalmanBank(KalmanConfig(pos_meas_std=0.25, vel_process_std=2.50, pos_process_std=0.60))

    def step_frame(
        self,
        player_detections_m: list[tuple[float, float, float]],
        ball_detection_m: tuple[float, float, float] | None,
        frame_t: float,
    ) -> dict[str, Any]:
        """Step one post-homography frame in field meters.

        player_detections_m: list of (x_m, y_m, confidence)
        ball_detection_m: (x_m, y_m, confidence) or None
        """
        p_dets = [TrackedDetection(x_m=x, y_m=y, confidence=c) for x, y, c in player_detections_m]
        # Pass ball=None to tracker.associate so ball is handled strictly by our dedicated 4-state ball_bank
        assoc = self.tracker.associate(p_dets, None, frame_t)

        if ball_detection_m is not None:
            bx, by, _bc = ball_detection_m
            self.ball_bank.step("BALL-01", bx, by, frame_t)
        else:
            if "BALL-01" in self.ball_bank.tracks:
                self.ball_bank.step("BALL-01", None, None, frame_t)

        player_states = []
        for tid, trk in sorted(self.tracker.players.tracks.items()):
            innov = self.tracker.players.innovation_magnitude(tid)
            tr_p = sum(trk.P[i] for i in (0, 5, 10, 15))
            player_states.append({
                "track_id": tid,
                "bank": "player",
                "x_m": round(trk.x, 4),
                "y_m": round(trk.y, 4),
                "vx_ms": round(trk.vx, 4),
                "vy_ms": round(trk.vy, 4),
                "pos_std_m": round(trk.position_std, 4),
                "trace_P": round(tr_p, 4),
                "innovation_norm": round(innov, 4) if innov is not None else None,
                "coast_frames": trk.coast_frames,
            })

        ball_state = None
        if "BALL-01" in self.ball_bank.tracks:
            btrk = self.ball_bank.tracks["BALL-01"]
            binnov = self.ball_bank.innovation_magnitude("BALL-01")
            btr_p = sum(btrk.P[i] for i in (0, 5, 10, 15))
            ball_state = {
                "track_id": "BALL-01",
                "bank": "ball",
                "x_m": round(btrk.x, 4),
                "y_m": round(btrk.y, 4),
                "vx_ms": round(btrk.vx, 4),
                "vy_ms": round(btrk.vy, 4),
                "pos_std_m": round(btrk.position_std, 4),
                "trace_P": round(btr_p, 4),
                "innovation_norm": round(binnov, 4) if binnov is not None else None,
                "coast_frames": btrk.coast_frames,
            }

        return {
            "frame_t": round(frame_t, 4),
            "stage1_matches": len(assoc.stage1_matches),
            "stage2_matches": len(assoc.stage2_matches),
            "new_tracks": len(assoc.new_tracks),
            "coasting_tracks": len(assoc.coasting),
            "player_tracks": player_states,
            "ball_track": ball_state,
            "weight": FORCED_WEIGHT,
            "validation_spec_met": VALIDATION_SPEC_MET,
        }


def run_proof_play_and_log() -> dict[str, Any]:
    """Run VisionTrackletAdapter on real BDB 2025 proof play (2022091113 / 1766) with synthetic low-conf stress test."""
    import pandas as pd

    proof_parquet = REPO / "intelligence" / "vision" / "data" / "proof_play_2022091113_1766.parquet"
    df = pd.read_parquet(proof_parquet)
    df = df[df.frameType != "BEFORE_SNAP"]
    frames = sorted(df.frameId.unique())

    adapter = VisionTrackletAdapter(enable_bytetrack_stage2=True)
    frame_logs = []
    stage2_rescues = 0

    for idx, fid in enumerate(frames):
        fr = df[df.frameId == fid]
        t = fid / 10.0
        p_dets = []
        b_det = None
        for r_idx, r in enumerate(fr.itertuples(index=False)):
            # Convert yards to field meters (1 yd = 0.9144 m) — post-homography field meter space
            xm = float(r.x) * 0.9144
            ym = float(r.y) * 0.9144
            if pd.isna(r.nflId):
                b_det = (xm, ym, 0.95)
            else:
                # Every 7th frame on one interior track, emit low-conf (0.35) to exercise ByteTrack stage-2 association
                conf = 0.35 if (idx > 3 and idx % 7 == 0 and r_idx % 11 == 0) else 0.92
                p_dets.append((xm, ym, conf))
        out = adapter.step_frame(p_dets, b_det, t)
        stage2_rescues += out["stage2_matches"]
        frame_logs.append(out)

    now_iso = datetime.now(timezone.utc).isoformat()
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")

    # Compute summary metrics across play
    all_p_traces = [p["trace_P"] for f in frame_logs for p in f["player_tracks"]]
    all_p_innovs = [p["innovation_norm"] for f in frame_logs for p in f["player_tracks"] if p["innovation_norm"] is not None]
    all_b_traces = [f["ball_track"]["trace_P"] for f in frame_logs if f["ball_track"] is not None]
    all_b_innovs = [f["ball_track"]["innovation_norm"] for f in frame_logs if f["ball_track"] and f["ball_track"]["innovation_norm"] is not None]

    honesty = {
        "http_status": "LOCAL_PARQUET_FROM_PUBLIC_HF_MIRROR_200",
        "source": "NFL Big Data Bowl 2025 10Hz tracking (proof_play_2022091113_1766.parquet, converted to field meters 1 yd = 0.9144 m)",
        "truncation": False,
        "access_restriction": "Public research dataset; broadcast camera footage + jersey OCR remain unbuilt in production",
        "derivation": "4-state constant-velocity Kalman [x_m, y_m, vx, vy] post-homography + ByteTrack stage-2 low-confidence association + separate 4-state ball filter; DeepSORT disabled until jersey OCR + roster join is reliable",
        "joins_on": ["game_id", "play_id", "gsis_id (via nflId->roster when OCR/tracking ID present)"],
        "weight": FORCED_WEIGHT,
        "validation_spec_met": VALIDATION_SPEC_MET,
        "weight_statement": "Weight remains 0 until VISION-CONTRACT falsifier (per-play uncertainty strictly narrower than market on the same margin) and Identity Loop validation spec (manual OCR >=98% accuracy) are met.",
    }

    summary = {
        "generated_utc": now_iso,
        "source": "vision_tracklet_adapter",
        "contract": "intelligence/vision/VISION-CONTRACT.md",
        "proof_play": {"game_id": 2022091113, "play_id": 1766, "frames_processed": len(frame_logs)},
        "active_player_tracks_final": len(frame_logs[-1]["player_tracks"]),
        "ball_track_separated": True,
        "deepsort_enabled": False,
        "bytetrack_stage2_low_conf_matches": stage2_rescues,
        "player_kalman_summary": {
            "mean_trace_P": round(sum(all_p_traces) / len(all_p_traces), 4),
            "mean_innovation_norm_m": round(sum(all_p_innovs) / len(all_p_innovs), 4),
            "sample_final_track": frame_logs[-1]["player_tracks"][0] if frame_logs[-1]["player_tracks"] else None,
        },
        "ball_kalman_summary": {
            "mean_trace_P": round(sum(all_b_traces) / len(all_b_traces), 4),
            "mean_innovation_norm_m": round(sum(all_b_innovs) / len(all_b_innovs), 4),
            "final_ball_state": frame_logs[-1]["ball_track"],
        },
        "weight": FORCED_WEIGHT,
        "validation_spec_met": VALIDATION_SPEC_MET,
        "honesty": honesty,
        "sample_frames": [frame_logs[0], frame_logs[len(frame_logs) // 2], frame_logs[-1]],
    }

    BRAIN_DIR.mkdir(parents=True, exist_ok=True)
    p_art = BRAIN_DIR / f"vision_tracklet_kalman_{stamp}.json"
    p_lat = BRAIN_DIR / "vision_tracklet_kalman_latest.json"
    p_art.write_text(json.dumps(summary, indent=1), encoding="utf-8")
    p_lat.write_text(json.dumps(summary, indent=1), encoding="utf-8")

    # Log to vision_shadow.jsonl
    VISION_SHADOW_LEDGER.parent.mkdir(parents=True, exist_ok=True)
    with open(VISION_SHADOW_LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "ts": now_iso,
            "source": "vision_tracklet_adapter",
            "signal_family": "kalman_cv_bytetrack_player_and_ball",
            "game_id": 2022091113,
            "play_id": 1766,
            "frames": len(frame_logs),
            "player_tracks": len(frame_logs[-1]["player_tracks"]),
            "ball_separated": True,
            "deepsort_enabled": False,
            "bytetrack_stage2_matches": stage2_rescues,
            "player_mean_trace_P": summary["player_kalman_summary"]["mean_trace_P"],
            "player_mean_innovation_norm_m": summary["player_kalman_summary"]["mean_innovation_norm_m"],
            "ball_mean_trace_P": summary["ball_kalman_summary"]["mean_trace_P"],
            "ball_mean_innovation_norm_m": summary["ball_kalman_summary"]["mean_innovation_norm_m"],
            "sample_player_state": summary["player_kalman_summary"]["sample_final_track"],
            "sample_ball_state": summary["ball_kalman_summary"]["final_ball_state"],
            "artifact_path": str(p_art.relative_to(REPO)).replace("\\", "/"),
            "weight": FORCED_WEIGHT,
            "validation_spec_met": VALIDATION_SPEC_MET,
            "honesty_note": honesty["derivation"],
        }) + "\n")

    return summary


if __name__ == "__main__":
    res = run_proof_play_and_log()
    print(json.dumps({
        "player_tracks": res["active_player_tracks_final"],
        "ball_separated": res["ball_track_separated"],
        "bytetrack_stage2_matches": res["bytetrack_stage2_low_conf_matches"],
        "player_kalman": res["player_kalman_summary"],
        "ball_kalman": res["ball_kalman_summary"],
        "weight": res["weight"],
        "validation_spec_met": res["validation_spec_met"],
    }, indent=1))
