"""PFR pull: solve the Cloudflare interstitial once, then fetch pages over the
cleared session with plain HTTP.

Proves the wall-clear primitive pays: one browser solve, N cheap page fetches,
no browser per page.
"""
import json, re, sys, time
import httpx
from patchright.sync_api import sync_playwright
from pypasser.antibot import cloudflare

BASE = "https://www.pro-football-reference.com"
PATHS = ["/combine/", "/draft/2025-combine.htm", "/years/2025/defense.htm"]
out = {"solved": False, "pages": []}

with sync_playwright() as p:
    b = p.chromium.launch(headless=False)
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(BASE + "/", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2000)
    if "just a moment" in page.title().lower():
        res = cloudflare.solve(page, timeout=60)
        out["solved"] = bool(res.is_solved)
        jar = dict(res.cookies or {}) if res.is_solved else {}
        ua = res.user_agent
        page.wait_for_timeout(2500)
    else:
        jar, ua = {}, None
    ctx.close(); b.close()

if not out["solved"]:
    print("no clearance obtained"); sys.exit(1)

headers = {"User-Agent": ua} if ua else {}
with httpx.Client(cookies=jar, headers=headers, timeout=45, follow_redirects=True) as c:
    for path in PATHS:
        r = c.get(BASE + path)
        tables = len(re.findall(r"<table", r.text))
        rows = len(re.findall(r"<tr", r.text))
        rec = {"path": path, "status": r.status_code, "bytes": len(r.text),
               "tables": tables, "rows": rows}
        out["pages"].append(rec)
        print(f"{r.status_code} {len(r.text):>8} bytes  tables={tables:<3} rows={rows:<5} {path}", flush=True)
        if r.status_code == 200:
            fn = "pfr_" + re.sub(r"[^a-z0-9]+", "_", path.strip("/").lower()).strip("_") + ".html"
            open(fn, "w", encoding="utf8").write(r.text)
        time.sleep(1.5)

json.dump(out, open("pfr_pull_result.json", "w"), indent=1)
ok = sum(1 for p in out["pages"] if p["status"] == 200)
print(f"\n{ok}/{len(PATHS)} pages 200")
