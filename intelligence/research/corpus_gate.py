"""UNVALIDATED gate for research corpus hits -> reasoning engine.

Records in research_corpus are UNVALIDATED against GSE data. They may be
cited for mechanism-finding, but they must not become load-bearing evidence
in a recommendation. This module is the enforcement previously missing in
intelligence/reasoning/ (which stamps nothing for corpus hits).

Rules (closed):
  * Corpus-derived claims are INFERENCE only. Upgrading a corpus hit to
    CORPUS / COMPUTED / LIVE_VERIFIED is a gate violation.
  * Corpus-derived claims must not be load-bearing. A load-bearing
    INFERENCE (or SINGLE_SOURCE) link makes the dependent thesis weak
    (spec §8 T5, levels.py weak_link). The gate refuses it outright so
    corpus material cannot silently drive a pick.
  * Every corpus claim carries source="research_corpus/<src>/<id>" and
    note containing "GATE: UNVALIDATED".
  * Claims with source prefix "research_corpus/" are checked even if the
    caller forgot to mark them. An unmarked CORPUS claim citing a corpus
    path is a violation, not a pass.
  * Validation is fail-closed: missing source/note, or verification above
    INFERENCE, is a violation. Never assume validated.

Usage:
  from intelligence.research.corpus_gate import corpus_claim, validate_claims
  claim = corpus_claim("coverage disguise ...", "research_corpus/.../... ")
"""

from __future__ import annotations

from typing import Any, Iterable

from intelligence.reasoning.enums import ReasoningDepth, Verification
from intelligence.reasoning.schemas import Claim

GATE_STATUS = "UNVALIDATED"
CORPUS_SOURCE_PREFIX = "research_corpus/"
GATE_NOTE = f"GATE: {GATE_STATUS} — citation/mechanism use only, not load-bearing evidence in a recommendation."
# Verification values a corpus claim may carry. Only INFERENCE is allowed.
_ALLOWED = {Verification.INFERENCE}

def is_corpus_source(source: str) -> bool:
    return bool(source) and str(source).startswith(CORPUS_SOURCE_PREFIX)

def corpus_claim(text: str, source: str, value: Any = None, note_extra: str = "") -> Claim:
    """Build a gate-compliant corpus claim. Always INFERENCE + GATE note."""
    if not is_corpus_source(source):
        raise ValueError(f"corpus_claim: source must start with {CORPUS_SOURCE_PREFIX!r}, got {source!r}")
    note = GATE_NOTE
    if note_extra:
        note = f"{note} {note_extra}"
    return Claim(text=str(text), verification=Verification.INFERENCE, source=source, value=value, note=note)

def _check_claim(c: Any, depth: ReasoningDepth | None = None) -> list[str]:
    """Return list of violations for one claim (empty = compliant)."""
    violations: list[str] = []
    v = getattr(c, "verification", None)
    src = str(getattr(c, "source", "") or "")
    note = str(getattr(c, "note", "") or "")
    load_bearing = bool(getattr(c, "load_bearing", True))
    # Corpus lineage detection: explicit source, or caller using corpus tool.
    if is_corpus_source(src):
        if v not in _ALLOWED:
            violations.append(f"corpus source {src!r} used with verification {v!r}; must be INFERENCE")
        if GATE_STATUS not in note:
            violations.append(f"corpus claim from {src!r} missing GATE note")
        # Load-bearing check: Claims have no load_bearing attr -> check via flag on object or trace rule.
        # For CausalLinks loaded as claims, caller should pass load_bearing=False to exempt.
        # Spec: INFERENCE/SINGLE_SOURCE load-bearing triggers weak_link; gate refuses it.
        if depth is not None and depth.is_at_least(ReasoningDepth.L4) and load_bearing and v in (Verification.INFERENCE, Verification.SINGLE_SOURCE):
            violations.append(f"corpus claim {src!r} is load-bearing at {depth} — use citation only")
    elif v in (Verification.CORPUS, Verification.COMPUTED) and "research_corpus" in note.lower() + src.lower():
        violations.append("claim cites research_corpus but claims CORPUS/COMPUTED verification")
    return violations

def validate_claims(claims: Iterable[Any], depth: ReasoningDepth | None = None) -> list[str]:
    """Validate a list of Claims (or CausalLinks). Returns all violations."""
    out: list[str] = []
    for c in claims:
        out.extend(_check_claim(c, depth=depth))
    return out

def validate_trace_claims(claims: Iterable[Any], depth: ReasoningDepth | None = None) -> None:
    """Raise ValueError on first violation. For engine call-sites."""
    v = validate_claims(claims, depth=depth)
    if v:
        raise ValueError("corpus_gate: " + "; ".join(v))
