import json, time
from playwright.sync_api import sync_playwright

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
NASH = "https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent=UA)
    pg = ctx.new_page()
    pg.goto("https://sportsbook.draftkings.com/", wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(2000)

    def fetch(url):
        return pg.evaluate("""async (u) => {
          try { const r = await fetch(u, {headers:{'accept':'application/json'}});
                return {status:r.status, body: await r.text()}; }
          catch(e){ return {status:-1, body:'ERR:'+String(e)}; }
        }""", url)

    r = fetch(NASH+"navigation/dkuswv/v2/nav/leagues/87637")
    print("[nav] status", r["status"], "len", len(r["body"]), flush=True)
    print("[nav] head:", r["body"][:250], flush=True)
    open("nav_87637.json","w").write(r["body"][:400000])
    b.close()
