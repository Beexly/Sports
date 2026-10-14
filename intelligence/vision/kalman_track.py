"""Kalman track filter — the uncertainty-bearing layer the associator lacks.

Composes with what exists; does not duplicate it:
  - cv-tracklet-association.ts already has constant-velocity COASTING
    (reachable-set gating, 15-frame coast) but tracks carry NO uncertainty:
    the gate radius is v_max*dt for everyone, and there is no innovation
    signal. This filter adds the Gaussian belief: per-track predicted
    covariance, measurement-weighted updates, and the innovation (measurement
    - prediction) whose magnitude flags possible ID switches or bad
    detections — the shadow feature the external agent's analysis named.

Design per the agent's correct recommendations:
  - runs in FIELD-METER space (post-homography), never raw pixels: broadcast
    pan/zoom would contaminate the velocity estimate in pixel space.
  - constant-velocity model; the ball gets a dedicated low-dim (x, y, vx, vy)
    instance with tuned measurement noise.
  - coasting on missed detections: predict-only updates grow P (honest
    uncertainty growth), positions still emitted, innovation null.
  - fail-closed: emitted through the shadow ledger at weight 0 like every
    other vision product (VISION-CONTRACT.md discipline).
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path


def _mat4_flat_to_2d(flat):
    return [flat[i*4:(i+1)*4] for i in range(4)]


def _mat_mul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)]
            for i in range(4)]


def _mat_add(A, B):
    return [[A[i][j] + B[i][j] for j in range(4)] for i in range(4)]


REPO = Path(__file__).resolve().parents[2]
LEDGER = REPO / "intelligence" / "vision" / "shadow" / "kalman_shadow.jsonl"

# ---- tuning (defaults from SORT-family practice, documented for the spec) ----
@dataclass
class KalmanConfig:
    """Process/measurement noise in FIELD METERS.

    pos_meas_std: detector box-center noise after homography (~0.3 m typical
      for broadcast-grade boxes at mid-depth).
    vel_process_std: per-second velocity random walk (~0.8 m/s^2 allows a
      hard cut; a linear route is smoother).
    pos_process_std: position drift per second of coast (~0.5 m).
    """

    pos_meas_std: float = 0.30
    vel_process_std: float = 0.80
    pos_process_std: float = 0.50
    coast_limit_frames: int = 15  # matches MotionAwareOptions.coastFrames default


@dataclass
class KalmanTrack2D:
    """Gaussian belief over (x, y, vx, vy) in field meters."""

    track_id: str
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    # 4x4 covariance, stored flat row-major
    P: list[float] = field(default_factory=lambda: [
        1.0, 0, 0, 0,
        0, 1.0, 0, 0,
        0, 0, 4.0, 0,
        0, 0, 0, 4.0,
    ])
    coast_frames: int = 0
    last_t: float | None = None
    last_innovation: tuple[float, float] | None = None
    _init: bool = False

    # -- linear algebra (2-state-per-axis, no numpy dependency) --
    def _predict(self, dt: float, cfg: KalmanConfig) -> None:
        # x += vx*dt ; y += vy*dt
        self.x += self.vx * dt
        self.y += self.vy * dt
        F = [[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]]
        qpx = (cfg.pos_process_std * dt) ** 2
        qvx = (cfg.vel_process_std * dt) ** 2
        Q = [[qpx, 0, 0, 0], [0, qpx, 0, 0], [0, 0, qvx, 0], [0, 0, 0, qvx]]
        P2 = _mat4_flat_to_2d(self.P)
        FPFt = _mat_mul(_mat_mul(F, P2), [list(r) for r in zip(*F)])  # F P F^T
        Pn = _mat_add(FPFt, Q)
        self.P = [Pn[i][j] for i in range(4) for j in range(4)]

    def predict(self, t: float, cfg: KalmanConfig | None = None) -> None:
        cfg = cfg or KalmanConfig()
        if self.last_t is None:
            self.last_t = t
            return
        dt = t - self.last_t
        if dt <= 0:
            return
        self._predict(dt, cfg)
        self.last_t = t
        self.coast_frames += 1
        self.last_innovation = None  # no measurement this frame

    def update(self, x: float, y: float, t: float,
               cfg: KalmanConfig | None = None) -> tuple[float, float]:
        """Measurement update. Returns the innovation (measurement - prediction)."""
        cfg = cfg or KalmanConfig()
        if not self._init:
            self.x, self.y = x, y
            self.last_t = t
            self._init = True
            self.last_innovation = (0.0, 0.0)
            return self.last_innovation
        if self.last_t is not None and t > self.last_t:
            self._predict(t - self.last_t, cfg)
        self.last_t = t
        self.coast_frames = 0
        r_meas = cfg.pos_meas_std ** 2
        iy, ix = y - self.y, x - self.x
        P2 = _mat4_flat_to_2d(self.P)
        # H = [[1,0,0,0],[0,1,0,0]] (positions observed)
        # S = H P H^T + R
        s00, s01 = P2[0][0] + r_meas, P2[0][1]
        s10, s11 = P2[1][0], P2[1][1] + r_meas
        det = s00 * s11 - s01 * s10
        if abs(det) < 1e-12:
            self.x, self.y = x, y
            self.last_innovation = (ix, iy)
            return self.last_innovation
        # K = P H^T S^-1 : 4x2 (velocity rows included!)
        k00 = (P2[0][0] * s11 - P2[0][1] * s10) / det
        k01 = (P2[0][1] * s00 - P2[0][0] * s01) / det
        k10 = (P2[1][0] * s11 - P2[1][1] * s10) / det
        k11 = (P2[1][1] * s00 - P2[1][0] * s01) / det
        k20 = (P2[2][0] * s11 - P2[2][1] * s10) / det
        k21 = (P2[2][1] * s00 - P2[2][0] * s01) / det
        k30 = (P2[3][0] * s11 - P2[3][1] * s10) / det
        k31 = (P2[3][1] * s00 - P2[3][0] * s01) / det
        K = [[k00, k01], [k10, k11], [k20, k21], [k30, k31]]
        # state update: all four states get the innovation
        self.x += K[0][0] * ix + K[0][1] * iy
        self.y += K[1][0] * ix + K[1][1] * iy
        self.vx += K[2][0] * ix + K[2][1] * iy
        self.vy += K[3][0] * ix + K[3][1] * iy
        # P = (I - K H) P, full 4x4
        # H P = rows [P2[0], P2[1]]
        KH_P = [[K[i][0] * P2[0][j] + K[i][1] * P2[1][j] for j in range(4)] for i in range(4)]
        Pn = [[P2[i][j] - KH_P[i][j] for j in range(4)] for i in range(4)]
        self.P = [Pn[i][j] for i in range(4) for j in range(4)]
        self.last_innovation = (ix, iy)
        return self.last_innovation

    @property
    def position_std(self) -> float:
        """Marginal position std — the honest uncertainty the gate consumes."""
        return math.sqrt(max(self.P[0], 1e-9))

    def as_dict(self) -> dict:
        return {"track_id": self.track_id, "x_m": round(self.x, 4), "y_m": round(self.y, 4),
                "vx_ms": round(self.vx, 4), "vy_ms": round(self.vy, 4),
                "pos_std_m": round(self.position_std, 4),
                "coast_frames": self.coast_frames,
                "innovation": (None if self.last_innovation is None else
                               [round(self.last_innovation[0], 4), round(self.last_innovation[1], 4)])}


class KalmanBank:
    """Per-track Kalman filters keyed by tracklet id."""

    def __init__(self, cfg: KalmanConfig | None = None) -> None:
        self.cfg = cfg or KalmanConfig()
        self.tracks: dict[str, KalmanTrack2D] = {}

    def step(self, track_id: str, x: float | None, y: float | None, t: float) -> dict:
        trk = self.tracks.get(track_id)
        if trk is None:
            if x is None or y is None:
                return {"track_id": track_id, "status": "no_track_no_measurement"}
            trk = KalmanTrack2D(track_id=track_id, x=x, y=y, last_t=t, _init=True)
            self.tracks[track_id] = trk
            return {"track_id": track_id, "status": "initialized", **trk.as_dict()}
        if x is None or y is None:
            if trk.coast_frames >= self.cfg.coast_limit_frames:
                return {"track_id": track_id, "status": "retired_after_coast"}
            trk.predict(t, self.cfg)
            return {"track_id": track_id, "status": "coasting", **trk.as_dict()}
        if trk.coast_frames >= self.cfg.coast_limit_frames:
            # re-acquire after long coast: re-init rather than blend a stale belief
            trk = KalmanTrack2D(track_id=track_id, x=x, y=y, last_t=t, _init=True)
            self.tracks[track_id] = trk
            return {"track_id": track_id, "status": "reacquired", **trk.as_dict()}
        innov = trk.update(x, y, t, self.cfg)
        return {"track_id": track_id, "status": "updated", **trk.as_dict()}

    def innovation_magnitude(self, track_id: str) -> float | None:
        trk = self.tracks.get(track_id)
        if trk is None or trk.last_innovation is None:
            return None
        return math.hypot(*trk.last_innovation)
