#!/usr/bin/env python3
"""Stage the Batch 5 and Batch 6 manifests recovered from the 2026-10-25 session.

The 2026-11-05 handoff says "122 unique works" but never lists them. The actual
Batch 5 (14) and Batch 6 (35) ID lists exist in the earlier session's tool call.
This stages any of those 49 that are not already in the corpus, keyed by arXiv
id so a title collision cannot hide a missing work.
"""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "mind_staging" / "mind_2026_11_05_full_corpus.jsonl"
TARGETS = [
    OUT,
    ROOT / "data" / "mind_staging" / "mind_batch3_batch4_gaphunt_repocatalog_am_pm_2026_11_05.jsonl",
]

BATCH5 = ["2604.13861", "2310.03630", "2510.14723", "1807.09236", "1404.3312", "2610.31418",
          "2609.36787", "2609.26506", "2601.14727", "2609.18309", "2406.00437", "2608.01882",
          "2609.33664", "2609.34458"]
BATCH6 = ["2603.17866", "2606.18512", "2607.18394", "2606.18805", "2603.25901", "2511.04619",
          "2507.18422", "2507.06122", "2406.17220", "2506.03057", "2504.08747", "2405.20681",
          "2502.16313", "2406.17947", "2405.02100", "2410.00145", "2408.10867", "2309.00756",
          "2401.16392", "2402.10979", "2406.00168", "2306.03481", "2405.07226", "2208.00174",
          "2403.04146", "2608.07932", "2512.17446", "2512.01853", "2511.07250", "2506.02351",
          "2503.19355", "2406.12084", "2405.02715", "2404.00178", "2202.00583"]


def fetch(ids: list[str]) -> dict:
    out = {}
    for chunk in [ids[i:i + 40] for i in range(0, len(ids), 40)]:
        url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode(
            {"id_list": ",".join(chunk), "max_results": len(chunk)})
        req = urllib.request.Request(url, headers={"User-Agent": "GSE-research/1.0"})
        raw = urllib.request.urlopen(req, timeout=45).read()
        ns = {"a": "http://www.w3.org/2005/Atom"}
        for e in ET.fromstring(raw).findall("a:entry", ns):
            eid = e.find("a:id", ns).text.rsplit("/abs/", 1)[-1].split("v")[0]
            out[eid] = {
                "title": " ".join(e.find("a:title", ns).text.split()),
                "abstract": " ".join(e.find("a:summary", ns).text.split()),
                "authors": [a.find("a:name", ns).text for a in e.findall("a:author", ns)][:8],
                "published": e.find("a:published", ns).text[:10],
            }
        time.sleep(1)
    return out


def existing_ids(path: Path) -> set[str]:
    ids = set()
    if not path.exists():
        return ids
    for ln in path.read_text(encoding="utf-8").splitlines():
        if not ln.strip():
            continue
        r = json.loads(ln)
        aid = r.get("arxiv_id") or ""
        if not aid:
            m = re.search(r"(\d{4}\.\d{4,5})", json.dumps(r))
            aid = m.group(1) if m else ""
        if aid:
            ids.add(aid)
    return ids


def main() -> dict:
    have = existing_ids(OUT)
    todo = [i for i in dict.fromkeys(BATCH5 + BATCH6) if i not in have]
    print("manifest ids", len(BATCH5) + len(BATCH6) - 1, "already staged", len(have & set(BATCH5 + BATCH6)), "missing", len(todo))
    meta = fetch(todo)
    added = 0
    records = []
    for i, aid in enumerate(todo, 1):
        m = meta.get(aid)
        if not m:
            print("no metadata", aid)
            continue
        batch = "batch-5" if aid in BATCH5 else "batch-6"
        text = m["abstract"]
        records.append({
            "id": f"gse-mind-2026-11-05-{batch}-{i:03d}",
            "kind": "paper",
            "batch": batch,
            "source": "2026-10-25 session manifest",
            "title": m["title"],
            "authors": m["authors"],
            "year": m["published"],
            "arxiv_id": aid,
            "arxiv_id": aid,
            "url": f"https://arxiv.org/abs/{aid}",
            "text": text,
            "content_class": "full_text" if len(text) >= 200 else "short_text",
            "trainer_ready": len(text) >= 200,
        })
    for path in TARGETS:
        seen = existing_ids(path)
        with path.open("a", encoding="utf-8") as fh:
            for r in records:
                if r["arxiv_id"] in seen:
                    continue
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                seen.add(r["arxiv_id"])
                added += 1
    print("records", len(records), "appended to both files", added)
    return {"missing": len(todo), "records": len(records)}


if __name__ == "__main__":
    main()
