"""Shared scraping library for the 400-site NFL sports data sweep."""
import requests, json, time, os, hashlib, logging
from datetime import datetime, timezone

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
})
RATE_LIMIT = 0.5  # seconds between requests to same host
LAST_HOST_TIME = {}

def rate_limit(host):
    host = host.split('/')[2] if '://' in host else host.split('/')[0]
    now = time.time()
    last = LAST_HOST_TIME.get(host, 0)
    wait = RATE_LIMIT - (now - last)
    if wait > 0:
        time.sleep(wait)
    LAST_HOST_TIME[host] = time.time()

def probe(url, timeout=15):
    """Probe a URL, return structured result."""
    rate_limit(url)
    result = {
        "url": url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": None,
        "size": 0,
        "content_type": None,
        "server": None,
        "redirects": [],
        "error": None,
        "headers": {},
        "hash": None,
    }
    try:
        r = SESSION.get(url, timeout=timeout, allow_redirects=True)
        result["status"] = r.status_code
        result["size"] = len(r.content)
        result["content_type"] = r.headers.get("content-type", "")
        result["server"] = r.headers.get("server", "")
        result["redirects"] = [str(s) for s in r.history]
        result["headers"] = dict(r.headers)
        result["hash"] = hashlib.sha256(r.content).hexdigest()[:16]
        if r.status_code == 200:
            # save raw response
            path = f"/root/beexly-sports/data-lake/raw/{hashlib.md5(url.encode()).hexdigest()[:12]}.html"
            with open(path, 'wb') as f:
                f.write(r.content)
            result["raw_file"] = path
    except Exception as e:
        result["error"] = str(e)[:200]
    return result

def classify(status, content_type, size, error=None):
    """Classify endpoint accessibility."""
    if error:
        return "ERROR"
    if status == 200:
        return "OPEN"
    if status == 401:
        return "SIGNUP"
    if status == 403:
        return "GATED"
    if status == 404:
        return "EMPTY"
    if status in (429, 503):
        return "RATE_LIMITED"
    if status >= 500:
        return "SERVER_ERROR"
    return f"STATUS_{status}"
