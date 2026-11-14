#!/usr/bin/env python3
"""Always-Free GCP Cloud Vision OCR Rescue for INSUFFICIENT_OCR Tier-A Foundry PDFs.

Zero-cost, fail-closed rescue bridge:
  - Reads `corpus_queue` strictly via `file:...?mode=ro` (never writes `foundry.db` or `brain/mind.jsonl`).
  - Renders scanned PDF pages in memory with PyMuPDF (`180 DPI` grayscale PNG bytes) and calls
    `https://vision.googleapis.com/v1/images:annotate` (`DOCUMENT_TEXT_DETECTION`) with ADC bearer token
    + `x-goog-user-project: galaxysportsedge`.
  - Enforces a strict hard circuit-breaker `MAX_VISION_PAGES_PER_RUN = 120` (<=12% of the 1,000 units/mo
    Google Cloud Vision Always Free monthly allowance -> $0.00 spend).
  - Emits Foundry-compatible `========== PAGE n ==========` UTF-8 text transcripts + `ocr_rescue_manifest.json`
    under `docs/engine/research/2026-11-13/ocr_rescue/` for immediate Foundry / Mind ingestion.
"""
from __future__ import annotations

import argparse
import base64
import json
import sqlite3
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

MAX_VISION_PAGES_PER_RUN = 120
DEFAULT_DPI = 180
BATCH_IMAGES_PER_REQUEST = 5
VISION_ANNOTATE_URL = "https://vision.googleapis.com/v1/images:annotate"
DEFAULT_PROJECT_ID = "galaxysportsedge"
DEFAULT_FOUNDRY_DB = Path(r"C:\Users\Garrett\Sports\foundry\foundry.db")
DEFAULT_OUT_DIR = Path(
    r"C:\Users\Garrett\Sports_prepack_audit_wt\docs\engine\research\2026-11-13\ocr_rescue"
)

# Priority page budgets per Tier-A blocked book (sum = 107 <= MAX_VISION_PAGES_PER_RUN=120):
# Full 17-page rescue for Dixon & Coles (1997) plus TOC & opening theoretical foundations for the 4 classics.
DEFAULT_BOOK_PAGE_CAPS: Dict[str, int] = {
    "3d7cafefb6ffa2ae": 25,  # Dixon & Coles 1997 (17 pages total -> full paper)
    "3a88f7ddf53d358c": 25,  # Tolman 1932 Purposive Behavior
    "71382581388cd74f": 25,  # Daly 1921 American Football
    "1eb756d93ff49446": 16,  # Hull 1943 Principles of Behavior
    "17150554536af787": 16,  # James 1890 Principles of Psychology Vol 2
}

EXTENDED_BOOK_PAGE_CAPS: Dict[str, int] = {
    **DEFAULT_BOOK_PAGE_CAPS,
    "65dd26cd834db798": 20,  # IBM US7483986 Self-Organizing Multi-Agent Topology (14 pages -> full patent)
    "6ff1729124cef6c7": 40,  # Halmos 1950 Measure Theory (40 foundational pages)
}


def load_books_by_ids_readonly(
    book_ids: Sequence[str],
    db_path: Path = DEFAULT_FOUNDRY_DB,
) -> List[Dict[str, Any]]:
    """Query `corpus_queue` via `file:...?mode=ro` for explicit `book_id`s without touching locks."""
    clean_ids = [str(b).strip() for b in book_ids if str(b).strip()]
    if not clean_ids:
        return []
    resolved = Path(db_path).resolve()
    if not resolved.is_file():
        raise FileNotFoundError(f"Foundry DB not found: {resolved}")
    marks = ",".join("?" * len(clean_ids))
    conn = sqlite3.connect(f"file:{resolved.as_posix()}?mode=ro", uri=True, timeout=5.0)
    try:
        rows = conn.execute(
            f"SELECT book_id, file_path, file_name, primary_domain, tier, worker_id "
            f"FROM corpus_queue WHERE book_id IN ({marks}) ORDER BY book_id",
            clean_ids,
        ).fetchall()
    finally:
        conn.close()
    return [
        {
            "book_id": r[0],
            "file_path": r[1],
            "file_name": r[2],
            "primary_domain": r[3],
            "tier": r[4],
            "worker_id": r[5],
        }
        for r in rows
    ]


def load_insufficient_ocr_books_readonly(db_path: Path = DEFAULT_FOUNDRY_DB) -> List[Dict[str, Any]]:
    """Query `corpus_queue` via `file:...?mode=ro` for `INSUFFICIENT_OCR` books without touching locks."""
    resolved = Path(db_path).resolve()
    if not resolved.is_file():
        raise FileNotFoundError(f"Foundry DB not found: {resolved}")
    conn = sqlite3.connect(f"file:{resolved.as_posix()}?mode=ro", uri=True, timeout=5.0)
    try:
        rows = conn.execute(
            "SELECT book_id, file_path, file_name, primary_domain, tier, worker_id "
            "FROM corpus_queue WHERE status = 'INSUFFICIENT_OCR' ORDER BY book_id"
        ).fetchall()
    finally:
        conn.close()
    return [
        {
            "book_id": r[0],
            "file_path": r[1],
            "file_name": r[2],
            "primary_domain": r[3],
            "tier": r[4],
            "worker_id": r[5],
        }
        for r in rows
    ]


def plan_page_allocation(
    books: Sequence[Mapping[str, Any]],
    total_pages_by_book: Mapping[str, int],
    *,
    max_pages_total: int = MAX_VISION_PAGES_PER_RUN,
    per_book_caps: Mapping[str, int] = DEFAULT_BOOK_PAGE_CAPS,
) -> Tuple[List[Dict[str, Any]], int]:
    """Deterministically plan page ranges within the Always-Free hard circuit-breaker."""
    if max_pages_total > MAX_VISION_PAGES_PER_RUN:
        raise ValueError(
            f"CIRCUIT_BREAKER_VIOLATION: requested max_pages_total={max_pages_total} > {MAX_VISION_PAGES_PER_RUN}"
        )
    budget_left = max_pages_total
    plans: List[Dict[str, Any]] = []
    # Sort so Dixon & Coles + Tolman + Daly + Hull + James preserve deterministic priority order.
    priority_order = {bid: idx for idx, bid in enumerate(DEFAULT_BOOK_PAGE_CAPS.keys())}
    ordered = sorted(books, key=lambda b: (priority_order.get(str(b["book_id"]), 999), str(b["book_id"])))
    for book in ordered:
        bid = str(book["book_id"])
        total_pages = int(total_pages_by_book.get(bid, 0))
        desired_cap = int(per_book_caps.get(bid, 15))
        take = min(total_pages, desired_cap, budget_left)
        budget_left -= take
        plans.append(
            {
                "book_id": bid,
                "file_name": str(book["file_name"]),
                "file_path": str(book["file_path"]),
                "primary_domain": str(book.get("primary_domain") or "general"),
                "pdf_total_pages": total_pages,
                "rescue_pages_1based": list(range(1, take + 1)),
                "pages_planned": take,
                "coverage_mode": "FULL_DOCUMENT" if take == total_pages and total_pages > 0 else "TOC_AND_FOUNDATION_SLICE",
            }
        )
    planned_total = sum(p["pages_planned"] for p in plans)
    assert planned_total <= MAX_VISION_PAGES_PER_RUN
    return plans, planned_total


def get_adc_access_token() -> str:
    """Obtain an OAuth2 access token from local gcloud Application Default Credentials."""
    for exe in ("gcloud.cmd", "gcloud"):
        try:
            proc = subprocess.run(
                [exe, "auth", "application-default", "print-access-token"],
                capture_output=True,
                text=True,
                timeout=30,
                check=True,
            )
            tok = proc.stdout.strip()
            if tok:
                return tok
        except FileNotFoundError:
            continue
    raise RuntimeError("Unable to obtain ADC access token via gcloud auth application-default print-access-token")


def render_pdf_pages_png_b64(pdf_path: Path, pages_1based: Sequence[int], *, dpi: int = DEFAULT_DPI) -> List[Tuple[int, str]]:
    """Render selected 1-based pages of a PDF into base64-encoded grayscale PNG strings."""
    import pymupdf

    doc = pymupdf.open(str(pdf_path))
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    rendered: List[Tuple[int, str]] = []
    try:
        for pno in pages_1based:
            page = doc[pno - 1]
            pix = page.get_pixmap(matrix=mat, colorspace=pymupdf.csGRAY)
            png_bytes = pix.tobytes("png")
            rendered.append((pno, base64.b64encode(png_bytes).decode("ascii")))
    finally:
        doc.close()
    return rendered


def call_vision_document_text_batch(
    b64_pages: Sequence[Tuple[int, str]],
    *,
    access_token: str,
    project_id: str = DEFAULT_PROJECT_ID,
) -> Dict[int, str]:
    """Call Google Cloud Vision DOCUMENT_TEXT_DETECTION on a small batch of PNG pages."""
    body = {
        "requests": [
            {
                "image": {"content": b64},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
            }
            for _, b64 in b64_pages
        ]
    }
    req = urllib.request.Request(
        VISION_ANNOTATE_URL,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "x-goog-user-project": project_id,
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"Vision API HTTP {exc.code}: {err_body}") from exc

    responses = payload.get("responses", [])
    if len(responses) != len(b64_pages):
        raise RuntimeError(f"Vision API response count mismatch: {len(responses)} != {len(b64_pages)}")

    out: Dict[int, str] = {}
    for (pno, _), r in zip(b64_pages, responses):
        if "error" in r and r["error"]:
            raise RuntimeError(f"Vision page {pno} error: {r['error']}")
        text = ""
        if "fullTextAnnotation" in r and isinstance(r["fullTextAnnotation"], dict):
            text = str(r["fullTextAnnotation"].get("text") or "")
        elif "textAnnotations" in r and r["textAnnotations"]:
            text = str(r["textAnnotations"][0].get("description") or "")
        out[pno] = text.strip()
    return out


def format_foundry_core_transcript(pages_text: Mapping[int, str]) -> str:
    """Format page texts with Foundry's `========== PAGE n ==========` boundary markers."""
    chunks: List[str] = []
    for pno in sorted(pages_text.keys()):
        chunks.append(f"========== PAGE {pno} ==========")
        chunks.append(pages_text[pno])
        chunks.append("")
    return "\n".join(chunks).rstrip() + "\n"


def run_ocr_rescue(
    *,
    db_path: Path = DEFAULT_FOUNDRY_DB,
    out_dir: Path = DEFAULT_OUT_DIR,
    max_pages_total: int = MAX_VISION_PAGES_PER_RUN,
    book_ids: Optional[Sequence[str]] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Execute end-to-end Cloud Vision DOCUMENT_TEXT_DETECTION rescue within Always-Free limits."""
    import pymupdf

    books = (
        load_books_by_ids_readonly(book_ids, db_path)
        if book_ids
        else load_insufficient_ocr_books_readonly(db_path)
    )
    total_pages_by_book: Dict[str, int] = {}
    for b in books:
        pdf_path = Path(b["file_path"])
        doc = pymupdf.open(str(pdf_path))
        total_pages_by_book[str(b["book_id"])] = len(doc)
        doc.close()

    caps = EXTENDED_BOOK_PAGE_CAPS if book_ids else DEFAULT_BOOK_PAGE_CAPS
    plans, planned_total = plan_page_allocation(
        books, total_pages_by_book, max_pages_total=max_pages_total, per_book_caps=caps
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    access_token = "" if dry_run else get_adc_access_token()

    total_api_requests = 0
    total_pages_ocr = 0
    results: List[Dict[str, Any]] = []

    for plan in plans:
        bid = plan["book_id"]
        pdf_path = Path(plan["file_path"])
        pages = plan["rescue_pages_1based"]
        pages_text: Dict[int, str] = {}
        if not dry_run and pages:
            rendered = render_pdf_pages_png_b64(pdf_path, pages, dpi=DEFAULT_DPI)
            for idx in range(0, len(rendered), BATCH_IMAGES_PER_REQUEST):
                chunk = rendered[idx : idx + BATCH_IMAGES_PER_REQUEST]
                batch_text = call_vision_document_text_batch(chunk, access_token=access_token)
                pages_text.update(batch_text)
                total_api_requests += 1
                total_pages_ocr += len(chunk)

        txt_path = out_dir / f"{bid}_vision_ocr_core.txt"
        word_count = 0
        char_count = 0
        if not dry_run:
            transcript = format_foundry_core_transcript(pages_text)
            txt_path.write_text(transcript, encoding="utf-8")
            word_count = len(transcript.split())
            char_count = len(transcript)

        results.append(
            {
                "book_id": bid,
                "file_name": plan["file_name"],
                "primary_domain": plan["primary_domain"],
                "pdf_total_pages": plan["pdf_total_pages"],
                "pages_rescued": len(pages),
                "coverage_mode": plan["coverage_mode"],
                "output_txt_rel": txt_path.name if not dry_run else None,
                "word_count": word_count,
                "char_count": char_count,
                "sample_opening_words": " ".join(pages_text.get(1, "").split()[:18]) if not dry_run else "",
            }
        )

    manifest = {
        "schema": "gse.gcp_vision_ocr_rescue.v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "project_id": DEFAULT_PROJECT_ID,
        "vision_feature": "DOCUMENT_TEXT_DETECTION",
        "always_free_monthly_units": 1000,
        "circuit_breaker_max_pages": MAX_VISION_PAGES_PER_RUN,
        "dry_run": dry_run,
        "planned_total_pages": planned_total,
        "actual_pages_ocr": total_pages_ocr,
        "always_free_pct_used": round(100.0 * total_pages_ocr / 1000.0, 2),
        "estimated_cost_usd": 0.0,
        "vision_api_http_batches": total_api_requests,
        "books_rescued": results,
    }
    manifest_name = "ocr_rescue_tierb_manifest.json" if book_ids else "ocr_rescue_manifest.json"
    manifest_path = out_dir / manifest_name
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest


def main() -> int:
    ap = argparse.ArgumentParser(description="Always-Free GCP Cloud Vision OCR rescue for INSUFFICIENT_OCR / scanned Foundry books.")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--max-pages", type=int, default=MAX_VISION_PAGES_PER_RUN)
    ap.add_argument("--book-ids", nargs="*", default=None, help="Optional explicit book_id list to rescue.")
    args = ap.parse_args()
    manifest = run_ocr_rescue(
        max_pages_total=args.max_pages,
        book_ids=args.book_ids,
        dry_run=args.dry_run,
    )
    print(
        f"OCR_RESCUE_OK | books={len(manifest['books_rescued'])} "
        f"| pages_ocr={manifest['actual_pages_ocr']}/{manifest['always_free_monthly_units']} "
        f"| cost_usd=${manifest['estimated_cost_usd']:.2f}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
