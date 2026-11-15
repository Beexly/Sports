#!/usr/bin/env python3
"""T-04 repair — lit.situation evidence_quote verbatim integrity (2026-11-13).

Root causes (measured live before repair):
  * 1486 rows carry md5 corpus_keys (statement-derived situations). lit.corpus_chunk
    is keyed by sha256, so these rows have NO source chunk join. Their quotes ARE
    verbatim in lit.corpus_statement.statement, and the parent documents exist in
    lit.corpus_chunk under different (sha256) keys. No registry mapping exists
    (corpus_item basenames match 0/28), so the true source chunk is located by
    CONTENT: normalized case/whitespace-insensitive containment, then the row is
    re-keyed to the real corpus_key + chunk_index and the quote is replaced with
    the EXACT raw source span. A source_statement_id column records provenance.
  * 1027 sha-key rows join a chunk, but the quote was whitespace-normalized at
    extraction (collapsed spaces/newlines). The exact words exist in the joined
    chunk_text; the repair locates the span case/whitespace-insensitively and
    replaces evidence_quote with the EXACT raw substring (original case and
    punctuation preserved).

Laws:
  * Never fabricate. A quote that cannot be located verbatim (modulo case and
    whitespace) in a real chunk is NULLed and its id logged.
  * Every replacement quote is a byte-exact substring of the source chunk_text
    and >= 20 chars (stripped). Verified in-script before any write.
  * Dry-run by DEFAULT. --apply performs writes, in batches, one transaction
    per batch. A JSON audit report records every row decision.

Usage:
  python scripts/ops/repair_situation_quotes_2026_11_13.py            # dry run
  python scripts/ops/repair_situation_quotes_2026_11_13.py --apply    # write
  # connection: DATABASE_URL env, else neonctl (role: --role, default neondb_owner)

After --apply, verify with:
  python scripts/ops/gates/t04_situation_quote_integrity.py
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras

PROJECT_ID = "summer-brook-99380762"
MIN_QUOTE_CHARS = 20
WS = re.compile(r"[ \t\n\r\f\v]+")

# ---------------------------------------------------------------- normalization

def norm(text: str) -> str:
    """Collapse whitespace + lowercase (mirrors the SQL candidate search)."""
    return WS.sub(" ", text or "").strip().lower()


def norm_with_map(text: str) -> tuple[str, list[int]]:
    """Normalized text plus, for each normalized char, its raw source index.

    Lets us map a normalized match back to the EXACT raw span (original case,
    punctuation and interior whitespace preserved).
    """
    chars: list[str] = []
    idx: list[int] = []
    prev_ws = False
    for i, ch in enumerate(text):
        if ch in " \t\n\r\f\v":
            if chars and not prev_ws:
                chars.append(" ")
                idx.append(i)
            prev_ws = True
        else:
            chars.append(ch.lower())
            idx.append(i)
            prev_ws = False
    if chars and chars[-1] == " ":
        chars.pop()
        idx.pop()
    return "".join(chars), idx


def raw_span(chunk_text: str, quote: str) -> str | None:
    """The exact raw substring of chunk_text matching quote modulo case/WS."""
    nt, idx = norm_with_map(chunk_text)
    nq = norm(quote)
    if not nq:
        return None
    pos = nt.find(nq)
    if pos < 0:
        return None
    start = idx[pos]
    end = idx[pos + len(nq) - 1] + 1
    span = chunk_text[start:end]
    # Paranoia: the span must be verbatim in the chunk and normalize back equal.
    if span not in chunk_text or norm(span) != nq:
        return None
    return span


def like_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

# ---------------------------------------------------------------- connection

def connect(role: str) -> psycopg2.extensions.connection:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        url = subprocess.run(
            f"neonctl connection-string main --project-id {PROJECT_ID} --role-name {role}",
            capture_output=True, text=True, check=True, shell=True,
        ).stdout.strip().splitlines()[-1]
    conn = psycopg2.connect(url)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("SET statement_timeout = 0")
    return conn

# ---------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--apply", action="store_true", help="perform writes (default: dry run)")
    ap.add_argument("--role", default="neondb_owner", help="Neon role for the connection")
    ap.add_argument("--batch-size", type=int, default=200)
    ap.add_argument("--max-md5-probes", type=int, default=6,
                    help="max quotes tried per md5 key when locating its source document")
    ap.add_argument("--report", default="scripts/ops/reports/repair_situation_quotes_2026_11_13.json")
    args = ap.parse_args()

    mode = "APPLY" if args.apply else "DRY-RUN"
    started = time.time()
    conn = connect(args.role)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    print(f"[{mode}] connected (role={args.role})")

    cur.execute("""
        SELECT s.id, s.corpus_key, s.chunk_index, s.evidence_quote, c.chunk_text
        FROM lit.situation s
        LEFT JOIN lit.corpus_chunk c
          ON c.corpus_key = s.corpus_key AND c.chunk_index = s.chunk_index
        WHERE s.evidence_quote IS NOT NULL AND length(s.evidence_quote) > 0
    """)
    rows = cur.fetchall()
    print(f"quoted situations loaded: {len(rows)}")

    audit: list[dict] = []
    quote_updates: list[tuple] = []      # (new_quote, id)
    rekey_updates: list[tuple] = []      # (new_key, new_chunk, new_quote, stmt_id, id)
    null_updates: list[tuple] = []       # (id,)
    counters = {
        "already_verbatim": 0, "repaired_joined": 0, "rekeyed_md5": 0,
        "nulled_not_found": 0, "nulled_short": 0, "md5_docs_found": 0,
        "md5_docs_not_found": 0,
    }

    joined_repairs: list[dict] = []
    search_rows: list[dict] = []
    for r in rows:
        q = r["evidence_quote"]
        if len(q.strip()) < MIN_QUOTE_CHARS:
            counters["nulled_short"] += 1
            null_updates.append((r["id"],))
            audit.append({"id": str(r["id"]), "action": "null_short", "quote_len": len(q.strip())})
            continue
        ct = r["chunk_text"]
        if ct is not None and q in ct:
            counters["already_verbatim"] += 1
            continue
        if ct is not None:
            span = raw_span(ct, q)
            if span is not None and len(span.strip()) >= MIN_QUOTE_CHARS:
                counters["repaired_joined"] += 1
                quote_updates.append((span, r["id"]))
                joined_repairs.append({"id": str(r["id"]), "quote": span})
                audit.append({
                    "id": str(r["id"]), "action": "repair_joined",
                    "corpus_key": r["corpus_key"], "chunk_index": r["chunk_index"],
                    "quote_before_len": len(q), "quote_after_len": len(span),
                    "quote_after_preview": span[:80],
                })
                continue
        # No chunk join (md5 keys) or span absent from the joined chunk:
        # locate the true source chunk by content.
        search_rows.append(r)

    print(f"joined-chunk repairs: {counters['repaired_joined']} (already verbatim: {counters['already_verbatim']})")
    print(f"rows needing content search: {len(search_rows)}")
    for ex in joined_repairs[:3]:
        print(f"  e.g. repair_joined id={ex['id'][:8]} quote={ex['quote'][:70]!r}")

    # ---- content search (session-local temp table; no persistent writes) ----
    doc_chunks: dict[str, list[dict]] = {}

    def fetch_doc(key: str) -> list[dict]:
        if key not in doc_chunks:
            cur.execute(
                "SELECT corpus_key, chunk_index, chunk_text FROM lit.corpus_chunk WHERE corpus_key=%s ORDER BY chunk_index",
                (key,),
            )
            chunks = cur.fetchall()
            for c in chunks:
                c["nt"], c["map"] = norm_with_map(c["chunk_text"])
            doc_chunks[key] = chunks
        return doc_chunks[key]

    def match_in_doc(key: str, quote: str) -> tuple[dict, str] | None:
        nq = norm(quote)
        for c in fetch_doc(key):
            pos = c["nt"].find(nq)
            if pos >= 0:
                start = c["map"][pos]
                end = c["map"][pos + len(nq) - 1] + 1
                span = c["chunk_text"][start:end]
                if span in c["chunk_text"] and norm(span) == nq and len(span.strip()) >= MIN_QUOTE_CHARS:
                    return c, span
        return None

    def search_corpus(quote: str, limit: int = 3) -> list[dict]:
        pat = "%" + like_escape(norm(quote)) + "%"
        cur.execute(
            "SELECT corpus_key, chunk_index FROM chunk_norm WHERE nt LIKE %s ESCAPE '\\' LIMIT %s",
            (pat, limit),
        )
        return cur.fetchall()

    if search_rows:
        t0 = time.time()
        print("building session-local normalized chunk table (temp, no persistent writes)...")
        cur.execute("""
            CREATE TEMP TABLE chunk_norm AS
            SELECT corpus_key, chunk_index,
                   regexp_replace(lower(chunk_text), '[ \t\n\r\f\v]+', ' ', 'g') AS nt
            FROM lit.corpus_chunk
        """)
        print(f"  chunk_norm ready in {time.time()-t0:.1f}s")

        # Group search rows by their current key (md5 keys group by document).
        by_key: dict[str, list[dict]] = {}
        for r in search_rows:
            by_key.setdefault(r["corpus_key"], []).append(r)

        stmt_cache: dict[str, list[dict]] = {}

        def statement_id_for(md5_key: str, quote: str) -> str | None:
            if md5_key not in stmt_cache:
                cur.execute("SELECT id, statement FROM lit.corpus_statement WHERE md5=%s", (md5_key,))
                stmt_cache[md5_key] = cur.fetchall()
            nq = norm(quote)
            for s in stmt_cache[md5_key]:
                if nq and nq in norm(s["statement"]):
                    return str(s["id"])
            return None

        for key, group in by_key.items():
            # 1) locate the parent document using the shortest quotes first.
            probes = sorted((r["evidence_quote"] for r in group), key=len)[: args.max_md5_probes]
            doc_key = None
            for q in probes:
                hits = search_corpus(q)
                if hits:
                    doc_key = hits[0]["corpus_key"]
                    break
            if doc_key is None:
                counters["md5_docs_not_found"] += 1
                for r in group:
                    counters["nulled_not_found"] += 1
                    null_updates.append((r["id"],))
                    audit.append({"id": str(r["id"]), "action": "null_doc_not_found", "corpus_key": key})
                print(f"  key={key[:12]}… ({len(group)} rows): NO source document found -> null")
                continue
            counters["md5_docs_found"] += 1
            print(f"  key={key[:12]}… ({len(group)} rows): doc={doc_key[:12]}…")
            # 2) match every row inside the document; per-row fallback search.
            for r in group:
                q = r["evidence_quote"]
                hit = match_in_doc(doc_key, q)
                if hit is None:
                    for h in search_corpus(q):
                        hit = match_in_doc(h["corpus_key"], q)
                        if hit:
                            break
                if hit is None:
                    counters["nulled_not_found"] += 1
                    null_updates.append((r["id"],))
                    audit.append({"id": str(r["id"]), "action": "null_span_not_found",
                                  "corpus_key": key, "tried_doc": doc_key, "quote_preview": q[:80]})
                    continue
                c, span = hit
                stmt_id = statement_id_for(key, q) if len(key) == 32 else None
                counters["rekeyed_md5"] += 1
                rekey_updates.append((c["corpus_key"], c["chunk_index"], span, stmt_id, r["id"]))
                audit.append({
                    "id": str(r["id"]), "action": "rekey",
                    "old_corpus_key": key, "old_chunk_index": r["chunk_index"],
                    "new_corpus_key": c["corpus_key"], "new_chunk_index": c["chunk_index"],
                    "source_statement_id": stmt_id,
                    "quote_before_len": len(q), "quote_after_len": len(span),
                    "quote_after_preview": span[:80],
                })

    # ---- provenance column + nullability (only on --apply) ----
    if args.apply:
        cur.execute("""
            ALTER TABLE lit.situation
            ADD COLUMN IF NOT EXISTS source_statement_id uuid
            REFERENCES lit.corpus_statement(id)
        """)
        # The repair spec: a quote that cannot be located verbatim in any real
        # chunk is NULLed and logged, never fabricated. That requires the
        # column to be nullable (it was NOT NULL; NULL = "no quote", which the
        # grounding laws already treat as "no evidence").
        cur.execute("ALTER TABLE lit.situation ALTER COLUMN evidence_quote DROP NOT NULL")
        print("source_statement_id column ensured; evidence_quote nullability enabled")

    # ---- apply in batches ----
    def apply_batches() -> None:
        conn.autocommit = False
        try:
            for i in range(0, len(quote_updates), args.batch_size):
                batch = quote_updates[i:i + args.batch_size]
                psycopg2.extras.execute_batch(
                    cur, "UPDATE lit.situation SET evidence_quote=%s WHERE id=%s", batch,
                )
                conn.commit()
            for i in range(0, len(rekey_updates), args.batch_size):
                batch = rekey_updates[i:i + args.batch_size]
                psycopg2.extras.execute_batch(
                    cur,
                    "UPDATE lit.situation SET corpus_key=%s, chunk_index=%s, evidence_quote=%s, source_statement_id=%s WHERE id=%s",
                    batch,
                )
                conn.commit()
            for i in range(0, len(null_updates), args.batch_size):
                batch = null_updates[i:i + args.batch_size]
                psycopg2.extras.execute_batch(
                    cur, "UPDATE lit.situation SET evidence_quote=NULL WHERE id=%s", batch,
                )
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.autocommit = True

    if args.apply:
        t0 = time.time()
        apply_batches()
        print(f"applied: {len(quote_updates)} quote repairs, {len(rekey_updates)} rekeys, "
              f"{len(null_updates)} nulls in {time.time()-t0:.1f}s")
    else:
        print(f"[DRY-RUN] would apply: {len(quote_updates)} quote repairs, "
              f"{len(rekey_updates)} rekeys, {len(null_updates)} nulls")

    # ---- post-state verification (read-only) ----
    cur.execute("""
        SELECT count(*) AS quoted,
               count(*) FILTER (WHERE length(trim(s.evidence_quote)) < 20) AS short,
               count(*) FILTER (WHERE c.chunk_text IS NULL) AS missing_chunk,
               count(*) FILTER (WHERE c.chunk_text IS NOT NULL
                                 AND position(s.evidence_quote in c.chunk_text) = 0) AS non_verbatim
        FROM lit.situation s
        LEFT JOIN lit.corpus_chunk c
          ON c.corpus_key = s.corpus_key AND c.chunk_index = s.chunk_index
        WHERE s.evidence_quote IS NOT NULL AND length(s.evidence_quote) > 0
    """)
    post = cur.fetchone()
    print(f"post-state: {dict(post)}")

    report = {
        "task": "T-04 situation quote integrity repair",
        "utc": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "role": args.role,
        "duration_s": round(time.time() - started, 1),
        "counters": counters,
        "updates": {"quote_repairs": len(quote_updates), "rekeys": len(rekey_updates), "nulls": len(null_updates)},
        "post_state": dict(post),
        "audit": audit,
    }
    os.makedirs(os.path.dirname(args.report), exist_ok=True)
    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
    print(f"audit report: {args.report} ({len(audit)} row decisions)")
    conn.close()

    ok = (post["quoted"] >= 1000 and post["short"] == 0
          and post["missing_chunk"] == 0 and post["non_verbatim"] == 0)
    if not args.apply:
        print("[DRY-RUN] no writes performed; post-state reflects CURRENT db")
        return 0
    print("REPAIR " + ("COMPLETE — gate criteria met" if ok else "INCOMPLETE — gate criteria NOT met"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())