#!/usr/bin/env python3
"""
dk_h2_client.py — DraftKings API client over HTTP/2 (the Akamai bypass).

MEASURED 2026-10-10 (chrome-wf session + httpx):
  api.draftkings.com blocks HTTP/1.1 at the TLS/ALPN layer (403 Akamai 438B block page)
  and serves 200 to HTTP/2 with the same headers. No cookies, no JS, no challenge.
  The 403s documented in ENTRY_ENUMERATION_PLAN.md were an h1 artifact.

Usage:
    from dk_h2_client import dk
    d = dk('/contests/v1/contests/196458728')          # JSON get
    d = dk('/draftgroups/v1/draftgroups/154468/draftables')
"""
import json, time, random
import httpx

BASE = 'https://api.draftkings.com'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')
HDRS = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.draftkings.com/',
    'sec-ch-ua': '"Chromium";v="126"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
}

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = httpx.Client(http2=True, headers=HDRS, timeout=25)
    return _client


def dk(path, retries=3):
    """GET {BASE}{path} over HTTP/2. Returns parsed JSON. Polite: 0.3-0.8s jitter."""
    c = _get_client()
    for attempt in range(retries):
        try:
            r = c.get(BASE + path)
            if r.status_code == 200:
                time.sleep(random.uniform(0.3, 0.8))
                return r.json()
            print(f'  [{r.status_code}] {path[:60]} (attempt {attempt+1})')
        except Exception as e:
            print(f'  [err] {str(e)[:60]} (attempt {attempt+1})')
        time.sleep(1.5 + attempt)
    return None


if __name__ == '__main__':
    # self-test: the 3 contest ladders that 403'd all day
    for cid in ['196420197', '196420205', '196403752']:
        d = dk(f'/contests/v1/contests/{cid}')
        if d:
            cd = d.get('contestDetail', {})
            tiers = cd.get('payoutSummary', [])
            print(f'{cid}: OK — {len(tiers)} tiers, total {cd.get("totalPayouts")}')
        else:
            print(f'{cid}: FAILED')
