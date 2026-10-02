# PROVENANCE: implements reasoning-depth-spec.md §2.6 (persisted, content-addressed,
# resumable traces), §6.1 (trace schema), §8 T7 (resume, don't restart).
# Converged 2026-10-02: the store persists reasoning's CANONICAL ReasoningTrace
# (via reasoning.trace serialization). Legacy façade-DTO payloads still load
# (converted to canonical on read) so existing saved traces remain readable.
"""Trace persistence: content-addressed, append-only, resumable (façade store)."""
from __future__ import annotations

import hashlib
import json
import os
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Optional

from reasoning import ReasoningTrace as CanonicalTrace
from reasoning.enums import ChecklistVerdict, ReasoningDepth
from reasoning.trace import trace_from_dict as _canonical_from_dict
from reasoning.trace import trace_to_dict as _canonical_to_dict

from .types import ReasoningTrace as DtoTrace


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def make_trace_id(game: dict[str, Any], depth: ReasoningDepth,
                  levels: dict[str, Any]) -> str:
    """Content-addressed id: sha1 of the canonical (game, depth, levels) payload."""
    canonical = json.dumps({"game": game, "depth": depth.value, "levels": levels},
                           sort_keys=True, default=str)
    return "trace_" + hashlib.sha1(canonical.encode()).hexdigest()[:16]


def _dto_to_canonical(rec: dict[str, Any]) -> CanonicalTrace:
    """Convert a legacy façade-DTO payload to the canonical trace."""
    from reasoning import EscalationEntry
    trace = CanonicalTrace(
        trace_id=rec["trace_id"],
        depth=ReasoningDepth(rec["depth"]),
        game=rec.get("game", {}),
        label=rec.get("label", "DRAFT"),
    )
    for e in rec.get("escalation_log", []):
        trace.escalation_log.append(EscalationEntry(
            from_depth=ReasoningDepth(e["from"]),
            to_depth=ReasoningDepth(e["to"]),
            trigger=e["trigger"], at=e.get("at", "")))
    trace.levels = rec.get("levels", {})
    trace.checklist = {k: ChecklistVerdict(v) for k, v in rec.get("checklist", {}).items()}
    trace.tool_calls = rec.get("tool_calls", [])
    return trace


class TraceStore(ABC):
    @abstractmethod
    def save(self, trace: Any) -> str: ...
    @abstractmethod
    def load(self, trace_id: str) -> Optional[CanonicalTrace]: ...


class FileTraceStore(TraceStore):
    """JSONL file store. One line per save; resume appends a new level, never rewrites."""

    def __init__(self, path: str):
        self.path = path
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    def save(self, trace: Any) -> str:
        if isinstance(trace, CanonicalTrace):
            body = {"kind": "canonical", "record": _canonical_to_dict(trace)}
        else:  # legacy DTO
            body = {"kind": "dto", "record": trace.to_dict()}
        body["saved_at"] = utcnow_iso()
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(body, default=str) + "\n")
        return trace.trace_id

    def load(self, trace_id: str) -> Optional[CanonicalTrace]:
        if not os.path.exists(self.path):
            return None
        latest: Optional[dict] = None
        with open(self.path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                if _record_trace_id(rec) == trace_id:
                    latest = rec
        if latest is None:
            return None
        kind = latest.get("kind")
        inner = latest.get("record", latest)
        if kind == "canonical":
            return _canonical_from_dict(inner)
        if kind == "dto":
            return _dto_to_canonical(inner)
        # Legacy flat payloads (pre-envelope): try canonical, fall back to DTO.
        try:
            return _canonical_from_dict(latest)
        except (ValueError, KeyError, TypeError):
            return _dto_to_canonical(latest)


def _record_trace_id(rec: dict[str, Any]) -> Optional[str]:
    """Extract the trace id from any known payload shape."""
    inner = rec.get("record")
    if isinstance(inner, dict):
        fields = inner.get("fields")
        if isinstance(fields, dict) and fields.get("trace_id"):
            return fields["trace_id"]
        if inner.get("trace_id"):
            return inner["trace_id"]
    if rec.get("trace_id"):
        return rec["trace_id"]
    fields = rec.get("fields")
    if isinstance(fields, dict):
        return fields.get("trace_id")
    return None


def resume_trace(store: TraceStore, trace_id: str, new_level_name: str,
                 new_level: dict[str, Any], trigger: str) -> CanonicalTrace:
    """Merge new signals as a NEW level entry; original levels are never rewritten (T7)."""
    from reasoning import EscalationEntry
    old = store.load(trace_id)
    if old is None:
        raise KeyError(f"no such trace: {trace_id}")
    merged_levels = dict(old.levels)
    if new_level_name in merged_levels:
        raise ValueError(f"level {new_level_name!r} already exists — refusing to overwrite")
    merged_levels[new_level_name] = new_level
    new_trace = CanonicalTrace(
        trace_id=make_trace_id(old.game, old.depth, merged_levels),
        game=dict(old.game),
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
        EscalationEntry(from_depth=old.depth, to_depth=old.depth,
                        trigger=f"resume_merge:{trigger}", at=utcnow_iso()))
    return new_trace
