"""Shared helpers for dfs/ingest pullers: fetch, stamp, fail closed.  DIAGNOSTIC data plumbing.
Every artifact carries observed_at (UTC pull time) + source url + sha256 + license.  No imputation:
rows that lack a required field are rejected and counted, never filled."""
import hashlib, json, os, time, urllib.request

UA = "GSE-ingest/1.0 (Galaxy Sports Edge research; contact baxley.garrett@gmail.com)"


class FailClosed(Exception):
    pass


def utcnow():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def fetch(url, timeout=60, headers=None, retries=2):
    h = {"User-Agent": UA}; h.update(headers or {})
    last = None
    for i in range(retries + 1):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout) as r:
                if r.status != 200:
                    raise FailClosed(f"HTTP {r.status} for {url}")
                return r.read()
        except FailClosed:
            raise
        except Exception as e:  # network error -> retry, then fail closed
            last = e; time.sleep(1.5 * (i + 1))
    raise FailClosed(f"fetch failed for {url}: {last}")


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def write_stamped(path, payload, **meta):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    doc = {"observed_at": meta.pop("observed_at", utcnow()), **meta, "rows": payload,
           "label": "DIAGNOSTIC ingest artifact; not a pick, not a margin"}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1)
    return doc
