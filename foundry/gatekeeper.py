#!/usr/bin/env python3
"""Foundry gatekeeper: fail-closed SQLite state machine for the GSE/GSI corpus swarm.

Commands:
  scan --roots R1 R2 ...     Walk roots for .pdf/.epub/.md/.txt/.tex, dedupe by sha256,
                             quarantine personal/tax/ID files, enqueue with tier heuristics.
  claim --worker W [--tier A]  Atomically claim one PENDING book (textbooks/monographs first,
                             then largest). Prints JSON, or NO_PENDING.
  commit <artifact.json>     Validate a book extraction; GATEKEEPER_APPROVED or GATEKEEPER_REJECTED.
  release-stale [--minutes N]  Return CLAIMED books older than N minutes (default 20) to PENDING
                             (shard B returns to DELEGATED_GCP).
  sync-cloud                 Mark files completed by GCP (manifests in artifacts/gcp_sync/)
                             as COMPLETE_CLOUD so local workers never duplicate cloud work.
  status                     Queue counts + recent events + PENDING termination counter.

All state lives in foundry.db next to this file. WAL mode, busy_timeout 30s.
Every claim/commit appends to logs/swarm_status.md.
"""
from __future__ import annotations
import argparse, hashlib, json, os, re, sqlite3, sys, time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "foundry.db")
LOG = os.path.join(HERE, "logs", "swarm_status.md")
ARTIFACTS = os.path.join(HERE, "artifacts", "primitives")
GCP_SYNC = os.path.join(HERE, "artifacts", "gcp_sync")

SCHEMA = """
CREATE TABLE IF NOT EXISTS corpus_queue (
  book_id TEXT PRIMARY KEY,
  file_path TEXT UNIQUE,
  sha256 TEXT,
  file_name TEXT,
  title TEXT,
  year TEXT,
  primary_domain TEXT,
  tier TEXT DEFAULT 'B',
  status TEXT DEFAULT 'PENDING',
  worker_id TEXT,
  pages_total INTEGER,
  pages_read INTEGER,
  source_status TEXT,
  claimed_at REAL,
  completed_at REAL,
  gate_log TEXT,
  file_size INTEGER
);
CREATE TABLE IF NOT EXISTS primitives (
  primitive_id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at REAL
);
CREATE TABLE IF NOT EXISTS reasoning_traces (
  trace_id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  words INTEGER,
  payload TEXT NOT NULL,
  created_at REAL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts REAL, book_id TEXT, event TEXT, detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_queue_status ON corpus_queue(status, tier);
"""

EXTS = {".pdf", ".epub", ".md", ".txt", ".tex"}
TIER_A = re.compile(r"football|coaching|\bnfl\b|quarterback|offense|defense|scheme|physics|mechanic|fluid|navier|thermodynam|quantum|probabilit|stochastic|optimiz|game.theor|decision|psycholog|behavior|neuro|brain|cogniti|biomechan|physiolog|nutrition|metabol|history|strateg|calculus|differenti|equation|math|statist|learning|control|dynamic|kinematic|aerodynam|entropy|information", re.I)
TIER_C = re.compile(r"manual|syntax|documentation|readme|changelog|license|invoice|receipt|\bform\b|eeoc|authorization|resume|workbook|sales.kit|screening|\.gdoc|truck.sheet|contributing|code.of.conduct", re.I)
QUARANTINE = re.compile(r"\btax\b|\bw-?2\b|1099|invoice|receipt|passport|driver.?licen|social.?security|\bssn\b|eeoc|authorization|screening|\bresume\b|\bcv\b|baby.girl|dating|profile.pictures?|wedding|charcuterie|craftco|personal.financ|medical.record|immunization|birth.cert", re.I)
DOMAINS = [
    ("football", r"football|coaching|\bnfl\b|quarterback|offense|defense|scheme|gridiron"),
    ("physics", r"physics|mechanic|fluid|navier|thermodynam|quantum|kinematic|aerodynam|relativ"),
    ("math", r"math|calculus|differenti|equation|probabilit|stochastic|statist|algebra|topolog|measure|martingale"),
    ("cs", r"algorithm|comput|optimiz|game.theor|information|learning|control|automata|complexity"),
    ("psych", r"psycholog|behavior|neuro|brain|cogniti|decision|mind"),
    ("physiology", r"physiolog|nutrition|metabol|biomechan|muscle|exercis|training|recovery"),
    ("history", r"history|historical|war|strategy|century"),
]
TOY_MATH = [
    re.compile(r"success\s*=\s*force\s*/\s*fatigue", re.I),
    re.compile(r"efficiency\s*=\s*force\s*\*\s*focus\s*/\s*fatigue", re.I),
    re.compile(r"(performance|success|efficiency|win)\s*=\s*[a-z ]*(force|focus|effort|heart|grit)[a-z ]*[/*]", re.I),
]
SKIP_DIRS = {"node_modules", ".git", "$RECYCLE.BIN", ".next", "dist", "build", "venv", "ocr-venv", ".venv", "__pycache__", ".cache", "System Volume Information", ".hermes", "foundry"}
REFUSAL_STATUSES = {"INSUFFICIENT_SOURCE_ACCESS", "INSUFFICIENT_OCR"}


def now():
    return time.time()


def connect():
    con = sqlite3.connect(DB, timeout=30)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=30000")
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    try:
        con.execute("ALTER TABLE corpus_queue ADD COLUMN file_size INTEGER")
    except sqlite3.OperationalError:
        pass
    return con


def log_event(con, book_id, event, detail=""):
    con.execute("INSERT INTO events(ts,book_id,event,detail) VALUES(?,?,?,?)", (now(), book_id, event, detail))
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    stamp = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"- {stamp} | {event} | {book_id or '-'} | {detail}\n")


def guess_domain(name):
    for dom, pat in DOMAINS:
        if re.search(pat, name, re.I):
            return dom
    return "other"


def cmd_scan(args):
    con = connect()
    known = {r["sha256"] for r in con.execute("SELECT sha256 FROM corpus_queue")}
    added = dupes = quarantined = 0
    tiers = {"A": 0, "B": 0, "C": 0}
    for root in args.roots:
        if not os.path.isdir(root):
            print(f"SKIP missing root: {root}")
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                ext = os.path.splitext(fn)[1].lower()
                if ext not in EXTS:
                    continue
                path = os.path.join(dirpath, fn)
                try:
                    size = os.path.getsize(path)
                    h = hashlib.sha256()
                    h.update(str(size).encode())
                    with open(path, "rb") as f:
                        if ext == ".pdf" and os.path.splitdrive(path)[0].upper() not in ("C:", ""):
                            h.update(f.read(2 << 20))  # triage hash: size + first 2MB on network drives
                        else:
                            for chunk in iter(lambda: f.read(1 << 20), b""):
                                h.update(chunk)
                    digest = h.hexdigest()
                except OSError as e:
                    print(f"UNREADABLE {path}: {e}")
                    continue
                if digest in known:
                    dupes += 1
                    continue
                known.add(digest)
                book_id = digest[:16]
                if QUARANTINE.search(fn) or QUARANTINE.search(dirpath):
                    con.execute(
                        "INSERT OR IGNORE INTO corpus_queue(book_id,file_path,sha256,file_name,title,primary_domain,tier,status,file_size) VALUES(?,?,?,?,?,?,?,?,?)",
                        (book_id, path, digest, fn, os.path.splitext(fn)[0], "personal", "C", "QUARANTINED", size),
                    )
                    quarantined += 1
                    con.commit()
                    continue
                if ext == ".pdf":
                    if size < 20_000 or TIER_C.search(fn):
                        tier = "C"
                    elif TIER_A.search(fn):
                        tier = "A"
                    else:
                        tier = "B"
                else:
                    tier = "B" if TIER_A.search(fn) and not TIER_C.search(fn) else "C"
                init_status = "DELEGATED_GCP" if digest[0] >= "8" else "PENDING"  # shard B belongs to GCP
                con.execute(
                    "INSERT OR IGNORE INTO corpus_queue(book_id,file_path,sha256,file_name,title,primary_domain,tier,status,file_size) VALUES(?,?,?,?,?,?,?,?,?)",
                    (book_id, path, digest, fn, os.path.splitext(fn)[0], guess_domain(fn), tier, init_status, size),
                )
                added += 1
                tiers[tier] += 1
                con.commit()  # per-file: never hold a write lock across slow Drive hashing
                if added % 200 == 0:
                    print(f"progress: {added} enqueued, {quarantined} quarantined", flush=True)
    con.commit()
    log_event(con, None, "SCAN", f"roots={args.roots} added={added} dupes={dupes} quarantined={quarantined} tiers={tiers}")
    con.commit()
    print(json.dumps({"added": added, "dupes_skipped": dupes, "quarantined": quarantined, "tiers": tiers}))


def cmd_claim(args):
    con = connect()
    con.execute("BEGIN IMMEDIATE")
    row = con.execute(
        """SELECT * FROM corpus_queue WHERE status='PENDING' AND tier=?
           ORDER BY CASE WHEN lower(file_name) LIKE '%textbook%' OR lower(file_name) LIKE '%course%'
                           OR lower(file_name) LIKE '%handbook%' OR lower(file_name) LIKE '%principles%'
                           OR lower(file_name) LIKE '%foundation%' OR lower(file_name) LIKE '%introduction%'
                           OR lower(file_name) LIKE '%theory%' OR lower(file_name) LIKE '%monograph%'
                           OR lower(file_name) LIKE '%treatise%' OR lower(file_name) LIKE '%lectures%'
                      THEN 0 ELSE 1 END, COALESCE(file_size,0) DESC, rowid LIMIT 1""",
        (args.tier,),
    ).fetchone()
    if row is None:
        con.execute("COMMIT")
        print("NO_PENDING")
        return
    con.execute(
        "UPDATE corpus_queue SET status='CLAIMED', worker_id=?, claimed_at=? WHERE book_id=?",
        (args.worker, now(), row["book_id"]),
    )
    log_event(con, row["book_id"], "CLAIMED", f"worker={args.worker} file={row['file_name']}")
    con.execute("COMMIT")
    print(json.dumps(dict(row), default=str))


def words(text):
    return len((text or "").split())


def validate(doc):
    """Return list of rejection reasons. Empty list = pass."""
    errs = []
    if not isinstance(doc, dict):
        return ["artifact is not a JSON object"]
    book_id = doc.get("book_id")
    if not book_id:
        errs.append("missing book_id")
    src = doc.get("source_status", "COMPLETE")
    if src in REFUSAL_STATUSES:
        if not doc.get("refusal_reason"):
            errs.append(f"{src} requires refusal_reason")
        return errs
    prims = doc.get("primitives") or []
    if len(prims) < 3:
        errs.append(f"need >=3 sovereign primitives, got {len(prims)}")
    has_layer2 = False
    for i, p in enumerate(prims):
        tag = f"primitive[{i}]"
        if not p.get("name"):
            errs.append(f"{tag}: missing name")
        vq = p.get("verbatim_quote") or ""
        if words(vq) < 8:
            errs.append(f"{tag}: verbatim_quote missing or <8 words (exact source text required)")
        if p.get("page") in (None, ""):
            errs.append(f"{tag}: missing page citation (line/section anchor for text files)")
        if not p.get("assumptions"):
            errs.append(f"{tag}: missing assumptions")
        if not p.get("breakdown_regime"):
            errs.append(f"{tag}: missing breakdown/singularity regime")
        latex = p.get("latex")
        if latex:
            if not p.get("symbol_and_unit_ledger"):
                errs.append(f"{tag}: latex present but symbol_and_unit_ledger empty (dimensional gate)")
            for pat in TOY_MATH:
                if pat.search(latex):
                    errs.append(f"{tag}: toy equation banned by dimensional gate: {latex[:80]}")
        l2 = p.get("layer2")
        if l2:
            t = l2.get("tag", "")
            if t not in ("[ISOMORPHISM]", "[DERIVED KERNEL]"):
                errs.append(f"{tag}: layer2.tag must be [ISOMORPHISM] or [DERIVED KERNEL]")
            if not l2.get("mapping"):
                errs.append(f"{tag}: layer2.mapping empty")
            if not l2.get("source_operator"):
                errs.append(f"{tag}: layer2 must cite source_operator primitive id")
            if not l2.get("telemetry"):
                errs.append(f"{tag}: layer2.telemetry empty (or LATENT_UNIDENTIFIABLE)")
            has_layer2 = True
    if prims and not has_layer2:
        errs.append("no Layer-2 [ISOMORPHISM]/[DERIVED KERNEL] mapping found in any primitive")
    traces = doc.get("reasoning_traces") or []
    total = 0
    for i, t in enumerate(traces):
        think = t.get("think") or ""
        total += words(think)
        for section in ("retrocausal_genealogy", "theory_of_mind", "cross_layer_veto"):
            if words(t.get(section) or "") < 60:
                errs.append(f"trace[{i}].{section} missing or <60 words")
    if total < 850:
        errs.append(f"reasoning think chain {total} words < 850 minimum")
    for field in ("universal_lens", "gsi_mapping", "gse_mapping"):
        if words(doc.get(field) or "") < 30:
            errs.append(f"{field} missing or <30 words (dual-institute compilation)")
    return errs


def cmd_commit(args):
    path = args.artifact
    try:
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
    except Exception as e:
        print(f"GATEKEEPER_REJECTED\n- cannot read artifact: {e}")
        sys.exit(1)
    con = connect()
    book_id = doc.get("book_id")
    row = con.execute("SELECT * FROM corpus_queue WHERE book_id=?", (book_id,)).fetchone() if book_id else None
    if row is None:
        print(f"GATEKEEPER_REJECTED\n- book_id {book_id!r} not in corpus_queue (run scan first)")
        sys.exit(1)
    errs = validate(doc)
    if errs:
        con.execute("UPDATE corpus_queue SET gate_log=? WHERE book_id=?", ("\n".join(errs), book_id))
        log_event(con, book_id, "REJECTED", "; ".join(errs)[:400])
        con.commit()
        print("GATEKEEPER_REJECTED")
        for e in errs:
            print(f"- {e}")
        sys.exit(1)
    ts = now()
    if doc.get("source_status") in REFUSAL_STATUSES:
        st = doc["source_status"]
        con.execute(
            "UPDATE corpus_queue SET status=?, source_status=?, completed_at=?, gate_log='honest refusal accepted' WHERE book_id=?",
            (st, st, ts, book_id),
        )
        log_event(con, book_id, "REFUSAL_ACCEPTED", f"{st}: {doc.get('refusal_reason', '')[:200]}")
        con.commit()
        print(f"GATEKEEPER_APPROVED (honest refusal: {st})")
        return
    for p in doc.get("primitives", []):
        pid = f"{book_id}:{p.get('primitive_id') or p.get('name')}"
        con.execute("INSERT OR REPLACE INTO primitives VALUES(?,?,?,?)", (pid, book_id, json.dumps(p, ensure_ascii=False), ts))
    for t in doc.get("reasoning_traces", []):
        tid = f"{book_id}:{t.get('trace_id') or 't0'}"
        con.execute("INSERT OR REPLACE INTO reasoning_traces VALUES(?,?,?,?,?)", (tid, book_id, words(t.get("think", "")), json.dumps(t, ensure_ascii=False), ts))
    con.execute(
        "UPDATE corpus_queue SET status='COMPLETE', source_status='COMPLETE', pages_total=?, pages_read=?, completed_at=?, gate_log='approved' WHERE book_id=?",
        (doc.get("pages_total"), doc.get("pages_read"), ts, book_id),
    )
    log_event(con, book_id, "COMPLETE", f"primitives={len(doc.get('primitives', []))} think_words={sum(words(t.get('think','')) for t in doc.get('reasoning_traces', []))}")
    con.commit()
    print("GATEKEEPER_APPROVED")


def cmd_release_stale(args):
    con = connect()
    cutoff = now() - args.minutes * 60
    rows = con.execute("SELECT book_id FROM corpus_queue WHERE status='CLAIMED' AND claimed_at < ?", (cutoff,)).fetchall()
    for r in rows:
        con.execute(
            "UPDATE corpus_queue SET status=CASE WHEN substr(sha256,1,1) >= '8' THEN 'DELEGATED_GCP' ELSE 'PENDING' END, worker_id=NULL WHERE book_id=?",
            (r["book_id"],),
        )
        log_event(con, r["book_id"], "RELEASED_STALE", f">{args.minutes}min")
    con.commit()
    print(json.dumps({"released": len(rows)}))


def cmd_sync_cloud(args):
    """Mark GCP-completed files as COMPLETE_CLOUD from manifests/dossiers in gcp_sync/."""
    con = connect()
    if not os.path.isdir(GCP_SYNC):
        print(json.dumps({"marked": 0, "note": "gcp_sync missing"}))
        return
    hashes, names = set(), set()
    hexre = re.compile(r"\b[0-9a-f]{32}\b|\b[0-9a-f]{64}\b")
    for dirpath, _, filenames in os.walk(GCP_SYNC):
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() not in {".json", ".jsonl", ".md", ".txt", ".csv"}:
                continue
            try:
                text = open(os.path.join(dirpath, fn), encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            hashes.update(hexre.findall(text.lower()))
            names.add(fn)
    marked = 0
    if hashes:
        q = ",".join("?" * len(hashes))
        rows = con.execute(
            f"SELECT book_id FROM corpus_queue WHERE sha256 IN ({q}) AND status IN ('PENDING','DELEGATED_GCP')",
            tuple(hashes),
        ).fetchall()
        for r in rows:
            con.execute("UPDATE corpus_queue SET status='COMPLETE_CLOUD', gate_log='completed by gse-foundry-gcp-01' WHERE book_id=?", (r["book_id"],))
            log_event(con, r["book_id"], "COMPLETE_CLOUD", "gcp_sync manifest match")
            marked += 1
    con.commit()
    print(json.dumps({"marked": marked, "hashes_seen": len(hashes), "files_seen": len(names)}))


def cmd_status(args):
    con = connect()
    counts = [dict(r) for r in con.execute("SELECT tier, status, COUNT(*) n FROM corpus_queue GROUP BY tier, status ORDER BY tier, status")]
    total = con.execute("SELECT COUNT(*) FROM corpus_queue").fetchone()[0]
    pending = con.execute("SELECT COUNT(*) FROM corpus_queue WHERE status='PENDING'").fetchone()[0]
    recent = [dict(r) for r in con.execute("SELECT datetime(ts,'unixepoch','localtime') t, book_id, event, substr(detail,1,120) d FROM events ORDER BY id DESC LIMIT 12")]
    print(json.dumps({"total_books": total, "pending_termination_counter": pending, "counts": counts, "recent": recent}, indent=1))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("scan"); s.add_argument("--roots", nargs="+", required=True)
    c = sub.add_parser("claim"); c.add_argument("--worker", required=True); c.add_argument("--tier", default="A")
    m = sub.add_parser("commit"); m.add_argument("artifact")
    r = sub.add_parser("release-stale"); r.add_argument("--minutes", type=int, default=20)
    sub.add_parser("sync-cloud")
    sub.add_parser("status")
    args = ap.parse_args()
    {"scan": cmd_scan, "claim": cmd_claim, "commit": cmd_commit, "release-stale": cmd_release_stale, "sync-cloud": cmd_sync_cloud, "status": cmd_status}[args.cmd](args)


if __name__ == "__main__":
    main()
