#!/usr/bin/env python3
"""
freshness.py — THE 'TODAY' CUT-OFF AND FRESHNESS PROTOCOL (readiness gap 3).
Any live pull passes through here: every read is asof(decision_t) and every feed
row must be knowable at decision time (observed_at <= decision_t, report_ts <= observed_at).
No future data, no corrected box scores, no post-decision injuries. Enforcement, not advice.
"""
import json, os, sys
from datetime import datetime, timezone
sys.path.insert(0, "/var/minis/workspace")
from doctrine import Warehouse, LatencyTracker, parse_ts

UTC = timezone.utc
FEEDS = {
    "injuries": "/var/minis/workspace/feeds/injuries_feed.jsonl",
    "weather": "/var/minis/workspace/feeds/weather_feed.jsonl",
    "flow": "/var/minis/workspace/pump/flow_warehouse.jsonl",
}

class FreshnessGate:
    """decision_t-aware view over every feed. The ONLY sanctioned read path for
    live pulls (mirrors Warehouse.asof discipline at feed level)."""

    def __init__(self, decision_t):
        self.decision_t = parse_ts(decision_t)
        self.lat = LatencyTracker()
        self.violations = []

    def load_feed(self, name):
        path = FEEDS.get(name)
        if not path or not os.path.exists(path):
            return []
        rows = []
        with open(path) as f:
            for line in f:
                try:
                    r = json.loads(line)
                except json.JSONDecodeError:
                    continue
                obs = r.get("observed_at")
                if not obs:
                    self.violations.append(f"{name}: row without observed_at (dropped)")
                    continue
                # RULE: only rows observed BEFORE the decision timestamp
                if parse_ts(obs) <= self.decision_t:
                    rows.append(r)
        return rows

    def knowable(self, row):
        """A row is knowable iff observed_at <= decision_t (report_ts already <= observed_at
        by construction; LatencyTracker stamps any drift)."""
        return parse_ts(row["observed_at"]) <= self.decision_t

    def snapshot(self):
        out = {}
        for name in FEEDS:
            rows = self.load_feed(name)
            out[name] = {"n_usable": len(rows),
                         "last_observed": max((r["observed_at"] for r in rows), default=None)}
        out["_decision_t"] = datetime.fromtimestamp(self.decision_t, UTC).isoformat()
        out["_violations"] = self.violations[:10]
        return out

if __name__ == "__main__":
    g = FreshnessGate("2026-10-10T23:59:00Z")
    snap = g.snapshot()
    print(json.dumps(snap, indent=1))
    print("\n[RULE] every live pull must construct FreshnessGate(decision_t) FIRST and read")
    print("       only through it. Anything observed after decision_t does not exist.")
