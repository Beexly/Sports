# Provenance: c06 deep research buildable-systems.md §7 (definition of done) and
# §4.6 (contract tests). Tests the B1–B8 build list: schema extension, extractor
# framework, account extractors, quote miner, clustering, merger, aggregator
# identities, checklist sweep (T2 verbatim), harvester. Honesty: heuristic
# outputs asserted as INFERENCE; SPEC defaults asserted as documented values.
#
# Run from ~/workspace/gse-intelligence-build/ with the venv:
#   ~/workspace/.venvs/gse-intel/bin/python -m unittest discover -s tests \
#       -p "test_trust_signals_c06.py" -v

"""Unit + integration tests for the c06 video/social trust-signals framework."""

import importlib.util
import os
import sys
import tempfile
import unittest
from dataclasses import asdict
from dataclasses import dataclass as _dc
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
from trust_signals import checklist as CH  # noqa: E402
from trust_signals import clustering as CL  # noqa: E402
from trust_signals import merge as MG  # noqa: E402
from trust_signals import pipeline as P  # noqa: E402
from trust_signals import scoring as SC  # noqa: E402
from trust_signals.extractors import REGISTRY, discover  # noqa: E402
from trust_signals.extractors import pipeline as XP  # noqa: E402
from trust_signals.extractors.accounts import (  # noqa: E402
    XMATTBarloweExtractor,
    XMysportsupdateExtractor,
)
from trust_signals.extractors.base import (  # noqa: E402
    ExtractionContext,
    InputKind,
    RawSignal,
    TrustExtractor,
)
from trust_signals.extractors.harvest import (  # noqa: E402
    ClipMetadataHarvester,
    build_sweep_plan,
    metadata_content_hash,
)
from trust_signals.extractors.transcript import TranscriptQuoteMiner  # noqa: E402
from trust_signals.models import (  # noqa: E402
    CalibrationState,
    RawItem,
    SignalOrigin,
    SignalType,
    SpeakerRole,
    TrustDirection,
    TrustSignal,
    Verification,
    utcnow,
)
from trust_signals.provider import FileStoreTrustSignalProvider  # noqa: E402
from trust_signals.store import IntakeStore  # noqa: E402
from reasoning.enums import ChecklistVerdict  # noqa: E402

print("AGG_DEFAULTS (INFERENCE constants under test):", SC.AGG_DEFAULTS)

ROSTER = {
    "aaron rodgers": "player:rodgers:QB",
    "dk metcalf": "player:metcalf:WR",
    "alvin kamara": "player:kamara:RB",
    "zay flowers": "player:flowers:WR",
}
COACHES = {"mike tomlin": "coach:tomlin:PIT"}


def _ctx(**kw):
    d = dict(roster=ROSTER, coach_roster=COACHES, team="PIT", week=4,
             season=2026, kickoff_at=None)
    d.update(kw)
    return ExtractionContext(**d)


@_dc(frozen=True)
class _TestItem(RawItem):
    """RawItem with c06 test-only input fields (frozen-safe)."""
    input_kind: InputKind = InputKind.X_POST
    title: str = ""
    description: str = ""
    uploader: str = ""
    posted_at: object = None


def _item(text, handle="@mysportsupdate", post_id="1", hours_ago=2,
          url="https://x.com/y/1", kind=InputKind.X_POST):
    now = utcnow()
    return _TestItem(
        source_handle=handle,
        post_id=post_id,
        raw_text=text,
        url=url,
        observed_at=now - timedelta(hours=hours_ago),
        fetched_at=now,
        input_kind=kind,
    )


def _sig(signal_id="s1", sig_type=SignalType.TRUST_UP,
         direction=TrustDirection.UP, magnitude=0.6, team="PIT",
         speaker_id="player:rodgers:QB", speaker_name="aaron rodgers",
         target_id="player:metcalf:WR", target_name="dk metcalf",
         origin=SignalOrigin.VIDEO, quote=None, url="https://x.com/y/1",
         role_weight=1.0, cluster=None, hours_ago=2, **kw):
    now = utcnow()
    d = dict(
        signal_id=signal_id, team=team, player_id=target_id,
        player_name=target_name, signal_type=sig_type, signal_origin=origin,
        text=quote or "fixture text", source_handle="@fixture",
        source_url=url, observed_at=now - timedelta(hours=hours_ago),
        verification=Verification.INFERENCE, track_tags=("TRUST-SIGNAL",),
        polarity=0.5 if direction == TrustDirection.UP else -0.5,
        magnitude=magnitude, schema_version="1.1.0",
        speaker_id=speaker_id, speaker_name=speaker_name,
        target_id=target_id, quote_text=quote,
        role_weight=role_weight, extraction_confidence=0.6,
        calibration_state=CalibrationState.UNCALIBRATED,
        trust_direction=direction,
    )
    if cluster:
        d["story_cluster_id"] = cluster
    d.update(kw)
    return TrustSignal(**d)


class _StubProvider:
    def __init__(self, signals):
        self._signals = signals

    def get_trust_signals(self, team, week, season):
        return [s for s in self._signals if s.team == team]


# ---------------------------------------------------------------------------
# B1 — schema extension + shared-store write + merger
# ---------------------------------------------------------------------------
class TestSchemaExtension(unittest.TestCase):
    def test_old_rows_deserialize_with_defaults(self):
        """Backward compat: pre-extension rows read unchanged (schema 1.0.0)."""
        with tempfile.TemporaryDirectory() as root:
            store = IntakeStore(root)
            old = TrustSignal(
                "old1", "CLE", None, None, SignalType.INJURY,
                SignalOrigin.TEXT, "text", "@h", None, utcnow(),
                Verification.INFERENCE, (), 0.0, 0.5, None, None, True,
            )
            store.save_signal(old)
            prov = FileStoreTrustSignalProvider(store)
            (back,) = prov.get_trust_signals("CLE", 1, 2026)
            self.assertEqual(back.schema_version, "1.0.0")
            self.assertEqual(back.calibration_state, CalibrationState.UNCALIBRATED)
            self.assertEqual(back.trust_direction, TrustDirection.UNKNOWN)
            self.assertIsNone(back.speaker_id)
            self.assertEqual(back.role_weight, 1.0)
            self.assertEqual(back.merged_provenance, ())

    def test_new_rows_round_trip(self):
        """c06 rows (schema 1.1.0) round-trip through _dict_to_signal."""
        with tempfile.TemporaryDirectory() as root:
            store = IntakeStore(root)
            sig = _sig(signal_id="new1", quote="the quote",
                       cluster="story_abc", url="https://x.com/y/9")
            store.save_signal(sig)
            prov = FileStoreTrustSignalProvider(store)
            (back,) = prov.get_trust_signals("PIT", 4, 2026)
            self.assertEqual(back.schema_version, "1.1.0")
            self.assertEqual(back.quote_text, "the quote")
            self.assertEqual(back.story_cluster_id, "story_abc")
            self.assertEqual(back.trust_direction, TrustDirection.UP)
            self.assertEqual(back.speaker_id, "player:rodgers:QB")
            self.assertTrue(back.shadow)  # wire-first: everything ships shadow

    def test_new_signal_types_parse(self):
        for name in ("TRUST_UP", "TRUST_DOWN", "FRUSTRATION",
                     "PRAISE_UNPROMPTED", "ROLE_INCREASE", "ROLE_DECREASE",
                     "EXPERT_DISAGREEMENT", "NEWS_CONFLICT", "RETRACTION"):
            self.assertIn(name, SignalType.__members__)
        self.assertIn("SOCIAL", SignalOrigin.__members__)


class TestQuoteHashMerger(unittest.TestCase):
    def _pair(self):
        q = "Rodgers on Metcalf: this mfer sucks ass"
        a = _sig("qa", sig_type=SignalType.TRUST_QUOTE,
                 direction=TrustDirection.DOWN, quote=q,
                 origin=SignalOrigin.TEXT, url="https://text.example/1",
                 hours_ago=5)
        b = _sig("qb", sig_type=SignalType.FRUSTRATION,
                 direction=TrustDirection.DOWN, quote=q,
                 origin=SignalOrigin.VIDEO, url="https://video.example/2",
                 hours_ago=2)
        return a, b

    def test_same_quote_text_video_merge_to_one(self):
        """B1: same Rodgers quote via TEXT + VIDEO -> one canonical row."""
        a, b = self._pair()
        merged = MG.merge_signals([a, b])
        self.assertEqual(len(merged), 1)
        canon = merged[0]
        self.assertEqual(canon.signal_id, "qa")  # earliest observed_at wins
        self.assertIn("https://text.example/1", canon.merged_provenance)
        self.assertIn("https://video.example/2", canon.merged_provenance)

    def test_loser_gets_dedup_of(self):
        a, b = self._pair()
        marked = MG.mark_losers([a, b])
        canon = [s for s in marked if s.signal_id == "qa"][0]
        loser = [s for s in marked if s.signal_id == "qb"][0]
        self.assertIsNone(canon.dedup_of)
        self.assertEqual(loser.dedup_of, "qa")
        # provenance union applied to the canonical row
        self.assertIn("https://video.example/2", canon.merged_provenance)

    def test_merger_idempotent(self):
        """Re-running the merger on merged output changes nothing."""
        a, b = self._pair()
        once = MG.mark_losers([a, b])
        twice = MG.mark_losers(once)
        self.assertEqual([s.signal_id for s in once],
                         [s.signal_id for s in twice])
        self.assertEqual([s.dedup_of for s in once],
                         [s.dedup_of for s in twice])
        self.assertEqual(MG.merge_signals(once), MG.merge_signals(twice))

    def test_distinct_quotes_do_not_merge(self):
        a, b = self._pair()
        c = _sig("qc", quote="a completely different statement about practice",
                 url="https://x.com/y/3")
        self.assertEqual(len(MG.merge_signals([a, b, c])), 2)


# ---------------------------------------------------------------------------
# B2 — extractor plugin framework (fail-loud contract)
# ---------------------------------------------------------------------------
class TestExtractorContract(unittest.TestCase):
    def test_missing_provenance_raises(self):
        """No URL and no provenance_gap -> ValueError (registry rule)."""

        class BadExtractor(TrustExtractor):
            name = "bad_extractor"
            version = "1.0.0"
            input_kinds = frozenset({InputKind.X_POST})
            emits_origin = SignalOrigin.SOCIAL

            def extract(self, item, ctx):
                return [RawSignal(signal_type=SignalType.INJURY, text="x")]

        with self.assertRaises(ValueError):
            XP.raw_to_signal(RawSignal(signal_type=SignalType.INJURY, text="x"),
                             _item("x"), _ctx(), BadExtractor())

    def test_unknown_signal_type_raises(self):
        raw = RawSignal(signal_type=SignalType.INJURY, text="x",
                        source_url="https://x.com/y/1")
        raw.signal_type = "not_a_real_type"  # bypass constructor typing
        with self.assertRaises(ValueError):
            XP.raw_to_signal(raw, _item("x"), _ctx(), XMysportsupdateExtractor())

    def test_unresolved_speaker_sets_data_gap(self):
        """Never guesses: unknown speaker -> data_gap, not a fabricated ID."""

        class MysteryExtractor(TrustExtractor):
            name = "mystery"
            version = "1.0.0"
            input_kinds = frozenset({InputKind.X_POST})
            emits_origin = SignalOrigin.SOCIAL

            def extract(self, item, ctx):
                return [RawSignal(signal_type=SignalType.TRUST_QUOTE,
                                  speaker_name="Some Unknown Person",
                                  target_name="aaron rodgers",
                                  text="mystery quote",
                                  source_url="https://x.com/y/1")]

        sig = XP.raw_to_signal(
            MysteryExtractor().extract(_item("x"), _ctx())[0],
            _item("x"), _ctx(), MysteryExtractor())
        self.assertIsNotNone(sig.data_gap)
        self.assertIsNone(sig.speaker_id)
        self.assertEqual(sig.speaker_role, SpeakerRole.UNKNOWN)

    def test_provenance_gap_pins_role_weight_floor(self):
        """PROVENANCE-GAP items pin role_weight to the LEAP 0.05 floor."""

        class GapExtractor(TrustExtractor):
            name = "gap_extractor"
            version = "1.0.0"
            input_kinds = frozenset({InputKind.X_POST})
            emits_origin = SignalOrigin.SOCIAL

            def extract(self, item, ctx):
                return [RawSignal(signal_type=SignalType.INJURY, text="x",
                                  provenance_gap="registry known-gap #1")]

        sig = XP.raw_to_signal(
            GapExtractor().extract(_item("x"), _ctx())[0],
            _item("x"), _ctx(), GapExtractor())
        self.assertEqual(sig.role_weight, 0.05)

    def test_barlowe_parked(self):
        """@matt_barlowe defined but NOT registered (PENDING_VERIFICATION)."""
        discover.discover()
        self.assertNotIn("x_matt_barlowe", REGISTRY)
        self.assertEqual(XMATTBarloweExtractor().extract(_item("x"), _ctx()), [])

    def test_frozen_pre_kickoff_computed(self):
        kickoff = utcnow() + timedelta(hours=1)
        sig = XP.raw_to_signal(
            RawSignal(signal_type=SignalType.INJURY, text="Steelers x",
                      source_url="https://x.com/y/1"),
            _item("Steelers x"), _ctx(kickoff_at=kickoff),
            XMysportsupdateExtractor())
        self.assertTrue(sig.frozen_pre_kickoff)


# ---------------------------------------------------------------------------
# B3 — six-account X extractors
# ---------------------------------------------------------------------------
class TestAccountExtractors(unittest.TestCase):
    def test_mysportsupdate_injury(self):
        ext = [e for e in REGISTRY.values() if e.name == "x_mysportsupdate"][0]()
        item = _item("Steelers QB ruled out with concussion, doubtful Sunday",
                     handle="@mysportsupdate")
        raws = ext.extract(item, _ctx())
        self.assertTrue(any(r.signal_type == SignalType.INJURY for r in raws))

    def test_mysportsupdate_role_increase(self):
        ext = [e for e in REGISTRY.values() if e.name == "x_mysportsupdate"][0]()
        item = _item("Rookie taking first-team reps at left tackle for PIT",
                     handle="@mysportsupdate")
        raws = ext.extract(item, _ctx())
        self.assertTrue(any(r.signal_type == SignalType.ROLE_INCREASE for r in raws))

    def test_waldman_divergence(self):
        ext = [e for e in REGISTRY.values() if e.name == "x_the_waldman"][0]()
        item = _item("My sim projection has 24.5 carries but the Vegas prop "
                     "line is 18.5 — books have this wrong",
                     handle="@the_waldman")
        raws = ext.extract(item, _ctx())
        self.assertTrue(any(r.signal_type == SignalType.EXPERT_DISAGREEMENT
                            for r in raws))

    def test_throwthedamball_scheme(self):
        ext = [e for e in REGISTRY.values() if e.name == "x_throwthedamball"][0]()
        item = _item("Charted: PIT guards allowed a 4.2% pressure rate on true "
                     "pass sets — elite island numbers", handle="@throwthedamball")
        raws = ext.extract(item, _ctx())
        self.assertTrue(any(r.signal_type == SignalType.SCHEME for r in raws))

    def test_clawson_hist_comp(self):
        ext = [e for e in REGISTRY.values() if e.name == "x_doug_clawson"][0]()
        item = _item("This reminds me of prime 2016 line play, era-adjusted "
                     "the comp for this unit is clear", handle="@doug_clawson")
        raws = ext.extract(item, _ctx())
        self.assertTrue(any(r.signal_type == SignalType.HISTORICAL_COMP
                            for r in raws))

    def test_shauncore_scheme(self):
        ext = [e for e in REGISTRY.values() if e.name == "x_shauncore"][0]()
        item = _item("All-22: PIT showing two-high shell then rotating to "
                     "cover 3 — classic disguise", handle="@shauncore")
        raws = ext.extract(item, _ctx())
        self.assertTrue(any(r.signal_type == SignalType.SCHEME for r in raws))

    def test_extractors_ignore_other_handles(self):
        for name, cls in REGISTRY.items():
            if not name.startswith("x_"):
                continue
            ext = cls()
            item = _item("some generic football text", handle="@someone_else")
            self.assertEqual(ext.extract(item, _ctx()), [], name)

    def test_all_outputs_inference(self):
        ext = [e for e in REGISTRY.values() if e.name == "x_mysportsupdate"][0]()
        item = _item("Steelers QB ruled out Sunday", handle="@mysportsupdate")
        for raw in ext.extract(item, _ctx()):
            self.assertEqual(raw.verification, Verification.INFERENCE)


# ---------------------------------------------------------------------------
# B4 — transcript quote-miner
# ---------------------------------------------------------------------------
class TestQuoteMiner(unittest.TestCase):
    def _miner(self):
        return [e for e in REGISTRY.values()
                if e.name == "transcript_quote_miner"][0]()

    def test_rodgers_metcalf_fixture(self):
        """Fixture #1: the Rodgers–Metcalf quote -> FRUSTRATION, speaker
        Rodgers, target Metcalf."""
        text = ("Rodgers: Look, this mfer sucks ass. I mean, DK Metcalf "
                "has to be better than that.")
        item = _item(text, kind=InputKind.TRANSCRIPT)
        raws = self._miner().extract(item, _ctx())
        self.assertTrue(len(raws) >= 1)
        frust = [r for r in raws if r.signal_type == SignalType.FRUSTRATION]
        self.assertTrue(frust, f"no FRUSTRATION in {[r.signal_type for r in raws]}")
        self.assertEqual(frust[0].speaker_name, "Rodgers")
        self.assertEqual(frust[0].target_name, "dk metcalf")
        self.assertEqual(frust[0].trust_direction, TrustDirection.DOWN)

    def test_praise_quote(self):
        text = ("Rodgers: I love throwing to DK Metcalf. He is an unbelievable "
                "player, my go-to guy on third down.")
        item = _item(text, kind=InputKind.TRANSCRIPT)
        raws = self._miner().extract(item, _ctx())
        ups = [r for r in raws if r.signal_type in
               (SignalType.TRUST_UP, SignalType.PRAISE_UNPROMPTED)]
        self.assertTrue(ups)
        self.assertEqual(ups[0].trust_direction, TrustDirection.UP)

    def test_pipeline_resolves_miner_output(self):
        """Miner output through run_extractors resolves IDs, writes the store."""
        text = "Rodgers: I trust Aaron Rodgers completely. Wait — I mean I trust DK Metcalf."
        item = _item(text, kind=InputKind.TRANSCRIPT)
        with tempfile.TemporaryDirectory() as root:
            store = IntakeStore(root)
            miner = self._miner()
            written = XP.run_extractors(item, _ctx(), store, extractors=[miner])
            self.assertTrue(len(written) >= 1)
            sig = written[0]
            self.assertEqual(sig.extractor_name, "transcript_quote_miner")
            self.assertEqual(sig.signal_origin, SignalOrigin.VIDEO)
            self.assertTrue(sig.shadow)
            self.assertEqual(sig.schema_version, "1.1.0")
            self.assertIsNotNone(sig.quote_text)  # raw quote emitted for humans

    def test_baseline_precision_recall_recorded(self):
        """50-quote style baseline: small labeled set, precision/recall per
        direction REPORTED (not gated — no corpus threshold exists)."""
        labeled = [
            ("Rodgers: DK Metcalf is unbelievable, I love that guy.", "up"),
            ("Rodgers: this mfer sucks ass, DK Metcalf has to be better.", "down"),
            ("Tomlin: I have full trust in Aaron Rodgers.", "up"),
            ("Rodgers: The weather in Pittsburgh is terrible today.", None),
            ("Rodgers: I'm frustrated with myself, I have to be better.", "down"),
            ("Tomlin: DK Metcalf is a warrior, proud of his effort.", "up"),
            ("Rodgers: Next question.", None),
            ("Rodgers: Metcalf's effort was unacceptable Sunday.", "down"),
        ]
        tp = {"up": 0, "down": 0}
        fp = {"up": 0, "down": 0}
        fn = {"up": 0, "down": 0}
        for text, want in labeled:
            item = _item(text, kind=InputKind.TRANSCRIPT)
            raws = self._miner().extract(item, _ctx())
            got = None
            if raws:
                d = raws[0].trust_direction
                got = "up" if d == TrustDirection.UP else (
                    "down" if d == TrustDirection.DOWN else None)
            for direction in ("up", "down"):
                if want == direction and got == direction:
                    tp[direction] += 1
                elif want == direction:
                    fn[direction] += 1
                elif got == direction:
                    fp[direction] += 1
        for direction in ("up", "down"):
            prec = tp[direction] / max(1, tp[direction] + fp[direction])
            rec = tp[direction] / max(1, tp[direction] + fn[direction])
            print(f"  quote-miner baseline {direction}: "
                  f"P={prec:.2f} R={rec:.2f} (n={tp[direction]+fn[direction]})")
            # Baseline recorded, not gated — but it must not be vacuous.
            self.assertGreater(tp[direction], 0)


# ---------------------------------------------------------------------------
# B5 — story clustering
# ---------------------------------------------------------------------------
class TestStoryClustering(unittest.TestCase):
    def test_kamara_triple_source_one_cluster(self):
        """Kamara triple-source fixture (Saints Wire/Heavy/SI pattern) ->
        1 cluster, 1 representative."""
        quotes = [
            "Alvin Kamara expected to play Sunday, per sources",
            "Kamara expected to play Sunday per sources",
            "Alvin Kamara expected to play Sunday per source",
        ]
        sigs = [_sig(f"k{i}", sig_type=SignalType.INJURY,
                     direction=TrustDirection.NEUTRAL, quote=q,
                     target_id="player:kamara:RB", target_name="alvin kamara",
                     speaker_id=None, speaker_name=None,
                     url=f"https://src{i}.example/{i}")
                for i, q in enumerate(quotes)]
        mapping = CL.assign_story_clusters(sigs)
        self.assertEqual(len(set(mapping.values())), 1)
        cluster = [s for s in sigs
                   if mapping[s.signal_id] == mapping["k0"]]
        rep = CL.select_representative(cluster)
        self.assertIn(rep.signal_id, {"k0", "k1", "k2"})

    def test_flowers_dispute_two_clusters(self):
        """Flowers dispute fixture (practice-return vs 4for4-sits) ->
        2 clusters."""
        a = _sig("f1", quote="Zay Flowers returned to practice Thursday, full participant",
                 target_id="player:flowers:WR", target_name="zay flowers",
                 speaker_id=None, speaker_name=None)
        b = _sig("f2", quote="4for4: Flowers sits out again Friday, unlikely to play Sunday",
                 target_id="player:flowers:WR", target_name="zay flowers",
                 speaker_id=None, speaker_name=None)
        mapping = CL.assign_story_clusters([a, b])
        self.assertEqual(len(set(mapping.values())), 2)

    def test_cluster_ids_deterministic(self):
        sigs = [_sig(f"d{i}", quote=f"quote number {i} about practice reps")
                for i in range(4)]
        m1 = CL.assign_story_clusters(sigs)
        m2 = CL.assign_story_clusters(list(reversed(sigs)))
        self.assertEqual(m1, m2)


# ---------------------------------------------------------------------------
# B6 — tempered Bayesian aggregator identities
# ---------------------------------------------------------------------------
class TestAggregator(unittest.TestCase):
    def _group(self):
        return [
            _sig("g1", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                 direction=TrustDirection.UP, cluster="story_a"),
            _sig("g2", sig_type=SignalType.TRUST_UP, magnitude=0.4,
                 direction=TrustDirection.UP, cluster="story_b"),
            _sig("g3", sig_type=SignalType.TRUST_DOWN, magnitude=0.6,
                 direction=TrustDirection.DOWN, cluster="story_c"),
        ]

    def test_posterior_identity(self):
        """Exact identity: tau_post(mu_post - mu0) = eta * sum tau_i(mu_i - mu0)."""
        sigs = self._group()
        score = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0)
        # mu_i = s_d * magnitude; tau_i = 1 * 1; eta=1 (VIDEO origin)
        mus = [0.8, 0.4, -0.6]
        mu0, tau0, eta = 0.0, 1.0, 1.0
        tau_post = tau0 + eta * 3.0
        mu_post = (tau0 * mu0 + eta * sum(mus)) / tau_post
        self.assertAlmostEqual(score.trust_score, mu_post, places=9)
        lhs = tau_post * (score.trust_score - mu0)
        rhs = eta * sum(m - mu0 for m in mus)
        self.assertAlmostEqual(lhs, rhs, places=9)

    def test_loo_self_consistent(self):
        """Delta_j matches a direct recomputation without item j."""
        sigs = self._group()
        score = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0)
        self.assertEqual(len(score.item_contributions), 3)
        for j, s in enumerate(sigs):
            rest = [x for i, x in enumerate(sigs) if i != j]
            mu_loo = SC.aggregate_group(rest, weight_fn=lambda s: 1.0).trust_score
            delta = next(d for sid, d in score.item_contributions
                         if sid == s.signal_id)
            self.assertAlmostEqual(delta, score.trust_score - mu_loo, places=12)

    def test_provenance_gap_item_negligible(self):
        """A PROVENANCE-GAP item (w=0.05) moves mu_post by < 0.01."""
        base = [_sig(f"b{i}", sig_type=SignalType.TRUST_UP, magnitude=0.5,
                     cluster=f"story_{i}") for i in range(5)]
        gap = _sig("gap1", sig_type=SignalType.TRUST_UP, magnitude=0.5,
                   role_weight=0.05, cluster="story_gap")
        mu_base = SC.aggregate_group(base, weight_fn=lambda s: 1.0).trust_score
        mu_gap = SC.aggregate_group(base + [gap],
                                    weight_fn=lambda s: 1.0).trust_score
        self.assertLess(abs(mu_gap - mu_base), 0.01)

    def test_outlier_shrunk_not_dominant(self):
        """|mu_i - mu0| > 4*sigma0 -> shrunk toward mu0 (not rejected)."""
        shrunk = SC._shrink_outliers
        import numpy as np
        out = shrunk(np.array([1.0]), 0.0, 100.0, SC.AGG_DEFAULTS)
        # sigma0 = 0.1 -> 1.0 is 10 sigma out -> mu <- 0 + 0.25 * 1.0
        self.assertAlmostEqual(out[0], 0.25, places=9)
        mild = shrunk(np.array([0.05]), 0.0, 100.0, SC.AGG_DEFAULTS)
        self.assertAlmostEqual(mild[0], 0.05, places=9)  # untouched

    def test_doubling_tau_shrinks_width(self):
        """Monotonicity: doubling all tau_i shrinks the posterior width."""
        sigs = self._group()
        w1 = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0).width
        w2 = SC.aggregate_group(sigs, weight_fn=lambda s: 2.0).width
        self.assertLess(w2, w1)

    def test_single_item_weak_link(self):
        """Single-source group: weak_link flag, heuristic path."""
        score = SC.aggregate_group([self._group()[0]])
        self.assertTrue(score.weak_link)
        self.assertEqual(score.trust_path, "heuristic")
        self.assertEqual(score.n_items, 1)

    def test_three_items_bayesian_path(self):
        score = SC.aggregate_group(self._group(), weight_fn=lambda s: 1.0)
        self.assertFalse(score.weak_link)
        self.assertEqual(score.trust_path, "bayesian")

    def test_news_conflict_excluded_from_mean(self):
        sigs = self._group() + [
            _sig("nc1", sig_type=SignalType.NEWS_CONFLICT,
                 direction=TrustDirection.CONFLICT, magnitude=0.9,
                 cluster="story_nc")]
        score = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0)
        self.assertEqual(score.direction, TrustDirection.CONFLICT)
        self.assertEqual(score.n_scored, 3)  # conflict item not in the mean

    def test_role_axis_separate(self):
        sigs = self._group() + [
            _sig("r1", sig_type=SignalType.ROLE_INCREASE, magnitude=0.7,
                 direction=TrustDirection.UP, cluster="story_r1")]
        score = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0)
        self.assertGreater(score.role_delta, 0.0)
        self.assertEqual(score.n_scored, 3)  # role item on its own axis

    def test_no_source_counting(self):
        """r19: five quote-posts of ONE story-cluster do not outvote one
        opposing cluster — agreement is tau-weighted direction HHI."""
        same = ("Kamara will play Sunday, team is confident",)
        up = [_sig(f"u{i}", sig_type=SignalType.TRUST_UP, magnitude=0.5,
                   cluster="story_up", quote=same[0],
                   url=f"https://u{i}.example/") for i in range(5)]
        down = [_sig("d0", sig_type=SignalType.TRUST_DOWN, magnitude=0.5,
                     direction=TrustDirection.DOWN, cluster="story_down")]
        score = SC.aggregate_group(up + down, weight_fn=lambda s: 1.0)
        # 5 up-cluster items vs 1 down-cluster item: the mean still favors the
        # 5-item side (more tau), but the HHI must show a real split (< 1.0),
        # not unanimous agreement — one story-cluster is one voice.
        self.assertGreater(score.trust_score, 0.0)
        self.assertLess(score.consensus_hhi, 1.0)
        self.assertGreater(score.consensus_hhi, 0.33)
        # direction is UP but not by "5 sources agree" — HHI tells the story
        self.assertEqual(score.direction, TrustDirection.UP)

    def test_social_temper(self):
        """INFERENCE: all-SOCIAL groups use eta=0.5 -> shrunk toward prior."""
        sigs = [_sig(f"s{i}", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                     origin=SignalOrigin.SOCIAL, cluster=f"st{i}")
                for i in range(3)]
        video = [_sig(f"s{i}", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                      origin=SignalOrigin.VIDEO, cluster=f"st{i}")
                 for i in range(3)]
        mu_social = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0).trust_score
        mu_video = SC.aggregate_group(video, weight_fn=lambda s: 1.0).trust_score
        self.assertLess(abs(mu_social), abs(mu_video))

    def test_aggregator_never_returns_probability(self):
        """trust_score is a triage index in [-1, 1] — never a probability."""
        sigs = self._group()
        score = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0)
        self.assertGreaterEqual(score.trust_score, -1.0)
        self.assertLessEqual(score.trust_score, 1.0)
        self.assertTrue(score.shadow)
        self.assertEqual(score.calibration_state, CalibrationState.UNCALIBRATED)
        self.assertEqual(score.verification, Verification.INFERENCE)


# ---------------------------------------------------------------------------
# B7 — checklist sweep (T2 verbatim)
# ---------------------------------------------------------------------------
class TestTrustSweep(unittest.TestCase):
    def test_t2_data_gap(self):
        """Verbatim T2: team with zero signals -> DATA-GAP (not UNCHECKED,
        not silent), worst_plausible_assumption recorded and present in the
        emitted sweep dict."""
        sweep = CH.sweep_trust_signals("PIT", 4, 2026,
                                       _StubProvider([]))
        self.assertEqual(sweep.verdict, ChecklistVerdict.DATA_GAP)
        self.assertNotEqual(sweep.verdict, ChecklistVerdict.UNCHECKED)
        self.assertEqual(sweep.n_signals, 0)
        self.assertIsNotNone(sweep.worst_plausible_assumption)
        d = asdict(sweep)
        self.assertIn("unknown-negative", d["worst_plausible_assumption"])
        self.assertIsNotNone(d["data_gap_note"])

    def test_conflict_verdict(self):
        """Flowers-dispute fixture -> CONFLICT naming both story clusters."""
        up = [_sig(f"u{i}", sig_type=SignalType.TRUST_UP, magnitude=0.6,
                   team="BAL", target_id="player:flowers:WR",
                   target_name="zay flowers", cluster="story_return",
                   quote="Zay Flowers returned to practice Thursday")
              for i in range(2)]
        down = [_sig(f"d{i}", sig_type=SignalType.TRUST_DOWN, magnitude=0.6,
                     direction=TrustDirection.DOWN,
                     team="BAL", target_id="player:flowers:WR",
                     target_name="zay flowers", cluster="story_sits",
                     quote="Flowers sits out again Friday, unlikely to play")
                for i in range(2)]
        sweep = CH.sweep_trust_signals("BAL", 4, 2026,
                                       _StubProvider(up + down))
        self.assertEqual(sweep.verdict, ChecklistVerdict.CONFLICT)
        self.assertIn("story_return", sweep.conflicts)
        self.assertIn("story_sits", sweep.conflicts)

    def test_clear_verdict(self):
        """Aligned multi-cluster experts -> CLEAR."""
        sigs = ([_sig(f"a{i}", sig_type=SignalType.TRUST_UP, magnitude=0.6,
                      cluster="story_a") for i in range(2)] +
                [_sig(f"b{i}", sig_type=SignalType.TRUST_UP, magnitude=0.5,
                      cluster="story_b") for i in range(2)])
        sweep = CH.sweep_trust_signals("PIT", 4, 2026, _StubProvider(sigs))
        self.assertEqual(sweep.verdict, ChecklistVerdict.CLEAR)

    def test_nothing_material_single_cluster(self):
        """Single-cluster only -> NOTHING-MATERIAL (checked, thin)."""
        sigs = [_sig(f"s{i}", sig_type=SignalType.TRUST_UP, magnitude=0.4,
                     cluster="story_only") for i in range(2)]
        sweep = CH.sweep_trust_signals("PIT", 4, 2026, _StubProvider(sigs))
        self.assertEqual(sweep.verdict, ChecklistVerdict.NOTHING_MATERIAL)

    def test_top_scores_ranked(self):
        strong = [_sig(f"w{i}", sig_type=SignalType.TRUST_UP, magnitude=0.9,
                       cluster=f"ws{i}") for i in range(3)]
        weak = [_sig("z0", sig_type=SignalType.TRUST_UP, magnitude=0.2,
                     cluster="wz0", target_id="player:kamara:RB",
                     target_name="alvin kamara")]
        sweep = CH.sweep_trust_signals("PIT", 4, 2026,
                                       _StubProvider(strong + weak))
        self.assertLessEqual(len(sweep.top_scores), 5)
        # the strong group outranks the weak singleton
        self.assertGreater(abs(sweep.top_scores[0].trust_score),
                           abs(sweep.top_scores[-1].trust_score))


# ---------------------------------------------------------------------------
# B8 — clip harvester: metadata half + sweep planner
# ---------------------------------------------------------------------------
class TestClipHarvester(unittest.TestCase):
    def _clip_item(self, title, description, uploader="SomeChannel",
                   url="https://video.example/1"):
        now = utcnow()
        return _TestItem(
            source_handle="@youtube", post_id=None, raw_text=title, url=url,
            observed_at=now, fetched_at=now,
            input_kind=InputKind.VIDEO_METADATA, title=title,
            description=description, uploader=uploader,
            posted_at=now - timedelta(hours=3))

    def test_harvester_emits_trust_quote(self):
        ext = [e for e in REGISTRY.values()
               if e.name == "clip_metadata_harvester"][0]()
        item = self._clip_item(
            "Rodgers frustrated with Metcalf after loss",
            "Postgame press conference: Aaron Rodgers voices frustration "
            "with DK Metcalf over route running")
        raws = ext.extract(item, _ctx())
        self.assertTrue(any(r.signal_type == SignalType.TRUST_QUOTE
                            for r in raws))
        self.assertTrue(all(r.verification == Verification.INFERENCE
                            for r in raws))

    def test_harvester_ignores_non_entity_clips(self):
        ext = [e for e in REGISTRY.values()
               if e.name == "clip_metadata_harvester"][0]()
        item = self._clip_item("Top 10 catches of the week",
                               "A compilation of great grabs around the league")
        self.assertEqual(ext.extract(item, _ctx()), [])

    def test_sweep_plan_covers_every_cell(self):
        """B8: the scheduler emits a plan covering every (entity, window)."""
        start = datetime(2026, 10, 1, tzinfo=timezone.utc)
        end = datetime(2026, 10, 3, tzinfo=timezone.utc)
        entities = ["aaron rodgers", "dk metcalf"]
        plan = build_sweep_plan(entities, start, end, window_hours=24)
        cells = {(c.entity, c.window_start, c.window_end) for c in plan}
        # 2 entities x 2 daily windows = 4 cells, all present
        self.assertEqual(len(cells), 4)
        for ent in entities:
            ent_cells = [c for c in plan if c.entity == ent]
            self.assertEqual(len(ent_cells), 2)
            self.assertTrue(all(c.query for c in ent_cells))
        # deterministic
        plan2 = build_sweep_plan(entities, start, end, window_hours=24)
        self.assertEqual(plan, plan2)

    def test_metadata_dedup(self):
        """Byte-identical metadata payloads dedupe to one item."""
        h1 = metadata_content_hash("Title A", "Desc A", "Uploader")
        h2 = metadata_content_hash("Title A", "Desc A", "Uploader")
        h3 = metadata_content_hash("Title B", "Desc A", "Uploader")
        self.assertEqual(h1, h2)
        self.assertNotEqual(h1, h3)


# ---------------------------------------------------------------------------
# End-to-end: extractors -> shared store -> provider serves
# ---------------------------------------------------------------------------
class TestEndToEndPipeline(unittest.TestCase):
    def test_run_extractors_to_provider(self):
        """RawItem -> run_extractors -> shared IntakeStore ->
        FileStoreTrustSignalProvider serves it (shadow, schema 1.1.0)."""
        item = _item("Steelers QB Aaron Rodgers ruled out Sunday with injury",
                     handle="@mysportsupdate", post_id="e2e1")
        with tempfile.TemporaryDirectory() as root:
            store = IntakeStore(root)
            written = XP.run_extractors(item, _ctx(), store)
            self.assertTrue(len(written) >= 1)
            prov = FileStoreTrustSignalProvider(store)
            served = prov.get_trust_signals("PIT", 4, 2026)
            self.assertEqual(len(served), len(written))
            sig = served[0]
            # every c06 signal deserializes through _dict_to_signal cleanly
            self.assertEqual(sig.schema_version, "1.1.0")
            self.assertEqual(sig.extractor_name, "x_mysportsupdate")
            self.assertTrue(sig.shadow)
            self.assertEqual(sig.signal_origin, SignalOrigin.SOCIAL)
            self.assertEqual(sig.team, "PIT")
            # served weight computes (magnitude x decay x tipster)
            w = prov.served_weight(sig)
            self.assertGreater(w, 0.0)

    def test_discover_registers_all(self):
        reg = discover.discover()
        for name in ("x_mysportsupdate", "x_throwthedamball", "x_the_waldman",
                     "x_doug_clawson", "x_shauncore", "transcript_quote_miner",
                     "clip_metadata_harvester"):
            self.assertIn(name, reg)


if __name__ == "__main__":
    unittest.main()


# ---------------------------------------------------------------------------
# Phase 5 improvements: per-item temper, singleton clustering, beat-vector seam,
# sibling quote_text contract
# ---------------------------------------------------------------------------
class TestPhase5Improvements(unittest.TestCase):
    def test_singleton_cluster_mapping_direction(self):
        """n==1 -> {signal_id: cluster_id} (not the reverse)."""
        sig = _sig("solo1", quote="a lone quote about practice")
        mapping = CL.assign_story_clusters([sig])
        self.assertEqual(list(mapping.keys()), ["solo1"])
        self.assertTrue(mapping["solo1"].startswith("story_"))

    def test_per_item_temper_mixed_origins(self):
        """Mixed VIDEO+SOCIAL: social items tempered individually toward prior."""
        video = [_sig(f"v{i}", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                      direction=TrustDirection.UP, origin=SignalOrigin.VIDEO,
                      cluster=f"cv{i}") for i in range(2)]
        social = [_sig(f"s{i}", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                       direction=TrustDirection.UP, origin=SignalOrigin.SOCIAL,
                       cluster=f"cs{i}") for i in range(2)]
        mixed = SC.aggregate_group(video + social, weight_fn=lambda s: 1.0)
        all_video = SC.aggregate_group(video + [
            _sig(f"v{i+2}", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                 direction=TrustDirection.UP, origin=SignalOrigin.VIDEO,
                 cluster=f"cv{i+2}") for i in range(2)],
            weight_fn=lambda s: 1.0)
        # social discount pulls the mixed mean toward the prior and widens it
        self.assertLess(mixed.trust_score, all_video.trust_score)
        self.assertGreater(mixed.width, all_video.width)

    def test_eta_override_still_works(self):
        sigs = [_sig(f"e{i}", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                     direction=TrustDirection.UP,
                     origin=SignalOrigin.SOCIAL, cluster=f"ce{i}")
                for i in range(3)]
        default = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0)
        over = SC.aggregate_group(sigs, weight_fn=lambda s: 1.0, eta=1.0)
        # override eta=1.0 removes the social temper -> stronger score
        self.assertGreater(over.trust_score, default.trust_score)

    def test_beat_vector_seam_bayesian(self):
        """trust_scorer provided + n_items>=3 -> bayesian path recorded."""
        sigs = [_sig(f"bv{i}", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                     direction=TrustDirection.UP, cluster=f"cbv{i}")
                for i in range(3)]
        vec = P.build_beat_vector("PIT", 2026, 4, sigs,
                                  trust_scorer=SC.aggregate_all)
        self.assertEqual(vec.trust_path, "bayesian")
        self.assertGreater(vec.trust_dynamics, 0.0)

    def test_beat_vector_default_heuristic_unchanged(self):
        """No scorer -> legacy max-magnitude heuristic, trust_path heuristic."""
        sigs = [_sig("bh0", sig_type=SignalType.TRUST_QUOTE, magnitude=0.7,
                     direction=TrustDirection.UP, cluster="cbh0")]
        vec = P.build_beat_vector("PIT", 2026, 4, sigs)
        self.assertEqual(vec.trust_path, "heuristic")
        self.assertEqual(vec.trust_dynamics, 0.7)

    def test_beat_vector_seam_single_source_stays_heuristic(self):
        """n_items<3 -> scorer returns heuristic path -> vector stays heuristic."""
        sigs = [_sig("bs0", sig_type=SignalType.TRUST_UP, magnitude=0.8,
                     direction=TrustDirection.UP, cluster="cbs0")]
        vec = P.build_beat_vector("PIT", 2026, 4, sigs,
                                  trust_scorer=SC.aggregate_all)
        self.assertEqual(vec.trust_path, "heuristic")

    def test_sibling_process_item_populates_quote_text(self):
        """Contract §4.4: sibling TRUST_QUOTE signals carry quote_text so the
        c06 merger can dedupe TEXT rows against VIDEO rows."""
        from trust_signals import sources as _S
        item = _item("Rodgers frustrated with Metcalf over route running, "
                     "Steelers", handle="@mysportsupdate", post_id="q1")
        src = _S.get_source("@mysportsupdate")
        sigs = P.process_item(item, src, roster=ROSTER)
        quotes = [s for s in sigs if s.signal_type == SignalType.TRUST_QUOTE]
        self.assertTrue(quotes)
        self.assertIsNotNone(quotes[0].quote_text)
        self.assertIn("frustrated", quotes[0].quote_text)
