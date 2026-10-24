#!/usr/bin/env python3
"""
pull_entries.py — DK DFS entry-lineup enumerator (cookie-authenticated, resumable).
Usage:
  export DK_COOKIES="Cookie: string from logged-in browser"   # or --cookies-file
  python3 pull_entries.py --contest 123456789 --dg 43307 [--page-size 50] [--max-pages 500]
Behavior: pages leaderboardfull/v3, writes entries_{contest}.jsonl (resumable by page),
0.6s+ jitter pacing, backoff on 429/5xx, stops when an empty page arrives.
No auth bypass — uses the operator's own logged-in session cookie string.
"""
import argparse, json, os, random, sys, time
import urllib.request

BASE = "https://www.draftkings.com"
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")

def fetch(url, cookie):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Cookie": cookie, "Accept": "application/json,text/html",
        "Referer": f"{BASE}/draft"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.status, r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt + random.random()); continue
            return e.code, e.read().decode("utf-8", "replace")[:500]
        except Exception as e:
            if attempt < 3: time.sleep(1.5); continue
            return 0, str(e)

def parse_page(body):
    """Extract entries from leaderboardfull v3 JSON (or HTML-embedded fallback)."""
    try:
        d = json.loads(body)
        rows = d.get("leaderBoard") or d.get("entries") or d.get("LeaderBoard") or []
        out = []
        for e in rows:
            if not isinstance(e, dict): continue
            lu = e.get("lineup") or e.get("Lineup") or []
            pids = []
            for item in lu:
                if isinstance(item, dict):
                    pids.append(item.get("playerId") or item.get("P playerId") or item.get("pid"))
                elif isinstance(item, (int, str)):
                    pids.append(item)
            out.append({"entry_id": e.get("entryId") or e.get("EntryKey") or e.get("id"),
                        "user": e.get("userName") or e.get("UserName"),
                        "rank": e.get("rank") or e.get("Rank"),
                        "points": e.get("points") or e.get("Points"),
                        "lineup": pids})
        return out, "json"
    except json.JSONDecodeError:
        # HTML fallback: extract embedded JSON blobs containing lineups
        import re
        pids = re.findall(r'"lineup"\s*:\s*\[([^\]]+)\]', body)
        out = []
        for i, blob in enumerate(pids):
            nums = re.findall(r'\d+', blob)
            out.append({"entry_id": f"html_{i}", "lineup": nums})
        return out, "html"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--contest", required=True)
    ap.add_argument("--dg", default=None)
    ap.add_argument("--page-size", type=int, default=50)
    ap.add_argument("--max-pages", type=int, default=500)
    ap.add_argument("--cookies-file", default=None)
    args = ap.parse_args()
    cookie = os.environ.get("DK_COOKIES", "")
    if args.cookies_file:
        cookie = open(args.cookies_file).read().strip()
    if not cookie:
        print("FATAL: no cookies. Export from a logged-in browser (get_cookies) and set DK_COOKIES.")
        sys.exit(2)
    out_path = f"entries_{args.contest}.jsonl"
    done_pages = set()
    if os.path.exists(out_path):
        for line in open(out_path):
            try:
                done_pages.add(json.loads(line).get("_page"))
            except Exception: pass
    total = 0
    for page in range(1, args.max_pages + 1):
        if page in done_pages: continue
        url = (f"{BASE}/contest/leaderboardfull/v3/contest/{args.contest}"
               f"?page={page}&pageSize={args.page_size}")
        st, body = fetch(url, cookie)
        entries, kind = parse_page(body)
        print(f"page {page}: HTTP {st} [{kind}] {len(entries)} entries", flush=True)
        if st != 200 or not entries:
            if st in (401, 403):
                print("FATAL: session expired — re-export cookies."); sys.exit(3)
            if st == 200 and not entries:
                print("empty page -> done."); break
            continue
        with open(out_path, "a") as f:
            for e in entries:
                e["_page"] = page; e["observed_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                f.write(json.dumps(e) + "\n")
        total += len(entries)
        time.sleep(0.5 + random.random() * 0.4)
    print(f"DONE: {total} new entries -> {out_path} (cumulative lines: "
          f"{sum(1 for _ in open(out_path)) if os.path.exists(out_path) else 0})")

if __name__ == "__main__":
    main()
