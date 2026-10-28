"""Does CloakBrowser clear a wall that patchright cannot clear headless?

PFR is 403 to curl and patchright fails it headless. If CloakBrowser headless gets
through, it removes the headed requirement from the wall-clear.
"""
import json, sys, time
import cloakbrowser as cb

TARGETS = ["https://www.pro-football-reference.com/", "https://www.whoscored.com/"]
out = []

for url in TARGETS:
    rec = {"url": url}
    t0 = time.time()
    b = None
    try:
        b = cb.launch(headless=True)
        p = b.new_page()
        p.goto(url, wait_until="domcontentloaded", timeout=60000)
        p.wait_for_timeout(4000)
        title = p.title()
        html = p.content()
        rec.update({"title": title, "bytes": len(html),
                    "walled": "just a moment" in title.lower(),
                    "elapsed": round(time.time() - t0, 1)})
        rec["ok"] = (not rec["walled"]) and len(html) > 100_000
    except Exception as e:
        rec.update({"error": f"{type(e).__name__}: {str(e)[:160]}", "ok": False})
    finally:
        if b:
            try: b.close()
            except Exception: pass
    out.append(rec)
    print(json.dumps(rec)[:300], flush=True)

json.dump(out, open("cloakbrowser_headless_test.json", "w"), indent=1)
print("\npassed:", sum(1 for r in out if r.get("ok")), "/", len(out))
