from playwright.sync_api import sync_playwright
import json, urllib.parse
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
NASH = "https://sportsbook-nash.draftkings.com/sites/US-SB/"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent=UA)
    pg = ctx.new_page()
    pg.goto("https://sportsbook.draftkings.com/sports/college-football", wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(3000)
    ev = "1000000"; sub = "16570"
    fq = urllib.parse.quote(f"$filter=eventId eq '{ev}' AND clientMetadata/subCategoryId eq '{sub}' AND tags/all(t: t ne 'SportcastBetBuilder')")
    url = NASH+"api/sportscontent/controldata/event/eventSubcategory/v1/markets?templateVars="+ev+","+sub+"&marketsQuery="+fq+"&include=Events&entity=events"
    out = pg.evaluate("""async (u) => {
      try { const r = await fetch(u, {headers:{'accept':'application/json'}});
            const t = await r.text(); return {status:r.status, len:t.length, head:t.slice(0,150)}; }
      catch(e){ return {err: String(e)}; }
    }""", url)
    print(out)
    b.close()
