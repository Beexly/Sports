# Provenance: c06 deep research buildable-systems.md §4.2 (quote-hash merger) and B1.
# Research basis: r16 signal-ledger (append-only corrections, never edits);
# registry provenance rule (provenance union on merge); video-cv P1 record spec.
# v1: stdlib only. The merger is idempotent: re-running on the same store is a
# no-op (losers carry dedup_of and are skipped).

"""Quote-hash merger: same quote via TEXT + VIDEO -> one canonical row.

quote_hash = sha1(normalize(quote_text) + speaker_id + target_id).
Keep earliest signal_id; union merged_provenance; take max
extraction_confidence; set dedup_of on the loser. Corrections append new rows
(supersedes/correction_of), never edit (r16 signal-ledger).
"""

from __future__ import annotations

import hashlib
from dataclasses import replace

from .clustering import normalize_quote
from .models import TrustSignal


def quote_hash(sig: TrustSignal) -> str | None:
    """Dedupe key for quote-bearing signals. None when no quote text."""
    if not sig.quote_text:
        return None
    key = f"{normalize_quote(sig.quote_text)}|{sig.speaker_id or ''}|{sig.target_id or ''}"
    return hashlib.sha1(key.encode()).hexdigest()[:16]


def merge_signals(signals: list[TrustSignal]) -> list[TrustSignal]:
    """Merge quote-duplicates. Returns the canonical list (losers excluded).

    Canonical = earliest observed_at (tie: smallest signal_id). The returned
    canonical rows carry merged_provenance (union of URLs), max
    extraction_confidence, and story_cluster_id of the canonical member.
    Idempotent: rows already carrying dedup_of are skipped as losers.
    """
    alive = [s for s in signals if not s.dedup_of]
    groups: dict[str, list[TrustSignal]] = {}
    singletons: list[TrustSignal] = []
    for s in alive:
        qh = quote_hash(s)
        if qh is None:
            singletons.append(s)
        else:
            groups.setdefault(qh, []).append(s)

    out: list[TrustSignal] = list(singletons)
    for members in groups.values():
        if len(members) == 1:
            out.append(members[0])
            continue
        members.sort(key=lambda s: (s.observed_at, s.signal_id))
        canon = members[0]
        urls = [u for u in [m.source_url for m in members] if u]
        merged = tuple(dict.fromkeys(list(canon.merged_provenance) + urls))
        out.append(_replace(canon,
                            merged_provenance=merged,
                            extraction_confidence=max(m.extraction_confidence
                                                      for m in members)))
    return out


def _replace(sig: TrustSignal, **kw) -> TrustSignal:
    """frozen-dataclass replace."""
    return replace(sig, **kw)


def mark_losers(signals: list[TrustSignal]) -> list[TrustSignal]:
    """Full merge pass returning ALL rows: canonicals (with provenance unions
    applied) plus losers carrying dedup_of.

    Use when persisting the merge back (losers stay in the store as tombstones,
    never deleted — r16 append-only). Idempotent: already-marked losers pass
    through unchanged."""
    merged = merge_signals(signals)
    canon_ids = {s.signal_id for s in merged}
    canon_by_hash: dict[str, str] = {}
    for s in merged:
        qh = quote_hash(s)
        if qh:
            canon_by_hash[qh] = s.signal_id
    out: list[TrustSignal] = list(merged)
    for s in signals:
        if s.signal_id in canon_ids:
            continue  # canonical already present
        if s.dedup_of:
            out.append(s)  # marked loser passes through unchanged
            continue
        qh = quote_hash(s)
        target = canon_by_hash.get(qh) if qh else None
        out.append(_replace(s, dedup_of=target) if target else s)
    return out
