"""ByteTrack-style two-stage association with per-class Kalman filters.

Implements the recommendation table's items 1-3, composing with what exists:

  1. Baseline constant-velocity KF on [x_m, y_m, vx, vy] in FIELD METERS
     (kalman_track.KalmanTrack2D) — predict for gating, update on match,
     coast on miss. One bank for players, one for the ball (item 2: separate
     filters; ball dynamics differ; mixing pollutes both).
  3. ByteTrack two-stage recovery: high-confidence detections match first
     (strict gate); recently-tracked unmatched tracks then get a second,
     relaxed pass against low-confidence detections. Long-lost tracks do
     NOT enter the recovery pass (the diagram-review annotation: only
     recently-tracked tracks are eligible).
  5. Shadow-only: every frame logs filtered position, covariance trace,
     innovation norm, and per-stage match outcomes to the vision shadow
     ledger at weight 0.

Association gate: NOT IoU — the associator runs in field meters, where the
existing sprint-reach gate (v_max*dt, cv-tracklet-association.ts) is the
correct gating region; the Kalman prediction shrinks it by the predicted
position instead of the last-seen position. Distance gate = predicted
position + innovation-scaled radius.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from kalman_track import KalmanBank, KalmanConfig

REPO = Path(__file__).resolve().parents[2]
LEDGER = REPO / "intelligence" / "vision" / "shadow" / "bytetrack_shadow.jsonl"


@dataclass
class TrackedDetection:
    """A detection in field meters (post-homography) with detector confidence."""

    x_m: float
    y_m: float
    confidence: float
    track_id: str | None = None  # assigned by the associator


@dataclass
class ByteTrackConfig:
    high_conf_threshold: float = 0.5      # tau: above = stage-1 candidate
    low_conf_floor: float = 0.1           # below = discarded as background
    stage1_gate_sigma: float = 2.0        # gate radius in units of track pos-std
    stage2_gate_sigma: float = 4.0        # relaxed gate for the recovery pass
    gate_floor_m: float = 0.7             # radius never tighter than ~2.3x the
                                          # detector noise (0.3 m std) — the
                                          # classic too-tight-Kalman-gate churn
                                          # bug: a converged pos_std (~0.1 m)
                                          # makes a 2-sigma gate tighter than
                                          # the measurement jitter itself
    confirm_hits: int = 3                 # ByteTrack tentative period: a track
                                          # is confirmed after this many hits;
                                          # before that its gate is widened
                                          # (velocity est. is garbage after 1-2
                                          # updates — huge P_vv swings predict
                                          # the position wildly and the next
                                          # detection falls outside a tight gate)
    tentative_gate_boost: float = 3.0     # gate multiplier for tentative tracks
    recovery_max_coast: int = 15          # stage-2 eligibility = still alive in
                                          # the bank (not yet retired). The paper's
                                          # "recently tracked" line is stricter,
                                          # but the sports occlusion case we must
                                          # recover (crossing, 0.5s+) runs longer
                                          # than 3 frames; a retired track cannot
                                          # recover at all.
    ball_conf_floor: float = 0.15         # ball detections are rare; lower bar
    max_coast_frames: int = 15            # retire after this many misses


@dataclass
class FrameAssociation:
    """Per-frame association outcome — the shadow row's payload."""

    frame_t: float
    stage1_matches: list[tuple[str, int]] = field(default_factory=list)
    stage2_matches: list[tuple[str, int]] = field(default_factory=list)
    new_tracks: list[str] = field(default_factory=list)
    coasting: list[str] = field(default_factory=list)
    retired: list[str] = field(default_factory=list)
    rejected_low_conf: int = 0


class KalmanByteTracker:
    """Two-stage ByteTrack association over per-class Kalman banks."""

    def __init__(self, cfg: ByteTrackConfig | None = None,
                 player_cfg: KalmanConfig | None = None,
                 ball_cfg: KalmanConfig | None = None) -> None:
        self.cfg = cfg or ByteTrackConfig()
        # Item 2: SEPARATE banks. Ball filter tuned for faster dynamics
        # (higher process noise: catches/throws are impulses players don't see).
        self.players = KalmanBank(player_cfg or KalmanConfig())
        self.ball = KalmanBank(ball_cfg or KalmanConfig(
            pos_meas_std=0.5,      # the ball is small; box noise is worse
            vel_process_std=6.0,   # a thrown ball accelerates hard
            pos_process_std=1.5,
        ))
        self.recently_tracked: dict[str, int] = {}  # track_id -> frames since match
        self.track_hits: dict[str, int] = {}        # track_id -> total matches (confirmation)
        self._next_id: int = 1                      # monotonic: len()-based ids
                                                    # collide after retirement

    # -- gating -------------------------------------------------------------
    def _gate_ok(self, bank: KalmanBank, track_id: str, x: float, y: float,
                 sigma: float) -> bool:
        """Distance gate centered on the PREDICTED position, scaled by the
        track's own uncertainty (the Kalman contribution to gating).
        Tentative (unconfirmed) tracks get a boosted gate: their velocity
        estimate is still garbage and the tight gate causes ID churn."""
        trk = bank.tracks.get(track_id)
        if trk is None:
            return False
        hits = self.track_hits.get(track_id, 0)
        if hits < self.cfg.confirm_hits:
            sigma *= self.cfg.tentative_gate_boost
        std = max(trk.position_std, self.cfg.gate_floor_m / sigma)
        dist = math.hypot(x - trk.x, y - trk.y)
        # coasting allowance: a coasted prediction carries unmodeled velocity
        # bias (the filter is overconfident after occlusion — its P does not
        # know the velocity estimate was seeded from noisy finite differences).
        # Allow ~0.15 m of drift per coasted frame.
        coast_allowance = trk.coast_frames * 0.15
        return dist <= sigma * std + coast_allowance

    # -- the two-stage match --------------------------------------------------
    def associate(self, players: list[TrackedDetection],
                  ball: TrackedDetection | None, t: float) -> FrameAssociation:
        cfg = self.cfg
        out = FrameAssociation(frame_t=t)

        hi = [d for d in players if d.confidence >= cfg.high_conf_threshold]
        lo = [d for d in players
              if cfg.low_conf_floor <= d.confidence < cfg.high_conf_threshold]
        out.rejected_low_conf = sum(1 for d in players if d.confidence < cfg.low_conf_floor)

        # predict every existing player track forward (coast if no measurement)
        for tid in list(self.players.tracks):
            self.players.tracks[tid].predict(t, self.players.cfg)
            self.recently_tracked[tid] = self.recently_tracked.get(tid, 0) + 1

        matched_tracks: set[str] = set()
        used_dets: set[int] = set()

        # ---- stage 1: GLOBAL greedy assignment (all pairs, sorted by dist).
        # Per-track greedy iteration lets two tracks steal one detection back
        # and forth across frames (observed as 23 tracks for 2 players — the
        # classic churn). Global sort: each track and det used at most once.
        pairs = []
        for tid, trk in self.players.tracks.items():
            for di, d in enumerate(hi):
                if not self._gate_ok(self.players, tid, d.x_m, d.y_m, cfg.stage1_gate_sigma):
                    continue
                dist = math.hypot(d.x_m - trk.x, d.y_m - trk.y)
                pairs.append((dist, tid, di))
        pairs.sort(key=lambda p: p[0])
        for dist, tid, di in pairs:
            if tid in matched_tracks or di in used_dets:
                continue
            d = hi[di]
            matched_tracks.add(tid)
            used_dets.add(di)
            self.players.step(tid, d.x_m, d.y_m, t)
            d.track_id = tid
            out.stage1_matches.append((tid, di))
            self.recently_tracked[tid] = 0
            self.track_hits[tid] = self.track_hits.get(tid, 0) + 1
        for tid in self.players.tracks:
            if tid not in matched_tracks and self.recently_tracked.get(tid, 999) <= cfg.recovery_max_coast:
                out.coasting.append(tid)  # may still enter stage 2

        # ---- stage 2 (ByteTrack recovery): unmatched RECENT tracks x low-conf
        stage2_tracks = [tid for tid in out.coasting
                         if self.recently_tracked.get(tid, 999) <= cfg.recovery_max_coast]
        pairs2 = []
        for tid in stage2_tracks:
            for di, d in enumerate(lo):
                if ("lo", di) in used_dets:
                    continue
                if not self._gate_ok(self.players, tid, d.x_m, d.y_m, cfg.stage2_gate_sigma):
                    continue
                dist = math.hypot(d.x_m - self.players.tracks[tid].x,
                                  d.y_m - self.players.tracks[tid].y)
                pairs2.append((dist, tid, di))
        pairs2.sort(key=lambda p: p[0])
        for dist, tid, di in pairs2:
            if tid in matched_tracks or ("lo", di) in used_dets:
                continue
            d = lo[di]
            used_dets.add(("lo", di))
            matched_tracks.add(tid)
            self.players.step(tid, d.x_m, d.y_m, t)
            d.track_id = tid
            out.stage2_matches.append((tid, di))
            self.recently_tracked[tid] = 0
            self.track_hits[tid] = self.track_hits.get(tid, 0) + 1
            if tid in out.coasting:
                out.coasting.remove(tid)

        # ---- birth: unmatched high-confidence detections start new tracks
        for di, d in enumerate(hi):
            if di not in used_dets:
                tid = f"P-{self._next_id:03d}"
                self._next_id += 1
                self.players.step(tid, d.x_m, d.y_m, t)
                self.recently_tracked[tid] = 0
                self.track_hits[tid] = 1
                d.track_id = tid
                out.new_tracks.append(tid)

        # ---- retirement: tracks coasting beyond the limit are DELETED from
        # the bank (zombie coasters otherwise pollute every future gate check
        # and stage-2 pair pool — observed 30 tracks for 2 real players).
        for tid in list(self.players.tracks):
            trk = self.players.tracks[tid]
            if trk.coast_frames > cfg.max_coast_frames:
                del self.players.tracks[tid]
                self.recently_tracked.pop(tid, None)
                self.track_hits.pop(tid, None)
                out.retired.append(tid)

        # ---- ball: separate bank, simple nearest-gate (single object)
        if ball is not None:
            self.ball.step("BALL", ball.x_m, ball.y_m, t)

        return out

    # -- shadow logging ------------------------------------------------------
    def shadow_row(self, out: FrameAssociation, stage: str = "associate") -> dict:
        """The fail-closed ledger row: filtered state + tr(P) + innovation norm,
        weight 0, for every track touched this frame."""
        rows = []
        for bank_name, bank in (("player", self.players), ("ball", self.ball)):
            for tid, trk in bank.tracks.items():
                innov = bank.innovation_magnitude(tid)
                rows.append({
                    "bank": bank_name, "track_id": tid,
                    "x_m": round(trk.x, 3), "y_m": round(trk.y, 3),
                    "vx": round(trk.vx, 3), "vy": round(trk.vy, 3),
                    "pos_std_m": round(trk.position_std, 4),
                    "trace_P": round(sum(trk.P[i] for i in (0, 5, 10, 15)), 4),
                    "innovation_norm": round(innov, 4) if innov is not None else None,
                    "coast_frames": trk.coast_frames,
                })
        return {
            "ts": datetime.now(timezone.utc).isoformat(),
            "signal_family": "bytetrack_kalman_association",
            "stage": stage,
            "frame_t": round(out.frame_t, 4),
            "stage1_matches": out.stage1_matches,
            "stage2_matches": out.stage2_matches,
            "new_tracks": out.new_tracks,
            "coasting": out.coasting,
            "retired": out.retired,
            "rejected_low_conf": out.rejected_low_conf,
            "tracks": rows,
            "weight": 0.0,
            "validation_spec_met": False,
            "honesty": "uncalibrated_shadow",
        }

    def write_shadow(self, out: FrameAssociation) -> None:
        LEDGER.parent.mkdir(parents=True, exist_ok=True)
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(json.dumps(self.shadow_row(out)) + "\n")
