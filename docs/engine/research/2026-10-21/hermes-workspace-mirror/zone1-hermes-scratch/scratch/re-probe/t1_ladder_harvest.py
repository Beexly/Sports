import json, re, time, urllib.parse
from playwright.sync_api import sync_playwright

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
NASH = "https://sportsbook-nash.draftkings.com/sites/US-SB/"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(user_agent=UA)
    pg = ctx.new_page()
    pg.goto("https://sportsbook.draftkings.com/sports/college-football", wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(3000)

    def fetch(url):
        return pg.evaluate("""async (u) => {
          try { const r = await fetch(u, {headers:{'accept':'application/json'}});
                return {status:r.status, body: await r.text()}; }
          catch(e){ return {status:-1, body:'ERR:'+String(e)}; }
        }""", url)

    r = fetch(NASH + "api/sportscontent/navigation/dkuswv/v2/nav/leagues/87637")
    print("[nav]", r["status"], flush=True)
    if r["status"] != 200:
        print("[nav] FAIL", r["body"][:200], flush=True); raise SystemExit
    nav = json.loads(r["body"])
    open("nav_87637.json","w").write(json.dumps(nav))

    # flatten events + their ladder subcategory nodes
    events = []
    def walk(node):
        if isinstance(node, dict):
            eid = node.get("id") or node.get("eventId") or node.get("eventGroupId")
            comps = node.get("competitions") or node.get("events") or []
            for c in comps:
                if isinstance(c, dict) and c.get("id"):
                    subs = c.get("subcategories") or c.get("subCategoryList") or []
                    events.append((c["id"], [s.get("id") for s in subs if isinstance(s, dict)]))
            for v in node.values():
                if isinstance(v, (dict,list)): walk(v)
        elif isinstance(node, list):
            for x in node: walk(x)
    walk(nav)
    print("[nav] events found:", len(events), flush=True)

    SUBS = ("16569","16570","16571")
    out = open("ladder_raw.jsonl","w")
    n_ok=0; n_fail=0
    for eid, subs in events:
        for s in SUBS:
            if s not in subs and subs: 
                pass
            fq = f"eventId eq '{eid}' AND clientMetadata/subCategoryId eq '{s}'"
            url = (NASH + "api/sportscontent/controldata/event/eventSubcategory/v1/markets"
                   f"?templateVars={eid},{s}"
                   f"&marketsQuery={urllib.parse.quote('$filter='+fq)}"
                   f"&include=Events&entity=events")
            r = fetch(url)
            ok = r["status"]==200
            out.write(json.dumps({"ev":eid,"sub":s,"url":url,"status":r["status"],"body":r["body"]})+"\n")
            if ok: n_ok+=1
            else: n_fail+=1
            time.sleep(0.55)
    out.close()
    print("[harvest] ok:", n_ok, "fail:", n_fail, flush=True)
    b.close()
