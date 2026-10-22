from playwright.sync_api import sync_playwright
import json, re, time
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent=UA)
    pg = ctx.new_page()
    traffic=[]
    def on_resp(r):
        try:
            if "sportsbook-nash" in r.url:
                traffic.append((r.status, r.url))
        except Exception: pass
    pg.on("response", on_resp)
    pg.goto("https://sportsbook.draftkings.com/sports/college-football", wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(20000)
    print("nash traffic:", flush=True)
    for s,u in traffic: print(s, u[:150])
    # probe JSON via page fetch WITH the cookies the site set
    j = pg.evaluate("""async () => {
      const r = await fetch('https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/navigation/dkuswv/v2/nav/leagues/87637', {headers:{'accept':'application/json'}});
      const t = await r.text();
      return [r.status, t.length, t.slice(0,120)];
    }""")
    print("probe:", j[0], j[1], j[2][:100])
    # try the controldata markets with a plausible evId
    ev = re.findall(r'"ev[0-9]+"', open("nav_87637.json").read()[:5000]) if __import__('os').path.exists("nav_87637.json") else []
    b.close()
