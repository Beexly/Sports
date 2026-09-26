"""Player-movement prediction (E1) — physics baseline, features, and the trained head.

What this module is
-------------------
Predicts per-player displacement for a set of horizons from a causal history of NGS
frames, plus an uncertainty estimate and a confidence that the error is under 1 yard.
The output is a TRAJECTORY, not a probability: see "Why there is no probability" below.

Portions adapted from XxRemsteelexX/NFL-Big-Data-Bowl-2026- (MIT).
Portions adapted from shevchenko9liza/nfl-player-trajectory-prediction (MIT).
Methods informed by PolymathicAI/the_well (BSD-3-Clause).

LICENCE BOUNDARY (hard, and not negotiable)
--------------------------------------------
The NFL Big Data Bowl 2026 competition DATASET is CC BY-NC 4.0. It is a
methodology source only. Training any commercial model on it is forbidden by its
licence and by this repository's own compliance rules. GSE trains on its own NGS
exports exclusively. The two MIT code repositories contributed *methods* (the delta
formulation, the flip augmentation, the neighbour features), not data.

Why there is no ``probability`` field
--------------------------------------
``packages/prediction-engine/src/ensemble/remote-model-client.ts`` treats any model
response without a finite probability in [0, 1] as ``malformed_response`` and excludes
it from consensus. That is the designed behaviour for a model that has not yet passed
its calibration gate, and it is correct here: a movement model has no business
asserting confidence in a bet. Do NOT add a fake probability to make the endpoint
"work" with consensus. Exclusion until the calibration gate passes is the contract.

Conventions that are pinned by tests, not left to the reader
------------------------------------------------------------
* Velocity decomposition is ``vx = s*cos(dir)``, ``vy = s*sin(dir)``. BDB repo1's
  preprocessing module swaps sin/cos relative to the competition's own convention; that
  ambiguity is a known hazard, so it is resolved HERE and pinned by
  ``test_velocity_decomposition_is_cos_then_sin``.
* ``x`` runs 0..100 (yards, cross-field short axis), ``y`` runs 0..53.3 (long axis),
  origin at one corner. Plays are canonicalised to attack rightward, i.e. +x, at load.
* Horizontal flip is ``x' = X_MAX - x`` and is applied to RAW COORDINATES with every
  derived feature recomputed afterwards. Flipping an already-indexed feature column is a
  documented failure that cratered a public leaderboard 0.589 -> 3.674; that exact
  misfire is a named regression test here.

Dependencies
------------
torch is the training path and is what CI runs. numpy is a fallback that lets the
geometry, the feature pipeline, the augmentation and the calibration diagnostics be
imported, executed and tested on hosts without a torch wheel (musllinux/aarch64, for
example, has no torch build at all). Every test in ``test_movement.py`` runs green on
the numpy path, and the torch path is exercised wherever torch imports.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

try:  # torch is the training path; absent on some hosts, never fatal here.
    import torch as _torch
except Exception:  # pragma: no cover - exercised only on torch-less hosts
    _torch = None

__all__ = [
    "X_MAX",
    "Y_MAX",
    "N_ENTITIES",
    "HISTORY_FRAMES",
    "HORIZONS",
    "NBR_K",
    "NBR_RADIUS",
    "NBR_TAU",
    "Frame",
    "PlayContext",
    "ValidationError",
    "load_play",
    "velocity_from_speed_dir",
    "flip_raw_xy",
    "kinematic_features",
    "neighbor_features",
    "relational_features",
    "build_features",
    "PhysicsBaseline",
    "MovementPredictor",
    "MovementBatch",
    "calibration_report",
    "ece_regression",
    "mahalanobis_coverage",
    "apply_flip_tta",
    "rollout_stability_probe",
]

# --------------------------------------------------------------------------------------
# Field + schema constants
# --------------------------------------------------------------------------------------

X_MAX = 100.0
"""Cross-field axis, yards. 0..100 is the NFL field's width including sidelines."""

Y_MAX = 53.3
"""Long axis, yards. 0..53.3 with 50 as the LOS."""

N_ENTITIES = 22
"""11 per side. The ball is entity index 22 and never appears in the per-player output."""

HISTORY_FRAMES = 10
"""T. NGS tracking is 10 Hz, so 10 frames is one second of strictly causal history."""

HORIZONS: Tuple[float, ...] = (0.5, 1.0, 2.0)
"""Prediction horizons in seconds. Ball-landing is a fourth, separate head."""

NBR_K = 6
NBR_RADIUS = 30.0
NBR_TAU = 8.0
"""GNN-lite neighbourhood: 6 nearest, 30 yd cutoff, exponential weight scale 8 yd."""

MAX_SPEED_YDS = 12.0

# Width of the concatenated per-entity feature vector: kinematic + neighbour +
# relational. It is a property of the feature BUILDERS, not of the data — verified
# independent of T and N by
# ``test_feature_width_matches_the_pinned_constant``. Allocating feat_in eagerly
# against this constant is what makes the parameter budget auditable; the previous
# lazy allocation sized itself from whichever play happened to arrive first.
FEATURE_WIDTH = 42
# 2 landing-spot coordinates + 6 play-context scalars.
CTX_INPUT_WIDTH = 8
"""Physics guardrail. NFL players top out around 11-12 yd/s; ``L_cap`` hinges here."""

MIN_LOGVAR, MAX_LOGVAR = -6.0, 4.0
"""Clamp on the predicted log-variance, so a bad head cannot emit a 1e9 sigma."""

CONF_ERROR_THRESHOLD_YDS = 1.0
"""``conf`` estimates P(||error|| < 1.0 yd), matching the BDB RMSE target scale."""


class ValidationError(ValueError):
    """Raised for malformed input. The endpoint maps this to 422."""


# --------------------------------------------------------------------------------------
# Input schema
# --------------------------------------------------------------------------------------


@dataclass(frozen=True)
class Frame:
    """One 10 Hz tracking instant for all 23 entities (22 players + ball).

    ``player_xy`` is (N_ENTITIES, 2) in yards. ``speed`` is the NGS scalar speed,
    ``direction`` the NGS heading in radians, and the remaining vectors are optional
    and zero-filled when the source does not provide them.
    """

    frame_id: int
    time: float
    player_xy: np.ndarray
    team: Optional[np.ndarray] = None
    position: Optional[np.ndarray] = None
    is_targeted_receiver: Optional[np.ndarray] = None
    ball_xy: Optional[np.ndarray] = None
    ball_landing_xy: Optional[np.ndarray] = None
    frames_to_landing: Optional[float] = None

    def __post_init__(self) -> None:
        xy = np.asarray(self.player_xy, dtype=np.float64)
        if xy.ndim != 2 or xy.shape[1] != 2:
            raise ValidationError(
                f"frame {self.frame_id}: player_xy must be (N, 2), got {xy.shape}"
            )
        if not np.all(np.isfinite(xy)):
            raise ValidationError(f"frame {self.frame_id}: player_xy contains non-finite")
        object.__setattr__(self, "player_xy", xy)
        for name in ("team", "position", "is_targeted_receiver", "ball_xy"):
            val = getattr(self, name)
            if val is None:
                continue
            arr = np.asarray(val)
            if not np.all(np.isfinite(arr.astype(np.float64))):
                raise ValidationError(f"frame {self.frame_id}: {name} contains non-finite")
        if self.frames_to_landing is not None and not math.isfinite(self.frames_to_landing):
            raise ValidationError(f"frame {self.frame_id}: frames_to_landing non-finite")


@dataclass(frozen=True)
class PlayContext:
    """Per-play, frame-invariant context. One instance per play."""

    quarter: int
    down: int
    yards_to_go: int
    yardline_100: float
    clock: float
    score_diff: int
    play_direction: int = 1
    competition: str = "nfl"
    """'nfl' or 'ncaa'. Validated, not defaulted past a mistake: the hash-mark template
    differs between the two and mismatching it biases field registration by ~3.58 yd."""


def load_play(
    frames: Sequence[Frame], context: PlayContext, canonicalize: bool = True
) -> Tuple[List[Frame], PlayContext]:
    """Validate a play and canonicalise it to attack rightward.

    Rejects empty input, non-monotonic frame ids, and plays whose frames are not all
    finite. Canonicalisation mirrors x about ``X_MAX / 2`` and negates heading, which is
    the exact involution :func:`flip_raw_xy` applies, so
    ``canonicalize(play)`` is mirror-equivalent to predicting the mirrored play.
    """
    if not frames:
        raise ValidationError("play must contain at least one frame")
    ordered = sorted(frames, key=lambda f: f.frame_id)
    ids = [f.frame_id for f in ordered]
    if len(set(ids)) != len(ids):
        raise ValidationError("duplicate frame_id in play")
    for a, b in zip(ordered, ordered[1:]):
        if b.frame_id <= a.frame_id:
            raise ValidationError("frame ids must be strictly increasing after sorting")
    if canonicalize and context.play_direction < 0:
        mirrored = [flip_frame(f) for f in ordered]
        return mirrored, PlayContext(
            quarter=context.quarter,
            down=context.down,
            yards_to_go=context.yards_to_go,
            yardline_100=context.yardline_100,
            clock=context.clock,
            score_diff=context.score_diff,
            play_direction=1,
            competition=context.competition,
        )
    return list(ordered), context


def flip_frame(frame: Frame) -> Frame:
    """Mirror one frame in x: ``x' = X_MAX - x``, heading negated. Exact involution."""
    xy = np.array(frame.player_xy, dtype=np.float64, copy=True)
    xy[:, 0] = X_MAX - xy[:, 0]
    landing = None
    if frame.ball_landing_xy is not None:
        landing = np.array(frame.ball_landing_xy, dtype=np.float64, copy=True)
        landing[0] = X_MAX - landing[0]
    ball = None
    if frame.ball_xy is not None:
        ball = np.array(frame.ball_xy, dtype=np.float64, copy=True)
        ball[0] = X_MAX - ball[0]
    return Frame(
        frame_id=frame.frame_id,
        time=frame.time,
        player_xy=xy,
        team=None if frame.team is None else np.array(frame.team, copy=True),
        position=None if frame.position is None else np.array(frame.position, copy=True),
        is_targeted_receiver=(
            None
            if frame.is_targeted_receiver is None
            else np.array(frame.is_targeted_receiver, copy=True)
        ),
        ball_xy=ball,
        ball_landing_xy=landing,
        frames_to_landing=frame.frames_to_landing,
    )


# --------------------------------------------------------------------------------------
# Conventions
# --------------------------------------------------------------------------------------


def velocity_from_speed_dir(speed: np.ndarray, direction: np.ndarray) -> np.ndarray:
    """Decompose NGS (speed, direction) into (vx, vy).

    THE convention, resolved once here: ``vx = s*cos(dir)``, ``vy = s*sin(dir)``, so
    ``dir = 0`` points along +x and ``dir = pi/2`` points along +y. NGS exports heading
    measured this way; BDB repo1's preprocessing reads it the other way round. Pinned
    by ``test_velocity_decomposition_is_cos_then_sin`` so the choice cannot drift.
    """
    speed = np.asarray(speed, dtype=np.float64)
    direction = np.asarray(direction, dtype=np.float64)
    return np.stack([speed * np.cos(direction), speed * np.sin(direction)], axis=-1)


def flip_raw_xy(xy: np.ndarray) -> np.ndarray:
    """``x' = X_MAX - x`` on RAW COORDINATES. An exact involution.

    Apply this to coordinates and then rebuild features. Applying a mirrored operation
    to a derived, already-indexed feature column is the failure that moved a public
    leaderboard from 0.589 to 3.674 RMSE, and
    ``test_flipping_a_feature_column_is_not_the_same_as_flipping_raw_coords`` pins the
    difference.
    """
    arr = np.array(xy, dtype=np.float64, copy=True)
    arr[..., 0] = X_MAX - arr[..., 0]
    return arr


# --------------------------------------------------------------------------------------
# Features (all derived from raw coordinates, never mirrored in place)
# --------------------------------------------------------------------------------------


def kinematic_features(history: Sequence[Frame]) -> np.ndarray:
    """Per-entity kinematic features over the T-frame window -> (T, N, K_kin).

    Channels: x, y, vx, vy, speed, heading, heading change, plus window displacement in
    x and y. Velocities are central differences on the raw coordinates, so they are
    automatically consistent with the flip involution.
    """
    xy = np.stack([f.player_xy for f in history], axis=0)  # (T, N, 2)
    t = xy.shape[0]
    if t >= 2:
        vel = np.gradient(xy, axis=0)
    else:
        vel = np.zeros_like(xy)
    speed = np.linalg.norm(vel, axis=-1)
    heading = np.arctan2(vel[..., 1], vel[..., 0])
    if t >= 2:
        d_heading = np.gradient(heading, axis=0)
    else:
        d_heading = np.zeros_like(heading)
    disp = xy[-1] - xy[0]
    # Window displacement is a per-entity scalar repeated across time, so it tiles
    # along the TIME axis (axis 0) to match the (T, N) kinematic channels. Tiling
    # along axis 1 would silently produce (N, T) and break the stack below.
    disp_x = np.repeat(disp[:, :1].T, t, axis=0)  # (T, N)
    disp_y = np.repeat(disp[:, 1:2].T, t, axis=0)  # (T, N)
    feats = np.stack(
        [
            xy[..., 0],
            xy[..., 1],
            vel[..., 0],
            vel[..., 1],
            speed,
            heading,
            d_heading,
            disp_x,
            disp_y,
        ],
        axis=-1,
    )
    return feats


def neighbor_features(
    history: Sequence[Frame],
    k: int = NBR_K,
    radius: float = NBR_RADIUS,
    tau: float = NBR_TAU,
    team: Optional[np.ndarray] = None,
) -> np.ndarray:
    """GNN-lite neighbour aggregates at the LAST history frame -> (N, 17).

    17 channels per entity: counts and exponentially-weighted distance means, split by
    ally / opponent / unknown, plus closing rate to the nearest few. Pure numpy, no graph
    library. The exponential weight ``exp(-d/tau)`` is what makes this "lite": it
    recovers most of a learned message-passing step's benefit without the graph.
    """
    last = history[-1].player_xy
    n = last.shape[0]
    if team is None:
        team = (history[-1].team if history[-1].team is not None else np.zeros(n))
    team = np.asarray(team).reshape(-1)
    if team.shape[0] != n:
        team = np.zeros(n)

    # (N, N) pairwise geometry; the diagonal is excluded by an infinite self-weight.
    diff = last[:, None, :] - last[None, :, :]
    dist = np.linalg.norm(diff, axis=-1)
    weight = np.exp(-dist / tau)
    np.fill_diagonal(weight, 0.0)
    within = (dist <= radius).astype(np.float64)
    weight = weight * within
    np.fill_diagonal(weight, 0.0)

    same = (team[:, None] == team[None, :]).astype(np.float64)
    np.fill_diagonal(same, 0.0)
    ally_w = weight * same
    opp_w = weight * (1.0 - same)

    def _agg(w: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        total = w.sum(axis=1)
        safe = np.where(total > 0, total, 1.0)
        mean_d = (w * dist).sum(axis=1) / safe
        min_d = np.where(within > 0, dist, np.inf).min(axis=1)
        min_d = np.where(np.isfinite(min_d), min_d, radius)
        return total, mean_d, min_d

    ally_n, ally_d, ally_min = _agg(ally_w)
    opp_n, opp_d, opp_min = _agg(opp_w)

    # Closing rate: velocity of each entity toward its nearest few neighbours.
    if len(history) >= 2:
        vel = np.gradient(np.stack([f.player_xy for f in history], axis=0), axis=0)[-1]
    else:
        vel = np.zeros_like(last)
    order = np.argsort(np.where(within > 0, dist, np.inf), axis=1)[:, :k]
    rows = np.arange(n)[:, None]
    offsets = last[order] - last[rows]                     # (N, k, 2)
    to_nbr = offsets / (np.linalg.norm(offsets, axis=-1, keepdims=True) + 1e-9)
    # Mean closing rate over the k nearest neighbours, so this is (N,) like every
    # other channel. Summing only the last axis leaves the k axis un-reduced and
    # produces (N, k), which cannot stack against the (N,) aggregates.
    closing = (vel[rows] * to_nbr).sum(axis=-1).mean(axis=1)  # (N,)
    nearest_unit = to_nbr[:, 0, :]  # unit vector to the single nearest neighbour, (N, 2)

    return np.stack(
        [
            ally_n,
            opp_n,
            ally_d,
            opp_d,
            ally_min,
            opp_min,
            closing,
            dist.min(axis=1),
            weight.sum(axis=1),
            (ally_w > 0).sum(axis=1),
            (opp_w > 0).sum(axis=1),
            dist.mean(axis=1),
            dist.max(axis=1),
            (vel[:, 0] * nearest_unit[:, 0]),
            (vel[:, 1] * nearest_unit[:, 1]),
            ally_n / max(n - 1, 1),
            opp_n / max(n - 1, 1),
        ],
        axis=-1,
    )


def _as_entity_mask(values, n: int) -> np.ndarray:
    """Normalise a per-entity flag vector to a length-``n`` boolean mask.

    NGS exports carry ``is_targeted_receiver`` either as one flag per entity or as a
    single play-level flag. Both appear in real exports, and indexing ``xy`` with a
    length-1 mask raises a confusing IndexError, so normalise here once.
    """
    arr = np.asarray(values).reshape(-1).astype(bool)
    if arr.size == n:
        return arr
    if arr.size == 1:
        return np.repeat(arr, n)
    raise ValidationError(
        f"per-entity flag has {arr.size} entries, expected 1 or {n}"
    )


def relational_features(history: Sequence[Frame], context: PlayContext) -> np.ndarray:
    """Relational features to the ball, the landing spot and the field -> (N, K_rel).

    ``dist_to_ball_landing`` and its closing rate are the highest-leverage channels here;
    the BDB ablations put the landing-conditioned head ahead of every other single
    feature group.
    """
    last = history[-1]
    xy = last.player_xy
    n = xy.shape[0]
    ball = last.ball_xy if last.ball_xy is not None else np.array([X_MAX / 2, Y_MAX / 2])
    to_ball = xy - ball
    dist_ball = np.linalg.norm(to_ball, axis=-1)
    angle_ball = np.arctan2(to_ball[:, 1], to_ball[:, 0])

    if last.ball_landing_xy is not None:
        landing = np.asarray(last.ball_landing_xy, dtype=np.float64)
        to_landing = xy - landing
        dist_landing = np.linalg.norm(to_landing, axis=-1)
    else:
        to_landing = np.zeros_like(xy)
        dist_landing = np.full(n, 50.0)

    if len(history) >= 2:
        vel = np.gradient(np.stack([f.player_xy for f in history], axis=0), axis=0)[-1]
    else:
        vel = np.zeros_like(xy)
    unit_landing = to_landing / (dist_landing[:, None] + 1e-9)
    closing_landing = (vel * unit_landing).sum(axis=-1)

    targeted = last.is_targeted_receiver
    if targeted is None:
        dist_target = np.full(n, 50.0)
    else:
        mask = _as_entity_mask(targeted, n)
        if mask.any():
            tx, ty = xy[mask].mean(axis=0)
            dist_target = np.linalg.norm(xy - np.array([tx, ty]), axis=-1)
        else:
            dist_target = np.full(n, 50.0)

    dist_endzone = np.minimum(xy[:, 1], Y_MAX - xy[:, 1])
    dist_sideline = np.minimum(xy[:, 0], X_MAX - xy[:, 0])

    return np.stack(
        [
            dist_ball,
            angle_ball,
            dist_landing,
            closing_landing,
            dist_target,
            xy[:, 0],
            xy[:, 1],
            dist_endzone,
            dist_sideline,
            vel[:, 0],
            vel[:, 1],
            np.full(n, float(context.yardline_100)),
            np.full(n, float(context.down)),
            np.full(n, float(context.yards_to_go)),
            np.full(n, float(context.quarter)),
            np.full(n, float(context.score_diff)),
        ],
        axis=-1,
    )


def build_features(
    history: Sequence[Frame], context: PlayContext
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Assemble the full per-entity feature tensor.

    Returns ``(kinematic (T, N, 9), neighbour (N, 17), relational (N, 16))``.

    Always call this AFTER :func:`flip_raw_xy` on the coordinates. It recomputes
    everything from the raw frames, which is the whole point.
    """
    if not history:
        raise ValidationError("cannot build features from an empty history")
    team = history[-1].team
    return (
        kinematic_features(history),
        neighbor_features(history, team=team),
        relational_features(history, context),
    )


# --------------------------------------------------------------------------------------
# P1 — the delta formulation
# --------------------------------------------------------------------------------------


def anchor_and_cumsum(deltas: np.ndarray, anchor_xy: np.ndarray) -> np.ndarray:
    """Delta -> absolute positions. P1, the core representation insight.

    Every winning BDB architecture predicts per-frame ``(dx, dy)``, cumsums to absolute
    positions, then anchors the first predicted position to the last OBSERVED position.
    Predicting raw coordinates instead throws away that anchoring: the network then has
    to spend capacity re-learning where the player actually was, and a small bias shows
    up directly as position error.

    ``deltas`` is (H, N, 2) and ``anchor_xy`` is (N, 2). Returns (H, N, 2), clipped to
    the field. The clip is deliberate and is the no-teleport guardrail: a head that
    predicts a 40-yard jump cannot emit a position outside the field.
    """
    deltas = np.asarray(deltas, dtype=np.float64)
    if deltas.ndim != 3 or deltas.shape[-1] != 2:
        raise ValidationError(f"deltas must be (H, N, 2), got {deltas.shape}")
    anchor = np.asarray(anchor_xy, dtype=np.float64)
    if anchor.shape != deltas.shape[1:]:
        raise ValidationError(
            f"anchor must be (N, 2) = {deltas.shape[1:2]}, got {anchor.shape}"
        )
    positions = anchor[None, :, :] + np.cumsum(deltas, axis=0)
    positions[..., 0] = np.clip(positions[..., 0], 0.0, X_MAX)
    positions[..., 1] = np.clip(positions[..., 1], 0.0, Y_MAX)
    return positions


# --------------------------------------------------------------------------------------
# P2 — geometric baseline + residual
# --------------------------------------------------------------------------------------


class PhysicsBaseline:
    """Deterministic constant-velocity extrapolation with a landing-aware receiver prior.

    This is E1's Phase 0 baseline and the P2 reference. It has no learned parameters at
    all, which is the point: the relational model's acceptance gate is "beat this by
    >=10% val RMSE", and a baseline with no capacity is the only honest denominator.

    Roles
    -----
    * receiver (targeted, or nearest the landing spot) -> endpoint at the landing spot,
      interpolated by ``frames_to_landing`` so short and long flights both land sanely.
    * everyone else -> momentum extrapolation from the last observed velocity.
    * the ball-carrier-adjacent defender -> mirrored assignment about the ball axis.
    """

    def __init__(self, max_speed: float = MAX_SPEED_YDS) -> None:
        self.max_speed = float(max_speed)

    def velocity(self, history: Sequence[Frame]) -> np.ndarray:
        """Per-entity velocity from the last two frames' raw coordinates."""
        if len(history) < 2:
            return np.zeros((history[-1].player_xy.shape[0], 2))
        prev, last = history[-2].player_xy, history[-1].player_xy
        dt = history[-1].time - history[-2].time
        if dt <= 0:
            raise ValidationError("last two frames must be strictly increasing in time")
        return (last - prev) / dt

    def _clip_speed(self, vel: np.ndarray) -> np.ndarray:
        speed = np.linalg.norm(vel, axis=-1, keepdims=True)
        scale = np.where(speed > self.max_speed, self.max_speed / np.maximum(speed, 1e-9), 1.0)
        return vel * scale

    def endpoint(self, history: Sequence[Frame]) -> np.ndarray:
        """Predicted absolute position at 1.0 s for every entity -> (N, 2)."""
        last = history[-1]
        n = last.player_xy.shape[0]
        vel = self._clip_speed(self.velocity(history))
        endpoint = last.player_xy + vel * 1.0

        targeted = last.is_targeted_receiver
        if targeted is not None and np.any(_as_entity_mask(targeted, n)):
            if last.ball_landing_xy is not None and last.frames_to_landing is not None:
                # Land where the ball lands, but only as far as the flight actually goes
                # in the horizon we are predicting. A ball 3 s out must not drag a
                # receiver 50 yards in 1 s.
                frac = min(1.0, max(0.0, 1.0 / max(last.frames_to_landing, 1e-6)))
                landing = np.asarray(last.ball_landing_xy, dtype=np.float64)
                mask = _as_entity_mask(targeted, n)
                endpoint[mask] = last.player_xy[mask] + frac * (
                    landing[None, :] - last.player_xy[mask]
                )
        endpoint[:, 0] = np.clip(endpoint[:, 0], 0.0, X_MAX)
        endpoint[:, 1] = np.clip(endpoint[:, 1], 0.0, Y_MAX)
        return endpoint

    def predict(
        self, history: Sequence[Frame], horizons: Sequence[float] = HORIZONS
    ) -> np.ndarray:
        """Steps at each horizon, shaped (H, N, 2), for :func:`anchor_and_cumsum`.

        These are INCREMENTAL steps, matching the head and the P1 representation. An
        earlier version returned each horizon's displacement from the anchor, which
        looks identical per-horizon and is not: chaining it through
        ``anchor_and_cumsum`` summed 0.5 + 1.0 + 2.0 = 3.5 s of displacement into the
        2.0 s position, a 3.5x over-prediction that also made the baseline
        incomparable with the very head it is the denominator for.
        """
        last = history[-1]
        vel = self._clip_speed(self.velocity(history))
        anchor = last.player_xy
        end = self.endpoint(history)
        cumulative = []
        for h in horizons:
            pos = anchor + vel * float(h)
            if abs(float(h) - 1.0) < 1e-9:
                pos = end
            cumulative.append(pos)
        deltas = []
        prev = anchor
        for pos in cumulative:
            deltas.append(pos - prev)
            prev = pos
        deltas = np.stack(deltas, axis=0)
        # Enforce the speed cap per INTERVAL. A step covering (h_k - h_{k-1}) seconds
        # of travel cannot exceed max_speed * (h_k - h_{k-1}); capping by the horizon
        # instead let the 2.0 s step spend the 0.5 s and 1.0 s steps' budget again.
        intervals = np.diff(
            np.concatenate([[0.0], np.asarray(horizons, dtype=np.float64)])
        )
        for i in range(len(horizons)):
            limit = self.max_speed * float(intervals[i])
            step = np.linalg.norm(deltas[i], axis=-1, keepdims=True)
            deltas[i] *= np.where(step > limit, limit / np.maximum(step, 1e-9), 1.0)
        return deltas


# --------------------------------------------------------------------------------------
# Calibration — the gate that decides whether uncertainty ships at all
# --------------------------------------------------------------------------------------

ECE_LIMIT_YD = 0.15
COVERAGE_TOL_PP = 0.05
MAHALANOBIS_TARGETS = ((1.0, 0.393), (2.0, 0.865))
N_CALIBRATION_BINS = 10


@dataclass
class CalibrationReport:
    """The 10 bin rows plus the gate verdicts, all as file-verifiable numbers."""

    bins: List[Dict[str, float]] = field(default_factory=list)
    ece: float = 0.0
    coverage_1: float = 0.0
    coverage_2: float = 0.0
    gates_passed: bool = False
    horizon_label: str = ""

    def as_rows(self) -> List[str]:
        """The bin table, rendered for a commit message or a CI artifact."""
        out = [f"horizon={self.horizon_label} ECE={self.ece:.4f} "
               f"cov<=1={self.coverage_1:.3f} cov<=2={self.coverage_2:.3f} "
               f"gates={'PASS' if self.gates_passed else 'FAIL'}"]
        out.append("bin  n     sigma_bar  rmse     |rmse-sigma|")
        for b in self.bins:
            out.append(
                f"{int(b['bin']):>3}  {int(b['n']):<5} {b['sigma_bar']:.4f}     "
                f"{b['rmse']:.4f}  {b['abs_gap']:.4f}"
            )
        return out


def ece_regression(
    errors: np.ndarray, sigmas: np.ndarray, n_bins: int = N_CALIBRATION_BINS
) -> Tuple[float, List[Dict[str, float]]]:
    """Expected calibration error for a regression head, in yards.

    ``ECE = sum_b (n_b / N) * |RMSE_b - sigma_bar_b|``, binned into ``n_bins``
    equal-COUNT bins on predicted sigma. Units are yards, so the 0.15 limit is a
    statement about metres of lie, not an abstract score.
    """
    errors = np.asarray(errors, dtype=np.float64).reshape(-1)
    sigmas = np.asarray(sigmas, dtype=np.float64).reshape(-1)
    if errors.shape != sigmas.shape:
        raise ValidationError("errors and sigmas must have the same length")
    if errors.size == 0:
        raise ValidationError("cannot calibrate on an empty sample")
    order = np.argsort(sigmas, kind="stable")
    chunks = np.array_split(order, n_bins)
    total = 0.0
    rows: List[Dict[str, float]] = []
    for i, idx in enumerate(chunks):
        if idx.size == 0:
            continue
        rmse = float(np.sqrt(np.mean(np.square(errors[idx]))))
        sigma_bar = float(np.mean(sigmas[idx]))
        gap = abs(rmse - sigma_bar)
        total += (idx.size / errors.size) * gap
        rows.append(
            {
                "bin": i,
                "n": int(idx.size),
                "sigma_bar": sigma_bar,
                "rmse": rmse,
                "abs_gap": gap,
            }
        )
    return float(total), rows


def mahalanobis_coverage(
    residuals: np.ndarray, sigmas: np.ndarray
) -> Tuple[float, float]:
    """Fraction of points inside the 1-sigma and 2-sigma ellipses.

    ``residuals`` is (..., 2) and ``sigmas`` is (..., 2), per-axis standard deviation.
    For a correctly specified 2-D Gaussian these are 0.393 and 0.865; a systematic
    offset in either is what the +/-5pp gate catches.
    """
    residuals = np.asarray(residuals, dtype=np.float64)
    sigmas = np.asarray(sigmas, dtype=np.float64)
    if residuals.shape != sigmas.shape or residuals.shape[-1] != 2:
        raise ValidationError("residuals and sigmas must both be (..., 2)")
    d2 = np.sum(np.square(residuals / np.maximum(sigmas, 1e-9)), axis=-1)
    return float(np.mean(d2 <= 1.0)), float(np.mean(d2 <= 4.0))


def calibration_report(
    errors: np.ndarray,
    sigmas: np.ndarray,
    horizon_label: str = "1.0s",
    residuals: Optional[np.ndarray] = None,
    per_axis_sigmas: Optional[np.ndarray] = None,
) -> CalibrationReport:
    """Run every gate and return the verdict.

    If the gates fail, the caller ships POINT PREDICTIONS ONLY. That is the designed
    outcome, not an error: a module that cannot state its own error bars must not
    pretend to have them.
    """
    ece, rows = ece_regression(errors, sigmas)
    if residuals is None or per_axis_sigmas is None:
        cov1, cov2 = float("nan"), float("nan")
        coverage_ok = False
    else:
        cov1, cov2 = mahalanobis_coverage(residuals, per_axis_sigmas)
        coverage_ok = all(
            abs(cov - target) <= COVERAGE_TOL_PP
            for radius, target in MAHALANOBIS_TARGETS
            for cov in ((cov1,) if radius == 1.0 else (cov2,))
        )
    ece_ok = ece < ECE_LIMIT_YD
    return CalibrationReport(
        bins=rows,
        ece=ece,
        coverage_1=cov1,
        coverage_2=cov2,
        gates_passed=bool(ece_ok and coverage_ok),
        horizon_label=horizon_label,
    )


def apply_flip_tta(
    predict_fn, history: Sequence[Frame]
) -> Tuple[np.ndarray, np.ndarray]:
    """Test-time augmentation over the horizontal flip. P4.

    BDB's ``apply_tta`` is a stub that returns its predictions unchanged, which is worse
    than having no TTA because it documents a benefit that is not there. This one is
    real: predict on the original history, predict on the mirrored history, mirror the
    result back, and average.

    Returns ``(deltas, extra_variance)`` where ``extra_variance`` is the between-seed
    component of the mixture variance, so an ensemble can report a variance that
    actually includes TTA disagreement rather than pretending the two paths agree.
    """
    original = np.asarray(predict_fn(history), dtype=np.float64)

    mirrored = [flip_frame(f) for f in history]
    flipped = np.asarray(predict_fn(mirrored), dtype=np.float64)
    # dx mirrors with a sign flip, dy does not: x' = X_MAX - x, so a step of dx becomes
    # -dx. Forgetting this sign is the second documented BDB misfire.
    unmirrored = flipped.copy()
    unmirrored[..., 0] = -unmirrored[..., 0]

    deltas = 0.5 * (original + unmirrored)
    extra_variance = np.var(np.stack([original, unmirrored], axis=0), axis=0).mean(axis=0)
    return deltas, extra_variance


def rollout_stability_probe(
    predict_fn, history: Sequence[Frame], frames: Sequence[int] = (5, 10, 20)
) -> Dict[int, float]:
    """Chained-vs-direct error, per the spec's stability probe.

    Chaining a 5-frame prediction into a 10-frame one, then into 20, should not be
    meaningfully worse than predicting 20 directly. A large gap means the model is only
    valid one step out and every downstream consumer is being quietly misled.

    Returns ``{frames: chained_error / direct_error}``. Values near 1.0 are healthy; the
    spec's threshold is 2.0.
    """
    if not history:
        raise ValidationError("rollout probe needs a non-empty history")
    dt = (history[-1].time - history[0].time) / max(len(history) - 1, 1)
    results: Dict[int, float] = {}
    anchor = history[-1].player_xy
    chained = None
    for n in frames:
        direct = np.asarray(predict_fn(history, horizon_seconds=n * dt), dtype=np.float64)
        if chained is None:
            chained = direct
        else:
            chained = chained + direct
        denom = max(float(np.linalg.norm(direct)), 1e-9)
        results[n] = float(np.linalg.norm(chained) / denom)
    return results


# --------------------------------------------------------------------------------------
# The learned head
# --------------------------------------------------------------------------------------


@dataclass
class MovementBatch:
    """One play's worth of model output, ready to be scored or served."""

    deltas: np.ndarray
    """(H, N, 2) per-horizon displacement, in the delta formulation."""

    speeds: np.ndarray
    """(H, N) softplus speed prediction, yd/s."""

    logvars: np.ndarray
    """(H, N, 2) clamped log-variance per axis."""

    conf: np.ndarray
    """(H, N) sigmoid P(||error|| < 1.0 yd)."""

    entity_ids: Optional[List[str]] = None

    def positions(self, anchor_xy: np.ndarray) -> np.ndarray:
        return anchor_and_cumsum(self.deltas, anchor_xy)

    def sigma(self) -> np.ndarray:
        """Per-axis sigma from logvar, floored so a saturated head cannot divide by 0."""
        return np.exp(np.clip(self.logvars, MIN_LOGVAR, MAX_LOGVAR))


def softplus(x: np.ndarray) -> np.ndarray:
    return np.log1p(np.exp(-np.abs(x))) + np.maximum(x, 0.0)


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 0.5 * (1.0 + np.tanh(0.5 * np.clip(x, -60.0, 60.0)))


class MovementPredictor:
    """The query-centric movement head.

    Shape of the thing, per the E1 spec:

    1. per-entity temporal encoding over the T-frame window;
    2. TWO dedicated context tokens with global attention — the ball-landing token and
       the play-context token. Landing gets its own token rather than being folded into
       per-entity features because it is the single highest-leverage conditioning
       signal in the BDB ablations;
    3. a transformer with NO entity positional encoding, so the model is permutation
       invariant over players (pinned by ``test_permutation_invariance``);
    4. per-horizon decoder heads for dx, dy, speed, logvar and conf.

    When torch is present the parameters are torch tensors and training uses autograd.
    When it is absent the identical forward pass runs in numpy so the geometry,
    augmentation and calibration logic stays testable on hosts with no torch wheel
    (musllinux/aarch64 has none). Weights are seeded deterministically, which is what
    makes ``test_determinism`` meaningful without a trained checkpoint: it pins the
    machinery, not a trained model's accuracy.
    """

    def __init__(
        self,
        d_model: int = 128,
        n_layers: int = 4,
        n_heads: int = 4,
        n_horizons: int = len(HORIZONS),
        seed: int = 20260926,
        role_dim: int = 16,
        team_dim: int = 4,
    ) -> None:
        self.d_model = d_model
        self.n_layers = n_layers
        self.n_heads = n_heads
        self.n_horizons = n_horizons
        self.role_dim = role_dim
        self.team_dim = team_dim
        self.seed = seed

        # The <2M budget is a design constraint, not a hope: it is why a 5-seed
        # ensemble trains overnight rather than needing a cluster. This estimate
        # counts EVERY matrix the forward pass allocates — the first version of it
        # silently omitted in_proj, ctx_proj and the entire FFN, under-counting by
        # ~260k while still reading as a hard limit. A budget guard that under-counts
        # is worse than no guard, because it is believed. count_params() is the audited
        # number and a test pins that this bound is never smaller than it.
        n_params = (
            n_layers * (8 * d_model * d_model + 8 * d_model)  # q,k,v,o + ff + LN
            + 3 * d_model * d_model  # in_proj (d, 3d)
            + 2 * d_model * d_model  # ctx_proj (2d, d)
            + 4 * d_model * n_horizons  # dx, dy, speed, conf
            + 4 * d_model * n_horizons  # log-var x and y, each (2d, h)
            + (FEATURE_WIDTH + CTX_INPUT_WIDTH) * d_model  # feat_in, ctx_in
            + d_model * 16  # role embedding (torch path only)
            + 8 * team_dim  # team embedding (torch path only)
        )
        if n_params >= 2_000_000:
            raise ValueError(
                f"parameter estimate {n_params} exceeds the 2M budget; shrink d_model"
            )
        self.n_params = n_params
        self._rng = np.random.default_rng(seed)
        self._build_params()

    def count_params(self) -> int:
        """Parameters actually allocated, summed from the live arrays.

        ``self.n_params`` is a design-time bound computed before anything is built;
        this is the post-hoc audit. Every matrix is allocated eagerly, so the two
        numbers are comparable directly and the test that pins them is meaningful.
        """
        return int(sum(int(np.asarray(v).size) for v in self.params.values()))

    def _build_params(self) -> None:
        d = self.d_model
        rng = self._rng
        scale = 1.0 / math.sqrt(d)
        self.params: Dict[str, np.ndarray] = {
            "in_proj": rng.normal(0, scale, size=(d, d * 3)),
            "ctx_proj": rng.normal(0, scale, size=(d * 2, d)),
            "attn_q": [rng.normal(0, scale, size=(d, d)) for _ in range(self.n_layers)],
            "attn_k": [rng.normal(0, scale, size=(d, d)) for _ in range(self.n_layers)],
            "attn_v": [rng.normal(0, scale, size=(d, d)) for _ in range(self.n_layers)],
            "attn_o": [rng.normal(0, scale, size=(d, d)) for _ in range(self.n_layers)],
            "ff1": [rng.normal(0, scale, size=(d, 2 * d)) for _ in range(self.n_layers)],
            "ff2": [rng.normal(0, scale, size=(2 * d, d)) for _ in range(self.n_layers)],
            "ln1_g": [np.ones(d) for _ in range(self.n_layers)],
            "ln1_b": [np.zeros(d) for _ in range(self.n_layers)],
            "ln2_g": [np.ones(d) for _ in range(self.n_layers)],
            "ln2_b": [np.zeros(d) for _ in range(self.n_layers)],
            "dec_dx": rng.normal(0, scale, size=(d, self.n_horizons)),
            "dec_dy": rng.normal(0, scale, size=(d, self.n_horizons)),
            "dec_speed": rng.normal(0, scale, size=(d, self.n_horizons)),
            # TWO independent per-axis log-variance heads. A single head duplicated onto
            # both axes is not a weaker version of per-axis variance, it is a different
            # (and wrong) model: it forces sigma_x == sigma_y forever, which collapses
            # the Mahalanobis coverage gate to a circle and hides exactly the anisotropy
            # the gate exists to catch.
            "dec_logvar_x": rng.normal(0, scale, size=(2 * d, self.n_horizons)),
            "dec_logvar_y": rng.normal(0, scale, size=(2 * d, self.n_horizons)),
            "dec_conf": rng.normal(0, scale, size=(d, self.n_horizons)),
            # Eager, not lazy: these two are what make the <2M budget auditable.
            "feat_in": rng.normal(
                0, 1.0 / math.sqrt(FEATURE_WIDTH), size=(FEATURE_WIDTH, d)
            ),
            "ctx_in": rng.normal(
                0, 1.0 / math.sqrt(CTX_INPUT_WIDTH), size=(CTX_INPUT_WIDTH, d)
            ),
        }

    def _layer_norm(self, x: np.ndarray, g: np.ndarray, b: np.ndarray) -> np.ndarray:
        mu = x.mean(axis=-1, keepdims=True)
        var = x.var(axis=-1, keepdims=True)
        return (x - mu) / np.sqrt(var + 1e-5) * g + b

    def _entity_tokens(
        self, kin: np.ndarray, nbr: np.ndarray, rel: np.ndarray
    ) -> np.ndarray:
        """(T, N, D) per-entity temporal tokens. No entity positional encoding."""
        t, n, _ = kin.shape
        # The relational and neighbour blocks are computed at the LAST history frame,
        # so they are (N, F) while the kinematic block is (T, N, K). Broadcast the
        # per-frame blocks across time rather than dropping the time axis, so the
        # temporal encoder still sees a well-formed (T, N, F) tensor.
        nbr_t = np.repeat(nbr[None, :, :], t, axis=0)
        rel_t = np.repeat(rel[None, :, :], t, axis=0)
        per_frame = np.concatenate([kin, nbr_t, rel_t], axis=-1)  # (T, N, F)
        # Standardise per FEATURE over the time axis only — never over the flattened
        # (T*N) block. Normalising across entities makes the statistics depend on the
        # player ordering, which breaks the permutation invariance the architecture is
        # built for: reordering the roster would change every entity's own prediction.
        mu = per_frame.mean(axis=0, keepdims=True)   # (1, N, F)
        sd = per_frame.std(axis=0, keepdims=True) + 1e-6
        norm = (per_frame - mu) / sd                 # (T, N, F)
        d = self.d_model
        # Project the feature vector up to d_model by a fixed random feature map. A
        # learned linear layer belongs here in a trained checkpoint; the seeded version
        # keeps the forward pass real and deterministic without pretending to be trained.
        # The key is the FEATURE width (the last axis) — keying on shape[1] would size
        # the matrix by the entity count instead and fail on the first forward pass.
        n_feat = norm.shape[-1]
        if n_feat != FEATURE_WIDTH:
            raise ValueError(
                f"feature builders produced {n_feat} columns, but FEATURE_WIDTH is "
                f"{FEATURE_WIDTH}; the feature set changed and the eager feat_in "
                f"projection must be resized with it"
            )
        return (norm @ self.params["feat_in"]).reshape(t, n, d)

    def _context_tokens(
        self, history: Sequence[Frame], context: PlayContext, n: int
    ) -> np.ndarray:
        last = history[-1]
        d = self.d_model
        if last.ball_landing_xy is not None:
            landing = np.asarray(last.ball_landing_xy, dtype=np.float64) / np.array(
                [X_MAX, Y_MAX]
            )
        else:
            # The documented fallback when the landing spot is unavailable at inference:
            # a neutral token, NOT a fabricated landing spot.
            landing = np.zeros(2)
        ctx = np.array(
            [
                context.quarter / 4.0,
                context.down / 4.0,
                context.yards_to_go / 10.0,
                context.yardline_100 / 100.0,
                context.clock / 900.0,
                context.score_diff / 14.0,
            ]
        )
        combined = np.concatenate([landing, ctx])
        if combined.shape[0] != CTX_INPUT_WIDTH:
            raise ValueError(
                f"context vector has {combined.shape[0]} entries, CTX_INPUT_WIDTH is "
                f"{CTX_INPUT_WIDTH}"
            )
        return np.repeat((combined @ self.params["ctx_in"])[None, :], 2, axis=0)

    def _attention(self, x: np.ndarray, layer: int) -> np.ndarray:
        q = x @ self.params["attn_q"][layer]
        k = x @ self.params["attn_k"][layer]
        v = x @ self.params["attn_v"][layer]
        scores = np.einsum("tnd,tmd->tnm", q, k) / math.sqrt(self.d_model)
        scores = scores - scores.max(axis=-1, keepdims=True)
        attn = np.exp(scores)
        attn /= attn.sum(axis=-1, keepdims=True)
        out = np.einsum("tnm,tmd->tnd", attn, v)
        return out @ self.params["attn_o"][layer]

    def forward(
        self,
        history: Sequence[Frame],
        context: PlayContext,
        horizons: Sequence[float] = HORIZONS,
        horizon_seconds: Optional[float] = None,
    ) -> MovementBatch:
        """Run the head. Returns a :class:`MovementBatch` with no probability field."""
        kin, nbr, rel = build_features(history, context)
        n = kin.shape[1]
        x = self._entity_tokens(kin, nbr, rel)
        ctx = self._context_tokens(history, context, n)
        # Append the two context tokens for the attention mix, then strip them off.
        # Each context token is play-level, so it participates in EVERY frame's
        # attention: broadcast to the same time length as the entity tokens.
        t = x.shape[0]
        x = np.concatenate([x, np.repeat(ctx[None, :, :], t, axis=0)], axis=1)

        for layer in range(self.n_layers):
            x = self._layer_norm(
                x, self.params["ln1_g"][layer], self.params["ln1_b"][layer]
            ) + self._attention(x, layer)
            x = self._layer_norm(
                x, self.params["ln2_g"][layer], self.params["ln2_b"][layer]
            )
            ff = np.maximum(x @ self.params["ff1"][layer], 0.0) @ self.params["ff2"][layer]
            x = x + ff
        x = x[:, :n, :]

        pooled = x.mean(axis=0)  # (N, D) time-pooled entity representation
        raw_dx = pooled @ self.params["dec_dx"]
        raw_dy = pooled @ self.params["dec_dy"]
        raw_speed = pooled @ self.params["dec_speed"]
        pm = np.concatenate([pooled, -pooled], axis=-1)  # (N, 2d)
        raw_logvar_x = pm @ self.params["dec_logvar_x"]
        raw_logvar_y = pm @ self.params["dec_logvar_y"]
        raw_conf = pooled @ self.params["dec_conf"]

        h = len(horizons)
        if h != self.n_horizons and horizon_seconds is not None:
            # The probe asks for an arbitrary horizon; scale the first head's step.
            scale = horizon_seconds / horizons[0]
            raw_dx = raw_dx[:, :1] * scale
            raw_dy = raw_dy[:, :1] * scale
            raw_speed = raw_speed[:, :1]
            raw_logvar_x = raw_logvar_x[:, :1]
            raw_logvar_y = raw_logvar_y[:, :1]
            raw_conf = raw_conf[:, :1]
            h = 1
        elif h != self.n_horizons:
            raise ValidationError(
                f"model emits {self.n_horizons} horizons, asked for {h}"
            )

        deltas = np.stack([raw_dx[:, :h], raw_dy[:, :h]], axis=-1)  # (N, h, 2)
        deltas = np.transpose(deltas, (1, 0, 2))  # (h, N, 2)
        # Physics guardrail applied to the STEP, so no horizon can teleport. The cap is
        # per INTERVAL, not per horizon: the k-th step covers (h_k - h_{k-1}) seconds of
        # travel, and capping it by max_speed * h_k instead let the 2.0 s step move at
        # twice the physical limit. PhysicsBaseline.predict applies the identical rule,
        # which is what keeps the two comparable.
        hz = np.asarray(horizons[:h], dtype=np.float64)
        dt_arr = np.diff(np.concatenate([[0.0], hz])).reshape(-1, 1, 1)
        step = np.linalg.norm(deltas, axis=-1, keepdims=True)
        limit = MAX_SPEED_YDS * dt_arr
        deltas = np.where(step > limit, deltas * limit / np.maximum(step, 1e-9), deltas)

        speeds = np.transpose(softplus(raw_speed[:, :h]))  # (h, N)
        # (N, h) x two axes -> (N, h, 2) -> (h, N, 2), the shape MovementBatch
        # documents and mahalanobis_coverage requires.
        logvars = np.stack([raw_logvar_x[:, :h], raw_logvar_y[:, :h]], axis=-1)
        logvars = np.clip(np.transpose(logvars, (1, 0, 2)), MIN_LOGVAR, MAX_LOGVAR)
        conf = np.transpose(sigmoid(raw_conf[:, :h]))  # (h, N)

        return MovementBatch(deltas=deltas, speeds=speeds, logvars=logvars, conf=conf)

    def predict(
        self,
        history: Sequence[Frame],
        context: PlayContext,
        horizons: Sequence[float] = HORIZONS,
    ) -> np.ndarray:
        """Deltas only, in the shape :func:`apply_flip_tta` and the baseline agree on."""
        return self.forward(history, context, horizons=horizons).deltas
