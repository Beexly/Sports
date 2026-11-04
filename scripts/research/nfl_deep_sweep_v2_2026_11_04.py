"""Deep NFL domain sweep v2 — arXiv + OpenAlex with 429 backoff and resume.

Fixes over v1:
  * HTTPS instead of HTTP (arXiv redirects/blocks plain HTTP)
  * Explicit 429 detection with exponential backoff (30/60/120/240s)
  * Shared rate limiter: >=3.5s between arXiv calls, >=1.5s between OpenAlex
  * Resumable: skips clusters already present in the output files
  * Per-cluster failure isolation: one 429 does not abort the sweep
"""
import json, os, time, urllib.request, urllib.parse, urllib.error
from datetime import datetime, timezone
import xml.etree.ElementTree as ET

OUT_AX = r"C:\c\wt-week8-forensic\data\research\arxiv_nfl_2026_11_04.jsonl"
OUT_OA = r"C:\c\wt-week8-forensic\data\research\openalex_nfl_2026_11_04.jsonl"
MAILTO = "gse-research@example.com"

AX_MIN_INTERVAL = 3.5
OA_MIN_INTERVAL = 1.5
BACKOFF = [30, 60, 120, 240]
MAX_RETRIES = 4

AX = [
 ("coverage_shells", 'abs:"cover 2" OR abs:"cover 3" OR abs:"Tampa 2" OR abs:"quarters coverage" OR abs:"cover 1"'),
 ("route_concepts", 'abs:"route concept" OR abs:"route running" OR abs:"pass pattern" OR abs:"receiving route"'),
 ("pass_block", 'abs:"pass block" OR abs:"pass rush" OR abs:"offensive line" OR abs:"pressure rate"'),
 ("fourth_down", 'abs:"fourth down" OR abs:"punt decision" OR abs:"go for it" OR abs:"two point conversion"'),
 ("clock_mgmt", 'abs:"clock management" OR abs:"two minute drill" OR abs:"timeout" AND abs:football'),
 ("red_zone", 'abs:"red zone" AND abs:football'),
 ("special_teams", 'abs:punting OR abs:"field position" OR abs:"kick return"'),
 ("qb_epa", 'abs:"expected points" OR abs:EPA AND abs:quarterback'),
 ("play_action", 'abs:"play action" OR abs:"play-action" OR abs:"run pass option" OR abs:"RPO"'),
 ("defensive_scheme", 'abs:"defensive scheme" OR abs:"blitz" OR abs:"man coverage" OR abs:"zone coverage"'),
 ("salary_contract", 'abs:"salary cap" OR abs:"contract" AND abs:player AND abs:football'),
 ("travel_rest", 'abs:"travel" AND abs:athlete AND abs:performance OR abs:"jet lag" AND abs:sport'),
 ("weather", 'abs:weather AND abs:football AND abs:performance'),
 ("off_field", 'abs:"off-field" OR abs:"free agency" OR abs:"team chemistry"'),
 ("decision_theory", 'abs:"decision theory" AND (abs:sport OR abs:coaching OR abs:strategy)'),
 ("optimal_stopping", 'abs:"optimal stopping" AND (abs:sport OR abs:betting OR abs:trading)'),
 ("hidden_markov", 'abs:"hidden Markov" AND (abs:sport OR abs:football OR abs:player)'),
 ("gaussian_process", 'abs:"Gaussian process" AND (abs:sport OR abs:forecasting OR abs:trajectory)'),
 ("variational", 'abs:"variational inference" AND (abs:sport OR abs:forecasting)'),
 ("information_theory", 'abs:"information theory" AND (abs:sport OR abs:betting OR abs:market)'),
]

OA = [
 ("nfl_scheme", "American football defensive scheme coverage"),
 ("nfl_clock", "football clock management game theory"),
 ("nfl_draft", "NFL draft pick value evaluation"),
 ("nfl_salary", "NFL salary cap contract valuation"),
 ("nfl_injury", "NFL injury risk workload"),
 ("sports_weather", "weather effects outdoor sports performance"),
 ("sports_travel", "travel fatigue athletic performance"),
 ("decision_uncertainty", "decision making under uncertainty sports"),
 ("bayesian_hier", "Bayesian hierarchical model sports"),
 ("player_aging", "athlete aging performance decline curve"),
]

_last_ax = 0.0
_last_oa = 0.0


def _throttle(last, min_interval):
    wait = min_interval - (time.time() - last)
    if wait > 0:
        time.sleep(wait)
    return time.time()


def _fetch(url, timeout=60):
    """GET with 429-aware exponential backoff. Returns bytes or raises."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GSE-research/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < MAX_RETRIES:
                delay = BACKOFF[min(attempt, len(BACKOFF) - 1)]
                print(f"    429 -> backoff {delay}s (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(delay)
                continue
            raise
    raise RuntimeError("unreachable")


def arxiv(q, n=35):
    global _last_ax
    _last_ax = _throttle(_last_ax, AX_MIN_INTERVAL)
    url = "https://export.arxiv.org/api/query?" + urllib.parse.urlencode({
        "search_query": q, "start": 0, "max_results": n,
        "sortBy": "relevance", "sortOrder": "descending"})
    root = ET.fromstring(_fetch(url))
    ns = {"a": "http://www.w3.org/2005/Atom"}
    out = []
    for e in root.findall("a:entry", ns):
        t = " ".join((e.findtext("a:title", "", ns) or "").split())
        if not t:
            continue
        aid = (e.findtext("a:id", "", ns) or "").rsplit("/", 1)[-1]
        out.append({
            "source": "arxiv", "source_id": aid, "arxiv_id": aid, "title": t,
            "year": int((e.findtext("a:published", "", ns) or "2026")[:4]),
            "venue": "arXiv",
            "authors": [a.findtext("a:name", "", ns) for a in e.findall("a:author", ns)][:6],
            "cited_by": 0, "url": e.findtext("a:id", "", ns) or "", "pdf_url": "",
            "abstract": " ".join((e.findtext("a:summary", "", ns) or "").split())[:4000],
            "topics": [x.get("term", "") for x in e.findall("a:category", ns)][:5],
            "query": q, "retrieved_at": datetime.now(timezone.utc).isoformat(),
        })
    return out


def oa(q, n=40):
    global _last_oa
    _last_oa = _throttle(_last_oa, OA_MIN_INTERVAL)
    url = "https://api.openalex.org/works?" + urllib.parse.urlencode({
        "search": q, "per-page": n, "sort": "relevance_score:desc", "mailto": MAILTO})
    d = json.loads(_fetch(url))
    out = []
    for w in d.get("results", []):
        t = (w.get("title") or "").strip()
        if not t:
            continue
        inv = w.get("abstract_inverted_index")
        ab = ""
        if inv:
            pos = []
            for wd, idxs in inv.items():
                for i in idxs:
                    pos.append((i, wd))
            pos.sort()
            ab = " ".join(x for _, x in pos)
        loc = w.get("primary_location") or {}
        out.append({
            "source": "openalex",
            "source_id": (w.get("id") or "").split("/")[-1],
            "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
            "title": t, "year": w.get("publication_year"),
            "venue": (loc.get("source") or {}).get("display_name", ""),
            "authors": [a.get("author", {}).get("display_name", "") for a in w.get("authorships", [])][:6],
            "cited_by": w.get("cited_by_count", 0),
            "url": w.get("doi") or w.get("id") or "",
            "pdf_url": loc.get("pdf_url") or "", "abstract": ab[:4000],
            "topics": [c.get("display_name", "") for c in (w.get("concepts") or [])][:5],
            "query": q, "retrieved_at": datetime.now(timezone.utc).isoformat(),
        })
    return out


def _done_clusters(path):
    """Clusters already written, so a re-run resumes instead of duplicating."""
    done = set()
    if not os.path.exists(path):
        return done
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                done.add(json.loads(line).get("cluster"))
            except Exception:
                pass
    return done


def run_arxiv():
    done = _done_clusters(OUT_AX)
    total = 0
    with open(OUT_AX, "a", encoding="utf-8") as fh:
        for tag, q in AX:
            if tag in done:
                print(f"  skip {tag} (already done)")
                continue
            try:
                recs = arxiv(q)
            except Exception as e:
                print(f"  AX ERR {tag}: {type(e).__name__} {str(e)[:80]}")
                continue
            for r in recs:
                r["cluster"] = tag
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
            fh.flush()
            total += len(recs)
            print(f"  arXiv {len(recs):3d}  {tag}")
    return total


def run_openalex():
    done = _done_clusters(OUT_OA)
    total = 0
    with open(OUT_OA, "a", encoding="utf-8") as fh:
        for tag, q in OA:
            if tag in done:
                print(f"  skip {tag} (already done)")
                continue
            try:
                recs = oa(q)
            except Exception as e:
                print(f"  OA ERR {tag}: {type(e).__name__} {str(e)[:80]}")
                continue
            for r in recs:
                r["cluster"] = tag
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
            fh.flush()
            total += len(recs)
            print(f"  OpenAlex {len(recs):3d}  {tag}")
    return total


if __name__ == "__main__":
    print("=== arXiv ===")
    t1 = run_arxiv()
    print("=== OpenAlex ===")
    t2 = run_openalex()
    print(f"\nTOTAL arXiv={t1} OpenAlex={t2}")
