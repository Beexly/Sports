"""Cloudflare wall-clear: solve the interstitial once, replay the cleared session.

The primitive every walled source needs. A real browser clears the challenge,
the resulting `cf_clearance` cookie and the UA it is bound to are persisted per
host, and plain HTTP replays the session until the clearance expires or the
egress IP changes. No browser per request after the first.

Why the browser is not optional: `cf_clearance` is issued only to a client that
passes Cloudflare's heuristics, and it is bound to both the UA and the egress
IP. Vanilla Playwright scores as automation; headless fails the interstitial
even with stealth patches (measured). So the solve runs headed, on patchright.

Proven live 2026-10-27 against pro-football-reference.com (403 to curl):
interstitial detected -> solved -> replayed 200 / 274,980 bytes, and a follow-up
pull returned 4.7 MB across five pages.

CLI:
    python wall_clear.py https://www.pro-football-reference.com/years/2025/
    python wall_clear.py <url> --force          # ignore a live clearance
    python wall_clear.py <url> --out docs/...   # evidence dir override

Evidence lands under docs/data-sources/research/<date>/wall-clear/ as a JSON
record plus the fetched bytes; nothing is only printed.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CACHE = Path(__file__).resolve().parent / ".wall-clear"
OUTROOT = REPO / "docs" / "data-sources" / "research"

# Measured 2026-10-28: a clearance on PFR survived 45 min across 30 polls (3 throttled,
# recovered, never died, IP unchanged). The probe stopped at 45, so 45 is a floor, not a
# ceiling. 40 min sits under the floor so a dead cookie is never served.
DEFAULT_TTL = 40 * 60
INTERSTITIAL_MARKERS = ("just a moment", "checking your browser", "cf-challenge")


class WallClearUnavailable(RuntimeError):
    """Raised when the browser stack is missing or the wall will not clear."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _host(url: str) -> str:
    host = urllib.parse.urlparse(url).netloc
    if not host:
        raise ValueError(f"not an absolute URL: {url}")
    return host


def _cache_path(host: str) -> Path:
    return CACHE / (host.replace(":", "_") + ".json")


def is_interstitial(html: str, title: str = "") -> bool:
    """True when the payload is a Cloudflare challenge, not the real page."""
    blob = (title + " " + html[:4000]).lower()
    return any(m in blob for m in INTERSTITIAL_MARKERS)


def load_clearance(host: str, ttl: int = DEFAULT_TTL) -> dict | None:
    """A still-valid clearance for this host, or None."""
    p = _cache_path(host)
    if not p.exists():
        return None
    try:
        rec = json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    if time.time() - float(rec.get("solved_at_epoch", 0)) > ttl:
        return None
    if not rec.get("cookies"):
        return None
    return rec


def save_clearance(host: str, cookies: dict, user_agent: str | None) -> dict:
    CACHE.mkdir(parents=True, exist_ok=True)
    rec = {
        "host": host,
        "cookies": cookies,
        "user_agent": user_agent,
        "solved_at": _now(),
        "solved_at_epoch": time.time(),
    }
    _cache_path(host).write_text(json.dumps(rec, indent=1), encoding="utf-8")
    return rec


def egress_ip() -> str | None:
    """Current public egress IP. cf_clearance dies when this changes."""
    try:
        import httpx

        with httpx.Client(timeout=10) as c:
            return c.get("https://api.ipify.org").text.strip()
    except Exception:
        return None


def _content(page, attempts: int = 3) -> str:
    """Page HTML that survives a page which keeps navigating.

    content() refuses while a navigation is in flight, so fall back to reading
    the DOM directly before giving up.
    """
    for i in range(attempts):
        try:
            return page.content()
        except Exception:
            try:
                return page.evaluate("() => document.documentElement.outerHTML")
            except Exception:
                pass
            if i == attempts - 1:
                return ""
            page.wait_for_timeout(1200)
    return ""


def _ua(page) -> str:
    try:
        return page.evaluate("() => navigator.userAgent")
    except Exception:
        return ""


def _title(page) -> str:
    """page.title() that survives a navigating page."""
    try:
        return page.title()
    except Exception:
        return ""


def solve(url: str, timeout: float = 60.0) -> dict:
    """Clear the interstitial for `url` in a real browser and persist the result."""
    try:
        from patchright.sync_api import sync_playwright
        from pypasser.antibot import cloudflare
    except ImportError as e:  # pragma: no cover - depends on host env
        raise WallClearUnavailable(
            "wall-clear needs patchright and pypasser: "
            "python -m pip install pypasser patchright && patchright install chromium"
        ) from e

    host = _host(url)
    with sync_playwright() as p:
        # headed is required: headless fails the interstitial even with stealth patches
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=int(timeout * 1000))
            page.wait_for_timeout(2000)
            try:
                page.wait_for_load_state("domcontentloaded", timeout=10_000)
            except Exception:
                pass  # a page that keeps navigating still yields usable content
            if not is_interstitial(_content(page), _title(page)):
                # no wall on this host right now; keep the session cookies anyway
                jar = {c["name"]: c["value"] for c in ctx.cookies()}
                rec = save_clearance(host, jar, _ua(page))
                rec["interstitial"] = False
                return rec
            res = cloudflare.solve(page, timeout=timeout)
            if not res.is_solved:
                raise WallClearUnavailable(f"interstitial did not clear on {host}")
            page.wait_for_timeout(2500)
            jar = dict(res.cookies or {})
            rec = save_clearance(host, jar, res.user_agent)
            rec["interstitial"] = True
            rec["ip"] = egress_ip()
            return rec
        finally:
            ctx.close()
            browser.close()


def fetch(url: str, *, force: bool = False, ttl: int = DEFAULT_TTL,
          timeout: float = 45.0, max_solves: int = 2):
    """GET `url`, solving the wall first if needed. Returns an httpx.Response."""
    import httpx

    host = _host(url)
    rec = None if force else load_clearance(host, ttl)
    solves = 0

    while True:
        cookies = (rec or {}).get("cookies") or {}
        headers = {}
        if (rec or {}).get("user_agent"):
            headers["User-Agent"] = rec["user_agent"]
        with httpx.Client(cookies=cookies, headers=headers, timeout=timeout,
                          follow_redirects=True) as c:
            r = c.get(url)
        if r.status_code not in (403, 503) and not is_interstitial(r.text):
            return r
        if solves >= max_solves:
            return r
        solves += 1
        try:
            rec = solve(url)
        except Exception:
            if solves >= max_solves:
                raise
            time.sleep(2)
            rec = solve(url)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Clear a Cloudflare wall and fetch.")
    ap.add_argument("url")
    ap.add_argument("--force", action="store_true", help="ignore a live clearance")
    ap.add_argument("--out", type=Path, default=None, help="evidence dir override")
    ap.add_argument("--ttl", type=int, default=DEFAULT_TTL)
    a = ap.parse_args(argv)

    host = _host(a.url)
    out = a.out or OUTROOT / datetime.now(timezone.utc).strftime("%Y-%m-%d") / "wall-clear"
    out.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    try:
        r = fetch(a.url, force=a.force, ttl=a.ttl)
    except WallClearUnavailable as e:
        print(f"FAILED: {e}", file=sys.stderr)
        return 2

    rec = {
        "url": a.url,
        "host": host,
        "status": r.status_code,
        "bytes": len(r.text),
        "interstitial": is_interstitial(r.text),
        "elapsed_s": round(time.time() - t0, 1),
        "fetched_at": _now(),
    }
    (out / f"{host}.json").write_text(json.dumps(rec, indent=1), encoding="utf-8")
    if r.status_code == 200:
        (out / f"{host}.html").write_text(r.text, encoding="utf-8")
    print(json.dumps(rec, indent=1))
    return 0 if r.status_code == 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())
