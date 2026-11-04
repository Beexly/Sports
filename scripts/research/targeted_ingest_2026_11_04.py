
"""Targeted ingestion of 7 GSE-critical arXiv papers with full abstracts."""
import json, urllib.request, urllib.parse, xml.etree.ElementTree as ET, time
from datetime import datetime, timezone

OUT = r"C:\c\wt-week8-forensic\data\research\arxiv_targeted_2026_11_04.jsonl"
IDS = ['2602.23233','2505.11841','2603.17866','1704.00197','1802.00998','2407.08508','2409.04889']

url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode({
    "id_list": ",".join(IDS), "max_results": 20})
req = urllib.request.Request(url, headers={"User-Agent": "GSE-research/1.0"})
root = ET.fromstring(urllib.request.urlopen(req, timeout=90).read())
ns = {"a": "http://www.w3.org/2005/Atom"}

records = []
for e in root.findall("a:entry", ns):
    aid = (e.findtext("a:id", "", ns) or "").rsplit("/", 1)[-1]
    title = " ".join((e.findtext("a:title", "", ns) or "").split())
    if not title: continue
    records.append({
        "source": "arxiv",
        "source_id": aid,
        "arxiv_id": aid,
        "title": title,
        "year": int((e.findtext("a:published", "", ns) or "2026")[:4]),
        "venue": "arXiv",
        "authors": [a.findtext("a:name", "", ns) for a in e.findall("a:author", ns)][:8],
        "cited_by": 0,
        "url": e.findtext("a:id", "", ns) or "",
        "pdf_url": "https://arxiv.org/pdf/" + aid,
        "abstract": " ".join((e.findtext("a:summary", "", ns) or "").split())[:6000],
        "topics": [x.get("term", "") for x in e.findall("a:category", ns)][:6],
        "query": "targeted: GSE-critical causal/EP/winprob",
        "cluster": "gse_core",
        "priority": "high",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    })
    print("  OK", aid, title[:70])

with open(OUT, "a", encoding="utf-8") as f:
    for r in records:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
print("\nwrote %d records -> %s" % (len(records), OUT))

print("\n=== abstracts ===")
for r in records:
    print("\n### %s (%s)" % (r["title"], r["year"]))
    print(r["abstract"][:700])
