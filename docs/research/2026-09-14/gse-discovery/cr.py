#!/usr/bin/env python3
"""Crossref probe (independent second citation path). Usage: cr.py "query" ..."""
import json, sys, time, urllib.parse, urllib.request
MAIL = "[EMAIL]"
for q in sys.argv[1:]:
    print("==== ", q)
    url = ("https://api.crossref.org/works?query=" + urllib.parse.quote(q) +
           "&rows=4&select=title,container-title,issued,DOI,is-referenced-by-count&mailto=" + MAIL)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "grout-crew/1.0 (mailto:%s)" % MAIL})
        with urllib.request.urlopen(req, timeout=40) as r:
            d = json.loads(r.read().decode())
    except Exception as e:
        print("QUERY FAILED:", e); continue
    for it in d["message"]["items"]:
        t = (it.get("title") or [""])[0]
        c = (it.get("container-title") or [""])[0]
        yr = (it.get("issued", {}).get("date-parts") or [[None]])[0][0]
        print(f"- {yr} | {t} | {c} | https://doi.org/{it['DOI']} | cites={it.get('is-referenced-by-count')}")
    time.sleep(1.0)