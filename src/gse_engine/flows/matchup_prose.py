"""Post-gate matchup prose formatter preserving football % rates and XX/100 scores."""

from __future__ import annotations

import re

_INTERNAL_JARGON_RE = re.compile(
    r"\b(STAGE5_[A-Z0-9_]+|Romano\s+CQR|Sinkhorn(?:-Knopp)?|JEV|Cholesky|tau_hat|10,000\s+worlds|22,750,000\s+snap)\b",
    re.IGNORECASE,
)


def format_matchup_prose(summary: str, confidence_score: int) -> str:
    """Formats public or member-facing football prose safely post-gate.

    Args:
        summary: Draft football film/matchup paragraph.
        confidence_score: Integer 0-100 confidence score (never formatted with %).

    Returns:
        Plain-English prose string with internal jargon stripped and XX/100 rating appended.
    """
    if not 0 <= confidence_score <= 100:
        raise ValueError(f"confidence_score must be in [0, 100], got {confidence_score}.")

    cleaned = summary.replace("\u2014", " - ").replace("\u2013", "-")
    cleaned = _INTERNAL_JARGON_RE.sub("matchup study", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return f"{cleaned} (Read {confidence_score}/100)"
