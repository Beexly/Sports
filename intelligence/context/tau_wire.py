"""Tau observation for DataContext. Carries the walk-forward manifest stamp."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

TAU_STAMP = "point fit — not pre-kickoff. 2026 unit cells pool in-season weeks."

WALK_FORWARD_SHA256 = "17656fdf6981c55dfbbfff99aae5f039e35c1e6172357cd6c9cb9f94dcd4594f"
WALK_FORWARD_FIT_WINDOW = (
    "walk-forward, expanding: served season S is fit only on seasons strictly "
    "before S. Inputs 2022-2025; served seasons 2023-2026. Served season 2022 "
    "is absent: the pinned inputs contain no strictly-prior window for it."
)


def tau_manifest_stamp() -> dict[str, Any]:
    """Read the walk-forward manifest metadata from coaching/data/tau_hat.manifest.json."""
    manifest_path = (
        Path(__file__).resolve().parents[1] / "coaching" / "data" / "tau_hat.manifest.json"
    )
    if os.path.isfile(manifest_path):
        try:
            with open(manifest_path, encoding="utf-8") as fh:
                data = json.load(fh)
            ho = data.get("held_out_measurement_2026-10-30") or {}
            return {
                "point_in_time": bool(data.get("point_in_time", True)),
                "sha256": str(data.get("sha256") or WALK_FORWARD_SHA256),
                "fit_window": str(data.get("fit_window") or WALK_FORWARD_FIT_WINDOW),
                "fit_stamp": str(data.get("fit_stamp") or ""),
                "delta_pp": float(ho.get("delta_pp", 11.1585)),
                "n": int(ho.get("n", 3988)),
            }
        except Exception:
            pass
    return {
        "point_in_time": True,
        "sha256": WALK_FORWARD_SHA256,
        "fit_window": WALK_FORWARD_FIT_WINDOW,
        "fit_stamp": "walk-forward — fit on prior seasons only; no in-season data",
        "delta_pp": 11.1585,
        "n": 3988,
    }


def tau_observation(team: str, tau_hat: float, fallback_level: str | None) -> dict:
    return {
        f"coaching.{team}.tau_hat": float(tau_hat),
        f"coaching.{team}.tau_stamp": TAU_STAMP,
        "fallback_level": fallback_level,
    }


def tau_decision_observation(
    team: str,
    decision: dict[str, Any],
    context: str = "simulation",
) -> dict[str, Any]:
    """Build the named trace/observation payload for expected_wp_given_coach."""
    stamp = decision.get("manifest_stamp") or tau_manifest_stamp()
    tau_val = float(decision["tau_hat"])
    return {
        "team": team,
        "wp_gap": float(decision["wp_gap"]),
        "action_predicted": str(decision["action_predicted"]),
        "tau_val": tau_val,
        "tau_hat": tau_val,
        "wp_behavior": float(decision["wp_behavior"]),
        "wp_optimal": float(decision["wp_optimal"]),
        "fallback_level": decision.get("tau_fallback"),
        "context": context,
        "manifest_stamp": stamp,
        "point_in_time": bool(stamp.get("point_in_time", True)),
        "sha256": str(stamp.get("sha256", WALK_FORWARD_SHA256)),
        "fit_window": str(stamp.get("fit_window", WALK_FORWARD_FIT_WINDOW)),
    }
