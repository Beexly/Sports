"""
grading_to_corpus_pipe.py — Wave 8 (W8-02) Schema-Tested Feedback Pipe (`grading -> training data -> corpus`)
=============================================================================================================
Validates the closed-loop post-settlement learning pipeline using SYNTHETIC GRADED OUTCOMES ONLY
(zero live pick grading or live model mutation):
  1. Stage 1 (`GradingReceipt`): Ingests synthetic graded outcome with `packet_id`, `trace_id`,
     `clv_bps`, `brier_score`, and `attribution_class` (`VARIANCE_NOISE` vs `MODEL_MISS_OL_SCHEME`).
  2. Stage 2 (`TrainingExampleDpoGrpo`): Compiles a schema-validated DPO/GRPO preference & calibration
     training record preserving `OL -> scheme -> QB` attribution and `layer_citations`.
  3. Stage 3 (`CorpusLessonNode`): Emits a structured corpus memory node ready for PageIndex / corpus
     retrieval indexing with full provenance (`packet_id`, `trace_id`, `ledger_sha`).
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from intelligence.reasoning.schema_validator import SchemaValidationError

ALLOWED_GRADING_MODES = ("SYNTHETIC_GRADED_OUTCOME_ONLY",)


def validate_synthetic_grading_input(graded_outcome: dict[str, Any]) -> dict[str, Any]:
    required_keys = (
        "grading_id",
        "mode",
        "game_id",
        "packet_id",
        "trace_id",
        "ledger_sha",
        "predicted_prob",
        "realized_outcome",
        "clv_bps",
        "primary_layer_slug",
    )
    for k in required_keys:
        if k not in graded_outcome:
            raise SchemaValidationError(f"grading_to_corpus_pipe: missing required key '{k}'")

    if graded_outcome["mode"] not in ALLOWED_GRADING_MODES:
        raise SchemaValidationError(
            f"grading_to_corpus_pipe: mode must be 'SYNTHETIC_GRADED_OUTCOME_ONLY', got {graded_outcome['mode']!r}"
        )

    p = float(graded_outcome["predicted_prob"])
    y = int(graded_outcome["realized_outcome"])
    if not (0.0 <= p <= 1.0) or y not in (0, 1):
        raise SchemaValidationError("grading_to_corpus_pipe: predicted_prob must be in [0,1] and realized_outcome in {0,1}")

    return graded_outcome


def compile_training_example_from_grade(graded_outcome: dict[str, Any]) -> dict[str, Any]:
    """Transform a validated synthetic grading outcome into a DPO/GRPO training example."""
    validate_synthetic_grading_input(graded_outcome)
    p = float(graded_outcome["predicted_prob"])
    y = int(graded_outcome["realized_outcome"])
    clv_bps = float(graded_outcome["clv_bps"])
    brier = round((p - y) ** 2, 6)

    if clv_bps >= 25.0 and brier > 0.25:
        attribution = "PROCESS_SOUND_VARIANCE_OUTCOME"
        grpo_reward = round(0.65 + min(0.30, clv_bps / 500.0), 4)
    elif brier <= 0.18:
        attribution = "CALIBRATED_CONVERGENCE"
        grpo_reward = round(0.85 - brier, 4)
    else:
        attribution = "STRUCTURAL_LAYER_REWEIGHT_CANDIDATE"
        grpo_reward = round(max(0.10, 0.50 - brier), 4)

    example_id = hashlib.sha256(
        json.dumps(
            {
                "grading_id": graded_outcome["grading_id"],
                "packet_id": graded_outcome["packet_id"],
                "trace_id": graded_outcome["trace_id"],
            },
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()[:12]

    return {
        "training_example_id": f"trn_{example_id}",
        "mode": "SYNTHETIC_GRADED_OUTCOME_ONLY",
        "game_id": str(graded_outcome["game_id"]),
        "packet_id": str(graded_outcome["packet_id"]),
        "trace_id": str(graded_outcome["trace_id"]),
        "ledger_sha": str(graded_outcome["ledger_sha"]),
        "brier_score": brier,
        "clv_bps": clv_bps,
        "attribution_class": attribution,
        "grpo_group_reward": grpo_reward,
        "primary_layer_slug": str(graded_outcome["primary_layer_slug"]),
        "dpo_pair": {
            "prompt": f"Audit post-game calibration for {graded_outcome['game_id']} ({graded_outcome['primary_layer_slug']})",
            "chosen_response": (
                f"Maintain OL -> scheme -> QB hierarchy; attribution={attribution} "
                f"(Brier={brier}, CLV={clv_bps} bps)."
            ),
            "rejected_response": "Overreact to single-game outcome noise by overriding OL -> scheme -> QB dependency order.",
        },
    }


def append_training_example_to_corpus_node(training_example: dict[str, Any]) -> dict[str, Any]:
    """Compile a DPO/GRPO training example into a PageIndex-ready corpus memory node."""
    required_training_keys = (
        "training_example_id",
        "mode",
        "game_id",
        "packet_id",
        "trace_id",
        "ledger_sha",
        "brier_score",
        "attribution_class",
        "primary_layer_slug",
        "dpo_pair",
    )
    for k in required_training_keys:
        if k not in training_example:
            raise SchemaValidationError(f"append_training_example_to_corpus_node: missing '{k}'")

    node_hash = hashlib.sha256(
        json.dumps(training_example, sort_keys=True).encode("utf-8")
    ).hexdigest()[:12]

    return {
        "corpus_node_id": f"crp_{node_hash}",
        "schema_version": "1.0.0",
        "mode": "SYNTHETIC_GRADED_OUTCOME_ONLY",
        "source_training_example_id": training_example["training_example_id"],
        "game_id": training_example["game_id"],
        "packet_id": training_example["packet_id"],
        "trace_id": training_example["trace_id"],
        "ledger_sha": training_example["ledger_sha"],
        "indexed_layer_slug": training_example["primary_layer_slug"],
        "attribution_class": training_example["attribution_class"],
        "brier_score": training_example["brier_score"],
        "retrieval_summary": training_example["dpo_pair"]["chosen_response"],
        "citations": [
            training_example["packet_id"],
            training_example["trace_id"],
            training_example["ledger_sha"],
            training_example["primary_layer_slug"],
        ],
    }


def run_grading_to_corpus_feedback_pipe(graded_outcome: dict[str, Any]) -> dict[str, Any]:
    """Execute the full `grading -> training data -> corpus` synthetic feedback pipeline."""
    validated_grade = validate_synthetic_grading_input(graded_outcome)
    training_example = compile_training_example_from_grade(validated_grade)
    corpus_node = append_training_example_to_corpus_node(training_example)
    return {
        "grading_receipt": validated_grade,
        "training_example": training_example,
        "corpus_node": corpus_node,
        "pipe_verified": True,
    }
