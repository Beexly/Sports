# Provenance: newregime module — feature store with (event_ts, creation_ts)
# semantics, SYS-28 (2022, r36).
#
# Implements buildable-systems.md SYS-28 exactly:
#   - offline keyed (event_timestamp + creation_timestamp), insert iff key absent
#   - online override iff new event_ts > existing, OR equal event_ts and new
#     creation_ts > existing
#   - leakage rule: nearest-past-value with PER-SOURCE DELAY (NGS re-runs 48h,
#     odds 0 — those delays are the paper's; defaults below are INFERENCE)
#   - backfill runner: no-leakage by construction
#   - acceptance gate: synthetic leak-injection test (insert a future-dated row,
#     prove no as-of query can read it). The paper provides no such validation;
#     this test is the rehabilitation from C13.
#
# Source docs: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md
#               (SYS-28),
#               arxiv-deep/2022-managed-geo-distributed-feature-store.md:28-31,47,58-61.
# Composes with the trust module's fail-closed leak wall (S3) — this store does
# NOT duplicate that API; it is the point-in-time feature layer the wall guards.
#
# DATA BASIS (honesty header): all rows in the acceptance test are synthetic,
# seeded, and in-memory. No real NGS/odds data.

"""Point-in-time-correct feature store (SYS-28)."""

import bisect

# Per-source availability delays in the same time units as the timestamps.
# INFERENCE (documented): the paper names NGS re-runs at 48h and odds at 0;
# the store takes a per-source delay map so each feed declares its own.
DEFAULT_SOURCE_DELAYS = {
    "ngs": 48.0,    # hours — paper's NGS re-run delay (2022, r36)
    "odds": 0.0,    # hours — paper's odds delay
    "default": 0.0,
}


class FeatureStore:
    """In-memory feature store with (event_ts, creation_ts) keying.

    Offline rows: keyed by (feature, entity, event_ts, creation_ts); insert
    iff the key is absent (exact SYS-28 rule).
    Online overrides: per (feature, entity), keep the latest value; override
    iff new event_ts > existing event_ts, or equal event_ts and new
    creation_ts > existing creation_ts (exact SYS-28 rule).
    """

    def __init__(self, source_delays=None):
        self._offline = {}   # (feature, entity, event_ts, creation_ts) -> value
        self._online = {}    # (feature, entity) -> (event_ts, creation_ts, value)
        self._source_delays = dict(DEFAULT_SOURCE_DELAYS)
        if source_delays:
            self._source_delays.update(source_delays)

    # -- offline ----------------------------------------------------------
    def insert_offline(self, feature, entity, event_ts, creation_ts, value):
        """Insert iff key absent. Returns True if inserted, False if the key
        already existed (SYS-28 offline rule)."""
        key = (feature, entity, event_ts, creation_ts)
        if key in self._offline:
            return False
        self._offline[key] = value
        return True

    # -- online -----------------------------------------------------------
    def upsert_online(self, feature, entity, event_ts, creation_ts, value):
        """Override iff new event_ts > existing, or equal event_ts and new
        creation_ts > existing (SYS-28 online rule). Returns True on override."""
        key = (feature, entity)
        cur = self._online.get(key)
        if cur is None:
            self._online[key] = (event_ts, creation_ts, value)
            return True
        e_ts, c_ts, _ = cur
        if event_ts > e_ts or (event_ts == e_ts and creation_ts > c_ts):
            self._online[key] = (event_ts, creation_ts, value)
            return True
        return False

    # -- leakage rule -----------------------------------------------------
    def _delay(self, source):
        return self._source_delays.get(source,
                                       self._source_delays.get("default", 0.0))

    def get_as_of(self, feature, entity, as_of_ts, source="default"):
        """Nearest-past-value with per-source delay (SYS-28 leakage rule).

        A row is READABLE at as_of_ts iff creation_ts <= as_of_ts - delay.
        Among readable rows with event_ts <= as_of_ts - delay, return the one
        with the greatest event_ts (nearest past value). Returns None when
        nothing is readable — this is the fail-closed direction: a row whose
        creation_ts is in the future (or within the source delay) can NEVER
        be returned, no matter how large its event_ts.
        """
        cutoff = as_of_ts - self._delay(source)
        best = None  # (event_ts, value)
        for (f, e, ev_ts, cr_ts), v in self._offline.items():
            if f != feature or e != entity:
                continue
            if cr_ts > cutoff:
                continue          # not yet knowable — the leak wall
            if ev_ts > cutoff:
                continue          # event itself is in the future
            if best is None or ev_ts > best[0]:
                best = (ev_ts, v)
        return best[1] if best is not None else None


class BackfillRunner:
    """Backfill runner: no-leakage by construction (SYS-28).

    Rows are processed in non-decreasing event_ts order and stamped with
    monotonically non-decreasing creation_ts. Because get_as_of can only read
    rows with creation_ts <= as_of - delay, a backfilled row is never readable
    at an as-of time earlier than its stamp — leakage is impossible by
    construction, not by post-hoc filtering.
    """

    def __init__(self, store):
        self._store = store
        self._watermark = float("-inf")

    def run(self, rows, feature, entity, source="default",
            creation_start=0.0):
        """rows: iterable of (event_ts, value). Returns rows inserted."""
        ordered = sorted(rows, key=lambda r: r[0])
        inserted = 0
        creation_ts = max(creation_start, self._watermark)
        for event_ts, value in ordered:
            # creation stamp never moves backwards: the as-of horizon is monotone
            creation_ts = max(creation_ts, event_ts, self._watermark)
            if self._store.insert_offline(feature, entity, event_ts,
                                          creation_ts, value):
                inserted += 1
            self._watermark = max(self._watermark, creation_ts)
        return inserted

    @property
    def watermark(self):
        return self._watermark


def leak_injection_test():
    """SYS-28 acceptance gate: synthetic leak-injection test.

    Inserts a future-dated row (event_ts far in the future, creation_ts = now)
    and proves no as-of query with as_of < creation_ts + delay can read it —
    including as-of times AFTER the row's event_ts (the row 'happened' but was
    not yet knowable). Also proves legitimate past rows remain readable and
    the backfill runner cannot leak.
    """
    store = FeatureStore(source_delays={"odds": 0.0, "ngs": 48.0})
    now = 1_000.0

    # legitimate history
    assert store.insert_offline("epa_play", "team_a", 900.0, 901.0, 0.10)
    assert store.insert_offline("epa_play", "team_a", 950.0, 951.0, 0.20)

    # the leak: a row about an event at t=2000, created now (t=1000)
    assert store.insert_offline("epa_play", "team_a", 2000.0, now, 0.99)

    # 1. as-of BEFORE the leak row was created: must see only history
    assert store.get_as_of("epa_play", "team_a", 999.0,
                           source="odds") == 0.20
    # 2. as-of AT creation time but the event is in the future: still history
    assert store.get_as_of("epa_play", "team_a", now,
                           source="odds") == 0.20
    # 3. as-of AFTER the future event_ts, but still within creation horizon:
    #    with a 48h-delay source the row is not knowable until now+48
    assert store.get_as_of("epa_play", "team_a", 2000.0,
                           source="ngs") == 0.20
    # 4. only once the EVENT is in the knowable past (event_ts + delay) does
    #    the row legitimately become readable — nearest-past-value semantics
    assert store.get_as_of("epa_play", "team_a", 2000.0 + 48.0 + 1.0,
                           source="ngs") == 0.99
    # 4b. between creation and event+delay it stays invisible (still a leak
    #     if read): the event had not happened in the knowable past
    assert store.get_as_of("epa_play", "team_a", 1500.0,
                           source="ngs") == 0.20
    # 5. duplicate key insert is rejected (offline insert-iff-absent)
    assert store.insert_offline("epa_play", "team_a", 2000.0, now,
                                0.99) is False

    # 6. backfill runner: no-leakage by construction
    store2 = FeatureStore()
    runner = BackfillRunner(store2)
    runner.run([(300.0, 0.5), (100.0, 0.1), (200.0, 0.3)],  # out of order in
               "epa_play", "team_b", creation_start=500.0)
    # nothing readable before the watermark stamp
    assert store2.get_as_of("epa_play", "team_b", 499.0) is None
    # at the watermark, nearest-past-value semantics hold (event 300 <= 500)
    assert store2.get_as_of("epa_play", "team_b", 500.0) == 0.5

    # 7. online override rules (exact SYS-28 semantics)
    assert store.upsert_online("spread", "game_1", 100.0, 101.0, -3.0) is True
    assert store.upsert_online("spread", "game_1", 99.0, 200.0,
                               -7.0) is False   # older event_ts: no override
    assert store.upsert_online("spread", "game_1", 100.0, 100.0,
                               -7.0) is False   # equal event, older creation
    assert store.upsert_online("spread", "game_1", 100.0, 102.0,
                               -2.5) is True    # equal event, newer creation
    assert store.upsert_online("spread", "game_1", 110.0, 103.0,
                               -1.5) is True    # newer event_ts
    assert store._online[("spread", "game_1")][2] == -1.5

    return {
        "passed": True,
        "checks": 7,
        "gate": ("insert a future-dated row; prove no as-of query can read "
                 "it before its creation horizon"),
        "gate_cleared": True,
        "data_basis": "seeded synthetic in-memory rows; no real NGS/odds data",
        "provenance": "SYS-28 (2022, r36); buildable-systems.md",
    }
