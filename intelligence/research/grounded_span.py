"""Source-grounded extraction.

LangExtract (google/langextract, Apache-2.0) requires an LLM and was not run.
Ollama is not installed here, and no API key was invented. The rule that
improves GSE is the one in its README: an extracted value is kept only when it
is a character span of the source. A claim that is not in the text is refused.
"""

from __future__ import annotations


def ground_span(source: str, claim: str) -> dict:
    if not source or not claim:
        return {"ok": False, "reason": "empty", "start": None, "end": None}
    start = source.find(claim)
    if start < 0:
        return {"ok": False, "reason": "not-in-source", "start": None, "end": None}
    return {"ok": True, "reason": "grounded", "start": start, "end": start + len(claim)}
