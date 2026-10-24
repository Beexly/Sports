import json
from playwright.sync_api import sync_playwright
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
CD = "https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/controldata/event/eventSubcategory/v1/markets"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent=UA)
    pg = ctx.new_page()
    pg.goto("https://sportsbook.draftkings.com/sports/college-football", wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(12000)
    # grab __INITIAL_STATE__ embedded in the page itself
    st = pg.evaluate("""() => {
      const s = document.querySelector('#dkjs-header-config');
      const m = document.documentElement.innerHTML.match(/__INITIAL_STATE__\s*=\s*(\{.*?\});/s);
      const state = window.__INITIAL_STATE__;
      const comps = (state && state.sports && state.sports.data) || [];
      const events = [];
      const walk = (o) => {
        if (!o) return;
        for (const [k,v] of Object.entries(o)) {
          if (k==='events'||k==='competition'||k==='eventIds') {}
        }
      };
      return {
        keys: Object.keys(state||{}),
        sports: (state && state.sports) ? (Array.isArray(state.sports.data)?state.sports.data.map(x=>[x.displayGroupId||x.id, (x.leagues||[]).map(l=>l.id)]).slice(0,10):'?') : 'none',
        raw: m ? m[1].slice(0,200) : (state?JSON.stringify(Object.keys(state)):'undef'),
      };
    }""")
    print("STATE keys:", st["keys"][:20])
    print("raw:", st["raw"][:200])
    if st.get("sports") and st["sports"]!="none": print("sports:", st["sports"])
    b.close()
