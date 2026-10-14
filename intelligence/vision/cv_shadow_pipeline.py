"""CV shadow pipeline — dual-detector film signals, fail-closed to weight 0.

Python-side mirror of the external agent's cv_shadow_pipeline.py spec, landed
in-repo because the agent's /home/workdir sandbox is unreachable from this
host (verified 2026-10-14, docs/ops/EXTERNAL-ARTIFACT-VERIFICATION-2026-10-14.md).

Wiring to what actually exists here:
  - detectors: intelligence/vision/cv_detector_adapter.py
    (MockDetector / RoboflowSportsDetector, mirroring the TS Detector contract)
  - Tracklet shape: packages/prediction-engine/src/tracking/cv-tracklet-association.ts
    (Tracklet {id, team, role, frames[{t, xPx, yPx}]}) — this module emits a
    ball tracklet whose positions are footPoint-style box centers, directly
    consumable by cv-pipeline.ts runMovementPipeline -> homography ->
    deriveMovementMetrics.
  - shadow ledger: intelligence/vision/shadow/film_shadow_ledger.jsonl
    (separate from vision_shadow.jsonl, which logs raw detector frames).

THE GATE (step 4-5): every film signal passes through film_feature_to_decision,
which forces weight=0.0 and affects_published_distribution=False until
validation_spec_met is explicitly True. There is no code path that publishes a
film signal at nonzero weight — fail-closed by construction, not by convention.

Step 3 (nflverse join) is a stub that activates ONLY on a jersey number;
jersey=None logs skipped_no_jersey_ocr. We do not have jersey OCR yet, so the
live path here is the skip path.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]

# The single flag that would allow nonzero weight. Deliberately a constant,
# not a config knob: flipping it requires the VISION-CONTRACT falsifier
# (held-out calibration 85-95% AND uncertainty narrower than market) to have
# been run and recorded. Nothing in this module sets it.
VALIDATION_SPEC_MET = False


@dataclass(frozen=True)
class TrackletPosition:
    t: float
    x_px: float
    y_px: float


@dataclass(frozen=True)
class Tracklet:
    """Mirrors the TS Tracklet shape enough for cross-boundary consumption."""

    id: str
    team: str
    role: str
    positions: tuple[TrackletPosition, ...] = field(default=())


@dataclass
class ShadowResult:
    primary_detections: int
    roboflow_detections: int
    ball_tracklet_id: str | None
    ball_positions: tuple[TrackletPosition, ...]
    nflverse_joined: bool
    join_reason: str
    feature: dict[str, Any]


def run_shadow_detectors(frame: Any) -> dict[str, Any]:
    """Step 1: run primary + roboflow adapters; log counts and ball presence.

    Shadow only. The primary detector is never replaced by the roboflow one —
    both run, both are logged, and any disagreement is itself the signal the
    validation pass will need.
    """
    from intelligence.vision.cv_detector_adapter import (
        MockDetector,
        RoboflowSportsDetector,
    )

    primary = MockDetector()
    roboflow = RoboflowSportsDetector()

    primary_dets = primary.detect(frame)
    roboflow_dets = roboflow.detect(frame)

    def _ball(dets):
        return [d for d in dets if d.class_id == "ball"]

    result = {
        "primary": {"name": primary.name, "detections": primary_dets},
        "roboflow": {"name": roboflow.name, "detections": roboflow_dets,
                     "fallback_reason": getattr(roboflow, "fallback_reason", None)},
        "counts": {
            "primary_detections": len(primary_dets),
            "roboflow_detections": len(roboflow_dets),
            "primary_ball": len(_ball(primary_dets)),
            "roboflow_ball": len(_ball(roboflow_dets)),
        },
    }
    print(f"[shadow] primary={result['counts']['primary_detections']} "
          f"roboflow={result['counts']['roboflow_detections']} "
          f"ball(p/r)={result['counts']['primary_ball']}/{result['counts']['roboflow_ball']}")
    return result


def extract_ball_tracklet(detector_result: dict[str, Any],
                          n_frames: int = 1,
                          fps: float = 30.0) -> tuple[Tracklet | None, str]:
    """Step 2: build a ball Tracklet from the primary detector's ball class.

    Positions are bbox centers (the ball is compact; center == foot point for
    a 12px box), directly feedable to cv-pipeline.ts homography +
    deriveMovementMetrics. Highest-confidence ball wins (adopted from the
    external agent's polished pass — max-by-confidence, not [0]).
    Returns (None, reason) when no ball was detected — never an
    empty-but-present tracklet.
    """
    primary = (detector_result or {}).get("primary") or {}
    dets = primary.get("detections") or []
    balls = [d for d in dets if getattr(d, "class_id", None) == "ball"]
    if not balls:
        return None, "no_ball_detected"
    if n_frames <= 0:
        return None, "non_positive_frames"
    b = max(balls, key=lambda d: d.confidence)
    positions = tuple(
        TrackletPosition(t=round(i / fps, 4),
                         x_px=b.bbox.x + b.bbox.width / 2 + i,  # deterministic drift, mock-stable
                         y_px=b.bbox.y + b.bbox.height / 2)
        for i in range(n_frames)
    )
    tk = Tracklet(id="BALL-01", team="BALL", role="ball", positions=positions)
    print(f"[shadow] ball tracklet {tk.id}: {len(positions)} position(s) "
          f"(confidence {b.confidence})")
    return tk, "ok"


def join_nflverse_when_identity(tracklet_id: str | None,
                                jersey: int | None,
                                team_hint: str | None = None,
                                game_id: str | None = None,
                                play_id: int | None = None) -> dict[str, Any]:
    """Step 3: nflverse join stub — activates ONLY on a jersey number.

    Signature widened (adopted from the external agent's polished pass): the
    join needs tracklet + game + play context to key nflverse participation
    (gsis_id via rosters; their data-dictionary table: rosters carry
    gsis_id <-> jersey). We do not have jersey OCR yet (VISION-CONTRACT
    non-goal v0), so the live path is the skip.
    """
    if jersey is None:
        print("[shadow] nflverse join: skipped_no_jersey_ocr")
        return {"joined": False, "reason": "skipped_no_jersey_ocr", "row": None}
    # Join-ready row (still weight 0 downstream): identity keys only, no
    # invented attributes. gsis_id resolution needs the rosters table keyed
    # (team, jersey, season) — recorded as the named next step.
    return {
        "joined": True,
        "reason": "join_ready_identity_keys_only",
        "row": {"tracklet_id": tracklet_id, "jersey": jersey,
                "team_hint": team_hint, "game_id": game_id, "play_id": play_id,
                "gsis_id": None,
                "note": "gsis_id resolution requires rosters join - named next step"},
    }


def film_feature_to_decision(feature: str, value: Any,
                             nflverse_row: dict[str, Any] | None = None) -> dict[str, Any]:
    """Steps 4-5: THE GATE. Every film signal passes through here.

    Forces weight=0.0 and affects_published_distribution=False until
    validation_spec_met=True. Fail-closed by construction: there is no
    argument, config, or flag on this function that can publish at nonzero
    weight, because flipping VALIDATION_SPEC_MET requires the VISION-CONTRACT
    falsifier to have been run and recorded — an external, evidenced act.
    """
    if not isinstance(feature, str) or not feature:
        raise ValueError("film feature must have a non-empty name")
    weight = 0.0 if not VALIDATION_SPEC_MET else None  # None would be a bug; guard below
    if weight is None:  # pragma: no cover - only reachable if the constant flips
        raise RuntimeError(
            "VALIDATION_SPEC_MET is True but the falsifier evidence has not been "
            "wired; refusing to auto-publish film signals. Wire the evidence check "
            "here before trusting nonzero weights.")
    return {
        "feature": feature,
        "value": value,
        "applied_weight": weight,
        "affects_published_distribution": False,
        "validation_spec_met": VALIDATION_SPEC_MET,
        "nflverse_join": (nflverse_row or {}).get("reason") if nflverse_row else "no_join_attempted",
        "honesty": "uncalibrated_weight_0",
    }


def append_film_shadow_ledger(rows: list[dict[str, Any]]) -> Path:
    """Step 5: append every signal to the film shadow ledger.

    Enforces the gate at the write boundary too: a row that claims nonzero
    weight or affects_published_distribution=True while
    validation_spec_met is False is REFUSED here — the ledger cannot be
    poisoned by a caller that bypassed the gate.
    """
    shadow_dir = REPO / "intelligence" / "vision" / "shadow"
    shadow_dir.mkdir(parents=True, exist_ok=True)
    p = shadow_dir / "film_shadow_ledger.jsonl"
    with open(p, "a", encoding="utf-8") as f:
        for r in rows:
            if not r.get("validation_spec_met"):
                if r.get("applied_weight") not in (0.0, 0, None):
                    raise ValueError(
                        f"refusing to write film row with nonzero weight while "
                        f"validation_spec_met is False: {r.get('feature')}")
                if r.get("affects_published_distribution"):
                    raise ValueError(
                        f"refusing to write film row claiming distribution effect "
                        f"while validation_spec_met is False: {r.get('feature')}")
            r = {**r, "ts": datetime.now(timezone.utc).isoformat()}
            f.write(json.dumps(r) + "\n")
    return p


def run_pipeline(n_frames: int = 3, jersey: int | None = None,
                 game_id: str = "2026_06_PENDING",
                 base_play_id: int = 1000) -> dict[str, Any]:
    """Steps 1-5 in sequence. Returns the summary the agent's spec showed.

    Per-frame detector rows are logged to the ledger too (adopted from the
    external agent's polished pass: log every step, not just film features) —
    the validation pass will need detector-level history, not only gate rows.
    """
    # Deterministic mock frames; production frames arrive decoded upstream.
    from intelligence.vision.cv_detector_adapter import VideoFrame

    all_rows: list[dict[str, Any]] = []
    summary: dict[str, Any] = {}

    primary_total = roboflow_total = 0
    ball_tk: Tracklet | None = None

    for i in range(n_frames):
        frame = VideoFrame(index=i, t=i / 30.0, width=1920, height=1080)
        res = run_shadow_detectors(frame)
        primary_total += res["counts"]["primary_detections"]
        roboflow_total += res["counts"]["roboflow_detections"]
        tk, reason = extract_ball_tracklet(res, n_frames=n_frames)
        if tk:
            ball_tk = tk
        # per-frame shadow rows (gate-safe: detector counts are observational,
        # not decision features, so they carry weight 0 like everything else)
        all_rows.append(film_feature_to_decision(
            "detector_primary_count", res["counts"]["primary_detections"]))
        all_rows.append(film_feature_to_decision(
            "detector_roboflow_ball", res["counts"]["roboflow_ball"]))

    ball_id = ball_tk.id if ball_tk else None
    join = join_nflverse_when_identity(ball_id, jersey,
                                       game_id=game_id,
                                       play_id=base_play_id + n_frames)

    # Film feature from the ball tracklet (mock value; the REAL value comes
    # from TS-side deriveMovementMetrics once real footage exists).
    feature_value = 2.3
    gate = film_feature_to_decision(
        "sep_at_break_yd", feature_value, join if join.get("joined") else None)
    all_rows.append(gate)

    ledger = append_film_shadow_ledger(all_rows)

    summary = {
        "primary_detections": primary_total,
        "roboflow_detections": roboflow_total,
        "ball_tracklet": ball_id,
        "nflverse_joined": join.get("joined", False),
        "nflverse_reason": join.get("reason"),
        "film_feature": all_rows[-1],
        "ledger": str(ledger),
    }
    print(json.dumps(summary, indent=1, default=str))
    return summary


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--frames", type=int, default=3)
    ap.add_argument("--jersey", type=int, default=None,
                    help="jersey number; omit to exercise the skip_no_jersey_ocr path")
    args = ap.parse_args()
    # Make repo-root imports work regardless of caller cwd (script run from
    # intelligence/vision/ must still resolve intelligence.vision.*).
    import sys
    root = str(REPO)
    if root not in sys.path:
        sys.path.insert(0, root)
    run_pipeline(n_frames=args.frames, jersey=args.jersey)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
