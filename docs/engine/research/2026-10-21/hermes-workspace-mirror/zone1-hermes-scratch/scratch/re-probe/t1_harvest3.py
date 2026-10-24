import json, time, urllib.parse
from playwright.sync_api import sync_playwright

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
NASH = "https://sportsbook-nash.draftkings.com/sites/US-SB/"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent=UA)
    pg = ctx.new_page()
    pg.goto("https://sportsbook.draftkings.com/sports/college-football", wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(2500)

    def fetch(url):
        try:
            r = ctx.request.get(url, headers={"accept":"application/json"}, timeout=30000)
            return r.status, r.text()
        except Exception as e:
            return -1, str(e)

    st, body = fetch(NASH + "api/sportscontent/navigation/dkuswv/v2/nav/leagues/87637")
    print("[nav]", st, flush=True)
    if st != 200:
        print("[nav] body:", body[:250], flush=True); raise SystemExit
    nav = json.loads(body)
    json.dump(nav, open("nav_87637.json","w"))
    print("[nav] top keys:", list(nav.keys()), flush=True)

    # flatten: events with ladder subcats 16569/16570/16571
    events = []
    def walk(node):
        if isinstance(node, dict):
            if node.get("id") and ("subcategories" in node or "subCategoryList" in node):
                pass
            comps = node.get("competitions") or []
            subs  = node.get("subcategories") or node.get("subCategoryList") or []
            for c in comps:
                for s in (c.get("subcategories") or []):
                    events.append((c.get("id"), s.get("id")))
            for v in node.values():
                if isinstance(v,(dict,list)): walk(v)
        elif isinstance(node, list):
            for x in node: walk(x)
    walk(nav)
    print("[walk] events x subcats found:", len(events), flush=True)
    for eid, sid in events[:10]: print("  pair:", eid, sid, flush=True)
    b.close()
