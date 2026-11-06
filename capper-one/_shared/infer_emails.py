#!/usr/bin/env python3
"""Name-based address inference with Gravatar verification.

Names come from public GitHub commit metadata for the org's own repos. For each name not
already carrying an address, six corporate patterns are generated against the org domain and
checked with `gravatar.com/avatar/<md5>?d=404` (404 = no account, 200 = exists).
Confidence 55: pattern plus Gravatar, never a send-safe grade on its own.

Usage: python3 infer_emails.py <slug-or-domain> [...]
"""
BASH = r"C:/Program Files/Git/bin/bash.exe"
import hashlib, json, re, sqlite3, subprocess, sys, time, urllib.request
sys.path.insert(0, str(__import__('pathlib').Path(__file__).parent))
import db  # noqa: E402

DB = r"C:/Users/Garrett/capper-one/_shared/capper.db"
UA = "Mozilla/5.0 (compatible; CapperOne/1.0)"
PATTERNS = ("{f}.{l}", "{f}{l}", "{f[0]}.{l}", "{f[0]}{l}", "{f}", "{f}.{l[0]}")


def gh(*args):
    return subprocess.run(["gh", *args], capture_output=True, text=True).stdout


def org_repos(brand):
    out = gh("api", f"search/users?q={brand}+type:org", "--jq", ".items[].login").split()
    exact = [o for o in out if o.lower().replace("-", "") == brand.lower().replace("-", "")]
    if exact:
        o = exact[0]
        return [x for x in gh("api", f"orgs/{o}/repos?sort=pushed&per_page=4", "--jq", ".[].full_name").split() if "/" in x]
    return []


def names_from(repos):
    seen = {}
    for repo in repos[:4]:
        raw = gh("api", f"repos/{repo}/commits?per_page=100", "--jq",
                 '.[] | .commit.author.name + "|" + .commit.author.email')
        for line in raw.splitlines():
            if "|" not in line:
                continue
            name, email = line.rsplit("|", 1)
            name = re.sub(r"[^A-Za-z .'\-]", "", name).strip()
            parts = [p for p in name.split() if len(p) > 1]
            if len(parts) < 2 or len(parts) > 3:
                continue
            seen.setdefault((parts[0].lower(), parts[-1].lower()), email.lower())
    return seen


def gravatar(email):
    h = hashlib.md5(email.lower().encode()).hexdigest()
    req = urllib.request.Request(f"https://gravatar.com/avatar/{h}?d=404", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status == 200
    except Exception as e:
        return getattr(e, "code", 0) == 200


if __name__ == "__main__":
    con = db.connect(DB)
    con.execute("PRAGMA busy_timeout=20000")
    total = 0
    for arg in sys.argv[1:]:
        brand, domain = (arg.split(".")[0], arg) if "." in arg else (arg, f"{arg}.com")
        repos = org_repos(brand)
        if not repos:
            print(f"{brand}: no gh org")
            continue
        names = names_from(repos)
        hits = 0
        for (f, l), known in list(names.items())[:120]:
            if known and brand in known and "@" in known:
                continue
            for pat in PATTERNS:
                addr = pat.format(f=f, l=l, **{}) if "{f" in pat else pat.format(f=f, l=l)
                addr = f"{addr}@{domain}".replace("..", ".")
                if not gravatar(addr):
                    continue
                h = hashlib.sha256(addr.encode()).hexdigest()[:32]
                for _ in range(5):
                    try:
                        con.execute(
                            "INSERT OR IGNORE INTO contact (org,email_hash,email,platform,segment,confidence,source_url,verified_at) "
                            "VALUES (?,?,?,'email','staff',55,?, '2026-11-06')",
                            (brand, h, addr, f"https://github.com/{brand}"))
                        break
                    except sqlite3.OperationalError:
                        time.sleep(1.2)
                hits += 1
                total += 1
                break
            con.commit()
            time.sleep(0.2)
        print(f"{brand}: names={len(names)} gravatar_hits={hits} repos={len(repos)}")
    print("new addresses:", total)
