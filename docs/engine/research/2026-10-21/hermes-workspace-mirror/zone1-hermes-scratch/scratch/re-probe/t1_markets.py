import json, re, time
from playwright.sync_api import sync_playwright
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
NASH = "https://sportsbook-nash.draftkings.com/sites/US-SB/"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent=UA)
    pg = ctx.new_page()
    nash=[]
    pg.on("response", lambda r: nash.append((r.status, r.url)) if "nash" in r.url else None)
    pg.goto("https://sportsbook.draftkings.com/sports/college-football", wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(25000)
    for s,u in nash[:40]:
        print(s, u[:175], flush=True)
    print("TOTAL nash:", len(nash), flush=True)
    b.close()
