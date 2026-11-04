"""Overnight bulk harvest: OpenAlex + arXiv -> 500 new research PDFs.

Why a separate harvester
------------------------
harvest_research_corpus.py walks a fixed topic list once per query with a shallow
page. That is fine for a survey and hopeless for a bulk corpus night: OpenAlex
alone reports 29,015 open-access works for one query, and a single per-page=50
request sees 0.17% of them.

This harness pages OpenAlex deeply via cursor, expands the query set, prioritises
OpenAlex records that actually carry a PDF link (plus every arXiv record, which
almost always has one), downloads with a %PDF magic-byte check, and is fully
resumable: a re-run skips records already in the manifest and files already on
disk, so an interrupted night continues instead of restarting.

Honesty rules baked in
----------------------
* A record is only counted toward the PDF target after its bytes start with %PDF
  and exceed MIN_PDF_BYTES. A 200 response that returns an HTML paywall page is a
  failure, not a download.
* Every download attempt is logged with its status. No silent skips.
* Kaggle is NOT touched here. Kaggle needs ~/.kaggle/kaggle.json; without it the
  API cannot authenticate, and pretending otherwise would be fabrication. The
  run reports Kaggle as BLOCKED.

Usage
-----
  python scripts/research/harvest_overnight_500.py \
      --out C:/Users/Garrett/AppData/Local/hermes/cache/scratch/research_corpus \
      --target-pdfs 500 --max-seconds 480
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

UA = "GSE-Research-Harvester/2.0 (research corpus; contact: galaxysportsedge)"
MAILTO = "hermes@gse.local"
MIN_PDF_BYTES = 20_000
ARXIV_NS = {"a": "http://www.w3.org/2005/Atom"}

# Expanded query set. Each entry is (topic_tag, query).
# More breadth than the survey script: re-identification, optical flow, action
# recognition, GNNs, transformers, sports betting markets, injury modelling.
QUERIES: list[tuple[str, str]] = [
    # --- vision / tracking -------------------------------------------------
    ("vision_tracking", "American football player tracking"),
    ("vision_tracking", "sports player tracking computer vision"),
    ("vision_tracking", "multi-object tracking broadcast video sports"),
    ("vision_tracking", "player re-identification sports video"),
    ("vision_tracking", "jersey number recognition sports"),
    ("vision_tracking", "football helmet detection video"),
    ("vision_tracking", "ball tracking sports video"),
    ("vision_tracking", "optical flow sports player motion"),
    ("vision_tracking", "action recognition sports video deep learning"),
    ("vision_tracking", "sports video event detection"),
    ("vision_tracking", "soccer player tracking broadcast"),
    ("vision_tracking", "basketball player tracking computer vision"),
    # --- camera / geometry --------------------------------------------------
    ("pose_homography", "sports field homography estimation"),
    ("pose_homography", "broadcast camera calibration sports field"),
    ("pose_homography", "pose estimation athletes video"),
    ("pose_homography", "human pose estimation sports"),
    ("pose_homography", "field line detection sports image"),
    ("pose_homography", "camera calibration sports broadcast"),
    ("pose_homography", "3D reconstruction sports scene"),
    # --- coverage / tactics -------------------------------------------------
    ("coverage_scheme", "defensive coverage prediction American football"),
    ("coverage_scheme", "NFL coverage shell classification"),
    ("coverage_scheme", "pass coverage recognition deep learning football"),
    ("coverage_scheme", "American football tactics machine learning"),
    ("coverage_scheme", "defensive scheme recognition football tracking data"),
    ("coverage_scheme", "formation recognition American football"),
    ("coverage_scheme", "play classification football tracking data"),
    ("coverage_scheme", "graph neural network football tracking"),
    ("coverage_scheme", "transformer model sports trajectory"),
    # --- analytics ----------------------------------------------------------
    ("football_analytics", "expected points added football"),
    ("football_analytics", "NFL win probability model"),
    ("football_analytics", "football play prediction machine learning"),
    ("football_analytics", "pass rush pressure prediction NFL"),
    ("football_analytics", "route running receiver tracking"),
    ("football_analytics", "injury prediction American football"),
    ("football_analytics", "player valuation sports analytics"),
    ("football_analytics", "draft prediction football machine learning"),
    ("football_analytics", "quarterback performance evaluation"),
    ("football_analytics", "offensive line performance metrics"),
    ("football_analytics", "spatial analysis sports tracking data"),
    ("football_analytics", "sports analytics deep learning"),
    # --- forecasting / markets ---------------------------------------------
    ("forecasting_calibration", "sports forecasting calibration"),
    ("forecasting_calibration", "betting market efficiency sports"),
    ("forecasting_calibration", "probabilistic forecasting proper scoring rules"),
    ("forecasting_calibration", "Bayesian hierarchical sports model"),
    ("forecasting_calibration", "prediction markets sports"),
    ("forecasting_calibration", "Monte Carlo simulation sports outcomes"),
    ("forecasting_calibration", "uncertainty quantification sports prediction"),
    ("forecasting_calibration", "machine learning sports betting"),
    # --- general CV methods that transfer ----------------------------------
    ("cv_methods", "YOLO object detection real time"),
    ("cv_methods", "ByteTrack multi object tracking"),
    ("cv_methods", "vision transformer object detection"),
    ("cv_methods", "domain adaptation video surveillance"),
    ("cv_methods", "small object detection high resolution"),
    ("cv_methods", "crowd counting dense object detection"),
]


def _get(url: str, tries: int = 3, timeout: int = 40) -> bytes | None:
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 410):
                return None
            if i == tries - 1:
                return None
            time.sleep(1.2 * (i + 1))
        except Exception:
            if i == tries - 1:
                return None
            time.sleep(1.2 * (i + 1))
    return None


def _abstract_from_inverted(inv: dict | None) -> str:
    if not inv:
        return ""
    pos: list[tuple[int, str]] = []
    for word, idxs in inv.items():
        for i in idxs:
            pos.append((i, word))
    pos.sort()
    return " ".join(w for _, w in pos)[:4000]


def openalex_page(query: str, cursor: str, per_page: int = 200) -> tuple[list[dict], str | None]:
    """One page of OpenAlex OA works. Returns (records, next_cursor)."""
    q = urllib.parse.quote(query)
    url = (f"https://api.openalex.org/works?search={q}"
           f"&filter=is_oa:true&per-page={per_page}&cursor={urllib.parse.quote(cursor)}"
           f"&mailto={MAILTO}")
    raw = _get(url)
    if not raw:
        return [], None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return [], None

    now = datetime.now(timezone.utc).isoformat()
    out = []
    for w in data.get("results", []):
        loc = w.get("best_oa_location") or {}
        oa = w.get("open_access") or {}
        pdf_url = loc.get("pdf_url") or oa.get("oa_url")
        if not pdf_url:
            continue  # no PDF link -> cannot help the PDF target
        authors = [a.get("author", {}).get("display_name")
                   for a in (w.get("authorships") or [])][:8]
        out.append({
            "source": "openalex",
            "source_id": (w.get("id") or "").rsplit("/", 1)[-1],
            "doi": w.get("doi"),
            "title": w.get("title") or w.get("display_name") or "",
            "year": w.get("publication_year"),
            "venue": ((w.get("primary_location") or {}).get("source") or {}).get("display_name"),
            "authors": [a for a in authors if a],
            "cited_by": w.get("cited_by_count"),
            "url": w.get("id"),
            "pdf_url": pdf_url,
            "abstract": _abstract_from_inverted(w.get("abstract_inverted_index")),
            "topic": query,
            "retrieved_at": now,
        })
    return out, (data.get("meta") or {}).get("next_cursor")


def _arxiv_query(query: str) -> str:
    terms = [t for t in re.findall(r"[a-z0-9]+", query.lower())
             if len(t) > 2 and t not in {"the", "and", "for", "with", "using",
                                         "sports", "video", "data", "based"}]
    if not terms:
        return ""
    # AND of six terms is far too restrictive: it returned zero entries for every
    # query in the first overnight pass. Two to three distinctive terms is what
    # actually matches the arXiv corpus.
    return "+AND+".join(f"all:{urllib.parse.quote(t)}" for t in terms[:3])


def arxiv_page(query: str, start: int = 0, max_results: int = 100) -> list[dict]:
    q = _arxiv_query(query)
    if not q:
        return []
    url = (f"https://export.arxiv.org/api/query?search_query={q}"
           f"&start={start}&max_results={max_results}&sortBy=relevance")
    raw = _get(url, timeout=45)
    if not raw:
        return []
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return []
    now = datetime.now(timezone.utc).isoformat()
    out = []
    for e in root.findall("a:entry", ARXIV_NS):
        aid = (e.findtext("a:id", "", ARXIV_NS) or "").rsplit("/", 1)[-1]
        pdf = ""
        for link in e.findall("a:link", ARXIV_NS):
            if link.get("title") == "pdf":
                pdf = link.get("href", "")
        if not pdf:
            continue
        title = re.sub(r"\s+", " ", e.findtext("a:title", "", ARXIV_NS) or "").strip()
        summ = re.sub(r"\s+", " ", e.findtext("a:summary", "", ARXIV_NS) or "").strip()
        pub = e.findtext("a:published", "", ARXIV_NS) or ""
        out.append({
            "source": "arxiv",
            "source_id": aid,
            "doi": e.findtext("{http://arxiv.org/schemas/atom}doi", "", ARXIV_NS) or None,
            "title": title,
            "year": int(pub[:4]) if pub[:4].isdigit() else None,
            "venue": "arXiv",
            "authors": [a.findtext("a:name", "", ARXIV_NS)
                        for a in e.findall("a:author", ARXIV_NS)][:8],
            "cited_by": None,
            "url": e.findtext("a:id", "", ARXIV_NS),
            "pdf_url": pdf,
            "abstract": summ[:4000],
            "topic": query,
            "retrieved_at": now,
        })
    return out


def download_pdf(rec: dict, pdf_dir: Path) -> tuple[bool, str]:
    """Download one PDF. Returns (ok, status). Only %PDF bytes count."""
    url = rec.get("pdf_url")
    if not url:
        return False, "no_url"
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", f"{rec['source']}_{rec['source_id']}")[:110]
    dest = pdf_dir / f"{safe}.pdf"
    if dest.exists() and dest.stat().st_size >= MIN_PDF_BYTES:
        rec["pdf_path"] = str(dest)
        rec["sha256"] = hashlib.sha256(dest.read_bytes()).hexdigest()
        return True, "exists"
    raw = _get(url, timeout=75)
    if not raw:
        return False, "fetch_failed"
    if not raw.startswith(b"%PDF"):
        return False, f"not_pdf:{raw[:4]!r}"
    if len(raw) < MIN_PDF_BYTES:
        return False, "too_small"
    dest.write_bytes(raw)
    rec["pdf_path"] = str(dest)
    rec["sha256"] = hashlib.sha256(raw).hexdigest()
    rec["pdf_bytes"] = len(raw)
    return True, "downloaded"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--target-pdfs", type=int, default=500)
    ap.add_argument("--max-seconds", type=int, default=480)
    ap.add_argument("--max-attempts", type=int, default=3000)
    ap.add_argument("--openalex-pages", type=int, default=2,
                    help="cursor pages per query per invocation (200/page)")
    ap.add_argument("--no-arxiv", action="store_true")
    args = ap.parse_args(argv)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pdf_dir = out / "pdfs"
    pdf_dir.mkdir(exist_ok=True)
    manifest = out / "manifest.jsonl"
    progress_path = out / "progress.json"
    attempts_log = out / "download_attempts.jsonl"

    # ---- resume state -----------------------------------------------------
    seen: set[str] = set()
    if manifest.exists():
        for line in manifest.read_text(encoding="utf-8").splitlines():
            try:
                seen.add(json.loads(line)["source_id"])
            except Exception:
                continue
    have_pdfs = sum(1 for _ in pdf_dir.glob("*.pdf"))

    started = time.time()
    stats = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "target_pdfs": args.target_pdfs,
        "pdfs_at_start": have_pdfs,
        "records_at_start": len(seen),
        "new_records": 0,
        "attempts": 0,
        "pdf_ok": 0,
        "pdf_fail": 0,
        "kaggle": "BLOCKED: no ~/.kaggle/kaggle.json",
        "by_source": {},
        "stop_reason": "",
    }

    def write_progress() -> None:
        stats["elapsed_s"] = round(time.time() - started, 1)
        stats["pdfs_total_now"] = have_pdfs + stats["pdf_ok"]
        progress_path.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    def budget_left() -> bool:
        return (stats["pdf_ok"] < args.target_pdfs
                and stats["attempts"] < args.max_attempts
                and (time.time() - started) < args.max_seconds)

    prov: list[str] = [
        f"=== overnight harvest {datetime.now(timezone.utc).isoformat()} ===",
        f"target_pdfs={args.target_pdfs} resume_pdfs={have_pdfs} resume_records={len(seen)}",
    ]

    with manifest.open("a", encoding="utf-8") as fh, \
         attempts_log.open("a", encoding="utf-8") as alog:

        def process(recs: list[dict]) -> None:
            for r in recs:
                if not budget_left():
                    return
                sid = r.get("source_id")
                if not sid or sid in seen:
                    continue
                seen.add(sid)

                if r.get("pdf_url") and stats["attempts"] < args.max_attempts:
                    stats["attempts"] += 1
                    ok, status = download_pdf(r, pdf_dir)
                    alog.write(json.dumps({
                        "source_id": sid, "source": r["source"],
                        "status": status, "ok": ok,
                        "url": r.get("pdf_url"),
                        "at": datetime.now(timezone.utc).isoformat(),
                    }, ensure_ascii=False) + "\n")
                    if ok:
                        stats["pdf_ok"] += 1
                        stats["by_source"][r["source"]] = stats["by_source"].get(r["source"], 0) + 1
                    else:
                        stats["pdf_fail"] += 1

                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                stats["new_records"] += 1
            fh.flush()

        for tag, query in QUERIES:
            if not budget_left():
                break
            print(f"[{tag}] {query}", flush=True)

            # --- OpenAlex deep paging --------------------------------------
            cursor = "*"
            for page_i in range(args.openalex_pages):
                if not budget_left():
                    break
                recs, cursor = openalex_page(query, cursor)
                if not recs:
                    break
                process(recs)
                write_progress()
                print(f"    openalex page {page_i + 1}: {len(recs)} recs | "
                      f"pdf_ok={stats['pdf_ok']} fail={stats['pdf_fail']}", flush=True)
                if not cursor:
                    break
                time.sleep(0.25)

            # --- arXiv ----------------------------------------------------
            if not args.no_arxiv and budget_left():
                recs = arxiv_page(query, 0, 100)
                if recs:
                    process(recs)
                    write_progress()
                    print(f"    arxiv: {len(recs)} recs | pdf_ok={stats['pdf_ok']}", flush=True)
                time.sleep(0.5)

            prov.append(f"  {tag} | {query} | pdf_ok={stats['pdf_ok']} attempts={stats['attempts']}")

    stats["stop_reason"] = (
        "target_reached" if stats["pdf_ok"] >= args.target_pdfs else
        "attempt_cap" if stats["attempts"] >= args.max_attempts else
        "time_cap" if (time.time() - started) >= args.max_seconds else
        "queries_exhausted"
    )
    write_progress()

    with (out / "PROVENANCE.txt").open("a", encoding="utf-8") as ph:
        ph.write("\n".join(prov) + "\n")

    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
