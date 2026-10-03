# Provenance: implements the leak-wall fail-closed rules (syntheses.md S3, from
# CARDS_EDGE_VALIDATE r42) composed with buildable-systems.md SYS-28 (feature store
# with (event_ts, creation_ts) semantics, from 2022-managed-geo-distributed-feature-store).
#
# Rules (exact):
#   - latestPriorRow leak wall fails CLOSED on non-finite week stamps (returns null).
#   - Missing market feed refuses 'no_market_feed' -- never proxies a close feed.
#   - Offline store keyed (event_timestamp + creation_timestamp): insert iff key absent.
#   - Online override iff new event_ts > existing, or equal event_ts and new
#     creation_ts > existing.
#   - Leakage rule: nearest-past-value with per-source delay (NGS re-runs 48h, odds 0).
#   - Backfill runner: no-leakage by construction (as-of queries can only see rows
#     whose creation_ts <= query_ts - delay).
#
# DATA BASIS: pure logic module -- no data, no DGP. The leak-injection acceptance
# test lives in trust/tests/test_trust.py.

import math

NO_MARKET_FEED = "no_market_feed"

# Per-source visibility delays in hours (SYS-28): NGS re-runs land 48h late, odds 0.
SOURCE_DELAYS_HOURS = {
    "ngs": 48.0,
    "odds": 0.0,
}


def _is_finite_week(w):
    try:
        return math.isfinite(float(w))
    except (TypeError, ValueError):
        return False


def latest_prior_row(store=None, kickoff_week=None, row_week=None):
    """Latest row strictly prior to kickoff_week. FAILS CLOSED: a non-finite
    kickoff_week returns None (never a row, never an exception that a caller
    could misread as data). With no store (or no prior row), also None.

    store: iterable of mappings with a 'row_week' key (any event store).
    """
    if not _is_finite_week(kickoff_week):
        return None
    if store is None:
        return None
    kw = float(kickoff_week)
    best, best_w = None, -math.inf
    for row in store:
        try:
            rw = float(row["row_week"])
        except (KeyError, TypeError, ValueError):
            continue
        if math.isfinite(rw) and rw < kw and rw > best_w:
            best, best_w = row, rw
    return best


def select_market_snapshot(feed=None):
    """Refuse a missing market feed -- raise, never proxy.

    Raises Exception carrying 'no_market_feed' when feed is None. A provided feed
    is returned wrapped as {value, grain, provenance} (S3 covariate-bus rule:
    never a bare float/value).
    """
    if feed is None:
        raise Exception(
            f"{NO_MARKET_FEED}: refusing to proxy a missing market feed -- "
            "no snapshot will be fabricated"
        )
    return {"value": feed, "grain": "market_snapshot", "provenance": "select_market_snapshot"}


class FeatureStore:
    """(event_ts, creation_ts) feature store with as-of / no-leakage semantics.

    Timestamps are floats in hours (any consistent unit works; delays are in hours).
    - insert_offline(source, entity, event_ts, creation_ts, value): keyed
      (source, entity, event_ts, creation_ts); insert iff key absent (append-only).
    - insert_online(source, entity, event_ts, creation_ts, value): serving row per
      (source, entity); override iff new event_ts > existing, or equal event_ts and
      new creation_ts > existing.
    - as_of(source, entity, query_ts): nearest-past-value -- among rows with
      event_ts <= query_ts AND creation_ts <= query_ts - delay(source), return the
      value with the greatest event_ts. A future-dated row (event or creation) can
      NEVER be read by an as-of query at or before its timestamps: no-leakage by
      construction.
    """

    def __init__(self, source_delays=None):
        self._offline = {}  # (source, entity, event_ts, creation_ts) -> value
        self._online = {}   # (source, entity) -> (event_ts, creation_ts, value)
        self._delays = dict(SOURCE_DELAYS_HOURS)
        if source_delays:
            self._delays.update(source_delays)

    def delay(self, source):
        return float(self._delays.get(source, 0.0))

    def insert_offline(self, source, entity, event_ts, creation_ts, value):
        key = (source, entity, float(event_ts), float(creation_ts))
        if key in self._offline:
            return False
        self._offline[key] = value
        return True

    def insert_online(self, source, entity, event_ts, creation_ts, value):
        event_ts, creation_ts = float(event_ts), float(creation_ts)
        key = (source, entity)
        cur = self._online.get(key)
        if cur is not None:
            ce, cc, _ = cur
            if not (event_ts > ce or (event_ts == ce and creation_ts > cc)):
                return False
        self._online[key] = (event_ts, creation_ts, value)
        return True

    def as_of(self, source, entity, query_ts):
        """Point-in-time-correct read. Returns None when nothing is visible."""
        query_ts = float(query_ts)
        horizon = query_ts - self.delay(source)
        best_ts, best_val = -math.inf, None
        for (s, e, ets, cts), v in self._offline.items():
            if s == source and e == entity and ets <= query_ts and cts <= horizon:
                if ets > best_ts:
                    best_ts, best_val = ets, v
        cur = self._online.get((source, entity))
        if cur is not None:
            ets, cts, v = cur
            if ets <= query_ts and cts <= horizon and ets > best_ts:
                best_ts, best_val = ets, v
        return best_val
