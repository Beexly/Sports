#!/usr/bin/env python3
"""Stage the 2026-11-05 full-corpus mind feed as trainer-ready JSONL.

One record per source item, built from the item's own text and links. No
summaries are invented: `text` is the cleaned source block, truncated with an
explicit marker, and every record carries file + section provenance.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DL = Path(r"C:\Users\Garrett\Downloads")
OUT = ROOT / "data" / "mind_staging" / "mind_2026_11_05_full_corpus.jsonl"
MANIFEST = ROOT / "data" / "mind_staging" / "mind_2026_11_05_manifest.json"
STAGED_AT = "2026-11-05"
MAX_TEXT = 2000

SOURCES = [
    ("index-batch-3", DL / "INDEX-BATCH-3.md", "h3"),
    ("gap-hunt", DL / "GAP-HUNT-2026-11-05.md", "tables"),
    ("repo-catalog", DL / "REPO-CATALOG.md", "h3"),
    ("ig-am-sweep", DL / "2026-11-05-AM.md", "h3"),
    ("x-am-sweep", DL / "2026-11-05-AM (1).md", "h2"),
    ("x-pm-sweep", DL / "2026-11-04-PM.md", "h2"),
]

SKIP_HEADINGS = re.compile(r"^(health / availability|appendix|sources|method|note|summary|index)", re.I)


def clean(text: str) -> str:
    t = re.sub(r"\n{3,}", "\n\n", text).strip()
    if len(t) > MAX_TEXT:
        t = t[:MAX_TEXT].rstrip() + "\n[TRUNCATED_AT_2000_CHARS]"
    return t


def urls_in(text: str) -> list[str]:
    return sorted(set(re.findall(r"https?://[^\s)\]>\"']+", text)))[:12]


def split_blocks(text: str, pattern: str) -> list[tuple[str, str]]:
    rx = re.compile(pattern, re.M)
    hits = list(rx.finditer(text))
    out = []
    for i, m in enumerate(hits):
        title = m.group(1).strip()
        start = m.end()
        end = hits[i + 1].start() if i + 1 < len(hits) else len(text)
        body = text[start:end].strip()
        out.append((title, body))
    return out


def parse_tables(text: str) -> list[tuple[str, str]]:
    """CLOSED + LOCATED markdown tables -> one record per data row."""
    items = []
    for section in ("CLOSED", "LOCATED"):
        m = re.search(rf"^## {section}.*$", text, re.M)
        if not m:
            continue
        rest = text[m.end():]
        nxt = re.search(r"^## ", rest, re.M)
        block = rest[: nxt.start()] if nxt else rest
        rows = [ln for ln in block.splitlines() if ln.strip().startswith("|")]
        for ln in rows:
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            if len(cells) < 2 or set(cells[0]) <= {"-", ":"} or cells[0].lower() in {"#", "gap"}:
                continue
            title = f"{section}: {cells[1]}"
            items.append((title, " | ".join(cells[2:]) if len(cells) > 2 else ln))
    return items


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def build_records() -> tuple[list[dict], dict]:
    records: list[dict] = []
    counts: dict[str, dict] = {}
    for corpus, path, mode in SOURCES:
        text = path.read_text(encoding="utf-8", errors="replace")
        if mode == "tables":
            items = parse_tables(text)
        elif mode == "h3":
            items = split_blocks(text, r"^### (.+)$")
        else:
            items = [x for x in split_blocks(text, r"^## (.+)$") if not SKIP_HEADINGS.match(x[0])]
        file_sha = sha(path)
        for idx, (title, body) in enumerate(items, start=1):
            records.append({
                "id": f"gse-mind-2026-11-05-{corpus}-{idx:03d}",
                "corpus": corpus,
                "source_file": str(path),
                "source_sha256_16": file_sha,
                "section": title,
                "title": title,
                "text": clean(body),
                "urls": urls_in(body),
                "kind": "source_item",
                "provenance": "file",
                "staged_at": STAGED_AT,
                "trainer_ready": True,
            })
        counts[corpus] = {"path": str(path), "records": len(items), "sha256_16": file_sha}
    return records, counts


def appendix_b_records() -> list[dict]:
    """IG AM Appendix B: 8 captioned bullets + 10 context-grade handles (18 total)."""
    text = (DL / "2026-11-05-AM.md").read_text(encoding="utf-8", errors="replace")
    m = re.search(r"^## APPENDIX B.*$", text, re.M)
    if not m:
        return []
    rest = text[m.end():]
    nxt = re.search(r"^## ", rest, re.M)
    block = rest[: nxt.start()] if nxt else rest
    out = []
    bullets = re.findall(r"^- \*\*(@[^ ]+) ([A-Za-z0-9_-]+) — (.+?)\*\*(.*)$", block, re.M)
    for i, (handle, code, title, body) in enumerate(bullets, start=1):
        out.append({
            "id": f"gse-mind-2026-11-05-ig-am-sweep-appb-{i:02d}",
            "corpus": "ig-am-sweep",
            "source_file": str(DL / "2026-11-05-AM.md"),
            "source_sha256_16": sha(DL / "2026-11-05-AM.md"),
            "section": f"APPENDIX B: {handle} {code} — {title}",
            "title": f"{handle} {code} — {title}",
            "text": clean(body.strip()),
            "urls": urls_in(body),
            "kind": "appendix_item",
            "provenance": "file",
            "staged_at": STAGED_AT,
            "trainer_ready": True,
        })
    inline = re.findall(r"(@[A-Za-z0-9_.]+) ([A-Za-z0-9_-]{8,})", block)
    seen = {b[0] for b in bullets}
    extra = [(h, c) for h, c in inline if h not in seen][:10]
    for j, (handle, code) in enumerate(extra, start=len(out) + 1):
        out.append({
            "id": f"gse-mind-2026-11-05-ig-am-sweep-appb-{j:02d}",
            "corpus": "ig-am-sweep",
            "source_file": str(DL / "2026-11-05-AM.md"),
            "source_sha256_16": sha(DL / "2026-11-05-AM.md"),
            "section": f"APPENDIX B context-grade: {handle} {code}",
            "title": f"{handle} {code}",
            "text": "Context-grade feed item: handle and post code only; full caption on file in raw/2026-11-05-AM/.",
            "urls": [],
            "kind": "appendix_context_item",
            "provenance": "file",
            "staged_at": STAGED_AT,
            "trainer_ready": True,
        })
    return out


def nvidia_records() -> list[dict]:
    docs = [
        ("TensorRT-LLM Post-Training Quantization", "https://developer.nvidia.com/blog/optimizing-llms-for-performance-and-accuracy-with-post-training-quantization/", "PTQ for LLM inference accuracy/perf tradeoffs"),
        ("NVIDIA Run:ai GPU Fractioning + NIM Enterprise Reference Architecture", "https://developer.nvidia.com/blog/unlock-massive-token-throughput-with-gpu-fractioning-in-nvidia-runai/", "GPU fractioning, NIM-Service/NIM-Cache/NGC, 2-4-3-200 topology with B3220 DPU, B3140H SuperNIC, NVLink Bridge"),
        ("NVIDIA Blackwell SemiAnalysis InferenceMAX Benchmarks", "https://developer.nvidia.com/blog/nvidia-blackwell-leads-on-new-semianalysis-inferencemax-benchmarks/", "Blackwell inference throughput benchmarks"),
        ("NCCL Multi-GPU Collective Communications", "https://developer.nvidia.com/nccl", "Collective comms library for multi-GPU training/inference"),
        ("Spark 3.0 + RAPIDS XGBoost GPU Training", "https://developer.nvidia.com/blog/accelerating-spark-3-0-and-xgboost-end-to-end-training-and-hyperparameter-tuning/", "End-to-end GPU training and hyperparameter tuning"),
        ("NVIDIA Merlin HugeCTR", "https://developer.nvidia.com/nvidia-merlin/hugectr", "GPU-accelerated recommender training framework"),
        ("NVIDIA DLI and GTC sessions", "https://developer.nvidia.com/dli", "DLI+L-FX-18+V2, data engineering pipelines, NLP; ON24 5194008/4936973/4848151; GTC gtcspring21-E32337, gtcfall21-A31177, gtcspring21-S31554"),
    ]
    out = []
    for i, (title, url, desc) in enumerate(docs, start=1):
        out.append({
            "id": f"gse-mind-2026-11-05-nvidia-{i:03d}",
            "corpus": "nvidia-inception-stack",
            "source_file": "directive 2026-11-05",
            "source_sha256_16": None,
            "section": title,
            "title": title,
            "text": desc,
            "urls": [url],
            "kind": "technical_reference",
            "provenance": "directive",
            "staged_at": STAGED_AT,
            "trainer_ready": True,
        })
    return out


def openalex_records() -> list[dict]:
    ids_file = ROOT / "data" / "research" / "openalex_user_drop_2026_11_05.txt"
    ids = [x.strip() for x in ids_file.read_text().splitlines() if x.strip()]
    out = []
    for i, wid in enumerate(ids, start=1):
        url = f"https://api.openalex.org/works/{wid}"
        proc = subprocess.run(["curl", "-sS", "--max-time", "25", url], capture_output=True, text=True, encoding="utf-8", errors="replace")
        try:
            d = json.loads(proc.stdout)
        except Exception:
            d = {}
        abstract = ""
        inv = d.get("abstract_inverted_index") or {}
        if inv:
            pos = {}
            for word, idxs in inv.items():
                for p in idxs:
                    pos[p] = word
            abstract = " ".join(pos[k] for k in sorted(pos))
        out.append({
            "id": f"gse-mind-2026-11-05-openalex-{i:03d}",
            "corpus": "openalex-user-drop",
            "source_file": str(ids_file),
            "source_sha256_16": sha(ids_file),
            "section": wid,
            "title": d.get("title") or wid,
            "text": clean(abstract) if abstract else "[metadata only: no abstract returned]",
            "urls": [d.get("doi") or url],
            "kind": "scholarly_work",
            "year": d.get("publication_year"),
            "cited_by_count": d.get("cited_by_count"),
            "provenance": "openalex_api",
            "staged_at": STAGED_AT,
            "trainer_ready": True,
        })
    return out


def pdf_pointers() -> tuple[list[dict], dict]:
    api = "https://api.github.com/repos/saiemgilani/Sports-Research-Papers/git/trees/HEAD?recursive=1"
    proc = subprocess.run(["curl", "-sS", "--max-time", "45", api], capture_output=True, text=True, encoding="utf-8", errors="replace")
    try:
        tree = json.loads(proc.stdout).get("tree", [])
    except Exception:
        tree = []
    pdfs = [t["path"] for t in tree if t.get("type") == "blob" and t["path"].lower().endswith(".pdf")]
    out = []
    for i, path in enumerate(pdfs, start=1):
        out.append({
            "id": f"gse-mind-2026-11-05-srp-pdf-{i:04d}",
            "corpus": "repo-catalog-877-pdfs",
            "source_file": "saiemgilani/Sports-Research-Papers",
            "source_sha256_16": None,
            "section": path,
            "title": Path(path).stem,
            "text": f"PDF pointer: https://github.com/saiemgilani/Sports-Research-Papers/blob/HEAD/{path}",
            "urls": [f"https://github.com/saiemgilani/Sports-Research-Papers/blob/HEAD/{path}"],
            "kind": "pdf_pointer",
            "provenance": "github_tree_api",
            "staged_at": STAGED_AT,
            "trainer_ready": True,
        })
    return out, {"pdfs_found": len(pdfs), "api_ok": bool(pdfs)}


def main() -> dict:
    base, counts = build_records()
    nv = nvidia_records()
    oa = openalex_records()
    pdfs, pdf_meta = pdf_pointers()
    all_records = base + appendix_b_records() + nv + oa + pdfs
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as fh:
        for r in all_records:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    expected = {
        "index-batch-3": 63, "gap-hunt": 27, "repo-catalog": 21,
        "ig-am-sweep": 38, "x-am-sweep": 30, "x-pm-sweep": 29,
        "nvidia-inception-stack": 7, "openalex-user-drop": 13,
    }
    corpus_counts = {c: sum(1 for r in all_records if r["corpus"] == c) for c in {r["corpus"] for r in all_records}}
    manifest = {
        "schema": "mind_staging_manifest_v1",
        "generated_at": STAGED_AT,
        "output": str(OUT.relative_to(ROOT)),
        "total_records": len(all_records),
        "corpus_counts": corpus_counts,
        "expected": expected,
        "shortfalls": {k: expected[k] - corpus_counts.get(k, 0) for k in expected if corpus_counts.get(k, 0) != expected[k]},
        "sources": counts,
        "pdf_pointers": pdf_meta,
        "batch4": "NO SOURCE FILE ON DISK: the 67-item / 74-link Batch 4 drop is not present in Downloads or any paste; not staged, not invented.",
        "single_writer_rule": "brain/mind.jsonl untouched; staging only.",
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=1))
    return manifest


if __name__ == "__main__":
    main()
