# PROVENANCE: implements reasoning-depth-spec.md §2.6 (encrypted/portable reasoning state →
# persisted, content-addressed, resumable traces), §6.1 (trace schema), §8 T7 (resume, don't restart).
"""Trace persistence: content-addressed, append-only, resumable."""
from __future__ import annotations

import hashlib
import json
import os
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Optional

from .types import EscalationEntry, ReasoningDepth, ReasoningTrace


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def make_trace_id(game: dict[str, Any], depth: ReasoningDepth,
                  levels: dict[str, Any]) -> str:
    """Content-addressed id: sha1 of the canonical (game, depth, levels) payload."""
    canonical = json.dumps({"game": game, "depth": depth.value, "levels": levels},
                           sort_keys=True, default=str)
    return "trace_" + hashlib.sha1(canonical.encode()).hexdigest()[:16]


class TraceStore(ABC):
    @abstractmethod
    def save(self, trace: ReasoningTrace) -> str: ...
    @abstractmethod
    def load(self, trace_id: str) -> Optional[ReasoningTrace]: ...


class FileTraceStore(TraceStore):
    """JSONL file store. One line per save; resume appends a new level, never rewrites."""

    def __init__(self, path: str):
        self.path = path
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    def save(self, trace: ReasoningTrace) -> str:
        record = trace.to_dict()
        record["saved_at"] = utcnow_iso()
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, default=str) + "\n")
        return trace.trace_id

    def load(self, trace_id: str) -> Optional[ReasoningTrace]:
        if not os.path.exists(self.path):
            return None
        latest: Optional[dict] = None
        with open(self.path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                if rec.get("trace_id") == trace_id:
                    latest = rec
        if latest is None:
            return None
        return _from_dict(latest)


def _from_dict(rec: dict[str, Any]) -> ReasoningTrace:
    from .types import ChecklistVerdict, EscalationEntry
    trace = ReasoningTrace(
        trace_id=rec["trace_id"],
        game=rec["game"],
        depth=ReasoningDepth(rec["depth"]),
        label=rec.get("label", "DRAFT"),
    )
    for e in rec.get("escalation_log", []):
        trace.escalation_log.append(EscalationEntry(
            ReasoningDepth(e["from"]), ReasoningDepth(e["to"]), e["trigger"], e["at"]))
    trace.levels = rec.get("levels", {})
    trace.checklist = {k: ChecklistVerdict(v) for k, v in rec.get("checklist", {}).items()}
    trace.tool_calls = rec.get("tool_calls", [])
    return trace


def resume_trace(store: TraceStore, trace_id: str, new_level_name: str,
                 new_level: dict[str, Any], trigger: str) -> ReasoningTrace:
    """Merge new signals as a NEW level entry; original levels are never rewritten (T7)."""
    old = store.load(trace_id)
    if old is None:
        raise KeyError(f"no such trace: {trace_id}")
    merged_levels = dict(old.levels)
    if new_level_name in merged_levels:
        raise ValueError(f"level {new_level_name!r} already exists — refusing to overwrite")
    merged_levels[new_level_name] = new_level
    new_trace = ReasoningTrace(
        trace_id=make_trace_id(old.game, old.depth, merged_levels),
        game=old.game,
        depth=old.depth,
        escalation_log=list(old.escalation_log),
        levels=merged_levels,
        checklist=dict(old.checklist),
        tool_calls=list(old.tool_calls) + [
            {"tool": "trace/resume", "args": {"from": trace_id, "level": new_level_name},
             "returned": trigger}],
        label=old.label,
    )
    new_trace.escalation_log.append(
        EscalationEntry(old.depth, old.depth, f"resume_merge:{trigger}", utcnow_iso()))
    return new_trace
