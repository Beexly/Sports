# Provenance: reasoning-depth-spec.md §6.1 (reasoning trace — the unit of coherence),
# §2.6 (persistent, content-addressed, resumable reasoning state), §8 T7
# (resume, don't restart). Shared dataclasses live in schemas.py (canonical
# contract); this module owns trace persistence, content addressing, and resume.

"""Trace persistence: content-addressed store + resume-by-merge.

save() → content hash. load() → ReasoningTrace. resume() merges new information
as a new level entry — the original levels are never rewritten (T7).
"""

from __future__ import annotations

import copy
import hashlib
import json
import os
from dataclasses import asdict, fields, is_dataclass
from datetime import datetime, timezone
from typing import Any

from .enums import ChecklistVerdict, Exposure, ReasoningDepth, Verification
from .exceptions import TraceNotFound
from .schemas import EscalationEntry, ReasoningTrace, ToolCall


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# Serialization. Dataclasses are tagged with their class name and rebuilt via
# a registry; enums and tuples are tagged too. Unknown/extra stored fields are
# ignored on decode (forward compatibility).
# ---------------------------------------------------------------------------

from . import schemas as _schemas

_DATACLASS_REGISTRY: dict[str, type] = {
    name: cls
    for name, cls in vars(_schemas).items()
    if is_dataclass(cls) and isinstance(cls, type)
}
_ENUMS = {
    "ReasoningDepth": ReasoningDepth,
    "Verification": Verification,
    "ChecklistVerdict": ChecklistVerdict,
    "Exposure": Exposure,
}


def _encode(obj: Any) -> Any:
    from enum import Enum

    if isinstance(obj, Enum):
        return {"__enum__": f"{type(obj).__name__}.{obj.name}"}
    if is_dataclass(obj) and not isinstance(obj, type):
        return {
            "__dc__": type(obj).__name__,
            "fields": {f.name: _encode(getattr(obj, f.name)) for f in fields(obj)},
        }
    if isinstance(obj, tuple):
        return {"__tuple__": [_encode(x) for x in obj]}
    if isinstance(obj, list):
        return [_encode(x) for x in obj]
    if isinstance(obj, dict):
        return {str(k): _encode(v) for k, v in obj.items()}
    return obj


def _decode(obj: Any) -> Any:
    if isinstance(obj, dict):
        if set(obj.keys()) == {"__enum__"}:
            cls_name, member = obj["__enum__"].split(".")
            return _ENUMS[cls_name][member]
        if set(obj.keys()) == {"__tuple__"}:
            return tuple(_decode(x) for x in obj["__tuple__"])
        if set(obj.keys()) == {"__dc__", "fields"}:
            cls = _DATACLASS_REGISTRY[obj["__dc__"]]
            known = {f.name for f in fields(cls)}
            kwargs = {
                k: _decode(v) for k, v in obj["fields"].items() if k in known
            }
            return cls(**kwargs)
        return {k: _decode(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_decode(x) for x in obj]
    return obj


def trace_to_dict(trace: ReasoningTrace) -> dict:
    return _encode(trace)


def trace_from_dict(d: dict) -> ReasoningTrace:
    decoded = _decode(d)
    if not isinstance(decoded, ReasoningTrace):
        raise ValueError("stored payload is not a ReasoningTrace")
    return decoded


def content_hash(trace: ReasoningTrace) -> str:
    """sha256 of the canonical trace JSON — the content address (spec §2.6)."""
    canonical = json.dumps(trace_to_dict(trace), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------


class TraceStore:
    """File-backed content-addressed trace store."""

    def __init__(self, root: str):
        self.root = root
        os.makedirs(root, exist_ok=True)

    def _path(self, h: str) -> str:
        return os.path.join(self.root, f"{h}.json")

    def save(self, trace: ReasoningTrace) -> str:
        h = content_hash(trace)
        with open(self._path(h), "w") as f:
            json.dump(trace_to_dict(trace), f, indent=2, sort_keys=True)
        return h

    def load(self, h: str) -> ReasoningTrace:
        p = self._path(h)
        if not os.path.exists(p):
            raise TraceNotFound(f"no trace stored under {h}")
        with open(p) as f:
            return trace_from_dict(json.load(f))

    def resume(
        self, h: str, new_level: str, payload: dict, note: str = ""
    ) -> ReasoningTrace:
        """Merge new information as a new level entry. The original levels are
        deep-copied unchanged — Wednesday's reasoning is never silently
        rewritten (T7)."""
        original = self.load(h)
        resumed = copy.deepcopy(original)
        resumed.levels[new_level] = payload
        resumed.escalation_log.append(
            EscalationEntry(
                from_depth=original.depth,
                to_depth=original.depth,
                trigger=f"resume_merge:{note}" if note else "resume_merge",
                at=utcnow(),
            )
        )
        resumed.trace_id = f"{original.trace_id}::resumed"
        return resumed


# ---------------------------------------------------------------------------
# Mutation helpers (builder convenience; the adversarial layer never mutates)
# ---------------------------------------------------------------------------


def log_escalation(
    trace: ReasoningTrace,
    from_depth: ReasoningDepth,
    to_depth: ReasoningDepth,
    trigger: str,
    skipped: bool = False,
) -> None:
    """Append an escalation-log entry. Never mutates trace.depth — only
    escalate_to() moves the depth (so level-completion logging can't clobber
    it on jump replays)."""
    trace.escalation_log.append(
        EscalationEntry(
            from_depth=from_depth, to_depth=to_depth, trigger=trigger,
            at=utcnow(), skipped=skipped,
        )
    )


def record_tool_call(trace: ReasoningTrace, tool: str, args: dict, returned: str) -> None:
    trace.tool_calls.append(ToolCall(tool=tool, args=args, returned=str(returned), at=utcnow()))
