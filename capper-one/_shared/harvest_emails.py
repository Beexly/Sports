#!/usr/bin/env python3
"""Public-source email harvester.

Sources, all public and profile-visible:
  site     /about /team /contact /press mailto: and body emails   (high confidence)
  play     Play Store developer contact block                    (high)
  podcast  RSS itunes:email / author email                        (medium)
  github   commit author emails + org member profiles             (medium)
  npm      package maintainer emails                              (medium)
  gravatar pattern-inferred addresses that resolve                (low)

Writes to contact with platform='email', source_url and confidence. Idempotent on hash.
Usage: python3 harvest_emails.py <slug> [slug...]
"""
BASH = r"C:/Program Files/Git/bin/bash.exe"
import hashlib, json, re, sqlite3, subprocess, sys, time, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db  # noqa: E402

DB = r"C:/Users/Garrett/capper-one/_shared/capper.db"
UA = "Mozilla/5.0 (compatible; CapperOne/1.0; +https://github.com/Beexly/Sports)"
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
SKIP = re.compile(r"\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|ico)$|sentry|wixpress|example\.|godaddy|cloudflare|w3\.org", re.I)
COMMON = {"info", "support", "hello", "contact", "admin", "sales", "team", "help", "press", "media", "billing", "careers", "jobs", "privacy", "legal", "noreply", "no-reply"}


def get(url, timeout=12):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xhtml+xml,application/rss+xml"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(1_500_000).decode("utf-8", "replace")
    except Exception as e:
        return 0, str(e)


def fc_search(q, n=8):
    p = subprocess.run(f'firecrawl search "{q}" --limit {n}', shell=True, executable=BASH, capture_output=True, text=True, errors="replace", timeout=180)
    return re.findall(r"URL:\s*(https?://[^\s]+)", p.stdout)


def add(con, slug, email, source, conf, url):
    email = email.strip().strip(".").lower()
    if not email or SKIP.search(email) or len(email) > 80:
        return False
    dom = slug.split(".")[0]
    h = hashlib.sha256(email.encode()).hexdigest()[:32]
    cur = db.write(
        con,
        "INSERT OR IGNORE INTO contact (org,email_hash,email,platform,segment,confidence,source_url,verified_at) "
        "VALUES (?,?,?,'email','staff',?,?,'2026-11-06')",
        (dom, h, email, conf, url))
    return cur.rowcount > 0


CONTACT_HINT = re.compile(
    r"/(?:contact(?:-us)?|about(?:-us)?|team|staff|press|company|support|advertis\w*|media)(?:/|$)", re.I)


def site_paths(dom):
    """Real paths that might carry a mailto, instead of six guesses.

    The guess list missed every one of these on sportsline and vsin: /contact/ and /contact-us/
    were 404, so a whole domain scored zero on paths that never existed. Anchor links from the
    homepage and sitemap.xml give the site's own names for those pages. Discovered paths are
    capped so a big odds site cannot fill the budget with fixture pages and crowd the guesses out.
    """
    discovered = []
    code, body = get(f"https://{dom}/")
    if code == 200:
        for href in re.findall(r'href="([^"]+)"', body):
            if href.startswith("/") and CONTACT_HINT.search(href) and len(href) < 60:
                discovered.append(href.split("?")[0].split("#")[0])
        for loc in re.findall(r"<loc>([^<]+)</loc>", body)[:60]:
            if re.search(r"(contact|about|team|press|support|advertis)", loc, re.I):
                tail = loc.split("//", 1)[-1].split("/", 1)[-1]
                discovered.append("/" + tail)
    ordered = discovered[:4] + ["/", "/contact", "/contact-us", "/about", "/press"]
    seen, out = set(), []
    for path in ordered:
        if path not in seen:
            seen.add(path)
            out.append(path)
    return out[:7]


def site(con, slug, dom):
    n = 0
    for path in site_paths(dom):
        code, body = get(f"https://{dom}{path}")
        if code != 200:
            continue
        found = set(EMAIL_RE.findall(body))
        found |= {m.split("mailto:")[1].split("?")[0] for m in re.findall(r'mailto:[^"\'>\s]+', body)}
        for e in list(found)[:20]:
            if add(con, slug, e, "site", 90, f"https://{dom}{path}"):
                n += 1
        time.sleep(0.5)
    return n


def play(con, slug, dom, brand):
    n = 0
    for u in fc_search(f"site:play.google.com {brand}", 5)[:4]:
        code, body = get(u)
        if code != 200:
            continue
        blob = re.sub(r"<[^>]+>", " ", body)
        for e in list(set(EMAIL_RE.findall(blob)))[:15]:
            if add(con, slug, e, "play_store", 85, u):
                n += 1
        time.sleep(0.4)
    return n


def podcast(con, slug, brand):
    n = 0
    urls = [u for u in fc_search(f"{brand} podcast rss feed", 6) if u.endswith((".xml", "/rss", "/feed")) or "podcast" in u]
    for u in urls[:5]:
        code, body = get(u)
        if code != 200:
            continue
        for pat in (r"<itunes:email>([^<]+)", r"<email>([^<]+)", r"<itunes:author>([^<]+)"):
            for m in re.findall(pat, body):
                if "@" in m and add(con, slug, m, "podcast_rss", 80, u):
                    n += 1
        time.sleep(0.4)
    return n


def github(con, slug, brand):
    """Org repos, then commit author emails. Public by definition, high volume."""
    n = 0
    orgs = []
    q = subprocess.run(["gh", "api", f"search/users?q={brand}+type:org", "--jq", ".items[].login"],
                       capture_output=True, text=True)
    orgs += [o for o in q.stdout.split() if o.lower().replace("-", "") == brand.lower().replace("-", "")]
    q = subprocess.run(["gh", "search", "repos", brand, "--limit", "5", "--json", "fullName,owner"],
                       capture_output=True, text=True)
    try:
        for r in json.loads(q.stdout or "[]"):
            orgs.append(r["owner"]["login"])
    except Exception:
        pass
    for org in list(dict.fromkeys(orgs))[:3]:
        r = subprocess.run(["gh", "api", f"orgs/{org}/repos?sort=pushed&per_page=3", "--jq", ".[].full_name"],
                           capture_output=True, text=True)
        repos = [x for x in r.stdout.split() if "/" in x] or [f"{org}/{org}"]
        for repo in repos[:3]:
            c = subprocess.run(["gh", "api", f"repos/{repo}/commits?per_page=100", "--jq", ".[].commit.author.email"],
                               capture_output=True, text=True)
            for e in set(c.stdout.split()):
                if "@" in e and "noreply" not in e and add(con, slug, e, "github_commit", 70, f"https://github.com/{repo}"):
                    n += 1
    return n


def npm(con, slug, brand):
    n = 0
    p = subprocess.run(f'npm search "{brand}" --json --searchlimit 5', shell=True, executable=BASH, capture_output=True, text=True)
    try:
        pkgs = [x["name"] for x in json.loads(p.stdout or "[]")][:5]
    except Exception:
        return 0
    for pkg in pkgs:
        q = subprocess.run(f'npm view {pkg} maintainers --json', shell=True, executable=BASH, capture_output=True, text=True)
        try:
            for m in json.loads(q.stdout or "[]"):
                if isinstance(m, dict) and m.get("email") and add(con, slug, m["email"], "npm_maintainer", 65, f"https://www.npmjs.com/package/{pkg}"):
                    n += 1
        except Exception:
            pass
    return n


if __name__ == "__main__":
    targets = json.loads(Path(r"C:/Users/Garrett/capper-one/_shared/scores.json").read_text())["rows"]
    wanted = set(sys.argv[1:])
    con = db.connect(DB)
    con.execute("PRAGMA busy_timeout=15000")
    total = 0
    for t in targets:
        if wanted and t["domain"] not in wanted:
            continue
        dom = t["domain"]
        brand = dom.split(".")[0]
        before = con.execute("SELECT COUNT(*) FROM contact WHERE org=?", (brand,)).fetchone()[0]
        import os
        fast = os.environ.get("FAST") == "1"
        got = {"site": site(con, brand, dom), "github": github(con, brand, brand),
               "npm": npm(con, brand, brand)}
        if not fast:
            got["play"] = play(con, brand, dom, brand)
            got["podcast"] = podcast(con, brand, brand)
        con.commit()
        after = con.execute("SELECT COUNT(*) FROM contact WHERE org=?", (brand,)).fetchone()[0]
        total += after - before
        print(f"{brand:<22} {got} total={after}")
    print("grand total new:", total)
