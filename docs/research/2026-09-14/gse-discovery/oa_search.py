#!/usr/bin/env python3
"""OpenAlex literature probe. Usage: oa_search.py "query one" "query two" ...
Prints top hits per query: year | cites | title | source | doi | abstract snippet."""
import json, sys, time, urllib.parse, urllib.request

MAIL = "[EMAIL]"

def invert(idx):
    if not idx:
        return ""
    pos = {}
    for w, ps in idx.items():
        for p in ps:
            pos[p] = w
    return " ".join(pos[k] for k in sorted(pos))

def search(q, per=5):
    url = ("https://api.openalex.org/works?search=" + urllib.parse.quote(q) +
           f"&per_page={per}&sort=relevance_score:desc&mailto={MAIL}")
    req = urllib.request.Request(url, headers={"User-Agent": "grout-crew/1.0 (" + MAIL + ")"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode())

def main():
    for q in sys.argv[1:]:
        print("=" * 8, "QUERY:", q)
        try:
            d = search(q)
        except Exception as e:
            print("QUERY FAILED:", type(e).__name__, e)
            continue
        res = d.get("results", [])
        if not res:
            print("SEARCH_EMPTY")
        for w in res:
            src = ((w.get("primary_location") or {}).get("source") or {}).get("display_name")
            print(f"- {w.get('publication_year')} | cites={w.get('cited_by_count')} | {w.get('title')}")
            print(f"  src={src} | doi={w.get('doi')} | openalex={w.get('id')}")
            ab = invert(w.get("abstract_inverted_index"))[:500]
            if ab:
                print("  ABS:", ab)
        time.sleep(0.5)

if __name__ == "__main__":
    main()
