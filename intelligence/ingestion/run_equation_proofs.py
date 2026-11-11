"""The two pre-registered retrieval proofs, run against the REAL master.

From the equation-retrieval report, section (d). Both reuse numbers
verified in the wiring proof, so pass/fail is objective:

P1 (paired comparison): situation "win probability from two strength
ratings", bindings w_u / w_v = the wiring proof's own values
(0.5976133222560971 / 0.44738667774390284, its raw implied probs).
PASS = master row eqrow-84188 (`w_u/(w_u+w_v)`, The Player Kernel,
arXiv:1609.01176) in the top 5, evaluated through masters_loader to
0.571879 (exact wiring-proof value 0.5718787772785618).

P2 (devig): American odds -450/+340 compiled to implied probabilities
q_fav = 450/550, q_dog = 100/440; target = the +340 side's fair
(no-vig) probability. PASS = a multiplicative-devig (probability
normalization form) row in the top 5 evaluating to 0.2174
(exact 0.21739130434782608 = q_dog / (q_fav + q_dog)).

Usage:
    python -m intelligence.ingestion.run_equation_proofs \
        --enrichment <enrichment.jsonl> --db <retrieval.sqlite> \
        [--out proof-results.json]

The loader index, enrichment, and SQLite index are built if missing
(their build times are reported, not hidden).
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, Optional, Sequence

from intelligence.ingestion.equation_enrich import build_enrichment
from intelligence.ingestion.equation_index import build_index, connect, meta_by_id
from intelligence.ingestion.equation_retrieval import EquationRetriever, Situation
from intelligence.ingestion.masters_loader import build_or_load_index

EXPECTED_P1_ROW = "eqrow-84188"
EXPECTED_P1_VALUE = 0.5718787772785618
EXPECTED_P2_VALUE = 0.21739130434782608
TOL = 5e-4


def proof_p1(retriever: EquationRetriever) -> Dict[str, Any]:
    situation = Situation(
        description="win probability from two strength ratings (paired comparison)",
        variables={"w_u": 0.5976133222560971, "w_v": 0.44738667774390284},
        target_variable="w_u",
        target_kind="probability",
        top_k=5,
    )
    out = retriever.query(situation)
    ids = [r["row_id"] for r in out["results"]]
    hit = next((r for r in out["results"] if r["row_id"] == EXPECTED_P1_ROW), None)
    passed = hit is not None and abs(hit["value"] - EXPECTED_P1_VALUE) <= TOL
    return {
        "proof": "P1 paired-comparison",
        "pass": passed,
        "criterion": f"{EXPECTED_P1_ROW} in top 5, value within {TOL} of {EXPECTED_P1_VALUE}",
        "top5_row_ids": ids,
        "hit": hit,
        "channels": out["channels"],
        "seconds": out["seconds"],
        "results": out["results"],
    }


def proof_p2(retriever: EquationRetriever, conn: sqlite3.Connection) -> Dict[str, Any]:
    q_fav = 450.0 / 550.0   # implied prob of the -450 side
    q_dog = 100.0 / 440.0   # implied prob of the +340 side
    situation = Situation(
        description=(
            "devig: fair no-vig probability from American odds moneyline; "
            "remove the bookmaker overround from the implied probabilities "
            "by multiplicative normalization"
        ),
        variables={"q_fav": q_fav, "q_dog": q_dog},
        target_variable="q_dog",
        target_kind="probability",
        top_k=5,
    )
    out = retriever.query(situation)
    winner = None
    for r in out["results"]:
        if abs(r["value"] - EXPECTED_P2_VALUE) <= TOL:
            meta = meta_by_id(conn, r["row_id"])
            if meta is not None and meta["is_norm"]:
                winner = r
                break
    return {
        "proof": "P2 devig -450/+340",
        "pass": winner is not None,
        "criterion": (
            f"a normalization-form (multiplicative devig) row in top 5 "
            f"within {TOL} of {EXPECTED_P2_VALUE}"
        ),
        "compiled_variables": {"q_fav": q_fav, "q_dog": q_dog},
        "top5_row_ids": [r["row_id"] for r in out["results"]],
        "winner": winner,
        "channels": out["channels"],
        "seconds": out["seconds"],
        "results": out["results"],
    }


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Run the pre-registered retrieval proofs.")
    ap.add_argument("--enrichment", required=True)
    ap.add_argument("--db", required=True)
    ap.add_argument("--out", default=None)
    args = ap.parse_args(argv)

    timings: Dict[str, Any] = {}
    t0 = time.time()
    masters = build_or_load_index()
    timings["loader_index_seconds"] = masters.build_seconds
    timings["loader_from_cache"] = masters.index_from_cache
    timings["loader_total_rows"] = masters.total_rows
    timings["loader_counts"] = masters.counts_by_class()

    enrichment_path = Path(args.enrichment)
    if not enrichment_path.is_file():
        stats = build_enrichment(enrichment_path, masters_index=masters)
        timings["enrichment"] = stats
    db_path = Path(args.db)
    if not db_path.is_file():
        timings["sqlite_index"] = build_index(enrichment_path, db_path)

    conn = connect(db_path)
    try:
        retriever = EquationRetriever(conn, masters)
        p1 = proof_p1(retriever)
        p2 = proof_p2(retriever, conn)
    finally:
        conn.close()

    report = {
        "timings": timings,
        "total_seconds": round(time.time() - t0, 2),
        "P1": p1,
        "P2": p2,
        "ALL_PASS": bool(p1["pass"] and p2["pass"]),
    }
    text = json.dumps(report, indent=2, ensure_ascii=False)
    print(text)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    return 0 if report["ALL_PASS"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
