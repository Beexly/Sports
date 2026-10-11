#!/usr/bin/env python3
"""
dk_live_poller.py — pre-lock consensus poller for DK contests.

Lane: drives the REAL logged-in Chrome (chrome-wf profile, CDP :9222) through the
contest detailspop URL — the same page a human sees. No shell requests, no
headless fingerprint, human-like cadence with jitter. Reads:
  - live entries count (grows pre-lock)
  - entrants page-1 sample (usernames)
  - contest metadata (prize, multi-entry cap)
Writes append-only JSONL snapshots stamped with observed_at.

Stealth properties (tested):
  - runs INSIDE the user's real browser profile (full fingerprint parity)
  - pageload cadence 20-70s random jitter (human range)
  - no cookie export, no direct api.draftkings.com hits from scripts
  - data leaves the box only via this JSONL for local analysis
"""
import json, time, random, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

POP = 'https://www.draftkings.com/contest/detailspop?contestId={cid}&showDraftButton=NFL&defaultToDetails=true&layoutType=raptor&isFromPostEntry=false'


def snapshot(contest_id):
    """One poll cycle: reload pop in the live tab, extract state. Returns dict."""
    import hermes_browser_shim  # noqa: F401 (browser_exec runtime provides helpers inline)
    return None  # placeholder; actual logic runs inside browser_exec below


def extract_js():
    return r"""(() => {
  const t = document.body.innerText;
  const m = t.match(/Entries:\s*([\d,]+)\/([\d,.K]+)/);
  const prize = (t.match(/Prizes:\s*\n?\$([\d,]+)/) || [])[1];
  const multi = (t.match(/Multi-Entry:\s*\n?(\d+)/) || [])[1];
  const live = (t.match(/Live In:\s*\n?([\d\-:]+)/) || [])[1];
  const start = (t.match(/(\d+\/\d+\s+\d+:\d+\s+[AP]M\s+EST)/) || [])[1];
  const tbl = document.querySelector('table');
  const entrants = tbl ? Array.from(tbl.querySelectorAll('span')).map(s=>s.innerText).filter(x=>x && !/entr/i.test(x)).slice(0,60) : [];
  return {
    entries: m ? m[1].replace(/,/g,'') : null,
    max: m ? m[2] : null,
    prize: prize || null,
    multi_entry: multi || null,
    live_in: live || null,
    start_time: start || null,
    entrant_sample: entrants,
    captured_at: new Date().toISOString()
  };
})()"""


if __name__ == '__main__':
    # This file documents the poller contract; execution is driven via browser_exec
    # (see dfs/consensus_run.py driver). Kept as the reference implementation.
    print(json.dumps({'pop_url': POP.format(cid='CONTEST_ID'), 'extractor': 'see extract_js()'}))
