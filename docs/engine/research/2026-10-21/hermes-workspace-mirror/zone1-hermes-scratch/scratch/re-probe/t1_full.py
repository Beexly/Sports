import json, re, time
from playwright.sync_api import sync_playwright

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
BASE = "https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent=UA)
    pg = ctx.new_page()
    pg.goto("https://sportsbook.draftkings.com/", wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(2000)

    def fetch(url):
        return pg.evaluate("""async (u) => {
          try { const r = await fetch(u);
                return {status:r.status, body: await r.text()}; }
          catch(e){ return {status:-1, body:'ERR:'+String(e)}; }
        }""", url)

    # 1. nav tree for CFB league 87637
    r = fetch(BASE + "navigation/dkuswv/v2/nav/leagues/87637")
    print("[nav]", r["status"], flush=True)
    if r["status"] != 200:
        print("[nav] not JSON:", r["body"][:200], flush=True); raise SystemExit
    nav = json.loads(r["body"])
    open("nav_87637.json","w").write(json.dumps(nav))
    print("[nav] saved keys:", list(nav.keys())[:10], flush=True)
    b.close()
