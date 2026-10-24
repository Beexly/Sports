import json, time, urllib.parse, sys
from playwright.sync_api import sync_playwright

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
NASH = "https://sportsbook-nash.draftkings.com/sites/US-SB/"
SUBS = ("16569","16570","16571")

def norm(s): return s.lower().replace(".","").replace("'","").split(" (")[0].strip()

# sheet players we need prices for
sheet=[l for l in open("C:/Users/Garrett/Sports-wt-rating-packet/docs/research/2026-10-09/rating-atlas/minis/cfb_prop_edge_sheet.csv")]
hdr=sheet[0].strip().split(",")
want=set()
for l in sheet[1:]:
    f=l.strip().split(",")
    want.add((norm(f[0]), f[1]))
print("[sheet] players:", len(want), flush=True)

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

    # 1) nav tree -> events with ladder subcats
    st, body = fetch(NASH + "api/sportscontent/navigation/dkuswv/v2/nav/leagues/87637")
    print("[nav]", st, "len", len(body), flush=True)
    if st != 200: raise SystemExit
    nav = json.loads(body)
    json.dump(nav, open("nav_87637.json","w"))
    events=[]
    def walk(n):
        if isinstance(n, dict):
            if "subCategoryList" in n or "subcategories" in n:
                pass
            comps = n.get("competitions") or []
            for c in comps:
                for s in (c.get("subcategories") or []):
                    events.append((c["id"], str(s.get("id"))))
            for v in n.values():
                if isinstance(v,(dict,list)): walk(v)
        elif isinstance(n, list):
            for x in n: walk(x)
    walk(nav)
    pairs=sorted(set(events))
    print("[nav] events:", len(pairs), flush=True)

    # 2) markets per pair
    rows=[]
    n_ok=n_fail=0
    for eid, sid in pairs:
        if sid not in SUBS: continue
        fq = urllib.parse.quote(f"$filter=eventId eq '{eid}' AND clientMetadata/subCategoryId eq '{sid}'")
        url=(NASH+"api/sportscontent/controldata/event/eventSubcategory/v1/markets"
             f"?templateVars={eid},{sid}&marketsQuery={fq}&include=Events&entity=events")
        st, body = fetch(url)
        if st==200:
            try: d=json.loads(body)
            except Exception: d=None
            if d:
                sel=0
                for m in (d.get("markets") or []):
                    for o in (m.get("outcomes") or []):
                        rows.append({"ev":eid,"sub":sid,"wager":m.get("marketName"),"points":o.get("points"),
                                     "american":(o.get("displayOdds") or {}).get("american"),"true":o.get("trueOdds"),
                                     "player":(o.get("participant") or {}).get("name"),"stat":(o.get("participant") or {}).get("statistic",{}).get("value")})
                        sel+=1
                open("ladder_prices.jsonl","a").write(json.dumps({"ev":eid,"sub":sid,"status":st,"n":sel})+"\n")
                n_ok+=1
            else: n_fail+=1
        else:
            open("ladder_prices.jsonl","a").write(json.dumps({"ev":eid,"sub":sid,"status":st})+"\n"); n_fail+=1
        time.sleep(0.55)
    print("[markets] ok:", n_ok, "fail:", n_fail, flush=True)
    print("[harvest] rows:", len(rows), flush=True)
    json.dump(rows, open("ladder_rows.json","w"))
    b.close()
