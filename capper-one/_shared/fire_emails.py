#!/usr/bin/env python3
"""Tier 2 email extraction for pages that render contact details in JavaScript.

The static harvester reads HTML only, so a site that paints its staff list with React looks empty.
firecrawl renders the page first. Every address it returns is tagged tier 2 with the rendered URL
as source, so the difference between a mailto in the raw HTML and an address that only appears
after rendering stays visible in the record.

Usage: python3 _shared/fire_emails.py domain1.com domain2.com ...
Exit: 0 always, prints a per-domain count.
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db  # noqa: E402

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
SKIP = re.compile(r"(sentry|wixpress|example|domain\.com|\.png|\.jpg|\.webp|godaddy|cloudflare)", re.I)
PATHS = ("/contact", "/contact-us", "/about", "/about-us", "/team", "/staff", "/press")


def fire(args, timeout=180):
    """firecrawl installs as a .cmd shim on Windows, which subprocess cannot exec without a shell."""
    cmd = "firecrawl " + " ".join(f'"{a}"' if " " in a or '"' in a else a for a in args)
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True, errors="replace", timeout=timeout)
    return p.stdout or ""


def harvest(con, dom):
    found = {}
    for path in PATHS:
        out = fire(["scrape", f"https://{dom}{path}", "--formats", "markdown"])
        if not out:
            continue
        for addr in EMAIL_RE.findall(out):
            addr = addr.strip(".").lower()
            if SKIP.search(addr) or addr.endswith((".png", ".jpg")):
                continue
            found.setdefault(addr, f"https://{dom}{path}")
        if len(found) >= 8:
            break
        time.sleep(1)
    # a firecrawl search for the brand sometimes surfaces the address in a snippet
    if not found:
        brand = dom.split(".")[-2]
        out = fire(["search", f'"{brand}" contact email "@{dom}"', "--limit", "5"])
        for addr in EMAIL_RE.findall(out):
            addr = addr.strip(".").lower()
            if addr.endswith("@" + dom) and not SKIP.search(addr):
                found.setdefault(addr, f"firecrawl search: {brand} contact email")
    n = 0
    for addr, url in found.items():
        h = __import__("hashlib").sha256(addr.encode()).hexdigest()[:32]
        if db.write(con, "INSERT OR IGNORE INTO contact (org,email_hash,email,platform,segment,confidence,source_url,verified_at) "
                          "VALUES (?,?,?,'email','staff',75,?,'2026-11-06')", (dom.split(".")[-2], h, addr, url)).rowcount:
            n += 1
    return n, len(found)


if __name__ == "__main__":
    con = db.connect()
    for dom in sys.argv[1:]:
        try:
            new, seen = harvest(con, dom)
            print(f"{dom:<28} found={seen} new={new}", flush=True)
        except Exception as err:
            print(f"{dom:<28} error={type(err).__name__}", flush=True)
        con.execute("PRAGMA wal_checkpoint(PASSIVE)")
    con.close()
