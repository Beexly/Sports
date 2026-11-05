#!/usr/bin/env python3
"""Close the Batches 5-7 gap.

The handoff asserts 122 works but enumerates only the 8 operator source lines.
This script extracts every citation that is actually written down, resolves
arXiv and OpenAlex metadata, and stages one record per work. It never pads the
count to 122: the number staged is the number the document supports.
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
HANDOFF = ROOT / "docs" / "strategy" / "HERMES-HANDOFF-2026-11-05-MORNING-CORPUS-AND-TNF.md"
OUT = ROOT / "data" / "research" / "batches_5_7_works_2026_11_05.json"
UA = {"User-Agent": "GSE-research/1.0 (contact: research@galaxysportsedge.com)"}


def split_sources(src: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in src:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch in ",;" and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    out = []
    for p in parts:
        for q in re.split(r"\s+/\s+", p):
            q = q.strip().rstrip(".")
            if len(q) > 3 and q not in out:
                out.append(q)
    return out


def parse_handoff() -> tuple[list[dict], list[dict]]:
    s = HANDOFF.read_text(encoding="utf-8")
    i = s.index("## 4. BATCHES 5, 6 & 7")
    j = s.find("\n## ", i + 5)
    sec = s[i:j]
    blocks = re.split(r"\n\d+\.\s+\*\*`?(compute\w+)`?\*\*", sec)
    works, operators = [], []
    for k in range(1, len(blocks), 2):
        op, body = blocks[k], blocks[k + 1]
        title = re.search(r"\n\s*-\s+\*\*Sources:\*\*", body)
        operators.append({"operator": op})
        m = re.search(r"\*\*Sources:\*\*\s*(.+)", body)
        if not m:
            continue
        for entry in split_sources(m.group(1)):
            arx = re.search(r"(\d{4}\.\d{4,5})", entry)
            oa = re.search(r"\b(W\d{7,11})\b", entry)
            works.append({
                "cited_as": entry,
                "operator": op,
                "arxiv_id": arx.group(1) if arx else None,
                "openalex_id": oa.group(1) if oa else None,
            })
    # contributed datasets & contributors
    datasets = []
    for line in sec.splitlines():
        if line.startswith("- **") and any(k in line for k in ("Dataset", "Contributors", "Matchbook", "Glush")):
            datasets.append({"cited_as": re.sub(r"\*\*", "", line[2:]).strip(), "operator": None,
                             "arxiv_id": None, "openalex_id": None})
    return works, operators + datasets


def fetch_arxiv(ids: list[str]) -> dict:
    out = {}
    for chunk in [ids[i:i + 40] for i in range(0, len(ids), 40)]:
        url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode(
            {"id_list": ",".join(chunk), "max_results": len(chunk)})
        try:
            raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45).read()
        except Exception as e:  # noqa: BLE001
            print("arxiv fetch failed", e)
            continue
        ns = {"a": "http://www.w3.org/2005/Atom"}
        for entry in ET.fromstring(raw).findall("a:entry", ns):
            eid = entry.find("a:id", ns).text.rsplit("/abs/", 1)[-1].split("v")[0]
            out[eid] = {
                "title": " ".join(entry.find("a:title", ns).text.split()),
                "abstract": " ".join(entry.find("a:summary", ns).text.split()),
                "authors": [a.find("a:name", ns).text for a in entry.findall("a:author", ns)][:8],
                "published": entry.find("a:published", ns).text[:10],
            }
        time.sleep(1)
    return out


def fetch_openalex(ids: list[str]) -> dict:
    out = {}
    for wid in ids:
        try:
            req = urllib.request.Request(f"https://api.openalex.org/works/{wid}", headers=UA)
            d = json.loads(urllib.request.urlopen(req, timeout=30).read())
        except Exception as e:  # noqa: BLE001
            print("openalex miss", wid, e)
            continue
        inv = d.get("abstract_inverted_index") or {}
        words = []
        for w, pos in inv.items():
            for p in pos:
                words.append((p, w))
        abstract = " ".join(w for _, w in sorted(words))
        out[wid] = {
            "title": d.get("title") or d.get("display_name"),
            "abstract": abstract,
            "authors": [a["author"]["display_name"] for a in (d.get("authorships") or [])][:8],
            "published": str(d.get("publication_year") or ""),
        }
        time.sleep(0.12)
    return out


def main() -> dict:
    works, extras = parse_handoff()
    arx_ids = sorted({w["arxiv_id"] for w in works if w["arxiv_id"]})
    oa_ids = sorted({w["openalex_id"] for w in works if w["openalex_id"]})
    print("enumerated works", len(works), "extras", len(extras), "arxiv", len(arx_ids), "openalex", len(oa_ids))
    arx = fetch_arxiv(arx_ids)
    oa = fetch_openalex(oa_ids)
    for w in works:
        meta = arx.get(w["arxiv_id"] or "") or oa.get(w["openalex_id"] or "") or {}
        w["title"] = meta.get("title") or w["cited_as"]
        w["abstract"] = meta.get("abstract") or ""
        w["authors"] = meta.get("authors") or []
        w["published"] = meta.get("published") or ""
        w["resolved"] = bool(meta)
    payload = {
        "schema": "batches_5_7_works_v1",
        "generated_at": "2026-11-05",
        "handoff_claim": 122,
        "enumerated_works": len(works),
        "enumerated_extras": len(extras),
        "resolved_metadata": sum(1 for w in works if w["resolved"]),
        "disclosure": (
            "The handoff asserts 122 works but writes down only these source lines. "
            "Every citation that exists in the document is staged; the shortfall against 122 is disclosed, not padded."
        ),
        "works": works,
        "extras": extras,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("saved", OUT, "resolved", payload["resolved_metadata"])
    return payload


if __name__ == "__main__":
    main()
