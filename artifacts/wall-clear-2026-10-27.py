"""Wall-clear: Cloudflare interstitial -> cf_clearance -> plain-HTTP replay.

The primitive the whole hacker stack rests on: solve the wall once in a real
browser, then replay the cleared session over httpx from the same IP with the
exact UA the cookie is bound to. No browser per request afterwards.

Usage:  python wall_clear.py <url>
Writes: wall_clear_<host>.json  (clearance artifacts + replay proof)
"""
import json, sys, time, urllib.parse
import httpx
from patchright.sync_api import sync_playwright
from pypasser.antibot import cloudflare

url = sys.argv[1] if len(sys.argv) > 1 else "https://steamdb.info/"
host = urllib.parse.urlparse(url).netloc
out = {"target": url, "steps": []}

def log(k, v):
    out["steps"].append({k: v})
    print(f"[{k}] {v}", flush=True)

with sync_playwright() as p:
    # headed is required: PyPasser's own docs record that headless fails this wall
    b = p.chromium.launch(headless=False)
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(2500)
    log("title_on_arrival", page.title())
    walled = "just a moment" in page.title().lower() or "checking your browser" in page.content().lower()
    log("interstitial_detected", walled)

    res = None
    if walled:
        try:
            res = cloudflare.solve(page, timeout=60)
            log("solve", f"is_solved={res.is_solved} cookies={len(res.cookies or [])} ua={'yes' if res.user_agent else 'no'}")
        except Exception as e:
            log("solve_error", f"{type(e).__name__}: {str(e)[:180]}")
        page.wait_for_timeout(3000)
    log("title_after_solve", page.title())
    ctx.close(); b.close()

# --- replay over plain HTTP with the clearance artifacts ---
if res and res.is_solved:
    raw = res.cookies or []
    jar = {}
    if isinstance(raw, dict):
        jar = {str(k): str(v) for k, v in raw.items()}
    else:
        for c in raw:
            try:
                jar[c["name"]] = c["value"]
            except Exception:
                if isinstance(c, str) and "=" in c:
                    k, _, v = c.partition("=")
                    jar[k.strip()] = v.strip()
    out["cookie_names"] = sorted(jar)
    out["cookie_shape"] = f"{type(raw).__name__}/{len(raw)}"
    headers = {"User-Agent": res.user_agent} if res.user_agent else {}
    try:
        with httpx.Client(cookies=jar, headers=headers, timeout=30, follow_redirects=True) as c:
            r = c.get(url)
        log("replay_status", r.status_code)
        log("replay_bytes", len(r.text))
        log("replay_has_clearance_cookie", "cf_clearance" in jar)
        out["replay_head"] = r.text[:300]
    except Exception as e:
        log("replay_error", f"{type(e).__name__}: {str(e)[:180]}")
else:
    log("replay", "skipped - no solved clearance")

json.dump(out, open(f"wall_clear_{host}.json", "w"), indent=1)
print("\n" + json.dumps({k: v for k, v in out.items() if k != "steps"}, indent=1)[:800])
