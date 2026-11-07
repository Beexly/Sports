#!/usr/bin/env python3
"""
CANONICAL REASONING WORKFLOW RUNNER (`intelligence/reasoning/workflow_runner.py`)
Executes the 5-track (L1..L5) and 7-step weekly reasoning workflow over a 26-layer ContextPacket,
producing a schema-validated ReasoningTrace with full equation and corpus provenance.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from intelligence.reasoning.reasoning_workflow_assembler import (
    STRICT_TRACK_DEPENDENCY_ORDER,
    execute_reasoning_workflow as _execute_reasoning_workflow,
    run_placeholder_content_stage_validator,
    run_synthetic_simulation_stage_validator,
    validate_reasoning_trace_schema,
)


def execute_reasoning_workflow(
    context_packet: Dict[str, Any],
    persist: bool = True,
    write_to_disk: Optional[bool] = None,
) -> Dict[str, Any]:
    should_write = persist if write_to_disk is None else write_to_disk
    return _execute_reasoning_workflow(
        context_packet=context_packet,
        write_to_disk=should_write,
    )


__all__ = [
    "STRICT_TRACK_DEPENDENCY_ORDER",
    "execute_reasoning_workflow",
    "run_placeholder_content_stage_validator",
    "run_synthetic_simulation_stage_validator",
    "validate_reasoning_trace_schema",
]
