import json, time, re
from playwright.sync_api import sync_playwright

NAVASSET = "https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/navigation/"
# harvest ladder prices for CFB via in-browser fetch (Akamai pass)
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
    pg = ctx.new_page()
    pg.goto("https://sportsbook.draftkings.com/", wait_until="domcontentloaded", timeout=60000)
    print("[T1] page loaded", flush=True)

    def fetch(url):
        return pg.evaluate("""async (u) => {
          try { const r = await fetch(u, {headers:{'accept':'application/json'}});
                return {status:r.status, body: await r.text()}; }
          catch(e){ return {status:-1, body:'ERR:'+String(e)}; }
        }""", url)

    r = fetch(NAVASSET + "dkuswv/v2/nav/leagues/87637?_locale=en")
    print("[T1] nav status:", r["status"], "len:", len(r.get("body","")), flush=True)
    nav = json.loads(r["body"]) if r["status"]==200 else None
    open("nav_87637.json","w").write(r["body"][:200000])
    if nav:
        # walk tree: events
        comps = nav.get("competitions") or nav.get("events") or nav
        open("nav_tree_87637.json","w").write(json.dumps(nav)[:4000])
    print("[T1] nav body head:", r["body"][:200], flush=True)
    b.close()
