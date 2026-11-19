"""LSM-style hierarchical context compaction inspired by billion-context."""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

ContextTier = Literal["L0_CAPTURE", "L1_DISTILL", "L2_CONDENSE"]

_CRITICAL_SALIENCE_TAGS: frozenset[str] = frozenset(
    {"injury", "qb1", "weather", "clv", "cage_receipt", "stage0"}
)


@dataclass(frozen=True, slots=True)
class ContextTurn:
    """Single immutable memory turn stored in the LSM context hierarchy."""

    turn_id: str
    tier: ContextTier
    content: str
    token_estimate: int
    salience_tags: tuple[str, ...]
    recorded_utc: datetime


@dataclass(frozen=True, slots=True)
class CompactionResult:
    """Outcome of a bounded LSM context compaction pass."""

    retained_turns: tuple[ContextTurn, ...]
    total_tokens_before: int
    total_tokens_after: int
    distilled_count: int
    digest_sha256: str


def _digest_turns(turns: Sequence[ContextTurn]) -> str:
    payload = "\n".join(
        f"{t.turn_id}|{t.tier}|{t.recorded_utc.isoformat()}|{t.content}" for t in turns
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _estimate_tokens(text: str) -> int:
    return max(1, (len(text) + 3) // 4)


class LsmContextKernel:
    """Bounded Capture -> Distill -> Condense context manager for long runs."""

    def __init__(self, max_token_budget: int = 8000, keep_recent_l0: int = 4) -> None:
        """Initializes the hierarchical budget and recent-turn retention window."""
        if max_token_budget < 64:
            raise ValueError("max_token_budget must be >= 64.")
        if keep_recent_l0 < 1:
            raise ValueError("keep_recent_l0 must be >= 1.")
        self.max_token_budget = max_token_budget
        self.keep_recent_l0 = keep_recent_l0

    def compact(self, turns: Sequence[ContextTurn], as_of_utc: datetime) -> CompactionResult:
        """Filters future turns and compacts oldest L0 turns into L1/L2 digests."""
        valid = sorted(
            (t for t in turns if t.recorded_utc <= as_of_utc),
            key=lambda item: (item.recorded_utc, item.turn_id),
        )
        total_before = sum(max(1, t.token_estimate) for t in valid)
        if total_before <= self.max_token_budget:
            retained = tuple(valid)
            return CompactionResult(
                retained_turns=retained,
                total_tokens_before=total_before,
                total_tokens_after=total_before,
                distilled_count=0,
                digest_sha256=_digest_turns(retained),
            )

        l0_turns = [t for t in valid if t.tier == "L0_CAPTURE"]
        protected_ids = {t.turn_id for t in l0_turns[-self.keep_recent_l0 :]}
        older_turns = [t for t in valid if t.turn_id not in protected_ids]
        recent_turns = [t for t in valid if t.turn_id in protected_ids]

        critical_snippets: list[str] = []
        general_snippets: list[str] = []
        collected_tags: set[str] = set()

        for turn in older_turns:
            lowered_tags = {tag.lower() for tag in turn.salience_tags}
            collected_tags.update(lowered_tags)
            snippet = f"[{turn.turn_id}] {turn.content.strip()[:96]}"
            if lowered_tags & _CRITICAL_SALIENCE_TAGS:
                critical_snippets.append(snippet)
            else:
                general_snippets.append(snippet)

        compacted: list[ContextTurn] = []
        if critical_snippets:
            l1_text = "DISTILL CRITICAL: " + " ; ".join(critical_snippets)
            compacted.append(
                ContextTurn(
                    turn_id="l1-distill-critical",
                    tier="L1_DISTILL",
                    content=l1_text[: max(80, self.max_token_budget * 2)],
                    token_estimate=_estimate_tokens(l1_text),
                    salience_tags=tuple(sorted(collected_tags & _CRITICAL_SALIENCE_TAGS)),
                    recorded_utc=as_of_utc,
                )
            )
        if general_snippets:
            l2_text = f"CONDENSE ({len(general_snippets)} turns): " + " | ".join(
                s[:48] for s in general_snippets[:6]
            )
            compacted.append(
                ContextTurn(
                    turn_id="l2-condense-archive",
                    tier="L2_CONDENSE",
                    content=l2_text,
                    token_estimate=_estimate_tokens(l2_text),
                    salience_tags=("archived",),
                    recorded_utc=as_of_utc,
                )
            )

        compacted.extend(recent_turns)
        retained_tuple = tuple(compacted)
        total_after = sum(max(1, t.token_estimate) for t in retained_tuple)

        return CompactionResult(
            retained_turns=retained_tuple,
            total_tokens_before=total_before,
            total_tokens_after=total_after,
            distilled_count=len(older_turns),
            digest_sha256=_digest_turns(retained_tuple),
        )
