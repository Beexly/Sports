#!/usr/bin/env python3
"""JEV arXiv mill - retrieval phase. Real arXiv API only; every ID in output came from the API.
Usage: python jev_fetch.py part1|part2|ids
Writes raw results to data/jev_raw_<part>.json
"""
import json, os, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

BASE = "http://export.arxiv.org/api/query"
NS = {"a": "http://www.w3.org/2005/Atom", "os": "http://a9.com/-/spec/opensearch/1.1/"}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# Rewritten queries (founder list rewritten per spec + author/title seeds + ADD list)
QUERIES = {
 # -- conformal core (title-seeds)
 "jackknife+": 'all:"jackknife+" OR all:"jackknife plus"',
 "cv+": 'all:"CV+" AND all:conformal',
 "cross-conformal": 'all:"cross-conformal"',
 "split-conformal": 'all:"split conformal" OR all:"inductive conformal"',
 "full-conformal": 'all:"full conformal" OR all:"transductive conformal"',
 "mondrian": 'all:"Mondrian conformal"',
 "conformalized-quantile": 'all:"conformalized quantile"',
 "adaptive-conformal": 'all:"adaptive conformal inference" OR all:"adaptive conformal"',
 "covariate-shift": 'all:"conformal prediction" AND all:"covariate shift"',
 "nonexchangeable": 'all:"non-exchangeable" AND all:conformal',
 "venn-abers": 'all:"Venn-Abers"',
 "dtaci": 'all:DtACI OR all:"distribution-free time-series conformal"',
 # -- author seeds (protocol 3.A.1)
 "au-vovk": 'au:Vovk AND all:conformal',
 "au-romano": 'au:Romano AND all:conformal',
 "au-barber": 'au:Barber AND all:conformal AND cat:stat.*',
 "au-gibbs": 'au:Gibbs AND all:conformal AND all:adaptive',
 "au-petej": 'au:Petej',
 "au-angelopoulos": 'au:Angelopoulos AND all:conformal',
 "au-zaffran": 'au:Zaffran',
 # -- quantile / forecasting
 "additive-quantile": 'all:"quantile regression" AND (all:Fasiolo OR all:Wood OR all:Koenker)',
 "qgam": 'all:qgam',
 "brier": 'all:Brier AND (all:sport OR all:forecast OR all:calibration)',
 "wilson": 'all:"Wilson score" AND (all:binomial OR all:proportion)',
 # -- betting economics
 "parlay": 'all:parlay AND (all:betting OR all:sport OR all:correlation)',
 "kelly": 'all:Kelly AND (all:sport OR all:betting)',
 "pinnacle": 'all:Pinnacle AND (all:betting OR all:odds OR all:closing)',
 "closing-line": 'all:"betting market" AND (all:efficiency OR all:"closing")',
 "bookies": 'all:bookies AND (all:betting OR all:odds)',
 # -- sports modeling
 "skellam": 'all:Skellam AND (all:football OR all:soccer OR all:goals)',
 "dixon-coles": 'all:"Dixon-Coles"',
 "nfl-prediction": '(all:NFL OR all:"american football") AND (all:prediction OR all:betting OR all:Elo OR all:calibration)',
 "ncaaf": 'all:"college football" AND (all:prediction OR all:ranking OR all:betting)',
 "soccer-goals": 'all:soccer AND all:goals AND (all:Poisson OR all:prediction OR all:calibration)',
 "wasserstein-sport": 'all:Wasserstein AND (all:sport OR all:football)',
 "intrinsic-dim": 'all:"intrinsic dimension" AND (all:"time series" OR all:entropy OR all:sport)',
 "dfa": 'all:"detrended fluctuation" AND (all:sport OR all:football)',
 "hedge-experts": 'all:"exponential weights" AND (all:aggregation OR all:Hedge)',
 "expert-aggregation": 'all:"prediction with expert advice"',
}
# protocol 3.A.3: newest-window query
NEWEST = ('all:"conformal prediction" AND (cat:stat.ME OR cat:stat.ML OR cat:cs.LG)')

PART1 = ["jackknife+","cv+","cross-conformal","split-conformal","full-conformal","mondrian",
         "conformalized-quantile","adaptive-conformal","covariate-shift","nonexchangeable",
         "venn-abers","dtaci","au-vovk","au-romano","au-barber","au-gibbs","au-petej",
         "au-angelopoulos","au-zaffran"]
PART2 = ["additive-quantile","qgam","brier","wilson","parlay","kelly","pinnacle","closing-line",
         "bookies","skellam","dixon-coles","nfl-prediction","ncaaf","soccer-goals",
         "wasserstein-sport","intrinsic-dim","dfa","hedge-experts","expert-aggregation"]
IDS = ["1905.02928","2503.01495","1707.03307","1710.02824","1211.4000","2109.07581","2306.01740","2607.14430"]

def fetch(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "jev-arxiv-mill/1.0 (research; contact: local)"})
            return urllib.request.urlopen(req, timeout=45).read()
        except Exception as e:
            if i == retries - 1:
                return None
            time.sleep(5)

def parse_atom(raw):
    if raw is None: return {"error": "fetch failed"}
    root = ET.fromstring(raw)
    total = root.find("os:totalResults", NS)
    out = {"total_results": int(total.text) if total is not None and total.text else None, "entries": []}
    for e in root.findall("a:entry", NS):
        eid = (e.findtext("a:id", "", NS) or "").split("/abs/")[-1]
        title = " ".join((e.findtext("a:title", "", NS) or "").split())
        authors = [a.findtext("a:name", "", NS) for a in e.findall("a:author", NS)]
        pub = e.findtext("a:published", "", NS)[:10]
        summ = " ".join((e.findtext("a:summary", "", NS) or "").split())[:900]
        pdf = next((l.get("href") for l in e.findall("a:link", NS) if l.get("title") == "pdf"), f"https://arxiv.org/pdf/{eid}")
        out["entries"].append({"arxiv_id": eid, "year": pub[:4], "title": title,
                               "authors": authors, "published": pub, "abstract": summ, "pdf_url": pdf})
    return out

def qfetch(label, query, maxr=12, sort="relevance"):
    params = {"search_query": query, "start": 0, "max_results": maxr,
              "sortBy": sort, "sortOrder": "descending"}
    url = BASE + "?" + urllib.parse.urlencode(params)
    return {"query_label": label, "query_string": query, **parse_atom(fetch(url))}

def main():
    os.makedirs(OUT, exist_ok=True)
    part = sys.argv[1] if len(sys.argv) > 1 else "part1"
    results = {}
    if part in ("part1", "part2"):
        labels = PART1 if part == "part1" else PART2
        for lbl in labels:
            results[lbl] = qfetch(lbl, QUERIES[lbl])
            tr = results[lbl].get("total_results")
            print(f"{lbl:22s} total={tr} fetched={len(results[lbl].get('entries', []))}", flush=True)
            time.sleep(3)
        if part == "part2":
            results["_newest200"] = qfetch("newest200-conformal", NEWEST, maxr=25, sort="submittedDate")
            print(f"{'newest200':22s} total={results['_newest200'].get('total_results')} fetched={len(results['_newest200'].get('entries', []))}", flush=True)
    elif part == "ids":
        url = BASE + "?" + urllib.parse.urlencode({"id_list": ",".join(IDS), "max_results": 20})
        results["must_open"] = parse_atom(fetch(url))
        got = {e["arxiv_id"] for e in results["must_open"].get("entries", [])}
        print("must-open fetched:", sorted(got))
        missing = [i for i in IDS if not any(i in g for g in got)]
        print("MISSING (404 or not on arXiv):", missing)
        results["ids_requested"] = IDS
        results["ids_missing"] = missing
        # title-rescue for missing per spec
        for mid in missing:
            pass  # filled after we know titles from spec (handled in rescue step)
    path = os.path.join(OUT, f"jev_raw_{part}.json")
    json.dump(results, open(path, "w", encoding="utf-8"), indent=1)
    print("wrote", path)

if __name__ == "__main__":
    main()
