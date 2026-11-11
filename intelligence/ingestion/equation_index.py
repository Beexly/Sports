"""Retrieval index store for the Equations Master (Layer 2).

SQLite (stdlib) holds, per row: the payload the query layer needs
(class, symbols, normalization form, provenance, context) and two FTS5
channels — structure tokens (operator-tree paths / symbol tuples) and
context text. File-backed and embedded: the index wakes when a query
opens it and sleeps after — scale-to-zero by construction.

Dense vectors live in LanceDB (Apache-2.0), written by
`equation_embeddings.py`; this module owns the payload side and the
FTS channels, which are the v1 serving path.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

SCHEMA = """
CREATE TABLE IF NOT EXISTS eq_meta (
    row_id TEXT PRIMARY KEY,
    row_index INTEGER NOT NULL,
    class TEXT NOT NULL,
    equation TEXT,
    normalized_expr TEXT,
    free_symbols TEXT NOT NULL DEFAULT '[]',
    sym_key TEXT NOT NULL DEFAULT '',
    sym_count INTEGER NOT NULL DEFAULT 0,
    is_norm INTEGER NOT NULL DEFAULT 0,
    norm_num TEXT,
    norm_den TEXT NOT NULL DEFAULT '[]',
    operator_free INTEGER NOT NULL DEFAULT 0,
    context TEXT NOT NULL DEFAULT '',
    provenance TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_eq_meta_symkey ON eq_meta(sym_key);
CREATE INDEX IF NOT EXISTS idx_eq_meta_norm ON eq_meta(is_norm, sym_count);
CREATE INDEX IF NOT EXISTS idx_eq_meta_class ON eq_meta(class);
CREATE VIRTUAL TABLE IF NOT EXISTS eq_fts_structure
    USING fts5(row_id UNINDEXED, tokens);
CREATE VIRTUAL TABLE IF NOT EXISTS eq_fts_context
    USING fts5(row_id UNINDEXED, context);
"""


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def build_index(enrichment_path: Path, db_path: Path) -> Dict[str, Any]:
    """(Re)build the SQLite retrieval index from an enrichment JSONL."""
    t0 = time.time()
    if db_path.exists():
        db_path.unlink()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = connect(db_path)
    try:
        conn.executescript(SCHEMA)
        n = 0
        with enrichment_path.open("r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                rec = json.loads(line)
                free = list(rec.get("free_symbols") or [])
                conn.execute(
                    "INSERT OR REPLACE INTO eq_meta (row_id, row_index, class,"
                    " equation, normalized_expr, free_symbols, sym_key, sym_count,"
                    " is_norm, norm_num, norm_den, operator_free, context, provenance)"
                    " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        rec["row_id"],
                        rec["row_index"],
                        rec["class"],
                        rec.get("equation"),
                        rec.get("normalized_expr"),
                        json.dumps(free),
                        " ".join(sorted(free)),
                        len(free),
                        1 if rec.get("norm_num") else 0,
                        rec.get("norm_num"),
                        json.dumps(rec.get("norm_den") or []),
                        0,
                        rec.get("context") or "",
                        json.dumps(rec.get("provenance") or {}),
                    ),
                )
                tokens = " ".join(rec.get("structure_tokens") or [])
                conn.execute(
                    "INSERT INTO eq_fts_structure (row_id, tokens) VALUES (?,?)",
                    (rec["row_id"], tokens),
                )
                conn.execute(
                    "INSERT INTO eq_fts_context (row_id, context) VALUES (?,?)",
                    (rec["row_id"], rec.get("context") or ""),
                )
                n += 1
                if n % 50000 == 0:
                    conn.commit()
        conn.commit()
        counts = {
            r["class"]: r["c"]
            for r in conn.execute("SELECT class, COUNT(*) AS c FROM eq_meta GROUP BY class")
        }
        norm_rows = conn.execute(
            "SELECT COUNT(*) AS c FROM eq_meta WHERE is_norm = 1"
        ).fetchone()["c"]
    finally:
        conn.close()
    return {
        "rows": n,
        "counts": counts,
        "normalization_rows": norm_rows,
        "db": str(db_path),
        "seconds": round(time.time() - t0, 2),
    }


def meta_by_id(conn: sqlite3.Connection, row_id: str) -> Optional[Dict[str, Any]]:
    row = conn.execute("SELECT * FROM eq_meta WHERE row_id = ?", (row_id,)).fetchone()
    return dict(row) if row else None


def fts_query(
    conn: sqlite3.Connection,
    table: str,
    match: str,
    limit: int,
) -> List[Tuple[str, float]]:
    """Ranked (row_id, bm25) from an FTS5 table; bm25 lower = better."""
    if table not in ("eq_fts_structure", "eq_fts_context"):
        raise ValueError(f"not an FTS table: {table}")
    if not match.strip():
        return []
    rows = conn.execute(
        f"SELECT row_id, bm25({table}) AS score FROM {table}"
        f" WHERE {table} MATCH ? ORDER BY score LIMIT ?",
        (match, limit),
    ).fetchall()
    return [(r["row_id"], float(r["score"])) for r in rows]


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Build the SQLite equation retrieval index.")
    ap.add_argument("--enrichment", required=True)
    ap.add_argument("--db", required=True)
    args = ap.parse_args(argv)
    stats = build_index(Path(args.enrichment), Path(args.db))
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
