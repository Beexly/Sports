"""Real adoption test: PyPasser vs the Spotrac Cloudflare Turnstile wall.

Target is a named, needed GSE source (contract escalators for the L3
revenge/milestone registry). Reports whether the wall clears and how much
content comes back, so the verdict rests on an observed result.
"""
import sys, time, json
from patchright.sync_api import sync_playwright
from pypasser.captcha import turnstile

TARGET = "https://www.spotrac.com/nfl/"
out = {"target": TARGET, "steps": []}

def log(k, v):
    out["steps"].append({k: v})
    print(f"[{k}] {v}", flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(
        user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36"),
        viewport={"width": 1440, "height": 900},
    )
    page = ctx.new_page()
    t0 = time.time()
    try:
        page.goto(TARGET, wait_until="domcontentloaded", timeout=45000)
    except Exception as e:
        log("goto_error", str(e)[:160])
    page.wait_for_timeout(2500)

    title = page.title()
    html = page.content()
    log("title", title)
    log("bytes_before", len(html))
    walled = ("just a moment" in title.lower() or "checking your browser" in html.lower()
              or "cf-turnstile" in html or "challenges.cloudflare.com" in html)
    log("turnstile_detected", walled)

    if walled:
        try:
            res = turnstile.solve(page, attempts=3, timeout=40)
            log("solve_result", str(res)[:200])
        except Exception as e:
            log("solve_error", f"{type(e).__name__}: {str(e)[:200]}")
        page.wait_for_timeout(4000)

    html2 = page.content()
    log("title_after", page.title())
    log("bytes_after", len(html2))
    log("elapsed_s", round(time.time() - t0, 1))
    # content probe: does the page carry real contract/salary text?
    body = page.inner_text("body")[:4000] if len(html2) > 5000 else ""
    for probe in ("Contract", "Salary", "Cap", "Free Agent", "Player"):
        log(f"has_{probe}", probe.lower() in body.lower())
    out["body_head"] = body[:600]
    ctx.close(); b.close()

json.dump(out, open("spotrac_pypasser_result.json", "w"), indent=1)
print("\nRESULT:", json.dumps({k: v for k, v in out.items() if k != "steps"} | {"steps": out["steps"]}, indent=1)[:1500])
