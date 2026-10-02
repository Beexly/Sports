# Provenance: trust-signals module test suite. Tests the contracts in
# gse-intelligence-build/contracts/integration-contracts.md §1 and the behavior
# specified in corpus-intelligence/deep/c05/buildable-systems.md.
# Honesty: heuristic outputs are asserted as INFERENCE; SPEC defaults are asserted
# as the documented values, not as research findings.

"""Unit + integration tests for the trust-signals intake module.

Run from ~/workspace/gse-intelligence-build/:
    python3 -m unittest discover -s tests -p "test_trust_signals*.py" -v
"""

import importlib.util
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_pkg():
    pkg_dir = os.path.join(BUILD_ROOT, "trust-signals")
    spec = importlib.util.spec_from_file_location(
        "trust_signals",
        os.path.join(pkg_dir, "__init__.py"),
        submodule_search_locations=[pkg_dir],
    )
    mod = importlib.util.module_from_spec(spec)
    sys.modules["trust_signals"] = mod
    spec.loader.exec_module(mod)
    return mod


ts = _load_pkg()
from trust_signals import classify as C  # noqa: E402
from trust_signals import decay as D  # noqa: E402
from trust_signals import entities as E  # noqa: E402
from trust_signals import news_wire as NW  # noqa: E402
from trust_signals import pipeline as P  # noqa: E402
from trust_signals import provider as PV  # noqa: E402
from trust_signals import sources as S  # noqa: E402
from trust_signals import store as ST  # noqa: E402
from trust_signals import tipster as T  # noqa: E402
from trust_signals.models import (  # noqa: E402
    CheckCadence,
    EventType,
    Materiality,
    NewsEvent,
    RawItem,
    SignalOrigin,
    SignalType,
    SourceStatus,
    TrackTag,
    TrustSignal,
    TrustTier,
    Verification,
    utcnow,
)


def _item(text, handle="@mysportsupdate", post_id="1", hours_ago=2, url="https://x.com/y/1"):
    now = utcnow()
    return RawItem(
        source_handle=handle,
        post_id=post_id,
        raw_text=text,
        url=url,
        observed_at=now - timedelta(hours=hours_ago),
        fetched_at=now,
    )


ROSTER = {
    "deshaun watson": "player:watson:QB",
    "aaron rodgers": "player:rodgers:QB",
    "roman wilson": "player:wilson:WR",
    "tj watt": "player:watt:OLB",
    "cam jurgens": "player:jurgens:OL",
}


# ---------------------------------------------------------------------------
# Sources / scheduler
# ---------------------------------------------------------------------------

class TestSources(unittest.TestCase):
    def test_six_sources_registered(self):
        self.assertEqual(len(S.SOURCES), 6)

    def test_barlowe_pending_verification_and_excluded(self):
        barlowe = S.get_source("@matt_barlowe")
        self.assertEqual(barlowe.status, SourceStatus.PENDING_VERIFICATION)
        self.assertNotIn(barlowe, S.active_sources())
        self.assertEqual(len(S.active_sources()), 5)

    def test_daily_tier_two_checks_per_day(self):
        src = S.get_source("@mysportsupdate")
        now = utcnow()
        self.assertTrue(S.due_for_check(src, now, None))
        self.assertTrue(S.due_for_check(src, now, now - timedelta(hours=13)))
        self.assertFalse(S.due_for_check(src, now, now - timedelta(hours=11)))

    def test_event_driven_only_on_trigger(self):
        src = S.get_source("@shauncore")
        now = utcnow()
        self.assertFalse(S.due_for_check(src, now, None))
        self.assertTrue(S.due_for_check(src, now, None, event_trigger=True))

    def test_unknown_handle_raises(self):
        with self.assertRaises(KeyError):
            S.get_source("@nobody")


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------

class TestClassify(unittest.TestCase):
    def test_injury_classification(self):
        t = C.classify("Browns LT ruled out Sunday with a knee injury, did not practice Friday")
        self.assertEqual(t, SignalType.INJURY)

    def test_lineup_classification(self):
        t = C.classify("Steelers name the rookie the starter; veteran benched after Week 3")
        self.assertEqual(t, SignalType.LINEUP)

    def test_scheme_classification(self):
        t = C.classify("Monken leaning into quick game and play-action on early downs")
        self.assertEqual(t, SignalType.SCHEME)

    def test_trust_dynamics_negative(self):
        note = C.detect_trust_dynamics("Rodgers burying Metcalf on the sideline: this mfer sucks ass")
        self.assertIsNotNone(note)
        self.assertIn("negative", note)

    def test_trust_dynamics_positive(self):
        note = C.detect_trust_dynamics("Rodgers: Roman Wilson is my guy, I trust him on third down")
        self.assertIsNotNone(note)
        self.assertIn("positive", note)

    def test_no_trust_language(self):
        self.assertIsNone(C.detect_trust_dynamics("The total opened at 38.5 and moved to 39."))

    def test_polarity_signs(self):
        self.assertGreater(C.score_polarity("dominant elite performance, full go, cleared"), 0)
        self.assertLess(C.score_polarity("terrible awful struggling disaster"), 0)
        self.assertEqual(C.score_polarity("The game is Sunday at 1pm."), 0.0)

    def test_magnitude_anchors(self):
        self.assertEqual(C.score_magnitude("QB ruled out Sunday", SignalType.INJURY), 0.9)
        self.assertEqual(C.score_magnitude("torn acl, out for season", SignalType.INJURY), 0.9)
        self.assertGreaterEqual(C.score_magnitude("minor ankle tweak", SignalType.INJURY), 0.5)

    def test_outputs_are_inference(self):
        self.assertEqual(C.CLASSIFICATION_VERIFICATION, Verification.INFERENCE)

    def test_trust_quote_gets_trust_signal_tag(self):
        tags = C.track_tags_for(SignalType.INJURY, "Rodgers frustrated with his receiver")
        self.assertIn(TrackTag.TRUST_SIGNAL, tags)


# ---------------------------------------------------------------------------
# Entities
# ---------------------------------------------------------------------------

class TestEntities(unittest.TestCase):
    def test_team_name_resolution(self):
        self.assertIn("PIT", E.resolve_teams("Pittsburgh Steelers pass rush vs Cleveland Browns OL"))
        self.assertIn("CLE", E.resolve_teams("Pittsburgh Steelers pass rush vs Cleveland Browns OL"))

    def test_uppercase_abbreviations(self):
        self.assertEqual(E.resolve_teams("PIT at CLE on TNF"), ["PIT", "CLE"])

    def test_lowercase_english_words_not_teams(self):
        # "was", "sea", "ten", "no" are English words — must not false-positive.
        self.assertEqual(E.resolve_teams("he was frustrated and there was no chemistry at sea"), [])

    def test_player_resolution(self):
        pid, name = E.resolve_player("Deshaun Watson threw for 223 yards", ROSTER)
        self.assertEqual(pid, "player:watson:QB")

    def test_player_no_match(self):
        pid, name = E.resolve_player("some unknown player did a thing", ROSTER)
        self.assertIsNone(pid)


# ---------------------------------------------------------------------------
# Decay
# ---------------------------------------------------------------------------

class TestDecay(unittest.TestCase):
    def test_halves_at_half_life(self):
        now = utcnow()
        obs = now - timedelta(hours=D.HALF_LIVES[SignalType.INJURY])
        w = D.decayed_weight(0.8, SignalType.INJURY, obs, now)
        self.assertAlmostEqual(w, 0.4, places=5)

    def test_motivation_decays_faster_than_injury(self):
        now = utcnow()
        obs = now - timedelta(hours=24)
        w_mot = D.decayed_weight(0.8, SignalType.MOTIVATION, obs, now)
        w_inj = D.decayed_weight(0.8, SignalType.INJURY, obs, now)
        self.assertLess(w_mot, w_inj)

    def test_future_observation_treated_as_now(self):
        now = utcnow()
        w = D.decayed_weight(0.8, SignalType.INJURY, now + timedelta(hours=5), now)
        self.assertAlmostEqual(w, 0.8, places=5)

    def test_stale_detection(self):
        now = utcnow()
        old = now - timedelta(hours=5 * D.HALF_LIVES[SignalType.MOTIVATION])
        self.assertTrue(D.is_stale(SignalType.MOTIVATION, old, now))
        fresh = now - timedelta(hours=1)
        self.assertFalse(D.is_stale(SignalType.MOTIVATION, fresh, now))

    def test_naive_datetimes_do_not_crash(self):
        # Callers sometimes pass naive datetimes; decay coerces to UTC instead
        # of raising TypeError on mixed arithmetic.
        naive_now = datetime.now()
        naive_obs = naive_now - timedelta(hours=24)
        w = D.decayed_weight(0.8, SignalType.INJURY, naive_obs, naive_now)
        self.assertGreater(w, 0)
        self.assertFalse(D.is_stale(SignalType.INJURY, naive_obs, naive_now))


# ---------------------------------------------------------------------------
# Tipster
# ---------------------------------------------------------------------------

class TestTipster(unittest.TestCase):
    def test_new_source_sits_at_tier_prior(self):
        board = T.TipsterBoard({"@a": TrustTier.T2_BEAT})
        self.assertAlmostEqual(board.weight_for("@a", TrustTier.T2_BEAT), 0.8)

    def test_correct_outcomes_raise_weight(self):
        trust = T.SourceTrust(handle="@a", tier=TrustTier.T2_BEAT)
        before = trust.weight
        for _ in range(20):
            trust.record_outcome(True)
        self.assertGreater(trust.weight, before)

    def test_wrong_outcomes_lower_weight(self):
        trust = T.SourceTrust(handle="@a", tier=TrustTier.T2_BEAT)
        before = trust.weight
        for _ in range(20):
            trust.record_outcome(False)
        self.assertLess(trust.weight, before)

    def test_weight_bounded(self):
        trust = T.SourceTrust(handle="@a", tier=TrustTier.T1_OFFICIAL)
        for _ in range(500):
            trust.record_outcome(True)
        self.assertLessEqual(trust.weight, 1.5)
        for _ in range(1000):
            trust.record_outcome(False)
        self.assertGreaterEqual(trust.weight, 0.5)

    def test_leaderboard_ordering(self):
        board = T.TipsterBoard({"@good": TrustTier.T2_BEAT, "@bad": TrustTier.T2_BEAT})
        for _ in range(30):
            board.record_outcome("@good", TrustTier.T2_BEAT, True)
            board.record_outcome("@bad", TrustTier.T2_BEAT, False)
        leaders = board.leaderboard()
        self.assertEqual(leaders[0].handle, "@good")


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------

class TestStore(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.store = ST.IntakeStore(self.tmp)

    def test_dedup_on_post_id(self):
        item = _item("Browns injury news", post_id="abc123")
        self.assertTrue(self.store.save_item(item))
        self.assertFalse(self.store.save_item(item))  # never re-ingest

    def test_content_hash_dedup_for_wire_items(self):
        a = _item("Ravens sign Hendrickson", handle="@wire", post_id=None)
        b = _item("Ravens sign  Hendrickson ", handle="@wire", post_id=None)  # whitespace variant
        self.assertTrue(self.store.save_item(a))
        self.assertFalse(self.store.save_item(b))

    def test_different_day_not_duplicate(self):
        now = utcnow()
        a = RawItem("@wire", None, "Ravens sign Hendrickson", "https://x/y",
                    now - timedelta(days=1), now)
        b = RawItem("@wire", None, "Ravens sign Hendrickson", "https://x/y", now, now)
        self.assertTrue(self.store.save_item(a))
        self.assertTrue(self.store.save_item(b))

    def test_landing_format_and_provenance_rule(self):
        item = _item("Guard island-rate chart: Giants lead the league",
                     handle="@throwthedamball", post_id="2105612970453574116")
        path = self.store.write_landing(item, (TrackTag.OL, TrackTag.TRUST_SIGNAL),
                                        "Giants OL scheme note — highest island rates")
        with open(path, encoding="utf-8") as f:
            content = f.read()
        self.assertIn("2105612970453574116", content)
        self.assertIn("OL", content)
        self.assertIn("Giants OL scheme note", content)

    def test_landing_rejects_item_without_provenance(self):
        item = _item("no url and no gap", url=None)
        item = RawItem(item.source_handle, item.post_id, item.raw_text, None,
                       item.observed_at, item.fetched_at, provenance_gap=None)
        with self.assertRaises(ValueError):
            self.store.write_landing(item, (TrackTag.NEWS,), "note")

    def test_landing_accepts_provenance_gap(self):
        item = RawItem("@the_waldman", "2105678944465027107", "sim numbers",
                       None, utcnow() - timedelta(hours=1), utcnow(),
                       provenance_gap="mirror 403; content inferred from timeline")
        path = self.store.write_landing(item, (TrackTag.QB_BEHAVIOR,), "Waldman sims")
        with open(path, encoding="utf-8") as f:
            self.assertIn("PROVENANCE-GAP", f.read())


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class TestPipeline(unittest.TestCase):
    def test_injury_item_pipeline(self):
        src = S.get_source("@mysportsupdate")
        item = _item("Browns starting LT ruled out Sunday with a knee injury — did not practice Friday",
                     post_id="p1")
        signals = P.process_item(item, src, ROSTER)
        self.assertEqual(len(signals), 1)
        sig = signals[0]
        self.assertEqual(sig.signal_type, SignalType.INJURY)
        self.assertEqual(sig.team, "CLE")
        self.assertEqual(sig.verification, Verification.INFERENCE)
        self.assertGreaterEqual(sig.magnitude, 0.7)
        self.assertLess(sig.polarity, 0)

    def test_trust_quote_yields_secondary_signal(self):
        src = S.get_source("@mysportsupdate")
        item = _item("Rodgers burying Metcalf on the sideline: this mfer sucks ass",
                     post_id="p2")
        signals = P.process_item(item, src, ROSTER)
        types = {s.signal_type for s in signals}
        self.assertIn(SignalType.TRUST_QUOTE, types)

    def test_unresolvable_team_sets_data_gap(self):
        src = S.get_source("@doug_clawson")
        item = _item("Trevor Lawrence is the 4th player ever with 10 total TD and 0 turnovers",
                     post_id="p3")
        signals = P.process_item(item, src, ROSTER)
        self.assertIsNone(signals[0].team)
        self.assertIsNotNone(signals[0].data_gap)

    def test_source_lane_hint_waldman(self):
        # A @the_waldman post with no beat keywords is a projection set, not a
        # motivational quote — the registry's coverage lane disambiguates.
        src = S.get_source("@the_waldman")
        item = _item("Rodgers 17.9, Fannin 16.1, Watson 14.5, Warren 14.0 (half-PPR)",
                     handle="@the_waldman", post_id="w9")
        signals = P.process_item(item, src, ROSTER)
        self.assertEqual(signals[0].signal_type, SignalType.PROJECTION_DIVERGENCE)

    def test_source_lane_hint_clawson(self):
        src = S.get_source("@doug_clawson")
        item = _item("Lawrence is the 4th player ever with 10 total TD and 0 turnovers",
                     handle="@doug_clawson", post_id="w10")
        signals = P.process_item(item, src, ROSTER)
        self.assertEqual(signals[0].signal_type, SignalType.HISTORICAL_COMP)

    def test_no_lane_hint_for_unknown_sources(self):
        # Sources without an unambiguous lane keep the honest MOTIVATION default.
        src = S.get_source("@shauncore")
        item = _item("Rodgers 17.9, Fannin 16.1, Watson 14.5 (half-PPR)",
                     handle="@shauncore", post_id="w11")
        signals = P.process_item(item, src, ROSTER)
        self.assertEqual(signals[0].signal_type, SignalType.MOTIVATION)

    def test_beat_vector_aggregation(self):
        now = utcnow()
        sigs = [
            TrustSignal("s1", "CLE", None, None, SignalType.INJURY, SignalOrigin.TEXT,
                        "t", "@mysportsupdate", "u", now, Verification.INFERENCE,
                        (TrackTag.NEWS,), -0.8, 0.9),
            TrustSignal("s2", "CLE", None, None, SignalType.SCHEME, SignalOrigin.TEXT,
                        "t", "@throwthedamball", "u", now, Verification.INFERENCE,
                        (TrackTag.SCHEME,), 0.2, 0.5),
        ]
        vec = P.build_beat_vector("CLE", 2026, 4, sigs)
        self.assertEqual(vec.injury_impact, 0.9)   # max, not average
        self.assertEqual(vec.scheme_notes, 0.5)
        self.assertEqual(vec.verification, Verification.COMPUTED)

    def test_hold_flags(self):
        now = utcnow()
        sig = TrustSignal("s9", "PIT", None, None, SignalType.INJURY, SignalOrigin.TEXT,
                          "starting QB ruled out", "@mysportsupdate", "u", now,
                          Verification.INFERENCE, (TrackTag.NEWS,), -1.0, 0.9)
        flags = P.hold_flags([sig], now)
        self.assertEqual(len(flags), 1)
        self.assertEqual(flags[0].team, "PIT")
        # old news does not hold
        old = TrustSignal("s8", "PIT", None, None, SignalType.INJURY, SignalOrigin.TEXT,
                          "t", "@mysportsupdate", "u", now - timedelta(hours=48),
                          Verification.INFERENCE, (TrackTag.NEWS,), -1.0, 0.9)
        self.assertEqual(P.hold_flags([old], now), [])


# ---------------------------------------------------------------------------
# News wire
# ---------------------------------------------------------------------------

class TestNewsWire(unittest.TestCase):
    def test_qb_injury_is_high_materiality(self):
        et, mat = NW.classify_event("Steelers starting QB ruled out Sunday, torn ACL — out for season")
        self.assertEqual(et, EventType.INJURY)
        self.assertEqual(mat, Materiality.HIGH)

    def test_transaction_is_medium(self):
        et, mat = NW.classify_event("Ravens sign former Bengals DE Trey Hendrickson")
        self.assertEqual(et, EventType.TRANSACTION)
        self.assertEqual(mat, Materiality.MEDIUM)

    def test_qb_injury_triggers_qb_profile_rerun(self):
        item = _item("Deshaun Watson starting QB ruled out Sunday with torn ACL, out for season",
                     post_id="w1")
        event = NW.make_event(item, ROSTER)
        triggers = NW.triggers_for(event, roster=ROSTER)
        types = {t.trigger_type for t in triggers}
        self.assertIn("qb_profile", types)
        qb_t = [t for t in triggers if t.trigger_type == "qb_profile"][0]
        self.assertEqual(qb_t.target, "player:watson:QB")
        self.assertEqual(qb_t.materiality, Materiality.HIGH)

    def test_ol_injury_triggers_ol_state(self):
        item = _item("Browns starting LT Cam Jurgens out for season, torn ACL", post_id="w2")
        event = NW.make_event(item, ROSTER)
        triggers = NW.triggers_for(event, roster=ROSTER)
        self.assertIn("ol_state", {t.trigger_type for t in triggers})

    def test_low_narrative_without_team_no_triggers(self):
        item = _item("Power rankings are out and the debate begins", post_id="w3")
        event = NW.make_event(item, ROSTER)
        self.assertEqual(NW.triggers_for(event, roster=ROSTER), [])

    def test_mirror_item_gets_single_source(self):
        item = _item("Ravens sign Hendrickson", post_id="w4")
        event = NW.make_event(item, ROSTER)
        self.assertEqual(event.verification, Verification.SINGLE_SOURCE)


# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

class TestProvider(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.store = ST.IntakeStore(self.tmp)
        now = utcnow()
        for i, (text, team, mag, h) in enumerate([
            ("Browns starting LT ruled out with knee injury", "CLE", 0.9, 2),
            ("Browns activate backup guard from IR", "CLE", 0.5, 30),
            ("Steelers Watt full practice participant", "PIT", 0.4, 5),
        ]):
            sig = TrustSignal(
                signal_id=f"ts{i}", team=team, player_id=None, player_name=None,
                signal_type=SignalType.INJURY, signal_origin=SignalOrigin.TEXT,
                text=text, source_handle="@mysportsupdate", source_url="https://x/y",
                observed_at=now - timedelta(hours=h),
                verification=Verification.INFERENCE,
                track_tags=(TrackTag.NEWS,), polarity=-0.5, magnitude=mag,
            )
            self.store.save_signal(sig)
        # unresolved-team signal: must be excluded
        self.store.save_signal(TrustSignal(
            signal_id="tsx", team=None, player_id=None, player_name=None,
            signal_type=SignalType.INJURY, signal_origin=SignalOrigin.TEXT,
            text="t", source_handle="@mysportsupdate", source_url="https://x/y",
            observed_at=now, verification=Verification.INFERENCE,
            track_tags=(), polarity=0.0, magnitude=0.9, data_gap="no team",
        ))
        self.provider = PV.FileStoreTrustSignalProvider(self.store, now=now)

    def test_team_scoping(self):
        sigs = self.provider.get_trust_signals("CLE", 4, 2026)
        self.assertEqual(len(sigs), 2)
        self.assertTrue(all(s.team == "CLE" for s in sigs))

    def test_sorted_by_served_weight(self):
        sigs = self.provider.get_trust_signals("CLE", 4, 2026)
        weights = [self.provider.served_weight(s) for s in sigs]
        self.assertEqual(weights, sorted(weights, reverse=True))
        # fresh 0.9-magnitude injury outranks the 30h-old 0.5 item
        self.assertGreater(weights[0], weights[1])

    def test_data_gap_signals_excluded(self):
        sigs = self.provider.get_trust_signals("PIT", 4, 2026)
        self.assertEqual(len(sigs), 1)  # the team-less signal is not served

    def test_unknown_team_empty_list(self):
        self.assertEqual(self.provider.get_trust_signals("XXX", 4, 2026), [])

    def test_shadow_by_default(self):
        sigs = self.provider.get_trust_signals("CLE", 4, 2026)
        self.assertTrue(all(s.shadow for s in sigs))

    def test_live_flag_clears_shadow(self):
        live = PV.FileStoreTrustSignalProvider(self.store, live=True)
        sigs = live.get_trust_signals("CLE", 4, 2026)
        self.assertTrue(all(not s.shadow for s in sigs))

    def test_tipster_weight_applies(self):
        board = T.TipsterBoard({"@mysportsupdate": TrustTier.T2_BEAT})
        for _ in range(30):
            board.record_outcome("@mysportsupdate", TrustTier.T2_BEAT, True)
        boosted = PV.FileStoreTrustSignalProvider(self.store, board=board)
        plain = PV.FileStoreTrustSignalProvider(self.store)
        sigs = self.provider.get_trust_signals("CLE", 4, 2026)
        self.assertGreater(boosted.served_weight(sigs[0]), plain.served_weight(sigs[0]))

    def test_implements_contract_abc(self):
        self.assertIsInstance(self.provider, PV.TrustSignalProviderABC)


# ---------------------------------------------------------------------------
# End-to-end integration
# ---------------------------------------------------------------------------

class TestEndToEnd(unittest.TestCase):
    """Registry item → store → pipeline → provider → beat vector, on TNF-week-shaped data."""

    def test_full_flow(self):
        from trust_signals import fetch as F  # noqa: E402

        tmp = tempfile.mkdtemp()
        store = ST.IntakeStore(tmp)
        board = T.TipsterBoard({s.handle: s.trust_tier for s in S.SOURCES})
        now = utcnow()

        fetcher = F.FixtureFetcher([
            _item("Browns interior OL: two starters ruled out vs PIT pass rush; "
                    "did not practice all week", "@mysportsupdate", "n1", 20),
            _item("Browns leaning into the quick game under Monken: 0.639 quick-game "
                  "rate, 6.12 air yards vs PIT pass rush",
                    "@throwthedamball", "n2", 18),
            _item("Rodgers burying Metcalf on the sideline after the drop", "@mysportsupdate",
                    "n3", 10),
        ])
        src = S.get_source("@mysportsupdate")
        src2 = S.get_source("@throwthedamball")

        # ingest (dedup) → process → store signals → landing files
        for item in fetcher.fetch_since(src, now - timedelta(days=2)):
            if store.save_item(item):
                for sig in P.process_item(item, src, ROSTER):
                    store.save_signal(sig)
                store.write_landing(item, P.process_item(item, src, ROSTER)[0].track_tags,
                                    "TNF-week intake check")
        for item in fetcher.fetch_since(src2, now - timedelta(days=2)):
            if store.save_item(item):
                for sig in P.process_item(item, src2, ROSTER):
                    store.save_signal(sig)

        provider = PV.FileStoreTrustSignalProvider(store, board=board, now=now)
        cle = provider.get_trust_signals("CLE", 4, 2026)
        self.assertGreater(len(cle), 0)
        vec = P.build_beat_vector("CLE", 2026, 4, cle)
        self.assertGreater(vec.injury_impact, 0)
        self.assertGreater(vec.scheme_notes, 0)
        # the re-fetch must not duplicate
        for item in fetcher.fetch_since(src, now - timedelta(days=2)):
            self.assertFalse(store.save_item(item))
        # landing file exists in registry format (keyed by item observed_at day)
        item_day = (now - timedelta(hours=20)).strftime("%Y-%m-%d")
        landing = os.path.join(tmp, "items", "mysportsupdate", item_day + ".md")
        self.assertTrue(os.path.exists(landing))


if __name__ == "__main__":
    unittest.main()
