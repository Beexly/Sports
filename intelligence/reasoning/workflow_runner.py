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


if __name__ == "__main__":
    import argparse
    import json
    from pathlib import Path

    parser = argparse.ArgumentParser(description="Execute 5-track reasoning workflow over ContextPacket")
    parser.add_argument("--context-packet", required=True, help="Path to ContextPacket JSON")
    parser.add_argument("--out", default=None, help="Output path for ReasoningTrace JSON")
    parser.add_argument("--require-all-layers", action="store_true")
    args = parser.parse_args()

    pkt = json.loads(Path(args.context_packet).read_text(encoding="utf-8"))
    if args.require_all_layers and len(pkt.get("layers", {})) < 26:
        raise ValueError(f"ContextPacket {args.context_packet} has fewer than 26 layers")
    trace = execute_reasoning_workflow(context_packet=pkt, persist=True)
    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(trace, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"trace_id": trace["trace_id"], "game_id": trace["game_id"], "final_reasoning_delta": trace["final_reasoning_delta"]}))

