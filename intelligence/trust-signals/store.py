# Provenance: x-intake-registry.md monitoring spec — "Where new items land:
# ~/workspace/corpus-intelligence/intake/items/<handle>/YYYY-MM-DD.md — one file per
# check, containing: post text/URL/timestamp, track tags, and a one-line intelligence
# note. ... Dedup: key on X post ID. Never re-ingest." Verified in
# deep/c05/verified-claims.md §2.
# Implements buildable-systems.md Systems 1 (dedup + landing) and 4 (wire dedup).
# Syntheses.md S6: one store serves both lanes — post_id dedup for X items,
# content-hash dedup for wire items without post IDs.

"""Item/signal/event store: JSONL persistence, two-key dedup, registry landing files."""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime

from .models import NewsEvent, RawItem, TrustSignal


def content_hash(text: str, source_handle: str, day: str) -> str:
    """Canonical dedup key for items without post IDs (news wire). Normalized
    text + source + day: the same story re-fetched is a duplicate; a genuinely
    new development the next day is not."""
    normalized = " ".join(text.lower().split())
    return hashlib.sha1(f"{source_handle}|{day}|{normalized}".encode()).hexdigest()[:16]


def _json_default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    if hasattr(o, "value"):  # Enum
        return o.value
    if hasattr(o, "__dataclass_fields__"):
        d = {f: getattr(o, f) for f in o.__dataclass_fields__}
        return d
    if isinstance(o, (tuple, set)):
        return list(o)
    raise TypeError(f"not JSON serializable: {type(o)}")


def _serialize(obj) -> str:
    return json.dumps(obj, default=_json_default, sort_keys=True)


class IntakeStore:
    """JSONL-backed store rooted at <root>/.

    Layout:
      items.jsonl    — RawItems as ingested
      signals.jsonl  — processed TrustSignals
      events.jsonl   — NewsEvents
      items/<handle>/YYYY-MM-DD.md — registry landing files (human-readable)
    """

    def __init__(self, root: str):
        self.root = root
        os.makedirs(root, exist_ok=True)
        self._seen_post_ids: set[str] = set()
        self._seen_hashes: set[str] = set()
        self._load_seen_keys()

    # -- paths -------------------------------------------------------------
    def _path(self, name: str) -> str:
        return os.path.join(self.root, name)

    # -- dedup -------------------------------------------------------------
    def _load_seen_keys(self) -> None:
        path = self._path("items.jsonl")
        if not os.path.exists(path):
            return
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if obj.get("post_id"):
                    self._seen_post_ids.add(obj["post_id"])
                day = (obj.get("observed_at") or "")[:10]
                self._seen_hashes.add(
                    content_hash(obj.get("raw_text", ""), obj.get("source_handle", ""), day)
                )

    def is_duplicate(self, item: RawItem) -> bool:
        """Registry rule: never re-ingest. X items dedup on post ID; wire items
        on content hash."""
        if item.post_id and item.post_id in self._seen_post_ids:
            return True
        day = item.observed_at.strftime("%Y-%m-%d")
        if content_hash(item.raw_text, item.source_handle, day) in self._seen_hashes:
            return True
        return False

    def save_item(self, item: RawItem) -> bool:
        """Persist a raw item. Returns False if it was a duplicate (not saved)."""
        if self.is_duplicate(item):
            return False
        with open(self._path("items.jsonl"), "a", encoding="utf-8") as f:
            f.write(_serialize(item) + "\n")
        if item.post_id:
            self._seen_post_ids.add(item.post_id)
        day = item.observed_at.strftime("%Y-%m-%d")
        self._seen_hashes.add(content_hash(item.raw_text, item.source_handle, day))
        return True

    def save_signal(self, signal: TrustSignal) -> None:
        with open(self._path("signals.jsonl"), "a", encoding="utf-8") as f:
            f.write(_serialize(signal) + "\n")

    def save_event(self, event: NewsEvent) -> None:
        with open(self._path("events.jsonl"), "a", encoding="utf-8") as f:
            f.write(_serialize(event) + "\n")

    # -- reads -------------------------------------------------------------
    def _read_all(self, name: str) -> list[dict]:
        path = self._path(name)
        if not os.path.exists(path):
            return []
        rows = []
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
        return rows

    def all_signal_dicts(self) -> list[dict]:
        return self._read_all("signals.jsonl")

    def all_item_dicts(self) -> list[dict]:
        return self._read_all("items.jsonl")

    def signals_for_team(self, team: str) -> list[dict]:
        return [s for s in self.all_signal_dicts() if s.get("team") == team]

    # -- registry landing files --------------------------------------------
    def write_landing(
        self,
        item: RawItem,
        track_tags: tuple,
        intel_note: str,
    ) -> str:
        """Append the item to items/<handle>/YYYY-MM-DD.md in the registry's
        exact format: post text/URL/timestamp, track tags, one-line note.

        Provenance rule enforced: items without a source URL must carry a
        provenance_gap note, else the write is rejected.
        """
        if not item.url and not item.provenance_gap:
            raise ValueError(
                "provenance rule: item has no source_url and no provenance_gap — "
                "refusing to land it"
            )
        handle_dir = item.source_handle.lstrip("@")
        day = item.observed_at.strftime("%Y-%m-%d")
        dirpath = os.path.join(self.root, "items", handle_dir)
        os.makedirs(dirpath, exist_ok=True)
        path = os.path.join(dirpath, f"{day}.md")

        tags = ", ".join(t.value if hasattr(t, "value") else str(t) for t in track_tags)
        url_line = item.url or f"PROVENANCE-GAP: {item.provenance_gap}"
        entry = (
            f"\n## {item.observed_at.strftime('%H:%M UTC')}"
            + (f" — post {item.post_id}" if item.post_id else "")
            + f"\n- URL: {url_line}"
            + f"\n- Tracks: {tags}"
            + f"\n- Note: {intel_note}"
            + f"\n\n> {item.raw_text.strip()}\n"
        )
        if not os.path.exists(path):
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"# {item.source_handle} — {day}\n")
        with open(path, "a", encoding="utf-8") as f:
            f.write(entry)
        return path
