"""Dense (embedding) channel for equation retrieval — v1 status: STUB.

Design (from the MathIR survey in the retrieval report): embed each
row's linearized formula + context with an ARQMath-tuned encoder —
Mabowdor's public checkpoints first (`AnReu/albert-for-arqmath-3` and
siblings from the Approach0/pya0 project), MathBERT (PKU,
arXiv:2105.00377) as the alternate — and serve nearest neighbours from
LanceDB (Apache-2.0), whose table also mirrors the payload columns.

Why a stub in v1: embedding 940k rows is the one heavy compute step
(~1–2 h on the free GPU routes already proven for the OCR queue —
Kaggle T4 / GCP L4 credits; an overnight CPU run otherwise). The
structure + FTS channels were proven first, per the priority order.
Nothing here pretends otherwise: `dense_ranking` returns [] until the
LanceDB table is populated, and the retriever reports the channel as
"stub-not-populated" in its stats.

This module is *wired*, not decorative: the retriever accepts
`dense_ranking_fn` and fuses its ranking when present; the LanceDB
writer below is exercised by unit tests with a deterministic test
embedder (labeled TEST-ONLY — it is not a semantic model); the moment
a real encoder populates the table, the channel goes live with no
query-layer changes.

TODO(embedding-population): run the encoder over the enrichment
artifact on a GPU route, call `populate_lancedb`, flip the channel
live, and re-run the retrieval proofs to measure the delta.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Sequence

EMBEDDING_CHANNEL_STATUS = "stub-not-populated"
DEFAULT_ENCODER_CANDIDATES = (
    "AnReu/albert-for-arqmath-3 (Mabowdor, SIGIR 2023)",
    "MathBERT (PKU, arXiv:2105.00377)",
)
LANCEDB_TABLE = "equations"


class HashTestEmbedder:
    """Deterministic TEST-ONLY embedder (hashed token bag).

    Exists so the LanceDB writer and the fusion wiring are unit-tested
    end to end. It has no semantic quality and must never be used to
    populate a production table.
    """

    def __init__(self, dim: int = 32):
        self.dim = dim

    def embed(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        for tok in (text or "").lower().split():
            h = int(hashlib.sha256(tok.encode("utf-8")).hexdigest(), 16)
            vec[h % self.dim] += 1.0
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]


def populate_lancedb(
    db_dir: Path,
    enrichment_records: Iterable[Dict[str, Any]],
    embed_fn: Callable[[str], List[float]],
    *,
    table: str = LANCEDB_TABLE,
    batch: int = 1000,
) -> Dict[str, Any]:
    """Write the LanceDB vector+payload table from enrichment records.

    Requires the `lancedb` package (Apache-2.0). Raises ImportError
    with that fact when it is not installed — the channel stays a stub
    rather than failing silently.
    """
    try:
        import lancedb  # type: ignore
    except ImportError as exc:  # pragma: no cover - environment dependent
        raise ImportError(
            "lancedb is not installed; the dense channel remains a stub"
        ) from exc

    db = lancedb.connect(str(db_dir))
    rows: List[Dict[str, Any]] = []
    n = 0
    created = False

    def flush() -> None:
        nonlocal rows, created
        if not rows:
            return
        if not created:
            db.create_table(table, data=rows, mode="overwrite")
            created = True
        else:
            db.open_table(table).add(rows)
        rows = []

    for rec in enrichment_records:
        text = f"{rec.get('normalized_expr') or rec.get('equation') or ''} {rec.get('context') or ''}"
        prov = rec.get("provenance") or {}
        rows.append(
            {
                "row_id": rec["row_id"],
                "vector": embed_fn(text),
                "class": rec["class"],
                "free_symbols": json.dumps(rec.get("free_symbols") or []),
                "book": str(prov.get("book") or ""),
                "title": str(prov.get("title") or ""),
                "section": str(prov.get("section") or ""),
                "lane": str(prov.get("lane") or ""),
            }
        )
        n += 1
        if len(rows) >= batch:
            flush()
    flush()
    return {"rows": n, "table": table, "db": str(db_dir)}


def make_dense_ranking_fn(db_dir: Path, embed_fn: Callable[[str], List[float]], limit: int = 400):
    """Return a (Situation) -> [row_id] ranking fn over a populated
    LanceDB table, or None when the table does not exist (stub state).
    """
    try:
        import lancedb  # type: ignore
    except ImportError:
        return None
    if not Path(db_dir).exists():
        return None
    db = lancedb.connect(str(db_dir))
    if LANCEDB_TABLE not in db.table_names():
        return None
    tbl = db.open_table(LANCEDB_TABLE)

    def rank(situation) -> List[str]:
        text = f"{situation.description} {' '.join(sorted(situation.variables))}"
        vec = embed_fn(text)
        hits = tbl.search(vec).limit(limit).to_list()
        return [h["row_id"] for h in hits]

    return rank
