"""
Mind Guardian — permanent ingestion watcher.

WHY THIS EXISTS
---------------
Documents arrive in Downloads / data-snapshots / .hermes and then get lost:
never hashed, never filed into a dated bucket, never written into the trainer
feed, never searchable. The Guardian closes that loop. Every new supported file
is content-hashed (so a rename cannot defeat dedupe), text-extracted, routed into
its canonical AGENTS.md bucket, appended to the dated trainer feed, and indexed
into the SQLite FTS memory so a later session can FIND it.

HONESTY / SAFETY (AGENTS.md Law 4 + Law 1)
------------------------------------------
* Dedupe is by CONTENT HASH, not filename or mtime. The same bytes under a new
  name is a duplicate; only new content is new work.
* Credentials and secrets NEVER reach the tracked tree or the memory index. They
  are routed to a gitignored vault (brain/local_vault/<date>/) and skipped for
  indexing. False-positive sensitivity is the safe direction for a credentials
  watcher.
* A corrupt or half-downloaded file (a truncated zip/pdf) must never take the
  daemon down: extract_text returns None rather than raising.
* Nothing is invented. A file that cannot be extracted is reported with a
  skipped_reason, not silently dropped.

No third-party deps beyond what the repo already has (pymupdf for pdf); .docx is
read with the stdlib zip/XML path so python-docx is not required.

Run once:      python scripts/ops/mind_guardian_daemon.py --once
Run forever:   python scripts/ops/mind_guardian_daemon.py --watch --interval 30
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import re
import shutil
import sqlite3
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence

# ─── Canonical buckets (AGENTS.md DOCS BUCKETS) ───────────────────────────────

BUCKETS: tuple = (
    "dfs",
    "predictions",
    "props",
    "fantasy",
    "engine",
    "data-sources",
    "arxiv-program",
)
DEFAULT_BUCKET = "engine"

SUPPORTED_EXTS = {".txt", ".md", ".json", ".csv", ".docx", ".pdf"}

# ─── Hashing ──────────────────────────────────────────────────────────────────


def sha256_file(path: Path) -> str:
    """Streaming SHA-256 so a large drop cannot exhaust memory."""
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# ─── Text extraction ──────────────────────────────────────────────────────────


def _extract_docx(path: Path) -> Optional[str]:
    """Read word/document.xml straight out of the zip; no python-docx needed."""
    try:
        with zipfile.ZipFile(path) as z:
            xml = z.read("word/document.xml").decode("utf-8", "ignore")
    except Exception:
        return None
    # keep only the <w:t> run contents, then strip any residual tags
    runs = re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml, flags=re.S)
    text = "".join(runs)
    text = re.sub(r"<[^>]+>", "", text)
    return text


def _extract_pdf(path: Path) -> Optional[str]:
    try:
        import fitz  # pymupdf
    except Exception:
        return None
    try:
        doc = fitz.open(str(path))
    except Exception:
        return None
    try:
        return "".join(page.get_text() for page in doc)
    except Exception:
        return None
    finally:
        try:
            doc.close()
        except Exception:
            pass


def extract_text(path: Path) -> Optional[str]:
    """
    Returns extracted text, or None when the file is unsupported or unreadable.
    A corrupt file returns None rather than raising (the daemon must survive it).
    """
    p = Path(path)
    ext = p.suffix.lower()
    if ext not in SUPPORTED_EXTS:
        return None
    if ext == ".docx":
        return _extract_docx(p)
    if ext == ".pdf":
        return _extract_pdf(p)
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None


# ─── Categorization (deterministic, keyword-scored) ───────────────────────────

# Every keyword is matched on WORD BOUNDARIES so "devig" does not fire the "vig"
# rule and "totals" does not fire the bare "total" rule.
_BUCKET_KEYWORDS: Dict[str, Sequence[str]] = {
    "dfs": [
        "draftkings", "fanduel", "lineup", "optimizer", "salary", "showdown",
        "gpp", "prizepicks", "cash game", "salary cap",
    ],
    "predictions": [
        "moneyline", "spread", "total", "closing line", "opening line",
        "line value", "clv", "ats", "against the spread", "win probability",
        "odds", "pick", "cover", "vig",
    ],
    "props": [
        "player prop", "prop", "receiving yards", "passing yards",
        "rushing yards", "anytime touchdown", "receptions",
    ],
    "fantasy": [
        "season-long", "projections", "rankings", "waivers", "redraft",
        "dynasty", "fantasy", "league",
    ],
    "engine": [
        "engine", "physics", "solver", "spectral", "navier", "eigenfunction",
        "copula", "operator", "calibration", "brier",
    ],
    "data-sources": [
        "nflverse", "ingest", "source registry", "play-by-play", "feed",
        "dataset", "schema", "api",
    ],
    "arxiv-program": [
        "arxiv", "paper", "corpus", "literature", "valuable papers",
    ],
}

_BUCKET_PATTERNS: Dict[str, List[re.Pattern]] = {
    bucket: [re.compile(r"\b" + re.escape(kw) + r"\b", re.I) for kw in kws]
    for bucket, kws in _BUCKET_KEYWORDS.items()
}

# Fixed order gives a deterministic tie-break.
_BUCKET_ORDER = list(BUCKETS)


def categorize(filename: str, text: str) -> str:
    """
    Score the filename+text against each bucket's keywords and return the winner.
    Deterministic; ties break by the canonical bucket order; empty text falls
    back to DEFAULT_BUCKET. Never raises.
    """
    blob = f"{filename}\n{text or ''}"
    scores: Dict[str, int] = {}
    for bucket in _BUCKET_ORDER:
        n = sum(1 for rx in _BUCKET_PATTERNS[bucket] if rx.search(blob))
        if n:
            scores[bucket] = n
    if not scores:
        return DEFAULT_BUCKET
    best = max(scores.values())
    for bucket in _BUCKET_ORDER:  # stable, first-wins tie-break
        if scores.get(bucket) == best:
            return bucket
    return DEFAULT_BUCKET


# ─── Sensitivity routing ──────────────────────────────────────────────────────

_SENSITIVE_FILENAME = re.compile(
    r"(?i)(cred|secret|password|passwd|\.env|token|apikey|api[_-]?key|"
    r"id_rsa|private[_-]?key)"
)

_SENSITIVE_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_\-]{8,}"),  # OpenAI-style key
    re.compile(
        r"(?i)(api[_-]?key|access[_-]?key|secret|token|password|passwd|pwd)"
        r"\s*[:=]"
    ),
    re.compile(r"(?i)(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"(?i)\b(aws_secret_access_key|aws_access_key_id)\b"),
]


def is_sensitive(filename: str, text: str) -> bool:
    """True when the file looks like credentials/secrets and must go to the vault."""
    if _SENSITIVE_FILENAME.search(Path(filename).name):
        return True
    blob = text or ""
    return any(rx.search(blob) for rx in _SENSITIVE_PATTERNS)


# ─── Result record ────────────────────────────────────────────────────────────


@dataclass
class IngestResult:
    source_path: str
    sha256: str
    duplicate: bool = False
    sensitive: bool = False
    bucket: Optional[str] = None
    target_path: Optional[str] = None
    feed_path: Optional[str] = None
    skipped_reason: Optional[str] = None


# ─── The Guardian ─────────────────────────────────────────────────────────────

DEFAULT_WATCH_DIRS = (
    Path.home() / "Downloads",
    Path.cwd() / "data" / "snapshots",
    Path.home() / ".hermes",
)


class MindGuardian:
    def __init__(
        self,
        repo_root: Path,
        watch_dirs: Sequence[Path],
        today: Optional[str] = None,
        memory_db: Optional[Path] = None,
        poll_interval: float = 30.0,
    ) -> None:
        self.repo_root = Path(repo_root)
        self.watch_dirs = [Path(d) for d in watch_dirs]
        self.today = today or _dt.date.today().isoformat()
        self.memory_db = Path(memory_db) if memory_db else None
        self.poll_interval = float(poll_interval)
        self._ledger_path = self.repo_root / ".mind_guardian" / "ledger.json"
        self._ledger: Dict[str, dict] = self._load_ledger()
        if self.memory_db is not None:
            self._ensure_memory_schema()

    # — ledger —

    def _load_ledger(self) -> Dict[str, dict]:
        try:
            raw = json.loads(self._ledger_path.read_text(encoding="utf-8"))
            hashes = raw.get("hashes", {})
            return hashes if isinstance(hashes, dict) else {}
        except Exception:
            return {}

    def _save_ledger(self) -> None:
        self._ledger_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._ledger_path.with_suffix(".json.tmp")
        tmp.write_text(
            json.dumps({"hashes": self._ledger}, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        tmp.replace(self._ledger_path)

    # — memory —

    def _connect(self) -> sqlite3.Connection:
        assert self.memory_db is not None
        self.memory_db.parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(str(self.memory_db))

    def _ensure_memory_schema(self) -> None:
        conn = self._connect()
        try:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS facts ("
                "key TEXT PRIMARY KEY, value TEXT, domain TEXT, source TEXT)"
            )
            conn.execute(
                "CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(key, value)"
            )
            conn.commit()
        finally:
            conn.close()

    def _index(self, sha: str, filename: str, text: str) -> None:
        conn = self._connect()
        try:
            key = f"ingested:{sha[:16]}"
            value = f"{filename}: {(text or '')[:2000]}"
            conn.execute(
                "INSERT OR REPLACE INTO facts (key, value, domain, source) "
                "VALUES (?,?,?,?)",
                (key, value, "ingest", sha),
            )
            rid = conn.execute(
                "SELECT rowid FROM facts WHERE key=?", (key,)
            ).fetchone()[0]
            conn.execute("DELETE FROM facts_fts WHERE rowid=?", (rid,))
            conn.execute(
                "INSERT INTO facts_fts (rowid, key, value) VALUES (?,?,?)",
                (rid, key, value),
            )
            conn.commit()
        finally:
            conn.close()

    # — ingestion —

    def _ingest_one(self, f: Path) -> IngestResult:
        sha = sha256_file(f)
        ext = f.suffix.lower()

        if ext not in SUPPORTED_EXTS:
            # Report the path the file WOULD occupy (canonical fallback bucket)
            # but deliberately leave it uncreated — nothing is filed for an
            # unsupported drop, and the caller can see it went nowhere.
            intended = (
                self.repo_root / "docs" / DEFAULT_BUCKET / "research" / self.today / f.name
            )
            return IngestResult(
                source_path=str(f),
                sha256=sha,
                target_path=str(intended),
                skipped_reason=f"unsupported extension {ext or '(none)'}",
            )

        if sha in self._ledger:
            prev = self._ledger[sha]
            return IngestResult(
                source_path=str(f),
                sha256=sha,
                duplicate=True,
                sensitive=bool(prev.get("sensitive")),
                bucket=prev.get("bucket"),
                target_path=prev.get("target_path"),
                feed_path=prev.get("feed_path"),
            )

        text = extract_text(f)
        if text is None:
            return IngestResult(
                source_path=str(f),
                sha256=sha,
                skipped_reason="extraction failed (corrupt or unreadable)",
            )

        # 1) credentials → gitignored vault, never indexed, never fed
        if is_sensitive(f.name, text):
            target = self.repo_root / "brain" / "local_vault" / self.today / f.name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, target)
            self._ledger[sha] = {
                "sensitive": True,
                "bucket": None,
                "target_path": str(target),
                "feed_path": None,
                "name": f.name,
            }
            return IngestResult(
                source_path=str(f),
                sha256=sha,
                sensitive=True,
                target_path=str(target),
            )

        # 2) normal research → dated bucket + trainer feed + FTS memory
        bucket = categorize(f.name, text)
        target = self.repo_root / "docs" / bucket / "research" / self.today / f.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, target)

        feed = self.repo_root / "brain" / "feeds" / self.today / "trainer_feed.jsonl"
        feed.parent.mkdir(parents=True, exist_ok=True)
        row = {
            "sha256": sha,
            "text": text,
            "path": str(target),
            "bucket": bucket,
            "source": str(f),
        }
        with open(feed, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

        if self.memory_db is not None:
            self._index(sha, f.name, text)

        self._ledger[sha] = {
            "sensitive": False,
            "bucket": bucket,
            "target_path": str(target),
            "feed_path": str(feed),
            "name": f.name,
        }
        return IngestResult(
            source_path=str(f),
            sha256=sha,
            bucket=bucket,
            target_path=str(target),
            feed_path=str(feed),
        )

    def scan_once(self) -> List[IngestResult]:
        """One pass over every watched directory. Saves the ledger before returning."""
        results: List[IngestResult] = []
        for d in self.watch_dirs:
            if not d.exists():
                continue
            for f in sorted(p for p in d.rglob("*") if p.is_file()):
                try:
                    results.append(self._ingest_one(f))
                except Exception as exc:  # a single bad file must not halt the pass
                    results.append(
                        IngestResult(
                            source_path=str(f),
                            sha256="",
                            skipped_reason=f"error: {exc}",
                        )
                    )
        self._save_ledger()
        return results

    def run_forever(self) -> None:  # pragma: no cover - loop, not unit tested
        while True:
            try:
                self.scan_once()
            except Exception as exc:
                print(f"[mind-guardian] scan error: {exc}")
            time.sleep(self.poll_interval)


# ─── CLI ──────────────────────────────────────────────────────────────────────


def main(argv: Optional[Sequence[str]] = None) -> int:  # pragma: no cover
    ap = argparse.ArgumentParser(description="Mind Guardian ingestion watcher")
    ap.add_argument("--root", default=str(Path.cwd()), help="repo root")
    ap.add_argument("--watch", action="store_true", help="run continuously")
    ap.add_argument("--once", action="store_true", help="single pass (default)")
    ap.add_argument("--interval", type=float, default=30.0)
    ap.add_argument(
        "--memory-db",
        default=None,
        help="SQLite FTS memory path (e.g. intelligence/voice_brain/memory.db)",
    )
    ap.add_argument("--dir", action="append", default=None, help="watch dir (repeatable)")
    args = ap.parse_args(argv)

    root = Path(args.root).resolve()
    watch = [Path(d) for d in args.dir] if args.dir else list(DEFAULT_WATCH_DIRS)
    db = Path(args.memory_db) if args.memory_db else (root / "intelligence" / "voice_brain" / "memory.db")

    g = MindGuardian(repo_root=root, watch_dirs=watch, memory_db=db)
    if args.watch:
        print(f"[mind-guardian] watching {[str(w) for w in watch]}")
        g.run_forever()
        return 0

    results = g.scan_once()
    for r in results:
        state = (
            "dup" if r.duplicate
            else "vault" if r.sensitive
            else "skip" if r.skipped_reason
            else f"->{r.bucket}"
        )
        print(f"[mind-guardian] {state:>8}  {Path(r.source_path).name}")
    print(f"[mind-guardian] {len(results)} file(s) seen")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
