"""Zero-cost local SQLite AgentDB hybrid vector + lexical episodic memory store.

Supports coach-speak verification (Tuesday claim vs Sunday snap count),
post-game autopsies, and situational archetypes with strict bitemporal
`recorded_utc <= as_of_utc` no-lookahead enforcement for walk-forward replays.
"""

from __future__ import annotations

import json
import re
import sqlite3
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

_TOKEN_RE = re.compile(r"[a-z0-9]+")


@dataclass(frozen=True, slots=True)
class MemoryEntry:
    """Stored episodic or semantic memory record with bitemporal stamp."""

    entry_id: str
    namespace: str
    text: str
    recorded_utc: str
    metadata: dict[str, Any]


@dataclass(frozen=True, slots=True)
class MemorySearchHit:
    """Hybrid dense-cosine + RRF-lexical retrieval result."""

    entry: MemoryEntry
    score: float
    cosine_similarity: float
    lexical_overlap: float


def _normalize_vector(vec: Sequence[float]) -> np.ndarray:
    """Converts a numeric sequence to a unit L2 float64 NumPy vector."""
    arr = np.asarray(vec, dtype=np.float64)
    if arr.ndim != 1 or arr.size == 0:
        raise ValueError("Embedding vector must be non-empty 1D.")
    norm = float(np.linalg.norm(arr))
    return arr / norm if norm > 0.0 else arr


def _tokenize(text: str) -> set[str]:
    """Extracts lowercase alphanumeric tokens for lexical Jaccard scoring."""
    return set(_TOKEN_RE.findall(text.lower()))


class AgentDbMemoryStore:
    """SQLite-backed hybrid vector and lexical memory store without cloud cost."""

    def __init__(self, db_path: Path | str = ":memory:") -> None:
        """Initializes schema over an in-memory or file-backed SQLite database."""
        self._db_target = str(db_path)
        if self._db_target != ":memory:":
            Path(self._db_target).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self._db_target)
        if self._db_target != ":memory:":
            self._conn.execute("PRAGMA journal_mode=WAL;")
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS memories (
                entry_id TEXT PRIMARY KEY,
                namespace TEXT NOT NULL,
                text TEXT NOT NULL,
                recorded_utc TEXT NOT NULL,
                embedding_json TEXT NOT NULL,
                metadata_json TEXT NOT NULL
            )
            """
        )
        self._conn.commit()

    def close(self) -> None:
        """Closes the underlying SQLite connection."""
        self._conn.close()

    def upsert(
        self,
        entry_id: str,
        namespace: str,
        text: str,
        embedding: Sequence[float],
        recorded_utc: str,
        metadata: Mapping[str, Any] | None = None,
    ) -> MemoryEntry:
        """Inserts or updates a memory record with normalized dense vector."""
        unit_vec = _normalize_vector(embedding)
        meta_dict = dict(metadata or {})
        self._conn.execute(
            """
            INSERT INTO memories (entry_id, namespace, text, recorded_utc, embedding_json, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(entry_id) DO UPDATE SET
                namespace = excluded.namespace,
                text = excluded.text,
                recorded_utc = excluded.recorded_utc,
                embedding_json = excluded.embedding_json,
                metadata_json = excluded.metadata_json
            """,
            (
                entry_id,
                namespace,
                text,
                recorded_utc,
                json.dumps(unit_vec.tolist()),
                json.dumps(meta_dict, sort_keys=True),
            ),
        )
        self._conn.commit()
        return MemoryEntry(
            entry_id=entry_id,
            namespace=namespace,
            text=text,
            recorded_utc=recorded_utc,
            metadata=meta_dict,
        )

    def hybrid_search(
        self,
        query_embedding: Sequence[float],
        query_text: str,
        *,
        as_of_utc: str,
        top_k: int = 5,
        namespace: str | None = None,
    ) -> list[MemorySearchHit]:
        """Retrieves bitemporally valid memories (`recorded_utc <= as_of_utc`) via RRF."""
        q_vec = _normalize_vector(query_embedding)
        q_tokens = _tokenize(query_text)

        sql = (
            "SELECT entry_id, namespace, text, recorded_utc, embedding_json, metadata_json "
            "FROM memories WHERE recorded_utc <= ?"
        )
        params: list[object] = [as_of_utc]
        if namespace is not None:
            sql += " AND namespace = ?"
            params.append(namespace)

        rows = self._conn.execute(sql, params).fetchall()
        if not rows:
            return []

        scored: list[tuple[MemoryEntry, float, float]] = []
        for entry_id, ns, text, rec_utc, emb_json, meta_json in rows:
            vec = np.asarray(json.loads(emb_json), dtype=np.float64)
            if vec.shape != q_vec.shape:
                continue
            cos = float(np.dot(q_vec, vec))
            tokens = _tokenize(text)
            union_size = len(q_tokens | tokens)
            jaccard = (len(q_tokens & tokens) / union_size) if union_size > 0 else 0.0
            scored.append(
                (
                    MemoryEntry(
                        entry_id=str(entry_id),
                        namespace=str(ns),
                        text=str(text),
                        recorded_utc=str(rec_utc),
                        metadata=dict(json.loads(meta_json)),
                    ),
                    cos,
                    jaccard,
                )
            )

        if not scored:
            return []

        cos_ranked = sorted(range(len(scored)), key=lambda i: scored[i][1], reverse=True)
        lex_ranked = sorted(range(len(scored)), key=lambda i: scored[i][2], reverse=True)
        cos_rank_map = {idx: r + 1 for r, idx in enumerate(cos_ranked)}
        lex_rank_map = {idx: r + 1 for r, idx in enumerate(lex_ranked)}

        rrf_k = 60.0
        hits: list[MemorySearchHit] = []
        for idx, (entry, cos, lex) in enumerate(scored):
            rrf = (1.0 / (rrf_k + cos_rank_map[idx])) + (1.0 / (rrf_k + lex_rank_map[idx]))
            combined = round(0.75 * max(0.0, cos) + 0.25 * lex + rrf, 6)
            hits.append(
                MemorySearchHit(
                    entry=entry,
                    score=combined,
                    cosine_similarity=round(cos, 6),
                    lexical_overlap=round(lex, 6),
                )
            )

        hits.sort(key=lambda h: h.score, reverse=True)
        return hits[: max(1, top_k)]

    def stats(self) -> dict[str, int]:
        """Returns memory counts grouped by namespace."""
        rows = self._conn.execute(
            "SELECT namespace, COUNT(*) FROM memories GROUP BY namespace ORDER BY namespace"
        ).fetchall()
        return {str(ns): int(cnt) for ns, cnt in rows}
