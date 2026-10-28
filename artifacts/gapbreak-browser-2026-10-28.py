"""Gap breaker, browser edition: render the page and take what the network hands back.

The remaining gaps are JS-rendered SPAs — no tables in the HTML and no guessable
API paths. So render them: capture every JSON response the page itself requests,
and extract the tables the DOM ends up holding.

Writes docs/data-sources/gapbreak/<host>.md and artifacts/gapbreak/<host>/.
"""
import json, re, sys
from pathlib import Path

OUT = Path("C:/Users/Garrett/Sports/docs/data-sources/gapbreak")
CAP = Path("C:/Users/Garrett/Sports/artifacts/gapbreak")
PATHS = ("/", "/nfl/", "/stats/", "/odds/", "/rankings/")
MIN_BYTES = 600
SKIP = re.compile(r"(\.(png|jpg|svg|webp|woff2?|css)$|google|doubleclick|facebook|sentry|"
                  r"segment|amplitude|hotjar|clarity|adsbygoogle|googletagmanager)", re.I)


def run(host):
    from patchright.sync_api import sync_playwright

    capdir = CAP / host
    capdir.mkdir(parents=True, exist_ok=True)
    captured, tables, notes = [], [], []
    seen = set()

    with sync_playwright() as p:
        b = p.chromium.launch(headless=False)
        ctx = b.new_context(viewport={"width": 1440, "height": 1000},
                            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                                        "Chrome/156.0.0.0 Safari/537.36"))
        page = ctx.new_page()

        def on_response(resp):
            try:
                if resp.status != 200 or SKIP.search(resp.url) or resp.url in seen:
                    return
                ct = (resp.headers or {}).get("content-type", "")
                if "json" not in ct.lower():
                    return
                body = resp.text()
                if len(body) < MIN_BYTES or body.lstrip()[:1] not in "{[":
                    return
                json.loads(body)
                seen.add(resp.url)
                fn = re.sub(r"[^a-z0-9]+", "_", resp.url.split("://")[-1])[:90] + ".json"
                (capdir / fn).write_text(body[:600_000], encoding="utf-8")
                captured.append((resp.url, len(body)))
            except Exception:
                pass

        page.on("response", on_response)
        for path in PATHS:
            try:
                page.goto(f"https://{host}{path}", wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(3500)
                page.mouse.wheel(0, 1400)
                page.wait_for_timeout(2000)
            except Exception as e:
                notes.append(f"{path}: {type(e).__name__}")
                continue
            try:
                dom = page.evaluate("""() => Array.from(document.querySelectorAll('table')).slice(0,6).map(t => ({
                    headers: Array.from(t.querySelectorAll('th')).map(h => h.innerText.trim()).slice(0,40),
                    rows: Array.from(t.querySelectorAll('tr')).slice(0,300).map(r =>
                        Array.from(r.querySelectorAll('td')).map(c => c.innerText.trim())).filter(r => r.length)
                })).filter(t => t.rows.length)""")
            except Exception:
                dom = []
            if dom:
                tables.append({"path": path, "tables": dom})
            if len(captured) >= 25:
                break
        ctx.close()
        b.close()

    L = [f"# {host} — gap break (browser)", "",
         f"JSON responses captured: **{len(captured)}**  ",
         f"Rendered tables: **{sum(len(t['tables']) for t in tables)}**", ""]
    if captured:
        L += ["## Captured JSON responses", "", "| URL | Bytes |", "|---|---|"]
        L += [f"| `{u}` | {n:,} |" for u, n in captured[:40]]
        L.append("")
    if tables:
        (capdir / "rendered_tables.json").write_text(json.dumps(tables)[:800_000], encoding="utf-8")
        for t in tables[:3]:
            for i, tbl in enumerate(t["tables"][:2]):
                L += [f"### `{t['path']}` table {i} — {len(tbl['rows'])} rows", "```",
                      " | ".join(tbl["headers"][:18]), "-" * 40]
                L += [" | ".join(r[:18]) for r in tbl["rows"][:20]]
                L += ["```", ""]
    if notes:
        L += ["## Navigation notes", ""] + [f"- {n}" for n in notes] + [""]
    if not captured and not tables:
        L += ["## Result", "", "Nothing. Needs a credentialed session.", ""]
    return "\n".join(L), bool(captured or tables)


if __name__ == "__main__":
    hosts = json.load(open(sys.argv[1]))
    OUT.mkdir(parents=True, exist_ok=True)
    for host in hosts:
        f = OUT / f"{host}.md"
        if f.exists() and "--force" not in sys.argv:
            print(f"skip {host}", flush=True); continue
        try:
            doc, got = run(host)
        except Exception as e:
            doc, got = f"# {host}\n\nERROR {type(e).__name__}: {e}\n", False
        f.write_text(doc, encoding="utf-8")
        print(f"{host:34s} {'BROKEN' if got else 'still gap'}", flush=True)
