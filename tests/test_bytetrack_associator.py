"""Unit tests for intelligence/vision/bytetrack_associator.py

Covers:
  - Detection partitioning (_partition_detections)
  - Track prediction and coasting (_predict_players)
  - Stage 1 matching and greedy association (_match_stage1)
  - Stage 2 ByteTrack recovery pass (_match_stage2)
  - Track birth and monotonic ID generation (_birth_new_tracks)
  - Stale track retirement (_retire_stale_tracks)
  - Ball tracking integration
"""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "intelligence" / "vision"))

from bytetrack_associator import (  # noqa: E402
    ByteTrackConfig,
    KalmanByteTracker,
    TrackedDetection,
)


def test_partition_detections():
    cfg = ByteTrackConfig(high_conf_threshold=0.5, low_conf_floor=0.1)
    tracker = KalmanByteTracker(cfg)

    dets = [
        TrackedDetection(x_m=1.0, y_m=2.0, confidence=0.9),
        TrackedDetection(x_m=3.0, y_m=4.0, confidence=0.5),
        TrackedDetection(x_m=5.0, y_m=6.0, confidence=0.49),
        TrackedDetection(x_m=7.0, y_m=8.0, confidence=0.1),
        TrackedDetection(x_m=9.0, y_m=10.0, confidence=0.09),
        TrackedDetection(x_m=11.0, y_m=12.0, confidence=0.0),
    ]

    hi, lo, rejected = tracker._partition_detections(dets)
    assert len(hi) == 2
    assert hi[0].confidence == 0.9 and hi[1].confidence == 0.5
    assert len(lo) == 2
    assert lo[0].confidence == 0.49 and lo[1].confidence == 0.1
    assert rejected == 2


def test_predict_players():
    cfg = ByteTrackConfig()
    tracker = KalmanByteTracker(cfg)

    # Initialize a track
    tracker.players.step("P-001", 10.0, 10.0, t=0.0)
    tracker.recently_tracked["P-001"] = 0

    assert tracker.recently_tracked["P-001"] == 0
    tracker._predict_players(t=0.1)
    assert tracker.recently_tracked["P-001"] == 1
    assert tracker.players.tracks["P-001"].x == 10.0


def test_stage1_match_and_birth():
    cfg = ByteTrackConfig(high_conf_threshold=0.5)
    tracker = KalmanByteTracker(cfg)

    # Frame 0: High confidence detection should birth new track P-001
    d0 = TrackedDetection(x_m=5.0, y_m=5.0, confidence=0.9)
    out0 = tracker.associate([d0], None, t=0.0)
    assert len(out0.new_tracks) == 1
    assert out0.new_tracks[0] == "P-001"
    assert d0.track_id == "P-001"
    assert tracker.track_hits["P-001"] == 1

    # Frame 1: Detection close to P-001 matches in stage 1
    d1 = TrackedDetection(x_m=5.1, y_m=5.1, confidence=0.85)
    out1 = tracker.associate([d1], None, t=0.1)
    assert len(out1.stage1_matches) == 1
    assert out1.stage1_matches[0] == ("P-001", 0)
    assert d1.track_id == "P-001"
    assert tracker.track_hits["P-001"] == 2
    assert len(out1.new_tracks) == 0


def test_stage2_recovery():
    cfg = ByteTrackConfig(
        high_conf_threshold=0.5,
        low_conf_floor=0.1,
        recovery_max_coast=15,
    )
    tracker = KalmanByteTracker(cfg)

    # Frame 0: Establish track with high conf
    d0 = TrackedDetection(x_m=10.0, y_m=10.0, confidence=0.9)
    tracker.associate([d0], None, t=0.0)
    assert "P-001" in tracker.players.tracks

    # Frame 1: Occlusion / low confidence detection (e.g. 0.3)
    # Track coasts in stage 1, then stage 2 recovers it
    d1 = TrackedDetection(x_m=10.05, y_m=10.05, confidence=0.3)
    out1 = tracker.associate([d1], None, t=0.1)

    assert len(out1.stage1_matches) == 0
    assert len(out1.stage2_matches) == 1
    assert out1.stage2_matches[0] == ("P-001", 0)
    assert d1.track_id == "P-001"
    assert "P-001" not in out1.coasting


def test_stale_track_retirement():
    cfg = ByteTrackConfig(max_coast_frames=2)
    tracker = KalmanByteTracker(cfg)

    # Frame 0: Establish track
    d0 = TrackedDetection(x_m=0.0, y_m=0.0, confidence=0.9)
    tracker.associate([d0], None, t=0.0)
    assert "P-001" in tracker.players.tracks

    # Frames without detection
    out1 = tracker.associate([], None, t=0.1)
    assert "P-001" in out1.coasting
    assert "P-001" in tracker.players.tracks

    out2 = tracker.associate([], None, t=0.2)
    assert "P-001" in out2.coasting
    assert "P-001" in tracker.players.tracks

    # Coast frames will now exceed max_coast_frames (2)
    out3 = tracker.associate([], None, t=0.3)
    assert "P-001" in out3.retired
    assert "P-001" not in tracker.players.tracks
    assert "P-001" not in tracker.recently_tracked
    assert "P-001" not in tracker.track_hits
    assert "P-001" not in tracker.last_det_pos


def test_ball_tracking():
    cfg = ByteTrackConfig()
    tracker = KalmanByteTracker(cfg)

    ball_det = TrackedDetection(x_m=15.0, y_m=20.0, confidence=0.8)
    out = tracker.associate([], ball_det, t=0.0)

    assert "BALL" in tracker.ball.tracks
    ball_trk = tracker.ball.tracks["BALL"]
    assert ball_trk.x == 15.0
    assert ball_trk.y == 20.0
    assert out.frame_t == 0.0
