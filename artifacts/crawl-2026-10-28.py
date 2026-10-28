"""Crawl the hosts that publish no sitemap. BFS, same-host, bounded.

Uses the wall-clear for hosts that 403 plain curl, plain curl otherwise. This is
the block that was written off as "needs crawl-based discovery" and never done.
"""
import json, re, subprocess, sys
from collections import deque
from pathlib import Path
from urllib.parse import urljoin, urlparse

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36")
OUT = Path("C:/Users/Garrett/Sports/docs/data-sources/crawl")
RAW = Path("C:/Users/Garrett/Sports/artifacts/crawl")
WALLED = {"pro-football-reference.com", "theathletic.com", "pointsbet.com",
          "bet365.com", "oddsjam.com", "legalsportsreport.com"}
MAX_URLS, MAX_DEPTH = 400, 3
SKIP = re.compile(r"\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|pdf|zip|gz)(\?|$)", re.I)


def get(url, cap=600_000):
    if any(w in url for w in WALLED):
        try:
            sys.path.insert(0, "C:/Users/Garrett/Sports/intelligence")
            from ingestion import wall_clear as wc
            r = wc.fetch(url, max_solves=1, timeout=40)
            return r.text[:cap] if r.status_code == 200 else ""
        except Exception:
            return ""
    r = subprocess.run(["curl", "-s", "-A", UA, "--max-time", "25", "-L",
                        "--max-filesize", str(cap), url],
                       capture_output=True, text=True, errors="replace")
    return r.stdout or ""


def crawl(host):
    seen, found, titles = set(), [], []
    seeds = [f"https://{host}/"] + [f"https://{host}{x}" for x in
             ("/years/", "/teams/", "/players/", "/stats/", "/nfl/", "/odds/", "/rankings/")]
    q = deque((u, 0) for u in seeds)
    while q and len(seen) < MAX_URLS:
        url, d = q.popleft()
        if url in seen:
            continue
        seen.add(url)
        html = get(url)
        if not html:
            continue
        t = re.search(r"<title[^>]*>(.{0,140}?)</title>", html, re.S | re.I)
        if t:
            titles.append((url, t.group(1).strip()))
        found.append(url)
        if d >= MAX_DEPTH:
            continue
        for href in re.findall(r"""href=["']([^"'#]+)["']""", html, re.I):
            u = urljoin(url, href)
            p = urlparse(u)
            if p.netloc.replace("www.", "") != host.replace("www.", ""):
                continue
            if SKIP.search(u) or u in seen:
                continue
            q.append((u.split("#")[0], d + 1))
    return found, titles


if __name__ == "__main__":
    hosts = json.load(open(sys.argv[1]))
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    for host in hosts:
        f = OUT / f"{host}.md"
        if f.exists() and "--force" not in sys.argv:
            print(f"skip {host}", flush=True); continue
        try:
            found, titles = crawl(host)
        except Exception as e:
            found, titles = [], [(f"ERROR {type(e).__name__}", str(e)[:100])]
        (RAW / f"{host}.txt").write_text("\n".join(found), encoding="utf-8")
        seg = {}
        for u in found:
            parts = [x for x in urlparse(u).path.split("/") if x]
            k = parts[0] if parts else "(root)"
            seg[k] = seg.get(k, 0) + 1
        L = [f"# {host} — crawl", "", f"URLs reached: **{len(found)}**", "",
             "## Path segments", "", "| Segment | URLs |", "|---|---|"]
        L += [f"| `/{k}` | {n} |" for k, n in sorted(seg.items(), key=lambda x: -x[1])[:40]]
        L += ["", "## Pages", "", "| URL | Title |", "|---|---|"]
        L += [f"| `{u}` | {t[:80]} |" for u, t in titles[:120]]
        f.write_text("\n".join(L), encoding="utf-8")
        print(f"{host:34s} urls={len(found)}", flush=True)
