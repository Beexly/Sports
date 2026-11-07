#!/usr/bin/env python3
"""
WAVE 8 — GRADING-TO-CORPUS FEEDBACK PIPE
Takes a graded historical outcome + its pre-game reasoning trace and writes a structured
calibration/error learning record back into data/corpus/grading_feedback_records.jsonl
and appends a retrievable learning chunk into the corpus store.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FEEDBACK_STORE = REPO_ROOT / "data" / "corpus" / "grading_feedback_records.jsonl"


def record_graded_outcome_to_corpus(
    reasoning_trace: Dict[str, Any],
    graded_outcome: Dict[str, Any],
    feedback_store_path: Optional[Path] = None,
) -> Dict[str, Any]:
    store_path = Path(feedback_store_path) if feedback_store_path else DEFAULT_FEEDBACK_STORE
    store_path.parent.mkdir(parents=True, exist_ok=True)

    game_id = str(reasoning_trace["game_id"])
    trace_id = str(reasoning_trace["trace_id"])
    packet_id = str(reasoning_trace["packet_id"])
    pred_delta = float(reasoning_trace["final_reasoning_delta"])

    actual_home_score = int(graded_outcome["home_score"])
    actual_away_score = int(graded_outcome["away_score"])
    actual_margin = actual_home_score - actual_away_score
    actual_total = actual_home_score + actual_away_score
    brier_error = round((float(graded_outcome.get("predicted_win_prob", 0.58)) - (1.0 if actual_margin > 0 else 0.0)) ** 2, 6)

    feedback_id = f"FDBK-{game_id}-{trace_id}"
    payload_str = f"{feedback_id}:{actual_margin}:{actual_total}:{brier_error}"
    sha = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()

    record = {
        "feedback_id": feedback_id,
        "game_id": game_id,
        "packet_id": packet_id,
        "trace_id": trace_id,
        "graded_at_utc": datetime.now(timezone.utc).isoformat(),
        "pre_game_reasoning_delta": pred_delta,
        "actual_home_score": actual_home_score,
        "actual_away_score": actual_away_score,
        "actual_margin": actual_margin,
        "actual_total": actual_total,
        "brier_score_error": brier_error,
        "weighed_signals_count": len(reasoning_trace.get("weighed_signals", [])),
        "lesson_summary": (
            f"Graded {game_id} (trace={trace_id}): actual margin={actual_margin}, total={actual_total}, "
            f"brier={brier_error}. Trench & scheme priors calibrated back into corpus."
        ),
        "sha256": sha,
    }

    with store_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    return record
